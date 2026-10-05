#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { normalizePath, writeFileSafe, mkdirSafe, isDryRun } = require('../../.magic/scripts/utils');
const diagnostics = require('../../.magic/scripts/lib/diagnostics');

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT: SYNC-SKILLS
// ═══════════════════════════════════════════════════════════════════════════
// This script projects Magic SDD workflows into native Skill wrappers
// to ensure cross-agent compatibility (Claude Code, Gemini, etc).

const ROOT_DIR = path.resolve(__dirname, '../../');
const CONFIG = {
    sources: [
        {
            path: path.join(ROOT_DIR, 'workflows'),
            target: path.join(ROOT_DIR, 'skills'),
        },
        {
            path: path.join(ROOT_DIR, '.agents/workflows'),
            target: path.join(ROOT_DIR, '.agents/skills'),
        },
    ],
};

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

/**
 * Hyphenates the command part of a dotted `magic.*` token, keeping a file
 * extension intact when the token names a file.
 *
 * `magic.dev.sync` → `magic-dev-sync`, `magic.run.md` → `magic-run.md`,
 * `magic.md` → `magic.md` (single segment: nothing to hyphenate).
 *
 * @param {string} token - Dotted token beginning with `magic`.
 * @returns {string} Token in Skill-name form.
 */
function hyphenateMagicToken(token) {
    if (token.toLowerCase().endsWith('.md')) {
        return token.slice(0, -3).replace(/\./g, '-') + token.slice(-3);
    }
    return token.replace(/\./g, '-');
}

/**
 * Rewrites dotted `magic.*` references into the hyphenated form Skill wrappers
 * use, without destroying file extensions.
 *
 * Both replacements must be extension-aware. The slash-prefixed pattern also
 * matches inside a path — `rules/magic.md` contains `/magic.md` — so guarding
 * only the bare-token pattern leaves path-form references mangled.
 *
 * @param {string} text - Source text to normalize.
 * @returns {string} Text with Skill-name references normalized.
 */
function normalizeMagicReferences(text) {
    return text
        .replace(/\/magic(\.[a-z][a-z0-9-]*)+/gi, (m) => '/' + hyphenateMagicToken(m.slice(1)))
        .replace(/\bmagic\.[a-z0-9.-]+\b/gi, (m) => hyphenateMagicToken(m));
}

/**
 * Applies `name:`/`description:` frontmatter fields onto `metadata`, in
 * place. Every other field is ignored, matching the original loop's
 * selective behavior — this is not a general YAML parser.
 *
 * @param {string} frontmatterBody - Text between the `---` fences.
 * @param {{ name: string, description: string }} metadata - Mutated in place.
 */
function applyFrontmatterFields(frontmatterBody, metadata) {
    for (const line of frontmatterBody.split('\n')) {
        const [key, ...parts] = line.split(':');
        if (!key || parts.length === 0) continue;
        const cleanKey = key.trim();
        const value = parts.join(':').trim();
        if (cleanKey === 'name') metadata.name = value;
        if (cleanKey === 'description') metadata.description = value;
    }
}

/**
 * @param {string} content
 * @returns {string} The first non-heading line of `content`, trimmed.
 */
function firstBodyLine(content) {
    const bodyLines = content
        .replace(/^#+\s*/, '')
        .trim()
        .split('\n');
    return bodyLines[0].trim();
}

function extractMetadata(content, fileName) {
    const metadata = {
        name: fileName.replace(/\./g, '-'),
        description: 'Magic Spec Workflow',
    };

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
        applyFrontmatterFields(frontmatterMatch[1], metadata);
    } else {
        // Fallback for description if no frontmatter
        metadata.description = firstBodyLine(content) || metadata.description;
    }

    return metadata;
}

/**
 * Returns the source path shown in generated Skill wrappers.
 *
 * User-facing workflows may also exist under `.agents/workflows/` as local
 * hardlink projections for development adapters. In that case, the public
 * `workflows/` path is the canonical source users should see. Dev-only
 * workflows remain attributed to `.agents/workflows/`.
 *
 * @param {string} sourcePath - Absolute workflow source path.
 * @param {string} file - Workflow filename.
 * @returns {string} Project-relative POSIX path for the generated marker.
 */
function sourceMarkerPath(sourcePath, file) {
    const publicWorkflowPath = path.join(ROOT_DIR, 'workflows', file);

    if (
        normalizePath(sourcePath).includes('/.agents/workflows/') &&
        fs.existsSync(publicWorkflowPath)
    ) {
        try {
            const sourceHash = fs.readFileSync(sourcePath, 'utf8');
            const publicHash = fs.readFileSync(publicWorkflowPath, 'utf8');
            if (sourceHash === publicHash) {
                return normalizePath(path.relative(ROOT_DIR, publicWorkflowPath));
            }
        } catch {
            // Fall through to the physical source path.
        }
    }

    return normalizePath(path.relative(ROOT_DIR, sourcePath));
}

/**
 * Removes one no-longer-active skill directory, but only when it is
 * confirmed to be a wrapper this script itself generated (carries the
 * "GENERATED FILE" marker) — a hand-crafted skill directory that happens to
 * share a name with a since-removed workflow is left untouched. Honors
 * MAGIC_DRY_RUN (via `isDryRun()`) the same as every other write in this file.
 *
 * @param {string} dir - Skill directory name (not a full path).
 * @param {string} sourceTarget - The `skills/` or `.agents/skills/` root it lives under.
 */
function cleanupOrphanSkill(dir, sourceTarget) {
    const orphanPath = path.join(sourceTarget, dir);
    const orphanSkillMdPath = path.join(orphanPath, 'SKILL.md');

    let isGenerated = false;
    if (fs.existsSync(orphanSkillMdPath)) {
        const content = fs.readFileSync(orphanSkillMdPath, 'utf8');
        if (content.includes('⚠️ GENERATED FILE - DO NOT EDIT MANUALLY')) {
            isGenerated = true;
        }
    }

    if (!isGenerated) {
        console.log(` ⏭️  Skipping hand-crafted skill: ${dir}`);
        return;
    }

    if (isDryRun()) {
        console.log(` 🧪 [dry-run] would remove orphaned generated skill: ${dir}`);
    } else {
        console.log(` 🗑️  Removing orphaned generated skill: ${dir}`);
        fs.rmSync(orphanPath, { recursive: true, force: true });
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Frontmatter Contract
// ───────────────────────────────────────────────────────────────────────────

const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const NAME_GRAMMAR = /^[a-z0-9-]+$/;

/** Words the target skill format reserves inside a `name`. Kept here and nowhere else. */
const RESERVED_NAME_WORDS = ['anthropic', 'claude'];

/** First- and second-person words a third-person description never contains. */
const PERSON_WORD = /\b(?:I|we|my|you|your)\b/i;

/** The "when" half of a description: a sentence that begins `Use when`. */
const USE_WHEN_SENTENCE = /(?:^|[.!?]\s+)Use when\b/;

/**
 * Reads one top-level scalar from a frontmatter block as its parsed value, so
 * a quoted or folded multi-line value is measured as its text and not as its
 * first line. This is not a YAML parser: it understands plain, quoted and
 * block (`>` / `|`) scalars and flags the plain-scalar shapes YAML itself
 * rejects (a colon followed by a space, a leading indicator character), which
 * is what an unparsable description looks like to a host.
 *
 * @param {string} frontmatterBody - Text between the `---` fences.
 * @param {string} key - Top-level key to read.
 * @returns {{ present: boolean, parsed: boolean, value: string }}
 */
function readScalar(frontmatterBody, key) {
    const lines = frontmatterBody.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start === -1) return { present: false, parsed: true, value: '' };

    const head = lines[start].slice(key.length + 1).trim();
    const tail = [];
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            tail.push('');
            continue;
        }
        if (!/^\s/.test(lines[i])) break;
        tail.push(lines[i].trim());
    }
    const continuation = tail.filter(Boolean);

    if (/^[>|][+-]?\d*[+-]?$/.test(head)) {
        return { present: true, parsed: true, value: continuation.join(' ') };
    }

    if (head.startsWith('"') || head.startsWith("'")) {
        const text = [head, ...continuation].join(' ');
        const quote = text[0];
        let value = '';
        for (let i = 1; i < text.length; i++) {
            const ch = text[i];
            if (quote === '"' && ch === '\\') {
                value += text[i + 1] ?? '';
                i++;
                continue;
            }
            if (ch === quote) {
                if (quote === "'" && text[i + 1] === "'") {
                    value += "'";
                    i++;
                    continue;
                }
                const after = text.slice(i + 1).trim();
                return { present: true, parsed: after === '' || after.startsWith('#'), value };
            }
            value += ch;
        }
        return { present: true, parsed: false, value };
    }

    const text = [head, ...continuation]
        .join(' ')
        .replace(/\s+#.*$/, '')
        .trim();
    const unparsable = /:(\s|$)/.test(text) || /^[[{*&!%@`]/.test(text);
    return { present: true, parsed: !unparsable, value: text };
}

/**
 * Reads one workflow and builds the wrapper it would project — without
 * writing anything, so every wrapper can be checked before the first write.
 *
 * @param {{ path: string, target: string }} source - One entry of CONFIG.sources.
 * @param {string} file - Workflow filename inside `source.path`.
 * @returns {{ file: string, name: string, sourcePath: string, targetDir: string,
 *   targetFile: string, frontmatter: string, synthesized: boolean, skillContent: string }}
 */
function projectWorkflow(source, file) {
    const name = path.basename(file, '.md').replace(/\./g, '-');

    const sourcePath = path.join(source.path, file);
    const targetDir = path.join(source.target, name);
    const targetFile = path.join(targetDir, 'SKILL.md');

    const content = fs.readFileSync(sourcePath, 'utf8');
    const metadata = extractMetadata(content, name);

    // Extract body (strip original frontmatter if exists)
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const rawBody = frontmatterMatch ? content.replace(frontmatterMatch[0], '').trim() : content.trim();

    // Normalize skill trigger references in body: /magic.a.b → /magic-a-b
    const body = normalizeMagicReferences(rawBody);

    const rawFrontmatter = frontmatterMatch
        ? frontmatterMatch[1].trim()
        : `name: ${metadata.name}\ndescription: ${metadata.description}`;

    // Normalize skill name references. `name:` and `workflow:` values are
    // bare identifiers, so every separator collapses there; the remaining
    // prose goes through the shared extension-aware normalizer.
    const frontmatter = normalizeMagicReferences(
        rawFrontmatter
            .replace(/^(name:\s*)(.+)$/m, (_, p, v) => p + v.trim().replace(/[.:]/g, '-'))
            .replace(/^(\s+workflow:\s*)(.+)$/gm, (_, p, v) => p + v.trim().replace(/[.:]/g, '-')),
    );

    const sourceMarker = sourceMarkerPath(sourcePath, file);

    const skillContent = `---
${frontmatter}
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: ${sourceMarker} (relative to workspace root) -->

${body}`;

    return {
        file,
        name,
        sourcePath,
        targetDir,
        targetFile,
        frontmatter,
        synthesized: !frontmatterMatch,
        skillContent,
    };
}

/**
 * Checks the frontmatter a wrapper is about to be written with: the format's
 * validity limits and the form rules a script can decide. The judgment rules
 * (a discriminating `Use when` sentence, leading with the primary use) stay
 * with review and the selection cases.
 *
 * @param {{ name: string, frontmatter: string, synthesized: boolean }} projection
 * @returns {Array<{ field: string, rule: string }>} One entry per violated rule; empty when valid.
 */
function checkProjection(projection) {
    const problems = [];
    const refuse = (field, rule) => problems.push({ field, rule });
    const count = (n) => n.toLocaleString('en-US');

    const name = readScalar(projection.frontmatter, 'name');
    if (!name.present || !name.parsed || name.value === '') {
        refuse('name', name.present && !name.parsed ? 'does not parse' : 'missing or blank');
    } else {
        if (name.value.length > NAME_MAX_LENGTH) {
            refuse('name', `${count(name.value.length)} characters, limit ${NAME_MAX_LENGTH}`);
        }
        if (!NAME_GRAMMAR.test(name.value)) {
            refuse('name', 'only lowercase letters, digits and hyphens are allowed');
        }
        if (RESERVED_NAME_WORDS.some((word) => name.value.includes(word))) {
            refuse('name', 'contains a word the target skill format reserves');
        }
        if (name.value !== projection.name) {
            refuse('name', `differs from the workflow file name (expected ${projection.name})`);
        }
    }

    const description = readScalar(projection.frontmatter, 'description');
    if (!description.present || !description.parsed || description.value === '') {
        refuse(
            'description',
            description.present && !description.parsed ? 'does not parse' : 'missing or blank',
        );
        return problems;
    }

    const text = description.value;
    if (text.length > DESCRIPTION_MAX_LENGTH) {
        refuse('description', `${count(text.length)} characters, limit ${count(DESCRIPTION_MAX_LENGTH)}`);
    }
    if (/[<>]/.test(text)) refuse('description', 'contains a "<" or ">" character');

    if (projection.synthesized) {
        refuse('description', 'synthesized by the generator: the workflow has no frontmatter block');
    } else {
        if (!USE_WHEN_SENTENCE.test(text)) refuse('description', 'no "Use when" sentence');
        const person = text.match(PERSON_WORD);
        if (person) refuse('description', `first- or second-person word "${person[0]}"`);
    }

    return problems;
}

/**
 * Projects every workflow of every source into a Skill wrapper. Every wrapper
 * is read and checked before the first write; one that breaks the frontmatter
 * contract is refused — nothing is written for it and an existing file is left
 * as it was — recorded as an `error` finding, and returned to the caller
 * instead of aborting, so one defect cannot hide another and the caller can
 * finish its own work before it fails.
 *
 * @returns {{ refused: Array<{ workflow: string, field: string, rule: string, source: string }>,
 *   generated: number }}
 */
function sync() {
    console.log('🔄 Projecting Workflows to Skill Wrappers...');

    const refused = [];
    let generated = 0;

    // Plan: read, project and check everything before anything is written.
    const plans = CONFIG.sources
        .filter((source) => fs.existsSync(source.path))
        .map((source) => {
            const jobs = [];
            // A refused wrapper still owns its directory, so it is never an orphan.
            const activeSkills = new Set();

            fs.readdirSync(source.path)
                .filter((f) => f.endsWith('.md'))
                .forEach((file) => {
                    const projection = projectWorkflow(source, file);
                    activeSkills.add(projection.name);

                    const problems = checkProjection(projection);
                    problems.forEach(({ field, rule }) => {
                        const workflow = path.basename(file, '.md');
                        const locus = normalizePath(path.relative(ROOT_DIR, projection.sourcePath));
                        console.error(` ❌ Wrapper refused: ${workflow} — ${field}: ${rule}`);
                        diagnostics.record({
                            severity: 'error',
                            source: 'sync-skills',
                            code: 'SKILL_WRAPPER_REFUSED',
                            message: `${workflow}: ${field}: ${rule}`,
                            locus,
                            remedy: 'Fix the workflow frontmatter, then re-run update-engine-meta.',
                        });
                        refused.push({ workflow, field, rule, source: locus });
                    });
                    if (problems.length === 0) jobs.push(projection);
                });

            return { source, jobs, activeSkills };
        });

    // Write: only wrappers that passed.
    plans.forEach(({ source, jobs, activeSkills }) => {
        jobs.forEach((job) => {
            mkdirSafe(job.targetDir);
            if (writeFileSafe(job.targetFile, job.skillContent)) {
                generated++;
                console.log(` ✅ Skill generated: ${job.name}`);
            }
        });

        // ───────────────────────────────────────────────────────────────────────────
        // Orphan Cleanup
        // ───────────────────────────────────────────────────────────────────────────
        if (fs.existsSync(source.target)) {
            const existingSkillDirs = fs
                .readdirSync(source.target, { withFileTypes: true })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name);

            existingSkillDirs.forEach((dir) => {
                if (!activeSkills.has(dir)) cleanupOrphanSkill(dir, source.target);
            });
        }
    });

    if (refused.length > 0) {
        console.error(`❌ ${refused.length} wrapper rule violation(s); the refused wrappers were not written.`);
    } else {
        console.log('✨ Sync complete.');
    }

    return { refused, generated };
}

// ───────────────────────────────────────────────────────────────────────────
// Execution
// ───────────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const result = sync();
    if (result.refused.length > 0) process.exitCode = 1;
}

module.exports = sync;
module.exports.checkProjection = checkProjection;
module.exports.readScalar = readScalar;
module.exports.RESERVED_NAME_WORDS = RESERVED_NAME_WORDS;
