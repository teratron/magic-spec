// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createTempWorkspace, requireFromFixture, cleanup } = require('./lib/base');
const {
    readShipped,
    SIM_SCRIPTS,
    SIM_ENGINE_REL,
    makeSimConsumer,
    simExec,
    treeHashes,
    simPutter,
    sameTree,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // sync — the registration of version anchors and documentation blocks (SY-4, SY-6)
    // ───────────────────────────────────────────────────────────────────────────
    const withSyncSection = (tempDir, section) => {
        const file = path.join(tempDir, '.magicspec', 'workspace.json');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(
            file,
            JSON.stringify(
                section === undefined ? { default: 'main' } : { default: 'main', sync: section },
            ),
        );
    };

    test('sync-config: an absent file or section declares nothing, and a valid anchor and block come back with their resolved paths (SY-4, SY-6)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { readSyncConfig } = requireFromFixture(tempDir, 'lib', 'sync-config.js');
            assert.deepStrictEqual(
                readSyncConfig(tempDir),
                { versions: [], docs: [], problems: [] },
                'no workspace.json declares nothing',
            );
            withSyncSection(tempDir, undefined);
            assert.deepStrictEqual(
                readSyncConfig(tempDir),
                { versions: [], docs: [], problems: [] },
                'no section declares nothing',
            );
            withSyncSection(tempDir, {
                versions: [
                    { file: 'package.json', json: 'version' },
                    { file: 'README.md', marker: 'version', format: 'v{version}' },
                ],
                docs: [
                    {
                        file: 'docs/guide.md',
                        marker: 'overview',
                        from: 'docs/overview.md',
                        fromMarker: 'overview',
                    },
                ],
            });
            const config = readSyncConfig(tempDir);
            assert.deepStrictEqual(config.problems, []);
            assert.deepStrictEqual(
                config.versions.map((v) => [v.file, v.json ?? null, v.marker ?? null, v.format]),
                [
                    ['package.json', 'version', null, '{version}'],
                    ['README.md', null, 'version', 'v{version}'],
                ],
            );
            assert.strictEqual(config.versions[0].abs, path.join(tempDir, 'package.json'));
            assert.deepStrictEqual(
                config.docs.map((d) => [d.file, d.marker, d.from, d.fromMarker]),
                [['docs/guide.md', 'overview', 'docs/overview.md', 'overview']],
            );
            assert.strictEqual(config.docs[0].fromAbs, path.join(tempDir, 'docs', 'overview.md'));
        } finally {
            cleanup(tempDir);
        }
    });

    test('sync-config: a malformed, unknown or escaping entry is one problem record naming its place and the fix, never an exception, and the valid entries still come back', () => {
        const tempDir = createTempWorkspace();
        try {
            const { readSyncConfig } = requireFromFixture(tempDir, 'lib', 'sync-config.js');
            withSyncSection(tempDir, {
                versions: [
                    { file: 'package.json', json: 'version' },
                    { file: 'README.md' },
                    { file: 'README.md', json: 'a', marker: 'b' },
                    { file: '../outside.json', json: 'version' },
                    { file: 'a.md', marker: 'Bad Key' },
                    { file: 'a.md', marker: 'version', format: 'no placeholder' },
                    { file: 'a.md', marker: 'version', colour: 'red' },
                    'text',
                ],
                docs: [
                    { file: 'docs/guide.md', marker: 'x' },
                    { from: 'docs/a.md', marker: 'x', file: 'docs/b.md', extra: 1 },
                ],
                other: [],
            });
            const config = readSyncConfig(tempDir);
            assert.strictEqual(config.versions.length, 1, 'only the valid anchor survives');
            assert.strictEqual(config.docs.length, 0);
            const places = config.problems.map((p) =>
                p.location.replace('.magicspec/workspace.json ', ''),
            );
            assert.deepStrictEqual(places, [
                'sync',
                'sync.versions[1]',
                'sync.versions[2]',
                'sync.versions[3]',
                'sync.versions[4]',
                'sync.versions[5]',
                'sync.versions[6]',
                'sync.versions[7]',
                'sync.docs[0]',
                'sync.docs[1]',
            ]);
            assert.ok(
                config.problems.every((p) => p.difference && p.command.includes('workspace.json')),
                'each problem says what is wrong and how to resolve it',
            );
            assert.ok(
                config.problems
                    .find((p) => p.location.endsWith('versions[3]'))
                    .difference.includes('inside the project'),
                'a path leaving the project is refused',
            );
            withSyncSection(tempDir, 'text');
            assert.strictEqual(
                readSyncConfig(tempDir).problems.length,
                1,
                'a section that is not an object is one problem',
            );
            fs.writeFileSync(path.join(tempDir, '.magicspec', 'workspace.json'), '{ not json');
            const broken = readSyncConfig(tempDir);
            assert.deepStrictEqual(
                [broken.versions, broken.docs, broken.problems.length],
                [[], [], 1],
                'an unreadable file is one problem',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // sync — the subcommand, its report, and the registry and state areas (SY-1 to SY-3, SY-7, SY-8)
    // ───────────────────────────────────────────────────────────────────────────
    /** A consumer with one workspace: a global registry whose count is stale, one specification, a phase and a live memory with a goal. */
    const makeSyncFixture = () => {
        const dir = makeSimConsumer();
        const put = simPutter(dir);
        put(
            '.magicspec/workspace.json',
            JSON.stringify({ default: 'ws', workspaces: { ws: { description: 'The workspace' } } }),
        );
        put(
            '.magicspec/INDEX.md',
            '# Index\n\n**Version:** 1.0.0\n**Engine Version:** 9.9.9\n\n## Workspaces\n\n| Workspace | Description | Specs | Registry |\n| --- | --- | --- | --- |\n| ws | The workspace | 9 | [ws/INDEX.md](ws/INDEX.md) |\n\n## Document History\n\n| Version | Date |\n| --- | --- |\n| 1.0.0 | 2026-01-01 |\n',
        );
        put(
            '.magicspec/ws/INDEX.md',
            '# Registry\n\n**Version:** 1.4.0\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n| [l1-a.md](specifications/l1-a.md) | The a | Stable | 1 | 1.2.0 |\n',
        );
        put(
            '.magicspec/ws/specifications/l1-a.md',
            '# Alpha\n\n**Version:** 1.2.0\n**Status:** Stable\n\n## Overview\n\nText.\n',
        );
        put(
            '.magicspec/ws/TASKS.md',
            '# Tasks\n\n## Active Phases\n\n| Phase | Description | Status |\n| --- | --- | --- |\n| [Phase 1](tasks/phase-1.md) | A | `In Progress` |\n',
        );
        put(
            '.magicspec/ws/tasks/phase-1.md',
            '---\nphase: 1\nstatus: In Progress\n---\n\n## Atomic Checklist\n\n- [x] [T-1A01] One\n- [ ] [T-1A02] Two\n',
        );
        put(
            '.magicspec/ws/STATE.md',
            '# Project State\n\n**Workspace:** ws\n**Updated:** 2026-01-01 00:00\n**Phase:** 1 — A\n**Status:** Active\n\n## Current Position\n\n- **Next Action:** Execute T-1A02 Two via /magicspec run ws\n\n## Progress\n\n```\nOverall: [0/0] stale\n```\n\n## Goal\n\nKeep this goal exactly as written.\n',
        );
        return dir;
    };
    /** The writer and reader of a sync fixture's files, relative to its root. */
    const syncIO = (dir) => ({
        put: simPutter(dir),
        read: (rel) => fs.readFileSync(path.join(dir, rel), 'utf8'),
    });
    const syncRun = (dir, args = []) => simExec(dir, ['sync', ...args]);

    test('sync: it rewrites the stale count and the progress counters, never the registry version, history or engine snapshot, and a second run writes nothing and says so in one line (SY-1, SY-3, SY-8)', () => {
        const dir = makeSyncFixture();
        try {
            const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
            const registryBefore = read('.magicspec/ws/INDEX.md');
            const stateBefore = read('.magicspec/ws/STATE.md');
            const first = syncRun(dir);
            assert.strictEqual(first.status, 0, first.stderr);
            const lines = first.stdout.trimEnd().split('\n');
            assert.match(
                lines[0],
                /^\[Sync\] 3 written · \d+ in sync · 0 disagreements · 0 stale$/,
            );
            assert.ok(
                lines.some((l) => /^ {2}written {5}graph: \.magicspec\/graph\/wiki\//.test(l)),
                first.stdout,
            );
            assert.ok(
                lines.some((l) =>
                    /^ {2}written {5}registry: \.magicspec\/INDEX\.md — ws Specs 9 → 1$/.test(l),
                ),
                first.stdout,
            );
            assert.ok(
                lines.some((l) =>
                    /^ {2}written {5}state: \.magicspec\/ws\/STATE\.md — progress counters recomputed$/.test(
                        l,
                    ),
                ),
                first.stdout,
            );
            assert.match(
                lines[lines.length - 1],
                /^Next: \/magicspec run ws — standard reasoning$/,
            );

            const index = read('.magicspec/INDEX.md');
            assert.ok(
                index.includes('| ws | The workspace | 1 | [ws/INDEX.md](ws/INDEX.md) |'),
                'the Specs cell changed and the other cells are as written',
            );
            assert.ok(
                index.includes('**Engine Version:** 9.9.9') &&
                    index.includes('| 1.0.0 | 2026-01-01 |') &&
                    index.includes('**Version:** 1.0.0'),
                'no snapshot, version line or history row is written (SY-1)',
            );
            assert.strictEqual(
                read('.magicspec/ws/INDEX.md'),
                registryBefore,
                'a workspace registry is never written',
            );
            const state = read('.magicspec/ws/STATE.md');
            assert.ok(/Phase 1: \[1\/2\]/.test(state), state);
            assert.ok(
                state.includes('## Goal\n\nKeep this goal exactly as written.\n'),
                'a hand-written section survives',
            );
            assert.notStrictEqual(state, stateBefore);

            const before = treeHashes(dir);
            const second = syncRun(dir);
            assert.strictEqual(
                second.stdout.trim(),
                '[Sync] in sync — nothing to write, nothing to report.',
                'one line',
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'a second run writes nothing (SY-3)');
        } finally {
            cleanup(dir);
        }
    });

    test('sync --dry-run: it lists every write it would make and changes no byte of the project (SY-7)', () => {
        const dir = makeSyncFixture();
        try {
            const before = treeHashes(dir);
            const result = syncRun(dir, ['--dry-run']);
            assert.strictEqual(result.status, 0, result.stderr);
            const lines = result.stdout.trimEnd().split('\n');
            assert.match(lines[0], /^\[Sync\] \(dry run\) 3 to write · /);
            assert.ok(
                lines.some(
                    (l) =>
                        l.startsWith('  would write ') &&
                        l.includes('graph: .magicspec/graph/wiki/'),
                ),
                result.stdout,
            );
            assert.ok(
                lines.some(
                    (l) =>
                        l.startsWith('  would write ') &&
                        l.includes('registry: .magicspec/INDEX.md'),
                ),
                result.stdout,
            );
            assert.ok(
                lines.some(
                    (l) =>
                        l.startsWith('  would write ') &&
                        l.includes('state: .magicspec/ws/STATE.md'),
                ),
                result.stdout,
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'no file changed');
        } finally {
            cleanup(dir);
        }
    });

    test('sync: a header that disagrees with its row, a missing file and an unregistered file are reported with their command and left as they are, and the rest still runs (SY-2)', () => {
        const dir = makeSyncFixture();
        try {
            const put = simPutter(dir);
            put(
                '.magicspec/ws/specifications/l1-a.md',
                '# Alpha\n\n**Version:** 1.3.0\n**Status:** RFC\n\n## Overview\n\nText.\n',
            );
            put('.magicspec/ws/specifications/l1-loose.md', '# Loose\n');
            fs.appendFileSync(
                path.join(dir, '.magicspec/ws/INDEX.md'),
                '| [l1-gone.md](specifications/l1-gone.md) | Gone | Stable | 1 | 1.0.0 |\n',
            );
            const registry = fs.readFileSync(path.join(dir, '.magicspec/ws/INDEX.md'), 'utf8');
            const spec = fs.readFileSync(
                path.join(dir, '.magicspec/ws/specifications/l1-a.md'),
                'utf8',
            );
            const result = syncRun(dir);
            assert.strictEqual(result.status, 0, result.stderr);
            const out = result.stdout;
            assert.ok(
                out.includes(
                    '.magicspec/ws/specifications/l1-a.md — header Status RFC ≠ registry Stable, Version 1.3.0 ≠ registry 1.2.0 → /magicspec spec',
                ),
                out,
            );
            assert.ok(
                out.includes(
                    '.magicspec/ws/specifications/l1-gone.md — registered in the registry but missing from the disk → /magicspec analyze',
                ),
                out,
            );
            assert.ok(
                out.includes(
                    '.magicspec/ws/specifications/l1-loose.md — a specification file that no registry row registers → /magicspec analyze',
                ),
                out,
            );
            assert.match(out.split('\n')[0], /· 3 disagreements · 0 stale$/);
            assert.match(
                out.trimEnd().split('\n').pop(),
                /^Next: \/magicspec spec ws — deep reasoning$/,
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.magicspec/ws/INDEX.md'), 'utf8'),
                registry,
                'the registry is not settled by sync',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.magicspec/ws/specifications/l1-a.md'), 'utf8'),
                spec,
                'the specification header is not settled by sync',
            );
            assert.ok(
                out.includes('registry: .magicspec/INDEX.md — ws Specs 9 → 2'),
                'what is derived is still written',
            );
        } finally {
            cleanup(dir);
        }
    });

    test("sync: a workspace the global table lacks gets a row built from the table's own header, a row of an unregistered workspace is reported stale and kept, and an area or workspace argument narrows the run", () => {
        const dir = makeSyncFixture();
        try {
            const put = simPutter(dir);
            put(
                '.magicspec/workspace.json',
                JSON.stringify({
                    default: 'ws',
                    workspaces: {
                        ws: { description: 'The workspace' },
                        extra: { description: 'Extra one' },
                    },
                }),
            );
            put(
                '.magicspec/extra/INDEX.md',
                '# Registry\n\n| File | Description | Status | Layer | Version |\n| --- | --- | --- | --- | --- |\n',
            );
            fs.writeFileSync(
                path.join(dir, '.magicspec/INDEX.md'),
                fs
                    .readFileSync(path.join(dir, '.magicspec/INDEX.md'), 'utf8')
                    .replace(
                        '\n\n## Document History',
                        '\n| gone | Old | 3 | [gone/INDEX.md](gone/INDEX.md) |\n\n## Document History',
                    ),
            );
            const result = syncRun(dir, ['registry']);
            assert.strictEqual(result.status, 0, result.stderr);
            const index = fs.readFileSync(path.join(dir, '.magicspec/INDEX.md'), 'utf8');
            assert.ok(
                index.includes('| extra | Extra one | 0 | [extra/INDEX.md](extra/INDEX.md) |'),
                index,
            );
            assert.ok(
                index.includes('| gone | Old | 3 |'),
                'the row of an unregistered workspace is kept',
            );
            assert.ok(
                result.stdout.includes("stale       .magicspec/INDEX.md row 'gone' — no source →"),
                result.stdout,
            );
            assert.ok(!result.stdout.includes('state:'), 'an area argument runs that area only');
            assert.ok(
                fs
                    .readFileSync(path.join(dir, '.magicspec/ws/STATE.md'), 'utf8')
                    .includes('[0/0] stale'),
                'the state area did not run',
            );

            const scoped = syncRun(dir, ['extra', '--dry-run']);
            assert.strictEqual(scoped.status, 0, scoped.stderr);
            assert.ok(
                !scoped.stdout.includes('ws/STATE.md'),
                'a workspace argument limits the run to that workspace',
            );

            const unknown = syncRun(dir, ['nothing']);
            assert.strictEqual(unknown.status, 1);
            assert.match(
                unknown.stderr,
                /^Unknown area or workspace 'nothing'\. Areas: registry, state/,
            );
        } finally {
            cleanup(dir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // sync — the projections and graph areas (SY-1, SY-2, SY-3, SY-5, SY-7)
    // ───────────────────────────────────────────────────────────────────────────
    const syncHosts = () => require(path.join(SIM_SCRIPTS, 'lib', 'hosts.js'));

    test('sync projections: a stale rule projection is rewritten and a second run writes nothing, and a retired command entry is reported with the command that removes it and is still on disk (SY-3, SY-5)', () => {
        const dir = makeSyncFixture();
        try {
            const hosts = syncHosts();
            const put = simPutter(dir);
            const rulePath = hosts.HOSTS.claude.rule.path;
            put(rulePath, `${hosts.RULE_MARKER}\nan older release's rules\n`);
            const retiredDir = hosts.HOSTS.claude.retired;
            put(`${retiredDir}/old.md`, '<!-- magicspec-command old -->\nretired entry\n');
            const result = syncRun(dir, ['projections']);
            assert.strictEqual(result.status, 0, result.stderr);
            assert.ok(
                result.stdout.includes(
                    `written     projections: ${rulePath} — rule projection regenerated`,
                ),
                result.stdout,
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, rulePath), 'utf8'),
                hosts.readRuleSource(),
                'the projection equals the source',
            );
            assert.ok(
                new RegExp(
                    `stale       ${retiredDir}/old\\.md — no source → node .*executor\\.js init --host claude`,
                ).test(result.stdout),
                result.stdout,
            );
            assert.ok(
                fs.existsSync(path.join(dir, retiredDir, 'old.md')),
                'the retired entry is kept (SY-5)',
            );
            const before = treeHashes(dir);
            const second = syncRun(dir, ['projections']);
            assert.ok(sameTree(before, treeHashes(dir)), 'a second run writes nothing');
            assert.match(second.stdout, /^\[Sync\] 0 written · /, second.stdout);
        } finally {
            cleanup(dir);
        }
    });

    test('sync projections: a failed engine integrity check writes no projection, names the restore, and the other areas still run (§5.4)', () => {
        const dir = makeSyncFixture();
        try {
            const hosts = syncHosts();
            const put = simPutter(dir);
            const rulePath = hosts.HOSTS.claude.rule.path;
            const stale = `${hosts.RULE_MARKER}\nan older release's rules\n`;
            put(rulePath, stale);
            fs.appendFileSync(
                path.join(dir, ...SIM_ENGINE_REL.split('/'), 'templates', 'state.md'),
                '\n<!-- tampered -->\n',
            );
            const result = syncRun(dir);
            assert.strictEqual(result.status, 0, result.stderr);
            assert.ok(result.stdout.includes('the engine integrity check failed'), result.stdout);
            assert.ok(
                result.stdout.includes('→ restore the folder from the release archive'),
                result.stdout,
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, rulePath), 'utf8'),
                stale,
                'no projection was written',
            );
            assert.ok(
                result.stdout.includes('registry: .magicspec/INDEX.md'),
                'the registry area still ran',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('sync graph: an unchanged graph writes no page and does not refresh the index, a stored page no specification produces is reported and kept, and --dry-run writes neither pages nor index (SY-3, SY-5, SY-7)', () => {
        const dir = makeSyncFixture();
        try {
            const dry = treeHashes(dir);
            const preview = syncRun(dir, ['graph', '--dry-run']);
            assert.strictEqual(preview.status, 0, preview.stderr);
            assert.ok(
                /would write graph: \.magicspec\/graph\/wiki\/ — \d+ pages? \(.*\), then the artifact index/.test(
                    preview.stdout,
                ),
                preview.stdout,
            );
            assert.ok(
                sameTree(dry, treeHashes(dir)),
                'a dry run writes neither pages nor the index',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.magicspec/graph')),
                'no graph folder was created',
            );

            const first = syncRun(dir, ['graph']);
            assert.ok(
                /written +graph: \.magicspec\/graph\/wiki\//.test(first.stdout),
                first.stdout,
            );
            assert.ok(fs.existsSync(path.join(dir, '.magicspec/graph/wiki/index.md')));
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec/.cache')),
                'the index was refreshed after a page was written',
            );
            const indexFiles = () =>
                fs
                    .readdirSync(path.join(dir, '.magicspec/.cache'))
                    .filter((n) => n.startsWith('memory.'))
                    .map(
                        (n) =>
                            `${n} ${fs.statSync(path.join(dir, '.magicspec/.cache', n)).mtimeMs}`,
                    );
            const indexBefore = indexFiles();
            const before = treeHashes(dir);
            const second = syncRun(dir, ['graph']);
            assert.strictEqual(
                second.stdout.trim(),
                '[Sync] in sync — nothing to write, nothing to report.',
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'an unchanged graph writes no page');
            assert.deepStrictEqual(indexFiles(), indexBefore, 'and does not touch the index');

            simPutter(dir)('.magicspec/graph/wiki/spec__ws__gone.md', '# Gone\n');
            const stale = syncRun(dir, ['graph']);
            assert.ok(
                /stale {7}\.magicspec\/graph\/wiki\/spec__ws__gone\.md — no source → node .*executor\.js export-wiki/.test(
                    stale.stdout,
                ),
                stale.stdout,
            );
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec/graph/wiki/spec__ws__gone.md')),
                'the page is kept (SY-5)',
            );
        } finally {
            cleanup(dir);
        }
    });

    test("the rule kernel exempts sync from the drift line and from finalization, says that regenerating the host copies through the generator is the engine's own act, and keeps the read-only prohibition word for word (SY-1, C28 item 5)", () => {
        const kernel = readShipped('skills/magicspec/CONSTITUTION.md');
        const exemptions = kernel.slice(kernel.indexOf('### Exemptions'), kernel.indexOf('## 2. '));
        assert.ok(
            exemptions.includes(
                '- `/magicspec sync` — its report already lists a stale projection or a failed integrity check.',
            ),
            'the drift line is skipped before sync',
        );
        assert.ok(
            kernel.includes(
                '`/magicspec graph`, `/magicspec help`, `/magicspec migrate`, `/magicspec sync` and `/magicspec-dev:*`. A non-zero exit is a',
            ),
            'finalization is skipped for sync',
        );
        for (const word of [
            '> **The engine folder is READ-ONLY for all standard workflows.**',
            '> Never write to the `magicspec` skill folder, or to the host copies generated from it,',
            '> unless the task explicitly states **"Engine Improvement"**. That folder is the distributed',
            '> SDD engine — unauthorized changes corrupt it for every user of this project.',
            '> If you are about to edit any file in it: **STOP** and ask the user',
            "> to confirm the task is an engine improvement.\n> Regenerating those host copies through the shipped generator (`init`, `sync`) is the engine's own act, not a write by hand.",
        ]) {
            assert.ok(kernel.includes(word), `the caution keeps: ${word}`);
        }
        assert.ok(Buffer.byteLength(kernel) < 16384, 'the kernel stays under the budget');
        assert.strictEqual(
            readShipped('.agents/rules/magicspec.md'),
            kernel,
            'the always-on rule copy of this repository equals the kernel',
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // sync — the versions and docs areas (SY-2, SY-4, SY-6)
    // ───────────────────────────────────────────────────────────────────────────
    const registerSync = (dir, section) => {
        const file = path.join(dir, '.magicspec/workspace.json');
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        fs.writeFileSync(file, JSON.stringify({ ...data, sync: section }));
    };

    test('sync versions: the version reaches the declared anchors and nowhere else, a JSON file keeps its formatting, and a second run writes nothing (SY-3, SY-4)', () => {
        const dir = makeSyncFixture();
        try {
            const { put, read } = syncIO(dir);
            put('.magicspec/.version', '2.5.0\n');
            put(
                'package.json',
                '{\n    "name": "x",\n    "version": "0.0.1",\n    "peer": "0.0.1",\n    "list": [1,   2]\n}\n',
            );
            const readme =
                'Release <!-- sync:version -->v0.0.1<!-- /sync:version -->.\nOld release 0.0.1 stays. Also v0.0.1 here.\n';
            put('README.md', readme);
            registerSync(dir, {
                versions: [
                    { file: 'package.json', json: 'version' },
                    { file: 'README.md', marker: 'version', format: 'v{version}' },
                ],
            });
            const result = syncRun(dir, ['versions']);
            assert.strictEqual(result.status, 0, result.stderr);
            assert.ok(
                result.stdout.includes('versions: package.json — version 2.5.0'),
                result.stdout,
            );
            assert.ok(result.stdout.includes('versions: README.md — version 2.5.0'), result.stdout);
            assert.strictEqual(
                read('package.json'),
                '{\n    "name": "x",\n    "version": "2.5.0",\n    "peer": "0.0.1",\n    "list": [1,   2]\n}\n',
                'only the declared key changed; the formatting is as written',
            );
            assert.strictEqual(
                read('README.md'),
                'Release <!-- sync:version -->v2.5.0<!-- /sync:version -->.\nOld release 0.0.1 stays. Also v0.0.1 here.\n',
                'a version-like string outside the anchor is untouched (SY-4)',
            );
            const before = treeHashes(dir);
            const second = syncRun(dir, ['versions']);
            assert.strictEqual(
                second.stdout.trim(),
                '[Sync] in sync — nothing to write, nothing to report.',
            );
            assert.ok(sameTree(before, treeHashes(dir)));
        } finally {
            cleanup(dir);
        }
    });

    test('sync versions: a missing file, key, marker or version file is reported with its place and the entry is left as it is; a bad registration is reported once (SY-2)', () => {
        const dir = makeSyncFixture();
        try {
            const put = simPutter(dir);
            put('package.json', '{ "name": "x", "version": "0.0.1", "also": "0.0.1" }');
            put('a.json', '{ "version": "1.0.0", "x": { "version": "1.0.0" } }');
            put('README.md', 'No marker here.\n');
            registerSync(dir, {
                versions: [
                    { file: 'package.json', json: 'missing' },
                    { file: 'README.md', marker: 'version' },
                    { file: 'gone.json', json: 'version' },
                    { file: 'a.json', json: 'x.version' },
                    { file: 'package.json' },
                ],
            });
            const noVersion = syncRun(dir, ['versions']);
            assert.ok(
                noVersion.stdout.includes(
                    '.magicspec/.version — the version file does not exist yet →',
                ),
                noVersion.stdout,
            );
            put('.magicspec/.version', '3.0.0\n');
            const result = syncRun(dir, ['versions']);
            const out = result.stdout;
            assert.ok(
                out.includes('package.json — the key `missing` is not a string in the file'),
                out,
            );
            assert.ok(
                out.includes('README.md — the marker <!-- sync:version --> is not in the file'),
                out,
            );
            assert.ok(out.includes('gone.json — the anchor file does not exist'), out);
            assert.ok(
                out.includes(
                    'a.json — the pair `"version": "1.0.0"` occurs 2 times, so it cannot be told apart',
                ),
                out,
            );
            assert.strictEqual(
                out.split('workspace.json sync.versions[4]').length - 1,
                1,
                'the bad registration is listed once',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, 'a.json'), 'utf8'),
                '{ "version": "1.0.0", "x": { "version": "1.0.0" } }',
                'an ambiguous pair is not rewritten',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('sync docs: a registered block is rewritten between its markers only and the bytes outside them are identical; a source carrying an SDD reference, a missing source and missing markers are reported and nothing is written (SY-2, SY-6)', () => {
        const dir = makeSyncFixture();
        try {
            const { put, read } = syncIO(dir);
            put(
                'docs/overview.md',
                'Intro.\n<!-- sync:overview -->\nFirst line.\nSecond line.\n<!-- /sync:overview -->\nOutro.\n',
            );
            const page =
                'Top text\r\n<!-- sync:overview -->\r\nstale\r\n<!-- /sync:overview -->\r\nBottom text\r\n';
            put('docs/guide.md', page);
            registerSync(dir, {
                docs: [
                    {
                        file: 'docs/guide.md',
                        marker: 'overview',
                        from: 'docs/overview.md',
                        fromMarker: 'overview',
                    },
                ],
            });
            const result = syncRun(dir, ['docs']);
            assert.strictEqual(result.status, 0, result.stderr);
            assert.ok(
                result.stdout.includes(
                    "docs: docs/guide.md — block 'overview' from docs/overview.md",
                ),
                result.stdout,
            );
            assert.strictEqual(
                read('docs/guide.md'),
                'Top text\r\n<!-- sync:overview -->\r\nFirst line.\r\nSecond line.\r\n<!-- /sync:overview -->\r\nBottom text\r\n',
                "only the content between the markers changed, and the line endings are the file's",
            );
            const before = treeHashes(dir);
            assert.strictEqual(
                syncRun(dir, ['docs']).stdout.trim(),
                '[Sync] in sync — nothing to write, nothing to report.',
            );
            assert.ok(sameTree(before, treeHashes(dir)), 'a second run writes nothing');

            for (const [leak, text] of [
                ['a specification file name', 'See l1-engine-core.md for details.'],
                ['a task identifier', 'Done in T-12A03.'],
                ['a phase designator', 'Built in Phase 20.'],
                ['an SDD system file', 'Listed in INDEX.md.'],
                ['a state-folder path', 'Kept in .magicspec/engine.'],
            ]) {
                put(
                    'docs/overview.md',
                    `<!-- sync:overview -->\n${text}\n<!-- /sync:overview -->\n`,
                );
                put('docs/guide.md', page);
                const refused = syncRun(dir, ['docs']);
                assert.ok(
                    refused.stdout.includes(
                        `docs/guide.md — the content of \`docs/overview.md\` carries ${leak}, which may not enter a product file; nothing was written`,
                    ),
                    `${leak}: ${refused.stdout}`,
                );
                assert.strictEqual(read('docs/guide.md'), page, `${leak}: the page is as it was`);
            }
            fs.rmSync(path.join(dir, 'docs/overview.md'));
            assert.ok(
                syncRun(dir, ['docs']).stdout.includes(
                    'docs/guide.md — the source `docs/overview.md` does not exist',
                ),
            );
            put('docs/overview.md', '<!-- sync:overview -->\nText.\n<!-- /sync:overview -->\n');
            put('docs/guide.md', 'No markers.\n');
            assert.ok(
                syncRun(dir, ['docs']).stdout.includes(
                    'docs/guide.md — the marker <!-- sync:overview --> is not in the file',
                ),
            );
            assert.strictEqual(read('docs/guide.md'), 'No markers.\n');
        } finally {
            cleanup(dir);
        }
    });

    test('graph-cache: under MAGIC_DRY_RUN the extraction cache neither creates its folder, nor saves an entry, nor prunes one (the preview of sync, SY-7)', () => {
        const tempDir = createTempWorkspace();
        const previous = process.env.MAGIC_DRY_RUN;
        try {
            const cache = requireFromFixture(tempDir, 'graph-cache.js');
            const designAbs = path.join(tempDir, '.magicspec');
            const spec = path.join(designAbs, 'ws', 'specifications', 'l1-a.md');
            fs.mkdirSync(path.dirname(spec), { recursive: true });
            fs.writeFileSync(spec, '# A\n\n## Overview\n\nText.\n');
            process.env.MAGIC_DRY_RUN = '1';
            cache.saveCached(spec, { refs: [], parent: null, conventions: [] }, designAbs, tempDir);
            assert.strictEqual(cache.loadCached(spec, designAbs, tempDir), null);
            assert.ok(!fs.existsSync(path.join(designAbs, 'graph')), 'no graph folder was created');

            delete process.env.MAGIC_DRY_RUN;
            cache.saveCached(spec, { refs: [], parent: null, conventions: [] }, designAbs, tempDir);
            const folder = path.join(designAbs, 'graph', '.cache');
            const stale = path.join(folder, `${'0'.repeat(64)}.json`);
            fs.writeFileSync(stale, '{}');
            process.env.MAGIC_DRY_RUN = '1';
            assert.strictEqual(cache.pruneUnused(designAbs), 0, 'a preview prunes nothing');
            assert.ok(fs.existsSync(stale));
            delete process.env.MAGIC_DRY_RUN;
            assert.ok(
                cache.pruneUnused(designAbs) >= 1,
                'a real run still prunes the entry no file uses',
            );
        } finally {
            if (previous === undefined) delete process.env.MAGIC_DRY_RUN;
            else process.env.MAGIC_DRY_RUN = previous;
            cleanup(tempDir);
        }
    });
};
