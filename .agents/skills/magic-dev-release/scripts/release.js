const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE RELEASE AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Automates the validation, tagging, and pushing of a new engine release.
 * Triggers the GitHub Actions release workflow via tag push.
 */

function log(msg) { console.log(`\x1b[36m[RELEASE]\x1b[0m ${msg}`); }
function success(msg) { console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`); }
function error(msg) { console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`); process.exit(1); }

const ROOT_DIR = path.resolve(__dirname, '../../../../');
const VERSION_FILE = path.join(ROOT_DIR, '.magic/.version');
const CHANGELOG_FILE = path.join(ROOT_DIR, 'CHANGELOG.md');

// 1. Version Discovery
if (!fs.existsSync(VERSION_FILE)) error('.magic/.version missing');
const version = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
log(`Preparing release for v${version}...`);

// 2. Validation
log('Validating environment...');

// Check Changelog
if (fs.existsSync(CHANGELOG_FILE)) {
    const changelog = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
    if (!changelog.includes(`## [${version}]`)) {
        error(`CHANGELOG.md does not contain an entry for [${version}]. Please update it first.`);
    }
} else {
    log('Warning: CHANGELOG.md missing.');
}

// 3. Run Tests
log('Running engine tests (QA Gate)...');
try {
    execSync('node dev/tests/engine.js', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (e) {
    error('Engine tests failed. Fix issues before releasing.');
}

// 4. Update Meta & Sync
log('Synchronizing metadata and documentation...');
try {
    // We use the executor to ensure proper environment and C14 updates
    execSync('node .magic/scripts/executor.js update-engine-meta', { stdio: 'inherit', cwd: ROOT_DIR });
    execSync('node .magic/scripts/executor.js sync', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (e) {
    error('Metadata synchronization failed.');
}

// 5. Git Automation
log('Checking git state...');
try {
    const status = execSync('git status --porcelain', { cwd: ROOT_DIR }).toString().trim();
    if (status) {
        log('Changes detected. Committing release artifacts...');
        execSync('git add .', { cwd: ROOT_DIR });
        execSync(`git commit -m "chore: release v${version}"`, { cwd: ROOT_DIR });
    } else {
        log('Working tree clean. No new changes to commit.');
    }
} catch (e) {
    // git commit fails if there's nothing to commit, which we handled with status check, 
    // but just in case of race conditions.
}

// 6. Tagging
const tagName = `v${version}`;
log(`Creating tag ${tagName}...`);
try {
    // Delete tag if it exists locally to avoid conflicts (dangerous but useful for retries)
    // Actually, let's just try to create it and fail if exists.
    execSync(`git tag -a ${tagName} -m "${tagName} Release"`, { cwd: ROOT_DIR });
} catch (e) {
    log(`Warning: Tag ${tagName} already exists locally.`);
}

// 7. Push
log('Pushing changes to origin...');
try {
    execSync('git push origin master', { cwd: ROOT_DIR });
    execSync(`git push origin ${tagName}`, { cwd: ROOT_DIR });
} catch (e) {
    error('Failed to push to origin. Verify git configuration and network.');
}

success(`v${version} release initiated successfully!`);
log('Verify the build at: https://github.com/teratron/magic-spec/actions');
