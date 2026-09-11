#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// MANIFEST SYNC (Version Parity across ecosystems)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Propagates the canonical engine version (.magic/.version) into all
 * project manifests and version-bearing source files.
 *
 * Design notes (anti-thrash):
 *   - Each target uses an **anchored** pattern. The previous global
 *     `(\(v?\d+\.\d+\.\d+\))/g` for README would happily rewrite any version
 *     in parentheses (changelog references, examples, badges) — that's how
 *     unrelated mentions kept getting overwritten on each run. We now
 *     replace only well-defined occurrences.
 *   - Idempotent by construction: if the target already matches, we report
 *     "current" and emit no write.
 *   - Honors MAGIC_DRY_RUN via writeFileSafe.
 */

const projectRoot = process.cwd();
const magicDir = path.join(projectRoot, '.magic');
const versionFile = path.join(magicDir, '.version');

// ───────────────────────────────────────────────────────────────────────────
// Target Definitions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Builds the manifest target list for the current project tree.
 * Each entry: { name, file, edits: [{ regex, replace, label? }] }
 *
 * Multiple edits per file allow fine-grained patching (e.g. README has
 * a project-status line distinct from any badge URLs).
 */
function buildTargets(targetVersion) {
    return [
        {
            name: 'README.md',
            file: 'README.md',
            edits: [
                {
                    // Project status line — "**Active Development** (v1.5.198)"
                    label: 'project-status',
                    regex: /\*\*Active Development\*\*\s*\(v\d+\.\d+\.\d+\)/,
                    replace: `**Active Development** (v${targetVersion})`,
                },
                {
                    // Optional explicit marker pair, if present anywhere in README:
                    //   <!-- engine-version -->vX.Y.Z<!-- /engine-version -->
                    label: 'engine-version-marker',
                    regex: /<!--\s*engine-version\s*-->v?\d+\.\d+\.\d+<!--\s*\/engine-version\s*-->/,
                    replace: `<!-- engine-version -->v${targetVersion}<!-- /engine-version -->`,
                },
            ],
        },
    ];
}

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

/**
 * Applies every edit rule for one manifest target and reports what happened.
 * The caller tallies `'updated'`/`'current'` into the run summary;
 * `'missing'`/`'unmatched'`/`'declined'` (writeFileSafe — e.g. dry-run —
 * chose not to write) are logged here and deliberately left uncounted, same
 * as the original inline loop.
 *
 * @param {{ name: string, file: string, edits: Array }} target
 * @param {string} targetVersion
 * @returns {'missing'|'unmatched'|'current'|'updated'|'declined'}
 */
/**
 * Applies every edit rule to `content` in sequence.
 *
 * @param {string} content
 * @param {{ regex: RegExp, replace: string }[]} edits
 * @returns {{ content: string, matchedAny: boolean }}
 */
function applyEdits(content, edits) {
    let matchedAny = false;
    for (const edit of edits) {
        if (edit.regex.test(content)) {
            matchedAny = true;
            content = content.replace(edit.regex, edit.replace);
        }
    }
    return { content, matchedAny };
}

function syncOneTarget(target, targetVersion) {
    const fullPath = path.join(projectRoot, target.file);
    if (!fs.existsSync(fullPath)) {
        console.log(`  ⏭️  ${target.name} — not present, skipping`);
        return 'missing';
    }

    const original = fs.readFileSync(fullPath, 'utf8');
    const { content, matchedAny } = applyEdits(original, target.edits);

    if (!matchedAny) {
        console.warn(`  ⚠️  ${target.name} — no version anchor matched (skipped)`);
        return 'unmatched';
    }

    if (content === original) {
        console.log(`  ℹ️  ${target.name} — already at v${targetVersion}`);
        return 'current';
    }

    if (writeFileSafe(fullPath, content)) {
        console.log(`  ✅ ${target.name} → v${targetVersion}`);
        return 'updated';
    }
    return 'declined';
}

function syncManifests() {
    if (!fs.existsSync(versionFile)) {
        console.error('❌ Version file (.magic/.version) not found. Run update-engine-meta first.');
        return;
    }

    const targetVersion = fs.readFileSync(versionFile, 'utf8').trim();
    console.log(`🔄 Syncing project ecosystem to version ${targetVersion}...`);

    const results = buildTargets(targetVersion).map(target => syncOneTarget(target, targetVersion));
    const changes = results.filter(r => r === 'updated').length;
    const alreadyCurrent = results.filter(r => r === 'current').length;

    console.log(`🚀 Manifest Sync: ${changes} updated, ${alreadyCurrent} already current.`);
}

// Execute
syncManifests();
