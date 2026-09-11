#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeFileSafe } = require('../../.magic/scripts/utils');

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION SYNC — Real Content Sync, Not Version Stamping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Brings documentation in sync with its actual sources of truth:
 *
 *   CONTRIBUTING.md  ←  templates/contributing.md + RULES.md + INDEX.md +
 *                       workflows/*.md
 *   docs/{name}.md   ←  workflows/magic.{name}.md   (Triggers, Slash command,
 *                                                    and Sync Note version)
 *
 * Anti-thrash guarantees (the reason this file was rewritten):
 *
 *   1. CONTRIBUTING.md no longer carries `today's date` — the footer renders
 *      the **mtime of the most recent source file**. Two consecutive runs
 *      with no source change produce byte-identical output.
 *   2. docs/*.md no longer get a global `vX.Y.Z` regex sweep. Each doc has
 *      a single anchored "Sync Note" line that holds the engine version.
 *   3. Sync Notes are only refreshed when the corresponding workflow source
 *      was modified (per stored hash in `dev/.cache/.docs-state.json`) or when
 *      the engine version itself bumped — whichever applies.
 *   4. Triggers / Slash command lines are propagated from workflow frontmatter
 *      using anchored line patterns; if a doc lacks the line, we leave it
 *      alone instead of inventing one.
 */

const projectRoot = process.cwd();
const magicDir = path.join(projectRoot, '.magic');
const versionFile = path.join(magicDir, '.version');
const templatePath = path.join(magicDir, 'templates', 'contributing.md');
// State cache lives under dev/.cache/ — it's a dev-only artifact owned by this
// script, must not ship with the distributable engine (.magic/).
const stateCacheDir = path.join(projectRoot, 'dev', '.cache');
const stateFile = path.join(stateCacheDir, '.docs-state.json');

const contributingPath = path.join(projectRoot, 'CONTRIBUTING.md');
const rulesPath = path.join(projectRoot, '.design', 'RULES.md');
const indexPath = path.join(projectRoot, '.design', 'INDEX.md');
const workflowsDir = path.join(projectRoot, 'workflows');
const skillsDir = path.join(projectRoot, 'skills');
const docsDir = path.join(projectRoot, 'docs');

const RULES_MISSING_BLOCK = '> [!WARNING]\n> Project constitution (RULES.md) missing. No rules inferred.\n';
const REGISTRY_EMPTY_BLOCK = '| Workspace | Description |\n| --- | --- |\n| `root` | No workspaces registered |\n';

// ───────────────────────────────────────────────────────────────────────────
// State Management
// ───────────────────────────────────────────────────────────────────────────

function defaultState() {
    return { workflows: {}, skills: {}, contributing: null };
}

function readState() {
    if (!fs.existsSync(stateFile)) return defaultState();
    try {
        const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        raw.workflows ||= {};
        raw.skills ||= {};
        return raw;
    } catch {
        return defaultState();
    }
}

function writeState(state) {
    if (!fs.existsSync(stateCacheDir)) fs.mkdirSync(stateCacheDir, { recursive: true });
    writeFileSafe(stateFile, JSON.stringify(state, null, 2) + '\n');
}

function sha(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function readIfExists(p) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Source Date — most recent mtime among source files
// ───────────────────────────────────────────────────────────────────────────

/**
 * Every `.md` file directly under `dir`, as absolute paths. Empty when `dir`
 * does not exist.
 *
 * @param {string} dir - Absolute directory path.
 * @returns {string[]}
 */
function markdownFilesIn(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(dir, f));
}

/**
 * Every `skills/{name}/SKILL.md` that actually exists, as absolute paths.
 *
 * @returns {string[]}
 */
function skillWrapperFiles() {
    if (!fs.existsSync(skillsDir)) return [];
    return fs.readdirSync(skillsDir)
        .map(dir => path.join(skillsDir, dir, 'SKILL.md'))
        .filter(f => fs.existsSync(f));
}

/**
 * Lists every file that can influence CONTRIBUTING.md's content: the fixed
 * trio (template, RULES.md, INDEX.md), every `workflows/*.md`, and every
 * `skills/{name}/SKILL.md`. Existence is not guaranteed for the fixed trio —
 * callers filter.
 *
 * @returns {string[]} Candidate absolute paths.
 */
function collectContributingSources() {
    return [templatePath, rulesPath, indexPath, ...markdownFilesIn(workflowsDir), ...skillWrapperFiles()];
}

/**
 * @param {string[]} paths - Candidate paths; non-existent entries are skipped.
 * @returns {number} The latest mtime in milliseconds, or 0 if none exist.
 */
function latestMtimeMs(paths) {
    let latest = 0;
    for (const p of paths) {
        if (!fs.existsSync(p)) continue;
        const m = fs.statSync(p).mtimeMs;
        if (m > latest) latest = m;
    }
    return latest;
}

/**
 * Returns ISO date (YYYY-MM-DD) of the most recently modified source file
 * involved in CONTRIBUTING regeneration. Stable across runs as long as the
 * sources don't change — eliminates `today` thrash in the footer.
 */
function lastSourceDate() {
    const latest = latestMtimeMs(collectContributingSources());
    return new Date(latest || Date.now()).toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRIBUTING.md REGENERATION
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Project Name Resolution
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {string|null} The `meta.name` field from `.design/workspace.json`,
 *          or `null` when the file is absent, unparsable, or carries no name.
 */
function projectNameFromWorkspaceJson() {
    const wsJsonPath = path.join(projectRoot, '.design', 'workspace.json');
    if (!fs.existsSync(wsJsonPath)) return null;
    try {
        const ws = JSON.parse(fs.readFileSync(wsJsonPath, 'utf8'));
        return ws.meta?.name || null;
    } catch {
        return null;
    }
}

/**
 * Resolves the project display name for generated documentation.
 * Resolution order:
 *   1. workspace.json → meta.name  (explicit project config)
 *   2. MAGIC_PROJECT_NAME env var  (CI/runtime override)
 *   3. basename of cwd             (zero-config fallback)
 *
 * @returns {string}
 */
function getProjectName() {
    return projectNameFromWorkspaceJson() || process.env.MAGIC_PROJECT_NAME || path.basename(projectRoot);
}

// ───────────────────────────────────────────────────────────────────────────
// Content Block Extraction
// ───────────────────────────────────────────────────────────────────────────

/**
 * Extracts RULES.md §1–§6 (between the `## 1.` and `## 7.` headings) for
 * embedding in CONTRIBUTING.md. Falls back to a missing-constitution notice
 * when RULES.md is absent or doesn't contain a recognizable `## 1.` heading;
 * a present `## 1.` with no `## 7.` still extracts to the end of the file.
 *
 * @returns {string}
 */
function extractRulesBlock() {
    if (!fs.existsSync(rulesPath)) return RULES_MISSING_BLOCK;
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const r1 = rulesContent.indexOf('## 1.');
    if (r1 === -1) return RULES_MISSING_BLOCK;
    const r7 = rulesContent.indexOf('## 7.');
    return (r7 !== -1 ? rulesContent.substring(r1, r7) : rulesContent.substring(r1)).trim();
}

/**
 * Extracts the `## Workspaces` table from INDEX.md for embedding in
 * CONTRIBUTING.md. Falls back to an empty-registry placeholder when
 * INDEX.md is absent or carries no recognizable table under that heading.
 *
 * @returns {string}
 */
function extractRegistryBlock() {
    if (!fs.existsSync(indexPath)) return REGISTRY_EMPTY_BLOCK;
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const start = indexContent.indexOf('## Workspaces');
    if (start === -1) return REGISTRY_EMPTY_BLOCK;
    const tableStart = indexContent.indexOf('|', start);
    if (tableStart === -1) return REGISTRY_EMPTY_BLOCK;
    const tableEnd = indexContent.indexOf('\n##', tableStart);
    return (tableEnd !== -1 ? indexContent.substring(tableStart, tableEnd) : indexContent.substring(tableStart)).trim();
}

/**
 * Builds the `| Command | Description |` table from every `workflows/*.md`
 * frontmatter `description:` field.
 *
 * @returns {string}
 */
function buildWorkflowsTable() {
    let table = '| Command | Description |\n| --- | --- |\n';
    if (!fs.existsSync(workflowsDir)) return table;
    const wfFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md')).sort();
    for (const file of wfFiles) {
        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
        const m = content.match(/description:\s*(.*)/);
        const command = file.replace('.md', '');
        const description = m ? m[1].trim() : 'No description provided';
        table += `| \`/${command}\` | ${description} |\n`;
    }
    return table;
}

function generateContributing(targetVersion, state) {
    if (!fs.existsSync(templatePath)) return false;

    const template = fs.readFileSync(templatePath, 'utf8');

    const directoryTree = `root-project/
├── .agents/workflows/        # Slash commands wrapper (e.g., magic.spec, magic.task)
├── .magic/                   # The SDD Engine (workflow logic and scripts - read-only)
└── .design/                  # Your Project Design Workspace (INDEX.md, RULES.md, PLAN.md)`;

    const sourceDate = lastSourceDate();

    const rendered = template
        .replace(/{{project_name}}/g, getProjectName())
        .replace(/{{VERSION}}/g, targetVersion)
        .replace(/{{engine_version}}/g, targetVersion)
        .replace(/{{workflows_table}}/g, buildWorkflowsTable().trim())
        .replace(/{{DATE}}/g, sourceDate)
        .replace(/{{rules_block}}/g, extractRulesBlock())
        .replace(/{{registry_block}}/g, extractRegistryBlock())
        .replace(/{{directory_tree}}/g, directoryTree)
        .replace(/{{setup_command}}/g, 'node .magic/scripts/executor.js check-prerequisites --json');

    // Idempotency: skip write if content hasn't changed
    const existing = readIfExists(contributingPath);
    if (existing === rendered) {
        console.log('  ℹ️  CONTRIBUTING.md — already current');
        return false;
    }

    if (writeFileSafe(contributingPath, rendered)) {
        console.log(`  ✅ CONTRIBUTING.md regenerated (sourceDate=${sourceDate}, v${targetVersion})`);
        state.contributing = sha(rendered);
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// docs/{name}.md SYNC FROM workflows/magic.{name}.md
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes the three independent "did anything change" signals for one
 * docs/{name}.md ↔ workflows/magic.{name}.md ↔ skills/{key}/SKILL.md triple,
 * plus the raw content/hashes callers need to act on them.
 *
 * @param {string} wfPath - Absolute path to the workflow source (exists).
 * @param {string} skillPath - Absolute path to the skill wrapper (may not exist).
 * @param {string} targetVersion - Engine version this sync run targets.
 * @param {Object} state - Persisted sync state (read, not mutated here).
 * @param {string} wfName - State key for the workflow (`magic.{name}.md`).
 * @param {string} skillKey - State key for the skill (`magic-{name}`).
 * @returns {{
 *   wfContent: string, wfHash: string, skillHash: string|null,
 *   wfChanged: boolean, skillChanged: boolean, versionChanged: boolean
 * }}
 */
function computeSyncSignals(wfPath, skillPath, targetVersion, state, wfName, skillKey) {
    const wfContent = fs.readFileSync(wfPath, 'utf8');
    const wfHash = sha(wfContent);
    const prev = state.workflows[wfName] || {};

    const skillContent = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : null;
    const skillHash = skillContent ? sha(skillContent) : null;
    const prevSkill = state.skills[skillKey] || {};

    return {
        wfContent,
        wfHash,
        skillHash,
        wfChanged: prev.hash !== wfHash,
        skillChanged: skillHash !== null && prevSkill.hash !== skillHash,
        versionChanged: prev.version !== targetVersion,
    };
}

/**
 * Replaces the `**Triggers:** ...` line with the workflow's own line,
 * verbatim. Leaves `content` untouched when the workflow declares no
 * Triggers line — inventing one is not this sync's job.
 *
 * @param {string} content - Current doc content.
 * @param {string} wfContent - Source workflow content.
 * @returns {string}
 */
function syncTriggersLine(content, wfContent) {
    const wfTriggers = wfContent.match(/^\*\*Triggers:\*\*\s+(.+)$/m);
    if (!wfTriggers) return content;
    const newLine = `**Triggers:** ${wfTriggers[1].trim()}`;
    return content.replace(/^\*\*Triggers:\*\*\s+.+$/m, newLine);
}

/**
 * Replaces the `**Slash command:** ...` line, deriving the command name from
 * the workflow's own filename while preserving any trailing " [arg]"-style
 * suffix the doc already advertises. Leaves `content` untouched when the doc
 * carries no recognizable Slash command line.
 *
 * @param {string} content - Current doc content.
 * @param {string} command - Command name (workflow filename, no `.md`).
 * @returns {string}
 */
function syncSlashCommandLine(content, command) {
    const slashLine = content.match(/^\*\*Slash command:\*\*\s+`\/[^\s`]+(\s\[[^\]]*\])?`/m);
    if (!slashLine) return content;
    // Preserve any " [arg]" suffix the doc already advertises
    const suffix = (slashLine[0].match(/\s(\[[^\]]+\])`\s*$/) || [, ''])[1];
    const newSlash = suffix
        ? `**Slash command:** \`/${command} ${suffix}\``
        : `**Slash command:** \`/${command}\``;
    return content.replace(/^\*\*Slash command:\*\*\s+`\/[^\n]+$/m, newSlash);
}

/**
 * Refreshes the `## Sync Note` body — but only when `shouldRefresh` is true.
 * A no-op write here is not idempotency, it's thrash: the caller decides
 * whether anything actually changed before this function ever touches text.
 *
 * @param {string} content - Current doc content.
 * @param {boolean} shouldRefresh - Whether any of wfChanged/skillChanged/versionChanged fired.
 * @param {string} date - ISO date to stamp.
 * @param {string} targetVersion - Engine version to stamp.
 * @returns {string}
 */
function syncNoteBody(content, shouldRefresh, date, targetVersion) {
    if (!shouldRefresh) return content;
    const syncNoteRegex = /(## Sync Note\s*\n\s*\n)(?:[^\n]*\n)?/;
    if (!syncNoteRegex.test(content)) return content;
    const replacement = `$1Synchronized with engine workflows on ${date} (v${targetVersion}).\n`;
    return content.replace(syncNoteRegex, replacement);
}

/**
 * @param {{ wfChanged: boolean, skillChanged: boolean, versionChanged: boolean }} signals
 * @returns {string} A `+`-joined label naming which signals fired, or
 *          `'frontmatter'` when none did (a Triggers/Slash-command-only edit).
 */
function describeChangeReasons({ wfChanged, skillChanged, versionChanged }) {
    return [
        wfChanged ? 'workflow-source' : null,
        skillChanged ? 'skill-source' : null,
        versionChanged ? 'version-bump' : null,
    ].filter(Boolean).join('+') || 'frontmatter';
}

/**
 * For every docs/{name}.md with a matching workflows/magic.{name}.md:
 *   - Sync the `**Triggers:** ...` line (whole line replaced).
 *   - Sync the `**Slash command:** ...` line.
 *   - Refresh the "## Sync Note" body when source workflow hash changed
 *     OR engine version bumped since the last recorded sync.
 *
 * No global version regex sweep — that was the source of unrelated rewrites.
 */
function syncDocsFolder(targetVersion, state) {
    if (!fs.existsSync(docsDir)) return;

    const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    const date = new Date().toISOString().split('T')[0];

    for (const file of docFiles) {
        const docPath = path.join(docsDir, file);
        const wfName = `magic.${file}`;
        const wfPath = path.join(workflowsDir, wfName);

        if (!fs.existsSync(wfPath)) continue;     // No source → leave doc alone

        const skillKey = `magic-${file.replace('.md', '')}`;
        const skillPath = path.join(skillsDir, skillKey, 'SKILL.md');
        const signals = computeSyncSignals(wfPath, skillPath, targetVersion, state, wfName, skillKey);

        const original = fs.readFileSync(docPath, 'utf8');
        let content = original;
        content = syncTriggersLine(content, signals.wfContent);
        content = syncSlashCommandLine(content, wfName.replace(/\.md$/, ''));
        content = syncNoteBody(
            content,
            signals.wfChanged || signals.skillChanged || signals.versionChanged,
            date, targetVersion
        );

        if (content !== original) {
            if (writeFileSafe(docPath, content)) {
                console.log(`  ✅ docs/${file} synced (${describeChangeReasons(signals)})`);
            }
        } else {
            console.log(`  ℹ️  docs/${file} — already current`);
        }

        state.workflows[wfName] = { hash: signals.wfHash, version: targetVersion, syncedAt: date };
        if (signals.skillHash !== null) {
            state.skills[skillKey] = { hash: signals.skillHash, version: targetVersion, syncedAt: date };
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════

function syncDocs() {
    if (!fs.existsSync(versionFile)) {
        console.error('❌ Version file (.magic/.version) not found.');
        return;
    }
    const targetVersion = fs.readFileSync(versionFile, 'utf8').trim();

    console.log(`🔄 Syncing documentation for version ${targetVersion}...`);

    const state = readState();

    if (fs.existsSync(templatePath)) {
        generateContributing(targetVersion, state);
    }

    syncDocsFolder(targetVersion, state);

    writeState(state);
}

syncDocs();
