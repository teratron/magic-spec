#!/usr/bin/env node
// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// PENDING WORK (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one place that decides whether a workspace still has work waiting: a
// registered specification the plan does not mention, a plan built on an older
// registry, or an open item in the plan's Backlog once every phase is done.
//
// Pre-flight reports each of those as a warning, and the next-step line that
// finalize prints and persists needs the same answer to say "nothing pending"
// truthfully. Two copies of this logic would eventually disagree — the line
// would then assert an empty plan that Pre-flight is simultaneously warning
// about — so both callers read this module and neither keeps its own.

const fs = require('fs');
const path = require('path');
const { stripQuoted } = require('./scan-hygiene');
const { STATE_DIR_NAME } = require('../utils');

/**
 * Source of the specification-filename grammar used by every registry scan:
 * one lowercase kebab-case `.md` name after `specifications/`. Bounding the
 * capture means a single match cannot run across several comma-separated
 * tokens up to an unrelated closing parenthesis.
 * @type {string}
 */
const SPEC_FILENAME_SRC = 'specifications\\/([a-z0-9][a-z0-9-]*\\.md)';

// ───────────────────────────────────────────────────────────────────────────
// Plan-complete recognition
// ───────────────────────────────────────────────────────────────────────────

const isTableScaffold = (t) => /^\|\s*-+\s*\|/.test(t) || /^\|\s*Phase\s*\|/i.test(t);

/**
 * Reports whether the task registry shows a complete plan. Three positive
 * reads count, and nothing else does — a gate that can raise a HALT or claim
 * an empty plan must act on input it positively read as complete, never on
 * input it merely failed to parse:
 *
 *   1. the italic `*None — ...*` marker the workflows write for an exhausted
 *      section;
 *   2. a phase table whose every row already carries a terminal status (the
 *      archiver rewrites a finished row in place and never moves it, so once
 *      any phase has been archived the literal marker can never reappear);
 *   3. a vacant section — no phase rows, only table scaffolding or whitespace.
 *
 * @param {string} tasksContent - Full text of the task registry.
 * @returns {boolean} True when the active-phases section reads as complete.
 */
function isPlanComplete(tasksContent) {
    const match = tasksContent.match(/## Active Phases\r?\n([\s\S]*?)(?=\r?\n## |$)/);
    if (!match) return false;
    const section = match[1].trim();
    const isEmptyMarker = /^\*None\b/m.test(section);
    const rows = section.split(/\r?\n/).filter((l) => {
        const t = l.trim();
        return t.startsWith('|') && !isTableScaffold(t);
    });
    const isAllTerminal =
        rows.length > 0 && rows.every((l) => /`(Done|Done \(Archived\)|Cancelled)`/.test(l));
    const isVacant = section.split(/\r?\n/).every((l) => {
        const t = l.trim();
        return t === '' || isTableScaffold(t);
    });
    return isEmptyMarker || isAllTerminal || isVacant;
}

/**
 * Lists the Backlog bullets that still need work. Top-level bullets only; a
 * bullet carrying a trailing `*(Parked — {reason})*` marker is a deliberate,
 * explicit "kept visible, not open" signal and is the one exclusion applied.
 * Quoted spans are stripped first so an entry illustrating `- {example}`
 * syntax in a code span is not counted.
 *
 * @param {string} planContent - Full text of the plan.
 * @returns {string[]} The open bullet lines (empty when there is no Backlog).
 */
function openBacklogItems(planContent) {
    const match = planContent.match(/## Backlog\r?\n([\s\S]*?)(?=\r?\n## |$)/);
    if (!match) return [];
    return stripQuoted(match[1])
        .split(/\r?\n/)
        .filter((l) => /^-\s+\S/.test(l) && !/\*\(Parked\b/.test(l));
}

/**
 * Finds the first phase of the plan that still has an open item and no row in the task registry:
 * planned, but not decomposed into tasks. A plan that holds one is not complete, whatever the
 * registry's finished rows say.
 *
 * @param {string} planContent - Full text of the plan.
 * @param {string} tasksContent - Full text of the task registry.
 * @returns {{phase: string, name: string}|null} The first such phase, in plan order.
 */
function firstUndecomposedPhase(planContent, tasksContent) {
    const region = planContent.match(/## Active Phases\r?\n([\s\S]*?)(?=\r?\n## |$)/);
    if (!region) return null;
    const registered = new Set(
        [...tasksContent.matchAll(/^\|\s*\[Phase (\d+)\]/gm)].map((m) => m[1]),
    );
    const heads = [...region[1].matchAll(/^### Phase (\d+) [—-] ([^\r\n]+)$/gm)];
    for (let i = 0; i < heads.length; i++) {
        const end = i + 1 < heads.length ? heads[i + 1].index : region[1].length;
        const block = stripQuoted(region[1].slice(heads[i].index, end));
        if (/^\s*- \[ \]/m.test(block) && !registered.has(heads[i][1])) {
            return { phase: heads[i][1], name: heads[i][2].trim() };
        }
    }
    return null;
}

/**
 * Reads the replan directive a decomposition left in the task registry — a section
 * `## Replan Directive` with the plan's version at that moment and the directive in plain words
 * — and reports it only while it is pending: the plan's version still equals the recorded one. A
 * plan rewritten since has retired it, so the plan never needs to write the registry. A section
 * inside an HTML comment (the template's example) is not a directive.
 *
 * @param {string} tasksContent - Full text of the task registry.
 * @param {string} planContent - Full text of the plan.
 * @returns {{planVersion: string, directive: string}|null} The pending directive, or `null`.
 */
function pendingReplanDirective(tasksContent, planContent) {
    const section = tasksContent
        .replace(/<!--[\s\S]*?-->/g, '')
        .match(/## Replan Directive\r?\n([\s\S]*?)(?=\r?\n## |$)/);
    if (!section) return null;
    const version = section[1].match(/\*\*Plan version:\*\*\s*v?([0-9][0-9.]*)/);
    const text = section[1].match(
        /\*\*Directive:\*\*\s*([\s\S]*?)(?=\r?\n\s*\r?\n|\r?\n\s*[-*]\s+\*\*|$)/,
    );
    const planVersion = planContent.match(/^\*\*Version:\*\*\s+([0-9][0-9.]*)/m);
    if (!version || !text || !planVersion || planVersion[1] !== version[1]) return null;
    const directive = text[1].replace(/\s+/g, ' ').trim();
    return directive ? { planVersion: version[1], directive } : null;
}

/**
 * Compares the constitution version a plan records (`**Based on RULES:**`) with the constitution's
 * own. A plan that records none is not judged: the line is written by the planning workflow, and a
 * plan from before it has nothing to compare.
 *
 * @param {string} designDir - The workspace directory.
 * @param {string} planContent - Full text of the plan.
 * @returns {{planBasedOn: string, rulesVersion: string}|null} The mismatch, or `null`.
 */
function constitutionGap(designDir, planContent) {
    const recorded = planContent.match(/^\*\*Based on RULES:\*\*\s+.*?v([0-9][0-9.]*)/m);
    if (!recorded) return null;
    // The global constitution sits at the state folder; the flat legacy layout is the state folder itself.
    const rulesPath =
        path.basename(designDir) === STATE_DIR_NAME
            ? path.join(designDir, 'RULES.md')
            : path.join(path.dirname(designDir), 'RULES.md');
    if (!fs.existsSync(rulesPath)) return null;
    const current = fs.readFileSync(rulesPath, 'utf8').match(/^\*\*Version:\*\*\s+([0-9][0-9.]*)/m);
    return current && current[1] !== recorded[1]
        ? { planBasedOn: recorded[1], rulesVersion: current[1] }
        : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

/**
 * Evaluates what is still pending in one workspace design directory.
 *
 * A check whose input file does not exist is not applicable and reports its
 * empty value, exactly as Pre-flight skips it; the `*Evaluated` flags say
 * which checks actually ran, so a caller that needs a positive "nothing is
 * pending" can refuse to conclude it from a check that never ran.
 *
 * @param {string} designDir - The workspace directory (holds INDEX/PLAN/TASKS).
 * @returns {{
 *   orphanedSpecs: string[],
 *   syncGap: ({planBasedOn: string, indexVersion: string}|null),
 *   rulesGap: ({planBasedOn: string, rulesVersion: string}|null),
 *   planComplete: boolean,
 *   nextUndecomposed: ({phase: string, name: string}|null),
 *   replanDirective: ({planVersion: string, directive: string}|null),
 *   ledgerBehindPlan: boolean,
 *   openBacklogItems: string[],
 *   registryEvaluated: boolean,
 *   backlogEvaluated: boolean
 * }}
 * @throws {Error} When a file that exists cannot be read — never a partial result.
 */
function findPendingWork(designDir) {
    const indexPath = path.join(designDir, 'INDEX.md');
    const planPath = path.join(designDir, 'PLAN.md');
    const tasksPath = path.join(designDir, 'TASKS.md');

    const result = {
        orphanedSpecs: [],
        syncGap: null,
        rulesGap: null,
        planComplete: false,
        nextUndecomposed: null,
        replanDirective: null,
        ledgerBehindPlan: false,
        openBacklogItems: [],
        registryEvaluated: false,
        backlogEvaluated: false,
    };

    const planExists = fs.existsSync(planPath);

    if (planExists && fs.existsSync(indexPath)) {
        const plan = fs.readFileSync(planPath, 'utf8');
        const index = fs.readFileSync(indexPath, 'utf8');
        const planStripped = stripQuoted(plan);
        const indexSpecs = [
            ...new Set(
                [...stripQuoted(index).matchAll(new RegExp(SPEC_FILENAME_SRC, 'g'))].map(
                    (m) => m[1],
                ),
            ),
        ];
        result.orphanedSpecs = indexSpecs.filter((spec) => !planStripped.includes(spec));

        const indexVersion = index.match(/^\*\*Version:\*\*\s+([0-9.]+)/m);
        const planBasedOn = plan.match(/^\*\*Based on:\*\*\s+.*?v([0-9.]+)/m);
        if (indexVersion && planBasedOn && indexVersion[1] !== planBasedOn[1]) {
            result.syncGap = { planBasedOn: planBasedOn[1], indexVersion: indexVersion[1] };
        }
        result.registryEvaluated = true;
    }

    if (planExists) {
        result.rulesGap = constitutionGap(designDir, fs.readFileSync(planPath, 'utf8'));
    }

    if (planExists && !fs.existsSync(tasksPath)) {
        // No ledger yet: every phase with an open item is waiting for its tasks.
        result.nextUndecomposed = firstUndecomposedPhase(fs.readFileSync(planPath, 'utf8'), '');
    }

    if (planExists && fs.existsSync(tasksPath)) {
        const tasks = fs.readFileSync(tasksPath, 'utf8');
        const planText = fs.readFileSync(planPath, 'utf8');
        result.nextUndecomposed = firstUndecomposedPhase(planText, tasks);
        // A plan that holds a phase with no tasks yet is not complete, whatever the registry's rows say.
        result.planComplete = isPlanComplete(tasks) && result.nextUndecomposed === null;
        result.replanDirective = pendingReplanDirective(tasks, planText);
        const ledgerBase = tasks.match(/^\*\*Based on PLAN:\*\*\s+.*?v([0-9.]+)/m);
        const planVersion = planText.match(/^\*\*Version:\*\*\s+([0-9][0-9.]*)/m);
        result.ledgerBehindPlan = Boolean(
            ledgerBase && planVersion && ledgerBase[1] !== planVersion[1],
        );
        if (result.planComplete) {
            result.openBacklogItems = openBacklogItems(planText);
        }
        result.backlogEvaluated = true;
    }

    return result;
}

module.exports = {
    findPendingWork,
    firstUndecomposedPhase,
    pendingReplanDirective,
    SPEC_FILENAME_SRC,
};
