#!/usr/bin/env node
// @ts-check
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('mark-built', module);

const fs = require('node:fs');
const path = require('node:path');
const { loadDocSet, locateSet, notSetLine, revisionOf } = require('./check-docs');
const { fileNamesIn } = require('./lib/created-files');
const { runMain } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// MARK BUILT (A Milestone of a 4.0 Workspace Recorded as Done)
// ═══════════════════════════════════════════════════════════════════════════
//
// Records that a milestone is built, as the concept's memory and changes say (§5.7, §5.8 step 3):
// `memory/state.md` gains its Done line, `memory/map.md` gains a row for each component it builds
// that has none and the current revision of every unit of the components it closes, extends or
// revises, every change it builds goes from `placed` to `built`, and a unit now built at its
// revision loses its `Was` lines. A second run on the same milestone writes nothing.
//
// Usage:
//   node skills/magicspec/scripts/executor.js mark-built <milestone>

/** A test file, which is no part of a component's interface. */
const TEST_FILE = /(^|\/)(tests?|spec)\/|[._-](test|spec)\.[A-Za-z0-9]+$/;

// ───────────────────────────────────────────────────────────────────────────
// State and Changes
// ───────────────────────────────────────────────────────────────────────────

/**
 * Adds the milestone's Done line after the last Done line (or the Now line), once.
 *
 * @param {string} text - `memory/state.md`.
 * @param {string} milestone
 * @param {string} outcome - What works after it.
 * @returns {string} The new text, or the same text when the line is there.
 */
function withDoneLine(text, milestone, outcome) {
    if (new RegExp(`^- Done: ${milestone}(?![.\\d])`, 'm').test(text)) return text;
    const lines = text.split('\n');
    const after = (/** @type {RegExp} */ re) =>
        lines
            .map((l, i) => (re.test(l) ? i : -1))
            .filter((i) => i >= 0)
            .pop();
    const at = after(/^- Done: /) ?? after(/^- Now: /) ?? lines.length - 1;
    lines.splice(at + 1, 0, `- Done: ${milestone} — ${outcome}`);
    return lines.join('\n');
}

/**
 * Sets every change the milestone builds from `placed` to `built`.
 *
 * @param {string} text - `changes.md`.
 * @param {string[]} built - The changes the milestone builds.
 * @returns {{ text: string, count: number }}
 */
function withChangesBuilt(text, built) {
    let count = 0;
    let out = text;
    for (const address of built) {
        const re = new RegExp(
            `(## ${address} — [^\\n]*\\n(?:(?!## )[^\\n]*\\n)*?- Status: )placed\\b`,
        );
        if (re.test(out)) {
            out = out.replace(re, '$1built');
            count++;
        }
    }
    return {
        text: out,
        count,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Map
// ───────────────────────────────────────────────────────────────────────────

/**
 * The Provides of a component as built: its units, requirements first, each at its revision
 * (`address` at 1, `address@n` above), a withdrawn unit left out.
 *
 * @param {ReturnType<typeof loadDocSet>} set
 * @param {string} key
 * @returns {string}
 */
function providesOf(set, key) {
    const own = new RegExp(`^${key}\\.(b?)(\\d+)$`);
    const units = [
        ...set.units.keys(),
    ]
        .map((a) => ({
            a,
            m: a.match(own),
        }))
        .filter(({ m }) => m)
        .sort((x, y) => {
            const [, bx, nx] = /** @type {RegExpMatchArray} */ (x.m);
            const [, by, ny] = /** @type {RegExpMatchArray} */ (y.m);
            return bx === by ? Number(nx) - Number(ny) : bx ? 1 : -1;
        });
    const provided = units
        .map(({ a }) => ({
            a,
            r: revisionOf(set.units.get(a)?.[0]?.text ?? ''),
        }))
        .filter(({ r }) => !r?.withdrawn)
        .map(({ a, r }) => (r && r.rev > 1 ? `${a}@${r.rev}` : a));
    return provided.length ? provided.join(', ') : '—';
}

/**
 * The longest folder every path shares, or `.`.
 *
 * @param {string[]} files
 * @returns {string}
 */
function commonFolder(files) {
    const dirs = files.map((f) => path.posix.dirname(f).split('/'));
    const first = dirs[0] ?? [];
    let n = first.length;
    for (const d of dirs) {
        let i = 0;
        while (i < n && d[i] === first[i]) i++;
        n = i;
    }
    return first.slice(0, n).join('/') || '.';
}

/**
 * A new map row for a component, from the Creates of the milestone's tasks that build it, its
 * cells in the order of the map's header.
 *
 * @param {string[]} header - The header cells.
 * @param {string} key
 * @param {string[]} created - The files those tasks create.
 * @param {string} provides
 * @returns {string}
 */
function newRow(header, key, created, provides) {
    const source = created.filter((f) => !TEST_FILE.test(f));
    const files = source.length ? source : created;
    const where = commonFolder(files);
    const api = files.map((f) => (where === '.' ? f : path.posix.relative(where, f))).join(', ');
    const cell = (/** @type {string} */ name) => {
        if (/^Address/.test(name)) return `map:${key}`;
        if (/^Where/.test(name)) return where;
        if (/^API/.test(name)) return api || '—';
        if (/^Provides/.test(name)) return provides;
        return '—';
    };
    return `| ${header.map(cell).join(' | ')} |`;
}

/**
 * Rewrites the Provides of the components the milestone changes and adds a row for each it builds
 * that has none.
 *
 * @param {ReturnType<typeof loadDocSet>} set
 * @param {string} text - `memory/map.md`.
 * @param {string} milestone
 * @returns {{ text: string, count: number }}
 */
function withMap(set, text, milestone) {
    const m = set.milestones.find((x) => x.address === milestone);
    const keys = new Set(
        m
            ? [
                  ...m.closes,
                  ...m.extends,
                  ...m.revises,
              ]
            : [],
    );
    const lines = text.split('\n');
    const cellsOf = (/** @type {string} */ line) =>
        line
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
    const headerAt = lines.findIndex((l) => cellsOf(l).some((c) => /^Provides/.test(c)));
    const header = headerAt === -1 ? [] : cellsOf(lines[headerAt]);
    const providesAt = header.findIndex((c) => /^Provides/.test(c));
    const seen = new Set();
    let count = 0;
    const out = lines.map((line, i) => {
        if (i <= headerAt + 1) return line;
        const cells = cellsOf(line);
        const key = (cells[0] ?? '').replace(/`/g, '').replace(/^map:/, '');
        if (!(cells[0] ?? '').replace(/`/g, '').startsWith('map:') || !keys.has(key)) return line;
        seen.add(key);
        count++;
        cells[providesAt] = providesOf(set, key);
        return `| ${cells.join(' | ')} |`;
    });
    const rows = [];
    for (const key of keys) {
        if (seen.has(key) || headerAt === -1) continue;
        const created = set.tasks
            .filter((t) => t.address.startsWith(`${milestone}.`) && t.builds === key)
            .flatMap((t) => fileNamesIn(t.creates ?? ''));
        rows.push(newRow(header, key, created, providesOf(set, key)));
        count++;
    }
    let end = out.length;
    while (end > 0 && out[end - 1].trim() === '') end--;
    return {
        text: [
            ...out.slice(0, end),
            ...rows,
            ...out.slice(end),
        ].join('\n'),
        count,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Was Lines
// ───────────────────────────────────────────────────────────────────────────

/**
 * Removes the `Was` lines of every unit the map now records at its revision.
 *
 * @param {string} dir - The folder of the workspace.
 * @returns {number} Lines removed.
 */
function dropWasLines(dir) {
    const set = loadDocSet(dir);
    let removed = 0;
    for (const [address, units] of set.units) {
        const unit = units[0];
        if (!/^- Was \(rev \d+\): /m.test(unit.text)) continue;
        const rev = revisionOf(unit.text)?.rev ?? 1;
        if ((set.mapRevs.get(address) ?? 0) < rev) continue;
        const file = path.join(dir, unit.file);
        const kept = unit.text.split('\n').filter((l) => !/^- Was \(rev \d+\): /.test(l));
        removed += unit.text.split('\n').length - kept.length;
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(unit.text, kept.join('\n')));
    }
    return removed;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * Writes a file only when its text changed, so a second run leaves every byte as it was.
 *
 * @param {string} file
 * @param {string} before
 * @param {string} after
 */
function writeIfChanged(file, before, after) {
    if (after !== before) fs.writeFileSync(file, after);
}

/**
 * Records one milestone as built.
 *
 * @param {string} dir - The folder of the workspace.
 * @param {string} milestone
 * @returns {number} Exit code.
 */
function markBuilt(dir, milestone) {
    const set = loadDocSet(dir);
    const m = set.milestones.find((x) => x.address === milestone);
    if (!m) {
        console.error(`[mark-built] ${milestone} is not a milestone of plan.md.`);
        return 1;
    }
    const statePath = path.join(dir, 'memory', 'state.md');
    const state = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8') : '# State\n';
    fs.mkdirSync(path.dirname(statePath), {
        recursive: true,
    });
    writeIfChanged(statePath, state, withDoneLine(state, milestone, m.worksAfter ?? 'built'));

    const changesPath = path.join(dir, 'changes.md');
    let changes = 0;
    if (fs.existsSync(changesPath)) {
        const before = fs.readFileSync(changesPath, 'utf8');
        const built = set.changes
            .filter((c) => c.builtBy.includes(milestone))
            .map((c) => c.address);
        const result = withChangesBuilt(before, built);
        changes = result.count;
        writeIfChanged(changesPath, before, result.text);
    }

    const mapPath = path.join(dir, 'memory', 'map.md');
    let rows = 0;
    if (fs.existsSync(mapPath)) {
        const before = fs.readFileSync(mapPath, 'utf8');
        const result = withMap(set, before, milestone);
        rows = result.count;
        writeIfChanged(mapPath, before, result.text);
    }

    const was = dropWasLines(dir);
    console.log(
        `${milestone} built: map ${rows} rows, ${changes} changes built, ${was} Was lines removed`,
    );
    return 0;
}

/**
 * Entry point.
 *
 * @returns {number} Exit code: 0 when recorded or the workspace is not a 4.0 one, else 1.
 */
function main() {
    const where = locateSet();
    if (!where.isSet || !where.dir) {
        console.log(notSetLine('mark-built', where.name));
        return 0;
    }
    const milestone = process.argv.slice(2).find((a) => !a.startsWith('--'));
    if (!milestone) {
        console.error('[mark-built] Usage: mark-built <milestone>');
        return 1;
    }
    return markBuilt(where.dir, milestone);
}

runMain('mark-built', main);
