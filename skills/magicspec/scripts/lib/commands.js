'use strict';

const { STATE_DIR_NAME } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND TABLE (the engine's command line contract)
// ═══════════════════════════════════════════════════════════════════════════
//
// One table names every command the executor runs, the options each one reads and
// the help it prints. The executor answers `--help` and rejects an unknown command, an
// unknown option, a missing value or a stray argument from this table before it starts
// the script, so a request for help or a typo never reaches code that writes. A script
// started by hand calls `guardArgv` first and gets the same answer.
//
// The table describes what the scripts already read; it grants nothing. A drift check in
// the harness compares each script's option literals with its entry, so a flag added to a
// script without an entry (or an entry without a reader) fails the suite.
//
// Option kinds:
//   bool      a switch, no value                 --json
//   value     a value, `--x v` or `--x=v`        --workspace
//   eq        a value, `--x=v` only              --name=web
//   space     a value, `--x v` only              --scope src
//   optSpace  an optional value, `--x [v]` only  --out [path]

/** Options the executor itself consumes for every command, before the table is read. */
const EXECUTOR_OPTIONS = Object.freeze([
    ['--workspace <name>', 'Act on this workspace (default: the one in workspace.json)'],
    ['--root <dir>', 'Act on this project (default: found from the working directory)'],
]);

/** @type {Record<string, {summary: string, options?: Record<string, {kind: string, help: string}>, positional?: string[], ownHelp?: boolean, provisions?: boolean}>} */
const COMMANDS = {
    'analyze-coverage': {
        summary: 'Classify project files by how well the specifications cover them.',
        options: {
            '--json': { kind: 'bool', help: 'Print machine-readable JSON' },
            '--scope': { kind: 'value', help: 'Comma-separated scope entries (default: the workspace scope)' },
        },
    },
    'archive-phases': {
        summary: 'Move finished phases (status Done, nothing left unchecked) into archives/tasks/.',
        provisions: true,
        options: {
            '--dry-run': { kind: 'bool', help: 'List what would be archived; change nothing' },
            '--check': { kind: 'bool', help: 'Report pending archival only; change nothing' },
        },
    },
    'build-plugin': {
        summary: 'Build the optional plugin folder from this engine folder.',
        options: {
            '--out': { kind: 'value', help: 'Target folder (empty, absent, or an earlier build of this command)' },
        },
    },
    'build-spec-graph': {
        summary: 'Build the specification knowledge graph and print its summary.',
        options: {
            '--json': { kind: 'bool', help: 'Print the whole graph as JSON (or write it with --out)' },
            '--out': { kind: 'optSpace', help: 'With --json: write the graph to a file (default: graph/query.json) and print one line' },
            '--html': { kind: 'optSpace', help: 'Write the interactive page (default: graph/graph.html)' },
            '--no-cache': { kind: 'bool', help: 'Ignore the extraction cache' },
        },
    },
    'check-bloat': {
        summary: 'Advisory: flag oversized specifications, phase files and working documents.',
        options: { '--json': { kind: 'bool', help: 'Print machine-readable JSON' } },
    },
    'check-prerequisites': {
        summary: 'Pre-flight: engine integrity, projections, registry and plan consistency.',
        options: {
            '--json': { kind: 'bool', help: 'Print machine-readable JSON (what the workflows read)' },
            '--require-plan': { kind: 'bool', help: 'Fail when PLAN.md is missing' },
            '--require-tasks': { kind: 'bool', help: 'Fail when TASKS.md is missing' },
            '--require-specs': { kind: 'bool', help: 'Fail when no specification exists' },
            '--verify-headers': { kind: 'bool', help: 'Compare each specification header with the registry' },
        },
    },
    'create-workspace': {
        summary: 'Create a workspace folder and register it in workspace.json.',
        options: {
            '--name': { kind: 'eq', help: 'Workspace name (required), as --name=<name>' },
            '--description': { kind: 'eq', help: 'One-line description, as --description="..."' },
            '--default': { kind: 'bool', help: 'Make it the default workspace' },
            '--dry-run': { kind: 'bool', help: 'Print the plan; change nothing' },
        },
    },
    'detect-communities': {
        summary: 'Detect communities in the dependency graph and score them against workspace scopes.',
        options: {
            '--json': { kind: 'bool', help: 'Print machine-readable JSON' },
            '--include-md': { kind: 'bool', help: 'Include Markdown files as nodes' },
            '--threshold': { kind: 'value', help: 'Oversized-community threshold in percent (default 25)' },
            '--max-iter': { kind: 'value', help: 'Iteration limit (default 50)' },
            '--min-nodes': { kind: 'value', help: 'Smallest community to report (default 2)' },
        },
    },
    'diff-spec-graph': {
        summary: 'Compare two graph snapshots.',
        positional: ['<before.json>', '<after.json>'],
        options: { '--json': { kind: 'bool', help: 'Print machine-readable JSON' } },
    },
    'export-wiki': {
        summary: 'Export the graph as a Markdown wiki under graph/wiki/.',
        options: {
            '--from-file': { kind: 'space', help: 'Use a graph JSON file instead of building the graph' },
            '--out': { kind: 'space', help: 'Write the wiki to this folder' },
        },
    },
    'extract-rationale': {
        summary: 'Find design-rationale markers in source and detect logic no specification covers.',
        options: {
            '--json': { kind: 'bool', help: 'Print machine-readable JSON' },
            '--scope': { kind: 'value', help: 'Comma-separated scope entries (default: the workspace scope)' },
        },
    },
    finalize: {
        summary: 'Post-workflow: version bump, changelog entry, STATE.md update and phase archival.',
        provisions: true,
        options: {
            '--workflow': { kind: 'value', help: 'spec | task | run | rule (required)' },
            '--dry-run': { kind: 'bool', help: 'Report what would change; write nothing' },
            '--no-bump': { kind: 'bool', help: 'Skip the project version bump' },
            '--no-changelog': { kind: 'bool', help: 'Skip the changelog entry' },
            '--force': { kind: 'bool', help: 'Finalize even when no change is significant' },
        },
    },
    'generate-context': {
        summary: 'Regenerate CONTEXT.md from the current project state.',
        provisions: true,
    },
    init: {
        summary: 'Create the SDD workspace, install the pre-commit hook, project the rule and commands for hosts.',
        provisions: true,
        options: {
            '--host': { kind: 'value', help: 'Comma-separated hosts to project for: claude, codex, qwen' },
        },
    },
    'install-hooks': {
        summary: 'Install the git pre-commit hook that checks engine integrity.',
    },
    migrate: {
        summary: 'Migrate a 2.x project to the current layout (a dry run unless --apply is given).',
        options: {
            '--apply': { kind: 'bool', help: 'Execute the plan' },
            '--host': { kind: 'value', help: 'Comma-separated hosts to project for (default: the hosts found)' },
        },
    },
    'record-diagnostic': {
        summary: 'Record a finding so the next finalize digest shows it. Always exits 0.',
        options: {
            '--severity': { kind: 'value', help: 'error | warning | fix' },
            '--code': { kind: 'value', help: 'UPPER_SNAKE_CASE code' },
            '--message': { kind: 'value', help: 'One line' },
            '--source': { kind: 'value', help: 'Origin (default: agent)' },
            '--locus': { kind: 'value', help: 'File or place concerned' },
            '--remedy': { kind: 'value', help: 'Suggested fix' },
        },
    },
    'release-changelog': {
        summary: 'Rotate CHANGELOG.md [Unreleased] into a dated release section.',
        ownHelp: true,
        options: {
            '--version': { kind: 'value', help: 'X.Y.Z (default: the project version)' },
            '--date': { kind: 'value', help: 'YYYY-MM-DD (default: today, UTC)' },
        },
    },
    remove: {
        summary: 'Remove the engine from this project: the marked projections, the hook and the engine folder. Keeps ' + STATE_DIR_NAME + '/ and your files.',
        options: {
            '--dry-run': { kind: 'bool', help: 'List what would be removed; change nothing' },
        },
    },
    'resume-state': {
        summary: 'Print one line when a task was left In Progress (silent otherwise).',
        options: {
            '--all': { kind: 'bool', help: 'Read every registered workspace' },
            '--json': { kind: 'bool', help: 'Print machine-readable JSON' },
        },
    },
    'serve-spec-graph': {
        summary: 'Serve the graph to an agent over stdio (MCP, JSON-RPC 2.0).',
    },
    'update-engine-meta': {
        summary: 'Verify engine integrity (--check); in the engine repository also bump the version and regenerate the manifest.',
        options: {
            '--check': { kind: 'bool', help: 'Verify only; exit 1 on drift' },
            '--workflow': { kind: 'value', help: 'Accepted and ignored (older callers pass it)', ignored: true },
        },
    },
    'update-state': {
        summary: 'Patch STATE.md (live project memory).',
        provisions: true,
        options: {
            '--task': { kind: 'value', help: 'Current task, "{T-ID} {title}"' },
            '--status': { kind: 'value', help: 'Active | Blocked | Paused' },
            '--phase': { kind: 'value', help: 'Phase, "{N} — {name}"' },
            '--next-action': { kind: 'value', help: 'Next action' },
            '--decision': { kind: 'value', help: 'Append a decision' },
            '--constraint-title': { kind: 'value', help: 'Add a blocking constraint: title' },
            '--constraint-desc': { kind: 'value', help: 'Add a blocking constraint: description' },
            '--bootstrap': { kind: 'value', help: 'true | false' },
            '--auto-progress': { kind: 'bool', help: 'Recompute the progress block' },
        },
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// LOOKUP & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @returns {string[]} The names of all commands, sorted.
 */
function commandNames() {
    return Object.keys(COMMANDS).sort();
}

/**
 * @param {string} name - Candidate command name.
 * @returns {boolean} True when the table holds it (own keys only).
 */
function isCommand(name) {
    return Object.hasOwn(COMMANDS, name);
}

/**
 * Checks the arguments that follow a command against its entry. Pure: reads nothing
 * from the file system and writes nothing.
 *
 * @param {string} name - A command in the table.
 * @param {string[]} argv - The arguments after the command, without the executor's own options.
 * @returns {string[]} Messages for what is wrong; empty when the arguments are acceptable.
 */
function validateArgv(name, argv) {
    return validateEntry(COMMANDS[name], argv);
}

/**
 * The same check for any entry of the same shape (the maintenance scripts keep a table of their own).
 *
 * @param {{options?: Record<string, {kind: string, help: string}>, positional?: string[], ownHelp?: boolean}} entry - A command entry.
 * @param {string[]} argv - The arguments after the command.
 * @returns {string[]} Messages for what is wrong; empty when the arguments are acceptable.
 */
function validateEntry(entry, argv) {
    const options = entry.options || {};
    const positionalMax = (entry.positional || []).length;
    const errors = [];
    let positionals = 0;

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === '--') {
            positionals += argv.length - i - 1;
            break;
        }
        if (!token.startsWith('-') || token === '-') {
            positionals++;
            continue;
        }
        // A command that prints its own help is passed the request, not refused for it.
        if (entry.ownHelp && (token === '--help' || token === '-h')) continue;
        const eq = token.indexOf('=');
        const key = token.startsWith('--') && eq !== -1 ? token.slice(0, eq) : token;
        const hasEq = token.startsWith('--') && eq !== -1;
        const spec = Object.hasOwn(options, key) ? options[key] : null;
        if (!spec) {
            errors.push(`Unknown option '${key}'.`);
            continue;
        }
        const next = argv[i + 1];
        const nextIsValue = next !== undefined && !next.startsWith('--');
        switch (spec.kind) {
            case 'bool':
                if (hasEq) errors.push(`'${key}' is a switch and takes no value.`);
                break;
            case 'value':
                if (hasEq) {
                    if (token.slice(eq + 1) === '') errors.push(`'${key}' requires a non-empty value.`);
                } else if (nextIsValue) i++;
                else errors.push(`'${key}' requires a value (use ${key}=<value> or ${key} <value>).`);
                break;
            case 'eq':
                if (!hasEq || token.slice(eq + 1) === '') {
                    errors.push(`'${key}' requires a value, written ${key}=<value>.`);
                }
                break;
            case 'space':
                if (hasEq) errors.push(`'${key}' takes its value as a separate argument: ${key} <value>.`);
                else if (nextIsValue) i++;
                else errors.push(`'${key}' requires a value: ${key} <value>.`);
                break;
            case 'optSpace':
                if (hasEq) errors.push(`'${key}' takes its optional value as a separate argument: ${key} [value].`);
                else if (nextIsValue) i++;
                break;
            default:
                errors.push(`Internal: option '${key}' has an unknown kind '${spec.kind}'.`);
        }
    }

    if (positionals > positionalMax) {
        errors.push(
            positionalMax === 0
                ? `Unexpected argument${positionals > 1 ? 's' : ''}: this command takes none.`
                : `Too many arguments: expected ${positionalMax} (${entry.positional.join(' ')}).`,
        );
    }
    return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELP TEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {string} name - A command in the table.
 * @returns {string} The one-line usage, as typed after the executor.
 */
function usageLine(name) {
    return usageFor(name, COMMANDS[name]);
}

/**
 * @param {string} name - The command's name.
 * @param {{options?: Record<string, {kind: string, help: string}>, positional?: string[]}} entry - Its entry.
 * @returns {string} The one-line usage.
 */
function usageFor(name, entry) {
    const parts = [name];
    for (const [flag, spec] of Object.entries(entry.options || {})) {
        const shown =
            spec.kind === 'bool'
                ? flag
                : spec.kind === 'eq'
                  ? `${flag}=<value>`
                  : spec.kind === 'optSpace'
                    ? `${flag} [value]`
                    : `${flag} <value>`;
        parts.push(`[${shown}]`);
    }
    for (const p of entry.positional || []) parts.push(p);
    return parts.join(' ');
}

/**
 * @param {string} name - A command in the table.
 * @param {string} [prefix] - What starts the command line, for example `node <engine>/scripts/executor.js`.
 * @returns {string} Help for the command: summary, usage, options.
 */
function helpText(name, prefix = 'node scripts/executor.js') {
    return helpFor(name, COMMANDS[name], prefix, true);
}

/**
 * @param {string} name - The command's name.
 * @param {{summary: string, options?: Record<string, {kind: string, help: string}>, positional?: string[]}} entry - Its entry.
 * @param {string} prefix - What starts the command line.
 * @param {boolean} [viaExecutor] - Whether the executor's own options apply (the engine's commands).
 * @param {string|null} [usageTail] - The usage after the prefix, when it is not the command name and its options.
 * @returns {string} Help for the command: summary, usage, options.
 */
function helpFor(name, entry, prefix, viaExecutor = false, usageTail = null) {
    const usage = usageTail === null ? usageFor(name, entry) : usageTail;
    const lines = [`${name} — ${entry.summary}`, '', `Usage: ${prefix} ${usage}`.trimEnd()];
    const shown = (flag, spec) => {
        if (spec.kind === 'bool') return flag;
        if (spec.kind === 'eq') return `${flag}=<value>`;
        if (spec.kind === 'optSpace') return `${flag} [value]`;
        return `${flag} <value>`;
    };
    const rows = Object.entries(entry.options || {}).map(([flag, spec]) => [
        shown(flag, spec),
        spec.help,
    ]);
    rows.push(['--help', 'Show this text']);
    lines.push('', 'Options:');
    for (const [flag, help] of rows) lines.push(`  ${flag.padEnd(22)} ${help}`);
    if (viaExecutor) {
        lines.push('', 'Options of the executor (any command):');
        for (const [flag, help] of EXECUTOR_OPTIONS) {
            lines.push(`  ${flag.padEnd(22)} ${help}`);
        }
    }
    return lines.join('\n');
}

/**
 * @param {string} [prefix] - What starts the command line.
 * @returns {string} The list of commands with their summaries.
 */
function listText(prefix = 'node scripts/executor.js') {
    const names = commandNames();
    const width = Math.max(...names.map((n) => n.length));
    const lines = [`Usage: ${prefix} <command> [options]`, '', 'Commands:'];
    for (const n of names) lines.push(`  ${n.padEnd(width)}  ${COMMANDS[n].summary}`);
    lines.push('', `Run \`${prefix} <command> --help\` for the options of one command.`);
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARD FOR A SCRIPT STARTED BY HAND
// ═══════════════════════════════════════════════════════════════════════════

/**
 * First act of a script that runs as a program: answers `--help` and refuses what the table
 * does not allow, before the script reads or writes anything. Does nothing when the script is
 * loaded by another module (a test, a library caller), so it never meets the host's own argv.
 *
 * @param {string} name - The command, as in the table.
 * @param {NodeModule} scriptModule - The calling script's `module`.
 * @returns {void}
 */
function guardArgv(name, scriptModule) {
    if (require.main !== scriptModule) return;
    const argv = process.argv.slice(2);
    const entry = COMMANDS[name];
    if (!entry) return;
    if (!entry.ownHelp && (argv.includes('--help') || argv.includes('-h'))) {
        console.log(helpText(name, 'node <engine>/scripts/executor.js'));
        process.exit(0);
    }
    if (argv.includes('--help') || argv.includes('-h')) return;
    // `--workspace` and `--root` belong to the executor; a script started by hand may still be given them.
    const own = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--workspace' || argv[i] === '--root') {
            i++;
            continue;
        }
        if (argv[i].startsWith('--workspace=') || argv[i].startsWith('--root=')) continue;
        own.push(argv[i]);
    }
    const errors = validateArgv(name, own);
    if (errors.length > 0) {
        console.error(`HALT: ${errors[0]}`);
        console.error(`Usage: ${usageLine(name)}   (see --help)`);
        process.exit(1);
    }
}

module.exports = {
    COMMANDS,
    EXECUTOR_OPTIONS,
    commandNames,
    isCommand,
    validateArgv,
    validateEntry,
    usageLine,
    usageFor,
    helpText,
    helpFor,
    listText,
    guardArgv,
};
