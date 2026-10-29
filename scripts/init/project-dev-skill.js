#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { repoRoot } = require('../engine-path');

// ═══════════════════════════════════════════════════════════════════════════
// MAINTENANCE SKILL PROJECTION
// ═══════════════════════════════════════════════════════════════════════════
//
// Makes the maintenance skill reachable the way `init --host` makes the engine skill
// reachable: a directory link from the shared skills folder, and one command entry per
// maintenance command in a `magicspec-dev/` subfolder of the command folder (the
// subfolder is the colon namespace, so the entry for `test` is `/magicspec-dev:test`).
// The engine's own generator does not do this: the maintenance skill is not part of
// the engine archive. Every entry carries a marker, and a file without one is left alone.

const SKILL_REL = path.join('skills', 'magicspec-dev');
const LINK_REL = path.join('.agents', 'skills', 'magicspec-dev');
const COMMANDS_REL = path.join('.agents', 'workflows', 'magicspec-dev');
const MARKER = (name) => `<!-- magicspec-dev-command ${name} -->`;

/**
 * Reads the command table of the maintenance router.
 *
 * @param {string} root - Repository root.
 * @returns {{name: string, summary: string}[]} The commands, in table order.
 */
function readCommands(root) {
    const text = fs.readFileSync(path.join(root, SKILL_REL, 'SKILL.md'), 'utf8');
    const commands = [];
    for (const line of text.split(/\r?\n/)) {
        const row = /^\| `([a-z][a-z-]*)` \| (.+?) \| `workflows\/[a-z-]+\.md` \|$/.exec(line);
        if (row) commands.push({ name: row[1], summary: row[2] });
    }
    if (commands.length === 0) throw new Error('No command rows in the maintenance router.');
    return commands;
}

/**
 * Links the skill folder into the shared skills folder and writes the command entries.
 *
 * @param {string} root - Repository root.
 * @returns {string[]} One line per file or link touched.
 */
function project(root) {
    const report = [];
    const target = fs.realpathSync(path.join(root, SKILL_REL));
    const link = path.join(root, LINK_REL);
    let existing = null;
    try {
        existing = fs.realpathSync(link);
    } catch {
        /* absent */
    }
    if (existing === null) {
        fs.mkdirSync(path.dirname(link), { recursive: true });
        fs.symlinkSync(target, link, 'junction');
        report.push(`linked ${LINK_REL.split(path.sep).join('/')}`);
    } else if (existing !== target) {
        report.push(`conflict: ${LINK_REL.split(path.sep).join('/')} leads elsewhere`);
    }

    for (const command of readCommands(root)) {
        const file = path.join(root, COMMANDS_REL, `${command.name}.md`);
        const content = [
            '---',
            `description: ${command.summary.replace(/\s+/g, ' ').trim()}`,
            '---',
            MARKER(command.name),
            `Run the magicspec-dev command \`${command.name}\`: load the \`magicspec-dev\` skill, read its \`workflows/${command.name}.md\` and follow it.`,
            'Arguments: $ARGUMENTS',
            '',
        ].join('\n');
        if (
            fs.existsSync(file) &&
            !fs.readFileSync(file, 'utf8').includes('<!-- magicspec-dev-command ')
        ) {
            report.push(`left alone: ${path.relative(root, file).split(path.sep).join('/')}`);
            continue;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) {
            fs.writeFileSync(file, content);
            report.push(`wrote ${path.relative(root, file).split(path.sep).join('/')}`);
        }
    }
    return report;
}

if (require.main === module) {
    for (const line of project(repoRoot())) console.log(`   ${line}`);
}

module.exports = { project, readCommands };
