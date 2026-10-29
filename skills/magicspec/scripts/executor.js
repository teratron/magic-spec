#!/usr/bin/env node
'use strict';

// The engine's scripts use APIs from Node 16.9 on and are run on current LTS releases; an older
// runtime would fail somewhere inside them with a TypeError, so it is refused here, first.
const MIN_NODE_MAJOR = 18;
if (Number(process.versions.node.split('.')[0]) < MIN_NODE_MAJOR) {
    console.error(`HALT: Node.js ${MIN_NODE_MAJOR} or newer is required (found ${process.version}).`);
    process.exit(1);
}

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// The executor's own modules: when one is missing the engine folder is damaged, and a stack trace
// from the loader is no way to say so.
const ENGINE_FOLDER = path.resolve(__dirname, '..');
let utils;
let commands;
try {
    utils = require('./utils');
    commands = require('./lib/commands');
} catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
        console.error(
            `HALT: The engine is damaged: a file it needs is missing (${String(err.message).split('\n')[0]}). Restore ${ENGINE_FOLDER} from the release archive.`,
        );
        process.exit(1);
    }
    throw err;
}
const {
    parseFlags,
    resolveProjectRoot,
    STATE_DIR_NAME,
    LEGACY_STATE_DIR_NAME,
    WORKSPACE_NAME_RE,
    executorHint,
} = utils;

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL EXECUTOR (Engine Kernel Proxy)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Universal script executor for Magic SDD.
 * Detects OS and runs the appropriate .sh or .ps1 script.
 */

// ───────────────────────────────────────────────────────────────────────────
// Input Validation (Path-Traversal Guard)
// ───────────────────────────────────────────────────────────────────────────

const SCRIPT_NAME_RE = /^[a-z][a-z0-9-]*$/;

const scriptName = process.argv[2];
let args = process.argv.slice(3);

if (!scriptName) {
    console.error(commands.listText(executorHint()));
    process.exit(1);
}

// A request for the command list, or for the help of one command, is answered here, from the
// command table, before the project is looked at and before any script starts: nothing that
// asks what a command does can reach code that writes.
if (['--help', '-h', 'help'].includes(scriptName)) {
    console.log(commands.listText(executorHint()));
    process.exit(0);
}

if (!SCRIPT_NAME_RE.test(scriptName)) {
    console.error(`HALT: Invalid script name '${scriptName}'. Must match ${SCRIPT_NAME_RE}.`);
    process.exit(1);
}

if (!commands.isCommand(scriptName)) {
    console.error(`HALT: Unknown command '${scriptName}'.`);
    console.error(commands.listText(executorHint()));
    process.exit(1);
}

const commandEntry = commands.COMMANDS[scriptName];
if (!commandEntry.ownHelp && (args.includes('--help') || args.includes('-h'))) {
    console.log(commands.helpText(scriptName, executorHint()));
    process.exit(0);
}

// ───────────────────────────────────────────────────────────────────────────
// Project Root Resolution
// ───────────────────────────────────────────────────────────────────────────

// `--root <dir>` (or `MAGIC_ROOT`) names the project explicitly; without it the
// root is the nearest ancestor of the working directory that holds the state
// folder, then the nearest with a `.git`, then the working directory itself.
// The executor resolves it once and hands it to the child as `MAGIC_ROOT`, so a
// command behaves the same from the root and from any subdirectory.

// ───────────────────────────────────────────────────────────────────────────
// Workspace Resolution (Zero-Prompt)
// ───────────────────────────────────────────────────────────────────────────

// `--workspace=<name>` and `--workspace <name>` are both accepted. A flag that
// is present but valueless HALTs instead of falling back to the default
// workspace: a silent fallback routed writes and Pre-flight validation at the
// wrong workspace, and made the Unknown-workspace guard below unreachable.
const {
    values: flagValues,
    rest: passThroughArgs,
    errors: flagErrors,
} = parseFlags(args, {
    valueFlags: ['--workspace', '--root'],
});

if (flagErrors.length > 0) {
    console.error(`HALT: ${flagErrors[0]}`);
    process.exit(1);
}

args = passThroughArgs;

// What the command is given is checked against its entry before the project is opened, so a
// misspelled option stops here instead of reaching a script that ignores it and runs.
const argErrors = commands.validateArgv(scriptName, args);
if (argErrors.length > 0) {
    console.error(`HALT: ${argErrors[0]}`);
    console.error(`Usage: ${executorHint()} ${commands.usageLine(scriptName)}   (see --help)`);
    process.exit(1);
}

let projectRoot;
try {
    projectRoot = resolveProjectRoot({ root: flagValues['--root'] });
} catch (err) {
    console.error(`HALT: ${err.message}`);
    process.exit(1);
}

// A project that still has the 2.x state folder has not been migrated. Anything but the migration
// itself (and the removal of the engine) would create a second, empty state folder beside it, so
// every other command stops with the one path forward.
// Scripts that never read the state folder, so they may run before it is renamed.
const MIGRATION_SAFE = new Set(['migrate', 'remove', 'install-hooks']);
const legacyState = path.join(projectRoot, LEGACY_STATE_DIR_NAME);
const hasLegacyState =
    fs.existsSync(path.join(legacyState, 'workspace.json')) ||
    fs.existsSync(path.join(legacyState, 'INDEX.md'));
if (hasLegacyState && !MIGRATION_SAFE.has(scriptName)) {
    const both = fs.existsSync(path.join(projectRoot, STATE_DIR_NAME));
    console.error(
        both
            ? `HALT: Both ${LEGACY_STATE_DIR_NAME}/ and ${STATE_DIR_NAME}/ exist: a migration was started and not finished (or ${STATE_DIR_NAME}/ was created by mistake). Run \`${executorHint()} migrate\`: it names the one action that unblocks the migration, and \`--apply\` then finishes it.`
            : `HALT: This project uses the 2.x layout (${LEGACY_STATE_DIR_NAME}/). Run \`${executorHint()} migrate\` to see the plan, then \`--apply\` to migrate it.`,
    );
    process.exit(1);
}

// An explicit flag overrides the ambient MAGIC_WORKSPACE; both reach the same guard.
let workspaceName = flagValues['--workspace'] || process.env.MAGIC_WORKSPACE || null;

if (workspaceName && !WORKSPACE_NAME_RE.test(workspaceName)) {
    console.error(
        `HALT: Invalid workspace name '${workspaceName}'. Must match ${WORKSPACE_NAME_RE}.`,
    );
    process.exit(1);
}

let magicDesignDir = STATE_DIR_NAME;
const workspaceJsonPath = path.join(projectRoot, STATE_DIR_NAME, 'workspace.json');
let workspaceData = null;

if (fs.existsSync(workspaceJsonPath)) {
    try {
        workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
        if (!workspaceName && workspaceData.default) {
            workspaceName = workspaceData.default;
            // The registry is part of the repository: a default that arrives from it passes
            // the same guard as one given on the command line before it names a folder.
            if (typeof workspaceName !== 'string' || !WORKSPACE_NAME_RE.test(workspaceName)) {
                console.error(
                    `HALT: Invalid default workspace name in ${STATE_DIR_NAME}/workspace.json. Must match ${WORKSPACE_NAME_RE}.`,
                );
                process.exit(1);
            }
        }

        if (workspaceName) {
            const workspaceEntry =
                workspaceData.workspaces &&
                typeof workspaceData.workspaces === 'object' &&
                workspaceData.workspaces[workspaceName];

            if (workspaceEntry) {
                const targetPath = path.join(projectRoot, STATE_DIR_NAME, workspaceName);
                // WI-9: a command that writes into the workspace gets the standard subtree
                // instead of a silent fallback to the state folder root (that fallback made
                // spec/task artifacts accumulate at the global registry level, breaking
                // per-workspace isolation). A command that only reads never creates it: a
                // briefing promises zero writes, and what a missing folder means is for the
                // command to report. The note goes to stderr, so a `--json` stdout stays one document.
                if (!fs.existsSync(targetPath) && commandEntry.provisions) {
                    try {
                        const subtree = [
                            path.join(targetPath, 'specifications'),
                            path.join(targetPath, 'tasks'),
                            path.join(targetPath, 'archives', 'tasks'),
                        ];
                        for (const dir of subtree) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        console.error(
                            `Note: Provisioned missing workspace directory '${STATE_DIR_NAME}/${workspaceName}/' (WI-9 auto-mkdir).`,
                        );
                    } catch (err) {
                        console.error(
                            `HALT: Failed to auto-provision workspace '${workspaceName}': ${err.message}`,
                        );
                        process.exit(1);
                    }
                }
                magicDesignDir = `${STATE_DIR_NAME}/${workspaceName}`;
            } else {
                console.error(`HALT: Unknown workspace name '${workspaceName}'. Fix and retry.`);
                process.exit(1);
            }
        }
    } catch (e) {
        console.error(`Error parsing workspace.json: ${e.message}`);
        process.exit(1);
    }
} else if (workspaceName) {
    // Flag or env var provided but no workspace.json
    console.error(
        `HALT: Workspace '${workspaceName}' provided, but ${STATE_DIR_NAME}/workspace.json does not exist.`,
    );
    process.exit(1);
}

// Expose MAGIC_ROOT, MAGIC_DESIGN_DIR and optional MAGIC_WORKSPACE_SCOPE to child
const envVars = {
    MAGIC_ROOT: projectRoot,
    MAGIC_DESIGN_DIR: magicDesignDir,
    // The engine folder by the path this executor was started through (a link keeps its name).
    MAGIC_ENGINE_DIR:
        process.env.MAGIC_ENGINE_DIR || path.resolve(path.dirname(process.argv[1]), '..'),
};
if (workspaceData) {
    const workspace = workspaceData.workspaces?.[workspaceName];
    if (workspace && Array.isArray(workspace.scope)) {
        envVars.MAGIC_WORKSPACE_SCOPE = workspace.scope.join(',');
    }
}
const childEnv = Object.assign({}, process.env, envVars);

// A script that needs a file the engine folder no longer holds would end in the loader's stack
// trace, with nothing to say what happened or what to do. The local `require` calls of the script
// and of the engine files it pulls in are read before it starts (comments aside), and a missing
// file is reported once, with the remedy.
/**
 * @param {string} entry - Absolute path of the script about to run.
 * @returns {Array<{file: string, by: string}>} Engine files that are required and absent.
 */
function missingEngineFiles(entry) {
    const rel = (p) => path.relative(ENGINE_FOLDER, p).split(path.sep).join('/');
    const seen = new Set();
    const missing = [];
    const queue = [entry];
    while (queue.length > 0) {
        const current = queue.pop();
        if (seen.has(current)) continue;
        seen.add(current);
        let source;
        try {
            source = fs.readFileSync(current, 'utf8');
        } catch {
            continue;
        }
        const code = source
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
        for (const match of code.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
            const base = path.resolve(path.dirname(current), match[1]);
            const found = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')].find(
                (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
            );
            if (!found) missing.push({ file: rel(base), by: rel(current) });
            else if (found.endsWith('.js') && found.startsWith(ENGINE_FOLDER)) queue.push(found);
        }
    }
    return missing;
}

// Generic script execution logic follows...
const isWindows = process.platform === 'win32';
const jsPath = path.join(__dirname, `${scriptName}.js`);
const shellExtension = isWindows ? '.ps1' : '.sh';
const shellPath = path.join(__dirname, `${scriptName}${shellExtension}`);

let command, cmdArgs;

const absent = fs.existsSync(jsPath) ? missingEngineFiles(jsPath) : [];
if (absent.length > 0) {
    const shown = absent
        .slice(0, 5)
        .map((m) => `${m.file} (needed by ${m.by})`)
        .join(', ');
    console.error(
        `HALT: The engine is damaged: ${absent.length} file(s) it needs are missing — ${shown}${absent.length > 5 ? ', …' : ''}.`,
    );
    console.error(
        utils.hasEngineWriteTooling()
            ? `Restore them from git (git checkout -- ${path.relative(projectRoot, ENGINE_FOLDER).split(path.sep).join('/')}).`
            : `Restore ${utils.engineRel()}/ from the release archive; do not regenerate .checksums.`,
    );
    process.exit(1);
}

if (fs.existsSync(jsPath)) {
    command = 'node';
    cmdArgs = [jsPath, ...args];
} else {
    const scriptPath = shellPath;
    if (isWindows) {
        command = 'powershell.exe';
        cmdArgs = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args];
    } else {
        command = 'bash';
        cmdArgs = [scriptPath, ...args];
    }
}

const child = spawn(command, cmdArgs, {
    stdio: 'inherit',
    shell: false,
    env: childEnv,
    // Paths typed on the command line are relative to the project, wherever the caller stands.
    cwd: projectRoot,
});

child.on('exit', (code, signal) => {
    // A child ended by a signal has no exit code; reporting success for it would hide a kill.
    if (code === null) {
        console.error(`Script '${scriptName}' was ended by signal ${signal}.`);
        process.exit(1);
    }
    process.exit(code);
});

child.on('error', (err) => {
    console.error(`Failed to start script: ${err.message}`);
    process.exit(1);
});
