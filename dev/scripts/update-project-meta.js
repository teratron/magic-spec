#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileSafe, mkdirSafe } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT META UPDATER (C14.3 Extension — Idempotent)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates project metadata in .design/INDEX.md files.
 *
 * Idempotency contract (the reason this file was rewritten):
 *   The previous implementation bumped INDEX version, rewrote `Last Updated`,
 *   and appended a history row on **every** sync run — even when the index
 *   itself had not changed. That produced churn diffs and a flood of
 *   "Automated metadata update" rows in the history table.
 *
 *   Now: we hash the index content with the volatile fields stripped
 *   (Version line, Last Updated line, history rows) and store the digest in
 *   `.magic/.project-meta-state.json`. Bump and history append happen only
 *   when the structural digest actually changes.
 *
 * Environment variables:
 *   MAGIC_AUTHOR — Author name for history table entries (default: 'Agent').
 *   MAGIC_DRY_RUN — Honored via writeFileSafe (no physical writes).
 *
 * Flags:
 *   --workspace=<name> | --workspace <name>
 *   --message <msg> | -m <msg>
 *   --force   Bypass idempotency check (force bump + history row).
 */

const projectRoot = path.join(__dirname, '..', '..');
const magicDir = path.join(projectRoot, '.magic');
const designDir = path.join(projectRoot, '.design');
const globalIndexPath = path.join(designDir, 'INDEX.md');
const workspaceJsonPath = path.join(designDir, 'workspace.json');
const rulesPath = path.join(designDir, 'RULES.md');
const stateFile = path.join(designDir, '.cache', 'project-meta-state.json');

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ───────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let workspaceName = null;
let message = 'Automated metadata update';
let force = false;

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--workspace=')) {
        workspaceName = args[i].split('=')[1];
    } else if (args[i] === '--workspace' && args[i + 1]) {
        workspaceName = args[i + 1];
        i++;
    } else if ((args[i] === '--message' || args[i] === '-m') && args[i + 1]) {
        message = args[i + 1];
        i++;
    } else if (args[i] === '--force') {
        force = true;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Idempotency: structural digest
// ───────────────────────────────────────────────────────────────────────────

/**
 * Strips volatile fields from index content so structural changes
 * (workspaces, sections, body text) drive the digest, not version stamps.
 */
function structuralDigest(content) {
    const stripped = content
        .replace(/^\*\*Version:\*\*\s+\d+\.\d+\.\d+\s*$/m, '')
        .replace(/^[-\s]*\*\*Last Updated\*\*[:|][^\n]*$/m, '')
        // Drop everything after the "## Document History" heading — those
        // rows are produced by this script and must not feed the digest.
        .replace(/##\s+Document History[\s\S]*$/m, '')
        .replace(/\s+/g, ' ')
        .trim();
    return crypto.createHash('sha256').update(stripped).digest('hex');
}

function readState() {
    if (!fs.existsSync(stateFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
        return {};
    }
}

function writeState(state) {
    mkdirSafe(path.dirname(stateFile));
    writeFileSafe(stateFile, JSON.stringify(state, null, 2) + '\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolves the target workspace name when the CLI didn't already supply one:
 * `MAGIC_WORKSPACE` env var first, then `workspace.json`'s `default` field.
 *
 * @returns {string|null}
 */
function resolveWorkspaceName() {
    if (process.env.MAGIC_WORKSPACE) return process.env.MAGIC_WORKSPACE;
    if (!fs.existsSync(workspaceJsonPath)) return null;
    try {
        const wsData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
        return wsData.default || null;
    } catch (e) {
        console.error(`⚠️ Error reading workspace.json: ${e.message}`);
        return null;
    }
}

/**
 * Updates the global `.design/INDEX.md`. Fatal (exits the process) when the
 * file is missing — every project has one, so its absence means the run
 * targeted the wrong directory, not a workspace-specific gap.
 *
 * @returns {boolean} Whether state was mutated (a real change occurred).
 */
function processGlobalIndex(now, state) {
    if (!fs.existsSync(globalIndexPath)) {
        console.error('❌ Global INDEX.md not found.');
        process.exit(1);
    }
    return updateFileMeta(globalIndexPath, now, message, state, 'global');
}

/**
 * Updates the resolved workspace's `.design/{name}/INDEX.md`, when a
 * workspace was resolved at all. A missing workspace INDEX.md is only a
 * warning — unlike the global registry, not every invocation targets a
 * workspace that has one yet.
 *
 * @returns {boolean} Whether state was mutated (a real change occurred).
 */
function processWorkspaceIndex(now, state) {
    if (!workspaceName) return false;
    const workspaceIndexPath = path.join(designDir, workspaceName, 'INDEX.md');
    if (!fs.existsSync(workspaceIndexPath)) {
        console.warn(`⚠️ Workspace '${workspaceName}' INDEX.md not found at ${workspaceIndexPath}. Skipping.`);
        return false;
    }
    return updateFileMeta(workspaceIndexPath, now, message, state, `workspace:${workspaceName}`);
}

function updateProjectMeta() {
    console.log('🔍 Updating project metadata...');

    const now = new Date().toISOString().split('T')[0];
    const state = readState();
    workspaceName = workspaceName || resolveWorkspaceName();

    const globalChanged = processGlobalIndex(now, state);
    const workspaceChanged = processWorkspaceIndex(now, state);

    if (globalChanged || workspaceChanged) writeState(state);
}

/**
 * Bumps the patch component of a `**Version:** X.Y.Z` line, when present.
 *
 * @param {string} content
 * @returns {{ content: string, newVersion: string|null }}
 */
function bumpVersionLine(content) {
    const versionRegex = /\*\*Version:\*\* (\d+)\.(\d+)\.(\d+)/;
    const match = content.match(versionRegex);
    if (!match) return { content, newVersion: null };
    const newVersion = `${parseInt(match[1], 10)}.${parseInt(match[2], 10)}.${parseInt(match[3], 10) + 1}`;
    return { content: content.replace(versionRegex, `**Version:** ${newVersion}`), newVersion };
}

/**
 * Stamps `date` onto whichever "Last Updated" line shape the file uses
 * (bulleted field or table cell).
 *
 * @param {string} content
 * @param {string} date
 * @returns {string}
 */
function stampLastUpdated(content, date) {
    const dateRegex = /- \*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/;
    if (dateRegex.test(content)) {
        return content.replace(dateRegex, `- **Last Updated**: ${date}`);
    }
    const altDateRegex = /\*\*Last Updated\*\* \| \d{4}-\d{2}-\d{2}/;
    return content.replace(altDateRegex, `**Last Updated** | ${date}`);
}

/**
 * Idempotent update of a single index file.
 * Returns true when state was mutated (i.e., a real change occurred).
 */
/**
 * Bumps the version, stamps the date, and appends the history row — the
 * three content edits `updateFileMeta` applies once a structural change is
 * confirmed.
 *
 * @param {string} original
 * @param {string} date
 * @param {string} msg
 * @returns {{ content: string, newVersion: string|null }}
 */
function applyMetaEdits(original, date, msg) {
    const { content: bumped, newVersion } = bumpVersionLine(original);
    const stamped = stampLastUpdated(bumped, date);
    // Append history entry — with Smart-History dedup (mirrors update-engine-meta.js)
    return { content: appendHistoryRow(stamped, newVersion, date, msg), newVersion };
}

function updateFileMeta(filePath, date, msg, state, key) {
    const original = fs.readFileSync(filePath, 'utf8');
    const digest = structuralDigest(original);
    const prevDigest = state[key]?.digest;

    if (!force && prevDigest === digest) {
        console.log(`  ⏭️  ${path.relative(projectRoot, filePath)} — no structural change, skipping bump`);
        return false;
    }

    // Only reached when a structural change was detected above.
    const { content, newVersion } = applyMetaEdits(original, date, msg);

    if (content !== original && writeFileSafe(filePath, content)) {
        console.log(`  ✅ ${path.relative(projectRoot, filePath)} → v${newVersion || '?'}`);
    }

    state[key] = { digest, version: newVersion, date };
    return true;
}

const HISTORY_HEADER_4COL = /\| Version \| Date \| Author \| Description \|\s*\n\| :--- \| :--- \| :--- \| :--- \|/;
const HISTORY_HEADER_3COL = /\| Version \| Date \| Description \|\s*\n\| :--- \| :--- \| :--- \|/;

/**
 * Locates the Document History table header — the 4-column form (with
 * Author) or the legacy 3-column form.
 *
 * @param {string} content
 * @returns {{ match: RegExpMatchArray, fourCol: boolean } | null}
 */
function findHistoryHeader(content) {
    const fourCol = content.match(HISTORY_HEADER_4COL);
    if (fourCol) return { match: fourCol, fourCol: true };
    const threeCol = content.match(HISTORY_HEADER_3COL);
    return threeCol ? { match: threeCol, fourCol: false } : null;
}

/**
 * Slices `content` around the history table: the header's own span runs
 * from the matched header through the next `## ` heading or end of file.
 * Critical: the slice MUST start at the history header, not the file start
 * — otherwise a divider search would lock onto an earlier table (e.g.
 * Workspaces) instead of the history table's own.
 *
 * @param {string} content
 * @param {RegExpMatchArray} headerMatch
 * @returns {{ before: string, lines: string[], after: string }}
 */
function sliceHistoryTable(content, headerMatch) {
    const headerStart = headerMatch.index;
    const tailFromHeader = content.slice(headerStart);
    const nextSection = tailFromHeader.search(/\n##\s/);
    const sliceLen = nextSection === -1 ? tailFromHeader.length : nextSection;
    return {
        before: content.slice(0, headerStart),
        lines: content.slice(headerStart, headerStart + sliceLen).split(/\r?\n/),
        after: content.slice(headerStart + sliceLen),
    };
}

/**
 * Within a history-table line slice (header, divider, then data rows,
 * newest-first by project convention), finds the divider row's index.
 *
 * @param {string[]} lines
 * @returns {number} -1 when no divider row is present.
 */
function findDividerIndex(lines) {
    return lines.findIndex(l => l.includes(':---') && l.trim().startsWith('|'));
}

/**
 * Parses the newest data row (immediately after the divider) into the
 * fields Smart-History dedup needs. `null` when the table has no data rows
 * yet (a freshly created history table).
 *
 * @param {string[]} lines
 * @param {number} newestRowIdx
 * @param {boolean} fourCol
 * @returns {{ startVersion: string, lastDate: string, lastMsg: string } | null}
 */
function parseNewestRow(lines, newestRowIdx, fourCol) {
    const newestRow = (lines[newestRowIdx] || '').trim();
    if (!newestRow.startsWith('|')) return null;
    const cols = newestRow.split('|').map(c => c.trim()).filter(Boolean);
    return {
        startVersion: cols[0].split(' - ').shift().trim(),   // keep oldest as range start
        lastDate: cols[1],
        lastMsg: fourCol ? cols[3] : cols[2],
    };
}

function historyRowText(fourCol, version, date, author, msg) {
    return fourCol
        ? `| ${version} | ${date} | ${author} | ${msg} |`
        : `| ${version} | ${date} | ${msg} |`;
}

/**
 * @returns {boolean} Whether `newest` (from parseNewestRow) is the same
 *          day + message as the entry about to be appended — the
 *          Smart-History dedup trigger.
 */
function isSameHistoryEntry(newest, date, msg) {
    return Boolean(newest) && newest.lastDate === date && newest.lastMsg === msg;
}

/**
 * Appends a row to the Document History table with dedup:
 * if the previous row has the same date+message, it is replaced
 * with a version range instead of inserting a duplicate.
 */
function appendHistoryRow(content, version, date, msg) {
    const author = process.env.MAGIC_AUTHOR || 'Agent';
    const v = version || '?.?.?';

    const header = findHistoryHeader(content);
    if (!header) return content;

    const { before, lines, after } = sliceHistoryTable(content, header.match);
    const dividerIdx = findDividerIndex(lines);

    if (dividerIdx === -1) {
        // No divider in this slice — defensive append at end of slice
        lines.push(historyRowText(header.fourCol, v, date, author, msg));
        return before + lines.join('\n') + after;
    }

    // Newest row sits right after the divider (if any rows exist at all)
    const newestRowIdx = dividerIdx + 1;
    const newest = parseNewestRow(lines, newestRowIdx, header.fourCol);

    if (isSameHistoryEntry(newest, date, msg)) {
        // Smart-History dedup: same day + same message → condense range
        lines[newestRowIdx] = historyRowText(header.fourCol, `${newest.startVersion} - ${v}`, date, author, msg);
        return before + lines.join('\n') + after;
    }

    // Insert as the new "newest" row, right after the divider
    lines.splice(newestRowIdx, 0, historyRowText(header.fourCol, v, date, author, msg));
    return before + lines.join('\n') + after;
}

// ───────────────────────────────────────────────────────────────────────────
// Hygiene Pass (MD012 Fix)
// ───────────────────────────────────────────────────────────────────────────

function collapseExcessBlankLines(file) {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const cleaned = content.replace(/\n{3,}/g, '\n\n');
    if (content !== cleaned && writeFileSafe(file, cleaned)) {
        console.log(`  ✨ Cleaned: ${path.relative(projectRoot, file)}`);
    }
}

function runHygiene(targetFiles) {
    console.log('🧹 Running documentation hygiene (MD012)...');
    targetFiles.forEach(collapseExcessBlankLines);
}

module.exports = {
    structuralDigest, readState, writeState, resolveWorkspaceName,
    processGlobalIndex, processWorkspaceIndex, updateProjectMeta,
    bumpVersionLine, stampLastUpdated, applyMetaEdits, updateFileMeta,
    findHistoryHeader, sliceHistoryTable, findDividerIndex, parseNewestRow,
    historyRowText, isSameHistoryEntry, appendHistoryRow,
    collapseExcessBlankLines, runHygiene,
};

// Execute — require.main guard means require()-ing this module (as the test
// harness does) never runs the CLI side effect.
if (require.main === module) {
    try {
        updateProjectMeta();

        const docsToClean = [
            path.join(projectRoot, 'CHANGELOG.md'),
            path.join(projectRoot, 'README.md'),
            path.join(projectRoot, 'CONTRIBUTING.md'),
            globalIndexPath,
            rulesPath,
        ];
        runHygiene(docsToClean);
    } catch (error) {
        console.error(`❌ Metadata update failed: ${error.message}`);
        process.exit(1);
    }
}
