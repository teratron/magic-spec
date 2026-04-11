const fs = require('fs');
const path = require('path');
const { hashFile, hashFileSafe, getAllFiles } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CHECKSUM GENERATOR (Kernel Integrity)
// ═══════════════════════════════════════════════════════════════════════════

const MAGIC_DIR = path.join(__dirname, '..');
const CHECKSUMS_FILE = '.checksums';
const CHECKSUMS_PATH = path.join(MAGIC_DIR, CHECKSUMS_FILE);
const historyDir = path.join(MAGIC_DIR, 'history');

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function run() {
    console.log('Generating checksums for .magic/ content...');

    const allFiles = getAllFiles(MAGIC_DIR);
    const checksums = {};

    // For reproducibility, we sort the files
    allFiles.sort().forEach((fullPath) => {
        const relativePath = path.relative(MAGIC_DIR, fullPath).replace(/\\/g, '/');

        // Skip the checksums file itself to avoid recursive hash changes
        if (relativePath === CHECKSUMS_FILE) return;

        checksums[relativePath] = hashFile(fullPath);
    });

    const historyFiles = fs.existsSync(historyDir)
        ? fs.readdirSync(historyDir).filter(f => f.endsWith('.md'))
        : [];

    historyFiles.forEach(file => {
        const fullPath = path.join(historyDir, file);
        checksums[`history/${file}`] = hashFileSafe(fullPath);
    });

    // Write to .checksums
    const output = JSON.stringify(checksums, null, 2);
    fs.writeFileSync(CHECKSUMS_PATH, output + '\n');

    console.log(`Successfully updated ${CHECKSUMS_PATH}`);
    console.log(`Files processed: ${Object.keys(checksums).length}`);
}

run();
