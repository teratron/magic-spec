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
 *                                (.magic/scripts/ — also used by user hook)
 *   2. sync-manifests         — propagates version into anchored README markers
 *                                (dev/scripts/)
 *   3. validate-hardlinks     — ensures CLAUDE/GEMINI/QWEN/CODEX share
 *                                AGENTS.md inode (non-fatal by default;
 *                                use --strict-links to fail on missing)
 *                                (dev/scripts/)
 *   4. update-project-meta    — idempotent: bumps INDEX version + appends
 *                                history row only when structural digest
 *                                actually changed
 *                                (.magic/scripts/)
 *   5. sync-docs              — regenerates CONTRIBUTING from template,
 *                                propagates Triggers/Slash command into
 *                                docs/{name}.md, refreshes Sync Note only
 *                                on real workflow-source change
 *                                (dev/scripts/)
 *
 * Skip flags: --skip-meta, --skip-docs, --skip-links
 * Strict mode: --strict-links (missing CLAUDE/GEMINI/etc. is fatal)
 * Dry run:    --dry-run (no physical writes; honored by writeFileSafe)
 */

const devScriptsDir = __dirname;
const magicScriptsDir = path.join(__dirname, '../../.magic/scripts');

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
 * Executes a sub-sync script by absolute path. The dry-run flag is propagated
 * via the MAGIC_DRY_RUN environment variable (inherited by child processes).
 *
 * @param {string} scriptPath - Absolute path to the script.
 * @param {string[]} [extraArgs=[]] - Extra CLI args to forward.
 * @param {{ tolerant?: boolean }} [opts] - When tolerant, non-zero exit
 *        does not abort the pipeline (used for hardlink validation).
 */
function runScript(scriptPath, extraArgs = [], opts = {}) {
    if (!fs.existsSync(scriptPath)) {
        console.warn(`⚠️  Script not found, skipping: ${scriptPath}`);
        return;
    }

    const argString = extraArgs.length ? ' ' + extraArgs.map(a => `"${a}"`).join(' ') : '';
    try {
        execSync(`node "${scriptPath}"${argString}`, { stdio: 'inherit' });
    } catch (e) {
        if (opts.tolerant) {
            console.warn(`⚠️  ${path.basename(scriptPath)} exited non-zero (tolerant).`);
            return;
        }
        console.error(`❌ ${path.basename(scriptPath)} failed.`);
        process.exit(1);
    }
}

function main() {
    console.log('🚀 Starting lifecycle synchronization...');

    // 1. Engine meta + version (stays in .magic/scripts/ — also used by user pre-commit hook)
    if (!rawArgs.includes('--skip-meta')) {
        runScript(path.join(magicScriptsDir, 'update-engine-meta.js'));
    }

    // 2. Release-facing version anchors (README markers)
    runScript(path.join(devScriptsDir, 'sync-manifests.js'));

    // 3. Hardlink validation — tolerant unless --strict-links
    if (!rawArgs.includes('--skip-links')) {
        runScript(
            path.join(devScriptsDir, 'validate-hardlinks.js'),
            strictLinks ? ['--strict'] : [],
            { tolerant: !strictLinks }
        );
    }

    // 4. Project meta (idempotent: only bumps INDEX when structural digest changes)
    runScript(path.join(magicScriptsDir, 'update-project-meta.js'));

    // 5. Docs (CONTRIBUTING + docs/*.md content sync)
    if (!rawArgs.includes('--skip-docs')) {
        runScript(path.join(devScriptsDir, 'sync-docs.js'));
    }

    const tail = dryRun ? '(dry-run — no files modified)' : 'COMPLETED.';
    console.log(`✨ Lifecycle Sync: ${tail}`);
}

main();
