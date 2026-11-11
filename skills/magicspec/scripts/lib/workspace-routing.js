#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
    BUILD_NOISE_DIRS,
    WORKSPACE_NAME_RE,
    compilePathSet,
    isSkippedDir,
    loadGitignore,
    normalizePath,
    registeredWorkspaceNames,
    unknownWorkspaceMessage,
} = require('../utils');
const { collectInFlight } = require('./in-flight');

// ═══════════════════════════════════════════════════════════════════════════
// WORKSPACE ROUTING (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The one chain that chooses the workspace a command acts on. The signals are tried in a
// fixed order and the first that decides wins:
//
//   argument → environment → sole workspace → location → topic → work in flight → default → coverage
//
// Every step is computed from the registry, the paths and the words of the request, never
// judged, so identical input routes identically. Nothing here writes: the module reads the
// registry, the specification folders and the phase workbooks, and nothing else. Creating a
// workspace is not part of the chain; it stays with the `spec` workflow.

/** Raised for input the chain cannot route; the caller prints the message and stops. */
class RoutingError extends Error {}

/** The share of a request's words a workspace's lexicon must hold for the topic signal. */
const TOPIC_THRESHOLD = 0.3;

/** Files counted when no signal decides and no default exists; the walk is in name order. */
const COVERAGE_FILE_CAP = 20000;

// ───────────────────────────────────────────────────────────────────────────
// Paths in the Request
// ───────────────────────────────────────────────────────────────────────────

/** A name with a file extension: a letter-led extension of up to eight characters (so `1.2.3` is not one). */
const FILE_SHAPE = /^[^/\s]*[A-Za-z0-9_-]\.[A-Za-z][A-Za-z0-9]{0,7}$/;

/** A dot-file such as `.gitignore`. */
const DOTFILE_SHAPE = /^\.[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Abbreviations that have the shape of a file name. */
const NOT_FILES = new Set(['e.g', 'i.e']);

/**
 * Turns one candidate into a project-relative, forward-slash path.
 *
 * @param {string} candidate - A path as written: relative, or absolute inside the project.
 * @param {string} root - Absolute project root.
 * @returns {string|null} `null` when it names nothing, the whole project, or a place outside it.
 */
function toProjectRelative(candidate, root) {
    let spelled = String(candidate).trim().replace(/\\/g, '/');
    if (spelled === '') return null;
    if (spelled.startsWith('/') || /^[A-Za-z]:\//.test(spelled)) {
        const relative = path.relative(root, spelled);
        if (path.isAbsolute(relative)) return null;
        spelled = normalizePath(relative);
    }
    spelled = path.posix.normalize(spelled).replace(/^(\.\/)+/, '').replace(/\/+$/, '');
    if (spelled === '' || spelled === '.' || spelled === '..' || spelled.startsWith('../')) {
        return null;
    }
    return spelled;
}

/**
 * Finds the words of a request that have the shape of a path: a slash, a file extension, or a
 * dot-file name. A URL and a version number do not; whether a word is inside the project is
 * decided later, by `cleanPaths`.
 *
 * @param {string} text - The request as typed.
 * @returns {string[]} The candidates, as written.
 */
function extractPaths(text) {
    const found = [];
    for (const word of String(text || '').split(/[\s"'`<>()[\]{}|,;]+/)) {
        let token = word.replace(/[.:!?]+$/, '').replace(/^--?[\w-]+=(?=.)/, '');
        if (token === '' || token.includes('://')) continue;
        token = token.replace(/:\d+(?::\d+)?$/, '').replace(/\\/g, '/');
        if (NOT_FILES.has(token.toLowerCase())) continue;
        if (!(token.includes('/') || FILE_SHAPE.test(token) || DOTFILE_SHAPE.test(token))) continue;
        found.push(token);
    }
    return found;
}

/**
 * Normalizes and de-duplicates a list of paths. An absolute path inside the project is made
 * relative; one outside it, and a command typed with a leading slash (`/magicspec`), are dropped.
 *
 * @param {string[]} candidates - Paths as written.
 * @param {string} root - Absolute project root.
 * @returns {string[]} Project-relative paths, first appearance kept.
 */
function cleanPaths(candidates, root) {
    const seen = new Set();
    for (const candidate of candidates) {
        const relative = toProjectRelative(candidate, root);
        if (relative !== null) seen.add(relative);
    }
    return [...seen];
}

// ───────────────────────────────────────────────────────────────────────────
// Location Signal
// ───────────────────────────────────────────────────────────────────────────

/**
 * How specifically a scope entry matched a path: the longer the literal folder in front of any
 * wildcard, the more specific; at equal length a literal beats a pattern, then the longer entry.
 * `src/api` therefore beats `src`, and both beat `**`.
 *
 * @param {{source: string, isPattern: boolean, staticPrefix: string}} entry - A compiled entry.
 * @returns {number}
 */
function specificity(entry) {
    const segments = entry.staticPrefix === '' ? 0 : entry.staticPrefix.split('/').length;
    return segments * 1e6 + (entry.isPattern ? 0 : 1e3) + Math.min(entry.source.length, 999);
}

/**
 * Matches every path against every workspace's scope. A path belongs to the workspace whose scope
 * entry matches it most specifically; two workspaces matching it equally share it. A workspace
 * with no scope covers no path.
 *
 * @param {string[]} names - Registered names, in registry order.
 * @param {Record<string, ReturnType<typeof compilePathSet>>} scopes - Compiled scope per workspace.
 * @param {string[]} paths - Project-relative paths.
 * @returns {{matched: Record<string, string[]>, unmatched: string[]}}
 */
function matchPaths(names, scopes, paths) {
    const matched = Object.fromEntries(names.map((name) => [name, []]));
    const unmatched = [];
    for (const file of paths) {
        let best = -1;
        let owners = [];
        for (const name of names) {
            let top = -1;
            for (const entry of scopes[name].entries) {
                if (entry.test(file)) top = Math.max(top, specificity(entry));
            }
            if (top < 0) continue;
            if (top > best) {
                best = top;
                owners = [name];
            } else if (top === best) {
                owners.push(name);
            }
        }
        if (owners.length === 0) unmatched.push(file);
        for (const name of owners) matched[name].push(file);
    }
    return { matched, unmatched };
}

/**
 * @param {Record<string, string[]>} matched - Paths per workspace.
 * @param {string[]} names - Registered names, in registry order.
 * @returns {string|null} The workspace with strictly the most paths; `null` when none has any or the top is shared.
 */
function locationWinner(matched, names) {
    const top = Math.max(0, ...names.map((name) => matched[name].length));
    if (top === 0) return null;
    const leaders = names.filter((name) => matched[name].length === top);
    return leaders.length === 1 ? leaders[0] : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Topic Signal
// ───────────────────────────────────────────────────────────────────────────

/** Words that say nothing about a topic: grammar and the verbs a request opens with. */
const STOPWORDS = new Set(
    (
        'the and for with that this from into are was were will would should could can not but all any ' +
        'add fix new use using get set let make one two has have had been being does did done also then ' +
        'than them they you your our its how what when where which there here about over please need want ' +
        'run update'
    ).split(' '),
);

/**
 * @param {string} text - Free text.
 * @returns {string[]} Distinct lower-case words of three or more letters or digits, without stop words.
 */
function words(text) {
    const found = String(text || '')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu);
    return [...new Set((found || []).filter((w) => w.length >= 3 && !STOPWORDS.has(w)))];
}

/**
 * Whether two words are the same topic: equal, one the prefix of the other (four letters at least),
 * or sharing a stem of five letters.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function sameTopic(a, b) {
    if (a === b) return true;
    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    if (shorter.length >= 4 && longer.startsWith(shorter)) return true;
    let common = 0;
    while (common < shorter.length && shorter[common] === longer[common]) common++;
    return common >= 5;
}

/**
 * @param {string} file - Absolute path of a Markdown file.
 * @returns {string} Its top-level heading, or `''`.
 */
function firstHeading(file) {
    let fd;
    try {
        fd = fs.openSync(file, 'r');
        const buffer = Buffer.alloc(2048);
        const length = fs.readSync(fd, buffer, 0, buffer.length, 0);
        const match = /^# (.+)$/m.exec(buffer.toString('utf8', 0, length));
        return match ? match[1] : '';
    } catch {
        return '';
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

/**
 * The words a workspace is about: its description, the segments of its scope entries, the names
 * of its specifications (layer prefix removed) and their top-level headings.
 *
 * @param {string} designAbs - Absolute state folder.
 * @param {string} name - Workspace name.
 * @param {{description?: string, scope?: string[]}} entry - Its registry entry.
 * @returns {string[]}
 */
function lexicon(designAbs, name, entry) {
    const found = new Set();
    const add = (text) => {
        for (const word of words(text)) found.add(word);
    };
    add(entry.description);
    for (const scope of Array.isArray(entry.scope) ? entry.scope : []) add(scope);
    const specsDir = path.join(designAbs, name, 'specifications');
    let files = [];
    try {
        files = fs.readdirSync(specsDir).filter((f) => f.endsWith('.md')).sort();
    } catch {
        /* a workspace without specifications has a short lexicon */
    }
    for (const file of files) {
        add(file.replace(/\.md$/, '').replace(/^l\d+-/, ''));
        add(firstHeading(path.join(specsDir, file)));
    }
    return [...found];
}

/**
 * Scores each workspace by the share of the request's words its lexicon holds.
 *
 * @param {string} designAbs - Absolute state folder.
 * @param {Record<string, {description?: string, scope?: string[]}>} entries - Registry entries.
 * @param {string[]} names - Registered names, in registry order.
 * @param {string} text - The request.
 * @returns {Record<string, number>|null} Scores to two decimals; `null` when the request has no words to score.
 */
function topicScores(designAbs, entries, names, text) {
    const request = words(text);
    if (request.length === 0) return null;
    const scores = {};
    for (const name of names) {
        const known = lexicon(designAbs, name, entries[name] || {});
        const hit = request.filter((word) => known.some((k) => sameTopic(word, k))).length;
        scores[name] = Math.round((hit / request.length) * 100) / 100;
    }
    return scores;
}

/**
 * @param {Record<string, number>} scores - Score per workspace.
 * @param {string[]} names - Registered names, in registry order.
 * @returns {string|null} The workspace with strictly the highest score at or above the threshold.
 */
function topicWinner(scores, names) {
    const eligible = names.filter((name) => scores[name] >= TOPIC_THRESHOLD);
    if (eligible.length === 0) return null;
    const top = Math.max(...eligible.map((name) => scores[name]));
    const leaders = eligible.filter((name) => scores[name] === top);
    return leaders.length === 1 ? leaders[0] : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Coverage (the last resort)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Counts the project's files each workspace's scope covers, as a share of all files.
 *
 * @param {string} root - Absolute project root.
 * @param {string[]} names - Registered names, in registry order.
 * @param {Record<string, ReturnType<typeof compilePathSet>>} scopes - Compiled scope per workspace.
 * @returns {Record<string, number>} Share per workspace, to four decimals.
 */
function scopeCoverage(root, names, scopes) {
    const isIgnored = loadGitignore(root);
    const files = [];
    const walk = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        for (const entry of entries) {
            if (files.length >= COVERAGE_FILE_CAP) return;
            const full = path.join(dir, entry.name);
            const relative = normalizePath(path.relative(root, full));
            if (isSkippedDir(BUILD_NOISE_DIRS, entry.name, relative) || isIgnored(relative)) continue;
            if (entry.isSymbolicLink()) continue;
            if (entry.isDirectory()) walk(full);
            else files.push(relative);
        }
    };
    walk(root);
    const coverage = {};
    for (const name of names) {
        const covered = files.filter((file) => scopes[name].matches(file)).length;
        // Four decimals: in a large project one file is a hundredth of a percent, and two
        // decimals would round a real difference into a tie.
        coverage[name] = files.length === 0 ? 0 : Math.round((covered / files.length) * 10000) / 10000;
    }
    return coverage;
}

// ───────────────────────────────────────────────────────────────────────────
// The Chain
// ───────────────────────────────────────────────────────────────────────────

/**
 * Names the other workspace worth offering as the override: the one that matched the most paths,
 * then scored highest, then came first in the registry.
 *
 * @param {string} chosen - The resolved workspace.
 * @param {string[]} names - Registered names, in registry order.
 * @param {Record<string, string[]>} matched - Paths per workspace.
 * @param {Record<string, number>|null} scores - Topic scores, when computed.
 * @returns {string}
 */
function runnerUp(chosen, names, matched, scores) {
    const others = names.filter((name) => name !== chosen);
    const rank = (name) => (matched[name] ? matched[name].length : 0) * 1000 + (scores ? scores[name] || 0 : 0);
    return others.reduce((best, name) => (rank(name) > rank(best) ? name : best), others[0]);
}

/**
 * The one line that tells the person where the command is acting and why.
 *
 * @param {object} result - The routing result before narration.
 * @param {string[]} names - Registered names, in registry order.
 * @param {string|null} command - The command being routed.
 * @param {number} pathCount - Distinct paths the request named.
 * @returns {string|null} `null` for a project with one workspace or none: it routes silently.
 */
function narration(result, names, command, pathCount) {
    if (names.length < 2 || result.workspace === null) return null;
    const labels = { 'work-in-flight': 'work in flight' };
    let detail = '';
    if (result.signal === 'location') {
        detail = `: ${result.matched[result.workspace].length} of ${pathCount} paths`;
        const also = names
            .filter((name) => name !== result.workspace && result.matched[name].length > 0)
            .map((name) => `${name} (${result.matched[name].length})`);
        if (also.length > 0) detail += `; also matched: ${also.join(', ')}`;
    } else if (result.signal === 'topic') {
        detail = `: score ${result.scores[result.workspace].toFixed(2)}`;
    } else if (result.signal === 'coverage') {
        detail = `: ${(result.coverage[result.workspace] * 100).toFixed(1)}% of the files`;
    }
    const other = runnerUp(result.workspace, names, result.matched, result.scores);
    return `[Workspace] ${result.workspace} — ${labels[result.signal] || result.signal}${detail}. (Override: /magicspec ${command || '<command>'} ${other} …)`;
}

/**
 * Chooses the workspace a command acts on.
 *
 * @param {object} input
 * @param {string} input.root - Absolute project root.
 * @param {string} input.designAbs - Absolute state folder.
 * @param {{default?: string, workspaces?: Record<string, {description?: string, scope?: string[]}>}} input.registry - Parsed `workspace.json`.
 * @param {{value: string, source: 'argument'|'environment'}|null} [input.explicit] - A name the caller gave.
 * @param {string|null} [input.command] - The command, for the narration.
 * @param {string} [input.text] - The request as typed.
 * @param {string[]} [input.paths] - Paths given separately.
 * @returns {{workspace: string|null, signal: string, command: string|null, registered: string[],
 *   matched: Record<string, string[]>, unmatched: string[], scores: Record<string, number>|null,
 *   in_flight: string[]|null, coverage: Record<string, number>|null, narration: string|null}}
 * @throws {RoutingError} When an explicit name is malformed or not registered.
 */
function resolveWorkspace(input) {
    const { root, designAbs, registry, explicit = null, command = null, text = '', paths = [] } = input;
    const entries = registry && typeof registry.workspaces === 'object' && registry.workspaces ? registry.workspaces : {};
    const names = registeredWorkspaceNames(registry).filter((name) => WORKSPACE_NAME_RE.test(name));

    if (explicit) {
        if (!WORKSPACE_NAME_RE.test(explicit.value)) {
            throw new RoutingError(`Invalid workspace name '${explicit.value}'. Must match ${WORKSPACE_NAME_RE}.`);
        }
        if (!names.includes(explicit.value)) {
            throw new RoutingError(unknownWorkspaceMessage(explicit.value, names));
        }
    }

    const scopes = Object.fromEntries(
        names.map((name) => [name, compilePathSet(Array.isArray(entries[name].scope) ? entries[name].scope : [])]),
    );
    const written = extractPaths(text);
    const named = cleanPaths([...written, ...paths], root);
    const { matched, unmatched } = matchPaths(names, scopes, named);
    // The topic signal reads what the request says, not where it points: a path is the location
    // signal's business, and its words would score the workspace the path already chose.
    const prose = written.reduce((rest, candidate) => rest.split(candidate).join(' '), String(text || ''));

    const result = {
        workspace: null,
        signal: 'none',
        command,
        registered: names,
        matched,
        unmatched,
        scores: null,
        in_flight: null,
        coverage: null,
        narration: null,
    };
    const decide = (workspace, signal) => {
        result.workspace = workspace;
        result.signal = signal;
        result.narration = narration(result, names, command, named.length);
        return result;
    };

    if (explicit) return decide(explicit.value, explicit.source);
    if (names.length === 0) return decide(null, 'none');
    if (names.length === 1) return decide(names[0], 'sole');

    const byLocation = locationWinner(matched, names);
    if (byLocation) return decide(byLocation, 'location');

    result.scores = topicScores(designAbs, entries, names, prose);
    const byTopic = result.scores ? topicWinner(result.scores, names) : null;
    if (byTopic) return decide(byTopic, 'topic');

    result.in_flight = names.filter((name) => collectInFlight(path.join(designAbs, name)).length > 0);
    if (result.in_flight.length === 1) return decide(result.in_flight[0], 'work-in-flight');

    if (typeof registry.default === 'string' && names.includes(registry.default)) {
        return decide(registry.default, 'default');
    }

    result.coverage = scopeCoverage(root, names, scopes);
    const top = Math.max(...names.map((name) => result.coverage[name]));
    return decide(names.find((name) => result.coverage[name] === top), 'coverage');
}

module.exports = {
    RoutingError,
    TOPIC_THRESHOLD,
    extractPaths,
    cleanPaths,
    toProjectRelative,
    matchPaths,
    topicScores,
    resolveWorkspace,
};
