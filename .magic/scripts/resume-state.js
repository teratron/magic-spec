#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseFlags, resolveDesignRoot, WORKSPACE_NAME_RE } = require('./utils');
const { stripQuoted } = require('./lib/scan-hygiene');
const { listPhaseFiles } = require('./lib/phase-files');
const { listTrackingEntries } = require('./lib/tracking-entries');
const { isGitRepo, headSha, changedPaths } = require('./lib/git-utils');
const diagnostics = require('./lib/diagnostics');

// ═══════════════════════════════════════════════════════════════════════════
// RESUME STATE (Shared Resume-Detection Predicate)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reports, from recorded state alone, which work a session would be resuming.
 *
 * Work is in flight when a task's tracking entry reads `Status: In Progress`
 * in a live phase workbook (or in the legacy flat `TASKS.md`), or when
 * `STATE.md` records `Status: Paused`. Nothing else counts: in particular the
 * mere presence of a handoff file is not a trigger, because a snapshot outlives
 * the state it described.
 *
 * Silent when nothing is in flight. Read-only — it writes no artifact, and its
 * one non-fatal condition (a `STATE.md` that exists but cannot be read) is
 * recorded through the shared diagnostics collector like every engine finding;
 * a clean run writes nothing at all. It never exits non-zero: every caller
 * treats a missing or failing script as silence, so a fault here must not
 * become a halt in someone else's workflow.
 *
 * Usage:
 *   node .magic/scripts/executor.js resume-state [--workspace=<name>] [--all] [--json]
 *
 * By default one workspace is read: the one the executor resolved (its
 * `--workspace` flag, or the registry default), which reaches this script as
 * `MAGIC_DESIGN_DIR` — the executor consumes `--workspace` itself and does not
 * forward it, so "flag omitted" and "flag defaulted" look identical from here.
 * That is why reading every registered workspace needs its own explicit flag,
 * `--all`, rather than the absence of another: a caller that has resolved a
 * workspace (every workflow's context load) stays inside it, and only the
 * session-start rule, which runs before any workspace is resolved, asks for all.
 * Under direct invocation an explicit `--workspace` still wins.
 */

// ───────────────────────────────────────────────────────────────────────────
// Paths & Constants
// ───────────────────────────────────────────────────────────────────────────

const projectRoot = path.resolve(__dirname, '..', '..');

/** Tasks named in one workspace's line before the rest collapse to `+{n} more`. */
const MAX_TASKS_PER_WORKSPACE = 3;

/** Workspace lines printed before the rest collapse to `+{n} more`. */
const MAX_WORKSPACES = 3;

// ───────────────────────────────────────────────────────────────────────────
// Workspace Discovery
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads `workspace.json`.
 *
 * @param {string} designAbs - Absolute path of the design root (`.design/`).
 * @returns {{ names: string[], defaultName: string|null }|null} `null` when the
 *          registry is absent or unreadable.
 */
function readRegistry(designAbs) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'));
        if (!data?.workspaces || typeof data.workspaces !== 'object') return null;
        return {
            names: Object.keys(data.workspaces).filter((name) => WORKSPACE_NAME_RE.test(name)),
            defaultName:
                typeof data.default === 'string' && WORKSPACE_NAME_RE.test(data.default)
                    ? data.default
                    : null,
        };
    } catch {
        return null;
    }
}

/**
 * Names the workspace the executor resolved, from `MAGIC_DESIGN_DIR`.
 *
 * @param {string} designAbs - Absolute path of the design root (`.design/`).
 * @returns {string|null} `null` when the variable is unset or names the root itself.
 */
function workspaceFromEnv(designAbs) {
    const envDir = process.env.MAGIC_DESIGN_DIR;
    if (!envDir) return null;
    const abs = path.resolve(projectRoot, envDir);
    if (abs === designAbs || path.dirname(abs) !== designAbs) return null;
    const name = path.basename(abs);
    return WORKSPACE_NAME_RE.test(name) ? name : null;
}

/**
 * Decides which workspaces to inspect.
 *
 * @param {string} designAbs - Absolute path of the design root (`.design/`).
 * @param {{ all: boolean, workspace: string|null }} request
 * @returns {{ name: string, dir: string }[]}
 */
function listWorkspaces(designAbs, request) {
    const registry = readRegistry(designAbs);
    const at = (name) => ({ name, dir: path.join(designAbs, name) });

    if (request.workspace !== null) {
        return WORKSPACE_NAME_RE.test(request.workspace) ? [at(request.workspace)] : [];
    }
    if (request.all && registry !== null) return registry.names.map(at);

    const resolved = workspaceFromEnv(designAbs) || registry?.defaultName;
    if (resolved) return [at(resolved)];

    // No registry: an older single-workspace layout keeps STATE.md at the root.
    return fs.existsSync(path.join(designAbs, 'STATE.md'))
        ? [{ name: 'default', dir: designAbs }]
        : [];
}

// ───────────────────────────────────────────────────────────────────────────
// Reading Recorded State
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads a text file, telling an absent file apart from an unreadable one.
 *
 * @param {string} file - Absolute path.
 * @returns {{ text: string }|{ missing: true }|{ error: Error }}
 */
function readText(file) {
    try {
        return { text: fs.readFileSync(file, 'utf8') };
    } catch (error) {
        return error && error.code === 'ENOENT' ? { missing: true } : { error };
    }
}

/**
 * Reads one single-line `STATE.md` field, returning its value as written.
 *
 * The line is located in the SH-1-stripped text — a label quoted inside a
 * code span or a fence is not a field in force — and the value is then read
 * from the raw line at the same index, because stripping deletes code spans
 * and a `Next Action` routinely carries one.
 *
 * @param {string} stripped - `STATE.md` after `stripQuoted()`.
 * @param {string} raw - `STATE.md` as written.
 * @param {RegExp} labelRe - Matches the whole field line; group 1 is the value.
 * @returns {string|null}
 */
function readStateField(stripped, raw, labelRe) {
    const strippedLines = stripped.split(/\r?\n/);
    const rawLines = raw.split(/\r?\n/);
    for (let i = 0; i < strippedLines.length; i++) {
        if (!labelRe.test(strippedLines[i])) continue;
        const rawMatch = (rawLines[i] || '').match(labelRe);
        return rawMatch ? rawMatch[1].trim() : null;
    }
    return null;
}

/**
 * Collects the tasks recorded as in flight in one workspace.
 *
 * Live phase workbooks are `tasks/phase-{N}[{track}].md`; archived phases live
 * elsewhere and hold no open work. The legacy flat layout keeps its entries in
 * `TASKS.md`, which the new layout leaves free of them.
 *
 * @param {string} wsDir - Absolute workspace design directory.
 * @returns {{ id: string, title: string, attempts: number }[]}
 */
function collectInFlight(wsDir) {
    const sources = listPhaseFiles(path.join(wsDir, 'tasks')).map(({ file }) =>
        path.join(wsDir, 'tasks', file),
    );
    sources.push(path.join(wsDir, 'TASKS.md'));

    const inFlight = [];
    for (const source of sources) {
        const read = readText(source);
        if (read.text === undefined) continue;
        const stripped = stripQuoted(read.text);
        for (const entry of listTrackingEntries(stripped, read.text)) {
            if (entry.status && /^In Progress\b/i.test(entry.status)) {
                inFlight.push({ id: entry.id, title: entry.title, attempts: entry.attempts });
            }
        }
    }
    return inFlight;
}

/**
 * Inspects one workspace.
 *
 * @param {{ name: string, dir: string }} workspace
 * @returns {{ workspace: string, source: string, tasks: Object[], attempts: number,
 *             nextAction: string|null, paused: boolean, changedFiles: number|null }|null}
 *          `null` when nothing is in flight or the workspace has no readable
 *          `STATE.md`. `changedFiles` is filled in by the caller.
 */
function inspectWorkspace(workspace) {
    const state = readText(path.join(workspace.dir, 'STATE.md'));
    if (state.error) {
        // A missing STATE.md is a fresh workspace and not a finding; one that
        // exists but cannot be read is, and DG-1 wants it recorded, not only printed.
        const message = `STATE.md of workspace '${workspace.name}' exists but cannot be read: ${state.error.message}`;
        console.error(`[resume-state] ${message}`);
        diagnostics.record({
            severity: 'warning',
            source: 'resume-state',
            code: 'RESUME_STATE_UNREADABLE',
            message,
            locus: 'STATE.md',
        });
        return null;
    }
    if (state.text === undefined) return null;

    const stripped = stripQuoted(state.text);
    const status = readStateField(stripped, state.text, /^\*\*Status:\*\*[ \t]+(.+)$/);
    const paused = status !== null && /^Paused\b/i.test(status);
    const tasks = collectInFlight(workspace.dir);
    if (!paused && tasks.length === 0) return null;

    return {
        workspace: workspace.name,
        source: paused && tasks.length > 0 ? 'both' : paused ? 'paused' : 'in-progress',
        tasks,
        attempts: tasks.reduce((sum, task) => sum + task.attempts, 0),
        nextAction: readStateField(stripped, state.text, /^- \*\*Next Action:\*\*[ \t]+(.+)$/),
        paused,
        changedFiles: null,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Working Tree
// ───────────────────────────────────────────────────────────────────────────

/**
 * Counts the files modified in the working tree since the last commit,
 * untracked ones included and `.design/` excluded — the bookkeeping the
 * resume line already reports. The in-flight product is recovered from the
 * tree, never from anyone's notes.
 *
 * @returns {number|null} `null` when the tree cannot say: not a repository, or
 *          a repository with no commit yet (where "changed since HEAD" has no meaning).
 */
function countModifiedFiles() {
    if (!isGitRepo(projectRoot) || headSha(projectRoot) === null) return null;
    return changedPaths(projectRoot).filter((file) => !file.startsWith('.design/')).length;
}

// ───────────────────────────────────────────────────────────────────────────
// Rendering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renders one workspace's resume line.
 *
 * @param {ReturnType<typeof inspectWorkspace>} summary - A non-null summary.
 * @returns {string}
 */
function formatLine(summary) {
    let body;
    if (summary.tasks.length > 0) {
        const named = summary.tasks
            .slice(0, MAX_TASKS_PER_WORKSPACE)
            .map((task) => `${task.id} ${task.title}`.trim());
        const extra = summary.tasks.length - named.length;
        body =
            `${named.join('; ')}${extra > 0 ? ` +${extra} more` : ''} in flight` +
            `${summary.paused ? ' (paused snapshot)' : ''} — ${summary.attempts} dead end(s) recorded` +
            `${summary.changedFiles === null ? '' : `, ${summary.changedFiles} file(s) modified`}`;
    } else {
        body = 'paused snapshot';
    }
    const next = summary.nextAction ? ` Next: ${summary.nextAction}` : '';
    return `▶ Resume [${summary.workspace}]: ${body}.${next}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Entry point. Prints nothing when nothing is in flight; never throws and
 * always exits 0.
 *
 * @returns {void}
 */
function main() {
    const { values, flags, errors } = parseFlags(process.argv.slice(2), {
        valueFlags: ['--workspace'],
        boolFlags: ['--all', '--json'],
    });
    // A malformed invocation is silence, not a halt: this script is called from
    // rules and workflow bodies that treat a fault here as "nothing to report".
    if (errors.length > 0) return;

    const { designAbs } = resolveDesignRoot(projectRoot);
    const summaries = listWorkspaces(designAbs, {
        all: Boolean(flags['--all']),
        workspace: values['--workspace'] || null,
    })
        .map(inspectWorkspace)
        .filter(Boolean);

    if (summaries.length > 0) {
        const modified = countModifiedFiles();
        for (const summary of summaries) summary.changedFiles = modified;
    }

    if (flags['--json']) {
        // Machine-readable and unbounded: the caps below are for a human line.
        console.log(
            JSON.stringify({
                in_flight: summaries.length > 0,
                workspaces: summaries.map((summary) => ({
                    workspace: summary.workspace,
                    source: summary.source,
                    tasks: summary.tasks,
                    changed_files: summary.changedFiles,
                    next_action: summary.nextAction,
                })),
            }),
        );
        return;
    }
    if (summaries.length === 0) return;

    const lines = summaries.slice(0, MAX_WORKSPACES).map(formatLine);
    const extra = summaries.length - lines.length;
    if (extra > 0) lines.push(`▶ Resume: +${extra} more workspace(s) with work in flight`);
    console.log(lines.join('\n'));
}

if (require.main === module) {
    try {
        main();
    } catch {
        // Fail open: see the module header.
    }
}

module.exports = { listWorkspaces, inspectWorkspace, formatLine };
