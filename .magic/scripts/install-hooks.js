const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const gitHooksDir = path.join(projectRoot, '.git', 'hooks');

if (!fs.existsSync(gitHooksDir)) {
    console.error('Error: .git directory not found. Are you in a Git repository?');
    process.exit(1);
}

const preCommitPath = path.join(gitHooksDir, 'pre-commit');

const hookContent = `#!/bin/sh
# Magic Spec Pre-commit Hook
# Ensures engine integrity and metadata sync before commit.

echo "🔍 Magic Sync: Checking engine integrity..."
node .magic/scripts/executor.js update-engine-meta --check

if [ $? -ne 0 ]; then
  echo "❌ Engine drift detected! Run '/magic.dev.sync' or 'update-engine-meta' to fix metadata before committing."
  exit 1
fi

echo "✅ Engine in sync. Proceeding to commit..."
exit 0
`;

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

    console.log('✅ Git pre-commit hook installed successfully.');
} catch (e) {
    console.error('Failed to install Git hook:', e.message);
}
