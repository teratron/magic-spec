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
 *      was modified (per stored hash in `.magic/.docs-state.json`) or when
 *      the engine version itself bumped — whichever applies.
 *   4. Triggers / Slash command lines are propagated from workflow frontmatter
 *      using anchored line patterns; if a doc lacks the line, we leave it
 *      alone instead of inventing one.
 */

const projectRoot = process.cwd();
const magicDir = path.join(projectRoot, '.magic');
const versionFile = path.join(magicDir, '.version');
const templatePath = path.join(magicDir, 'templates', 'contributing.md');
const stateFile = path.join(magicDir, '.docs-state.json');

const contributingPath = path.join(projectRoot, 'CONTRIBUTING.md');
const rulesPath = path.join(projectRoot, '.design', 'RULES.md');
const indexPath = path.join(projectRoot, '.design', 'INDEX.md');
const workflowsDir = path.join(projectRoot, 'workflows');
const skillsDir = path.join(projectRoot, 'skills');
const docsDir = path.join(projectRoot, 'docs');

// ───────────────────────────────────────────────────────────────────────────
// State Management
// ───────────────────────────────────────────────────────────────────────────

function readState() {
    if (!fs.existsSync(stateFile)) return { workflows: {}, skills: {}, contributing: null };
    try {
        const raw = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        if (!raw.workflows) raw.workflows = {};
        if (!raw.skills) raw.skills = {};
        return raw;
    } catch {
        return { workflows: {}, skills: {}, contributing: null };
    }
}

function writeState(state) {
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
 * Returns ISO date (YYYY-MM-DD) of the most recently modified source file
 * involved in CONTRIBUTING regeneration. Stable across runs as long as the
 * sources don't change — eliminates `today` thrash in the footer.
 */
function lastSourceDate() {
    const candidates = [templatePath, rulesPath, indexPath];
    if (fs.existsSync(workflowsDir)) {
        for (const f of fs.readdirSync(workflowsDir)) {
            if (f.endsWith('.md')) candidates.push(path.join(workflowsDir, f));
        }
    }
    if (fs.existsSync(skillsDir)) {
        for (const dir of fs.readdirSync(skillsDir)) {
            const skillFile = path.join(skillsDir, dir, 'SKILL.md');
            if (fs.existsSync(skillFile)) candidates.push(skillFile);
        }
    }
    let latest = 0;
    for (const c of candidates) {
        if (fs.existsSync(c)) {
            const m = fs.statSync(c).mtimeMs;
            if (m > latest) latest = m;
        }
    }
    return new Date(latest || Date.now()).toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRIBUTING.md REGENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateContributing(targetVersion, state) {
    if (!fs.existsSync(templatePath)) return false;

    const template = fs.readFileSync(templatePath, 'utf8');

    const projectName = 'Magic Spec';

    // Rules block — RULES.md sections §1–§6
    let rulesBlock = '> [!WARNING]\n> Project constitution (RULES.md) missing. No rules inferred.\n';
    if (fs.existsSync(rulesPath)) {
        const rulesContent = fs.readFileSync(rulesPath, 'utf8');
        const r1 = rulesContent.indexOf('## 1.');
        const r7 = rulesContent.indexOf('## 7.');
        if (r1 !== -1 && r7 !== -1) {
            rulesBlock = rulesContent.substring(r1, r7).trim();
        } else if (r1 !== -1) {
            rulesBlock = rulesContent.substring(r1).trim();
        }
    }

    // Workspaces table from INDEX.md
    let registryBlock = '| Workspace | Description |\n| :--- | :--- |\n| `root` | No workspaces registered |\n';
    if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const start = indexContent.indexOf('## Workspaces');
        if (start !== -1) {
            const tableStart = indexContent.indexOf('|', start);
            const tableEnd = indexContent.indexOf('\n##', tableStart);
            if (tableStart !== -1) {
                registryBlock = (tableEnd !== -1
                    ? indexContent.substring(tableStart, tableEnd)
                    : indexContent.substring(tableStart)
                ).trim();
            }
        }
    }

    // Workflows table from workflows/*.md
    let workflowsTable = '| Command | Description |\n| :--- | :--- |\n';
    if (fs.existsSync(workflowsDir)) {
        const wfFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md')).sort();
        for (const file of wfFiles) {
            const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
            const m = content.match(/description:\s*(.*)/);
            const command = file.replace('.md', '');
            const description = m ? m[1].trim() : 'No description provided';
            workflowsTable += `| \`/${command}\` | ${description} |\n`;
        }
    }

    const directoryTree = `root-project/
├── .agents/workflows/        # Slash commands wrapper (e.g., magic.spec, magic.task)
├── .magic/                   # The SDD Engine (workflow logic and scripts - read-only)
└── .design/                  # Your Project Design Workspace (INDEX.md, RULES.md, PLAN.md)`;

    const sourceDate = lastSourceDate();

    const rendered = template
        .replace(/{{project_name}}/g, projectName)
        .replace(/{{VERSION}}/g, targetVersion)
        .replace(/{{engine_version}}/g, targetVersion)
        .replace(/{{workflows_table}}/g, workflowsTable.trim())
        .replace(/{{DATE}}/g, sourceDate)
        .replace(/{{rules_block}}/g, rulesBlock)
        .replace(/{{registry_block}}/g, registryBlock)
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

        const wfContent = fs.readFileSync(wfPath, 'utf8');
        const wfHash = sha(wfContent);
        const prev = state.workflows[wfName] || {};

        const skillKey = `magic-${file.replace('.md', '')}`;
        const skillPath = path.join(skillsDir, skillKey, 'SKILL.md');
        const skillContent = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : null;
        const skillHash = skillContent ? sha(skillContent) : null;
        const prevSkill = state.skills[skillKey] || {};

        const wfChanged = prev.hash !== wfHash;
        const skillChanged = skillHash !== null && prevSkill.hash !== skillHash;
        const versionChanged = prev.version !== targetVersion;

        let content = fs.readFileSync(docPath, 'utf8');
        const original = content;

        // 1. Triggers line — propagate verbatim line content from workflow body
        const wfTriggers = wfContent.match(/^\*\*Triggers:\*\*\s+(.+)$/m);
        if (wfTriggers) {
            const newLine = `**Triggers:** ${wfTriggers[1].trim()}`;
            content = content.replace(/^\*\*Triggers:\*\*\s+.+$/m, newLine);
        }

        // 2. Slash command line — derive from workflow filename
        const command = wfName.replace(/\.md$/, '');
        const slashLine = content.match(/^\*\*Slash command:\*\*\s+`\/[^\s`]+(\s\[[^\]]*\])?`/m);
        if (slashLine) {
            // Preserve any " [arg]" suffix the doc already advertises
            const suffix = (slashLine[0].match(/\s(\[[^\]]+\])`\s*$/) || [, ''])[1];
            const newSlash = suffix
                ? `**Slash command:** \`/${command} ${suffix}\``
                : `**Slash command:** \`/${command}\``;
            content = content.replace(/^\*\*Slash command:\*\*\s+`\/[^\n]+$/m, newSlash);
        }

        // 3. Sync Note — refresh only on real change
        if (wfChanged || skillChanged || versionChanged) {
            const syncNoteRegex = /(## Sync Note\s*\n\s*\n)(?:[^\n]*\n)?/;
            const replacement = `$1Synchronized with engine workflows on ${date} (v${targetVersion}).\n`;
            if (syncNoteRegex.test(content)) {
                content = content.replace(syncNoteRegex, replacement);
            }
        }

        if (content !== original) {
            if (writeFileSafe(docPath, content)) {
                const reasons = [
                    wfChanged ? 'workflow-source' : null,
                    skillChanged ? 'skill-source' : null,
                    versionChanged ? 'version-bump' : null,
                ].filter(Boolean).join('+') || 'frontmatter';
                console.log(`  ✅ docs/${file} synced (${reasons})`);
            }
        } else {
            console.log(`  ℹ️  docs/${file} — already current`);
        }

        state.workflows[wfName] = { hash: wfHash, version: targetVersion, syncedAt: date };
        if (skillHash !== null) {
            state.skills[skillKey] = { hash: skillHash, version: targetVersion, syncedAt: date };
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
