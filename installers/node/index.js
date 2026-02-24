#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');
const os = require('os');
const readline = require('readline');
const { version } = require('../../package.json');

function failConfig(message) {
    console.error(`❌ Installer config error: ${message}`);
    process.exit(1);
}

function requireNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        failConfig(`field '${fieldName}' must be a non-empty string`);
    }
    return value.trim();
}

function requirePositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        failConfig(`field '${fieldName}' must be a positive integer`);
    }
    return value;
}

function loadInstallerConfig() {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (!fs.existsSync(configPath)) {
        failConfig('installers/config.json was not found');
    }

    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        failConfig(`failed to read installers/config.json: ${err.message}`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        failConfig('root must be a JSON object');
    }

    const githubRepo = requireNonEmptyString(parsed.githubRepo, 'githubRepo');

    if (!parsed.download || typeof parsed.download !== 'object' || Array.isArray(parsed.download)) {
        failConfig("field 'download' must be an object");
    }
    const timeoutMs = requirePositiveInteger(parsed.download.timeoutMs, 'download.timeoutMs');

    if (!parsed.userAgent || typeof parsed.userAgent !== 'object' || Array.isArray(parsed.userAgent)) {
        failConfig("field 'userAgent' must be an object");
    }
    const nodeUserAgent = requireNonEmptyString(parsed.userAgent.node, 'userAgent.node');

    return {
        githubRepo,
        download: { timeoutMs },
        userAgent: { node: nodeUserAgent },
    };
}

const INSTALLER_CONFIG = loadInstallerConfig();
const GITHUB_REPO = INSTALLER_CONFIG.githubRepo;
const DOWNLOAD_TIMEOUT_MS = INSTALLER_CONFIG.download.timeoutMs;
const NODE_USER_AGENT = INSTALLER_CONFIG.userAgent.node;
if (!Number.isInteger(DOWNLOAD_TIMEOUT_MS) || DOWNLOAD_TIMEOUT_MS <= 0) {
    failConfig("field 'download.timeoutMs' must be a positive integer");
}

const cwd = process.cwd();

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const isDoctor = args.includes('--doctor') || args.includes('--check');
const isFallbackMain = args.includes('--fallback-main');
const autoAccept = args.includes('--yes') || args.includes('-y');

function parseCsvValues(raw) {
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function collectEnvValues(argv) {
    const parsed = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--env=')) {
            parsed.push(...parseCsvValues(argv[i].split('=', 2)[1] || ''));
        } else if (argv[i] === '--env' && i + 1 < argv.length) {
            parsed.push(...parseCsvValues(argv[i + 1]));
            i++;
        }
    }
    return [...new Set(parsed)];
}

const envValues = collectEnvValues(args);

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
    }));
}

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
            if (destName.startsWith(adapter.removePrefix)) {
                destName = destName.slice(adapter.removePrefix.length);
            }
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

        if (result.error) {
            console.error('❌ Failed to run doctor prerequisite check:', result.error.message);
            process.exit(1);
        }
        if (result.status !== 0) {
            console.error(`❌ Doctor prerequisite check failed with code ${result.status}.`);
            if (result.stderr) {
                console.error(result.stderr.trim());
            }
            process.exit(1);
        }

        let jsonStr = result.stdout.trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }
        if (!jsonStr) {
            console.error('❌ Doctor output did not contain JSON.');
            process.exit(1);
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

        checkItem('INDEX.md', arts['INDEX.md'], 'Run /magic.spec');
        checkItem('RULES.md', arts['RULES.md'], 'Created at init');

        if (arts['PLAN.md']) {
            checkItem('PLAN.md', arts['PLAN.md'], 'Run /magic.task');
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
        process.exit(1);
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
            const req = https.get(requestUrl, { headers: { 'User-Agent': NODE_USER_AGENT } }, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Follow redirect
                    if (response.headers.location) {
                        return makeRequest(response.headers.location);
                    }
                    reject(new Error('Redirect response did not include a location header.'));
                    return;
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
                        // Check if tar exists
                        const tarCheck = spawnSync('tar', ['--version'], { encoding: 'utf-8' });
                        if (tarCheck.error || tarCheck.status !== 0) {
                            let msg = "The 'tar' command was not found.";
                            if (process.platform === 'win32') {
                                msg += "\n   On Windows, 'tar' is included in Windows 10 (build 17063) and later.";
                                msg += "\n   Please upgrade Windows or install a tar-compatible utility (e.g., via Git for Windows or WSL).";
                            } else {
                                msg += "\n   Please install 'tar' using your package manager.";
                            }
                            throw new Error(msg);
                        }

                        // Security: Check for path traversal in archive
                        const listResult = spawnSync('tar', ['-tf', archivePath], { encoding: 'utf-8' });
                        if (listResult.status === 0) {
                            const files = listResult.stdout.split('\n').filter(Boolean);
                            for (const f of files) {
                                if (f.startsWith('/') || f.includes('..')) {
                                    throw new Error(`Security Alert: Suspicious path detected in archive: ${f}`);
                                }
                            }
                        }

                        const result = spawnSync('tar', ['-xzf', archivePath, '-C', tempDir], { encoding: 'utf-8' });

                        if (result.error || result.status !== 0) {
                            throw new Error('Tar extraction failed. ' + (result.stderr || ''));
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
            });

            req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
                req.destroy(new Error(`Request timeout after ${Math.round(DOWNLOAD_TIMEOUT_MS / 1000)} seconds`));
            });

            req.on('error', (err) => {
                if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
                reject(err);
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
    let sourceRoot = null;

    try {
        sourceRoot = await downloadPayload(versionToFetch);


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
                let shouldRun = autoAccept;
                if (!shouldRun) {
                    console.log(`\n⚠️  The initialization script will be executed: ${initScript}`);
                    console.log('   This script may modify your system environment.');
                    const answer = await askQuestion('   Do you want to continue? (y/N): ');
                    shouldRun = answer.toLowerCase() === 'y';
                }

                if (shouldRun) {
                    if (isWindows) {
                        const initResult = spawnSync('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', initScript], { stdio: 'inherit' });
                        if (initResult.error || initResult.status !== 0) {
                            throw new Error(`Initialization script failed with code ${initResult.status ?? 'unknown'}.`);
                        }
                    } else {
                        fs.chmodSync(initScript, '755');
                        const initResult = spawnSync('bash', [initScript], { stdio: 'inherit' });
                        if (initResult.error || initResult.status !== 0) {
                            throw new Error(`Initialization script failed with code ${initResult.status ?? 'unknown'}.`);
                        }
                    }
                } else {
                    console.log('⚠️  Initialization script skipped by user.');
                }
            }
            console.log('✅ magic-spec initialized successfully!');
        } else {
            console.log('✅ magic-spec updated successfully!');
        }

    } catch (err) {
        console.error('❌ magic-spec initialization failed:', err.message);
        process.exit(1);
    } finally {
        if (sourceRoot) {
            const tempDir = path.dirname(sourceRoot);
            if (fs.existsSync(tempDir) && tempDir.includes('magic-spec-')) {
                try {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }
}

main();
