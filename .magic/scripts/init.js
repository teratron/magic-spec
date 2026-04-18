const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizePath } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// SDD INITIALIZER (Project Bootstrapper)
// ═══════════════════════════════════════════════════════════════════════════

const designDirRaw = process.env.MAGIC_DESIGN_DIR || '.design';
const designDir = path.resolve(designDirRaw);
const isGlobalRegistry = path.basename(designDir) === '.design';

// ───────────────────────────────────────────────────────────────────────────
// Helpers & Logic
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync('.git')) {
    console.log('Note: not a git repository. Proceeding with SDD initialization anyway.');
}

const date = new Date().toISOString().split('T')[0];

const templatesDir = path.join(__dirname, '..', 'templates');

/**
 * Reads a template and replaces placeholders.
 * @param {string} name Template filename.
 * @param {Record<string, string>} placeholders Mapping of keys to values.
 */
function getTemplate(name, placeholders = {}) {
    const filePath = path.join(templatesDir, name);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Template not found: ${name}. Using empty string.`);
        return '';
    }
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [key, val] of Object.entries(placeholders)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, val);
    }
    return content;
}

function createGlobalFiles() {
    if (!fs.existsSync(designDir)) fs.mkdirSync(designDir, { recursive: true });

    const workspacePath = path.join(designDir, 'workspace.json');
    if (!fs.existsSync(workspacePath)) {
        const content = getTemplate('workspace.json');
        fs.writeFileSync(workspacePath, content);
        console.log(`✅ Created ${normalizePath(workspacePath)}`);
    }

    const indexPath = path.join(designDir, 'INDEX.md');
    if (!fs.existsSync(indexPath)) {
        const content = getTemplate('global-index.md', { DATE: date });
        fs.writeFileSync(indexPath, content);
        console.log(`✅ Created ${normalizePath(indexPath)}`);
    }

    const rulesPath = path.join(designDir, 'RULES.md');
    if (!fs.existsSync(rulesPath)) {
        const content = getTemplate('rules.md', { DATE: date });
        fs.writeFileSync(rulesPath, content);
        console.log(`✅ Created ${normalizePath(rulesPath)}`);
    }
}

function initWorkspace(workspaceDir) {
    if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });

    const dirsToCreate = [
        path.join(workspaceDir, 'specifications'),
        path.join(workspaceDir, 'tasks'),
        path.join(workspaceDir, 'archives', 'tasks')
    ];

    dirsToCreate.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const indexPath = path.join(workspaceDir, 'INDEX.md');
    if (!fs.existsSync(indexPath)) {
        const content = getTemplate('workspace-index.md', { DATE: date });
        fs.writeFileSync(indexPath, content);
        console.log(`✅ Created ${normalizePath(indexPath)}`);
    }
}

if (isGlobalRegistry) {
    createGlobalFiles();
    initWorkspace(path.join(designDir, 'main'));
} else {
    initWorkspace(designDir);
}

// Auto-install Git hooks if in a git repo
if (fs.existsSync('.git')) {
    try {
        console.log('🔗 Installing Magic Git hooks...');
        const executorPath = path.join(__dirname, 'executor.js');
        execSync(`node "${executorPath}" install-hooks`, { stdio: 'inherit' });
    } catch (e) {
        console.warn('Note: Could not automatically install Git hooks.');
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Skill Synchronization (Agent Surface)
// ───────────────────────────────────────────────────────────────────────────

try {
    const syncSkills = require('./sync-skills');
    syncSkills();
} catch (e) {
    console.warn(`Note: Could not automatically sync skills: ${e.message}`);
}

