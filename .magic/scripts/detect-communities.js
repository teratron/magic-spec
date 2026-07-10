#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePath, resolveDesignRoot, loadGitignore, BUILD_NOISE_DIRS } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY DETECTION — Workspace Discovery via Label Propagation
// ═══════════════════════════════════════════════════════════════════════════
//
// Builds a code dependency graph from JS require(), Python imports, and
// Markdown cross-references, then runs Label Propagation to detect natural
// module clusters. Compares clusters against workspace.json to flag boundary
// drift and suggest workspace splits for oversized communities.
//
// Pipeline: scan → extract_deps → build_graph → propagate → analyze → report
//
// Usage:
//   node .magic/scripts/executor.js detect-communities [options]
//
// Options:
//   --threshold <pct>   Oversized community threshold, % of graph (default: 25)
//   --max-iter <n>      Max label propagation iterations (default: 50)
//   --min-nodes <n>     Min nodes to report a community (default: 2)
//   --json              Output raw JSON instead of human-readable summary
//   --include-md        Include markdown cross-reference edges (default: false)

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

/** @param {string} flag @param {number} def @returns {number} */
function numArg(flag, def) {
    const idx = args.indexOf(flag);
    if (idx === -1) return def;
    const v = parseFloat(args[idx + 1]);
    return Number.isFinite(v) ? v : def;
}

const OVERSIZED_THRESHOLD_PCT = numArg('--threshold', 25);
const MAX_ITERATIONS = numArg('--max-iter', 50);
const MIN_COMMUNITY_NODES = numArg('--min-nodes', 2);
const JSON_OUTPUT = args.includes('--json');
const INCLUDE_MD = args.includes('--include-md');

const rootDir = process.cwd();

const designAbs = resolveDesignRoot(rootDir).designAbs;

// ───────────────────────────────────────────────────────────────────────────
// Skip Patterns
// ───────────────────────────────────────────────────────────────────────────

/**
 * Shared build-noise floor plus this scanner's domain excludes.
 * `.design` and `.magic` are deliberately NOT excluded — spec artifacts and
 * engine sources are the very nodes this graph clusters into communities.
 */
const SKIP_DIRS = new Set([
    ...BUILD_NOISE_DIRS,
    '.references',
]);

const SKIP_PATH_FRAGMENTS = [
    '/.agents/',
];

/**
 * Gitignore predicate over root-relative POSIX paths (Invariant 7 parity).
 * Shared with the other engine scanners — see `utils.loadGitignore`.
 */
const isGitignored = loadGitignore(rootDir);

/**
 * Returns true if a file path should be excluded from graph analysis.
 *
 * @param {string} absPath - Absolute file path.
 * @returns {boolean}
 */
function shouldSkip(absPath) {
    const rel = normalizePath(path.relative(rootDir, absPath));
    const parts = rel.split('/');

    if (parts.some(p => SKIP_DIRS.has(p))) return true;
    if (SKIP_PATH_FRAGMENTS.some(f => rel.includes(f))) return true;
    if (isGitignored(rel)) return true;

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE SCANNER
// ═══════════════════════════════════════════════════════════════════════════

const SCAN_EXTENSIONS = new Set(['.js', '.py', '.md']);

/**
 * Recursively collects all scannable files from a directory.
 *
 * @param {string} dir - Absolute directory path.
 * @param {string[]} [result=[]] - Accumulator.
 * @returns {string[]} Absolute paths of collected files.
 */
function scanDir(dir, result = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_) { return result; }

    for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            if (isGitignored(normalizePath(path.relative(rootDir, abs)))) continue;
            scanDir(abs, result);
        } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
            if (!shouldSkip(abs)) result.push(abs);
        }
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCY EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// JavaScript — require() / import ... from
// ───────────────────────────────────────────────────────────────────────────

const JS_REQUIRE_RE = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
const JS_IMPORT_RE = /(?:^|\n)\s*import\s+(?:[^'"]*\s+from\s+)?['"](\.[^'"]+)['"]/g;

/**
 * Extracts project-relative dependency paths from a JS file.
 *
 * @param {string} absPath - Absolute path to the JS file.
 * @returns {string[]} Normalized relative paths of resolved dependencies.
 */
function extractJsDeps(absPath) {
    let content;
    try { content = fs.readFileSync(absPath, 'utf8'); }
    catch (_) { return []; }

    const dir = path.dirname(absPath);
    const deps = new Set();
    const exts = ['.js', ''];

    for (const re of [JS_REQUIRE_RE, JS_IMPORT_RE]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(content)) !== null) {
            const raw = m[1];
            let resolved = null;
            for (const ext of exts) {
                const candidate = path.resolve(dir, raw + ext);
                if (fs.existsSync(candidate)) { resolved = candidate; break; }
            }
            if (resolved && !shouldSkip(resolved)) {
                deps.add(normalizePath(path.relative(rootDir, resolved)));
            }
        }
    }

    return [...deps];
}

// ───────────────────────────────────────────────────────────────────────────
// Python — import / from ... import
// ───────────────────────────────────────────────────────────────────────────

const PY_STDLIB = new Set([
    'os', 'sys', 're', 'json', 'pathlib', 'typing', 'collections',
    'functools', 'itertools', 'io', 'abc', 'enum', 'dataclasses',
    'subprocess', 'shutil', 'hashlib', 'tempfile', 'time', 'datetime',
    'math', 'random', 'string', 'textwrap', 'copy', 'warnings',
    'logging', 'argparse', 'inspect', 'ast', '__future__',
]);

const PY_IMPORT_RE = /^(?:import|from)\s+([a-zA-Z0-9_.]+)/gm;
const PY_PACKAGE_PREFIXES = [];

/**
 * Extracts project-relative dependency paths from a Python file.
 * Only resolves magic_spec package imports; skips stdlib and third-party.
 *
 * @param {string} absPath - Absolute path to the .py file.
 * @returns {string[]} Normalized relative paths of resolved dependencies.
 */
function extractPyDeps(absPath) {
    let content;
    try { content = fs.readFileSync(absPath, 'utf8'); }
    catch (_) { return []; }

    const deps = new Set();
    if (PY_PACKAGE_PREFIXES.length === 0) return [];
    PY_IMPORT_RE.lastIndex = 0;
    let m;

    while ((m = PY_IMPORT_RE.exec(content)) !== null) {
        const mod = m[1];
        const top = mod.split('.')[0];

        if (PY_STDLIB.has(top)) continue;
        for (const prefix of PY_PACKAGE_PREFIXES) {
            if (!mod.startsWith(prefix)) continue;
            const sub = mod.slice(prefix.length).replace(/^\./, '').replace(/\./g, '/');
            const base = path.join(rootDir, prefix.replace(/\./g, '/'));
            const candidates = [
                path.join(base, sub + '.py'),
                path.join(base, sub, '__init__.py'),
            ];
            for (const c of candidates) {
                if (fs.existsSync(c) && !shouldSkip(c)) {
                    deps.add(normalizePath(path.relative(rootDir, c)));
                    break;
                }
            }
        }
    }

    return [...deps];
}

// ───────────────────────────────────────────────────────────────────────────
// Markdown — cross-references between .design/ spec files
// ───────────────────────────────────────────────────────────────────────────

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+\.md)\)/g;

/**
 * Extracts cross-reference edges from a Markdown file.
 * Only includes links that resolve within the project root.
 *
 * @param {string} absPath - Absolute path to the .md file.
 * @returns {string[]} Normalized relative paths of linked files.
 */
function extractMdDeps(absPath) {
    if (!INCLUDE_MD) return [];

    let content;
    try { content = fs.readFileSync(absPath, 'utf8'); }
    catch (_) { return []; }

    const dir = path.dirname(absPath);
    const deps = new Set();
    MD_LINK_RE.lastIndex = 0;
    let m;

    while ((m = MD_LINK_RE.exec(content)) !== null) {
        const rawLink = m[2].split('#')[0]; // strip anchors
        if (!rawLink) continue;
        const resolved = path.resolve(dir, rawLink);
        if (fs.existsSync(resolved) && !shouldSkip(resolved)) {
            const rel = normalizePath(path.relative(rootDir, resolved));
            if (rel !== normalizePath(path.relative(rootDir, absPath))) {
                deps.add(rel);
            }
        }
    }

    return [...deps];
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH MODEL
// ═══════════════════════════════════════════════════════════════════════════

/** @type {Map<string, Set<string>>} node → adjacent nodes (undirected) */
const adjacency = new Map();

/**
 * Ensures a node exists in the adjacency map.
 *
 * @param {string} id - Node identifier (project-relative path).
 */
function ensureNode(id) {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
}

/**
 * Adds an undirected edge between two nodes.
 *
 * @param {string} a - First node.
 * @param {string} b - Second node.
 */
function addEdge(a, b) {
    if (a === b) return;
    ensureNode(a);
    ensureNode(b);
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL PROPAGATION ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs Label Propagation on the global adjacency graph.
 * Each node adopts the most frequent label among its neighbors each iteration.
 * Isolated nodes (no edges) form singleton communities.
 *
 * @returns {Map<string, string>} node → community label mapping.
 */
function runLabelPropagation() {
    const labels = new Map();
    for (const id of adjacency.keys()) labels.set(id, id);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let changed = false;
        const order = [...adjacency.keys()].sort();

        for (const node of order) {
            const neighbors = [...(adjacency.get(node) || [])];
            if (neighbors.length === 0) continue;

            // Count label frequencies among neighbors
            const freq = new Map();
            for (const nb of neighbors) {
                const lbl = labels.get(nb) || nb;
                freq.set(lbl, (freq.get(lbl) || 0) + 1);
            }

            // Find the most frequent label (tie-break: alphabetical)
            let best = labels.get(node);
            let bestCount = 0;
            for (const [lbl, count] of freq) {
                if (count > bestCount || (count === bestCount && lbl < best)) {
                    best = lbl;
                    bestCount = count;
                }
            }

            if (best !== labels.get(node)) {
                labels.set(node, best);
                changed = true;
            }
        }

        if (!changed) break;
    }

    return labels;
}

/**
 * Groups nodes by their community label into a Map of community → node set.
 *
 * @param {Map<string, string>} labels - node → label mapping.
 * @returns {Map<string, Set<string>>} label → set of nodes.
 */
function groupCommunities(labels) {
    const communities = new Map();
    for (const [node, label] of labels) {
        if (!communities.has(label)) communities.set(label, new Set());
        communities.get(label).add(node);
    }
    return communities;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNITY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes the cohesion score of a community: ratio of internal edges
 * to total edges incident to any node in the community.
 *
 * @param {Set<string>} members - Nodes in the community.
 * @returns {number} Cohesion in [0, 1].
 */
function cohesionScore(members) {
    let internal = 0;
    let external = 0;

    for (const node of members) {
        for (const nb of adjacency.get(node) || []) {
            if (members.has(nb)) internal++;
            else external++;
        }
    }

    // internal counted twice (both directions)
    internal = internal / 2;
    const total = internal + external;
    return total > 0 ? Math.round((internal / total) * 1000) / 1000 : 1.0;
}

/**
 * Computes modularity contribution of each community (Newman-Girvan).
 * Q_c = (internal / total_edges) - (sum_degree / 2*total_edges)^2
 *
 * @param {Map<string, Set<string>>} communities
 * @returns {Map<string, number>} community label → modularity contribution.
 */
function computeModularity(communities) {
    let totalEdges = 0;
    const degrees = new Map();
    for (const [node, neighbors] of adjacency) {
        degrees.set(node, neighbors.size);
        totalEdges += neighbors.size;
    }
    totalEdges /= 2; // undirected

    const mods = new Map();
    for (const [label, members] of communities) {
        let internalEdges = 0;
        let degSum = 0;

        for (const node of members) {
            degSum += degrees.get(node) || 0;
            for (const nb of adjacency.get(node) || []) {
                if (members.has(nb)) internalEdges++;
            }
        }
        internalEdges /= 2;

        const m = totalEdges > 0
            ? (internalEdges / totalEdges) - Math.pow(degSum / (2 * totalEdges), 2)
            : 0;
        mods.set(label, Math.round(m * 10000) / 10000);
    }
    return mods;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKSPACE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loads workspace.json and builds a map of workspace → expanded file set.
 * Expands directory scopes by listing all files within those directories.
 *
 * @returns {{workspaces: Record<string, Set<string>>, raw: object}}
 */
function loadWorkspaces() {
    const wsPath = path.join(designAbs, 'workspace.json');
    if (!fs.existsSync(wsPath)) return { workspaces: {}, raw: {} };

    const raw = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
    const workspaces = raw.workspaces || {};
    const result = {};

    for (const [name, config] of Object.entries(workspaces)) {
        const fileSet = new Set();
        for (const scopeEntry of (config.scope || [])) {
            const abs = path.resolve(rootDir, scopeEntry);
            const rel = normalizePath(path.relative(rootDir, abs));

            if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
                // Expand directory: add all contained files
                const allFiles = scanDir(abs);
                for (const f of allFiles) {
                    fileSet.add(normalizePath(path.relative(rootDir, f)));
                }
            } else {
                fileSet.add(rel);
            }
        }
        result[name] = fileSet;
    }

    return { workspaces: result, raw };
}

/**
 * Computes Jaccard similarity between a community node set and a workspace file set.
 * Only considers nodes that appear in the workspace's expanded file set.
 *
 * @param {Set<string>} community
 * @param {Set<string>} workspace
 * @returns {number} Jaccard in [0, 1].
 */
function jaccardSimilarity(community, workspace) {
    let intersection = 0;
    for (const node of community) {
        if (workspace.has(node)) intersection++;
    }
    const union = community.size + workspace.size - intersection;
    return union > 0 ? Math.round((intersection / union) * 1000) / 1000 : 0;
}

/**
 * For each community, finds the best-matching workspace by Jaccard similarity.
 *
 * @param {Map<string, Set<string>>} communities
 * @param {Record<string, Set<string>>} workspaces
 * @returns {Map<string, {workspace: string, score: number}>}
 */
function alignCommunities(communities, workspaces) {
    const alignments = new Map();

    for (const [label, members] of communities) {
        let bestWs = 'unassigned';
        let bestScore = 0;

        for (const [ws, files] of Object.entries(workspaces)) {
            const score = jaccardSimilarity(members, files);
            if (score > bestScore) {
                bestScore = score;
                bestWs = ws;
            }
        }

        alignments.set(label, { workspace: bestWs, score: bestScore });
    }

    return alignments;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPLIT SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Identifies which sub-clusters exist within an oversized community using
 * BFS partitioning on induced subgraph.
 *
 * @param {Set<string>} members - All nodes in the oversized community.
 * @returns {string[][]} Array of sub-cluster node arrays.
 */
function bfsPartition(members) {
    const visited = new Set();
    const clusters = [];

    for (const start of members) {
        if (visited.has(start)) continue;

        const cluster = [];
        const queue = [start];
        visited.add(start);

        while (queue.length) {
            const node = queue.shift();
            cluster.push(node);
            for (const nb of adjacency.get(node) || []) {
                if (members.has(nb) && !visited.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        clusters.push(cluster);
    }

    return clusters;
}

/**
 * Generates workspace split suggestions for oversized communities.
 *
 * @param {Map<string, Set<string>>} communities
 * @param {number} totalNodes
 * @param {Record<string, Set<string>>} workspaces
 * @returns {Array<{community: string, size: number, sub_clusters: string[][], suggestion: string}>}
 */
function generateSplitSuggestions(communities, totalNodes, workspaces) {
    const threshold = (OVERSIZED_THRESHOLD_PCT / 100) * totalNodes;
    const suggestions = [];

    for (const [label, members] of communities) {
        if (members.size <= threshold) continue;

        const subClusters = bfsPartition(members);
        if (subClusters.length <= 1) continue;

        const topDirs = subClusters.map(cluster => {
            const dirCount = new Map();
            for (const node of cluster) {
                const dir = node.split('/')[0];
                dirCount.set(dir, (dirCount.get(dir) || 0) + 1);
            }
            const sorted = [...dirCount.entries()].sort((a, b) => b[1] - a[1]);
            return sorted[0] ? sorted[0][0] : '(root)';
        });

        suggestions.push({
            community: label,
            size: members.size,
            sub_clusters: subClusters,
            suggested_names: topDirs,
            suggestion: `Split into ${subClusters.length} sub-workspaces: ${topDirs.join(', ')}`,
        });
    }

    return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT — HUMAN-READABLE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prints a human-readable community detection report.
 *
 * @param {object} report - Full analysis result object.
 */
function printSummary(report) {
    const { graph, communities, alignments, modularity, suggestions, workspaceNames } = report;

    console.log('');
    console.log('COMMUNITY DETECTION — Workspace Discovery');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Files scanned  : ${graph.total_files}`);
    console.log(`Graph nodes    : ${graph.nodes}`);
    console.log(`Graph edges    : ${graph.edges}`);
    console.log(`Communities    : ${communities.length}`);
    console.log(`Oversized (>${OVERSIZED_THRESHOLD_PCT}%): ${suggestions.length}`);
    console.log('');

    console.log('COMMUNITIES:');
    console.log('───────────────────────────────────────────────────────────────');
    for (const comm of communities) {
        const align = alignments.get(comm.label);
        const mod = modularity.get(comm.label) || 0;
        const ws = align ? align.workspace : 'unassigned';
        const score = align ? align.score : 0;
        const oversized = comm.size > (OVERSIZED_THRESHOLD_PCT / 100) * graph.nodes ? ' ⚠ OVERSIZED' : '';
        console.log(`  [${comm.label.slice(0, 40).padEnd(40)}]${oversized}`);
        console.log(`    Nodes: ${comm.size}  Cohesion: ${comm.cohesion}  Modularity: ${mod}`);
        console.log(`    Best workspace: ${ws} (Jaccard: ${score})`);
        const top5 = comm.members.slice(0, 5);
        console.log(`    Members (top 5): ${top5.join(', ')}${comm.members.length > 5 ? ' ...' : ''}`);
        console.log('');
    }

    if (suggestions.length) {
        console.log('SPLIT SUGGESTIONS (oversized communities):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const s of suggestions) {
            console.log(`  Community: ${s.community.slice(0, 50)}`);
            console.log(`  Size: ${s.size} nodes (>${OVERSIZED_THRESHOLD_PCT}% of graph)`);
            console.log(`  ${s.suggestion}`);
            for (let i = 0; i < s.sub_clusters.length; i++) {
                const name = s.suggested_names[i] || `sub-${i + 1}`;
                const members = s.sub_clusters[i];
                console.log(`    Sub-workspace "${name}": ${members.length} files`);
                members.slice(0, 3).forEach(f => console.log(`      - ${f}`));
                if (members.length > 3) console.log(`      ... and ${members.length - 3} more`);
            }
            console.log('');
        }
    } else {
        console.log('SPLIT SUGGESTIONS: none (all communities within threshold)');
        console.log('');
    }

    // Workspace boundary alignment
    if (workspaceNames.length) {
        console.log('WORKSPACE BOUNDARY ALIGNMENT:');
        console.log('───────────────────────────────────────────────────────────────');
        for (const ws of workspaceNames) {
            const matching = communities.filter(c => alignments.get(c.label)?.workspace === ws);
            const avgScore = matching.length
                ? Math.round(matching.reduce((s, c) => s + (alignments.get(c.label)?.score || 0), 0) / matching.length * 1000) / 1000
                : 0;
            const drift = avgScore < 0.3 ? ' ⚠ LOW ALIGNMENT' : avgScore >= 0.7 ? ' ✓ WELL ALIGNED' : '';
            console.log(`  ${ws}: ${matching.length} communities matched, avg Jaccard ${avgScore}${drift}`);
        }
        console.log('');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main entry point: orchestrates the full detection pipeline.
 */
function main() {
    // 1. Scan all project files
    const allFiles = scanDir(rootDir);

    // 2. Extract dependencies and build graph
    for (const absPath of allFiles) {
        const rel = normalizePath(path.relative(rootDir, absPath));
        ensureNode(rel);

        const ext = path.extname(absPath);
        let deps = [];

        if (ext === '.js') deps = extractJsDeps(absPath);
        if (ext === '.py') deps = extractPyDeps(absPath);
        if (ext === '.md') deps = extractMdDeps(absPath);

        for (const dep of deps) {
            ensureNode(dep);
            addEdge(rel, dep);
        }
    }

    const totalNodes = adjacency.size;
    const totalEdges = [...adjacency.values()].reduce((s, n) => s + n.size, 0) / 2;

    // 3. Run Label Propagation
    const labels = runLabelPropagation();
    const rawCommunities = groupCommunities(labels);

    // 4. Analyze communities
    const modMap = computeModularity(rawCommunities);

    const communities = [...rawCommunities.entries()]
        .map(([label, members]) => ({
            label,
            size: members.size,
            members: [...members].sort(),
            cohesion: cohesionScore(members),
            modularity: modMap.get(label) || 0,
        }))
        .filter(c => c.size >= MIN_COMMUNITY_NODES)
        .sort((a, b) => b.size - a.size);

    // 5. Load workspaces and align
    const { workspaces, raw: wsRaw } = loadWorkspaces();
    const workspaceNames = Object.keys(workspaces);
    const alignments = alignCommunities(rawCommunities, workspaces);

    // 6. Generate split suggestions
    const suggestions = generateSplitSuggestions(rawCommunities, totalNodes, workspaces);

    const report = {
        graph: { total_files: allFiles.length, nodes: totalNodes, edges: Math.round(totalEdges) },
        communities,
        alignments,
        modularity: modMap,
        suggestions,
        workspaceNames,
    };

    // 7. Output
    if (JSON_OUTPUT) {
        console.log(JSON.stringify({
            graph: report.graph,
            communities: report.communities,
            alignments: Object.fromEntries(report.alignments),
            suggestions: report.suggestions,
        }, null, 2));
    } else {
        printSummary(report);
    }
}

main();
