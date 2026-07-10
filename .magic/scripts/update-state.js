#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE-STATE — STATE.md update utility
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./utils');

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
        workspace: { re: /\*\*Workspace:\*\* .*/, prefix: '**Workspace:** ' },
        updated: { re: /\*\*Updated:\*\* .*/, prefix: '**Updated:** ' },
        phase: { re: /\*\*Phase:\*\* .*/, prefix: '**Phase:** ' },
        status: { re: /\*\*Status:\*\* .*/, prefix: '**Status:** ' },
        task: { re: /- \*\*Task:\*\* .*/, prefix: '- **Task:** ' },
        spec: { re: /- \*\*Spec:\*\* .*/, prefix: '- **Spec:** ' },
        nextAction: { re: /- \*\*Next Action:\*\* .*/, prefix: '- **Next Action:** ' },
        handoff: { re: /\*\*Handoff File:\*\* .*/, prefix: '**Handoff File:** ' },
        bootstrap: { re: /\*\*Bootstrap Mode:\*\* .*/, prefix: '**Bootstrap Mode:** ' },
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
    // Auto-Progress (SC-2: best-effort recompute from TASKS.md)
    // ───────────────────────────────────────────────────────────────────────
    if (options.autoProgress) {
        try {
            const progress = computeProgress(designDir, content);
            if (progress) {
                const progressRe = /(## Progress\s*\n+```\n)[\s\S]*?(\n```)/;
                if (progressRe.test(content)) {
                    content = content.replace(progressRe, `$1${progress}$2`);
                }
            }
        } catch (e) {
            console.warn(`[update-state] Progress recompute skipped: ${e.message}`);
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

// ───────────────────────────────────────────────────────────────────────────
// Progress Recompute Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renders one progress line with an 8-segment bar.
 *
 * @param {string} label  Line label (e.g. `Phase 8`, `Overall`).
 * @param {number} done   Completed item count.
 * @param {number} total  Total item count (must be > 0).
 * @returns {string}
 */
function progressLine(label, done, total) {
    const pct = Math.round((done / total) * 100);
    const filled = Math.min(8, Math.round((pct / 100) * 8));
    const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
    return `${label}: [${done}/${total}] ${bar} ${pct}%`;
}

/**
 * Recomputes the STATE.md Progress block from TASKS.md. Best-effort: any
 * unparsable structure yields `null` and the existing block is preserved.
 *
 * Sources:
 * - Active-phase line: `### Phase {N} Checklist` items in TASKS.md, where
 *   `{N}` is taken from the STATE.md `**Phase:**` field.
 * - Overall line: `| [Phase {N}](...)` registry rows in TASKS.md; a row
 *   counts as done when it contains the `Done` status keyword.
 *
 * @param {string} designDir     Path to .design/{workspace} directory.
 * @param {string} stateContent  Current STATE.md content (for phase number).
 * @returns {string|null} Replacement block body, or null to skip.
 */
function computeProgress(designDir, stateContent) {
    const tasksPath = path.join(designDir, 'TASKS.md');
    if (!fs.existsSync(tasksPath)) return null;
    const tasks = fs.readFileSync(tasksPath, 'utf8');

    const lines = [];

    const phaseMatch = stateContent.match(/\*\*Phase:\*\* (\d+)/);
    if (phaseMatch) {
        const n = phaseMatch[1];
        const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
        if (section) {
            const done = (section[1].match(/^- \[x\]/gim) || []).length;
            const open = (section[1].match(/^- \[ \]/gm) || []).length;
            if (done + open > 0) lines.push(progressLine(`Phase ${n}`, done, done + open));
        }
    }

    const phaseRows = tasks.match(/^\| \[Phase \d+\]\([^)]*\)[^\n]*$/gm) || [];
    if (phaseRows.length > 0) {
        const phasesDone = phaseRows.filter((r) => /\bDone\b/.test(r)).length;
        lines.push(progressLine('Overall', phasesDone, phaseRows.length));
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses CLI arguments and applies the requested STATE.md patch.
 *
 * @returns {void}
 */
function runCli() {
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

    // One shared grammar (utils.parseFlags): `--flag=value` and `--flag value`
    // are equivalent, and a valueless value-flag is an error. Previously a bare
    // `--workspace` yielded an empty value that fell through to `.design/`,
    // writing STATE.md into the global registry root instead of a workspace.
    const { values, flags, rest, errors } = parseFlags(args, {
        valueFlags: [
            '--workspace', '--task', '--status', '--phase', '--next-action',
            '--handoff', '--bootstrap', '--decision',
            '--constraint-title', '--constraint-desc',
        ],
        boolFlags: ['--auto-progress'],
    });

    if (errors.length > 0) {
        console.error(`[update-state] HALT: ${errors[0]}`);
        process.exit(1);
    }
    for (const unknown of rest) {
        console.warn(`[update-state] Unknown argument: ${unknown}`);
    }

    const parsed = {};
    const opts = {};

    if (values['--task'] !== undefined) parsed.task = values['--task'];
    if (values['--status'] !== undefined) parsed.status = values['--status'];
    if (values['--phase'] !== undefined) parsed.phase = values['--phase'];
    if (values['--next-action'] !== undefined) parsed.nextAction = values['--next-action'];
    if (values['--handoff'] !== undefined) parsed.handoff = values['--handoff'];
    if (values['--bootstrap'] !== undefined) parsed.bootstrap = values['--bootstrap'];
    if (flags['--auto-progress']) opts.autoProgress = true;

    if (values['--decision'] !== undefined) {
        parsed.decision = values['--decision'];
        opts.addDecision = true;
    }
    if (values['--constraint-title'] !== undefined) {
        parsed.constraint = parsed.constraint || {};
        parsed.constraint.title = values['--constraint-title'];
        opts.addConstraint = true;
    }
    if (values['--constraint-desc'] !== undefined) {
        parsed.constraint = parsed.constraint || {};
        parsed.constraint.desc = values['--constraint-desc'];
        opts.addConstraint = true;
    }

    // `--workspace` here is a design *directory* (may contain separators), not
    // the bare workspace name that executor.js validates. Absent → ambient env.
    const workspaceArg = values['--workspace'] || process.env.MAGIC_DESIGN_DIR || '.design';

    updateState(workspaceArg, parsed, opts);
}

module.exports = { updateState, computeProgress };

if (require.main === module) {
    runCli();
}
