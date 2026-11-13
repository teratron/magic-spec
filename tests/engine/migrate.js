'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const _os = require('os');
const { cleanup } = require('./lib/base');
const {
    skillSrc,
    makeConsumer,
    installSkill,
    skillExec,
    OLD_STATE,
    OLD_ENGINE,
    legacyProject,
    putFile,
    snapshot,
    cleanLink,
} = require('./lib/sim');

module.exports = () => {
    // A second `migrate --apply` finds nothing to do and changes nothing.
    const expectSecondRunIdle = (skill, dir) => {
        const after = snapshot(dir);
        const again = skillExec(skill, dir, 'migrate', ['--apply']);
        assert.strictEqual(again.status, 0, again.stdout + again.stderr);
        assert.match(again.stdout, /Nothing to migrate/);
        assert.deepStrictEqual(snapshot(dir), after, 'a second run changes nothing');
    };

    test('migrate prints the plan and changes nothing without --apply, and a project with nothing to migrate is told so (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const before = snapshot(dir);
            const plan = skillExec(skill, dir, 'migrate');
            assert.strictEqual(plan.status, 0, plan.stdout + plan.stderr);
            assert.match(plan.stdout, /dry run/);
            assert.match(plan.stdout, /\.magic\/spec\.md/);
            assert.match(plan.stdout, /workflows\/magic\.spec\.md/);
            assert.match(plan.stdout, /Rename \.design\/ to \.magicspec\//);
            assert.deepStrictEqual(snapshot(dir), before, 'a dry run changes no file');
            assert.ok(
                !fs.existsSync(path.join(dir, '.magicspec')) &&
                    !fs.existsSync(
                        path.join(
                            dir,
                            'magicspec-migration-backup-' + new Date().toISOString().slice(0, 10),
                        ),
                    ),
            );
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
        const fresh = makeConsumer();
        try {
            const skill2 = installSkill(fresh);
            const none = skillExec(skill2, fresh, 'migrate');
            assert.strictEqual(none.status, 0);
            assert.match(none.stdout, /Nothing to migrate/);
        } finally {
            cleanup(fresh);
        }
    });

    test("migrate --apply installs the new layout, renames the state, removes exactly the old engine and keeps the project's own files; a second run does nothing (migration)", () => {
        const { dir, skill } = legacyProject();
        try {
            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);

            // the state moved, with its entries
            assert.ok(!fs.existsSync(path.join(dir, OLD_STATE)), 'the old state folder is gone');
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec', 'main', 'STATE.md')),
                'the state arrived whole',
            );
            const ws = JSON.parse(
                fs.readFileSync(path.join(dir, '.magicspec', 'workspace.json'), 'utf8'),
            );
            assert.deepStrictEqual(
                ws.workspaces.main.scope,
                ['.magicspec', 'src'],
                'the entries that named the old folder follow it',
            );

            // the old engine is gone, the project's own files are not
            assert.ok(!fs.existsSync(path.join(dir, OLD_ENGINE)), 'the old engine folder is gone');
            for (const rel of [
                'workflows/magic.spec.md',
                'skills/magic-spec/SKILL.md',
                'rules/magic.md',
                '.claude/commands/magic.task.md',
                '.claude/rules/magic.md',
            ]) {
                assert.ok(!fs.existsSync(path.join(dir, rel)), rel + ' is removed');
            }
            for (const rel of [
                'src/app.js',
                'workflows/mine.md',
                'skills/mine/SKILL.md',
                'rules/own.md',
            ]) {
                assert.ok(fs.existsSync(path.join(dir, rel)), rel + ' is kept');
            }

            // the new layout is installed: the rule and the hook, no command entry; the removed files are backed up
            assert.ok(
                fs.existsSync(path.join(dir, '.claude', 'rules', 'magicspec.md')),
                'the rule projection is written for the host found',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec')),
                'no command entry is written',
            );
            assert.match(
                fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'utf8'),
                /\.agents\/skills\/magicspec/,
            );
            const backup = path.join(
                dir,
                'magicspec-migration-backup-' + new Date().toISOString().slice(0, 10),
            );
            assert.ok(
                fs.existsSync(path.join(backup, '.magic', 'spec.md')) &&
                    fs.existsSync(path.join(backup, 'workflows', 'magic.spec.md')),
                'the removed files are in the backup',
            );
            assert.match(run.stdout, /Pre-flight/);

            // idempotent
            expectSecondRunIdle(skill, dir);
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate keeps an old engine file the user changed, reports it, and removes the rest (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            fs.appendFileSync(path.join(dir, OLD_ENGINE, 'spec.md'), 'my change\n');
            const run = skillExec(skill, dir, 'migrate', ['--apply']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.match(run.stdout, /ENGINE_FILE_MODIFIED \.magic\/spec\.md/);
            assert.ok(
                fs.existsSync(path.join(dir, OLD_ENGINE, 'spec.md')),
                'the changed file is kept',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, OLD_ENGINE, 'spec.md'), 'utf8'),
                '# spec\nmy change\n',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, OLD_ENGINE, 'scripts', 'a.js')),
                'an unchanged file is removed',
            );
            assert.ok(
                fs.existsSync(path.join(dir, OLD_ENGINE, '.checksums')),
                'the manifest stays beside the file it describes',
            );
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    const applyMigration = (skill, dir) => {
        const run = skillExec(skill, dir, 'migrate', ['--apply']);
        assert.strictEqual(run.status, 0, run.stdout + run.stderr);
        return run;
    };

    // Adds `key` to the old manifest with the right hash of the project's own file, applies the
    // migration, and expects that file to survive while the honest entries are still removed.
    const assertMigrationSparesUserFile = (skill, dir, key) => {
        const manifestFile = path.join(dir, OLD_ENGINE, '.checksums');
        const entries = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
        entries[key] = require('crypto').createHash('sha256').update('user code\n').digest('hex');
        fs.writeFileSync(manifestFile, JSON.stringify(entries));

        applyMigration(skill, dir);
        assert.strictEqual(fs.readFileSync(path.join(dir, 'src', 'app.js'), 'utf8'), 'user code\n');
        assert.ok(
            !fs.existsSync(path.join(dir, OLD_ENGINE, 'scripts', 'a.js')),
            'the honest entries are still removed',
        );
    };

    const removeLink = (link) => {
        try {
            fs.unlinkSync(link);
        } catch {
            try {
                fs.rmdirSync(link);
            } catch {
                /* already gone */
            }
        }
    };

    test('migrate never reads or removes a path an old manifest names outside the old engine folder (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            // the hash is right, so only the folder boundary can keep this file alive
            assertMigrationSparesUserFile(skill, dir, '../src/app.js');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate does not follow a link inside the old engine folder to a file outside it (migration)', () => {
        const { dir, skill } = legacyProject();
        const link = path.join(dir, OLD_ENGINE, 'out');
        try {
            fs.symlinkSync(path.join(dir, 'src'), link, 'junction');
            // the hash is right and the key stays under the folder by name; only the link leads out
            assertMigrationSparesUserFile(skill, dir, 'out/app.js');
        } finally {
            removeLink(link);
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('the vocabulary sweep rewrites the earlier command, state-folder and engine-folder names one word at a time, and leaves history sections and look-alikes alone (migration)', () => {
        const { rewriteVocabulary } = require(
            path.join(skillSrc, 'scripts', 'lib', 'vocabulary-sweep.js'),
        );
        const input = [
            '# Page',
            'Run /magic.spec amend, then /magic.task, then (/magic.run).',
            'The file workflows/magic.spec.md and /magic.spec.md and /magic.specs stay as they are.',
            'State lives in .design/main/INDEX.md and in `.design`; x.design/y and .designs/ are not it.',
            'The engine is .magic/scripts/executor.js, not .magicspec/main.',
            '/magic.dev.test is not a command of the earlier layout.',
            '',
            '## Document History',
            '| 1.0.0 | 2026-01-01 | Agent | Created with /magic.task in .design/. |',
            '',
            '## Overview',
            'Back to /magic.status.',
        ].join('\n');
        const original = input.split('\n');
        const { text, count } = rewriteVocabulary(input, '.agents/skills/magicspec');
        const lines = text.split('\n');
        assert.strictEqual(
            lines[1],
            'Run /magicspec spec amend, then /magicspec task, then (/magicspec run).',
        );
        assert.strictEqual(lines[2], original[2], 'file names and longer words are kept');
        assert.strictEqual(
            lines[3],
            'State lives in .magicspec/main/INDEX.md and in `.magicspec`; x.design/y and .designs/ are not it.',
        );
        assert.strictEqual(
            lines[4],
            'The engine is .agents/skills/magicspec/scripts/executor.js, not .magicspec/main.',
        );
        assert.strictEqual(lines[5], original[5], 'a name outside the earlier set is kept');
        assert.strictEqual(lines[8], original[8], 'a Document History row is history');
        assert.strictEqual(
            lines[11],
            'Back to /magicspec status.',
            'the next section is rewritten',
        );
        assert.strictEqual(count, 7);
        assert.strictEqual(
            rewriteVocabulary(text, '.agents/skills/magicspec').count,
            0,
            'the result holds nothing left to rewrite',
        );
        assert.strictEqual(
            rewriteVocabulary('see .magic/x', null).text,
            'see .magic/x',
            'without a project-relative engine folder the engine words are left for the report',
        );
    });

    test('migrate --apply sweeps the SDD artifacts it may edit: versions and records each specification, follows its registry row, spares history, archives and the constitution, and only reports product files; a second run changes nothing (migration)', () => {
        const { dir, skill } = legacyProject();
        const today = new Date().toISOString().slice(0, 10);
        try {
            const put = (rel, text) => putFile(dir, rel, text);
            const spec = [
                '# Spec A',
                '',
                '**Version:** 1.0.0',
                '**Status:** Stable',
                '',
                '## Overview',
                '',
                'Run /magic.spec amend; state is .design/main/INDEX.md; engine is .magic/scripts/executor.js.',
                '',
                '## Document History',
                '',
                '| Version | Date | Author | Description |',
                '| --- | --- | --- | --- |',
                '| 1.0.0 | 2026-01-01 | Agent | Created with /magic.task in .design/. |',
                '',
            ].join('\n');
            const registry = [
                '# Registry',
                '',
                '| File | Description | Status | Layer | Version |',
                '| --- | --- | --- | --- | --- |',
                '| [l1-a.md](specifications/l1-a.md) | Describes /magic.run | Stable | 1 | 1.0.0 |',
                '',
            ].join('\n');
            const noVersion = '# Spec B\n\nRun /magic.task.\n';
            const history = {
                '.design/main/archives/tasks/phase-1.md': 'Done with /magic.run in .design/.\n',
                '.design/main/RETROSPECTIVE.md': 'We used /magic.spec.\n',
                '.design/main/CHANGELOG.md': 'Phase 1 via /magic.task.\n',
                '.design/RULES.md': '# Rules\n\nC1 says run /magic.analyze.\n',
            };
            put('.design/main/specifications/l1-a.md', spec);
            put('.design/main/specifications/l1-b.md', noVersion);
            put('.design/main/INDEX.md', registry);
            put('.design/main/PLAN.md', 'Next: /magic.task engine\n');
            put(
                '.design/main/STATE.md',
                '# State\n\n**Next Action:** /magic.run\n\n## Recent Decisions\n\n- decided with /magic.spec\n',
            );
            for (const [rel, text] of Object.entries(history)) put(rel, text);
            put('docs/guide.md', 'Type /magic.spec to begin.\n');

            const dry = skillExec(skill, dir, 'migrate');
            assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
            assert.match(
                dry.stdout,
                /4\. Rewrite the earlier command and folder names in \d+ SDD artifact/,
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.design/main/specifications/l1-a.md'), 'utf8'),
                spec,
                'a dry run rewrites nothing',
            );

            const run = applyMigration(skill, dir);
            const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

            // The specification: rewritten, patch-versioned, one history row, the old row intact.
            const migrated = read('.magicspec/main/specifications/l1-a.md');
            assert.match(
                migrated,
                /Run \/magicspec spec amend; state is \.magicspec\/main\/INDEX\.md; engine is [^ ]*skills\/magicspec\/scripts\/executor\.js\./,
            );
            assert.match(migrated, /^\*\*Version:\*\* 1\.0\.1$/m);
            const rows = migrated.split('\n').filter((l) => /^\| \d/.test(l));
            assert.strictEqual(rows.length, 2, 'one history row was added');
            assert.ok(rows[0].startsWith(`| 1.0.1 | ${today} | migrate |`), rows[0]);
            assert.strictEqual(
                rows[1],
                '| 1.0.0 | 2026-01-01 | Agent | Created with /magic.task in .design/. |',
                'the earlier row is history',
            );
            // Its registry row follows, and the registry's own words are rewritten.
            assert.match(
                read('.magicspec/main/INDEX.md'),
                /\| \[l1-a\.md\]\(specifications\/l1-a\.md\) \| Describes \/magicspec run \| Stable \| 1 \| 1\.0\.1 \|/,
            );
            // Plain artifacts: rewritten, no version; the history section of the live state kept.
            assert.strictEqual(read('.magicspec/main/PLAN.md'), 'Next: /magicspec task engine\n');
            assert.strictEqual(
                read('.magicspec/main/STATE.md'),
                '# State\n\n**Next Action:** /magicspec run\n\n## Recent Decisions\n\n- decided with /magic.spec\n',
            );
            // History, archives and the constitution are untouched.
            for (const [rel, text] of Object.entries(history)) {
                assert.strictEqual(read(rel.replace('.design/', '.magicspec/')), text, rel);
            }
            // A specification without a version cannot be recorded, so it is left and named.
            assert.strictEqual(read('.magicspec/main/specifications/l1-b.md'), noVersion);
            assert.match(
                run.stdout,
                /Not rewritten: \.magicspec\/main\/specifications\/l1-b\.md \(no version header/,
            );
            assert.match(
                run.stdout,
                /Not rewritten: \.magicspec\/RULES\.md still uses the earlier names/,
            );
            // The product file is reported, not edited; the old engine and wrappers are not product.
            assert.strictEqual(read('docs/guide.md'), 'Type /magic.spec to begin.\n');
            assert.match(run.stdout, /1 product file\(s\) still use the earlier names/);
            assert.match(run.stdout, /docs\/guide\.md:1 \(\/magic\.spec\)/);
            // Every changed file is listed with its revert hint, and was backed up first.
            assert.match(
                run.stdout,
                /- \.magicspec\/main\/specifications\/l1-a\.md \(\d+ replacement\(s\), 1\.0\.0 -> 1\.0\.1\)/,
            );
            assert.match(
                run.stdout,
                /\(Revert: git restore \.magicspec, or copy the files back from magicspec-migration-backup-/,
            );
            assert.strictEqual(
                read(`magicspec-migration-backup-${today}/.magicspec/main/specifications/l1-a.md`),
                spec,
                'the original is in the backup',
            );

            // A second run finds nothing to do.
            expectSecondRunIdle(skill, dir);
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate leaves a wrapper alone when its folder is a link that leads out of the project (migration)', () => {
        const { dir, skill } = legacyProject();
        const outside = fs.mkdtempSync(path.join(require('os').tmpdir(), 'magicspec-outside-'));
        const link = path.join(dir, '.claude', 'commands');
        try {
            fs.writeFileSync(path.join(outside, 'magic.task.md'), 'not ours\n');
            fs.rmSync(link, { recursive: true, force: true });
            fs.symlinkSync(outside, link, 'junction');

            applyMigration(skill, dir);
            assert.strictEqual(
                fs.readFileSync(path.join(outside, 'magic.task.md'), 'utf8'),
                'not ours\n',
            );
        } finally {
            removeLink(link);
            fs.rmSync(outside, { recursive: true, force: true });
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate resumes from the filesystem: after the rename but before the removal, and before the rename with the projections in place (migration)', () => {
        for (const stage of ['renamed', 'projected']) {
            const { dir, skill } = legacyProject();
            try {
                if (stage === 'renamed') {
                    fs.renameSync(path.join(dir, OLD_STATE), path.join(dir, '.magicspec'));
                } else {
                    // the projections of a half-done run, written by the same code
                    const hosts = require(path.join(skill, 'scripts', 'lib', 'hosts.js'));
                    const previous = process.env.MAGIC_ROOT;
                    process.env.MAGIC_ROOT = dir;
                    try {
                        hosts.projectHost('claude', dir);
                    } finally {
                        if (previous === undefined) delete process.env.MAGIC_ROOT;
                        else process.env.MAGIC_ROOT = previous;
                    }
                }
                const run = skillExec(skill, dir, 'migrate', ['--apply']);
                assert.strictEqual(run.status, 0, stage + ': ' + run.stdout + run.stderr);
                assert.ok(
                    fs.existsSync(path.join(dir, '.magicspec', 'main', 'STATE.md')),
                    stage + ': the state is in place',
                );
                assert.ok(
                    !fs.existsSync(path.join(dir, OLD_STATE)) &&
                        !fs.existsSync(path.join(dir, OLD_ENGINE)),
                    stage + ': nothing of the old layout is left',
                );
            } finally {
                cleanLink(dir);
                cleanup(dir);
            }
        }
    });

    test('with both state folders the engine stops with one recommended path and touches neither (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            fs.mkdirSync(path.join(dir, '.magicspec'));
            fs.writeFileSync(path.join(dir, '.magicspec', 'marker.txt'), 'new\n');
            const before = snapshot(dir);
            for (const [script, args] of [
                ['migrate', ['--apply']],
                ['check-prerequisites', ['--json']],
                ['finalize', ['--workflow=spec']],
            ]) {
                const r = skillExec(skill, dir, script, args);
                assert.strictEqual(r.status, 1, script + ': ' + r.stdout);
                assert.match(r.stderr, /Both \.design\/ and \.magicspec\/ exist/, script);
                assert.match(r.stderr, /migrate/, script + ': it names the way forward');
                if (script !== 'migrate') {
                    assert.match(
                        r.stderr,
                        /Run `\/magicspec migrate` \(by script: `[^`]*migrate`\)/,
                        script + ': it names the command beside the script path',
                    );
                }
            }
            assert.deepStrictEqual(snapshot(dir), before, 'neither folder was touched');
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('any other command in an unmigrated project stops and says so, and creates no second state folder (migration)', () => {
        const { dir, skill } = legacyProject();
        try {
            const r = skillExec(skill, dir, 'check-prerequisites', ['--json']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /uses the 2\.x layout/);
            assert.match(r.stderr, /migrate/);
            assert.match(
                r.stderr,
                /Run `\/magicspec migrate` to see the plan and migrate it \(by script: `[^`]*migrate`/,
                'the stop names the command beside the script path',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.magicspec')),
                'no empty state folder appeared beside the old one',
            );
            // a folder with that name that is not a state folder does not trigger the guard
            const other = makeConsumer();
            try {
                fs.mkdirSync(path.join(other, OLD_STATE));
                fs.writeFileSync(path.join(other, OLD_STATE, 'logo.png'), 'x');
                const skill2 = installSkill(other);
                const ok = skillExec(skill2, other, 'check-prerequisites', ['--json']);
                assert.doesNotMatch(
                    ok.stderr,
                    /2\.x layout/,
                    'design assets under that name are not a state folder',
                );
            } finally {
                cleanup(other);
            }
        } finally {
            cleanLink(dir);
            cleanup(dir);
        }
    });

    test('migrate refuses a layout older than 2.x and names the way, an unknown host stops it, and a missing manifest keeps the engine folder (migration)', () => {
        const old = legacyProject({ version: '1.5.207' });
        try {
            const before = snapshot(old.dir);
            const r = skillExec(old.skill, old.dir, 'migrate', ['--apply']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /2\.x layout only/);
            assert.deepStrictEqual(snapshot(old.dir), before, 'nothing was changed');
        } finally {
            cleanLink(old.dir);
            cleanup(old.dir);
        }

        const host = legacyProject();
        try {
            const r = skillExec(host.skill, host.dir, 'migrate', ['--apply', '--host=zed']);
            assert.strictEqual(r.status, 1);
            assert.match(r.stderr, /Unknown host 'zed'/);
            assert.ok(
                fs.existsSync(path.join(host.dir, OLD_ENGINE, 'spec.md')),
                'the old engine is still there: the removal comes last',
            );
        } finally {
            cleanLink(host.dir);
            cleanup(host.dir);
        }

        const bare = legacyProject({ manifest: false });
        try {
            const r = skillExec(bare.skill, bare.dir, 'migrate', ['--apply']);
            assert.strictEqual(r.status, 0, r.stdout + r.stderr);
            assert.match(r.stdout, /ENGINE_MANIFEST_MISSING/);
            assert.ok(
                fs.existsSync(path.join(bare.dir, OLD_ENGINE, 'spec.md')),
                'without a manifest nothing of the engine folder is removed',
            );
            assert.ok(
                fs.existsSync(path.join(bare.dir, OLD_ENGINE, '.version')),
                'and its version file stays too',
            );
            assert.ok(
                !fs.existsSync(path.join(bare.dir, 'workflows', 'magic.spec.md')),
                'the wrappers are still removed',
            );
        } finally {
            cleanLink(bare.dir);
            cleanup(bare.dir);
        }
    });
};
