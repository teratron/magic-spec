const fs = require('fs');
const path = require('path');
const { writeFileSafe } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// CHANGELOG WRITER (Keep a Changelog 1.1.0)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maintains the user-project root `CHANGELOG.md` in Keep-a-Changelog 1.1.0
 * format. Three operations:
 *
 *   - createIfMissing(path)            → bootstrap with empty Unreleased.
 *   - appendBullet(path, cat, text)    → idempotent insert into Unreleased.
 *   - releaseUnreleased(path, ver, dt) → rename `[Unreleased]` to `[X.Y.Z]`
 *                                         and add a fresh empty Unreleased
 *                                         section above it.
 *
 * Non-Keep-a-Changelog files are not parsed — we prepend a marker block
 * preserving the original content so users keep a chance to migrate.
 */

const KEEP_A_CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`;

const VALID_CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

const APPEND_MARKER = '<!-- magic-spec: appended below; original content preserved -->';

// ───────────────────────────────────────────────────────────────────────────
// Detection
// ───────────────────────────────────────────────────────────────────────────

/**
 * A file qualifies as Keep-a-Changelog when it has a `# Changelog` h1 *and*
 * at least one `## [...] - ...` or `## [Unreleased]` section. Anything
 * else falls through to prepend-with-marker mode.
 *
 * @param {string} content
 * @returns {boolean}
 */
function isKeepAChangelog(content) {
    if (!/^#\s+Changelog\b/m.test(content)) return false;
    return /^##\s+\[(?:Unreleased|\d+\.\d+\.\d+)\]/m.test(content);
}

// ───────────────────────────────────────────────────────────────────────────
// Bootstrap
// ───────────────────────────────────────────────────────────────────────────

/**
 * Creates an empty Keep-a-Changelog file with a single Unreleased section.
 *
 * @param {string} filePath - Absolute path to CHANGELOG.md.
 * @returns {boolean} True when written, false under dry-run.
 */
function createIfMissing(filePath) {
    if (fs.existsSync(filePath)) return false;
    const content = KEEP_A_CHANGELOG_HEADER + '\n## [Unreleased]\n';
    return writeFileSafe(filePath, content);
}

// ───────────────────────────────────────────────────────────────────────────
// Append Bullet
// ───────────────────────────────────────────────────────────────────────────

/**
 * Inserts a bullet under `## [Unreleased] → ### <category>`. Idempotent:
 * if the same bullet already exists in that category, no-op.
 *
 * @param {string} filePath - Absolute path to CHANGELOG.md.
 * @param {string} category - One of VALID_CATEGORIES.
 * @param {string} bullet - Bullet text without leading `- `.
 * @returns {{written: boolean, deduped: boolean, formatWarning: boolean}}
 */
function appendBullet(filePath, category, bullet) {
    if (!VALID_CATEGORIES.includes(category)) {
        throw new Error(`Invalid Keep-a-Changelog category: '${category}'. Use one of ${VALID_CATEGORIES.join(', ')}.`);
    }
    if (!fs.existsSync(filePath)) {
        createIfMissing(filePath);
    }
    const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : (KEEP_A_CHANGELOG_HEADER + '\n## [Unreleased]\n');

    if (!isKeepAChangelog(original)) {
        // Non-standard file: prepend a clearly-marked block with the new
        // entry, preserve original content below. Users see a warning so
        // they can migrate at their own pace.
        const block = [
            APPEND_MARKER,
            '',
            '## [Unreleased]',
            '',
            `### ${category}`,
            '',
            `- ${bullet}`,
            '',
        ].join('\n');
        const next = block + '\n' + original;
        const written = next !== original ? writeFileSafe(filePath, next) : false;
        return { written, deduped: false, formatWarning: true };
    }

    const next = insertIntoUnreleased(original, category, bullet);
    if (next === original) {
        return { written: false, deduped: true, formatWarning: false };
    }
    const written = writeFileSafe(filePath, next);
    return { written, deduped: false, formatWarning: false };
}

/**
 * Pure-string transform: insert a bullet into `## [Unreleased] → ### <cat>`.
 * Creates Unreleased and the category sub-section as needed. Returns the
 * original string verbatim when an identical bullet already exists.
 *
 * @param {string} content
 * @param {string} category
 * @param {string} bullet
 * @returns {string}
 */
function insertIntoUnreleased(content, category, bullet) {
    const unreleasedRe = /^##\s+\[Unreleased\]\s*$/m;
    let withUnreleased = content;
    let unrIdx;

    if (!unreleasedRe.test(content)) {
        // No Unreleased — insert one above the first versioned section.
        const firstVerRe = /^##\s+\[\d+\.\d+\.\d+\]/m;
        const m = content.match(firstVerRe);
        const insertAt = m ? m.index : content.length;
        const block = '## [Unreleased]\n\n';
        withUnreleased = content.slice(0, insertAt) + block + content.slice(insertAt);
    }

    const unrMatch = withUnreleased.match(unreleasedRe);
    unrIdx = unrMatch.index;
    const unrEnd = nextH2Index(withUnreleased, unrIdx + unrMatch[0].length);
    const unrBlock = withUnreleased.slice(unrIdx, unrEnd);

    const catRe = new RegExp(`^###\\s+${category}\\s*$`, 'm');
    let updatedBlock;

    if (catRe.test(unrBlock)) {
        // Category exists: dedup check, then append bullet.
        const catMatch = unrBlock.match(catRe);
        const catStart = catMatch.index;
        const catBodyStart = catStart + catMatch[0].length;
        const catEnd = nextH3Index(unrBlock, catBodyStart);
        const catBody = unrBlock.slice(catBodyStart, catEnd);

        if (bulletExists(catBody, bullet)) {
            return content;  // idempotent dedup
        }

        const trimmedBody = catBody.replace(/\s+$/, '');
        const newBody = (trimmedBody ? trimmedBody + '\n' : '\n') + `- ${bullet}\n`;
        updatedBlock =
            unrBlock.slice(0, catBodyStart) +
            '\n' + newBody +
            (unrBlock.slice(catEnd).startsWith('\n') ? '' : '\n') +
            unrBlock.slice(catEnd);
    } else {
        // Category missing: append at end of Unreleased block.
        const trimmed = unrBlock.replace(/\s+$/, '');
        updatedBlock = trimmed + '\n\n' + `### ${category}\n\n- ${bullet}\n\n`;
    }

    return withUnreleased.slice(0, unrIdx) + updatedBlock + withUnreleased.slice(unrEnd);
}

// ───────────────────────────────────────────────────────────────────────────
// Release Unreleased → [X.Y.Z] - YYYY-MM-DD
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renames the existing `## [Unreleased]` section to `## [X.Y.Z] - YYYY-MM-DD`
 * and inserts a fresh empty `## [Unreleased]` block above it.
 *
 * No-op when no Unreleased section exists. Returns object describing the
 * outcome.
 *
 * @param {string} filePath - Absolute path to CHANGELOG.md.
 * @param {string} version - SemVer string.
 * @param {string} date - ISO date `YYYY-MM-DD`.
 * @returns {{written: boolean, hadUnreleased: boolean}}
 */
function releaseUnreleased(filePath, version, date) {
    if (!fs.existsSync(filePath)) return { written: false, hadUnreleased: false };
    const original = fs.readFileSync(filePath, 'utf8');
    if (!isKeepAChangelog(original)) return { written: false, hadUnreleased: false };

    const unreleasedRe = /^##\s+\[Unreleased\]\s*$/m;
    if (!unreleasedRe.test(original)) return { written: false, hadUnreleased: false };

    const next = original.replace(unreleasedRe, `## [Unreleased]\n\n## [${version}] - ${date}`);
    if (next === original) return { written: false, hadUnreleased: true };
    const written = writeFileSafe(filePath, next);
    return { written, hadUnreleased: true };
}

// ───────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Finds the index of the next `## ` h2 heading, or end of string.
 *
 * @param {string} content
 * @param {number} from
 * @returns {number}
 */
function nextH2Index(content, from) {
    const re = /\n##\s+/g;
    re.lastIndex = from;
    const m = re.exec(content);
    return m ? m.index + 1 : content.length;
}

/**
 * Finds the index of the next `### ` h3 heading or `## ` h2 heading,
 * within the Unreleased block. Whichever comes first marks the end of the
 * current category body.
 *
 * @param {string} block
 * @param {number} from
 * @returns {number}
 */
function nextH3Index(block, from) {
    const re = /\n(?:###|##)\s+/g;
    re.lastIndex = from;
    const m = re.exec(block);
    return m ? m.index + 1 : block.length;
}

/**
 * Checks whether a bullet (text after `- `) already exists in a category
 * body, ignoring leading dash/whitespace differences.
 *
 * @param {string} body
 * @param {string} bullet
 * @returns {boolean}
 */
function bulletExists(body, bullet) {
    const target = normalize(bullet);
    return body.split(/\r?\n/).some((line) => {
        const m = line.match(/^\s*-\s+(.*\S)\s*$/);
        return m && normalize(m[1]) === target;
    });
}

/**
 * Normalizes whitespace and trims punctuation noise for comparison.
 *
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
    return String(s).replace(/\s+/g, ' ').trim().toLowerCase();
}

module.exports = {
    KEEP_A_CHANGELOG_HEADER,
    VALID_CATEGORIES,
    APPEND_MARKER,
    isKeepAChangelog,
    createIfMissing,
    appendBullet,
    releaseUnreleased,
    insertIntoUnreleased,
};
