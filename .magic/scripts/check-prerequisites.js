const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const reqPlan = args.includes('--require-plan');
const reqTasks = args.includes('--require-tasks');
const reqSpecs = args.includes('--require-specs');

const missing = [];
const warnings = [];

// Engine Integrity Check
const checksumsFile = path.join('.magic', '.checksums');
let checksumsMessageAdded = false;

if (fs.existsSync(checksumsFile)) {
    try {
        const checksums = JSON.parse(fs.readFileSync(checksumsFile, 'utf8'));
        for (const [relPath, storedHash] of Object.entries(checksums)) {
            if (relPath === '.checksums') continue;
            // Handle cross-platform paths
            const normalizedRelPath = relPath.replace(/\\/g, '/');
            const fullPath = path.join('.magic', relPath);
            if (fs.existsSync(fullPath)) {
                const currentHash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
                if (currentHash !== storedHash) {
                    // Do not fail immediately, add warning
                    warnings.push(`Engine Integrity: '.magic/${normalizedRelPath}' has been modified locally.`);
                }
            }
        }
    } catch (e) {
        // Ignore parse errors
    }
    if (warnings.length > 0) {
        // Appending the recovery hint to the last warning
        const oldLastLog = warnings[warnings.length - 1];
        warnings[warnings.length - 1] = oldLastLog + ` If changes were intentional, sync meta via: 'node .magic/scripts/executor.js update-engine-meta --workflow {workflow}'`;
    }
} else {
    warnings.push("Engine Integrity: '.magic/.checksums' is missing.");
}

const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
const indexPath = path.join(designDir, 'INDEX.md');
const rulesPath = path.join(designDir, 'RULES.md');
const planPath = path.join(designDir, 'PLAN.md');
const tasksPath = path.join(designDir, 'TASKS.md');

const indexExists = fs.existsSync(indexPath);
const rulesExists = fs.existsSync(rulesPath);
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

if (draftCount > 0) warnings.push(`${draftCount} specs are still in Draft status`);
if (rfcCount > 0) warnings.push(`${rfcCount} specs are still in RFC status`);

if (planExists && indexExists) {
    const planContent = fs.readFileSync(planPath, 'utf8');

    const indexSpecMatches = [...indexContent.matchAll(/specifications\/([^)]*\.md)/g)];
    const indexSpecs = [...new Set(indexSpecMatches.map(m => m[1]))];

    for (const spec of indexSpecs) {
        if (!fs.existsSync(path.join(designDir, 'specifications', spec))) {
            warnings.push(`Inconsistency: '${spec}' is registered in INDEX.md but file is missing from ${designDir}/specifications/`);
        }
        if (!planContent.includes(spec)) {
            warnings.push(`Orphaned specification: '${spec}' is in INDEX.md but missing from PLAN.md`);
        }
    }

    const planSpecMatches = [...planContent.matchAll(/specifications\/([^)]*\.md)/g)];
    const planSpecs = [...new Set(planSpecMatches.map(m => m[1]))];

    for (const pSpec of planSpecs) {
        if (!indexSpecs.includes(pSpec)) {
            warnings.push(`Registry Mismatch: '${pSpec}' is referenced in PLAN.md but missing from INDEX.md`);
        }
    }

    const indexVersionMatch = indexContent.match(/^\*\*Version:\*\*\s+([0-9.]+)/m);
    const planBasedOnMatch = planContent.match(/^\*\*Based on:\*\*\s+v?([0-9.]+)/m);

    if (indexVersionMatch && planBasedOnMatch) {
        const indexVersion = indexVersionMatch[1];
        const planBasedOn = planBasedOnMatch[1];
        if (indexVersion !== planBasedOn) {
            warnings.push(`Sync Gap: PLAN.md is based on INDEX.md v${planBasedOn}, but registry is at v${indexVersion}. Run 'node .magic/scripts/executor.js generate-plan' (magic.task) to sync.`);
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
                                            warnings.push(`Rule 57 Violation: L2 spec '${specFile}' is ${status}, but its L1 parent '${parent}' is ${parentStatus} (Must be Stable).`);
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

const integrity_ok = !warnings.some(w => w.includes('Engine Integrity:'));
const ok = missing.length === 0 && integrity_ok;

if (jsonOutput) {
    const date = new Date().toISOString().split('T')[0];
    const output = {
        ok,
        checked_at: date,
        design_dir: designDir,
        artifacts: {
            "INDEX.md": { exists: indexExists, path: indexPath.replace(/\\/g, '/') },
            "RULES.md": { exists: rulesExists, path: rulesPath.replace(/\\/g, '/') },
            "PLAN.md": { exists: planExists, path: planPath.replace(/\\/g, '/') },
            "TASKS.md": { exists: tasksExists, path: tasksPath.replace(/\\/g, '/') },
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
            errorMsg += `. 💡 SDD structure missing. Run '/magic.onboard' for a tutorial or '/magic.init' to setup.`;
        }
        console.error(errorMsg);
        process.exit(1);
    }
}
