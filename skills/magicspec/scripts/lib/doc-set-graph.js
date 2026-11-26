// @ts-check
'use strict';

const { loadDocSet } = require('../check-docs');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET GRAPH (the units of a 4.0 workspace and the references between them)
// ═══════════════════════════════════════════════════════════════════════════
//
// The knowledge graph of a workspace in the 4.0 format has one node per unit of the set, keyed
// by its address, and one edge per reference the checker resolves — a field that names addresses,
// or an address written in a unit's text. The graph builder and, through it, the wiki read a set
// from here; the checker's loader does the parsing.

/** The address forms of the set (concept §5.2), tried in this order; anything else is a component key. */
const FORMS = /** @type {const} */ ([
    [
        /^M\d+\.T\d+$/,
        'task',
    ],
    [
        /^M\d+$/,
        'milestone',
    ],
    [
        /^R\d+$/,
        'rule',
    ],
    [
        /^S\d+$/,
        'stack-rule',
    ],
    [
        /^P\d+$/,
        'product-item',
    ],
    [
        /^X\d+$/,
        'library',
    ],
    [
        /^D\d+$/,
        'decision',
    ],
    [
        /^C\d+$/,
        'change',
    ],
    [
        /^term:/,
        'term',
    ],
    [
        /^map:/,
        'map-entry',
    ],
    [
        /\.b\d+$/,
        'binding',
    ],
    [
        /\.\d+$/,
        'requirement',
    ],
]);

/**
 * The form of an address.
 *
 * @param {string} address
 * @returns {string}
 */
function addressForm(address) {
    return FORMS.find(([re]) => re.test(address))?.[1] ?? 'component';
}

/** The id of the node a unit has. */
const unitId = (/** @type {string} */ workspace, /** @type {string} */ address) =>
    `unit:${workspace}:${address}`;

/**
 * The references of a set as pairs of addresses: the fields that name addresses and the
 * addresses written in each unit, a unit naming itself left out.
 *
 * @param {ReturnType<typeof loadDocSet>} set
 * @returns {[string, string][]}
 */
function referencesOf(set) {
    const fields = set.refSites.flatMap((site) =>
        site.refs.map(
            (ref) =>
                /** @type {[string, string]} */ ([
                    site.owner,
                    ref,
                ]),
        ),
    );
    const mentions = [
        ...set.units.values(),
    ].flatMap(([unit]) =>
        set.inlineRefs(unit.text).map(
            (ref) =>
                /** @type {[string, string]} */ ([
                    unit.address,
                    ref,
                ]),
        ),
    );
    return [
        ...fields,
        ...mentions,
    ];
}

/**
 * The nodes and edges of a set: one node per unit, and one `references` edge for each pair a
 * reference resolves to.
 *
 * @param {string} dir - The folder of the workspace.
 * @param {string} workspace - Its name.
 * @returns {{ nodes: { id: string, label: string, extra: { workspace: string, form: string, layer: string, file: string } }[], edges: { from: string, to: string }[] }}
 */
function docSetGraph(dir, workspace) {
    const set = loadDocSet(dir);
    const nodes = [
        ...set.units,
    ].map(([address, [unit]]) => ({
        id: unitId(workspace, address),
        label: address,
        extra: {
            workspace,
            form: addressForm(address),
            layer: unit.layer,
            file: unit.file,
        },
    }));
    const pairs = new Map();
    for (const [from, to] of referencesOf(set)) {
        if (from === to || !set.units.has(from) || !set.units.has(to)) continue;
        pairs.set(`${from}\u0000${to}`, {
            from: unitId(workspace, from),
            to: unitId(workspace, to),
        });
    }
    return {
        nodes,
        edges: [
            ...pairs.values(),
        ],
    };
}

module.exports = {
    addressForm,
    docSetGraph,
};
