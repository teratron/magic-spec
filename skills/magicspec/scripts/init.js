#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
    normalizePath,
    engineRoot,
    parseFlags,
    resolveProjectRoot,
    STATE_DIR_NAME,
} = require('./utils');
const diagnostics = require('./lib/diagnostics');
const hosts = require('./lib/hosts');

// ═══════════════════════════════════════════════════════════════════════════
// SDD INITIALIZER (Project Bootstrapper)
// ═══════════════════════════════════════════════════════════════════════════

// `--host=<name>[,<name>]` also writes what each named host needs to find the engine
// (the rule, the command entries, the skill link). An unknown name, or a source that
// cannot be read, stops the run before anything is written.
const { values: initFlags, errors: initFlagErrors } = parseFlags(process.argv.slice(2), {
    valueFlags: ['--host'],
});
if (initFlagErrors.length > 0) {
    console.error(`HALT: ${initFlagErrors[0]}`);
    process.exit(1);
}
let requestedHosts = [];
if (initFlags['--host']) {
    const parsed = hosts.parseHosts(initFlags['--host']);
    if (parsed.unknown.length > 0) {
        console.error(
            `HALT: Unknown host '${parsed.unknown.join("', '")}'. Known hosts: ${Object.keys(hosts.HOSTS).join(', ')}.`,
        );
        process.exit(1);
    }
    try {
        hosts.readCommands();
        hosts.readRuleSource();
    } catch (err) {
        console.error(`HALT: ${err.message}`);
        process.exit(1);
    }
    requestedHosts = parsed.hosts;
}

const projectRoot = resolveProjectRoot();
const designDirRaw = process.env.MAGIC_DESIGN_DIR || STATE_DIR_NAME;
const designDir = path.resolve(projectRoot, designDirRaw);
const isGlobalRegistry = path.basename(designDir) === STATE_DIR_NAME;

// ───────────────────────────────────────────────────────────────────────────
// Helpers & Logic
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(path.join(projectRoot, '.git'))) {
    console.log('Note: not a git repository. Proceeding with SDD initialization anyway.');
}

const date = new Date().toISOString().split('T')[0];

const versionPath = path.join(engineRoot(), '.version');
const engineVersion = fs.existsSync(versionPath)
    ? fs.readFileSync(versionPath, 'utf8').trim()
    : 'unknown';

const templatesDir = path.join(engineRoot(), 'templates');

/**
 * Reads a template and replaces placeholders.
 * @param {string} name Template filename.
 * @param {Record<string, string>} placeholders Mapping of keys to values.
 */
function getTemplate(name, placeholders = {}) {
    const filePath = path.join(templatesDir, name);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Template not found: ${name}. Using empty string.`);
        diagnostics.record({
            severity: 'fix',
            source: 'init',
            code: 'TEMPLATE_MISSING',
            message: `Template not found: ${name}; used an empty string instead.`,
            locus: filePath,
        });
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
        const content = getTemplate('global-index.md', {
            DATE: date,
            ENGINE_VERSION: engineVersion,
        });
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
        path.join(workspaceDir, 'archives', 'tasks'),
    ];

    dirsToCreate.forEach((dir) => {
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
if (fs.existsSync(path.join(projectRoot, '.git'))) {
    try {
        console.log('🔗 Installing Magic Git hooks...');
        const executorPath = path.join(__dirname, 'executor.js');
        execSync(`node "${executorPath}" install-hooks`, { stdio: 'inherit', cwd: projectRoot });
    } catch (e) {
        console.warn('Note: Could not automatically install Git hooks.');
        diagnostics.record({
            severity: 'warning',
            source: 'init',
            code: 'GIT_HOOKS_NOT_INSTALLED',
            message: `Could not automatically install Git hooks: ${e.message}`,
        });
    }
}

// Host projections: the rule, the command entries and the skill link for each named host.
const LABELS = {
    written: '✅ Wrote',
    replaced: '♻️  Updated',
    unchanged: '= Unchanged',
    foreign: '⚠️  Left alone (not written by this engine)',
    'in place': '= In place',
    linked: '🔗 Linked',
    conflict: '⚠️  Left alone',
    unlinkable: '⚠️  Could not link',
};
for (const name of requestedHosts) {
    console.log(`🧩 ${hosts.HOSTS[name].label}`);
    for (const row of hosts.projectHost(name, projectRoot)) {
        console.log(`   ${LABELS[row.action] || row.action}: ${row.path}${row.detail ? ` — ${row.detail}` : ''}`);
    }
}
