'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY FALLBACK BACKEND (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The artifact index kept in a JSON file and ranked in process, for a runtime that has
// no SQLite module (the stated floor, Node 18) or whose SQLite cannot make a full-text
// table. It implements the same backend interface as `memory-sqlite.js` and ranks with
// the same formula, so a caller cannot tell which backend answered except by the first
// line of a query's output.
//
// The backend interface (both modules export `open(cachePath)` returning it):
//
//   name                          'fallback' | 'sqlite'
//   getMeta(key) / setMeta(key, value)   small string settings of the index
//   fileHashes()                  Map of indexed file path -> SHA-256 of its content
//   replaceFile(rel, sha, units)  swaps one file's sections for new ones, with its hash; a section
//                                 whose heading and text are unchanged keeps its id and its vector
//   removeFile(rel)               drops a file, its hash and its sections
//   sectionCount()                number of sections held
//   sectionMeta()                 Map of section id -> {kind, workspace}, for filtering vector hits
//   sectionsByIds(ids)            Map of section id -> full section row
//   pendingVectors(model, dim, limit)   sections with no vector of that model and size yet
//   putVectors(model, dim, entries)     stores [{id, vector: Float32Array}]
//   vectors(model, dim)           Map of section id -> Float32Array
//   clearVectors()                forgets every vector (the model or its size changed)
//   query(phrases, options)       ranked rows, best first (see `query` below)
//   save() / close()              persist (a no-op for a database) / release
//
// Ranking is Okapi BM25 as SQLite's FTS5 computes it (`bm25()`, k1 = 1.2, b = 0.75, equal
// column weights): each query phrase contributes
//   idf x f (k1 + 1) / (f + k1 (1 - b + b D / avgdl))
// where f counts the phrase in the row, D is the row's token count (heading and body
// together), avgdl the mean over every row, and idf = ln((N - n + 0.5) / (n + 0.5)) over
// the n rows that hold the phrase, floored at 1e-6. The statistics cover every row; the
// kind, workspace and history filters apply to the ranked rows afterwards.

const fs = require('fs');
const path = require('path');
const { HISTORY_KINDS, tokenize } = require('./memory-sections');

/** Layout version of the file; a different value empties the index, which is rebuilt. */
const SCHEMA_VERSION = '1';

const K1 = 1.2;
const B = 0.75;
const MIN_IDF = 1e-6;

// ───────────────────────────────────────────────────────────────────────────
// Persistence
// ───────────────────────────────────────────────────────────────────────────

/**
 * Writes a file through a temporary sibling so a reader never sees half a file.
 *
 * @param {string} target - Absolute path.
 * @param {string} content - File text.
 * @returns {void}
 */
function writeAtomic(target, content) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, content, 'utf8');
    try {
        fs.renameSync(tmp, target);
    } catch (err) {
        if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
        fs.copyFileSync(tmp, target);
        fs.rmSync(tmp, { force: true });
    }
}

/**
 * Reads the stored state, or an empty one when there is none to use. A file that is not
 * valid JSON, or was written for another layout, holds nothing worth keeping: the index
 * is derived (AM-1) and is rebuilt. A file that cannot be read at all (it is a folder,
 * access is denied) is an error and propagates, so the caller records it (AM-8).
 *
 * @param {string} cachePath - Absolute path of the JSON file.
 * @returns {{meta: Object<string, string>, files: Object<string, {sha256: string, indexed_at: string}>, sections: object[], nextId: number, vectors: Object<string, {model: string, dim: number, data: string}>}}
 */
function load(cachePath) {
    const empty = () => ({ meta: {}, files: {}, sections: [], nextId: 1, vectors: {} });
    if (!fs.existsSync(cachePath)) return empty();
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (err) {
        if (err instanceof SyntaxError) return empty();
        throw err;
    }
    if (
        !parsed ||
        parsed.meta?.schema_version !== SCHEMA_VERSION ||
        !Array.isArray(parsed.sections)
    ) {
        return empty();
    }
    return {
        meta: parsed.meta,
        files: parsed.files ?? {},
        sections: parsed.sections,
        nextId: parsed.nextId ?? 1,
        vectors: parsed.vectors ?? {},
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Ranking
// ───────────────────────────────────────────────────────────────────────────

/**
 * Builds the in-memory statistics a query reads: per-section token lists, lengths and
 * an inverted index of single tokens. Recomputed after any write.
 *
 * @param {object[]} sections - Stored sections.
 * @returns {{tokens: {h: string[], b: string[]}[], lengths: number[], inverted: Map<string, Map<number, number>>, total: number}}
 */
function analyze(sections) {
    const tokens = [];
    const lengths = [];
    const inverted = new Map();
    let total = 0;
    sections.forEach((section, index) => {
        const h = tokenize(section.heading);
        const b = tokenize(section.body);
        tokens.push({ h, b });
        lengths.push(h.length + b.length);
        total += h.length + b.length;
        for (const token of h.concat(b)) {
            const rows = inverted.get(token) ?? new Map();
            rows.set(index, (rows.get(index) ?? 0) + 1);
            inverted.set(token, rows);
        }
    });
    return { tokens, lengths, inverted, total };
}

/**
 * Counts how often a phrase of adjacent tokens occurs in one token list.
 *
 * @param {string[]} haystack - Tokens of one column.
 * @param {string[]} phrase - Tokens that must stand next to each other, in order.
 * @returns {number} Occurrences.
 */
function countPhrase(haystack, phrase) {
    let count = 0;
    for (let i = 0; i + phrase.length <= haystack.length; i++) {
        if (phrase.every((token, j) => haystack[i + j] === token)) count++;
    }
    return count;
}

/**
 * Occurrences of a phrase per section: a lookup for one token, an adjacency scan over the
 * sections that hold its first token for a longer phrase.
 *
 * @param {ReturnType<typeof analyze>} stats - Statistics of the sections.
 * @param {string[]} phrase - Tokens of the phrase.
 * @returns {Map<number, number>} Section index -> count, only where the count is above zero.
 */
function occurrences(stats, phrase) {
    const first = stats.inverted.get(phrase[0]);
    if (!first) return new Map();
    if (phrase.length === 1) return first;
    const found = new Map();
    for (const index of first.keys()) {
        const { h, b } = stats.tokens[index];
        const count = countPhrase(h, phrase) + countPhrase(b, phrase);
        if (count > 0) found.set(index, count);
    }
    return found;
}

// ───────────────────────────────────────────────────────────────────────────
// The backend
// ───────────────────────────────────────────────────────────────────────────

/**
 * Opens the fallback index.
 *
 * @param {string} cachePath - Absolute path of `memory.json`; created on `save()`.
 * @returns {object} The backend interface (see the file header).
 * @throws {Error} When the file exists and cannot be read.
 */
function open(cachePath) {
    const state = load(cachePath);
    state.meta.schema_version = SCHEMA_VERSION;
    state.meta.backend = 'fallback';
    let stats = null;
    let changed = !fs.existsSync(cachePath);

    const touch = () => {
        stats = null;
        changed = true;
    };

    return {
        name: 'fallback',

        getMeta: (key) => state.meta[key] ?? null,

        setMeta(key, value) {
            if (state.meta[key] === String(value)) return;
            state.meta[key] = String(value);
            changed = true;
        },

        fileHashes: () => new Map(Object.entries(state.files).map(([rel, v]) => [rel, v.sha256])),

        replaceFile(rel, sha256, units) {
            const kept = new Map();
            for (const section of state.sections) {
                if (section.path !== rel) continue;
                const key = JSON.stringify([section.heading, section.body]);
                kept.set(key, [...(kept.get(key) ?? []), section]);
            }
            state.sections = state.sections.filter((s) => s.path !== rel);
            for (const unit of units) {
                const same = kept.get(JSON.stringify([unit.heading, unit.body]))?.shift();
                state.sections.push({ ...unit, id: same ? same.id : state.nextId++ });
            }
            for (const left of kept.values())
                for (const gone of left) delete state.vectors[gone.id];
            state.files[rel] = { sha256, indexed_at: new Date().toISOString() };
            touch();
        },

        removeFile(rel) {
            for (const section of state.sections) {
                if (section.path === rel) delete state.vectors[section.id];
            }
            state.sections = state.sections.filter((s) => s.path !== rel);
            delete state.files[rel];
            touch();
        },

        sectionCount: () => state.sections.length,

        sectionMeta: () =>
            new Map(state.sections.map((s) => [s.id, { kind: s.kind, workspace: s.workspace }])),

        sectionsByIds(ids) {
            const wanted = new Set(ids);
            return new Map(
                state.sections.filter((s) => wanted.has(s.id)).map((s) => [s.id, { ...s }]),
            );
        },

        pendingVectors: (model, dim, limit) =>
            state.sections
                .filter((s) => {
                    const v = state.vectors[s.id];
                    return !(v && v.model === model && v.dim === dim);
                })
                .slice(0, limit)
                .map((s) => ({ id: s.id, heading: s.heading, body: s.body })),

        putVectors(model, dim, entries) {
            for (const { id, vector } of entries) {
                const bytes = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
                state.vectors[id] = { model, dim, data: bytes.toString('base64') };
            }
            changed = true;
        },

        vectors(model, dim) {
            const found = new Map();
            for (const [id, v] of Object.entries(state.vectors)) {
                if (v.model !== model || v.dim !== dim) continue;
                const bytes = Buffer.from(v.data, 'base64');
                found.set(
                    Number(id),
                    new Float32Array(
                        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
                    ),
                );
            }
            return found;
        },

        clearVectors() {
            state.vectors = {};
            changed = true;
        },

        /**
         * Ranks the sections that hold at least one phrase.
         *
         * @param {string[][]} phrases - Parsed query (`parseQuery`).
         * @param {{kinds?: string[], workspace?: string, history?: boolean, limit?: number}} [options] -
         *   `kinds` keeps only those kinds; `history` false (the default) drops the history kinds
         *   unless `kinds` names them; `limit` caps the rows (default 10).
         * @returns {object[]} Sections with a `score` (higher is better), best first; ties in
         *   file and section order.
         */
        query(phrases, options = {}) {
            if (phrases.length === 0 || state.sections.length === 0) return [];
            stats ??= analyze(state.sections);
            const rows = state.sections.length;
            const average = stats.total / rows;
            const scores = new Map();
            for (const phrase of phrases) {
                const hits = occurrences(stats, phrase);
                const idfRaw = Math.log((rows - hits.size + 0.5) / (hits.size + 0.5));
                const idf = idfRaw <= 0 ? MIN_IDF : idfRaw;
                for (const [index, f] of hits) {
                    const norm = f + K1 * (1 - B + (B * stats.lengths[index]) / average);
                    scores.set(index, (scores.get(index) ?? 0) + (idf * (f * (K1 + 1))) / norm);
                }
            }
            const wanted = options.kinds?.length ? new Set(options.kinds) : null;
            const ranked = [];
            for (const [index, score] of scores) {
                const section = state.sections[index];
                if (
                    wanted
                        ? !wanted.has(section.kind)
                        : !options.history && HISTORY_KINDS.includes(section.kind)
                ) {
                    continue;
                }
                if (options.workspace && section.workspace !== options.workspace) continue;
                ranked.push({ ...section, score, index });
            }
            ranked.sort((a, b) => b.score - a.score || a.index - b.index);
            return ranked.slice(0, options.limit ?? 10).map(({ index, ...row }) => row);
        },

        save() {
            if (!changed) return;
            writeAtomic(
                cachePath,
                JSON.stringify({
                    meta: state.meta,
                    files: state.files,
                    sections: state.sections,
                    nextId: state.nextId,
                    vectors: state.vectors,
                }),
            );
            changed = false;
        },

        close() {},
    };
}

module.exports = { open, SCHEMA_VERSION };
