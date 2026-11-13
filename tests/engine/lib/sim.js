// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CONSUMER-SIMULATION HELPERS (shared by the domains that run a consumer project)
// ═══════════════════════════════════════════════════════════════════════════

const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const {
    TESTS_DIR,
    scriptsDir,
    devScriptsDir,
    commitAllInFixture,
    createTempWorkspace,
    cleanup,
    commitFixture,
    requireUpdateState,
    warnedBy,
} = require('./base');

// ───────────────────────────────────────────────────────────────────────────
// 5b-ter. An integrity finding must say HOW a file differs, not only that it
//         does.
//
//     A field report — ENGINE_INTEGRITY for two engine files that were
//     byte-identical to the release both before and after — could not be
//     explained afterwards: "modified locally" was printed alike for an edit,
//     a line-ending conversion and a swapped manifest, and no hash was
//     recorded. The finding now carries the two short hashes and names the
//     one difference that is both common and invisible in an editor.
// ───────────────────────────────────────────────────────────────────────────

const sha256Hex = (text) => require('crypto').createHash('sha256').update(text).digest('hex');

const listFilesUnder = (dir, accept) => {
    if (!fs.existsSync(dir)) return [];
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...listFilesUnder(full, accept));
        else if (accept(full)) found.push(full);
    }
    return found;
};

const writeTreeFiles = (root, files) => {
    for (const [rel, content] of Object.entries(files)) {
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
    }
};

// A throwaway git project with one finished phase and one uncommitted change
// to its workbook, so a `magic.run` finalize counts the change as significant.
const makeArchivalProject = (archival, { done = true } = {}) => {
    const repoRoot = path.resolve(TESTS_DIR, '..');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-archival-'));
    fs.cpSync(path.join(repoRoot, 'skills', 'magicspec'), path.join(dir, 'skills', 'magicspec'), {
        recursive: true,
    });
    const ws = path.join(dir, '.magicspec', 'ws');
    fs.mkdirSync(path.join(ws, 'tasks'), { recursive: true });
    const config = { default: 'ws', workspaces: { ws: { description: 'fixture' } } };
    if (archival !== undefined) config.archival = archival;
    writeTreeFiles(dir, {
        '.gitignore': 'skills/magicspec/\n',
        '.magicspec/workspace.json': JSON.stringify(config, null, 2),
        '.magicspec/ws/INDEX.md': '# Index\n\n**Version:** 1.0.0\n',
        '.magicspec/ws/PLAN.md': '# Plan\n\n- Tasks: [tasks/phase-1.md](tasks/phase-1.md)\n',
        '.magicspec/ws/TASKS.md':
            '# Master Task Index\n\n| Phase | Description | Status |\n| --- | --- | --- |\n' +
            `| [Phase 1](tasks/phase-1.md) | Alpha | \`${done ? 'Done' : 'Todo'}\` |\n`,
        '.magicspec/ws/STATE.md':
            '# Project State\n\n**Workspace:** ws\n**Phase:** 1 — Alpha\n**Status:** Active\n\n' +
            '## Current Position\n\n- **Task:** none\n- **Next Action:** none\n\n' +
            '## Recent Decisions\n\n## Blockers\n\n## Blocking Constraints\n',
        '.magicspec/ws/tasks/phase-1.md':
            `---\nphase: 1\nname: "Alpha"\nstatus: ${done ? 'Done' : 'Todo'}\n---\n\n` +
            `## Atomic Checklist\n\n- [${done ? 'x' : ' '}] [T-1A01] Do it\n`,
    });
    commitAllInFixture(dir);
    fs.appendFileSync(path.join(ws, 'tasks', 'phase-1.md'), '\n<!-- touched -->\n');
    return { dir, ws };
};

const runEngine = (dir, ...args) =>
    spawnSync('node', ['skills/magicspec/scripts/executor.js', ...args], {
        cwd: dir,
        encoding: 'utf8',
    });

// A STATE.md an agent has trimmed by hand keeps its header fields,
// `## Current Position` and the `## Progress` fence, and loses the list
// sections `update-state` writes into. Both list writers used to guard
// their whole rebuild with `if (secStart !== -1)` and no alternative, so
// on such a file they accepted the request, wrote nothing, and the CLI
// still reported `STATE.md updated` (l2-finalize-state-accuracy.md §13).
const trimmedState = [
    '# Project State',
    '',
    '**Workspace:** docs',
    '**Updated:** 2026-01-01 00:00',
    '**Phase:** 2 — Build',
    '**Status:** Active',
    '',
    '## Current Position',
    '',
    '- **Task:** [T-2A01] Wire the parser',
    '- **Spec:** l1-example.md §3',
    '- **Next Action:** Continue',
    '',
    '## Progress',
    '',
    '```',
    'Overall: [1/2] ████░░░░ 50%',
    '```',
    '',
];
// Codes of every finding recorded so far in a temp workspace's sink.
const recordedCodes = (tempDir) => {
    const sink = path.join(tempDir, '.magicspec', '.cache', 'diagnostics.jsonl');
    if (!fs.existsSync(sink)) return [];
    return fs
        .readFileSync(sink, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line).code);
};

// Applies one updateState call to a STATE.md built from `lines` (joined with
// `eol`) in a throwaway workspace and returns what it left behind: the file,
// whatever it announced on stderr and the diagnostic codes it recorded.
// `files` are extra workspace files (a TASKS.md for the progress cases).
const patchState = (lines, patch, options = {}, { eol = '\n', files = {} } = {}) => {
    const tempDir = createTempWorkspace();
    try {
        const { updateState, wsDir } = requireUpdateState(tempDir);
        fs.writeFileSync(path.join(wsDir, 'STATE.md'), lines.join(eol));
        for (const [name, body] of Object.entries(files))
            fs.writeFileSync(path.join(wsDir, name), body);
        const warnings = warnedBy(() => updateState(wsDir, patch, options));
        return {
            after: fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8'),
            warnings,
            codes: recordedCodes(tempDir),
        };
    } finally {
        cleanup(tempDir);
    }
};

const gitIn = (dir, ...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });

// ───────────────────────────────────────────────────────────────────────────
// 16a-2. lib/diagnostics.js — revalidation before render (DG-10)
// ───────────────────────────────────────────────────────────────────────────

// Writes a controllable recheck target into a temp workspace's
// skills/magicspec/scripts/: echoes { warnings: JSON.parse(MAGIC_FIXTURE_WARNINGS) } and
// increments a counter file on every invocation, so tests can assert both
// what a recheck reports and how many times it actually ran (§4.10 step 2,
// signature collapse).
const writeRevalidateFixture = (tempDir) => {
    const src = [
        '#!/usr/bin/env node',
        "'use strict';",
        "const fs = require('fs');",
        "const path = require('path');",
        "const counterPath = path.join(__dirname, '..', '..', '..', '.magicspec', '.cache', 'revalidate-fixture-count.txt');",
        'try {',
        '    fs.mkdirSync(path.dirname(counterPath), { recursive: true });',
        '    const n = fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, "utf8"), 10) : 0;',
        '    fs.writeFileSync(counterPath, String(n + 1));',
        '} catch (e) { /* best-effort counter, never block the fixture output */ }',
        "console.log(JSON.stringify({ warnings: JSON.parse(process.env.MAGIC_FIXTURE_WARNINGS || '[]') }));",
        '',
    ].join('\n');
    fs.writeFileSync(
        path.join(tempDir, 'skills', 'magicspec', 'scripts', 'revalidate-fixture.js'),
        src,
    );
};

// The fixture is not one of the checkers a finding may name, so the loaded module is told about it.
const admitRevalidateFixture = (diagnostics) => {
    diagnostics.RECHECK_SCRIPTS.add('revalidate-fixture');
    diagnostics.RECHECK_ENV_KEYS.add('MAGIC_FIXTURE_WARNINGS');
    return diagnostics;
};

const revalidateFixtureCount = (tempDir) => {
    const counterPath = path.join(tempDir, '.magicspec', '.cache', 'revalidate-fixture-count.txt');
    return fs.existsSync(counterPath) ? parseInt(fs.readFileSync(counterPath, 'utf8'), 10) : 0;
};

// ───────────────────────────────────────────────────────────────────────────
// 20. resume-state.js — the one shared resume predicate (SC-9), and the
//     tracking-entry reader it shares with finalize.js (SC-8 parser safety).
//     Every case runs the real script through executor.js, never a
//     re-implementation of its predicate.
// ───────────────────────────────────────────────────────────────────────────

// A `### [T-…]` tracking entry the way a phase workbook writes it.
const trackingEntry = (id, title, status, extra = []) =>
    [
        `### [${id}] ${title}`,
        '',
        `- **Status:** ${status}`,
        '- **Assignment:** Agent',
        ...extra,
        '',
    ].join('\n');

const resumeStateText = (status, nextAction) =>
    [
        '# Project State',
        '',
        '**Workspace:** engine',
        '**Updated:** 2026-01-01 00:00',
        '**Phase:** 1 — Test',
        `**Status:** ${status}`,
        '',
        '## Current Position',
        '',
        '- **Task:** none',
        '- **Spec:** none',
        `- **Next Action:** ${nextAction}`,
        '',
        '## Session Continuity',
        '',
        '**Handoff File:** none',
        '**Bootstrap Mode:** false',
        '',
    ].join('\n');

// A STATE.md text with the goal block the writer would record (`goal` is the object the
// writer takes), placed where it puts it: before the section that follows it.
const withGoalSection = (text, goal) => {
    if (!goal) return text;
    const { normalizeGoal, renderGoalSection } = require(
        path.join(scriptsDir, 'lib', 'goal-block.js'),
    );
    return text.replace(
        '## Session Continuity',
        `${renderGoalSection(normalizeGoal(goal))}\n## Session Continuity`,
    );
};

// Writes the tree resume-state.js reads: a registry plus, per workspace, a
// STATE.md and (when given) one phase workbook of tracking entries.
const writeResumeFixture = (tempDir, workspaces, { eol = '\n', defaultWorkspace = null } = {}) => {
    const designDir = path.join(tempDir, '.magicspec');
    const toEol = (text) => text.replace(/\n/g, eol);
    const registry = {};
    for (const [name, def] of Object.entries(workspaces)) {
        registry[name] = { description: name, scope: ['.magicspec'] };
        const wsDir = path.join(designDir, name);
        fs.mkdirSync(path.join(wsDir, 'tasks'), { recursive: true });
        fs.writeFileSync(
            path.join(wsDir, 'STATE.md'),
            toEol(
                withGoalSection(
                    resumeStateText(
                        def.status || 'Active',
                        def.nextAction || 'Execute T-1A01 Thing via /magicspec run engine',
                    ),
                    def.goal,
                ),
            ),
        );
        if (def.entries) {
            fs.writeFileSync(
                path.join(wsDir, 'tasks', 'phase-1.md'),
                toEol(
                    [
                        '---',
                        'phase: 1',
                        'status: In Progress',
                        '---',
                        '',
                        '## Detailed Tracking',
                        '',
                        ...def.entries,
                    ].join('\n'),
                ),
            );
        }
        if (def.staleHandoff)
            fs.writeFileSync(path.join(wsDir, 'HANDOFF.json'), '{"schema_version":"1.1"}');
    }
    fs.writeFileSync(
        path.join(designDir, 'workspace.json'),
        JSON.stringify({
            default: defaultWorkspace || Object.keys(workspaces)[0],
            workspaces: registry,
        }),
    );
    return designDir;
};

// Path → digest of every file under `root` (`.git` excluded); a directory is
// its own entry, so a directory turning up where a file was is visible.
const treeDigest = (root) => {
    const crypto = require('crypto');
    const digest = {};
    const walk = (dir) => {
        for (const name of fs.readdirSync(dir).sort()) {
            if (name === '.git') continue;
            const full = path.join(dir, name);
            const rel = path.relative(root, full).split(path.sep).join('/');
            if (fs.statSync(full).isDirectory()) {
                digest[`${rel}/`] = 'dir';
                walk(full);
            } else {
                digest[rel] = crypto
                    .createHash('sha256')
                    .update(fs.readFileSync(full))
                    .digest('hex');
            }
        }
    };
    walk(root);
    return digest;
};

// ───────────────────────────────────────────────────────────────────────────
// 22. Shipped-text contracts — behavior that is prose (H10). The workflow
//     bodies and rules are read by an agent, so what they say IS the
//     behavior. Each contract states its detector once, proves the detector on
//     synthetic text (it must flag what it claims to and spare what it must),
//     and only then applies it to the shipped tree.
// ───────────────────────────────────────────────────────────────────────────

const shippedRoot = path.resolve(TESTS_DIR, '..');
const readShipped = (rel) => fs.readFileSync(path.join(shippedRoot, rel), 'utf8');

// Repo-relative POSIX paths of the files under `dir` with one of `extensions`.
const listShipped = (dir, extensions) => {
    const found = [];
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (!['history', '.git', 'node_modules'].includes(entry.name)) walk(full);
            } else if (extensions.includes(path.extname(entry.name))) {
                found.push(path.relative(shippedRoot, full).split(path.sep).join('/'));
            }
        }
    };
    if (fs.existsSync(path.join(shippedRoot, dir))) walk(path.join(shippedRoot, dir));
    return found.sort();
};

// The shipped engine bodies (`workflows/*.md` and `references/*.md`), not the templates and role cards.
const engineBodies = () =>
    listShipped('skills/magicspec', ['.md'])
        .filter((rel) => /^skills\/magicspec\/(workflows|references)\/[^/]+$/.test(rel))
        .map((rel) => ({ rel, text: readShipped(rel) }));

// The text of one numbered workflow step: its own line plus the indented
// lines beneath it, up to the next step or heading.
const stepBlock = (text, label) => {
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`${label} `));
    if (start === -1) return null;
    let end = start + 1;
    while (end < lines.length && /^\s/.test(lines[end])) end++;
    return lines.slice(start, end).join('\n');
};

// The first line of `text` that carries `label`. A guard or a step bullet is one
// line, so asserting on that line keeps a phrase elsewhere in the file from
// satisfying a check about this bullet. A missing text yields undefined.
const lineWith = (text, label) => (text ?? '').split(/\r?\n/).find((line) => line.includes(label));

// The Logic Guards of `run.md` (Core Invariant 4): the block its guard bullets live in.
const runGuards = () => {
    const run = readShipped('skills/magicspec/workflows/run.md');
    return run.slice(
        run.indexOf('4. **Logic Guards**'),
        run.indexOf('5. **Zero-Prompt Automation**'),
    );
};

// Numbered step `label` (e.g. `'4.'`) of the `### Steps` list of `run.md`.
const runStep = (label) => {
    const run = readShipped('skills/magicspec/workflows/run.md');
    return stepBlock(run.slice(run.indexOf('\n### Steps')), label);
};

// The first line of the role card `rel` that starts with `prefix` (an Operating Protocol step).
const cardLine = (rel, prefix) =>
    readShipped(rel)
        .split(/\r?\n/)
        .find((line) => line.startsWith(prefix));

// The executor of a fixture and a runner of its `feedback` command, as the agent would call it.
const feedbackRunner = (tempDir) => {
    const executor = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');
    const feedback = (...args) =>
        spawnSync(process.execPath, [executor, 'feedback', ...args], {
            cwd: tempDir,
            encoding: 'utf8',
        });
    return { executor, feedback };
};

// A function that writes the `feedback.channel` setting of a fixture's registry.
const channelSetter = (registry) => (value) => {
    fs.mkdirSync(path.dirname(registry), { recursive: true });
    fs.writeFileSync(
        registry,
        JSON.stringify({
            default: 'engine',
            workspaces: { engine: { description: 'x' } },
            feedback: { channel: value },
        }),
    );
};

const runScript = (
    mode,
    tempDir,
    cwd,
    script,
    args = [],
    { designDir = '.magicspec/engine' } = {},
) => {
    if (mode === 'executor') {
        return spawnSync(
            process.execPath,
            [path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js'), script, ...args],
            { cwd, encoding: 'utf8' },
        );
    }
    const env = { ...process.env };
    delete env.MAGIC_ROOT;
    if (designDir) env.MAGIC_DESIGN_DIR = designDir;
    else delete env.MAGIC_DESIGN_DIR;
    return spawnSync(
        process.execPath,
        [
            path.join(tempDir, 'skills', 'magicspec', 'scripts', `${script}.js`),
            ...args.filter((a) => !a.startsWith('--workspace=')),
        ],
        { cwd, encoding: 'utf8', env },
    );
};

// A git fixture holding a registry and one task in flight, plus the nested
// directory the commands are run from.
const makeRootFixture = () => {
    const tempDir = createTempWorkspace(true);
    writeResumeFixture(tempDir, {
        engine: { entries: [trackingEntry('T-1A01', 'Probe the root', 'In Progress')] },
    });
    // A registry entry and a source file with a rationale marker: commands that read
    // them see something only when they read the project, not the caller's directory.
    fs.writeFileSync(path.join(tempDir, '.magicspec', 'engine', 'INDEX.md'), '# Registry\n');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
        path.join(tempDir, 'src', 'probe.js'),
        '// WHY: the probe needs a rationale to find\nmodule.exports = 1;\n',
    );
    commitFixture(tempDir);
    const nested = path.join(tempDir, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    return { tempDir, nested };
};

// ═══════════════════════════════════════════════════════════════════════
// 26. SKILL FOLDER — the engine as one folder a host installs (skill folder)
// ═══════════════════════════════════════════════════════════════════════

const skillSrc = path.resolve(TESTS_DIR, '..', 'skills', 'magicspec');

// A git repository that holds nothing but what a consumer's project would.
const makeConsumer = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-skill-'));
    for (const args of [
        ['init', '-q', '-b', 'master'],
        ['config', 'user.email', 'test@example.com'],
        ['config', 'user.name', 'Test User'],
    ]) {
        spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    }
    return dir;
};

const installSkill = (dir, rel = '.agents/skills/magicspec') => {
    const target = path.join(dir, ...rel.split('/'));
    fs.cpSync(skillSrc, target, { recursive: true });
    return target;
};

const skillExec = (skillDir, cwd, script, args = []) =>
    spawnSync(process.execPath, [path.join(skillDir, 'scripts', 'executor.js'), script, ...args], {
        cwd,
        encoding: 'utf8',
    });

const initAllHosts = (skillDir, cwd) =>
    skillExec(skillDir, cwd, 'init', ['--host=claude,codex,qwen']);

// The rule copies init writes for the hosts must be byte copies of the always-on rule source,
// which is returned. `describe` words the failure for a given copy.
const assertRuleCopies = (
    skillDir,
    cwd,
    describe = (rel) => `${rel}: a byte copy of the source`,
) => {
    const source = fs.readFileSync(path.join(skillDir, 'CONSTITUTION.md'), 'utf8');
    for (const rel of ['.claude/rules/magicspec.md', '.qwen/rules/magicspec.md']) {
        assert.strictEqual(fs.readFileSync(path.join(cwd, rel), 'utf8'), source, describe(rel));
    }
    return source;
};

// Links are not followed or listed: a junction is a name, not a second copy of what it leads to.
const walkFiles = (dir) =>
    fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => !e.isSymbolicLink())
        .flatMap((e) =>
            e.isDirectory() ? walkFiles(path.join(dir, e.name)) : [path.join(dir, e.name)],
        );

// The commands the router lists, from its table: command (and its alias), group, what it does,
// argument, when it is missing, demand, body. The harness reads the table with its own pattern, so
// a case can compare it with the one parser of the engine (lib/hosts.js).
const tableRowsOf = (text) =>
    text
        .split(/\r?\n/)
        .map((l) =>
            /^\| `([a-z][a-z-]*)`(?: \(alias `([a-z][a-z-]*)`\))? \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (deep|standard|light|per step) \| `workflows\/([a-z-]+)\.md` \|$/.exec(
                l,
            ),
        )
        .filter(Boolean)
        .map((m) => ({
            name: m[1],
            alias: m[2] || null,
            group: m[3].trim(),
            summary: m[4].trim(),
            argument: m[5].trim(),
            missing: m[6].trim(),
            demand: m[7],
            file: m[8],
        }));
const routerRows = () => tableRowsOf(fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8'));

// ───────────────────────────────────────────────────────────────────────────
// 28. migrate — the 2.x layout to the skill layout (l2-skill-distribution.md §5.6)
//     The old names are spelled here, as fixtures of the layouts that exist in the field.
// ───────────────────────────────────────────────────────────────────────────
const OLD_STATE = '.design';
const OLD_ENGINE = '.magic';

// A project laid out as 2.x was: the engine in .magic/ with its manifest, wrappers in workflows/,
// skills/ and rules/, copies under a host folder, the state in the earlier folder; the new skill installed.
const legacyProject = ({ manifest = true, hostCopy = true, version = '2.1.100' } = {}) => {
    const dir = makeConsumer();
    const put = (rel, text) => putFile(dir, rel, text);
    const sha = (rel) =>
        require('crypto')
            .createHash('sha256')
            .update(fs.readFileSync(path.join(dir, rel)))
            .digest('hex');
    put(OLD_ENGINE + '/.version', version);
    put(OLD_ENGINE + '/spec.md', '# spec\n');
    put(OLD_ENGINE + '/scripts/a.js', '// a\n');
    put(OLD_ENGINE + '/templates/t.md', '# t\n');
    if (manifest) {
        const entries = {
            'spec.md': sha(OLD_ENGINE + '/spec.md'),
            'scripts/a.js': sha(OLD_ENGINE + '/scripts/a.js'),
            'templates/t.md': sha(OLD_ENGINE + '/templates/t.md'),
        };
        put(OLD_ENGINE + '/.checksums', JSON.stringify(entries));
    }
    put('workflows/magic.spec.md', 'wrapper\n');
    put('skills/magic-spec/SKILL.md', 'skill wrapper\n');
    put('rules/magic.md', 'old rules\n');
    if (hostCopy) {
        put('.claude/commands/magic.task.md', 'host copy\n');
        put('.claude/rules/magic.md', 'host rules\n');
    }
    put(
        OLD_STATE + '/workspace.json',
        JSON.stringify({
            default: 'main',
            workspaces: { main: { scope: [OLD_STATE, 'src'] } },
        }),
    );
    put(OLD_STATE + '/INDEX.md', '# index\n');
    put(OLD_STATE + '/main/STATE.md', '# state\n');
    put('src/app.js', 'user code\n');
    put('workflows/mine.md', "the project's own workflow\n");
    put('skills/mine/SKILL.md', "the project's own skill\n");
    put('rules/own.md', "the project's own rule\n");
    const skill = installSkill(dir);
    return { dir, skill };
};
// Writes a file of a migration fixture, creating its folders.
const putFile = (dir, rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
};

const snapshot = (dir) =>
    walkFiles(dir)
        .filter(
            (f) =>
                !f.includes(path.sep + '.git' + path.sep) &&
                !f.includes(
                    path.sep + '.agents' + path.sep + 'skills' + path.sep + 'magicspec' + path.sep,
                ),
        )
        .sort()
        .map((f) => [path.relative(dir, f), fs.readFileSync(f, 'utf8')]);

const cleanLink = (dir) => {
    for (const rel of ['.claude/skills/magicspec']) {
        try {
            fs.rmdirSync(path.join(dir, rel));
        } catch {
            /* not a link */
        }
    }
};

// ───────────────────────────────────────────────────────────────────────────
// 29. The release archive and the packaging invariants (l2-skill-distribution.md §5.5; l1-skill-packaging.md SP-1..SP-10)
// ───────────────────────────────────────────────────────────────────────────
const composition = require(path.join(devScriptsDir, 'archive-composition.js'));

// ───────────────────────────────────────────────────────────────────────────
// Simulation pass of 2026-10-29: the command line contract, path matching, the
// migration's state-folder paths, the graph page, the release script and the
// integrity check's line-ending rule. Each case pins a defect that was reproduced
// on a disposable copy before it was fixed.
// ───────────────────────────────────────────────────────────────────────────
const SIM_SKILL = path.resolve(TESTS_DIR, '..', 'skills', 'magicspec');
const SIM_SCRIPTS = path.join(SIM_SKILL, 'scripts');
const SIM_ENGINE_REL = '.agents/skills/magicspec';

/** The environment of a consumer: no ambient `MAGIC_*` override reaches the engine under test. */
const simEnv = (extra = {}) => {
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith('MAGIC_')) delete env[key];
    return { ...env, ...extra };
};

/** A consumer project: a git repository with the engine copied where a host reads skills. */
const makeSimConsumer = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-sim-'));
    for (const args of [
        ['init', '-q', '-b', 'master'],
        ['config', 'user.email', 'test@example.com'],
        ['config', 'user.name', 'Test User'],
        ['config', 'core.autocrlf', 'false'],
    ]) {
        spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    }
    fs.cpSync(SIM_SKILL, path.join(dir, ...SIM_ENGINE_REL.split('/')), { recursive: true });
    return dir;
};

const simExec = (dir, args, opts = {}) =>
    spawnSync(
        process.execPath,
        [path.join(dir, ...SIM_ENGINE_REL.split('/'), 'scripts', 'executor.js'), ...args],
        { cwd: dir, encoding: 'utf8', env: simEnv(opts.env), input: opts.input ?? '' },
    );

/** Every file under a folder (the git object store aside) with its content hash. */
const treeHashes = (root) => {
    const out = new Map();
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            const rel = path.relative(root, full).split(path.sep).join('/');
            if (rel === '.git/objects' || rel === '.git/index' || rel.startsWith('.git/logs'))
                continue;
            if (entry.isSymbolicLink()) out.set(rel, 'link');
            else if (entry.isDirectory()) {
                out.set(`${rel}/`, 'dir');
                walk(full);
            } else out.set(rel, sha256Hex(fs.readFileSync(full, 'utf8')));
        }
    };
    walk(root);
    return out;
};
/** A writer into a fixture folder: creates the parents, writes the body. */
const simPutter =
    (dir) =>
    (rel, body = '') => {
        fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), body);
    };
const sameTree = (before, after) =>
    JSON.stringify([...before].sort()) === JSON.stringify([...after].sort());

// ═══════════════════════════════════════════════════════════════════════
// 30. resolve-workspace — every command routes by one chain the engine computes
//     (WI-11 the chain, WI-12 the location signal, WI-13 narrated once; outcomes F1, F2, G1 to G3)
//     Every case runs the real script through executor.js.
// ═══════════════════════════════════════════════════════════════════════

// A project of three workspaces, laid out so that one folder (`packages`) is shared and one of
// its subfolders (`packages/ui`) belongs to a single workspace: the most specific entry wins.
const routingRegistry = (extra = {}) => ({
    default: 'api',
    workspaces: {
        web: {
            description: 'Web storefront and checkout flow',
            scope: ['apps/web', 'packages/ui'],
        },
        api: { description: 'Backend service for orders', scope: ['apps/api', 'packages'] },
        docs: {
            description: 'Documentation guides and tutorials',
            scope: ['docs', 'README.md'],
        },
    },
    ...extra,
});

const writeRoutingFixture = (dir, registry = routingRegistry()) => {
    const designDir = path.join(dir, '.magicspec');
    fs.mkdirSync(designDir, { recursive: true });
    for (const name of Object.keys(registry.workspaces)) {
        fs.mkdirSync(path.join(designDir, name, 'specifications'), { recursive: true });
    }
    fs.writeFileSync(path.join(designDir, 'workspace.json'), JSON.stringify(registry, null, 2));
    return designDir;
};

// The ambient choice of the caller's own shell never leaks into a case.
const routingEnv = (extra = {}) => {
    const env = { ...process.env };
    for (const key of [
        'MAGIC_WORKSPACE',
        'MAGIC_WORKSPACE_SOURCE',
        'MAGIC_DESIGN_DIR',
        'MAGIC_ROOT',
    ]) {
        delete env[key];
    }
    return { ...env, ...extra };
};

// What `executor.js --help` prints: the list of commands, from the command table.
const executorListing = (dir) =>
    spawnSync(
        process.execPath,
        [path.join(dir, 'skills', 'magicspec', 'scripts', 'executor.js'), '--help'],
        { cwd: dir, encoding: 'utf8' },
    ).stdout;
const stateFolderOfRepo = path.resolve(TESTS_DIR, '..', '.magicspec');
module.exports = {
    sha256Hex,
    listFilesUnder,
    writeTreeFiles,
    makeArchivalProject,
    runEngine,
    trimmedState,
    recordedCodes,
    patchState,
    gitIn,
    writeRevalidateFixture,
    admitRevalidateFixture,
    revalidateFixtureCount,
    trackingEntry,
    resumeStateText,
    withGoalSection,
    writeResumeFixture,
    treeDigest,
    shippedRoot,
    readShipped,
    listShipped,
    engineBodies,
    stepBlock,
    lineWith,
    runGuards,
    runStep,
    cardLine,
    feedbackRunner,
    channelSetter,
    runScript,
    makeRootFixture,
    skillSrc,
    makeConsumer,
    installSkill,
    skillExec,
    initAllHosts,
    assertRuleCopies,
    walkFiles,
    tableRowsOf,
    routerRows,
    OLD_STATE,
    OLD_ENGINE,
    legacyProject,
    putFile,
    snapshot,
    cleanLink,
    composition,
    SIM_SKILL,
    SIM_SCRIPTS,
    SIM_ENGINE_REL,
    simEnv,
    makeSimConsumer,
    simExec,
    treeHashes,
    simPutter,
    sameTree,
    routingRegistry,
    writeRoutingFixture,
    routingEnv,
    executorListing,
    stateFolderOfRepo,
};
