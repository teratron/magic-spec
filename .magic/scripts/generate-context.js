const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION AND PATHS
// ═══════════════════════════════════════════════════════════════════════════

const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
const changelogPath = path.join(designDir, 'CHANGELOG.md');
const contextPath = path.join(designDir, 'CONTEXT.md');

// ───────────────────────────────────────────────────────────────────────────
// Directory Check
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(designDir) || !fs.statSync(designDir).isDirectory()) {
    console.error(`Error: ${designDir} directory not found`);
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT DOCUMENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const date = new Date().toISOString().split('T')[0];
let contextContent = `# Project Context\n\n**Generated:** ${date}\n\n## Active Technologies\n\n`;

// ───────────────────────────────────────────────────────────────────────────
// 1. Technology Discovery
// ───────────────────────────────────────────────────────────────────────────

let techList = '';
if (fs.existsSync('package.json')) techList += '- Node.js\n';
if (fs.existsSync('pyproject.toml')) techList += '- Python (uv/poetry/hatch)\n';
if (fs.existsSync('requirements.txt')) techList += '- Python\n';
if (fs.existsSync('Cargo.toml')) techList += '- Rust\n';
if (fs.existsSync('go.mod')) techList += '- Go\n';
if (fs.existsSync('Makefile')) techList += '- Make\n';

if (!techList) {
    contextContent += '- Unknown (no manifest detected)\n';
} else {
    contextContent += techList;
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Project Tree Generation
// ───────────────────────────────────────────────────────────────────────────

contextContent += '\n## Core Project Structure\n\n```plaintext\n';

/**
 * Recursively builds a directory tree representation.
 * 
 * @param {string} dir Source directory path.
 * @param {string} prefix Line prefix for indentation.
 * @param {number} currentDepth Current recursion level.
 * @param {number} maxDepth Maximum depth to traverse.
 * @param {string[]} ignores List of folder/file names to skip.
 * @returns {string} Markdown-formatted directory tree.
 */
function buildTree(dir, prefix, currentDepth, maxDepth, ignores, validScopes = null) {
    if (currentDepth > maxDepth) return '';
    let result = '';
    let files;
    try {
        files = fs.readdirSync(dir).filter(f => !ignores.includes(f)).sort();
        // If at root and validScopes is provided, filter allowed top-level directories
        if (currentDepth === 1 && validScopes && validScopes.length > 0) {
            files = files.filter(f => {
                // Ensure design directory is always visible
                if (f === '.design' || f === '.magic') return true;
                return validScopes.includes(f) || validScopes.some(s => s.startsWith(f + '/') || s.startsWith(f + '\\'));
            });
        }
    } catch (e) {
        return '';
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isLast = i === files.length - 1;
        const fullPath = path.join(dir, file);

        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { continue; }

        const branch = isLast ? '└── ' : '├── ';
        const name = stat.isDirectory() ? file + '/' : file;

        result += `${prefix}${branch}${name}\n`;

        if (stat.isDirectory()) {
            const nextPrefix = prefix + (isLast ? '    ' : '│   ');
            result += buildTree(fullPath, nextPrefix, currentDepth + 1, maxDepth, ignores, validScopes);
        }
    }
    return result;
}

const ignoreList = ['node_modules', 'target', '.git', '.venv', '__pycache__'];

// Extend ignoreList from .gitignore (Invariant 8: Gitignore Safety)
if (fs.existsSync('.gitignore')) {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    gitignoreContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        // Skip comments, empty lines, and negation patterns
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) return;
        // Extract simple directory/file names (strip trailing slashes and leading slashes)
        const clean = trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
        // Only add top-level directory/file names (no glob wildcards, no nested paths)
        if (clean && !clean.includes('/') && !clean.includes('*') && !ignoreList.includes(clean)) {
            ignoreList.push(clean);
        }
    });
}

let scopes = null;
if (process.env.MAGIC_WORKSPACE_SCOPE) {
    try {
        scopes = JSON.parse(process.env.MAGIC_WORKSPACE_SCOPE);
    } catch (e) {
        scopes = process.env.MAGIC_WORKSPACE_SCOPE.split(',').map(s => s.trim());
    }
    if (!Array.isArray(scopes)) scopes = [scopes];
}

try {
    contextContent += '.\n';
    contextContent += buildTree('.', '', 1, 2, ignoreList, scopes);
} catch (err) {
    contextContent += `- Project root\n  - ${designDir}/\n  - .magic/\n`;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Changelog Integration
// ───────────────────────────────────────────────────────────────────────────

contextContent += '```\n\n## Recent Changes\n\n';

if (fs.existsSync(changelogPath)) {
    const changelogText = fs.readFileSync(changelogPath, 'utf8');
    const lines = changelogText.trimEnd().split(/\r?\n/);
    const last15 = lines.slice(-15).join('\n');
    contextContent += last15 + '\n';
} else {
    contextContent += 'No recent changelog found.\n';
}

contextContent += '\n';

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

try {
    fs.writeFileSync(contextPath, contextContent);
    console.log(`Context document updated: ${contextPath}`);
} catch (e) {
    console.error(`Failed to write context document: ${e.message}`);
}
