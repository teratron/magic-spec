#!/usr/bin/env node
// @ts-check
/**
 * Check the document set of a 4.0 workspace.
 *
 * Usage (through the executor):
 *   node skills/magicspec/scripts/executor.js check-docs [--workspace <name>] [--budget N]
 *
 * Reads the set of the resolved workspace when its entry in `workspace.json`
 * carries `"format": "4"` and reports, without a model, one finding per line
 * on stdout and a summary line on stderr; exit 1 when there is any finding:
 * - an address defined twice, or one that resolves to nothing — in a field or
 *   anywhere in a unit's text; a neutral unit that references a stack unit;
 * - a word of a stack's vocabulary in a neutral file;
 * - an HTML comment left in a neutral file;
 * - a task without Builds or Priority, whose Done when has no `Observe:`,
 *   that is After a task of lower priority, or whose computed pack exceeds the
 *   budget (default 10000 tokens);
 * - a milestone without Priority, that Needs a milestone of lower priority,
 *   whose Observed by omits a component it closes or names a component closed
 *   later; a component closed by no milestone or by more than one; a
 *   milestone that closes a component whose dependency comes later;
 * - a rule without From, once the plan defines a milestone (before that, a
 *   rule has none: the plan stage writes it);
 * - a binding unit that realizes nothing that exists;
 * - a change without a kind, a status, Evidence or a building milestone, a
 *   revised unit without `Was`, a stale unit no task builds, a satisfied
 *   change that carries work, an asset no task creates.
 *
 * On a workspace that is not in the 4.0 format it prints one line and exits 0.
 */
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('check-docs', module);

const fs = require('node:fs');
const path = require('node:path');
const { countTokens } = require('./lib/count-tokens');
const {
    resolveProjectRoot,
    resolveDesignRoot,
    WORKSPACE_NAME_RE,
    readOptionValue,
    runMain,
} = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// TEXT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split a document into sections at headings of exactly `level`.
 * @param {string} text
 * @param {number} level
 * @returns {{ heading: string, text: string }[]}
 */
function sections(text, level) {
    const lines = text.split(/\r?\n/);
    /** @type {{ heading: string, text: string }[]} */
    const out = [];
    /** @type {{ heading: string, lines: string[] } | null} */
    let current = null;
    const own = new RegExp(`^#{${level}} `);
    const higher = new RegExp(`^#{1,${level}} `);
    for (const line of lines) {
        if (own.test(line)) {
            if (current)
                out.push({
                    heading: current.heading,
                    text: current.lines.join('\n').trimEnd(),
                });
            current = {
                heading: line,
                lines: [
                    line,
                ],
            };
        } else if (current && higher.test(line)) {
            out.push({
                heading: current.heading,
                text: current.lines.join('\n').trimEnd(),
            });
            current = null;
        } else if (current) {
            current.lines.push(line);
        }
    }
    if (current)
        out.push({
            heading: current.heading,
            text: current.lines.join('\n').trimEnd(),
        });
    return out;
}

/**
 * A text with its code spans taken out: a run of backticks, the text up to the next run of the same
 * length on the same line, and that run. A value inside one is a literal, never a reference.
 * @param {string} text
 * @returns {string}
 */
function withoutCodeSpans(text) {
    return text.replace(/(?<!`)(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/g, ' ');
}

/**
 * The address a heading defines: its first token before the em dash.
 * @param {string} heading
 * @returns {string | null}
 */
function headingAddress(heading) {
    const match = heading.match(/^#{1,6} (\S+)\s+—/);
    return match ? match[1] : null;
}

/**
 * The value of a `- Name: value` or `Name: value` line, or null.
 * @param {string} text
 * @param {string} name
 * @returns {string | null}
 */
function field(text, name) {
    const match = text.match(new RegExp(`^(?:- )?${name}:\\s*(.*)$`, 'm'));
    return match ? match[1].trim() : null;
}

/**
 * Addresses listed in a field value: comma-separated, backticks stripped,
 * placeholders dropped, a trailing `?` removed.
 * @param {string | null} value
 * @returns {string[]}
 */
function addressList(value) {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => s.replace(/`/g, '').trim())
        .filter(
            (s) =>
                s &&
                ![
                    '—',
                    '-',
                    'none',
                    'stays',
                ].includes(s),
        )
        .map((s) => s.replace(/\?$/, ''));
}

/**
 * Cells of a Markdown table row, or null for a non-row or a separator row.
 * @param {string} line
 * @returns {string[] | null}
 */
function tableCells(line) {
    if (!line.startsWith('|')) return null;
    const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) return null;
    return cells;
}

const RANK = /** @type {Record<string, number>} */ ({
    must: 3,
    should: 2,
    could: 1,
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{ address: string, file: string, text: string, layer: 'neutral' | 'stack' | 'memory' | 'change' }} Unit
 * @typedef {{ file: string, owner: string, field: string, refs: string[] }} RefSite
 * @typedef {{ address: string, priority: string | null, needs: string[], closes: string[], worksAfter: string | null, observed: string, observedAfter: string[], integrates: string[], extends: string[], revises: string[] }} Milestone
 * @typedef {{ address: string, stack: string | null, priority: string | null, after: string[], builds: string | null, consumes: string[], context: string[], doneWhen: string | null, creates: string | null, produces: string[] }} Task
 */

class DocSet {
    /** @param {string} dir */
    constructor(dir) {
        this.dir = dir;
        /** @type {Map<string, Unit[]>} */
        this.units = new Map();
        /** @type {RefSite[]} */
        this.refSites = [];
        /** @type {Map<string, string>} component key → behaviour preamble */
        this.componentText = new Map();
        /** @type {Map<string, string>} `stack:key` → binding preamble */
        this.bindingText = new Map();
        /** @type {Map<string, string[]>} component key → declared dependencies, `?` kept */
        this.componentDeps = new Map();
        /** @type {Map<string, string>} component key → kind */
        this.componentKind = new Map();
        /** @type {Milestone[]} */
        this.milestones = [];
        /** @type {Task[]} */
        this.tasks = [];
        /** @type {Set<string>} words of every stack vocabulary */
        this.vocabulary = new Set();
        /** @type {Map<string, string>} `stack:component:name` → binding unit address that defines it */
        this.nameIndex = new Map();
        /** @type {Map<string, number>} component key → priority rank of its scope items */
        this.componentScope = new Map();
        /** @type {Map<string, { stack: string, milestone: string, requiredBy: string[], requiredByRaw: string[] }>} stack-only components */
        this.stackComponents = new Map();
        /** @type {{ address: string, from: string, checkers: string[] }[]} */
        this.ruleChecks = [];
        /** @type {Set<string>} neutral rules that name no milestone they apply from */
        this.rulesWithoutFrom = new Set();
        /** @type {{ address: string, priority: number, keys: string[], observedIn: string | null }[]} scope items In */
        this.scopeItems = [];
        /** @type {Map<string, number>} unit address → revision the map records as built */
        this.mapRevs = new Map();
        /** @type {{ address: string, kind: string | null, status: string | null, affects: string[], assets: string[], builtBy: string[] }[]} */
        this.changes = [];
        /** @type {string[]} */
        this.findings = [];
    }

    /**
     * @param {string} address
     * @param {string} file
     * @param {string} text
     * @param {'neutral' | 'stack' | 'memory' | 'change'} layer
     */
    define(address, file, text, layer) {
        const list = this.units.get(address) ?? [];
        list.push({
            address,
            file,
            text,
            layer,
        });
        this.units.set(address, list);
    }

    /**
     * @param {string} file
     * @param {string} owner
     * @param {string} fieldName
     * @param {string[]} refs
     */
    refer(file, owner, fieldName, refs) {
        if (refs.length)
            this.refSites.push({
                file,
                owner,
                field: fieldName,
                refs,
            });
    }

    /**
     * The text an address stands for in a pack: for a component, its behaviour
     * preamble followed by the binding preamble of the given stack only.
     * @param {string} address
     * @param {string | null} [stack]
     * @returns {string}
     */
    packText(address, stack = null) {
        const spec = this.componentText.get(address);
        const binding = stack ? this.bindingText.get(`${stack}:${address}`) : undefined;
        if (spec || binding)
            return [
                spec,
                binding,
            ]
                .filter(Boolean)
                .join('\n\n');
        const unit = this.units.get(address);
        return unit ? unit[0].text : '';
    }

    /**
     * The body of the Tools section of a stack's profile: what its builders run the stack with.
     * @param {string | null} stack
     * @returns {string} Empty when there is no stack, no profile, or no such section.
     */
    stackTools(stack) {
        if (!stack) return '';
        const profile = this.read(`stack/${stack}/profile.md`) ?? '';
        const tools = sections(profile, 2).find((s) => /^## Tools\s*$/.test(s.heading));
        if (!tools) return '';
        return tools.text
            .split('\n')
            .slice(1)
            .join('\n')
            .replace(/^(?:[ \t]*\n)+/, '');
    }

    /**
     * Addresses written in a text. A value inside a code span is a literal, not a reference.
     * @param {string} text
     * @returns {string[]}
     */
    inlineRefs(text) {
        const found = new Set();
        const prose = withoutCodeSpans(text);
        for (const m of prose.matchAll(
            /(?<![\w.:-])(R\d+|S\d+|X\d+|P\d+|D\d+|C\d+|M\d+(?:\.T\d+)?|map:[\w-]+|term:[\w-]+)(?![\w-])/g,
        ))
            found.add(m[1]);
        for (const m of prose.matchAll(/(?<![\w.:-])([a-z][a-z0-9_]*)\.(b?\d+)(?![\w.])/g)) {
            if (this.componentDeps.has(m[1])) found.add(`${m[1]}.${m[2]}`);
        }
        return [
            ...found,
        ];
    }

    /**
     * @param {string} rel
     * @returns {string | null}
     */
    read(rel) {
        const full = path.join(this.dir, rel);
        return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    }

    /**
     * @param {string} rel
     * @returns {string[]}
     */
    list(rel) {
        const full = path.join(this.dir, rel);
        return fs.existsSync(full) ? fs.readdirSync(full) : [];
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Parsers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Units headed `## {address} — {title}` (or `###` with `level`) in one file.
 * @param {DocSet} set
 * @param {string} rel
 * @param {RegExp} pattern
 * @param {'neutral' | 'stack' | 'memory' | 'change'} layer
 * @param {number} [level]
 * @returns {{ address: string, text: string }[]}
 */
function headedUnits(set, rel, pattern, layer, level = 2) {
    const text = set.read(rel);
    if (text === null) return [];
    /** @type {{ address: string, text: string }[]} */
    const out = [];
    for (const s of sections(text, level)) {
        const address = headingAddress(s.heading);
        if (address && pattern.test(address)) {
            set.define(address, rel, s.text, layer);
            out.push({
                address,
                text: s.text,
            });
        }
    }
    return out;
}

/**
 * The trace at the end of a product line: `→ keys; observed in M{n}`.
 * @param {string} line
 * @returns {{ found: boolean, keysText: string | null, observedIn: string | null }}
 */
function traceOf(line) {
    // A revision mark at the end of a one-line item is not part of its trace.
    const match = line.replace(/\s*\((?:rev \d+|withdrawn), C\d+\)\s*$/, '').match(/ → (.+)$/);
    if (!match)
        return {
            found: false,
            keysText: null,
            observedIn: null,
        };
    // `→ keys; observed in M{n}` names the milestone that observes a capability across components.
    const [keysText, observedIn] = match[1].split(/;\s*observed in\s+/);
    return {
        found: true,
        keysText,
        observedIn: observedIn ?? null,
    };
}

/**
 * Records the priority of a scope item and the components it traces to.
 * @param {DocSet} set
 * @param {string} rel
 * @param {string} address
 * @param {string} line
 * @param {{ found: boolean, observedIn: string | null }} trace
 * @param {string[]} keys
 */
function recordScope(set, rel, address, line, trace, keys) {
    const prio = line.match(/^- P\d+ In \((\w+)\)/);
    if (!prio) return;
    if (!RANK[prio[1]]) set.findings.push(`${rel}: ${address} has priority ${prio[1]}`);
    if (!trace.found) return;
    const rank = RANK[prio[1]] ?? 0;
    for (const key of keys)
        set.componentScope.set(key, Math.max(set.componentScope.get(key) ?? 0, rank));
    set.scopeItems.push({
        address,
        priority: rank,
        keys,
        observedIn: trace.observedIn ? trace.observedIn.trim() : null,
    });
}

/**
 * One scope item or glossary term of product.md.
 * @param {DocSet} set
 * @param {string} rel
 * @param {string} address
 * @param {string} line
 */
function parseProductItem(set, rel, address, line) {
    set.define(address, rel, line, 'neutral');
    const trace = traceOf(line);
    const keys = addressList(trace.keysText);
    if (trace.found && /^P\d+$/.test(address)) {
        const observed = trace.observedIn
            ? [
                  trace.observedIn.trim(),
              ]
            : [];
        set.refer(rel, address, 'Scope trace', [
            ...keys,
            ...observed,
        ]);
    }
    recordScope(set, rel, address, line, trace, keys);
    const needs = line.match(/ — for (.+)$/);
    if (needs && / Needs: /.test(line)) set.refer(rel, address, 'Needs for', addressList(needs[1]));
}

/**
 * The rows of the first table of a text: each with its line and a lookup of a
 * cell by the start of its column header.
 * @param {string} text
 * @returns {{ line: string, col: (name: string) => string }[]}
 */
function tableRows(text) {
    /** @type {{ line: string, col: (name: string) => string }[]} */
    const rows = [];
    /** @type {string[] | null} */
    let header = null;
    for (const line of text.split(/\r?\n/)) {
        const cells = tableCells(line);
        if (!cells) continue;
        if (!header) {
            header = cells;
            continue;
        }
        const head = header;
        rows.push({
            line,
            col: (name) => cells[head.findIndex((h) => h.startsWith(name))] ?? '',
        });
    }
    return rows;
}

/**
 * A comma-separated cell as a list: backticks stripped, empty entries and the given dashes dropped.
 * @param {string} text
 * @param {string[]} dashes
 * @returns {string[]}
 */
function plainList(text, dashes) {
    return text
        .split(',')
        .map((s) => s.replace(/`/g, '').trim())
        .filter((s) => s && !dashes.includes(s));
}

/**
 * The code components listed in the Components table of product.md.
 * @param {DocSet} set
 * @param {string} rel
 * @param {string} text
 */
function parseProductComponents(set, rel, text) {
    const components = sections(text, 2).find((s) => /^## Components/.test(s.heading));
    if (!components) return;
    for (const { line, col } of tableRows(components.text)) {
        const key = col('Key').replace(/`/g, '');
        if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
        set.define(key, rel, line, 'neutral');
        const deps = col('Depends on');
        set.componentDeps.set(
            key,
            plainList(deps, [
                '—',
                '-',
            ]),
        );
        set.componentKind.set(key, col('Kind') || 'code');
        set.refer(rel, key, 'Depends on', addressList(deps));
    }
}

/** @param {DocSet} set */
function parseProduct(set) {
    const rel = 'product.md';
    const text = set.read(rel);
    if (text === null) {
        set.findings.push(`${rel}: missing`);
        return;
    }
    for (const line of text.split(/\r?\n/)) {
        const item = line.match(/^- (P\d+|term:[\w-]+)\s/);
        if (item) parseProductItem(set, rel, item[1], line);
    }
    parseProductComponents(set, rel, text);
}

/**
 * The text of a component file before its first units section.
 * @param {string} text
 * @param {RegExp} heading
 * @returns {string}
 */
function preambleOf(text, heading) {
    const cut = text.search(heading);
    return (cut === -1 ? text : text.slice(0, cut)).trimEnd();
}

/**
 * Calls `onUnit` for each unit of a component file; a unit that belongs to another component is a finding.
 * @param {DocSet} set
 * @param {string} rel
 * @param {string} key - The component the file describes.
 * @param {string} text
 * @param {string} infix - `''` for behaviour requirements, `'b'` for binding units.
 * @param {(address: string, unitText: string) => void} onUnit
 */
function eachUnit(set, rel, key, text, infix, onUnit) {
    const own = new RegExp(`^${key}\\.${infix}\\d+$`);
    for (const s of sections(text, 3)) {
        const address = headingAddress(s.heading);
        if (!address) continue;
        if (own.test(address)) onUnit(address, s.text);
        else set.findings.push(`${rel}: unit ${address} does not belong here`);
    }
}

/** @param {DocSet} set */
function parseSpecs(set) {
    for (const name of set.list('spec').filter((n) => n.endsWith('.md'))) {
        const rel = `spec/${name}`;
        const key = name.replace(/\.md$/, '');
        const text = /** @type {string} */ (set.read(rel));
        set.componentText.set(key, preambleOf(text, /^## Requirements/m));
        set.refer(rel, key, 'Depends on', addressList(field(text, 'Depends on')));
        eachUnit(set, rel, key, text, '', (address, unitText) =>
            set.define(address, rel, unitText, 'neutral'),
        );
    }
}

/**
 * The words of a profile's Vocabulary section, added to the set's stack vocabulary.
 * @param {DocSet} set
 * @param {string} profile
 */
function addVocabulary(set, profile) {
    const vocab = sections(profile, 2).find((s) => /^## Vocabulary/.test(s.heading));
    const words = vocab ? vocab.text.split(/\r?\n/).slice(1).join(' ') : '';
    for (const word of words.split(/[,;]/)) {
        const w = word.replace(/`/g, '').trim().toLowerCase();
        if (w) set.vocabulary.add(w);
    }
}

/**
 * The stack-only components of a profile:
 * `| Key | Responsibility | Depends on | Required by | Milestone |`.
 * @param {DocSet} set
 * @param {string} stack
 * @param {string} rel
 * @param {string} profile
 */
function addStackComponents(set, stack, rel, profile) {
    const comps = sections(profile, 2).find((s) => /^## Components/.test(s.heading));
    for (const { line, col } of tableRows(comps ? comps.text : '')) {
        const key = col('Key').replace(/`/g, '');
        if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
        set.define(key, rel, line, 'stack');
        const deps = col('Depends on');
        const requiredBy = col('Required by');
        set.componentDeps.set(
            key,
            plainList(deps, [
                '—',
            ]),
        );
        set.componentKind.set(key, 'stack');
        set.stackComponents.set(key, {
            stack,
            milestone: col('Milestone').trim(),
            requiredBy: addressList(requiredBy),
            requiredByRaw: plainList(requiredBy, [
                '—',
            ]),
        });
        set.refer(rel, key, 'Depends on', addressList(deps));
        set.refer(rel, key, 'Required by', addressList(requiredBy));
    }
}

/**
 * The external libraries of a stack, one `- X{n}` line each.
 * @param {DocSet} set
 * @param {string} base
 */
function parseLibraries(set, base) {
    const rel = `${base}/deps.md`;
    for (const line of (set.read(rel) ?? '').split(/\r?\n/)) {
        const m = line.match(/^- (X\d+)\s/);
        if (!m) continue;
        set.define(m[1], rel, line, 'stack');
        const realizes = line.match(/realizes ((?:P\d+(?:, )?)+)/);
        if (realizes) set.refer(rel, m[1], 'realizes', addressList(realizes[1]));
    }
}

/**
 * One binding unit: its references and the names it defines.
 * @param {DocSet} set
 * @param {{ stack: string, key: string, rel: string }} where
 * @param {string} address
 * @param {string} text
 */
function parseBindingUnit(set, where, address, text) {
    const { stack, key, rel } = where;
    set.define(address, rel, text, 'stack');
    set.refer(rel, address, 'Realizes', addressList(field(text, 'Realizes')));
    for (const n of addressList(field(text, 'Defines'))) {
        const other = set.nameIndex.get(`${stack}:${key}:${n}`);
        if (other)
            set.findings.push(`${rel}: ${address} Defines ${n}, already defined by ${other}`);
        else set.nameIndex.set(`${stack}:${key}:${n}`, address);
    }
}

/**
 * One binding file of a stack.
 * @param {DocSet} set
 * @param {string} stack
 * @param {string} base
 * @param {string} name - The file name.
 */
function parseBindingFile(set, stack, base, name) {
    const rel = `${base}/bind/${name}`;
    const key = name.replace(/\.md$/, '');
    const text = /** @type {string} */ (set.read(rel));
    set.bindingText.set(`${stack}:${key}`, preambleOf(text, /^## Units/m));
    eachUnit(set, rel, key, text, 'b', (address, unitText) =>
        parseBindingUnit(
            set,
            {
                stack,
                key,
                rel,
            },
            address,
            unitText,
        ),
    );
}

/** @param {DocSet} set */
function parseStacks(set) {
    for (const stack of set.list('stack')) {
        const base = `stack/${stack}`;
        const profile = set.read(`${base}/profile.md`);
        if (profile) {
            addVocabulary(set, profile);
            addStackComponents(set, stack, `${base}/profile.md`, profile);
        }
        for (const { address, text } of headedUnits(set, `${base}/rules.md`, /^S\d+$/, 'stack')) {
            set.refer(
                `${base}/rules.md`,
                address,
                'Realizes',
                addressList(field(text, 'Realizes')),
            );
        }
        parseLibraries(set, base);
        for (const name of set.list(`${base}/bind`).filter((n) => n.endsWith('.md')))
            parseBindingFile(set, stack, base, name);
    }
}

/**
 * The keys of a clause list `key — what it adds; key — …` (Extends and Revises).
 * @param {string | null} value
 * @returns {string[]}
 */
function clauseKeys(value) {
    return (value ?? '')
        .split(';')
        .map((s) =>
            s
                .replace(/`/g, '')
                .trim()
                .split(/\s+—\s+/)[0]
                .trim(),
        )
        .filter((s) => s && s !== '—');
}

/** @param {DocSet} set */
function parsePlan(set) {
    for (const { address, text } of headedUnits(set, 'plan.md', /^M\d+$/, 'neutral')) {
        const needs = addressList(field(text, 'Needs'));
        const closes = addressList(field(text, 'Closes'));
        const observedAfter = addressList(field(text, 'Observed after'));
        const integrates = (field(text, 'Integrates') ?? '')
            .split(',')
            .map((s) => s.replace(/`/g, '').trim())
            .filter((s) => s.includes('+'));
        // `Extends`: work on a component closed earlier; `Revises`: work that changes a closed component's behaviour.
        const extendsKeys = clauseKeys(field(text, 'Extends'));
        set.refer('plan.md', address, 'Extends', extendsKeys);
        const revisesKeys = clauseKeys(field(text, 'Revises'));
        set.refer('plan.md', address, 'Revises', revisesKeys);
        set.milestones.push({
            address,
            priority: field(text, 'Priority'),
            needs,
            closes,
            worksAfter: field(text, 'Works after it'),
            observed: field(text, 'Observed by') ?? '',
            observedAfter,
            integrates,
            extends: extendsKeys,
            revises: revisesKeys,
        });
        set.refer('plan.md', address, 'Observed after', observedAfter);
        set.refer('plan.md', address, 'Needs', needs);
        set.refer('plan.md', address, 'Closes', closes);
    }
}

/**
 * A task from its unit text.
 * @param {string} address
 * @param {string | null} stack
 * @param {string} text
 * @returns {Task}
 */
function taskFrom(address, stack, text) {
    // Binding units this task produces: the addresses before each arrow.
    const produced = (field(text, 'Produces') ?? '').split(';').flatMap((p) => [
        ...p.split('→')[0].matchAll(/\b([a-z][a-z0-9_]*\.b\d+)\b/g),
    ]);
    return {
        address,
        stack,
        priority: field(text, 'Priority'),
        after: addressList(field(text, 'After')),
        builds: field(text, 'Builds'),
        consumes: addressList(field(text, 'Consumes')),
        context: addressList(field(text, 'Context')),
        doneWhen: field(text, 'Done when'),
        creates: field(text, 'Creates'),
        produces: produced.map((m) => m[1]),
    };
}

/**
 * Records a task and the references its fields make.
 * @param {DocSet} set
 * @param {string} rel
 * @param {string} text
 * @param {Task} task
 */
function registerTask(set, rel, text, task) {
    const { address, builds } = task;
    set.tasks.push(task);
    set.refer(rel, address, 'After', task.after);
    set.refer(
        rel,
        address,
        'Builds',
        builds
            ? [
                  builds,
              ]
            : [],
    );
    set.refer(rel, address, 'Consumes', task.consumes);
    set.refer(rel, address, 'Context', task.context);
    set.refer(
        rel,
        address,
        'Produces',
        [
            ...(field(text, 'Produces') ?? '').matchAll(/→\s*(M\d+\.T\d+)/g),
        ].map((m) => m[1]),
    );
}

/** @param {DocSet} set */
function parseTasks(set) {
    const dirs = [
        {
            dir: 'tasks',
            stack: null,
        },
        ...set.list('stack').map((stack) => ({
            dir: `stack/${stack}/tasks`,
            stack,
        })),
    ];
    const files = dirs.flatMap(({ dir, stack }) =>
        set
            .list(dir)
            .filter((n) => n.endsWith('.md'))
            .map((n) => ({
                rel: `${dir}/${n}`,
                stack,
            })),
    );
    for (const { rel, stack } of files) {
        for (const { address, text } of headedUnits(set, rel, /^M\d+\.T\d+$/, 'stack'))
            registerTask(set, rel, text, taskFrom(address, stack, text));
    }
}

/** @param {DocSet} set */
function parseRulesAndMemory(set) {
    for (const { address, text } of headedUnits(set, 'rules.md', /^R\d+$/, 'neutral')) {
        const from = field(text, 'From');
        if (!from) {
            set.rulesWithoutFrom.add(address);
            continue;
        }
        set.refer('rules.md', address, 'From', [
            from,
        ]);
        set.ruleChecks.push({
            address,
            from,
            checkers: [
                ...(field(text, 'Checked by') ?? '').matchAll(/`([a-z][a-z0-9_]*)`/g),
            ].map((m) => m[1]),
        });
    }
    for (const { address, text } of headedUnits(set, 'memory/decisions.md', /^D\d+$/, 'memory')) {
        set.refer('memory/decisions.md', address, 'Affects', addressList(field(text, 'Affects')));
        set.refer('memory/decisions.md', address, 'Moves to', addressList(field(text, 'Moves to')));
    }
    const map = set.read('memory/map.md');
    let provides = 3;
    for (const line of (map ?? '').split(/\r?\n/)) {
        const cells = tableCells(line);
        if (!cells) continue;
        const at = cells.findIndex((c) => /^Provides/.test(c));
        if (at !== -1) {
            provides = at;
            continue;
        }
        if (!/^`?map:[\w-]+`?$/.test(cells[0])) continue;
        const address = cells[0].replace(/`/g, '');
        set.define(address, 'memory/map.md', line, 'memory');
        // `addr@n` records the revision built; a bare address was built at revision 1.
        const provided = addressList(cells[provides]).map((p) => {
            const [a, rev] = p.split('@');
            set.mapRevs.set(a, Number(rev ?? 1));
            return a;
        });
        set.refer('memory/map.md', address, 'Provides', provided);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PACKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The names a text uses inside code spans: every identifier, and a derive
 * attribute `#[derive(A, B)]` as `derive(A)` and `derive(B)`.
 * @param {string} text
 * @param {boolean} [withQuoted] also the words inside quoted strings of a span (default: no)
 * @returns {Set<string>}
 */
function namesIn(text, withQuoted = true) {
    const names = new Set();
    for (const span of text.matchAll(/`([^`]+)`/g)) {
        const code = withQuoted ? span[1] : span[1].replace(/'[^']*'/g, '');
        for (const d of code.matchAll(/derive\(([^)]*)\)/g)) {
            for (const n of d[1].split(',')) names.add(`derive(${n.trim()})`);
        }
        for (const m of code.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) names.add(m[0]);
    }
    return names;
}

/**
 * The units a task pulls because a name in its listed units is defined by a
 * binding unit of the component it builds (a dependency's units come only
 * through Consumes). Names in the unit's text count, not those in its
 * acceptance line: that is a check, not an interface.
 * @param {DocSet} set
 * @param {Task} task
 * @param {string} address
 * @returns {string[]}
 */
function definingUnits(set, task, address) {
    const builtKey = (task.builds ?? '').split('.')[0];
    const names = namesIn(set.packText(address).replace(/^- Accept: .*$/gm, ''));
    return [
        ...names,
    ]
        .map((n) => set.nameIndex.get(`${task.stack}:${builtKey}:${n}`))
        .filter((unit) => unit !== undefined);
}

/**
 * The units a task pulls because a listed unit's text references them. A
 * binding unit's Realizes line names the behaviour it serves — the task lists
 * what it needs of it in Context, so it is not a pull — and a task on one
 * stack never pulls another stack's binding units.
 * @param {DocSet} set
 * @param {Task} task
 * @param {string} address
 * @returns {string[]}
 */
function referencedUnits(set, task, address) {
    const text = /\.b\d+$/.test(address)
        ? set.packText(address).replace(/^- Realizes: .*$/gm, '')
        : set.packText(address);
    return set
        .inlineRefs(text)
        .filter(
            (ref) =>
                /^[a-z][a-z0-9_]*\.b?\d+$/.test(ref) &&
                (!/\.b\d+$/.test(ref) || bindingStack(set, ref) === task.stack),
        );
}

/**
 * The computed pack of a task: the built component's preamble, the Consumes
 * and Context units, then — one level, from those listed units only — the
 * behaviour requirements and binding units they reference.
 * @param {DocSet} set
 * @param {string} taskAddress
 * @returns {string[]}
 */
function computePack(set, taskAddress) {
    const task = set.tasks.find((t) => t.address === taskAddress);
    if (!task) return [];
    /** @type {string[]} */
    const order = [];
    const seen = new Set();
    /** @param {string} a */
    const add = (a) => {
        if (seen.has(a) || !(set.units.has(a) || set.componentText.has(a))) return;
        seen.add(a);
        order.push(a);
    };
    if (task.builds) add(task.builds);
    const listed = [
        ...task.consumes,
        ...task.context,
    ];
    for (const a of listed) add(a);
    for (const a of listed.filter((l) => /^[a-z][a-z0-9_]*\.b?\d+$/.test(l))) {
        for (const unit of definingUnits(set, task, a)) add(unit);
        for (const ref of referencedUnits(set, task, a)) add(ref);
    }
    return order;
}

/**
 * The stack whose binding file defines a binding unit.
 * @param {DocSet} set
 * @param {string} address
 * @returns {string | null}
 */
function bindingStack(set, address) {
    const unit = set.units.get(address);
    const m = unit ? unit[0].file.match(/^stack\/([^/]+)\//) : null;
    return m ? m[1] : null;
}

/**
 * @param {DocSet} set
 * @param {string} taskAddress
 * @returns {number}
 */
function packTokens(set, taskAddress) {
    const stack = set.tasks.find((t) => t.address === taskAddress)?.stack ?? null;
    return computePack(set, taskAddress).reduce(
        (sum, a) => sum + countTokens(set.packText(a, stack)),
        0,
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/** @param {DocSet} set */
function checkDuplicates(set) {
    for (const [address, units] of set.units) {
        if (units.length > 1)
            set.findings.push(
                `duplicate address ${address} in ${units.map((u) => u.file).join(', ')}`,
            );
    }
}

/**
 * Addresses a unit's fields name that no unit defines.
 * @param {DocSet} set
 * @returns {Set<string>} The `owner, address` pairs reported, so a mention of the same address is not reported twice.
 */
function checkFieldRefs(set) {
    const reported = new Set();
    for (const site of set.refSites) {
        for (const ref of site.refs.filter((r) => !set.units.has(r))) {
            set.findings.push(
                `${site.file}: ${site.owner} ${site.field} names ${ref}, which is not defined`,
            );
            reported.add(`${site.owner}\u0000${ref}`);
        }
    }
    return reported;
}

/**
 * One address written in a unit's text: undefined, or a stack unit in a neutral one.
 * @param {DocSet} set
 * @param {Unit} unit
 * @param {string} ref
 * @param {Set<string>} reported
 */
function checkMention(set, unit, ref, reported) {
    const target = set.units.get(ref);
    if (!target) {
        if (!reported.has(`${unit.address}\u0000${ref}`))
            set.findings.push(
                `${unit.file}: ${unit.address} mentions ${ref}, which is not defined`,
            );
    } else if (
        unit.layer === 'neutral' &&
        target[0].layer !== 'neutral' &&
        target[0].layer !== 'change'
    ) {
        set.findings.push(`${unit.file}: neutral ${unit.address} references stack unit ${ref}`);
    }
}

/** @param {DocSet} set */
function checkAddresses(set) {
    checkDuplicates(set);
    const reported = checkFieldRefs(set);
    for (const units of set.units.values()) {
        for (const ref of set.inlineRefs(units[0].text)) checkMention(set, units[0], ref, reported);
    }
}

/**
 * The files of the neutral layer.
 * @param {DocSet} set
 * @returns {string[]} Paths relative to the set.
 */
function neutralFiles(set) {
    return [
        'product.md',
        'rules.md',
        'plan.md',
        ...set.list('spec').map((n) => `spec/${n}`),
    ];
}

/**
 * A document written from a template keeps none of its comments, which guide its writer: one
 * finding for each neutral file that holds an HTML comment outside a code span.
 * @param {DocSet} set
 */
function checkComments(set) {
    for (const rel of neutralFiles(set)) {
        if (withoutCodeSpans(set.read(rel) ?? '').includes('<!--'))
            set.findings.push(`${rel}: a template comment left in a neutral document`);
    }
}

/** @param {DocSet} set */
function checkVocabulary(set) {
    if (set.vocabulary.size === 0) return;
    for (const rel of neutralFiles(set)) {
        const text = set.read(rel);
        if (!text) continue;
        /** @type {Map<string, number>} */
        const hits = new Map();
        for (const word of set.vocabulary) {
            // A component key is an identifier, not prose: exempt even when it is a stack word.
            if (set.componentDeps.has(word)) continue;
            const re = new RegExp(
                `(?<![\\w-])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`,
                'gi',
            );
            const n = (text.match(re) ?? []).length;
            if (n) hits.set(word, n);
        }
        if (hits.size)
            set.findings.push(
                `${rel}: stack vocabulary in the neutral layer — ${[
                    ...hits,
                ]
                    .map(([w, n]) => `${w} ×${n}`)
                    .join(', ')}`,
            );
    }
}

/**
 * The fields every task must have: Builds, Priority, an observable Done when, tests in Creates.
 * @param {DocSet} set
 * @param {Task} task
 */
function checkTaskFields(set, task) {
    if (!task.builds) set.findings.push(`${task.address}: no Builds field`);
    if (!task.priority || !RANK[task.priority])
        set.findings.push(`${task.address}: Priority is ${task.priority ?? 'missing'}`);
    if (!task.doneWhen || !/Observe:/.test(task.doneWhen))
        set.findings.push(`${task.address}: Done when has no Observe: clause`);
    // The task creates its tests too, unless it only designs.
    if (!/test/i.test(task.creates ?? '') && !/design only/i.test(task.creates ?? ''))
        set.findings.push(`${task.address}: Creates names no tests`);
}

/**
 * A task is never After a task of lower priority.
 * @param {DocSet} set
 * @param {Task} task
 * @param {Map<string, Task>} byAddress
 */
function checkTaskOrder(set, task, byAddress) {
    for (const a of task.after) {
        const before = byAddress.get(a);
        if (before && RANK[before.priority ?? ''] < RANK[task.priority ?? '']) {
            set.findings.push(
                `${task.address} (${task.priority}) is After ${a} (${before.priority}), of lower priority`,
            );
        }
    }
}

/**
 * @param {DocSet} set
 * @param {number} budget
 */
function checkTasks(set, budget) {
    const byAddress = new Map(
        set.tasks.map((t) => [
            t.address,
            t,
        ]),
    );
    for (const task of set.tasks) {
        checkTaskFields(set, task);
        checkTaskOrder(set, task, byAddress);
        const tokens = packTokens(set, task.address);
        if (tokens > budget)
            set.findings.push(
                `${task.address}: computed pack is ${tokens} tokens, budget ${budget}`,
            );
    }
    checkProducedNames(set, byAddress);
    checkConsumedNames(set);
}

/**
 * Everything reachable from the start nodes by following `next`.
 * @param {string[]} starts
 * @param {(node: string) => string[]} next
 * @returns {Set<string>}
 */
function reachable(starts, next) {
    /** @type {Set<string>} */
    const seen = new Set();
    const stack = [
        ...starts,
    ];
    while (stack.length) {
        const a = /** @type {string} */ (stack.pop());
        if (seen.has(a)) continue;
        seen.add(a);
        stack.push(...next(a));
    }
    return seen;
}

/**
 * The tasks done before a task: those it is After, directly or not, and those
 * of the milestones its milestone needs, directly or not.
 * @param {DocSet} set
 * @param {Task} task
 * @param {Map<string, Task>} byAddress
 * @param {Map<string, string[]>} milestoneNeeds
 * @returns {Set<string>}
 */
function doneBefore(set, task, byAddress, milestoneNeeds) {
    const done = reachable(task.after, (a) => byAddress.get(a)?.after ?? []);
    const earlier = reachable(
        milestoneNeeds.get(task.address.split('.')[0]) ?? [],
        (m) => milestoneNeeds.get(m) ?? [],
    );
    for (const t of set.tasks) if (earlier.has(t.address.split('.')[0])) done.add(t.address);
    return done;
}

/**
 * The names one produced binding unit uses must be produced by then.
 * @param {DocSet} set
 * @param {Task} task
 * @param {string} unit
 * @param {Map<string, string[]>} producers - Binding unit → tasks producing it.
 * @param {Set<string>} done
 */
function checkProducedUnit(set, task, unit, producers, done) {
    const text = set.units.get(unit)?.[0]?.text ?? '';
    for (const n of namesIn(text.replace(/^- (Accept|Defines): .*$/gm, ''))) {
        const other = set.nameIndex.get(`${task.stack}:${unit.split('.')[0]}:${n}`);
        if (!other || other === unit) continue;
        const by = producers.get(other) ?? [];
        if (by.length && !by.some((t) => t === task.address || done.has(t))) {
            set.findings.push(
                `${task.address} produces ${unit}, which uses ${n} of ${other}, produced only by ${by.join(', ')} after it`,
            );
        }
    }
}

/**
 * A binding unit a task produces uses only names defined by units that this
 * task or a task it is After produces — or by units no task produces.
 * @param {DocSet} set
 * @param {Map<string, Task>} byAddress
 */
function checkProducedNames(set, byAddress) {
    /** @type {Map<string, string[]>} */
    const producers = new Map();
    for (const t of set.tasks)
        for (const u of t.produces)
            producers.set(u, [
                ...(producers.get(u) ?? []),
                t.address,
            ]);
    const milestoneNeeds = new Map(
        set.milestones.map((m) => [
            m.address,
            m.needs,
        ]),
    );
    for (const task of set.tasks) {
        const done = doneBefore(set, task, byAddress, milestoneNeeds);
        for (const unit of task.produces) checkProducedUnit(set, task, unit, producers, done);
    }
}

/**
 * The binding units that define each name, by `stack:name`.
 * @param {DocSet} set
 * @returns {Map<string, { comp: string, unit: string }[]>}
 */
function definitionsByName(set) {
    /** @type {Map<string, { comp: string, unit: string }[]>} */
    const byName = new Map();
    for (const [key, unit] of set.nameIndex) {
        const [stack, comp, ...rest] = key.split(':');
        const k = `${stack}:${rest.join(':')}`;
        byName.set(k, [
            ...(byName.get(k) ?? []),
            {
                comp,
                unit,
            },
        ]);
    }
    return byName;
}

/**
 * The names one produced binding unit uses that another component's unit defines must be consumed.
 * @param {DocSet} set
 * @param {Task} task
 * @param {string} unit
 * @param {Map<string, { comp: string, unit: string }[]>} byName
 */
function checkConsumedUnit(set, task, unit, byName) {
    const listed = new Set([
        ...task.consumes,
        ...task.context,
    ]);
    const own = unit.split('.')[0];
    const deps = new Set((set.componentDeps.get(own) ?? []).map((d) => d.replace(/\?$/, '')));
    const text = set.units.get(unit)?.[0]?.text ?? '';
    // Names in quotes are service or event names, not pointers to a unit.
    for (const n of namesIn(text.replace(/^- (Accept|Defines): .*$/gm, ''), false)) {
        const defs = byName.get(`${task.stack}:${n}`) ?? [];
        // A name that the unit's own component also defines, or that two components define, is not a pointer to one unit.
        if (defs.length !== 1 || defs[0].comp === own || !deps.has(defs[0].comp)) continue;
        if (!listed.has(defs[0].unit))
            set.findings.push(
                `${task.address} produces ${unit}, which uses ${n} of ${defs[0].unit}, but does not consume it`,
            );
    }
}

/**
 * A binding unit a task produces uses names that other components' binding
 * units define: the task must list each defining unit under Consumes, or the
 * builder has to guess the name's shape.
 * @param {DocSet} set
 */
function checkConsumedNames(set) {
    const byName = definitionsByName(set);
    /** @type {Map<string, number>} */
    const producerCount = new Map();
    for (const t of set.tasks)
        for (const u of t.produces) producerCount.set(u, (producerCount.get(u) ?? 0) + 1);
    for (const task of set.tasks) {
        // A unit several tasks produce in turn is checked where it is first produced, by its own task list.
        for (const unit of task.produces.filter((u) => (producerCount.get(u) ?? 0) <= 1))
            checkConsumedUnit(set, task, unit, byName);
    }
}

/**
 * @typedef {{
 *   byAddress: Map<string, Milestone>,
 *   closedBy: Map<string, string[]>,
 *   reach: (start: string, withObservation: boolean) => Set<string>,
 * }} PlanContext
 */

/**
 * The milestone that closes a component, when there is one.
 * @param {PlanContext} ctx
 * @param {string} key
 * @returns {string | undefined}
 */
function closerOf(ctx, key) {
    return (ctx.closedBy.get(key) ?? [])[0];
}

/**
 * @param {number} rank
 * @returns {string} The priority word of a rank.
 */
function rankName(rank) {
    return Object.keys(RANK).find((k) => RANK[k] === rank) ?? 'none';
}

/**
 * Milestones reachable from a start through Needs, and through Observed after
 * too when asked.
 * @param {Map<string, Milestone>} byAddress
 * @returns {(start: string, withObservation: boolean) => Set<string>}
 */
function milestoneReach(byAddress) {
    return (start, withObservation) =>
        reachable(
            [
                start,
            ],
            (a) => {
                const m = byAddress.get(a);
                return [
                    ...(m?.needs ?? []),
                    ...(withObservation ? (m?.observedAfter ?? []) : []),
                ];
            },
        );
}

/**
 * Every milestone has a priority and never needs one of lower priority.
 * @param {DocSet} set
 * @param {Map<string, Milestone>} byAddress
 */
function checkMilestoneFields(set, byAddress) {
    for (const m of set.milestones) {
        if (!m.priority || !RANK[m.priority])
            set.findings.push(`plan.md: ${m.address} Priority is ${m.priority ?? 'missing'}`);
        for (const n of m.needs) {
            const before = byAddress.get(n);
            if (before && RANK[before.priority ?? ''] < RANK[m.priority ?? ''])
                set.findings.push(
                    `plan.md: ${m.address} (${m.priority}) Needs ${n} (${before.priority}), of lower priority`,
                );
        }
    }
}

/**
 * The milestones that close each component; stack-only components are closed
 * by the milestone their profile names.
 * @param {DocSet} set
 * @param {Map<string, Milestone>} byAddress
 * @returns {Map<string, string[]>}
 */
function closedByMap(set, byAddress) {
    /** @type {Map<string, string[]>} */
    const closedBy = new Map();
    /**
     * @param {string} key
     * @param {string} milestone
     */
    const close = (key, milestone) =>
        closedBy.set(key, [
            ...(closedBy.get(key) ?? []),
            milestone,
        ]);
    for (const m of set.milestones)
        for (const c of m.closes.filter((k) => set.componentDeps.has(k))) close(c, m.address);
    for (const [key, sc] of set.stackComponents) {
        if (!sc.milestone || !byAddress.has(sc.milestone))
            set.findings.push(
                `stack/${sc.stack}/profile.md: stack component ${key} names no existing milestone`,
            );
        else close(key, sc.milestone);
    }
    return closedBy;
}

/**
 * Every component is closed by exactly one milestone.
 * @param {DocSet} set
 * @param {Map<string, string[]>} closedBy
 */
function checkClosedOnce(set, closedBy) {
    for (const key of set.componentDeps.keys()) {
        const by = closedBy.get(key) ?? [];
        if (by.length > 1)
            set.findings.push(`plan.md: component ${key} is closed by ${by.join(', ')}`);
        if (by.length === 0)
            set.findings.push(`plan.md: component ${key} is closed by no milestone`);
    }
}

/**
 * The stack-only components that a component requires.
 * @param {DocSet} set
 * @param {string} key
 * @returns {string[]}
 */
function stackRequiring(set, key) {
    return [
        ...set.stackComponents,
    ]
        .filter(([, sc]) => sc.requiredBy.includes(key))
        .map(([k]) => k);
}

/**
 * The required dependencies of a component (an optional one ends in `?`) and the stack-only components that require it.
 * @param {DocSet} set
 * @param {string} key
 * @returns {string[]}
 */
function requiredDeps(set, key) {
    const own = addressList(
        (set.componentDeps.get(key) ?? []).filter((d) => !d.endsWith('?')).join(','),
    );
    return [
        ...own,
        ...stackRequiring(set, key),
    ];
}

/**
 * The components a milestone closes: those it lists and the stack-only ones whose profile names it.
 * @param {DocSet} set
 * @param {Milestone} m
 * @returns {string[]}
 */
function closedAt(set, m) {
    const stackOnly = [
        ...set.stackComponents,
    ]
        .filter(([, sc]) => sc.milestone === m.address)
        .map(([k]) => k);
    return [
        ...m.closes,
        ...stackOnly,
    ];
}

/**
 * A component a milestone closes is named by its Observed by line, and what it requires is closed by a milestone this one needs.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Milestone} m
 * @param {string} c
 * @param {Set<string>} built - The milestones m needs, directly or not.
 */
function checkClosure(set, ctx, m, c, built) {
    if (m.closes.includes(c) && !new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(m.observed))
        set.findings.push(
            `plan.md: ${m.address} closes ${c} but its Observed by line does not name it`,
        );
    // Only required dependencies order the build.
    for (const dep of requiredDeps(set, c)) {
        const owner = closerOf(ctx, dep);
        if (owner && !built.has(owner))
            set.findings.push(
                `plan.md: ${m.address} closes ${c}, which requires ${dep}, closed by ${owner} that ${m.address} does not need`,
            );
    }
}

/**
 * What a Needs edge may be for: a dependency of a component closed here, an end of an integration owned here, or a component extended or revised.
 * @param {DocSet} set
 * @param {Milestone} m
 * @param {string[]} closesHere
 * @returns {Set<string>}
 */
function wantedBy(set, m, closesHere) {
    const deps = closesHere.flatMap((c) => [
        ...(set.componentDeps.get(c) ?? []).map((d) => d.replace(/\?$/, '')),
        ...stackRequiring(set, c),
    ]);
    return new Set([
        ...deps,
        ...m.integrates.flatMap((i) => i.split('+')),
        ...m.extends,
        ...m.revises,
    ]);
}

/**
 * Work on a component closed earlier may also need the milestones that extended or revised it.
 * @param {PlanContext} ctx
 * @param {Milestone} m
 * @param {string} n
 * @returns {boolean}
 */
function grewComponent(ctx, m, n) {
    const grown = new Set([
        ...m.extends,
        ...m.revises,
    ]);
    const other = ctx.byAddress.get(n);
    return (
        !!other &&
        [
            ...other.extends,
            ...other.revises,
        ].some((k) => grown.has(k))
    );
}

/**
 * A Needs edge orders the build; an edge only an observation uses belongs under Observed after.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Milestone} m
 * @param {string[]} closesHere
 */
function checkNeeds(set, ctx, m, closesHere) {
    const wanted = [
        ...wantedBy(set, m, closesHere),
    ];
    for (const n of m.needs) {
        const orders = wanted.some((d) => closerOf(ctx, d) === n);
        if (!orders && !grewComponent(ctx, m, n))
            set.findings.push(
                `plan.md: ${m.address} Needs ${n}, which closes nothing its components depend on, it integrates, extends or revises — an observation edge belongs under Observed after`,
            );
    }
}

/**
 * A key in backticks in Observed by is a reference: it must be closed by now.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Milestone} m
 */
function checkObservedRefs(set, ctx, m) {
    const seen = ctx.reach(m.address, true);
    for (const ref of m.observed.matchAll(/`([a-z][a-z0-9_]*)`/g)) {
        const owner = closerOf(ctx, ref[1]);
        if (owner && !seen.has(owner))
            set.findings.push(
                `plan.md: ${m.address} is observed through ${ref[1]}, closed by ${owner}, which it neither Needs nor is Observed after`,
            );
    }
}

/**
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Milestone} m
 */
function checkMilestone(set, ctx, m) {
    const built = ctx.reach(m.address, false);
    const closesHere = closedAt(set, m);
    for (const c of closesHere) checkClosure(set, ctx, m, c, built);
    checkNeeds(set, ctx, m, closesHere);
    checkObservedRefs(set, ctx, m);
}

/**
 * A rule applies from a milestone: its checkers are closed by then, and a
 * checker closed earlier than the milestone is new work on it (Extends).
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {{ address: string, from: string, checkers: string[] }} r
 */
function checkRule(set, ctx, r) {
    const from = /** @type {Milestone} */ (ctx.byAddress.get(r.from));
    const seen = ctx.reach(r.from, true);
    for (const key of r.checkers) {
        const owner = closerOf(ctx, key);
        if (owner && !seen.has(owner))
            set.findings.push(
                `rules.md: ${r.address} applies from ${r.from}, but its checker ${key} is closed by ${owner}`,
            );
    }
    // A check over a component closed at From, run by one closed earlier, is new work on the earlier one.
    const atFrom = r.checkers.filter((k) => closerOf(ctx, k) === r.from);
    if (!atFrom.length) return;
    for (const key of r.checkers.filter((k) => closerOf(ctx, k) && closerOf(ctx, k) !== r.from)) {
        if (!from.extends.includes(key))
            set.findings.push(
                `rules.md: ${r.address} is checked by ${key} (closed by ${closerOf(ctx, key)}) over ${atFrom.join(', ')} — ${r.from} must list Extends: ${key}`,
            );
    }
}

/** @param {DocSet} set */
function checkPlan(set) {
    if (set.milestones.length === 0) return;
    const byAddress = new Map(
        set.milestones.map((m) => [
            m.address,
            m,
        ]),
    );
    checkMilestoneFields(set, byAddress);
    const closedBy = closedByMap(set, byAddress);
    /** @type {PlanContext} */
    const ctx = {
        byAddress,
        closedBy,
        reach: milestoneReach(byAddress),
    };
    checkClosedOnce(set, closedBy);
    for (const m of set.milestones) checkMilestone(set, ctx, m);
    checkPriorities(set, ctx);
    checkIntegrations(set, ctx);
    for (const r of set.ruleChecks.filter((rule) => byAddress.has(rule.from)))
        checkRule(set, ctx, r);
    // Reached only with a plan: until it defines a milestone, a rule has none to name.
    for (const address of set.rulesWithoutFrom)
        set.findings.push(`rules.md: ${address} has no From, while plan.md defines milestones`);
    checkExtends(set, ctx);
    checkScopeObserved(set, ctx);
}

/**
 * One Extends or Revises entry names a component closed by a milestone this one needs.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Milestone} m
 * @param {string} label
 * @param {string} key
 */
function checkGrowth(set, ctx, m, label, key) {
    const owner = closerOf(ctx, key);
    if (!owner) return; // an unknown key is reported as an unresolved reference
    if (owner === m.address)
        set.findings.push(`plan.md: ${m.address} ${label} ${key}, which it closes itself`);
    else if (!ctx.reach(m.address, false).has(owner))
        set.findings.push(
            `plan.md: ${m.address} ${label} ${key}, closed by ${owner}, which it does not need`,
        );
}

/**
 * Extends names a component closed by a milestone this one needs.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 */
function checkExtends(set, ctx) {
    for (const m of set.milestones) {
        for (const key of m.extends) checkGrowth(set, ctx, m, 'Extends', key);
        for (const key of m.revises) checkGrowth(set, ctx, m, 'Revises', key);
    }
}

/**
 * One scope item In is observed at its own priority.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {string} backlog
 * @param {{ address: string, priority: number, keys: string[], observedIn: string | null }} item
 */
function checkScopeItem(set, ctx, backlog, item) {
    if (item.observedIn) {
        const m = ctx.byAddress.get(item.observedIn);
        if (m && RANK[m.priority ?? ''] !== item.priority)
            set.findings.push(
                `product.md: ${item.address} (${rankName(item.priority)}) is observed in ${m.address} (${m.priority})`,
            );
        return;
    }
    const own = item.keys.some(
        (k) => RANK[ctx.byAddress.get(closerOf(ctx, k) ?? '')?.priority ?? ''] === item.priority,
    );
    const backlogged =
        item.priority === RANK.could && new RegExp(`\\b${item.address}\\b`).test(backlog);
    if (!own && !backlogged)
        set.findings.push(
            `product.md: ${item.address} (${rankName(item.priority)}) is observed by no milestone of its priority — name one with "observed in M{n}"`,
        );
}

/**
 * Every scope item In is observed at its own priority: by a milestone of that
 * priority closing one of its components, by the milestone it names with
 * "observed in", or — for a could item — by an entry of the backlog.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 */
function checkScopeObserved(set, ctx) {
    const backlog = (set.read('plan.md') ?? '').split(/^## Backlog/m)[1] ?? '';
    for (const item of set.scopeItems) checkScopeItem(set, ctx, backlog, item);
}

/**
 * Raises the effective priority of a component's required dependencies to its own.
 * @param {DocSet} set
 * @param {Map<string, number>} effective
 * @param {string} key
 * @returns {boolean} Whether anything was raised.
 */
function raiseDependencies(set, effective, key) {
    const rank = effective.get(key) ?? 0;
    let changed = false;
    for (const dep of requiredDeps(set, key)) {
        if ((effective.get(dep) ?? 0) < rank) {
            effective.set(dep, rank);
            changed = true;
        }
    }
    return changed;
}

/**
 * The effective priority of each component: the highest of its scope
 * priority and that of everything that requires it.
 * @param {DocSet} set
 * @returns {Map<string, number>}
 */
function effectivePriorities(set) {
    /** @type {Map<string, number>} */
    const effective = new Map(
        [
            ...set.componentDeps.keys(),
        ].map((k) => [
            k,
            set.componentScope.get(k) ?? 0,
        ]),
    );
    let changed = true;
    while (changed) {
        changed = false;
        for (const key of set.componentDeps.keys())
            changed = raiseDependencies(set, effective, key) || changed;
    }
    return effective;
}

/**
 * The milestone that closes a component is of the component's effective priority.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Map<string, number>} effective
 * @param {string} key
 * @param {string[]} by
 */
function checkClosingPriority(set, ctx, effective, key, by) {
    // An existing component is a baseline, not work: its milestone may be of higher priority than its users.
    if (set.componentKind.get(key) === 'existing') return;
    const m = ctx.byAddress.get(by[0]);
    if (!m) return;
    const eff = effective.get(key) ?? 0;
    const prio = RANK[m.priority ?? ''] ?? 0;
    if (eff > prio)
        set.findings.push(
            `plan.md: ${m.address} (${m.priority}) closes ${key}, which is ${rankName(eff)}`,
        );
    if (set.componentScope.has(key) && eff < prio)
        set.findings.push(
            `plan.md: ${m.address} (${m.priority}) closes ${key}, which is only ${rankName(eff)} — it could move to a later milestone`,
        );
}

/**
 * Priority propagates along required dependencies: a component's effective
 * priority is the highest of its scope priority and that of everything that
 * requires it.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 */
function checkPriorities(set, ctx) {
    const effective = effectivePriorities(set);
    for (const [key, scope] of set.componentScope) {
        const eff = effective.get(key) ?? 0;
        if (scope < eff)
            set.findings.push(
                `product.md: ${key} has scope priority ${rankName(scope)} but is required by ${rankName(eff)} work`,
            );
    }
    for (const [key, by] of ctx.closedBy) checkClosingPriority(set, ctx, effective, key, by);
}

/**
 * One optional dependency whose two ends are closed by different milestones
 * needs an owner that reaches both.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 * @param {Map<string, string>} listed - `key+dep` → the milestone that lists it under Integrates.
 * @param {string} key
 * @param {string} dep
 */
function checkIntegration(set, ctx, listed, key, dep) {
    const mc = closerOf(ctx, key);
    const md = closerOf(ctx, dep);
    if (!mc || !md || mc === md || ctx.reach(mc, false).has(md)) return;
    const item = `${key}+${dep}`;
    const owner = listed.get(item);
    if (!owner) {
        set.findings.push(`plan.md: integration ${item} (${mc} with ${md}) has no owner`);
        return;
    }
    // Wiring an integration is build work: the owner needs both ends.
    const built = ctx.reach(owner, false);
    if (!built.has(mc) || !built.has(md))
        set.findings.push(
            `plan.md: ${owner} Integrates ${item} but does not need both ${mc} and ${md}`,
        );
}

/**
 * An optional dependency whose two ends are closed by different milestones,
 * and not earlier on the dependent's own build path, is an integration that
 * a milestone reaching both must list under Integrates.
 * @param {DocSet} set
 * @param {PlanContext} ctx
 */
function checkIntegrations(set, ctx) {
    /** @type {Map<string, string>} */
    const listed = new Map(
        set.milestones.flatMap((m) =>
            m.integrates.map((i) => [
                i,
                m.address,
            ]),
        ),
    );
    for (const [key, deps] of set.componentDeps) {
        for (const dep of deps.filter((d) => d.endsWith('?')).map((d) => d.slice(0, -1)))
            checkIntegration(set, ctx, listed, key, dep);
    }
    for (const [item, owner] of listed) {
        const [key, dep] = item.split('+');
        if (!(set.componentDeps.get(key) ?? []).includes(`${dep}?`))
            set.findings.push(
                `plan.md: ${owner} Integrates ${item}, which is not an optional dependency`,
            );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANGES
// ═══════════════════════════════════════════════════════════════════════════

const CHANGE_KINDS = [
    'addition',
    'revision',
    'fix',
    'withdrawal',
    'stack',
    'clarification',
];
const CHANGE_STATUSES = [
    'open',
    'placed',
    'built',
    'satisfied',
];

/** @param {DocSet} set */
function parseChanges(set) {
    for (const { address, text } of headedUnits(set, 'changes.md', /^C\d+$/, 'change')) {
        // `asset:{path}` names a repository text that no unit pins (a readme, a changelog); it is not an address.
        const listed = addressList(field(text, 'Affects'));
        const change = {
            address,
            kind: field(text, 'Kind'),
            status: field(text, 'Status'),
            affects: listed.filter((a) => !a.startsWith('asset:')),
            assets: listed
                .filter((a) => a.startsWith('asset:'))
                .map((a) => a.slice('asset:'.length)),
            builtBy: addressList(field(text, 'Built by')),
        };
        set.changes.push(change);
        set.refer('changes.md', address, 'Affects', change.affects);
        set.refer('changes.md', address, 'Built by', change.builtBy);
    }
}

/**
 * The revision marks of a unit: `- Rev: n — Ck` or `(rev n, Ck)`, and
 * `- Withdrawn: Ck — replaced by …` or `(withdrawn, Ck)`.
 * @param {string} text
 * @returns {{ rev: number, change: string | null, withdrawn: string | null, replacedBy: string | null } | null}
 */
function revisionOf(text) {
    const r = text.match(/^- Rev: (\d+) — (C\d+)/m) ?? text.match(/\(rev (\d+), (C\d+)\)/);
    const w =
        text.match(/^- Withdrawn: (C\d+)(?: — replaced by `?([^`\s]+)`?)?/m) ??
        text.match(/\(withdrawn, (C\d+)\)/);
    if (!r && !w) return null;
    return {
        rev: r ? Number(r[1]) : 1,
        change: r ? r[2] : null,
        withdrawn: w ? w[1] : null,
        replacedBy: w?.[2] && w[2] !== 'nothing' ? w[2] : null,
    };
}

/**
 * The component a unit belongs to: `key` of `key.n` and `key.bn`.
 * @param {DocSet} set
 * @param {string} address
 * @returns {string | null}
 */
function componentOfUnit(set, address) {
    const m = address.match(/^([a-z][a-z0-9_]*)\.b?\d+$/);
    return m && set.componentDeps.has(m[1]) ? m[1] : null;
}

/**
 * @typedef {DocSet['changes'][number]} Change
 * @typedef {{ rev: number, change: string | null, withdrawn: string | null, replacedBy: string | null }} Revision
 * @typedef {{
 *   done: Set<string>,
 *   byChange: Map<string, Change>,
 *   byMilestone: Map<string, Milestone>,
 *   revs: Map<string, Revision>,
 * }} ChangeContext
 */

/**
 * @param {string} task - A task address.
 * @returns {string} The milestone it belongs to.
 */
function milestoneOf(task) {
    return task.split('.')[0];
}

/**
 * The number of a change address.
 * @param {string} change
 * @returns {number}
 */
function changeNumber(change) {
    return Number(change.slice(1));
}

/**
 * A unit that carries a change must be listed by that change under Affects, itself or through its component.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Unit} unit
 * @param {string | null} change
 */
function checkCarried(set, ctx, unit, change) {
    const carried = change ? ctx.byChange.get(change) : undefined;
    if (!change || !carried) return;
    const key = componentOfUnit(set, unit.address);
    if (!carried.affects.includes(unit.address) && !(key && carried.affects.includes(key)))
        set.findings.push(
            `${unit.file}: ${unit.address} carries ${change}, which does not list it under Affects`,
        );
}

/**
 * Collects the revision marks of every unit into `ctx.revs`.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 */
function collectRevisions(set, ctx) {
    for (const [address, units] of set.units) {
        const unit = units[0];
        if (unit.layer === 'change' || address.startsWith('map:')) continue;
        const r = revisionOf(unit.text);
        if (!r) continue;
        ctx.revs.set(address, r);
        for (const c of [
            r.change,
            r.withdrawn,
        ])
            checkCarried(set, ctx, unit, c);
    }
}

/**
 * An open change is not yet carried by any unit.
 * @param {DocSet} set
 * @param {Change} c
 * @param {string[]} marked - The units that carry the change.
 */
function checkOpenChange(set, c, marked) {
    if (marked.length)
        set.findings.push(
            `changes.md: ${c.address} is open, but ${marked.join(', ')} already carry it — it is placed`,
        );
}

/**
 * An input the documents already satisfy builds nothing and revises nothing; the units that state its end state are its Evidence.
 * @param {DocSet} set
 * @param {Change} c
 * @param {string[]} marked
 * @param {boolean} hasEvidence
 */
function checkSatisfiedChange(set, c, marked, hasEvidence) {
    if (!hasEvidence)
        set.findings.push(`changes.md: ${c.address} is satisfied with no Evidence line`);
    if (c.builtBy.length)
        set.findings.push(
            `changes.md: ${c.address} is satisfied, but names ${c.builtBy.join(', ')} under Built by`,
        );
    if (marked.length)
        set.findings.push(
            `changes.md: ${c.address} is satisfied, but ${marked.join(', ')} carry it`,
        );
}

/**
 * A unit a change lists under Affects carries a revision of it, or a later change does; a stack change touches no neutral unit.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Change} c
 * @param {string} a
 */
function checkAffectedUnit(set, ctx, c, a) {
    const r = ctx.revs.get(a);
    // A later change of the same unit carries the unit's mark instead.
    const later = () =>
        [
            r?.change,
            r?.withdrawn,
        ].some(
            (x) =>
                x &&
                changeNumber(x) > changeNumber(c.address) &&
                ctx.byChange.get(x)?.affects.includes(a),
        );
    if (!r || (r.change !== c.address && r.withdrawn !== c.address && !later()))
        set.findings.push(
            `changes.md: ${c.address} lists ${a} under Affects, but ${a} carries no revision of it`,
        );
    if (c.kind === 'stack' && set.units.get(a)?.[0]?.layer === 'neutral')
        set.findings.push(
            `changes.md: ${c.address} is a stack change but affects the neutral unit ${a}`,
        );
}

/**
 * Every component a change affects is closed, extended or revised by a milestone under Built by.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Change} c
 * @param {string[]} units - The units the change lists, components excluded.
 */
function checkOwners(set, ctx, c, units) {
    const keys = new Set([
        ...c.affects.filter((a) => set.componentDeps.has(a)),
        ...units.map((a) => componentOfUnit(set, a)).filter((k) => k !== null),
    ]);
    for (const key of keys) {
        const owner = c.builtBy
            .map((b) => ctx.byMilestone.get(b))
            .find(
                (m) =>
                    m &&
                    [
                        ...m.closes,
                        ...m.extends,
                        ...m.revises,
                    ].includes(/** @type {string} */ (key)),
            );
        if (!owner)
            set.findings.push(
                `changes.md: ${c.address} affects ${key}, but no milestone under Built by closes, extends or revises it`,
            );
    }
}

/**
 * A change is built only when the milestones under Built by are done.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Change} c
 */
function checkBuilt(set, ctx, c) {
    for (const b of c.builtBy.filter((m) => !ctx.done.has(m)))
        set.findings.push(`changes.md: ${c.address} is built, but ${b} is not done`);
}

/**
 * An asset a placed change names is created by a task of the milestones that build it; a task that builds the change lists it in Context.
 * @param {DocSet} set
 * @param {Change} c
 */
function checkBuilders(set, c) {
    const builders = set.tasks.filter((t) => c.builtBy.includes(milestoneOf(t.address)));
    for (const asset of c.assets) {
        if (c.builtBy.length && !builders.some((t) => (t.creates ?? '').includes(asset)))
            set.findings.push(
                `changes.md: ${c.address} names the asset ${asset}, but no task of ${c.builtBy.join(', ')} creates it`,
            );
    }
    // A task that builds the change lists it in Context, so that its pack says what differs from the code as built.
    if (builders.length && !builders.some((t) => t.context.includes(c.address)))
        set.findings.push(
            `changes.md: ${c.address} is in no Context of the tasks of ${c.builtBy.join(', ')}`,
        );
}

/**
 * A change that is placed or built.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Change} c
 */
function checkPlacedChange(set, ctx, c) {
    // A clarification changes the documents only: the code already does what the new text says.
    if (!c.builtBy.length && c.kind !== 'clarification')
        set.findings.push(
            `changes.md: ${c.address} is ${c.status} but names no milestone under Built by`,
        );
    const units = c.affects.filter((a) => !set.componentDeps.has(a));
    for (const a of units) checkAffectedUnit(set, ctx, c, a);
    if (c.kind !== 'clarification') checkOwners(set, ctx, c, units);
    if (c.status === 'built') checkBuilt(set, ctx, c);
    checkBuilders(set, c);
}

/**
 * One change: its kind and status, the evidence it needs, and what its status says about the units and milestones.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Change} c
 */
function checkChange(set, ctx, c) {
    if (!c.kind || !CHANGE_KINDS.includes(c.kind))
        set.findings.push(`changes.md: ${c.address} Kind is ${c.kind ?? 'missing'}`);
    if (!c.status || !CHANGE_STATUSES.includes(c.status))
        set.findings.push(`changes.md: ${c.address} Status is ${c.status ?? 'missing'}`);
    const marked = [
        ...ctx.revs,
    ]
        .filter(([, r]) => r.change === c.address || r.withdrawn === c.address)
        .map(([a]) => a);
    const hasEvidence = /^- Evidence: /m.test(set.units.get(c.address)?.[0]?.text ?? '');
    if ((c.kind === 'fix' || c.kind === 'revision') && !hasEvidence)
        set.findings.push(`changes.md: ${c.address} is a ${c.kind} with no Evidence line`);
    if (c.status === 'open') checkOpenChange(set, c, marked);
    else if (c.status === 'satisfied') checkSatisfiedChange(set, c, marked, hasEvidence);
    else checkPlacedChange(set, ctx, c);
}

/**
 * A withdrawn unit is mentioned only by its change and its replacement.
 * @param {DocSet} set
 * @param {Map<string, Revision>} revs
 */
function checkWithdrawnMentions(set, revs) {
    const withdrawn = new Map(
        [
            ...revs,
        ].filter(([, r]) => r.withdrawn),
    );
    for (const [address, units] of set.units) {
        const unit = units[0];
        // A task may name a withdrawn unit: removing it is the task's work, or was.
        if (
            unit.layer === 'change' ||
            unit.layer === 'memory' ||
            withdrawn.has(address) ||
            /^M\d+\.T\d+$/.test(address)
        )
            continue;
        for (const ref of set.inlineRefs(unit.text)) {
            const w = withdrawn.get(ref);
            if (w && w.replacedBy !== address)
                set.findings.push(
                    `${unit.file}: ${address} mentions ${ref}, withdrawn by ${w.withdrawn}`,
                );
        }
    }
}

/**
 * Whether a task of a milestone that builds a component lists a unit in its Context or Consumes.
 * @param {ChangeContext} ctx
 * @param {Task} t
 * @param {string} key
 * @param {string} address
 * @returns {boolean}
 */
function buildsUnit(ctx, t, key, address) {
    const m = ctx.byMilestone.get(milestoneOf(t.address));
    return (
        !!m &&
        [
            ...m.closes,
            ...m.extends,
            ...m.revises,
        ].includes(key) &&
        [
            ...t.context,
            ...t.consumes,
        ].includes(address)
    );
}

/**
 * What the map records of a unit, in words.
 * @param {number | undefined} built
 * @returns {string}
 */
function mapSaid(built) {
    return built === undefined ? 'nothing' : `rev ${built}`;
}

/**
 * A unit newer than the map is built by a task still to do, and shows the builder the revision that is built.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Task[]} openTasks
 * @param {string} address
 * @param {Revision} r
 * @param {string} key
 */
function checkStaleUnit(set, ctx, openTasks, address, r, key) {
    const built = set.mapRevs.get(address);
    if (built !== undefined && built > r.rev)
        set.findings.push(
            `memory/map.md: records ${address}@${built}, newer than the unit (rev ${r.rev})`,
        );
    const stale = r.withdrawn ? built !== undefined : built === undefined || built < r.rev;
    if (!stale) return;
    // A revised unit shows the builder the revision that is built (Was).
    const text = set.units.get(address)?.[0]?.text ?? '';
    if (!r.withdrawn && built !== undefined && !/^- Was \(rev \d+\): /m.test(text))
        set.findings.push(
            `${address} is at rev ${r.rev} but the map has rev ${built}, and it keeps no Was line of the built revision`,
        );
    if (!openTasks.some((t) => buildsUnit(ctx, t, key, address)))
        set.findings.push(
            `${address} is stale (rev ${r.rev}${r.withdrawn ? ', withdrawn' : ''}; the map has ${mapSaid(built)}) and no task still to do builds it`,
        );
}

/**
 * Every stale unit of a component the map records is built by a task still to do.
 * @param {DocSet} set
 * @param {ChangeContext} ctx
 * @param {Task[]} openTasks
 */
function checkStaleUnits(set, ctx, openTasks) {
    const mapKeys = new Set(
        [
            ...set.mapRevs.keys(),
        ]
            .map((a) => componentOfUnit(set, a))
            .filter(Boolean),
    );
    for (const [address, r] of ctx.revs) {
        const key = componentOfUnit(set, address);
        if (key && mapKeys.has(key)) checkStaleUnit(set, ctx, openTasks, address, r, key);
    }
}

/**
 * A unit with an open question makes the task that needs it not ready.
 * @param {DocSet} set
 * @param {Task[]} openTasks
 */
function checkOpenQuestions(set, openTasks) {
    for (const t of openTasks) {
        for (const a of computePack(set, t.address).filter((u) =>
            /^- Open: /m.test(set.packText(u, t.stack)),
        ))
            set.findings.push(`${t.address}: its pack holds ${a}, which has an open question`);
    }
}

/**
 * Changes after the first version (§8): kinds and statuses, revisions that
 * name their change, placed changes with the milestones that build them, no
 * mention of a withdrawn unit, every stale unit in a task still to do, no open
 * question in the pack of a task still to do.
 * @param {DocSet} set
 */
function checkChanges(set) {
    const state = set.read('memory/state.md') ?? '';
    /** @type {ChangeContext} */
    const ctx = {
        done: new Set(
            [
                ...state.matchAll(/^- Done: (M\d+)(?![.\d])/gm),
            ].map((m) => m[1]),
        ),
        byChange: new Map(
            set.changes.map((c) => [
                c.address,
                c,
            ]),
        ),
        byMilestone: new Map(
            set.milestones.map((m) => [
                m.address,
                m,
            ]),
        ),
        revs: new Map(),
    };
    collectRevisions(set, ctx);
    for (const c of set.changes) checkChange(set, ctx, c);
    checkWithdrawnMentions(set, ctx.revs);
    const openTasks = set.tasks.filter((t) => !ctx.done.has(milestoneOf(t.address)));
    checkStaleUnits(set, ctx, openTasks);
    checkOpenQuestions(set, openTasks);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a documentation set without running any check.
 * @param {string} dir
 * @returns {DocSet}
 */
function loadDocSet(dir) {
    const set = new DocSet(path.resolve(dir));
    parseProduct(set);
    parseSpecs(set);
    parseStacks(set);
    parsePlan(set);
    parseTasks(set);
    parseRulesAndMemory(set);
    parseChanges(set);
    return set;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNING THE CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/** The budget, in tokens, of the computed units of one pack (concept §5.6). */
const DEFAULT_BUDGET = 10000;

/**
 * Runs every check on a parsed set and returns what they found.
 * @param {DocSet} set
 * @param {number} [budget]
 * @returns {{ findings: string[], addresses: number, tasks: number, largestPack: number }}
 */
function checkDocSet(set, budget = DEFAULT_BUDGET) {
    for (const key of set.componentText.keys()) {
        if (!set.componentDeps.has(key))
            set.findings.push(`spec or binding for ${key}: no row in the component map`);
    }
    checkAddresses(set);
    checkVocabulary(set);
    checkComments(set);
    checkTasks(set, budget);
    checkPlan(set);
    checkChanges(set);
    const packs = set.tasks.map((t) => packTokens(set, t.address));
    return {
        findings: set.findings,
        addresses: set.units.size,
        tasks: set.tasks.length,
        largestPack: packs.length ? Math.max(...packs) : 0,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCATING THE SET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Finds the workspace the executor resolved and says whether it holds a 4.0 set.
 * A workspace is in the 4.0 format when its entry of `workspace.json` carries `"format": "4"`.
 * @returns {{ name: string | null, dir: string | null, isSet: boolean }}
 */
function locateSet() {
    const projectRoot = resolveProjectRoot();
    const { designAbs } = resolveDesignRoot(projectRoot);
    const envDir = process.env.MAGIC_DESIGN_DIR;
    const dir = envDir ? path.resolve(projectRoot, envDir) : designAbs;
    const name =
        path.dirname(dir) === designAbs && WORKSPACE_NAME_RE.test(path.basename(dir))
            ? path.basename(dir)
            : null;
    if (!name)
        return {
            name: null,
            dir: null,
            isSet: false,
        };
    try {
        const registry = JSON.parse(
            fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'),
        );
        return {
            name,
            dir,
            isSet: String(registry?.workspaces?.[name]?.format) === '4',
        };
    } catch {
        return {
            name,
            dir,
            isSet: false,
        };
    }
}

/**
 * The line a command prints on a workspace that is not in the 4.0 format.
 * @param {string} tag - The command's name.
 * @param {string | null} name - The workspace, when one was resolved.
 * @returns {string}
 */
function notSetLine(tag, name) {
    return `[${tag}] ${name ?? 'the project'} is not a 4.0 workspace (no "format": "4" in workspace.json).`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @returns {number} exit code: 1 when the set has a finding, else 0
 */
function main() {
    const where = locateSet();
    if (!where.isSet || !where.dir) {
        console.log(notSetLine('check-docs', where.name));
        return 0;
    }
    const budget = Number(readOptionValue(process.argv.slice(2), '--budget') ?? DEFAULT_BUDGET);
    const result = checkDocSet(loadDocSet(where.dir), budget);
    for (const finding of result.findings) process.stdout.write(`${finding}\n`);
    const largest = result.tasks ? `, largest pack ${result.largestPack} tokens` : '';
    process.stderr.write(
        `${result.addresses} addresses, ${result.tasks} tasks${largest}, ${result.findings.length} findings\n`,
    );
    return result.findings.length ? 1 : 0;
}

module.exports = {
    loadDocSet,
    revisionOf,
    computePack,
    checkDocSet,
    locateSet,
    notSetLine,
    DEFAULT_BUDGET,
};

if (require.main === module) runMain('check-docs', main);
