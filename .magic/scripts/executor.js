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

// Expose MAGIC_DESIGN_DIR and optional MAGIC_WORKSPACE_SCOPE to child completely
const envVars = { MAGIC_DESIGN_DIR: magicDesignDir };
if (fs.existsSync(workspaceJsonPath)) {
    try {
        const workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
        const workspace = workspaceData.workspaces && workspaceData.workspaces[workspaceName];
        if (workspace && Array.isArray(workspace.scope)) {
            envVars.MAGIC_WORKSPACE_SCOPE = workspace.scope.join(',');
        }
    } catch (e) {
        // Silent fail as we're just injecting metadata
    }
}
const childEnv = Object.assign({}, process.env, envVars);

// Engine Meta Automation Command
if (scriptName === 'update-engine-meta') {
    const workflowNames = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--workflow' && args[i + 1]) {
            workflowNames.push(...args[i + 1].split(','));
            i++;
        }
    }

    if (workflowNames.length === 0) {
        console.error('Usage: node executor.js update-engine-meta --workflow {run,rule,suite,...}');
        process.exit(1);
    }

    const magicDir = path.join(__dirname, '..');
    const versionPath = path.join(magicDir, '.version');
    const historyDir = path.join(magicDir, 'history');
    const date = new Date().toISOString().split('T')[0];

    // 1. Increment Version (patch)
    if (fs.existsSync(versionPath)) {
        const currentVersion = fs.readFileSync(versionPath, 'utf8').trim();
        const parts = currentVersion.split('.');
        if (parts.length === 3) {
            parts[2] = parseInt(parts[2], 10) + 1;
            const newVersion = parts.join('.');
            fs.writeFileSync(versionPath, newVersion);
            console.log(`Engine version bumped: ${currentVersion} -> ${newVersion}`);

            // 2. Update History
            for (const wf of workflowNames) {
                const historyFile = path.join(historyDir, `${wf}.md`);
                if (fs.existsSync(historyFile)) {
                    let content = fs.readFileSync(historyFile, 'utf8');
                    const lines = content.trimEnd().split('\n');
                    const lastLineIndex = lines.length - 1;
                    const lastLine = lines[lastLineIndex] || '';
                    const automatedMsg = 'Automated update via engine meta automation';

                    if (lastLine.includes(automatedMsg)) {
                        // Update existing automated entry with range
                        const parts = lastLine.split('|');
                        // | Version | Date | Author | Description |
                        // Index 1 is Version
                        const currentRange = parts[1].trim();
                        const firstVersion = currentRange.split('-')[0].trim();
                        const newRange = ` ${firstVersion} - ${newVersion} `;
                        parts[1] = newRange;
                        // Also update date just in case
                        parts[2] = ` ${date} `;

                        lines[lastLineIndex] = parts.join('|');
                        fs.writeFileSync(historyFile, lines.join('\n') + '\n');
                        console.log(`History range updated for '${wf}': ${newRange.trim()}`);
                    } else {
                        const entry = `| ${newVersion} | ${date} | Antigravity | ${automatedMsg} |\n`;
                        fs.appendFileSync(historyFile, entry);
                        console.log(`History updated: .magic/history/${wf}.md`);
                    }
                } else {
                    console.warn(`Warning: History file not found for workflow '${wf}'`);
                }
            }
        }
    }

    // 3. Regenerate Checksums
    console.log('Regenerating engine checksums...');
    const checksumScript = path.join(__dirname, 'generate-checksums.js');
    const child = spawn('node', [checksumScript], { stdio: 'inherit', env: childEnv });
    child.on('exit', (code) => process.exit(code || 0));
} else {
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
}
