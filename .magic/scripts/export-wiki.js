const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveDesignRoot } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// SPEC GRAPH WIKI EXPORT
// ═══════════════════════════════════════════════════════════════════════════
//
// Generates a Wikipedia-style, agent-navigable Markdown wiki from the
// Specification Knowledge Graph.
//
// Implements l2-spec-graph-memory.md §4.2.
//
// Outputs (under $designDir/wiki/):
//   index.md                                 — entry point
//   workspace__{name}.md                     — per-workspace overview
//   spec__{workspace}__{spec-slug}.md        — per-spec article
//
// Usage:
//   node .magic/scripts/executor.js export-wiki
//   node .magic/scripts/executor.js export-wiki --from-file <graph.json>
//   node .magic/scripts/executor.js export-wiki --out <wiki-dir>
//
// Environment:
//   MAGIC_DESIGN_DIR — workspace design directory (default: .design)

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const rootDir = process.cwd();
const { designDir, designAbs } = resolveDesignRoot(rootDir);

/** Optional pre-built graph.json path (skip running build-spec-graph). */
const fromFileIdx = args.indexOf('--from-file');
const fromFile = fromFileIdx !== -1 ? args[fromFileIdx + 1] : null;

/** Optional wiki output directory override. */
const outIdx = args.indexOf('--out');
const outDir = outIdx !== -1 ? path.resolve(rootDir, args[outIdx + 1]) : path.join(designAbs, 'wiki');

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH LOADING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loads the spec graph either from a pre-built JSON file or by invoking
 * `build-spec-graph --json` via the executor.
 *
 * @returns {{nodes: object[], edges: object[], analysis: object}}
 */
function loadGraph() {
    if (fromFile) {
        const abs = path.resolve(rootDir, fromFile);
        if (!fs.existsSync(abs)) {
            console.error(`HALT: --from-file path does not exist: ${abs}`);
            process.exit(1);
        }
        try {
            return JSON.parse(fs.readFileSync(abs, 'utf8'));
        } catch (err) {
            console.error(`HALT: --from-file is not valid JSON (${err.message}): ${abs}`);
            process.exit(1);
        }
    }

    const executorPath = path.join(__dirname, 'executor.js');
    const stdout = execFileSync(process.execPath, [executorPath, 'build-spec-graph', '--json'], {
        cwd: rootDir,
        env: process.env,
        timeout: 60000,
    });
    return JSON.parse(stdout.toString('utf8'));
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEXING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filesystem-safe slug for a node id or label fragment.
 *
 * @param {string} raw
 * @returns {string}
 */
function slugify(raw) {
    return String(raw)
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '_')
        .replace(/[^\w.\-]/g, '')
        .slice(0, 120) || 'untitled';
}

/**
 * Returns the wiki filename (without extension) for a spec node.
 *
 * @param {object} node
 * @returns {string}
 */
function specSlug(node) {
    const ws = node.workspace || 'root';
    const base = node.id.replace(/^spec:[^/]+\//, '');
    return `spec__${slugify(ws)}__${slugify(base)}`;
}

/**
 * Returns the wiki filename (without extension) for a workspace node.
 *
 * @param {object} node
 * @returns {string}
 */
function workspaceSlug(node) {
    return `workspace__${slugify(node.label)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTICLE RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Groups adjacency entries by edge relation type.
 *
 * @param {object[]} edges
 * @param {string} nodeId
 * @param {Map<string, object>} byId
 * @returns {{outgoing: Record<string, object[]>, incoming: Record<string, object[]>}}
 */
function groupEdges(edges, nodeId, byId) {
    const outgoing = {};
    const incoming = {};
    for (const e of edges) {
        if (e.from === nodeId) {
            (outgoing[e.relation] = outgoing[e.relation] || []).push(byId.get(e.to));
        } else if (e.to === nodeId) {
            (incoming[e.relation] = incoming[e.relation] || []).push(byId.get(e.from));
        }
    }
    return { outgoing, incoming };
}

/**
 * Renders the wiki article for a spec node.
 *
 * @param {object} spec
 * @param {object[]} edges
 * @param {Map<string, object>} byId
 * @returns {string}
 */
function renderSpecArticle(spec, edges, byId) {
    const { outgoing, incoming } = groupEdges(edges, spec.id, byId);
    const lines = [];

    lines.push(`# ${spec.label}`, '');
    const meta = [
        `**Workspace:** ${spec.workspace || '—'}`,
        `**Layer:** ${spec.layer || '—'}`,
        `**Status:** ${spec.status || '—'}`,
        `**Version:** ${spec.version || '—'}`,
    ];
    lines.push(meta.join(' · '), '');

    // Implements chain
    if (outgoing.implements && outgoing.implements.length) {
        lines.push('## Implements', '');
        for (const t of outgoing.implements) {
            if (!t) continue;
            lines.push(`- [[${specSlug(t)}|${t.label}]]`);
        }
    }

    // Canonical references (covers)
    if (outgoing.covers && outgoing.covers.length) {
        lines.push('## Canonical References', '');
        for (const t of outgoing.covers) {
            if (!t) continue;
            lines.push(`- \`${t.label}\``);
        }
    }

    // Enforced conventions
    if (outgoing.enforces && outgoing.enforces.length) {
        lines.push('## Enforces Conventions', '');
        for (const t of outgoing.enforces) {
            if (!t) continue;
            lines.push(`- ${t.label}`);
        }

    }

    // Reverse: specs that implement this one
    if (incoming.implements && incoming.implements.length) {
        lines.push('## Implemented By', '');
        for (const t of incoming.implements) {
            if (!t) continue;
            lines.push(`- [[${specSlug(t)}|${t.label}]]`);
        }
    }

    lines.push('');
    if (spec.workspace) {
        lines.push(`> Part of [[${workspaceSlug({ label: spec.workspace })}|${spec.workspace}]] · See [[index]] to navigate.`);
    } else {
        lines.push('> See [[index]] to navigate.');
    }
    return lines.join('\n') + '\n';
}

/**
 * Renders the wiki article for a workspace node.
 *
 * @param {object} ws
 * @param {object[]} specs - Spec nodes contained by this workspace.
 * @param {object[]} bridgeSpecs - Specs that bridge multiple workspaces.
 * @returns {string}
 */
function renderWorkspaceArticle(ws, specs, bridgeSpecs) {
    const lines = [];
    lines.push(`# Workspace: ${ws.label}`, '');
    lines.push(`**Specs:** ${specs.length}`, '');

    const byLayer = new Map();
    for (const s of specs) {
        const layer = s.layer || 0;
        if (!byLayer.has(layer)) byLayer.set(layer, []);
        byLayer.get(layer).push(s);
    }

    for (const layer of [...byLayer.keys()].sort()) {
        lines.push(`## Layer ${layer}`, '');
        for (const s of byLayer.get(layer).sort((a, b) => a.label.localeCompare(b.label))) {
            const tags = [];
            if (s.status) tags.push(s.status);
            if (s.version) tags.push(`v${s.version}`);
            const tagStr = tags.length ? ` _(${tags.join(', ')})_` : '';
            lines.push(`- [[${specSlug(s)}|${s.label}]]${tagStr}`);
        }
    }

    const bridges = bridgeSpecs.filter(b => (b.workspaces || []).includes(ws.label));
    if (bridges.length) {
        lines.push('## Bridge Specs', '');
        lines.push('_Specs that span multiple workspaces:_', '');
        for (const b of bridges) {
            lines.push(`- ${b.label} → ${b.workspaces.join(', ')}`);
        }
    }

    lines.push('');
    lines.push('> See [[index]] to navigate other workspaces.');
    return lines.join('\n') + '\n';
}

/**
 * Renders the top-level index article.
 *
 * @param {object[]} workspaces
 * @param {object[]} specs
 * @param {object} analysis
 * @param {Map<string, object[]>} specsByWs
 * @returns {string}
 */
function renderIndex(workspaces, specs, analysis, specsByWs) {
    const lines = [];
    lines.push('# Specification Knowledge Graph — Wiki Index', '');
    lines.push('> Auto-generated by `export-wiki`. Start here — read a workspace page for a map, then drill into spec articles for detail.', '');
    lines.push(`**${specs.length} specs · ${workspaces.length} workspaces**`, '');

    lines.push('## Workspaces', '');
    for (const ws of workspaces.sort((a, b) => a.label.localeCompare(b.label))) {
        const count = (specsByWs.get(ws.label) || []).length;
        lines.push(`- [[${workspaceSlug(ws)}|${ws.label}]] — ${count} specs`);
    }

    if (analysis && Array.isArray(analysis.god_nodes) && analysis.god_nodes.length) {
        lines.push('## God Nodes', '');
        lines.push('_Most connected nodes — the load-bearing abstractions._', '');
        for (const g of analysis.god_nodes) {
            if (g.type === 'spec') {
                const match = specs.find(s => s.id === g.id);
                if (match) { lines.push(`- [[${specSlug(match)}|${g.label}]] — ${g.degree} edges (${g.type})`); continue; }
            }
            lines.push(`- ${g.label} — ${g.degree} edges (${g.type})`);
        }
    }

    if (analysis && Array.isArray(analysis.orphaned_files) && analysis.orphaned_files.length) {
        lines.push('## Knowledge Gaps', '');
        lines.push(`- **${analysis.orphaned_files.length} orphaned file(s)** in workspace scope but uncovered by any spec.`);
        if (Array.isArray(analysis.missing_implements) && analysis.missing_implements.length) {
            lines.push(`- **${analysis.missing_implements.length} L2 spec(s)** missing an \`Implements:\` link.`);
        }
        const orphanedConv = analysis.convention_coverage && analysis.convention_coverage.orphaned;
        if (Array.isArray(orphanedConv) && orphanedConv.length) {
            lines.push(`- **${orphanedConv.length} convention(s)** not enforced by any spec.`);
        }
    }

    lines.push('');
    lines.push('> Regenerate with `node .magic/scripts/executor.js export-wiki`.');
    return lines.join('\n') + '\n';
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overwrites a file atomically via temp + rename.
 *
 * @param {string} absPath
 * @param {string} content
 */
function writeAtomic(absPath, content) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    const tmp = `${absPath}.tmp`;
    fs.writeFileSync(tmp, content, 'utf8');
    try { fs.renameSync(tmp, absPath); }
    catch (err) {
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
            fs.copyFileSync(tmp, absPath);
            try { fs.unlinkSync(tmp); } catch (_) { }
        } else {
            throw err;
        }
    }
}

/**
 * Removes every .md file inside the wiki directory (keeps the directory).
 *
 * @param {string} dir
 */
function pruneWiki(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.md')) {
            try { fs.unlinkSync(path.join(dir, name)); } catch (_) { }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    const graph = loadGraph();
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    const analysis = graph.analysis || {};

    const byId = new Map(nodes.map(n => [n.id, n]));
    const specs = nodes.filter(n => n.type === 'spec');
    const workspaces = nodes.filter(n => n.type === 'workspace');

    /** @type {Map<string, object[]>} */
    const specsByWs = new Map();
    for (const s of specs) {
        const ws = s.workspace || 'root';
        if (!specsByWs.has(ws)) specsByWs.set(ws, []);
        specsByWs.get(ws).push(s);
    }

    fs.mkdirSync(outDir, { recursive: true });
    pruneWiki(outDir);

    // Index
    writeAtomic(path.join(outDir, 'index.md'), renderIndex(workspaces, specs, analysis, specsByWs));

    // Workspaces
    const bridges = Array.isArray(analysis.bridge_specs) ? analysis.bridge_specs : [];
    for (const ws of workspaces) {
        const article = renderWorkspaceArticle(ws, specsByWs.get(ws.label) || [], bridges);
        writeAtomic(path.join(outDir, `${workspaceSlug(ws)}.md`), article);
    }

    // Specs
    for (const s of specs) {
        const article = renderSpecArticle(s, edges, byId);
        writeAtomic(path.join(outDir, `${specSlug(s)}.md`), article);
    }

    const relOut = path.relative(rootDir, outDir) || outDir;
    console.log(`Wiki exported → ${relOut}`);
    console.log(`  ${workspaces.length} workspaces · ${specs.length} specs · 1 index`);
}

main();
