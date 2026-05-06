#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe, isDryRun } = require('./utils');
const { ensureInitialized, bumpPatch, writeVersion } = require('./lib/project-version');
const { computeSignificance } = require('./lib/significance');
const { createIfMissing, appendBullet, releaseUnreleased } = require('./lib/changelog-writer');
const { buildCommitMessage, deriveChangelogCategory, buildChangelogBullet } = require('./lib/commit-suggester');
const { archiveCompletedPhases } = require('./lib/phase-archiver');

// ═══════════════════════════════════════════════════════════════════════════
// FINALIZATION PROTOCOL (Post-Workflow Orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Triggered by `/magic.spec`, `/magic.task`, `/magic.run`, `/magic.rule`
 * after the workflow's main steps complete and before its Completion
 * Checklist. Detects significant artifact changes, bumps the project's
 * patch version, appends a CHANGELOG entry, and prints a structured stdout
 * block for the calling agent to relay to the user verbatim.
 *
 * Hard rule: this script NEVER invokes `git commit`, `git add`, or any
 * write-side git operation. Read-only git probes only.
 */

// ───────────────────────────────────────────────────────────────────────────
// Paths & Constants
// ───────────────────────────────────────────────────────────────────────────

const projectRoot = path.resolve(__dirname, '..', '..');
const magicDir = path.join(projectRoot, '.magic');
const stateFile = path.join(magicDir, '.finalize-state.json');

const VALID_WORKFLOWS = new Set(['spec', 'task', 'run', 'rule']);

// ───────────────────────────────────────────────────────────────────────────
// Argument Parsing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Parses argv into a normalized options object.
 *
 * @returns {{
 *   workflow: string|null,
 *   workspace: string|null,
 *   dryRun: boolean,
 *   noBump: boolean,
 *   noChangelog: boolean,
 *   noCommitMsg: boolean,
 *   force: boolean,
 * }}
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        workflow: null,
        workspace: null,
        dryRun: false,
        noBump: false,
        noChangelog: false,
        noCommitMsg: false,
        force: false,
    };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--workflow=')) opts.workflow = a.split('=')[1];
        else if (a === '--workflow' && args[i + 1]) opts.workflow = args[++i];
        else if (a.startsWith('--workspace=')) opts.workspace = a.split('=')[1];
        else if (a === '--workspace' && args[i + 1]) opts.workspace = args[++i];
        else if (a === '--dry-run') opts.dryRun = true;
        else if (a === '--no-bump') opts.noBump = true;
        else if (a === '--no-changelog') opts.noChangelog = true;
        else if (a === '--no-commit-msg') opts.noCommitMsg = true;
        else if (a === '--force') opts.force = true;
    }
    return opts;
}

// ───────────────────────────────────────────────────────────────────────────
// Workspace & Config Resolution
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolves the active workspace from CLI flag, env vars, or workspace.json default.
 *
 * @param {string|null} cliWorkspace
 * @returns {string}
 */
function resolveWorkspace(cliWorkspace) {
    if (cliWorkspace) return cliWorkspace;
    if (process.env.MAGIC_WORKSPACE) return process.env.MAGIC_WORKSPACE;

    const envDir = process.env.MAGIC_DESIGN_DIR;
    if (envDir && envDir !== '.design') return path.basename(envDir);

    const workspaceJson = path.join(projectRoot, '.design', 'workspace.json');
    if (fs.existsSync(workspaceJson)) {
        try {
            const data = JSON.parse(fs.readFileSync(workspaceJson, 'utf8'));
            if (data.default) return data.default;
        } catch (e) {
            throw new Error(`Cannot parse .design/workspace.json: ${e.message}`);
        }
    }
    throw new Error('No workspace specified. Pass --workspace=<name> or set MAGIC_WORKSPACE.');
}

/**
 * Loads the `finalization` section from workspace.json, applying defaults.
 *
 * @returns {{
 *   enabled: boolean,
 *   autoBump: boolean,
 *   autoChangelog: boolean,
 *   suggestCommit: boolean,
 *   changelogPath: string,
 *   versionPath: string,
 * }}
 */
function loadConfig() {
    const defaults = {
        enabled: true,
        autoBump: true,
        autoChangelog: true,
        suggestCommit: true,
        changelogPath: 'CHANGELOG.md',
        versionPath: '.design/.version',
    };
    const workspaceJson = path.join(projectRoot, '.design', 'workspace.json');
    if (!fs.existsSync(workspaceJson)) return defaults;
    try {
        const data = JSON.parse(fs.readFileSync(workspaceJson, 'utf8'));
        return Object.assign({}, defaults, data.finalization || {});
    } catch {
        return defaults;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// State File
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {Object}
 */
function readState() {
    if (!fs.existsSync(stateFile)) return {};
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
        return {};
    }
}

/**
 * @param {Object} state
 */
function writeState(state) {
    writeFileSafe(stateFile, JSON.stringify(state, null, 2) + '\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Output Formatting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Emits the "no significant changes" block to stdout.
 *
 * @param {string} workflow
 * @param {string} workspace
 * @param {string[]} patterns
 * @param {string} version
 */
function emitSkip(workflow, workspace, patterns, version) {
    process.stdout.write([
        `⏭️  No significant changes detected for magic.${workflow} on workspace '${workspace}'.`,
        `Whitelist checked: ${patterns.length ? patterns.join(', ') : '(none)'}.`,
        `Project version unchanged: ${version}.`,
        '',
    ].join('\n'));
}

/**
 * Emits the full "finalization complete" block to stdout.
 *
 * @param {Object} ctx
 */
function emitSuccess(ctx) {
    const {
        workflow, workspace, previous, next,
        files, gitAvailable, changelogResult, commitMsg,
        archivedPhases,
        opts,
    } = ctx;

    const lines = [
        `✅ Finalization complete`,
        ``,
        `| Field | Value |`,
        `| --- | --- |`,
        `| Workflow | magic.${workflow} |`,
        `| Workspace | ${workspace} |`,
        `| Project version | ${previous} → ${next} |`,
        `| Detected changes | ${files.length} file(s) |`,
    ];

    if (changelogResult) {
        const clStatus = changelogResult.deduped
            ? 'skipped (duplicate)'
            : changelogResult.formatWarning
                ? 'prepended with warning (non-standard format)'
                : `appended to [Unreleased] § ${changelogResult.category}`;
        lines.push(`| CHANGELOG | ${clStatus} |`);
    }

    lines.push(`| Git mode | ${gitAvailable ? 'git diff' : 'snapshot fallback'} |`);
    lines.push(``);
    lines.push(`### Changed artifacts`);
    lines.push(``);

    for (const f of files) {
        const numstat = (f.added || f.deleted) ? ` (+${f.added} -${f.deleted})` : '';
        lines.push(`- \`${f.path}\` [${f.status}]${numstat}`);
    }

    if (archivedPhases && archivedPhases.length > 0) {
        lines.push(``);
        lines.push(`### Archived phases`);
        lines.push(``);
        for (const { file, name } of archivedPhases) {
            lines.push(`- \`${file}\`${name ? ` — ${name}` : ''} → \`archives/tasks/${file}\``);
        }
    }

    if (!opts.noCommitMsg && commitMsg) {
        lines.push(``);
        lines.push(`### Suggested commit message`);
        lines.push(``);
        lines.push('```');
        lines.push(commitMsg);
        lines.push('```');
    }

    lines.push(``);
    lines.push(`> [!IMPORTANT]`);
    lines.push(`> Auto-commit is **disabled by design**. Review the diff and run git commit manually.`);
    lines.push(``);

    process.stdout.write(lines.join('\n'));
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

function main() {
    if (process.env.MAGIC_FINALIZE === '0' || process.env.MAGIC_FINALIZE === 'false') {
        console.log('⏭️  Finalization disabled via MAGIC_FINALIZE=0.');
        return 0;
    }

    const opts = parseArgs();
    if (opts.dryRun) process.env.MAGIC_DRY_RUN = '1';

    if (!opts.workflow || !VALID_WORKFLOWS.has(opts.workflow)) {
        console.error(`❌ Invalid or missing --workflow. Expected: ${[...VALID_WORKFLOWS].map((w) => `magic.${w}`).join(', ')}.`);
        return 1;
    }

    const config = loadConfig();
    if (!config.enabled) {
        console.log(`⏭️  Finalization disabled in workspace.json (finalization.enabled = false).`);
        return 0;
    }

    const designAbs = path.join(projectRoot, '.design');
    if (!fs.existsSync(designAbs)) {
        console.error(`❌ .design/ not found at ${designAbs}. Run /magic.spec to bootstrap.`);
        return 1;
    }

    let workspace;
    try {
        workspace = resolveWorkspace(opts.workspace);
    } catch (e) {
        console.error(`❌ ${e.message}`);
        return 1;
    }

    const versionPath = path.resolve(projectRoot, config.versionPath);
    const changelogPath = path.resolve(projectRoot, config.changelogPath);

    const initState = ensureInitialized(versionPath);
    const currentVersion = initState.version;

    const state = readState();
    const sig = computeSignificance({
        cwd: projectRoot,
        workflow: `magic.${opts.workflow}`,
        workspace,
        lastSnapshot: state.lastSnapshot || {},
    });

    if (!sig.significant && !opts.force) {
        emitSkip(opts.workflow, workspace, sig.patterns, currentVersion);
        const nextState = Object.assign({}, state, {
            lastCheckedAt: new Date().toISOString(),
            lastWorkflow: `magic.${opts.workflow}`,
            lastWorkspace: workspace,
            lastSnapshot: sig.nextSnapshot,
        });
        writeState(nextState);
        return 0;
    }

    // ── Version bump ────────────────────────────────────────────────────────
    let previous = currentVersion;
    let next = currentVersion;
    if (config.autoBump && !opts.noBump) {
        next = bumpPatch(currentVersion);
        writeVersion(versionPath, next);
    }

    // ── CHANGELOG ───────────────────────────────────────────────────────────
    let changelogResult = null;
    if (config.autoChangelog && !opts.noChangelog) {
        try {
            createIfMissing(changelogPath);
            const category = deriveChangelogCategory(opts.workflow, sig.files);
            const bullet = buildChangelogBullet(opts.workflow, workspace, sig.files);
            const result = appendBullet(changelogPath, category, bullet);
            changelogResult = { ...result, category, bullet };

            if (changelogResult.formatWarning) {
                console.warn(`⚠️  CHANGELOG.md does not follow Keep-a-Changelog format. Prepended with marker. Consider migrating.`);
            }
        } catch (e) {
            console.warn(`⚠️  Could not update CHANGELOG.md: ${e.message}`);
        }
    }

    // ── Phase archival (magic.run only) ─────────────────────────────────────
    let archivedPhases = [];
    if (opts.workflow === 'run') {
        try {
            const wsDir = process.env.MAGIC_DESIGN_DIR
                ? path.resolve(projectRoot, process.env.MAGIC_DESIGN_DIR)
                : path.join(designAbs, workspace);
            const archiveResult = archiveCompletedPhases(wsDir, { dryRun: opts.dryRun });
            archivedPhases = archiveResult.archived;
            if (archiveResult.skipped.length > 0) {
                console.warn(`⚠  Phase archival: skipped ${archiveResult.skipped.length} already-archived file(s).`);
            }
        } catch (e) {
            console.warn(`⚠  Phase archival warning: ${e.message}`);
        }
    }

    // ── Commit message ──────────────────────────────────────────────────────
    let commitMsg = null;
    if (config.suggestCommit && !opts.noCommitMsg) {
        commitMsg = buildCommitMessage({
            workflow: opts.workflow,
            workspace,
            previousVersion: previous,
            nextVersion: next,
            files: sig.files,
        });
    }

    emitSuccess({
        workflow: opts.workflow,
        workspace,
        previous,
        next,
        files: sig.files,
        gitAvailable: sig.gitAvailable,
        changelogResult,
        commitMsg,
        archivedPhases,
        opts,
    });

    const nextState = {
        lastVersion: next,
        lastBumpAt: new Date().toISOString(),
        lastWorkflow: `magic.${opts.workflow}`,
        lastWorkspace: workspace,
        lastSnapshot: sig.nextSnapshot,
    };
    writeState(nextState);
    return 0;
}

// Execute
try {
    process.exit(main());
} catch (error) {
    console.error(`❌ Finalization failed: ${error.message}`);
    if (process.env.MAGIC_DEBUG) console.error(error.stack);
    process.exit(1);
}
