#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// HARDLINK VALIDATION (Agent Rule Cards)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies that all per-vendor agent rule files (CLAUDE.md, GEMINI.md,
 * QWEN.md, CODEX.md) are hardlinks to the same inode as AGENTS.md.
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

function main() {
    console.log('🔍 Validating hardlinks for agent rule cards...');

    const anchorPath = path.join(projectRoot, ANCHOR);
    const anchorStat = statSafe(anchorPath);
    if (!anchorStat) {
        console.error(`❌ Anchor missing: ${ANCHOR}. Run /magic.dev:init.`);
        process.exit(1);
    }

    const anchorFp = fingerprint(anchorStat);
    const anchorLinks = anchorStat.nlink;
    console.log(`   📎 Anchor: ${ANCHOR} (inode=${anchorFp}, nlink=${anchorLinks})`);

    let drift = 0;
    let missing = 0;

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
        }
    }

    if (drift > 0) {
        console.error(`❌ Hardlink validation failed: ${drift} drifted file(s). Run /magic.dev:init to rebuild.`);
        process.exit(1);
    }

    if (strict && missing > 0) {
        console.error(`❌ Hardlink validation failed (strict): ${missing} sibling(s) missing.`);
        process.exit(1);
    }

    if (missing > 0) {
        console.log(`✅ Hardlink validation: ${SIBLINGS.length - missing}/${SIBLINGS.length} linked, ${missing} missing (non-strict).`);
    } else {
        console.log(`✅ Hardlink validation: all ${SIBLINGS.length} siblings linked to ${ANCHOR}.`);
    }
}

try {
    main();
} catch (e) {
    console.error(`❌ Hardlink validation crashed: ${e.message}`);
    process.exit(1);
}
