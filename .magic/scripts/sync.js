const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// ECOSYSTEM SYNC (Modular Orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

const magicDir = path.join(__dirname);
const rawArgs = process.argv.slice(2);

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing (Strict Contract)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Whitelist of flags accepted by sync.js. Silent-ignore of unknown flags
 * previously caused a read-only invariant violation (callers passed
 * `--dry-run`, received no error, writes happened anyway). Keep this list
 * explicit: add new flags here before wiring them into main().
 */
const KNOWN_FLAGS = new Set(['--skip-meta', '--skip-docs', '--dry-run']);

const unknown = rawArgs.filter(a => a.startsWith('-') && !KNOWN_FLAGS.has(a));
if (unknown.length > 0) {
    // TODO: user choice — policy for unknown flags.
    // Currently: strict fail (Option A). Switch to warn-only (Option B) or
    // whitelist-with-suggestion (Option C) by editing the block below.
    console.error(`❌ sync.js: unknown flag(s): ${unknown.join(', ')}`);
    console.error(`   Accepted: ${[...KNOWN_FLAGS].join(', ')}`);
    process.exit(2);
}

const dryRun = rawArgs.includes('--dry-run');
if (dryRun) {
    process.env.MAGIC_DRY_RUN = '1';
    console.log('🧪 Dry-run mode enabled — no files will be written.');
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-script Executor
// ───────────────────────────────────────────────────────────────────────────

/**
 * Executes a sub-sync script. The dry-run flag is propagated via the
 * MAGIC_DRY_RUN environment variable (inherited by child processes),
 * which each sub-script honors through utils.writeFileSafe.
 *
 * @param {string} name - Sub-script filename (relative to magicDir).
 */
function runSubscript(name) {
    const scriptPath = path.join(magicDir, name);
    if (fs.existsSync(scriptPath)) {
        try {
            execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
        } catch (e) {
            console.error(`❌ Sub-script ${name} failed.`);
            process.exit(1);
        }
    }
}

function main() {
    console.log('🚀 Starting lifecycle synchronization...');

    // 1. Update Engine Meta & Version (C14)
    if (!rawArgs.includes('--skip-meta')) {
        runSubscript('update-engine-meta.js');
    }

    // 2. Sync Manifests
    runSubscript('sync-manifests.js');

    // 3. Update Project Meta
    runSubscript('update-project-meta.js');

    // 4. Sync Documentation
    if (!rawArgs.includes('--skip-docs')) {
        runSubscript('sync-docs.js');
    }

    const tail = dryRun ? '(dry-run — no files modified)' : 'COMPLETED.';
    console.log(`✨ Lifecycle Sync: ${tail}`);
}

main();
