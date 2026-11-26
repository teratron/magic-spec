// @ts-check
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadDocSet, checkDocSet, locateSet } = require('../check-docs');
const {
    resolveProjectRoot,
    resolveDesignRoot,
    registeredWorkspaceNames,
    walkFiles,
    normalizePath,
    executorHint,
    STATE_DIR_NAME,
    LEGACY_STATE_DIR_NAME,
} = require('../utils');
const { NEXT_TREE, MOVED_FILES, moveInFlight } = require('./doc-set-state');
const { SIMULATIONS_DIR, SCENARIO_HEADING_RE, recognisedLines } = require('./simulation-findings');
const { unlinkWorkspaceRow } = require('./sync-registry');

// ═══════════════════════════════════════════════════════════════════════════
// THE MOVE TO 4.0 (one 3.x workspace to the document set)
// ═══════════════════════════════════════════════════════════════════════════
//
// The set is written into `next/` of the workspace by the analysis, never by a text
// transformation here: this module only previews the move, moves files and takes the link to the
// registry that left out of the global registry's row. Its state is read from the files and never
// from a log, so a run that was interrupted continues where they stand. The 3.x files leave for
// `archives/3x/` first, then the set comes out of `next/`, `product.md` first, and the format is
// set last. The order is what makes the state readable: `product.md` in the workspace and no
// longer in `next/` means the set is on its way up.

/**
 * Where each file of a 3.x workspace goes in the 4.0 layout. The dry run prints it and the
 * apply step takes from it what stays where it is, so the two cannot disagree. A file with no
 * row has no 4.0 place and is kept under `archives/3x/`.
 *
 * @type {ReadonlyArray<{ match: RegExp, place?: string, stays?: boolean }>}
 */
const PLACES = Object.freeze([
    {
        match: /^archives(\/|$)/,
        stays: true,
    },
    {
        match: new RegExp(`^${SIMULATIONS_DIR}(/|$)`),
        stays: true,
    },
    {
        match: /^RULES\.md$/,
        place: 'rules.md',
    },
    {
        match: /^specifications\/l1-[^/]+\.md$/,
        place: 'spec/{key}.md, product.md',
    },
    {
        match: /^specifications\/l\d+-[^/]+\.md$/,
        place: 'stack/{stack}/bind/{key}.md, profile.md, deps.md',
    },
    {
        match: /^PLAN\.md$/,
        place: 'plan.md',
    },
    {
        match: /^(TASKS\.md|tasks\/phase-[^/]+\.md)$/,
        place: 'stack/{stack}/tasks/M{n}.md',
    },
    {
        match: /^STATE\.md$/,
        place: 'memory/state.md, memory/goal.md',
    },
]);

/** Entries only a 3.x workspace has at its root, compared by their exact spelling. */
const OLD_LAYOUT = Object.freeze([
    'INDEX.md',
    'RULES.md',
    'PLAN.md',
    'TASKS.md',
    'STATE.md',
    'specifications',
]);

/** The document every set starts with; it is moved up first. */
const FIRST_DOCUMENT = 'product.md';

const ABSENT = `${NEXT_TREE}/: absent — write it with /magicspec analyze first-time`;
const UNDER_WAY = `  A move is under way: the files already moved are under ${MOVED_FILES}/.`;

/**
 * @typedef {{ name: string, dir: string, designAbs: string }} Workspace
 * @typedef {{ from: string, to: string }} Move
 */

// ───────────────────────────────────────────────────────────────────────────
// Reading The Workspace
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} dir
 * @returns {string[]} The names in a folder, sorted; none when it is not there.
 */
function namesIn(dir) {
    try {
        return fs.readdirSync(dir).sort();
    } catch {
        return [];
    }
}

/**
 * @param {string} entry - A name at the root of a workspace.
 * @returns {boolean} True when the move leaves it where it is.
 */
function stays(entry) {
    return entry === NEXT_TREE || PLACES.some((p) => p.stays && p.match.test(entry));
}

/**
 * Whether the set is on its way out of `next/`: the move is in flight, the first document has
 * arrived and nothing of the 3.x layout is left at the root.
 *
 * @param {Workspace} ws
 * @returns {boolean}
 */
function movingUp(ws) {
    if (!moveInFlight(ws.dir, ws.name)) return false;
    const root = namesIn(ws.dir);
    return (
        root.includes(FIRST_DOCUMENT) &&
        !namesIn(path.join(ws.dir, NEXT_TREE)).includes(FIRST_DOCUMENT) &&
        !root.some((name) => OLD_LAYOUT.includes(name))
    );
}

/**
 * The state of the new tree, by the checker.
 *
 * @param {Workspace} ws
 * @returns {{ present: boolean, findings: string[] }}
 */
function readNextTree(ws) {
    const dir = path.join(ws.dir, NEXT_TREE);
    if (!fs.existsSync(dir))
        return {
            present: false,
            findings: [],
        };
    // The checker reports a folder without a product file, so an empty `next/` is never clean.
    return {
        present: true,
        findings: checkDocSet(loadDocSet(dir)).findings,
    };
}

/**
 * @param {{ present: boolean, findings: string[] }} next
 * @returns {string[]} The lines that report the new tree.
 */
function nextTreeLines(next) {
    if (!next.present)
        return [
            ABSENT,
        ];
    if (next.findings.length === 0)
        return [
            `${NEXT_TREE}/: clean`,
        ];
    return [
        `${NEXT_TREE}/: ${next.findings.length} findings`,
        ...next.findings.map((finding) => `  ${finding}`),
    ];
}

// ───────────────────────────────────────────────────────────────────────────
// The Preview
// ───────────────────────────────────────────────────────────────────────────

/**
 * One line per file of the 3.x layout with its place; the archives are one line.
 *
 * @param {Workspace} ws
 * @returns {string[]}
 */
function mappingLines(ws) {
    const skipped = new Set(
        [
            NEXT_TREE,
            'archives',
        ].map((name) => path.join(ws.dir, name)),
    );
    const files = walkFiles(ws.dir, {
        skipDir: (_entry, abs) => skipped.has(abs),
    })
        .map((abs) => normalizePath(path.relative(ws.dir, abs)))
        .sort();
    const lines = files.map((rel) => {
        const row = PLACES.find((p) => p.match.test(rel));
        if (row?.stays) return `  ${rel} → ${rel} (stays)`;
        return `  ${rel} → ${row?.place ?? `${MOVED_FILES}/${rel}`}`;
    });
    if (fs.existsSync(path.join(ws.dir, 'archives'))) lines.push('  archives/ → archives/ (stays)');
    return lines;
}

/**
 * @param {Workspace} ws
 * @returns {string[]} The specifications of the workspace: each is split by judgement.
 */
function specificationsOf(ws) {
    return namesIn(path.join(ws.dir, 'specifications')).filter((name) => name.endsWith('.md'));
}

/**
 * The scenarios of one file whose `Verifies` names a 3.x specification.
 *
 * @param {string} text - The content of a scenario file.
 * @returns {string[]} Their identifiers, in file order.
 */
function scenariosCitingSpecifications(text) {
    const raw = text.replace(/\r\n/g, '\n').split('\n');
    const found = new Set();
    let scenario = null;
    for (const [index, line] of recognisedLines(raw.join('\n')).entries()) {
        const heading = SCENARIO_HEADING_RE.exec(line);
        if (heading) scenario = heading[1];
        else if (
            scenario &&
            line.startsWith('**Verifies:**') &&
            /\bl\d+-[\w-]+\.md\b/.test(raw[index])
        )
            found.add(scenario);
    }
    return [
        ...found,
    ];
}

/**
 * @param {Workspace} ws
 * @returns {string[]} One line per scenario to rewrite.
 */
function scenarioLines(ws) {
    const dir = path.join(ws.dir, SIMULATIONS_DIR);
    return namesIn(dir)
        .filter((name) => name.endsWith('.md'))
        .flatMap((name) =>
            scenariosCitingSpecifications(fs.readFileSync(path.join(dir, name), 'utf8')).map(
                (id) => `  scenario to rewrite: ${SIMULATIONS_DIR}/${name} ${id}`,
            ),
        );
}

/**
 * Prints what the apply step would do. Writes nothing.
 *
 * @param {Workspace} ws
 * @returns {number} Exit code.
 */
function preview(ws) {
    const lines = [
        `Migration to 4.0 of ${ws.name} (dry run — nothing changes without --apply):`,
    ];
    if (movingUp(ws)) {
        lines.push(
            `${NEXT_TREE}/: partly moved into the workspace — run the apply step to finish the move`,
        );
    } else {
        if (moveInFlight(ws.dir, ws.name)) lines.push(UNDER_WAY);
        lines.push(
            ...mappingLines(ws),
            ...specificationsOf(ws).map((name) => `  split by the reverse mode: ${name}`),
            ...scenarioLines(ws),
            ...nextTreeLines(readNextTree(ws)),
        );
    }
    console.log(lines.join('\n'));
    return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// The Moves
// ───────────────────────────────────────────────────────────────────────────

/**
 * Plans the move of one entry. A folder that is already there is merged into, so a move that
 * stopped inside it continues; a file that is already there is a conflict.
 *
 * @param {string} from - The entry.
 * @param {string} to - Its new path.
 * @param {{ moves: Move[], conflicts: string[], emptied: string[] }} plan
 * @returns {void}
 */
function planEntry(from, to, plan) {
    if (!fs.existsSync(to)) {
        plan.moves.push({
            from,
            to,
        });
    } else if (fs.statSync(from).isDirectory() && fs.statSync(to).isDirectory()) {
        for (const name of namesIn(from))
            planEntry(path.join(from, name), path.join(to, name), plan);
        plan.emptied.push(from);
    } else {
        plan.conflicts.push(to);
    }
}

/**
 * @param {string} fromDir
 * @param {string} toDir
 * @param {string[]} names - Entries of `fromDir`, in the order they are moved.
 * @returns {{ moves: Move[], conflicts: string[], emptied: string[] }}
 */
function planMoves(fromDir, toDir, names) {
    const plan = {
        moves: [],
        conflicts: [],
        emptied: [],
    };
    for (const name of names) planEntry(path.join(fromDir, name), path.join(toDir, name), plan);
    return plan;
}

/**
 * @param {{ moves: Move[], emptied: string[] }} plan - A plan without a conflict.
 * @returns {void}
 */
function carryOut(plan) {
    for (const { from, to } of plan.moves) {
        fs.mkdirSync(path.dirname(to), {
            recursive: true,
        });
        fs.renameSync(from, to);
    }
    for (const dir of plan.emptied) fs.rmdirSync(dir);
}

/** @param {Workspace} ws */
const oldFilesPlan = (ws) =>
    planMoves(
        ws.dir,
        path.join(ws.dir, MOVED_FILES),
        namesIn(ws.dir).filter((name) => !stays(name)),
    );

/**
 * The moves out of `next/`, the first document ahead of the rest.
 *
 * @param {Workspace} ws
 * @param {(name: string) => boolean} [take] - Which entries to plan.
 */
function newTreePlan(ws, take = () => true) {
    const dir = path.join(ws.dir, NEXT_TREE);
    const names = namesIn(dir).filter(take);
    const ordered = [
        ...names.filter((name) => name === FIRST_DOCUMENT),
        ...names.filter((name) => name !== FIRST_DOCUMENT),
    ];
    return planMoves(dir, ws.dir, ordered);
}

/**
 * Sets `"format": "4"` on the workspace's entry, keeping the file's indentation and line ends.
 *
 * @param {Workspace} ws
 * @returns {void}
 */
function setFormat(ws) {
    const file = path.join(ws.designAbs, 'workspace.json');
    const text = fs.readFileSync(file, 'utf8');
    const registry = JSON.parse(text);
    registry.workspaces[ws.name].format = '4';
    const indent = /^[ \t]+/m.exec(text)?.[0] ?? '  ';
    const body = `${JSON.stringify(registry, null, indent)}\n`;
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, text.includes('\r\n') ? body.replace(/\n/g, '\r\n') : body);
    fs.renameSync(temp, file);
}

/**
 * What keeps the move from starting: a new tree that is absent or has findings, or a file that
 * would land on another.
 *
 * @param {Workspace} ws
 * @returns {string[]} Lines to print; none when the move may start.
 */
function obstacles(ws) {
    const next = readNextTree(ws);
    if (!next.present || next.findings.length > 0) {
        const lines = nextTreeLines(next);
        if (moveInFlight(ws.dir, ws.name))
            lines.push(
                `The move is in flight: put ${NEXT_TREE}/ right, or the files of ${MOVED_FILES}/ back into the workspace.`,
            );
        return lines;
    }
    // Before the 3.x files have left, only the folders that stay can already hold a file of the
    // new tree.
    return conflictLines(ws, [
        ...oldFilesPlan(ws).conflicts,
        ...newTreePlan(ws, stays).conflicts,
    ]);
}

/**
 * @param {Workspace} ws
 * @param {string[]} conflicts
 * @returns {string[]}
 */
function conflictLines(ws, conflicts) {
    if (conflicts.length === 0) return [];
    const shown = conflicts.map((abs) => normalizePath(path.relative(ws.dir, abs))).join(', ');
    return [
        `HALT: The move would write over ${shown}. Move that file aside, then run \`${executorHint()} migrate --to 4 --apply\` again.`,
    ];
}

/**
 * Moves the workspace to 4.0, or finishes a move that was interrupted.
 *
 * @param {Workspace} ws
 * @returns {number} Exit code.
 */
function apply(ws) {
    if (!movingUp(ws)) {
        const stop = obstacles(ws);
        if (stop.length > 0) {
            console.log(stop.join('\n'));
            return 1;
        }
        carryOut(oldFilesPlan(ws));
    }
    const up = newTreePlan(ws);
    if (up.conflicts.length > 0) {
        console.log(conflictLines(ws, up.conflicts).join('\n'));
        return 1;
    }
    carryOut(up);
    const nextDir = path.join(ws.dir, NEXT_TREE);
    if (fs.existsSync(nextDir)) fs.rmdirSync(nextDir);
    // The workspace's registry has left, so the global row stops linking it. The format is set
    // after it, so an interrupted run comes back to both.
    unlinkWorkspaceRow(ws.designAbs, ws.name);
    setFormat(ws);
    console.log(`[migrate] ${ws.name} is a 4.0 workspace.`);
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {{ apply: boolean }} options
 * @returns {number} Exit code.
 */
function moveTo4(options) {
    const projectRoot = resolveProjectRoot();
    if (fs.existsSync(path.join(projectRoot, LEGACY_STATE_DIR_NAME, 'workspace.json'))) {
        console.error(
            `HALT: This project uses the 2.x layout (${LEGACY_STATE_DIR_NAME}/). Run \`/magicspec migrate\` first, then the move to 4.0.`,
        );
        return 1;
    }
    const { designAbs } = resolveDesignRoot(projectRoot);
    const found = locateSet();
    let registered = [];
    try {
        registered = registeredWorkspaceNames(
            JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8')),
        );
    } catch {
        registered = [];
    }
    if (!found.name || !found.dir || !registered.includes(found.name)) {
        console.error(
            `HALT: The move to 4.0 needs a workspace registered in ${STATE_DIR_NAME}/workspace.json. Name one: \`${executorHint()} migrate --to 4 --workspace <name>\`.`,
        );
        return 1;
    }
    if (found.isSet) {
        console.log(`[migrate] ${found.name} is already a 4.0 workspace; nothing to do.`);
        return 0;
    }
    const ws = {
        name: found.name,
        dir: found.dir,
        designAbs,
    };
    try {
        return options.apply ? apply(ws) : preview(ws);
    } catch (err) {
        console.error(
            `HALT: The move of ${ws.name} failed: ${err.message}. Fix the cause and run \`${executorHint()} migrate --to 4 --apply\` again; it resumes from the files.`,
        );
        return 1;
    }
}

module.exports = {
    moveTo4,
};
