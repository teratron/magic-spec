#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads anything.
require('./lib/commands').guardArgv('resolve-workspace', module);

const fs = require('fs');
const path = require('path');
const { parseFlags, resolveDesignRoot, resolveProjectRoot, STATE_DIR_NAME } = require('./utils');
const { RoutingError, resolveWorkspace } = require('./lib/workspace-routing');

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE WORKSPACE (The Routing Chain as a Script)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chooses the workspace a command acts on and says why. The chain is the one every command
 * shares: an explicit argument, `MAGIC_WORKSPACE`, the paths the request names matched against
 * each workspace's scope, the topic of the request, the workspace with work in flight, the
 * registry default, and last the workspace whose scope covers the most files. Read-only: it
 * writes nothing, and it never creates a workspace.
 *
 * Usage:
 *   node skills/magicspec/scripts/executor.js resolve-workspace [--command <name>] [--text <request>]
 *       [--paths a,b] [--json] [--workspace <name>]
 *
 * The executor consumes `--workspace` and forwards the result as `MAGIC_DESIGN_DIR`, so a script
 * cannot tell a name the caller typed from the registry default by that variable alone. The
 * executor therefore adds `MAGIC_WORKSPACE_SOURCE` (`argument`, `environment` or `default`), and
 * only a name that arrived by one of the first two counts here as explicit.
 */

// ───────────────────────────────────────────────────────────────────────────
// Reading the Caller's Choice
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} projectRoot - Absolute project root.
 * @param {string} designAbs - Absolute state folder.
 * @returns {string|null} The workspace named by `MAGIC_DESIGN_DIR`, when it names one.
 */
function workspaceFromDesignDir(projectRoot, designAbs) {
    const envDir = process.env.MAGIC_DESIGN_DIR;
    if (!envDir) return null;
    const abs = path.resolve(projectRoot, envDir);
    if (abs === designAbs || path.dirname(abs) !== designAbs) return null;
    return path.basename(abs);
}

/**
 * Finds the name the caller chose explicitly, if any: the flag, then what the executor says it
 * took from an argument or from the environment, then the environment itself.
 *
 * @param {string|undefined} flag - The `--workspace` value of a direct invocation.
 * @param {string} projectRoot - Absolute project root.
 * @param {string} designAbs - Absolute state folder.
 * @returns {{value: string, source: 'argument'|'environment'}|null}
 */
function explicitChoice(flag, projectRoot, designAbs) {
    if (flag) return { value: flag, source: 'argument' };
    const source = process.env.MAGIC_WORKSPACE_SOURCE;
    const fromDir = workspaceFromDesignDir(projectRoot, designAbs);
    if (source === 'argument' && fromDir) return { value: fromDir, source: 'argument' };
    if (process.env.MAGIC_WORKSPACE)
        return { value: process.env.MAGIC_WORKSPACE, source: 'environment' };
    if (!source && fromDir) return { value: fromDir, source: 'environment' };
    return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Rendering
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {Record<string, string[]>} matched - Paths per workspace.
 * @returns {string} `web 2 (a, b); docs 1 (c)`, or `` when nothing matched.
 */
function matchedText(matched) {
    return Object.entries(matched)
        .filter(([, files]) => files.length > 0)
        .map(([name, files]) => `${name} ${files.length} (${files.join(', ')})`)
        .join('; ');
}

/**
 * @param {Record<string, number>} byName - A number per workspace.
 * @param {number} digits - Decimals to print.
 * @returns {string} `web 0.50, docs 0.00`.
 */
function numbersText(byName, digits) {
    return Object.entries(byName)
        .map(([name, value]) => `${name} ${value.toFixed(digits)}`)
        .join(', ');
}

/**
 * @param {ReturnType<typeof resolveWorkspace>} result - The routing result.
 * @returns {string} The human report: one fact per line, empty facts left out.
 */
function renderText(result) {
    const lines = [
        `Workspace: ${result.workspace === null ? '(none registered)' : result.workspace}`,
        `Signal: ${result.signal}`,
    ];
    const matched = matchedText(result.matched);
    if (matched) lines.push(`Matched paths: ${matched}`);
    if (result.unmatched.length > 0)
        lines.push(`Paths no scope covers: ${result.unmatched.join(', ')}`);
    if (result.scores) lines.push(`Topic scores: ${numbersText(result.scores, 2)}`);
    if (result.in_flight) lines.push(`Work in flight: ${result.in_flight.join(', ') || 'none'}`);
    if (result.coverage) lines.push(`Scope coverage: ${numbersText(result.coverage, 4)}`);
    if (result.narration) lines.push(`Narration: ${result.narration}`);
    return lines.join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Entry point.
 *
 * @returns {void}
 */
function main() {
    const { values, flags, errors } = parseFlags(process.argv.slice(2), {
        valueFlags: ['--workspace', '--command', '--text', '--paths'],
        boolFlags: ['--json'],
    });
    if (errors.length > 0) throw new RoutingError(errors[0]);

    const command = values['--command'] || null;
    if (command !== null && !/^[a-z][a-z0-9-]*$/.test(command)) {
        throw new RoutingError(
            `Invalid command name '${command}'. Must be lower-case letters, digits and hyphens.`,
        );
    }

    const projectRoot = resolveProjectRoot();
    const { designAbs } = resolveDesignRoot(projectRoot);
    const explicit = explicitChoice(values['--workspace'], projectRoot, designAbs);

    let registry = null;
    try {
        registry = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'));
    } catch (error) {
        if (error && error.code !== 'ENOENT') {
            throw new RoutingError(
                `${STATE_DIR_NAME}/workspace.json cannot be read: ${error.message}`,
            );
        }
    }
    if (registry === null) {
        if (explicit) {
            throw new RoutingError(
                `Workspace '${explicit.value}' provided, but ${STATE_DIR_NAME}/workspace.json does not exist.`,
            );
        }
        registry = { workspaces: {} };
    }

    const listed = (values['--paths'] || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    const result = resolveWorkspace({
        root: projectRoot,
        designAbs,
        registry,
        explicit,
        command,
        text: values['--text'] || '',
        paths: listed,
    });
    console.log(flags['--json'] ? JSON.stringify(result) : renderText(result));
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        if (!(error instanceof RoutingError)) throw error;
        console.error(`HALT: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { explicitChoice, renderText };
