#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('init', module);

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
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

/** @param {string} p - Absolute path. @returns {string} The path as printed: project-relative, forward slashes. */
const shown = (p) => normalizePath(path.relative(projectRoot, p));

function createGlobalFiles() {
    if (!fs.existsSync(designDir)) fs.mkdirSync(designDir, { recursive: true });

    const workspacePath = path.join(designDir, 'workspace.json');
    if (!fs.existsSync(workspacePath)) {
        const content = getTemplate('workspace.json');
        fs.writeFileSync(workspacePath, content);
        console.log(`✅ Created ${shown(workspacePath)}`);
    }

    const indexPath = path.join(designDir, 'INDEX.md');
    if (!fs.existsSync(indexPath)) {
        const content = getTemplate('global-index.md', {
            DATE: date,
            ENGINE_VERSION: engineVersion,
        });
        fs.writeFileSync(indexPath, content);
        console.log(`✅ Created ${shown(indexPath)}`);
    }

    const rulesPath = path.join(designDir, 'RULES.md');
    if (!fs.existsSync(rulesPath)) {
        const content = getTemplate('rules.md', { DATE: date });
        fs.writeFileSync(rulesPath, content);
        console.log(`✅ Created ${shown(rulesPath)}`);
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
        console.log(`✅ Created ${shown(indexPath)}`);
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
    console.log('🔗 Installing Magic Git hooks...');
    const executorPath = path.join(__dirname, 'executor.js');
    // The installer's own words (a hook of the project's, a redirected hooks folder) are the
    // reason worth recording; they are shown as they come and kept for the digest.
    const installed = spawnSync(process.execPath, [executorPath, 'install-hooks'], {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'inherit', 'pipe'],
    });
    if (installed.stderr) process.stderr.write(installed.stderr);
    if (installed.status !== 0) {
        console.warn('Note: Could not automatically install Git hooks.');
        const reason =
            (installed.stderr || '').split('\n').find((line) => line.trim()) ||
            installed.error?.message ||
            `exit ${installed.status}`;
        diagnostics.record({
            severity: 'warning',
            source: 'init',
            code: 'GIT_HOOKS_NOT_INSTALLED',
            message: `Could not automatically install Git hooks: ${reason.trim()}`,
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
        console.log(
            `   ${LABELS[row.action] || row.action}: ${row.path}${row.detail ? ` — ${row.detail}` : ''}`,
        );
    }
}

// Version-control guidance: the engine and what is generated from it are installed
// dependencies; vendoring the engine instead needs one line so that line-ending conversion
// on another machine cannot make the integrity check fail.
const guidance = hosts.versionControlLines(requestedHosts, projectRoot);
console.log('');
console.log('📋 Add to .gitignore (the engine and what is generated from it are installed, like node_modules/):');
for (const line of guidance.ignore) console.log(`   ${line}`);
if (guidance.engineInProject) {
    console.log('   To commit the engine instead (vendoring), leave its folder out of .gitignore and add to .gitattributes:');
    console.log(`   /${guidance.engineInProject}/** -text`);
}
