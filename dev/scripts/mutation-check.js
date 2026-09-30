#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// MUTATION-CONTROL DRIVER (Negative Controls for Harness Cases)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A harness case is only as trustworthy as the proof that it fails without the
 * fix it guards. This script makes that proof repeatable: for each entry of a
 * JSON list it applies one exact replacement to one file, runs only the named
 * case, expects a failure, and restores the original bytes.
 *
 * Input: a JSON file holding a list of
 *   { "name", "file", "needle", "replacement", "test" }
 * where `file` is repository-relative, `needle` must occur exactly once in it,
 * and `test` is a harness name pattern (a regular expression source).
 *
 * Verdict per entry:
 *   CAUGHT          the case failed under the mutation (the control worked)
 *   SURVIVED        the case still passed — the case does not guard that line
 *   REFUSED         the entry was not run (bad shape, path outside the root or
 *                   under `.design/`, needle not found exactly once, or the
 *                   pattern matched no case)
 *   RESTORE FAILED  the file's bytes after the run differ from before it
 *
 * Exit code: 0 only when every entry was CAUGHT; 1 otherwise.
 *
 * Layer 2: produces nothing that ships and imports nothing from the engine.
 *
 * Usage:
 *   node dev/scripts/mutation-check.js <spec.json> [--harness <file>] [--root <dir>]
 */

// ───────────────────────────────────────────────────────────────────────────
// Paths & Constants
// ───────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_HARNESS = path.join('dev', 'tests', 'engine.js');

/** Verdicts, in the order the summary lists them. */
const VERDICTS = ['CAUGHT', 'SURVIVED', 'REFUSED', 'RESTORE FAILED'];

// ───────────────────────────────────────────────────────────────────────────
// Restore Guard
// ───────────────────────────────────────────────────────────────────────────

/**
 * The one file currently mutated, or null. A single slot is enough: entries
 * run strictly one after another, and every exit path consults it.
 *
 * @type {{abs: string, bytes: Buffer, hash: string}|null}
 */
let inFlight = null;

/**
 * @param {Buffer} bytes
 * @returns {string} SHA-256 of the bytes, hex.
 */
function sha256(bytes) {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

/**
 * Writes the original bytes back and checks them by hash. Written in place
 * (not replaced) so a hardlinked file keeps its links.
 *
 * @returns {boolean} False when the restored bytes differ from the original.
 */
function restoreInFlight() {
    if (inFlight === null) return true;
    const { abs, bytes, hash } = inFlight;
    inFlight = null;
    try {
        fs.writeFileSync(abs, bytes);
        return sha256(fs.readFileSync(abs)) === hash;
    } catch {
        return false;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Entry Validation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Resolves an entry's file under the root, refusing anything a mutation must
 * never touch: a path outside the root, or a specification under `.design/`.
 *
 * @param {string} root - Repository root.
 * @param {string} file - Repository-relative path from the entry.
 * @returns {{abs: string}|{refusal: string}}
 */
function resolveTarget(root, file) {
    const abs = path.resolve(root, file);
    const rel = path.relative(root, abs);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
        return { refusal: `file '${file}' is outside the root` };
    }
    if (rel.split(path.sep)[0] === '.design') {
        return { refusal: `file '${file}' is under .design/ — specifications are never mutated` };
    }
    return { abs };
}

/**
 * @param {*} entry - One element of the input list.
 * @returns {string|null} A reason the entry is malformed, or null.
 */
function shapeProblem(entry) {
    if (entry === null || typeof entry !== 'object') return 'entry is not an object';
    for (const key of ['name', 'file', 'needle', 'replacement', 'test']) {
        if (typeof entry[key] !== 'string') return `'${key}' must be a string`;
    }
    if (entry.needle === '') return "'needle' must not be empty";
    if (entry.test === '') return "'test' must not be empty";
    return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Running the Harness
// ───────────────────────────────────────────────────────────────────────────

/**
 * Runs only the harness case(s) matching a name pattern.
 *
 * @param {string} harness - Absolute path of the harness file.
 * @param {string} pattern - Case-name pattern.
 * @param {string} cwd - Working directory for the run.
 * @returns {{status: number, tests: number}} Exit status and the number of
 *          distinct cases the run reported (0 when the pattern matched nothing,
 *          or the harness failed to load at all).
 * @throws {Error} When the harness process could not be started at all.
 */
function runHarness(harness, pattern, cwd) {
    // A driver started from inside a test run inherits the runner's marker and
    // would make the nested run emit machine output instead of a report.
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
        process.execPath,
        ['--test', `--test-name-pattern=${pattern}`, harness],
        { cwd, encoding: 'utf8', env },
    );
    if (result.error) throw result.error;
    // A pattern that matches nothing still prints one line for the harness file
    // itself, so a case ran only if some other named result was reported.
    const cases = new Set();
    for (const line of result.stdout.split(/\r?\n/)) {
        const named = /^\s*[✔✖] (.+) \([\d.]+ms\)$/.exec(line);
        if (named && !named[1].endsWith('.js')) cases.add(named[1]);
    }
    return { status: result.status === null ? 1 : result.status, tests: cases.size };
}

// ───────────────────────────────────────────────────────────────────────────
// Driver
// ───────────────────────────────────────────────────────────────────────────

/**
 * Applies one entry and returns its verdict. The file is restored on every
 * path out of here — a normal return, a refusal after reading, or a throw from
 * the run.
 *
 * @param {Object} entry - A validated entry.
 * @param {{root: string, harness: string, run: Function}} context
 * @returns {{verdict: string, detail?: string}}
 */
function checkOne(entry, { root, harness, run }) {
    const target = resolveTarget(root, entry.file);
    if (target.refusal) return { verdict: 'REFUSED', detail: target.refusal };

    let bytes;
    try {
        bytes = fs.readFileSync(target.abs);
    } catch (err) {
        return { verdict: 'REFUSED', detail: `cannot read '${entry.file}': ${err.message}` };
    }
    const source = bytes.toString('utf8');
    const occurrences = source.split(entry.needle).length - 1;
    if (occurrences !== 1) {
        return {
            verdict: 'REFUSED',
            detail: `needle occurs ${occurrences} time(s) in '${entry.file}', expected exactly 1`,
        };
    }

    inFlight = { abs: target.abs, bytes, hash: sha256(bytes) };
    let outcome;
    let failure = null;
    try {
        // The function form keeps `$&`, `$1` and friends in a replacement literal.
        fs.writeFileSync(target.abs, source.replace(entry.needle, () => entry.replacement));
        outcome = run(harness, entry.test, root);
    } catch (err) {
        failure = err;
    }
    // Restore before anything else is decided: the file is back on every path.
    if (!restoreInFlight()) return { verdict: 'RESTORE FAILED', detail: entry.file };
    if (failure) throw failure;
    if (outcome.tests === 0) {
        return {
            verdict: 'REFUSED',
            detail: `no harness case ran for pattern '${entry.test}' (no match, or the mutation broke the harness load)`,
        };
    }
    return { verdict: outcome.status !== 0 ? 'CAUGHT' : 'SURVIVED' };
}

/**
 * Runs every entry, one after another, and reports one line each.
 *
 * @param {Object[]} list - The parsed input list.
 * @param {{root?: string, harness?: string, run?: Function, log?: Function}} [options]
 * @returns {{name: string, verdict: string, detail?: string}[]} One result per entry.
 *          A run that throws is reported as `REFUSED` with the error, after the
 *          restore, so one broken entry never hides the rest.
 */
function checkMutations(list, options = {}) {
    const root = path.resolve(options.root || REPO_ROOT);
    const harness = path.resolve(root, options.harness || DEFAULT_HARNESS);
    const run = options.run || runHarness;
    const log = options.log || console.log;

    const results = [];
    for (const [index, entry] of list.entries()) {
        const name = entry && typeof entry.name === 'string' ? entry.name : `#${index + 1}`;
        let result;
        const problem = shapeProblem(entry);
        if (problem) {
            result = { verdict: 'REFUSED', detail: problem };
        } else {
            try {
                result = checkOne(entry, { root, harness, run });
            } catch (err) {
                result = { verdict: 'REFUSED', detail: `run failed: ${err.message}` };
            }
        }
        log(`${result.verdict.padEnd(15)} ${name}${result.detail ? ` — ${result.detail}` : ''}`);
        results.push({ name, ...result });
    }

    const counts = VERDICTS.map((v) => `${results.filter((r) => r.verdict === v).length} ${v}`);
    log(`${results.length} mutation(s): ${counts.join(', ')}`);
    return results;
}

// ───────────────────────────────────────────────────────────────────────────
// Command Line
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv - Arguments after the script name.
 * @returns {{specPath: string|null, harness: string|undefined, root: string|undefined}}
 */
function parseArgs(argv) {
    const parsed = { specPath: null, harness: undefined, root: undefined };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--harness') parsed.harness = argv[++i];
        else if (arg === '--root') parsed.root = argv[++i];
        else if (arg.startsWith('--harness=')) parsed.harness = arg.slice('--harness='.length);
        else if (arg.startsWith('--root=')) parsed.root = arg.slice('--root='.length);
        else if (parsed.specPath === null) parsed.specPath = arg;
    }
    return parsed;
}

/**
 * Entry point.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {number} Process exit code.
 */
function main(argv) {
    const { specPath, harness, root } = parseArgs(argv);
    if (!specPath) {
        console.error(
            'Usage: node dev/scripts/mutation-check.js <spec.json> [--harness <file>] [--root <dir>]',
        );
        return 1;
    }

    let list;
    try {
        list = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    } catch (err) {
        console.error(`❌ Cannot read the mutation list '${specPath}': ${err.message}`);
        return 1;
    }
    if (!Array.isArray(list)) {
        console.error('❌ The mutation list must be a JSON array.');
        return 1;
    }

    // Signals arrive only when spawnSync returns, so the handler restores a
    // file whose run was interrupted; `exit` covers every other way out.
    const bail = () => {
        restoreInFlight();
        process.exit(130);
    };
    process.on('SIGINT', bail);
    process.on('SIGTERM', bail);
    process.on('exit', restoreInFlight);

    const results = checkMutations(list, { root, harness });
    // An empty list proves nothing, so it does not pass.
    return results.length > 0 && results.every((r) => r.verdict === 'CAUGHT') ? 0 : 1;
}

module.exports = { checkMutations, runHarness, resolveTarget, VERDICTS };

if (require.main === module) {
    process.exit(main(process.argv.slice(2)));
}
