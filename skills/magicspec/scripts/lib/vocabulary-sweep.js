'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { engineRel, normalizePath, STATE_DIR_NAME, LEGACY_STATE_DIR_NAME } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARY SWEEP (the references to the earlier layout inside a migrated project)
// ═══════════════════════════════════════════════════════════════════════════
//
// After the state folder is renamed, the project's own SDD artifacts still say what the
// earlier layout said: its command names, its state-folder name, its engine-folder name.
// Those words are the engine's vocabulary, and a stale one misleads every later workflow.
// The sweep rewrites them in the artifacts the migration is allowed to edit, and only
// reports them anywhere else. It is a plan first (`planSweep` touches nothing) and a write
// second (`applySweep`), and a second run finds nothing left to do.

/** The commands the earlier layout printed as `/magic.<command>`. */
const OLD_COMMANDS = ['spec', 'task', 'run', 'analyze', 'rule', 'status', 'graph'];

/** `/magic.spec`, not `/magic.spec.md` and not `/magic.spec-x`. */
const COMMAND_RE = new RegExp(`/magic\\.(${OLD_COMMANDS.join('|')})(?![\\w-]|\\.\\w)`, 'g');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The earlier state folder as a path segment: `.design/x`, `` `.design` ``, not `x.design` or `.designs`. */
const STATE_RE = new RegExp(`(^|[^\\w.-])${escapeRe(LEGACY_STATE_DIR_NAME)}(?=/|[^\\w-]|$)`, 'g');

/** The earlier engine folder with its slash: `.magic/scripts/...`, never `.magicspec/`. */
const ENGINE_RE = /(^|[^\w.-])\.magic\//g;

/** Sections that record what was true when they were written. */
const HISTORY_SECTION = /^## (Document History|Recent Decisions)\b/;

/** Folders and files of the state folder that are history, generated, or someone else's output. */
const SKIPPED_DIRS = new Set(['archives', 'graph', 'node_modules']);
const SKIPPED_FILES = new Set(['RETROSPECTIVE.md', 'CHANGELOG.md']);

/** The constitution changes through its own workflow; the sweep reports what it finds there. */
const REPORT_ONLY_FILES = new Set(['RULES.md']);

/** Text a product scan reads; anything else is not looked into. */
const PRODUCT_EXTENSIONS = new Set([
    '.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.sh',
    '.yml', '.yaml', '.toml', '.html', '.css',
]);
const PRODUCT_MAX_BYTES = 512 * 1024;
const PRODUCT_REPORT_LIMIT = 10;

/** Folders of a host or of the engine: projections and installed code, not the project's product. */
const HOST_FOLDERS = ['.claude', '.agents', '.qwen', '.codex', '.gemini', '.cursor'];

// ───────────────────────────────────────────────────────────────────────────
// Rewriting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Rewrites the earlier vocabulary in one text, leaving the history sections as they are.
 *
 * @param {string} text - File content.
 * @param {string|null} engineFolder - Where the engine lies now, project-relative; null leaves `.magic/` alone.
 * @returns {{text: string, count: number}} The new content and how many words were replaced.
 */
function rewriteVocabulary(text, engineFolder) {
    let count = 0;
    let inHistory = false;
    const out = text.split('\n').map((line) => {
        if (line.startsWith('## ')) inHistory = HISTORY_SECTION.test(line);
        if (inHistory) return line;
        let next = line.replace(COMMAND_RE, (_, name) => {
            count++;
            return `/magicspec ${name}`;
        });
        next = next.replace(STATE_RE, (_, before) => {
            count++;
            return `${before}${STATE_DIR_NAME}`;
        });
        if (engineFolder) {
            next = next.replace(ENGINE_RE, (_, before) => {
                count++;
                return `${before}${engineFolder}/`;
            });
        }
        return next;
    });
    return { text: out.join('\n'), count };
}

/**
 * @param {string} text - File content.
 * @returns {{token: string, line: number}|null} The first earlier word the text uses, or null.
 */
function firstEarlierWord(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        for (const re of [COMMAND_RE, STATE_RE, ENGINE_RE]) {
            re.lastIndex = 0;
            const hit = re.exec(lines[i]);
            if (hit) return { token: hit[0].trim(), line: i + 1 };
        }
    }
    return null;
}

/**
 * Adds a patch version and a Document History row to a specification text.
 *
 * @param {string} text - The specification, already rewritten.
 * @param {string} date - ISO date for the row.
 * @returns {{text: string, from: string, to: string}|null} Null when the header has no
 *   version or the history has no table to extend.
 */
function bumpSpecification(text, date) {
    const version = /^(\*\*Version:\*\*\s*)(\d+)\.(\d+)\.(\d+)/m.exec(text);
    if (!version) return null;
    const lines = text.split('\n');
    const heading = lines.findIndex((l) => /^## Document History\b/.test(l));
    if (heading < 0) return null;
    const separator = lines.findIndex(
        (l, i) => i > heading && /^\|\s*:?-{3,}/.test(l),
    );
    if (separator < 0) return null;

    const from = `${version[2]}.${version[3]}.${version[4]}`;
    const to = `${version[2]}.${version[3]}.${Number(version[4]) + 1}`;
    const row = `| ${to} | ${date} | migrate | Reality sync after the migration to the single-skill layout: the earlier command and folder names are rewritten to the present ones. No requirement changed. |`;
    lines.splice(separator + 1, 0, row);
    const joined = lines.join('\n');
    const bumped = joined.replace(
        /^(\*\*Version:\*\*\s*)\d+\.\d+\.\d+/m,
        (_, head) => `${head}${to}`,
    );
    return { text: bumped, from, to };
}

// ───────────────────────────────────────────────────────────────────────────
// Planning
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} stateDir - Absolute state folder.
 * @returns {string[]} Absolute paths of the Markdown artifacts the sweep may read.
 */
function collectArtifacts(stateDir) {
    const files = [];
    const walk = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink()) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIPPED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
                walk(full);
            } else if (entry.name.endsWith('.md') && !SKIPPED_FILES.has(entry.name)) {
                files.push(full);
            }
        }
    };
    walk(stateDir);
    return files.sort();
}

/**
 * Lists the product files that still use the earlier words. They are the project's own and
 * are never edited.
 *
 * @param {string} root - Project root.
 * @param {string|null} engineFolder - Project-relative engine folder, to leave out.
 * @param {Set<string>} exclude - Project-relative files the migration is about to remove.
 * @returns {{files: {rel: string, line: number, token: string}[], total: number}}
 */
function scanProductFiles(root, engineFolder, exclude) {
    let rels;
    try {
        // Tracked files and new ones that are not ignored: the project's product as git sees it.
        const listing = execFileSync(
            'git',
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            {
                cwd: root,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                maxBuffer: 64 * 1024 * 1024,
            },
        );
        rels = listing.split('\0').filter(Boolean);
    } catch {
        rels = [];
        const walk = (dir) => {
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                return;
            }
            for (const entry of entries) {
                if (entry.isSymbolicLink() || entry.name === '.git' || entry.name === 'node_modules') {
                    continue;
                }
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else rels.push(normalizePath(path.relative(root, full)));
            }
        };
        walk(root);
    }

    const skipped = [
        `${STATE_DIR_NAME}/`,
        `${LEGACY_STATE_DIR_NAME}/`,
        '.magic/',
        'magicspec-migration-backup-',
        ...HOST_FOLDERS.map((f) => `${f}/`),
        ...(engineFolder ? [`${engineFolder}/`] : []),
    ];
    const found = [];
    for (const rel of rels) {
        if (skipped.some((s) => rel.startsWith(s)) || exclude.has(rel)) continue;
        if (!PRODUCT_EXTENSIONS.has(path.extname(rel).toLowerCase())) continue;
        const full = path.join(root, rel);
        let text;
        try {
            if (fs.statSync(full).size > PRODUCT_MAX_BYTES) continue;
            text = fs.readFileSync(full, 'utf8');
        } catch {
            continue;
        }
        const hit = firstEarlierWord(text);
        if (hit) found.push({ rel, line: hit.line, token: hit.token });
    }
    return { files: found.slice(0, PRODUCT_REPORT_LIMIT), total: found.length };
}

/**
 * Works out what the sweep would do, and changes nothing.
 *
 * @param {string} root - Project root.
 * @param {string} stateDir - Absolute state folder to read (the earlier one before the rename).
 * @param {{exclude?: string[]}} [options] - `exclude`: project-relative files that are about to be removed.
 * @returns {{
 *   edits: {rel: string, abs: string, replacements: number, bump: {from: string, to: string}|null, next: string}[],
 *   reportOnly: string[],
 *   unrewritten: {rel: string, reason: string}[],
 *   product: {files: {rel: string, line: number, token: string}[], total: number}
 * }}
 */
function planSweep(root, stateDir, options = {}) {
    const rel = (abs) => normalizePath(path.relative(root, abs));
    const folder = engineRel();
    // An engine folder outside the project has no stable project-relative name to write.
    const engineFolder =
        folder && !folder.startsWith('..') && !path.isAbsolute(folder) && !/^[A-Za-z]:/.test(folder)
            ? folder
            : null;
    const date = new Date().toISOString().slice(0, 10);

    const contents = new Map();
    const originals = new Map();
    const counts = new Map();
    const bumps = new Map();
    const reportOnly = [];
    const unrewritten = [];

    const read = (abs) => {
        if (!originals.has(abs)) originals.set(abs, fs.readFileSync(abs, 'utf8'));
        return contents.has(abs) ? contents.get(abs) : originals.get(abs);
    };

    const artifacts = fs.existsSync(stateDir) ? collectArtifacts(stateDir) : [];
    const isSpec = (abs) =>
        path.basename(path.dirname(abs)) === 'specifications' && abs.endsWith('.md');

    // Plain artifacts first, so a registry that is also versioned below is edited on top of them.
    for (const abs of artifacts.filter((a) => !isSpec(a))) {
        const text = read(abs);
        if (REPORT_ONLY_FILES.has(path.basename(abs))) {
            if (firstEarlierWord(text)) reportOnly.push(rel(abs));
            continue;
        }
        const result = rewriteVocabulary(text, engineFolder);
        if (result.count === 0) continue;
        contents.set(abs, result.text);
        counts.set(abs, result.count);
    }

    for (const abs of artifacts.filter(isSpec)) {
        const result = rewriteVocabulary(read(abs), engineFolder);
        if (result.count === 0) continue;
        const bumped = bumpSpecification(result.text, date);
        if (!bumped) {
            unrewritten.push({
                rel: rel(abs),
                reason: 'no version header or no Document History table to extend',
            });
            continue;
        }
        contents.set(abs, bumped.text);
        counts.set(abs, result.count);
        bumps.set(abs, { from: bumped.from, to: bumped.to });

        // The registry row of the specification follows its version.
        const registry = path.join(path.dirname(path.dirname(abs)), 'INDEX.md');
        if (fs.existsSync(registry)) {
            const name = path.basename(abs);
            const lines = read(registry).split('\n');
            const cell = new RegExp(`\\|\\s*${escapeRe(bumped.from)}\\s*\\|\\s*$`);
            const at = lines.findIndex((l) => l.includes(`specifications/${name}`) && cell.test(l));
            if (at >= 0) {
                lines[at] = lines[at].replace(cell, `| ${bumped.to} |`);
                contents.set(registry, lines.join('\n'));
                if (!counts.has(registry)) counts.set(registry, 0);
            }
        }
    }

    const edits = [...contents.entries()]
        .filter(([abs, next]) => next !== originals.get(abs))
        .map(([abs, next]) => ({
            rel: rel(abs),
            abs,
            replacements: counts.get(abs) || 0,
            bump: bumps.get(abs) || null,
            next,
        }))
        .sort((a, b) => a.rel.localeCompare(b.rel));

    return { edits, reportOnly, unrewritten, product: scanProductFiles(root, engineFolder, new Set(options.exclude || [])) };
}

/**
 * Writes what `planSweep` found. The caller backs the originals up first.
 *
 * @param {ReturnType<typeof planSweep>} plan - The plan.
 * @returns {number} How many files were written.
 */
function applySweep(plan) {
    for (const edit of plan.edits) fs.writeFileSync(edit.abs, edit.next);
    return plan.edits.length;
}

module.exports = {
    planSweep,
    applySweep,
    rewriteVocabulary,
    bumpSpecification,
    firstEarlierWord,
};
