'use strict';

const { enginePath } = require('./engine-path');

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND LINE GUARD (maintenance scripts)
// ═══════════════════════════════════════════════════════════════════════════
//
// The maintenance scripts write to the repository: the manifest, the registries, the docs. A
// request for help, or a typo in an option, must not reach that code. Each script calls
// `guardCli` as its first act; it answers `--help` and refuses what the script does not read,
// with the grammar of the engine's own command table (`lib/commands.js`), so there is one
// definition of what an option is. The table below describes what the scripts already read;
// the harness compares it with the scripts' source.

const commands = require(enginePath('scripts', 'lib', 'commands'));

/**
 * @type {Record<string, {summary: string, options?: Record<string, {kind: string, help: string}>, positional?: string[]}>}
 */
const MAINTENANCE_COMMANDS = {
    'sync-docs': {
        summary: 'Regenerate CONTRIBUTING.md and the Sync Note lines of docs/ from the registries.',
    },
    'sync-manifests': {
        summary: 'Align the version in README.md and package.json with the engine version.',
    },
    'sync-engine-snapshot': {
        summary: 'Write the engine version into the Engine Version field of the global registry.',
    },
    'update-project-meta': {
        summary: 'Update the metadata of the registries (version, history row, spec counts).',
        options: {
            '--workspace': { kind: 'value', help: 'Workspace to update (default: every registered one)' },
            '--message': { kind: 'value', help: 'History row text (default: "Automated metadata update")' },
            '-m': { kind: 'value', help: 'Same as --message' },
            '--force': { kind: 'bool', help: 'Write even when nothing structural changed' },
        },
    },
    'generate-checksums': {
        summary: 'Rebuild the integrity manifest (.checksums) of an engine folder.',
        options: {
            '--dir': { kind: 'value', help: 'Engine folder (default: skills/magicspec)' },
        },
    },
    'validate-hardlinks': {
        summary: 'Check the links and hardlinks the repository keeps for agent hosts.',
        options: {
            '--strict': { kind: 'bool', help: 'Exit non-zero on any drift' },
        },
    },
    benchmark: {
        summary: 'Compare the token cost of graph queries with reading the raw specifications.',
        options: {
            '--depth': { kind: 'space', help: 'Breadth-first depth for graph queries (default 2)' },
            '--top': { kind: 'space', help: 'How many god nodes seed the queries (default 5)' },
            '--json': { kind: 'bool', help: 'Print machine-readable JSON' },
        },
    },
};

/**
 * First act of a maintenance script that runs as a program: answers `--help` and refuses an
 * option the script does not read, before anything is read or written. Does nothing when the
 * script is loaded by another module.
 *
 * @param {string} name - The script, as in the table above.
 * @param {NodeModule} scriptModule - The calling script's `module`.
 * @returns {void}
 */
function guardCli(name, scriptModule) {
    if (require.main !== scriptModule) return;
    const entry = MAINTENANCE_COMMANDS[name];
    if (!entry) throw new Error(`cli-guard: '${name}' is not in the maintenance table.`);
    const argv = process.argv.slice(2);
    const tail = commands.usageFor(name, entry).slice(name.length).trim();
    const usage = `node scripts/${name}.js ${tail}`.trimEnd();
    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(commands.helpFor(`${name}.js`, entry, 'node', false, `scripts/${name}.js ${tail}`.trimEnd()));
        process.exit(0);
    }
    const errors = commands.validateEntry(entry, argv);
    if (errors.length > 0) {
        console.error(`HALT: ${errors[0]}`);
        console.error(`Usage: ${usage}   (see --help)`);
        process.exit(2);
    }
}

module.exports = { MAINTENANCE_COMMANDS, guardCli };
