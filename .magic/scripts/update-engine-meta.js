const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { hashFileSafe, getAllFiles } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE META UPDATER (C14 Compliance)
// ═══════════════════════════════════════════════════════════════════════════

const magicDir = path.join(__dirname, '..');
const versionPath = path.join(magicDir, '.version');
const checksumsPath = path.join(magicDir, '.checksums');
const historyDir = path.join(magicDir, 'history');

// Arguments parsing
const args = process.argv.slice(2);
let manualMessage = null;
const manualWorkflows = new Set();

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workflow' && args[i + 1]) {
        args[i + 1].split(',').forEach(wf => manualWorkflows.add(wf));
        i++;
    } else if ((args[i] === '--message' || args[i] === '-m') && args[i + 1]) {
        manualMessage = args[i + 1];
        i++;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

/**
 * Updates the engine metadata: checksums and version.
 * Triggered after any modification to the engine core (.magic, workflows).
 */
function updateEngineMeta() {
    console.log('🔍 Checking engine integrity (C14)...');

    if (!fs.existsSync(checksumsPath)) {
        console.log('⚠️ Checksums missing. Initializing...');
        runGenerateChecksums();
        return;
    }

    const oldChecksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
    const allFiles = getAllFiles(magicDir);
    const changedWorkflows = new Set(manualWorkflows);
    let engineLogicChanged = false;

    allFiles.forEach(fullPath => {
        const rel = path.relative(magicDir, fullPath).replace(/\\/g, '/');
        if (rel === '.checksums' || rel.startsWith('history/') || rel === '.version') return;

        const currentHash = hashFileSafe(fullPath);
        if (oldChecksums[rel] !== currentHash) {
            console.log(`✨ Detected change in: ${rel}`);
            
            const ext = path.extname(rel);
            const base = path.basename(rel, ext);
            
            // If it's a script, it's core engine logic
            if (rel.startsWith('scripts/')) {
                engineLogicChanged = true;
            } else {
                changedWorkflows.add(base);
            }
        }
    });

    if (engineLogicChanged || changedWorkflows.size > 0) {
        const newVersion = bumpVersion();
        updateHistory(changedWorkflows, newVersion, manualMessage);
        runGenerateChecksums();
        console.log('✅ Engine metadata and version updated.');
    } else {
        console.log('ℹ️ No changes detected in engine core.');
    }
}

/**
 * Updates history files for changed workflows.
 * Smart History (C14 §2): skips redundant entries if the last row
 * has the same date and message (only version differs).
 */
function updateHistory(workflows, version, customMessage = null) {
    if (workflows.size === 0) return;

    const date = new Date().toISOString().split('T')[0];
    if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

    for (const wf of workflows) {
        const historyFile = path.join(historyDir, `${wf}.md`);
        const message = customMessage || 'Automated update via engine meta automation';

        if (fs.existsSync(historyFile)) {
            const existing = fs.readFileSync(historyFile, 'utf8');
            const lines = existing.trimEnd().split(/\r?\n/);

            // Smart History: check if last table row has same date + message
            const lastLine = lines[lines.length - 1] || '';
            const lastCols = lastLine.split('|').map(c => c.trim()).filter(Boolean);
            if (lastCols.length >= 3 && lastCols[1] === date && lastCols[2] === message) {
                console.log(`⏭️ History skipped (duplicate): ${wf}.md`);
                continue;
            }

            const entry = `| ${version} | ${date} | ${message} |\n`;
            fs.appendFileSync(historyFile, entry);
            console.log(`📝 History updated: ${wf}.md`);
        } else {
            const wfTitle = wf.charAt(0).toUpperCase() + wf.slice(1);
            const initialContent = `# ${wfTitle} Workflow History\n\n| Version | Date | Description |\n| :--- | :--- | :--- |\n| ${version} | ${date} | ${message} |\n`;
            fs.writeFileSync(historyFile, initialContent);
            console.log(`📝 History file created: ${wf}.md`);
        }
    }
}

/**
 * Bumps the patch version in .magic/.version (C1.7).
 * @returns {string} The new version string.
 */
function bumpVersion() {
    if (!fs.existsSync(versionPath)) {
        fs.writeFileSync(versionPath, '1.0.0');
        return '1.0.0';
    }

    const currentVersion = fs.readFileSync(versionPath, 'utf8').trim();
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
        parts[2] = parseInt(parts[2]) + 1;
        const newVersion = parts.join('.');
        fs.writeFileSync(versionPath, newVersion);
        console.log(`📈 Version bumped: ${currentVersion} -> ${newVersion}`);
        return newVersion;
    }
    return currentVersion;
}

/**
 * Executes the checksum generation script.
 */
function runGenerateChecksums() {
    const scriptPath = path.join(__dirname, 'generate-checksums.js');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
}

// Execute
try {
    updateEngineMeta();
} catch (error) {
    console.error(`❌ Failed to update engine meta: ${error.message}`);
    process.exit(1);
}
