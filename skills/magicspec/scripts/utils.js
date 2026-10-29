#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES (Engine Kernel)
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Engine Integrity Surface (Single Source of Truth)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Files that must NOT appear in `.checksums` because they change as part of
 * normal engine operation and would produce spurious ENGINE_INTEGRITY warnings.
 *
 * Per-project state caches (sync-docs, finalize, project-meta) live outside
 * the engine folder (in `.cache/` or `.magicspec/.cache/`) and never reach this set.
 * What remains is the engine version file, which is bumped on every release.
 *
 * Consumers:
 *   - generate-checksums.js — must skip these when building the manifest.
 *   - update-engine-meta.js — must skip these when detecting drift.
 *   - check-prerequisites.js — relies on the manifest above being clean.
 */
const VOLATILE_STATE_FILES = new Set([
    '.version', // bumped on every engine update; drift-detector already skips it
]);

/**
 * Where the maintenance scripts live, relative to the project root. The one place
 * the location is written: the maintenance-layout step changes this line and nothing
 * else. The scripts are never `require`d from the engine, only probed for and run.
 */
const MAINTENANCE_SCRIPTS_DIR = ['scripts'];

/** The line that shows which pre-commit hooks the installer wrote (and `remove` may delete). */
const HOOK_MARKER = '# Magic Spec Pre-commit Hook';

/**
 * Path of a maintenance script, whether or not it exists in this checkout.
 *
 * @param {string} name - File name, for example `generate-checksums.js`.
 * @returns {string} Absolute path under the project's maintenance folder.
 */
function maintenanceScript(name) {
    return path.join(resolveProjectRoot(), ...MAINTENANCE_SCRIPTS_DIR, name);
}

/**
 * @param {string} target - Path to canonicalize.
 * @returns {string} The real path, or the resolved path when it cannot be read.
 */
function realPathOrSelf(target) {
    try {
        return fs.realpathSync.native(target);
    } catch {
        return path.resolve(target);
    }
}

/**
 * Whether this checkout is the engine's own repository — as opposed to an
 * installation, which has the engine folder under a host directory and no
 * maintenance scripts.
 *
 * The predicate has two halves and needs both: the engine folder is where the
 * repository keeps it (`<root>/skills/magicspec`), and the manifest builder is in the
 * maintenance folder (`<root>/scripts`). A project may own a `scripts/` folder, and no host installs a skill at
 * `<root>/skills/`, so neither half alone is a signal. It is a presence probe,
 * never a `require`, so the engine still loads and runs with no maintenance
 * folder. It answers one question — "can this checkout bless an engine change by
 * regenerating `.checksums`?" — and decides which remedy an integrity failure may
 * name: C14 (`update-engine-meta`) in the developer repo, a restore from the
 * release archive everywhere else. It is the only place the question is asked.
 *
 * @returns {boolean} True in the developer repository, false in an installation.
 */
function hasEngineWriteTooling() {
    let root;
    try {
        root = resolveProjectRoot();
    } catch {
        return false;
    }
    const engine = realPathOrSelf(engineRoot());
    const inPlace = realPathOrSelf(path.join(root, 'skills', 'magicspec')) === engine;
    return inPlace && fs.existsSync(maintenanceScript('generate-checksums.js'));
}

// ───────────────────────────────────────────────────────────────────────────
// Dry-Run Guard (Read-Only Invariant)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Indicates whether the current process is running under dry-run semantics.
 * Set by orchestrators (e.g. sync.js) via MAGIC_DRY_RUN=1. All filesystem
 * mutation helpers below honor this flag — callers should prefer them over
 * raw fs.* write calls to preserve the read-only invariant.
 *
 * @returns {boolean} True when MAGIC_DRY_RUN is set to a truthy value.
 */
function isDryRun() {
    const v = process.env.MAGIC_DRY_RUN;
    return v === '1' || v === 'true';
}

/**
 * Writes a file, honoring MAGIC_DRY_RUN. In dry-run mode, logs the intended
 * mutation (path + whether content would actually change) and skips the write.
 *
 * @param {string} filePath - Absolute or relative target path.
 * @param {string|Buffer} content - Data to write.
 * @returns {boolean} True when a physical write occurred; false under dry-run.
 */
function writeFileSafe(filePath, content) {
    if (isDryRun()) {
        const existed = fs.existsSync(filePath);
        const changed = !existed || fs.readFileSync(filePath, 'utf8') !== String(content);
        const rel = path.relative(process.cwd(), filePath);
        const tag = existed ? (changed ? 'would modify' : 'unchanged') : 'would create';
        console.log(`  🧪 [dry-run] ${tag}: ${rel}`);
        return false;
    }
    fs.writeFileSync(filePath, content);
    return true;
}

/**
 * Appends to a file, honoring MAGIC_DRY_RUN.
 *
 * @param {string} filePath - Absolute or relative target path.
 * @param {string|Buffer} content - Data to append.
 * @returns {boolean} True when a physical append occurred; false under dry-run.
 */
function appendFileSafe(filePath, content) {
    if (isDryRun()) {
        const rel = path.relative(process.cwd(), filePath);
        console.log(`  🧪 [dry-run] would append to: ${rel}`);
        return false;
    }
    fs.appendFileSync(filePath, content);
    return true;
}

/**
 * Creates a directory (recursive), honoring MAGIC_DRY_RUN.
 *
 * @param {string} dirPath - Absolute or relative directory path.
 * @returns {boolean} True when a physical mkdir occurred; false under dry-run.
 */
function mkdirSafe(dirPath) {
    if (fs.existsSync(dirPath)) return false;
    if (isDryRun()) {
        const rel = path.relative(process.cwd(), dirPath);
        console.log(`  🧪 [dry-run] would create dir: ${rel}`);
        return false;
    }
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
}

/**
 * Converts Windows-style backslashes to POSIX forward slashes.
 * Use when emitting paths into JSON, logs, or any cross-platform surface.
 *
 * @param {string} p - Path with any separator mix.
 * @returns {string} Path using forward slashes only.
 */
function normalizePath(p) {
    return String(p).replace(/\\/g, '/');
}

/**
 * Calculates SHA256 hash of a file.
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @returns {string} Hex-encoded SHA256 hash.
 * @throws {Error} If the file cannot be read.
 */
function hashFile(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Calculates SHA256 hash of a file with retry safety for race conditions.
 * Returns null if the file does not exist.
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @param {number} [retry=5] - Number of retry attempts on read failure.
 * @returns {string|null} Hex-encoded SHA256 hash, or null if file missing.
 * @throws {Error} If all retries are exhausted.
 */
function hashFileSafe(filePath, retry = 5) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return hashFile(filePath);
    } catch (e) {
        if (retry > 0) {
            // Synchronous delay via busy-wait (200ms)
            const end = Date.now() + 200;
            while (Date.now() < end) {
                /* spin */
            }
            return hashFileSafe(filePath, retry - 1);
        }
        throw e;
    }
}

/**
 * Describes HOW a file differs from the hash its manifest recorded, so an
 * integrity finding can say more than "modified": both hashes, and whether the
 * bytes are the recorded content with other line endings — the difference that
 * is both common (autocrlf, an editor's `files.eol`, a tool that rewrites a
 * file) and invisible in an editor. A field report of two engine files flagged
 * and later found byte-identical to the release could not be explained
 * afterwards, because `modified locally` was printed alike for an edit, a
 * line-ending conversion and a swapped manifest, and no hash was recorded.
 *
 * Total by design: a diagnostic must never become a second failure, so an
 * unreadable file yields `null` and the caller simply omits the detail.
 *
 * @param {string} filePath - Path of the file on disk.
 * @param {string} expectedHash - Hex SHA-256 the manifest records for it.
 * @returns {{expected: string, actual: string, found: string, lineEndingsOnly: boolean, expectedEol: (string|null)}|null}
 *   `found` is the file's own line-ending style (`LF`, `CRLF`, `mixed`, `none`);
 *   `expectedEol` (`LF` or `CRLF`) is the style the manifest's bytes use, set only
 *   when line endings are the whole difference. `null` when the file cannot be read.
 */
function describeManifestDelta(filePath, expectedHash) {
    let buf;
    try {
        buf = fs.readFileSync(filePath);
    } catch {
        return null;
    }
    const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
    const actual = sha(buf);
    // 'latin1' maps every byte to exactly one code unit, so the decode/encode
    // round trip below is lossless for any content, multi-byte text included.
    const text = buf.toString('latin1');
    const crlf = (text.match(/\r\n/g) || []).length;
    const lf = (text.match(/(?<!\r)\n/g) || []).length;
    const found = crlf && lf ? 'mixed' : crlf ? 'CRLF' : lf ? 'LF' : 'none';

    let expectedEol = null;
    if (actual !== expectedHash) {
        const asLf = text.replace(/\r\n/g, '\n');
        if (sha(Buffer.from(asLf, 'latin1')) === expectedHash) expectedEol = 'LF';
        else if (sha(Buffer.from(asLf.replace(/\n/g, '\r\n'), 'latin1')) === expectedHash)
            expectedEol = 'CRLF';
    }
    return {
        expected: expectedHash,
        actual,
        found,
        lineEndingsOnly: expectedEol !== null,
        expectedEol,
    };
}

/**
 * Recursively collects all files in a directory.
 *
 * @param {string} dirPath - Root directory to scan.
 * @param {string[]} [ignoreDirs=['history']] - Directory names to skip.
 * @param {string[]} [arrayOfFiles=[]] - Accumulator for recursive calls.
 * @returns {string[]} Array of absolute file paths.
 */
function getAllFiles(dirPath, ignoreDirs = ['history'], arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    const path = require('path');

    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (ignoreDirs.includes(file)) return;
            getAllFiles(fullPath, ignoreDirs, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

// ───────────────────────────────────────────────────────────────────────────
// Scan Hygiene (Shared Skip Floor)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build/tooling noise directories that no engine scanner ever treats as a
 * scan target, regardless of its domain.
 *
 * This is the *shared* half of every scanner's skip list. Each scanner unions
 * it with its own domain excludes — directories that are out of scope for
 * that tool's question (e.g. `.magicspec` is excluded by extract-rationale but
 * is the primary subject of detect-communities). Domain excludes stay local
 * to each scanner by design; only genuinely tool-agnostic noise belongs here.
 *
 * The floor is kept hardcoded even though most projects gitignore these
 * paths: scanners union it with `loadGitignore` (never replace one with the
 * other), so projects whose .gitignore does not cover their build output are
 * still protected.
 *
 * @type {ReadonlyArray<string>}
 */
const BUILD_NOISE_DIRS = Object.freeze([
    'node_modules',
    '.git',
    '.venv',
    'venv',
    'env',
    'ENV',
    '__pycache__',
    '.pytest_cache',
    '.ruff_cache',
    'dist',
    'build',
    'target',
    'temp',
    'sandbox',
    '.hatch',
]);

// ───────────────────────────────────────────────────────────────────────────
// Project Location (Single Source of Truth)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Name of the SDD state folder at the project root. This is the one place the
 * name is spelled: scripts build state paths through `statePath()` and compare
 * against this constant, so a rename is a change here and in the shipped text.
 */
const STATE_DIR_NAME = '.magicspec';

/**
 * Name the state folder had in the 2.x layout. It is spelled here and nowhere else: the
 * executor stops on it (a project that has not been migrated) and `migrate` renames it.
 */
const LEGACY_STATE_DIR_NAME = '.design';

/**
 * Builds a path inside the state folder of a project.
 *
 * @param {string} rootDir - Project root (see `resolveProjectRoot`).
 * @param {...string} segments - Path segments below the state folder.
 * @returns {string} `<rootDir>/<state folder>/<segments>`.
 */
function statePath(rootDir, ...segments) {
    return path.join(rootDir, STATE_DIR_NAME, ...segments);
}

/**
 * Locates the engine folder — the one that holds `.version`, `templates/` and
 * `scripts/` — from this file's own location. It is the only fixed point the
 * engine has: a script that needs a template, a role card or the version asks
 * here instead of counting `..` from its own depth. The result is the real
 * location, which for a linked or cached installation lies outside the project.
 *
 * @returns {string} Absolute path of the engine folder.
 */
function engineRoot() {
    return path.resolve(__dirname, '..');
}

/**
 * The engine folder as a command line should name it: relative to the project
 * root when it lies inside the project (`skills/magicspec` here, `.agents/skills/magicspec`
 * in an installation), absolute when it lies
 * outside (a linked or cached installation). The executor exports the path it
 * was started by as `MAGIC_ENGINE_DIR`, so a skill folder reached through a link
 * is named by the link — the path the project can run — and not by the real
 * location Node resolves it to.
 *
 * @returns {string} Forward-slash path, without a trailing slash.
 */
function engineRel() {
    const engine = process.env.MAGIC_ENGINE_DIR ? path.resolve(process.env.MAGIC_ENGINE_DIR) : engineRoot();
    let root;
    try {
        root = resolveProjectRoot();
    } catch {
        root = process.cwd();
    }
    const rel = normalizePath(path.relative(root, engine));
    if (rel === '') return '.';
    return rel.startsWith('..') || path.isAbsolute(rel) ? normalizePath(engine) : rel;
}

/**
 * The command that starts the executor, as printed in hints and remedies.
 *
 * @returns {string} `node <engine folder>/scripts/executor.js`.
 */
function executorHint() {
    return `node ${engineRel()}/scripts/executor.js`;
}

/**
 * @param {string} candidate - Path to probe.
 * @returns {boolean} True when the path exists and is a directory.
 */
function isDirectory(candidate) {
    try {
        return fs.statSync(candidate).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Finds the project an engine command acts on, from the working context and
 * never from the engine's own location (the engine may be linked, cached or
 * installed at any depth). The first of these decides:
 *
 *   1. the explicit root — `opts.root` (the `--root` argument), then `MAGIC_ROOT`;
 *   2. the nearest ancestor of the working directory that holds the state folder;
 *   3. the nearest ancestor that holds a `.git` entry (a directory or a file);
 *   4. the working directory itself — a project that has neither yet.
 *
 * Ancestors are walked on the path the operating system reports for the working
 * directory; links are not resolved, so a project reached through a junction
 * keeps the project's own ancestors.
 *
 * @param {{root?: string, cwd?: string, env?: NodeJS.ProcessEnv}} [opts] - Overrides; defaults are the process state.
 * @returns {string} Absolute project root.
 * @throws {Error} When an explicit root names something that is not a directory.
 */
function resolveProjectRoot(opts = {}) {
    const cwd = path.resolve(opts.cwd || process.cwd());
    const env = opts.env || process.env;
    const explicit = opts.root || env.MAGIC_ROOT;

    if (explicit) {
        const abs = path.resolve(cwd, explicit);
        if (!isDirectory(abs)) {
            const source = opts.root ? '--root' : 'MAGIC_ROOT';
            throw new Error(`Project root '${abs}' (from ${source}) is not a directory.`);
        }
        return abs;
    }

    const ancestors = [];
    for (let dir = cwd; ; ) {
        ancestors.push(dir);
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return (
        ancestors.find((dir) => isDirectory(path.join(dir, STATE_DIR_NAME))) ||
        ancestors.find((dir) => fs.existsSync(path.join(dir, '.git'))) ||
        cwd
    );
}

// ───────────────────────────────────────────────────────────────────────────
// Graph Artifact Locations (Single Source of Truth)
// ───────────────────────────────────────────────────────────────────────────

/** Name of the folder, inside the state folder, that holds everything the graph derives. */
const GRAPH_DIR_NAME = 'graph';

/**
 * Locates the artifacts the graph subsystem derives. They all live in one folder
 * because the wiki, the page and the snapshots are generated from the graph and
 * are stale the moment it is. The general state cache (`.cache/`) is not graph
 * specific and stays where it is.
 *
 * `legacy` names the places the same artifacts occupied before they were
 * gathered; they are regenerated, so a project on the earlier layout loses
 * nothing when they are removed.
 *
 * @param {string} designAbs - Absolute path of the state folder (the one holding `workspace.json`).
 * @returns {{dir: string, cache: string, wiki: string, html: string, snapshot: string, before: string, legacy: string[]}}
 */
function graphPaths(designAbs) {
    const dir = path.join(designAbs, GRAPH_DIR_NAME);
    return {
        dir,
        cache: path.join(dir, '.cache'),
        wiki: path.join(dir, 'wiki'),
        html: path.join(dir, 'graph.html'),
        snapshot: path.join(dir, 'snapshot.json'),
        before: path.join(dir, 'before.json'),
        legacy: [
            path.join(designAbs, '.graph-cache'),
            path.join(designAbs, 'wiki'),
            path.join(designAbs, 'spec-graph.html'),
            path.join(designAbs, 'graph-snapshot.json'),
            path.join(designAbs, 'graph-before.json'),
        ],
    };
}

/** Which earlier locations each graph writer replaces (base names inside the state folder). */
const LEGACY_GRAPH_GROUPS = Object.freeze({
    wiki: ['.graph-cache', 'wiki', 'graph-snapshot.json', 'graph-before.json'],
    page: ['spec-graph.html'],
});

/**
 * Retires graph artifacts left at their earlier locations, once the writer that
 * replaces them has succeeded. Only the exact legacy names of the requested group are
 * touched, never a folder by pattern: `wiki` covers what the wiki export replaces
 * (the cache, the wiki, the two snapshot files), `page` what the page writer replaces. The cache, the wiki and the page are
 * regenerated, so they are removed; the two snapshot files carry a baseline the
 * next comparison needs, so they are moved into the graph folder unless a file is
 * already there. Under dry-run nothing is touched and the names are still returned.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {string} rootDir - Project root, for the paths in the returned list.
 * @param {'wiki'|'page'} group - Which writer has just succeeded.
 * @returns {string[]} Project-relative paths that were (or, under dry-run, would be) retired.
 */
function retireLegacyGraph(designAbs, rootDir, group) {
    const names = LEGACY_GRAPH_GROUPS[group];
    if (!names) throw new Error(`Unknown legacy graph group '${group}'.`);
    const paths = graphPaths(designAbs);
    const moved = {
        'graph-snapshot.json': paths.snapshot,
        'graph-before.json': paths.before,
    };
    const retired = [];
    for (const legacyPath of paths.legacy) {
        const name = path.basename(legacyPath);
        if (!names.includes(name) || !fs.existsSync(legacyPath)) continue;
        retired.push(normalizePath(path.relative(rootDir, legacyPath)));
        if (isDryRun()) continue;
        const target = moved[name];
        if (target && !fs.existsSync(target)) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.renameSync(legacyPath, target);
        } else {
            fs.rmSync(legacyPath, { recursive: true, force: true });
        }
    }
    return retired;
}

// ───────────────────────────────────────────────────────────────────────────
// CLI Argument Grammar (Single Source of Truth)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Canonical shape of a workspace *name* (not a path): the value accepted by
 * `--workspace` on `executor.js`. Shared so every guard rejects the same set.
 *
 * Scripts that take a workspace *directory* (`update-state.js`) must NOT use
 * this — a directory legitimately contains separators.
 */
const WORKSPACE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/**
 * Parses an argv slice under one grammar shared by every engine entry point.
 *
 * Both `--flag=value` and `--flag value` are accepted for value-taking flags —
 * a divergence here is what let `--workspace docs` silently fall back to the
 * default workspace while `--workspace=docs` worked.
 *
 * The parser **fails closed**: a value-taking flag that is present but carries
 * no value is an error, never a silent default. The full remainder after the
 * first `=` is returned verbatim, so a malformed value like `a=b` reaches the
 * caller's validation instead of being truncated to `a`.
 *
 * Unrecognized tokens are returned in `rest` untouched, so a proxy (executor)
 * can forward them to a child process without knowing their grammar.
 *
 * @param {string[]} argv - Argument tokens (already sliced past the script name).
 * @param {{valueFlags?: string[], boolFlags?: string[]}} [spec] - Flag taxonomy.
 * @returns {{values: Object<string,string>, flags: Object<string,boolean>, rest: string[], errors: string[]}}
 */
function parseFlags(argv, spec = {}) {
    const valueFlags = new Set(spec.valueFlags || []);
    const boolFlags = new Set(spec.boolFlags || []);

    /** @type {Object<string,string>} */
    const values = Object.create(null);
    /** @type {Object<string,boolean>} */
    const flags = Object.create(null);
    /** @type {string[]} */
    const rest = [];
    /** @type {string[]} */
    const errors = [];

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        const eq = token.indexOf('=');
        const key = eq === -1 ? token : token.slice(0, eq);

        if (boolFlags.has(key)) {
            if (eq !== -1) errors.push(`'${key}' is a boolean flag and takes no value.`);
            else flags[key] = true;
            continue;
        }

        if (!valueFlags.has(key)) {
            rest.push(token);
            continue;
        }

        let value;
        if (eq !== -1) {
            value = token.slice(eq + 1);
        } else {
            const next = argv[i + 1];
            // A following flag means the value was omitted, not that it is `--x`.
            if (next === undefined || next.startsWith('--')) {
                errors.push(`'${key}' requires a value (use ${key}=<value> or ${key} <value>).`);
                continue;
            }
            value = next;
            i++;
        }

        if (value === '') {
            errors.push(`'${key}' requires a non-empty value.`);
            continue;
        }
        values[key] = value;
    }

    return { values, flags, rest, errors };
}

// ───────────────────────────────────────────────────────────────────────────
// Gitignore Filtering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Translates one gitignore glob into a regular-expression source fragment.
 *
 * Glob semantics (not regex): `*` spans a single path segment, `?` one
 * character, `**` crosses segment boundaries. Every other regex metacharacter
 * is escaped so patterns like `.*_cache` mean "literal dot, then anything".
 *
 * @param {string} pattern - Gitignore pattern with leading `!`, leading `/` and trailing `/` already stripped.
 * @returns {string} Regex source (unanchored).
 */
function globToRegexSource(pattern) {
    let source = '';

    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];

        if (char === '*') {
            if (pattern[i + 1] === '*') {
                // `**/` crosses directories (and may match zero of them); bare `**` matches anything.
                if (pattern[i + 2] === '/') {
                    source += '(?:.*/)?';
                    i += 2;
                } else {
                    source += '.*';
                    i += 1;
                }
            } else {
                source += '[^/]*';
            }
        } else if (char === '?') {
            source += '[^/]';
        } else {
            source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }

    return source;
}

/**
 * Loads `.gitignore` and compiles it into a path predicate that follows real
 * gitignore semantics for the subset relevant to source scanning:
 *
 *   - rules are **ordered**, and the *last* matching rule decides — this is what
 *     makes the `.env*` + `!.env.example` idiom work
 *   - a pattern containing a slash anywhere but the end is anchored to the root
 *     (`/dist`, `docs/build/`); otherwise it matches at any depth (`node_modules`)
 *   - globs are path-aware: `*` and `?` stop at `/`, `**` crosses segments
 *   - an ignored **directory** cannot be rescued by a negation inside it, matching
 *     git's own rule; ancestors are therefore evaluated before the leaf
 *   - `#` comments and blank lines are skipped
 *
 * Trailing-slash (directory-only) patterns are applied to the leaf as well,
 * since callers invoke this predicate on directory entries to prune the walk.
 * A regular file whose name collides with a directory-only pattern is therefore
 * also ignored — an accepted, vanishingly rare imprecision.
 *
 * @param {string} [rootDir='.'] - Project root containing `.gitignore`.
 * @returns {function(string): boolean} Predicate: true when the relative path is ignored.
 */
function loadGitignore(rootDir = '.') {
    let content;
    try {
        content = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
    } catch {
        return () => false;
    }

    /** @type {{ re: RegExp, negated: boolean }[]} Ordered rules; last match wins. */
    const rules = [];

    for (const raw of content.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;

        const negated = line.startsWith('!');
        const body = (negated ? line.slice(1) : line).replace(/\/+$/, '');
        if (!body) continue;

        // Anchored when a separator appears at the start or the middle.
        const rooted = body.startsWith('/') || body.slice(0, -1).includes('/');
        const source = globToRegexSource(body.replace(/^\/+/, ''));
        if (!source) continue;

        rules.push({
            re: new RegExp(rooted ? `^${source}$` : `^(?:.*/)?${source}$`),
            negated,
        });
    }

    if (rules.length === 0) return () => false;

    /**
     * @param {string} relPath - Path relative to `rootDir`, any separator style.
     * @returns {boolean} True when the path lies inside an ignored tree.
     */
    return function isIgnored(relPath) {
        const normalized = normalizePath(relPath);
        if (!normalized || normalized === '.') return false;

        const parts = normalized.split('/');
        let prefix = '';

        for (let i = 0; i < parts.length; i++) {
            prefix = i === 0 ? parts[0] : `${prefix}/${parts[i]}`;

            // Last matching rule wins, exactly as git resolves conflicts.
            let ignored = false;
            for (const rule of rules) {
                if (rule.re.test(prefix)) ignored = !rule.negated;
            }

            // An excluded ancestor is final: git never descends to re-include.
            if (ignored) return true;
        }

        return false;
    };
}

/**
 * Resolves the root .magicspec/ directory that contains workspace.json.
 * If MAGIC_DESIGN_DIR points to a workspace subdirectory, walks up one level.
 *
 * @param {string} rootDir - Project root (process.cwd()).
 * @returns {{designDir: string, designAbs: string}}
 */
function resolveDesignRoot(rootDir) {
    const envDir = process.env.MAGIC_DESIGN_DIR || STATE_DIR_NAME;
    const candidate = path.resolve(rootDir, envDir);
    if (fs.existsSync(path.join(candidate, 'workspace.json'))) {
        return { designDir: envDir, designAbs: candidate };
    }
    const parent = path.dirname(candidate);
    if (parent !== candidate && fs.existsSync(path.join(parent, 'workspace.json'))) {
        return { designDir: path.relative(rootDir, parent), designAbs: parent };
    }
    return { designDir: envDir, designAbs: candidate };
}

module.exports = {
    hashFile,
    hashFileSafe,
    describeManifestDelta,
    getAllFiles,
    normalizePath,
    isDryRun,
    writeFileSafe,
    appendFileSafe,
    mkdirSafe,
    loadGitignore,
    resolveDesignRoot,
    resolveProjectRoot,
    statePath,
    engineRoot,
    engineRel,
    executorHint,
    graphPaths,
    retireLegacyGraph,
    parseFlags,
    GRAPH_DIR_NAME,
    STATE_DIR_NAME,
    LEGACY_STATE_DIR_NAME,
    BUILD_NOISE_DIRS,
    WORKSPACE_NAME_RE,
    VOLATILE_STATE_FILES,
    hasEngineWriteTooling,
    maintenanceScript,
    HOOK_MARKER,
};
