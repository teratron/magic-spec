#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
    hashFileSafe,
    getAllFiles,
    normalizePath,
    writeFileSafe,
    VOLATILE_STATE_FILES,
    loadGitignore,
    BUILD_NOISE_DIRS,
    hasEngineWriteTooling,
    describeManifestDelta,
    engineRoot,
    engineRel,
    executorHint,
    maintenanceScript,
    resolveProjectRoot,
} = require('./utils');
const diagnostics = require('./lib/diagnostics');
const hosts = require('./lib/hosts');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE META UPDATER (C14 Compliance)
// ═══════════════════════════════════════════════════════════════════════════

const magicDir = engineRoot();
const ENGINE_REL = engineRel();
const projectRoot = resolveProjectRoot();
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
 * Regenerates the host projections that already exist in the project (the rule copy,
 * the command entries, the pointer block) from the engine folder they were made from.
 *
 * A projection is only ever refreshed, never created: which hosts a project serves is
 * the decision of `init --host`. Run on every write invocation, so an edit to the rule
 * source or to the router's command table cannot leave a stale copy behind.
 *
 * @returns {void}
 */
function refreshHostProjections() {
    const refreshed = hosts.refreshProjections(projectRoot);
    if (refreshed.length === 0) {
        console.log('ℹ️ No host projection to refresh.');
        return;
    }
    for (const row of refreshed) console.log(`🔁 Refreshed projection: ${row.path}`);
}

/**
 * Updates the engine metadata: checksums and version.
 * Triggered after any modification to the engine folder.
 */
function updateEngineMeta() {
    console.log('🔍 Checking engine integrity (C14)...');

    if (!fs.existsSync(checksumsPath)) {
        // The release archive ships the manifest pre-generated. A missing
        // manifest indicates either an incomplete install or accidental
        // deletion — neither is fixable by silently regenerating (that would
        // mask drift introduced by the same incident).
        if (checkOnly) {
            console.error(
                `❌ ${ENGINE_REL}/.checksums missing. Restore ${ENGINE_REL}/ from origin.`,
            );
            process.exit(1);
        }
        // Developer bootstrap path: generate-checksums.js lives in scripts/
        // (manifest-builder is a developer tool, not user-facing). Falls
        // through to graceful warning if the maintenance folder is absent (user installation).
        console.log('⚠️ Checksums missing. Initializing...');
        runGenerateChecksums();
        return;
    }

    const oldChecksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
    // Integrity scope: the whole engine folder. Projections outside it (the rule
    // copy, the command entries) are generated from it and are checked for
    // staleness by init, not by checksum.
    const scanZones = [{ dir: magicDir, relBase: magicDir }];
    // Invariant 7 parity (the shared scan-hygiene rule) — must stay
    // in sync with generate-checksums.js's identical floor/gitignore union,
    // or the two can disagree about what belongs in the manifest.
    const scanIgnoreDirs = ['history', ...BUILD_NOISE_DIRS];
    const isGitignored = loadGitignore(projectRoot);

    let anyChanged = false;

    /** @type {Set<string>} Manifest-eligible paths actually present on disk. */
    const onDisk = new Set();

    scanZones.forEach((zone) => {
        if (!fs.existsSync(zone.dir)) return;

        getAllFiles(zone.dir, scanIgnoreDirs).forEach((fullPath) => {
            const rel = normalizePath(path.relative(zone.relBase, fullPath));
            if (rel === '.checksums') return;
            // State caches written by sync sub-scripts (volatile, not engine logic).
            // Source of truth: utils.VOLATILE_STATE_FILES, also honored by generate-checksums.
            if (VOLATILE_STATE_FILES.has(rel)) return;
            // Gitignore exclusion only guards *new* (not-yet-manifested) paths —
            // it exists to keep accidental dev-machine cruft (e.g. a stray
            // `.fallow/` cache) from being treated as a legitimate engine
            // addition, mirroring generate-checksums.js's manifest-authoring
            // scope. It must NOT apply to a path already listed in `.checksums`:
            // every consumer install is expected to gitignore the engine folder
            // wholesale (it's an installed release artifact, never committed), so treating
            // that as "disowned" would mark every shipped engine file as missing
            // and fail `--check` on every single consumer commit.
            const isManifested = Object.hasOwn(oldChecksums, rel);
            if (!isManifested && isGitignored(normalizePath(path.relative(projectRoot, fullPath))))
                return;

            onDisk.add(rel);

            const currentHash = hashFileSafe(fullPath);
            if (oldChecksums[rel] !== currentHash) {
                // A line-endings-only difference is the one cause worth naming on
                // the line itself: it is common, and invisible in an editor.
                const delta = isManifested
                    ? describeManifestDelta(fullPath, oldChecksums[rel])
                    : null;
                const note = delta?.lineEndingsOnly
                    ? ` — only line endings differ (found ${delta.found}, the release ships ${delta.expectedEol})`
                    : '';
                console.log(`✨ Detected change in: ${rel}${note}`);
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
    const missingFiles = Object.keys(oldChecksums).filter((rel) => !onDisk.has(rel));

    for (const rel of missingFiles) {
        console.log(`🗑️  Missing engine file: ${rel}`);
        anyChanged = true;
    }

    if (anyChanged) {
        if (checkOnly) {
            if (missingFiles.length > 0) {
                console.error(
                    `❌ ${missingFiles.length} file(s) listed in ${ENGINE_REL}/.checksums are absent from disk. ` +
                        `Restore ${ENGINE_REL}/ from the release archive.`,
                );
            } else if (hasEngineWriteTooling()) {
                console.error(
                    `❌ Engine drift detected. Run \`${executorHint()} update-engine-meta\` to resolve.`,
                );
            } else {
                // A user installation cannot regenerate the manifest, and must
                // not: overwriting `.checksums` would mask the very change this
                // check exists to surface.
                console.error(
                    `❌ Engine drift detected. Restore ${ENGINE_REL}/ from the release archive — ` +
                        'do not regenerate .checksums (that would mask the change).',
                );
            }
            process.exit(1);
        }

        // Write mode blesses an intentional engine edit: it bumps the version
        // and regenerates the manifest. A user installation has no manifest
        // builder, so it can do neither — and must not do the half it can.
        // Bumping `.version` there moves the very signal Engine Upgrade
        // Detection (AGENT-RULES.md §1) reads as "the engine was replaced under
        // this project", while the drift it claims to resolve is untouched: the
        // manifest is unchanged, so the next check reports the same files again
        // and every retry bumps the version once more. Refuse before anything
        // is touched.
        if (!hasEngineWriteTooling()) refuseUserInstallWrite();

        bumpVersion();

        // The projections are generated from the folder just changed (C14 §3
        // Compatibility): bring the existing ones in line before the manifest.
        refreshHostProjections();

        // Dev-repo-only: keep .magicspec/INDEX.md's Engine Version snapshot current
        // with every C14 bump. Consumer installs never reach this branch — the
        // external-drift signal Engine Upgrade Detection (AGENT-RULES.md §1)
        // provides to them is untouched.
        const syncSnapshotPath = maintenanceScript('sync-engine-snapshot.js');
        if (fs.existsSync(syncSnapshotPath)) {
            const syncEngineSnapshot = require(syncSnapshotPath);
            syncEngineSnapshot();
        } else {
            console.warn(
                '⚠️  scripts/sync-engine-snapshot.js not found — skipping snapshot sync (dev repo only).',
            );
            diagnostics.record({
                severity: 'warning',
                source: 'update-engine-meta',
                code: 'SNAPSHOT_SYNC_UNAVAILABLE',
                message:
                    'scripts/sync-engine-snapshot.js not found; Engine Version snapshot sync skipped (dev repo only).',
            });
        }

        runGenerateChecksums();
        console.log('✅ Engine metadata and version updated.');
    } else {
        // Read-only verification and write mode agree: the manifest covers the whole
        // folder, so an unchanged scan means nothing was edited and nothing is owed.
        console.log(`ℹ️ No changes detected in ${ENGINE_REL}/ (checksum-tracked engine core).`);
    }
}

/**
 * Bumps the patch version in the engine folder's `.version` (C1.7).
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
        parts[2] = parseInt(parts[2], 10) + 1;
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
 * scripts/ (developer-only tool); user installations ship .checksums
 * pre-generated and never regenerate. Falls back to a graceful warning if
 * the maintenance folder is absent so a user-side accidental drift surfaces a clear message
 * instead of a missing-file crash.
 */
function runGenerateChecksums() {
    const scriptPath = maintenanceScript('generate-checksums.js');
    if (!hasEngineWriteTooling()) {
        console.warn(
            '⚠️  generate-checksums.js not found at scripts/ — this is a user installation.',
        );
        console.warn('   Engine writes (checksums regeneration) are a developer operation.');
        console.warn(`   To clear drift: restore ${ENGINE_REL}/ from the release archive.`);
        diagnostics.record({
            severity: 'warning',
            source: 'update-engine-meta',
            code: 'CHECKSUM_TOOLING_UNAVAILABLE',
            message:
                'scripts/generate-checksums.js not found (user installation); checksum regeneration skipped.',
            remedy: `To clear drift: restore ${ENGINE_REL}/ from the release archive.`,
        });
        return;
    }
    execFileSync(process.execPath, [scriptPath, '--dir', magicDir], { stdio: 'inherit' });
}

/**
 * Refuses the C14 write branch in a user installation: nothing is bumped,
 * synced or regenerated, and the process exits non-zero. The standard
 * "this is a user installation" guidance (and its diagnostics finding) comes
 * from {@link runGenerateChecksums}, which does nothing else there — drift that
 * cannot be resolved must not read as success.
 *
 * @returns {never}
 */
function refuseUserInstallWrite() {
    runGenerateChecksums();
    console.error(
        '❌ Engine drift not resolved: nothing was changed (version and .checksums untouched).',
    );
    process.exit(1);
}

// Execute
try {
    updateEngineMeta();
} catch (error) {
    console.error(`❌ Failed to update engine meta: ${error.message}`);
    process.exit(1);
}
