const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// MANIFEST SYNC (Version Parity across ecosystems)
// ═══════════════════════════════════════════════════════════════════════════

const projectRoot = process.cwd();
const magicDir = path.join(projectRoot, '.magic');
const versionFile = path.join(magicDir, '.version');

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function syncManifests() {
    if (!fs.existsSync(versionFile)) {
        console.error('❌ Version file (.magic/.version) not found. Run update-engine-meta first.');
        return;
    }

    const targetVersion = fs.readFileSync(versionFile, 'utf8').trim();
    console.log(`🔄 Syncing project ecosystem to version ${targetVersion}...`);

    // Installer versions are managed by installers/scripts/publish.py,
    // which reads .magic/.version directly. Engine core stays isolated.
    const manifests = [
        { name: 'package.json', file: 'package.json', regex: /"version":\s*"[^"]*"/, replace: `"version": "${targetVersion}"` },
        { name: 'pyproject.toml', file: 'pyproject.toml', regex: /(^version\s*=\s*"|(?:"version"\s*=\s*"))[^"]*"/m, replace: `$1${targetVersion}"` },
        { name: 'README.md', file: 'README.md', regex: /(\(v?\d+\.\d+\.\d+\))/g, replace: `(v${targetVersion})` }
    ];

    let changes = 0;

    manifests.forEach(m => {
        const fullPath = path.join(projectRoot, m.file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (m.regex.test(content)) {
                const newContent = content.replace(m.regex, m.replace);
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent);
                    console.log(`✅ Updated ${m.name}`);
                    changes++;
                } else {
                    console.log(`ℹ️ ${m.name} is already current.`);
                }
            } else {
                console.warn(`⚠️ Could not find version pattern in ${m.name}`);
            }
        }
    });

    console.log(`🚀 Manifest Sync: ${changes} updates made.`);
}

// Execute
syncManifests();
