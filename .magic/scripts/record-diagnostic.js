#!/usr/bin/env node
'use strict';

const { parseFlags } = require('./utils');
const { record } = require('./lib/diagnostics');

// ═══════════════════════════════════════════════════════════════════════════
// RECORD-DIAGNOSTIC (Agent Channel, DG-8)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lets the agent write its own findings — a spec ambiguity hit mid-run, an
 * engine bug per rules/magic.md §9, a containment leak spotted while reading
 * a product file — into the same sink the engine's own scripts use, so they
 * surface in the next finalize digest instead of scrolling away as one-shot
 * chat narration in a long transcript.
 *
 * Exits 0 unconditionally, including when the finding is dropped as
 * malformed: an agent reporting a complaint must never see that act itself
 * fail (DG-9). `record()` already prints its own warning on drop; this CLI
 * adds one confirmation line either way.
 */
function runCli() {
    const args = process.argv.slice(2);
    const { values, errors } = parseFlags(args, {
        valueFlags: ['--severity', '--code', '--message', '--locus', '--remedy', '--source'],
    });

    if (errors.length > 0) {
        console.warn(`[record-diagnostic] ${errors[0]}`);
        process.exit(0);
    }

    const finding = {
        severity: values['--severity'],
        source: values['--source'] || 'agent',
        code: values['--code'],
        message: values['--message'],
    };
    if (values['--locus']) finding.locus = values['--locus'];
    if (values['--remedy']) finding.remedy = values['--remedy'];

    const ok = record(finding);
    console.log(ok
        ? `[record-diagnostic] Recorded ${finding.severity} ${finding.code} (${finding.source}).`
        : '[record-diagnostic] Finding not recorded — see warning above.');
    process.exit(0);
}

if (require.main === module) {
    runCli();
}

module.exports = { runCli };
