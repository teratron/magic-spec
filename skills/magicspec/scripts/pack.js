#!/usr/bin/env node
// @ts-check
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('pack', module);

const fs = require('node:fs');
const path = require('node:path');
const { loadDocSet, computePack, locateSet, notSetLine, DEFAULT_BUDGET } = require('./check-docs');
const { countTokens } = require('./lib/count-tokens');
const { resolveProjectRoot, resolveDesignRoot, runMain } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// PACK (The Computed Context of One Task)
// ═══════════════════════════════════════════════════════════════════════════
//
// Assembles the pack of one task of a 4.0 workspace, in the order of the concept (§5.6): one
// line that keeps the documents out of what the task creates, then the tools of the task's stack
// as its profile states them, then the task, then the preamble of the component it builds, the
// units of its Consumes and Context, the units they reference or whose names they use, each
// verbatim; then **Done before this task**, the files the tasks it is After created, as built,
// read from the project.
//
// The pack is written to `.magicspec/.cache/packs/{workspace}/{task}.md`, a rebuildable cache
// that `clean-cache` removes, and the line printed gives its size against the budget. The budget
// counts the computed units only, without the task, the stack's tools and Done before this task;
// a pack over the budget is written all the same and says so, because the checker, not this
// script, is the gate.
//
// Usage:
//   node skills/magicspec/scripts/executor.js pack <task> [--include <file>]...

/** Opens every pack, outside the computed units: the documents stay out of the product. */
const CONTAINMENT_LINE =
    'No address or path of these documents is written into anything this task creates.';

// ───────────────────────────────────────────────────────────────────────────
// Done Before This Task
// ───────────────────────────────────────────────────────────────────────────

/**
 * The tasks a task is After, directly or not, in the order of the task list.
 *
 * @param {{ address: string, after: string[] }[]} tasks - Every task of the set.
 * @param {string} address - The task.
 * @returns {string[]} Their addresses.
 */
function afterClosure(tasks, address) {
    const byAddress = new Map(
        tasks.map((t) => [
            t.address,
            t,
        ]),
    );
    const seen = new Set();
    const stack = [
        ...(byAddress.get(address)?.after ?? []),
    ];
    while (stack.length) {
        const a = /** @type {string} */ (stack.pop());
        if (seen.has(a)) continue;
        seen.add(a);
        stack.push(...(byAddress.get(a)?.after ?? []));
    }
    return tasks.map((t) => t.address).filter((a) => seen.has(a));
}

/**
 * The file names written in a task's Creates text: words with an extension, such as
 * `src/hello.rs` or `` `go.mod` ``. A word that is not a file of the project is dropped by the caller.
 *
 * @param {string} creates - The Creates field.
 * @returns {string[]} Distinct names, in the order written.
 */
function fileNamesIn(creates) {
    const names = creates.match(/[\w./-]+/g) ?? [];
    return [
        ...new Set(names.filter((n) => /^[\w./-]*[\w-]\.[A-Za-z0-9]+$/.test(n))),
    ];
}

/**
 * The files of a map entry that hold a component's interface: its API files under its path, or
 * the path itself when it names a file.
 *
 * @param {string | null} mapText - The text of `memory/map.md`.
 * @param {string} key - The component.
 * @returns {string[]} Paths relative to the project.
 */
function mapFiles(mapText, key) {
    const rows = (mapText ?? '').split(/\r?\n/).map((line) => line.split('|').map((c) => c.trim()));
    const header = rows.find((cells) => cells.some((c) => /^API/.test(c))) ?? [];
    const row = rows.find((cells) => cells[1]?.replace(/`/g, '') === `map:${key}`);
    if (!row) return [];
    const where = (row[2] ?? '').replace(/`/g, '');
    const base = /^[\w./-]+$/.test(where) ? where : '';
    const api = header.findIndex((c) => /^API/.test(c));
    const listed = api === -1 ? [] : fileNamesIn(row[api] ?? '');
    return listed.length
        ? listed.map((f) => path.posix.join(base, f))
        : [
              base,
          ].filter(Boolean);
}

/**
 * A file of the project as a section of the pack, or null when it is not a file inside the project.
 *
 * @param {string} projectRoot
 * @param {string} name - A path relative to the project, or absolute.
 * @returns {{ name: string, text: string } | null}
 */
function readBuilt(projectRoot, name) {
    const full = path.resolve(projectRoot, name);
    const inside = path.relative(projectRoot, full);
    if (inside.startsWith('..') || path.isAbsolute(inside)) return null;
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
    const text = fs.readFileSync(full, 'utf8').split('\r\n').join('\n').trimEnd();
    return {
        name: inside.split(path.sep).join('/'),
        text,
    };
}

/**
 * The text of Done before this task: each file as built, in a fenced block under its name.
 *
 * @param {string} projectRoot
 * @param {string[]} names - Paths, in the order they are shown; a file named twice is shown once.
 * @returns {string}
 */
function doneBeforeText(projectRoot, names) {
    const shown = new Set();
    const parts = [];
    for (const name of names) {
        const built = readBuilt(projectRoot, name);
        if (!built || shown.has(built.name)) continue;
        shown.add(built.name);
        const lang = path.extname(built.name).slice(1);
        parts.push(`## As built: \`${built.name}\`\n\n\`\`\`${lang}\n${built.text}\n\`\`\``);
    }
    return parts.join('\n\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Assembling
// ───────────────────────────────────────────────────────────────────────────

/**
 * The files the pack shows as built: those of the component a revising or extending milestone
 * changes, the ones the earlier tasks created, and the ones the caller added.
 *
 * @param {ReturnType<typeof loadDocSet>} set
 * @param {import('./check-docs').Task} task
 * @param {string[]} included
 * @returns {string[]}
 */
function builtFiles(set, task, included) {
    const milestone = set.milestones.find((m) => m.address === task.address.split('.')[0]);
    const builds = task.builds ?? '';
    const revising =
        milestone &&
        [
            ...milestone.extends,
            ...milestone.revises,
        ].includes(builds);
    const component = revising ? mapFiles(set.read('memory/map.md'), builds) : [];
    const before = new Set(afterClosure(set.tasks, task.address));
    const created = set.tasks
        .filter((t) => before.has(t.address))
        .flatMap((t) => fileNamesIn(t.creates ?? ''));
    return [
        ...component,
        ...created,
        ...included,
    ];
}

/**
 * The pack file: the stack's tools, the task, the units of its context, and Done before this task.
 *
 * @param {string} address - The task.
 * @param {string} tools - The body of the Tools section of the task's stack, or empty.
 * @param {string} taskText
 * @param {{ address: string, text: string, pulled: boolean }[]} parts
 * @param {string} done - The text of Done before this task.
 * @returns {string}
 */
function packFile(address, tools, taskText, parts, done) {
    return [
        CONTAINMENT_LINE,
        '',
        ...(tools
            ? [
                  '# Tools of the stack',
                  '',
                  tools,
                  '',
              ]
            : []),
        `# Task ${address}`,
        '',
        taskText,
        '',
        '# Context',
        '',
        ...parts.flatMap((p) => [
            `<!-- unit ${p.address}${p.pulled ? ' (referenced)' : ''} -->`,
            '',
            p.text,
            '',
        ]),
        ...(done
            ? [
                  '# Done before this task',
                  '',
                  done,
                  '',
              ]
            : []),
    ].join('\n');
}

/**
 * Builds the pack of a task and writes it.
 *
 * @param {string} workspaceDir - The folder of the workspace.
 * @param {string} workspace - Its name.
 * @param {string} address - The task.
 * @param {string[]} included - Files the caller adds as built.
 * @returns {number} Exit code.
 */
function buildPack(workspaceDir, workspace, address, included) {
    const set = loadDocSet(workspaceDir);
    const task = set.tasks.find((t) => t.address === address);
    if (!task) {
        console.error(`[pack] Task ${address} not found in ${workspace}.`);
        return 1;
    }
    const projectRoot = resolveProjectRoot();
    const missing = included.find((name) => !readBuilt(projectRoot, name));
    if (missing) {
        console.error(`[pack] --include ${missing}: not a file inside the project.`);
        return 1;
    }
    const explicit = new Set([
        task.builds,
        ...task.consumes,
        ...task.context,
    ]);
    const parts = computePack(set, address).map((a) => ({
        address: a,
        text: set.packText(a, task.stack),
        pulled: !explicit.has(a),
    }));
    const done = doneBeforeText(projectRoot, builtFiles(set, task, included));
    const body = packFile(address, set.stackTools(task.stack), set.packText(address), parts, done);
    const { designAbs } = resolveDesignRoot(projectRoot);
    const out = path.join(designAbs, '.cache', 'packs', workspace, `${address}.md`);
    fs.mkdirSync(path.dirname(out), {
        recursive: true,
    });
    fs.writeFileSync(out, body);
    const size = parts.reduce((sum, p) => sum + countTokens(p.text), 0);
    const pulled = parts.filter((p) => p.pulled).length;
    const verdict = size > DEFAULT_BUDGET ? ` — over the budget by ${size - DEFAULT_BUDGET}` : '';
    console.log(
        `${address}: pack ${size} / ${DEFAULT_BUDGET} tokens (${parts.length} units, ${pulled} by reference)${verdict}; done before ${countTokens(done)} tokens; file ${countTokens(body)} tokens`,
    );
    console.log(`  written to ${path.relative(projectRoot, out).split(path.sep).join('/')}`);
    return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the task and the `--include` files from the arguments.
 *
 * @param {string[]} argv - The arguments after the command.
 * @returns {{ task: string | null, included: string[], error: string | null }}
 */
function parseArgs(argv) {
    /** @type {string[]} */
    const included = [];
    /** @type {string[]} */
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === '--include') included.push(argv[++i] ?? '');
        else if (token.startsWith('--include=')) included.push(token.slice('--include='.length));
        else rest.push(token);
    }
    const missing = included.some((f) => !f);
    return {
        task: rest[0] ?? null,
        included,
        error: missing ? '--include needs a file.' : null,
    };
}

/**
 * Entry point.
 *
 * @returns {number} Exit code: 0 when the pack was written or the workspace is not a 4.0 one, else 1.
 */
function main() {
    const where = locateSet();
    if (!where.isSet || !where.dir || !where.name) {
        console.log(notSetLine('pack', where.name));
        return 0;
    }
    const { task, included, error } = parseArgs(process.argv.slice(2));
    if (error || !task) {
        console.error(`[pack] ${error ?? 'Usage: pack <task> [--include <file>]...'}`);
        return 1;
    }
    return buildPack(where.dir, where.name, task, included);
}

runMain('pack', main);
