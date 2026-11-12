#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — PROJECTIONS AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Brings the always-on rule projection and the managed block of each host in
// line with the installed skill folder (SY-1). The engine integrity check
// runs first: copies generated from a corrupted folder would spread the
// corruption, so on a failure no projection is written and the report says
// to restore the folder from the release archive; the other areas still run
// (§5.4). A retired command entry is reported with the command that removes
// it and is never deleted here (SY-5) — `hosts.refreshProjections` removes
// them, so it is not called.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const hosts = require('./hosts');
const { writeIfChanged } = require('./sync-report');

/**
 * Runs the read-only integrity check of the installed skill folder.
 *
 * @returns {{ok: boolean, detail: string}}
 */
function engineIntegrity() {
    const result = spawnSync(
        process.execPath,
        [path.join(__dirname, '..', 'update-engine-meta.js'), '--check'],
        { encoding: 'utf8', env: process.env },
    );
    const detail = `${result.stdout || ''}${result.stderr || ''}`
        .split('\n')
        .find((line) => /modified|missing|mismatch|drift/i.test(line));
    return { ok: result.status === 0, detail: (detail || '').replace(/^\W+/, '').trim() };
}

/**
 * The text of a host instruction file with its managed block replaced by the current one.
 *
 * @param {string} existing
 * @returns {string}
 */
function withCurrentBlock(existing) {
    const begin = existing.indexOf(hosts.BLOCK_BEGIN);
    const end = existing.indexOf(hosts.BLOCK_END);
    return (
        existing.slice(0, begin) +
        hosts.pointerBlock() +
        existing.slice(end + hosts.BLOCK_END.length)
    );
}

/**
 * Runs the `projections` area.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, projectRoot: string}} ctx
 */
function syncProjections(ctx) {
    const { report, projectRoot } = ctx;
    const integrity = engineIntegrity();
    if (!integrity.ok) {
        const engineDir = path.join(__dirname, '..', '..');
        report.disagreements.push({
            location: report.shown(engineDir),
            difference: `the engine integrity check failed${integrity.detail ? ` (${integrity.detail})` : ''}; no projection was written`,
            command: 'restore the folder from the release archive',
        });
        return;
    }
    const executor = report.shown(path.join(__dirname, '..', 'executor.js'));
    for (const item of hosts.findProjections(projectRoot)) {
        const abs = path.join(projectRoot, item.path);
        if (item.kind === 'command') {
            report.stale.push({
                file: item.path,
                command: `node ${executor} init --host ${item.host}`,
            });
        } else if (!item.stale || item.kind === 'link') {
            report.inSync += 1;
        } else if (item.kind === 'rule') {
            writeIfChanged(
                report,
                'projections',
                abs,
                hosts.readRuleSource(),
                'rule projection regenerated',
            );
        } else {
            writeIfChanged(
                report,
                'projections',
                abs,
                withCurrentBlock(fs.readFileSync(abs, 'utf8')),
                'managed block regenerated',
            );
        }
    }
}

module.exports = { syncProjections };
