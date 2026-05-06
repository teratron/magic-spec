#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const { normalizePath } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// GIT UTILITIES (Read-Only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Thin read-only wrappers around git porcelain commands. This module NEVER
 * calls git write operations (commit, add, rm, push, tag, stash, etc.).
 * Any caller that needs to mutate the repo must do so outside this module.
 */

// ───────────────────────────────────────────────────────────────────────────
// Repo Detection
// ───────────────────────────────────────────────────────────────────────────

/**
 * Returns true when `cwd` is inside a git repository.
 *
 * @param {string} cwd
 * @returns {boolean}
 */
function isGitRepo(cwd) {
    try {
        execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns the current HEAD SHA (short 8-char), or null when unavailable.
 *
 * @param {string} cwd
 * @returns {string|null}
 */
function headSha(cwd) {
    try {
        return execSync('git rev-parse --short=8 HEAD', { cwd, encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Changed File Lists
// ───────────────────────────────────────────────────────────────────────────

/**
 * Returns POSIX-style paths of files changed since HEAD (staged + unstaged),
 * plus untracked files. Deduped.
 *
 * @param {string} cwd
 * @returns {string[]}
 */
function changedPaths(cwd) {
    let tracked = '';
    try {
        tracked = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf8' });
    } catch {
        try {
            tracked = execSync('git ls-files', { cwd, encoding: 'utf8' });
        } catch {
            tracked = '';
        }
    }
    let untracked = '';
    try {
        untracked = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf8' });
    } catch {
        untracked = '';
    }
    const all = (tracked + '\n' + untracked)
        .split(/\r?\n/)
        .map((s) => normalizePath(s.trim()))
        .filter(Boolean);
    return Array.from(new Set(all));
}

/**
 * Returns stat info (additions/deletions) for a single file vs HEAD.
 *
 * @param {string} cwd
 * @param {string} relPath
 * @returns {{added: number, deleted: number}}
 */
function fileNumstat(cwd, relPath) {
    try {
        const out = execSync(
            `git diff --numstat HEAD -- "${relPath}"`,
            { cwd, encoding: 'utf8' }
        ).trim();
        if (!out) return { added: 0, deleted: 0 };
        const [a, d] = out.split(/\s+/);
        return { added: parseInt(a, 10) || 0, deleted: parseInt(d, 10) || 0 };
    } catch {
        return { added: 0, deleted: 0 };
    }
}

/**
 * Returns the porcelain status code for a single file.
 * Values: 'added' | 'modified' | 'deleted' | 'renamed' | 'unknown'.
 *
 * @param {string} cwd
 * @param {string} relPath
 * @returns {string}
 */
function fileStatus(cwd, relPath) {
    try {
        const out = execSync(
            `git status --porcelain -- "${relPath}"`,
            { cwd, encoding: 'utf8' }
        ).trim();
        if (!out) return 'unknown';
        const code = out.slice(0, 2);
        if (code === '??' || code.includes('A')) return 'added';
        if (code.includes('D')) return 'deleted';
        if (code.includes('R')) return 'renamed';
        return 'modified';
    } catch {
        return 'unknown';
    }
}

/**
 * Returns true when a file is new (untracked or staged as added vs HEAD).
 *
 * @param {string} cwd
 * @param {string} relPath
 * @returns {boolean}
 */
function isNewFile(cwd, relPath) {
    return fileStatus(cwd, relPath) === 'added';
}

module.exports = {
    isGitRepo,
    headSha,
    changedPaths,
    fileNumstat,
    fileStatus,
    isNewFile,
};
