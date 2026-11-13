// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// HARNESS BASE FIXTURES (shared by every domain module)
// ═══════════════════════════════════════════════════════════════════════════

const _assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');

const TESTS_DIR = path.resolve(__dirname, '..', '..');
const ROOT = path.resolve(TESTS_DIR, '..');
// The scripts under test are the engine's own; fixtures are laid out as the developer repository is
// (the engine at skills/magicspec, the maintenance scripts at scripts).
const scriptsDir = path.resolve(TESTS_DIR, '..', 'skills', 'magicspec', 'scripts');
const devScriptsDir = path.resolve(TESTS_DIR, '..', 'scripts');

const scaffoldTempDirs = (tempDir) => {
    fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib'), {
        recursive: true,
    });
    fs.mkdirSync(path.join(tempDir, 'skills', 'magicspec', 'templates'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'scripts'), { recursive: true });
};

const copyDirShallow = (src, dst) => {
    if (!fs.existsSync(src)) return;
    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        if (fs.statSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, path.join(dst, entry));
        }
    }
};

const initGitFixture = (tempDir) => {
    try {
        execSync('git init -b master', { cwd: tempDir, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
        execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
        // Initial commit with a baseline file
        fs.writeFileSync(
            path.join(tempDir, 'README.md'),
            '# Test Project\n**Active Development** (v0.0.1)\n',
        );
        execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
    } catch (e) {
        console.warn('Note: Git initialization failed in test, some tests may skip drift check.');
        console.error(e.message);
    }
};

/** Makes `dir` a git repository with everything in it committed, for a case that reads the working tree against a commit. */
const commitAllInFixture = (dir) => {
    const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    git('init', '-b', 'master');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test User');
    git('add', '.');
    git('commit', '-m', 'init');
};

const createTempWorkspace = (withGit = false) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-test-'));
    scaffoldTempDirs(tempDir);

    copyDirShallow(scriptsDir, path.join(tempDir, 'skills', 'magicspec', 'scripts'));
    copyDirShallow(
        path.join(scriptsDir, 'lib'),
        path.join(tempDir, 'skills', 'magicspec', 'scripts', 'lib'),
    );
    copyDirShallow(devScriptsDir, path.join(tempDir, 'scripts'));

    fs.writeFileSync(path.join(tempDir, 'skills', 'magicspec', '.version'), '1.0.0');

    if (withGit) initGitFixture(tempDir);

    return tempDir;
};

// Engine modules read the project root once, when they load. A module loaded
// in-process from a fixture is therefore loaded with the fixture as the root,
// as an executor run from inside the fixture would have it.
const requireFromFixture = (fixtureDir, ...parts) => {
    const previous = process.env.MAGIC_ROOT;
    process.env.MAGIC_ROOT = fixtureDir;
    try {
        return require(path.join(fixtureDir, 'skills', 'magicspec', 'scripts', ...parts));
    } finally {
        if (previous === undefined) delete process.env.MAGIC_ROOT;
        else process.env.MAGIC_ROOT = previous;
    }
};

const cleanup = (dir) => {
    if (dir && fs.existsSync(dir)) {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    }
};

// STATE.md "Blocking Constraints" body: `count` numbered anti-pattern bullets.
const antiPatternLines = (count) =>
    Array.from(
        { length: count },
        (_, i) =>
            `- [C-${String(i + 1).padStart(3, '0')}] **Anti-pattern ${i + 1}**: never do this.`,
    );

// Runs generate-context.js in a temp workspace and returns the CONTEXT.md text.
const generateContext = (tempDir) => {
    const scriptPath = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'generate-context.js');
    execSync(`node "${scriptPath}"`, { cwd: tempDir, stdio: 'pipe' });
    return fs.readFileSync(path.join(tempDir, '.magicspec', 'CONTEXT.md'), 'utf8');
};

// Loads the changelog writer from a temp workspace's engine copy.
const loadChangelogWriter = (tempDir) => requireFromFixture(tempDir, 'lib', 'changelog-writer.js');

// Runs the developer-only checksum manifest builder inside a temp workspace,
// so scripts gated on engine integrity (check-prerequisites, update-engine-meta)
// see a consistent skills/magicspec/.checksums.
const generateChecksums = (tempDir) => {
    const checksumScript = path.join(tempDir, 'scripts', 'generate-checksums.js');
    execSync(`node "${checksumScript}"`, { cwd: tempDir, stdio: 'pipe' });
};

// Runs update-engine-meta.js --check in a temp workspace, returning
// { failed: boolean, output: string }.
const runEngineMetaCheck = (tempDir) => {
    const metaScript = path.join(
        tempDir,
        'skills',
        'magicspec',
        'scripts',
        'update-engine-meta.js',
    );
    try {
        const stdout = execSync(`node "${metaScript}" --check`, {
            cwd: tempDir,
            encoding: 'utf8',
            stdio: 'pipe',
        });
        return { failed: false, output: stdout };
    } catch (e) {
        return { failed: true, output: `${e.stdout || ''}${e.stderr || ''}` };
    }
};

// Copies the real state.md template into a temp workspace, so bootstrap
// paths exercise template-driven behavior instead of a from-scratch write.
// No-op if the source template is absent (mirrors the guard every call site used).
const copyStateTemplate = (tempDir) => {
    const realTemplate = path.resolve(
        TESTS_DIR,
        '..',
        'skills',
        'magicspec',
        'templates',
        'state.md',
    );
    if (fs.existsSync(realTemplate)) {
        fs.copyFileSync(
            realTemplate,
            path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'),
        );
    }
};

// Copies the real global-index.md template into a temp workspace, mirroring
// copyStateTemplate above, so init.js's Auto-Init path exercises the real
// template instead of the empty-string fallback getTemplate() uses when a
// template file is absent.
const copyGlobalIndexTemplate = (tempDir) => {
    const realTemplate = path.resolve(
        TESTS_DIR,
        '..',
        'skills',
        'magicspec',
        'templates',
        'global-index.md',
    );
    if (fs.existsSync(realTemplate)) {
        fs.copyFileSync(
            realTemplate,
            path.join(tempDir, 'skills', 'magicspec', 'templates', 'global-index.md'),
        );
    }
};

// Creates `.magicspec/{workspace}/` inside a temp workspace.
const makeWorkspace = (tempDir, workspace = 'engine') => {
    const wsDir = path.join(tempDir, '.magicspec', workspace);
    fs.mkdirSync(wsDir, { recursive: true });
    return wsDir;
};

// Creates `.magicspec/{workspace}/tasks/` inside a temp workspace, returning
// the paths phase/task fixtures are written under.
const makeWorkspaceWithTasks = (tempDir, workspace = 'engine') => {
    const wsDir = makeWorkspace(tempDir, workspace);
    const tasksDir = path.join(wsDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    return { wsDir, tasksDir, tasksPath: path.join(wsDir, 'TASKS.md') };
};

// Builds the git-backed workspace every finalize end-to-end test needs:
// workspace.json with finalization enabled, a starting version, and the
// paths those tests assert against. Caller supplies the workspace content,
// then calls commitFixture() to establish a clean baseline.
const createFinalizeFixture = (
    tempDir,
    { workspace = 'main', version = '0.1.0', autoChangelog = false } = {},
) => {
    copyStateTemplate(tempDir);
    const designDir = path.join(tempDir, '.magicspec');
    const wsDir = makeWorkspace(tempDir, workspace);
    fs.writeFileSync(
        path.join(designDir, 'workspace.json'),
        JSON.stringify({
            default: workspace,
            finalization: {
                enabled: true,
                autoBump: true,
                autoChangelog,
                versionPath: '.magicspec/.version',
            },
        }),
    );
    fs.writeFileSync(path.join(designDir, '.version'), version);
    return {
        designDir,
        wsDir,
        versionPath: path.join(designDir, '.version'),
        finalizePath: path.join(tempDir, 'skills', 'magicspec', 'scripts', 'finalize.js'),
    };
};

// Commits the fixture so HEAD exists and the working tree starts clean —
// finalize reads the diff against HEAD, so a dirty baseline would blur
// which change the assertion is actually about.
const commitFixture = (tempDir) => {
    execSync('git add -A', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "fixture"', { cwd: tempDir, stdio: 'ignore' });
};

// require()s phase-archiver.js and creates its workspace fixture in one
// step — the pairing every phase-archiver test starts with.
const requirePhaseArchiverWorkspace = (tempDir) => {
    const archiver = requireFromFixture(tempDir, 'lib', 'phase-archiver.js');
    return { archiver, ...makeWorkspaceWithTasks(tempDir) };
};

// Writes a minimal `l1-core.md` spec with a Canonical References entry for
// `src/`, used by the Invariant 7 gitignore-parity fixtures.
const writeCanonicalCoreSpec = (tempDir) => {
    const specsDir = path.join(tempDir, '.magicspec', 'specifications');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.writeFileSync(
        path.join(specsDir, 'l1-core.md'),
        '# Core\n\n## Canonical References\n\n| Path | Description |\n| :--- | :--- |\n| `src/` | Source tree |\n',
    );
    return specsDir;
};

// require()s finalize.js and creates its workspace-with-tasks fixture in
// one step — the pairing every computeNextAction test (§7b) starts with.
const requireFinalizeWorkspace = (tempDir) => {
    const finalize = requireFromFixture(tempDir, 'finalize.js');
    return { finalize, ...makeWorkspaceWithTasks(tempDir) };
};

// The canonical two-level TASKS.md registry: one Phase-1 "Bootstrap" row,
// `status` defaulting to `In Progress`. Every computeNextAction test that
// needs the registry-table format (rather than the legacy inline-checkbox
// format) builds it from here instead of re-typing the same array.
const registryTable = (status = 'In Progress') =>
    [
        '# Master Task Index',
        '',
        '## Active Phases',
        '',
        '| Phase | Description | Status |',
        '| --- | --- | --- |',
        `| [Phase 1](tasks/phase-1.md) | Bootstrap | \`${status}\` |`,
        '',
    ].join('\n');

// A phase workbook: frontmatter, an Atomic Checklist, then `rest` (a Detailed Tracking section,
// notes) — the file every classifyPlanState / computeNextAction case writes.
const phaseWorkbook = (items, { status = 'In Progress', rest = [] } = {}) =>
    [
        '---',
        'phase: 1',
        `status: ${status}`,
        '---',
        '',
        '## Atomic Checklist',
        '',
        ...items,
        '',
        ...rest,
    ].join('\n');

// requireFinalizeWorkspace() plus a registry at `registryStatus`, and `writePhase(items, options)`
// to write the phase workbook: the start of every finalize case that plants one phase.
const requireFinalizePlan = (tempDir, registryStatus = 'In Progress') => {
    const plan = requireFinalizeWorkspace(tempDir);
    fs.writeFileSync(plan.tasksPath, registryTable(registryStatus));
    const writePhase = (items, options) =>
        fs.writeFileSync(path.join(plan.tasksDir, 'phase-1.md'), phaseWorkbook(items, options));
    return { ...plan, writePhase };
};

// require()s update-state.js and creates a plain single-workspace fixture
// in one step — the pairing every autoProgress/computeProgress test (§7e)
// starts with.
const requireUpdateState = (tempDir) => {
    const { updateState } = requireFromFixture(tempDir, 'update-state.js');
    return { updateState, wsDir: makeWorkspace(tempDir) };
};

// Same pairing, but with a tasks/ directory too — for the computeProgress
// test that needs a phase file alongside TASKS.md.
const requireUpdateStateWithTasks = (tempDir) => {
    const { updateState } = requireFromFixture(tempDir, 'update-state.js');
    return { updateState, ...makeWorkspaceWithTasks(tempDir) };
};

// Runs autoProgress and reads back STATE.md — the "recompute, then
// inspect" tail shared by every autoProgress assertion in §7e. `patch` is
// the field-patch object forwarded as updateState's 2nd argument, for the
// one test that recomputes progress alongside a field write.
const autoProgressState = (updateState, wsDir, patch = {}) => {
    updateState(wsDir, patch, { autoProgress: true });
    return fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
};

// Runs `fn` and returns everything it sent to stderr through console.warn —
// the shared tail of the update-state tests that assert on what the script
// announces (line-cap guard, section creation).
const warnedBy = (fn) => {
    const original = console.warn;
    const messages = [];
    console.warn = (...args) => messages.push(args.join(' '));
    try {
        fn();
    } finally {
        console.warn = original;
    }
    return messages;
};

// Writes a file at tempDir/rel (POSIX-style relative path), creating
// parent directories as needed. Shared by fixtures that build an ad hoc
// file tree rather than a full .magicspec/ workspace (§15, §18).
const writeTreeFile = (tempDir, rel, body) => {
    const abs = path.join(tempDir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
};

// Creates `.magicspec/specifications/` inside a temp workspace and returns
// both paths — the fixture every check-prerequisites.js registry/header
// test (§6) starts from.
const makeSpecWorkspace = (tempDir) => {
    const designDir = path.join(tempDir, '.magicspec');
    const specsDir = path.join(designDir, 'specifications');
    fs.mkdirSync(specsDir, { recursive: true });
    return { designDir, specsDir };
};

// makeSpecWorkspace() plus a single genuine `l1-real.md` spec with a
// matching header — the fixture both registry-scan (SH-1/SH-4) tests in
// §6b start from before diverging on INDEX.md/PLAN.md content.
const makeRegistryScanWorkspace = (tempDir) => {
    const { designDir, specsDir } = makeSpecWorkspace(tempDir);
    fs.writeFileSync(
        path.join(specsDir, 'l1-real.md'),
        '# Real\n\n**Version:** 1.0.0\n**Status:** Stable\n',
    );
    return { designDir, specsDir };
};

// Runs check-prerequisites.js against tempDir with the given flags and
// returns the parsed --json result.
const runCheckPrerequisites = (tempDir, ...extraArgs) => {
    const scriptPath = path.join(
        tempDir,
        'skills',
        'magicspec',
        'scripts',
        'check-prerequisites.js',
    );
    const output = execSync(`node "${scriptPath}" --json ${extraArgs.join(' ')}`.trim(), {
        cwd: tempDir,
        encoding: 'utf8',
    });
    return JSON.parse(output);
};

// Minimal `.magicspec/` bootstrap (empty specifications/, INDEX.md, RULES.md)
// used by every DESIGN_DEBT_PENDING (SC-2.4) probe in §6b2 — none of them
// exercise spec content, only PLAN.md/TASKS.md.
const makeMinimalDesignDir = (tempDir) => {
    const designDir = path.join(tempDir, '.magicspec');
    fs.mkdirSync(path.join(designDir, 'specifications'), { recursive: true });
    fs.writeFileSync(path.join(designDir, 'INDEX.md'), '# Index\n\n**Version:** 1.0.0\n');
    fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
    return designDir;
};

// Factory for the repeated DESIGN_DEBT_PENDING probe: writes Backlog (and
// optionally Active Phases) content, runs check-prerequisites, and
// returns the warning (or undefined). `tasksBody` is optional — when a
// test's TASKS.md is fixed for the whole run, omit it and only PLAN.md is
// rewritten per call.
const makeDebtWarningFinder = (tempDir, designDir) => (planBody, tasksBody) => {
    fs.writeFileSync(path.join(designDir, 'PLAN.md'), `# Plan\n\n## Backlog\n\n${planBody}\n`);
    if (tasksBody !== undefined) {
        fs.writeFileSync(
            path.join(designDir, 'TASKS.md'),
            `# Tasks\n\n## Active Phases\n\n${tasksBody}\n`,
        );
    }
    return runCheckPrerequisites(tempDir).warnings.find((w) => w.type === 'DESIGN_DEBT_PENDING');
};
module.exports = {
    ROOT,
    TESTS_DIR,
    scriptsDir,
    devScriptsDir,
    scaffoldTempDirs,
    copyDirShallow,
    initGitFixture,
    commitAllInFixture,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    antiPatternLines,
    generateContext,
    loadChangelogWriter,
    generateChecksums,
    runEngineMetaCheck,
    copyStateTemplate,
    copyGlobalIndexTemplate,
    makeWorkspace,
    makeWorkspaceWithTasks,
    createFinalizeFixture,
    commitFixture,
    requirePhaseArchiverWorkspace,
    writeCanonicalCoreSpec,
    requireFinalizeWorkspace,
    registryTable,
    phaseWorkbook,
    requireFinalizePlan,
    requireUpdateState,
    requireUpdateStateWithTasks,
    autoProgressState,
    warnedBy,
    writeTreeFile,
    makeSpecWorkspace,
    makeRegistryScanWorkspace,
    runCheckPrerequisites,
    makeMinimalDesignDir,
    makeDebtWarningFinder,
};
