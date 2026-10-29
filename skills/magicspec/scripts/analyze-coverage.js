#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('analyze-coverage', module);

const fs = require('fs');
const path = require('path');
const {
    normalizePath,
    loadGitignore,
    resolveProjectRoot,
    compilePathEntry,
    compilePathSet,
    isSkippedDir,
    STATE_DIR_NAME,
    BUILD_NOISE_DIRS,
} = require('./utils');

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
// `--scope x` and `--scope=x` mean the same.
const scopeIdx = args.findIndex((a) => a === '--scope' || a.startsWith('--scope='));
const scopeOverride =
    scopeIdx === -1
        ? null
        : args[scopeIdx].startsWith('--scope=')
          ? args[scopeIdx].slice('--scope='.length) || null
          : args[scopeIdx + 1] || null;

const designDir = process.env.MAGIC_DESIGN_DIR || STATE_DIR_NAME;
const workspaceScope = scopeOverride || process.env.MAGIC_WORKSPACE_SCOPE || null;

/**
 * Shared build-noise floor plus this scanner's domain excludes.
 * `.magicspec` and the engine folder are deliberately NOT excluded — spec artifacts and
 * engine files are classified against Canonical References like any source.
 */
const SKIP_DIRS = new Set([...BUILD_NOISE_DIRS, '.references']);

/** Confidence taxonomy definitions. */
const TAXONOMY = {
    EXTRACTED: 'File path explicitly listed in spec Canonical References',
    INFERRED: 'File is a sibling of explicitly referenced paths',
    AMBIGUOUS: 'File is scope-adjacent but not directly referenced',
    UNCOVERED: 'No specification covers this file',
    EXEMPT: 'SDD bookkeeping/journal file — not a coverage subject, excluded from the denominator',
};

/**
 * Basenames of `.magicspec/` bookkeeping/journal files: the SDD process's own
 * state, never meant to appear in a spec's Canonical References. Counting
 * them alongside implementation source makes reported coverage fall as
 * project history accumulates (archived phase journals in particular).
 */
const EXEMPT_BASENAMES = new Set([
    'PLAN.md',
    'TASKS.md',
    'STATE.md',
    'CONTEXT.md',
    'CHANGELOG.md',
    'RETROSPECTIVE.md',
]);

/**
 * A file is EXEMPT when it sits under `.magicspec/` and is either one of the
 * fixed bookkeeping basenames or an archived phase journal (any path segment
 * named `archives`). Deliberately scoped — `specifications/`, `INDEX.md`,
 * `RULES.md`, `workspace.json`, and active `tasks/*.md` are NOT exempted.
 *
 * @param {string} filePath - Forward-slash normalized, repo-root-relative path.
 * @returns {boolean}
 */
function isExemptFile(filePath) {
    if (!filePath.startsWith(`${STATE_DIR_NAME}/`)) return false;
    if (EXEMPT_BASENAMES.has(path.basename(filePath))) return true;
    return filePath.split('/').includes('archives');
}

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

        const cells = line.split('|').map((c) => c.trim());

        // Identify header row and find the Path column index
        if (pathColIdx === -1) {
            const idx = cells.findIndex((c) => /^Path$/i.test(c));
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
 * Discovers all spec files and builds the reference index: every Canonical Reference as a
 * compiled path-set entry (a file, a folder with or without a trailing slash, or a pattern —
 * one definition in `utils.compilePathEntry`), plus the exact-path map and the per-spec lists.
 *
 * @param {string} specsDir - Absolute path to the specifications/ directory.
 * @returns {{ pathToSpec: Map<string, string>, refEntries: Array<{ref: string, spec: string, matcher: ReturnType<typeof compilePathEntry>}>, specRefs: Map<string, string[]> }}
 */
function buildRefIndex(specsDir) {
    /** @type {Map<string, string>} literal file path → spec filename (the last spec to name it wins) */
    const pathToSpec = new Map();
    /** @type {Array<{ref: string, spec: string, matcher: ReturnType<typeof compilePathEntry>}>} */
    const refEntries = [];
    /** @type {Map<string, string[]>} spec filename → all refs (for shadow detection) */
    const specRefs = new Map();

    if (!fs.existsSync(specsDir)) return { pathToSpec, refEntries, specRefs };

    const specFiles = fs.readdirSync(specsDir).filter((f) => f.endsWith('.md'));

    for (const specFile of specFiles) {
        const specPath = path.join(specsDir, specFile);
        const refs = parseCanonicalRefs(specPath);
        specRefs.set(specFile, refs);

        for (const ref of refs) {
            const matcher = compilePathEntry(ref);
            refEntries.push({ ref, spec: specFile, matcher });
            if (!matcher.isPattern && !ref.endsWith('/')) pathToSpec.set(matcher.source, specFile);
        }
    }

    return { pathToSpec, refEntries, specRefs };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively scans the project root for files, respecting skip-directories and
 * .gitignore patterns. The scope is applied by the caller, so the Zero-Match Guard
 * can tell an entry that matches nothing from a file that was never scanned.
 *
 * @param {string} rootDir - Project root directory (absolute).
 * @param {function(string): boolean} isIgnored - Gitignore test function.
 * @returns {string[]} Array of forward-slash normalized relative paths.
 */
function scanProjectFiles(rootDir, isIgnored) {
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
            const fullPath = path.join(dir, entry.name);
            const relPath = normalizePath(path.relative(rootDir, fullPath));

            if (isSkippedDir(SKIP_DIRS, entry.name, relPath)) continue;
            if (isIgnored(relPath)) continue;

            if (entry.isDirectory()) {
                walk(fullPath);
            } else {
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
 * @param {Array<{ref: string, spec: string, matcher: ReturnType<typeof compilePathEntry>}>} refEntries - Every reference, compiled.
 * @param {Set<string>} extractedParents - Parent dirs of all EXTRACTED files.
 * @param {Set<string>} extractedGrandparents - Grandparent dirs of all EXTRACTED files.
 * @returns {{ confidence: string, spec: string|null, reason: string }}
 */
function classifyFile(filePath, pathToSpec, refEntries, extractedParents, extractedGrandparents) {
    // 1. Exact match in Canonical References
    if (pathToSpec.has(filePath)) {
        return {
            confidence: 'EXTRACTED',
            spec: pathToSpec.get(filePath),
            reason: 'Listed in Canonical References',
        };
    }

    // 2. Covered by a folder reference (with or without a trailing slash) or a pattern reference
    for (const { ref, spec, matcher } of refEntries) {
        if (matcher.test(filePath)) {
            return {
                confidence: 'EXTRACTED',
                spec,
                reason: matcher.isPattern
                    ? `Matches referenced pattern '${ref}'`
                    : `Inside referenced directory '${ref}'`,
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
 * Builds the set of parent directories for all explicitly referenced paths. A literal file
 * contributes its folder; a folder reference and a pattern's static prefix contribute that
 * folder itself.
 *
 * @param {Map<string, string>} pathToSpec - Exact-path → spec mapping.
 * @param {Array<{ref: string, matcher: ReturnType<typeof compilePathEntry>}>} refEntries - Every reference, compiled.
 * @returns {{ parents: Set<string>, grandparents: Set<string> }}
 */
function buildAncestorSets(pathToSpec, refEntries) {
    const parents = new Set();
    const grandparents = new Set();

    for (const p of pathToSpec.keys()) {
        const parent = normalizePath(path.dirname(p));
        parents.add(parent);
        const gp = normalizePath(path.dirname(parent));
        if (gp !== '.') grandparents.add(gp);
    }

    for (const { ref, matcher } of refEntries) {
        let dir = null;
        if (matcher.isPattern) dir = matcher.staticPrefix;
        else if (ref.endsWith('/')) dir = matcher.source;
        if (!dir) continue;
        parents.add(dir);
        const gp = normalizePath(path.dirname(dir));
        if (gp !== '.') grandparents.add(gp);
    }

    return { parents, grandparents };
}

// ───────────────────────────────────────────────────────────────────────────
// Shadow Spec Detection
// ───────────────────────────────────────────────────────────────────────────

/**
 * Detects orphaned references in specs — paths listed in Canonical References
 * that no longer exist on disk. A pattern reference is orphaned when it matches no
 * scanned file; testing the raw pattern string for existence would call every pattern a ghost.
 *
 * @param {Map<string, string[]>} specRefs - Spec filename → referenced paths.
 * @param {string[]} scannedFiles - Every file the scan saw, before the scope is applied.
 * @returns {Array<{spec: string, orphaned_refs: string[]}>}
 */
function detectShadowSpecs(specRefs, scannedFiles) {
    const shadows = [];

    for (const [spec, refs] of specRefs.entries()) {
        const orphaned = [];
        for (const ref of refs) {
            const matcher = compilePathEntry(ref);
            if (matcher.isPattern) {
                if (!scannedFiles.some((f) => matcher.test(f))) orphaned.push(ref);
                continue;
            }
            const diskPath = ref.endsWith('/') ? ref.replace(/\/$/, '') : ref;
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

const rootDir = resolveProjectRoot();
const specsDir = path.join(rootDir, designDir, 'specifications');

const { pathToSpec, refEntries, specRefs } = buildRefIndex(specsDir);
const { parents, grandparents } = buildAncestorSets(pathToSpec, refEntries);

const isIgnored = loadGitignore(rootDir);
const scannedFiles = scanProjectFiles(rootDir, isIgnored);

// Zero-Match Guard: an entry that matches nothing is reported, so an empty scan is never
// mistaken for a clean one.
/** @type {Array<{type: string, message: string, fix: string}>} */
const warnings = [];
const scopeSet = workspaceScope ? compilePathSet(workspaceScope.split(',')) : null;
const files = scopeSet ? scannedFiles.filter((f) => scopeSet.matches(f)) : scannedFiles;
if (scopeSet) {
    for (const entry of scopeSet.unmatched(scannedFiles)) {
        warnings.push({
            type: 'SCOPE_NO_MATCH',
            message: `Scope entry '${entry.entry}' matches no file in the project.`,
            fix: 'Correct the entry in workspace.json (a folder, a file, or a pattern with * and **).',
        });
    }
}
for (const { ref, spec, matcher } of refEntries) {
    if (matcher.isPattern && !scannedFiles.some((f) => matcher.test(f))) {
        warnings.push({
            type: 'REF_NO_MATCH',
            message: `Canonical Reference pattern '${ref}' in ${spec} matches no file in the project.`,
            fix: `Correct or remove the reference in ${spec}.`,
        });
    }
}

const coverage = [];
const counts = { extracted: 0, inferred: 0, ambiguous: 0, uncovered: 0, exempt: 0 };

for (const file of files) {
    if (isExemptFile(file)) {
        coverage.push({ file, confidence: 'EXEMPT', spec: null, reason: TAXONOMY.EXEMPT });
        counts.exempt++;
        continue;
    }
    const result = classifyFile(file, pathToSpec, refEntries, parents, grandparents);
    coverage.push({
        file,
        confidence: result.confidence,
        spec: result.spec,
        reason: result.reason,
    });
    counts[result.confidence.toLowerCase()]++;
}

const total = counts.extracted + counts.inferred + counts.ambiguous + counts.uncovered;
const coveredCount = counts.extracted + counts.inferred;
const coveragePercent = total > 0 ? Math.round((coveredCount / total) * 1000) / 10 : 0;

const shadowSpecs = detectShadowSpecs(specRefs, scannedFiles);

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
            exempt: counts.exempt,
            coverage_percent: coveragePercent,
        },
        shadow_specs: shadowSpecs,
        warnings,
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
console.log(`Total files      : ${total} (+ ${counts.exempt} EXEMPT, excluded from coverage math)`);
console.log('');

// Summary table
console.log('  Level       Count   Pct');
console.log('  ─────────── ─────── ──────');
console.log(
    `  EXTRACTED   ${String(counts.extracted).padStart(7)}   ${total ? ((counts.extracted / total) * 100).toFixed(1) : '0.0'}%`,
);
console.log(
    `  INFERRED    ${String(counts.inferred).padStart(7)}   ${total ? ((counts.inferred / total) * 100).toFixed(1) : '0.0'}%`,
);
console.log(
    `  AMBIGUOUS   ${String(counts.ambiguous).padStart(7)}   ${total ? ((counts.ambiguous / total) * 100).toFixed(1) : '0.0'}%`,
);
console.log(
    `  UNCOVERED   ${String(counts.uncovered).padStart(7)}   ${total ? ((counts.uncovered / total) * 100).toFixed(1) : '0.0'}%`,
);
console.log(`  EXEMPT      ${String(counts.exempt).padStart(7)}   (excluded from denominator)`);
console.log('');
console.log(`  Coverage (EXTRACTED + INFERRED): ${coveragePercent}%`);
console.log('');

// Uncovered files (if any, limited to 20)
if (counts.uncovered > 0) {
    console.log('UNCOVERED files:');
    console.log('───────────────────────────────────────────────────────────────');
    const uncovered = coverage.filter((c) => c.confidence === 'UNCOVERED');
    const limit = Math.min(uncovered.length, 20);
    for (let i = 0; i < limit; i++) {
        console.log(`  ${uncovered[i].file}`);
    }
    if (uncovered.length > 20) {
        console.log(`  ... and ${uncovered.length - 20} more`);
    }
    console.log('');
}

// Zero-match warnings
if (warnings.length > 0) {
    console.log('WARNINGS:');
    console.log('───────────────────────────────────────────────────────────────');
    for (const w of warnings) console.log(`  ${w.type}: ${w.message}`);
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
