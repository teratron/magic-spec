const fs = require('fs');
const path = require('path');

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
        name: fileName.replace(/\.(?=[^.]*$)/, ':'),
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

function sync() {
    console.log('🔄 Projecting Workflows to Skill Wrappers...');

    CONFIG.sources.forEach(source => {
        if (!fs.existsSync(source.path)) return;

        const workflowFiles = fs.readdirSync(source.path).filter(f => f.endsWith('.md'));
        const activeSkills = new Set();

        workflowFiles.forEach(file => {
            const name = path.basename(file, '.md');
            activeSkills.add(name);

            const sourcePath = path.join(source.path, file);
            const targetDir = path.join(source.target, name);
            const targetFile = path.join(targetDir, 'SKILL.md');

            const content = fs.readFileSync(sourcePath, 'utf8');
            const metadata = extractMetadata(content, name);

            // Extract body (strip original frontmatter if exists)
            const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            const body = frontmatterMatch
                ? content.replace(frontmatterMatch[0], '').trim()
                : content.trim();

            const frontmatterContent = frontmatterMatch
                ? frontmatterMatch[1].trim()
                : `name: ${metadata.name}\ndescription: ${metadata.description}`;

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const skillContent = `---
${frontmatterContent}
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: ${path.relative(ROOT_DIR, sourcePath).replace(/\\/g, '/')} (relative to workspace root) -->

${body}`;

            fs.writeFileSync(targetFile, skillContent, 'utf8');
            console.log(` ✅ Skill generated: ${name}`);
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
                        console.log(` 🗑️  Removing orphaned generated skill: ${dir}`);
                        fs.rmSync(orphanPath, { recursive: true, force: true });
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

