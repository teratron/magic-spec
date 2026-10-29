#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('build-plugin', module);

const fs = require('fs');
const path = require('path');
const { engineRoot, normalizePath, parseFlags } = require('./utils');
const { readCommands } = require('./lib/hosts');

// ═══════════════════════════════════════════════════════════════════════════
// BUILD-PLUGIN (the optional Claude Code plugin channel)
// ═══════════════════════════════════════════════════════════════════════════
//
// A plugin whose single content source is this engine folder: the folder itself, copied
// in as the `magicspec` skill, and one thin skill per command so that the host registers
// `/magicspec:<command>`. The command skills are for the user to invoke and are kept out of
// the list the model chooses from. The plugin carries the version of the engine folder and
// no logic of its own. Command entries in the host's command folder (`init --host`) give
// the same names without a plugin; this channel adds marketplace distribution and updates.
//
// Usage: node scripts/executor.js build-plugin --out <dir>
//
// The output folder is written only when it is empty, absent, or an earlier build of this
// command (it holds the marker file); anything else is refused and left untouched.

const MARKER_FILE = '.magicspec-plugin';

const { values, errors } = parseFlags(process.argv.slice(2), { valueFlags: ['--out'] });
if (errors.length > 0 || !values['--out']) {
    console.error(`HALT: ${errors[0] || "'--out <dir>' is required."}`);
    process.exit(1);
}

const out = path.resolve(values['--out']);
const engine = engineRoot();
const version = fs.readFileSync(path.join(engine, '.version'), 'utf8').trim();

if (fs.existsSync(out)) {
    const entries = fs.readdirSync(out);
    if (entries.length > 0 && !entries.includes(MARKER_FILE)) {
        console.error(
            `HALT: '${normalizePath(out)}' is not empty and is not an earlier plugin build; nothing was written.`,
        );
        process.exit(1);
    }
    // An earlier build: replace its generated parts, nothing else.
    for (const name of ['.claude-plugin', 'skills', MARKER_FILE]) {
        fs.rmSync(path.join(out, name), { recursive: true, force: true });
    }
}

fs.mkdirSync(path.join(out, '.claude-plugin'), { recursive: true });
fs.writeFileSync(
    path.join(out, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify(
        {
            name: 'magicspec',
            version,
            description:
                'Specification-Driven Development: specify, plan and execute work through the magicspec skill.',
        },
        null,
        2,
    )}\n`,
);

// The engine folder, whole, as the `magicspec` skill (the router is its SKILL.md).
fs.cpSync(engine, path.join(out, 'skills', 'magicspec'), { recursive: true, dereference: true });

for (const command of readCommands()) {
    const dir = path.join(out, 'skills', command.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        path.join(dir, 'SKILL.md'),
        [
            '---',
            `name: ${command.name}`,
            `description: ${command.summary.replace(/\s+/g, ' ').trim()}`,
            'disable-model-invocation: true',
            '---',
            '',
            `Run the magicspec command \`${command.name}\`: load the \`magicspec\` skill, read its \`workflows/${command.name}.md\` and follow it.`,
            'Arguments: $ARGUMENTS',
            '',
        ].join('\n'),
    );
}
fs.writeFileSync(
    path.join(out, MARKER_FILE),
    `Generated from the magicspec skill folder, version ${version}.\n`,
);

console.log(
    `Plugin written to ${normalizePath(out)} (magicspec ${version}, ${readCommands().length} commands).`,
);
