#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// HARDLINK VALIDATION (Agent Rule Cards + Rules)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies two hardlink groups:
 *
 *   1. Per-vendor agent rule files (CLAUDE.md, GEMINI.md, QWEN.md, CODEX.md)
 *      share the same inode as the AGENTS.md anchor.
 *   2. Each `rules/*.md` shares the same inode as `.agents/rules/*.md`.
 *
 * Why: the project deliberately uses hardlinks instead of duplicated files.
 * If an editor or careless `cp` replaces one of them, agents will diverge.
 * This script doesn't auto-repair — it surfaces the drift so the user can
 * run `/magic.dev:init` (the canonical link-rebuild path).
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

// ───────────────────────────────────────────────────────────────────────────
// Group 1 — AGENTS.md siblings
// ───────────────────────────────────────────────────────────────────────────

function validateAgentsLinks() {
    console.log('🔍 Validating hardlinks for agent rule cards...');

    const anchorPath = path.join(projectRoot, ANCHOR);
    const anchorStat = statSafe(anchorPath);
    if (!anchorStat) {
        console.error(`   ❌ Anchor missing: ${ANCHOR}. Run /magic.dev:init.`);
        return { drift: 1, missing: 0, fatal: true };
    }

    const anchorFp = fingerprint(anchorStat);
    console.log(`   📎 Anchor: ${ANCHOR} (inode=${anchorFp}, nlink=${anchorStat.nlink})`);

    let drift = 0;
    let missing = 0;
    let linked = 0;

    for (const sib of SIBLINGS) {
        const sibPath = path.join(projectRoot, sib);
        const sibStat = statSafe(sibPath);

        if (!sibStat) {
            const tag = strict ? '❌' : '⚠️';
            console.log(`   ${tag} Missing: ${sib}`);
            missing++;
            continue;
        }

        const sibFp = fingerprint(sibStat);
        if (sibFp !== anchorFp) {
            console.error(`   ❌ Drift: ${sib} has different inode (${sibFp} ≠ ${anchorFp}).`);
            drift++;
        } else {
            console.log(`   ✅ ${sib} → linked`);
            linked++;
        }
    }

    const summary = missing > 0
        ? `${linked}/${SIBLINGS.length} linked, ${missing} missing`
        : `all ${SIBLINGS.length} siblings linked to ${ANCHOR}`;
    console.log(`   ↳ ${summary}.`);

    return { drift, missing, fatal: false };
}

// ───────────────────────────────────────────────────────────────────────────
// Group 2 — rules/* ↔ .agents/rules/*
// ───────────────────────────────────────────────────────────────────────────

function validateRulesLinks() {
    const rulesPath = path.join(projectRoot, RULES_DIR);
    if (!fs.existsSync(rulesPath)) {
        return { drift: 0, missing: 0, fatal: false, skipped: true };
    }

    const ruleFiles = fs.readdirSync(rulesPath, { withFileTypes: true })
        .filter(d => d.isFile() && d.name.endsWith('.md'))
        .map(d => d.name);

    if (ruleFiles.length === 0) {
        return { drift: 0, missing: 0, fatal: false, skipped: true };
    }

    console.log(`\n🔍 Validating hardlinks for rules (${RULES_DIR}/ ↔ ${AGENTS_RULES_DIR}/)...`);

    let drift = 0;
    let missing = 0;
    let linked = 0;

    for (const file of ruleFiles) {
        const sourcePath = path.join(projectRoot, RULES_DIR, file);
        const targetPath = path.join(projectRoot, AGENTS_RULES_DIR, file);

        const sourceStat = statSafe(sourcePath);
        const targetStat = statSafe(targetPath);

        if (!sourceStat) continue;

        if (!targetStat) {
            const tag = strict ? '❌' : '⚠️';
            console.log(`   ${tag} Missing: ${AGENTS_RULES_DIR}/${file}`);
            missing++;
            continue;
        }

        const sourceFp = fingerprint(sourceStat);
        const targetFp = fingerprint(targetStat);

        if (sourceFp !== targetFp) {
            console.error(`   ❌ Drift: ${RULES_DIR}/${file} (${sourceFp}) ≠ ${AGENTS_RULES_DIR}/${file} (${targetFp}).`);
            drift++;
        } else {
            console.log(`   ✅ ${RULES_DIR}/${file} → ${AGENTS_RULES_DIR}/${file}`);
            linked++;
        }
    }

    const summary = missing > 0
        ? `${linked}/${ruleFiles.length} linked, ${missing} missing`
        : `all ${ruleFiles.length} rule file(s) linked`;
    console.log(`   ↳ ${summary}.`);

    return { drift, missing, fatal: false };
}

// ───────────────────────────────────────────────────────────────────────────
// Aggregation
// ───────────────────────────────────────────────────────────────────────────

function main() {
    const agents = validateAgentsLinks();
    if (agents.fatal) process.exit(1);

    const rules = validateRulesLinks();

    const totalDrift = agents.drift + rules.drift;
    const totalMissing = agents.missing + rules.missing;

    if (totalDrift > 0) {
        console.error(`\n❌ Hardlink validation failed: ${totalDrift} drifted file(s). Run /magic.dev:init to rebuild.`);
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

try {
    main();
} catch (e) {
    console.error(`❌ Hardlink validation crashed: ${e.message}`);
    process.exit(1);
}
