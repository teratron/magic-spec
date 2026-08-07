#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe, isDryRun, mkdirSafe, parseFlags, WORKSPACE_NAME_RE } = require('./utils');
const { ensureInitialized, bumpPatch, writeVersion } = require('./lib/project-version');
const { computeSignificance, gitChangedPaths, gitFileStatus, gitFileNumstat } = require('./lib/significance');
const { createIfMissing, appendBullet, releaseUnreleased } = require('./lib/changelog-writer');
const { buildCommitMessage, deriveChangelogCategory, buildChangelogBullet } = require('./lib/commit-suggester');
const { archiveCompletedPhases } = require('./lib/phase-archiver');
const { updateState } = require('./update-state');
const diagnostics = require('./lib/diagnostics');

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
const designCacheDir = path.join(projectRoot, '.design', '.cache');
const stateFile = path.join(designCacheDir, 'finalize-state.json');

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
    const { values, flags, errors } = parseFlags(process.argv.slice(2), {
        valueFlags: ['--workflow', '--workspace'],
        boolFlags: ['--dry-run', '--no-bump', '--no-changelog', '--no-commit-msg', '--force'],
    });

    if (errors.length > 0) {
        console.error(`❌ ${errors[0]}`);
        process.exit(1);
    }

    const workspace = values['--workspace'] || null;
    // Reaches `path.join(designAbs, workspace)` on direct invocation (no
    // MAGIC_DESIGN_DIR), so it must satisfy the same guard executor.js applies.
    if (workspace && !WORKSPACE_NAME_RE.test(workspace)) {
        console.error(`❌ Invalid workspace name '${workspace}'. Must match ${WORKSPACE_NAME_RE}.`);
        process.exit(1);
    }

    return {
        workflow: values['--workflow'] || null,
        workspace,
        dryRun: Boolean(flags['--dry-run']),
        noBump: Boolean(flags['--no-bump']),
        noChangelog: Boolean(flags['--no-changelog']),
        noCommitMsg: Boolean(flags['--no-commit-msg']),
        force: Boolean(flags['--force']),
    };
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
// Session-State Update (SC-2)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Commands that must never appear in a synthesized `Next Action`.
 *
 * `rules/magic.md` §5 reserves `/magic.spec` to a real `/magic.task` Pre-flight
 * HALT and keeps `/magic.analyze` on-demand. The constraint is enforced on the
 * field rather than per-branch because STATE.md `Next Action` carries no
 * provenance: `/magic.status` replays it verbatim, so a line written by one
 * workflow is read back in the context of another.
 *
 * @type {RegExp}
 */
const RESERVED_COMMAND_RE = /\/magic\.(spec|analyze)/;

/**
 * Computes the post-workflow `Next Action` for STATE.md and enforces the §5
 * reserved-command invariant on the result.
 *
 * The guard is deliberately placed at the single exit rather than on each
 * branch of the synthesis: an earlier fix corrected only the `run` branch and
 * left `task` emitting `/magic.spec`, which is the regression this closes.
 * A violation degrades to the planning funnel with a warning — `finalize` is
 * non-blocking by contract and must never abort over a recommendation string.
 *
 * @param {string} workflow - `spec|task|run|rule`.
 * @param {string} workspace
 * @param {string} wsDir - Absolute path to the workspace design directory.
 * @returns {string}
 */
function computeNextAction(workflow, workspace, wsDir) {
    const next = synthesizeNextAction(workflow, workspace, wsDir);
    if (RESERVED_COMMAND_RE.test(next)) {
        const message = `Next Action "${next}" names a command reserved by ` +
            `rules/magic.md §5; substituting the /magic.task funnel.`;
        console.warn(`[state] ${message}`);
        diagnostics.record({
            severity: 'fix', source: 'finalize', code: 'NEXT_ACTION_SUBSTITUTED',
            message, locus: 'STATE.md',
        });
        return `Run /magic.task ${workspace} to plan`;
    }
    return next;
}

/**
 * Reports whether a phase is blocked, reading its two independent signals: the
 * phase file's own frontmatter `status:` and its registry row in TASKS.md.
 *
 * Either signal alone is authoritative. The two are written by different steps
 * and are not updated atomically, so requiring agreement would wave a
 * half-applied transition straight through the guard.
 *
 * @param {string} phaseContent - Phase file source.
 * @param {string} tasksContent - TASKS.md source.
 * @param {string} phaseNo - Phase number as it appears in the file name.
 * @returns {boolean}
 */
function isPhaseBlocked(phaseContent, tasksContent, phaseNo) {
    const frontmatter = phaseContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatter && /^status:\s*["']?Blocked["']?\s*$/im.test(frontmatter[1])) return true;

    const row = tasksContent.match(
        new RegExp(`^\\| \\[Phase ${phaseNo}\\]\\([^)]*\\)[^\\n]*$`, 'm')
    );
    return row ? /\bBlocked\b/.test(row[0]) : false;
}

/**
 * Derives the raw recommendation from the plan ledger, following pipeline
 * order (spec → task → run). Plan-state-aware per SC-2.1
 * (l1-session-continuity.md): for task/run the recommendation comes from the
 * actual plan state (open tasks → run; plan complete → replan), never a fixed
 * "execute the active phase" against an empty plan.
 *
 * Callers should use {@link computeNextAction}, which applies the §5 guard.
 *
 * @param {string} workflow - `spec|task|run|rule`.
 * @param {string} workspace
 * @param {string} wsDir - Absolute path to the workspace design directory.
 * @returns {string}
 */
function synthesizeNextAction(workflow, workspace, wsDir) {
    // spec/rule changes require (re)planning before execution — the plan must
    // absorb the amended specs/rules first (pipeline order).
    if (workflow === 'spec') return `Run /magic.task ${workspace} to update the plan`;
    if (workflow === 'rule') return `Run /magic.task ${workspace} to revalidate the plan against amended rules`;

    // task/run: derive the next step from the actual plan state (SC-2.1).
    // Three-tier lookup: inline TASKS.md → phase files → registry table.
    const openTaskRe = /^- \[ \] \[(T-[A-Za-z0-9.]+)\] (.+)$/m;
    try {
        const tasks = fs.readFileSync(path.join(wsDir, 'TASKS.md'), 'utf8');

        // 1. Inline checkboxes in TASKS.md (legacy / flat format).
        const inlineOpen = tasks.match(openTaskRe);
        if (inlineOpen) return `Execute ${inlineOpen[1]} ${inlineOpen[2]} via /magic.run ${workspace}`;

        // 2. Phase files — canonical two-level format (tasks/phase-N.md).
        const tasksDir = path.join(wsDir, 'tasks');
        if (fs.existsSync(tasksDir)) {
            const phaseFiles = fs.readdirSync(tasksDir)
                .filter(f => /^phase-\d+\.md$/.test(f))
                .sort((a, b) => {
                    const na = parseInt(a.match(/\d+/)[0], 10);
                    const nb = parseInt(b.match(/\d+/)[0], 10);
                    return na - nb;
                });
            for (const file of phaseFiles) {
                const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
                const openTask = content.match(openTaskRe);
                if (!openTask) continue;
                // Blocked is not Done, so a blocked phase still has open
                // checklist lines — matching one is not licence to recommend it.
                // Dispatching a resuming session into the very blocker the same
                // STATE.md records would make the file contradict itself.
                if (isPhaseBlocked(content, tasks, file.match(/\d+/)[0])) {
                    return `Resolve blocker on ${openTask[1]} (${workspace}) — ` +
                        `see STATE.md ## Blockers, then run /magic.run ${workspace}`;
                }
                return `Execute ${openTask[1]} ${openTask[2]} via /magic.run ${workspace}`;
            }
        }

        // 3. Registry table fallback — non-Done phase means work remains.
        const activePhase = tasks.match(
            /\| \[Phase (\d+)\]\([^)]+\) \|[^|]+\| `(?!Done)([^`]+)` \|/
        );
        if (activePhase) return `Continue Phase ${activePhase[1]} via /magic.run ${workspace}`;

        // No open tasks anywhere → plan complete. The recommendation is
        // uniform across workflows (SC-2.1 + rules/magic.md §5): new scope
        // enters through the /magic.task funnel, whose Pre-flight raises the
        // HALT that sanctions spec authoring. Naming /magic.spec here would
        // short-circuit that funnel — and, because /magic.status replays this
        // field verbatim, would resurface after /magic.run where §5 forbids it.
        return `Plan complete — run /magic.task ${workspace} to plan new scope`;
    } catch {
        return `Run /magic.task ${workspace} to plan`;
    }
}

/**
 * SC-2: patches STATE.md after every finalize invocation — significant or
 * not — so live memory reflects each completed command. Non-blocking:
 * failures degrade to a warning and never abort finalization.
 *
 * @param {Object} opts - Parsed CLI options.
 * @param {string} workspace
 * @param {string} designAbs - Absolute `.design/` path.
 * @returns {{updated: boolean, dryRun?: boolean, nextAction?: string}}
 */
function updateSessionState(opts, workspace, designAbs) {
    const wsDir = process.env.MAGIC_DESIGN_DIR
        ? path.resolve(projectRoot, process.env.MAGIC_DESIGN_DIR)
        : path.join(designAbs, workspace);
    const nextAction = computeNextAction(opts.workflow, workspace, wsDir);
    if (opts.dryRun) {
        console.log(`[state] (dry-run) Would patch STATE.md: Updated=<now>, Next Action="${nextAction}", auto-progress recompute.`);
        return { updated: false, dryRun: true, nextAction };
    }
    try {
        updateState(wsDir, { nextAction }, { autoProgress: true });
        return { updated: true, nextAction };
    } catch (e) {
        console.warn(`⚠  STATE.md update skipped (non-blocking): ${e.message}`);
        diagnostics.record({
            severity: 'error', source: 'finalize', code: 'STATE_UPDATE_SKIPPED',
            message: `STATE.md update skipped (non-blocking): ${e.message}`, locus: 'STATE.md',
        });
        return { updated: false };
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Changed-File Enumeration (SC-3.1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Upper bound on files listed in a suggested commit message or the stdout
 * artifact listing. Beyond it the output states how many were omitted.
 *
 * @type {number}
 */
const MAX_LISTED_FILES = 15;

/**
 * Enumerates every file changed in the working tree, for output the user reads
 * before committing — the suggested message body and the stdout listing.
 *
 * Deliberately wider than the significance whitelist. Significance answers
 * "should this bump the version" and is correctly scoped to SDD artifacts;
 * this answers "what is the user about to stage", and for a task-execution
 * finalize the task's own product-code deliverable is outside the whitelist by
 * construction. Header derivation keeps reading the whitelist subset.
 *
 * @param {Array<{path: string}>} fallbackFiles - Used when git is unavailable.
 * @returns {{files: Array<Object>, omitted: number}}
 */
function collectChangedFiles(fallbackFiles) {
    const probe = gitChangedPaths(projectRoot);
    if (!probe.available || probe.paths.length === 0) {
        return { files: fallbackFiles, omitted: 0 };
    }
    const capped = probe.paths.slice(0, MAX_LISTED_FILES);
    return {
        files: capped.map((p) => ({
            path: p,
            status: gitFileStatus(projectRoot, p),
            ...gitFileNumstat(projectRoot, p),
        })),
        omitted: probe.paths.length - capped.length,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Non-Bumping Commit Suggestion (SC-3)
// ───────────────────────────────────────────────────────────────────────────

/**
 * SC-3 fallback: when the significance whitelist misses but the working
 * tree changed, still emit exactly one suggested commit message — labeled
 * non-bumping (no version bump, no CHANGELOG entry). Suggestion only:
 * this script never invokes write-side git operations.
 *
 * @param {Object} opts - Parsed CLI options.
 * @param {string} workspace
 * @param {string} version - Current (unchanged) project version.
 * @returns {void}
 */
function emitFallbackCommitSuggestion(opts, workspace, version) {
    const { files, omitted } = collectChangedFiles([]);
    if (files.length === 0) return;

    // Workflow summary heuristics target whitelist artifacts; these files are
    // off-whitelist by definition, so a neutral header is the honest one.
    const msg = buildCommitMessage({
        workflow: opts.workflow,
        workspace,
        previousVersion: version,
        nextVersion: version,
        files,
        type: 'chore',
        summary: `update ${files.length + omitted} changed file${files.length + omitted !== 1 ? 's' : ''}`,
    });

    process.stdout.write([
        '',
        '### Suggested commit message (non-bumping)',
        '',
        '```',
        msg + (omitted > 0 ? `\n(+${omitted} more changed file${omitted !== 1 ? 's' : ''})` : ''),
        '```',
        '',
    ].join('\n'));
    // Auto-commit notice moved to emitTail() — one shared rendering, called
    // once per invocation regardless of which path produced this suggestion.
    // The trailing blank element above is still needed: it is what gives
    // emitTail()'s own leading blank a gap to pair with, matching how every
    // other block boundary in this file's output is spaced.
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
    mkdirSafe(path.dirname(stateFile));
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
 * Renders the change-count cell. The two numbers answer different questions —
 * how much changed, and how much of it drove the version bump — so the cell
 * names both whenever they differ.
 *
 * @param {number} total - Files changed in the working tree.
 * @param {number} [whitelisted] - Files matching the significance whitelist.
 * @returns {string}
 */
function describeChangeCounts(total, whitelisted) {
    if (whitelisted === undefined || whitelisted === total) return `${total} file(s)`;
    return `${total} file(s) — ${whitelisted} whitelisted`;
}

/**
 * Emits the full "finalization complete" block to stdout.
 *
 * @param {Object} ctx
 */
function emitSuccess(ctx) {
    const {
        workflow, workspace, previous, next,
        files, omitted = 0, whitelistCount, gitAvailable, changelogResult, commitMsg,
        archivedPhases, stateResult, diagnosticsCount,
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
        `| Detected changes | ${describeChangeCounts(files.length + omitted, whitelistCount)} |`,
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
    if (stateResult) {
        const stateStatus = stateResult.updated
            ? 'updated (SC-2)'
            : stateResult.dryRun ? 'dry-run preview' : 'skipped (warning above)';
        lines.push(`| STATE.md | ${stateStatus} |`);
    }
    // DG-7: a row that renders on every invocation regardless of content is a
    // row nobody reads — present only when there is something to report.
    if (diagnosticsCount && diagnosticsCount.total > 0) {
        const parts = [];
        if (diagnosticsCount.error > 0) parts.push(`${diagnosticsCount.error} error${diagnosticsCount.error !== 1 ? 's' : ''}`);
        if (diagnosticsCount.warning > 0) parts.push(`${diagnosticsCount.warning} warning${diagnosticsCount.warning !== 1 ? 's' : ''}`);
        if (diagnosticsCount.fix > 0) parts.push(`${diagnosticsCount.fix} fix${diagnosticsCount.fix !== 1 ? 'es' : ''}`);
        lines.push(`| Diagnostics | ${diagnosticsCount.total} finding(s): ${parts.join(', ')} — see below |`);
    }
    lines.push(``);
    lines.push(`### Changed artifacts`);
    lines.push(``);

    for (const f of files) {
        const numstat = (f.added || f.deleted) ? ` (+${f.added} -${f.deleted})` : '';
        lines.push(`- \`${f.path}\` [${f.status}]${numstat}`);
    }
    if (omitted > 0) {
        lines.push(`- _(+${omitted} more changed file${omitted !== 1 ? 's' : ''} not listed)_`);
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

    // Auto-commit notice, diagnostics digest, and next step all render once,
    // from emitTail() — never here (that split is what keeps their order
    // identical to the skip path's). The trailing blank line is kept so
    // emitTail()'s own leading blank still produces a gap at the boundary.
    lines.push(``);
    process.stdout.write(lines.join('\n'));
}

/**
 * Renders the terminal block shared by both finalize exit paths, in a fixed
 * order (l1-engine-diagnostics.md DG-5): the auto-commit notice, the engine
 * diagnostics digest (omitted entirely when there is nothing to report —
 * DG-7), then the next step (DG-6) — the exact string this invocation
 * persisted to STATE.md, never recomputed. Neither `emitSkip()` nor
 * `emitSuccess()` may render any of these three blocks; that prohibition is
 * the whole mechanism by which the two exit paths cannot drift apart.
 *
 * @param {{nextAction?: string, findings?: Object[]}} ctx
 * @returns {void}
 */
function emitTail(ctx) {
    const { nextAction, findings = [] } = ctx;

    const lines = [
        '',
        '> [!IMPORTANT]',
        '> Auto-commit is **disabled by design**. Review the diff and run git commit manually.',
        '',
    ];

    const digest = diagnostics.formatDigest(findings);
    if (digest.length > 0) {
        lines.push(...digest, '');
    }

    if (nextAction) {
        lines.push('### Next step', '', nextAction, '');
    }

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
        // SC-2: live memory reflects every completed command, bump or not.
        const stateResult = updateSessionState(opts, workspace, designAbs);
        // SC-3: real-but-non-whitelisted changes still get one suggestion.
        if (config.suggestCommit && !opts.noCommitMsg) {
            emitFallbackCommitSuggestion(opts, workspace, currentVersion);
        }
        // DG-4.1: a preview must not consume what the real run would report.
        const findings = opts.dryRun ? diagnostics.read() : diagnostics.drain();
        emitTail({ nextAction: stateResult.nextAction, findings });
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
                diagnostics.record({
                    severity: 'fix', source: 'finalize', code: 'CHANGELOG_FORMAT_NONSTANDARD',
                    message: 'CHANGELOG.md does not follow Keep-a-Changelog format; entry prepended with a marker.',
                    locus: 'CHANGELOG.md', remedy: 'Consider migrating CHANGELOG.md to Keep-a-Changelog format.',
                });
            }
        } catch (e) {
            console.warn(`⚠️  Could not update CHANGELOG.md: ${e.message}`);
            diagnostics.record({
                severity: 'error', source: 'finalize', code: 'CHANGELOG_WRITE_FAILED',
                message: `Could not update CHANGELOG.md: ${e.message}`, locus: 'CHANGELOG.md',
            });
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
                diagnostics.record({
                    severity: 'warning', source: 'finalize', code: 'PHASE_ARCHIVE_SKIPPED',
                    message: `Phase archival skipped ${archiveResult.skipped.length} already-archived file(s).`,
                });
            }
        } catch (e) {
            console.warn(`⚠  Phase archival warning: ${e.message}`);
            diagnostics.record({
                severity: 'error', source: 'finalize', code: 'PHASE_ARCHIVE_FAILED',
                message: `Phase archival warning: ${e.message}`,
            });
        }
    }

    // ── Session state (SC-2) ────────────────────────────────────────────────
    const stateResult = updateSessionState(opts, workspace, designAbs);

    // ── Diagnostics (DG-4) ──────────────────────────────────────────────────
    // After every other mutating step, so findings phase archival / CHANGELOG
    // / state-update produced are in the sink before the digest is composed.
    // DG-4.1: a preview must not consume what the real run would report.
    const findings = opts.dryRun ? diagnostics.read() : diagnostics.drain();
    const diagnosticsCount = diagnostics.summarize(findings);

    // ── Commit message ──────────────────────────────────────────────────────
    // SC-3.1: what the user reviews before committing is the whole working
    // tree, not the whitelist subset that drove the bump.
    const listed = collectChangedFiles(sig.files);

    let commitMsg = null;
    if (config.suggestCommit && !opts.noCommitMsg) {
        commitMsg = buildCommitMessage({
            workflow: opts.workflow,
            workspace,
            previousVersion: previous,
            nextVersion: next,
            files: listed.files,
            headerFiles: sig.files,
        });
        if (listed.omitted > 0) {
            commitMsg += `\n(+${listed.omitted} more changed file${listed.omitted !== 1 ? 's' : ''})`;
        }
    }

    emitSuccess({
        workflow: opts.workflow,
        workspace,
        previous,
        next,
        files: listed.files,
        omitted: listed.omitted,
        whitelistCount: sig.files.length,
        gitAvailable: sig.gitAvailable,
        changelogResult,
        commitMsg,
        archivedPhases,
        stateResult,
        diagnosticsCount,
        opts,
    });
    emitTail({ nextAction: stateResult.nextAction, findings });

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

// Exported for the regression harness (l2-test-suite §finalize coverage).
// computeNextAction carries the SC-2.1 plan-state logic and is unit-tested
// in isolation; main() is the CLI entrypoint.
module.exports = { main, computeNextAction, updateSessionState, collectChangedFiles, emitSuccess, emitTail };

// Execute only as a CLI, not when required by tests.
if (require.main === module) {
    try {
        process.exit(main());
    } catch (error) {
        console.error(`❌ Finalization failed: ${error.message}`);
        if (process.env.MAGIC_DEBUG) console.error(error.stack);
        process.exit(1);
    }
}
