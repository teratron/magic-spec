const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Universal script executor for Magic SDD.
 * Detects OS and runs the appropriate .sh or .ps1 script.
 */

const scriptName = process.argv[2];
let args = process.argv.slice(3);

if (!scriptName) {
    console.error('Usage: node magic-executor.js <script-name> [args...]');
    process.exit(1);
}

// Workspace Resolution Priority (Zero-Prompt)
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

let magicDesignDir = '.design';
const workspaceJsonPath = path.join(process.cwd(), '.design', 'workspace.json');

if (fs.existsSync(workspaceJsonPath)) {
    try {
        const workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
        if (!workspaceName && workspaceData.default) {
            workspaceName = workspaceData.default;
        }

        if (workspaceName) {
            const workspaceExists = workspaceData.workspaces &&
                typeof workspaceData.workspaces === 'object' &&
                workspaceData.workspaces[workspaceName];

            if (workspaceExists) {
                magicDesignDir = `.design/${workspaceName}`;
                // Physical Path Validation
                if (!fs.existsSync(path.join(process.cwd(), magicDesignDir))) {
                    console.error(`HALT: Workspace directory '${magicDesignDir}' does not exist on disk. Fix registry or create dir.`);
                    process.exit(1);
                }
            } else {
                console.error(`HALT: Unknown workspace name '${workspaceName}'. Fix and retry.`);
                process.exit(1);
            }
        } else {
            console.error(`HALT: workspace.json present but no 'default' defined. Fix and retry.`);
            process.exit(1);
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

// Expose MAGIC_DESIGN_DIR to child completely
const childEnv = Object.assign({}, process.env, { MAGIC_DESIGN_DIR: magicDesignDir });

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
