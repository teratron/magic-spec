#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE-STATE — STATE.md update utility
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

/**
 * Updates STATE.md with provided key-value patches.
 * Reads the existing state file, applies changes, and writes back.
 * Never exceeds 100 lines — prunes old Decisions if needed.
 *
 * @param {string} designDir   Path to .design/{workspace} directory.
 * @param {object} patch       Key-value pairs to apply.
 * @param {object} [options]   Optional flags.
 * @param {boolean} [options.addDecision]   If true, prepend a decision entry.
 * @param {boolean} [options.addConstraint] If true, prepend a constraint entry.
 * @returns {void}
 */
function updateState(designDir, patch, options = {}) {
    const statePath = path.join(designDir, 'STATE.md');
    const templatePath = path.join(__dirname, '..', 'templates', 'state.md');

    // ───────────────────────────────────────────────────────────────────────
    // Bootstrap: create STATE.md from template if missing
    // ───────────────────────────────────────────────────────────────────────
    if (!fs.existsSync(statePath)) {
        if (!fs.existsSync(templatePath)) {
            console.error('[update-state] Template not found, creating minimal STATE.md');
            const minimal = [
                '# Project State',
                '',
                `**Workspace:** unknown`,
                `**Updated:** ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`,
                '**Phase:** 0',
                '**Status:** Active',
                '',
                '## Current Position',
                '',
                '- **Next Action:** Initialize project',
                '',
            ].join('\n');
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.writeFileSync(statePath, minimal, 'utf8');
        } else {
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.copyFileSync(templatePath, statePath);
        }
    }

    let content = fs.readFileSync(statePath, 'utf8');
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // ───────────────────────────────────────────────────────────────────────
    // Apply simple field patches (regex-based line replacement)
    // ───────────────────────────────────────────────────────────────────────
    const fieldMap = {
        workspace:  { re: /\*\*Workspace:\*\* .*/, prefix: '**Workspace:** ' },
        updated:    { re: /\*\*Updated:\*\* .*/,   prefix: '**Updated:** ' },
        phase:      { re: /\*\*Phase:\*\* .*/,     prefix: '**Phase:** ' },
        status:     { re: /\*\*Status:\*\* .*/,    prefix: '**Status:** ' },
        task:       { re: /- \*\*Task:\*\* .*/,    prefix: '- **Task:** ' },
        spec:       { re: /- \*\*Spec:\*\* .*/,    prefix: '- **Spec:** ' },
        nextAction: { re: /- \*\*Next Action:\*\* .*/, prefix: '- **Next Action:** ' },
        handoff:    { re: /\*\*Handoff File:\*\* .*/, prefix: '**Handoff File:** ' },
        bootstrap:  { re: /\*\*Bootstrap Mode:\*\* .*/, prefix: '**Bootstrap Mode:** ' },
    };

    // Always update timestamp
    patch.updated = now;

    for (const [key, { re, prefix }] of Object.entries(fieldMap)) {
        if (patch[key] !== undefined) {
            if (re.test(content)) {
                content = content.replace(re, `${prefix}${patch[key]}`);
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Prepend Decision (keeps last 5 entries)
    // ───────────────────────────────────────────────────────────────────────
    if (options.addDecision && patch.decision) {
        const marker = '## Recent Decisions';
        const idx = content.indexOf(marker);
        if (idx !== -1) {
            // Find the line after the marker and its comment block
            const afterMarker = content.indexOf('\n', idx) + 1;
            // Skip comment lines (<!-- ... -->)
            let insertAt = afterMarker;
            const remaining = content.slice(afterMarker);
            const commentEnd = remaining.search(/^[^<]/m);
            if (commentEnd > 0) {
                insertAt = afterMarker + commentEnd;
            }
            const entry = `- ${now.slice(0, 10)} **Decision:** ${patch.decision}\n`;
            content = content.slice(0, insertAt) + entry + content.slice(insertAt);

            // Prune: keep at most 5 decision lines
            const secStart = content.indexOf('## Recent Decisions');
            const secEnd = content.indexOf('\n## ', secStart + 1);
            if (secStart !== -1 && secEnd !== -1) {
                const block = content.slice(secStart, secEnd);
                const decLines = block.split('\n').filter(l => /^- \d{4}-\d{2}-\d{2}/.test(l));
                if (decLines.length > 5) {
                    const toRemove = decLines[decLines.length - 1];
                    content = content.replace(toRemove + '\n', '');
                }
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Prepend Blocking Constraint (auto-numbered [C-NNN])
    // ───────────────────────────────────────────────────────────────────────
    if (options.addConstraint && patch.constraint) {
        const marker = '## Blocking Constraints';
        const idx = content.indexOf(marker);
        if (idx !== -1) {
            const afterMarker = content.indexOf('\n', idx) + 1;
            let insertAt = afterMarker;
            const remaining = content.slice(afterMarker);
            const contentStart = remaining.search(/^[^<]/m);
            if (contentStart > 0) {
                insertAt = afterMarker + contentStart;
            }
            // Auto-number: count existing [C-NNN]
            const existing = (content.match(/\[C-\d{3}\]/g) || []).length;
            const id = `C-${String(existing + 1).padStart(3, '0')}`;
            const entry = `- [${id}] **${patch.constraint.title}**: ${patch.constraint.desc}\n`;
            content = content.slice(0, insertAt) + entry + content.slice(insertAt);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Line-count guard (100 lines max) — prune oldest decision
    // ───────────────────────────────────────────────────────────────────────
    const lines = content.split('\n');
    if (lines.length > 100) {
        console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruning oldest decision.`);
        const secStart = content.indexOf('## Recent Decisions');
        const secEnd = content.indexOf('\n## ', secStart + 1);
        if (secStart !== -1 && secEnd !== -1) {
            const block = content.slice(secStart, secEnd);
            const decLines = block.split('\n').filter(l => /^- \d{4}-\d{2}-\d{2}/.test(l));
            if (decLines.length > 1) {
                content = content.replace(decLines[decLines.length - 1] + '\n', '');
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Persist
    // ───────────────────────────────────────────────────────────────────────
    fs.writeFileSync(statePath, content, 'utf8');
    console.log(`[update-state] STATE.md updated: ${statePath}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error(
        'Usage: node update-state.js --workspace=<dir> ' +
        '[--task=<id>] [--status=<s>] [--phase=<n>] ' +
        '[--next-action=<text>] [--decision=<text>] ' +
        '[--constraint-title=<t>] [--constraint-desc=<d>] ' +
        '[--handoff=<path>] [--bootstrap=<true|false>]'
    );
    process.exit(1);
}

const parsed = {};
const opts = {};

for (const arg of args) {
    const eqIdx = arg.indexOf('=');
    const key = eqIdx !== -1 ? arg.slice(0, eqIdx) : arg;
    const val = eqIdx !== -1 ? arg.slice(eqIdx + 1) : '';

    switch (key) {
        case '--workspace':       parsed.workspace = val; break;
        case '--task':            parsed.task = val; break;
        case '--status':          parsed.status = val; break;
        case '--phase':           parsed.phase = val; break;
        case '--next-action':     parsed.nextAction = val; break;
        case '--handoff':         parsed.handoff = val; break;
        case '--bootstrap':       parsed.bootstrap = val; break;
        case '--decision':
            parsed.decision = val;
            opts.addDecision = true;
            break;
        case '--constraint-title':
            parsed.constraint = parsed.constraint || {};
            parsed.constraint.title = val;
            opts.addConstraint = true;
            break;
        case '--constraint-desc':
            parsed.constraint = parsed.constraint || {};
            parsed.constraint.desc = val;
            opts.addConstraint = true;
            break;
        default:
            console.warn(`[update-state] Unknown argument: ${key}`);
    }
}

const workspaceArg = parsed.workspace || process.env.MAGIC_DESIGN_DIR || '.design';
delete parsed.workspace;

updateState(workspaceArg, parsed, opts);
