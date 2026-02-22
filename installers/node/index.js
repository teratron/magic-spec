#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgRoot = __dirname;
const cwd = process.cwd();

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const envFlag = args.find(a => a.startsWith('--env'));
const envValues = envFlag
    ? envFlag.includes('=')
        ? envFlag.split('=')[1].split(',')
        : (args[args.indexOf(envFlag) + 1] || '').split(',').filter(Boolean)
    : [];

const ADAPTERS = {
    cursor: { dest: '.cursor/rules', ext: '.mdc' },
    github: { dest: '.github', ext: '.md' },
    kilocode: { dest: '.kilocode', ext: '.md' },
    windsurf: { dest: '.windsurf/rules', ext: '.md' },
};

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`⚠️  Source not found: ${src}`);
        return;
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
}

// Copy .agent/workflows/ to target dir, renaming files if needed
function installAdapter(env) {
    const adapter = ADAPTERS[env];
    if (!adapter) {
        console.warn(`⚠️  Unknown --env value: "${env}".`);
        console.warn(`   Valid values: ${Object.keys(ADAPTERS).join(', ')}`);
        console.warn(`   Falling back to default .agent/`);
        copyDir(path.join(pkgRoot, '.agent'), path.join(cwd, '.agent'));
        return;
    }

    const srcDir = path.join(pkgRoot, '.agent', 'workflows');
    const destDir = path.join(cwd, adapter.dest);

    if (!fs.existsSync(srcDir)) {
        console.warn(`⚠️  Source .agent/workflows/ not found.`);
        return;
    }

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const srcFile = path.join(srcDir, file);
        // Replace .md extension with target ext
        let destName = file.replace(/\.md$/, adapter.ext);
        if (env === 'cursor') {
            destName = destName.replace(/^magic\./, '');
        }
        const destFile = path.join(destDir, destName);
        fs.copyFileSync(srcFile, destFile);
    }

    console.log(`✅ Adapter installed: ${env} → ${adapter.dest}/ (${adapter.ext})`);
}

console.log(isUpdate ? '🪄 Updating magic-spec (.magic only)...' : '🪄 Initializing magic-spec...');

// 1. Copy .magic (SDD engine — always)
copyDir(path.join(pkgRoot, '.magic'), path.join(cwd, '.magic'));

// 2. Adapters (skip on --update)
if (!isUpdate) {
    if (envValues.length > 0) {
        for (const env of envValues) {
            installAdapter(env);
        }
    } else {
        copyDir(path.join(pkgRoot, '.agent'), path.join(cwd, '.agent'));
    }
}

// 3. Init script (skip on --update)
if (!isUpdate) {
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
} else {
    console.log('✅ magic-spec updated successfully!');
}
