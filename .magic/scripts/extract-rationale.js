const fs = require('fs');
const path = require('path');
const { normalizePath } = require('./utils');

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

// ───────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────

/** Directories to skip during recursive file scanning. */
const SKIP_DIRS = new Set([
    'node_modules', '.venv', '__pycache__', 'dist', '.git',
    '.design', '.magic', '.pytest_cache', '.ruff_cache',
    '.references', '.agents', '.claude', '.gemini', '.codex',
    '.qwen', '.kilocode', '.lingma',
]);

/** Supported source file extensions for rationale extraction. */
const SOURCE_EXTENSIONS = new Set([
    '.js', '.ts', '.py', '.go', '.rs', '.java', '.c', '.cpp',
    '.rb', '.sh', '.ps1',
]);

/** Rationale marker keywords (upper-case canonical form). */
const MARKERS = [
    'NOTE', 'WHY', 'HACK', 'IMPORTANT', 'TODO',
    'FIXME', 'SAFETY', 'WARN', 'PERF',
];

/**
 * Extensions that use hash-prefixed comments (`# MARKER:`).
 * All others use double-slash comments (`// MARKER:`).
 */
const HASH_COMMENT_EXTENSIONS = new Set(['.py', '.sh', '.ps1', '.rb']);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a RegExp that matches rationale markers for a given file extension.
 *
 * For hash-comment languages: `# NOTE: ...`, `# WHY: ...`, etc.
 * For slash-comment languages: `// NOTE: ...`, `// WHY: ...`, etc.
 *
 * The regex is case-insensitive for the marker keyword and captures:
 *   group 1 — the marker keyword
 *   group 2 — the text after the marker
 *
 * @param {string} ext - File extension (e.g., `.js`, `.py`).
 * @returns {RegExp} Compiled regular expression.
 */
function buildPattern(ext) {
    const prefix = HASH_COMMENT_EXTENSIONS.has(ext) ? '#' : '\\/\\/';
    const markerGroup = MARKERS.join('|');
    return new RegExp(
        `${prefix}\\s*(${markerGroup}):\\s*(.+)`,
        'i',
    );
}

/**
 * Recursively collect source files from a directory, skipping excluded dirs.
 *
 * @param {string} dir - Root directory to scan.
 * @param {string[]} [results=[]] - Accumulator for recursive calls.
 * @returns {string[]} Array of absolute file paths.
 */
function collectSourceFiles(dir, results = []) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            collectSourceFiles(path.join(dir, entry.name), results);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SOURCE_EXTENSIONS.has(ext)) {
                results.push(path.join(dir, entry.name));
            }
        }
    }

    return results;
}

/**
 * Parse all specification files in the design directory and extract
 * Canonical Reference paths.
 *
 * Specifications live under `{designDir}/specifications/*.md`.
 * Each spec may contain a "## Canonical References" section with a
 * markdown table whose first column holds file/directory paths.
 *
 * @param {string} baseDesignDir - The design directory (e.g., `.design/engine`).
 * @returns {Map<string, string>} Map from normalized file path to spec filename.
 */
function loadCanonicalReferences(baseDesignDir) {
    /** @type {Map<string, string>} */
    const refMap = new Map();

    // Collect spec dirs to search — workspace-specific + root .design/
    const specDirs = [path.join(baseDesignDir, 'specifications')];

    // Also search root .design/ specifications when workspace is nested
    if (baseDesignDir !== '.design') {
        specDirs.push(path.join('.design', 'specifications'));

        // Search sibling workspaces listed in workspace.json
        const wsJsonPath = path.join('.design', 'workspace.json');
        if (fs.existsSync(wsJsonPath)) {
            try {
                const wsConfig = JSON.parse(fs.readFileSync(wsJsonPath, 'utf8'));
                const workspaces = wsConfig.workspaces || {};
                for (const wsName of Object.keys(workspaces)) {
                    const wsSpecDir = path.join('.design', wsName, 'specifications');
                    if (!specDirs.includes(wsSpecDir)) {
                        specDirs.push(wsSpecDir);
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }
    }

    for (const specDir of specDirs) {
        if (!fs.existsSync(specDir)) continue;

        let files;
        try {
            files = fs.readdirSync(specDir).filter(f => f.endsWith('.md'));
        } catch {
            continue;
        }

        for (const file of files) {
            const content = fs.readFileSync(path.join(specDir, file), 'utf8');
            const refs = extractReferencePaths(content);
            for (const ref of refs) {
                refMap.set(normalizePath(ref), file);
            }
        }
    }

    return refMap;
}

/**
 * Extract file/directory paths from a Canonical References markdown table.
 *
 * Expects lines like: `| \`.magic/scripts/executor.js\` | Description |`
 *
 * @param {string} content - Full markdown content of a spec file.
 * @returns {string[]} Array of extracted paths.
 */
function extractReferencePaths(content) {
    const paths = [];
    const lines = content.split(/\r?\n/);
    let inSection = false;

    for (const line of lines) {
        // Detect section start
        if (/^##\s+Canonical References/i.test(line)) {
            inSection = true;
            continue;
        }

        // Detect section end (next heading)
        if (inSection && /^##\s/.test(line)) {
            break;
        }

        if (!inSection) continue;

        // Skip table header and separator rows
        if (/^\|\s*:?-+/.test(line) || /^\|\s*Path\s*\|/i.test(line)) continue;

        // Extract path from first column — supports both backtick-wrapped
        // (| `path` |) and plain (| .magic/scripts/foo.js |) formats
        let extracted = null;
        const btMatch = line.match(/^\|\s*`([^`]+)`/);
        if (btMatch) {
            extracted = btMatch[1];
        } else {
            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
            if (cells.length >= 1 && cells[0] && !cells[0].startsWith(':') && !cells[0].startsWith('-')) {
                extracted = cells[0];
            }
        }
        if (extracted) {
            paths.push(extracted);
        }
    }

    return paths;
}

/**
 * Check if a file path is covered by any Canonical Reference.
 *
 * A file is considered covered if its normalized path starts with any
 * registered reference path (supporting both file and directory references).
 *
 * @param {string} filePath - Normalized relative file path.
 * @param {Map<string, string>} refMap - Map of reference path to spec name.
 * @returns {{ covered: boolean, spec: string|null }} Coverage result.
 */
function checkCoverage(filePath, refMap) {
    const normalized = normalizePath(filePath);

    // Direct match
    if (refMap.has(normalized)) {
        return { covered: true, spec: refMap.get(normalized) };
    }

    // Directory prefix match (e.g., `.magic/templates/` covers `.magic/templates/spec.md`)
    for (const [refPath, specFile] of refMap) {
        if (refPath.endsWith('/') && normalized.startsWith(refPath)) {
            return { covered: true, spec: specFile };
        }
        // Also match if the reference is a directory without trailing slash.
        // Verify via fs.existsSync + statSync to avoid false positives on
        // extensionless files (Makefile, Dockerfile, LICENSE).
        if (!refPath.endsWith('/') && !path.extname(refPath) && normalized.startsWith(refPath + '/')) {
            try {
                if (fs.existsSync(refPath) && fs.statSync(refPath).isDirectory()) {
                    return { covered: true, spec: specFile };
                }
            } catch {
                // Path doesn't exist or stat fails — skip
            }
        }
    }

    return { covered: false, spec: null };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine the list of directories to scan based on scope configuration.
 *
 * Priority: --scope flag > MAGIC_WORKSPACE_SCOPE env var > project root.
 *
 * @returns {string[]} Array of directory paths to scan.
 */
function resolveScanDirs() {
    if (scopeOverride) {
        return scopeOverride.split(',').map(s => s.trim()).filter(Boolean);
    }

    const envScope = process.env.MAGIC_WORKSPACE_SCOPE;
    if (envScope) {
        return envScope.split(',').map(s => s.trim()).filter(Boolean);
    }

    return ['.'];
}

/**
 * Scan source files for rationale-bearing comments.
 *
 * @param {string[]} scanDirs - Directories to scan.
 * @param {Map<string, string>} refMap - Canonical reference map.
 * @returns {{ rationale: object[], shadow_logic: object[], summary: object }}
 */
function scan(scanDirs, refMap) {
    /** @type {object[]} */
    const rationale = [];

    /** @type {Map<string, { count: number, markers: Set<string> }>} */
    const shadowFiles = new Map();

    /** @type {Map<string, number>} */
    const markerDist = new Map();

    const filesWithRationale = new Set();

    // Collect all source files
    const allFiles = [];
    for (const dir of scanDirs) {
        if (fs.existsSync(dir)) {
            collectSourceFiles(dir, allFiles);
        }
    }

    for (const absPath of allFiles) {
        const relPath = normalizePath(path.relative('.', absPath));
        const ext = path.extname(absPath).toLowerCase();
        const pattern = buildPattern(ext);

        let content;
        try {
            content = fs.readFileSync(absPath, 'utf8');
        } catch {
            continue;
        }

        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(pattern);
            if (!match) continue;

            const marker = match[1].toUpperCase();
            const text = match[2].trim();
            const { covered, spec } = checkCoverage(relPath, refMap);

            rationale.push({
                file: relPath,
                line: i + 1,
                marker,
                text,
                covered,
                spec,
            });

            filesWithRationale.add(relPath);
            markerDist.set(marker, (markerDist.get(marker) || 0) + 1);

            if (!covered) {
                if (!shadowFiles.has(relPath)) {
                    shadowFiles.set(relPath, { count: 0, markers: new Set() });
                }
                const entry = shadowFiles.get(relPath);
                entry.count++;
                entry.markers.add(marker);
            }
        }
    }

    // Build shadow_logic array
    const shadow_logic = [];
    for (const [file, info] of shadowFiles) {
        shadow_logic.push({
            file,
            count: info.count,
            markers: [...info.markers],
            suggestion: 'Consider creating a specification to formalize these design decisions',
        });
    }

    // Build summary
    const coveredCount = rationale.filter(r => r.covered).length;
    const summary = {
        total_rationale: rationale.length,
        covered_rationale: coveredCount,
        shadow_rationale: rationale.length - coveredCount,
        files_with_rationale: filesWithRationale.size,
        shadow_files: shadowFiles.size,
        marker_distribution: Object.fromEntries(
            [...markerDist.entries()].sort((a, b) => b[1] - a[1]),
        ),
    };

    return { rationale, shadow_logic, summary };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print a human-readable summary of rationale extraction results.
 *
 * @param {{ rationale: object[], shadow_logic: object[], summary: object }} result
 */
function printHumanReadable(result) {
    const { summary, shadow_logic, rationale } = result;

    console.log('Rationale Extraction Report');
    console.log('===========================\n');

    console.log(`Total rationale comments : ${summary.total_rationale}`);
    console.log(`Covered by specs         : ${summary.covered_rationale}`);
    console.log(`Shadow logic (uncovered) : ${summary.shadow_rationale}`);
    console.log(`Files with rationale     : ${summary.files_with_rationale}`);
    console.log(`Shadow files             : ${summary.shadow_files}`);

    // Marker distribution
    const dist = summary.marker_distribution;
    if (Object.keys(dist).length > 0) {
        console.log('\nMarker Distribution:');
        for (const [marker, count] of Object.entries(dist)) {
            console.log(`  ${marker.padEnd(12)} ${count}`);
        }
    }

    // Shadow logic details
    if (shadow_logic.length > 0) {
        console.log('\nShadow Logic (uncovered files):');
        for (const entry of shadow_logic) {
            console.log(`  ${entry.file} (${entry.count} comments: ${entry.markers.join(', ')})`);
        }
        console.log('\n  These files contain design decisions not captured in any specification.');
        console.log('  Consider running magic.spec to formalize them.');
    }

    // Covered rationale details
    const covered = rationale.filter(r => r.covered);
    if (covered.length > 0) {
        console.log('\nCovered Rationale:');
        for (const r of covered) {
            console.log(`  ${r.file}:${r.line} [${r.marker}] ${r.text}`);
            console.log(`    -> spec: ${r.spec}`);
        }
    }

    if (summary.total_rationale === 0) {
        console.log('\nNo rationale comments found in scanned files.');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const scanDirs = resolveScanDirs();
const refMap = loadCanonicalReferences(designDir);
const result = scan(scanDirs, refMap);

if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
} else {
    printHumanReadable(result);
}

process.exit(0);
