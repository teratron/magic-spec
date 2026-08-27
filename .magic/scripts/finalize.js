#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeFileSafe, isDryRun, mkdirSafe, parseFlags, WORKSPACE_NAME_RE } = require('./utils');
const { stripQuoted } = require('./lib/scan-hygiene');
const { ensureInitialized, bumpPatch, writeVersion } = require('./lib/project-version');
const { computeSignificance, gitChangedPaths, gitFileStatus, gitFileNumstat } = require('./lib/significance');
const { createIfMissing, appendBullet } = require('./lib/changelog-writer');
const { deriveChangelogCategory, buildChangelogBullet } = require('./lib/commit-suggester');
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
 *   force: boolean,
 * }}
 */
function parseArgs() {
    const { values, flags, errors } = parseFlags(process.argv.slice(2), {
        valueFlags: ['--workflow', '--workspace'],
        boolFlags: ['--dry-run', '--no-bump', '--no-changelog', '--force'],
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
 *   changelogPath: string,
 *   versionPath: string,
 * }}
 */
function loadConfig() {
    const defaults = {
        enabled: true,
        autoBump: true,
        autoChangelog: true,
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
 * Reports whether a specific checklist task is excluded from an
 * agent-executable recommendation, reading its own `## Detailed Tracking`
 * entry — independent of the phase-level signals {@link isPhaseBlocked}
 * checks.
 *
 * A phase in good standing can still have, as an open checklist line, a task
 * whose own tracking entry marks it `Status: Blocked` or `Assignment: User`
 * — the same class of contradiction `isPhaseBlocked` guards against, one
 * level down (l1-session-continuity.md SC-2.1(c)). Absence of either field,
 * or an `Assignment` value outside `Agent | User`, defaults to
 * agent-actionable: the defect this closes is a missing check on tasks that
 * positively declare themselves off-limits, not grounds for a stricter
 * default against tasks that declare nothing.
 *
 * @param {string} content - Phase file source (scan-hygiene stripped).
 * @param {string} taskId - Task ID as it appears in the checklist, e.g. `T-1A01`.
 * @returns {boolean}
 */
function isTaskExcluded(content, taskId) {
    const escaped = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // The lookahead's `$` must not rely on the `m` flag's line-boundary
    // meaning — it would then match before *any* newline (e.g. the section's
    // own blank line right after the heading), collapsing the capture to
    // empty. `(?![\s\S])` is a true end-of-string assertion, immune to `m`.
    const block = content.match(
        new RegExp(`^### \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n### |\\n## |(?![\\s\\S]))`, 'm')
    );
    if (!block) return false;
    const status = block[1].match(/^-\s+\*\*Status:\*\*\s+(.+)$/m);
    if (status && /^Blocked\b/.test(status[1].trim())) return true;
    const assignment = block[1].match(/^-\s+\*\*Assignment:\*\*\s+(.+)$/m);
    return !!(assignment && /^User\b/.test(assignment[1].trim()));
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
            // SH-1: stripped once per phase file, before any checklist or
            // Detailed Tracking scan runs against it — a Notes block quoting
            // checkbox syntax must not be read as a task in force, and the
            // per-item scan below (unlike the old single-match lookup)
            // widens that exposure by examining every line, not only the
            // first (l1-scan-input-hygiene.md SH-1/SH-5).
            let firstExcludedTask = null;
            for (const file of phaseFiles) {
                const rawContent = fs.readFileSync(path.join(tasksDir, file), 'utf8');
                const content = stripQuoted(rawContent);
                const phaseNo = file.match(/\d+/)[0];
                const anyOpen = content.match(openTaskRe);
                if (!anyOpen) continue;
                // Blocked is not Done, so a blocked phase still has open
                // checklist lines — matching one is not licence to recommend it.
                // Dispatching a resuming session into the very blocker the same
                // STATE.md records would make the file contradict itself.
                if (isPhaseBlocked(content, tasks, phaseNo)) {
                    return `Resolve blocker on ${anyOpen[1]} (${workspace}) — ` +
                        `see STATE.md ## Blockers, then run /magic.run ${workspace}`;
                }
                // The phase itself is not Blocked, but the first-matched line
                // alone is still not licence to recommend it: that exact
                // task's own Detailed Tracking entry may independently mark
                // it Blocked or Assignment: User (SC-2.1(c)). Scan every open
                // item in the phase, not only the first.
                //
                // The detector reads `content` (stripQuoted'd, SH-1) so a
                // quoted checkbox in prose is never read as a real task line.
                // The display title must NOT come from that same stripped
                // text, though — a title routinely carries a backticked file
                // name, and stripQuoted blanks matched characters rather than
                // removing them. It preserves *line count*, not intra-line
                // offsets, so the title is recovered by re-matching the same
                // line *index* against the raw source, not a character
                // offset (field-observed: this exact loop, one line earlier
                // in its own history, shipped a title-stripping regression).
                const strippedLines = content.split(/\r?\n/);
                const rawLines = rawContent.split(/\r?\n/);
                for (let i = 0; i < strippedLines.length; i++) {
                    const openTask = strippedLines[i].match(openTaskRe);
                    if (!openTask) continue;
                    if (isTaskExcluded(content, openTask[1])) {
                        firstExcludedTask = firstExcludedTask || openTask[1];
                        continue;
                    }
                    const rawMatch = rawLines[i] && rawLines[i].match(openTaskRe);
                    const title = rawMatch ? rawMatch[2] : openTask[2];
                    return `Execute ${openTask[1]} ${title} via /magic.run ${workspace}`;
                }
                // Every open item in this phase file was excluded — keep
                // scanning subsequent phase files before giving up.
            }
            if (firstExcludedTask) {
                // At least one open task exists, but every one found across
                // every phase file is Blocked or Assignment: User. The plan
                // is not complete — tasks remain — so this must not fall
                // through to the plan-complete branch below (tier 3), and
                // must not name the excluded task as /magic.run-executable.
                return `${firstExcludedTask} and any other open tasks need user or blocker ` +
                    `action — see STATE.md ## Blockers / the phase's ## Detailed Tracking, ` +
                    `then run /magic.run ${workspace}`;
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
// Changed-File Enumeration (stdout listing completeness)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Upper bound on files listed in the stdout artifact listing. Beyond it the
 * output states how many were omitted.
 *
 * @type {number}
 */
const MAX_LISTED_FILES = 15;

/**
 * Enumerates every file changed in the working tree, for the stdout
 * `### Changed artifacts` listing.
 *
 * Deliberately wider than the significance whitelist. Significance answers
 * "should this bump the version" and is correctly scoped to SDD artifacts;
 * this answers "what did the invocation actually change", and for a
 * task-execution finalize the task's own product-code deliverable is outside
 * the whitelist by construction. Header derivation keeps reading the
 * whitelist subset.
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
        files, omitted = 0, whitelistCount, gitAvailable, changelogResult,
        archivedPhases, stateResult, diagnosticsCount,
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
            ? `skipped (duplicate — run 'release-changelog' to rotate [Unreleased])`
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

    // Diagnostics digest and next step render once, from emitTail() — never
    // here (that split is what keeps their order identical to the skip
    // path's). The trailing blank line is kept so emitTail()'s own leading
    // blank still produces a gap at the boundary.
    lines.push(``);
    process.stdout.write(lines.join('\n'));
}

/**
 * Renders the terminal block shared by both finalize exit paths, in a fixed
 * order (l1-engine-diagnostics.md DG-5): the engine diagnostics digest
 * (omitted entirely when there is nothing to report — DG-7), then the next
 * step (DG-6) — the exact string this invocation persisted to STATE.md,
 * never recomputed. Neither `emitSkip()` nor `emitSuccess()` may render
 * either of these blocks; that prohibition is the whole mechanism by which
 * the two exit paths cannot drift apart.
 *
 * @param {{nextAction?: string, findings?: Object[]}} ctx
 * @returns {void}
 */
function emitTail(ctx) {
    const { nextAction, findings = [] } = ctx;

    // Each present block is joined internally, then blocks are joined with a
    // single blank line between them — avoids the double-blank a naive
    // per-block leading-and-trailing '' would produce once the (formerly
    // unconditional) auto-commit notice stopped anchoring the spacing.
    const blocks = [];
    const digest = diagnostics.formatDigest(findings);
    if (digest.length > 0) blocks.push(digest.join('\n'));
    if (nextAction) blocks.push(['### Next step', '', nextAction].join('\n'));

    if (blocks.length === 0) return;
    process.stdout.write('\n' + blocks.join('\n\n') + '\n');
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

    // ── Changed-file listing ────────────────────────────────────────────────
    // What the stdout `### Changed artifacts` listing shows is the whole
    // working tree, not the whitelist subset that drove the bump.
    const listed = collectChangedFiles(sig.files);

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
        archivedPhases,
        stateResult,
        diagnosticsCount,
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
