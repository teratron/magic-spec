#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Package root: installers/node/ — .magic, .agent, adapters are synced here before publish
const pkgRoot = path.join(__dirname, '..');
const cwd = process.cwd();

// Parse arguments
const args = process.argv.slice(2);
const envFlag = args.find(a => a.startsWith('--env'));
const envValues = envFlag
    ? envFlag.includes('=')
        ? envFlag.split('=')[1].split(',')
        : (args[args.indexOf(envFlag) + 1] || '').split(',').filter(Boolean)
    : [];

const ADAPTERS = {
    cursor: '.cursor/rules',
    github: '.github',
    kilocode: '.kilocode',
    windsurf: '.windsurf/rules',
};

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`⚠️  Source not found: ${src}`);
        return;
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
}

console.log('🪄 Initializing magic-spec...');

// 1. Copy .magic (SDD engine)
copyDir(path.join(pkgRoot, '.magic'), path.join(cwd, '.magic'));

// 2. Copy default agent adapter
copyDir(path.join(pkgRoot, '.agent'), path.join(cwd, '.agent'));

// 3. Copy optional env adapters
for (const env of envValues) {
    const adapterSrc = path.join(pkgRoot, 'adapters', env);
    const adapterDest = path.join(cwd, ADAPTERS[env] || `.${env}`);
    if (!ADAPTERS[env]) {
        console.warn(`⚠️  Unknown --env value: "${env}"`);
        console.warn(`   Valid values: ${Object.keys(ADAPTERS).join(', ')}`);
        console.warn(`   To request a new adapter: https://github.com/teratron/magic-spec/issues`);
        continue;
    }
    if (!fs.existsSync(adapterSrc)) {
        console.warn(`⚠️  Adapter "${env}" not yet implemented. Copy .agent/ manually to ${ADAPTERS[env]}/`);
        continue;
    }
    copyDir(adapterSrc, adapterDest);
    console.log(`✅ Adapter installed: ${env} → ${ADAPTERS[env]}/`);
}

// 4. Run init script
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
