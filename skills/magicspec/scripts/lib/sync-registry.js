#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — REGISTRY AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Writes the cells of the registries that are fully computed from other files
// (SY-1): the specification count of each workspace row of the global registry,
// and a row for a registered workspace the table lacks. Whatever needs a
// judgement is reported and left as it is (SY-2): a specification header that
// disagrees with its registry row, a registered specification missing from the
// disk, a specification file no row registers. Nothing else of a registry is
// written — no version line, no history row, no description cell that exists.

const fs = require('fs');
const path = require('path');
const { writeIfChanged } = require('./sync-report');

const SPEC_ROW_RE = /^\|\s*\[[^\]]*\]\(specifications\/([a-z0-9][a-z0-9-]*\.md)\)\s*\|/;
const SPEC_DISK_RE = /^[a-z0-9][a-z0-9-]*\.md$/;

// ───────────────────────────────────────────────────────────────────────────
// Table Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * The cells of a table row, as written (spaces kept), without the outer bars.
 *
 * @param {string} line
 * @returns {string[]}
 */
function cellsOf(line) {
    return line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|');
}

/**
 * Index of the column whose header cell reads `name`, or -1.
 *
 * @param {string[]} header
 * @param {string} name
 * @returns {number}
 */
function columnOf(header, name) {
    return header.findIndex((cell) => cell.trim().toLowerCase() === name.toLowerCase());
}

/**
 * The first row of `lines` whose first header cell reads `first`, with the index range of the
 * table: header line, body lines up to the first line that is not a row.
 *
 * @param {string[]} lines
 * @param {string} first - The first column's header text.
 * @returns {{header: string[], headerAt: number, bodyFrom: number, bodyTo: number}|null}
 */
function findTable(lines, first) {
    for (let i = 0; i < lines.length - 1; i++) {
        if (!lines[i].startsWith('|')) continue;
        const header = cellsOf(lines[i]).map((c) => c.trim());
        if (header[0].toLowerCase() !== first.toLowerCase()) continue;
        if (!/^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) continue;
        let end = i + 2;
        while (end < lines.length && lines[end].startsWith('|')) end += 1;
        return { header, headerAt: i, bodyFrom: i + 2, bodyTo: end };
    }
    return null;
}

/**
 * Reads a file as lines with the end-of-line it uses, so a rewrite keeps it.
 *
 * @param {string} abs
 * @returns {{lines: string[], eol: string}|null}
 */
function readLines(abs) {
    let text;
    try {
        text = fs.readFileSync(abs, 'utf8');
    } catch {
        return null;
    }
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    return { lines: text.split(/\r?\n/), eol };
}

// ───────────────────────────────────────────────────────────────────────────
// Workspace Registry
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compares one workspace registry with its specification files and records the disagreements.
 * Returns the number of specifications the registry registers, which is what the global row counts.
 *
 * @param {{name: string, dir: string}} workspace
 * @param {ReturnType<import('./sync-report').createReport>} report
 * @returns {number|null} Registered rows, or null when there is no registry to read.
 */
function checkWorkspaceRegistry(workspace, report) {
    const indexPath = path.join(workspace.dir, 'INDEX.md');
    const read = readLines(indexPath);
    if (!read) {
        report.disagreements.push({
            location: `${report.shown(indexPath)}`,
            difference: `the registry of workspace '${workspace.name}' is missing`,
            command: '/magicspec analyze',
        });
        return null;
    }
    const table = findTable(read.lines, 'File');
    const header = table ? table.header : [];
    const statusAt = columnOf(header, 'Status') === -1 ? 2 : columnOf(header, 'Status');
    const versionAt = columnOf(header, 'Version');
    const registered = new Set();
    for (const line of read.lines) {
        const hit = SPEC_ROW_RE.exec(line);
        if (!hit) continue;
        registered.add(hit[1]);
        const cells = cellsOf(line).map((c) => c.trim());
        const status = cells[statusAt];
        const version = cells[versionAt === -1 ? cells.length - 1 : versionAt];
        const specPath = path.join(workspace.dir, 'specifications', hit[1]);
        let text;
        try {
            text = fs.readFileSync(specPath, 'utf8');
        } catch {
            report.disagreements.push({
                location: report.shown(specPath),
                difference: 'registered in the registry but missing from the disk',
                command: '/magicspec analyze',
            });
            continue;
        }
        const fileStatus = /^\*\*Status:\*\*\s+(\S+)/m.exec(text)?.[1];
        const fileVersion = /^\*\*Version:\*\*\s+([0-9.]+)/m.exec(text)?.[1];
        const drift = [];
        if (fileStatus !== status)
            drift.push(`Status ${fileStatus ?? 'missing'} ≠ registry ${status}`);
        if (fileVersion !== version)
            drift.push(`Version ${fileVersion ?? 'missing'} ≠ registry ${version}`);
        if (drift.length > 0) {
            report.disagreements.push({
                location: report.shown(specPath),
                difference: `header ${drift.join(', ')}`,
                command: '/magicspec spec',
            });
        } else {
            report.inSync += 1;
        }
    }
    const specDir = path.join(workspace.dir, 'specifications');
    const onDisk = fs.existsSync(specDir)
        ? fs.readdirSync(specDir).filter((f) => SPEC_DISK_RE.test(f))
        : [];
    for (const file of onDisk) {
        if (registered.has(file)) continue;
        report.disagreements.push({
            location: report.shown(path.join(specDir, file)),
            difference: 'a specification file that no registry row registers',
            command: '/magicspec analyze',
        });
    }
    return registered.size;
}

// ───────────────────────────────────────────────────────────────────────────
// Global Registry
// ───────────────────────────────────────────────────────────────────────────

/**
 * Builds the row for a registered workspace the global table lacks, by the table's own header.
 *
 * @param {string[]} header - Trimmed header cells.
 * @param {{name: string, description?: string}} workspace
 * @param {number|null} count
 * @param {boolean} linked - Whether the table's rows link the workspace name.
 * @returns {string}
 */
function newWorkspaceRow(header, workspace, count, linked) {
    const cells = header.map((name) => {
        switch (name.toLowerCase()) {
            case 'workspace':
                return linked ? `[${workspace.name}](${workspace.name}/INDEX.md)` : workspace.name;
            case 'description':
                return workspace.description || '';
            case 'specs':
                return count === null ? '' : String(count);
            case 'registry':
                return `[${workspace.name}/INDEX.md](${workspace.name}/INDEX.md)`;
            default:
                return '';
        }
    });
    return `| ${cells.join(' | ')} |`;
}

/**
 * Applies the computed cells to the global registry's workspace table.
 *
 * @param {{designAbs: string, workspaces: {name: string, dir: string, description?: string}[], scoped: boolean, registeredNames: string[]}} ctx
 * @param {Map<string, number|null>} counts - Registered specifications per workspace name.
 * @param {ReturnType<import('./sync-report').createReport>} report
 */
function syncGlobalRegistry(ctx, counts, report) {
    const indexPath = path.join(ctx.designAbs, 'INDEX.md');
    const read = readLines(indexPath);
    if (!read) return;
    const table = findTable(read.lines, 'Workspace');
    if (!table) return;
    const specsAt = columnOf(table.header, 'Specs');
    const changes = [];
    const rowOf = new Map();
    let linked = false;
    for (let i = table.bodyFrom; i < table.bodyTo; i++) {
        const first = cellsOf(read.lines[i])[0].trim();
        const name = /^\[([^\]]+)\]/.exec(first)?.[1] ?? first;
        rowOf.set(name, i);
        if (first.startsWith('[')) linked = true;
    }
    const added = [];
    for (const workspace of ctx.workspaces) {
        const count = counts.get(workspace.name) ?? null;
        const at = rowOf.get(workspace.name);
        if (at === undefined) {
            added.push(newWorkspaceRow(table.header, workspace, count, linked));
            changes.push(`row for workspace '${workspace.name}' added`);
            continue;
        }
        if (specsAt === -1 || count === null) continue;
        const cells = cellsOf(read.lines[at]);
        if (cells[specsAt].trim() === String(count)) continue;
        const before = cells[specsAt].trim();
        cells[specsAt] = ` ${count} `;
        read.lines[at] = `|${cells.join('|')}|`;
        changes.push(`${workspace.name} Specs ${before} → ${count}`);
    }
    if (added.length > 0) read.lines.splice(table.bodyTo, 0, ...added);
    if (!ctx.scoped) {
        for (const [name] of rowOf) {
            if (ctx.registeredNames.includes(name)) continue;
            report.stale.push({
                file: `${report.shown(indexPath)} row '${name}'`,
                command:
                    'remove the row by hand — the workspace is not registered in workspace.json',
            });
        }
    }
    writeIfChanged(report, 'registry', indexPath, read.lines.join(read.eol), changes.join('; '));
}

// ───────────────────────────────────────────────────────────────────────────
// The Area
// ───────────────────────────────────────────────────────────────────────────

/**
 * Runs the `registry` area.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, designAbs: string, workspaces: {name: string, dir: string, description?: string}[], scoped: boolean, registeredNames: string[]}} ctx
 */
function syncRegistry(ctx) {
    const counts = new Map();
    for (const workspace of ctx.workspaces) {
        counts.set(workspace.name, checkWorkspaceRegistry(workspace, ctx.report));
    }
    syncGlobalRegistry(ctx, counts, ctx.report);
}

module.exports = { syncRegistry, findTable, cellsOf, columnOf };
