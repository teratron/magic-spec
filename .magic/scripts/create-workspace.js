#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePath } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CREATE-WORKSPACE (l1-workspace-intent-routing.md WI-6)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Atomically registers a new workspace and provisions its directory tree.
 *
 * Usage:
 *   node .magic/scripts/executor.js create-workspace --name=<name>
 *     [--description="<text>"] [--default]
 *
 * Per WI-6 atomicity: validates name → mutates workspace.json →
 * provisions .design/{name}/ subtree. Failure of any step rolls back
 * the prior steps so the project state remains consistent.
 *
 * @returns {void} Exits process with non-zero on failure.
 */

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ───────────────────────────────────────────────────────────────────────────

const WORKSPACE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const args = process.argv.slice(2);
let name = null;
let description = null;
let makeDefault = false;
let dryRun = false;

for (const arg of args) {
    if (arg.startsWith('--name=')) {
        name = arg.slice('--name='.length);
    } else if (arg.startsWith('--description=')) {
        description = arg.slice('--description='.length).replace(/^["']|["']$/g, '');
    } else if (arg === '--default') {
        makeDefault = true;
    } else if (arg === '--dry-run') {
        dryRun = true;
    }
}

if (!name) {
    console.error('Usage: create-workspace --name=<name> [--description="..."] [--default] [--dry-run]');
    process.exit(1);
}

if (!WORKSPACE_NAME_RE.test(name)) {
    console.error(`HALT: Invalid workspace name '${name}'. Must match ${WORKSPACE_NAME_RE}.`);
    process.exit(1);
}

// ───────────────────────────────────────────────────────────────────────────
// Pre-flight (Atomicity Stage 1)
// ───────────────────────────────────────────────────────────────────────────

const designDir = path.resolve('.design');
const workspaceJsonPath = path.join(designDir, 'workspace.json');
const targetDir = path.join(designDir, name);

if (!fs.existsSync(designDir)) {
    console.error(`HALT: '.design/' does not exist. Run 'init' first to bootstrap the project.`);
    process.exit(1);
}

if (!fs.existsSync(workspaceJsonPath)) {
    console.error(`HALT: '.design/workspace.json' missing. Run 'init' first.`);
    process.exit(1);
}

let workspaceData;
try {
    workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
} catch (err) {
    console.error(`HALT: Failed to parse workspace.json: ${err.message}`);
    process.exit(1);
}

if (!workspaceData.workspaces || typeof workspaceData.workspaces !== 'object') {
    workspaceData.workspaces = {};
}

if (workspaceData.workspaces[name]) {
    console.error(`HALT: Workspace '${name}' already registered in workspace.json.`);
    process.exit(1);
}

if (fs.existsSync(targetDir)) {
    console.error(`HALT: Directory '.design/${name}/' already exists but is not registered. Resolve manually before retry.`);
    process.exit(1);
}

// ───────────────────────────────────────────────────────────────────────────
// Atomic Mutation (Stages 2-3 with rollback)
// ───────────────────────────────────────────────────────────────────────────

const subtree = [
    path.join(targetDir, 'specifications'),
    path.join(targetDir, 'tasks'),
    path.join(targetDir, 'archives', 'tasks')
];

const indexPath = path.join(targetDir, 'INDEX.md');
const templatePath = path.join(__dirname, '..', 'templates', 'workspace-index.md');

const date = new Date().toISOString().split('T')[0];

if (dryRun) {
    console.log(`[Dry-Run] Would register workspace '${name}' in workspace.json.`);
    console.log(`[Dry-Run] Would create:`);
    for (const dir of subtree) console.log(`  - ${normalizePath(dir)}`);
    console.log(`  - ${normalizePath(indexPath)}`);
    if (makeDefault) console.log(`[Dry-Run] Would set default to '${name}'.`);
    process.exit(0);
}

const created = [];

function rollback(reason) {
    console.error(`HALT: ${reason}. Rolling back partial creation.`);
    for (const p of created.reverse()) {
        try {
            const stat = fs.statSync(p);
            if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
            else fs.unlinkSync(p);
        } catch {
            // best-effort rollback
        }
    }
    process.exit(1);
}

try {
    // Stage 2: provision directory tree
    for (const dir of subtree) {
        fs.mkdirSync(dir, { recursive: true });
        created.push(dir);
    }

    // Stage 2b: write workspace INDEX.md from template
    if (fs.existsSync(templatePath)) {
        const tpl = fs.readFileSync(templatePath, 'utf8').replace(/\{\{DATE\}\}/g, date);
        fs.writeFileSync(indexPath, tpl);
        created.push(indexPath);
    }
} catch (err) {
    rollback(`Failed to provision directory tree: ${err.message}`);
}

// Stage 3: register in workspace.json (last — easiest to roll back)
const inferredDescription = description || `Workspace '${name}' (auto-created via create-workspace).`;
workspaceData.workspaces[name] = { description: inferredDescription };

if (makeDefault) {
    workspaceData.default = name;
}

try {
    const serialized = JSON.stringify(workspaceData, null, 2) + '\n';
    fs.writeFileSync(workspaceJsonPath, serialized);
} catch (err) {
    rollback(`Failed to update workspace.json: ${err.message}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Reporting
// ───────────────────────────────────────────────────────────────────────────

console.log(`✅ Created workspace '${name}'`);
console.log(`   - .design/${name}/specifications/`);
console.log(`   - .design/${name}/tasks/`);
console.log(`   - .design/${name}/archives/tasks/`);
console.log(`   - .design/${name}/INDEX.md`);
console.log(`   - registered in .design/workspace.json`);
if (makeDefault) {
    console.log(`   - set as default workspace`);
}
console.log(`(Revert: git restore .design/workspace.json && rm -rf .design/${name})`);
