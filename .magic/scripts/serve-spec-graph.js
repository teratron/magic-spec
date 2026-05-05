const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════════════════
// MCP SERVER — SDD Specification Knowledge Graph
// ═══════════════════════════════════════════════════════════════════════════
//
// Exposes the SDD workspace graph as an MCP (Model Context Protocol) server
// over stdio. AI agents can query the graph instead of scanning raw markdown.
//
// Startup: builds the graph by running build-spec-graph --json, then enters
// the JSON-RPC 2.0 request loop on stdin/stdout.
//
// Usage:
//   node .magic/scripts/executor.js serve-spec-graph
//
// MCP Tools:
//   query_graph    — search nodes by label substring or type filter
//   get_node       — full details for a node by id
//   get_neighbors  — adjacent nodes with their relation types
//   find_gaps      — orphaned files, missing Implements, convention orphans
//   shortest_path  — BFS shortest path between two node ids
//   get_coverage   — per-workspace coverage statistics
//   god_nodes      — top-N nodes by degree (architectural hotspots)

// ═══════════════════════════════════════════════════════════════════════════
// SERVER METADATA
// ═══════════════════════════════════════════════════════════════════════════

const SERVER_INFO = {
    name: 'sdd-graph',
    version: (() => {
        try { return fs.readFileSync(path.join(__dirname, '../.version'), 'utf8').trim(); }
        catch (_) { return '0.0.0'; }
    })(),
};
const PROTOCOL_VERSION = '2024-11-05';

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs build-spec-graph --json and parses the result into an in-memory graph.
 *
 * @returns {{nodes: Map<string, object>, edges: object[], analysis: object, adjacency: Map<string, Array<{id: string, relation: string}>>}}
 */
function loadGraph() {
    const executorPath = path.join(__dirname, 'executor.js');
    let raw;

    try {
        const stdout = execFileSync(process.execPath, [executorPath, 'build-spec-graph', '--json'], {
            cwd: process.cwd(),
            env: process.env,
            timeout: 30000,
        });
        raw = JSON.parse(stdout.toString('utf8'));
    } catch (err) {
        process.stderr.write(`[sdd-graph] Failed to build graph: ${err.message}\n`);
        process.exit(1);
    }

    const nodes = new Map(raw.nodes.map(n => [n.id, n]));
    const edges = raw.edges;

    // Build adjacency list: id → [{id, relation}]
    const adjacency = new Map();
    for (const n of nodes.keys()) adjacency.set(n, []);

    for (const edge of edges) {
        if (adjacency.has(edge.from)) adjacency.get(edge.from).push({ id: edge.to, relation: edge.relation });
        if (adjacency.has(edge.to)) adjacency.get(edge.to).push({ id: edge.from, relation: edge.relation });
    }

    return { nodes, edges, analysis: raw.analysis || {}, adjacency };
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH QUERY TOOLS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Searches nodes by label substring and optional type filter.
 *
 * @param {Map<string, object>} nodes
 * @param {string} query - Case-insensitive substring to match against label or id.
 * @param {string|null} type - Node type filter (workspace/spec/file/convention/phase) or null.
 * @param {number} limit - Max results to return.
 * @returns {object[]}
 */
function queryGraph(nodes, query, type, limit) {
    const q = (query || '').toLowerCase();
    const results = [];
    for (const node of nodes.values()) {
        if (type && node.type !== type) continue;
        if (q && !node.label.toLowerCase().includes(q) && !node.id.toLowerCase().includes(q)) continue;
        results.push(node);
        if (results.length >= limit) break;
    }
    return results;
}

/**
 * Returns neighbors of a node with their relation types.
 *
 * @param {Map<string, object>} nodes
 * @param {Map<string, Array<{id: string, relation: string}>>} adjacency
 * @param {string} nodeId
 * @returns {{node: object, neighbors: Array<{id: string, label: string, type: string, relation: string}>}|null}
 */
function getNeighbors(nodes, adjacency, nodeId) {
    if (!nodes.has(nodeId)) return null;
    const neighbors = (adjacency.get(nodeId) || []).map(({ id, relation }) => {
        const n = nodes.get(id);
        return { id, label: n ? n.label : id, type: n ? n.type : 'unknown', relation };
    });
    return { node: nodes.get(nodeId), neighbors };
}

/**
 * BFS shortest path between two node ids.
 *
 * @param {Map<string, Array<{id: string, relation: string}>>} adjacency
 * @param {string} fromId
 * @param {string} toId
 * @returns {string[]|null} Array of node ids from source to target, or null if unreachable.
 */
function shortestPath(adjacency, fromId, toId) {
    if (fromId === toId) return [fromId];
    if (!adjacency.has(fromId) || !adjacency.has(toId)) return null;

    const visited = new Set([fromId]);
    const queue = [[fromId]];

    while (queue.length) {
        const path = queue.shift();
        const current = path[path.length - 1];

        for (const { id: nb } of adjacency.get(current) || []) {
            if (visited.has(nb)) continue;
            const newPath = [...path, nb];
            if (nb === toId) return newPath;
            visited.add(nb);
            queue.push(newPath);
        }
    }
    return null;
}

/**
 * Returns top-N nodes by degree.
 *
 * @param {Map<string, object>} nodes
 * @param {number} topN
 * @returns {object[]}
 */
function godNodes(nodes, topN) {
    return [...nodes.values()]
        .filter(n => typeof n.degree === 'number')
        .sort((a, b) => b.degree - a.degree)
        .slice(0, topN);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const TOOLS = [
    {
        name: 'query_graph',
        description: 'Search the SDD graph nodes by label substring and optional type filter. Returns matching nodes with their metadata. Output is truncated at `token_budget` (approx chars = tokens × 4).',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Case-insensitive substring to match against node label or id. Empty string returns all.' },
                type: { type: 'string', enum: ['workspace', 'spec', 'file', 'convention', 'phase'], description: 'Filter by node type (optional).' },
                limit: { type: 'number', description: 'Max results to return (default: 20).', default: 20 },
                token_budget: { type: 'number', description: 'Approximate token budget for serialized output (default: 2000). Uses chars = tokens × 4 heuristic; output truncated with explicit sentinel.', default: 2000 },
            },
        },
    },
    {
        name: 'get_node',
        description: 'Returns full details for a specific node by its id (e.g. "spec:engine/l1-engine-core", "ws:engine", "conv:C1").',
        inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string', description: 'Exact node id.' },
            },
        },
    },
    {
        name: 'get_neighbors',
        description: 'Returns all nodes adjacent to a given node, with their edge relation types (contains, covers, implements, enforces, scopes, plans).',
        inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string', description: 'Exact node id.' },
            },
        },
    },
    {
        name: 'find_gaps',
        description: 'Returns the current gap analysis: orphaned files (scoped but not covered by any spec), L2 specs missing an Implements link, and convention orphans (conventions not referenced in any spec).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'shortest_path',
        description: 'Finds the shortest path between two nodes in the SDD graph (BFS). Useful for tracing spec-to-code or task-to-spec relationships.',
        inputSchema: {
            type: 'object',
            required: ['from', 'to'],
            properties: {
                from: { type: 'string', description: 'Source node id.' },
                to: { type: 'string', description: 'Target node id.' },
            },
        },
    },
    {
        name: 'get_coverage',
        description: 'Returns per-workspace coverage statistics: number of specs, files covered, total scope, and coverage percentage.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'god_nodes',
        description: 'Returns the top-N nodes by degree (most connected). These are architectural hotspots that should have prioritized spec coverage.',
        inputSchema: {
            type: 'object',
            properties: {
                top_n: { type: 'number', description: 'Number of top nodes to return (default: 10).', default: 10 },
            },
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dispatches a tool call and returns a result content array.
 *
 * @param {string} name - Tool name.
 * @param {object} args - Tool arguments.
 * @param {{nodes: Map, edges: object[], analysis: object, adjacency: Map}} graph
 * @returns {{content: Array<{type: string, text: string}>, isError?: boolean}}
 */
function dispatchTool(name, args, graph) {
    const { nodes, edges, analysis, adjacency } = graph;

    try {
        switch (name) {
            case 'query_graph': {
                const results = queryGraph(nodes, args.query || '', args.type || null, args.limit || 20);
                const budget = Number.isFinite(args.token_budget) && args.token_budget > 0
                    ? Math.floor(args.token_budget)
                    : 2000;
                const charBudget = budget * 4;
                let text = JSON.stringify(results, null, 2);
                if (text.length > charBudget) {
                    text = text.slice(0, charBudget) + `\n... (truncated to ~${budget} tokens; tighten \`query\`, lower \`limit\`, or raise \`token_budget\`)`;
                }
                return { content: [{ type: 'text', text }] };
            }

            case 'get_node': {
                const node = nodes.get(args.id);
                if (!node) return { content: [{ type: 'text', text: `Node not found: ${args.id}` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(node, null, 2) }] };
            }

            case 'get_neighbors': {
                const result = getNeighbors(nodes, adjacency, args.id);
                if (!result) return { content: [{ type: 'text', text: `Node not found: ${args.id}` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'find_gaps': {
                const gaps = {
                    orphaned_files: analysis.orphaned_files || [],
                    missing_implements: analysis.missing_implements || [],
                    orphaned_conventions: (analysis.convention_coverage && analysis.convention_coverage.orphaned) || [],
                    bridge_specs: analysis.bridge_specs || [],
                };
                return { content: [{ type: 'text', text: JSON.stringify(gaps, null, 2) }] };
            }

            case 'shortest_path': {
                const pathResult = shortestPath(adjacency, args.from, args.to);
                if (!pathResult) {
                    return { content: [{ type: 'text', text: `No path found between ${args.from} and ${args.to}` }] };
                }
                const steps = pathResult.map(id => {
                    const n = nodes.get(id);
                    return { id, label: n ? n.label : id, type: n ? n.type : 'unknown' };
                });
                return { content: [{ type: 'text', text: JSON.stringify({ length: pathResult.length - 1, path: steps }, null, 2) }] };
            }

            case 'get_coverage': {
                return { content: [{ type: 'text', text: JSON.stringify(analysis.coverage_stats || {}, null, 2) }] };
            }

            case 'god_nodes': {
                const top = godNodes(nodes, args.top_n || 10);
                return { content: [{ type: 'text', text: JSON.stringify(top, null, 2) }] };
            }

            default:
                return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
        }
    } catch (err) {
        return { content: [{ type: 'text', text: `Tool error: ${err.message}` }], isError: true };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 STDIO LOOP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends a JSON-RPC response to stdout.
 *
 * @param {number|string|null} id - Request id.
 * @param {unknown} result - Result payload.
 */
function respond(id, result) {
    const msg = JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n';
    process.stdout.write(msg);
}

/**
 * Sends a JSON-RPC error response to stdout.
 *
 * @param {number|string|null} id - Request id.
 * @param {number} code - Error code.
 * @param {string} message - Error message.
 */
function respondError(id, code, message) {
    const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n';
    process.stdout.write(msg);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    process.stderr.write('[sdd-graph] Building graph...\n');
    const graph = loadGraph();
    process.stderr.write(`[sdd-graph] Ready — ${graph.nodes.size} nodes, ${graph.edges.length} edges\n`);

    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

    rl.on('line', (line) => {
        line = line.trim();
        if (!line) return;

        let req;
        try { req = JSON.parse(line); }
        catch (_) { respondError(null, -32700, 'Parse error'); return; }

        const { id, method, params } = req;

        if (method === 'initialize') {
            respond(id, {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: { tools: {} },
                serverInfo: SERVER_INFO,
            });
            return;
        }

        if (method === 'notifications/initialized') return;

        if (method === 'tools/list') {
            respond(id, { tools: TOOLS });
            return;
        }

        if (method === 'tools/call') {
            const toolName = params && params.name;
            const toolArgs = (params && params.arguments) || {};

            if (!toolName) { respondError(id, -32602, 'Missing tool name'); return; }

            const result = dispatchTool(toolName, toolArgs, graph);
            respond(id, result);
            return;
        }

        if (method === 'ping') {
            respond(id, {});
            return;
        }

        respondError(id, -32601, `Method not found: ${method}`);
    });

    rl.on('close', () => process.exit(0));

    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
}

main();
