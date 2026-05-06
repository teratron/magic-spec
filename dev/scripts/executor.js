'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// DEV EXECUTOR — Engine Maintenance CLI
// ═══════════════════════════════════════════════════════════════════════════
// Routes to scripts in dev/scripts/ (same directory as this file).
// No workspace resolution — dev scripts operate on the magic-spec repository
// itself, not on user projects.
//
// Usage: node dev/scripts/executor.js <script-name> [args...]

const SCRIPT_NAME_RE = /^[a-z][a-z0-9-]*$/;

const scriptName = process.argv[2];
const args = process.argv.slice(3);

if (!scriptName) {
    console.error('Usage: node dev/scripts/executor.js <script-name> [args...]');
    process.exit(1);
}

if (!SCRIPT_NAME_RE.test(scriptName)) {
    console.error(`HALT: Invalid script name '${scriptName}'. Must match ${SCRIPT_NAME_RE}.`);
    process.exit(1);
}

if (scriptName === 'executor') {
    console.error('HALT: Cannot invoke executor recursively.');
    process.exit(1);
}

const scriptPath = path.join(__dirname, `${scriptName}.js`);

if (!fs.existsSync(scriptPath)) {
    console.error(`Dev script not found: dev/scripts/${scriptName}.js`);
    process.exit(1);
}

const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
});

child.on('exit', code => process.exit(code ?? 0));
