'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY SQLITE BACKEND (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The artifact index in a SQLite database opened through the runtime's built-in module
// (`node:sqlite`), with ranked full-text search on FTS5. No package is added to the
// engine. The module is experimental in the runtime and is missing from older ones, so the
// engine reaches it only through `openBackend`: it takes this backend when the module
// loads and an FTS5 table can be created, and the pure-script fallback otherwise. Both
// implement the interface described in `memory-fallback.js` and rank alike.
//
// Schema:
//   meta(key, value)                     settings: schema_version, backend, provider, model, dim
//   files(path, sha256, indexed_at)      the fingerprint of every indexed file
//   sections(id, path, heading, kind, workspace, status, version, ordinal, line_start, line_end, body)
//   sections_fts                         FTS5 over heading and body, external content
//   vectors(section_id, model, dim, data)  optional embeddings, Float32 blobs

const fs = require('fs');
const path = require('path');
const { HISTORY_KINDS } = require('./memory-sections');

/** Layout version of the database; a different value empties the index, which is rebuilt. */
const SCHEMA_VERSION = '2';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, sha256 TEXT, indexed_at TEXT);
CREATE TABLE IF NOT EXISTS sections(
    id INTEGER PRIMARY KEY, path TEXT, heading TEXT, kind TEXT, workspace TEXT,
    status TEXT, version TEXT, ordinal INTEGER, line_start INTEGER, line_end INTEGER, body TEXT
);
CREATE INDEX IF NOT EXISTS sections_path ON sections(path);
CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
    heading, body, content='sections', content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS vectors(
    section_id INTEGER PRIMARY KEY, model TEXT, dim INTEGER, data BLOB
);
CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
    INSERT INTO sections_fts(rowid, heading, body) VALUES (new.id, new.heading, new.body);
END;
CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
    INSERT INTO sections_fts(sections_fts, rowid, heading, body)
        VALUES ('delete', old.id, old.heading, old.body);
    DELETE FROM vectors WHERE section_id = old.id;
END;
`;

// ───────────────────────────────────────────────────────────────────────────
// Query parts
// ───────────────────────────────────────────────────────────────────────────

/**
 * The FTS5 expression of a parsed query: each phrase is a quoted run of adjacent tokens and
 * the phrases are joined by OR.
 *
 * @param {string[][]} phrases - Parsed query (`parseQuery`).
 * @returns {string}
 */
function matchOf(phrases) {
    return phrases.map((tokens) => `"${tokens.join(' ')}"`).join(' OR ');
}

/**
 * The SQL conditions and their parameters for a query's filters, shared by the ranked query and
 * the count so that both see the same set of sections.
 *
 * @param {{kinds?: string[], workspace?: string, history?: boolean}} options - As in `query`.
 * @returns {{where: string[], params: string[]}}
 */
function filtersOf(options) {
    const where = [];
    const params = [];
    if (options.kinds?.length) {
        where.push(`s.kind IN (${options.kinds.map(() => '?').join(', ')})`);
        params.push(...options.kinds);
    } else if (!options.history) {
        where.push(`s.kind NOT IN (${HISTORY_KINDS.map(() => '?').join(', ')})`);
        params.push(...HISTORY_KINDS);
    }
    if (options.workspace) {
        where.push('s.workspace = ?');
        params.push(options.workspace);
    }
    return { where, params };
}

// ───────────────────────────────────────────────────────────────────────────
// The backend
// ───────────────────────────────────────────────────────────────────────────

/** The message of the error `connect` raises for a database written for another layout. */
const OTHER_LAYOUT = 'the database was written for another layout';

/**
 * Whether an error says the database file cannot be used as it is: damaged, not SQLite at
 * all, or written for another layout. Such a file holds nothing worth keeping, because the
 * index is derived (AM-1).
 *
 * @param {Error} err - Error raised while opening or reading the database.
 * @returns {boolean}
 */
function isUnusableDatabase(err) {
    return (
        err?.message === OTHER_LAYOUT ||
        /malformed|not a database|corrupt/i.test(String(err?.message))
    );
}

/**
 * Opens one connection with the schema in place, and closes it again when that fails, so a
 * damaged file is never left locked by a half-open handle.
 *
 * @param {{DatabaseSync: Function}} sqlite - The `node:sqlite` module.
 * @param {string} dbPath - Absolute path of `memory.sqlite`.
 * @returns {object} The open `DatabaseSync` handle.
 * @throws {Error} When FTS5 is not available, the file is unusable or its layout differs.
 */
function connect(sqlite, dbPath) {
    const db = new sqlite.DatabaseSync(dbPath);
    try {
        db.exec('PRAGMA synchronous = OFF');
        db.exec(SCHEMA);
        const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get();
        if (row && row.value !== SCHEMA_VERSION) throw new Error(OTHER_LAYOUT);
        return db;
    } catch (err) {
        db.close();
        throw err;
    }
}

/**
 * Opens the database, creating the schema, and rebuilds it when it is damaged or was
 * written for another layout.
 *
 * @param {{DatabaseSync: Function}} sqlite - The `node:sqlite` module.
 * @param {string} dbPath - Absolute path of `memory.sqlite`.
 * @returns {object} The open `DatabaseSync` handle with the schema in place.
 * @throws {Error} When FTS5 is not available or the file cannot be opened.
 */
function openDatabase(sqlite, dbPath) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    let db;
    try {
        db = connect(sqlite, dbPath);
    } catch (err) {
        if (!isUnusableDatabase(err)) throw err;
        fs.rmSync(dbPath, { force: true });
        db = connect(sqlite, dbPath);
    }
    db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)").run(
        SCHEMA_VERSION,
    );
    db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('backend', 'sqlite')").run();
    return db;
}

/**
 * Opens the SQLite index.
 *
 * @param {string} dbPath - Absolute path of `memory.sqlite`; created when absent.
 * @param {{DatabaseSync: Function}} sqlite - The loaded `node:sqlite` module.
 * @returns {object} The backend interface (see `memory-fallback.js`).
 * @throws {Error} When FTS5 is not available or the database cannot be opened.
 */
function open(dbPath, sqlite) {
    const db = openDatabase(sqlite, dbPath);
    let writing = false;

    const begin = () => {
        if (!writing) {
            db.exec('BEGIN');
            writing = true;
        }
    };
    const statement = {
        deleteFile: db.prepare('DELETE FROM sections WHERE path = ?'),
        ofFile: db.prepare('SELECT id, heading, body FROM sections WHERE path = ?'),
        deleteId: db.prepare('DELETE FROM sections WHERE id = ?'),
        refile: db.prepare(
            'UPDATE sections SET kind = ?, workspace = ?, status = ?, version = ?, ordinal = ?, line_start = ?, line_end = ? WHERE id = ?',
        ),
        meta: db.prepare('SELECT id, kind, workspace FROM sections'),
        pending: db.prepare(
            'SELECT s.id, s.heading, s.body FROM sections s LEFT JOIN vectors v ON v.section_id = s.id AND v.model = ? AND v.dim = ? WHERE v.section_id IS NULL ORDER BY s.id LIMIT ?',
        ),
        putVector: db.prepare(
            'INSERT OR REPLACE INTO vectors(section_id, model, dim, data) VALUES (?, ?, ?, ?)',
        ),
        vectors: db.prepare('SELECT section_id, data FROM vectors WHERE model = ? AND dim = ?'),
        clearVectors: db.prepare('DELETE FROM vectors'),
        deleteHash: db.prepare('DELETE FROM files WHERE path = ?'),
        putHash: db.prepare(
            'INSERT OR REPLACE INTO files(path, sha256, indexed_at) VALUES (?, ?, ?)',
        ),
        insert: db.prepare(
            'INSERT INTO sections(path, heading, kind, workspace, status, version, ordinal, line_start, line_end, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ),
        getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
        putMeta: db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)'),
        hashes: db.prepare('SELECT path, sha256 FROM files'),
        count: db.prepare('SELECT COUNT(*) AS n FROM sections'),
    };

    return {
        name: 'sqlite',

        getMeta: (key) => statement.getMeta.get(key)?.value ?? null,

        setMeta(key, value) {
            begin();
            statement.putMeta.run(key, String(value));
        },

        fileHashes: () => new Map(statement.hashes.all().map((r) => [r.path, r.sha256])),

        replaceFile(rel, sha256, units) {
            begin();
            // A section whose heading and text did not change keeps its row, and with it its vector;
            // its kind, version and lines are location and header, so they follow the file.
            const kept = new Map();
            for (const row of statement.ofFile.all(rel)) {
                const key = JSON.stringify([row.heading, row.body]);
                kept.set(key, [...(kept.get(key) ?? []), row.id]);
            }
            const fresh = [];
            for (const u of units) {
                const id = kept.get(JSON.stringify([u.heading, u.body]))?.shift();
                if (id === undefined) fresh.push(u);
                else {
                    statement.refile.run(
                        u.kind,
                        u.workspace,
                        u.status,
                        u.version,
                        u.ordinal,
                        u.lineStart,
                        u.lineEnd,
                        id,
                    );
                }
            }
            for (const ids of kept.values()) for (const id of ids) statement.deleteId.run(id);
            for (const u of fresh) {
                statement.insert.run(
                    u.path,
                    u.heading,
                    u.kind,
                    u.workspace,
                    u.status,
                    u.version,
                    u.ordinal,
                    u.lineStart,
                    u.lineEnd,
                    u.body,
                );
            }
            statement.putHash.run(rel, sha256, new Date().toISOString());
        },

        removeFile(rel) {
            begin();
            statement.deleteFile.run(rel);
            statement.deleteHash.run(rel);
        },

        sectionCount: () => Number(statement.count.get().n),

        sectionMeta: () =>
            new Map(
                statement.meta
                    .all()
                    .map((r) => [Number(r.id), { kind: r.kind, workspace: r.workspace }]),
            ),

        sectionsByIds(ids) {
            const found = new Map();
            for (let i = 0; i < ids.length; i += 500) {
                const chunk = ids.slice(i, i + 500);
                const rows = db
                    .prepare(
                        `SELECT id, path, heading, kind, workspace, status, version, ordinal, line_start AS lineStart, line_end AS lineEnd, body FROM sections WHERE id IN (${chunk.map(() => '?').join(', ')})`,
                    )
                    .all(...chunk);
                for (const row of rows) found.set(Number(row.id), { ...row });
            }
            return found;
        },

        pendingVectors: (model, dim, limit) =>
            statement.pending.all(model, dim, limit).map((r) => ({ ...r, id: Number(r.id) })),

        putVectors(model, dim, entries) {
            begin();
            for (const { id, vector } of entries) {
                statement.putVector.run(
                    id,
                    model,
                    dim,
                    new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength),
                );
            }
        },

        vectors(model, dim) {
            const found = new Map();
            for (const r of statement.vectors.all(model, dim)) {
                const bytes = r.data;
                found.set(
                    Number(r.section_id),
                    new Float32Array(
                        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
                    ),
                );
            }
            return found;
        },

        clearVectors() {
            begin();
            statement.clearVectors.run();
        },

        /**
         * Ranks the sections that hold at least one phrase, by FTS5 `bm25()`.
         *
         * @param {string[][]} phrases - Parsed query (`parseQuery`).
         * @param {{kinds?: string[], workspace?: string, history?: boolean, limit?: number}} [options] -
         *   As in the fallback backend.
         * @returns {object[]} Sections with a `score` (higher is better), best first.
         */
        query(phrases, options = {}) {
            if (phrases.length === 0) return [];
            const { where, params } = filtersOf(options);
            const rows = db
                .prepare(
                    `SELECT s.id, s.path, s.heading, s.kind, s.workspace, s.status, s.version, s.ordinal,
                            s.line_start AS lineStart, s.line_end AS lineEnd, s.body,
                            -bm25(sections_fts) AS score
                     FROM sections_fts JOIN sections s ON s.id = sections_fts.rowid
                     WHERE sections_fts MATCH ? ${where.map((w) => `AND ${w}`).join(' ')}
                     ORDER BY score DESC, s.id ASC LIMIT ?`,
                )
                .all(matchOf(phrases), ...params, options.limit ?? 10);
            return rows.map((row) => ({ ...row }));
        },

        /**
         * Counts the sections that hold at least one phrase under the same filters as `query`,
         * whatever its limit.
         *
         * @param {string[][]} phrases - Parsed query (`parseQuery`).
         * @param {{kinds?: string[], workspace?: string, history?: boolean}} [options] - As in `query`.
         * @returns {number}
         */
        count(phrases, options = {}) {
            if (phrases.length === 0) return 0;
            const { where, params } = filtersOf(options);
            const row = db
                .prepare(
                    `SELECT COUNT(*) AS n FROM sections_fts JOIN sections s ON s.id = sections_fts.rowid
                     WHERE sections_fts MATCH ? ${where.map((w) => `AND ${w}`).join(' ')}`,
                )
                .get(matchOf(phrases), ...params);
            return Number(row?.n ?? 0);
        },

        save() {
            if (writing) {
                db.exec('COMMIT');
                writing = false;
            }
        },

        close() {
            if (writing) {
                db.exec('ROLLBACK');
                writing = false;
            }
            db.close();
        },
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Selection
// ───────────────────────────────────────────────────────────────────────────

/**
 * Opens the best backend the runtime offers: SQLite when `node:sqlite` loads and an FTS5
 * table can be created, the pure-script fallback otherwise. It keeps no table of runtime
 * versions; whether the module works is decided by trying it, which also covers a runtime
 * built without SQLite or without FTS5. A failure to open the SQLite database for any
 * other reason takes the fallback too, and is reported in `fallbackReason`, so the index
 * still answers and the caller can record why it is not the faster one (AM-8).
 *
 * @param {string} cacheDir - Absolute path of the cache folder holding the index files.
 * @param {{loader?: () => object}} [options] - `loader` returns the `node:sqlite` module;
 *   tests replace it to run the fallback path on a runtime that has the module.
 * @returns {object} A backend, with `fallbackReason` set when SQLite was tried and failed
 *   for a reason other than the module being absent.
 * @throws {Error} When the fallback's file exists and cannot be read.
 */
function openBackend(cacheDir, options = {}) {
    const loader = options.loader ?? (() => require('node:sqlite'));
    const dbPath = path.join(cacheDir, 'memory.sqlite');
    const existed = fs.existsSync(dbPath);
    let reason = null;
    try {
        return open(dbPath, loader());
    } catch (err) {
        const absent =
            err?.code === 'ERR_UNKNOWN_BUILTIN_MODULE' || err?.code === 'MODULE_NOT_FOUND';
        if (!absent) reason = err.message;
        if (!existed) fs.rmSync(dbPath, { force: true });
    }
    const backend = require('./memory-fallback').open(path.join(cacheDir, 'memory.json'));
    backend.fallbackReason = reason;
    return backend;
}

module.exports = { open, openBackend, SCHEMA_VERSION };
