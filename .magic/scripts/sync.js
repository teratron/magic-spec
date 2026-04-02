const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════
// ECOSYSTEM SYNC (Modular Orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

const magicDir = path.join(__dirname);
const args = process.argv.slice(2);

/**
 * Executes a sub-sync script.
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
    if (!args.includes('--skip-meta')) {
        runSubscript('update-engine-meta.js');
    }

    // 2. Sync Manifests
    runSubscript('sync-manifests.js');

    // 3. Update Project Meta
    runSubscript('update-project-meta.js');

    // 4. Sync Documentation
    if (!args.includes('--skip-docs')) {
        runSubscript('sync-docs.js');
    }

    console.log('✨ Lifecycle Sync: COMPLETED.');
}

main();
