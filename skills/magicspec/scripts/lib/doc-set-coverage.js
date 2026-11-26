// @ts-check
'use strict';

const { loadDocSet, computePack, revisionOf } = require('../check-docs');

// ═══════════════════════════════════════════════════════════════════════════
// DOC SET COVERAGE (which requirements of a 4.0 workspace a task observes)
// ═══════════════════════════════════════════════════════════════════════════
//
// A set has no Canonical References to classify code files against. Its coverage is of the
// behaviour requirements: one is `covered` when it has an Accept check and the pack of at
// least one task holds it, `unobserved` when it has a check and no pack holds it, and
// `unchecked` when it states no check. A withdrawn requirement is not counted.

/** The address of a behaviour requirement; a binding unit has a `b` before its number. */
const REQUIREMENT = /^[a-z][a-z0-9_]*\.\d+$/;

/**
 * @typedef {{ address: string, state: 'covered' | 'unobserved' | 'unchecked' }} Requirement
 */

/**
 * The state of every requirement of a set, in the order the set defines them.
 *
 * @param {string} dir - The folder of the workspace.
 * @returns {Requirement[]}
 */
function requirementsOf(dir) {
    const set = loadDocSet(dir);
    const packed = new Set(set.tasks.flatMap((t) => computePack(set, t.address)));
    return [
        ...set.units,
    ]
        .filter(
            ([address, [unit]]) => REQUIREMENT.test(address) && !revisionOf(unit.text)?.withdrawn,
        )
        .map(([address, [unit]]) => {
            if (!/^- Accept:/m.test(unit.text))
                return {
                    address,
                    state: 'unchecked',
                };
            return {
                address,
                state: packed.has(address) ? 'covered' : 'unobserved',
            };
        });
}

/**
 * The report of a set's coverage.
 *
 * @param {string} dir - The folder of the workspace.
 * @returns {{ requirements: Requirement[], summary: { total: number, covered: number, unobserved: number, unchecked: number }, lines: string[] }}
 *   `lines` is one line per requirement not covered, then the total.
 */
function setCoverage(dir) {
    const requirements = requirementsOf(dir);
    const count = (/** @type {string} */ state) =>
        requirements.filter((r) => r.state === state).length;
    const summary = {
        total: requirements.length,
        covered: count('covered'),
        unobserved: count('unobserved'),
        unchecked: count('unchecked'),
    };
    const lines = [
        ...requirements.filter((r) => r.state !== 'covered').map((r) => `${r.address}: ${r.state}`),
        `${summary.covered} of ${summary.total} requirements covered`,
    ];
    return {
        requirements,
        summary,
        lines,
    };
}

module.exports = {
    setCoverage,
};
