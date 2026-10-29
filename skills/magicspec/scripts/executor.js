#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
    parseFlags,
    resolveProjectRoot,
    STATE_DIR_NAME,
    LEGACY_STATE_DIR_NAME,
    WORKSPACE_NAME_RE,
    executorHint,
} = require('./utils');

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
    console.error('Usage: node executor.js <script-name> [args...]');
    process.exit(1);
}

if (!SCRIPT_NAME_RE.test(scriptName)) {
    console.error(`HALT: Invalid script name '${scriptName}'. Must match ${SCRIPT_NAME_RE}.`);
    process.exit(1);
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
    fs.existsSync(path.join(legacyState, 'workspace.json')) || fs.existsSync(path.join(legacyState, 'INDEX.md'));
if (hasLegacyState && !MIGRATION_SAFE.has(scriptName)) {
    const both = fs.existsSync(path.join(projectRoot, STATE_DIR_NAME));
    console.error(
        both
            ? `HALT: Both ${LEGACY_STATE_DIR_NAME}/ and ${STATE_DIR_NAME}/ exist: a migration was started and not finished (or ${STATE_DIR_NAME}/ was created by mistake). Run \`${executorHint()} migrate\` to see what is left, then \`--apply\` to finish it.`
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
                console.error(`HALT: Invalid default workspace name in ${STATE_DIR_NAME}/workspace.json. Must match ${WORKSPACE_NAME_RE}.`);
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
                if (!fs.existsSync(targetPath)) {
                    // WI-9: Auto-mkdir the standard
                    // subtree instead of silently falling back to the state folder root.
                    // The previous fallback caused spec/task artifacts to accumulate
                    // at the global registry level, breaking per-workspace isolation.
                    try {
                        const subtree = [
                            path.join(targetPath, 'specifications'),
                            path.join(targetPath, 'tasks'),
                            path.join(targetPath, 'archives', 'tasks'),
                        ];
                        for (const dir of subtree) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        console.log(
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
    MAGIC_ENGINE_DIR: process.env.MAGIC_ENGINE_DIR || path.resolve(path.dirname(process.argv[1]), '..'),
};
if (workspaceData) {
    const workspace = workspaceData.workspaces?.[workspaceName];
    if (workspace && Array.isArray(workspace.scope)) {
        envVars.MAGIC_WORKSPACE_SCOPE = workspace.scope.join(',');
    }
}
const childEnv = Object.assign({}, process.env, envVars);

// Generic script execution logic follows...
const isWindows = process.platform === 'win32';
const jsPath = path.join(__dirname, `${scriptName}.js`);
const shellExtension = isWindows ? '.ps1' : '.sh';
const shellPath = path.join(__dirname, `${scriptName}${shellExtension}`);

let command, cmdArgs;

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

child.on('exit', (code) => {
    process.exit(code || 0);
});

child.on('error', (err) => {
    console.error(`Failed to start script: ${err.message}`);
    process.exit(1);
});
