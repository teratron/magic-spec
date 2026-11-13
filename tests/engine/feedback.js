// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    TESTS_DIR,
    scriptsDir,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
} = require('./lib/base');
const {
    makeArchivalProject,
    runEngine,
    readShipped,
    listShipped,
    feedbackRunner,
    channelSetter,
} = require('./lib/sim');

module.exports = () => {
    test('feedback note reads the channel setting: off records nothing, draft records, an unrecognized value gives draft and is reported, none of them ever widens (EF-10)', () => {
        const tempDir = createTempWorkspace();
        try {
            const executor = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');
            const note = () =>
                spawnSync(
                    process.execPath,
                    [
                        executor,
                        'feedback',
                        'note',
                        '--kind=docs',
                        '--summary=a step is unclear',
                        '--tried=read it twice',
                        '--happened=two readings',
                    ],
                    { cwd: tempDir, encoding: 'utf8' },
                );
            const registry = path.join(tempDir, '.magicspec', 'workspace.json');
            const storeFile = path.join(tempDir, '.magicspec', '.cache', 'feedback.json');
            const setChannel = channelSetter(registry);

            setChannel('off');
            const off = note();
            assert.strictEqual(off.status, 0);
            assert.match(off.stdout, /channel is off/);
            assert.ok(!fs.existsSync(storeFile), 'off records nothing');

            setChannel('draft');
            const draft = note();
            assert.match(draft.stdout, /Recorded docs note n1/);
            assert.ok(fs.existsSync(storeFile), 'draft records');

            setChannel('everything');
            const unknown = note();
            assert.strictEqual(unknown.status, 0);
            assert.match(
                unknown.stderr,
                /feedback\.channel 'everything' is not one of full, draft, off; the channel is 'draft'/,
            );
            const library = requireFromFixture(tempDir, 'lib', 'feedback.js');
            assert.strictEqual(
                library.readChannel(tempDir).channel,
                'draft',
                'an unrecognized value is draft, never full',
            );

            fs.rmSync(registry);
            assert.strictEqual(
                library.readChannel(tempDir).channel,
                'full',
                'no setting is the default, full',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('feedback draft: every text is scrubbed, the fingerprint ignores wording, the report has the sections of the issue form and a link only when it fits (EF-4, EF-8, EF-9, §5.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { feedback } = feedbackRunner(tempDir);
            const drafts = requireFromFixture(tempDir, 'lib', 'feedback-draft.js');
            const hostile = [
                'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
                'hunter2',
                'AKIAABCDEFGHIJKLMNOP',
                'C:\\Users\\alice\\secret-app\\src\\x.js',
                '/home/bob/app/file.js',
                '@octocat',
                '#123',
                'acme/repo#45',
                'evil.example/i.png',
                '<img src=x>',
                'a.b@example.com',
                'secret code',
            ];

            // Scrubbing: credentials, absolute paths, mentions, issue references, images, markup, mail, code, names.
            const dirty = [
                'token ghp_abcdefghijklmnopqrstuvwxyz0123456789 and password=hunter2 and AKIAABCDEFGHIJKLMNOP',
                'at C:\\Users\\alice\\secret-app\\src\\x.js and /home/bob/app/file.js and ~/notes/todo.md',
                'ping @octocat about #123 and acme/repo#45 and a.b@example.com',
                '![x](http://evil.example/i.png) <img src=x> ```secret code```',
                'D:\\work\\proj\\skills\\magicspec\\scripts\\finalize.js and /srv/x/.agents/skills/magicspec/workflows/run.md',
                'the secret-app project',
            ].join(' | ');
            const clean = drafts.scrubText(dirty, ['secret-app']);
            for (const planted of hostile)
                assert.ok(!clean.includes(planted), `scrubbed: ${planted}`);
            assert.ok(!clean.includes('secret-app'), 'the project name is gone');
            for (const marker of [
                '[redacted: credential]',
                '[path removed]',
                '[mention removed]',
                '[issue reference removed]',
                '[image removed]',
                '[markup removed]',
                '[email removed]',
                '[code block removed]',
                '[name removed]',
            ]) {
                assert.ok(clean.includes(marker), `the scrubbed text says ${marker}`);
            }
            assert.ok(
                clean.includes('scripts/finalize.js') && clean.includes('workflows/run.md'),
                'an engine file is named by its path inside the skill folder',
            );
            assert.ok(
                !clean.includes('D:') && !clean.includes('/srv/'),
                'the absolute prefix of an engine path is gone',
            );

            // The names of the project, its directories and its users.
            fs.mkdirSync(path.join(tempDir, 'acme-widgets'));
            fs.mkdirSync(path.join(tempDir, 'docs'));
            const names = drafts.projectNames(tempDir);
            assert.ok(names.includes(path.basename(tempDir)), 'the project');
            assert.ok(names.includes('acme-widgets'), 'a directory of the project');
            assert.ok(
                !names.includes('docs') && !names.includes('scripts') && !names.includes('skills'),
                'a generic name says nothing about the project',
            );

            // A note carrying all of it is drafted; the draft carries none of it, and says it will be public.
            const hostileNote = [
                'note',
                '--kind=bug',
                '--summary=finalize leaks ghp_abcdefghijklmnopqrstuvwxyz0123456789',
                '--tried=ran it in C:\\Users\\alice\\secret-app\\src\\x.js and /home/bob/app/file.js',
                '--happened=password=hunter2 see @octocat #123 acme/repo#45 ![x](http://evil.example/i.png) <img src=x> a.b@example.com ```secret code``` AKIAABCDEFGHIJKLMNOP',
                '--engine-file=scripts/finalize.js',
                '--code=FINALIZE_LEAK',
                '--workflow=run',
            ];
            assert.match(feedback(...hostileNote).stdout, /Recorded bug note n1/);
            const drafted = feedback('draft');
            assert.strictEqual(drafted.status, 0, drafted.stderr);
            for (const planted of hostile)
                assert.ok(!drafted.stdout.includes(planted), `the draft carries no ${planted}`);
            assert.match(
                drafted.stdout,
                /Draft d1 — fingerprint [0-9a-f]{12}, 1 note\. This is the complete report; it will be public if it is submitted\./,
            );
            assert.match(
                drafted.stdout,
                /Title: \[agent-feedback\] bug: finalize leaks \[redacted: credential\]/,
            );
            assert.match(
                drafted.stdout,
                /It will be public on the engine's issue tracker; read it in full before it is sent\./,
            );

            // The report has the sections of the repository's issue form, in order; the optional one only when it has text.
            const form = fs.readFileSync(
                path.join(TESTS_DIR, '..', '.github', 'ISSUE_TEMPLATE', 'agent-feedback.yml'),
                'utf8',
            );
            const labels = [...form.matchAll(/^ {6}label: (.+)$/gm)].map((m) => m[1].trim());
            assert.deepStrictEqual(
                labels,
                drafts.SECTIONS,
                'the issue form and the report share their section labels',
            );
            const headings = (text) => [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
            assert.deepStrictEqual(
                headings(drafted.stdout),
                drafts.SECTIONS.filter((s) => s !== 'Expected / suggestion'),
                'a report without an expectation has no Expected section',
            );
            for (const label of ['Summary', 'What happened', 'Impact'])
                assert.ok(
                    drafted.stdout.includes(`## ${label}\n_Written by the agent._`),
                    `${label} is labelled as the agent's`,
                );
            for (const label of ['Environment', 'Engine-observed context'])
                assert.ok(
                    drafted.stdout.includes(`## ${label}\n_Observed by the engine._`),
                    `${label} is labelled as the engine's`,
                );
            assert.ok(
                drafted.stdout.includes('- Engine version: 1.0.0') &&
                    drafted.stdout.includes('- Workflow: run'),
                'the engine-observed environment',
            );

            // The link carries only the title and the body, from the one address the skill folder states.
            const link = /^Link \(opens a prefilled new-issue page[^)]*\): (\S+)$/m.exec(
                drafted.stdout,
            )?.[1];
            assert.ok(link, 'a short report has a link');
            assert.ok(
                link.startsWith('https://github.com/teratron/magic-spec/issues/new?title='),
                'the destination is the repository of the skill folder',
            );
            assert.deepStrictEqual(
                [...new URL(link).searchParams.keys()],
                ['title', 'body'],
                'only the title and the body',
            );

            // One problem, one report: the same facts in other words are grouped; another engine file, or no facts at all, are not.
            const same = (summary, extra = []) => [
                'note',
                '--kind=bug',
                `--summary=${summary}`,
                '--tried=t',
                '--happened=h',
                '--engine-file=scripts/finalize.js',
                '--code=FINALIZE_LEAK',
                '--workflow=run',
                ...extra,
            ];
            feedback('discard', 'd1');
            feedback(
                ...same('first wording', [
                    '--expected=a clean digest',
                    '--suggestion=skip the line',
                ]),
            );
            feedback(...same('quite another wording'));
            feedback(
                'note',
                '--kind=bug',
                '--summary=other file',
                '--tried=t',
                '--happened=h',
                '--engine-file=scripts/update-state.js',
                '--code=FINALIZE_LEAK',
                '--workflow=run',
            );
            feedback('note', '--kind=docs', '--summary=unrelated one', '--tried=t', '--happened=h');
            feedback('note', '--kind=docs', '--summary=unrelated two', '--tried=t', '--happened=h');
            const notes = JSON.parse(
                fs.readFileSync(
                    path.join(tempDir, '.magicspec', '.cache', 'feedback.json'),
                    'utf8',
                ),
            ).notes;
            assert.strictEqual(
                drafts.fingerprint(notes[0]),
                drafts.fingerprint(notes[1]),
                'wording does not change the fingerprint',
            );
            assert.notStrictEqual(
                drafts.fingerprint(notes[0]),
                drafts.fingerprint(notes[2]),
                'another engine file does',
            );
            assert.notStrictEqual(
                drafts.fingerprint(notes[3]),
                drafts.fingerprint(notes[4]),
                'notes with no stable facts stand alone',
            );
            const grouped = drafts.createDrafts(undefined, tempDir);
            assert.strictEqual(
                grouped.drafts.length,
                4,
                'two notes of one problem make one draft: 2 + 1 + 1 + 1 notes in 4 reports',
            );
            const two = grouped.drafts[0];
            assert.deepStrictEqual(two.noteIds.length, 2);
            assert.ok(
                two.body.includes('- first wording') &&
                    two.body.includes('- quite another wording'),
                'one bullet per note',
            );
            assert.deepStrictEqual(
                headings(two.body),
                drafts.SECTIONS,
                'with an expectation the Expected section is there',
            );
            assert.ok(
                two.body.includes('- Expected: a clean digest') &&
                    two.body.includes('- Suggestion: skip the line'),
            );

            // A report too long for a link still has its text; one over the report bound is cut and says by how much.
            feedback('discard', 'd2');
            feedback('discard', 'd3');
            feedback('discard', 'd4');
            feedback('discard', 'd5');
            const long = (word) => [
                'note',
                '--kind=bug',
                `--summary=${word}`,
                `--tried=${'t'.repeat(600)}`,
                `--happened=${'h'.repeat(1200)}`,
                '--engine-file=scripts/finalize.js',
                '--code=LONG_ONE',
                '--workflow=run',
            ];
            for (const word of ['one', 'two', 'three', 'four', 'five', 'six', 'seven'])
                feedback(...long(word));
            const big = drafts
                .createDrafts(undefined, tempDir)
                .drafts.find((d) => d.noteIds.length === 7);
            assert.ok(big, 'seven long notes of one problem');
            assert.strictEqual(big.link, null, 'no link when it would not fit');
            assert.ok(
                big.body.length <= drafts.REPORT_MAX + 80 &&
                    /\[truncated: \d+ characters omitted\]/.test(big.body),
                'a report over its bound is cut and says by how much',
            );
            assert.match(
                feedback('draft', big.id).stdout,
                /Link: not available, the report is too long for one — use the text\./,
            );

            // keep delivers a draft as text and closes it with its notes; discard removes a draft and its notes.
            feedback('note', '--kind=docs', '--summary=survivor', '--tried=t', '--happened=h');
            const kept = feedback('keep', big.id);
            assert.match(kept.stdout, /~~~~markdown/);
            assert.match(
                kept.stdout,
                new RegExp(`Draft ${big.id} closed as text; its notes are delivered\\.`),
            );
            assert.match(
                feedback('list').stdout,
                /survivor/,
                'a note outside the draft is untouched',
            );
            assert.ok(
                !/seven|three/.test(feedback('list').stdout),
                'the notes of the kept draft are delivered',
            );
            assert.match(feedback('discard', 'd99').stdout, /No draft d99\./);
        } finally {
            cleanup(tempDir);
        }
    });

    test('feedback draft: the number of drafts is bounded and a note already in a draft is left in it (EF-5)', () => {
        const tempDir = createTempWorkspace();
        try {
            const feedbackLib = requireFromFixture(tempDir, 'lib', 'feedback.js');
            const drafts = requireFromFixture(tempDir, 'lib', 'feedback-draft.js');
            for (let i = 1; i <= 21; i++) {
                assert.ok(
                    feedbackLib.addNote(
                        {
                            kind: 'bug',
                            summary: `s${i}`,
                            tried: 't',
                            happened: 'h',
                            code: `CODE_${i}`,
                        },
                        {},
                        tempDir,
                    ).recorded,
                );
            }
            const outcome = drafts.createDrafts(undefined, tempDir);
            assert.strictEqual(
                outcome.drafts.length,
                feedbackLib.LIMITS.drafts,
                'drafts stop at the limit',
            );
            assert.match(outcome.message, /holds 20 drafts, the limit/);
            const again = drafts.createDrafts(undefined, tempDir);
            assert.strictEqual(
                again.drafts.length,
                0,
                'the notes already drafted are not drafted again',
            );
            assert.match(again.message, /holds 20 drafts, the limit/);
            const store = feedbackLib.loadStore(tempDir);
            assert.strictEqual(
                store.notes.filter((n) => !n.draftId).length,
                1,
                'the twenty-first note is still pending',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('feedback submit: a draft identifier only, behind the channel and a shown draft, the look-up first, exactly one of four outcomes, a failure leaves the draft, one destination (EF-2, EF-3, EF-8, EF-9, §5.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const library = requireFromFixture(tempDir, 'lib', 'feedback.js');
            const drafts = requireFromFixture(tempDir, 'lib', 'feedback-draft.js');
            const submission = requireFromFixture(tempDir, 'lib', 'feedback-submit.js');
            const registry = path.join(tempDir, '.magicspec', 'workspace.json');
            const setChannel = channelSetter(registry);
            const fresh = () => {
                const store = library.loadStore(tempDir);
                store.notes = [];
                store.drafts = [];
                library.saveStore(store, tempDir);
                library.addNote(
                    {
                        kind: 'bug',
                        summary: 'finalize drops an entry',
                        tried: 'ran finalize',
                        happened: 'see https://github.com/evil/elsewhere for the log',
                        code: 'ENTRY_LOST',
                        engineFile: 'scripts/finalize.js',
                        workflow: 'run',
                    },
                    {},
                    tempDir,
                );
                return drafts.createDrafts(undefined, tempDir).drafts[0];
            };
            // A stand-in for the tracker's client: no test reaches the real tracker.
            const stub = (answers) => {
                const calls = [];
                const client = (args, input) => {
                    calls.push({ args, input });
                    const answer = answers[args[1]] ?? { status: 0, stdout: '', stderr: '' };
                    return { missing: false, ...answer };
                };
                return { calls, client };
            };
            const listed = { status: 0, stdout: '[]', stderr: '' };
            const issue = 'https://github.com/teratron/magic-spec/issues/77';
            const stored = () => library.loadStore(tempDir);

            // Refusals: the channel, a draft that was not shown, an identifier that is no draft. Nothing reaches the client.
            let draft = fresh();
            let probe = stub({ list: listed });
            setChannel('draft');
            let result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.strictEqual(result.outcome, 'not created');
            assert.match(result.reason, /feedback channel is 'draft': the agent cannot publish/);
            setChannel('full');
            const unshown = stored();
            unshown.drafts[0].shownAt = null;
            library.saveStore(unshown, tempDir);
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.match(
                result.reason,
                /was not shown in full; show it with `feedback draft d\d+` first/,
            );
            result = submission.submitDraft('d99', { client: probe.client, root: tempDir });
            assert.match(result.reason, /there is no draft d99/);
            assert.strictEqual(probe.calls.length, 0, 'a refusal never reaches the client');

            // A duplicate is found first and nothing is created, unless the person asks for a new issue.
            draft = fresh();
            probe = stub({
                list: {
                    status: 0,
                    stdout: JSON.stringify([
                        { url: 'https://github.com/teratron/magic-spec/issues/12' },
                    ]),
                    stderr: '',
                },
                create: { status: 0, stdout: `${issue}\n`, stderr: '' },
            });
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.strictEqual(result.outcome, 'duplicate found');
            assert.strictEqual(result.url, 'https://github.com/teratron/magic-spec/issues/12');
            assert.deepStrictEqual(
                probe.calls.map((c) => c.args[1]),
                ['list'],
                'only the look-up ran',
            );
            const lookup = probe.calls[0].args;
            assert.ok(
                lookup.includes('--state') &&
                    lookup.includes('open') &&
                    lookup.some((a) => a.includes(draft.fingerprint)),
                'the look-up asks for open issues carrying the fingerprint',
            );
            assert.strictEqual(stored().drafts.length, 1, 'a duplicate leaves the draft');
            result = submission.submitDraft(draft.id, {
                client: probe.client,
                root: tempDir,
                forceNew: true,
            });
            assert.strictEqual(result.outcome, 'created', 'the person asked for a new one');

            // Created: exactly the shown text, at the one address, with no label; the draft and its notes leave the store and cannot be created again.
            draft = fresh();
            probe = stub({ list: listed, create: { status: 0, stdout: `${issue}\n`, stderr: '' } });
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.deepStrictEqual(
                { outcome: result.outcome, url: result.url },
                { outcome: 'created', url: issue },
            );
            const create = probe.calls.find((c) => c.args[1] === 'create');
            assert.deepStrictEqual(
                create.args,
                [
                    'issue',
                    'create',
                    '--repo',
                    'teratron/magic-spec',
                    '--title',
                    draft.title,
                    '--body-file',
                    '-',
                ],
                'title and body only, at the repository of the skill folder',
            );
            assert.strictEqual(
                create.input,
                draft.body,
                'what is published is exactly what was shown',
            );
            for (const call of probe.calls)
                assert.strictEqual(
                    call.args[call.args.indexOf('--repo') + 1],
                    'teratron/magic-spec',
                    'no call names another repository, whatever a note says',
                );
            assert.strictEqual(stored().drafts.length, 0);
            assert.strictEqual(stored().notes.length, 0);
            assert.match(
                submission.submitDraft(draft.id, { client: probe.client, root: tempDir }).reason,
                /there is no draft/,
                'a created draft is never created again',
            );

            // A failed look-up never blocks the submission and is reported.
            draft = fresh();
            probe = stub({
                list: { status: 1, stdout: '', stderr: 'boom' },
                create: { status: 0, stdout: `${issue}\n`, stderr: '' },
            });
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.strictEqual(result.outcome, 'created');
            assert.match(
                result.lookup,
                /the duplicate look-up failed \(boom\); the submission went on/,
            );

            // Not created, with the reason and one recovery step; the draft stays. Unknown when the answer cannot be read.
            draft = fresh();
            probe = stub({
                list: listed,
                create: {
                    status: 1,
                    stdout: '',
                    stderr: 'HTTP 403: forbidden at C:\\Users\\alice\\work\\x.txt',
                },
            });
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.strictEqual(result.outcome, 'not created');
            assert.ok(
                result.reason.includes('HTTP 403') && !result.reason.includes('alice'),
                'the reason is scrubbed',
            );
            assert.match(result.recovery, /feedback keep d\d+/);
            assert.strictEqual(
                stored().drafts.length,
                1,
                'a failed submission leaves the draft intact',
            );
            probe = stub({ list: listed, create: { status: 0, stdout: 'done', stderr: '' } });
            result = submission.submitDraft(draft.id, { client: probe.client, root: tempDir });
            assert.strictEqual(
                result.outcome,
                'unknown',
                'success without an address is not claimed as created',
            );
            assert.match(result.reason, /check the tracker before retrying/);
            probe = stub({ list: listed, create: { status: null, stdout: '', stderr: '' } });
            assert.strictEqual(
                submission.submitDraft(draft.id, { client: probe.client, root: tempDir }).outcome,
                'unknown',
                'a client that never finishes is unknown',
            );
            assert.strictEqual(stored().drafts.length, 1);
            const missing = submission.submitDraft(draft.id, {
                client: () => ({ missing: true, status: null, stdout: '', stderr: '' }),
                root: tempDir,
            });
            assert.strictEqual(missing.outcome, 'not created');
            assert.match(missing.reason, /no tracker client \(gh\) is installed or signed in/);

            // Through the command: no argument redirects it, and with no client the text path is what remains.
            const executor = path.join(tempDir, 'skills', 'magicspec', 'scripts', 'executor.js');
            const redirected = spawnSync(
                process.execPath,
                [executor, 'feedback', 'submit', draft.id, '--repo=evil/elsewhere'],
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.notStrictEqual(
                redirected.status,
                0,
                'an option that names a repository is refused before the script runs',
            );
            // The runtime's own folder is the whole PATH: the executor can start its child, and no tracker client can be found.
            const noClient = spawnSync(
                process.execPath,
                [executor, 'feedback', 'submit', draft.id],
                {
                    cwd: tempDir,
                    encoding: 'utf8',
                    env: { ...process.env, PATH: path.dirname(process.execPath) },
                },
            );
            assert.strictEqual(noClient.status, 0);
            assert.match(noClient.stdout, /^\[feedback\] not created/m);
            assert.match(noClient.stdout, /Next: copy the text with `feedback keep d\d+`/);
            assert.strictEqual(library.loadStore(tempDir).drafts.length, 1, 'the draft survives');

            // The destination is stated once, in the skill folder's own metadata, and nowhere in a script.
            const meta = JSON.parse(fs.readFileSync(path.join(scriptsDir, 'package.json'), 'utf8'));
            assert.strictEqual(meta.repository, 'https://github.com/teratron/magic-spec');
            const addresses = listShipped('skills/magicspec/scripts', ['.js']).filter((rel) =>
                /github\.com\/[\w.-]+\/[\w.-]+/.test(readShipped(rel)),
            );
            assert.deepStrictEqual(
                addresses,
                [],
                'no script holds a repository address of its own',
            );
            assert.deepStrictEqual(submission.OUTCOMES, [
                'created',
                'duplicate found',
                'not created',
                'unknown',
            ]);
        } finally {
            cleanup(tempDir);
        }
    });

    test('the bug-reporting rule records a note beside the diagnostic, names the kinds and the channel, offers each draft once and publishes only on a yes, inside the rule kernel (EF-7, EF-10)', () => {
        const ruleModule = readShipped('skills/magicspec/references/rules/bug-reporting.md');
        const part = ruleModule.slice(
            ruleModule.indexOf('### Feedback Notes (Engine Feedback Channel)'),
            ruleModule.indexOf('### Report Template'),
        );
        assert.ok(
            part.length > 0 && ruleModule.indexOf('### Feedback Notes') !== -1,
            'the module has the part',
        );
        assert.ok(
            ruleModule.indexOf('### Recording (Diagnostics Digest)') <
                ruleModule.indexOf('### Feedback Notes'),
            'it follows the diagnostics recording',
        );
        for (const needle of [
            'node scripts/executor.js feedback note --kind={bug|missing-capability|improvement|docs}',
            'Every `MAGIC-SPEC ENGINE BUG REPORT` you emit is also recorded as a `bug` note',
            '`bug` — the engine does not do what its text says',
            '`missing-capability`',
            '`improvement`',
            '`docs`',
            "a defect of the user's product, of the host, or of the user's environment",
            'A note carries no project content',
            '`feedback.channel`',
            '`full` (the default: copy, link, submission)',
            '`draft` (text and link only; you can never publish)',
            '`off` (no notes, no offer)',
            'An unrecognized value means `draft`',
            'offer each draft **once**',
            "only after the person's explicit yes to the draft you showed, never on your own and never in the `draft` channel",
            '`feedback keep {draft-id}`',
            '`feedback discard {draft-id}`',
            'A draft left unanswered is listed again in the next digest; do not ask again',
            'never say a report was filed unless it said `created`',
        ]) {
            assert.ok(part.includes(needle), `the part states: ${needle}`);
        }

        // The kernel points at it, within its budget; the consumer guard is as it was.
        const rules = readShipped('skills/magicspec/CONSTITUTION.md');
        assert.ok(
            rules.includes(
                'finding with `record-diagnostic` and as a `feedback note`. Template, recording and the offer of the drafts:',
            ),
            'the kernel names the note and the offer',
        );
        assert.ok(
            rules.includes(
                'do NOT edit it: emit the `MAGIC-SPEC ENGINE BUG REPORT` block for the user',
            ),
            'the read-only prohibition is untouched',
        );
        assert.ok(
            Buffer.byteLength(rules) < 16384,
            `the rule kernel is under 16 KB (${Buffer.byteLength(rules)} bytes)`,
        );

        // The setting is in the template, and the template's own value is the default the reader assumes.
        const template = JSON.parse(readShipped('skills/magicspec/templates/workspace.json'));
        assert.deepStrictEqual(template.feedback, { channel: 'full' });
    });

    test('finalize --workflow=fix: accepted, a repair finishing a maintenance phase archives it and writes a Fixed entry, a defect that changed nothing is a no-op, the help and the lists name the workflow (CS-1 finalization list)', () => {
        const repaired = makeArchivalProject();
        const idle = makeArchivalProject(undefined, { done: false });
        try {
            const result = runEngine(repaired.dir, 'finalize', '--workflow=fix', '--workspace=ws');
            const out = result.stdout + result.stderr;
            assert.strictEqual(result.status, 0, out);
            assert.match(out, /\| Workflow \| \/magicspec fix \|/, 'the workflow is accepted');
            assert.ok(
                fs.existsSync(path.join(repaired.ws, 'archives', 'tasks', 'phase-1.md')),
                'a finished maintenance phase is archived as after a run',
            );
            assert.match(out, /### Archived phases/);
            assert.strictEqual(
                fs.readFileSync(path.join(repaired.dir, '.magicspec', '.version'), 'utf8').trim(),
                '0.1.1',
                'a repair is a significant change: the version bumps',
            );
            const changelog = fs.readFileSync(path.join(repaired.dir, 'CHANGELOG.md'), 'utf8');
            assert.match(
                changelog,
                /### Fixed\n[\s\S]*Repaired a reported defect \(ws\)/,
                'the entry is a Fixed entry that names no internal identifier',
            );
            assert.match(out, /Next: /, 'the handoff line follows the step');

            // A defect that changed nothing (unreproduced, not a defect) writes nothing: no bump, no entry.
            const quiet = runEngine(
                idle.dir,
                'finalize',
                '--workflow=fix',
                '--workspace=ws',
                '--dry-run',
            );
            assert.strictEqual(quiet.status, 0, quiet.stdout + quiet.stderr);

            // An unknown workflow is refused naming the accepted ones, fix among them.
            const refused = runEngine(
                repaired.dir,
                'finalize',
                '--workflow=goal',
                '--workspace=ws',
            );
            assert.notStrictEqual(refused.status, 0);
            assert.match(
                refused.stdout + refused.stderr,
                /Expected one of: spec, plan, task, run, rule, fix, simulate/,
            );
            assert.match(
                runEngine(repaired.dir, 'finalize', '--help').stdout,
                /spec \| plan \| task \| run \| rule \| fix \| simulate \(required\)/,
                'the help lists every workflow',
            );
        } finally {
            cleanup(repaired.dir);
            cleanup(idle.dir);
        }

        // The bullet and the category come from one place and name a repair, whatever the count.
        const bullets = requireFromFixture(
            path.resolve(TESTS_DIR, '..'),
            'lib',
            'changelog-bullets.js',
        );
        assert.strictEqual(bullets.deriveChangelogCategory('fix', []), 'Fixed');
        assert.strictEqual(
            bullets.buildChangelogBullet('fix', 'ws', [
                { path: '.magicspec/ws/tasks/phase-1.md', status: 'modified' },
            ]),
            'Repaired a reported defect (ws)',
        );
        assert.strictEqual(
            bullets.buildChangelogBullet('fix', 'ws', [
                { path: '.magicspec/ws/tasks/phase-1.md', status: 'modified' },
                { path: '.magicspec/ws/tasks/phase-2.md', status: 'modified' },
            ]),
            'Repaired 2 reported defects (ws)',
        );
        const whitelist = requireFromFixture(
            path.resolve(TESTS_DIR, '..'),
            'lib',
            'significance.js',
        ).WHITELIST['magic.fix'];
        for (const counted of [
            '.magicspec/{ws}/PLAN.md',
            '.magicspec/{ws}/specifications/**/*.md',
            '.magicspec/{ws}/tasks/**/*.md',
            '.magicspec/{ws}/TASKS.md',
        ]) {
            assert.ok(whitelist.includes(counted), `a repair counts ${counted}`);
        }
        const finalization = readShipped('skills/magicspec/references/rules/finalization.md');
        assert.ok(
            finalization.includes(
                '| `/magicspec fix` | as `run`, and `.magicspec/{ws}/PLAN.md` (a maintenance phase), `specifications/**/*.md`, `.magicspec/{ws}/INDEX.md` |',
            ),
            'the whitelist row is in the rule module',
        );
    });
};
