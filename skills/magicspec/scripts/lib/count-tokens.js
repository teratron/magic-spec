// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN COUNT (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one measure a task's pack budget is counted in: characters divided by
// four, rounded up. It is a relative measure, identical on every run and in
// every project, and not a tokenizer. The budget of the document set (10,000
// tokens for the computed units of a pack) was measured with it, so the checker
// and the pack builder both read this module and neither keeps its own.

/**
 * The token estimate of a text.
 *
 * @param {string} text - Any text.
 * @returns {number} Characters divided by four, rounded up; 0 for an empty text.
 */
function countTokens(text) {
    return Math.ceil(text.length / 4);
}

module.exports = {
    countTokens,
};
