const fs = require('fs');
const path = require('path');
const { hashFile, normalizePath } = require('./utils');
const { execSync } = require('child_process');

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
                'node .magic/scripts/executor.js update-engine-meta --workflow {workflow}'
            );
        }
    } catch (e) {
        // Ignore parse errors
    }
} else {
    warn(
        'ENGINE_INTEGRITY',
        "'.magic/.checksums' is missing.",
        'node .magic/scripts/executor.js update-engine-meta --workflow {workflow}'
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
if (indexExists) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
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

    const indexSpecMatches = [...indexContent.matchAll(/specifications\/([^)]*\.md)/g)];
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

        if (!planContent.includes(spec)) {
            warn(
                'ORPHANED_SPEC',
                `'${spec}' is in INDEX.md but missing from PLAN.md.`,
                'magic.task update'
            );
        }
    }

    const planSpecMatches = [...planContent.matchAll(/specifications\/([^)]*\.md)/g)];
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
    const lines = indexContent.split(/\r?\n/);
    for (const line of lines) {
        if (line.includes('| [') && line.includes('implementation')) {
            const specMatch = line.match(/specifications\/([^)]*\.md)/);
            if (specMatch) {
                const specFile = specMatch[1];
                const parts = line.split('|').map(s => s.trim());
                if (parts.length >= 5) {
                    const status = parts[3];
                    if (status === 'Stable' || status === 'RFC') {
                        const specPath = path.join(designDir, 'specifications', specFile);
                        if (fs.existsSync(specPath)) {
                            const specContent = fs.readFileSync(specPath, 'utf8');
                            // Extract parent link reliably
                            const parentMatch = specContent.match(/\*\*Implements:\*\*\s*(?:\[.*?\]\()?specifications\/([^)]*\.md)\)?/);
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
// FILE-HEADER PARITY (Spec Drift Detection)
// ═══════════════════════════════════════════════════════════════════════════

if (verifyHeaders && indexExists) {
    const lines = indexContent.split(/\r?\n/);
    for (const line of lines) {
        const specMatch = line.match(/specifications\/([^)]*\.md)/);
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

        if (fileVersionMatch && indexVersion) {
            const fileVersion = fileVersionMatch[1];
            if (fileVersion !== indexVersion && /^\d+\.\d+\.\d+$/.test(indexVersion)) {
                warn(
                    'VERSION_DRIFT',
                    `'${specFile}' file header Version (${fileVersion}) ≠ INDEX.md (${indexVersion}). External edit without lifecycle protocol.`,
                    `magic.spec or magic.analyze`
                );
            }
        }

        if (fileStatusMatch && indexStatus) {
            const fileStatus = fileStatusMatch[1];
            if (fileStatus !== indexStatus && ['Draft', 'RFC', 'Stable', 'Deprecated'].includes(indexStatus)) {
                warn(
                    'STATUS_DRIFT',
                    `'${specFile}' file header Status (${fileStatus}) ≠ INDEX.md (${indexStatus}). External edit without lifecycle protocol.`,
                    `magic.spec or magic.analyze`
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
    w.type === 'VERSION_DRIFT' || w.type === 'STATUS_DRIFT'
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
