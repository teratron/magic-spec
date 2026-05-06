#!/usr/bin/env node
'use strict';

const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// COMMIT MESSAGE SUGGESTER (Conventional Commits, Machine-Friendly)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a Conventional Commits message from workflow context and a list
 * of changed artifact paths. Designed for clarity when parsed by AI agents
 * scanning `git log` — terse, structured body, no prose.
 *
 * Format:
 *   <type>(<scope>): <summary>
 *
 *   Modified files:
 *   - <relPath> (+<add> -<del>)
 *   - ...
 *
 *   Workflow: magic.<w>
 *   Workspace: <ws>
 *   Project version: <prev> → <next>
 *
 * Hard rules:
 *   - Summary line ≤ 72 chars.
 *   - Body items are file paths, not sentences — keeps token cost low.
 *   - No emoji in body (header badges are fine in outer display wrapper).
 */

// ───────────────────────────────────────────────────────────────────────────
// Type & Scope Mapping
// ───────────────────────────────────────────────────────────────────────────

/**
 * Derives the Conventional Commits type from workflow and the nature of
 * the primary changes.
 *
 * @param {string} workflow - `spec|task|run|rule` (without `magic.` prefix).
 * @param {Array<{path: string, status: string}>} files
 * @returns {string}
 */
function deriveType(workflow, files) {
    switch (workflow) {
        case 'spec': {
            const allNew = files.length > 0 && files.every((f) => f.status === 'added');
            return allNew ? 'feat' : 'docs';
        }
        case 'task':
            return 'chore';
        case 'run': {
            // `feat` if any task file is new (new task completed); else `chore`.
            const hasNewTask = files.some(
                (f) => f.status === 'added' && f.path.includes('/tasks/')
            );
            return hasNewTask ? 'feat' : 'chore';
        }
        case 'rule':
            return 'docs';
        default:
            return 'chore';
    }
}

/**
 * Derives the commit scope. Typically the workspace name; global rules use
 * `rules`.
 *
 * @param {string} workspace
 * @param {Array<{path: string}>} files
 * @returns {string}
 */
function deriveScope(workspace, files) {
    const hasGlobalRules = files.some((f) => f.path === '.design/RULES.md');
    const hasOnlyGlobalRules = hasGlobalRules && files.every((f) => f.path === '.design/RULES.md');
    return hasOnlyGlobalRules ? 'rules' : workspace;
}

// ───────────────────────────────────────────────────────────────────────────
// Summary Builder
// ───────────────────────────────────────────────────────────────────────────

/**
 * Extracts a bare spec/task/phase ID from a file path (e.g. `SPEC-042`,
 * `TASK-017`, `phase-3`). Falls back to the filename stem.
 *
 * @param {string} filePath - POSIX-style relative path.
 * @returns {string}
 */
function artifactId(filePath) {
    const stem = path.basename(filePath, '.md');
    const specMatch = stem.match(/^(l[12]-)?(.+)$/);
    return specMatch ? specMatch[2] : stem;
}

/**
 * Builds the one-line summary (≤ 72 chars) for the commit message.
 *
 * @param {string} workflow
 * @param {Array<{path: string, status: string}>} files
 * @returns {string}
 */
function buildSummary(workflow, files) {
    const MAX = 60;  // leave room for `type(scope): `

    switch (workflow) {
        case 'spec': {
            const specs = files.filter((f) => f.path.includes('/specifications/'));
            if (specs.length === 0) return 'update INDEX.md';
            const verb = specs.every((f) => f.status === 'added') ? 'add' : 'update';
            if (specs.length === 1) {
                const id = artifactId(specs[0].path);
                const candidate = `${verb} ${id}`;
                return candidate.length <= MAX ? candidate : candidate.slice(0, MAX);
            }
            return `${verb} ${specs.length} specifications`;
        }
        case 'task': {
            const changed = files.map((f) => path.basename(f.path, '.md'));
            if (changed.length === 1) return `update ${changed[0]}`;
            return `update TASKS.md, PLAN.md`;
        }
        case 'run': {
            const tasks = files.filter((f) => f.path.includes('/tasks/') || f.path.includes('TASKS.md'));
            if (tasks.length === 0) return 'update STATE.md';
            const taskFiles = tasks.filter((f) => f.path.includes('/tasks/'));
            if (taskFiles.length === 1) return `complete ${artifactId(taskFiles[0].path)}`;
            return `complete ${taskFiles.length} tasks`;
        }
        case 'rule': {
            const global = files.filter((f) => f.path === '.design/RULES.md');
            const local = files.filter((f) => f.path !== '.design/RULES.md');
            if (global.length && !local.length) return 'update global RULES.md';
            if (!global.length && local.length === 1) return `update ${path.basename(local[0].path)}`;
            return `update RULES.md (${files.length} file${files.length !== 1 ? 's' : ''})`;
        }
        default:
            return `update ${files.length} file${files.length !== 1 ? 's' : ''}`;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Full Message Assembly
// ───────────────────────────────────────────────────────────────────────────

/**
 * Assembles a complete Conventional Commits message.
 *
 * @param {Object} ctx
 * @param {string} ctx.workflow - `spec|task|run|rule`.
 * @param {string} ctx.workspace
 * @param {string} ctx.previousVersion
 * @param {string} ctx.nextVersion
 * @param {Array<{path: string, status: string, added: number, deleted: number}>} ctx.files
 * @returns {string}
 */
function buildCommitMessage({ workflow, workspace, previousVersion, nextVersion, files }) {
    const type = deriveType(workflow, files);
    const scope = deriveScope(workspace, files);
    const summary = buildSummary(workflow, files);

    const header = `${type}(${scope}): ${summary}`;

    const bodyLines = ['', 'Modified files:'];
    for (const f of files) {
        const stat = (f.added || f.deleted) ? ` (+${f.added} -${f.deleted})` : '';
        bodyLines.push(`- ${f.path}${stat}`);
    }
    bodyLines.push('');
    bodyLines.push(`Workflow: magic.${workflow}`);
    bodyLines.push(`Workspace: ${workspace}`);
    bodyLines.push(`Project version: ${previousVersion} → ${nextVersion}`);

    return header + bodyLines.join('\n');
}

/**
 * Derives the CHANGELOG category for a workflow + file set. Can be
 * overridden by the spec frontmatter (`type: bugfix` → `Fixed`), but
 * finalize.js does not parse frontmatter in Phase 3 — the heuristic here
 * is based on git status only.
 *
 * @param {string} workflow
 * @param {Array<{path: string, status: string}>} files
 * @returns {string} One of: Added | Changed | Fixed | Removed
 */
function deriveChangelogCategory(workflow, files) {
    switch (workflow) {
        case 'spec': {
            if (files.every((f) => f.status === 'added')) return 'Added';
            if (files.every((f) => f.status === 'deleted')) return 'Removed';
            return 'Changed';
        }
        case 'task':
        case 'run':
        case 'rule':
            return 'Changed';
        default:
            return 'Changed';
    }
}

/**
 * Builds a short human-readable CHANGELOG bullet summarising the workflow outcome.
 *
 * @param {string} workflow
 * @param {string} workspace
 * @param {Array<{path: string, status: string}>} files
 * @returns {string}
 */
function buildChangelogBullet(workflow, workspace, files) {
    switch (workflow) {
        case 'spec': {
            const specs = files.filter((f) => f.path.includes('/specifications/'));
            if (specs.length === 0) return `Updated spec registry (${workspace})`;
            const verb = specs.every((f) => f.status === 'added') ? 'Added' : 'Updated';
            if (specs.length === 1) {
                return `${verb} specification \`${artifactId(specs[0].path)}\` (${workspace})`;
            }
            return `${verb} ${specs.length} specifications (${workspace})`;
        }
        case 'task': {
            const hasPlan = files.some((f) => f.path.endsWith('PLAN.md'));
            const hasTasks = files.some((f) => f.path.endsWith('TASKS.md'));
            if (hasPlan && hasTasks) return `Updated task plan and task index (${workspace})`;
            if (hasPlan) return `Updated implementation plan (${workspace})`;
            return `Updated task index (${workspace})`;
        }
        case 'run': {
            const tasks = files.filter((f) => f.path.includes('/tasks/'));
            if (tasks.length === 1) {
                return `Completed task \`${artifactId(tasks[0].path)}\` (${workspace})`;
            }
            if (tasks.length > 1) return `Completed ${tasks.length} tasks (${workspace})`;
            return `Updated task execution state (${workspace})`;
        }
        case 'rule': {
            const global = files.some((f) => f.path === '.design/RULES.md');
            return global
                ? `Updated global project rules (${workspace})`
                : `Updated workspace rules (${workspace})`;
        }
        default:
            return `Updated ${workspace} workspace`;
    }
}

module.exports = {
    deriveType,
    deriveScope,
    buildSummary,
    buildCommitMessage,
    deriveChangelogCategory,
    buildChangelogBullet,
};
