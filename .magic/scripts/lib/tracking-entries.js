#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING ENTRIES (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one reader of a task's `## Detailed Tracking` entry — the `### [T-…]`
// block of a phase workbook, or of a legacy flat TASKS.md. Two scripts read
// these entries: finalize.js (is this task excluded from a Next Action?) and
// resume-state.js (which tasks are in flight, and how many dead ends are
// recorded against them?). One implementation means the two cannot come to
// disagree about where an entry ends or what a field says — the rule scan
// hygiene already states for scans, applied to a reader.
//
// Input contract: every function takes SH-1-stripped content
// (lib/scan-hygiene.js), stripped once by the caller. An entry that quotes a
// field label — inside a code span, or inside an `Attempts` line — must never
// be read as that field in force. Field readers are also anchored at column 0,
// so an indented list item can never satisfy them.

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Escapes a string for literal use inside a RegExp.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ───────────────────────────────────────────────────────────────────────────
// Single Entry
// ───────────────────────────────────────────────────────────────────────────

/**
 * Returns the body of one task's tracking entry — everything after its
 * `### [T-…]` heading line up to the next `###`/`##` heading or the end of
 * the file — or `null` when the file has no such entry.
 *
 * @param {string} content - Workbook source (scan-hygiene stripped).
 * @param {string} taskId - Task ID as it appears in the checklist, e.g. `T-1A01`.
 * @returns {string|null}
 */
function getTrackingBlock(content, taskId) {
    // The lookahead's `$` must not rely on the `m` flag's line-boundary
    // meaning — it would then match before *any* newline (e.g. the section's
    // own blank line right after the heading), collapsing the capture to
    // empty. `(?![\s\S])` is a true end-of-string assertion, immune to `m`.
    const block = content.match(
        new RegExp(
            `^### \\[${escapeRegExp(taskId)}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n### |\\n## |(?![\\s\\S]))`,
            'm'
        )
    );
    return block ? block[1] : null;
}

/**
 * Reads one single-line field of an entry (`- **Label:** value`).
 *
 * The pattern is anchored at column 0 and requires the value on the same
 * line, so neither an indented list item nor the line after an empty field
 * can be mistaken for it.
 *
 * @param {string} block - Entry body from {@link getTrackingBlock}.
 * @param {string} label - Field label without the colon, e.g. `Status`.
 * @returns {string|null} The trimmed value, or `null` when the field is absent.
 */
function readField(block, label) {
    const match = block.match(
        new RegExp(`^-[ \\t]+\\*\\*${escapeRegExp(label)}:\\*\\*[ \\t]+(.+)$`, 'm')
    );
    return match ? match[1].trim() : null;
}

/**
 * Counts the dead ends recorded in an entry's `Attempts` field: the indented
 * list items under `- **Attempts:**`. The field ends at the first non-blank
 * line that is not indented.
 *
 * @param {string} block - Entry body from {@link getTrackingBlock}.
 * @returns {number} Zero when the entry has no `Attempts` field.
 */
function countAttempts(block) {
    const lines = block.split(/\r?\n/);
    const start = lines.findIndex((line) => /^-[ \t]+\*\*Attempts:\*\*/.test(line));
    if (start === -1) return 0;

    let count = 0;
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^[ \t]+-(?:[ \t]|$)/.test(line)) { count++; continue; }
        // A wrapped item, or a blank line inside a loose list, still belongs
        // to the field; only a column-0 line ends it.
        if (/^[ \t]+\S/.test(line) || line.trim() === '') continue;
        break;
    }
    return count;
}

// ───────────────────────────────────────────────────────────────────────────
// Whole File
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists every tracking entry in a workbook.
 *
 * `stripQuoted()` deletes code spans outright, so a heading such as
 * ``### [T-1A01] Extract `finalize.js` ``loses its code span in the stripped
 * text. Detection and field reads use the stripped text; the display title is
 * recovered from the raw source by line index, which stripping preserves.
 *
 * @param {string} content - Workbook source (scan-hygiene stripped).
 * @param {string} [rawContent=content] - The same source before stripping.
 * @returns {{ id: string, title: string, status: string|null,
 *             assignment: string|null, attempts: number }[]}
 */
function listTrackingEntries(content, rawContent = content) {
    const lines = content.split(/\r?\n/);
    const rawLines = rawContent.split(/\r?\n/);
    const entries = [];

    for (let i = 0; i < lines.length; i++) {
        const heading = lines[i].match(/^### \[(T-[A-Za-z0-9.]+)\]/);
        if (!heading) continue;

        const block = getTrackingBlock(content, heading[1]);
        if (block === null) continue;

        const rawHeading = (rawLines[i] || '').match(/^### \[T-[A-Za-z0-9.]+\][ \t]*(.*)$/);
        entries.push({
            id: heading[1],
            title: rawHeading ? rawHeading[1].trim() : '',
            status: readField(block, 'Status'),
            assignment: readField(block, 'Assignment'),
            attempts: countAttempts(block),
        });
    }
    return entries;
}

module.exports = { getTrackingBlock, readField, countAttempts, listTrackingEntries };
