#!/usr/bin/env node

/**
 * Magic SDD CLI Installer (Node.js)
 * Version: 0.5.0
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Determine if running from published package or repository source
const isDist = fs.existsSync(path.join(__dirname, 'adapters'));
const pkg = isDist
    ? require('./package.json')
    : require('../../package.json');

const cwd = process.cwd();
const sourceRoot = __dirname;
const args = process.argv.slice(2);

/**
 * Main entry point
 */
async function main() {
    // 0. Handle commands that exit early
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    if (args.includes('--version') || args.includes('-v')) {
        console.log(pkg.version);
        process.exit(0);
    }

    if (args.includes('--list-envs')) {
        console.log('Supported environments: cursor, windsurf, github, kilocode');
        process.exit(0);
    }

    if (args.includes('info')) {
        const projectVersionFile = path.join(cwd, '.magic/.version');
        const projectVersion = fs.existsSync(projectVersionFile)
            ? fs.readFileSync(projectVersionFile, 'utf8').trim()
            : 'Unknown';
        console.log(`magic-spec CLI v${pkg.version}`);
        console.log(`Project Engine v${projectVersion}`);
        console.log(`Install Root: ${sourceRoot}`);
        console.log(`Current Path: ${cwd}`);
        process.exit(0);
    }

    const isUpdate = args.includes('--update');
    const isCheck = args.includes('--check');

    if (isCheck) {
        console.log(`magic-spec v${pkg.version} (latest)`);
        process.exit(0);
    }

    if (args.includes('--eject')) {
        eject();
        process.exit(0);
    }

    // 1. Perform Installation / Update
    console.log(isUpdate ? '🪄  Updating magic-spec...' : '🪄  Initializing magic-spec...');

    try {
        // --- Engine Sync (Layer 1) ---
        const folders = ['.magic', '.agent'];
        folders.forEach(dir => {
            const src = isDist ? path.resolve(sourceRoot, dir) : path.resolve(sourceRoot, '../..', dir);
            const dest = path.join(cwd, dir);
            if (fs.existsSync(src)) {
                syncDir(src, dest);
            }
        });

        // --- Version Tracking (T-2B01) ---
        fs.writeFileSync(path.join(cwd, '.magic/.version'), pkg.version);

        // --- Adapters Sync ---
        const envs = getEnvArgs();
        envs.forEach(env => {
            const src = isDist ? path.resolve(sourceRoot, 'adapters', env) : path.resolve(sourceRoot, '../../adapters', env);
            if (fs.existsSync(src)) {
                installAdapter(env, src);
            } else {
                console.warn(`⚠️  Adapter not found: ${env}`);
            }
        });

        // --- Init Script ---
        if (!isUpdate) {
            runInitScript();
        }

        console.log(isUpdate ? '✅ magic-spec updated successfully!' : '✅ magic-spec initialized successfully!');
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        process.exit(1);
    }
}

/**
 * Helpers
 */

function syncDir(src, dest) {
    if (!fs.existsSync(src)) return;

    // --- Backup Logic (T-2C01) ---
    if (fs.existsSync(dest)) {
        const folderName = path.basename(dest);
        const timestamp = Date.now();
        const backupBase = path.join(cwd, '.magic/archives');
        const backupDir = path.join(backupBase, `backup-${timestamp}`);

        // Only backup if not already in archives
        if (!dest.includes('.magic/archives')) {
            if (!fs.existsSync(backupBase)) fs.mkdirSync(backupBase, { recursive: true });

            // Move to temp first to avoid self-nesting if dest is .magic
            const tempBackup = path.join(os.tmpdir(), `magic-backup-${timestamp}-${folderName}`);
            try {
                fs.renameSync(dest, tempBackup);
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                fs.renameSync(tempBackup, path.join(backupDir, folderName));
            } catch (e) {
                // Fallback to copy + delete if rename fails
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                fs.cpSync(dest, path.join(backupDir, folderName), { recursive: true });
                fs.rmSync(dest, { recursive: true, force: true });
            }
        }
    }

    fs.cpSync(src, dest, { recursive: true, force: true });
}

function getEnvArgs() {
    const envs = [];

    // 1. Try to load from .magicrc (T-2C02)
    const rcPath = path.join(cwd, '.magicrc.json');
    if (fs.existsSync(rcPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
            if (config.envs && Array.isArray(config.envs)) {
                envs.push(...config.envs);
            }
        } catch (e) { }
    }

    // 2. Override with CLI args
    const index = args.indexOf('--env');
    if (index !== -1 && index + 1 < args.length) {
        const cliEnvs = args[index + 1].split(',').map(e => e.trim()).filter(Boolean);
        envs.push(...cliEnvs);

        // Persist to .magicrc
        const uniqueEnvs = [...new Set(envs)];
        fs.writeFileSync(rcPath, JSON.stringify({ envs: uniqueEnvs, lastUpdated: new Date().toISOString() }, null, 2));
    }

    return [...new Set(envs)];
}

function installAdapter(env, srcDir) {
    const map = {
        'cursor': '.cursor/rules',
        'windsurf': '.windsurf/rules',
        'github': '.github',
        'kilocode': '.kilocode'
    };
    const targetDir = path.join(cwd, map[env] || env);

    copyRecursiveWithTemplating(srcDir, targetDir);
    console.log(`✅ Adapter installed: ${env} → ${map[env] || env}`);
}

function copyRecursiveWithTemplating(src, dest) {
    if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(child => {
            if (child === '.gitkeep') return;
            copyRecursiveWithTemplating(path.join(src, child), path.join(dest, child));
        });
    } else {
        let content = fs.readFileSync(src, 'utf8');
        const isMd = src.endsWith('.md') || src.endsWith('.mdc');
        const isToml = src.endsWith('.toml');

        if (isMd) content = content.replace(/{ARGUMENTS}/g, '$ARGUMENTS');
        if (isToml) content = content.replace(/{ARGUMENTS}/g, '{{args}}');

        fs.writeFileSync(dest, content);
    }
}

function runInitScript() {
    const isWindows = process.platform === 'win32';
    const script = isWindows
        ? path.join(cwd, '.magic/scripts/init.ps1')
        : path.join(cwd, '.magic/scripts/init.sh');

    if (!fs.existsSync(script)) return;

    console.log('🚀 Running initialization script...');
    const spawnOptions = { stdio: 'inherit', shell: isWindows };

    if (isWindows) {
        spawnSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', script], spawnOptions);
    } else {
        fs.chmodSync(script, '755');
        spawnSync('bash', [script], spawnOptions);
    }
}

function printHelp() {
    console.log(`
Usage: npx magic-spec [options] [command]

Options:
  --env <names>     Install environment adapters (e.g., --env cursor,windsurf)
  --update          Update .magic/ and .agent/ only
  --check           Check current version
  --list-envs       List supported environments
  --eject           Remove library from project
  --version, -v     Show version
  --help, -h        Show this help

Commands:
  info              Show installation status
    `);
}

function eject() {
    const folders = ['.magic', '.agent', '.cursor/rules', '.windsurf/rules', '.kilocode'];
    console.log('📤 Ejecting magic-spec (removing managed files)...');
    folders.forEach(dir => {
        const p = path.join(cwd, dir);
        if (fs.existsSync(p)) {
            console.log(`   Removing ${dir}...`);
            fs.rmSync(p, { recursive: true, force: true });
        }
    });
    console.log('✅ Eject complete.');
}

main();
