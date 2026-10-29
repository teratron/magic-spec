const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE RELEASE AUTOMATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates, tags and pushes a new engine release; the tag push triggers the GitHub
 * Actions release workflow, so the script publishes only when it is told to.
 *
 *   node scripts/release.js          prints the plan and the blockers; changes nothing
 *   node scripts/release.js --yes    runs the QA gate, C14 and the sync, commits what they
 *                                    changed, tags, and pushes the branch and the tag
 *   node scripts/release.js --help   this text
 */

const USAGE = `Usage: node scripts/release.js [--yes]

  (no option)  Print the release plan and what blocks it; change nothing.
  --yes        Publish: QA gate, C14 and sync, one release commit of what they changed,
               the tag, and a push of the current branch and the tag. The tag push starts
               the GitHub Release workflow and cannot be recalled.
  --help       Show this text.`;

function log(msg) {
    console.log(`\x1b[36m[RELEASE]\x1b[0m ${msg}`);
}
function success(msg) {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`);
}
function error(msg) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
    process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(ROOT_DIR, 'skills/magicspec/.version');
const CHANGELOG_FILE = path.join(ROOT_DIR, 'CHANGELOG.md');

// ───────────────────────────────────────────────────────────────────────────
// Arguments
// ───────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    process.exit(0);
}
const unknown = argv.filter((a) => a !== '--yes');
if (unknown.length > 0) {
    console.error(`HALT: Unknown argument '${unknown[0]}'.\n${USAGE}`);
    process.exit(2);
}
const publish = argv.includes('--yes');

// ───────────────────────────────────────────────────────────────────────────
// Git helpers (argument lists, never a shell string)
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} args - Arguments for git.
 * @returns {string} Trimmed stdout.
 * @throws {Error} When git exits non-zero.
 */
function git(args) {
    return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
}

/**
 * @param {string[]} args - Arguments for git.
 * @returns {boolean} True when git exits 0.
 */
function gitOk(args) {
    try {
        git(args);
        return true;
    } catch {
        return false;
    }
}

// ───────────────────────────────────────────────────────────────────────────
// 1. Facts
// ───────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(VERSION_FILE)) error('skills/magicspec/.version missing');
const version = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
const tagName = `v${version}`;
const blockers = [];

let branch = '';
try {
    branch = git(['branch', '--show-current']);
} catch {
    /* not a repository: reported below */
}
if (!branch) blockers.push('HEAD is not on a branch (detached or not a repository)');

const pending = (() => {
    try {
        return git(['status', '--porcelain']).split('\n').filter(Boolean);
    } catch {
        return [];
    }
})();
if (pending.length > 0) {
    blockers.push(
        `the working tree is not clean (${pending.length} change(s); first: ${pending[0]}); commit or stash them so the release commit holds only what the release steps change`,
    );
}

if (fs.existsSync(CHANGELOG_FILE)) {
    const changelog = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
    if (!changelog.includes(`## [${version}]`)) {
        blockers.push(`CHANGELOG.md has no entry for [${version}]`);
    }
} else {
    log('Warning: CHANGELOG.md missing.');
}

if (gitOk(['rev-parse', '--verify', '--quiet', `refs/tags/${tagName}`])) {
    blockers.push(`tag ${tagName} already exists locally; bump the version or delete the tag deliberately`);
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Plan (the default) or refusal
// ───────────────────────────────────────────────────────────────────────────

log(`Release plan for ${tagName}${publish ? '' : ' (nothing is changed without --yes)'}:`);
log(`  branch:    ${branch || '(none)'} → origin/${branch || '?'}`);
log(`  version:   ${version} (skills/magicspec/.version)`);
log('  steps:     QA gate (node tests/engine.js) → C14 + sync → release commit of what they changed → tag → push branch and tag');
for (const b of blockers) console.error(`\x1b[31m[BLOCKED]\x1b[0m ${b}`);

if (!publish) {
    log(blockers.length === 0 ? 'Ready. Run with --yes to publish.' : 'Not ready: resolve the blockers above.');
    process.exit(blockers.length === 0 ? 0 : 1);
}
if (blockers.length > 0) error('Refusing to publish: resolve the blockers above.');

// ───────────────────────────────────────────────────────────────────────────
// 3. Publish
// ───────────────────────────────────────────────────────────────────────────

log('Running engine tests (QA Gate)...');
try {
    execFileSync(process.execPath, ['tests/engine.js'], { stdio: 'inherit', cwd: ROOT_DIR });
} catch {
    error('Engine tests failed. Fix issues before releasing.');
}

log('Synchronizing metadata and documentation...');
try {
    // The executor gives the engine its environment and runs C14. `sync` is a maintenance
    // orchestrator (scripts/sync.js) with no engine counterpart, so it is started directly.
    execFileSync(process.execPath, ['skills/magicspec/scripts/executor.js', 'update-engine-meta'], {
        stdio: 'inherit',
        cwd: ROOT_DIR,
    });
    execFileSync(process.execPath, ['scripts/sync.js'], { stdio: 'inherit', cwd: ROOT_DIR });
} catch {
    error('Metadata synchronization failed.');
}

const releasedVersion = fs.readFileSync(VERSION_FILE, 'utf-8').trim();
if (releasedVersion !== version) {
    error(
        `C14 moved the version ${version} → ${releasedVersion} during the release; the changelog entry and the tag would disagree. Nothing was committed, tagged or pushed.`,
    );
}

log('Committing release artifacts...');
try {
    // The tree was clean at the start, so everything changed now came from the steps above.
    if (git(['status', '--porcelain'])) {
        git(['add', '-A']);
        git(['commit', '-m', `chore: release ${tagName}`]);
    } else {
        log('Working tree clean. No new changes to commit.');
    }
} catch (e) {
    error(`Could not commit the release artifacts: ${e.message}`);
}

log(`Creating tag ${tagName}...`);
try {
    git(['tag', '-a', tagName, '-m', `${tagName} Release`]);
} catch (e) {
    error(`Could not create tag ${tagName}: ${e.message}`);
}

log(`Pushing ${branch} and ${tagName} to origin...`);
try {
    git(['push', 'origin', branch]);
    git(['push', 'origin', tagName]);
} catch {
    error('Failed to push to origin. Verify git configuration and network.');
}

success(`${tagName} release initiated successfully!`);
log('Verify the build at: https://github.com/teratron/magic-spec/actions');
