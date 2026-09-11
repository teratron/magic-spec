#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// HARDLINK VALIDATION (Agent Rule Cards + Rules)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies every linked-pair group declared in l2-agent-surface.md §4
 * (the closed inventory — adding a fourth group there without adding it
 * here is a spec-compliance gap, not a deferrable follow-up):
 *
 *   1. Per-vendor agent rule files (CLAUDE.md, GEMINI.md, QWEN.md, CODEX.md)
 *      share the same inode as the AGENTS.md anchor.
 *   2. Each `rules/*.md` shares the same inode as `.agents/rules/*.md`.
 *   3. Each `workflows/*.md` shares the same inode as
 *      `.agents/workflows/*.md`.
 *
 * `skills/{name}/SKILL.md` is deliberately NOT a group here — it is
 * independently generated into both `skills/` and `.agents/skills/` by
 * sync-skills.js, not a hardlink pair (l2-agent-surface.md §2.2, §4).
 *
 * Why: the project deliberately uses hardlinks instead of duplicated files.
 * If an editor or careless `cp` replaces one of them, agents will diverge.
 * This script doesn't auto-repair — it surfaces the drift so the user can
 * run `/magic.dev.init` (the canonical link-rebuild path).
 *
 * Exit codes:
 *   0 — all good, or only soft warnings (missing optional siblings)
 *   1 — drift detected (different inodes, missing required file, etc.)
 *
 * Flags:
 *   --strict   Treat any missing sibling as a hard error
 */

const projectRoot = process.cwd();
const ANCHOR = 'AGENTS.md';
const SIBLINGS = ['CLAUDE.md', 'GEMINI.md', 'QWEN.md', 'CODEX.md'];
const RULES_DIR = 'rules';
const AGENTS_RULES_DIR = path.join('.agents', 'rules');
const WORKFLOWS_DIR = 'workflows';
const AGENTS_WORKFLOWS_DIR = path.join('.agents', 'workflows');

const args = process.argv.slice(2);
const strict = args.includes('--strict');

function statSafe(p) {
    try {
        return fs.statSync(p);
    } catch {
        return null;
    }
}

function fingerprint(stat) {
    // On Windows, fs.statSync returns a numeric `ino` derived from the file's
    // file index (BY_HANDLE_FILE_INFORMATION). Hardlinks share inode + dev.
    return `${stat.dev}:${stat.ino}`;
}

/**
 * Tallies per-item classify results (each `'missing'`/`'drift'`/`'linked'`,
 * `null` silently ignored) into outcome counts — shared by both link groups
 * below, which otherwise differ only in how each item is classified.
 *
 * @param {(string|null)[]} results
 * @returns {{ missing: number, drift: number, linked: number }}
 */
function tallyLinkResults(results) {
    return {
        missing: results.filter(r => r === 'missing').length,
        drift: results.filter(r => r === 'drift').length,
        linked: results.filter(r => r === 'linked').length,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Group 1 — AGENTS.md siblings
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compares one sibling file's inode against the AGENTS.md anchor's and logs
 * the outcome.
 *
 * @param {string} sib - Sibling filename (e.g. `CLAUDE.md`).
 * @param {string} anchorFp - The anchor's `fingerprint()` value.
 * @returns {'missing'|'drift'|'linked'}
 */
function classifySibling(sib, anchorFp) {
    const sibPath = path.join(projectRoot, sib);
    const sibStat = statSafe(sibPath);

    if (!sibStat) {
        const tag = strict ? '❌' : '⚠️';
        console.log(`   ${tag} Missing: ${sib}`);
        return 'missing';
    }

    const sibFp = fingerprint(sibStat);
    if (sibFp !== anchorFp) {
        console.error(`   ❌ Drift: ${sib} has different inode (${sibFp} ≠ ${anchorFp}).`);
        return 'drift';
    }
    console.log(`   ✅ ${sib} → linked`);
    return 'linked';
}

function validateAgentsLinks() {
    console.log('🔍 Validating hardlinks for agent rule cards...');

    const anchorPath = path.join(projectRoot, ANCHOR);
    const anchorStat = statSafe(anchorPath);
    if (!anchorStat) {
        console.error(`   ❌ Anchor missing: ${ANCHOR}. Run /magic.dev.init.`);
        return { drift: 1, missing: 0, fatal: true };
    }

    const anchorFp = fingerprint(anchorStat);
    console.log(`   📎 Anchor: ${ANCHOR} (inode=${anchorFp}, nlink=${anchorStat.nlink})`);

    const { missing, drift, linked } = tallyLinkResults(SIBLINGS.map(sib => classifySibling(sib, anchorFp)));

    const summary = missing > 0
        ? `${linked}/${SIBLINGS.length} linked, ${missing} missing`
        : `all ${SIBLINGS.length} siblings linked to ${ANCHOR}`;
    console.log(`   ↳ ${summary}.`);

    return { drift, missing, fatal: false };
}

// ───────────────────────────────────────────────────────────────────────────
// Groups 2 & 3 — directory-pair hardlinks (rules/, workflows/)
// ───────────────────────────────────────────────────────────────────────────
// Both groups share identical shape (flat directory of *.md files, each
// paired by name with its .agents/ twin) — table-driven so a future pair
// declared in l2-agent-surface.md §4 is a data addition here, never a
// fourth copy of this block. This is the direct fix for the gap that let
// workflows/ exist unguarded: a hardcoded per-group function has to be
// remembered and added for each new pair; a table only has to be extended.

/**
 * Compares one paired file's inode across `sourceDir`/`targetDir` and logs
 * the outcome.
 *
 * @param {string} sourceDir
 * @param {string} targetDir
 * @param {string} file - Filename shared by both directories.
 * @returns {'missing'|'drift'|'linked'|null} `null` when the source itself
 *          vanished mid-scan — nothing to report, matching the original
 *          loop's silent `continue`.
 */
function classifyPairedFile(sourceDir, targetDir, file) {
    const sourceFilePath = path.join(projectRoot, sourceDir, file);
    const targetFilePath = path.join(projectRoot, targetDir, file);

    const sourceStat = statSafe(sourceFilePath);
    const targetStat = statSafe(targetFilePath);

    if (!sourceStat) return null;

    if (!targetStat) {
        const tag = strict ? '❌' : '⚠️';
        console.log(`   ${tag} Missing: ${targetDir}/${file}`);
        return 'missing';
    }

    const sourceFp = fingerprint(sourceStat);
    const targetFp = fingerprint(targetStat);

    if (sourceFp !== targetFp) {
        console.error(`   ❌ Drift: ${sourceDir}/${file} (${sourceFp}) ≠ ${targetDir}/${file} (${targetFp}).`);
        return 'drift';
    }
    console.log(`   ✅ ${sourceDir}/${file} → ${targetDir}/${file}`);
    return 'linked';
}

function validateDirectoryPairLinks(sourceDir, targetDir, label) {
    const sourcePath = path.join(projectRoot, sourceDir);
    if (!fs.existsSync(sourcePath)) {
        return { drift: 0, missing: 0, fatal: false, skipped: true };
    }

    const files = fs.readdirSync(sourcePath, { withFileTypes: true })
        .filter(d => d.isFile() && d.name.endsWith('.md'))
        .map(d => d.name);

    if (files.length === 0) {
        return { drift: 0, missing: 0, fatal: false, skipped: true };
    }

    console.log(`\n🔍 Validating hardlinks for ${label} (${sourceDir}/ ↔ ${targetDir}/)...`);

    const { missing, drift, linked } = tallyLinkResults(files.map(file => classifyPairedFile(sourceDir, targetDir, file)));

    const summary = missing > 0
        ? `${linked}/${files.length} linked, ${missing} missing`
        : `all ${files.length} file(s) linked`;
    console.log(`   ↳ ${summary}.`);

    return { drift, missing, fatal: false };
}

// ───────────────────────────────────────────────────────────────────────────
// Aggregation
// ───────────────────────────────────────────────────────────────────────────

function main() {
    const agents = validateAgentsLinks();
    if (agents.fatal) process.exit(1);

    const rules = validateDirectoryPairLinks(RULES_DIR, AGENTS_RULES_DIR, 'rules');
    const workflows = validateDirectoryPairLinks(WORKFLOWS_DIR, AGENTS_WORKFLOWS_DIR, 'workflows');

    const totalDrift = agents.drift + rules.drift + workflows.drift;
    const totalMissing = agents.missing + rules.missing + workflows.missing;

    if (totalDrift > 0) {
        console.error(`\n❌ Hardlink validation failed: ${totalDrift} drifted file(s). Run /magic.dev.init to rebuild.`);
        process.exit(1);
    }

    if (strict && totalMissing > 0) {
        console.error(`\n❌ Hardlink validation failed (strict): ${totalMissing} sibling(s) missing.`);
        process.exit(1);
    }

    if (totalMissing > 0) {
        console.log(`\n✅ Hardlink validation: passed with ${totalMissing} non-strict warning(s).`);
    } else {
        console.log(`\n✅ Hardlink validation: all groups linked correctly.`);
    }
}

module.exports = { validateAgentsLinks, validateDirectoryPairLinks, main };

if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error(`❌ Hardlink validation crashed: ${e.message}`);
        process.exit(1);
    }
}
