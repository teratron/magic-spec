// @ts-check
'use strict';

const { slugify, joinMarkdown } = require('./wiki-text');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET WIKI (the articles of a workspace in the 4.0 format)
// ═══════════════════════════════════════════════════════════════════════════
//
// A set has no specifications: its wiki holds one article per document of the set, listing the
// units of the document by address with the references each makes and receives, and a workspace
// article that lists the documents. The nodes and edges are those of the knowledge graph.

/**
 * @typedef {{ id: string, label: string, type: string, workspace?: string, file?: string }} Node
 * @typedef {{ from: string, to: string, relation: string }} Edge
 * @typedef {Map<string, Map<string, Node[]>>} Documents - workspace → document → its units.
 */

/**
 * The unit nodes of a graph, grouped by workspace and by the document that holds them.
 *
 * @param {Node[]} nodes
 * @returns {Documents}
 */
function documentsOf(nodes) {
    /** @type {Documents} */
    const out = new Map();
    for (const node of nodes) {
        if (node.type !== 'unit' || !node.workspace || !node.file) continue;
        const files = out.get(node.workspace) ?? new Map();
        const units = files.get(node.file) ?? [];
        units.push(node);
        files.set(node.file, units);
        out.set(node.workspace, files);
    }
    return out;
}

/** The article name (without extension) of a document of a workspace. */
const documentSlug = (/** @type {string} */ workspace, /** @type {string} */ file) =>
    `doc__${slugify(workspace)}__${slugify(file.replace(/\.md$/, ''))}`;

/** A count of units, in words. */
const counted = (/** @type {number} */ n) => `${n} ${n === 1 ? 'unit' : 'units'}`;

/** A link to the article that holds a unit, labelled with its address. */
const unitLink = (/** @type {Node} */ unit) =>
    `[[${documentSlug(String(unit.workspace), String(unit.file))}|${unit.label}]]`;

/**
 * The lines that name the units at the other end of a unit's references.
 *
 * @param {string} title
 * @param {Edge[]} edges
 * @param {'from' | 'to'} end - The end of each edge to name.
 * @param {Map<string, Node>} byId
 * @returns {string[]}
 */
function referenceLine(title, edges, end, byId) {
    const named = edges
        .map((e) => byId.get(e[end]))
        .filter((n) => n !== undefined)
        .map((n) => unitLink(/** @type {Node} */ (n)));
    return named.length
        ? [
              `- ${title}: ${named.join(', ')}`,
          ]
        : [];
}

/**
 * The article of one document: each unit with the references it makes and receives.
 *
 * @param {string} workspace
 * @param {string} file
 * @param {Node[]} units
 * @param {Edge[]} edges
 * @param {Map<string, Node>} byId
 * @returns {string}
 */
function renderDocumentArticle(workspace, file, units, edges, byId) {
    const references = edges.filter((e) => e.relation === 'references');
    const lines = [
        `# ${file}`,
        '',
        `**Workspace:** ${workspace}`,
        '',
    ];
    for (const unit of units) {
        const made = references.filter((e) => e.from === unit.id);
        const received = references.filter((e) => e.to === unit.id);
        lines.push(
            `## ${unit.label}`,
            '',
            ...referenceLine('References', made, 'to', byId),
            ...referenceLine('Referenced by', received, 'from', byId),
            '',
        );
    }
    lines.push(`> See [[workspace__${slugify(workspace)}]] for the documents of the set.`);
    return joinMarkdown(lines);
}

/**
 * The article of a workspace of a set: its documents and how many units each holds.
 *
 * @param {string} workspace
 * @param {Map<string, Node[]>} files
 * @returns {string}
 */
function renderSetWorkspaceArticle(workspace, files) {
    const units = [
        ...files.values(),
    ].reduce((sum, list) => sum + list.length, 0);
    const lines = [
        `# Workspace: ${workspace}`,
        '',
        `**Documents:** ${files.size} · **Units:** ${units}`,
        '',
        '## Documents',
        '',
        ...[
            ...files.keys(),
        ]
            .sort()
            .map(
                (file) =>
                    `- [[${documentSlug(workspace, file)}|${file}]] — ${counted(files.get(file)?.length ?? 0)}`,
            ),
        '',
        '> See [[index]] to navigate other workspaces.',
    ];
    return joinMarkdown(lines);
}

module.exports = {
    documentsOf,
    unitLink,
    documentSlug,
    renderDocumentArticle,
    renderSetWorkspaceArticle,
};
