// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// WIKI TEXT (shared by the article renderers of the wiki)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filesystem-safe slug for a node id or label fragment.
 *
 * @param {string} raw
 * @returns {string}
 */
function slugify(raw) {
    return (
        String(raw)
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/\s+/g, '_')
            .replace(/[^\w.-]/g, '')
            .slice(0, 120) || 'untitled'
    );
}

/**
 * Joins rendered lines into a document with one trailing newline and no run of
 * blank lines (markdownlint MD012), so a section that renders empty cannot
 * double the separator its neighbours already emit.
 *
 * @param {string[]} lines
 * @returns {string}
 */
function joinMarkdown(lines) {
    /** @type {string[]} */
    const out = [];
    for (const line of lines) {
        if (line === '' && out[out.length - 1] === '') continue;
        out.push(line);
    }
    return out.join('\n').replace(/\n+$/, '') + '\n';
}

module.exports = {
    slugify,
    joinMarkdown,
};
