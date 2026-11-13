'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY EMBEDDINGS (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The optional semantic half of the artifact index (AM-4). It exists only when the person
// configures a provider in `workspace.json` (`memory.embeddings`); without one nothing here
// runs and nothing leaves the machine (AM-7). This file is the only place the engine makes
// a network call: it is also the small program (`node memory-embed.js`, reading one request
// on stdin) that the calling script starts to make the request, so the callers stay
// synchronous and hold the index lock for the whole pass.
//
// The setting, in `.magicspec/workspace.json`:
//
//   "memory": { "embeddings": { "url": "https://…/v1/embeddings", "model": "…", "dimensions": 768,
//                               "apiKeyEnv": "NAME_OF_AN_ENVIRONMENT_VARIABLE" } }
//
// `url`, `model` and `dimensions` are required; `apiKeyEnv` names the environment variable
// that holds a bearer key, if the provider needs one — the key itself is never written to a
// project file. The setting is committed with the project and so reaches every copy of it, the
// credential does not: a machine where the named variable is unset or empty sends nothing and
// ranks lexically (`credentialProblem`). The request is the widely implemented shape: a JSON body with `model` and
// `input` (a list of texts), answered by `{"data": [{"embedding": [...]}, ...]}`. What is sent
// is, for an indexing run, the heading path and the text of each section that has no vector
// yet (cut at 6000 characters), and for a query, the query text.
//
// Vectors are Float32 and are compared in process by cosine; the two rankings (lexical and
// vector) are combined by Reciprocal Rank Fusion with k = 60.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/** Sections per request. */
const BATCH_SIZE = 32;

/** Characters of a section sent for embedding. */
const MAX_TEXT_CHARS = 6000;

/** The constant of Reciprocal Rank Fusion. */
const RRF_K = 60;

/** How long a request may take, in milliseconds. */
const REQUEST_TIMEOUT_MS = 30000;

// ───────────────────────────────────────────────────────────────────────────
// The setting
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reads the provider setting. Absent or empty means lexical only, silently; a setting that
 * is present but cannot be used is reported, and the index stays lexical.
 *
 * @param {string} designAbs - Absolute path of the state folder.
 * @returns {{setting: {url: string, model: string, dimensions: number, apiKeyEnv?: string}|null, error?: string}}
 */
function readSetting(designAbs) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(path.join(designAbs, 'workspace.json'), 'utf8'))?.memory
            ?.embeddings;
    } catch {
        return { setting: null };
    }
    if (raw === undefined || raw === null) return { setting: null };
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        return {
            setting: null,
            error: 'memory.embeddings must be an object with url, model and dimensions',
        };
    }
    if (Object.keys(raw).length === 0) return { setting: null };
    let url;
    try {
        url = new URL(String(raw.url));
    } catch {
        return { setting: null, error: 'memory.embeddings.url is not a URL' };
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { setting: null, error: 'memory.embeddings.url must be http or https' };
    }
    if (typeof raw.model !== 'string' || raw.model.trim() === '') {
        return { setting: null, error: 'memory.embeddings.model must be a non-empty string' };
    }
    if (!Number.isInteger(raw.dimensions) || raw.dimensions < 1 || raw.dimensions > 8192) {
        return {
            setting: null,
            error: 'memory.embeddings.dimensions must be a whole number from 1 to 8192',
        };
    }
    if (raw.apiKeyEnv !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(raw.apiKeyEnv))) {
        return {
            setting: null,
            error: 'memory.embeddings.apiKeyEnv must be the name of an environment variable',
        };
    }
    return {
        setting: {
            url: url.href,
            model: raw.model,
            dimensions: raw.dimensions,
            ...(raw.apiKeyEnv ? { apiKeyEnv: raw.apiKeyEnv } : {}),
        },
    };
}

/**
 * @param {{url: string}} setting - A valid setting.
 * @returns {string} The provider's host, which is what a run that sends text says it sent to.
 */
function hostOf(setting) {
    return new URL(setting.url).host;
}

/**
 * Why this machine cannot use the setting, when it names a credential it does not hold. The
 * setting is committed with the project, so every copy receives it; whether a machine takes part
 * is decided by what that machine holds, and a machine without the named variable sends nothing
 * (AM-7). The reason names the variable and never its value.
 *
 * @param {{apiKeyEnv?: string}} setting - A valid setting.
 * @param {NodeJS.ProcessEnv} [env] - The environment of the run.
 * @returns {string|null} The reason, or null when the setting names no credential or it is held.
 */
function credentialProblem(setting, env = process.env) {
    if (!setting.apiKeyEnv) return null;
    if ((env[setting.apiKeyEnv] ?? '').trim() !== '') return null;
    return `the environment variable ${setting.apiKeyEnv}, named by memory.embeddings.apiKeyEnv, is not set here, so nothing was sent`;
}

// ───────────────────────────────────────────────────────────────────────────
// The request (the only network call)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Asks the provider for the embeddings of some texts. The request is made by a child
 * process, so the caller stays synchronous.
 *
 * @param {{url: string, model: string, dimensions: number, apiKeyEnv?: string}} setting - A valid setting.
 * @param {string[]} texts - Texts to embed, at least one.
 * @returns {Float32Array[]} One vector per text, in order.
 * @throws {Error} With the reason, when the machine lacks the credential the setting names (before
 *   any request is made) or the provider cannot be reached or answers wrongly.
 */
function embed(setting, texts) {
    const missing = credentialProblem(setting);
    if (missing) throw new Error(missing);
    const key = setting.apiKeyEnv ? process.env[setting.apiKeyEnv] : undefined;
    const child = spawnSync(process.execPath, [__filename], {
        input: JSON.stringify({ url: setting.url, model: setting.model, input: texts, key }),
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        timeout: REQUEST_TIMEOUT_MS + 5000,
        env: { ...process.env, NODE_OPTIONS: '' },
    });
    if (child.error) throw new Error(`the embeddings request did not run: ${child.error.message}`);
    let answer;
    try {
        answer = JSON.parse(child.stdout);
    } catch {
        throw new Error(
            `the embeddings request failed: ${(child.stderr || child.stdout || 'no answer').trim().split('\n')[0]}`,
        );
    }
    if (answer.error) throw new Error(answer.error);
    const vectors = answer.vectors.map((v) => Float32Array.from(v));
    if (vectors.length !== texts.length) {
        throw new Error(
            `the provider returned ${vectors.length} vectors for ${texts.length} texts`,
        );
    }
    for (const v of vectors) {
        if (v.length !== setting.dimensions) {
            throw new Error(
                `the provider returned vectors of ${v.length} numbers; the setting says ${setting.dimensions}`,
            );
        }
    }
    return vectors;
}

/**
 * The program the request runs in: reads `{url, model, input, key}` on stdin, posts it, and
 * prints `{vectors}` or `{error}` on stdout. Always exits 0; the caller reads the answer.
 *
 * @returns {void}
 */
function runRequest() {
    const done = (answer) => {
        process.stdout.write(JSON.stringify(answer));
    };
    let request;
    try {
        request = JSON.parse(fs.readFileSync(0, 'utf8'));
    } catch (err) {
        return done({ error: `the request could not be read: ${err.message}` });
    }
    const target = new URL(request.url);
    const transport = target.protocol === 'https:' ? require('https') : require('http');
    const body = JSON.stringify({ model: request.model, input: request.input });
    const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };
    if (request.key) headers.Authorization = `Bearer ${request.key}`;
    const req = transport.request(
        target,
        { method: 'POST', headers, timeout: REQUEST_TIMEOUT_MS },
        (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return done({ error: `the provider answered HTTP ${res.statusCode}` });
                }
                try {
                    const data = JSON.parse(text).data;
                    const ordered = [...data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
                    done({ vectors: ordered.map((d) => d.embedding) });
                } catch {
                    done({ error: 'the provider answered with a body that is not embeddings' });
                }
            });
        },
    );
    req.on('timeout', () => req.destroy(new Error('the provider did not answer in time')));
    req.on('error', (err) => done({ error: `the provider could not be reached: ${err.message}` }));
    req.end(body);
}

// ───────────────────────────────────────────────────────────────────────────
// Indexing and ranking
// ───────────────────────────────────────────────────────────────────────────

/**
 * Embeds the sections that have no vector yet and stores the vectors. Vectors are comparable only
 * when the same provider address, model and size produced them, so a change of any of the three
 * discards every stored vector first and all are embedded again. Each batch is saved, so a
 * failure part-way keeps what was done.
 *
 * @param {object} backend - An open backend with the vector methods.
 * @param {{url: string, model: string, dimensions: number, apiKeyEnv?: string}} setting - A valid setting.
 * @param {(setting: object, texts: string[]) => Float32Array[]} [embedFn] - The request; replaced in tests.
 * @returns {{sent: number, host: string}} Sections sent and where.
 * @throws {Error} When a request fails.
 */
function embedPending(backend, setting, embedFn = embed) {
    const { model, dimensions, url } = setting;
    if (
        backend.getMeta('model') !== model ||
        backend.getMeta('dim') !== String(dimensions) ||
        backend.getMeta('url') !== url
    ) {
        backend.clearVectors();
        backend.setMeta('model', model);
        backend.setMeta('dim', dimensions);
        backend.setMeta('url', url);
    }
    backend.setMeta('provider', hostOf(setting));
    let sent = 0;
    for (;;) {
        const rows = backend.pendingVectors(model, dimensions, BATCH_SIZE);
        if (rows.length === 0) break;
        const texts = rows.map((r) => `${r.heading}\n\n${r.body}`.slice(0, MAX_TEXT_CHARS));
        const vectors = embedFn(setting, texts);
        backend.putVectors(
            model,
            dimensions,
            rows.map((r, i) => ({ id: r.id, vector: vectors[i] })),
        );
        backend.save();
        sent += rows.length;
    }
    backend.save();
    return { sent, host: hostOf(setting) };
}

/**
 * Cosine similarity of two vectors of the same size; 0 when either has no length.
 *
 * @param {Float32Array} a - First vector.
 * @param {Float32Array} b - Second vector.
 * @returns {number} A number from -1 to 1.
 */
function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/**
 * Ranks the stored vectors against a query vector, best first, ties by section id.
 *
 * @param {Float32Array} query - The query's vector.
 * @param {Map<number, Float32Array>} vectors - Section id -> vector.
 * @param {(id: number) => boolean} keep - Whether a section passes the query's filters.
 * @param {number} depth - Most sections to return.
 * @returns {{id: number, similarity: number}[]}
 */
function rankByVector(query, vectors, keep, depth) {
    const ranked = [];
    for (const [id, vector] of vectors) {
        if (keep(id)) ranked.push({ id, similarity: cosine(query, vector) });
    }
    ranked.sort((a, b) => b.similarity - a.similarity || a.id - b.id);
    return ranked.slice(0, depth);
}

/**
 * Combines rankings by Reciprocal Rank Fusion: a section's score is the sum, over the
 * rankings that hold it, of 1 / (k + rank), the first rank being 1. Ties go to the section
 * that came first in the earliest ranking.
 *
 * @param {number[][]} rankings - Lists of section ids, best first, one list per ranking.
 * @returns {{id: number, score: number}[]} Fused, best first.
 */
function fuse(rankings) {
    const scores = new Map();
    const firstSeen = new Map();
    for (const ranking of rankings) {
        ranking.forEach((id, i) => {
            scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + i + 1));
            if (!firstSeen.has(id)) firstSeen.set(id, firstSeen.size);
        });
    }
    return [...scores]
        .map(([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score || firstSeen.get(a.id) - firstSeen.get(b.id));
}

module.exports = {
    BATCH_SIZE,
    RRF_K,
    readSetting,
    hostOf,
    credentialProblem,
    embed,
    embedPending,
    cosine,
    rankByVector,
    fuse,
};

if (require.main === module) {
    runRequest();
}
