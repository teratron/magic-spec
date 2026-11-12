'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SIMULATION FINDINGS (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The failed and inconclusive steps that the last runs of a workspace's
// scenarios recorded. A run writes one line per step under each scenario's
// `Last run` (the layout of `templates/simulation.md`) and a later run of the
// same scenario replaces them, so what the scenario files hold is exactly what
// is still open: nothing here keeps state of its own.

const fs = require('fs');
const path = require('path');
const { stripQuoted } = require('./scan-hygiene');

/** Folder of a workspace that holds its scenario files. @type {string} */
const SIMULATIONS_DIR = 'simulations';

const SCENARIO_HEADING_RE = /^## (S-[^\s:]+):\s*(.*)$/;
const STEP_FINDING_RE = /^- Step (\d+): (fail|inconclusive) · (live|traced)(?: — observed: (.*))?$/;

// ───────────────────────────────────────────────────────────────────────────
// Reading
// ───────────────────────────────────────────────────────────────────────────

/**
 * The open findings of one scenario file: every step line of a scenario that says `fail` or
 * `inconclusive`. Fenced blocks, code spans and HTML comments are blanked before the lines are
 * recognised, so a layout shown in a template or quoted in prose is never read as a finding; the
 * observed text is taken from the line as written.
 *
 * @param {string} text - The content of a scenario file.
 * @param {string} area - The file's name without its extension.
 * @returns {Array<{area: string, scenario: string, title: string, step: number,
 *   result: string, mode: string, observed: string}>}
 */
function findingsOfFile(text, area) {
    const findings = [];
    let scenario = null;
    const original = text.replace(/\r\n/g, '\n').split('\n');
    const blankComments = (source) =>
        source.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, ''));
    const recognised = stripQuoted(blankComments(original.join('\n'))).split('\n');
    for (const [index, line] of recognised.entries()) {
        const heading = SCENARIO_HEADING_RE.exec(line);
        if (heading) {
            scenario = { id: heading[1], title: heading[2].trim() };
            continue;
        }
        const step = STEP_FINDING_RE.exec(line);
        if (!step || !scenario) continue;
        const written = STEP_FINDING_RE.exec(original[index]) || step;
        findings.push({
            area,
            scenario: scenario.id,
            title: scenario.title,
            step: Number(step[1]),
            result: step[2],
            mode: step[3],
            observed: (written[4] || '').trim(),
        });
    }
    return findings;
}

/**
 * The open simulation findings of a workspace, in file and step order. A missing folder, an
 * unreadable file or a file in another layout holds none: a fault in this reader never changes
 * what a workflow does, it only costs the recommendation that would have named the findings.
 *
 * @param {string} wsDir - The workspace design directory.
 * @returns {Array<{area: string, scenario: string, title: string, step: number,
 *   result: string, mode: string, observed: string}>}
 */
function readSimulationFindings(wsDir) {
    const dir = path.join(wsDir, SIMULATIONS_DIR);
    let names;
    try {
        names = fs
            .readdirSync(dir)
            .filter((name) => name.endsWith('.md'))
            .sort();
    } catch {
        return [];
    }
    const findings = [];
    for (const name of names) {
        try {
            const text = fs.readFileSync(path.join(dir, name), 'utf8');
            findings.push(...findingsOfFile(text, name.slice(0, -3)));
        } catch {
            // one unreadable scenario file costs its own findings, not the others'
        }
    }
    return findings;
}

module.exports = { SIMULATIONS_DIR, findingsOfFile, readSimulationFindings };
