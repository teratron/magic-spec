// @ts-check
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { STATE_DIR_NAME } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET STATE (the recorded state of a 4.0 workspace, memory/state.md)
// ═══════════════════════════════════════════════════════════════════════════
//
// A workspace in the 4.0 format keeps its state in `memory/state.md` (`Now`, `Done`, `Next`,
// `Open`), not in `STATE.md`. The scripts that read or write recorded state — `resume-state`,
// `finalize` — tell the two formats apart and compute the next ready task from here.

/** The folder of a 3.x workspace that holds the set written for its move to 4.0. */
const NEXT_TREE = 'next';

/** The folder of a workspace the move to 4.0 puts the 3.x files into. */
const MOVED_FILES = 'archives/3x';

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
 * @param {string} dir
 * @returns {boolean} True when the folder holds a file at any depth.
 */
function holdsFile(dir) {
    try {
        return fs
            .readdirSync(dir, {
                withFileTypes: true,
            })
            .some((e) => !e.isDirectory() || holdsFile(path.join(dir, e.name)));
    } catch {
        return false;
    }
}

/**
 * Whether a move to 4.0 is in flight: the workspace is not in the 4.0 format and files of it
 * already lie where the move puts the 3.x files. Read from the files, never from a log.
 *
 * @param {string} dir - The folder of the workspace.
 * @param {string} [name] - Its name; the folder's own name by default.
 * @returns {boolean}
 */
function moveInFlight(dir, name = path.basename(dir)) {
    return !isDocSetWorkspace(dir, name) && holdsFile(path.join(dir, MOVED_FILES));
}

/**
 * The line every command but the move prints on a workspace whose move is in flight. The
 * workspace is named in the commands only when it is not the one they would take by default.
 *
 * @param {string} workspace
 * @param {{ executor: string, isDefault: boolean }} at - How the executor is started, and
 *   whether the workspace is the registry's default.
 * @returns {string}
 */
function moveStopLine(workspace, { executor, isDefault }) {
    const argument = isDefault ? '' : ` ${workspace}`;
    const flag = isDefault ? '' : ` --workspace ${workspace}`;
    return `HALT: The move of ${workspace} to 4.0 was started and not finished. Run \`/magicspec migrate --to 4${argument}\` (by script: \`${executor} migrate --to 4 --apply${flag}\`) to finish it.`;
}

/**
 * Whether a project folder is the tree a move writes the new set into (`next/` directly under
 * a workspace). No 3.x reader reads it; a folder of that name deeper down is ordinary.
 *
 * @param {string} rel - Path relative to the project root, forward slashes.
 * @returns {boolean}
 */
function isMoveTree(rel) {
    const parts = rel.split('/');
    return parts.length === 3 && parts[0] === STATE_DIR_NAME && parts[2] === NEXT_TREE;
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
    NEXT_TREE,
    MOVED_FILES,
    isDocSetWorkspace,
    moveInFlight,
    moveStopLine,
    isMoveTree,
    nothingWritten,
    doneAddresses,
    nextReadyTask,
    nextStep,
    withNextLine,
};
