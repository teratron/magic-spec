const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION SYNC (CONTRIBUTING.md & docs/)
// ═══════════════════════════════════════════════════════════════════════════

const projectRoot = process.cwd();
const magicDir = path.join(projectRoot, '.magic');
const versionFile = path.join(magicDir, '.version');
const templatePath = path.join(magicDir, 'templates', 'contributing.md');
const contributingPath = path.join(projectRoot, 'CONTRIBUTING.md');
const rulesPath = path.join(projectRoot, '.design', 'RULES.md');
const indexPath = path.join(projectRoot, '.design', 'INDEX.md');

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function syncDocs() {
    if (!fs.existsSync(versionFile)) return;
    const targetVersion = fs.readFileSync(versionFile, 'utf8').trim();

    console.log(`🔄 Syncing documentation for version ${targetVersion}...`);

    if (fs.existsSync(templatePath)) {
        generateContributing(targetVersion);
    }

    syncDocsFolder(targetVersion);
}

/**
 * Regenerates CONTRIBUTING.md from the master template.
 */
function generateContributing(targetVersion) {
    let template = fs.readFileSync(templatePath, 'utf8');

    // Extract Project Name from package.json
    let projectName = 'Magic Spec Root';
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        projectName = pkg.name || projectName;
    }

    // Core Rules Block Extraction (RULES.md)
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

    // Workspace Registry Extraction (INDEX.md)
    let registryBlock = '| Workspace | Description |\n| :--- | :--- |\n| `root` | No workspaces registered |\n';
    if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const start = indexContent.indexOf('## Workspaces');
        if (start !== -1) {
            const tableStart = indexContent.indexOf('|', start);
            const tableEnd = indexContent.indexOf('## Meta', tableStart);
            if (tableStart !== -1 && tableEnd !== -1) {
                registryBlock = indexContent.substring(tableStart, tableEnd).trim();
            } else if (tableStart !== -1) {
                registryBlock = indexContent.substring(tableStart).trim();
            }
        }
    }

    // Workflows Table Extraction (workflows/*.md)
    let workflowsTable = '| Command | Description |\n| :--- | :--- |\n';
    const workflowsDir = path.join(projectRoot, 'workflows');
    if (fs.existsSync(workflowsDir)) {
        const wfFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));
        wfFiles.forEach(file => {
            const fullPath = path.join(workflowsDir, file);
            const content = fs.readFileSync(fullPath, 'utf8');
            const descriptionMatch = content.match(/description:\s*(.*)/);
            const command = file.replace('.md', '');
            const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description provided';
            workflowsTable += `| \`/${command}\` | ${description} |\n`;
        });
    }

    // Directory Tree
    const directoryTree = `root-project/
├── .agents/workflows/        # Slash commands wrapper (e.g., magic.spec, magic.task)
├── .magic/                   # The SDD Engine (workflow logic and scripts - read-only)
└── .design/                  # Your Project Design Workspace (INDEX.md, RULES.md, PLAN.md)`;

    const date = new Date().toISOString().split('T')[0];
    const rendered = template
        .replace(/{{project_name}}/g, projectName)
        .replace(/{{VERSION}}/g, targetVersion)
        .replace(/{{engine_version}}/g, targetVersion)
        .replace(/{{workflows_table}}/g, workflowsTable.trim())
        .replace(/{{DATE}}/g, date)
        .replace(/{{rules_block}}/g, rulesBlock)
        .replace(/{{registry_block}}/g, registryBlock)
        .replace(/{{directory_tree}}/g, directoryTree)
        .replace(/{{setup_command}}/g, 'uv sync');

    fs.writeFileSync(contributingPath, rendered);
    console.log(`✅ Regenerated CONTRIBUTING.md (from template)`);
}

/**
 * Syncs version and workflow triggers in docs/*.md files.
 */
function syncDocsFolder(targetVersion) {
    const docsDir = path.join(projectRoot, 'docs');
    if (fs.existsSync(docsDir)) {
        const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
        docFiles.forEach(file => {
            const fullPath = path.join(docsDir, file);
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            // 1. Sync Version (vX.X.X)
            const versionRegex = /v\d+\.\d+\.\d+/g;
            if (versionRegex.test(content)) {
                const newContent = content.replace(versionRegex, `v${targetVersion}`);
                if (content !== newContent) {
                    content = newContent;
                    changed = true;
                }
            }

            // 2. Sync Workflow Logic (Triggers)
            const wfName = `magic.${file}`;
            const wfPath = path.join(projectRoot, 'workflows', wfName);
            if (fs.existsSync(wfPath)) {
                const wfContent = fs.readFileSync(wfPath, 'utf8');
                const triggerMatch = wfContent.match(/\*\*Triggers\*\*:\s*(.*)/);
                if (triggerMatch) {
                    const triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/`/g, ''));
                    const triggerListMd = triggers.map(t => `- \`${t}\``).join('\n');
                    const triggerSectionRegex = /(### Triggers\n)([\s\S]*?)(?=\n\n|##|$)/;
                    if (content.match(triggerSectionRegex)) {
                        const newContent = content.replace(triggerSectionRegex, `$1${triggerListMd}`);
                        if (content !== newContent) {
                            content = newContent;
                            changed = true;
                        }
                    }
                }
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`✅ Synced docs/${file}`);
            }
        });
    }
}

// Execute
syncDocs();
