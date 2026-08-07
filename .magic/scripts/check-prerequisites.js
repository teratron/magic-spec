#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { hashFile, normalizePath } = require('./utils');
const { execSync } = require('child_process');
const { stripQuoted } = require('./lib/scan-hygiene');
const diagnostics = require('./lib/diagnostics');

// l1-scan-input-hygiene.md SH-4/SH-5: single shared pattern source for every
// `specifications/{file}.md` extraction site in this script — the filename
// grammar (not an unrelated closing paren) bounds the capture, so one
// definition backs both the `matchAll()` site and the single-match `.match()`
// sites instead of four independent copies of the same literal.
const SPEC_FILENAME_SRC = 'specifications\\/([a-z0-9][a-z0-9-]*\\.md)';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const reqPlan = args.includes('--require-plan');
const reqTasks = args.includes('--require-tasks');
const reqSpecs = args.includes('--require-specs');
const verifyHeaders = args.includes('--verify-headers');

const missing = [];
const warnings = [];

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Push a structured warning object.
 * @param {string} type - Warning category (e.g., 'ENGINE_INTEGRITY', 'GHOST_REGISTRY').
 * @param {string} message - Human-readable description.
 * @param {string|null} fix - Suggested fix command or null if no automated fix.
 */
function warn(type, message, fix) {
    warnings.push({ type, message, fix: fix || null });
    // Forwards the existing typed-warning shape 1:1 — `type` becomes the
    // diagnostics `code`, `fix` the `remedy`. No new literal codes here; this
    // site already produced DG-3's shape before DG-3 existed.
    const finding = { severity: 'warning', source: 'check-prerequisites', code: type, message };
    if (fix) finding.remedy = fix;
    diagnostics.record(finding);
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL INTEGRITY (Kernel Check)
// ═══════════════════════════════════════════════════════════════════════════

const checksumsFile = path.join('.magic', '.checksums');

if (fs.existsSync(checksumsFile)) {
    try {
        const checksums = JSON.parse(fs.readFileSync(checksumsFile, 'utf8'));
        const mismatchedFiles = [];
        for (const [relPath, storedHash] of Object.entries(checksums)) {
            if (relPath === '.checksums') continue;
            const normalizedRelPath = normalizePath(relPath);
            const fullPath = path.join('.magic', relPath);
            if (fs.existsSync(fullPath)) {
                const currentHash = hashFile(fullPath);
                if (currentHash !== storedHash) {
                    mismatchedFiles.push(normalizedRelPath);
                }
            }
        }
        for (const f of mismatchedFiles) {
            warn(
                'ENGINE_INTEGRITY',
                `'.magic/${f}' has been modified locally.`,
                'node .magic/scripts/executor.js update-engine-meta'
            );
        }
    } catch (e) {
        // Ignore parse errors
    }
} else {
    warn(
        'ENGINE_INTEGRITY',
        "'.magic/.checksums' is missing.",
        'node .magic/scripts/executor.js update-engine-meta'
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT INTEGRITY (Artifact Scan)
// ═══════════════════════════════════════════════════════════════════════════

const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
const indexPath = path.join(designDir, 'INDEX.md');
const planPath = path.join(designDir, 'PLAN.md');
const tasksPath = path.join(designDir, 'TASKS.md');

const indexExists = fs.existsSync(indexPath);
let rulesPath = path.join(designDir, 'RULES.md');
let rulesExists = fs.existsSync(rulesPath);

// Multi-workspace fallback: If RULES.md is not in workspace, check root .design/
if (!rulesExists && designDir !== '.design') {
    const rootRulesPath = path.join('.design', 'RULES.md');
    if (fs.existsSync(rootRulesPath)) {
        rulesPath = rootRulesPath;
        rulesExists = true;
    }
}

const planExists = fs.existsSync(planPath);
const tasksExists = fs.existsSync(tasksPath);

if (!indexExists) missing.push('INDEX.md');
if (!rulesExists) missing.push('RULES.md');
if (reqPlan && !planExists) missing.push('PLAN.md');
if (reqTasks && !tasksExists) missing.push('TASKS.md');

let specCount = 0;
let stableCount = 0;
let draftCount = 0;
let rfcCount = 0;

let indexContent = '';
let indexContentForMatch = '';
if (indexExists) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
    // SH-1: strip fenced/inline-quoted spans once, shared by every
    // `specifications/` extraction site below that reads INDEX.md.
    indexContentForMatch = stripQuoted(indexContent);
    stableCount = (indexContent.match(/\|\s*Stable\s*\|/g) || []).length;
    draftCount = (indexContent.match(/\|\s*Draft\s*\|/g) || []).length;
    rfcCount = (indexContent.match(/\|\s*RFC\s*\|/g) || []).length;
    specCount = stableCount + draftCount + rfcCount;
}

if (reqSpecs && stableCount === 0) {
    if (specCount === 0) missing.push('Stable specs (0 specs found)');
    else missing.push('Stable specs (only Draft/RFC found)');
}

if (draftCount > 0) warn('SPEC_STATUS', `${draftCount} specs are still in Draft status`, 'magic.spec');
if (rfcCount > 0) warn('SPEC_STATUS', `${rfcCount} specs are still in RFC status`, 'magic.spec');

if (planExists && indexExists) {
    const planContent = fs.readFileSync(planPath, 'utf8');
    // l1-scan-input-hygiene.md SH-1/SH-4: a spec filename quoted in a code
    // span or fence (e.g. a Backlog entry illustrating a template placeholder)
    // is a mention, not a reference — strip before matching, and bound the
    // capture to the filename grammar so one match can't span several
    // comma-separated tokens up to an unrelated closing paren.
    const planContentForMatch = stripQuoted(planContent);

    // SH-1 + SH-4: read from the stripped copy, bound to the filename grammar
    // — the pre-fix `[^)]*` capture doesn't exclude newlines, so a bare
    // `specifications/` mention in prose (no immediate closing `)`) could run
    // the match past the paragraph it started in.
    const indexSpecMatches = [...indexContentForMatch.matchAll(new RegExp(SPEC_FILENAME_SRC, 'g'))];
    const indexSpecs = [...new Set(indexSpecMatches.map(m => m[1]))];

    for (const spec of indexSpecs) {
        if (!fs.existsSync(path.join(designDir, 'specifications', spec))) {
            warn(
                'GHOST_REGISTRY',
                `'${spec}' is registered in INDEX.md but file is missing from ${designDir}/specifications/.`,
                'magic.analyze'
            );
        }

        // §1 Naming Convention Check
        if (!spec.startsWith('l1-') && !spec.startsWith('l2-')) {
            warn(
                'NAMING_VIOLATION',
                `'${spec}' does not follow the Layer Prefix rule (§1). Must start with 'l1-' or 'l2-'.`,
                'Rename file and update INDEX.md references'
            );
        }

        if (!planContentForMatch.includes(spec)) {
            warn(
                'ORPHANED_SPEC',
                `'${spec}' is in INDEX.md but missing from PLAN.md.`,
                'magic.task update'
            );
        }
    }

    const planSpecMatches = [...planContentForMatch.matchAll(new RegExp(SPEC_FILENAME_SRC, 'g'))];
    const planSpecs = [...new Set(planSpecMatches.map(m => m[1]))];

    for (const pSpec of planSpecs) {
        if (!indexSpecs.includes(pSpec)) {
            warn(
                'REGISTRY_MISMATCH',
                `'${pSpec}' is referenced in PLAN.md but missing from INDEX.md.`,
                'magic.spec --audit'
            );
        }
    }

    const indexVersionMatch = indexContent.match(/^\*\*Version:\*\*\s+([0-9.]+)/m);
    const planBasedOnMatch = planContent.match(/^\*\*Based on:\*\*\s+.*?v([0-9.]+)/m);

    if (indexVersionMatch && planBasedOnMatch) {
        const indexVersion = indexVersionMatch[1];
        const planBasedOn = planBasedOnMatch[1];
        if (indexVersion !== planBasedOn) {
            warn(
                'SYNC_GAP',
                `PLAN.md is based on INDEX.md v${planBasedOn}, but registry is at v${indexVersion}.`,
                'magic.task update'
            );
        }
    }

    // Rule 57: Layer Integrity
    // SH-1: iterate the stripped copy so a quoted mention in a code span
    // doesn't masquerade as a registry row.
    const lines = indexContentForMatch.split(/\r?\n/);
    for (const line of lines) {
        if (line.includes('| [') && line.includes('implementation')) {
            const specMatch = line.match(new RegExp(SPEC_FILENAME_SRC));
            if (specMatch) {
                const specFile = specMatch[1];
                const parts = line.split('|').map(s => s.trim());
                if (parts.length >= 5) {
                    const status = parts[3];
                    if (status === 'Stable' || status === 'RFC') {
                        const specPath = path.join(designDir, 'specifications', specFile);
                        if (fs.existsSync(specPath)) {
                            const specContent = stripQuoted(fs.readFileSync(specPath, 'utf8'));
                            // Extract parent link reliably — SH-1 + SH-4
                            const parentMatch = specContent.match(new RegExp(`\\*\\*Implements:\\*\\*\\s*(?:\\[.*?\\]\\()?${SPEC_FILENAME_SRC}\\)?`));
                            if (parentMatch) {
                                const parent = parentMatch[1];
                                const parentLine = lines.find(l => l.includes(`(specifications/${parent})`));
                                if (parentLine) {
                                    const parentParts = parentLine.split('|').map(s => s.trim());
                                    if (parentParts.length >= 5) {
                                        const parentStatus = parentParts[3];
                                        if (parentStatus && parentStatus !== 'Stable') {
                                            warn(
                                                'RULE_57_VIOLATION',
                                                `L2 spec '${specFile}' is ${status}, but its L1 parent '${parent}' is ${parentStatus} (Must be Stable).`,
                                                'magic.task update'
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN-DEBT BACKLOG (SC-2.4 / l1-session-continuity.md)
// ═══════════════════════════════════════════════════════════════════════════
//
// A plan can go mechanically clean — every check above passes — while still
// holding real, undone design work: Backlog entries that need a `/magic.spec`
// pass before anything is implementable. Every other Pre-flight gate tests
// mechanical drift (header parity, missing parents, collisions, checksums),
// none of which fires here, so nothing HALTs and the plan-complete funnel
// (SC-2.1(c)) recommends the very command that just produced no scope. This
// check gives Pre-flight the one signal it was missing to raise that HALT
// through the door rules/magic.md §5 already sanctions.

if (planExists && tasksExists) {
    const tasksContentForBacklog = fs.readFileSync(tasksPath, 'utf8');
    const activePhasesMatch = tasksContentForBacklog.match(/## Active Phases\r?\n([\s\S]*?)(?=\r?\n## |$)/);

    // Require a positive "empty" marker (the italicized `*None — ...*` this
    // engine's own workflows consistently write for an exhausted section —
    // e.g. Active Phases here, Backlog elsewhere) rather than merely the
    // absence of a phase-row table pattern. The absence-only reading fires
    // on any malformed or unrecognized section content too, which is the
    // wrong default for a check that can raise a HALT — uncertain must
    // resolve to "cannot determine", not to "complete".
    const planComplete = Boolean(activePhasesMatch) && /^\*None\b/m.test(activePhasesMatch[1].trim());

    if (planComplete) {
        // Read independently rather than reuse the `planContent` above — that
        // binding is scoped inside the separate `planExists && indexExists`
        // block and this check must not depend on INDEX.md being present.
        const planContentForBacklog = fs.readFileSync(planPath, 'utf8');
        const backlogMatch = planContentForBacklog.match(/## Backlog\r?\n([\s\S]*?)(?=\r?\n## |$)/);
        if (backlogMatch) {
            // SH-1/SH-2: strip fenced/inline-quoted spans before matching, so a
            // Backlog entry illustrating `- {example}` syntax in a code span is
            // not counted as an open item.
            const backlogBody = stripQuoted(backlogMatch[1]);
            // Top-level bullets only (`- `, not `  - ` sub-bullets). A bullet
            // whose design question is already answered but is kept visible
            // on purpose carries a trailing `*(Parked — {reason})*` marker
            // (l1-session-continuity.md SC-2.4 addendum, Backlog Disposition
            // Convention) — that is a deliberate, explicit signal, not a
            // wording guess, so it is the one exclusion this count applies.
            // Closed items (resolved/rejected/superseded) are expected to be
            // folded into the Backlog's own intro note and their bullet
            // deleted, not marked — so no separate "Closed" pattern to match.
            const openItems = backlogBody
                .split(/\r?\n/)
                .filter((l) => /^-\s+\S/.test(l) && !/\*\(Parked\b/.test(l));

            if (openItems.length > 0) {
                const workspaceName = normalizePath(designDir).split('/').pop();
                warn(
                    'DESIGN_DEBT_PENDING',
                    `Plan complete with no active phase, but ## Backlog holds ${openItems.length} open item(s) needing design input.`,
                    `magic.spec ${workspaceName}`
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE-HEADER PARITY (Spec Drift Detection)
// ═══════════════════════════════════════════════════════════════════════════

if (verifyHeaders && indexExists) {
    // SH-1: iterate the stripped copy — same reasoning as the Layer Integrity scan above.
    const lines = indexContentForMatch.split(/\r?\n/);
    for (const line of lines) {
        const specMatch = line.match(new RegExp(SPEC_FILENAME_SRC));
        if (!specMatch) continue;

        const specFile = specMatch[1];
        const specPath = path.join(designDir, 'specifications', specFile);
        if (!fs.existsSync(specPath)) continue; // GHOST_REGISTRY handles missing files

        // Extract INDEX.md values from table row: | [Name](path) | Status | Layer | Version |
        const parts = line.split('|').map(s => s.trim());
        if (parts.length < 5) continue;

        const indexStatus = parts[3];
        const indexVersion = parts[parts.length - 2]; // Version is second-to-last column

        // Read file header fields
        const specContent = fs.readFileSync(specPath, 'utf8');
        const fileVersionMatch = specContent.match(/^\*\*Version:\*\*\s+([0-9.]+)/m);
        const fileStatusMatch = specContent.match(/^\*\*Status:\*\*\s+(\w+)/m);

        // RE-1: the registry — not the file — decides whether a header must exist.
        // A valid INDEX value paired with a MISSING file header is drift, never a silent pass.

        // ── Version parity ──
        if (indexVersion && /^\d+\.\d+\.\d+$/.test(indexVersion)) {
            if (!fileVersionMatch) {
                warn(
                    'VERSION_DRIFT',
                    `'${specFile}' file header Version is MISSING but INDEX.md declares (${indexVersion}). Spec headers must mirror the registry.`,
                    `Run /magic.spec to restore the header, then re-run /magic.task`
                );
            } else if (fileVersionMatch[1] !== indexVersion) {
                warn(
                    'VERSION_DRIFT',
                    `'${specFile}' file header Version (${fileVersionMatch[1]}) ≠ INDEX.md (${indexVersion}). External edit without lifecycle protocol.`,
                    `Run /magic.spec to reconcile, then re-run /magic.task`
                );
            }
        }

        // ── Status parity ──
        if (indexStatus && ['Draft', 'RFC', 'Stable', 'Deprecated'].includes(indexStatus)) {
            if (!fileStatusMatch) {
                warn(
                    'STATUS_DRIFT',
                    `'${specFile}' file header Status is MISSING but INDEX.md declares (${indexStatus}). Spec headers must mirror the registry.`,
                    `Run /magic.spec to restore the header, then re-run /magic.task`
                );
            } else if (fileStatusMatch[1] !== indexStatus) {
                warn(
                    'STATUS_DRIFT',
                    `'${specFile}' file header Status (${fileStatusMatch[1]}) ≠ INDEX.md (${indexStatus}). External edit without lifecycle protocol.`,
                    `Run /magic.spec to reconcile, then re-run /magic.task`
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLE REGISTRY INTEGRITY (R9 / l2-role-integration.md §5)
// ═══════════════════════════════════════════════════════════════════════════

const rolesDir = path.join('.magic', 'roles');
const workflowsRoot = '.magic';
const templatesRoot = path.join('.magic', 'templates');
const roleRefPattern = /@role:([a-z][a-z0-9-]*)/g;

const roleRegistry = {
    total: 0,
    referenced: 0,
    dormant: 0,
    missing: [],
    dangling_handoffs: []
};

if (fs.existsSync(rolesDir)) {
    const cards = {};
    const roleIds = new Set();

    fs.readdirSync(rolesDir).filter(f => f.endsWith('.md')).forEach(cardFile => {
        const content = fs.readFileSync(path.join(rolesDir, cardFile), 'utf8');
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) return;

        const fm = fmMatch[1];
        const idMatch = fm.match(/^id:\s*(\S+)/m);
        if (!idMatch) return;

        const id = idMatch[1];
        roleIds.add(id);
        cards[id] = {
            file: cardFile,
            handoffTargets: [...fm.matchAll(/^\s*-\s*to:\s*(\S+)/gm)].map(m => m[1]),
            triggerWorkflows: [...fm.matchAll(/^\s*-\s*workflow:\s*(\S+)/gm)].map(m => m[1])
        };
    });

    roleRegistry.total = roleIds.size;

    const referencedIds = new Set();
    const scanRoots = [workflowsRoot, templatesRoot].filter(d => fs.existsSync(d));

    for (const root of scanRoots) {
        fs.readdirSync(root).filter(f => f.endsWith('.md')).forEach(file => {
            const content = fs.readFileSync(path.join(root, file), 'utf8');
            for (const match of content.matchAll(roleRefPattern)) {
                const refId = match[1];
                referencedIds.add(refId);
                if (!roleIds.has(refId)) {
                    const rel = normalizePath(path.join(root, file));
                    warn(
                        'ROLE_MISSING',
                        `'${rel}' references @role:${refId} but card is not in .magic/roles/.`,
                        'Create role card or correct reference'
                    );
                    if (!roleRegistry.missing.some(m => m.location === rel && m.id === refId)) {
                        roleRegistry.missing.push({ location: rel, id: refId });
                    }
                }
            }
        });
    }

    roleRegistry.referenced = referencedIds.size;

    for (const id of roleIds) {
        if (!referencedIds.has(id)) {
            warn(
                'ROLE_DORMANT',
                `Role card '${id}' exists but no workflow or template references @role:${id}.`,
                'Remove card or add workflow trigger reference'
            );
            roleRegistry.dormant++;
        }
    }

    for (const [id, info] of Object.entries(cards)) {
        for (const target of info.handoffTargets) {
            if (!roleIds.has(target)) {
                warn(
                    'ROLE_HANDOFF_DANGLING',
                    `Role '${id}' declares handoff to '${target}' but target card is missing.`,
                    'Create target role card or fix handoff reference'
                );
                roleRegistry.dangling_handoffs.push({ from: id, to: target });
            }
        }
        for (const wf of info.triggerWorkflows) {
            if (!fs.existsSync(path.join(workflowsRoot, wf))) {
                warn(
                    'ROLE_TRIGGER_UNRESOLVED',
                    `Role '${id}' triggers on workflow '${wf}' which does not exist in .magic/.`,
                    'Create workflow or fix trigger'
                );
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG DRIFT DETECTION (Kernel Safety)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if RULES.md files have uncommitted changes (manual edits outside workflow).
 * Uses git diff when available; skips silently if git is not installed or not a repo.
 */
function checkConfigDrift() {
    try {
        // Verify git is available and we're in a repo
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch {
        return; // No git or not a repo — skip silently
    }

    const rulesToCheck = [rulesPath];

    // C22: Also check workspace-specific RULES.md if it exists
    if (designDir !== '.design') {
        const wsRulesPath = path.join(designDir, 'RULES.md');
        if (fs.existsSync(wsRulesPath) && !rulesToCheck.includes(wsRulesPath)) {
            rulesToCheck.push(wsRulesPath);
        }
    }

    for (const rPath of rulesToCheck) {
        const posixPath = normalizePath(rPath);
        try {
            const diff = execSync(`git diff HEAD -- "${posixPath}"`, {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            if (diff.trim().length > 0) {
                warn(
                    'CONFIG_DRIFT',
                    `'${posixPath}' has uncommitted changes (modified outside workflow).`,
                    `Review changes: git diff HEAD -- ${posixPath}`
                );
            }
        } catch {
            // git diff failed for this path — skip silently
        }
    }
}

checkConfigDrift();

const integrity_ok = !warnings.some(w =>
    w.type === 'ENGINE_INTEGRITY' || w.type === 'GHOST_REGISTRY' ||
    w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT' ||
    w.type === 'ROLE_MISSING' || w.type === 'ROLE_HANDOFF_DANGLING'
);
const ok = missing.length === 0 && integrity_ok;

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION & OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

if (jsonOutput) {
    const date = new Date().toISOString().split('T')[0];
    const output = {
        ok,
        checked_at: date,
        design_dir: designDir,
        artifacts: {
            "INDEX.md": { exists: indexExists, path: normalizePath(indexPath) },
            "RULES.md": { exists: rulesExists, path: normalizePath(rulesPath) },
            "PLAN.md": { exists: planExists, path: normalizePath(planPath) },
            "TASKS.md": { exists: tasksExists, path: normalizePath(tasksPath) },
            "specs": { count: specCount, stable: stableCount, draft: draftCount }
        },
        role_registry: roleRegistry,
        missing_required: missing,
        warnings
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
} else {
    if (ok) {
        process.exit(0);
    } else {
        let errorMsg = `Missing required artifacts: ${missing.join(', ')}`;
        if (missing.includes('INDEX.md') && missing.includes('RULES.md')) {
            errorMsg += `. 💡 SDD structure missing. Run '/magic.init' to setup.`;
        }
        // For non-JSON mode, also print warnings as plain strings for backward compatibility
        for (const w of warnings) {
            const fixHint = w.fix ? ` 💡 Fix: ${w.fix}` : '';
            console.error(`[${w.type}] ${w.message}${fixHint}`);
        }
        if (missing.length > 0) {
            console.error(errorMsg);
        }
        process.exit(1);
    }
}
