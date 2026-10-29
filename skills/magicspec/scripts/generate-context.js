#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('generate-context', module);

const fs = require('fs');
const path = require('path');
const {
    normalizePath,
    loadGitignore,
    resolveProjectRoot,
    engineRel,
    compilePathSet,
    isSkippedDir,
    STATE_DIR_NAME,
    BUILD_NOISE_DIRS,
} = require('./utils');

// Every path below is relative to the project root: run from there whatever directory the caller is in.
process.chdir(resolveProjectRoot());

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION AND PATHS
// ═══════════════════════════════════════════════════════════════════════════

const designDir = process.env.MAGIC_DESIGN_DIR || STATE_DIR_NAME;
const changelogPath = path.join(designDir, 'CHANGELOG.md');
const contextPath = path.join(designDir, 'CONTEXT.md');

// ───────────────────────────────────────────────────────────────────────────
// Directory Check
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(designDir) || !fs.statSync(designDir).isDirectory()) {
    console.error(`Error: ${designDir} directory not found`);
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT DOCUMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const date = new Date().toISOString().split('T')[0];
let contextContent = `# Project Context\n\n**Generated:** ${date}\n\n## Active Technologies\n\n`;

// ───────────────────────────────────────────────────────────────────────────
// 1. Technology Discovery
// ───────────────────────────────────────────────────────────────────────────

let techList = '';
if (fs.existsSync('package.json')) techList += '- Node.js\n';
if (fs.existsSync('pyproject.toml')) techList += '- Python (uv/poetry/hatch)\n';
if (fs.existsSync('requirements.txt')) techList += '- Python\n';
if (fs.existsSync('Cargo.toml')) techList += '- Rust\n';
if (fs.existsSync('go.mod')) techList += '- Go\n';
if (fs.existsSync('Makefile')) techList += '- Make\n';

if (!techList) {
    contextContent += '- Unknown (no manifest detected)\n';
} else {
    contextContent += techList;
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Project Tree Generation
// ───────────────────────────────────────────────────────────────────────────

contextContent += '\n## Core Project Structure\n\n```plaintext\n';

/**
 * Recursively builds a directory tree representation.
 *
 * @param {string} dir Source directory path.
 * @param {string} prefix Line prefix for indentation.
 * @param {number} currentDepth Current recursion level.
 * @param {number} maxDepth Maximum depth to traverse.
 * @param {string[]} ignores List of folder/file names to skip.
 * @param {string[]|null} [validScopes] Allowed top-level directories, or null for all.
 * @param {function(string): boolean} [isIgnored] Gitignore predicate over root-relative paths.
 * @returns {string} Markdown-formatted directory tree.
 */
function buildTree(
    dir,
    prefix,
    currentDepth,
    maxDepth,
    ignores,
    validScopes = null,
    isIgnored = () => false,
) {
    if (currentDepth > maxDepth) return '';
    let result = '';
    let files;
    try {
        files = fs
            .readdirSync(dir)
            .filter((f) => {
                // Landmark roots bypass every hiding mechanism at depth 1 —
                // including a user project that gitignores its design dir.
                if (currentDepth === 1 && FORCE_VISIBLE_ROOTS.has(f)) return true;
                if (isSkippedDir(ignores, f, normalizePath(path.relative('.', path.join(dir, f))))) return false;
                return !isIgnored(normalizePath(path.relative('.', path.join(dir, f))));
            })
            .sort();
        // If at root and validScopes is provided, filter allowed top-level directories
        if (currentDepth === 1 && validScopes && validScopes.length > 0) {
            // One definition of what a scope entry means (`utils.compilePathSet`): `src`, `src/`
            // and `src/**` all keep the `src` folder.
            const scopeSet = compilePathSet(validScopes);
            files = files.filter((f) => FORCE_VISIBLE_ROOTS.has(f) || scopeSet.mayContain(f));
        }
    } catch {
        return '';
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isLast = i === files.length - 1;
        const fullPath = path.join(dir, file);

        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch {
            continue;
        }

        const branch = isLast ? '└── ' : '├── ';
        const name = stat.isDirectory() ? file + '/' : file;

        result += `${prefix}${branch}${name}\n`;

        if (stat.isDirectory()) {
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            result += buildTree(
                fullPath,
                nextPrefix,
                currentDepth + 1,
                maxDepth,
                ignores,
                validScopes,
                isIgnored,
            );
        }
    }
    return result;
}

/** Build directories always hidden from the tree, even when not gitignored. */
const ignoreList = [...BUILD_NOISE_DIRS];

/**
 * Root-level directories that must always appear on the map. The tree exists
 * to orient a human, and the SDD root and the engine root are its two fixed
 * landmarks — visible regardless of the ignore list, .gitignore rules, or the
 * workspace-scope filter. Only the top-level segment is forced; their inner
 * entries still obey the normal filters.
 */
const ENGINE_REL = engineRel();
// The engine folder's top-level segment, when the folder lies inside the project.
const ENGINE_ROOT_SEGMENT = /^(\.\.|\/|[A-Za-z]:)/.test(ENGINE_REL)
    ? null
    : ENGINE_REL.split('/')[0];
const FORCE_VISIBLE_ROOTS = new Set(
    [normalizePath(designDir).split('/')[0], ENGINE_ROOT_SEGMENT].filter(Boolean),
);

// Invariant 7 (Gitignore Safety) — shared with the other engine scanners.
// Supersedes the former top-level-names-only parser: root-anchored (`/dist`),
// nested (`docs/build/`) and wildcard (`*.log`) patterns are now all honored.
const isGitignored = loadGitignore('.');

let scopes = null;
if (process.env.MAGIC_WORKSPACE_SCOPE) {
    try {
        scopes = JSON.parse(process.env.MAGIC_WORKSPACE_SCOPE);
    } catch {
        scopes = process.env.MAGIC_WORKSPACE_SCOPE.split(',').map((s) => s.trim());
    }
    if (!Array.isArray(scopes)) scopes = [scopes];
}

try {
    contextContent += '.\n';
    contextContent += buildTree('.', '', 1, 2, ignoreList, scopes, isGitignored);
} catch {
    contextContent += `- Project root\n  - ${designDir}/\n  - ${ENGINE_REL}/\n`;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Changelog Integration
// ───────────────────────────────────────────────────────────────────────────

contextContent += '```\n\n## Recent Changes\n\n';

/**
 * Nests an embedded Markdown excerpt under the host section.
 *
 * Headings are shifted so the shallowest one lands on `baseLevel` (capped at
 * H6); the excerpt's own `# Title` would otherwise become a second top-level
 * heading in the host document (MD025) and a tail cut can start on any level.
 * Lines inside fenced code blocks are left alone.
 *
 * @param {string[]} lines Excerpt lines.
 * @param {number} baseLevel Heading level the shallowest excerpt heading gets.
 * @returns {string[]} Lines with shifted headings.
 */
function nestHeadings(lines, baseLevel) {
    let fence = null;
    const headingAt = (line) => {
        const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (fenceMatch) {
            if (!fence) fence = fenceMatch[1][0];
            else if (fenceMatch[1][0] === fence) fence = null;
            return null;
        }
        return fence ? null : line.match(/^(#{1,6})(?=\s|$)/);
    };

    const marks = lines.map(headingAt);
    const levels = marks.filter(Boolean).map((m) => m[1].length);
    if (levels.length === 0) return lines;

    const shift = baseLevel - Math.min(...levels);
    return lines.map((line, i) =>
        marks[i]
            ? '#'.repeat(Math.min(6, marks[i][1].length + shift)) + line.slice(marks[i][1].length)
            : line,
    );
}

if (fs.existsSync(changelogPath)) {
    const changelogText = fs.readFileSync(changelogPath, 'utf8');
    const lines = changelogText.trimEnd().split(/\r?\n/);
    // The tail cut can begin on a blank line; the section header already ends
    // with one, so a leading blank would double it (MD012).
    const tail = lines.slice(-15);
    while (tail.length > 0 && tail[0].trim() === '') tail.shift();
    contextContent += nestHeadings(tail, 3).join('\n');
} else {
    contextContent += 'No recent changelog found.';
}

contextContent += '\n';

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

try {
    fs.writeFileSync(contextPath, contextContent);
    console.log(`Context document updated: ${normalizePath(contextPath)}`);
} catch (e) {
    console.error(`Failed to write context document: ${e.message}`);
}
