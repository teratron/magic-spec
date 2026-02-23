#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const pkgRoot = __dirname;
const cwd = process.cwd();

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const isDoctor = args.includes('--doctor') || args.includes('--check');
const envFlag = args.find(a => a.startsWith('--env'));
const envValues = envFlag
    ? envFlag.includes('=')
        ? envFlag.split('=')[1].split(',')
        : (args[args.indexOf(envFlag) + 1] || '').split(',').filter(Boolean)
    : [];

let ADAPTERS = {};
try { ADAPTERS = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'adapters.json'), 'utf8')); } catch (e) { }

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
        if (adapter.removePrefix) {
            destName = destName.replace(adapter.removePrefix, '');
        }
        const destFile = path.join(destDir, destName);
        fs.copyFileSync(srcFile, destFile);
    }

    console.log(`✅ Adapter installed: ${env} → ${adapter.dest}/ (${adapter.ext})`);
}

if (isDoctor) {
    const isWindows = process.platform === 'win32';
    const checkScript = isWindows
        ? path.join(cwd, '.magic', 'scripts', 'check-prerequisites.ps1')
        : path.join(cwd, '.magic', 'scripts', 'check-prerequisites.sh');

    if (!fs.existsSync(checkScript)) {
        console.error('❌ Error: SDD engine not initialized. Run magic-spec first.');
        process.exit(1);
    }

    console.log('🔍 Magic-spec Doctor:');
    try {
        let result;
        if (isWindows) {
            result = spawnSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', checkScript, '-json'], { encoding: 'utf-8' });
        } else {
            result = spawnSync('bash', [checkScript, '--json'], { encoding: 'utf-8' });
        }

        let jsonStr = result.stdout.trim();
        // Clean out any rogue newlines before parsing
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }

        const data = JSON.parse(jsonStr);

        // Print results for base artifacts
        const arts = data.artifacts || {};
        const checkItem = (name, item, requiredHint) => {
            if (item && item.exists) {
                console.log(`✅ ${item.path} is present`);
            } else {
                const hint = requiredHint ? ` (Hint: ${requiredHint})` : '';
                console.log(`❌ .design/${name} is missing${hint}`);
            }
        };

        checkItem('INDEX.md', arts['INDEX.md'], 'Run /magic.specification');
        checkItem('RULES.md', arts['RULES.md'], 'Created at init');

        if (arts['PLAN.md']) {
            checkItem('PLAN.md', arts['PLAN.md'], 'Run /magic.plan');
        }
        if (arts['TASKS.md']) {
            checkItem('TASKS.md', arts['TASKS.md'], 'Run /magic.task');
        }

        if (data.warnings && data.warnings.length > 0) {
            data.warnings.forEach(warn => {
                console.log(`⚠️  ${warn}`);
            });
        }

        if (arts.specs) {
            const { stable } = arts.specs;
            if (stable > 0) console.log(`✅ ${stable} specifications are Stable`);
        }

    } catch (err) {
        console.error('❌ Failed to parse doctor output', err.message);
    }
    process.exit(0);
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
