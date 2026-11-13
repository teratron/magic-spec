#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./cli-guard').guardCli('check-security-policy', module);

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY POLICY CHECK (release gate)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Checks the supported-versions table of the security policy against the version being released:
 * the release's minor line must be listed as supported, and no other line may be. The policy
 * promises fixes to the latest minor line of the current major version only, so a table that
 * still supports an earlier line, or leaves out the line being released, is stale.
 *
 * Read-only. Exit 0 when the table matches, 1 with every mismatch named when it does not.
 */

const ROOT_DIR = path.resolve(__dirname, '..');

// ───────────────────────────────────────────────────────────────────────────
// Policy Parsing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the rows of the supported-versions table: `| \`3.0.x\` | Yes |`.
 *
 * @param {string} text - Content of the policy file.
 * @returns {{label: string, line: string, supported: boolean}[]} One entry per row, in order. The
 *          `line` is the label without its trailing `.x` (`3.0.x` → `3.0`, `1.x` → `1`).
 */
function parseSupportedVersions(text) {
    const rows = [];
    for (const row of text.split(/\r?\n/)) {
        const cells = /^\|\s*`([^`]+)`\s*\|\s*(Yes|No)\s*\|/i.exec(row);
        if (!cells) continue;
        rows.push({
            label: cells[1],
            line: cells[1].replace(/\.x$/i, ''),
            supported: cells[2].toLowerCase() === 'yes',
        });
    }
    return rows;
}

/**
 * @param {string} version - A version such as `3.0.31`.
 * @returns {string|null} Its minor line (`3.0`), or `null` when it is not a version.
 */
function minorLineOf(version) {
    const parts = /^(\d+)\.(\d+)\.\d+/.exec(version.trim());
    return parts ? `${parts[1]}.${parts[2]}` : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Check
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} policyText - Content of the policy file.
 * @param {string} version - The version being released.
 * @returns {string[]} The mismatches, each naming the line and what is wrong; empty when the table matches.
 */
function checkPolicy(policyText, version) {
    const releaseLine = minorLineOf(version);
    if (!releaseLine) return [`'${version}' is not a version (expected major.minor.patch)`];

    const rows = parseSupportedVersions(policyText);
    if (rows.length === 0)
        return ['the policy has no supported-versions table (rows like | `3.0.x` | Yes |)'];

    const problems = [];
    const releaseRows = rows.filter((row) => row.line === releaseLine);
    if (releaseRows.length === 0) {
        problems.push(`the policy does not list the ${releaseLine} line, which is being released`);
    } else if (releaseRows.some((row) => !row.supported)) {
        problems.push(
            `the policy lists the ${releaseLine} line, which is being released, as not supported`,
        );
    }
    if (releaseRows.some((row) => row.supported) && releaseRows.some((row) => !row.supported)) {
        problems.push(
            `the policy lists the ${releaseLine} line as both supported and not supported`,
        );
    }
    for (const row of rows) {
        if (row.supported && row.line !== releaseLine) {
            problems.push(
                `the policy lists ${row.label} as supported, but only the latest minor line (${releaseLine}) is`,
            );
        }
    }
    return problems;
}

// ───────────────────────────────────────────────────────────────────────────
// Command Line
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv - The arguments after the script name.
 * @param {string} flag - Option to read, written `--x value`.
 * @returns {string|null} The value, or `null` when the option is absent.
 */
function readOption(argv, flag) {
    const at = argv.indexOf(flag);
    return at === -1 ? null : argv[at + 1];
}

function main() {
    const argv = process.argv.slice(2);
    const policyPath = path.resolve(ROOT_DIR, readOption(argv, '--policy') || 'SECURITY.md');
    const version =
        readOption(argv, '--version') ||
        fs.readFileSync(path.join(ROOT_DIR, 'skills', 'magicspec', '.version'), 'utf8').trim();

    if (!fs.existsSync(policyPath)) {
        console.error(
            `[BLOCKED] The security policy is missing: ${path.relative(ROOT_DIR, policyPath)}`,
        );
        process.exit(1);
    }
    const problems = checkPolicy(fs.readFileSync(policyPath, 'utf8'), version);
    if (problems.length > 0) {
        for (const problem of problems)
            console.error(`[BLOCKED] ${path.basename(policyPath)}: ${problem}`);
        process.exit(1);
    }
    console.log(
        `✅ ${path.basename(policyPath)} supports the ${minorLineOf(version)} line, as ${version} requires.`,
    );
}

if (require.main === module) main();

module.exports = { parseSupportedVersions, minorLineOf, checkPolicy };
