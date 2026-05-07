#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
const WORKSPACE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

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
// Workspace Resolution (Zero-Prompt)
// ───────────────────────────────────────────────────────────────────────────

let workspaceName = process.env.MAGIC_WORKSPACE || null;
const finalArgs = [];
for (const arg of args) {
    if (arg.startsWith('--workspace=')) {
        workspaceName = arg.split('=')[1];
    } else {
        finalArgs.push(arg);
    }
}
args = finalArgs;

if (workspaceName && !WORKSPACE_NAME_RE.test(workspaceName)) {
    console.error(`HALT: Invalid workspace name '${workspaceName}'. Must match ${WORKSPACE_NAME_RE}.`);
    process.exit(1);
}

let magicDesignDir = '.design';
const workspaceJsonPath = path.join(process.cwd(), '.design', 'workspace.json');
let workspaceData = null;

if (fs.existsSync(workspaceJsonPath)) {
    try {
        workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
        if (!workspaceName && workspaceData.default) {
            workspaceName = workspaceData.default;
        }

        if (workspaceName) {
            const workspaceEntry = workspaceData.workspaces &&
                typeof workspaceData.workspaces === 'object' &&
                workspaceData.workspaces[workspaceName];

            if (workspaceEntry) {
                const targetPath = path.join(process.cwd(), '.design', workspaceName);
                if (!fs.existsSync(targetPath)) {
                    // WI-9 (l1-workspace-intent-routing.md): Auto-mkdir the standard
                    // subtree instead of silently falling back to .design/ root.
                    // The previous fallback caused spec/task artifacts to accumulate
                    // at the global registry level, breaking per-workspace isolation.
                    try {
                        const subtree = [
                            path.join(targetPath, 'specifications'),
                            path.join(targetPath, 'tasks'),
                            path.join(targetPath, 'archives', 'tasks')
                        ];
                        for (const dir of subtree) {
                            fs.mkdirSync(dir, { recursive: true });
                        }
                        console.log(`Note: Provisioned missing workspace directory '.design/${workspaceName}/' (WI-9 auto-mkdir).`);
                    } catch (err) {
                        console.error(`HALT: Failed to auto-provision workspace '${workspaceName}': ${err.message}`);
                        process.exit(1);
                    }
                }
                magicDesignDir = `.design/${workspaceName}`;
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
    console.error(`HALT: Workspace '${workspaceName}' provided, but .design/workspace.json does not exist.`);
    process.exit(1);
}

// Expose MAGIC_DESIGN_DIR and optional MAGIC_WORKSPACE_SCOPE to child
const envVars = { MAGIC_DESIGN_DIR: magicDesignDir };
if (workspaceData) {
    const workspace = workspaceData.workspaces && workspaceData.workspaces[workspaceName];
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

const child = spawn(command, cmdArgs, { stdio: 'inherit', shell: false, env: childEnv });

child.on('exit', (code) => {
    process.exit(code || 0);
});

child.on('error', (err) => {
    console.error(`Failed to start script: ${err.message}`);
    process.exit(1);
});
