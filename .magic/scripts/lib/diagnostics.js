#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { mkdirSafe, appendFileSafe } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS COLLECTOR (Engine Findings Sink)
// ═══════════════════════════════════════════════════════════════════════════
//
// Implements l1-engine-diagnostics.md DG-1..DG-9: every non-fatal finding an
// engine script produces is recorded here, in addition to whatever it prints
// at the point of occurrence. `rules/magic.md` §3 binds the agent to relay
// finalize's **stdout** verbatim; every `console.warn`/`console.error` in the
// engine writes to stderr, so a finding recorded only there is unreachable by
// that contract. finalize.js drains this sink and renders one digest instead.

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const sinkPath = path.join(projectRoot, '.design', '.cache', 'diagnostics.jsonl');

const SEVERITIES = new Set(['error', 'warning', 'fix']);
const SEVERITY_RANK = { error: 0, warning: 1, fix: 2 };
const SEVERITY_GLYPH = { error: '❌', warning: '⚠️', fix: '🔧' };

/** Sink retention ceiling (DG-4.5 / §4.5) — independent of the render cap below. */
const MAX_SINK_ENTRIES = 200;
const OVERFLOW_CODE = 'DIAGNOSTICS_SINK_OVERFLOW';

/** Render cap (DG-4), matching finalize.js's existing MAX_LISTED_FILES convention. */
const MAX_RENDERED_FINDINGS = 15;

// ───────────────────────────────────────────────────────────────────────────
// Validation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Validates and normalizes a finding per DG-2/DG-3. Total and silent-by-
 * degradation: a malformed finding must never become a second defect, so
 * callers never see a thrown error here — only a boolean via {@link record}.
 *
 * @param {Object} finding
 * @returns {{ok: true, value: Object}|{ok: false, reason: string}}
 */
function normalize(finding) {
    if (!finding || typeof finding !== 'object') {
        return { ok: false, reason: 'finding must be an object' };
    }
    const { severity, source, code, message, locus, remedy } = finding;
    if (!SEVERITIES.has(severity)) return { ok: false, reason: `invalid severity '${severity}'` };
    if (!source || typeof source !== 'string') return { ok: false, reason: 'missing source' };
    if (!code || typeof code !== 'string') return { ok: false, reason: 'missing code' };
    if (!message || typeof message !== 'string') return { ok: false, reason: 'missing message' };

    // A finding is one JSONL line — an embedded newline would corrupt the
    // format the sink's append-safety and bounded-corruption guarantees rest on.
    const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

    const value = {
        ts: new Date().toISOString(),
        severity,
        source: oneLine(source),
        code: oneLine(code),
        message: oneLine(message),
    };
    if (locus) value.locus = oneLine(locus);
    if (remedy) value.remedy = oneLine(remedy);
    return { ok: true, value };
}

// ───────────────────────────────────────────────────────────────────────────
// Sink I/O
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {string[]} Raw non-empty lines of the sink, or `[]` if absent.
 */
function readSinkLines() {
    if (!fs.existsSync(sinkPath)) return [];
    return fs.readFileSync(sinkPath, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
}

/**
 * Records one finding to the sink, alongside — never instead of — whatever
 * the caller already prints at the point of occurrence (DG-1). Honors
 * MAGIC_DRY_RUN via the shared `appendFileSafe`/`mkdirSafe` helpers, matching
 * every other mutation in the engine. Never throws (DG-9): a malformed
 * finding, an unwritable sink, or a full sink degrade to a warning and a
 * `false` return rather than propagating.
 *
 * @param {{severity: 'error'|'warning'|'fix', source: string, code: string,
 *   message: string, locus?: string, remedy?: string}} finding
 * @returns {boolean} True when the entry physically reached the sink.
 */
function record(finding) {
    try {
        const result = normalize(finding);
        if (!result.ok) {
            console.warn(`[diagnostics] Dropped malformed finding: ${result.reason}`);
            return false;
        }

        mkdirSafe(path.dirname(sinkPath));
        const lines = readSinkLines();

        if (lines.length >= MAX_SINK_ENTRIES) {
            // One overflow marker, not one per subsequent record() call — the
            // marker's own presence is the last line once the cap holds, so a
            // repeat check is exactly "is the sink already saying this".
            const alreadyMarked = lines.length > 0 && lines[lines.length - 1].includes(OVERFLOW_CODE);
            if (!alreadyMarked) {
                const marker = normalize({
                    severity: 'warning',
                    source: 'diagnostics',
                    code: OVERFLOW_CODE,
                    message: `Sink reached ${MAX_SINK_ENTRIES} entries; further findings are suppressed until the next drain.`,
                }).value;
                appendFileSafe(sinkPath, JSON.stringify(marker) + '\n');
            }
            return false;
        }

        return appendFileSafe(sinkPath, JSON.stringify(result.value) + '\n');
    } catch (e) {
        console.warn(`[diagnostics] record() failed (non-blocking): ${e.message}`);
        return false;
    }
}

/**
 * Parses the sink and returns findings in append order, leaving the sink in
 * place. Unparseable lines are discarded silently so one truncated entry
 * costs only itself, not the rest of the file (DG-9 corollary). Never throws.
 *
 * @returns {Object[]}
 */
function read() {
    try {
        const findings = [];
        for (const line of readSinkLines()) {
            try {
                findings.push(JSON.parse(line));
            } catch {
                // Truncated/corrupt line — skip, keep draining the rest.
            }
        }
        return findings;
    } catch (e) {
        console.warn(`[diagnostics] read() failed (non-blocking): ${e.message}`);
        return [];
    }
}

/**
 * {@link read}s the sink, then clears it — the only consuming entry point.
 * Reserved to the mutating finalization path; a preview (`--dry-run`) must
 * call {@link read} instead, so a rehearsal never consumes what the real
 * invocation was to report (DG-4.1). Never throws.
 *
 * @returns {Object[]}
 */
function drain() {
    const findings = read();
    try {
        if (fs.existsSync(sinkPath)) fs.unlinkSync(sinkPath);
    } catch (e) {
        console.warn(`[diagnostics] drain() could not clear the sink (non-blocking): ${e.message}`);
    }
    return findings;
}

// ───────────────────────────────────────────────────────────────────────────
// Aggregation & Rendering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Groups findings by `(severity, source, code)` — deliberately excluding
 * `message`, which carries per-occurrence instance detail (a line count, a
 * filename) that would otherwise defeat the collapse — and sorts by severity
 * (error → warning → fix), then source, then first-occurrence timestamp.
 * Tolerant of partially-malformed entries (e.g. a truncated drained line):
 * anything missing a grouping field is skipped rather than crashing the digest.
 *
 * @param {Object[]} findings
 * @returns {Array<Object & {count: number}>}
 */
function dedupe(findings) {
    if (!Array.isArray(findings) || findings.length === 0) return [];

    const groups = new Map();
    for (const f of findings) {
        if (!f || !SEVERITIES.has(f.severity) || !f.source || !f.code || !f.message) continue;
        const key = `${f.severity} ${f.source} ${f.code}`;
        const existing = groups.get(key);
        if (existing) {
            existing.count += 1;
        } else {
            groups.set(key, { ...f, count: 1 });
        }
    }

    return [...groups.values()].sort((a, b) => {
        const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        if (rankDiff !== 0) return rankDiff;
        if (a.source !== b.source) return a.source < b.source ? -1 : 1;
        return (a.ts || '') < (b.ts || '') ? -1 : 1;
    });
}

/**
 * Severity counts over the deduplicated finding set — the same grouping
 * {@link formatDigest} renders, so the summary table row and the digest body
 * always agree on "how many distinct issues", not raw occurrence counts.
 *
 * @param {Object[]} findings
 * @returns {{error: number, warning: number, fix: number, total: number}}
 */
function summarize(findings) {
    const groups = dedupe(findings);
    const counts = { error: 0, warning: 0, fix: 0, total: groups.length };
    for (const g of groups) counts[g.severity] += 1;
    return counts;
}

/**
 * Renders the full digest section — heading, severity summary line, and
 * capped bullet list with remedy sub-lines — as an array of stdout lines.
 * Pure: no I/O. Returns `[]` for empty input (DG-7): the caller must be able
 * to render "no section at all" by simply not pushing anything, rather than
 * suppressing a heading it already emitted.
 *
 * @param {Object[]} findings
 * @returns {string[]}
 */
function formatDigest(findings) {
    const groups = dedupe(findings);
    if (groups.length === 0) return [];

    const counts = { error: 0, warning: 0, fix: 0 };
    for (const g of groups) counts[g.severity] += 1;

    const summaryParts = [];
    if (counts.error > 0) summaryParts.push(`${counts.error} error${counts.error !== 1 ? 's' : ''}`);
    if (counts.warning > 0) summaryParts.push(`${counts.warning} warning${counts.warning !== 1 ? 's' : ''}`);
    if (counts.fix > 0) summaryParts.push(`${counts.fix} fix${counts.fix !== 1 ? 'es' : ''}`);

    const lines = [
        '### Engine diagnostics',
        '',
        `**${summaryParts.join(' · ')}**`,
        '',
    ];

    const capped = groups.slice(0, MAX_RENDERED_FINDINGS);
    const omitted = groups.length - capped.length;

    for (const g of capped) {
        const glyph = SEVERITY_GLYPH[g.severity] || '•';
        const countSuffix = g.count > 1 ? ` (×${g.count})` : '';
        lines.push(`- ${glyph} \`${g.code}\` (${g.source}) — ${g.message}${countSuffix}`);
        if (g.remedy) lines.push(`  → ${g.remedy}`);
    }
    if (omitted > 0) {
        lines.push(`- _(+${omitted} more finding${omitted !== 1 ? 's' : ''} not listed)_`);
    }

    return lines;
}

module.exports = {
    SEVERITIES,
    MAX_SINK_ENTRIES,
    MAX_RENDERED_FINDINGS,
    record,
    read,
    drain,
    summarize,
    formatDigest,
};
