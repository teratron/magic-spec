#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('memory-query', module);

const path = require('path');
const { normalizePath, parseFlags, resolveDesignRoot, resolveProjectRoot } = require('./utils');
const diagnostics = require('./lib/diagnostics');
const { embed, fuse, hostOf, rankByVector, readSetting } = require('./lib/memory-embed');
const {
    reportEmbeddingsFailed,
    reportUnavailable,
    withFreshIndex,
} = require('./lib/memory-refresh');
const { KINDS, matchesFilters, parseQuery } = require('./lib/memory-sections');

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY-QUERY (Ranked Search over the Artifact Index)
// ═══════════════════════════════════════════════════════════════════════════
//
// Finds the sections of the project's SDD artifacts that bear on a question, ranked, with
// their citations (AM-3): it never composes an answer, and an agent that relies on a
// result reads the cited section first. The index is brought up to date before it answers
// (AM-5), so no section is read from a file that has changed since. History kinds
// (archives, history tables, retrospectives, changelogs) are left out unless `--history`
// asks for them (AM-6). A failure never fails the run (AM-8): the finding is recorded and
// the line printed tells the reader to search the text instead.
//
// Usage:
//   node skills/magicspec/scripts/executor.js memory-query "<text>" [--kind=spec,rules] [--k=10] [--history] [--json]
//
// `--workspace` (an executor option) limits the results to one workspace.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SNIPPET_CHARS = 200;

// ───────────────────────────────────────────────────────────────────────────
// Formatting
// ───────────────────────────────────────────────────────────────────────────

/**
 * A short stretch of a section's text around the first place a query word occurs, with
 * the whitespace collapsed, so the reader sees why the section matched.
 *
 * @param {string} body - Section text.
 * @param {string[][]} phrases - Parsed query.
 * @returns {string} The snippet, with an ellipsis where it was cut.
 */
function snippetOf(body, phrases) {
    const lower = body.toLowerCase();
    const at = phrases
        .flat()
        .map((token) => lower.indexOf(token))
        .filter((i) => i !== -1);
    const first = at.length > 0 ? Math.min(...at) : 0;
    const start = Math.max(0, first - 60);
    const flat = body
        .slice(start, start + SNIPPET_CHARS)
        .replace(/\s+/g, ' ')
        .trim();
    return `${start > 0 ? '… ' : ''}${flat}${start + SNIPPET_CHARS < body.length ? ' …' : ''}`;
}

/**
 * The citation of a result: the file as the project names it, then the headings below the
 * document title.
 *
 * @param {{path: string, heading: string}} row - A result row.
 * @param {string} designRel - State folder relative to the project root.
 * @returns {{file: string, heading: string}} `file` opens from the project root.
 */
function citationOf(row, designRel) {
    return { file: `${designRel}/${row.path}`, heading: row.heading };
}

/**
 * Renders the results the way a person or an agent reads them (§5.4).
 *
 * @param {{modes: string[], results: object[]}} answer - Modes that ranked and the results.
 * @returns {string} Text for stdout.
 */
function renderText(answer) {
    const lines = [`modes: ${answer.modes.join(' + ')}`];
    if (answer.results.length === 0) lines.push('No sections match.');
    answer.results.forEach((r, i) => {
        const tail = r.heading.split(' › ').slice(1).join(' › ');
        const status = r.status ? `, ${r.status}${r.version ? ` v${r.version}` : ''}` : '';
        lines.push(
            `${String(i + 1).padStart(2)}. ${r.score.toFixed(answer.modes.length > 1 ? 4 : 1)}  ${r.file}${tail ? ` › ${tail}` : ''}   (${r.kind}${status})`,
            `      ${r.snippet}`,
        );
    });
    return lines.join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Query
// ───────────────────────────────────────────────────────────────────────────

/**
 * The ranked rows of a query inside an open index: the lexical ranking, and, when a provider
 * is configured and vectors exist, its fusion with the vector ranking by Reciprocal Rank
 * Fusion (AM-4). A provider that fails leaves the lexical rows as they are.
 *
 * @param {object} backend - An open, fresh backend.
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {object} request - The query (see `queryProject`).
 * @param {string[][]} phrases - The parsed query text.
 * @param {(finding: object) => unknown} record - Where a provider failure is recorded.
 * @returns {{rows: object[], modes: string[], sent: {host: string, texts: number}|null}}
 */
function rankRows(backend, designAbs, request, phrases, record) {
    const limit = request.limit ?? DEFAULT_LIMIT;
    const depth = Math.max(50, limit * 5);
    const filters = {
        kinds: request.kinds,
        history: request.history,
        workspace: request.workspace,
    };
    const lexical = backend.query(phrases, { ...filters, limit: depth });
    const plain = { rows: lexical.slice(0, limit), modes: ['lexical'], sent: null };

    const { setting, error } = readSetting(designAbs);
    if (error) {
        reportEmbeddingsFailed('memory-query', error, record);
        return plain;
    }
    if (!setting) return plain;
    const vectors = backend.vectors(setting.model, setting.dimensions);
    if (vectors.size === 0) return plain;
    try {
        const [queryVector] = (request.embedFn ?? embed)(setting, [request.text]);
        const meta = backend.sectionMeta();
        const vectorIds = rankByVector(
            queryVector,
            vectors,
            (id) => matchesFilters(meta.get(id) ?? {}, filters),
            depth,
        ).map((r) => r.id);
        const fused = fuse([lexical.map((r) => r.id), vectorIds]).slice(0, limit);
        const known = new Map(lexical.map((r) => [r.id, r]));
        const missing = fused.map((f) => f.id).filter((id) => !known.has(id));
        for (const [id, row] of backend.sectionsByIds(missing)) known.set(id, row);
        return {
            rows: fused.map((f) => ({ ...known.get(f.id), score: f.score })),
            modes: ['lexical', 'vector'],
            sent: { host: hostOf(setting), texts: 1 },
        };
    } catch (err) {
        reportEmbeddingsFailed('memory-query', err.message, record);
        return plain;
    }
}

/**
 * Answers one query over one state folder.
 *
 * @param {string} rootDir - Project root, so citations open from it.
 * @param {string} designAbs - Absolute path of the state folder.
 * @param {{text: string, kinds?: string[], limit?: number, history?: boolean, workspace?: string, loader?: () => object, embedFn?: Function}} request - The query;
 *   `loader` replaces the SQLite module loader and `embedFn` the provider request (tests).
 * @param {(finding: object) => unknown} [record] - Where a failure is recorded.
 * @returns {{ok: true, backend: string, modes: string[], query: string, sent: ({host: string, texts: number}|null), results: object[]} | {ok: false, reason: string}}
 */
function queryProject(rootDir, designAbs, request, record = diagnostics.record) {
    const phrases = parseQuery(request.text);
    const designRel = normalizePath(path.relative(rootDir, designAbs));
    try {
        return withFreshIndex(designAbs, { loader: request.loader }, (backend) => {
            const { rows, modes, sent } = rankRows(backend, designAbs, request, phrases, record);
            return {
                ok: true,
                backend: backend.name,
                modes,
                query: request.text,
                sent,
                results: rows.map((row) => ({
                    ...citationOf(row, designRel),
                    kind: row.kind,
                    workspace: row.workspace,
                    status: row.status,
                    version: row.version,
                    score: row.score,
                    snippet: snippetOf(row.body, phrases),
                })),
            };
        });
    } catch (err) {
        return { ok: false, reason: reportUnavailable('memory-query', err, record) };
    }
}

/**
 * Reads the command line into a request, or says what is wrong with it.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @param {NodeJS.ProcessEnv} [env] - Environment, for the workspace the executor forwards.
 * @returns {{request?: object, json?: boolean, error?: string}}
 */
function parseRequest(argv, env = process.env) {
    const { values, flags, rest, errors } = parseFlags(argv, {
        valueFlags: ['--kind', '--k', '--workspace'],
        boolFlags: ['--history', '--json'],
    });
    if (errors.length > 0) return { error: errors[0] };
    const text = rest
        .filter((token) => !token.startsWith('--'))
        .join(' ')
        .trim();
    if (text === '') return { error: 'give the text to search for, in quotation marks.' };

    const kinds = values['--kind'] ? values['--kind'].split(',').map((k) => k.trim()) : undefined;
    const unknown = (kinds ?? []).filter((k) => !KINDS.includes(k));
    if (unknown.length > 0) {
        return { error: `unknown kind '${unknown[0]}'; the kinds are ${KINDS.join(', ')}.` };
    }
    const limit = values['--k'] === undefined ? DEFAULT_LIMIT : Number(values['--k']);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return { error: `--k must be a whole number from 1 to ${MAX_LIMIT}.` };
    }

    // The executor consumes `--workspace` and hands its child the folder; a workspace the caller
    // did not name (the registry's default) must not narrow the search.
    const named =
        values['--workspace'] ??
        (['argument', 'environment'].includes(env.MAGIC_WORKSPACE_SOURCE) && env.MAGIC_DESIGN_DIR
            ? path.basename(env.MAGIC_DESIGN_DIR)
            : undefined);
    return {
        json: flags['--json'] === true,
        request: { text, kinds, limit, history: flags['--history'] === true, workspace: named },
    };
}

/**
 * Entry point: answers the query on stdout. Exits 0 when the index is unavailable (AM-8)
 * and 1 only for a command line that cannot be read.
 *
 * @returns {void}
 */
function runCli() {
    const parsed = parseRequest(process.argv.slice(2));
    if (parsed.error) {
        console.error(`[memory-query] ${parsed.error}`);
        process.exit(1);
    }
    const rootDir = resolveProjectRoot();
    const { designAbs } = resolveDesignRoot(rootDir);
    const answer = queryProject(rootDir, designAbs, parsed.request);
    if (!answer.ok) {
        console.log(
            parsed.json
                ? JSON.stringify({ unavailable: answer.reason, modes: [], results: [] }, null, 2)
                : `[memory-query] The artifact index is unavailable: ${answer.reason}. Search the text with grep instead.`,
        );
        return;
    }
    console.log(parsed.json ? JSON.stringify(answer, null, 2) : renderText(answer));
}

if (require.main === module) {
    runCli();
}

module.exports = { parseRequest, queryProject, renderText, runCli, snippetOf };
