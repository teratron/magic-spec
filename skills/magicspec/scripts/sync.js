#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('sync', module);

const fs = require('fs');
const path = require('path');
const { resolveProjectRoot, STATE_DIR_NAME } = require('./utils');
const { createReport, formatReport, routerCommandOf } = require('./lib/sync-report');
const { readSyncConfig } = require('./lib/sync-config');

// ═══════════════════════════════════════════════════════════════════════════
// SYNC (Bring Derived State up to Date)
// ═══════════════════════════════════════════════════════════════════════════
//
// Computes each area of derived state, writes only what differs from what is
// stored (SY-3) and only what needs no judgement (SY-1), and prints one
// report (SY-8). A disagreement that needs a judgement is listed with the one
// command that resolves it and left as it is (SY-2); a derived file no source
// produces any more is listed and kept (SY-5). The command finalizes nothing:
// no project version bump and no changelog entry (SY-1, §2).
//
// Usage:
//   node skills/magicspec/scripts/executor.js sync [area | workspace] [--dry-run]

/**
 * The areas in the order they run: the registries and live memory first, the graph last, so
 * that the wiki and the index see what the other areas wrote. Each runner receives the context.
 *
 * @type {Record<string, (ctx: object) => void>}
 */
const RUNNERS = {
    registry: (ctx) => require('./lib/sync-registry').syncRegistry(ctx),
    state: (ctx) => require('./lib/sync-state').syncState(ctx),
    projections: (ctx) => require('./lib/sync-projections').syncProjections(ctx),
    versions: (ctx) => require('./lib/sync-versions').syncVersions(ctx),
    docs: (ctx) => require('./lib/sync-docs').syncDocs(ctx),
    graph: (ctx) => require('./lib/sync-graph').syncGraph(ctx),
};
const ORDER = ['registry', 'state', 'projections', 'versions', 'docs', 'graph'];

// ───────────────────────────────────────────────────────────────────────────
// Scope
// ───────────────────────────────────────────────────────────────────────────

/**
 * The registered workspaces of the project, each with its folder.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {{name: string, dir: string, description?: string}[]}
 */
function registeredWorkspaces(designAbs) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'));
        return Object.entries(data.workspaces || {}).map(([name, entry]) => ({
            name,
            dir: path.join(designAbs, name),
            description: entry?.description,
        }));
    } catch {
        return [];
    }
}

/**
 * Reads the invocation: one optional area or workspace, and `--dry-run`.
 *
 * @param {string[]} argv - Arguments after the command name.
 * @param {{name: string}[]} workspaces - Registered workspaces.
 * @returns {{dryRun: boolean, areas: string[], only: string|null}|{error: string}}
 */
function readScope(argv, workspaces) {
    const dryRun = argv.includes('--dry-run');
    const word = argv.find((arg) => !arg.startsWith('--')) || null;
    if (word === null) return { dryRun, areas: ORDER, only: null };
    if (ORDER.includes(word)) return { dryRun, areas: [word], only: null };
    if (workspaces.some((w) => w.name === word)) return { dryRun, areas: ORDER, only: word };
    return {
        error: `Unknown area or workspace '${word}'. Areas: ${ORDER.join(', ')}. Workspaces: ${workspaces.map((w) => w.name).join(', ') || 'none registered'}.`,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// The Next Step
// ───────────────────────────────────────────────────────────────────────────

/**
 * The line that names the next step: the first command a disagreement or a stale file names, else
 * the step live memory records. Null when neither names a router command.
 *
 * @param {ReturnType<typeof createReport>} report
 * @param {{name: string, dir: string}[]} workspaces - Workspaces in scope.
 * @returns {string|null}
 */
function nextLineOf(report, workspaces) {
    const first = workspaces[0];
    if (!first) return null;
    try {
        const { handoffLine } = require('./finalize');
        const named = [...report.disagreements, ...report.stale]
            .map((item) => routerCommandOf(item.command))
            .find(Boolean);
        if (named) return handoffLine(`Run ${named} ${first.name}`, first.name);
        const state = fs.readFileSync(path.join(first.dir, 'STATE.md'), 'utf8');
        const recorded = /^- \*\*Next Action:\*\*[ \t]+(.+)$/m.exec(state)?.[1];
        return recorded ? handoffLine(recorded, first.name) : null;
    } catch {
        return null; // the report is complete without its last line
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Entry point.
 *
 * @returns {number} Exit code: 1 for an unknown area or workspace, else 0.
 */
function main() {
    const projectRoot = resolveProjectRoot();
    const designAbs = path.join(projectRoot, STATE_DIR_NAME);
    if (!fs.existsSync(designAbs)) {
        console.log(`[Sync] No ${STATE_DIR_NAME}/ in this project: nothing to bring up to date.`);
        return 0;
    }
    const registered = registeredWorkspaces(designAbs);
    const scope = readScope(process.argv.slice(2), registered);
    if (scope.error) {
        console.error(scope.error);
        return 1;
    }
    const inScope = scope.only ? registered.filter((w) => w.name === scope.only) : registered;
    const report = createReport({ dryRun: scope.dryRun, projectRoot });
    const ctx = {
        report,
        projectRoot,
        designAbs,
        workspaces: inScope,
        registeredNames: registered.map((w) => w.name),
        scoped: scope.only !== null,
    };
    // The registration is read once: an entry that cannot be used is one disagreement, however many areas read it.
    if (scope.areas.some((area) => area === 'versions' || area === 'docs')) {
        report.disagreements.push(...readSyncConfig(projectRoot).problems);
    }
    for (const area of ORDER) {
        if (scope.areas.includes(area)) RUNNERS[area](ctx);
    }
    console.log(formatReport(report, nextLineOf(report, inScope)));
    return 0;
}

if (require.main === module) {
    process.exit(main());
}

module.exports = { readScope, ORDER };
