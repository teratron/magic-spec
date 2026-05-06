const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { hashFileSafe, getAllFiles, normalizePath, isDryRun, writeFileSafe, appendFileSafe, mkdirSafe, VOLATILE_STATE_FILES } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE META UPDATER (C14 Compliance)
// ═══════════════════════════════════════════════════════════════════════════

const magicDir = path.join(__dirname, '..');
const projectRoot = path.join(magicDir, '..');
const versionPath = path.join(magicDir, '.version');
const checksumsPath = path.join(magicDir, '.checksums');

// Arguments parsing
const args = process.argv.slice(2);
let checkOnly = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') {
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
    // Integrity scope: engine kernel only (.magic/). Surface artifacts in
    // workflows/, skills/, rules/ are user-customizable wrappers — not
    // protected by checksum so partial installations stay supported.
    const scanZones = [
        { dir: magicDir, relBase: magicDir }
    ];

    let anyChanged = false;

    scanZones.forEach(zone => {
        if (!fs.existsSync(zone.dir)) return;

        getAllFiles(zone.dir).forEach(fullPath => {
            const rel = normalizePath(path.relative(zone.relBase, fullPath));
            if (rel === '.checksums') return;
            // State caches written by sync sub-scripts (volatile, not engine logic).
            // Source of truth: utils.VOLATILE_STATE_FILES, also honored by generate-checksums.
            if (VOLATILE_STATE_FILES.has(rel)) return;

            const currentHash = hashFileSafe(fullPath);
            if (oldChecksums[rel] !== currentHash) {
                console.log(`✨ Detected change in: ${rel}`);
                anyChanged = true;
            }
        });
    });

    if (anyChanged) {
        if (checkOnly) {
            console.error('❌ Engine drift detected. Run `node dev/scripts/executor.js update-engine-meta` to resolve.');
            process.exit(1);
        }

        bumpVersion();

        // Ensure Skill wrappers are also in sync (C14 §3 Compatibility).
        // Fail-fast: if projection breaks, the engine state is inconsistent —
        // surface the error to the caller instead of silently bumping checksums.
        const syncSkillsPath = path.join(__dirname, '../../dev/scripts/sync-skills.js');
        if (fs.existsSync(syncSkillsPath)) {
            const syncSkills = require(syncSkillsPath);
            syncSkills();
        } else {
            console.warn('⚠️  dev/scripts/sync-skills.js not found — skipping skill sync (dev repo only).');
        }

        runGenerateChecksums();
        console.log('✅ Engine metadata and version updated.');
    } else {
        console.log('ℹ️ No changes detected in engine core.');
    }
}

/**
 * Bumps the patch version in .magic/.version (C1.7).
 * @returns {string} The new version string.
 */
function bumpVersion() {
    if (!fs.existsSync(versionPath)) {
        writeFileSafe(versionPath, '1.0.0');
        return '1.0.0';
    }

    const currentVersion = fs.readFileSync(versionPath, 'utf8').trim();
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
        parts[2] = parseInt(parts[2]) + 1;
        const newVersion = parts.join('.');
        if (writeFileSafe(versionPath, newVersion)) {
            console.log(`📈 Version bumped: ${currentVersion} -> ${newVersion}`);
        } else {
            console.log(`🧪 [dry-run] would bump version: ${currentVersion} -> ${newVersion}`);
        }
        return newVersion;
    }
    return currentVersion;
}

/**
 * Executes the checksum generation script.
 */
function runGenerateChecksums() {
    const scriptPath = path.join(__dirname, '../../dev/scripts/generate-checksums.js');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
}

// Execute
try {
    updateEngineMeta();
} catch (error) {
    console.error(`❌ Failed to update engine meta: ${error.message}`);
    process.exit(1);
}
