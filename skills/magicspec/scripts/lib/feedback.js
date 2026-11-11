'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { COMMANDS } = require('./commands');
const { read: readFindings } = require('./diagnostics');
const {
    engineRoot,
    executorHint,
    mkdirSafe,
    resolveProjectRoot,
    statePath,
    writeFileSafe,
} = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK NOTES (Engine Feedback Channel)
// ═══════════════════════════════════════════════════════════════════════════
//
// What an agent learns about the engine while it works — a bug, a missing
// capability, an improvement, misleading documentation — is kept as a note in
// the project's local runtime state until it is drafted and delivered or
// discarded. A note outlives the session and any compaction; draining the
// diagnostics digest removes none (EF-1). Nothing here contacts a remote
// service, and nothing here can fail a workflow (EF-11): the callers catch
// every fault and report it as one line.

/** The closed set of note kinds (EF-7). */
const KINDS = Object.freeze(['bug', 'missing-capability', 'improvement', 'docs']);

/** The impact an author may state (the report's Impact section). */
const IMPACTS = Object.freeze(['blocked', 'workaround', 'minor']);

/** The commands a note may name as the workflow it was recorded in. */
const WORKFLOWS = Object.freeze([
    'spec',
    'plan',
    'task',
    'run',
    'rule',
    'analyze',
    'graph',
    'status',
    'migrate',
    'help',
    'fix',
]);

/** The channel settings (EF-10). The default is the first. */
const CHANNELS = Object.freeze(['full', 'draft', 'off']);

/**
 * The fixed bounds of the channel (EF-5). A text over its limit is rejected and the
 * limit is named; the store as a whole gives way oldest evidence first.
 */
const LIMITS = Object.freeze({
    summary: 120,
    tried: 600,
    happened: 1200,
    expected: 600,
    suggestion: 600,
    engineFile: 200,
    code: 60,
    notes: 40,
    drafts: 20,
    storeBytes: 65536,
});

/** The most finding codes kept as evidence on one note. */
const MAX_EVIDENCE_CODES = 10;

const STORE_VERSION = 1;
const STORE_FILE = 'feedback.json';
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const ENGINE_FILE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_./-]*$/;

// ───────────────────────────────────────────────────────────────────────────
// Channel Setting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the channel setting from the project's registry (`feedback.channel`).
 * An unrecognized value gives `draft` and a warning: it never widens the channel (EF-10).
 *
 * @param {string} [root] - Project root (default: found from the working directory).
 * @returns {{channel: string, warning: string|null}} The effective channel.
 */
function readChannel(root) {
    let registry = {};
    try {
        registry = JSON.parse(
            fs.readFileSync(statePath(root || resolveProjectRoot(), 'workspace.json'), 'utf8'),
        );
    } catch {
        return { channel: CHANNELS[0], warning: null };
    }
    const value = registry?.feedback?.channel;
    if (value === undefined) return { channel: CHANNELS[0], warning: null };
    if (CHANNELS.includes(value)) return { channel: value, warning: null };
    return {
        channel: 'draft',
        warning: `feedback.channel '${String(value).slice(0, 40)}' is not one of ${CHANNELS.join(', ')}; the channel is 'draft' (text and link only).`,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} [root] - Project root.
 * @returns {string} Absolute path of the notes store, under the state folder's runtime cache.
 */
function storePath(root) {
    return statePath(root || resolveProjectRoot(), '.cache', STORE_FILE);
}

/** @returns {{version: number, nextId: number, nextDraftId: number, notes: Object[], drafts: Object[]}} An empty store. */
function emptyStore() {
    return { version: STORE_VERSION, nextId: 1, nextDraftId: 1, notes: [], drafts: [] };
}

/**
 * Loads the store. An absent file is an empty store; an unreadable one is set aside as
 * `feedback.json.corrupt` (so a later write cannot erase what could be recovered) and
 * reported once.
 *
 * @param {string} [root] - Project root.
 * @returns {{version: number, nextId: number, notes: Object[], drafts: Object[]}}
 */
function loadStore(root) {
    const file = storePath(root);
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return emptyStore();
    }
    try {
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.notes)) throw new Error('not a notes store');
        return {
            version: STORE_VERSION,
            nextId:
                Number.isInteger(data.nextId) && data.nextId > 0
                    ? data.nextId
                    : data.notes.length + 1,
            nextDraftId:
                Number.isInteger(data.nextDraftId) && data.nextDraftId > 0 ? data.nextDraftId : 1,
            notes: data.notes,
            drafts: Array.isArray(data.drafts) ? data.drafts : [],
        };
    } catch (e) {
        try {
            fs.renameSync(file, `${file}.corrupt`);
        } catch {
            /* leave it in place */
        }
        console.warn(
            `[feedback] The notes store could not be read (${e.message}); it was set aside as ${STORE_FILE}.corrupt.`,
        );
        return emptyStore();
    }
}

/**
 * Writes the store. When it exceeds its byte bound the evidence of the oldest notes gives way
 * first, one note at a time; a store still over the bound is refused.
 *
 * @param {{version: number, nextId: number, notes: Object[], drafts: Object[]}} store - The store.
 * @param {string} [root] - Project root.
 * @returns {{saved: boolean, trimmed: number}} Whether it was written (false under a dry run) and how many notes lost their evidence.
 * @throws {Error} When the store is over its bound with no evidence left to drop.
 */
function saveStore(store, root) {
    let trimmed = 0;
    let json = JSON.stringify(store);
    for (const note of store.notes) {
        if (Buffer.byteLength(json) <= LIMITS.storeBytes) break;
        if (note.evidence) {
            note.evidence = null;
            trimmed++;
            json = JSON.stringify(store);
        }
    }
    if (Buffer.byteLength(json) > LIMITS.storeBytes) {
        throw new Error(
            `the notes store would exceed ${LIMITS.storeBytes} bytes; discard a note first.`,
        );
    }
    const file = storePath(root);
    mkdirSafe(path.dirname(file));
    const tmp = `${file}.tmp`;
    const wrote = writeFileSafe(tmp, `${JSON.stringify(store, null, 2)}\n`);
    if (wrote) fs.renameSync(tmp, file);
    return { saved: wrote, trimmed };
}

// ───────────────────────────────────────────────────────────────────────────
// Validation
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} name - A field name.
 * @param {string|undefined} value - Its value.
 * @param {number} limit - Its character limit.
 * @returns {string|null} A rejection naming the limit, or null when the value fits.
 */
function overLimit(name, value, limit) {
    return value !== undefined && value.length > limit
        ? `${name} is ${value.length} characters; the limit is ${limit}.`
        : null;
}

/**
 * Checks a note against the closed kinds, the required fields and the limits (EF-5, EF-6, EF-7).
 *
 * @param {Object<string, string|undefined>} fields - The note as the caller gave it.
 * @returns {{ok: true, note: Object}|{ok: false, error: string}} The cleaned note, or the first rejection.
 */
function validateNote(fields) {
    if (!KINDS.includes(fields.kind)) {
        return { ok: false, error: `kind must be one of ${KINDS.join(', ')}.` };
    }
    for (const required of ['summary', 'tried', 'happened']) {
        if (!fields[required] || !String(fields[required]).trim()) {
            return {
                ok: false,
                error: `${required} is required: a note states what was tried and what happened.`,
            };
        }
    }
    const note = {
        kind: fields.kind,
        summary: String(fields.summary).trim(),
        tried: String(fields.tried).trim(),
        happened: String(fields.happened).trim(),
    };
    for (const optional of ['expected', 'suggestion']) {
        if (fields[optional]) note[optional] = String(fields[optional]).trim();
    }
    const limits = [
        overLimit('summary', note.summary, LIMITS.summary),
        overLimit('tried', note.tried, LIMITS.tried),
        overLimit('happened', note.happened, LIMITS.happened),
        overLimit('expected', note.expected, LIMITS.expected),
        overLimit('suggestion', note.suggestion, LIMITS.suggestion),
    ].filter(Boolean);
    if (limits.length > 0) return { ok: false, error: limits[0] };

    if (fields.impact) {
        if (!IMPACTS.includes(fields.impact))
            return { ok: false, error: `impact must be one of ${IMPACTS.join(', ')}.` };
        note.impact = fields.impact;
    }
    if (fields.workflow) {
        if (!WORKFLOWS.includes(fields.workflow))
            return { ok: false, error: `workflow must be one of ${WORKFLOWS.join(', ')}.` };
        note.workflow = fields.workflow;
    }
    if (fields.code) {
        if (!CODE_PATTERN.test(fields.code) || fields.code.length > LIMITS.code) {
            return {
                ok: false,
                error: `code must be UPPER_SNAKE_CASE, at most ${LIMITS.code} characters.`,
            };
        }
        note.code = fields.code;
    }
    if (fields.engineFile) {
        const file = String(fields.engineFile).replace(/\\/g, '/');
        const outside =
            path.isAbsolute(file) || /^[A-Za-z]:/.test(file) || file.split('/').includes('..');
        if (outside || !ENGINE_FILE_PATTERN.test(file) || file.length > LIMITS.engineFile) {
            return {
                ok: false,
                error: `engine-file must be a path inside the skill folder (no absolute path, no '..'), at most ${LIMITS.engineFile} characters.`,
            };
        }
        note.engineFile = file;
    }
    return { ok: true, note };
}

// ───────────────────────────────────────────────────────────────────────────
// Evidence (what the engine observed, EF-6)
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {string} The host the agent runs in, as far as its environment says; `unknown` otherwise.
 */
function detectHost() {
    const env = process.env;
    if (env.CLAUDECODE) return 'claude-code';
    if (env.GEMINI_CLI) return 'gemini-cli';
    if (env.CODEX_HOME || env.CODEX_SANDBOX) return 'codex';
    if (env.QWEN_CODE) return 'qwen-code';
    return 'unknown';
}

/**
 * Collects the context the engine itself observes: its version, the finding codes recorded in
 * the diagnostics sink, the operating system, the runtime and the host. A failing script is
 * named only when it is a command of the executor, and its exit status only as an integer.
 *
 * @param {{script?: string, exitStatus?: string}} [observed] - What the caller saw fail.
 * @returns {Object} The evidence block of a note.
 */
function collectEvidence(observed = {}) {
    let engineVersion = 'unknown';
    try {
        engineVersion =
            fs.readFileSync(path.join(engineRoot(), '.version'), 'utf8').trim() || 'unknown';
    } catch {
        /* an unreadable version is reported as unknown */
    }
    const codes = [];
    for (const finding of readFindings()) {
        if (finding && typeof finding.code === 'string' && !codes.includes(finding.code))
            codes.push(finding.code);
        if (codes.length >= MAX_EVIDENCE_CODES) break;
    }
    const evidence = {
        engineVersion,
        findingCodes: codes,
        os: `${process.platform} ${os.release()}`,
        runtime: process.version,
        host: detectHost(),
    };
    if (observed.script && Object.hasOwn(COMMANDS, observed.script))
        evidence.failingScript = observed.script;
    if (observed.exitStatus !== undefined && /^\d{1,3}$/.test(String(observed.exitStatus)))
        evidence.exitStatus = Number(observed.exitStatus);
    return evidence;
}

// ───────────────────────────────────────────────────────────────────────────
// Actions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Records one note: the channel is read first (`off` records nothing), the note is validated,
 * the engine's evidence is attached and the store is written.
 *
 * @param {Object<string, string|undefined>} fields - The note's fields (kind, summary, tried, happened, …).
 * @param {{script?: string, exitStatus?: string}} [observed] - What the caller saw fail.
 * @param {string} [root] - Project root.
 * @returns {{recorded: boolean, id?: string, message: string}} The outcome, always a single line.
 */
function addNote(fields, observed = {}, root) {
    const { channel, warning } = readChannel(root);
    if (warning) console.warn(`[feedback] ${warning}`);
    if (channel === 'off')
        return {
            recorded: false,
            message: 'The feedback channel is off (feedback.channel); no note was recorded.',
        };

    const checked = validateNote(fields);
    if (!checked.ok) return { recorded: false, message: `Note rejected: ${checked.error}` };

    const store = loadStore(root);
    if (store.notes.length >= LIMITS.notes) {
        return {
            recorded: false,
            message: `Note rejected: the store holds ${LIMITS.notes} notes, the limit; discard or deliver one first.`,
        };
    }
    const id = `n${store.nextId}`;
    store.nextId += 1;
    store.notes.push({
        id,
        ...checked.note,
        recordedAt: new Date().toISOString(),
        evidence: collectEvidence(observed),
    });
    const { saved, trimmed } = saveStore(store, root);
    const trimNote =
        trimmed > 0
            ? ` The evidence of ${trimmed} older note${trimmed === 1 ? '' : 's'} was dropped to keep the store within its bound.`
            : '';
    return {
        recorded: saved,
        id,
        message: saved
            ? `Recorded ${checked.note.kind} note ${id}.${trimNote}`
            : `Note ${id} not written (dry run).`,
    };
}

/**
 * @param {string} [root] - Project root.
 * @returns {Object[]} The notes still held, oldest first.
 */
function listNotes(root) {
    return loadStore(root).notes;
}

/**
 * Renders the held notes as short lines: the identifier, the kind and the summary.
 *
 * @param {Object[]} notes - Notes as {@link listNotes} returns them.
 * @returns {string} A listing, or one line saying there is nothing.
 */
function formatNotes(notes) {
    if (notes.length === 0) return 'No feedback notes are pending.';
    return notes.map((note) => `${note.id}  ${note.kind}  ${note.summary}`).join('\n');
}

/**
 * Renders the findings the diagnostics sink holds that no digest has shown yet, read without draining them.
 *
 * @returns {string} One line per finding after a heading, or an empty string when there are none.
 */
function formatOpenFindings() {
    const findings = readFindings().filter(
        (finding) => finding && typeof finding.code === 'string',
    );
    if (findings.length === 0) return '';
    const lines = findings.map(
        (finding) =>
            `${finding.severity || 'warning'}  ${finding.code}  ${String(finding.message || '').slice(0, 120)}`,
    );
    return `Open findings (no digest has shown them yet):\n${lines.join('\n')}`;
}

/**
 * Removes one note from the store.
 *
 * @param {string} id - A note identifier (`n3`).
 * @param {string} [root] - Project root.
 * @returns {{removed: boolean, message: string}} The outcome, one line.
 */
function discardNote(id, root) {
    const store = loadStore(root);
    const index = store.notes.findIndex((note) => note.id === id);
    if (index === -1)
        return { removed: false, message: `No note ${id || '(none given)'} is pending.` };
    const [removed] = store.notes.splice(index, 1);
    if (removed.draftId) {
        const draft = store.drafts.find((entry) => entry.id === removed.draftId);
        if (draft) draft.noteIds = draft.noteIds.filter((noteId) => noteId !== id);
        store.drafts = store.drafts.filter((entry) => entry.noteIds.length > 0);
    }
    const { saved } = saveStore(store, root);
    return {
        removed: saved,
        message: saved ? `Discarded note ${id}.` : `Note ${id} not removed (dry run).`,
    };
}

/**
 * @param {string} [root] - Project root.
 * @returns {number} How many notes wait, for the offer or the work queue; 0 when the channel is off.
 */
function pendingCount(root) {
    if (readChannel(root).channel === 'off') return 0;
    return loadStore(root).notes.length;
}

/**
 * Composes the block `finalize` prints for the notes still pending (EF-10, EF-12).
 *
 * Where the developer-repository predicate holds the notes are work items: they are listed as fix
 * candidates and nothing is drafted or offered for submission. Elsewhere each draft is offered
 * once — the first listing offers it and records that it was offered; a later listing names it
 * as already offered and does not ask again. The channel `off` prints nothing.
 *
 * @param {{developer: boolean, dryRun?: boolean, root?: string}} options - `developer` is the developer-repository predicate; a dry run records nothing.
 * @returns {string|null} The block, or null when there is nothing to say.
 */
function pendingBlock({ developer, dryRun = false, root }) {
    const { channel } = readChannel(root);
    if (channel === 'off') return null;
    const store = loadStore(root);
    if (store.notes.length === 0) return null;
    const line = (note) => `- ${note.id}  ${note.kind}  ${note.summary}`;
    const plural = (count) => `${count} note${count === 1 ? '' : 's'}`;

    if (developer) {
        return [
            '### Feedback notes — fix candidates',
            '',
            `${plural(store.notes.length)} recorded about the engine are work items in this repository, not reports: nothing is drafted or offered for submission.`,
            ...store.notes.map(line),
        ].join('\n');
    }

    const fresh = store.notes.filter((note) => !note.offeredAt && !note.draftId);
    const freshDrafts = store.drafts.filter((draft) => !draft.offeredAt);
    const lines = ['### Feedback notes', ''];
    if (fresh.length + freshDrafts.length > 0) {
        const answers =
            channel === 'draft'
                ? 'keep as text, or discard (the channel is draft: the agent cannot publish)'
                : 'submit, keep as text, or discard';
        lines.push(
            `${plural(store.notes.length)} pending. Offer each draft once: run \`${executorHint()} feedback draft\`, show the person the complete report it prints and ask: ${answers}.`,
            ...fresh.map(line),
            ...freshDrafts.map(
                (draft) =>
                    `- ${draft.id}  draft of ${plural(draft.noteIds.length)}  ${draft.title}`,
            ),
        );
    }
    const offered = store.notes.filter((note) => note.offeredAt && !note.draftId);
    const offeredDrafts = store.drafts.filter((draft) => draft.offeredAt);
    if (offered.length + offeredDrafts.length > 0) {
        lines.push(
            '',
            'Offered before and not answered (listed again, not asked again):',
            ...offered.map(line),
            ...offeredDrafts.map(
                (draft) =>
                    `- ${draft.id}  draft of ${plural(draft.noteIds.length)}  ${draft.title}`,
            ),
        );
    }
    if (!dryRun && (fresh.length > 0 || freshDrafts.length > 0)) {
        const now = new Date().toISOString();
        for (const note of fresh) note.offeredAt = now;
        for (const draft of freshDrafts) draft.offeredAt = now;
        saveStore(store, root);
    }
    return lines.join('\n');
}

module.exports = {
    KINDS,
    IMPACTS,
    WORKFLOWS,
    CHANNELS,
    LIMITS,
    readChannel,
    storePath,
    loadStore,
    saveStore,
    validateNote,
    collectEvidence,
    addNote,
    listNotes,
    formatNotes,
    formatOpenFindings,
    discardNote,
    pendingCount,
    pendingBlock,
};
