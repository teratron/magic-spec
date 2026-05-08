#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { normalizePath, resolveDesignRoot } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN BENCHMARK — SDD Graph vs Raw Corpus
// ═══════════════════════════════════════════════════════════════════════════
//
// Measures token cost of answering architecture questions via three strategies:
//   1. RAW CORPUS   — load all source files relevant to a query
//   2. SPEC LAYER   — load only .design/ specification files
//   3. GRAPH QUERY  — BFS traversal from a seed node (depth-limited)
//
// Provides quantitative evidence of SDD's context efficiency.
//
// Token approximation: ceil(char_count / 4)  (industry-standard heuristic).
//
// Usage:
//   node dev/scripts/executor.js benchmark [options]
//
// Options:
//   --depth <n>    BFS depth for graph queries (default: 2)
//   --top <n>      Top-N god nodes to use as query seeds (default: 5)
//   --json         Output raw JSON instead of human-readable report

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

/** @param {string} flag @param {number} def @returns {number} */
function numArg(flag, def) {
    const idx = args.indexOf(flag);
    if (idx === -1) return def;
    const v = parseInt(args[idx + 1], 10);
    return Number.isFinite(v) && v > 0 ? v : def;
}

const BFS_DEPTH = numArg('--depth', 2);
const TOP_SEEDS = numArg('--top', 5);
const JSON_OUTPUT = args.includes('--json');

const rootDir = process.cwd();
const { designAbs } = resolveDesignRoot(rootDir);

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN COUNTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Approximates token count for a string.
 * Uses the 4-chars-per-token heuristic common in LLM cost estimation.
 *
 * @param {string} text
 * @returns {number}
 */
function countTokens(text) {
    return Math.ceil(text.length / 4);
}

/**
 * Reads a file and returns its token count. Returns 0 on read error.
 *
 * @param {string} absPath
 * @returns {number}
 */
function fileTokens(absPath) {
    try {
        return countTokens(fs.readFileSync(absPath, 'utf8'));
    } catch (_) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE SCANNING
// ═══════════════════════════════════════════════════════════════════════════

const SKIP_DIRS = new Set([
    'node_modules', '.venv', '__pycache__', '.git',
    'dist', 'build', 'temp', '.hatch', 'env', 'venv',
    'sandbox', '.references',
]);

const SOURCE_EXTENSIONS = new Set(['.js', '.py', '.ts', '.go', '.rs', '.java', '.c', '.cpp', '.h']);
const DOC_EXTENSIONS = new Set(['.md', '.txt', '.rst']);

/**
 * Recursively scans a directory for files matching a set of extensions.
 *
 * @param {string} dir
 * @param {Set<string>} extensions
 * @param {string[]} [result=[]]
 * @returns {string[]}
 */
function scanDir(dir, extensions, result = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_) { return result; }

    for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            scanDir(abs, extensions, result);
        } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
            result.push(abs);
        }
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH LOADER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Builds the graph by running build-spec-graph --json.
 *
 * @returns {{nodes: Map<string, object>, edges: object[], analysis: object, adjacency: Map<string, string[]>}}
 */
function loadGraph() {
    const executorPath = path.join(__dirname, '../../.magic/scripts/executor.js');
    const stdout = execFileSync(process.execPath, [executorPath, 'build-spec-graph', '--json'], {
        cwd: rootDir,
        env: process.env,
        timeout: 30000,
    });

    const raw = JSON.parse(stdout.toString('utf8'));
    const nodes = new Map(raw.nodes.map(n => [n.id, n]));

    const adjacency = new Map();
    for (const n of nodes.keys()) adjacency.set(n, []);
    for (const edge of raw.edges) {
        if (adjacency.has(edge.from)) adjacency.get(edge.from).push(edge.to);
        if (adjacency.has(edge.to)) adjacency.get(edge.to).push(edge.from);
    }

    return { nodes, edges: raw.edges, analysis: raw.analysis || {}, adjacency };
}

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strategy 1 — RAW CORPUS: count tokens across all source + doc files.
 *
 * @returns {{files: number, tokens: number}}
 */
function benchRawCorpus() {
    const allExts = new Set([...SOURCE_EXTENSIONS, ...DOC_EXTENSIONS]);
    const designPrefix = designAbs + path.sep;
    const files = scanDir(rootDir, allExts)
        .filter(f => f !== designAbs && !f.startsWith(designPrefix));
    const tokens = files.reduce((sum, f) => sum + fileTokens(f), 0);
    return { files: files.length, tokens };
}

/**
 * Strategy 2 — SPEC LAYER: count tokens in .design/ specifications only.
 *
 * @returns {{files: number, tokens: number}}
 */
function benchSpecLayer() {
    const files = scanDir(designAbs, DOC_EXTENSIONS);
    const tokens = files.reduce((sum, f) => sum + fileTokens(f), 0);
    return { files: files.length, tokens };
}

/**
 * Strategy 3 — GRAPH QUERY: BFS from a seed node, serialize only reached nodes.
 * Represents "what an agent needs to load to answer a question about node X".
 *
 * @param {Map<string, object>} nodes
 * @param {Map<string, string[]>} adjacency
 * @param {string} seedId - Starting node id.
 * @param {number} depth - BFS depth limit.
 * @returns {{nodes_visited: number, tokens: number, seed: string}}
 */
function benchGraphQuery(nodes, adjacency, seedId, depth) {
    const visited = new Set([seedId]);
    let frontier = [seedId];

    for (let d = 0; d < depth; d++) {
        const next = [];
        for (const nodeId of frontier) {
            for (const nb of adjacency.get(nodeId) || []) {
                if (!visited.has(nb)) {
                    visited.add(nb);
                    next.push(nb);
                }
            }
        }
        frontier = next;
    }

    // Serialize the subgraph to approximate what an agent would load
    const subgraphNodes = [...visited].map(id => nodes.get(id)).filter(Boolean);
    const serialized = JSON.stringify(subgraphNodes, null, 2);

    return {
        seed: seedId,
        nodes_visited: visited.size,
        tokens: countTokens(serialized),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats a large number with comma separators.
 *
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
    return n.toLocaleString('en-US');
}

/**
 * Prints the human-readable benchmark report.
 *
 * @param {object} report
 */
function printReport(report) {
    const { corpus, specs, queries, graph_summary } = report;

    console.log('');
    console.log('TOKEN BENCHMARK — SDD Graph vs Raw Corpus');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Graph nodes : ${graph_summary.nodes}  edges : ${graph_summary.edges}`);
    console.log('');

    console.log('STRATEGY COMPARISON:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  1. Raw Corpus   : ${fmt(corpus.tokens).padStart(10)} tokens  (${corpus.files} files)`);
    console.log(`  2. Spec Layer   : ${fmt(specs.tokens).padStart(10)} tokens  (${specs.files} files)`);
    console.log('');

    const specRatio = corpus.tokens > 0 ? (corpus.tokens / specs.tokens).toFixed(1) : '—';
    console.log(`  Spec / Corpus reduction : ${specRatio}×  (loading specs vs full codebase)`);
    console.log('');

    console.log(`GRAPH QUERY RESULTS (BFS depth=${BFS_DEPTH}, top ${TOP_SEEDS} god-node seeds):`);
    console.log('───────────────────────────────────────────────────────────────');

    let totalGraphTokens = 0;
    for (const q of queries) {
        const ratio = corpus.tokens > 0 ? (corpus.tokens / q.tokens).toFixed(1) : '—';
        console.log(`  Seed: ${q.seed.slice(0, 55).padEnd(55)}`);
        console.log(`    Nodes visited : ${q.nodes_visited.toString().padStart(4)}  Tokens : ${fmt(q.tokens).padStart(8)}  Ratio vs corpus : ${ratio}×`);
        totalGraphTokens += q.tokens;
    }

    if (queries.length) {
        const avgGraphTokens = Math.round(totalGraphTokens / queries.length);
        const avgRatio = corpus.tokens > 0 ? (corpus.tokens / avgGraphTokens).toFixed(1) : '—';
        console.log('');
        console.log(`  Average graph query : ${fmt(avgGraphTokens)} tokens  (${avgRatio}× vs corpus)`);
    }

    console.log('');
    console.log('INTERPRETATION:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  Corpus  = full context load (naive "read everything" approach)');
    console.log('  Specs   = SDD spec-layer only (structured but still all specs)');
    console.log(`  Graph   = targeted BFS query (depth ${BFS_DEPTH}: only what the agent needs)`);
    console.log('');
    if (queries.length) {
        const avgGraphTokens = Math.round(totalGraphTokens / queries.length);
        const avgRatio = corpus.tokens > 0 ? (corpus.tokens / avgGraphTokens).toFixed(1) : '—';
        console.log(`  Average token cost per architecture question:`);
        console.log(`    Raw corpus : ${fmt(corpus.tokens)} tokens`);
        console.log(`    Spec layer : ${fmt(specs.tokens)} tokens  (${(corpus.tokens / specs.tokens).toFixed(1)}× cheaper)`);
        console.log(`    Graph BFS  : ${fmt(avgGraphTokens)} tokens  (${avgRatio}× cheaper)`);
    }
    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    process.stderr.write('[benchmark] Loading graph...\n');
    const graph = loadGraph();

    process.stderr.write('[benchmark] Scanning corpus...\n');
    const corpus = benchRawCorpus();
    const specs = benchSpecLayer();

    // Use top god-nodes as query seeds (most representative queries)
    const seeds = [...graph.nodes.values()]
        .filter(n => typeof n.degree === 'number')
        .sort((a, b) => b.degree - a.degree)
        .slice(0, TOP_SEEDS)
        .map(n => n.id);

    process.stderr.write(`[benchmark] Running ${seeds.length} graph queries (BFS depth=${BFS_DEPTH})...\n`);
    const queries = seeds.map(seedId => benchGraphQuery(graph.nodes, graph.adjacency, seedId, BFS_DEPTH));

    const report = {
        graph_summary: { nodes: graph.nodes.size, edges: graph.edges.length },
        corpus,
        specs,
        queries,
        config: { bfs_depth: BFS_DEPTH, top_seeds: TOP_SEEDS },
    };

    if (JSON_OUTPUT) {
        console.log(JSON.stringify(report, null, 2));
    } else {
        printReport(report);
    }
}

main();
