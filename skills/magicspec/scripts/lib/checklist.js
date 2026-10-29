#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST GRAMMAR (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one definition of what a phase checklist line looks like, shared by every
// reader that asks "is this item still open?" — finalize.js (which task does
// Next Action name?), phase-archiver.js (may this phase be archived?),
// update-state.js (how far along is the phase?) and significance.js (did a
// task marker flip?). One grammar means they cannot come to disagree about
// which lines are tasks — the same reason phase-files.js owns the workbook
// name shape.
//
// Canonical writing: `- [ ]` is an open task and `- [x]` a finished one. A
// blocked task keeps `- [ ]`; its blocked state lives in its `Detailed
// Tracking` entry (`Status: Blocked`). `[!]` is how the workflows *spell that
// status* (`Blocked [!]`) — it is notation for a field value, not a checkbox
// state. It reads like one, though, and an agent updating a ledger by hand
// writes `- [!]` for a blocked task. A reader that sees only `[ ]` and `[x]`
// then loses the line: the task is neither open nor done, so a phase holding
// nothing but blocked tasks looks finished — Next Action recommends
// continuing it, and the archiver would file it away unresolved. So the
// readers *accept* `- [!]` as an unfinished, blocked task. Writers still emit
// `- [ ]`.

// ───────────────────────────────────────────────────────────────────────────
// Marks
// ───────────────────────────────────────────────────────────────────────────

/** Box glyph of a blocked task written as a checkbox state (tolerated, never emitted). */
const BLOCKED_MARK = '!';

// ───────────────────────────────────────────────────────────────────────────
// Patterns
// ───────────────────────────────────────────────────────────────────────────

/**
 * An unfinished task line, open or blocked, anywhere in the source.
 *
 * Groups: 1 = box glyph (`' '` open, `'!'` blocked), 2 = task ID, 3 = title.
 */
const OPEN_TASK_RE = /^- \[([ !])\] \[(T-[A-Za-z0-9.]+)\] (.+)$/m;

/** An unfinished checklist item of any shape (task ID or not), optional indent. */
const UNFINISHED_ITEM_RE = /^\s*- \[[ !]\]/m;

// ───────────────────────────────────────────────────────────────────────────
// Readers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Parses one line as an unfinished task.
 *
 * @param {string} line - A single source line.
 * @returns {{id: string, title: string, blocked: boolean}|null} The task, or
 *          `null` when the line is not an open or blocked task item.
 */
function parseOpenTask(line) {
    const match = OPEN_TASK_RE.exec(line);
    if (!match) return null;
    return { id: match[2], title: match[3], blocked: match[1] === BLOCKED_MARK };
}

/**
 * Reports whether the source holds an unfinished checklist item — open or
 * blocked, a task line or a bare item.
 *
 * The caller strips quoted constructs first (lib/scan-hygiene.js), so a
 * `- [ ]` quoted in prose is never read as an item.
 *
 * @param {string} content - Source, scan-hygiene stripped.
 * @returns {boolean}
 */
function hasUnfinishedItem(content) {
    return UNFINISHED_ITEM_RE.test(content);
}

/**
 * Counts checklist items by state.
 *
 * `blocked` is unfinished work: a progress total that left it out would read
 * 100% over a phase that still holds blocked tasks.
 *
 * @param {string} checklist - Checklist source.
 * @returns {{done: number, open: number, blocked: number}}
 */
function countItems(checklist) {
    const count = (re) => (checklist.match(re) || []).length;
    return {
        done: count(/^- \[x\]/gim),
        open: count(/^- \[ \]/gm),
        blocked: count(/^- \[!\]/gm),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    BLOCKED_MARK,
    OPEN_TASK_RE,
    parseOpenTask,
    hasUnfinishedItem,
    countItems,
};
