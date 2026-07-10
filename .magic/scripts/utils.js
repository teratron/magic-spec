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
 * `.magic/` (in `dev/.cache/` or `.design/.cache/`) and never reach this set.
 * What remains is the engine version file, which is bumped on every release.
 *
 * Consumers:
 *   - generate-checksums.js — must skip these when building the manifest.
 *   - update-engine-meta.js — must skip these when detecting drift.
 *   - check-prerequisites.js — relies on the manifest above being clean.
 */
const VOLATILE_STATE_FILES = new Set([
    '.version',   // bumped on every engine update; drift-detector already skips it
]);

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
            while (Date.now() < end) { /* spin */ }
            return hashFileSafe(filePath, retry - 1);
        }
        throw e;
    }
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
 * that tool's question (e.g. `.design` is excluded by extract-rationale but
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
    'node_modules', '.git',
    '.venv', 'venv', 'env', 'ENV',
    '__pycache__', '.pytest_cache', '.ruff_cache',
    'dist', 'build', 'target', 'temp', 'sandbox', '.hatch',
]);

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
 * a divergence here is what let `--workspace nodus` silently fall back to the
 * default workspace while `--workspace=nodus` worked.
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
 * Resolves the root .design/ directory that contains workspace.json.
 * If MAGIC_DESIGN_DIR points to a workspace subdirectory, walks up one level.
 *
 * @param {string} rootDir - Project root (process.cwd()).
 * @returns {{designDir: string, designAbs: string}}
 */
function resolveDesignRoot(rootDir) {
    const envDir = process.env.MAGIC_DESIGN_DIR || '.design';
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
    getAllFiles,
    normalizePath,
    isDryRun,
    writeFileSafe,
    appendFileSafe,
    mkdirSafe,
    loadGitignore,
    resolveDesignRoot,
    parseFlags,
    BUILD_NOISE_DIRS,
    WORKSPACE_NAME_RE,
    VOLATILE_STATE_FILES,
};
