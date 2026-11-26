// @ts-check
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET STATE (the recorded state of a 4.0 workspace, memory/state.md)
// ═══════════════════════════════════════════════════════════════════════════
//
// A workspace in the 4.0 format keeps its state in `memory/state.md` (`Now`, `Done`, `Next`,
// `Open`), not in `STATE.md`. The scripts that read or write recorded state — `resume-state`,
// `finalize` — tell the two formats apart and compute the next ready task from here.

/** The order of priorities, highest first (concept §5.4). */
const PRIORITY = [
    'must',
    'should',
    'could',
];

/**
 * Whether a workspace is in the 4.0 format: its entry in `workspace.json` carries `"format": "4"`.
 *
 * @param {string} dir - The folder of the workspace (`.magicspec/{name}`).
 * @param {string} [name] - Its name; the folder's own name by default.
 * @returns {boolean}
 */
function isDocSetWorkspace(dir, name = path.basename(dir)) {
    try {
        const registry = JSON.parse(
            fs.readFileSync(path.join(path.dirname(dir), 'workspace.json'), 'utf8'),
        );
        return String(registry?.workspaces?.[name]?.format) === '4';
    } catch {
        return false;
    }
}

/**
 * The line of a script that writes a 3.x file and is called on a 4.0 workspace, which holds no
 * such file.
 *
 * @param {string} tag - The script's name in its messages.
 * @param {string} dir - The folder of the workspace.
 * @param {string} instead - What takes the place of the file.
 * @returns {string}
 */
function nothingWritten(tag, dir, instead) {
    return `[${tag}] ${path.basename(dir)} is a 4.0 workspace: ${instead}; nothing written.`;
}

/**
 * The addresses `memory/state.md` records as done.
 *
 * @param {string} text - `memory/state.md`.
 * @returns {Set<string>}
 */
function doneAddresses(text) {
    return new Set(
        [
            ...text.matchAll(/^- Done: (\S+)/gm),
        ].map((m) => m[1]),
    );
}

/**
 * The next ready task: of the tasks not done whose After are all done, the first in file order
 * of the highest priority (concept §5.4).
 *
 * @param {{ address: string, priority: string | null, after: string[] }[]} tasks - In file order.
 * @param {Set<string>} done
 * @returns {string | null}
 */
function nextReadyTask(tasks, done) {
    const ready = tasks.filter((t) => !done.has(t.address) && t.after.every((a) => done.has(a)));
    const rank = (/** @type {string | null} */ p) => {
        const at = PRIORITY.indexOf((p ?? '').trim());
        return at === -1 ? PRIORITY.length : at;
    };
    let best = null;
    for (const t of ready) if (best === null || rank(t.priority) < rank(best.priority)) best = t;
    return best?.address ?? null;
}

/**
 * The step a placed change still waits for: the plan while no milestone builds it, the tasks
 * while the milestone that builds it has none. A clarification builds nothing and waits for neither.
 *
 * @param {{ kind: string | null, status: string | null, builtBy: string[] }[]} changes
 * @param {(milestone: string) => boolean} waitsForTasks
 * @param {string} workspace
 * @returns {string | null}
 */
function changeStep(changes, waitsForTasks, workspace) {
    const placed = changes.filter((c) => c.status === 'placed' && c.kind !== 'clarification');
    if (placed.some((c) => c.builtBy.length === 0))
        return `Run /magicspec plan ${workspace} to add the milestones of the placed changes`;
    const milestone = placed.flatMap((c) => c.builtBy).find(waitsForTasks);
    return milestone ? `Run /magicspec task ${workspace} to write the tasks of ${milestone}` : null;
}

/**
 * The step a workspace waits for, in the order of the pipeline: the plan while a set with its
 * stack layer has no milestone; what a placed change waits for; the next ready task; the tasks of
 * a milestone not done; the observation of one whose tasks are written. It never names the
 * `spec` command: a set without a stack layer and a finished plan name no command.
 *
 * @param {object} set - The parts of the loaded set it reads.
 * @param {{ address: string }[]} set.milestones
 * @param {{ address: string }[]} set.tasks
 * @param {{ kind: string | null, status: string | null, builtBy: string[] }[]} set.changes
 * @param {Set<string>} done
 * @param {{ next: string | null, hasStack: boolean, workspace: string }} at
 * @returns {string} The `Next Action` text.
 */
function nextStep({ milestones, tasks, changes }, done, { next, hasStack, workspace }) {
    if (milestones.length === 0)
        return hasStack
            ? `Run /magicspec plan ${workspace} to write the milestones`
            : 'The stack layer is not written yet — nothing to plan';
    const open = milestones.map((m) => m.address).filter((m) => !done.has(m));
    const untasked = (/** @type {string} */ m) =>
        open.includes(m) && !tasks.some((t) => t.address.startsWith(`${m}.`));
    const waiting = changeStep(changes, untasked, workspace);
    if (waiting) return waiting;
    if (next) return `Execute ${next} via /magicspec run ${workspace}`;
    const milestone = open.find(untasked);
    if (milestone) return `Run /magicspec task ${workspace} to write the tasks of ${milestone}`;
    return open.length
        ? `Run /magicspec run ${workspace} to observe ${open[0]} and record it built`
        : 'All milestones are done — nothing pending';
}

/**
 * The state text with its `Next` line set (replaced, or added at the end).
 *
 * @param {string} text - `memory/state.md`.
 * @param {string | null} next - The next ready task, or null for none.
 * @returns {string}
 */
function withNextLine(text, next) {
    const line = `- Next: ${next ?? 'none'}`;
    if (/^- Next:.*$/m.test(text)) return text.replace(/^- Next:.*$/m, () => line);
    return `${text.trimEnd()}\n${line}\n`;
}

module.exports = {
    isDocSetWorkspace,
    nothingWritten,
    doneAddresses,
    nextReadyTask,
    nextStep,
    withNextLine,
};
