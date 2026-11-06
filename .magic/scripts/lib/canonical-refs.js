'use strict';

const { normalizePath } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL REFERENCES TABLE — ONE READER
// ═══════════════════════════════════════════════════════════════════════════
//
// The `## Canonical References` table of a specification is read by three
// scripts (`analyze-coverage`, `extract-rationale`, `build-spec-graph`). They
// share this reader so they cannot disagree about which cell is the path or
// how many paths a cell holds:
//
//   - The path column is found by the header cell named `Path`. A table whose
//     header names no `Path` column is read through its first column.
//   - A cell holds one reference per code span; a cell without a code span is
//     split on commas that stand outside braces and brackets.

/**
 * Splits the text of one table row into trimmed cells, without the empty cells
 * the leading and trailing pipes leave at the ends.
 *
 * @param {string} line - A table row.
 * @returns {string[]} The cells.
 */
function splitRow(line) {
    const cells = line.trim().split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells;
}

/**
 * Whether a row is the separator under a table header (`| --- | :---: |`).
 *
 * @param {string} line - A table row.
 * @returns {boolean}
 */
function isSeparatorRow(line) {
    return /^\s*\|[\s|:-]+\|?\s*$/.test(line) && line.includes('-');
}

/**
 * Splits plain text on the commas that stand outside braces and brackets, so a
 * pattern such as `src/{a,b}/*.js` stays one reference.
 *
 * @param {string} text - Cell text without code spans.
 * @returns {string[]} The trimmed, non-empty pieces.
 */
function splitOnOuterCommas(text) {
    const pieces = [];
    let depth = 0;
    let current = '';
    for (const ch of text) {
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            pieces.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    pieces.push(current);
    return pieces.map((p) => p.trim()).filter(Boolean);
}

/**
 * The references one `Path` cell holds. Every code span is its own reference;
 * a cell with no code span is split on commas.
 *
 * @param {string} cell - The cell text.
 * @returns {string[]} The references as written, trimmed.
 */
function splitPathCell(cell) {
    const spans = [...String(cell).matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
    if (spans.length) return spans;
    return splitOnOuterCommas(String(cell));
}

/**
 * Reads the references out of the `## Canonical References` section of a specification.
 *
 * @param {string} content - Full specification text.
 * @returns {string[]} The referenced paths in table order, normalized (forward slashes).
 */
function parseCanonicalRefs(content) {
    const refs = [];
    let inSection = false;
    /** @type {string[]} */
    let block = [];

    const flush = () => {
        if (block.length) refs.push(...readTable(block));
        block = [];
    };

    for (const line of String(content).split(/\r?\n/)) {
        if (/^##\s+Canonical References/i.test(line)) {
            inSection = true;
            continue;
        }
        if (inSection && /^##\s/.test(line)) break;
        if (!inSection) continue;
        if (/^\s*\|/.test(line)) block.push(line);
        else flush();
    }
    flush();

    return refs;
}

/**
 * Reads one table: its header names the path column, its body rows hold the references.
 *
 * @param {string[]} rows - Consecutive table rows.
 * @returns {string[]} Normalized references.
 */
function readTable(rows) {
    const sep = rows.findIndex(isSeparatorRow);
    const isPathHeader = (cells) => cells.findIndex((c) => /^Path$/i.test(c));
    let pathCol = 0;
    let body = rows;
    if (sep !== -1) {
        body = rows.slice(sep + 1);
        if (sep > 0) {
            const idx = isPathHeader(splitRow(rows[sep - 1]));
            if (idx !== -1) pathCol = idx;
        }
    } else {
        // A table written without its separator row: a first row naming `Path` is still the header.
        const idx = isPathHeader(splitRow(rows[0]));
        if (idx !== -1) {
            pathCol = idx;
            body = rows.slice(1);
        }
    }
    const out = [];
    for (const row of body) {
        const cell = splitRow(row)[pathCol];
        if (!cell) continue;
        for (const ref of splitPathCell(cell)) {
            const normalized = normalizePath(ref);
            if (normalized) out.push(normalized);
        }
    }
    return out;
}

module.exports = { parseCanonicalRefs, splitPathCell };
