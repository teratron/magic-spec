const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { hashFileSafe, normalizePath } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// SIGNIFICANCE DETECTOR (Whitelist × Git Diff)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Decides whether a workflow's outcome is "significant" enough to trigger
 * a project-version bump and CHANGELOG entry. Significance is a hard
 * whitelist of artifact patterns per workflow — no fuzzy heuristics, no
 * full-workspace digest. Two changes that touch the same whitelist
 * pattern are equally significant; everything else is ignored.
 *
 * Detection is git-first: `git diff --name-only HEAD` ∪ untracked files.
 * Fallback (no git, broken repo, etc.): SHA snapshot from caller-supplied
 * state. This keeps the script usable in non-git contexts (rare but real).
 */

// ───────────────────────────────────────────────────────────────────────────
// Whitelist
// ───────────────────────────────────────────────────────────────────────────

/**
 * Workflow → list of glob patterns that count as significant.
 * `{ws}` is replaced with the resolved workspace name at match-time.
 * `.design/` paths are workspace-rooted; `.design/RULES.md` is global.
 */
const WHITELIST = {
    'magic.spec': [
        '.design/{ws}/specifications/**/*.md',
        '.design/{ws}/INDEX.md',
    ],
    'magic.task': [
        '.design/{ws}/PLAN.md',
        '.design/{ws}/TASKS.md',
        '.design/{ws}/tasks/**/*.md',
    ],
    'magic.run': [
        '.design/{ws}/TASKS.md',
        '.design/{ws}/STATE.md',
        '.design/{ws}/archives/**/*',
        '.design/{ws}/tasks/**/*.md',
    ],
    'magic.rule': [
        '.design/RULES.md',
        '.design/{ws}/RULES.md',
    ],
};

/**
 * Workflow categories for downstream consumers (changelog/commit). The
 * actual category may be overridden per-file (e.g. spec → Added vs Changed
 * depending on whether the file is new).
 */
const DEFAULT_CATEGORIES = {
    'magic.spec': 'Changed',  // promoted to 'Added' if all matched files are new
    'magic.task': 'Changed',
    'magic.run': 'Changed',
    'magic.rule': 'Changed',
};

// ───────────────────────────────────────────────────────────────────────────
// Glob Matcher (Minimal, Dependency-Free)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compiles a simple POSIX-glob into a RegExp. Supports `**`, `*`, `?`.
 * Sufficient for our whitelist; no brace expansion or character classes.
 *
 * @param {string} pattern - Glob string (POSIX-style separators).
 * @returns {RegExp}
 */
function compileGlob(pattern) {
    let re = '';
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i];
        if (c === '*') {
            if (pattern[i + 1] === '*') {
                re += '.*';
                i++;
                if (pattern[i + 1] === '/') i++;  // consume trailing slash of `**/`
            } else {
                re += '[^/]*';
            }
        } else if (c === '?') {
            re += '[^/]';
        } else if ('.+^$(){}|\\'.includes(c)) {
            re += '\\' + c;
        } else {
            re += c;
        }
    }
    return new RegExp('^' + re + '$');
}

/**
 * Tests a single path against a list of compiled patterns.
 *
 * @param {string} relPath - POSIX-style relative path.
 * @param {RegExp[]} compiled - Pre-compiled glob patterns.
 * @returns {boolean}
 */
function matchAny(relPath, compiled) {
    return compiled.some((re) => re.test(relPath));
}

/**
 * Resolves whitelist patterns for a workflow against a workspace name.
 *
 * @param {string} workflow - One of `magic.spec|task|run|rule`.
 * @param {string} workspace - Workspace name (no leading slash).
 * @returns {{patterns: string[], compiled: RegExp[]}}
 */
function resolveWhitelist(workflow, workspace) {
    const patterns = (WHITELIST[workflow] || []).map((p) => p.replace(/\{ws\}/g, workspace));
    const compiled = patterns.map(compileGlob);
    return { patterns, compiled };
}

// ───────────────────────────────────────────────────────────────────────────
// Git Probe
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists changed paths in the working tree (vs HEAD) plus untracked files.
 * Returns POSIX-style relative paths.
 *
 * @param {string} cwd - Project root.
 * @returns {{available: boolean, paths: string[], error?: string}}
 *   `available=false` when git is not usable (no repo, no binary, etc.).
 */
function gitChangedPaths(cwd) {
    try {
        execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
    } catch {
        return { available: false, paths: [], error: 'not-a-git-repo' };
    }

    let tracked = '';
    let untracked = '';
    try {
        // `git diff --name-only HEAD` covers staged + unstaged vs HEAD; on a
        // brand-new repo without HEAD, this throws — handle below.
        tracked = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf8' });
    } catch {
        // No HEAD yet (initial commit not made) — fall back to all tracked
        // and untracked as "changed".
        try {
            tracked = execSync('git ls-files', { cwd, encoding: 'utf8' });
        } catch (e) {
            return { available: false, paths: [], error: e.message };
        }
    }
    try {
        untracked = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf8' });
    } catch {
        // Non-fatal — proceed with tracked only.
    }

    const all = (tracked + '\n' + untracked)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(normalizePath);

    return { available: true, paths: Array.from(new Set(all)) };
}

/**
 * Returns the file's status relative to HEAD: `added`, `modified`, `deleted`,
 * or `unknown`. Uses porcelain status for reliability.
 *
 * @param {string} cwd - Project root.
 * @param {string} relPath - Relative path.
 * @returns {string}
 */
function gitFileStatus(cwd, relPath) {
    try {
        const out = execSync(`git status --porcelain -- "${relPath}"`, { cwd, encoding: 'utf8' }).trim();
        if (!out) return 'unknown';
        const code = out.slice(0, 2);
        if (code.includes('A') || code === '??') return 'added';
        if (code.includes('D')) return 'deleted';
        return 'modified';
    } catch {
        return 'unknown';
    }
}

/**
 * Reads the unified diff for a single file (workspace vs HEAD), zero context.
 * Empty string if not in git or no diff.
 *
 * @param {string} cwd
 * @param {string} relPath
 * @returns {string}
 */
function gitFileDiff(cwd, relPath) {
    try {
        return execSync(`git diff --unified=0 HEAD -- "${relPath}"`, { cwd, encoding: 'utf8' });
    } catch {
        return '';
    }
}

/**
 * Returns line-add/line-del counts for a file (vs HEAD). Best-effort.
 *
 * @param {string} cwd
 * @param {string} relPath
 * @returns {{added: number, deleted: number}}
 */
function gitFileNumstat(cwd, relPath) {
    try {
        const out = execSync(`git diff --numstat HEAD -- "${relPath}"`, { cwd, encoding: 'utf8' }).trim();
        if (!out) return { added: 0, deleted: 0 };
        const [addStr, delStr] = out.split(/\s+/);
        return {
            added: parseInt(addStr, 10) || 0,
            deleted: parseInt(delStr, 10) || 0,
        };
    } catch {
        return { added: 0, deleted: 0 };
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Snapshot Fallback (No Git)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Computes file hashes for a list of candidate files. Returns map of
 * relPath → sha256 (or null if missing). Used to detect changes when
 * git is unavailable: caller compares against `state.lastSnapshot`.
 *
 * @param {string} rootDir - Project root.
 * @param {string[]} relPaths - POSIX-style relative paths.
 * @returns {Object.<string, string|null>}
 */
function snapshotHashes(rootDir, relPaths) {
    const out = {};
    for (const rel of relPaths) {
        const abs = path.join(rootDir, rel);
        out[rel] = fs.existsSync(abs) ? hashFileSafe(abs) : null;
    }
    return out;
}

/**
 * Compares two snapshot maps. Returns the list of paths whose hash differs
 * (added, removed, or modified).
 *
 * @param {Object.<string, string|null>} prev
 * @param {Object.<string, string|null>} next
 * @returns {string[]}
 */
function diffSnapshots(prev, next) {
    const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
    const out = [];
    for (const k of keys) {
        if ((prev || {})[k] !== (next || {})[k]) out.push(k);
    }
    return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Run-Specific Heuristic
// ───────────────────────────────────────────────────────────────────────────

/**
 * For `magic.run`: a TASKS.md edit is significant only when a task status
 * marker actually flipped (`- [ ]` ↔ `- [x]`, or status keyword changed).
 * Pure wording edits with no status flip are not significant.
 *
 * @param {string} cwd - Project root.
 * @param {string} relPath - TASKS.md relative path.
 * @returns {boolean} True when status lines actually changed.
 */
function tasksStatusActuallyChanged(cwd, relPath) {
    const diff = gitFileDiff(cwd, relPath);
    if (!diff) return false;
    // Match diff lines that look like checklist or status markers:
    //   `+ - [x]`, `- - [ ]`, `+ status: blocked`, etc.
    const statusLine = /^[+-](?!\+\+|--)\s*(?:-\s*\[[x ]\]|status:|Status:)/m;
    return statusLine.test(diff);
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Computes the significant-changes report for a workflow invocation.
 *
 * @param {Object} opts
 * @param {string} opts.cwd - Project root (typically `process.cwd()`).
 * @param {string} opts.workflow - `magic.spec|task|run|rule`.
 * @param {string} opts.workspace - Workspace name.
 * @param {Object.<string, string|null>} [opts.lastSnapshot] - Prior hashes (fallback).
 * @returns {{
 *   significant: boolean,
 *   files: Array<{path: string, status: string, added: number, deleted: number}>,
 *   patterns: string[],
 *   defaultCategory: string,
 *   gitAvailable: boolean,
 *   nextSnapshot: Object.<string, string|null>,
 *   reason?: string
 * }}
 */
function computeSignificance({ cwd, workflow, workspace, lastSnapshot }) {
    const { patterns, compiled } = resolveWhitelist(workflow, workspace);
    const defaultCategory = DEFAULT_CATEGORIES[workflow] || 'Changed';

    const probe = gitChangedPaths(cwd);
    let candidates;

    if (probe.available) {
        candidates = probe.paths.filter((p) => matchAny(p, compiled));
    } else {
        // Fallback: hash all files matching the whitelist on disk and diff
        // against lastSnapshot. Patterns with `**` cannot be enumerated
        // without a globbing pass — for the snapshot fallback we expand
        // only the literal paths and any direct matches under tracked dirs.
        const literalPaths = patterns.filter((p) => !p.includes('*'));
        const next = snapshotHashes(cwd, literalPaths);
        const diffPaths = diffSnapshots(lastSnapshot || {}, next);
        candidates = diffPaths;
    }

    // magic.run extra filter: TASKS.md must show a real status flip.
    if (workflow === 'magic.run' && probe.available) {
        candidates = candidates.filter((p) => {
            const tasksMd = `.design/${workspace}/TASKS.md`;
            if (p === tasksMd) return tasksStatusActuallyChanged(cwd, p);
            return true;
        });
    }

    const files = candidates.map((p) => ({
        path: p,
        status: probe.available ? gitFileStatus(cwd, p) : 'unknown',
        ...(probe.available ? gitFileNumstat(cwd, p) : { added: 0, deleted: 0 }),
    }));

    const significant = files.length > 0;

    // Build next snapshot for state file (always — even when not significant,
    // so non-git mode can pick up future changes).
    const nextSnapshot = snapshotHashes(cwd, patterns.filter((p) => !p.includes('*')));

    return {
        significant,
        files,
        patterns,
        defaultCategory,
        gitAvailable: probe.available,
        nextSnapshot,
        reason: significant ? undefined : (probe.available ? 'no-whitelist-matches' : 'no-snapshot-diff'),
    };
}

module.exports = {
    WHITELIST,
    DEFAULT_CATEGORIES,
    compileGlob,
    matchAny,
    resolveWhitelist,
    gitChangedPaths,
    gitFileStatus,
    gitFileDiff,
    gitFileNumstat,
    snapshotHashes,
    diffSnapshots,
    tasksStatusActuallyChanged,
    computeSignificance,
};
