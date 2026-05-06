const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const projectRoot = process.cwd();
const gitHooksDir = path.join(projectRoot, '.git', 'hooks');

/**
 * Validates that the current directory is a Git repository.
 */
if (!fs.existsSync(gitHooksDir)) {
    console.error('Error: .git directory not found. Are you in a Git repository?');
    process.exit(1);
}

const preCommitPath = path.join(gitHooksDir, 'pre-commit');

// ═══════════════════════════════════════════════════════════════════════════
// HOOK CONTENT DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

const hookContent = `#!/bin/sh
# Magic Spec Pre-commit Hook
# Ensures engine integrity and metadata sync before commit.

echo "[Magic Sync] Checking engine integrity..."
node .magic/scripts/executor.js update-engine-meta --check

if [ $? -ne 0 ]; then
  echo "[Magic Sync] Engine drift detected! Run 'node .magic/scripts/executor.js update-engine-meta' to bump version and refresh checksums before committing."
  exit 1
fi

echo "[Magic Sync] Engine in sync. Proceeding to commit..."
exit 0
`;

// ═══════════════════════════════════════════════════════════════════════════
// INSTALLATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

try {
    // Write the hook file and make it executable (on Unix)
    fs.writeFileSync(preCommitPath, hookContent);

    // In Windows, the execute permission is handled differently, 
    // but Git Bash follows the #! header regardless.
    try {
        fs.chmodSync(preCommitPath, 0o755);
    } catch (chmodErr) {
        // Ignore chmod errors on some Windows setups if they occur
    }

    console.log('Git pre-commit hook installed successfully.');
} catch (e) {
    console.error('Failed to install Git hook:', e.message);
}
