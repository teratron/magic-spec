const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { hashFileSafe, getAllFiles, normalizePath } = require('./utils');

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
let checkOnly = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--workflow' && args[i + 1]) {
        args[i + 1].split(',').forEach(wf => manualWorkflows.add(wf));
        i++;
    } else if ((args[i] === '--message' || args[i] === '-m') && args[i + 1]) {
        manualMessage = args[i + 1];
        i++;
    } else if (args[i] === '--check') {
        checkOnly = true;
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
    const projectRoot = path.join(magicDir, '..');
    const scanZones = [
        { dir: magicDir, relBase: magicDir },
        { dir: path.join(projectRoot, 'workflows'), relBase: projectRoot },
        { dir: path.join(projectRoot, 'skills'), relBase: projectRoot }
    ];

    const changedWorkflows = new Set(manualWorkflows);
    let engineLogicChanged = false;

    scanZones.forEach(zone => {
        if (!fs.existsSync(zone.dir)) return;

        getAllFiles(zone.dir).forEach(fullPath => {
            const rel = normalizePath(path.relative(zone.relBase, fullPath));
            if (rel === '.checksums' || rel.startsWith('history/') || rel === '.version') return;

            const currentHash = hashFileSafe(fullPath);
            if (oldChecksums[rel] !== currentHash) {
                console.log(`✨ Detected change in: ${rel}`);

                // Track history for all .md files (hierarchical)
                if (rel.endsWith('.md')) {
                    let base = rel.replace(/\.md$/, '');
                    // For history mapping, we want to strip .agents/ if it ever appears in core
                    if (base.startsWith('.agents/')) base = base.replace('.agents/', '');
                    changedWorkflows.add(base);
                }

                // Logic changes in scripts or templates
                if (rel.startsWith('scripts/') || rel.startsWith('templates/')) {
                    engineLogicChanged = true;
                    // Also track history for scripts
                    if (rel.endsWith('.js') || rel.endsWith('.ps1') || rel.endsWith('.sh')) {
                        let base = rel.replace(/\.(js|ps1|sh)$/, '');
                        if (base.startsWith('.agents/')) base = base.replace('.agents/', '');
                        changedWorkflows.add(base);
                    }
                }
            }
        });
    });

    if (engineLogicChanged || changedWorkflows.size > 0) {
        if (checkOnly) {
            console.error('❌ Engine drift detected. Run `node .magic/scripts/executor.js update-engine-meta --workflow <name>` to resolve.');
            for (const wf of changedWorkflows) console.error(`  • ${wf}`);
            process.exit(1);
        }

        const newVersion = bumpVersion();
        updateHistory(changedWorkflows, newVersion, manualMessage);

        // Ensure Skill wrappers are also in sync (C14 §3 Compatibility).
        // Fail-fast: if projection breaks, the engine state is inconsistent —
        // surface the error to the caller instead of silently bumping checksums.
        const syncSkills = require('./sync-skills');
        syncSkills();

        runGenerateChecksums();
        console.log('✅ Engine metadata and version updated.');
    } else {
        console.log('ℹ️ No changes detected in engine core.');
    }

    // Cleanup: remove empty directories in history
    if (fs.existsSync(historyDir)) {
        const cleanup = (dir) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    cleanup(fullPath);
                    if (fs.readdirSync(fullPath).length === 0) {
                        fs.rmdirSync(fullPath);
                        console.log(`🧹 Removed empty history directory: ${path.relative(historyDir, fullPath)}`);
                    }
                }
            });
        };
        cleanup(historyDir);
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
        // Support hierarchical paths (e.g., 'scripts/executor')
        const historyFile = path.join(historyDir, `${wf}.md`);
        const message = customMessage || 'Automated update via engine meta automation';

        // Ensure target directory exists for hierarchical history
        const targetSubdir = path.dirname(historyFile);
        if (!fs.existsSync(targetSubdir)) {
            fs.mkdirSync(targetSubdir, { recursive: true });
        }

        if (fs.existsSync(historyFile)) {
            const existing = fs.readFileSync(historyFile, 'utf8');
            const lines = existing.trimEnd().split(/\r?\n/);

            // Smart History: check if last table row has same message
            const lastLine = lines[lines.length - 1] || '';
            const lastCols = lastLine.split('|').map(c => c.trim()).filter(Boolean);

            if (lastCols.length >= 3 && lastCols[2] === message) {
                // Same message, extend the version range and update date
                if (lastCols[1] === date && lastCols[0].includes(version)) {
                    console.log(`⏭️ History skipped (duplicate): ${wf}.md`);
                    continue;
                }
                const startVersion = lastCols[0].split(' - ')[0];
                lines[lines.length - 1] = `| ${startVersion} - ${version} | ${date} | ${message} |`;
                fs.writeFileSync(historyFile, lines.join('\n') + '\n');
                console.log(`📝 History updated (range condensed): ${wf}.md`);
            } else {
                const entry = `| ${version} | ${date} | ${message} |\n`;
                fs.appendFileSync(historyFile, entry);
                console.log(`📝 History updated: ${wf}.md`);
            }
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
