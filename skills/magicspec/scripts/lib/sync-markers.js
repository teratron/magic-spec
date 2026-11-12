#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC MARKERS (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The delimiters of a derived block in a product file (SY-6) and the containment
// check its generated content must pass. A marker carries a neutral key and
// nothing about the SDD: `<!-- sync:{key} -->` … `<!-- /sync:{key} -->`.

const { STATE_DIR_NAME } = require('../utils');

/**
 * The opening and closing marker of a key.
 *
 * @param {string} key
 * @returns {{open: string, close: string}}
 */
function markersOf(key) {
    return { open: `<!-- sync:${key} -->`, close: `<!-- /sync:${key} -->` };
}

/**
 * Where the content of a block lies in a text: the index just after the opening marker and the
 * index of the closing marker. Null when either is missing or the pair is out of order.
 *
 * @param {string} text
 * @param {string} key
 * @returns {{from: number, to: number}|null}
 */
function blockRange(text, key) {
    const { open, close } = markersOf(key);
    const at = text.indexOf(open);
    if (at === -1) return null;
    const from = at + open.length;
    const to = text.indexOf(close, from);
    return to === -1 ? null : { from, to };
}

/**
 * The text with the content of a block replaced, everything outside the markers untouched.
 *
 * @param {string} text
 * @param {{from: number, to: number}} range
 * @param {string} content
 * @returns {string}
 */
function replaceRange(text, range, content) {
    return text.slice(0, range.from) + content + text.slice(range.to);
}

// ───────────────────────────────────────────────────────────────────────────
// Containment
// ───────────────────────────────────────────────────────────────────────────

/**
 * The classes of SDD reference a text carries, by the reference rule of the containment module:
 * a task identifier, a phase designator, an SDD system file, a specification file name and a path
 * into the state folder. Generated content that carries one is refused, never written.
 *
 * @param {string} text
 * @returns {string[]} Class names found, each once.
 */
function sddReferences(text) {
    const classes = [
        ['a task identifier', /\bT-\d+[A-Z]\d+(\.\d+)?\b/],
        ['a phase designator', /\b[Pp]hase[-\s]\d+/],
        ['an SDD system file', /\b(PLAN|TASKS|INDEX|RULES)\.md\b/],
        ['a specification file name', /\bl[12]-[a-z0-9-]+\.md\b/],
        ['a state-folder path', { test: (value) => value.includes(`${STATE_DIR_NAME}/`) }],
    ];
    return classes.filter(([, re]) => re.test(text)).map(([name]) => name);
}

module.exports = { markersOf, blockRange, replaceRange, sddReferences };
