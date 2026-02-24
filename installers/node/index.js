#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');
const os = require('os');
const { version } = require('./package.json');

const GITHUB_REPO = 'teratron/magic-spec';
const cwd = process.cwd();

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const isDoctor = args.includes('--doctor') || args.includes('--check');
const isFallbackMain = args.includes('--fallback-main');

const envFlag = args.find(a => a.startsWith('--env'));
const envValues = envFlag
    ? envFlag.includes('=')
        ? envFlag.split('=')[1].split(',')
        : (args[args.indexOf(envFlag) + 1] || '').split(',').filter(Boolean)
    : [];

function copyDir(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`⚠️  Source not found: ${src}`);
        return;
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
}

function installAdapter(sourceRoot, env, adapters) {
    const adapter = adapters[env];
    if (!adapter) {
        console.warn(`⚠️  Unknown --env value: "${env}".`);
        console.warn(`   Valid values: ${Object.keys(adapters).join(', ')}`);
        console.warn(`   Falling back to default .agent/`);
        copyDir(path.join(sourceRoot, '.agent'), path.join(cwd, '.agent'));
        return;
    }

    const srcDir = path.join(sourceRoot, '.agent', 'workflows');
    const destDir = path.join(cwd, adapter.dest);

    if (!fs.existsSync(srcDir)) {
        console.warn(`⚠️  Source .agent/workflows/ not found.`);
        return;
    }

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const srcFile = path.join(srcDir, file);
        let destName = file.replace(/\.md$/, adapter.ext);
        if (adapter.removePrefix) {
            destName = destName.replace(adapter.removePrefix, '');
        }
        const destFile = path.join(destDir, destName);
        fs.copyFileSync(srcFile, destFile);
    }

    console.log(`✅ Adapter installed: ${env} → ${adapter.dest}/ (${adapter.ext})`);
}

function runDoctor() {
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
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }

        const data = JSON.parse(jsonStr);
        const arts = data.artifacts || {};
        const checkItem = (name, item, requiredHint) => {
            if (item && item.exists) {
                console.log(`✅ ${item.path || name} is present`);
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

async function downloadPayload(targetVersion) {
    const url = targetVersion === 'main'
        ? `https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz`
        : `https://github.com/${GITHUB_REPO}/archive/refs/tags/v${targetVersion}.tar.gz`;

    console.log(`📥 Downloading magic-spec payload (${targetVersion}) from GitHub...`);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-spec-'));
    const archivePath = path.join(tempDir, 'payload.tar.gz');

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(archivePath);

        const makeRequest = (requestUrl) => {
            https.get(requestUrl, { headers: { 'User-Agent': 'magic-spec-node' } }, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Follow redirect
                    return makeRequest(response.headers.location);
                }

                if (response.statusCode === 404) {
                    console.error(`❌ Error: Release ${targetVersion} not found on GitHub.`);
                    console.error('   (Use --fallback-main to pull from the main branch instead)');
                    reject(new Error('Payload not found'));
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed with status code: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log('📦 Extracting payload...');

                    try {
                        // Using spawnSync for tar extraction. Requires 'tar' available on system.
                        // For a pure JS solution without dependencies, you would use a package like 'tar'
                        const isWindows = process.platform === 'win32';

                        let result;
                        if (isWindows) {
                            // Use PowerShell to extract tar on Windows 10+
                            result = spawnSync('tar', ['-xzf', archivePath, '-C', tempDir]);
                        } else {
                            // Standard Linux/macOS tar
                            result = spawnSync('tar', ['-xzf', archivePath, '-C', tempDir]);
                        }

                        if (result.error || result.status !== 0) {
                            throw new Error('Tar extraction failed. ' + (result.stderr ? result.stderr.toString() : ''));
                        }

                        const items = fs.readdirSync(tempDir);
                        const extractedFolder = items.find(item => {
                            const p = path.join(tempDir, item);
                            return item !== 'payload.tar.gz' && fs.statSync(p).isDirectory();
                        });

                        if (extractedFolder) {
                            resolve(path.join(tempDir, extractedFolder));
                        } else {
                            resolve(tempDir);
                        }

                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', (err) => {
                fs.unlink(archivePath, () => reject(err));
            });
        };

        makeRequest(url);
    });
}

async function main() {
    if (isDoctor) {
        runDoctor();
        return;
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log("Usage: npx magic-spec [--env <adapter>] [--update] [--doctor | --check] [--fallback-main]");
        process.exit(0);
    }

    console.log(isUpdate ? '🪄 Updating magic-spec (.magic only)...' : '🪄 Initializing magic-spec...');

    const versionToFetch = isFallbackMain ? 'main' : version;

    try {
        const sourceRoot = await downloadPayload(versionToFetch);

        let ADAPTERS = {};
        try {
            ADAPTERS = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'installers', 'adapters.json'), 'utf8'));
        } catch (e) { }

        // 1. Copy .magic
        copyDir(path.join(sourceRoot, '.magic'), path.join(cwd, '.magic'));

        // 2. Adapters
        if (!isUpdate) {
            if (envValues.length > 0) {
                for (const env of envValues) {
                    installAdapter(sourceRoot, env, ADAPTERS);
                }
            } else {
                copyDir(path.join(sourceRoot, '.agent'), path.join(cwd, '.agent'));
            }
        }

        // 3. Init script
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

    } catch (err) {
        console.error('❌ magic-spec initialization failed:', err.message);
        process.exit(1);
    }
}

main();
