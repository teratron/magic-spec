#!/usr/bin/env node
'use strict';

const path = require('path');
const { parseFlags } = require('./utils');
const { releaseUnreleased } = require('./lib/changelog-writer');
const { readVersion } = require('./lib/project-version');

// ═══════════════════════════════════════════════════════════════════════════
// RELEASE-CHANGELOG (Explicit Opt-In Rotation, R11)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renames the root CHANGELOG.md's `[Unreleased]` section to a dated version
 * heading and opens a fresh empty one. Deliberately NOT wired into finalize —
 * "what constitutes a release" is a question only the project maintainer can
 * answer (a pushed git tag, an `npm publish`, an App Store submission —
 * magic-spec cannot observe any of these), so rotation is an explicit,
 * opt-in action invoked when a real release happens, never a side effect of
 * routine SDD workflow activity.
 */
function runCli() {
    const args = process.argv.slice(2);
    const { values, errors } = parseFlags(args, {
        valueFlags: ['--version', '--date'],
    });

    if (errors.length > 0) {
        console.error(`HALT: ${errors[0]}`);
        process.exit(1);
    }

    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    const version = values['--version']
        || readVersion(path.join(process.cwd(), '.design', '.version')).version;
    const date = values['--date'] || new Date().toISOString().slice(0, 10);

    const result = releaseUnreleased(changelogPath, version, date);

    if (!result.hadUnreleased) {
        console.log('[release-changelog] No [Unreleased] section found — nothing to rotate.');
        process.exit(0);
    }
    if (!result.written) {
        console.log(`[release-changelog] No changes written for [${version}] - ${date} (dry-run).`);
        process.exit(0);
    }
    console.log(`[release-changelog] Rotated [Unreleased] → [${version}] - ${date}. Fresh [Unreleased] opened.`);
    process.exit(0);
}

if (require.main === module) {
    runCli();
}

module.exports = { runCli };
