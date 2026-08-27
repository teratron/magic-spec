#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CHANGELOG BULLET COMPOSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Composes the short, machine-generated bullet `finalize.js` appends to the
 * product's root `CHANGELOG.md`, plus the category it belongs under.
 *
 * This module previously also composed a suggested Conventional Commits
 * message; that responsibility was retired 2026-08-27 by explicit user
 * directive (SC-3 retirement, l1-session-continuity.md v2.0.0) — the engine
 * no longer composes or prints a commit message on any finalize path.
 */

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
            // This string is written verbatim into the product's root
            // CHANGELOG.md by the pipeline — nobody authors it, nobody reviews
            // it as a diff, so the write-time and review-time containment gates
            // never see it. A specification's derived identifier is exactly the
            // kind of internal name that must not travel into a product file;
            // the multi-item branch below and the `run` case are already generic.
            if (specs.length === 1) {
                return `${verb} a specification (${workspace})`;
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
                return `Completed task (${workspace})`;
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
    deriveChangelogCategory,
    buildChangelogBullet,
};
