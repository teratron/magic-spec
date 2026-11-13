// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { TESTS_DIR, scriptsDir, devScriptsDir, cleanup } = require('./lib/base');
const {
    makeConsumer,
    installSkill,
    skillExec,
    initAllHosts,
    assertRuleCopies,
    walkFiles,
    legacyProject,
    cleanLink,
    composition,
} = require('./lib/sim');

module.exports = () => {
    test('the archive holds the skill folder, README and LICENSE and nothing else, and the smoke check refuses what lies outside or is missing (archive)', () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const listed = composition.listRelease(repo);
        const inFolder = walkFiles(path.join(repo, 'skills', 'magicspec')).map((f) =>
            path.relative(repo, f).split(path.sep).join('/'),
        );
        const expected = [
            ...['README.md', 'LICENSE'].filter((f) => fs.existsSync(path.join(repo, f))),
            ...inFolder,
        ].sort();
        assert.deepStrictEqual(listed, expected, 'the list is the folder plus the two root files');
        assert.ok(
            listed.every((f) => composition.isAllowed(f)),
            'every listed file is allowed',
        );

        const prefix = 'magic-spec-v9.9.9/';
        const names = listed.map((f) => prefix + f);
        const good = composition.check(names, prefix);
        assert.deepStrictEqual(good, { outside: [], missing: [] }, 'the real list passes');

        for (const stray of [
            '.magicspec/engine/INDEX.md',
            'scripts/sync.js',
            'tests/engine.js',
            'package.json',
            'skills/magicspec-dev/SKILL.md',
            '.git/config',
        ]) {
            const r = composition.check([...names, prefix + stray], prefix);
            assert.deepStrictEqual(
                r.outside,
                [prefix + stray],
                stray + ' is outside the composition',
            );
        }
        assert.deepStrictEqual(
            composition.check([...names, 'other-v1/README.md'], prefix).outside,
            ['other-v1/README.md'],
            'a path under another prefix is outside',
        );
        const lacking = composition.check(
            names.filter((n) => !n.endsWith('/.checksums')),
            prefix,
        );
        assert.deepStrictEqual(
            lacking.missing,
            ['skills/magicspec/.checksums'],
            'a required file that is missing is named',
        );

        // the command line does the same over stdin
        const cli = spawnSync(
            process.execPath,
            [path.join(devScriptsDir, 'archive-composition.js'), 'check', '--prefix', prefix],
            {
                input: [...names, prefix + 'scripts/sync.js'].join('\n'),
                encoding: 'utf8',
            },
        );
        assert.strictEqual(cli.status, 1);
        assert.match(cli.stderr, /outside the composition: magic-spec-v9\.9\.9\/scripts\/sync\.js/);

        // the workflow builds from this list and runs this check, and names no earlier folder
        const yml = fs.readFileSync(path.join(repo, '.github', 'workflows', 'release.yml'), 'utf8');
        assert.match(yml, /archive-composition\.js list/);
        assert.match(yml, /archive-composition\.js check --prefix/);
        assert.doesNotMatch(yml, /\.magic\/|"workflows"|"rules"/);
    });

    test('the built archive installs, runs from any directory and through a link, projects for every host, updates without touching state, removes what it marked and migrates a 2.x project (SP-1 to SP-10)', () => {
        const repo = path.resolve(TESTS_DIR, '..');

        // "Extract" the archive: the listed files only, into a folder of their own.
        const archive = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-archive-'));
        for (const rel of composition.listRelease(repo)) {
            fs.mkdirSync(path.dirname(path.join(archive, rel)), { recursive: true });
            fs.copyFileSync(path.join(repo, rel), path.join(archive, rel));
        }
        const archived = path.join(archive, 'skills', 'magicspec');
        const dir = makeConsumer();
        try {
            // SP-1: one folder is the whole engine; installing it is a copy
            const skill = path.join(dir, '.agents', 'skills', 'magicspec');
            fs.cpSync(archived, skill, { recursive: true });
            assert.ok(
                fs.existsSync(path.join(skill, 'SKILL.md')) &&
                    fs.existsSync(path.join(skill, 'scripts', 'executor.js')),
                'SP-1: the copy is complete',
            );

            // SP-9: the shipped folder verifies against its own manifest
            const integrity = skillExec(skill, dir, 'update-engine-meta', ['--check']);
            assert.strictEqual(integrity.status, 0, 'SP-9: ' + integrity.stdout + integrity.stderr);

            // SP-3 and SP-4: every host is projected, and the rule is the same bytes everywhere
            const init = initAllHosts(skill, dir);
            assert.strictEqual(init.status, 0, 'SP-3: ' + init.stdout + init.stderr);
            assertRuleCopies(skill, dir, (rel) => 'SP-4: ' + rel + ' is a byte copy');

            // SP-5: every router row has its body; no command entry exists to name another
            const bodies = fs.readdirSync(path.join(skill, 'workflows'));
            const rows = fs
                .readFileSync(path.join(skill, 'SKILL.md'), 'utf8')
                .split('\n')
                .map((l) => require(path.join(scriptsDir, 'lib', 'hosts.js')).parseCommandRow(l))
                .filter(Boolean);
            assert.ok(
                rows.length === bodies.length && rows.every((r) => bodies.includes(r.body)),
                'SP-5: the table and the folder agree',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude', 'commands')),
                'SP-5: the router is the only surface, no host entry was written',
            );

            // SP-6: every generated file carries a marker
            for (const rel of ['.claude/rules/magicspec.md']) {
                assert.match(
                    fs.readFileSync(path.join(dir, rel), 'utf8'),
                    /<!-- magicspec-rule/,
                    'SP-6: ' + rel,
                );
            }
            assert.match(
                fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'),
                /<!-- magicspec:begin -->/,
                'SP-6: the pointer block',
            );

            // SP-2: the same project from a nested directory and through a link
            const nested = path.join(dir, 'src', 'deep');
            fs.mkdirSync(nested, { recursive: true });
            const flight = (from, via) =>
                JSON.parse(skillExec(via, from, 'check-prerequisites', ['--json']).stdout);
            const here = flight(dir, skill);
            assert.deepStrictEqual(
                flight(nested, skill).design_dir,
                here.design_dir,
                'SP-2: a subdirectory gives the same project',
            );
            assert.deepStrictEqual(
                flight(nested, path.join(dir, '.claude', 'skills', 'magicspec')).design_dir,
                here.design_dir,
                'SP-2: a link gives the same project',
            );
            assert.ok(
                !fs.existsSync(path.join(nested, '.magicspec')),
                'SP-2: nothing beside the caller',
            );

            // SP-7: an installation is not the developer repository; it cannot bless its own change
            fs.appendFileSync(path.join(skill, 'references', 'init.md'), '\nlocal edit\n');
            const write = skillExec(skill, dir, 'update-engine-meta');
            assert.notStrictEqual(
                write.status,
                0,
                'SP-7: the write branch is refused in an installation',
            );
            fs.cpSync(archived, skill, { recursive: true });

            // SP-8: an update touches no state
            const state = (d) =>
                walkFiles(path.join(d, '.magicspec'))
                    .map((f) => [path.relative(d, f), fs.readFileSync(f, 'utf8')])
                    .sort();
            const before = state(dir);
            fs.cpSync(archived, skill, { recursive: true });
            assert.strictEqual(
                skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']).status,
                0,
            );
            assert.deepStrictEqual(
                state(dir),
                before,
                'SP-8: replacing the folder and running init again leaves the state as it was',
            );

            // SP-6 again: remove deletes the marked files and the links, keeps the state
            const removed = skillExec(skill, dir, 'remove');
            assert.strictEqual(removed.status, 0, removed.stdout + removed.stderr);
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude', 'rules', 'magicspec.md')),
                'SP-6: the projections are gone',
            );
            assert.deepStrictEqual(state(dir), before, 'SP-6: the state is untouched by removal');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }

        // SP-10: a 2.x project is migrated with this very folder, and has an engine at every moment
        const legacy = legacyProject();
        try {
            fs.rmSync(legacy.skill, { recursive: true, force: true });
            fs.cpSync(archived, legacy.skill, { recursive: true });
            const run = skillExec(legacy.skill, legacy.dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, 'SP-10: ' + run.stdout + run.stderr);
            assert.ok(
                fs.existsSync(path.join(legacy.skill, 'SKILL.md')) &&
                    fs.existsSync(path.join(legacy.dir, '.magicspec', 'main', 'STATE.md')),
                'SP-10: the new engine and the state are both there when the old engine is gone',
            );
            assert.ok(
                !fs.existsSync(path.join(legacy.dir, '.magic')),
                'SP-10: the old engine is gone',
            );
        } finally {
            cleanLink(legacy.dir);
            cleanup(legacy.dir);
            cleanup(archive);
        }
    });

    test('a working directory spelled with a lowercase drive letter reaches the same folders through a link: the link table and init agree (case)', {
        skip: process.platform !== 'win32',
    }, () => {
        const lower = (p) => p[0].toLowerCase() + p.slice(1);
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            const here = lower(dir);
            assert.strictEqual(skillExec(skill, here, 'init', ['--host=claude,codex']).status, 0);

            // the second run finds the link in place, not "another folder"
            const again = skillExec(lower(skill), here, 'init', ['--host=claude,codex']);
            assert.strictEqual(again.status, 0, again.stdout + again.stderr);
            assert.doesNotMatch(again.stdout + again.stderr, /conflict|another folder/i);

            // the link validator, run from the repository under that spelling, sees its links
            const repo = path.resolve(TESTS_DIR, '..');
            const out = spawnSync(
                process.execPath,
                [path.join(repo, 'scripts', 'validate-hardlinks.js')],
                {
                    cwd: lower(repo),
                    encoding: 'utf8',
                },
            );
            assert.doesNotMatch(
                out.stdout + out.stderr,
                /Drift: \.agents/,
                'a lowercase drive letter is not drift',
            );
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });
};
