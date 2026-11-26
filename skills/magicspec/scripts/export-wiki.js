#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('export-wiki', module);

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const diagnostics = require('./lib/diagnostics');
const { reportUnavailable } = require('./lib/memory-refresh');
const {
    normalizePath,
    resolveDesignRoot,
    resolveProjectRoot,
    executorHint,
    graphPaths,
    retireLegacyGraph,
} = require('./utils');
const { slugify, joinMarkdown } = require('./lib/wiki-text');
const {
    documentsOf,
    unitLink,
    documentSlug,
    renderDocumentArticle,
    renderSetWorkspaceArticle,
} = require('./lib/doc-set-wiki');

// ═══════════════════════════════════════════════════════════════════════════
// SPEC GRAPH WIKI EXPORT
// ═══════════════════════════════════════════════════════════════════════════
//
// Generates a Wikipedia-style, agent-navigable Markdown wiki from the
// Specification Knowledge Graph.
//
// Exports the spec graph as a navigable wiki, reading through the extraction cache.
//
// Outputs (under $designDir/graph/wiki/):
//   index.md                                 — entry point
//   workspace__{name}.md                     — per-workspace overview
//   spec__{workspace}__{spec-slug}.md        — per-spec article
//
// Usage:
//   node skills/magicspec/scripts/executor.js export-wiki
//   node skills/magicspec/scripts/executor.js export-wiki --from-file <graph.json>
//   node skills/magicspec/scripts/executor.js export-wiki --out <wiki-dir>
//
// Environment:
//   MAGIC_DESIGN_DIR — workspace design directory (default: .magicspec)

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const rootDir = resolveProjectRoot();
const { designAbs } = resolveDesignRoot(rootDir);

/** Optional pre-built graph.json path (skip running build-spec-graph). */
const fromFileIdx = args.indexOf('--from-file');
const fromFile = fromFileIdx !== -1 ? args[fromFileIdx + 1] : null;

/** Optional wiki output directory override. */
const outIdx = args.indexOf('--out');
const outDir = outIdx !== -1 ? path.resolve(args[outIdx + 1]) : graphPaths(designAbs).wiki;

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
        const abs = path.resolve(fromFile);
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
    const stdout = execFileSync(
        process.execPath,
        [
            executorPath,
            'build-spec-graph',
            '--json',
        ],
        {
            cwd: rootDir,
            env: process.env,
            timeout: 60000,
            // The graph arrives on stdout; the default 1 MiB buffer ended the run with a stack trace
            // at about two thousand specifications.
            maxBuffer: 256 * 1024 * 1024,
        },
    );
    return JSON.parse(stdout.toString('utf8'));
}

// ═══════════════════════════════════════════════════════════════════════════
// INDEXING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
            if (!outgoing[e.relation]) outgoing[e.relation] = [];
            outgoing[e.relation].push(byId.get(e.to));
        } else if (e.to === nodeId) {
            if (!incoming[e.relation]) incoming[e.relation] = [];
            incoming[e.relation].push(byId.get(e.from));
        }
    }
    return {
        outgoing,
        incoming,
    };
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
    if (outgoing.implements?.length) {
        lines.push('## Implements', '');
        for (const t of outgoing.implements) {
            if (!t) continue;
            lines.push(`- [[${specSlug(t)}|${t.label}]]`);
        }
        lines.push('');
    }

    // Canonical references (covers)
    if (outgoing.covers?.length) {
        lines.push('## Canonical References', '');
        for (const t of outgoing.covers) {
            if (!t) continue;
            lines.push(`- \`${t.label}\``);
        }
        lines.push('');
    }

    // Enforced conventions
    if (outgoing.enforces?.length) {
        lines.push('## Enforces Conventions', '');
        for (const t of outgoing.enforces) {
            if (!t) continue;
            lines.push(`- ${t.label}`);
        }
        lines.push('');
    }

    // Reverse: specs that implement this one
    if (incoming.implements?.length) {
        lines.push('## Implemented By', '');
        for (const t of incoming.implements) {
            if (!t) continue;
            lines.push(`- [[${specSlug(t)}|${t.label}]]`);
        }
        lines.push('');
    }

    if (spec.workspace) {
        lines.push(
            `> Part of [[${workspaceSlug({
                label: spec.workspace,
            })}|${spec.workspace}]] · See [[index]] to navigate.`,
        );
    } else {
        lines.push(`> See [[index]] to navigate.`);
    }
    return joinMarkdown(lines);
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

    for (const layer of [
        ...byLayer.keys(),
    ].sort()) {
        lines.push(`## Layer ${layer}`, '');
        for (const s of byLayer.get(layer).sort((a, b) => a.label.localeCompare(b.label))) {
            const tags = [];
            if (s.status) tags.push(s.status);
            if (s.version) tags.push(`v${s.version}`);
            const tagStr = tags.length ? ` _(${tags.join(', ')})_` : '';
            lines.push(`- [[${specSlug(s)}|${s.label}]]${tagStr}`);
        }
        lines.push('');
    }

    const bridges = bridgeSpecs.filter((b) => (b.workspaces || []).includes(ws.label));
    if (bridges.length) {
        lines.push('## Bridge Specs', '');
        lines.push('_Specs that span multiple workspaces:_', '');
        for (const b of bridges) {
            lines.push(`- ${b.label} → ${b.workspaces.join(', ')}`);
        }
        lines.push('');
    }

    lines.push('> See [[index]] to navigate other workspaces.');
    return joinMarkdown(lines);
}

/**
 * The counts under the index title; documents are counted only where a workspace holds a set.
 *
 * @param {object[]} specs
 * @param {object[]} workspaces
 * @param {Map<string, Map<string, object[]>>} documents
 * @returns {string}
 */
function headline(specs, workspaces, documents) {
    const files = [
        ...documents.values(),
    ].reduce((sum, set) => sum + set.size, 0);
    const documented = files > 0 ? ` · ${files} documents` : '';
    return `${specs.length} specs · ${workspaces.length} workspaces${documented}`;
}

/**
 * One index line per workspace, with what it holds: documents for a set, specifications else.
 *
 * @param {object[]} workspaces
 * @param {Map<string, object[]>} specsByWs
 * @param {Map<string, Map<string, object[]>>} documents
 * @returns {string[]}
 */
function workspaceLines(workspaces, specsByWs, documents) {
    return workspaces
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((ws) => {
            const set = documents.get(ws.label);
            const count = set
                ? `${set.size} documents`
                : `${(specsByWs.get(ws.label) || []).length} specs`;
            return `- [[${workspaceSlug(ws)}|${ws.label}]] — ${count}`;
        });
}

/**
 * The name of a most connected node: a specification or a unit links to its article.
 *
 * @param {object} node - A god node of the analysis.
 * @param {object[]} specs
 * @param {Map<string, object>} byId
 * @returns {string}
 */
function godNodeName(node, specs, byId) {
    const spec = node.type === 'spec' ? specs.find((s) => s.id === node.id) : undefined;
    if (spec) return `[[${specSlug(spec)}|${node.label}]]`;
    const unit = node.type === 'unit' ? byId.get(node.id) : undefined;
    return unit ? unitLink(unit) : node.label;
}

/**
 * The most connected nodes of the index, or nothing when the analysis names none.
 *
 * @param {object} analysis
 * @param {object[]} specs
 * @param {Map<string, object>} byId
 * @returns {string[]}
 */
function godNodeLines(analysis, specs, byId) {
    const nodes = analysis?.god_nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) return [];
    return [
        '## God Nodes',
        '',
        '_Most connected nodes — the load-bearing abstractions._',
        '',
        ...nodes.map((g) => `- ${godNodeName(g, specs, byId)} — ${g.degree} edges (${g.type})`),
        '',
    ];
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
function renderIndex(workspaces, specs, analysis, specsByWs, documents, byId) {
    const lines = [];
    lines.push('# Specification Knowledge Graph — Wiki Index', '');
    lines.push(
        '> Auto-generated by `export-wiki`. Start here — read a workspace page for a map, then drill into spec articles for detail.',
        '',
    );
    lines.push(headline(specs, workspaces, documents), '');

    lines.push('## Workspaces', '');
    lines.push(...workspaceLines(workspaces, specsByWs, documents), '');
    lines.push(...godNodeLines(analysis, specs, byId));

    if (analysis && Array.isArray(analysis.orphaned_files) && analysis.orphaned_files.length) {
        lines.push('## Knowledge Gaps', '');
        lines.push(
            `- **${analysis.orphaned_files.length} orphaned file(s)** in workspace scope but uncovered by any spec.`,
        );
        if (Array.isArray(analysis.missing_implements) && analysis.missing_implements.length) {
            lines.push(
                `- **${analysis.missing_implements.length} L2 spec(s)** missing an \`Implements:\` link.`,
            );
        }
        const orphanedConv = analysis.convention_coverage?.orphaned;
        if (Array.isArray(orphanedConv) && orphanedConv.length) {
            lines.push(`- **${orphanedConv.length} convention(s)** not enforced by any spec.`);
        }
        lines.push('');
    }

    lines.push(`> Regenerate with \`${executorHint()} export-wiki\`.`);
    return joinMarkdown(lines);
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
    fs.mkdirSync(path.dirname(absPath), {
        recursive: true,
    });
    const tmp = `${absPath}.tmp`;
    fs.writeFileSync(tmp, content, 'utf8');
    try {
        fs.renameSync(tmp, absPath);
    } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
            fs.copyFileSync(tmp, absPath);
            try {
                fs.unlinkSync(tmp);
            } catch (_) {}
        } else {
            throw err;
        }
    }
}

/**
 * Removes every page inside the wiki directory (keeps the directory): the `.md` files, and the
 * `.md.tmp` a write that was interrupted left behind, which no later write would ever replace.
 *
 * @param {string} dir
 */
function pruneWiki(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.md') || name.endsWith('.md.tmp')) {
            try {
                fs.unlinkSync(path.join(dir, name));
            } catch (_) {}
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARTIFACT INDEX
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Refreshes the artifact index after the wiki, so one refresh keeps graph, wiki and index
 * current (AM-5). The indexer runs as its own command through the executor, which gives it
 * the runtime flag that keeps the SQLite module's warning out of this output. It can never
 * fail the refresh (AM-8): a failure to start or finish it is recorded and reported in one
 * line, and the wiki that was just written stands.
 *
 * @returns {void}
 */
function refreshArtifactIndex() {
    try {
        const out = execFileSync(
            process.execPath,
            [
                path.join(__dirname, 'executor.js'),
                'memory-index',
            ],
            {
                cwd: rootDir,
                env: process.env,
                encoding: 'utf8',
                stdio: [
                    'ignore',
                    'pipe',
                    'pipe',
                ],
                timeout: 300000,
                maxBuffer: 16 * 1024 * 1024,
            },
        );
        for (const line of out.split('\n')) {
            if (line.startsWith('[memory-index]'))
                console.log(line.replace('[memory-index]', 'Artifact index:'));
        }
    } catch (err) {
        const reason = reportUnavailable('export-wiki', err, diagnostics.record);
        console.log(
            `[Index-Refresh] The artifact index was not refreshed: ${reason}. Search the text with grep instead.`,
        );
    }
}

/**
 * Writes the article of every document of every 4.0 workspace.
 *
 * @param {ReturnType<typeof documentsOf>} documents
 * @param {object[]} edges
 * @param {Map<string, object>} byId
 * @returns {{files: number, units: number}} How many documents and units were written.
 */
function writeDocumentArticles(documents, edges, byId) {
    const count = {
        files: 0,
        units: 0,
    };
    for (const [workspace, files] of documents) {
        for (const [file, units] of files) {
            const article = renderDocumentArticle(workspace, file, units, edges, byId);
            writeAtomic(path.join(outDir, `${documentSlug(workspace, file)}.md`), article);
            count.files++;
            count.units += units.length;
        }
    }
    return count;
}

/**
 * Writes the article of every workspace: the documents of a set, the specifications else.
 *
 * @param {object[]} workspaces
 * @param {object} analysis
 * @param {Map<string, object[]>} specsByWs
 * @param {ReturnType<typeof documentsOf>} documents
 */
function writeWorkspaceArticles(workspaces, analysis, specsByWs, documents) {
    const bridges = Array.isArray(analysis.bridge_specs) ? analysis.bridge_specs : [];
    for (const ws of workspaces) {
        const set = documents.get(ws.label);
        const article = set
            ? renderSetWorkspaceArticle(ws.label, set)
            : renderWorkspaceArticle(ws, specsByWs.get(ws.label) || [], bridges);
        writeAtomic(path.join(outDir, `${workspaceSlug(ws)}.md`), article);
    }
}

/**
 * Says where the wiki went and what it holds.
 *
 * @param {object[]} workspaces
 * @param {object[]} specs
 * @param {{files: number, units: number}} set - The documents and units written.
 */
function printExported(workspaces, specs, set) {
    console.log(`Wiki exported → ${normalizePath(path.relative(rootDir, outDir) || outDir)}`);
    const documented = set.files > 0 ? ` · ${set.files} documents · ${set.units} units` : '';
    console.log(`  ${workspaces.length} workspaces · ${specs.length} specs${documented} · 1 index`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    const graph = loadGraph();
    const nodes = graph.nodes || [];
    const edges = graph.edges || [];
    const analysis = graph.analysis || {};

    const byId = new Map(
        nodes.map((n) => [
            n.id,
            n,
        ]),
    );
    const specs = nodes.filter((n) => n.type === 'spec');
    const workspaces = nodes.filter((n) => n.type === 'workspace');

    /** @type {Map<string, object[]>} */
    const specsByWs = new Map();
    for (const s of specs) {
        const ws = s.workspace || 'root';
        if (!specsByWs.has(ws)) specsByWs.set(ws, []);
        specsByWs.get(ws).push(s);
    }

    fs.mkdirSync(outDir, {
        recursive: true,
    });
    pruneWiki(outDir);

    // Index
    const documents = documentsOf(nodes);
    writeAtomic(
        path.join(outDir, 'index.md'),
        renderIndex(workspaces, specs, analysis, specsByWs, documents, byId),
    );

    // Workspaces
    writeWorkspaceArticles(workspaces, analysis, specsByWs, documents);

    // Specs
    for (const s of specs) {
        const article = renderSpecArticle(s, edges, byId);
        writeAtomic(path.join(outDir, `${specSlug(s)}.md`), article);
    }

    printExported(workspaces, specs, writeDocumentArticles(documents, edges, byId));

    // The graph folder now holds everything; the earlier locations are derived and
    // regenerated, so they go once the new tree exists. A custom --out leaves them be.
    if (outIdx === -1) {
        const retired = retireLegacyGraph(designAbs, rootDir, 'wiki');
        if (retired.length > 0) {
            console.log(`Retired legacy graph artifacts: ${retired.join(', ')}`);
        }
        // The index belongs to the project's state folder: a wiki written elsewhere, or from a
        // graph file, is not the project's refresh.
        if (!fromFile) refreshArtifactIndex();
    }
}

main();
