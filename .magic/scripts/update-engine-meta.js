#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { hashFileSafe, getAllFiles, normalizePath, isDryRun, writeFileSafe, appendFileSafe, mkdirSafe, VOLATILE_STATE_FILES } = require('./utils');
const diagnostics = require('./lib/diagnostics');

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
        // The release archive ships .magic/.checksums pre-generated. A missing
        // manifest indicates either an incomplete install or accidental
        // deletion — neither is fixable by silently regenerating (that would
        // mask drift introduced by the same incident).
        if (checkOnly) {
            console.error('❌ .magic/.checksums missing. Restore .magic/ from origin.');
            process.exit(1);
        }
        // Developer bootstrap path: generate-checksums.js lives in dev/scripts/
        // (manifest-builder is a developer tool, not user-facing). Falls
        // through to graceful warning if dev/ is absent (user installation).
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

    /** @type {Set<string>} Manifest-eligible paths actually present on disk. */
    const onDisk = new Set();

    scanZones.forEach(zone => {
        if (!fs.existsSync(zone.dir)) return;

        getAllFiles(zone.dir).forEach(fullPath => {
            const rel = normalizePath(path.relative(zone.relBase, fullPath));
            if (rel === '.checksums') return;
            // State caches written by sync sub-scripts (volatile, not engine logic).
            // Source of truth: utils.VOLATILE_STATE_FILES, also honored by generate-checksums.
            if (VOLATILE_STATE_FILES.has(rel)) return;

            onDisk.add(rel);

            const currentHash = hashFileSafe(fullPath);
            if (oldChecksums[rel] !== currentHash) {
                console.log(`✨ Detected change in: ${rel}`);
                anyChanged = true;
            }
        });
    });

    // The walk above only visits files that exist, so it detects modifications
    // and additions but is structurally blind to removals. Traverse the manifest
    // in the opposite direction to catch entries whose file is gone — a deleted
    // script, or one that never made it into the release archive. Exclusion rules
    // here mirror generate-checksums.js exactly (history/, .checksums, volatile
    // caches), so a manifest key absent from `onDisk` is genuinely missing.
    const missingFiles = Object.keys(oldChecksums).filter(rel => !onDisk.has(rel));

    for (const rel of missingFiles) {
        console.log(`🗑️  Missing engine file: ${rel}`);
        anyChanged = true;
    }

    if (anyChanged) {
        if (checkOnly) {
            if (missingFiles.length > 0) {
                console.error(
                    `❌ ${missingFiles.length} file(s) listed in .magic/.checksums are absent from disk. ` +
                    'Restore .magic/ from the release archive.'
                );
            } else {
                console.error('❌ Engine drift detected. Run `node .magic/scripts/executor.js update-engine-meta` to resolve.');
            }
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
            diagnostics.record({
                severity: 'warning', source: 'update-engine-meta', code: 'SKILL_SYNC_UNAVAILABLE',
                message: 'dev/scripts/sync-skills.js not found; skill sync skipped (dev repo only).',
            });
        }

        // Dev-repo-only: keep .design/INDEX.md's Engine Version snapshot current
        // with every C14 bump. Consumer installs never reach this branch — the
        // external-drift signal Engine Upgrade Detection (rules/magic.md §1)
        // provides to them is untouched (l1-engine-core.md §Known Process Gaps —
        // Dev-Repo Engine-Version Snapshot Sync).
        const syncSnapshotPath = path.join(__dirname, '../../dev/scripts/sync-engine-snapshot.js');
        if (fs.existsSync(syncSnapshotPath)) {
            const syncEngineSnapshot = require(syncSnapshotPath);
            syncEngineSnapshot();
        } else {
            console.warn('⚠️  dev/scripts/sync-engine-snapshot.js not found — skipping snapshot sync (dev repo only).');
            diagnostics.record({
                severity: 'warning', source: 'update-engine-meta', code: 'SNAPSHOT_SYNC_UNAVAILABLE',
                message: 'dev/scripts/sync-engine-snapshot.js not found; Engine Version snapshot sync skipped (dev repo only).',
            });
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
 * Executes the checksum generation script. The manifest builder lives in
 * dev/scripts/ (developer-only tool); user installations ship .checksums
 * pre-generated and never regenerate. Falls back to a graceful warning if
 * dev/ is absent so a user-side accidental drift surfaces a clear message
 * instead of a missing-file crash.
 */
function runGenerateChecksums() {
    const scriptPath = path.join(__dirname, '../../dev/scripts/generate-checksums.js');
    if (!fs.existsSync(scriptPath)) {
        console.warn('⚠️  generate-checksums.js not found at dev/scripts/ — this is a user installation.');
        console.warn('   Engine writes (checksums regeneration) are a developer operation.');
        console.warn('   To clear drift: restore .magic/ from the release archive.');
        diagnostics.record({
            severity: 'warning', source: 'update-engine-meta', code: 'CHECKSUM_TOOLING_UNAVAILABLE',
            message: 'dev/scripts/generate-checksums.js not found (user installation); checksum regeneration skipped.',
            remedy: 'To clear drift: restore .magic/ from the release archive.',
        });
        return;
    }
    execFileSync(process.execPath, [scriptPath], { stdio: 'inherit' });
}

// Execute
try {
    updateEngineMeta();
} catch (error) {
    console.error(`❌ Failed to update engine meta: ${error.message}`);
    process.exit(1);
}
