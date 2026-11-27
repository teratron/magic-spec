#!/usr/bin/env node
// @ts-check
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('checkpoint', module);

const fs = require('fs');
const path = require('path');
const {
    parseFlags,
    resolveDesignRoot,
    resolveProjectRoot,
    unregisteredWorkspaceMessage,
    STATE_DIR_NAME,
    WORKSPACE_NAME_RE,
} = require('./utils');
const {
    startInvocation,
    addStep,
    clearInvocation,
    recordingDisabled,
} = require('./lib/invocation');

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT (the invocation record's writer)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Records where a mutating command stands, at the checkpoints its body names, so that a session
 * that ends in the middle of it can be resumed. It writes the engine's runtime folder only.
 *
 * A checkpoint never blocks a workflow: every problem is one warning on stderr and exit 0. With
 * finalization switched off nothing is written, because nothing would remove the record.
 *
 * Usage:
 *   node skills/magicspec/scripts/executor.js checkpoint --workspace=<name> --start --command=<command> [--argument="<text>"] [--nested]
 *   node skills/magicspec/scripts/executor.js checkpoint --workspace=<name> --step="<step>" [--files=<a,b>] [--answer="<question> => <answer>"] [--decision="<line>"]
 *   node skills/magicspec/scripts/executor.js checkpoint --workspace=<name> --clear
 */

/** Separates a survey question from its answer in `--answer`. */
const ANSWER_SEPARATOR = ' => ';
/** A command name as the router's table writes one. */
const COMMAND_NAME_RE = /^[a-z][a-z-]*$/;

// ───────────────────────────────────────────────────────────────────────────
// Arguments
// ───────────────────────────────────────────────────────────────────────────

/**
 * Every value of an option that may be given more than once.
 *
 * @param {string[]} argv
 * @param {string} flag - For example `--answer`.
 * @returns {string[]}
 */
function allValues(argv, flag) {
    const found = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === flag && argv[i + 1] !== undefined) found.push(argv[++i]);
        else if (argv[i].startsWith(`${flag}=`)) found.push(argv[i].slice(flag.length + 1));
    }
    return found;
}

/**
 * A file path as the record keeps it: relative to the project, with forward slashes.
 *
 * @param {string} projectRoot
 * @param {string} entry - A path as typed.
 * @returns {string|null} `null` for an empty entry or one outside the project.
 */
function projectRelative(projectRoot, entry) {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    const relative = path.relative(projectRoot, path.resolve(projectRoot, trimmed));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return relative.split(path.sep).join('/');
}

/**
 * The workspace this call is about: the flag when the script is run by hand, else the folder the
 * executor chose, else the registry default.
 *
 * @param {string} designAbs
 * @param {string|undefined} flag
 * @returns {string|null}
 */
function workspaceName(designAbs, flag) {
    if (flag) return flag;
    const envDir = process.env.MAGIC_DESIGN_DIR;
    if (envDir && envDir !== STATE_DIR_NAME) return path.basename(envDir);
    try {
        const data = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'));
        return typeof data.default === 'string' ? data.default : null;
    } catch {
        return null;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} message - What stopped this checkpoint.
 * @returns {void}
 */
function warn(message) {
    console.error(`[checkpoint] ${message}; nothing recorded.`);
}

/**
 * @param {string} value - `"<question> => <answer>"`; without the separator the whole is the answer.
 * @returns {{question: string, answer: string}}
 */
function parseAnswer(value) {
    const at = value.indexOf(ANSWER_SEPARATOR);
    return at === -1
        ? {
              question: '',
              answer: value,
          }
        : {
              question: value.slice(0, at),
              answer: value.slice(at + ANSWER_SEPARATOR.length),
          };
}

/**
 * The `--start` mode.
 *
 * @param {string} designAbs
 * @param {string} name - The workspace.
 * @param {{command?: string, argument?: string, nested: boolean}} start
 * @returns {void}
 */
function start(designAbs, name, { command, argument, nested }) {
    if (!command || !COMMAND_NAME_RE.test(command))
        return warn('--start needs --command=<command>');
    startInvocation(designAbs, name, {
        command,
        argument,
        nested,
    });
    console.log(`[checkpoint] ${command} started (${name})`);
}

/**
 * The `--step` mode.
 *
 * @param {string} designAbs
 * @param {string} name - The workspace.
 * @param {string[]} argv - For the options that may be given more than once.
 * @param {{step: string, files: string}} values
 * @returns {void}
 */
function step(designAbs, name, argv, values) {
    const projectRoot = resolveProjectRoot();
    const files = [];
    for (const entry of values.files.split(',')) {
        const relative = projectRelative(projectRoot, entry);
        if (relative) files.push(relative);
        else if (entry.trim()) console.error(`[checkpoint] '${entry}' is outside the project`);
    }
    const record = addStep(designAbs, name, {
        step: values.step,
        files,
        answers: allValues(argv, '--answer').map(parseAnswer),
        decisions: allValues(argv, '--decision'),
    });
    if (!record) return warn('no open record to add to');
    console.log(`[checkpoint] ${record.command}: ${values.step} (${name})`);
}

/**
 * Performs one checkpoint call.
 *
 * @param {string[]} argv
 * @returns {void}
 */
function run(argv) {
    const { values, flags, errors } = parseFlags(argv, {
        valueFlags: [
            '--workspace',
            '--command',
            '--argument',
            '--step',
            '--files',
            '--answer',
            '--decision',
        ],
        boolFlags: [
            '--start',
            '--clear',
            '--nested',
        ],
    });
    if (errors.length > 0) return warn(errors[0]);

    const modes = [
        flags['--start'],
        values['--step'] !== undefined,
        flags['--clear'],
    ].filter(Boolean).length;
    if (modes !== 1) return warn('give exactly one of --start, --step or --clear');

    const { designAbs } = resolveDesignRoot(resolveProjectRoot());
    const name = workspaceName(designAbs, values['--workspace']);
    if (!name || !WORKSPACE_NAME_RE.test(name)) return warn('no workspace was named');
    const unregistered = unregisteredWorkspaceMessage(path.join(designAbs, name));
    if (unregistered) return warn(unregistered);

    if (flags['--clear']) return void clearInvocation(designAbs, name);
    if (recordingDisabled(designAbs)) return;
    if (flags['--start'])
        return start(designAbs, name, {
            command: values['--command'],
            argument: values['--argument'],
            nested: Boolean(flags['--nested']),
        });
    step(designAbs, name, argv, {
        step: values['--step'] || '',
        files: values['--files'] || '',
    });
}

if (require.main === module) {
    try {
        run(process.argv.slice(2));
    } catch (error) {
        // A checkpoint is a safety net, never a gate: report it and let the workflow go on.
        warn(error instanceof Error ? error.message : String(error));
    }
}

module.exports = {
    run,
};
