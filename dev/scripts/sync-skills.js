const fs = require('fs');
const path = require('path');
const { normalizePath, writeFileSafe, mkdirSafe, isDryRun } = require('../../.magic/scripts/utils');

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
            target: path.join(ROOT_DIR, 'skills')
        },
        {
            path: path.join(ROOT_DIR, '.agents/workflows'),
            target: path.join(ROOT_DIR, '.agents/skills')
        }
    ]
};

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function extractMetadata(content, fileName) {
    const metadata = {
        name: fileName.replace(/\./g, '-'),
        description: 'Magic Spec Workflow'
    };

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
        const lines = frontmatterMatch[1].split('\n');
        for (const line of lines) {
            const [key, ...parts] = line.split(':');
            if (key && parts.length > 0) {
                const value = parts.join(':').trim();
                const cleanKey = key.trim();
                if (cleanKey === 'name') metadata.name = value;
                if (cleanKey === 'description') metadata.description = value;
            }
        }
    } else {
        // Fallback for description if no frontmatter
        const bodyLines = content.replace(/^#+\s*/, '').trim().split('\n');
        metadata.description = bodyLines[0].trim() || metadata.description;
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

function sync() {
    console.log('🔄 Projecting Workflows to Skill Wrappers...');

    CONFIG.sources.forEach(source => {
        if (!fs.existsSync(source.path)) return;

        const workflowFiles = fs.readdirSync(source.path).filter(f => f.endsWith('.md'));
        const activeSkills = new Set();

        workflowFiles.forEach(file => {
            const name = path.basename(file, '.md').replace(/\./g, '-');
            activeSkills.add(name);

            const sourcePath = path.join(source.path, file);
            const targetDir = path.join(source.target, name);
            const targetFile = path.join(targetDir, 'SKILL.md');

            const content = fs.readFileSync(sourcePath, 'utf8');
            const metadata = extractMetadata(content, name);

            // Extract body (strip original frontmatter if exists)
            const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            const rawBody = frontmatterMatch
                ? content.replace(frontmatterMatch[0], '').trim()
                : content.trim();

            // Normalize skill trigger references in body: /magic.a.b → /magic-a-b
            const body = rawBody
                .replace(/\/magic(\.[a-z][a-z0-9-]*)+/gi, m => '/' + m.slice(1).replace(/\./g, '-'))
                .replace(/\bmagic(\.[a-z][a-z0-9-]*)+(?=\/)/gi, m => m.replace(/\./g, '-'));

            const rawFrontmatter = frontmatterMatch
                ? frontmatterMatch[1].trim()
                : `name: ${metadata.name}\ndescription: ${metadata.description}`;

            // Normalize skill name references: replace dots and colons with hyphens
            const frontmatterContent = rawFrontmatter
                .replace(/^(name:\s*)(.+)$/m, (_, p, v) => p + v.trim().replace(/[.:]/g, '-'))
                .replace(/^(\s+workflow:\s*)(.+)$/mg, (_, p, v) => p + v.trim().replace(/[.:]/g, '-'))
                .replace(/\/magic(\.[a-z][a-z0-9-]*)+/gi, m => '/' + m.slice(1).replace(/\./g, '-'));

            mkdirSafe(targetDir);

            const sourceMarker = sourceMarkerPath(sourcePath, file);

            const skillContent = `---
${frontmatterContent}
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: ${sourceMarker} (relative to workspace root) -->

${body}`;

            if (writeFileSafe(targetFile, skillContent)) {
                console.log(` ✅ Skill generated: ${name}`);
            }
        });

        // ───────────────────────────────────────────────────────────────────────────
        // Orphan Cleanup
        // ───────────────────────────────────────────────────────────────────────────
        if (fs.existsSync(source.target)) {
            const existingSkillDirs = fs.readdirSync(source.target, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            existingSkillDirs.forEach(dir => {
                if (!activeSkills.has(dir)) {
                    const orphanPath = path.join(source.target, dir);
                    const orphanSkillMdPath = path.join(orphanPath, 'SKILL.md');

                    // Only delete if it's actually a generated wrapper
                    let isGenerated = false;
                    if (fs.existsSync(orphanSkillMdPath)) {
                        const content = fs.readFileSync(orphanSkillMdPath, 'utf8');
                        if (content.includes('⚠️ GENERATED FILE - DO NOT EDIT MANUALLY')) {
                            isGenerated = true;
                        }
                    }

                    if (isGenerated) {
                        if (isDryRun()) {
                            console.log(` 🧪 [dry-run] would remove orphaned generated skill: ${dir}`);
                        } else {
                            console.log(` 🗑️  Removing orphaned generated skill: ${dir}`);
                            fs.rmSync(orphanPath, { recursive: true, force: true });
                        }
                    } else {
                        console.log(` ⏭️  Skipping hand-crafted skill: ${dir}`);
                    }
                }
            });
        }
    });

    console.log('✨ Sync complete.');
}

// ───────────────────────────────────────────────────────────────────────────
// Execution
// ───────────────────────────────────────────────────────────────────────────

if (require.main === module) {
    sync();
}

module.exports = sync;
