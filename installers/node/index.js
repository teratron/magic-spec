#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');
const os = require('os');
const readline = require('readline');
const { version } = require('../../package.json');
const crypto = require('crypto');

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
    const packageName = requireNonEmptyString(parsed.packageName, 'packageName');
    const removePrefix = parsed.removePrefix || '';

    if (!parsed.download || typeof parsed.download !== 'object' || Array.isArray(parsed.download)) {
        failConfig("field 'download' must be an object");
    }
    const timeoutMs = requirePositiveInteger(parsed.download.timeoutMs, 'download.timeoutMs');
    const tempPrefix = requireNonEmptyString(parsed.download.tempPrefix, 'download.tempPrefix');

    if (!parsed.userAgent || typeof parsed.userAgent !== 'object' || Array.isArray(parsed.userAgent)) {
        failConfig("field 'userAgent' must be an object");
    }
    const nodeUserAgent = requireNonEmptyString(parsed.userAgent.node, 'userAgent.node');

    if (!parsed.eject || !Array.isArray(parsed.eject.targets)) {
        failConfig("field 'eject.targets' must be an array");
    }

    const engineDir = requireNonEmptyString(parsed.engineDir, 'engineDir');
    const agentDir = requireNonEmptyString(parsed.agentDir, 'agentDir');
    const workflowsDir = requireNonEmptyString(parsed.workflowsDir, 'workflowsDir');
    const defaultExt = requireNonEmptyString(parsed.defaultExt, 'defaultExt');

    return {
        githubRepo,
        packageName,
        removePrefix,
        engineDir,
        agentDir,
        workflowsDir,
        defaultExt,
        download: { timeoutMs, tempPrefix },
        userAgent: { node: nodeUserAgent },
        ejectTargets: parsed.eject.targets
    };
}

const INSTALLER_CONFIG = loadInstallerConfig();
const GITHUB_REPO = INSTALLER_CONFIG.githubRepo;
const PACKAGE_NAME = INSTALLER_CONFIG.packageName;
const ENGINE_DIR = INSTALLER_CONFIG.engineDir;
const AGENT_DIR = INSTALLER_CONFIG.agentDir;
const WORKFLOWS_DIR = INSTALLER_CONFIG.workflowsDir;
const DEFAULT_EXT = INSTALLER_CONFIG.defaultExt;
const DEFAULT_REMOVE_PREFIX = INSTALLER_CONFIG.removePrefix;
const DOWNLOAD_TIMEOUT_MS = INSTALLER_CONFIG.download.timeoutMs;
const NODE_USER_AGENT = INSTALLER_CONFIG.userAgent.node;

const cwd = process.cwd();

const args = process.argv.slice(2);
const isUpdate = args.includes('--update');
const isDoctor = args.includes('--doctor');
const isCheck = args.includes('--check');
const isInfo = args.includes('info');
const isListEnvs = args.includes('--list-envs');
const isEject = args.includes('--eject');
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
let selectedEnv = envValues.length > 0 ? envValues[0] : null;

function runListEnvs(adapters) {
    if (!adapters) {
        const adaptersPath = path.join(__dirname, '..', 'adapters.json');
        adapters = {};
        if (fs.existsSync(adaptersPath)) {
            try {
                adapters = JSON.parse(fs.readFileSync(adaptersPath, 'utf8'));
            } catch (e) { }
        }
    }
    console.log('Supported environments:');
    console.log(`  (default)    ${AGENT_DIR}/${WORKFLOWS_DIR}/magic.*${DEFAULT_EXT}  general agents, Gemini`);
    for (const [name, adapter] of Object.entries(adapters)) {
        const padding = ' '.repeat(Math.max(0, 12 - name.length));
        const dest = `${adapter.dest}/`.padEnd(28);
        console.log(`  ${name}${padding}${dest}${adapter.description || ''}`);
    }
    console.log('\nUsage: npx magic-spec@latest --env <name>');
}

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

function convertToToml(content, description) {
    // Escape quotes and backslashes for TOML triple-quoted strings
    const escapedContent = content
        .replace(/\\/g, '\\\\')
        .replace(/"""/g, '\\"\\"\\"');
    return `description = "${(description || '').replace(/\\/g, '\\\\')}"\n\nprompt = """\n${escapedContent}\n"""\n`;
}

function convertToMdc(content, description) {
    return `---\ndescription: ${description || ''}\nglobs: \n---\n${content}`;
}

function installAdapter(sourceRoot, env, adapters) {
    const adapter = adapters[env];
    if (!adapter) {
        console.warn(`⚠️  Unknown --env value: "${env}".`);
        console.warn(`   Valid values: ${Object.keys(adapters).join(', ')}`);
        console.warn(`   Falling back to default ${AGENT_DIR}/`);
        copyDir(path.join(sourceRoot, AGENT_DIR), path.join(cwd, AGENT_DIR));
        return;
    }

    const srcDir = path.join(sourceRoot, AGENT_DIR, WORKFLOWS_DIR);
    const destDir = path.join(cwd, adapter.dest);

    if (!fs.existsSync(srcDir)) {
        console.warn(`⚠️  Source ${AGENT_DIR}/${WORKFLOWS_DIR}/ not found.`);
        return;
    }

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith(DEFAULT_EXT));
    for (const file of files) {
        const srcFile = path.join(srcDir, file);
        let destName = file.replace(new RegExp(`${DEFAULT_EXT.replace('.', '\\.')}$`), adapter.ext);
        const removePrefix = adapter.hasOwnProperty('removePrefix') ? adapter.removePrefix : DEFAULT_REMOVE_PREFIX;
        if (removePrefix) {
            if (destName.startsWith(removePrefix)) {
                destName = destName.slice(removePrefix.length);
            }
        }
        const destFile = path.join(destDir, destName);

        if (adapter.format === 'toml' || adapter.ext === '.toml') {
            const content = fs.readFileSync(srcFile, 'utf8');
            const description = `Magic SDD Workflow: ${destName}`;
            fs.writeFileSync(destFile, convertToToml(content, description), 'utf8');
        } else if (adapter.format === 'mdc' || adapter.ext === '.mdc') {
            const content = fs.readFileSync(srcFile, 'utf8');
            const description = `Magic SDD Workflow: ${destName}`;
            fs.writeFileSync(destFile, convertToMdc(content, description), 'utf8');
        } else {
            fs.copyFileSync(srcFile, destFile);
        }
    }

    console.log(`✅ Adapter installed: ${env} → ${adapter.dest}/ (${adapter.ext})`);
}

function runDoctor() {
    const isWindows = process.platform === 'win32';
    const checkScript = isWindows
        ? path.join(cwd, ENGINE_DIR, 'scripts', 'check-prerequisites.ps1')
        : path.join(cwd, ENGINE_DIR, 'scripts', 'check-prerequisites.sh');

    if (!fs.existsSync(checkScript)) {
        console.error('❌ Error: SDD engine not initialized. Run magic-spec first.');
        process.exit(1);
    }

    console.log(`🔍 ${PACKAGE_NAME} Doctor:`);
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

function runInfo() {
    console.log('magic-spec installation status');
    console.log('────────────────────────────────');

    const versionFile = path.join(cwd, '.magic', '.version');
    let installedVersion = 'none';
    if (fs.existsSync(versionFile)) {
        installedVersion = fs.readFileSync(versionFile, 'utf8').trim();
    }
    console.log(`Installed version : ${installedVersion}  (.magic/.version)`);

    const magicrcFile = path.join(cwd, '.magicrc');
    let activeEnv = 'default (.agent/)';
    if (fs.existsSync(magicrcFile)) {
        try {
            const rc = JSON.parse(fs.readFileSync(magicrcFile, 'utf8'));
            if (rc.env) activeEnv = rc.env;
        } catch (e) { }
    }
    console.log(`Active env        : ${activeEnv}`);

    const enginePresent = fs.existsSync(path.join(cwd, ENGINE_DIR));
    console.log(`Engine            : ${ENGINE_DIR}/     ${enginePresent ? '✅ present' : '❌ missing'}`);

    const designPresent = fs.existsSync(path.join(cwd, '.design'));
    console.log(`Workspace         : .design/    ${designPresent ? '✅ present' : '❌ missing'}`);

    console.log('────────────────────────────────');
    console.log(`Run \`npx ${PACKAGE_NAME}@latest --update\` to refresh engine files.`);
    process.exit(0);
}

function runCheck() {
    const versionFile = path.join(cwd, ENGINE_DIR, '.version');
    if (!fs.existsSync(versionFile)) {
        console.log(`⚠️  Not installed via magic-spec (no ${ENGINE_DIR}/.version file)`);
        process.exit(0);
    }

    const installedVersion = fs.readFileSync(versionFile, 'utf8').trim();
    console.log(`Installed version: ${installedVersion}`);
    console.log(`Package version:   ${version}`);

    if (installedVersion === version) {
        console.log(`✅ magic-spec ${version} — up to date`);
    } else {
        console.log(`⚠️  Installed: ${installedVersion} | Package: ${version}`);
        console.log('   Run --update to upgrade');
    }
    process.exit(0);
}

function createBackup() {
    console.log('📦 Creating backup of existing engine files...');

    const magicDir = path.join(cwd, ENGINE_DIR);
    if (fs.existsSync(magicDir)) {
        copyDir(magicDir, path.join(cwd, `${ENGINE_DIR}.bak`));
    }

    if (fs.existsSync(path.join(cwd, AGENT_DIR))) {
        copyDir(path.join(cwd, AGENT_DIR), path.join(cwd, `${AGENT_DIR}.bak`));
    }

    // Update .gitignore
    const gitignoreFile = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignoreFile)) {
        let content = fs.readFileSync(gitignoreFile, 'utf8');
        let altered = false;
        if (!content.includes(`${ENGINE_DIR}.bak`)) {
            content += `\n${ENGINE_DIR}.bak/`;
            altered = true;
        }
        if (!content.includes(`${AGENT_DIR}.bak`)) {
            content += `\n${AGENT_DIR}.bak/`;
            altered = true;
        }
        if (altered) {
            fs.writeFileSync(gitignoreFile, content.trim() + '\n', 'utf8');
        }
    }
}

async function runEject() {
    console.log('\n⚠️  This will remove:');
    console.log(`   -  ${ENGINE_DIR}/`);
    console.log(`   -  ${AGENT_DIR}/  (or active env adapter dir)`);
    console.log(`   -  ${ENGINE_DIR}.bak/  (if exists)`);
    console.log('\n   Your .design/ workspace will NOT be affected.');

    let shouldRun = autoAccept;
    if (!shouldRun) {
        const answer = await askQuestion('\nConfirm? (y/N): ');
        shouldRun = answer.toLowerCase() === 'y';
    }

    if (shouldRun) {
        const targets = INSTALLER_CONFIG.ejectTargets;
        for (const target of targets) {
            const p = path.join(cwd, target);
            if (fs.existsSync(p)) {
                fs.rmSync(p, { recursive: true, force: true });
                console.log(`🗑️  Removed: ${target}/`);
            }
        }
        console.log(`✅ ${PACKAGE_NAME} ejected successfully.`);
    } else {
        console.log('❌ Eject cancelled.');
    }
}

function detectEnvironment(adapters) {
    for (const env in adapters) {
        const marker = adapters[env].marker;
        if (marker && fs.existsSync(path.join(cwd, marker))) return env;
    }
    return null;
}

function saveMagicRc(config) {
    const magicrcFile = path.join(cwd, '.magicrc');
    fs.writeFileSync(magicrcFile, JSON.stringify(config, null, 2), 'utf8');
}

function getFileChecksum(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function getDirectoryChecksums(dir, baseDir = dir) {
    const results = {};
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (item.name === '.checksums') continue;
            Object.assign(results, getDirectoryChecksums(fullPath, baseDir));
        } else {
            if (item.name === '.checksums') continue;
            const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            results[relPath] = getFileChecksum(fullPath);
        }
    }
    return results;
}

async function handleConflicts(cwd) {
    const checksumsFile = path.join(cwd, '.magic', '.checksums');
    if (!fs.existsSync(checksumsFile)) return;

    let storedChecksums = {};
    try {
        storedChecksums = JSON.parse(fs.readFileSync(checksumsFile, 'utf8'));
    } catch (e) {
        return;
    }

    const conflicts = [];
    for (const [relPath, storedHash] of Object.entries(storedChecksums)) {
        const localPath = path.join(cwd, '.magic', relPath);
        if (fs.existsSync(localPath)) {
            const currentHash = getFileChecksum(localPath);
            if (currentHash !== storedHash) {
                conflicts.push(relPath);
            }
        }
    }

    if (conflicts.length === 0) return;

    console.log(`\n⚠️  Local changes detected in ${conflicts.length} file(s) in .magic/:`);
    conflicts.slice(0, 5).forEach(f => console.log(`   - ${f}`));
    if (conflicts.length > 5) console.log(`   ... and ${conflicts.length - 5} more.`);

    console.log('\nOptions:');
    console.log('  [o] Overwrite (backup will be created)');
    console.log('  [s] Skip update for conflicting files');
    console.log('  [a] Abort update');

    let choice = 'o';
    if (!autoAccept) {
        const answer = await askQuestion('\nChoice (o/s/a): ');
        choice = (answer.toLowerCase() || 'o')[0];
    }

    if (choice === 'a') {
        console.log('❌ Update aborted.');
        process.exit(1);
    }

    return { choice, conflicts };
}

async function downloadPayload(targetVersion) {
    const url = targetVersion === 'main'
        ? `https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz`
        : `https://github.com/${GITHUB_REPO}/archive/refs/tags/v${targetVersion}.tar.gz`;

    console.log(`📥 Downloading ${PACKAGE_NAME} payload (${targetVersion}) from GitHub...`);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${INSTALLER_CONFIG.download.tempPrefix}`));
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
                        if (listResult.status !== 0) {
                            throw new Error(`Failed to verify archive integrity: ${listResult.stderr || 'unknown error'}`);
                        }
                        const files = listResult.stdout.split('\n').filter(Boolean);
                        for (const f of files) {
                            if (f.startsWith('/') || f.includes('..')) {
                                throw new Error(`Security Alert: Suspicious path detected in archive: ${f}`);
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

    if (isCheck) {
        runCheck();
        return;
    }

    if (isInfo) {
        runInfo();
        return;
    }

    if (isEject) {
        await runEject();
        process.exit(0);
        return;
    }

    if (isListEnvs) {
        runListEnvs();
        process.exit(0);
        return;
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log("Usage: npx magic-spec [command] [options]");
        console.log("\nCommands:");
        console.log("  info                 Show installation status");
        console.log("  --check              Check for updates");
        console.log("  --doctor             Run prerequisite check");
        console.log("  --list-envs          List supported environments");
        console.log("  --eject              Remove magic-spec from project");
        console.log("\nOptions:");
        console.log("  --env <adapter>      Specify environment adapter");
        console.log("  --update             Update engine files only");
        console.log("  --fallback-main      Pull payload from main branch");
        console.log("  --yes, -y            Auto-accept prompts");
        process.exit(0);
    }

    console.log(isUpdate ? '🪄 Updating magic-spec (.magic only)...' : '🪄 Initializing magic-spec...');

    if (isUpdate) {
        createBackup();
    }

    const versionToFetch = isFallbackMain ? 'main' : version;
    let sourceRoot = null;

    // Load .magicrc
    let magicrc = {};
    const magicrcFile = path.join(cwd, '.magicrc');
    if (fs.existsSync(magicrcFile)) {
        try {
            magicrc = JSON.parse(fs.readFileSync(magicrcFile, 'utf8'));
        } catch (e) { }
    }

    try {
        sourceRoot = await downloadPayload(versionToFetch);

        let ADAPTERS = {};
        try {
            ADAPTERS = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'installers', 'adapters.json'), 'utf8'));
        } catch (e) { }

        if (isListEnvs) {
            runListEnvs(ADAPTERS);
            process.exit(0);
            return;
        }

        // Determine environment
        let selectedEnvResolved = null;
        if (envValues.length > 0) {
            selectedEnvResolved = envValues[0];
        } else if (magicrc.env && magicrc.env !== 'default') {
            selectedEnvResolved = magicrc.env;
        }

        if (!selectedEnvResolved && !isUpdate) {
            const detected = detectEnvironment(ADAPTERS);
            if (detected && ADAPTERS[detected] && (!magicrc.env || magicrc.env === 'default')) {
                const adapterName = ADAPTERS[detected].description || detected;
                console.log(`\n💡 Detected ${adapterName} (${detected}/ directory found).`);
                let shouldAdopt = autoAccept;
                if (!shouldAdopt) {
                    const answer = await askQuestion(`   Install ${detected} adapter instead of default? (y/N): `);
                    shouldAdopt = answer.toLowerCase() === 'y';
                }
                if (shouldAdopt) {
                    selectedEnvResolved = detected;
                }
            }
        }

        let conflictsToSkip = [];
        if (isUpdate) {
            const conflictResult = await handleConflicts(cwd);
            // backup is already created by createBackup()

            if (conflictResult && conflictResult.choice === 's') {
                conflictsToSkip = conflictResult.conflicts;
                console.log(`⚠️  Skipping ${conflictsToSkip.length} conflicting file(s).`);
            }
        }

        // 1. Copy .magic
        if (conflictsToSkip.length > 0) {
            const srcMagic = path.join(sourceRoot, '.magic');
            const destMagic = path.join(cwd, '.magic');
            const items = fs.readdirSync(srcMagic, { withFileTypes: true });
            for (const item of items) {
                if (conflictsToSkip.includes(item.name)) continue;
                if (item.name === '.checksums') continue;
                if (item.isDirectory()) {
                    copyDir(path.join(srcMagic, item.name), path.join(destMagic, item.name));
                } else {
                    fs.copyFileSync(path.join(srcMagic, item.name), path.join(destMagic, item.name));
                }
            }
        } else {
            copyDir(path.join(sourceRoot, '.magic'), path.join(cwd, '.magic'));
        }

        // 2. Adapters
        if (!isUpdate) {
            if (envValues.length > 0) {
                for (const env of envValues) {
                    installAdapter(sourceRoot, env, ADAPTERS);
                }
            } else if (selectedEnvResolved) {
                installAdapter(sourceRoot, selectedEnvResolved, ADAPTERS);
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
                let shouldRun = true;
                if (!autoAccept) {
                    console.log(`\n⚠️  The initialization script will be executed: ${initScript}`);
                    console.log('   This script may modify your system environment.');
                    const answer = await askQuestion('   Do you want to continue? (y/N): ');
                    shouldRun = answer.toLowerCase() === 'y';
                } else {
                    console.log(`\nℹ️  Auto-accepting initialization script: ${initScript}`);
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
        }
        if (!isUpdate) {
            console.log(`✅ ${PACKAGE_NAME} initialized successfully!`);
        } else {
            console.log(`✅ ${PACKAGE_NAME} updated successfully!`);
        }

        // 4. Write version file (.magic/.version) - [T-2B01]
        try {
            const versionFile = path.join(cwd, '.magic', '.version');
            fs.writeFileSync(versionFile, version, 'utf8');
        } catch (vErr) {
            console.warn(`⚠️  Failed to write .magic/.version: ${vErr.message}`);
        }

        // 5. Update .magicrc - [T-2C02]
        try {
            const newConfig = {
                env: selectedEnvResolved || magicrc.env || 'default',
                version: version
            };
            saveMagicRc(newConfig);
        } catch (rcErr) {
            console.warn(`⚠️  Failed to update .magicrc: ${rcErr.message}`);
        }

        // 6. Save checksums - [T-2C03]
        try {
            const currentChecksums = getDirectoryChecksums(path.join(cwd, '.magic'));
            fs.writeFileSync(path.join(cwd, '.magic', '.checksums'), JSON.stringify(currentChecksums, null, 2), 'utf8');
        } catch (cErr) {
            console.warn(`⚠️  Failed to save checksums: ${cErr.message}`);
        }

    } catch (err) {
        console.error('❌ magic-spec initialization failed:', err.message);
        process.exit(1);
    } finally {
        if (sourceRoot) {
            const tempDir = path.dirname(sourceRoot);
            if (fs.existsSync(tempDir) && path.basename(tempDir).startsWith(INSTALLER_CONFIG.download.tempPrefix)) {
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
