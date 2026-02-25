const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Universal script executor for Magic SDD.
 * Detects OS and runs the appropriate .sh or .ps1 script.
 */

const scriptName = process.argv[2];
const args = process.argv.slice(3);

if (!scriptName) {
    console.error('Usage: node magic-executor.js <script-name> [args...]');
    process.exit(1);
}

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

const child = spawn(command, cmdArgs, { stdio: 'inherit', shell: false });

child.on('exit', (code) => {
    process.exit(code || 0);
});

child.on('error', (err) => {
    console.error(`Failed to start script: ${err.message}`);
    process.exit(1);
});
