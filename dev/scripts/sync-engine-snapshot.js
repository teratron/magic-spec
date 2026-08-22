#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT: SYNC-ENGINE-SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════
// Dev-repo-only counterpart to /magic.analyze's Engine Snapshot step
// (l1-engine-core.md §Known Process Gaps — Dev-Repo Engine-Version Snapshot
// Sync). Engine Upgrade Detection (rules/magic.md §1) compares .magic/.version
// against the **Engine Version:** field in .design/INDEX.md to catch an
// *external* engine replacement; in this engine's own dev-repo every bump is
// first-party, so the field is kept current directly by update-engine-meta.js
// (guarded by the same dev/scripts/ presence check already used for
// checksum regeneration and skill sync — consumer installs never call this).

const ROOT_DIR = path.resolve(__dirname, '../../');
const VERSION_PATH = path.join(ROOT_DIR, '.magic', '.version');
const INDEX_PATH = path.join(ROOT_DIR, '.design', 'INDEX.md');
const FIELD_RE = /\*\*Engine Version:\*\* .*/;

/**
 * Patches `.design/INDEX.md`'s `**Engine Version:**` field to the current
 * `.magic/.version`. Non-blocking by contract: called from inside a C14 bump
 * that must complete regardless of the state of this file, so a missing
 * index or a missing field warns and returns rather than throwing.
 *
 * @returns {void}
 */
function sync() {
    if (!fs.existsSync(VERSION_PATH)) {
        console.warn('⚠️  .magic/.version not found — skipping Engine Version snapshot sync.');
        return;
    }
    const version = fs.readFileSync(VERSION_PATH, 'utf8').trim();

    if (!fs.existsSync(INDEX_PATH)) {
        console.warn('⚠️  .design/INDEX.md not found — skipping Engine Version snapshot sync.');
        return;
    }
    const content = fs.readFileSync(INDEX_PATH, 'utf8');

    if (!FIELD_RE.test(content)) {
        console.warn('⚠️  .design/INDEX.md has no **Engine Version:** field — skipping snapshot sync.');
        return;
    }

    const next = content.replace(FIELD_RE, `**Engine Version:** ${version}`);
    if (next === content) return;

    if (writeFileSafe(INDEX_PATH, next)) {
        console.log(` ✅ Engine Version snapshot synced: ${version}`);
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Execution
// ───────────────────────────────────────────────────────────────────────────

if (require.main === module) {
    sync();
}

module.exports = sync;
