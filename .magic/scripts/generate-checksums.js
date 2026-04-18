const fs = require('fs');
const path = require('path');
const { hashFileSafe, getAllFiles, normalizePath } = require('./utils');

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

    const projectRoot = path.join(MAGIC_DIR, '..');
    const scanZones = [
        { dir: MAGIC_DIR, relBase: MAGIC_DIR },
        { dir: path.join(projectRoot, 'workflows'), relBase: projectRoot },
        { dir: path.join(projectRoot, 'skills'), relBase: projectRoot }
    ];

    const checksums = {};

    const entries = [];
    scanZones.forEach(zone => {
        if (!fs.existsSync(zone.dir)) return;

        getAllFiles(zone.dir, []).forEach(fullPath => {
            const rel = normalizePath(path.relative(zone.relBase, fullPath));
            if (rel === CHECKSUMS_FILE) return;
            entries.push({ rel, fullPath });
        });
    });

    // Sort entries by relative path for reproducibility
    entries.sort((a, b) => a.rel.localeCompare(b.rel)).forEach(entry => {
        checksums[entry.rel] = hashFileSafe(entry.fullPath);
    });

    // Write to .checksums
    const output = JSON.stringify(checksums, null, 2);
    fs.writeFileSync(CHECKSUMS_PATH, output + '\n');

    console.log(`Successfully updated ${CHECKSUMS_PATH}`);
    console.log(`Files processed: ${Object.keys(checksums).length}`);
}

run();
