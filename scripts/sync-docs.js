#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./cli-guard').guardCli('sync-docs', module);

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { enginePath } = require('./engine-path');
const { writeFileSafe, mkdirSafe, isDryRun, STATE_DIR_NAME } = require(
    enginePath('scripts', 'utils'),
);

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION SYNC — Real Content Sync, Not Version Stamping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Brings documentation in sync with its actual sources of truth:
 *
 *   CONTRIBUTING.md  ←  the marked blocks of a hand-written guide: the command table
 *                       (the router), the workspace table (the registry) and the
 *                       engine version. Nothing outside the markers is written.
 *   docs/{name}.md   ←  workflows/{name}.md   (Triggers, Slash command,
 *                                                    and Sync Note version)
 *
 * Anti-thrash guarantees (the reason this file was rewritten):
 *
 *   1. CONTRIBUTING.md carries no date and no embedded copy of the constitution.
 *      Two consecutive runs with no source change produce byte-identical output.
 *   2. docs/*.md no longer get a global `vX.Y.Z` regex sweep. Each doc has
 *      a single anchored "Sync Note" line that holds the engine version.
 *   3. Sync Notes are only refreshed when the corresponding workflow source
 *      was modified (per stored hash in `.magicspec/.cache/docs-state.json`) or when
 *      the engine version itself bumped — whichever applies.
 *   4. Triggers / Slash command lines are propagated from workflow frontmatter
 *      using anchored line patterns; if a doc lacks the line, we leave it
 *      alone instead of inventing one.
 */

const projectRoot = process.cwd();
const versionFile = enginePath('.version');
// The seed of a guide that does not exist yet. It is a maintenance artifact: nothing a user installs
// reads it, so it lives beside this script and not in the shipped engine folder.
const templatePath = path.join(__dirname, 'templates', 'contributing.md');
// The state cache is the state folder's own `.cache/`, beside the finalize and project-meta states:
// one folder holds every cache, and `clean-cache` reaches it. It is a dev-only artifact owned by this
// script and must not ship with the distributable engine folder.
const stateCacheDir = path.join(projectRoot, STATE_DIR_NAME, '.cache');
const stateFile = path.join(stateCacheDir, 'docs-state.json');
// Where the state lived before, in a `.cache/` at the project root: read once so the first sync after
// the move does not re-stamp every Sync Note, then retired.
const legacyStateDir = path.join(projectRoot, '.cache');
const legacyStateFile = path.join(legacyStateDir, '.docs-state.json');

const contributingPath = path.join(projectRoot, 'CONTRIBUTING.md');
const indexPath = path.join(projectRoot, '.magicspec', 'INDEX.md');
const workflowsDir = enginePath('workflows');
const docsDir = path.join(projectRoot, 'docs');

const REGISTRY_EMPTY_BLOCK =
    '| Workspace | Description |\n| --- | --- |\n| `root` | No workspaces registered |\n';

// ───────────────────────────────────────────────────────────────────────────
// State Management
// ───────────────────────────────────────────────────────────────────────────

function defaultState() {
    return { workflows: {}, skills: {}, contributing: null };
}

function readState() {
    const source = [stateFile, legacyStateFile].find((candidate) => fs.existsSync(candidate));
    if (!source) return defaultState();
    try {
        const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
        raw.workflows ||= {};
        raw.skills ||= {};
        return raw;
    } catch {
        return defaultState();
    }
}

function writeState(state) {
    mkdirSafe(stateCacheDir);
    writeFileSafe(stateFile, JSON.stringify(state, null, 2) + '\n');
    retireLegacyState();
}

/**
 * Removes the state file the earlier location left, and that location's folder when nothing else
 * is in it. A preview (dry run) retires nothing.
 */
function retireLegacyState() {
    if (isDryRun() || !fs.existsSync(legacyStateFile)) return;
    fs.rmSync(legacyStateFile, { force: true });
    try {
        fs.rmdirSync(legacyStateDir);
    } catch {
        /* the folder holds something else: not ours to remove */
    }
}

function sha(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}

function readIfExists(p) {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRIBUTING.md — MARKED BLOCKS
// ═══════════════════════════════════════════════════════════════════════════
//
// The guide is hand-written. Three facts that change with the repository are generated into
// blocks the prose marks with a neutral key:
//
//   <!-- generated:commands -->  …  <!-- /generated:commands -->
//
// Everything outside the markers is the author's and is never written. A guide that has no
// markers yet receives them once, in one section appended at its end; from then on the run
// only refills what lies between them, so a second run changes nothing.

/** The blocks, in the order a missing one is appended: the key and the heading it gets. */
const GUIDE_BLOCKS = Object.freeze([
    { key: 'version', heading: null, inline: true },
    { key: 'commands', heading: '### Commands', inline: false },
    { key: 'workspaces', heading: '### Workspaces', inline: false },
]);

/** The heading the one-time appended section carries. */
const APPENDED_SECTION_HEADING = '## Generated reference';

/**
 * @param {string} key - Block key.
 * @returns {{open: string, close: string}} The two marker lines of the block.
 */
function blockMarkers(key) {
    return { open: `<!-- generated:${key} -->`, close: `<!-- /generated:${key} -->` };
}

/**
 * @param {string} text - Guide content.
 * @param {string} key - Block key.
 * @returns {'ok'|'missing'|'broken'} `ok` when an opening marker is followed by its closing one,
 *          `broken` when only one of the two exists, `missing` when neither does.
 */
function blockState(text, key) {
    const { open, close } = blockMarkers(key);
    const opening = text.indexOf(open);
    const closing = text.indexOf(close);
    if (opening === -1 && closing === -1) return 'missing';
    return opening !== -1 && closing > opening ? 'ok' : 'broken';
}

/**
 * Replaces what lies between the markers of one block. A block-level body gets its own lines; an
 * inline one sits directly between the markers.
 *
 * @param {string} text - Guide content that holds the block.
 * @param {string} key - Block key.
 * @param {string} body - New content of the block.
 * @param {boolean} inline - Whether the block sits inside a line of prose.
 * @returns {string}
 */
function fillBlock(text, key, body, inline) {
    const { open, close } = blockMarkers(key);
    const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped(open)}[\\s\\S]*?${escaped(close)}`, 'g');
    // A function replacement: the body is data, and `$` sequences in it must stay as written.
    return text.replace(pattern, () =>
        inline ? open + body + close : `${open}\n${body}\n${close}`,
    );
}

/**
 * Appends, once, the blocks a guide lacks. The section heading is added only when the guide does
 * not hold it already.
 *
 * @param {string} text - Guide content.
 * @param {string[]} keys - Keys of the missing blocks.
 * @returns {string}
 */
function appendMissingBlocks(text, keys) {
    let out = text.replace(/\s*$/, '\n');
    if (!out.includes(`\n${APPENDED_SECTION_HEADING}\n`)) out += `\n${APPENDED_SECTION_HEADING}\n`;
    for (const block of GUIDE_BLOCKS.filter((b) => keys.includes(b.key))) {
        const { open, close } = blockMarkers(block.key);
        out += block.inline
            ? `\nEngine version: ${open}${close}\n`
            : `\n${block.heading}\n\n${open}\n${close}\n`;
    }
    return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Project Name Resolution
// ───────────────────────────────────────────────────────────────────────────

/**
 * @returns {string|null} The `meta.name` field from `.magicspec/workspace.json`,
 *          or `null` when the file is absent, unparsable, or carries no name.
 */
function projectNameFromWorkspaceJson() {
    const wsJsonPath = path.join(projectRoot, '.magicspec', 'workspace.json');
    if (!fs.existsSync(wsJsonPath)) return null;
    try {
        const ws = JSON.parse(fs.readFileSync(wsJsonPath, 'utf8'));
        return ws.meta?.name || null;
    } catch {
        return null;
    }
}

/**
 * Resolves the project display name for the seed of a new guide.
 * Resolution order:
 *   1. workspace.json → meta.name  (explicit project config)
 *   2. MAGIC_PROJECT_NAME env var  (CI/runtime override)
 *   3. basename of cwd             (zero-config fallback)
 *
 * @returns {string}
 */
function getProjectName() {
    return (
        projectNameFromWorkspaceJson() ||
        process.env.MAGIC_PROJECT_NAME ||
        path.basename(projectRoot)
    );
}

// ───────────────────────────────────────────────────────────────────────────
// Block Sources
// ───────────────────────────────────────────────────────────────────────────

/**
 * Extracts the `## Workspaces` table from INDEX.md. Falls back to an empty-registry placeholder
 * when INDEX.md is absent or carries no recognizable table under that heading.
 *
 * @returns {string}
 */
function extractRegistryBlock() {
    if (!fs.existsSync(indexPath)) return REGISTRY_EMPTY_BLOCK.trim();
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const start = indexContent.indexOf('## Workspaces');
    if (start === -1) return REGISTRY_EMPTY_BLOCK.trim();
    const tableStart = indexContent.indexOf('|', start);
    if (tableStart === -1) return REGISTRY_EMPTY_BLOCK.trim();
    const tableEnd = indexContent.indexOf('\n##', tableStart);
    const table = (
        tableEnd !== -1
            ? indexContent.substring(tableStart, tableEnd)
            : indexContent.substring(tableStart)
    ).trim();

    // The table's links are relative to INDEX.md; CONTRIBUTING.md sits in the project root.
    const stateDir = path.relative(projectRoot, path.dirname(indexPath)).split(path.sep).join('/');
    return table.replace(/\]\((?![a-z][a-z0-9+.-]*:|[/#])([^)\s]+)\)/gi, `](${stateDir}/$1)`);
}

/**
 * Builds the `| Command | Description |` table from the router's command table, read through the
 * engine's one row parser, so the guide lists exactly the commands the router does.
 *
 * @returns {string|null} The table, or `null` when the router cannot be read (the block is then
 *          left as it is).
 */
function buildWorkflowsTable() {
    let commands;
    try {
        commands = require(enginePath('scripts', 'lib', 'hosts')).readCommands();
    } catch (error) {
        console.warn(`  ⚠️  Command table not regenerated: ${error.message}`);
        return null;
    }
    let table = '| Command | Description |\n| --- | --- |\n';
    for (const command of commands)
        table += `| \`/magicspec ${command.name}\` | ${command.summary} |\n`;
    return table.trim();
}

// ───────────────────────────────────────────────────────────────────────────
// Generation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Brings the marked blocks of CONTRIBUTING.md up to date. A repository with no guide gets the
 * seed; a guide with no markers gets them once.
 *
 * @param {string} targetVersion - Engine version.
 * @param {Object} state - Persisted sync state (mutated: the content hash of the guide).
 * @returns {boolean} Whether the guide was written.
 */
function generateContributing(targetVersion, state) {
    const existing = readIfExists(contributingPath);
    let guide = existing;
    if (guide === null) {
        if (!fs.existsSync(templatePath)) return false;
        guide = fs
            .readFileSync(templatePath, 'utf8')
            .replace(/{{project_name}}/g, () => getProjectName());
    }

    const bodies = {
        version: `v${targetVersion}`,
        commands: buildWorkflowsTable(),
        workspaces: extractRegistryBlock(),
    };

    const missing = [];
    for (const block of GUIDE_BLOCKS) {
        const found = blockState(guide, block.key);
        if (found === 'missing') missing.push(block.key);
        else if (found === 'broken')
            console.warn(
                `  ⚠️  CONTRIBUTING.md — the ${block.key} markers are unpaired; the block is left as it is`,
            );
    }
    if (missing.length > 0) guide = appendMissingBlocks(guide, missing);

    for (const block of GUIDE_BLOCKS) {
        if (bodies[block.key] === null || blockState(guide, block.key) !== 'ok') continue;
        guide = fillBlock(guide, block.key, bodies[block.key], block.inline);
    }

    // Idempotency: skip write if content hasn't changed
    if (existing === guide) {
        console.log('  ℹ️  CONTRIBUTING.md — already current');
        return false;
    }

    if (writeFileSafe(contributingPath, guide)) {
        console.log(`  ✅ CONTRIBUTING.md blocks regenerated (v${targetVersion})`);
        state.contributing = sha(guide);
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// docs/{name}.md SYNC FROM workflows/{name}.md
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes the independent "did anything change" signals for one
 * docs/{name}.md ↔ workflows/{name}.md pair, plus the raw content/hashes
 * callers need to act on them.
 *
 * @param {string} wfPath - Absolute path to the workflow source (exists).
 * @param {string|null} skillPath - Absolute path of a second source, or null.
 * @param {string} targetVersion - Engine version this sync run targets.
 * @param {Object} state - Persisted sync state (read, not mutated here).
 * @param {string} wfName - State key for the workflow (`{name}.md`).
 * @param {string} skillKey - State key of the second source.
 * @returns {{
 *   wfContent: string, wfHash: string, skillHash: string|null,
 *   wfChanged: boolean, skillChanged: boolean, versionChanged: boolean
 * }}
 */
function computeSyncSignals(wfPath, skillPath, targetVersion, state, wfName, skillKey) {
    const wfContent = fs.readFileSync(wfPath, 'utf8');
    const wfHash = sha(wfContent);
    const prev = state.workflows[wfName] || {};

    const skillContent =
        skillPath && fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : null;
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
    const suffix = slashLine[0].match(/\s(\[[^\]]+\])`\s*$/)?.[1] ?? '';
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
    return (
        [
            wfChanged ? 'workflow-source' : null,
            skillChanged ? 'skill-source' : null,
            versionChanged ? 'version-bump' : null,
        ]
            .filter(Boolean)
            .join('+') || 'frontmatter'
    );
}

/**
 * For every docs/{name}.md with a matching workflows/{name}.md:
 *   - Sync the `**Triggers:** ...` line (whole line replaced).
 *   - Sync the `**Slash command:** ...` line.
 *   - Refresh the "## Sync Note" body when source workflow hash changed
 *     OR engine version bumped since the last recorded sync.
 *
 * No global version regex sweep — that was the source of unrelated rewrites.
 */
function syncDocsFolder(targetVersion, state) {
    if (!fs.existsSync(docsDir)) return;

    const docFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
    const date = new Date().toISOString().split('T')[0];

    for (const file of docFiles) {
        const docPath = path.join(docsDir, file);
        const wfName = file;
        const wfPath = path.join(workflowsDir, wfName);

        if (!fs.existsSync(wfPath)) continue; // No source → leave doc alone

        const skillKey = file.replace('.md', '');
        const signals = computeSyncSignals(wfPath, null, targetVersion, state, wfName, skillKey);

        const original = fs.readFileSync(docPath, 'utf8');
        let content = original;
        content = syncTriggersLine(content, signals.wfContent);
        content = syncSlashCommandLine(content, `magicspec ${skillKey}`);
        content = syncNoteBody(
            content,
            signals.wfChanged || signals.skillChanged || signals.versionChanged,
            date,
            targetVersion,
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
            state.skills[skillKey] = {
                hash: signals.skillHash,
                version: targetVersion,
                syncedAt: date,
            };
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════

function syncDocs() {
    if (!fs.existsSync(versionFile)) {
        console.error('❌ Engine version file not found.');
        return;
    }
    const targetVersion = fs.readFileSync(versionFile, 'utf8').trim();

    console.log(`🔄 Syncing documentation for version ${targetVersion}...`);

    const state = readState();

    generateContributing(targetVersion, state);

    syncDocsFolder(targetVersion, state);

    writeState(state);
}

syncDocs();
