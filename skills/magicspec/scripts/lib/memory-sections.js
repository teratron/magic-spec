// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY SECTIONS (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The artifact index holds sections, not files: one row per heading-delimited piece of
// a Markdown artifact, each carrying where it came from. This module is the one place
// that turns a file into those units, so the two storage backends (SQLite and the
// pure-script fallback) index exactly the same text and cannot disagree about what a
// section is or what a word is (`tokenize`, `parseQuery`). It is pure: it reads no index
// and writes nothing.
//
// What the index reads is closed. A Markdown file of the state folder is indexed when
// its location gives it one of the kinds below; a derived file (the extraction cache, the
// graph folder with its wiki, the generated CONTEXT.md) is never indexed, because
// nothing computed from the artifacts may enter an index built from them.

const fs = require('fs');
const path = require('path');

/** A section longer than this many characters is split at paragraph boundaries. */
const MAX_SECTION_CHARS = 2000;

/** Kinds a query excludes unless it asks for history. */
const HISTORY_KINDS = Object.freeze(['archive', 'history', 'retrospective', 'changelog']);

/** Every kind a section can have. */
const KINDS = Object.freeze([
    'spec',
    'rules',
    'plan',
    'tasks',
    'state',
    'registry',
    ...HISTORY_KINDS,
]);

/** Folders and files of the state folder that are derived or hold no artifact. */
const SKIPPED_DIRS = Object.freeze(['.cache', 'graph', 'node_modules']);
const SKIPPED_FILES = Object.freeze(['CONTEXT.md']);

/** Separator of a heading path. */
const PATH_SEPARATOR = ' › ';

// ───────────────────────────────────────────────────────────────────────────
// Kinds
// ───────────────────────────────────────────────────────────────────────────

/**
 * The kind of an artifact, from where it lives and what it is called.
 *
 * An archived file is an `archive` whatever it was before it was archived, so the
 * archive test comes first.
 *
 * @param {string} rel - Path relative to the state folder, forward slashes.
 * @returns {string|null} The kind, or null when the location gives the file none.
 */
function kindOf(rel) {
    const parts = rel.split('/');
    const name = parts[parts.length - 1];
    if (parts.includes('archives')) return 'archive';
    if (parts.includes('specifications')) return 'spec';
    if (name === 'RULES.md') return 'rules';
    if (name === 'PLAN.md') return 'plan';
    if (name === 'TASKS.md' || parts.includes('tasks')) return 'tasks';
    if (name === 'STATE.md') return 'state';
    if (name === 'RETROSPECTIVE.md') return 'retrospective';
    if (name === 'CHANGELOG.md') return 'changelog';
    if (name === 'INDEX.md') return 'registry';
    return null;
}

/**
 * The workspace a file belongs to: its first folder when the path has one, the empty
 * string for a file at the root of the state folder (the global registry and rules).
 *
 * @param {string} rel - Path relative to the state folder, forward slashes.
 * @returns {string} Workspace name or ''.
 */
function workspaceOf(rel) {
    const parts = rel.split('/');
    return parts.length > 1 ? parts[0] : '';
}

// ───────────────────────────────────────────────────────────────────────────
// Sectioning
// ───────────────────────────────────────────────────────────────────────────

/**
 * Splits a body into paragraphs at blank lines, keeping a fenced block whole.
 *
 * @param {string} body - Section text.
 * @returns {string[]} Non-empty paragraphs.
 */
function paragraphsOf(body) {
    const paragraphs = [];
    let current = [];
    let fence = null;
    for (const line of body.split('\n')) {
        const marker = /^\s*(```|~~~)/.exec(line);
        if (marker) fence = fence === null ? marker[1] : fence === marker[1] ? null : fence;
        if (fence === null && line.trim() === '') {
            if (current.length > 0) paragraphs.push(current.join('\n'));
            current = [];
        } else {
            current.push(line);
        }
    }
    if (current.length > 0) paragraphs.push(current.join('\n'));
    return paragraphs;
}

/**
 * Cuts one body into parts of at most `MAX_SECTION_CHARS`, at paragraph boundaries. A
 * paragraph that alone exceeds the bound (a long table, a run of list items) is cut at its
 * line boundaries, so a row or an item stays whole; only a single line longer than the bound
 * stays whole. Every part is therefore a run of whole paragraphs or of whole lines.
 *
 * @param {string} body - Section text.
 * @returns {string[]} The parts, in order; one part when the body fits.
 */
function splitBody(body) {
    if (body.length <= MAX_SECTION_CHARS) return [body];
    const atoms = [];
    for (const paragraph of paragraphsOf(body)) {
        if (paragraph.length <= MAX_SECTION_CHARS) {
            atoms.push({ text: paragraph, gap: '\n\n' });
        } else {
            paragraph.split('\n').forEach((line, i) => {
                atoms.push({ text: line, gap: i === 0 ? '\n\n' : '\n' });
            });
        }
    }
    const parts = [];
    let current = '';
    for (const atom of atoms) {
        const joined = current === '' ? atom.text : `${current}${atom.gap}${atom.text}`;
        if (current !== '' && joined.length > MAX_SECTION_CHARS) {
            parts.push(current);
            current = atom.text;
        } else {
            current = joined;
        }
    }
    if (current !== '') parts.push(current);
    return parts;
}

/**
 * Reads the status and version a specification records in its header.
 *
 * @param {string} text - Whole file text.
 * @returns {{status: string, version: string}} Empty strings when a field is absent.
 */
function specHeader(text) {
    const head = text.split('\n', 40).join('\n');
    const field = (name) => {
        const match = new RegExp(`^\\*\\*${name}:\\*\\*[ \\t]*(.+?)[ \\t]*$`, 'm').exec(head);
        return match ? match[1] : '';
    };
    return { status: field('Status'), version: field('Version') };
}

/**
 * Cuts a Markdown file into heading-delimited blocks. A section starts at each `##` and
 * `###` heading outside a fenced block; the text before the first one (the title and the
 * header fields) is a block of its own, headed by the title.
 *
 * @param {string} text - Whole file text, newlines already normalized.
 * @param {string} fallbackTitle - Title used when the file has no `#` heading.
 * @returns {{heading: string, headingText: string, body: string}[]} Blocks in file order.
 */
function blocksOf(text, fallbackTitle) {
    const blocks = [];
    let title = null;
    let h2 = null;
    let current = { heading: null, headingText: '', lines: [] };
    let fence = null;

    const open = (heading, headingText) => {
        blocks.push(current);
        current = { heading, headingText, lines: [] };
    };

    for (const line of text.split('\n')) {
        const marker = /^\s*(```|~~~)/.exec(line);
        if (marker) fence = fence === null ? marker[1] : fence === marker[1] ? null : fence;
        const heading = fence === null ? /^(#{1,3})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line) : null;
        if (heading && heading[1] === '#' && title === null) {
            title = `# ${heading[2]}`;
            current.heading = title;
            current.headingText = heading[2];
        } else if (heading && heading[1] === '##') {
            h2 = `## ${heading[2]}`;
            open([title, h2].filter(Boolean).join(PATH_SEPARATOR), heading[2]);
        } else if (heading && heading[1] === '###') {
            open([title, h2, `### ${heading[2]}`].filter(Boolean).join(PATH_SEPARATOR), heading[2]);
        } else {
            current.lines.push(line);
        }
    }
    blocks.push(current);

    return blocks.map((block) => ({
        heading: block.heading || title || `# ${fallbackTitle}`,
        headingText: block.headingText,
        body: block.lines.join('\n').trim(),
    }));
}

/**
 * Turns one artifact into section units with provenance (AM-2).
 *
 * A `Document History` heading is a section of kind `history` whatever file it sits in.
 * An empty block (a heading with nothing under it) holds nothing to find and is dropped.
 * The units of one file are numbered in file order, so the numbering is stable across runs.
 *
 * @param {string} rel - Path relative to the state folder, forward slashes.
 * @param {string} text - Whole file text.
 * @returns {{path: string, heading: string, kind: string, workspace: string, status: string, version: string, ordinal: number, body: string}[]}
 *   The units; empty when the location gives the file no kind.
 */
function sectionsOf(rel, text) {
    const fileKind = kindOf(rel);
    if (fileKind === null) return [];

    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const { status, version } =
        fileKind === 'spec' ? specHeader(normalized) : { status: '', version: '' };
    const workspace = workspaceOf(rel);
    const units = [];

    for (const block of blocksOf(normalized, path.posix.basename(rel, '.md'))) {
        if (block.body === '') continue;
        const kind = /^document history$/i.test(block.headingText) ? 'history' : fileKind;
        for (const part of splitBody(block.body)) {
            units.push({
                path: rel,
                heading: block.heading,
                kind,
                workspace,
                status: kind === 'spec' ? status : '',
                version: kind === 'spec' ? version : '',
                ordinal: units.length,
                body: part,
            });
        }
    }
    return units;
}

// ───────────────────────────────────────────────────────────────────────────
// Filters
// ───────────────────────────────────────────────────────────────────────────

/**
 * Whether a section passes a query's filters. A named kind list keeps exactly those kinds
 * (a history kind among them is returned); without one, the history kinds are left out unless
 * history was asked for. A workspace keeps only that workspace's sections.
 *
 * @param {{kind: string, workspace: string}} section - The section, or its metadata.
 * @param {{kinds?: string[], history?: boolean, workspace?: string}} [options] - The filters.
 * @returns {boolean}
 */
function matchesFilters(section, options = {}) {
    if (options.kinds?.length) {
        if (!options.kinds.includes(section.kind)) return false;
    } else if (!options.history && HISTORY_KINDS.includes(section.kind)) {
        return false;
    }
    return !options.workspace || section.workspace === options.workspace;
}

// ───────────────────────────────────────────────────────────────────────────
// Tokens
// ───────────────────────────────────────────────────────────────────────────

/**
 * Splits text into the tokens both backends index and match: case folded, diacritics
 * removed, split at every character that is not a letter or a digit. This is what the
 * SQLite tokenizer `unicode61 remove_diacritics 2` does, so the two backends agree on
 * what a word is.
 *
 * @param {string} text - Any text.
 * @returns {string[]} Tokens in order; empty for text with no letter or digit.
 */
function tokenize(text) {
    const folded = text
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase();
    return folded.match(/[\p{L}\p{N}\p{Co}]+/gu) ?? [];
}

/**
 * Reads a query into its terms. A quoted stretch is one phrase; so is a word that the
 * tokenizer splits into several tokens (`check-prerequisites`, `lib/memory.js`), which
 * matches only where those tokens stand next to each other. Terms are joined by OR when
 * ranking, so a long question still finds the sections that hold some of its words.
 *
 * @param {string} text - The query as typed.
 * @returns {string[][]} Distinct phrases, each a list of tokens; empty when the query has none.
 */
function parseQuery(text) {
    const phrases = [];
    const seen = new Set();
    const add = (raw) => {
        const tokens = tokenize(raw);
        const key = tokens.join(' ');
        if (tokens.length > 0 && !seen.has(key)) {
            seen.add(key);
            phrases.push(tokens);
        }
    };
    const rest = text.replace(/"([^"]*)"/g, (_, quoted) => {
        add(quoted);
        return ' ';
    });
    for (const word of rest.split(/\s+/)) add(word);
    return phrases;
}

// ───────────────────────────────────────────────────────────────────────────
// Files
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists the Markdown files of the state folder the index reads, with the ones it leaves
 * out so a caller can report an artifact that no kind covers.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {{files: string[], unkinded: string[]}} Relative paths with forward slashes, sorted.
 *   `unkinded` holds Markdown files that are not derived and match no kind.
 */
function listArtifacts(designAbs) {
    const files = [];
    const unkinded = [];
    const walk = (dir, prefix) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
            if (entry.isDirectory()) {
                if (!SKIPPED_DIRS.includes(entry.name)) walk(path.join(dir, entry.name), rel);
            } else if (entry.name.endsWith('.md') && !SKIPPED_FILES.includes(entry.name)) {
                (kindOf(rel) === null ? unkinded : files).push(rel);
            }
        }
    };
    if (fs.existsSync(designAbs)) walk(designAbs, '');
    return { files: files.sort(), unkinded: unkinded.sort() };
}

module.exports = {
    MAX_SECTION_CHARS,
    HISTORY_KINDS,
    KINDS,
    kindOf,
    workspaceOf,
    sectionsOf,
    listArtifacts,
    tokenize,
    parseQuery,
    matchesFilters,
};
