#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePath, writeFileSafe, resolveDesignRoot } = require('./utils');
const graphCache = require('./graph-cache');

// ═══════════════════════════════════════════════════════════════════════════
// SPECIFICATION KNOWLEDGE GRAPH — BUILD & EXPORT
// ═══════════════════════════════════════════════════════════════════════════
//
// Builds an interactive knowledge graph from .design/ SDD artifacts.
// Pipeline: extract → build → analyze → export (JSON / HTML / summary).
//
// Usage:
//   node .magic/scripts/executor.js build-spec-graph [--json] [--html [path]] [--no-cache]
//
// Environment:
//   MAGIC_DESIGN_DIR — workspace design directory (default: .design)

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const htmlIdx = args.indexOf('--html');
const htmlFlag = htmlIdx !== -1;
const htmlPath = (htmlFlag && args[htmlIdx + 1] && !args[htmlIdx + 1].startsWith('--'))
    ? args[htmlIdx + 1]
    : null;

/** When true, per-file extraction cache is bypassed (see l2-spec-graph-memory §4.1). */
const noCacheFlag = args.includes('--no-cache');

const rootDir = process.cwd();

const { designDir, designAbs } = resolveDesignRoot(rootDir);

/** Per-run cache hit/miss counter — surfaced in summary output on non-JSON runs. */
const cacheStats = { hits: 0, misses: 0 };

/** Default HTML output path relative to project root. */
const DEFAULT_HTML_PATH = path.join(designDir, 'spec-graph.html');

// ───────────────────────────────────────────────────────────────────────────
// Node & Edge Type Definitions
// ───────────────────────────────────────────────────────────────────────────

/** @type {Record<string, {color: string, shape: string}>} */
const NODE_TYPES = {
    workspace: { color: '#4A90D9', shape: 'diamond' },
    spec: { color: '#50C878', shape: 'dot' },
    file: { color: '#A0A0A0', shape: 'square' },
    convention: { color: '#F5A623', shape: 'triangle' },
    phase: { color: '#9B59B6', shape: 'star' },
};

/** @type {string[]} Valid edge relation types. */
const EDGE_RELATIONS = ['contains', 'covers', 'implements', 'enforces', 'scopes', 'plans'];

// ═══════════════════════════════════════════════════════════════════════════
// DATA MODEL
// ═══════════════════════════════════════════════════════════════════════════

/** @type {Map<string, object>} id → node object */
const nodes = new Map();

/** @type {Array<{from: string, to: string, relation: string}>} */
const edges = [];

/**
 * Registers a node in the graph. Deduplicates by id.
 *
 * @param {string} id - Unique node identifier.
 * @param {string} label - Human-readable label.
 * @param {string} type - One of NODE_TYPES keys.
 * @param {object} [extra={}] - Additional properties (workspace, status, layer, version).
 */
function addNode(id, label, type, extra = {}) {
    if (nodes.has(id)) return;
    nodes.set(id, { id, label, type, group: type, ...extra });
}

/**
 * Registers an edge in the graph.
 *
 * @param {string} from - Source node id.
 * @param {string} to - Target node id.
 * @param {string} relation - One of EDGE_RELATIONS.
 */
function addEdge(from, to, relation) {
    edges.push({ from, to, relation });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION — WORKSPACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses .design/workspace.json and creates workspace nodes + scope edges.
 *
 * @returns {Record<string, string[]>} Map of workspace name → scope array.
 */
function extractWorkspaces() {
    const wsPath = path.join(designAbs, 'workspace.json');
    if (!fs.existsSync(wsPath)) return {};

    const raw = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
    const workspaces = raw.workspaces || {};
    const result = {};

    for (const [name, config] of Object.entries(workspaces)) {
        const wsId = `ws:${name}`;
        addNode(wsId, name, 'workspace', { workspace: name });

        const scope = config.scope || [];
        result[name] = scope;

        for (const s of scope) {
            const fileId = `file:${normalizePath(s)}`;
            addNode(fileId, normalizePath(s), 'file', { workspace: name });
            addEdge(wsId, fileId, 'scopes');
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION — SPEC REGISTRY (INDEX.md)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses a workspace INDEX.md and extracts spec table rows.
 * Expected table format: | File | Description | Status | Layer | Version |
 *
 * @param {string} wsName - Workspace name.
 * @returns {Array<{file: string, description: string, status: string, layer: number, version: string}>}
 */
function extractSpecRegistry(wsName) {
    const indexPath = path.join(designAbs, wsName, 'INDEX.md');
    if (!fs.existsSync(indexPath)) return [];

    const content = fs.readFileSync(indexPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const specs = [];

    let inTable = false;
    let headerParsed = false;

    for (const line of lines) {
        // Detect "Domain Specifications" section or any table with File column
        if (/^##\s+Domain Specifications/i.test(line)) {
            inTable = true;
            headerParsed = false;
            continue;
        }

        if (inTable && /^##\s+/.test(line)) break;
        if (!inTable) continue;

        const cells = line.split('|').map(c => c.trim()).filter(c => c);

        // Skip header row
        if (!headerParsed) {
            if (cells.some(c => /^File$/i.test(c))) {
                headerParsed = true;
            }
            continue;
        }

        // Skip separator rows
        if (/^[\s|:-]+$/.test(line)) continue;

        if (cells.length >= 5) {
            // Extract filename from markdown link: [name](path) → name
            const fileMatch = cells[0].match(/\[([^\]]+)\]\([^)]+\)/);
            const fileName = fileMatch ? fileMatch[1] : cells[0].replace(/`/g, '');
            const description = cells[1];
            const status = cells[2];
            const layer = parseInt(cells[3], 10) || 0;
            const version = cells[4];

            const specId = `spec:${wsName}/${fileName.replace(/\.md$/, '')}`;
            addNode(specId, fileName, 'spec', {
                workspace: wsName,
                status,
                layer,
                version,
            });
            addEdge(`ws:${wsName}`, specId, 'contains');

            specs.push({ file: fileName, description, status, layer, version });
        }
    }

    return specs;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION — SPEC DETAILS (Canonical Refs, Implements, Conventions)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reads a spec file once and extracts all graph-relevant fields.
 *
 * @param {string} specPath - Absolute path to the spec .md file.
 * @returns {{refs: string[], parent: string|null, conventions: number[]}}
 */
function parseSpecBody(specPath) {
    let content;
    try { content = fs.readFileSync(specPath, 'utf8'); }
    catch (_) { return { refs: [], parent: null, conventions: [] }; }

    const lines = content.split(/\r?\n/);
    const refs = [];
    let inCanonical = false;
    let pathColIdx = -1;

    for (const line of lines) {
        if (/^##\s+Canonical References/i.test(line)) {
            inCanonical = true;
            pathColIdx = -1;
            continue;
        }
        if (inCanonical && /^##\s+/.test(line)) { inCanonical = false; continue; }
        if (!inCanonical) continue;

        const cells = line.split('|').map(c => c.trim());
        if (pathColIdx === -1) {
            const idx = cells.findIndex(c => /^Path$/i.test(c));
            if (idx !== -1) pathColIdx = idx;
            continue;
        }
        if (/^[\s|:-]+$/.test(line)) continue;
        if (cells.length > pathColIdx) {
            const raw = cells[pathColIdx].replace(/`/g, '').trim();
            if (raw) refs.push(normalizePath(raw));
        }
    }

    const linkMatch = content.match(/\*\*Implements:\*\*\s*\[([^\]]*)\]\(([^)]+)\)/);
    const parent = linkMatch
        ? path.basename(linkMatch[2])
        : (content.match(/\*\*Implements:\*\*\s*`?([a-z0-9][\w-]*\.md)`?/i) || [])[1] || null;

    const found = new Set();
    const re = /\bC(\d+)\b/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        const num = parseInt(m[1], 10);
        if (num >= 1 && num <= 99) found.add(num);
    }

    return { refs, parent, conventions: [...found].sort((a, b) => a - b) };
}

/**
 * Processes all spec files in a workspace's specifications/ directory.
 * Creates file nodes, covers edges, implements edges, and enforces edges.
 *
 * @param {string} wsName - Workspace name.
 * @param {Array<{file: string}>} registrySpecs - Specs from INDEX.md.
 */
function extractSpecDetails(wsName, registrySpecs) {
    const specsDir = path.join(designAbs, wsName, 'specifications');
    if (!fs.existsSync(specsDir)) return;

    const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));

    for (const specFile of specFiles) {
        const specPath = path.join(specsDir, specFile);
        const specId = `spec:${wsName}/${specFile.replace(/\.md$/, '')}`;

        // Ensure spec node exists (may have been created from INDEX.md)
        if (!nodes.has(specId)) {
            addNode(specId, specFile, 'spec', { workspace: wsName });
            addEdge(`ws:${wsName}`, specId, 'contains');
        }

        let parsed = null;
        if (!noCacheFlag) {
            parsed = graphCache.loadCached(specPath, designAbs, rootDir);
            if (parsed) cacheStats.hits += 1;
        }
        if (!parsed) {
            parsed = parseSpecBody(specPath);
            cacheStats.misses += 1;
            if (!noCacheFlag) {
                try { graphCache.saveCached(specPath, parsed, designAbs, rootDir); }
                catch (_) { /* cache write failures must not break a build */ }
            }
        }
        const { refs, parent, conventions } = parsed;

        for (const ref of refs) {
            const fileId = `file:${ref}`;
            addNode(fileId, ref, 'file');
            addEdge(specId, fileId, 'covers');
        }

        if (parent) {
            const parentId = `spec:${wsName}/${parent.replace(/\.md$/, '')}`;
            addEdge(specId, parentId, 'implements');
        }

        for (const num of conventions) {
            addEdge(specId, `conv:C${num}`, 'enforces');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION — CONVENTIONS (RULES.md §7)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses .design/RULES.md and extracts convention headings.
 * Expected format: ### C{N} — Name
 *
 * @returns {Array<{num: number, name: string}>}
 */
function extractConventions() {
    const rulesPath = path.join(designAbs, 'RULES.md');
    if (!fs.existsSync(rulesPath)) return [];

    const content = fs.readFileSync(rulesPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const conventions = [];

    for (const line of lines) {
        const match = line.match(/^###\s+C(\d+)\s*[—–-]\s*(.+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            const name = match[2].trim();
            conventions.push({ num, name });

            const convId = `conv:C${num}`;
            addNode(convId, `C${num} — ${name}`, 'convention', { num });
        }
    }

    return conventions;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION — TASK PHASES (TASKS.md & PLAN.md)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses TASKS.md for a workspace and creates phase nodes.
 * Expected table: | Phase N | [name](tasks/phase-N.md) | Status |
 * Also parses archived phases table if present.
 *
 * @param {string} wsName - Workspace name.
 * @returns {Array<{phaseNum: number, description: string, status: string}>}
 */
function extractPhases(wsName) {
    const tasksPath = path.join(designAbs, wsName, 'TASKS.md');
    if (!fs.existsSync(tasksPath)) return [];

    const content = fs.readFileSync(tasksPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const phases = [];

    for (const line of lines) {
        // Match: | Phase N | or | [Phase N](path) | patterns
        const match = line.match(
            /\|\s*(?:\[)?\s*Phase\s+(\d+)\s*(?:\])?\s*(?:\([^)]*\))?\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/i
        );
        if (!match) continue;

        const phaseNum = parseInt(match[1], 10);
        // Extract description from markdown link if present
        const descRaw = match[2].trim();
        const linkMatch = descRaw.match(/\[([^\]]+)\]\([^)]+\)/);
        const description = linkMatch ? linkMatch[1] : descRaw;
        const status = match[3].replace(/`/g, '').trim();

        const phaseId = `phase:${wsName}/phase-${phaseNum}`;
        addNode(phaseId, `Phase ${phaseNum}: ${description}`, 'phase', {
            workspace: wsName,
            status,
        });
        addEdge(`ws:${wsName}`, phaseId, 'contains');

        phases.push({ phaseNum, description, status });
    }

    return phases;
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes degree (number of connections) for every node.
 *
 * @returns {Map<string, number>} Node id → degree count.
 */
function computeDegrees() {
    /** @type {Map<string, number>} */
    const degrees = new Map();

    for (const id of nodes.keys()) {
        degrees.set(id, 0);
    }

    for (const edge of edges) {
        degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
        degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
    }

    // Write degree back to node objects
    for (const [id, deg] of degrees) {
        const node = nodes.get(id);
        if (node) node.degree = deg;
    }

    return degrees;
}

/**
 * Identifies the top N nodes by degree (god nodes).
 *
 * @param {Map<string, number>} degrees - Node degree map.
 * @param {number} [topN=5] - Number of top nodes to return.
 * @returns {Array<{id: string, label: string, type: string, degree: number}>}
 */
function findGodNodes(degrees, topN = 5) {
    return [...degrees.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id, degree]) => {
            const node = nodes.get(id);
            return {
                id,
                label: node ? node.label : id,
                type: node ? node.type : 'unknown',
                degree,
            };
        });
}

/**
 * Finds files that appear in workspace scope (scopes edges) but are not
 * covered by any spec's Canonical References (covers edges).
 *
 * @returns {string[]} Array of orphaned file ids.
 */
function findOrphanedFiles() {
    const scopedFiles = new Set();
    const coveredFiles = new Set();

    for (const edge of edges) {
        if (edge.relation === 'scopes') scopedFiles.add(edge.to);
        if (edge.relation === 'covers') coveredFiles.add(edge.to);
    }

    return [...scopedFiles].filter(scopedId => {
        const scopedPath = scopedId.replace(/^file:/, '');
        for (const coveredId of coveredFiles) {
            const coveredPath = coveredId.replace(/^file:/, '');
            if (coveredPath === scopedPath || coveredPath.startsWith(scopedPath + '/')) {
                return false;
            }
        }
        return true;
    });
}

/**
 * Finds L2 specs (layer >= 2) that have no explicit Implements edge.
 *
 * @returns {Array<{id: string, label: string, workspace: string}>}
 */
function findMissingImplements() {
    const implementsSources = new Set(
        edges.filter(e => e.relation === 'implements').map(e => e.from)
    );

    const missing = [];
    for (const [id, node] of nodes) {
        if (node.type === 'spec' && node.layer >= 2 && !implementsSources.has(id)) {
            missing.push({ id, label: node.label, workspace: node.workspace || '' });
        }
    }

    return missing;
}

/**
 * Analyzes which conventions are enforced by at least one spec and which are orphaned.
 *
 * @returns {{enforced: string[], orphaned: string[]}}
 */
function analyzeConventionCoverage() {
    const enforcedConvs = new Set(
        edges.filter(e => e.relation === 'enforces').map(e => e.to)
    );

    const enforced = [];
    const orphaned = [];

    for (const [id, node] of nodes) {
        if (node.type === 'convention') {
            if (enforcedConvs.has(id)) {
                enforced.push(id);
            } else {
                orphaned.push(id);
            }
        }
    }

    return { enforced, orphaned };
}

/**
 * Finds specs that reference files across multiple workspaces.
 *
 * @param {Record<string, string[]>} workspaceScopes - Workspace → scope arrays.
 * @returns {Array<{id: string, label: string, workspaces: string[]}>}
 */
function findBridgeSpecs(workspaceScopes) {
    const specCoveredFiles = new Map();

    for (const edge of edges) {
        if (edge.relation === 'covers') {
            if (!specCoveredFiles.has(edge.from)) {
                specCoveredFiles.set(edge.from, []);
            }
            specCoveredFiles.get(edge.from).push(edge.to);
        }
    }

    /**
     * Determines which workspace a file belongs to based on scope prefixes.
     *
     * @param {string} fileId - File node id (e.g., "file:.magic/analyze.md").
     * @returns {string[]} Matching workspace names.
     */
    function fileWorkspaces(fileId) {
        const filePath = fileId.replace(/^file:/, '');
        const matched = [];
        for (const [ws, scope] of Object.entries(workspaceScopes)) {
            for (const prefix of scope) {
                const norm = normalizePath(prefix);
                if (filePath.startsWith(norm + '/') || filePath === norm) {
                    matched.push(ws);
                    break;
                }
            }
        }
        return matched;
    }

    const bridges = [];
    for (const [specId, fileIds] of specCoveredFiles) {
        const wsSet = new Set();
        for (const fid of fileIds) {
            for (const ws of fileWorkspaces(fid)) {
                wsSet.add(ws);
            }
        }
        if (wsSet.size > 1) {
            const node = nodes.get(specId);
            bridges.push({
                id: specId,
                label: node ? node.label : specId,
                workspaces: [...wsSet],
            });
        }
    }

    return bridges;
}

/**
 * Computes per-workspace coverage statistics.
 *
 * @returns {Record<string, {specs: number, files_covered: number, total_scope: number, coverage_pct: number}>}
 */
function computeCoverageStats() {
    const stats = {};

    for (const [id, node] of nodes) {
        if (node.type !== 'workspace') continue;
        const ws = node.label;

        const wsSpecs = edges
            .filter(e => e.from === id && e.relation === 'contains')
            .map(e => e.to)
            .filter(t => { const n = nodes.get(t); return n && n.type === 'spec'; });

        const coveredFiles = new Set();
        for (const specId of wsSpecs) {
            for (const edge of edges) {
                if (edge.from === specId && edge.relation === 'covers') {
                    coveredFiles.add(edge.to);
                }
            }
        }

        const scopeFiles = edges
            .filter(e => e.from === id && e.relation === 'scopes')
            .map(e => e.to);

        const coveredInScope = new Set();
        for (const scopedId of scopeFiles) {
            const scopedPath = scopedId.replace(/^file:/, '');
            for (const coveredId of coveredFiles) {
                const coveredPath = coveredId.replace(/^file:/, '');
                if (coveredPath === scopedPath || coveredPath.startsWith(scopedPath + '/')) {
                    coveredInScope.add(scopedId);
                    break;
                }
            }
        }

        const totalScope = scopeFiles.length;
        const pct = totalScope > 0
            ? Math.round((coveredInScope.size / totalScope) * 1000) / 10
            : 0;

        stats[ws] = {
            specs: wsSpecs.length,
            files_covered: coveredInScope.size,
            total_scope: totalScope,
            coverage_pct: pct,
        };
    }

    return stats;
}

/**
 * Runs the full analysis suite on the constructed graph.
 *
 * @param {Map<string, number>} degrees - Pre-computed degree map.
 * @param {Record<string, string[]>} workspaceScopes - Workspace scope arrays.
 * @returns {object} Complete analysis results.
 */
function runAnalysis(degrees, workspaceScopes) {
    const godNodes = findGodNodes(degrees);
    const orphanedFiles = findOrphanedFiles();
    const missingImplements = findMissingImplements();
    const conventionCoverage = analyzeConventionCoverage();
    const bridgeSpecs = findBridgeSpecs(workspaceScopes);
    const coverageStats = computeCoverageStats();

    // Count by type
    const typeCounts = { workspaces: 0, specs: 0, files: 0, conventions: 0, phases: 0 };
    for (const node of nodes.values()) {
        if (node.type === 'workspace') typeCounts.workspaces++;
        else if (node.type === 'spec') typeCounts.specs++;
        else if (node.type === 'file') typeCounts.files++;
        else if (node.type === 'convention') typeCounts.conventions++;
        else if (node.type === 'phase') typeCounts.phases++;
    }

    return {
        god_nodes: godNodes,
        orphaned_files: orphanedFiles,
        missing_implements: missingImplements,
        convention_coverage: conventionCoverage,
        bridge_specs: bridgeSpecs,
        coverage_stats: coverageStats,
        summary: {
            total_nodes: nodes.size,
            total_edges: edges.length,
            ...typeCounts,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT — JSON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Serializes the graph to the JSON output schema.
 *
 * @param {object} analysis - Analysis results from runAnalysis.
 * @returns {string} Pretty-printed JSON string.
 */
function toJSON(analysis) {
    return JSON.stringify({
        nodes: [...nodes.values()],
        edges,
        analysis,
    }, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT — INTERACTIVE HTML (vis.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a self-contained HTML file with an interactive vis.js graph.
 *
 * @param {object} analysis - Analysis results from runAnalysis.
 * @returns {string} Complete HTML document string.
 */
function toHTML(analysis) {
    const nodeArray = [...nodes.values()];
    const nodesJSON = JSON.stringify(nodeArray);
    const edgesJSON = JSON.stringify(edges);
    const analysisJSON = JSON.stringify(analysis);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Specification Knowledge Graph</title>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
  #graph { width: 100vw; height: 100vh; }

  .panel { position: fixed; background: rgba(22, 22, 42, 0.95); border: 1px solid #333; border-radius: 8px; padding: 14px; font-size: 13px; z-index: 10; }

  #legend { top: 14px; left: 14px; }
  #legend h3 { margin-bottom: 8px; font-size: 14px; color: #aaa; }
  .legend-item { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .legend-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }

  #search-box { top: 14px; right: 320px; }
  #search-box input { background: #222; border: 1px solid #555; color: #e0e0e0; padding: 6px 10px; border-radius: 4px; width: 200px; font-size: 13px; }

  #inspector { top: 14px; right: 14px; width: 290px; max-height: calc(100vh - 28px); overflow-y: auto; }
  #inspector h3 { margin-bottom: 8px; font-size: 14px; color: #ccc; border-bottom: 1px solid #444; padding-bottom: 6px; }
  .prop { margin: 3px 0; }
  .prop-key { color: #888; }
  .prop-val { color: #e0e0e0; }
  .conn-group { margin-top: 10px; }
  .conn-group h4 { color: #aaa; font-size: 12px; margin-bottom: 4px; }
  .conn-group li { margin-left: 12px; font-size: 12px; color: #ccc; list-style: disc; }

  #stats { position: fixed; bottom: 14px; left: 14px; background: rgba(22, 22, 42, 0.95); border: 1px solid #333; border-radius: 8px; padding: 14px; font-size: 12px; max-width: 420px; max-height: 50vh; overflow-y: auto; z-index: 10; }
  #stats h3 { margin-bottom: 6px; font-size: 14px; color: #aaa; }
  .stat-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .stat-label { color: #888; }
  .stat-value { color: #e0e0e0; font-weight: 600; }
  .finding { margin-top: 8px; }
  .finding h4 { color: #F5A623; font-size: 12px; margin-bottom: 3px; }
  .finding li { margin-left: 12px; font-size: 11px; color: #ccc; list-style: disc; }
  .finding .ok { color: #50C878; }
</style>
</head>
<body>
<div id="graph"></div>

<div id="legend" class="panel">
  <h3>Node Types</h3>
  <div class="legend-item"><div class="legend-dot" style="background:#4A90D9"></div> Workspace</div>
  <div class="legend-item"><div class="legend-dot" style="background:#50C878"></div> Specification</div>
  <div class="legend-item"><div class="legend-dot" style="background:#A0A0A0"></div> File</div>
  <div class="legend-item"><div class="legend-dot" style="background:#F5A623"></div> Convention</div>
  <div class="legend-item"><div class="legend-dot" style="background:#9B59B6"></div> Phase</div>
</div>

<div id="search-box" class="panel">
  <input type="text" id="search" placeholder="Search nodes..." />
</div>

<div id="inspector" class="panel">
  <h3>Inspector</h3>
  <div id="inspector-content"><p style="color:#666">Click a node to inspect</p></div>
</div>

<div id="stats" class="panel">
  <h3>Summary</h3>
  <div id="stats-content"></div>
</div>

<script>
(function() {
  var rawNodes = ${nodesJSON};
  var rawEdges = ${edgesJSON};
  var analysis = ${analysisJSON};

  var TYPE_COLORS = {
    workspace: '#4A90D9', spec: '#50C878', file: '#A0A0A0',
    convention: '#F5A623', phase: '#9B59B6'
  };
  var TYPE_SHAPES = {
    workspace: 'diamond', spec: 'dot', file: 'square',
    convention: 'triangle', phase: 'star'
  };

  var maxDeg = 1;
  rawNodes.forEach(function(n) { if ((n.degree || 0) > maxDeg) maxDeg = n.degree; });

  var visNodes = rawNodes.map(function(n) {
    var deg = n.degree || 0;
    var size = 15 + (deg / maxDeg) * 35;
    return {
      id: n.id, label: n.label, group: n.type, title: n.id,
      color: { background: TYPE_COLORS[n.type] || '#888', border: '#444',
               highlight: { background: '#fff', border: TYPE_COLORS[n.type] || '#888' } },
      shape: TYPE_SHAPES[n.type] || 'dot',
      size: size,
      font: { color: '#ccc', size: 11 },
      _raw: n
    };
  });

  var EDGE_STYLES = {
    contains:   { color: '#555', dashes: false, width: 1.5 },
    covers:     { color: '#444', dashes: false, width: 1 },
    implements: { color: '#50C878', dashes: [8, 4], width: 2, arrows: 'to' },
    enforces:   { color: '#F5A623', dashes: [3, 3], width: 1.5 },
    scopes:     { color: '#333', dashes: false, width: 0.5 },
    plans:      { color: '#9B59B6', dashes: [6, 3], width: 1.5, arrows: 'to' }
  };

  var visEdges = rawEdges.map(function(e, i) {
    var s = EDGE_STYLES[e.relation] || { color: '#555', dashes: false, width: 1 };
    return {
      id: i, from: e.from, to: e.to,
      color: { color: s.color, highlight: '#fff' },
      dashes: s.dashes, width: s.width,
      arrows: s.arrows ? { to: { enabled: true, scaleFactor: 0.6 } } : undefined,
      title: e.relation,
      _relation: e.relation
    };
  });

  var container = document.getElementById('graph');
  var data = { nodes: new vis.DataSet(visNodes), edges: new vis.DataSet(visEdges) };
  var options = {
    physics: {
      solver: 'barnesHut',
      barnesHut: { gravitationalConstant: -3000, centralGravity: 0.15, springLength: 120, springConstant: 0.02, damping: 0.15 },
      stabilization: { iterations: 200 }
    },
    interaction: { hover: true, tooltipDelay: 200, navigationButtons: false },
    edges: { smooth: { type: 'continuous' } }
  };
  var network = new vis.Network(container, data, options);

  // Search
  var searchInput = document.getElementById('search');
  searchInput.addEventListener('input', function() {
    var q = this.value.toLowerCase().trim();
    if (!q) {
      data.nodes.forEach(function(n) { data.nodes.update({ id: n.id, opacity: 1, font: { color: '#ccc', size: 11 } }); });
      return;
    }
    data.nodes.forEach(function(n) {
      var match = n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
      data.nodes.update({ id: n.id, opacity: match ? 1 : 0.15, font: { color: match ? '#fff' : '#444', size: match ? 13 : 10 } });
    });
  });

  // Inspector
  network.on('click', function(params) {
    var el = document.getElementById('inspector-content');
    if (!params.nodes.length) { el.innerHTML = '<p style="color:#666">Click a node to inspect</p>'; return; }
    var nodeId = params.nodes[0];
    var node = data.nodes.get(nodeId);
    if (!node || !node._raw) return;
    var r = node._raw;
    var html = '';
    html += '<div class="prop"><span class="prop-key">Type: </span><span class="prop-val">' + (r.type || '-') + '</span></div>';
    html += '<div class="prop"><span class="prop-key">Label: </span><span class="prop-val">' + (r.label || '-') + '</span></div>';
    if (r.workspace) html += '<div class="prop"><span class="prop-key">Workspace: </span><span class="prop-val">' + r.workspace + '</span></div>';
    if (r.status) html += '<div class="prop"><span class="prop-key">Status: </span><span class="prop-val">' + r.status + '</span></div>';
    if (r.layer !== undefined) html += '<div class="prop"><span class="prop-key">Layer: </span><span class="prop-val">' + r.layer + '</span></div>';
    if (r.version) html += '<div class="prop"><span class="prop-key">Version: </span><span class="prop-val">' + r.version + '</span></div>';
    html += '<div class="prop"><span class="prop-key">Degree: </span><span class="prop-val">' + (r.degree || 0) + '</span></div>';

    var connByType = {};
    rawEdges.forEach(function(e) {
      if (e.from === nodeId) {
        if (!connByType[e.relation]) connByType[e.relation] = [];
        connByType[e.relation].push(e.to);
      }
      if (e.to === nodeId) {
        var inv = e.relation + ' (incoming)';
        if (!connByType[inv]) connByType[inv] = [];
        connByType[inv].push(e.from);
      }
    });

    for (var rel in connByType) {
      html += '<div class="conn-group"><h4>' + rel + '</h4><ul>';
      connByType[rel].forEach(function(id) {
        var cn = rawNodes.find(function(n) { return n.id === id; });
        html += '<li>' + (cn ? cn.label : id) + '</li>';
      });
      html += '</ul></div>';
    }
    el.innerHTML = html;
  });

  // Stats
  var s = analysis.summary;
  var statsHtml = '';
  statsHtml += '<div class="stat-row"><span class="stat-label">Nodes</span><span class="stat-value">' + s.total_nodes + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Edges</span><span class="stat-value">' + s.total_edges + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Workspaces</span><span class="stat-value">' + s.workspaces + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Specs</span><span class="stat-value">' + s.specs + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Files</span><span class="stat-value">' + s.files + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Conventions</span><span class="stat-value">' + s.conventions + '</span></div>';
  statsHtml += '<div class="stat-row"><span class="stat-label">Phases</span><span class="stat-value">' + s.phases + '</span></div>';

  if (analysis.god_nodes && analysis.god_nodes.length) {
    statsHtml += '<div class="finding"><h4>God Nodes (top by degree)</h4><ul>';
    analysis.god_nodes.forEach(function(g) {
      statsHtml += '<li>' + g.label + ' (' + g.type + ', degree ' + g.degree + ')</li>';
    });
    statsHtml += '</ul></div>';
  }

  if (analysis.orphaned_files && analysis.orphaned_files.length) {
    statsHtml += '<div class="finding"><h4>Orphaned Files (scoped but uncovered)</h4><ul>';
    analysis.orphaned_files.forEach(function(f) {
      statsHtml += '<li>' + f.replace('file:', '') + '</li>';
    });
    statsHtml += '</ul></div>';
  } else {
    statsHtml += '<div class="finding"><h4 class="ok">No orphaned files</h4></div>';
  }

  if (analysis.missing_implements && analysis.missing_implements.length) {
    statsHtml += '<div class="finding"><h4>Missing Implements (L2 without parent)</h4><ul>';
    analysis.missing_implements.forEach(function(m) {
      statsHtml += '<li>' + m.label + ' (' + m.workspace + ')</li>';
    });
    statsHtml += '</ul></div>';
  } else {
    statsHtml += '<div class="finding"><h4 class="ok">All L2 specs declare Implements</h4></div>';
  }

  if (analysis.convention_coverage) {
    var cc = analysis.convention_coverage;
    statsHtml += '<div class="finding"><h4>Convention Coverage</h4>';
    statsHtml += '<div class="stat-row"><span class="stat-label">Enforced</span><span class="stat-value">' + cc.enforced.length + '</span></div>';
    statsHtml += '<div class="stat-row"><span class="stat-label">Orphaned</span><span class="stat-value">' + cc.orphaned.length + '</span></div>';
    if (cc.orphaned.length) {
      statsHtml += '<ul>';
      cc.orphaned.forEach(function(o) { statsHtml += '<li>' + o + '</li>'; });
      statsHtml += '</ul>';
    }
    statsHtml += '</div>';
  }

  document.getElementById('stats-content').innerHTML = statsHtml;
})();
<\/script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT — HUMAN-READABLE SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prints a human-readable summary of the graph and analysis to stdout.
 *
 * @param {object} analysis - Analysis results from runAnalysis.
 */
function printSummary(analysis) {
    const s = analysis.summary;

    console.log('');
    console.log('SPECIFICATION KNOWLEDGE GRAPH — Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Design directory : ${designDir}`);
    console.log(`Total nodes      : ${s.total_nodes}`);
    console.log(`Total edges      : ${s.total_edges}`);
    const cacheTotal = cacheStats.hits + cacheStats.misses;
    if (cacheTotal > 0) {
        const pct = Math.round((cacheStats.hits / cacheTotal) * 100);
        console.log(`Extraction cache : ${cacheStats.hits}/${cacheTotal} hits (${pct}%)${noCacheFlag ? ' — bypassed via --no-cache' : ''}`);
    }
    console.log('');

    console.log('  Type          Count');
    console.log('  ─────────── ───────');
    console.log(`  Workspaces  ${String(s.workspaces).padStart(7)}`);
    console.log(`  Specs       ${String(s.specs).padStart(7)}`);
    console.log(`  Files       ${String(s.files).padStart(7)}`);
    console.log(`  Conventions ${String(s.conventions).padStart(7)}`);
    console.log(`  Phases      ${String(s.phases).padStart(7)}`);
    console.log('');

    // God Nodes
    if (analysis.god_nodes.length) {
        console.log('GOD NODES (top by degree):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const g of analysis.god_nodes) {
            console.log(`  ${g.label} (${g.type}, degree ${g.degree})`);
        }
        console.log('');
    }

    // Coverage Stats
    if (Object.keys(analysis.coverage_stats).length) {
        console.log('COVERAGE STATS (per workspace):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const [ws, stat] of Object.entries(analysis.coverage_stats)) {
            console.log(`  ${ws}: ${stat.specs} specs, ${stat.files_covered} files covered / ${stat.total_scope} scope → ${stat.coverage_pct}%`);
        }
        console.log('');
    }

    // Orphaned Files
    if (analysis.orphaned_files.length) {
        console.log('ORPHANED FILES (scoped but uncovered by specs):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const f of analysis.orphaned_files) {
            console.log(`  ${f.replace('file:', '')}`);
        }
        console.log('');
    }

    // Missing Implements
    if (analysis.missing_implements.length) {
        console.log('MISSING IMPLEMENTS (L2 specs without parent):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const m of analysis.missing_implements) {
            console.log(`  ${m.label} (${m.workspace})`);
        }
        console.log('');
    }

    // Bridge Specs
    if (analysis.bridge_specs.length) {
        console.log('BRIDGE SPECS (cross-workspace references):');
        console.log('───────────────────────────────────────────────────────────────');
        for (const b of analysis.bridge_specs) {
            console.log(`  ${b.label} → [${b.workspaces.join(', ')}]`);
        }
        console.log('');
    }

    // Convention Coverage
    const cc = analysis.convention_coverage;
    console.log('CONVENTION COVERAGE:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  Enforced : ${cc.enforced.length}`);
    console.log(`  Orphaned : ${cc.orphaned.length}`);
    if (cc.orphaned.length) {
        for (const o of cc.orphaned) {
            const node = nodes.get(o);
            console.log(`    ${node ? node.label : o}`);
        }
    }
    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE: extract → build → analyze → export
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main entry point. Orchestrates the full pipeline.
 */
function main() {
    // 1. Extract workspaces
    const workspaceScopes = extractWorkspaces();
    const workspaceNames = Object.keys(workspaceScopes);

    // 2. Extract conventions (before specs, so conv nodes exist for edge linking)
    extractConventions();

    // 3. For each workspace: extract spec registry, spec details, phases, plan links
    for (const wsName of workspaceNames) {
        const registrySpecs = extractSpecRegistry(wsName);
        extractSpecDetails(wsName, registrySpecs);
        extractPhases(wsName);
    }

    // 4. Compute degrees and run analysis
    const degrees = computeDegrees();
    const analysis = runAnalysis(degrees, workspaceScopes);

    // 5. Export
    if (jsonFlag) {
        console.log(toJSON(analysis));
        return;
    }

    if (htmlFlag) {
        const outputPath = htmlPath || DEFAULT_HTML_PATH;
        const absPath = path.resolve(rootDir, outputPath);
        const html = toHTML(analysis);
        writeFileSafe(absPath, html);
        const relPath = path.relative(rootDir, absPath);
        console.log(`Spec graph written to: ${normalizePath(relPath)}`);
        console.log(`  ${analysis.summary.total_nodes} nodes, ${analysis.summary.total_edges} edges`);
        return;
    }

    printSummary(analysis);
}

main();
