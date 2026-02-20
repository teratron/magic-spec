#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgRoot = path.join(__dirname, '..');
// In npm package, core is at ../core relative to bin/magic.js
const corePath = path.join(pkgRoot, 'core');

const cwd = process.cwd();

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('🪄 Initializing magic-spec...');

// Copy .magic and .agent
copyRecursiveSync(path.join(corePath, '.magic'), path.join(cwd, '.magic'));
copyRecursiveSync(path.join(corePath, '.agent'), path.join(cwd, '.agent'));

// Run init script
const isWindows = process.platform === 'win32';
const initScript = isWindows 
    ? path.join(cwd, '.magic', 'scripts', 'init.ps1')
    : path.join(cwd, '.magic', 'scripts', 'init.sh');

if (fs.existsSync(initScript)) {
    if (isWindows) {
        spawnSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', initScript], { stdio: 'inherit' });
    } else {
        fs.chmodSync(initScript, '755');
        spawnSync('bash', [initScript], { stdio: 'inherit' });
    }
}

console.log('✅ magic-spec initialized successfully!');
