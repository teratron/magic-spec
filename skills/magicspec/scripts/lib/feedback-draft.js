'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const feedback = require('./feedback');
const { engineRoot, resolveProjectRoot } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK DRAFTS (Scrubbing, Fingerprint, Report, Link)
// ═══════════════════════════════════════════════════════════════════════════
//
// A draft is one report assembled from the pending notes that share a problem. Every piece of
// text that enters it is scrubbed first (EF-4): the person's review of the complete text is the
// real gate, and the scrubbing is what makes that review safe to rely on. A draft is
// always available as text (EF-9); a prefilled new-issue link is added only when it fits.

/** The version of the report layout, stated in every report. */
const REPORT_FORMAT = 1;

/** The most characters a report may hold; a longer one is cut and says by how much (EF-5). */
const REPORT_MAX = 12000;

/**
 * The longest prefilled link offered. A new-issue link carries only a title and a body and fails
 * without a published limit when it is too long; common servers refuse a request line over
 * 8 KB, so the budget sits well below that.
 */
const LINK_MAX = 6000;

/** Names that say nothing about a project and are left as they are. */
const GENERIC_NAMES = new Set([
    'src',
    'lib',
    'bin',
    'app',
    'apps',
    'docs',
    'test',
    'tests',
    'scripts',
    'skills',
    'build',
    'dist',
    'packages',
    'public',
    'assets',
    'config',
    'node_modules',
    'magicspec',
]);

const CREDENTIAL = '[redacted: credential]';
const IMPACT_RANK = { minor: 0, workaround: 1, blocked: 2 };

/** The sections of a report, in order: the issue form of the repository carries the same labels. */
const SECTIONS = Object.freeze([
    'Summary',
    'What happened',
    'Expected / suggestion',
    'Impact',
    'Environment',
    'Engine-observed context',
    'Report details',
]);

// ───────────────────────────────────────────────────────────────────────────
// Scrubbing
// ───────────────────────────────────────────────────────────────────────────

/**
 * The redactions applied to every piece of text, in order: content the tracker would fetch or
 * render, credentials, and Markdown that notifies a person or links another issue.
 *
 * @type {ReadonlyArray<readonly [string, RegExp, string]>}
 */
const REDACTIONS = Object.freeze([
    ['code block', /```[\s\S]*?(?:```|$)/g, '[code block removed]'],
    ['image', /!\[[^\]]*\]\([^)]*\)/g, '[image removed]'],
    ['markup', /<\/?[A-Za-z!][^>]*>/g, '[markup removed]'],
    [
        'private key',
        /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
        CREDENTIAL,
    ],
    [
        'token',
        /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b/g,
        CREDENTIAL,
    ],
    ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, CREDENTIAL],
    ['bearer', /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, `Bearer ${CREDENTIAL}`],
    [
        'assignment',
        /\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret)(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi,
        `$1$2${CREDENTIAL}`,
    ],
    ['long hex', /\b[A-Fa-f0-9]{40,}\b/g, CREDENTIAL],
    ['email', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email removed]'],
    [
        'mention',
        /(^|[^\w@])@[A-Za-z0-9][A-Za-z0-9-]*(?:\/[A-Za-z0-9._-]+)?/g,
        '$1[mention removed]',
    ],
    ['issue reference', /(?:\b[\w.-]+\/[\w.-]+)?#\d+\b/g, '[issue reference removed]'],
]);

/** A path that ends inside the skill folder: what follows `skills/magicspec/` names an engine file. */
const ENGINE_PATH =
    /(?:[A-Za-z]:)?(?:[\\/][^\s"'`)\\/]+)*?[\\/](?:\.agents[\\/])?skills[\\/]magicspec[\\/]([^\s"'`)]+)/g;

/** The absolute and home paths that remain once the engine's own have been shortened. */
const ABSOLUTE_PATHS = Object.freeze([
    /\b[A-Za-z]:[\\/][^\s"'`)<>|]*/g,
    /\\\\[^\s"'`)\\]+\\[^\s"'`)]*/g,
    /(?<![\w.:/-])\/(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]*/g,
    /~[\\/][^\s"'`)]*/g,
]);

/**
 * @param {string} text - Text that names engine files by absolute path.
 * @returns {string} The text with each path that ends inside the skill folder shortened to its path there.
 */
function shortenEnginePaths(text) {
    return text.replace(ENGINE_PATH, (_match, rest) => rest.replace(/\\/g, '/'));
}

/**
 * @param {string} name - A name to find in text.
 * @returns {RegExp} A case-insensitive whole-word pattern for it.
 */
function wordPattern(name) {
    return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
}

/**
 * The names that must not appear in a report: the project, its top-level directories, the
 * user and the machine. Names under three characters and names that say nothing about a
 * project (`src`, `docs`) are left.
 *
 * @param {string} [root] - Project root.
 * @returns {string[]} The names to redact.
 */
function projectNames(root) {
    const names = new Set();
    try {
        const base = root || resolveProjectRoot();
        names.add(path.basename(base));
        for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
            if (entry.isDirectory()) names.add(entry.name);
        }
    } catch {
        /* an unreadable project yields the names found so far */
    }
    try {
        names.add(os.userInfo().username);
    } catch {
        /* no user entry */
    }
    names.add(os.hostname());
    names.add(path.basename(os.homedir()));
    return [...names].filter(
        (name) =>
            name.length >= 3 && !name.startsWith('.') && !GENERIC_NAMES.has(name.toLowerCase()),
    );
}

/**
 * Scrubs one piece of text (EF-4).
 *
 * @param {string} text - Text from a note.
 * @param {string[]} [names] - Names to redact (see {@link projectNames}).
 * @returns {string} The text with credentials, absolute paths, the project's names and content the tracker would fetch or notify on removed.
 */
function scrubText(text, names = []) {
    let result = String(text);
    for (const [, pattern, replacement] of REDACTIONS.slice(0, 3))
        result = result.replace(pattern, replacement);
    result = shortenEnginePaths(result);
    for (const pattern of ABSOLUTE_PATHS) result = result.replace(pattern, '[path removed]');
    for (const [, pattern, replacement] of REDACTIONS.slice(3))
        result = result.replace(pattern, replacement);
    for (const name of names) result = result.replace(wordPattern(name), '[name removed]');
    return result;
}

// ───────────────────────────────────────────────────────────────────────────
// Fingerprint and Grouping
// ───────────────────────────────────────────────────────────────────────────

/**
 * The fingerprint of a note's problem (EF-8): derived from the facts that stay put — kind, engine
 * file, finding code and workflow — never from wording. A note that states none of the three
 * facts has no problem to be recognized by and stands alone.
 *
 * @param {Object} note - A pending note.
 * @returns {string} Twelve hexadecimal characters.
 */
function fingerprint(note) {
    const facts = [note.kind, note.engineFile || '', note.code || '', note.workflow || ''];
    if (!facts[1] && !facts[2] && !facts[3]) facts.push(note.id);
    return crypto
        .createHash('sha256')
        .update(facts.join('|').toLowerCase())
        .digest('hex')
        .slice(0, 12);
}

/**
 * @param {Object[]} notes - Pending notes.
 * @returns {Map<string, Object[]>} The notes grouped by fingerprint, in the order first seen: one problem, one report.
 */
function groupNotes(notes) {
    const groups = new Map();
    for (const note of notes) {
        const key = fingerprint(note);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(note);
    }
    return groups;
}

// ───────────────────────────────────────────────────────────────────────────
// Report
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {Object[]} notes - The notes of one problem.
 * @returns {string} The most severe impact the notes state, `minor` when none states one.
 */
function strongestImpact(notes) {
    return notes.reduce(
        (best, note) =>
            note.impact && IMPACT_RANK[note.impact] > IMPACT_RANK[best] ? note.impact : best,
        'minor',
    );
}

/**
 * @param {Object[]} notes - The notes of one problem.
 * @returns {string[]} The lines of the Environment section: what the engine observed on the latest note that has it.
 */
function environmentLines(notes) {
    const evidence = [...notes].reverse().find((note) => note.evidence)?.evidence;
    if (!evidence)
        return [
            '- Not recorded (the evidence of this note was dropped to keep the store within its bound).',
        ];
    const workflow = notes.find((note) => note.workflow)?.workflow || 'not stated';
    return [
        `- Engine version: ${evidence.engineVersion}`,
        `- Workflow: ${workflow}`,
        `- Operating system: ${evidence.os}`,
        `- Runtime: ${evidence.runtime}`,
        `- Host: ${evidence.host}`,
    ];
}

/**
 * @param {Object[]} notes - The notes of one problem.
 * @returns {string[]} The lines of the Engine-observed context section: finding codes, the failing script and its exit status.
 */
function contextLines(notes) {
    const evidences = notes.map((note) => note.evidence).filter(Boolean);
    const codes = [...new Set(evidences.flatMap((evidence) => evidence.findingCodes || []))];
    const failing = evidences.find((evidence) => evidence.failingScript);
    return [
        `- Finding codes recorded in the same workflow: ${codes.length > 0 ? codes.join(', ') : 'none'}`,
        `- Failing script: ${failing ? failing.failingScript : 'none'}${failing && failing.exitStatus !== undefined ? ` (exit status ${failing.exitStatus})` : ''}`,
    ];
}

/**
 * Builds the report of one problem. The note text is scrubbed; the rest is the engine's own.
 *
 * @param {Object[]} notes - The notes of one problem (one fingerprint).
 * @param {string[]} names - Names to redact.
 * @returns {{title: string, body: string, fingerprint: string}} The title, the Markdown body and the fingerprint.
 */
function buildReport(notes, names) {
    const clean = (text) => scrubText(text, names);
    const first = notes[0];
    const stated = (note) =>
        [note.engineFile ? `file ${note.engineFile}` : '', note.code ? `code ${note.code}` : '']
            .filter(Boolean)
            .join(', ');
    const written = '_Written by the agent._';
    const observed = '_Observed by the engine._';
    const expected = notes
        .flatMap((note) => [
            note.expected && `- Expected: ${clean(note.expected)}`,
            note.suggestion && `- Suggestion: ${clean(note.suggestion)}`,
        ])
        .filter(Boolean);
    const print = fingerprint(first);
    const parts = [
        [
            'Summary',
            written,
            notes.map(
                (note) => `- ${clean(note.summary)}${stated(note) ? ` (${stated(note)})` : ''}`,
            ),
        ],
        [
            'What happened',
            written,
            notes.map(
                (note) => `- Tried: ${clean(note.tried)}\n  Happened: ${clean(note.happened)}`,
            ),
        ],
        ...(expected.length > 0 ? [['Expected / suggestion', written, expected]] : []),
        ['Impact', written, [`- ${strongestImpact(notes)}`]],
        ['Environment', observed, environmentLines(notes)],
        ['Engine-observed context', observed, contextLines(notes)],
        [
            'Report details',
            '_Added by the engine._',
            [
                `- Fingerprint: ${print}`,
                `- Report format: ${REPORT_FORMAT}`,
                "- This report was drafted by an AI agent from notes it recorded while working. It will be public on the engine's issue tracker; read it in full before it is sent.",
            ],
        ],
    ];
    let body = parts
        .map(([title, label, lines]) => `## ${title}\n${label}\n\n${lines.join('\n')}`)
        .join('\n\n');
    if (body.length > REPORT_MAX)
        body = `${body.slice(0, REPORT_MAX)}\n\n[truncated: ${body.length - REPORT_MAX} characters omitted]`;
    return {
        title: `[agent-feedback] ${first.kind}: ${clean(first.summary)}`,
        body,
        fingerprint: print,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Destination and Link
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the engine's tracker address, defined once in the skill folder's own metadata (EF-3):
 * the `repository` field of `scripts/package.json`. Nothing else may name another address.
 *
 * @returns {string|null} The repository address without a trailing `.git`, or null when it is absent or not a GitHub address.
 */
function readRepository() {
    try {
        const meta = JSON.parse(
            fs.readFileSync(path.join(engineRoot(), 'scripts', 'package.json'), 'utf8'),
        );
        const address = String(meta.repository || '').replace(/\.git$/, '');
        return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(address) ? address : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} title - The report title.
 * @param {string} body - The report body.
 * @returns {string|null} A prefilled new-issue link carrying only the title and the body, or null when it would be too long to work (the text path remains).
 */
function buildLink(title, body) {
    const repository = readRepository();
    if (!repository) return null;
    const link = `${repository}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    return link.length <= LINK_MAX ? link : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Drafts
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renders a draft for the person: the complete report text, then the link when there is one.
 *
 * @param {Object} draft - A draft of the store.
 * @returns {string} The text to print.
 */
function renderDraft(draft) {
    const link = draft.link
        ? `Link (opens a prefilled new-issue page; nothing is sent until you submit it there): ${draft.link}`
        : 'Link: not available, the report is too long for one — use the text.';
    return [
        `[feedback] Draft ${draft.id} — fingerprint ${draft.fingerprint}, ${draft.noteIds.length} note${draft.noteIds.length === 1 ? '' : 's'}. This is the complete report; it will be public if it is submitted.`,
        '',
        `Title: ${draft.title}`,
        '',
        '~~~~markdown',
        draft.body,
        '~~~~',
        '',
        link,
    ].join('\n');
}

/**
 * Adds the draft of one problem to the store and marks its notes as drafted.
 *
 * @param {{nextDraftId: number, drafts: Object[]}} store - The loaded store.
 * @param {Object[]} group - The notes of one problem (one fingerprint).
 * @param {string[]} names - Names to redact.
 * @returns {Object} The draft, printed in full by the caller and so marked shown.
 */
function addDraft(store, group, names) {
    const report = buildReport(group, names);
    const now = new Date().toISOString();
    const draft = {
        id: `d${store.nextDraftId}`,
        fingerprint: report.fingerprint,
        noteIds: group.map((note) => note.id),
        title: report.title,
        body: report.body,
        link: buildLink(report.title, report.body),
        createdAt: now,
        shownAt: now,
        offeredAt: null,
    };
    store.nextDraftId += 1;
    store.drafts.push(draft);
    for (const note of group) note.draftId = draft.id;
    return draft;
}

/**
 * Turns the pending notes into drafts: one per problem. A note already in a draft is left in it.
 *
 * @param {string} [noteId] - Draft only the problem of this note.
 * @param {string} [root] - Project root.
 * @returns {{drafts: Object[], message: string|null}} The drafts created (each marked shown, as it is printed in full) and a message when none could be.
 */
function createDrafts(noteId, root) {
    const store = feedback.loadStore(root);
    let pending = store.notes.filter((note) => !note.draftId);
    if (noteId) {
        const wanted = pending.find((note) => note.id === noteId);
        if (!wanted) return { drafts: [], message: `No pending note ${noteId}.` };
        const key = fingerprint(wanted);
        pending = pending.filter((note) => fingerprint(note) === key);
    }
    if (pending.length === 0) return { drafts: [], message: 'No pending notes to draft.' };

    const names = projectNames(root);
    const drafts = [];
    let message = null;
    for (const group of groupNotes(pending).values()) {
        if (store.drafts.length >= feedback.LIMITS.drafts) {
            message = `The store holds ${feedback.LIMITS.drafts} drafts, the limit; deliver or discard one first.`;
            break;
        }
        drafts.push(addDraft(store, group, names));
    }
    if (drafts.length > 0) feedback.saveStore(store, root);
    return { drafts, message };
}

/**
 * Prints an existing draft again and marks it shown.
 *
 * @param {string} id - A draft identifier (`d1`).
 * @param {string} [root] - Project root.
 * @returns {{draft: Object|null, message: string|null}} The draft, or the reason there is none.
 */
function showDraft(id, root) {
    const store = feedback.loadStore(root);
    const draft = store.drafts.find((entry) => entry.id === id);
    if (!draft) return { draft: null, message: `No draft ${id || '(none given)'}.` };
    draft.shownAt = new Date().toISOString();
    feedback.saveStore(store, root);
    return { draft, message: null };
}

/**
 * Closes a draft: the draft and the notes it holds leave the store, because they are delivered
 * (kept as text, submitted) or discarded.
 *
 * @param {string} id - A draft identifier.
 * @param {string} [root] - Project root.
 * @returns {{closed: boolean, draft: Object|null}} Whether it was closed, and the draft as it was.
 */
function closeDraft(id, root) {
    const store = feedback.loadStore(root);
    const index = store.drafts.findIndex((entry) => entry.id === id);
    if (index === -1) return { closed: false, draft: null };
    const [draft] = store.drafts.splice(index, 1);
    store.notes = store.notes.filter((note) => note.draftId !== id);
    const { saved } = feedback.saveStore(store, root);
    return { closed: saved, draft };
}

module.exports = {
    SECTIONS,
    REPORT_MAX,
    LINK_MAX,
    scrubText,
    projectNames,
    fingerprint,
    groupNotes,
    buildReport,
    buildLink,
    readRepository,
    renderDraft,
    createDrafts,
    showDraft,
    closeDraft,
};
