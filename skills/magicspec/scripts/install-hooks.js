#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveProjectRoot, engineRel, HOOK_MARKER } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const projectRoot = resolveProjectRoot();
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

/**
 * Where the hook finds the engine: written at install time from the folder this
 * installer belongs to, relative to the project root (absolute when the engine lies
 * outside the project). A hook is local to a clone and never committed, so the
 * location can be concrete; if the engine is later moved or removed, the hook says
 * so and lets the commit through instead of failing it.
 */
const ENGINE_REL = engineRel();
const EXECUTOR_REL = `${ENGINE_REL}/scripts/executor.js`;
const SAFE_WORD = /^[\w./:@-]+$/;

/**
 * A word for sh: bare when it holds only safe characters, single-quoted otherwise.
 *
 * @param {string} text - The word.
 * @returns {string} The word as sh reads it back.
 */
function shellWord(text) {
    return SAFE_WORD.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
}

/**
 * Text for inside a double-quoted sh string.
 *
 * @param {string} text - The text.
 * @returns {string} The text with the characters sh would expand escaped.
 */
function inDoubleQuotes(text) {
    return text.replace(/[\\"$`]/g, '\\$&');
}

/** The one line a user adds to a hook of their own to run the same check. */
const CHAIN_LINE = `node ${shellWord(EXECUTOR_REL)} update-engine-meta --check || exit 1`;

/** Probes the engine folder with the runtime: only a path that does not exist counts as absent. */
const PROBE_LINE = SAFE_WORD.test(ENGINE_REL)
    ? `node -e "try{require('fs').statSync('${ENGINE_REL}')}catch(e){process.exit(e.code==='ENOENT'?3:0)}" 2>/dev/null`
    : `MAGIC_PROBE=${shellWord(ENGINE_REL)} node -e "try{require('fs').statSync(process.env.MAGIC_PROBE)}catch(e){process.exit(e.code==='ENOENT'?3:0)}" 2>/dev/null`;

const SHOWN_ENGINE = inDoubleQuotes(ENGINE_REL);

const hookContent = `#!/bin/sh
${HOOK_MARKER}
# Ensures engine integrity and metadata sync before commit.

# Without the engine there is nothing to check: say so and let the commit through.
# Only a folder that does not exist counts as absent; one that cannot be inspected counts
# as present, so the check below still runs. A folder with files missing is not absent: the
# check below runs and blocks the commit.
${PROBE_LINE}
if [ $? -eq 3 ]; then
  echo "[Magic Sync] The engine (${SHOWN_ENGINE}/) is not installed here, so nothing was checked. Delete .git/hooks/pre-commit if you removed the engine on purpose."
  exit 0
fi

echo "[Magic Sync] Checking engine integrity..."
node ${shellWord(EXECUTOR_REL)} update-engine-meta --check

if [ $? -ne 0 ]; then
  echo "[Magic Sync] Engine drift detected in ${SHOWN_ENGINE}/."
  echo "[Magic Sync] If this is unintended: restore ${SHOWN_ENGINE}/ from the magic-spec release archive."
  echo "[Magic Sync] If this is an engine-improvement task: run 'node ${inDoubleQuotes(shellWord(EXECUTOR_REL))} update-engine-meta' (developer install only)."
  exit 1
fi

echo "[Magic Sync] Engine in sync. Proceeding to commit..."
exit 0
`;

// ═══════════════════════════════════════════════════════════════════════════
// OWNERSHIP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tells whether a path is a symbolic link, without following it.
 *
 * @param {string} target - Path to inspect.
 * @returns {boolean} True only for a symbolic link; false for anything else, including a missing path.
 */
function isSymbolicLink(target) {
    try {
        return fs.lstatSync(target).isSymbolicLink();
    } catch {
        return false;
    }
}

/**
 * Asks git where it reads hooks from when that is not `.git/hooks`.
 * Fails open: when git cannot answer (not a repository, git not installed),
 * the setting counts as unset and the hook is written where it always was.
 *
 * @returns {string|null} The redirecting directory, or null when git reads `.git/hooks`.
 */
function redirectedHooksPath() {
    const result = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
        cwd: projectRoot,
        encoding: 'utf8',
    });
    if (result.error || result.status !== 0) return null;
    const configured = result.stdout.trim();
    if (configured === '') return null;
    try {
        const resolved = fs.realpathSync(path.resolve(projectRoot, configured));
        if (resolved === fs.realpathSync(gitHooksDir)) return null;
    } catch {
        // The configured directory does not exist: git is still pointed elsewhere.
    }
    return configured;
}

/**
 * Names a free place beside the hook to keep a copy of the file it replaces.
 * Never returns a name that is already taken, so no earlier copy is overwritten.
 *
 * @returns {string} Absolute path of the copy.
 */
function freeCopyPath() {
    const base = `${preCommitPath}.magic-spec.bak`;
    if (!fs.existsSync(base)) return base;
    let n = 1;
    while (fs.existsSync(`${base}.${n}`)) n++;
    return `${base}.${n}`;
}

/**
 * Reports a hook the installer will not touch, prints the one line that chains
 * the check into it, and gives the caller a non-zero exit code.
 *
 * @param {string} reason - Why nothing was written.
 * @returns {number} Exit code 1.
 */
function leaveAlone(reason) {
    console.error(`Git pre-commit hook not installed: ${reason}.`);
    console.error('To run the integrity check from your own hook, add this line to it:');
    console.error(`  ${CHAIN_LINE}`);
    return 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTALLATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Writes the hook and makes it executable where the platform has the bit.
 *
 * @returns {void}
 */
function writeHook() {
    fs.writeFileSync(preCommitPath, hookContent);

    // In Windows, the execute permission is handled differently,
    // but Git Bash follows the #! header regardless.
    try {
        fs.chmodSync(preCommitPath, 0o755);
    } catch {
        // Ignore chmod errors on some Windows setups if they occur
    }
}

/**
 * Installs the pre-commit hook without destroying one it did not write.
 * No file: write it. The marker with exactly this body: nothing to do. The
 * marker with another body: keep the old bytes beside it, then replace it.
 * Anything else belongs to the user's tooling and is left alone.
 *
 * @returns {number} Process exit code: 0 when the hook is in place, 1 otherwise.
 */
function install() {
    if (isSymbolicLink(gitHooksDir)) {
        return leaveAlone('.git/hooks is a symbolic link, so its target belongs to someone else');
    }
    const redirect = redirectedHooksPath();
    if (redirect !== null) {
        return leaveAlone(`core.hooksPath points git at ${redirect}, which is not .git/hooks`);
    }
    if (isSymbolicLink(preCommitPath)) {
        return leaveAlone(
            '.git/hooks/pre-commit is a symbolic link, so its target belongs to someone else',
        );
    }

    if (!fs.existsSync(preCommitPath)) {
        writeHook();
        console.log('Git pre-commit hook installed successfully.');
        return 0;
    }

    const current = fs.readFileSync(preCommitPath, 'utf8');
    if (!current.split(/\r?\n/).includes(HOOK_MARKER)) {
        return leaveAlone('a pre-commit hook that this installer did not write is already there');
    }
    if (current === hookContent) {
        console.log('Git pre-commit hook is already installed.');
        return 0;
    }

    const copy = freeCopyPath();
    fs.copyFileSync(preCommitPath, copy, fs.constants.COPYFILE_EXCL);
    writeHook();
    console.log(
        `Git pre-commit hook updated. The previous hook is kept as ${path.relative(projectRoot, copy)}.`,
    );
    return 0;
}

try {
    process.exitCode = install();
} catch (e) {
    console.error('Failed to install Git hook:', e.message);
    process.exitCode = 1;
}
