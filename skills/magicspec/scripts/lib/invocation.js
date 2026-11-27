// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');
const { withFileLock } = require('./file-lock');
const { isDryRun } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// INVOCATION RECORD (what a command was doing when it stopped)
// ═══════════════════════════════════════════════════════════════════════════
//
// One small file per workspace under the state folder's untracked runtime folder says which
// command is running, with which argument, which of its steps are done, what files those steps
// wrote and what only the person knows (the answers of an intake survey). Finalization removes
// it, so a record that survives means the command was interrupted. The file is runtime state:
// never committed, never loaded as instructions, and it holds paths and short text only.

/** Longest argument, answer or question kept, in characters. */
const MAX_TEXT = 2000;
/** Most step entries kept; the oldest beyond it are folded into one `earlier` entry. */
const MAX_STEPS = 50;
/** Most file paths kept across all steps; the oldest are dropped first. */
const MAX_FILES = 200;
/** The name of the entry that holds the folded steps. */
const FOLDED_STEP = 'earlier';
/** The commands whose inner commands write into their record instead of replacing it. */
const NESTING_COMMANDS = new Set([
    'goal',
    'fix',
]);

/**
 * @typedef {{step: string, files: string[], at: string}} Step
 * @typedef {{
 *   workspace: string,
 *   command: string,
 *   argument: string,
 *   parent: string|null,
 *   session: string|null,
 *   started: string,
 *   updated: string,
 *   steps: Step[],
 *   answers: {question: string, answer: string}[],
 *   decisions: string[],
 * }} Invocation
 */

// ───────────────────────────────────────────────────────────────────────────
// Location & Reading
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {string} workspace - A registered workspace name.
 * @returns {string} The record file of that workspace.
 */
function invocationPath(designAbs, workspace) {
    return path.join(designAbs, '.cache', 'invocation', `${workspace}.json`);
}

/**
 * The record of a workspace.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {string} workspace
 * @returns {Invocation|null} `null` when there is none or it cannot be read as one.
 */
function readInvocation(designAbs, workspace) {
    try {
        const data = JSON.parse(fs.readFileSync(invocationPath(designAbs, workspace), 'utf8'));
        if (!data || typeof data.command !== 'string' || !Array.isArray(data.steps)) return null;
        return {
            ...data,
            answers: Array.isArray(data.answers) ? data.answers : [],
            decisions: Array.isArray(data.decisions) ? data.decisions : [],
        };
    } catch {
        return null;
    }
}

/**
 * The command a resume would re-enter: the outer one when the record belongs to a command that
 * runs others.
 *
 * @param {Invocation} record
 * @returns {string}
 */
function ownerOf(record) {
    return record.parent || record.command;
}

/**
 * Whether finalization is switched off, in which case no record is written at all: a record
 * nothing would remove would announce an interruption at every later session.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {boolean}
 */
function recordingDisabled(designAbs) {
    const env = process.env.MAGIC_FINALIZE;
    if (env === '0' || env === 'false') return true;
    try {
        const data = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'));
        return data?.finalization?.enabled === false;
    } catch {
        return false;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Writing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Writes the record so that a crash leaves either the old one or the new one, never half.
 *
 * @param {string} file - The record file.
 * @param {Invocation} record
 * @returns {void}
 */
function writeAtomic(file, record) {
    fs.mkdirSync(path.dirname(file), {
        recursive: true,
    });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(record, null, 2)}\n`);
    try {
        fs.renameSync(tmp, file);
    } catch (error) {
        fs.rmSync(tmp, {
            force: true,
        });
        throw error;
    }
}

/**
 * Runs a change of one workspace's record under its lock.
 *
 * @template T
 * @param {string} designAbs
 * @param {string} workspace
 * @param {(file: string) => T} change
 * @returns {T}
 */
function locked(designAbs, workspace, change) {
    const file = invocationPath(designAbs, workspace);
    return withFileLock(`${file}.lock`, () => change(file));
}

/**
 * @param {string} text - Any text.
 * @returns {string} Cut at the longest length the record keeps.
 */
function bounded(text) {
    return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text;
}

/**
 * Starts the record of a command, replacing any record of the workspace. A nested start, made by
 * a command running inside `goal` or `fix`, keeps that record: it only names the inner command,
 * and the outer one stays the command a resume re-enters.
 *
 * @param {string} designAbs
 * @param {string} workspace
 * @param {{command: string, argument?: string, nested?: boolean}} start
 * @returns {Invocation|null} The record written; `null` under a dry run.
 */
function startInvocation(designAbs, workspace, start) {
    if (isDryRun()) return null;
    return locked(designAbs, workspace, (file) => {
        const now = new Date().toISOString();
        const open = readInvocation(designAbs, workspace);
        if (start.nested && open && NESTING_COMMANDS.has(ownerOf(open))) {
            const record = {
                ...open,
                parent: ownerOf(open),
                command: start.command,
                updated: now,
            };
            writeAtomic(file, record);
            return record;
        }
        /** @type {Invocation} */
        const record = {
            workspace,
            command: start.command,
            argument: bounded(start.argument || ''),
            parent: null,
            session: process.env.CLAUDE_CODE_SESSION_ID || null,
            started: now,
            updated: now,
            steps: [],
            answers: [],
            decisions: [],
        };
        writeAtomic(file, record);
        return record;
    });
}

/**
 * Keeps the step list and the file lists inside their bounds.
 *
 * @param {Step[]} steps - Oldest first.
 * @returns {Step[]}
 */
function boundSteps(steps) {
    let result = steps;
    while (result.length > MAX_STEPS) {
        const [first, second, ...rest] = result;
        result = [
            {
                step: FOLDED_STEP,
                files: [
                    ...first.files,
                    ...second.files,
                ],
                at: second.at,
            },
            ...rest,
        ];
    }
    let excess = result.reduce((sum, step) => sum + step.files.length, 0) - MAX_FILES;
    return result.map((step) => {
        if (excess <= 0) return step;
        const dropped = Math.min(excess, step.files.length);
        excess -= dropped;
        return {
            ...step,
            files: step.files.slice(dropped),
        };
    });
}

/**
 * Appends one completed step, with the files it wrote and what only the record can keep. A file
 * written again belongs to the latest step that wrote it.
 *
 * @param {string} designAbs
 * @param {string} workspace
 * @param {{step: string, files?: string[], answers?: {question: string, answer: string}[], decisions?: string[]}} entry
 * @returns {Invocation|null} The record written; `null` when there is none to add to.
 */
function addStep(designAbs, workspace, entry) {
    if (isDryRun()) return null;
    return locked(designAbs, workspace, (file) => {
        const open = readInvocation(designAbs, workspace);
        if (!open) return null;
        const now = new Date().toISOString();
        const files = [
            ...new Set(entry.files || []),
        ];
        const written = new Set(files);
        const earlier = open.steps.map((step) => ({
            ...step,
            files: step.files.filter((name) => !written.has(name)),
        }));
        // A nested step carries the inner command's name; a step named after that command already does.
        const name =
            open.parent && entry.step !== open.command
                ? `${open.command}: ${entry.step}`
                : entry.step;
        const record = {
            ...open,
            updated: now,
            steps: boundSteps([
                ...earlier,
                {
                    step: bounded(name),
                    files,
                    at: now,
                },
            ]),
            answers: [
                ...open.answers,
                ...(entry.answers || []).map((a) => ({
                    question: bounded(a.question),
                    answer: bounded(a.answer),
                })),
            ],
            decisions: [
                ...open.decisions,
                ...(entry.decisions || []).map((d) => bounded(d.replace(/\s+/g, ' ').trim())),
            ],
        };
        writeAtomic(file, record);
        return record;
    });
}

/**
 * Removes the record of a workspace.
 *
 * @param {string} designAbs
 * @param {string} workspace
 * @returns {boolean} True when a record was removed.
 */
function clearInvocation(designAbs, workspace) {
    if (isDryRun() || !fs.existsSync(invocationPath(designAbs, workspace))) return false;
    return locked(designAbs, workspace, (file) => {
        fs.rmSync(file, {
            force: true,
        });
        return true;
    });
}

module.exports = {
    invocationPath,
    readInvocation,
    ownerOf,
    recordingDisabled,
    startInvocation,
    addStep,
    clearInvocation,
};
