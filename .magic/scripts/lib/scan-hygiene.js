#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SCAN HYGIENE (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// Implements l1-scan-input-hygiene.md SH-2/SH-5: one shared strip-before-match
// step for every scan that must not read a quoted token as a token in force.
// Two independent copies of this exact pair of regexes existed before this
// module (phase-archiver.js, update-state.js) and had not yet drifted apart —
// which is the failure mode SH-5 exists to close: nothing would have revealed
// it if they had.

/**
 * Removes fenced code blocks and inline code-spans from markdown, replacing
 * each stripped line with a blank line so line numbers in the input still
 * map to the same line numbers in the output (SH-2, spec.md §5.1).
 *
 * Fenced blocks are removed before inline spans: a fence may contain a
 * backtick run that would otherwise be read as a span delimiter and swallow
 * text past the fence.
 *
 * Blockquotes, HTML comments, and link reference definitions are NOT
 * stripped — a token inside those is still asserted, per §2 Constraints.
 *
 * @param {string} content - Raw markdown source.
 * @returns {string} Same line count as `content`, with quoted constructs blanked.
 */
function stripQuoted(content) {
    // Blank every non-newline character in the match, so a multi-line
    // construct collapses to the same number of (now-empty) lines it
    // started with — matches the original callers' char classes exactly
    // (`[\s\S]*?` for fences, `[^\`]*` for spans, both newline-permissive).
    const blank = (match) => match.replace(/[^\r\n]/g, '');
    return content
        .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, blank)
        .replace(/`[^`]*`/g, blank);
}

module.exports = { stripQuoted };
