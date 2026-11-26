// @ts-check
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadDocSet, checkDocSet } = require('../check-docs');
const { doneAddresses, nextReadyTask, nextStep, withNextLine } = require('./doc-set-state');
const { writeIfChanged } = require('./sync-report');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET SYNC (the derived state of a workspace in the 4.0 format)
// ═══════════════════════════════════════════════════════════════════════════
//
// A set has no registry. What it derives is the `Next` line of `memory/state.md`, which is
// recomputed here, and the checker's report, which no run can repair: each finding is a
// disagreement that names the command whose stage owns it.

/** A finding of the plan stage: in `plan.md`, or one a milestone is missing for. */
const PLAN_FINDING = [
    /^plan\.md:/,
    /^changes\.md: C\d+ (is \w+ but names no milestone|affects )/,
    /^rules\.md: R\d+ (has no From|applies from|is checked by)/,
    /^product\.md: P\d+ \([^)]*\) is observed/,
    /^stack\/[^:]+: stack component \S+ names no existing milestone/,
];

/** A finding of the task stage: in a task file, or one a task is missing for. */
const TASK_FINDING = [
    /^M\d+\.T\d+[ :]/,
    /(^|\/)tasks\/M\d+\.md:/,
    / is stale \(.*\) and no task still to do builds it$/,
    /^changes\.md: C\d+ is in no Context of the tasks of /,
    /^changes\.md: C\d+ names the asset .*, but no task of /,
];

/**
 * The command whose stage closes a checker finding. A question left open is the specification's
 * to answer, whatever pack shows it.
 *
 * @param {string} finding - One line of the checker's report.
 * @returns {'spec' | 'plan' | 'task'}
 */
function ownerOf(finding) {
    if (/ which has an open question$/.test(finding)) return 'spec';
    if (PLAN_FINDING.some((re) => re.test(finding))) return 'plan';
    return TASK_FINDING.some((re) => re.test(finding)) ? 'task' : 'spec';
}

/** The text of a set's live memory, or null when it has none. */
function stateOf(/** @type {string} */ dir) {
    try {
        return fs.readFileSync(path.join(dir, 'memory', 'state.md'), 'utf8');
    } catch {
        return null;
    }
}

/**
 * Reports the checker's findings of a workspace and recomputes the `Next` line of its state.
 *
 * @param {{ name: string, dir: string }} workspace
 * @param {ReturnType<typeof import('./sync-report').createReport>} report
 */
function syncDocSet(workspace, report) {
    for (const difference of checkDocSet(loadDocSet(workspace.dir)).findings) {
        report.disagreements.push({
            location: report.shown(workspace.dir),
            difference,
            command: `/magicspec ${ownerOf(difference)}`,
        });
    }
    const content = stateOf(workspace.dir);
    if (content === null) return;
    const next = nextReadyTask(loadDocSet(workspace.dir).tasks, doneAddresses(content));
    writeIfChanged(
        report,
        'state',
        path.join(workspace.dir, 'memory', 'state.md'),
        withNextLine(content, next),
        `Next line recomputed (${next ?? 'none'})`,
    );
}

/**
 * The step a set's recorded state waits for, as the finalization computes it.
 *
 * @param {{ name: string, dir: string }} workspace
 * @returns {string}
 */
function recordedSetStep(workspace) {
    const set = loadDocSet(workspace.dir);
    const done = doneAddresses(stateOf(workspace.dir) ?? '');
    return nextStep(set, done, {
        next: nextReadyTask(set.tasks, done),
        hasStack: fs.existsSync(path.join(workspace.dir, 'stack')),
        workspace: workspace.name,
    });
}

module.exports = {
    ownerOf,
    syncDocSet,
    recordedSetStep,
};
