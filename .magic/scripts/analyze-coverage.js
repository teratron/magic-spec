#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePath, loadGitignore } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE TAXONOMY — COVERAGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
//
// Classifies project source files by their coverage confidence level
// relative to specifications in the design workspace. Each file receives
// one of four confidence labels: EXTRACTED, INFERRED, AMBIGUOUS, UNCOVERED.

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & ARGUMENTS
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const scopeIdx = args.indexOf('--scope');
const scopeOverride = scopeIdx !== -1 && args[scopeIdx + 1]
    ? args[scopeIdx + 1]
    : null;

const designDir = process.env.MAGIC_DESIGN_DIR || '.design';
const workspaceScope = scopeOverride
    || process.env.MAGIC_WORKSPACE_SCOPE
    || null;

/** Directories always excluded from source scanning. */
const SKIP_DIRS = new Set([
    'node_modules', '.venv', '__pycache__', 'dist',
    '.git', '.pytest_cache', '.ruff_cache', '.references',
]);

/** Confidence taxonomy definitions. */
const TAXONOMY = {
    EXTRACTED: 'File path explicitly listed in spec Canonical References',
    INFERRED: 'File is a sibling of explicitly referenced paths',
    AMBIGUOUS: 'File is scope-adjacent but not directly referenced',
    UNCOVERED: 'No specification covers this file',
};

// ═══════════════════════════════════════════════════════════════════════════
// SPEC PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses the "Canonical References" table from a specification file and
 * extracts every `Path` cell value.
 *
 * @param {string} specPath - Absolute path to the specification .md file.
 * @returns {string[]} Array of path strings from the Path column.
 */
function parseCanonicalRefs(specPath) {
    const content = fs.readFileSync(specPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const refs = [];

    let inTable = false;
    let pathColIdx = -1;

    for (const line of lines) {
        // Detect the start of the Canonical References section
        if (/^##\s+Canonical References/i.test(line)) {
            inTable = true;
            pathColIdx = -1;
            continue;
        }

        // Any new heading breaks out of the section
        if (inTable && /^##\s+/.test(line)) {
            break;
        }

        if (!inTable) continue;

        const cells = line.split('|').map(c => c.trim());

        // Identify header row and find the Path column index
        if (pathColIdx === -1) {
            const idx = cells.findIndex(c => /^Path$/i.test(c));
            if (idx !== -1) {
                pathColIdx = idx;
            }
            continue;
        }

        // Skip separator rows (e.g., | :--- | :--- |)
        if (/^[\s|:-]+$/.test(line)) continue;

        // Extract path value, stripping backtick wrappers
        if (cells.length > pathColIdx) {
            const raw = cells[pathColIdx].replace(/`/g, '').trim();
            if (raw) {
                refs.push(normalizePath(raw));
            }
        }
    }

    return refs;
}

/**
 * Discovers all spec files and builds a mapping from referenced paths
 * to spec filenames, plus a list of directory-level references.
 *
 * @param {string} specsDir - Absolute path to the specifications/ directory.
 * @returns {{ pathToSpec: Map<string, string>, dirRefs: Array<{dir: string, spec: string}>, specRefs: Map<string, string[]> }}
 */
function buildRefIndex(specsDir) {
    /** @type {Map<string, string>} file path → spec filename */
    const pathToSpec = new Map();
    /** @type {Array<{dir: string, spec: string}>} directory-level refs */
    const dirRefs = [];
    /** @type {Map<string, string[]>} spec filename → all refs (for shadow detection) */
    const specRefs = new Map();

    if (!fs.existsSync(specsDir)) return { pathToSpec, dirRefs, specRefs };

    const specFiles = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));

    for (const specFile of specFiles) {
        const specPath = path.join(specsDir, specFile);
        const refs = parseCanonicalRefs(specPath);
        specRefs.set(specFile, refs);

        for (const ref of refs) {
            if (ref.endsWith('/')) {
                dirRefs.push({ dir: ref, spec: specFile });
            } else {
                pathToSpec.set(ref, specFile);
            }
        }
    }

    return { pathToSpec, dirRefs, specRefs };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively scans the project root for source files, respecting
 * skip-directories and .gitignore patterns.
 *
 * @param {string} rootDir - Project root directory (absolute).
 * @param {function(string): boolean} isIgnored - Gitignore test function.
 * @param {string|null} scope - Comma-separated scope prefixes, or null for full scan.
 * @returns {string[]} Array of forward-slash normalized relative paths.
 */
function scanProjectFiles(rootDir, isIgnored, scope) {
    const scopePrefixes = scope
        ? scope.split(',').map(s => normalizePath(s.trim()))
        : null;

    const results = [];

    /**
     * @param {string} dir - Current absolute directory path.
     */
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (SKIP_DIRS.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);
            const relPath = normalizePath(path.relative(rootDir, fullPath));

            if (isIgnored(relPath)) continue;

            if (entry.isDirectory()) {
                walk(fullPath);
            } else {
                // Scope filtering: only include files under scope prefixes
                if (scopePrefixes) {
                    const inScope = scopePrefixes.some(
                        prefix => relPath.startsWith(prefix + '/') || relPath === prefix
                    );
                    if (!inScope) continue;
                }
                results.push(relPath);
            }
        }
    }

    walk(rootDir);
    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classifies a single file against the reference index.
 *
 * @param {string} filePath - Forward-slash normalized relative path.
 * @param {Map<string, string>} pathToSpec - Exact-path → spec mapping.
 * @param {Array<{dir: string, spec: string}>} dirRefs - Directory-level references.
 * @param {Set<string>} extractedParents - Parent dirs of all EXTRACTED files.
 * @param {Set<string>} extractedGrandparents - Grandparent dirs of all EXTRACTED files.
 * @returns {{ confidence: string, spec: string|null, reason: string }}
 */
function classifyFile(filePath, pathToSpec, dirRefs, extractedParents, extractedGrandparents) {
    // 1. Exact match in Canonical References
    if (pathToSpec.has(filePath)) {
        return {
            confidence: 'EXTRACTED',
            spec: pathToSpec.get(filePath),
            reason: 'Listed in Canonical References',
        };
    }

    // 2. Contained inside a directory reference (e.g., .magic/templates/)
    for (const { dir, spec } of dirRefs) {
        if (filePath.startsWith(dir)) {
            return {
                confidence: 'EXTRACTED',
                spec,
                reason: `Inside referenced directory '${dir}'`,
            };
        }
    }

    // 3. Sibling inference — same parent directory as an EXTRACTED path
    const parentDir = normalizePath(path.dirname(filePath));
    if (extractedParents.has(parentDir)) {
        return {
            confidence: 'INFERRED',
            spec: null,
            reason: `Sibling of referenced paths in '${parentDir}/'`,
        };
    }

    // 4. Scope-adjacent — same grandparent directory
    const grandparentDir = normalizePath(path.dirname(parentDir));
    if (grandparentDir !== '.' && extractedGrandparents.has(grandparentDir)) {
        return {
            confidence: 'AMBIGUOUS',
            spec: null,
            reason: `Scope-adjacent to referenced paths under '${grandparentDir}/'`,
        };
    }

    // 5. No coverage
    return {
        confidence: 'UNCOVERED',
        spec: null,
        reason: 'No specification covers this file',
    };
}

/**
 * Builds the set of parent directories for all explicitly referenced paths.
 *
 * @param {Map<string, string>} pathToSpec - Exact-path → spec mapping.
 * @param {Array<{dir: string, spec: string}>} dirRefs - Directory-level references.
 * @returns {{ parents: Set<string>, grandparents: Set<string> }}
 */
function buildAncestorSets(pathToSpec, dirRefs) {
    const parents = new Set();
    const grandparents = new Set();

    for (const p of pathToSpec.keys()) {
        const parent = normalizePath(path.dirname(p));
        parents.add(parent);
        const gp = normalizePath(path.dirname(parent));
        if (gp !== '.') grandparents.add(gp);
    }

    for (const { dir } of dirRefs) {
        const cleaned = dir.replace(/\/$/, '');
        parents.add(cleaned);
        const gp = normalizePath(path.dirname(cleaned));
        if (gp !== '.') grandparents.add(gp);
    }

    return { parents, grandparents };
}

// ───────────────────────────────────────────────────────────────────────────
// Shadow Spec Detection
// ───────────────────────────────────────────────────────────────────────────

/**
 * Detects orphaned references in specs — paths listed in Canonical References
 * that no longer exist on disk.
 *
 * @param {Map<string, string[]>} specRefs - Spec filename → referenced paths.
 * @returns {Array<{spec: string, orphaned_refs: string[]}>}
 */
function detectShadowSpecs(specRefs) {
    const shadows = [];

    for (const [spec, refs] of specRefs.entries()) {
        const orphaned = [];
        for (const ref of refs) {
            const diskPath = ref.endsWith('/')
                ? ref.replace(/\/$/, '')
                : ref;
            if (!fs.existsSync(diskPath)) {
                orphaned.push(ref);
            }
        }
        if (orphaned.length > 0) {
            shadows.push({ spec, orphaned_refs: orphaned });
        }
    }

    return shadows;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION & OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

const rootDir = process.cwd();
const specsDir = path.join(rootDir, designDir, 'specifications');

const { pathToSpec, dirRefs, specRefs } = buildRefIndex(specsDir);
const { parents, grandparents } = buildAncestorSets(pathToSpec, dirRefs);

const isIgnored = loadGitignore(rootDir);
const files = scanProjectFiles(rootDir, isIgnored, workspaceScope);

const coverage = [];
const counts = { extracted: 0, inferred: 0, ambiguous: 0, uncovered: 0 };

for (const file of files) {
    const result = classifyFile(file, pathToSpec, dirRefs, parents, grandparents);
    coverage.push({
        file,
        confidence: result.confidence,
        spec: result.spec,
        reason: result.reason,
    });
    counts[result.confidence.toLowerCase()]++;
}

const total = coverage.length;
const coveredCount = counts.extracted + counts.inferred;
const coveragePercent = total > 0
    ? Math.round((coveredCount / total) * 1000) / 10
    : 0;

const shadowSpecs = detectShadowSpecs(specRefs);

// ───────────────────────────────────────────────────────────────────────────
// Output Rendering
// ───────────────────────────────────────────────────────────────────────────

if (jsonOutput) {
    const output = {
        confidence_taxonomy: TAXONOMY,
        coverage,
        summary: {
            total,
            extracted: counts.extracted,
            inferred: counts.inferred,
            ambiguous: counts.ambiguous,
            uncovered: counts.uncovered,
            coverage_percent: coveragePercent,
        },
        shadow_specs: shadowSpecs,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
}

// Human-readable output
console.log('');
console.log('CONFIDENCE TAXONOMY — Coverage Analysis');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Design directory : ${designDir}`);
console.log(`Workspace scope  : ${workspaceScope || '(full project)'}`);
console.log(`Total files      : ${total}`);
console.log('');

// Summary table
console.log('  Level       Count   Pct');
console.log('  ─────────── ─────── ──────');
console.log(`  EXTRACTED   ${String(counts.extracted).padStart(7)}   ${total ? ((counts.extracted / total) * 100).toFixed(1) : '0.0'}%`);
console.log(`  INFERRED    ${String(counts.inferred).padStart(7)}   ${total ? ((counts.inferred / total) * 100).toFixed(1) : '0.0'}%`);
console.log(`  AMBIGUOUS   ${String(counts.ambiguous).padStart(7)}   ${total ? ((counts.ambiguous / total) * 100).toFixed(1) : '0.0'}%`);
console.log(`  UNCOVERED   ${String(counts.uncovered).padStart(7)}   ${total ? ((counts.uncovered / total) * 100).toFixed(1) : '0.0'}%`);
console.log('');
console.log(`  Coverage (EXTRACTED + INFERRED): ${coveragePercent}%`);
console.log('');

// Uncovered files (if any, limited to 20)
if (counts.uncovered > 0) {
    console.log('UNCOVERED files:');
    console.log('───────────────────────────────────────────────────────────────');
    const uncovered = coverage.filter(c => c.confidence === 'UNCOVERED');
    const limit = Math.min(uncovered.length, 20);
    for (let i = 0; i < limit; i++) {
        console.log(`  ${uncovered[i].file}`);
    }
    if (uncovered.length > 20) {
        console.log(`  ... and ${uncovered.length - 20} more`);
    }
    console.log('');
}

// Shadow specs (orphaned references)
if (shadowSpecs.length > 0) {
    console.log('SHADOW SPECS (orphaned references):');
    console.log('───────────────────────────────────────────────────────────────');
    for (const s of shadowSpecs) {
        console.log(`  ${s.spec}:`);
        for (const ref of s.orphaned_refs) {
            console.log(`    - ${ref}`);
        }
    }
    console.log('');
}

process.exit(0);
