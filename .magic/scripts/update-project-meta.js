const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT META UPDATER (C14.3 Extension)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Updates project metadata: indices, versions, and last updated dates.
 *
 * Environment variables:
 *   MAGIC_AUTHOR — Author name for history table entries (default: 'Agent').
 */

const designDir = path.join(__dirname, '..', '..', '.design');
const globalIndexPath = path.join(designDir, 'INDEX.md');
const workspaceJsonPath = path.join(designDir, 'workspace.json');
const rulesPath = path.join(designDir, 'RULES.md');

// Arguments parsing
const args = process.argv.slice(2);
let workspaceName = null;
let message = 'Automated metadata update';

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--workspace=')) {
        workspaceName = args[i].split('=')[1];
    } else if (args[i] === '--workspace' && args[i + 1]) {
        workspaceName = args[i + 1];
        i++;
    } else if ((args[i] === '--message' || args[i] === '-m') && args[i + 1]) {
        message = args[i + 1];
        i++;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Core Logic
// ───────────────────────────────────────────────────────────────────────────

function updateProjectMeta() {
    console.log('🔍 Updating project metadata...');

    const now = new Date().toISOString().split('T')[0];

    // 1. Update Global INDEX.md
    if (fs.existsSync(globalIndexPath)) {
        updateFileMeta(globalIndexPath, now, message);
        console.log('✅ Global INDEX.md updated.');
    } else {
        console.error('❌ Global INDEX.md not found.');
        process.exit(1);
    }

    // 2. Resolve Workspace from workspace.json or arguments
    if (!workspaceName && fs.existsSync(workspaceJsonPath)) {
        try {
            const workspaceData = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
            if (workspaceData.default) {
                workspaceName = workspaceData.default;
            }
        } catch (e) {
            console.error(`⚠️ Error reading workspace.json: ${e.message}`);
        }
    }

    // 3. Update Workspace-specific INDEX.md
    if (workspaceName) {
        const workspaceIndexPath = path.join(designDir, workspaceName, 'INDEX.md');
        if (fs.existsSync(workspaceIndexPath)) {
            updateFileMeta(workspaceIndexPath, now, message);
            console.log(`✅ Workspace '${workspaceName}' INDEX.md updated.`);
        } else {
            console.warn(`⚠️ Workspace '${workspaceName}' INDEX.md not found at ${workspaceIndexPath}. Skipping.`);
        }
    }
}

/**
 * Updates version and date in a markdown index file.
 */
function updateFileMeta(filePath, date, msg) {
    let content = fs.readFileSync(filePath, 'utf8');
    let versionUpdated = false;

    // Bump version string (**Version:** X.Y.Z)
    const versionRegex = /\*\*Version:\*\* (\d+)\.(\d+)\.(\d+)/;
    const match = content.match(versionRegex);
    let newVersion = '';
    if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        const patch = parseInt(match[3]) + 1;
        newVersion = `${major}.${minor}.${patch}`;
        content = content.replace(versionRegex, `**Version:** ${newVersion}`);
        versionUpdated = true;
    }

    // Update Last Updated date
    const dateRegex = /\- \*\*Last Updated\*\*: \d{4}-\d{2}-\d{2}/;
    if (content.match(dateRegex)) {
        content = content.replace(dateRegex, `- **Last Updated**: ${date}`);
    } else {
        // Fallback or secondary check for different formatting
        const altDateRegex = /\*\*Last Updated\*\* \| \d{4}-\d{2}-\d{2}/;
        content = content.replace(altDateRegex, `**Last Updated** | ${date}`);
    }

    // Append history entry if a history table exists
    // Looking for | Version | Date | Description | or similar
    const historyHeaderRegex = /\| Version \| Date \| Author \| Description \|\n\| :--- \| :--- \| :--- \| :--- \|/;
    if (content.match(historyHeaderRegex)) {
        const author = process.env.MAGIC_AUTHOR || 'Agent';
        const entry = `| ${newVersion || '?.?.?'} | ${date} | ${author} | ${msg} |`;
        // Find the last history row or append after header
        content = content.replace(historyHeaderRegex, `$&\n${entry}`);
    } else {
        // Simple history fallback
        const simpleHistoryHeader = /\| Version \| Date \| Description \|\n\| :--- \| :--- \| :--- \|/;
        if (content.match(simpleHistoryHeader)) {
             const entry = `| ${newVersion || '?.?.?'} | ${date} | ${msg} |`;
             content = content.replace(simpleHistoryHeader, `$&\n${entry}`);
        }
    }

    fs.writeFileSync(filePath, content);
}

// ───────────────────────────────────────────────────────────────────────────
// Hygiene Pass (MD012 Fix)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Fixes MD012 (Multiple consecutive blank lines) in a file.
 */
function runHygiene(targetFiles) {
    console.log('🧹 Running documentation hygiene (MD012)...');
    for (const file of targetFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            // Replace 3 or more newlines with 2 (leaving exactly one blank line)
            const cleaned = content.replace(/\n{3,}/g, '\n\n');
            if (content !== cleaned) {
                fs.writeFileSync(file, cleaned);
                console.log(`  ✨ Cleaned: ${path.relative(process.cwd(), file)}`);
            }
        }
    }
}

// Execute
try {
    updateProjectMeta();
    
    // Project-wide documentation hygiene
    const docsToClean = [
        path.join(process.cwd(), 'CHANGELOG.md'),
        path.join(process.cwd(), 'README.md'),
        path.join(process.cwd(), 'CONTRIBUTING.md'),
        globalIndexPath, // INDEX.md
        rulesPath        // RULES.md
    ];
    runHygiene(docsToClean);

} catch (error) {
    console.error(`❌ Metadata update failed: ${error.message}`);
    process.exit(1);
}
