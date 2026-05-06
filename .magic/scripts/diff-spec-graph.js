#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH DIFF — Retrospective Structural Change Analysis
// ═══════════════════════════════════════════════════════════════════════════
//
// Compares two SDD graph snapshots (produced by build-spec-graph --json) and
// surfaces structural changes: new/removed nodes and edges, coverage shifts,
// god node evolution, orphan and convention drift between iterations.
//
// Usage:
//   node .magic/scripts/executor.js diff-spec-graph <before.json> <after.json>
//
// Typical workflow:
//   # Save snapshot before a sprint
//   node .magic/scripts/executor.js build-spec-graph --json > .design/graph-before.json
//
//   # ... implement tasks ...
//
//   # Save snapshot after the sprint
//   node .magic/scripts/executor.js build-spec-graph --json > .design/graph-after.json
//
//   # Compare
//   node .magic/scripts/executor.js diff-spec-graph .design/graph-before.json .design/graph-after.json

// ═══════════════════════════════════════════════════════════════════════════
// INPUT PARSING
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const JSON_OUTPUT = process.argv.includes('--json');

const [beforePath, afterPath] = args;

if (!beforePath || !afterPath) {
    console.error('Usage: diff-spec-graph <before.json> <after.json> [--json]');
    process.exit(1);
}

/**
 * Loads and validates a graph snapshot JSON file.
 *
 * @param {string} filePath - Path to the snapshot JSON.
 * @returns {{nodes: object[], edges: object[], analysis: object}}
 */
function loadSnapshot(filePath) {
    const abs = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(abs)) {
        console.error(`Error: file not found — ${filePath}`);
        process.exit(1);
    }
    try {
        const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
        if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
            throw new Error('missing nodes or edges array');
        }
        return raw;
    } catch (err) {
        console.error(`Error: cannot parse ${filePath} — ${err.message}`);
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// NODE DIFF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{id: string, label: string, type: string, degree?: number, status?: string, layer?: number, workspace?: string}} GraphNode
 */

/**
 * Computes node-level changes between two snapshots.
 *
 * @param {GraphNode[]} before - Nodes from the before snapshot.
 * @param {GraphNode[]} after  - Nodes from the after snapshot.
 * @returns {{added: GraphNode[], removed: GraphNode[], changed: Array<{id: string, before: object, after: object, delta: object}>}}
 */
function diffNodes(before, after) {
    const beforeMap = new Map(before.map(n => [n.id, n]));
    const afterMap = new Map(after.map(n => [n.id, n]));

    const added = after.filter(n => !beforeMap.has(n.id));
    const removed = before.filter(n => !afterMap.has(n.id));

    const changed = [];
    for (const [id, bNode] of beforeMap) {
        const aNode = afterMap.get(id);
        if (!aNode) continue;

        const delta = {};
        const TRACKED = ['status', 'layer', 'degree', 'version'];
        for (const field of TRACKED) {
            if (bNode[field] !== aNode[field]) {
                delta[field] = { from: bNode[field], to: aNode[field] };
            }
        }

        if (Object.keys(delta).length) {
            changed.push({ id, before: bNode, after: aNode, delta });
        }
    }

    return { added, removed, changed };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE DIFF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{from: string, to: string, relation: string}} GraphEdge
 */

/**
 * Creates a canonical string key for an edge (order-independent for undirected).
 *
 * @param {GraphEdge} edge
 * @returns {string}
 */
function edgeKey(edge) {
    return `${edge.relation}|${edge.from}|${edge.to}`;
}

/**
 * Computes edge-level changes between two snapshots.
 *
 * @param {GraphEdge[]} before
 * @param {GraphEdge[]} after
 * @returns {{added: GraphEdge[], removed: GraphEdge[]}}
 */
function diffEdges(before, after) {
    const beforeSet = new Set(before.map(edgeKey));
    const afterSet = new Set(after.map(edgeKey));

    return {
        added: after.filter(e => !beforeSet.has(edgeKey(e))),
        removed: before.filter(e => !afterSet.has(edgeKey(e))),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS DIFF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes degree rankings for nodes and returns top N by degree.
 *
 * @param {GraphNode[]} nodes
 * @param {number} [topN=5]
 * @returns {Array<{id: string, label: string, type: string, degree: number}>}
 */
function topByDegree(nodes, topN = 5) {
    return [...nodes]
        .filter(n => typeof n.degree === 'number')
        .sort((a, b) => b.degree - a.degree)
        .slice(0, topN)
        .map(n => ({ id: n.id, label: n.label, type: n.type, degree: n.degree }));
}

/**
 * Compares coverage stats between two analysis objects.
 *
 * @param {object} beforeAnalysis
 * @param {object} afterAnalysis
 * @returns {object} Coverage delta per workspace.
 */
function diffCoverage(beforeAnalysis, afterAnalysis) {
    const bStats = (beforeAnalysis && beforeAnalysis.coverage_stats) || {};
    const aStats = (afterAnalysis && afterAnalysis.coverage_stats) || {};
    const allWs = new Set([...Object.keys(bStats), ...Object.keys(aStats)]);
    const result = {};

    for (const ws of allWs) {
        const b = bStats[ws] || { specs: 0, files_covered: 0, total_scope: 0, coverage_pct: 0 };
        const a = aStats[ws] || { specs: 0, files_covered: 0, total_scope: 0, coverage_pct: 0 };

        result[ws] = {
            specs_delta: a.specs - b.specs,
            covered_delta: a.files_covered - b.files_covered,
            scope_delta: a.total_scope - b.total_scope,
            coverage_pct_delta: Math.round((a.coverage_pct - b.coverage_pct) * 10) / 10,
            before: b,
            after: a,
        };
    }

    return result;
}

/**
 * Computes the set difference of two string arrays.
 *
 * @param {string[]} before
 * @param {string[]} after
 * @returns {{gained: string[], lost: string[]}}
 */
function setDiff(before, after) {
    const bSet = new Set(before);
    const aSet = new Set(after);
    return {
        gained: after.filter(x => !bSet.has(x)),
        lost: before.filter(x => !aSet.has(x)),
    };
}

/**
 * Computes top-level analysis changes: orphans, missing-implements, conventions.
 *
 * @param {object} ba - Before analysis object.
 * @param {object} aa - After analysis object.
 * @returns {object}
 */
function diffAnalysis(ba, aa) {
    ba = ba || {};
    aa = aa || {};

    const orphanDiff = setDiff(
        (ba.orphaned_files || []),
        (aa.orphaned_files || []),
    );

    const missingImplDiff = setDiff(
        (ba.missing_implements || []).map(m => m.id || m),
        (aa.missing_implements || []).map(m => m.id || m),
    );

    const bConvOrphan = (ba.convention_coverage && ba.convention_coverage.orphaned) || [];
    const aConvOrphan = (aa.convention_coverage && aa.convention_coverage.orphaned) || [];
    const convDiff = setDiff(bConvOrphan, aConvOrphan);

    return { orphanDiff, missingImplDiff, convDiff };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT — HUMAN-READABLE REPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formats a numeric delta with a +/- prefix and optional suffix.
 *
 * @param {number} n
 * @param {string} [suffix='']
 * @returns {string}
 */
function fmtDelta(n, suffix = '') {
    if (n === 0) return `±0${suffix}`;
    return n > 0 ? `+${n}${suffix}` : `${n}${suffix}`;
}

/**
 * Prints a human-readable graph diff report to stdout.
 *
 * @param {object} diff - Full diff result object.
 */
function printReport(diff) {
    const { summary, nodes, edges, godNodes, coverage, analysis } = diff;

    console.log('');
    console.log('GRAPH DIFF — Retrospective Structural Change');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Before : ${summary.before_nodes} nodes, ${summary.before_edges} edges`);
    console.log(`After  : ${summary.after_nodes} nodes, ${summary.after_edges} edges`);
    console.log(`Delta  : nodes ${fmtDelta(summary.node_delta)}, edges ${fmtDelta(summary.edge_delta)}`);
    console.log('');

    // Node changes
    console.log('NODE CHANGES:');
    console.log('───────────────────────────────────────────────────────────────');

    if (nodes.added.length) {
        console.log(`  Added (${nodes.added.length}):`);
        for (const n of nodes.added) {
            console.log(`    + [${n.type}] ${n.label}`);
        }
    } else {
        console.log('  Added : none');
    }

    if (nodes.removed.length) {
        console.log(`  Removed (${nodes.removed.length}):`);
        for (const n of nodes.removed) {
            console.log(`    - [${n.type}] ${n.label}`);
        }
    } else {
        console.log('  Removed : none');
    }

    if (nodes.changed.length) {
        console.log(`  Changed (${nodes.changed.length}):`);
        for (const c of nodes.changed) {
            const parts = Object.entries(c.delta).map(([k, v]) => `${k}: ${v.from} → ${v.to}`);
            console.log(`    ~ ${c.id} (${parts.join(', ')})`);
        }
    }
    console.log('');

    // Edge changes
    console.log('EDGE CHANGES:');
    console.log('───────────────────────────────────────────────────────────────');
    if (edges.added.length) {
        console.log(`  Added (${edges.added.length}):`);
        for (const e of edges.added.slice(0, 10)) {
            console.log(`    + ${e.from} --[${e.relation}]--> ${e.to}`);
        }
        if (edges.added.length > 10) console.log(`    ... and ${edges.added.length - 10} more`);
    } else {
        console.log('  Added : none');
    }
    if (edges.removed.length) {
        console.log(`  Removed (${edges.removed.length}):`);
        for (const e of edges.removed.slice(0, 10)) {
            console.log(`    - ${e.from} --[${e.relation}]--> ${e.to}`);
        }
        if (edges.removed.length > 10) console.log(`    ... and ${edges.removed.length - 10} more`);
    } else {
        console.log('  Removed : none');
    }
    console.log('');

    // God node evolution
    console.log('GOD NODE EVOLUTION (top 5 by degree):');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('  Before:');
    for (const n of godNodes.before) {
        console.log(`    ${n.label} [${n.type}] degree=${n.degree}`);
    }
    console.log('  After:');
    for (const n of godNodes.after) {
        const bNode = diff.beforeNodesMap.get(n.id);
        const degDelta = bNode && typeof bNode.degree === 'number'
            ? ` (${fmtDelta(n.degree - bNode.degree)})`
            : ' (new)';
        console.log(`    ${n.label} [${n.type}] degree=${n.degree}${degDelta}`);
    }
    console.log('');

    // Coverage changes
    console.log('COVERAGE CHANGES (per workspace):');
    console.log('───────────────────────────────────────────────────────────────');
    for (const [ws, delta] of Object.entries(coverage)) {
        const pct = delta.coverage_pct_delta;
        const trend = pct > 0 ? '↑' : pct < 0 ? '↓' : '=';
        console.log(`  ${ws}: ${trend} ${fmtDelta(delta.coverage_pct_delta, '%')} coverage`);
        console.log(`    specs ${fmtDelta(delta.specs_delta)}, files covered ${fmtDelta(delta.covered_delta)}`);
        console.log(`    ${delta.before.coverage_pct}% → ${delta.after.coverage_pct}%`);
    }
    console.log('');

    // Orphan, missing-implements, convention drift
    console.log('DRIFT ANALYSIS:');
    console.log('───────────────────────────────────────────────────────────────');

    const { orphanDiff, missingImplDiff, convDiff } = analysis;

    const printDiff = (label, d) => {
        if (!d.gained.length && !d.lost.length) {
            console.log(`  ${label}: no change`);
            return;
        }
        if (d.lost.length) d.lost.forEach(x => console.log(`    ✓ resolved: ${x}`));
        if (d.gained.length) d.gained.forEach(x => console.log(`    ✗ new:      ${x}`));
    };

    console.log('  Orphaned files:');
    printDiff('', orphanDiff);
    console.log('  Missing Implements:');
    printDiff('', missingImplDiff);
    console.log('  Convention orphans:');
    printDiff('', convDiff);
    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    const before = loadSnapshot(beforePath);
    const after = loadSnapshot(afterPath);

    const nodeDiff = diffNodes(before.nodes, after.nodes);
    const edgeDiff = diffEdges(before.edges, after.edges);
    const coverage = diffCoverage(before.analysis, after.analysis);
    const analysis = diffAnalysis(before.analysis, after.analysis);

    const beforeNodesMap = new Map(before.nodes.map(n => [n.id, n]));

    const diff = {
        summary: {
            before_nodes: before.nodes.length,
            after_nodes: after.nodes.length,
            before_edges: before.edges.length,
            after_edges: after.edges.length,
            node_delta: after.nodes.length - before.nodes.length,
            edge_delta: after.edges.length - before.edges.length,
        },
        nodes: nodeDiff,
        edges: edgeDiff,
        godNodes: {
            before: topByDegree(before.nodes),
            after: topByDegree(after.nodes),
        },
        coverage,
        analysis,
        beforeNodesMap,
    };

    if (JSON_OUTPUT) {
        const { beforeNodesMap: _, ...clean } = diff;
        clean.godNodes.before = [...clean.godNodes.before];
        clean.godNodes.after = [...clean.godNodes.after];
        console.log(JSON.stringify(clean, null, 2));
    } else {
        printReport(diff);
    }
}

main();
