const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// ECOSYSTEM SYNC (Modular Orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pipeline order:
 *
 *   1. update-engine-meta     — bumps .magic/.version when engine drifted
 *   2. sync-manifests         — propagates version into anchored
 *                                README markers
 *   3. validate-hardlinks     — ensures CLAUDE/GEMINI/QWEN/CODEX share
 *                                AGENTS.md inode (non-fatal by default;
 *                                use --strict-links to fail on missing)
 *   4. update-project-meta    — idempotent: bumps INDEX version + appends
 *                                history row only when structural digest
 *                                actually changed
 *   5. sync-docs              — regenerates CONTRIBUTING from template,
 *                                propagates Triggers/Slash command into
 *                                docs/{name}.md, refreshes Sync Note only
 *                                on real workflow-source change
 *
 * Skip flags: --skip-meta, --skip-docs, --skip-links
 * Strict mode: --strict-links (missing CLAUDE/GEMINI/etc. is fatal)
 * Dry run:    --dry-run (no physical writes; honored by writeFileSafe)
 */

const magicDir = path.join(__dirname);
const rawArgs = process.argv.slice(2);

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing (Strict Contract)
// ───────────────────────────────────────────────────────────────────────────

const KNOWN_FLAGS = new Set([
    '--skip-meta',
    '--skip-docs',
    '--skip-links',
    '--strict-links',
    '--dry-run',
]);

const unknown = rawArgs.filter(a => a.startsWith('-') && !KNOWN_FLAGS.has(a));
if (unknown.length > 0) {
    console.error(`❌ sync.js: unknown flag(s): ${unknown.join(', ')}`);
    console.error(`   Accepted: ${[...KNOWN_FLAGS].join(', ')}`);
    process.exit(2);
}

const dryRun = rawArgs.includes('--dry-run');
if (dryRun) {
    process.env.MAGIC_DRY_RUN = '1';
    console.log('🧪 Dry-run mode enabled — no files will be written.');
}

const strictLinks = rawArgs.includes('--strict-links');

// ───────────────────────────────────────────────────────────────────────────
// Sub-script Executor
// ───────────────────────────────────────────────────────────────────────────

/**
 * Executes a sub-sync script. The dry-run flag is propagated via the
 * MAGIC_DRY_RUN environment variable (inherited by child processes).
 *
 * @param {string} name - Sub-script filename (relative to magicDir).
 * @param {string[]} [extraArgs=[]] - Extra CLI args to forward.
 * @param {{ tolerant?: boolean }} [opts] - When tolerant, non-zero exit
 *        does not abort the pipeline (used for hardlink validation).
 */
function runSubscript(name, extraArgs = [], opts = {}) {
    const scriptPath = path.join(magicDir, name);
    if (!fs.existsSync(scriptPath)) return;

    const argString = extraArgs.length ? ' ' + extraArgs.map(a => `"${a}"`).join(' ') : '';
    try {
        execSync(`node "${scriptPath}"${argString}`, { stdio: 'inherit' });
    } catch (e) {
        if (opts.tolerant) {
            console.warn(`⚠️  Sub-script ${name} exited non-zero (tolerant).`);
            return;
        }
        console.error(`❌ Sub-script ${name} failed.`);
        process.exit(1);
    }
}

function main() {
    console.log('🚀 Starting lifecycle synchronization...');

    // 1. Engine meta + version
    if (!rawArgs.includes('--skip-meta')) {
        runSubscript('update-engine-meta.js');
    }

    // 2. Release-facing version anchors (README markers)
    runSubscript('sync-manifests.js');

    // 3. Hardlink validation — tolerant unless --strict-links
    if (!rawArgs.includes('--skip-links')) {
        runSubscript(
            'validate-hardlinks.js',
            strictLinks ? ['--strict'] : [],
            { tolerant: !strictLinks }
        );
    }

    // 4. Project meta (idempotent: only bumps INDEX when structural digest changes)
    runSubscript('update-project-meta.js');

    // 5. Docs (CONTRIBUTING + docs/*.md content sync)
    if (!rawArgs.includes('--skip-docs')) {
        runSubscript('sync-docs.js');
    }

    const tail = dryRun ? '(dry-run — no files modified)' : 'COMPLETED.';
    console.log(`✨ Lifecycle Sync: ${tail}`);
}

main();
