#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — STATE AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Recomputes the progress counters of each workspace's live memory from the
// task ledger and the phase workbooks (SY-1). The write goes through
// `update-state --auto-progress`, the one writer of that file, so a recorded
// goal and every hand-written section come out byte for byte (plan note 5).
// `update-state` stamps `**Updated:**` on every write, so it is run only when
// the recomputed block differs from the stored one (SY-3): a second `sync`
// with nothing changed never reaches it.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { computeProgress } = require('../update-state');

const PROGRESS_RE = /(^## Progress\s*\n+```\r?\n)([\s\S]*?)(\r?\n```)/m;

/**
 * The stored counters of a STATE.md, or null when it has no counter block.
 *
 * @param {string} content
 * @returns {string|null}
 */
function storedProgress(content) {
    const hit = PROGRESS_RE.exec(content);
    return hit ? hit[2].trim() : null;
}

/**
 * Runs the `state` area for the workspaces in scope.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, workspaces: {name: string, dir: string}[]}} ctx
 */
function syncState(ctx) {
    const { report } = ctx;
    for (const workspace of ctx.workspaces) {
        const statePath = path.join(workspace.dir, 'STATE.md');
        let content;
        try {
            content = fs.readFileSync(statePath, 'utf8');
        } catch {
            continue; // no live memory yet: nothing derived to bring up to date
        }
        const progress = computeProgress(workspace.dir, content);
        if (progress === null || storedProgress(content) === progress.trim()) {
            report.inSync += 1;
            continue;
        }
        if (!report.dryRun) {
            const written = spawnSync(
                process.execPath,
                [
                    path.join(__dirname, '..', 'update-state.js'),
                    `--workspace=${workspace.dir}`,
                    '--auto-progress',
                ],
                { encoding: 'utf8', env: process.env },
            );
            if (written.status !== 0) {
                report.disagreements.push({
                    location: report.shown(statePath),
                    difference: `the progress counters could not be recomputed (${(written.stderr || '').trim().split('\n')[0] || `exit ${written.status}`})`,
                    command: '/magicspec analyze',
                });
                continue;
            }
        }
        report.written.push({
            area: 'state',
            file: report.shown(statePath),
            what: `progress counters ${storedProgress(content) === null ? 'created' : 'recomputed'}`,
        });
    }
}

module.exports = { syncState, storedProgress };
