// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
    TESTS_DIR,
    scriptsDir,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    generateChecksums,
    makeSpecWorkspace,
    runCheckPrerequisites,
} = require('./lib/base');
const {
    makeArchivalProject,
    runEngine,
    shippedRoot,
    readShipped,
    listShipped,
    engineBodies,
    stepBlock,
    lineWith,
    runGuards,
    runStep,
    cardLine,
} = require('./lib/sim');

module.exports = () => {
    test('a defect report given to spec is routed to fix with one [DR] line and its override, a mixed request goes to fix for the defect, an idea stays an idea, and no shipped text names the maintenance command (FX-11)', () => {
        const router = readShipped('skills/magicspec/SKILL.md');
        const step = router.slice(
            router.indexOf("3. **Check that the argument can be this command's.**"),
            router.indexOf('4. **Read the body.**'),
        );
        assert.ok(
            step.length > 0 && router.indexOf('3. **Check that the argument') !== -1,
            'the router has the step',
        );
        const reverse = lineWith(step, '**The reverse (a defect report is not an idea).**');
        assert.ok(reverse, 'step 3 has the reverse route');
        for (const needle of [
            'Input given to `spec` that is a defect report',
            'an error message or stack trace',
            'a pasted bug report',
            'a statement that existing behaviour is wrong ("X does not work", "Y fails when Z") with nothing new to build',
            'runs `fix` instead',
            '`[DR] Routed to fix — a defect report, not an idea. (Override: /magicspec spec "{text}")`',
            'both reports a defect and asks for new behaviour goes to `fix` for the defect',
            'the new behaviour is a specification gap it records or the next step it names',
            'A feature request or a plain idea is never a defect report',
            'is not routed twice',
        ]) {
            assert.ok(reverse.includes(needle), `step 3 states: ${needle}`);
        }

        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const testAt = spec.indexOf('### Defect Report Test (After the Input Pass, Before Step 0)');
        assert.notStrictEqual(testAt, -1, 'the specification workflow has the test');
        assert.ok(
            spec.indexOf('### Input Pass (First Step, Before Step 0)') < testAt,
            'it follows the Input Pass',
        );
        assert.ok(
            testAt < spec.indexOf('### Step 0: Workspace Intent Detection'),
            'and precedes Step 0',
        );
        const section = spec.slice(testAt, spec.indexOf('### Step 0: Workspace Intent Detection'));
        for (const needle of [
            'typed, entered in the argument form, chosen in the picker',
            "the defect-report test of the router's Dispatch step 3",
            'nothing is written here — no workspace is created, no intake survey is opened',
            'goes to `fix` for the defect',
            'stays an idea',
        ]) {
            assert.ok(section.includes(needle), `the section states: ${needle}`);
        }
        assert.ok(
            spec.includes('- **Defect reports**:') && spec.includes('☐ Defect Report Test:'),
            'the hints and the checklist carry it',
        );

        // The maintenance command is named by the repository's own text, never by a shipped body or router.
        for (const rel of [
            'skills/magicspec/SKILL.md',
            'skills/magicspec/workflows/spec.md',
            'skills/magicspec/workflows/fix.md',
        ]) {
            assert.ok(
                !readShipped(rel).includes('magicspec-dev'),
                `${rel} names no maintenance command`,
            );
        }
    });

    // A function that sets `feedback.channel` in an existing registry and keeps the rest of it.
    const channelPatcher = (registry) => (value) => {
        const config = JSON.parse(fs.readFileSync(registry, 'utf8'));
        config.feedback = { channel: value };
        fs.writeFileSync(registry, JSON.stringify(config));
    };

    test('finalize lists the pending notes between the digest and the next step: each draft offered once, off prints nothing, a preview offers nothing, a fault in the store costs the block and nothing else (EF-10, EF-11)', () => {
        const project = makeArchivalProject();
        try {
            const library = requireFromFixture(project.dir, 'lib', 'feedback.js');
            const note = (summary) =>
                library.addNote(
                    { kind: 'bug', summary, tried: 't', happened: 'h' },
                    {},
                    project.dir,
                );
            note('first problem');
            note('second problem');
            const setChannel = channelPatcher(
                path.join(project.dir, '.magicspec', 'workspace.json'),
            );
            const finalize = (...extra) =>
                runEngine(project.dir, 'finalize', '--workflow=run', '--workspace=ws', ...extra);
            const offered = () =>
                library.loadStore(project.dir).notes.map((n) => Boolean(n.offeredAt));

            // A preview lists and records no offer.
            const preview = finalize('--dry-run');
            assert.strictEqual(preview.status, 0, preview.stdout + preview.stderr);
            assert.match(
                preview.stdout,
                /### Feedback notes\n\n2 notes pending\. Offer each draft once: run `.*feedback draft`, show the person the complete report it prints and ask: submit, keep as text, or discard\./,
            );
            assert.deepStrictEqual(offered(), [false, false], 'a preview records no offer');
            assert.ok(
                !/\[dry-run\][^\n]*feedback\.json/.test(preview.stdout),
                'and does not even try to write the store',
            );

            // The first real listing offers each note once, between the digest and the next step.
            const first = finalize();
            assert.strictEqual(first.status, 0, first.stdout + first.stderr);
            assert.match(
                first.stdout,
                /- n1 {2}bug {2}first problem\n- n2 {2}bug {2}second problem/,
            );
            assert.ok(
                first.stdout.indexOf('### Feedback notes') < first.stdout.indexOf('### Next step'),
                'the block precedes the next step',
            );
            assert.match(
                first.stdout,
                /\nNext: \/magicspec /,
                'the handoff line is still printed, once',
            );
            assert.ok(
                !first.stdout.includes('Run /magicspec fix'),
                'outside the engine repository the notes are not a work queue: the next step is the plan state',
            );
            assert.deepStrictEqual(offered(), [true, true]);

            // A later listing names them as offered and does not ask again.
            const second = finalize();
            assert.strictEqual(second.status, 0);
            assert.match(
                second.stdout,
                /Offered before and not answered \(listed again, not asked again\):\n- n1 {2}bug {2}first problem/,
            );
            assert.ok(!second.stdout.includes('Offer each draft once'), 'it is not asked again');

            // The channel draft removes submission from the answers; off prints nothing.
            library.addNote(
                { kind: 'docs', summary: 'third problem', tried: 't', happened: 'h' },
                {},
                project.dir,
            );
            setChannel('draft');
            assert.match(
                finalize().stdout,
                /ask: keep as text, or discard \(the channel is draft: the agent cannot publish\)\./,
            );
            setChannel('off');
            const off = finalize();
            assert.strictEqual(off.status, 0);
            assert.ok(!off.stdout.includes('### Feedback notes'), 'off prints nothing');

            // A fault in the store costs the block and nothing else.
            setChannel('full');
            fs.writeFileSync(library.storePath(project.dir), '{ not json');
            const broken = finalize();
            assert.strictEqual(broken.status, 0, 'a broken store never fails a workflow');
            assert.ok(!broken.stdout.includes('### Feedback notes'));
            assert.match(broken.stdout, /### Next step/);
        } finally {
            cleanup(project.dir);
        }
    });

    test("in the engine's repository the notes are a work queue: listed as fix candidates, nothing offered, the next step is the fix command unless the replan funnel comes first (EF-12)", () => {
        const project = makeArchivalProject();
        try {
            fs.mkdirSync(path.join(project.dir, 'scripts'), { recursive: true });
            fs.writeFileSync(
                path.join(project.dir, 'scripts', 'generate-checksums.js'),
                '// the developer predicate: the maintenance tooling is present\n',
            );
            const library = requireFromFixture(project.dir, 'lib', 'feedback.js');
            library.addNote(
                { kind: 'bug', summary: 'a guard fires twice', tried: 't', happened: 'h' },
                {},
                project.dir,
            );
            library.addNote(
                { kind: 'improvement', summary: 'a message is vague', tried: 't', happened: 'h' },
                {},
                project.dir,
            );
            const result = runEngine(project.dir, 'finalize', '--workflow=run', '--workspace=ws');
            assert.strictEqual(result.status, 0, result.stdout + result.stderr);
            assert.match(
                result.stdout,
                /### Feedback notes — fix candidates\n\n2 notes recorded about the engine are work items in this repository, not reports: nothing is drafted or offered for submission\.\n- n1 {2}bug {2}a guard fires twice/,
            );
            assert.ok(!result.stdout.includes('Offer each draft once'), 'nothing is offered');
            assert.deepStrictEqual(
                library.loadStore(project.dir).notes.map((n) => Boolean(n.offeredAt)),
                [false, false],
                'nothing is marked offered',
            );
            assert.match(
                result.stdout,
                /### Next step\n\nRun \/magicspec fix ws to work through 2 pending feedback notes\n\nNext: \/magicspec fix ws — deep reasoning/,
            );

            // The choice itself: the queue outranks continuing the work, not the replan funnel, and an empty or switched-off queue changes nothing.
            const finalizeLib = require(path.join(scriptsDir, 'finalize.js'));
            const state = path.join(project.dir, '.magicspec');
            const wsDir = path.join(state, 'ws');
            assert.strictEqual(
                finalizeLib.workQueueFirst(
                    'ws',
                    wsDir,
                    'Execute T-1A01 Do it via /magicspec run ws',
                ),
                'Run /magicspec fix ws to work through 2 pending feedback notes',
            );
            assert.strictEqual(
                finalizeLib.workQueueFirst(
                    'ws',
                    wsDir,
                    'Run /magicspec plan ws to revalidate the plan against amended rules',
                ),
                'Run /magicspec plan ws to revalidate the plan against amended rules',
                'the replan funnel keeps its place',
            );
            const setChannel = channelPatcher(path.join(state, 'workspace.json'));
            setChannel('off');
            assert.strictEqual(
                finalizeLib.workQueueFirst(
                    'ws',
                    wsDir,
                    'Execute T-1A01 Do it via /magicspec run ws',
                ),
                'Execute T-1A01 Do it via /magicspec run ws',
                'a switched-off channel changes nothing',
            );
            setChannel('full');
            for (const id of ['n1', 'n2']) library.discardNote(id, project.dir);
            assert.strictEqual(
                finalizeLib.workQueueFirst(
                    'ws',
                    wsDir,
                    'Execute T-1A01 Do it via /magicspec run ws',
                ),
                'Execute T-1A01 Do it via /magicspec run ws',
                'an empty queue changes nothing',
            );
        } finally {
            cleanup(project.dir);
        }
    });

    test("the maintenance fix names the shipped triage unchanged and adds exactly the engine's steps: the whole shipped folder as sibling sites, a harness case shown to fail, C14, every maintained line, notes discarded (FX-10, EF-12)", () => {
        const body = readShipped('skills/magicspec-dev/workflows/fix.md');
        assert.ok(body.startsWith('# Dev Fix Workflow'), 'the body exists');
        assert.ok(
            body.includes('**Command:** `/magicspec-dev fix {report}`'),
            'it states its command line',
        );
        for (const input of [
            'A pasted engine bug report',
            'A pending feedback note',
            'A failing harness case',
            'A finding of an engine simulation',
        ]) {
            assert.ok(body.includes(`| ${input} |`), `an input: ${input}`);
        }
        assert.ok(
            body.includes('node skills/magicspec/scripts/executor.js feedback list'),
            'pending notes are read through the channel',
        );
        assert.ok(
            body.includes(
                'Read `skills/magicspec/workflows/fix.md` in full and follow it unchanged, with the engine as the product',
            ),
            'the triage is the shipped one',
        );
        const extra = body.slice(
            body.indexOf('## What Only the Engine Has'),
            body.indexOf('## Report and Finalization'),
        );
        const steps = extra.split('\n').filter((line) => /^\d+\. \*\*/.test(line));
        assert.strictEqual(steps.length, 7, 'seven engine steps and no more');
        const expected = [
            [
                '1. **The sibling search covers the whole shipped folder.**',
                'role cards, references, templates and scripts',
                'A role card and the specification that mirrors it are one site',
            ],
            [
                '2. **The lasting check is a harness case that fails without the repair.**',
                'Write the case in `tests/engine.js` first and run it red',
                '`node scripts/mutation-check.js {list.json}`',
                'must be reported `CAUGHT`',
            ],
            [
                '3. **Code style and static checks.**',
                '`node_modules/.bin/biome check <files>` and `pnpm run audit`',
            ],
            [
                '4. **C14 follows every change inside the shipped folder.**',
                '`node skills/magicspec/scripts/executor.js update-engine-meta` at once',
            ],
            ['5. **Layer rules hold.**', '`scripts/generate-checksums.js`'],
            [
                '6. **The repair reaches every maintained release line the defect is present on.**',
                'The 3.x line is `develop`',
                'ported to `v2.1` through a disposable worktree outside the repository, without asking; nothing goes to `master`',
            ],
            ['7. **Notes are discarded when repaired.**', 'feedback discard {id}'],
        ];
        expected.forEach((needles, i) => {
            const text = extra.slice(extra.indexOf(steps[i]));
            for (const needle of needles)
                assert.ok(text.includes(needle), `step ${i + 1} states: ${needle}`);
        });
        assert.ok(
            body.includes('`[C-001]`') && body.includes('node scripts/validate-hardlinks.js'),
            'the hardlink constraint is named',
        );
        assert.ok(
            readShipped('skills/magicspec-dev/workflows/fix.md').includes(
                'Lines: {line}: repaired | absent | ported',
            ),
            'the report names the release lines',
        );
        assert.ok(
            !readShipped('skills/magicspec/workflows/fix.md').includes('magicspec-dev'),
            'the shipped triage names no maintenance step',
        );
    });

    test('the maintenance router has the space grammar, reads the colon spelling as text, lists five commands in the three-column shape the projection reads, and names no printed colon form itself (CS-15)', () => {
        const router = readShipped('skills/magicspec-dev/SKILL.md');
        const projection = require(
            path.join(TESTS_DIR, '..', 'scripts', 'init', 'project-dev-skill.js'),
        );
        assert.deepStrictEqual(
            projection.readCommands(path.resolve(TESTS_DIR, '..')).map((c) => c.name),
            ['init', 'test', 'sync', 'release', 'fix'],
            'the projection reads the five rows in table order',
        );
        assert.ok(router.includes('One skill, five commands, for the developer repository only.'));
        assert.ok(
            router.includes(
                'The grammar is `/magicspec-dev <command> [argument]`. The colon spelling `/magicspec-dev:<command>`, typed as text, is read as that command too and is never printed by this router.',
            ),
            'the space grammar, the colon spelling read as text',
        );
        assert.ok(
            router.includes(
                'Take the command from the first word after `magicspec-dev` (or `/magicspec-dev`)',
            ),
            'the dispatch reads both spellings',
        );
        const description = /^description: (.*)$/m.exec(router)[1];
        for (const command of ['init', 'test', 'sync', 'release', 'fix'])
            assert.ok(description.includes(`\`${command}\``), `the description names ${command}`);
        const rows = router.split('\n').filter((line) => /^\| `[a-z]+` \|/.test(line));
        assert.strictEqual(rows.length, 5, 'five rows');
        for (const row of rows) {
            const name = /^\| `([a-z]+)`/.exec(row)[1];
            assert.ok(
                row.endsWith(`| \`workflows/${name}.md\` |`),
                `${name}: the body path ends the row`,
            );
            assert.ok(
                fs.existsSync(
                    path.join(shippedRoot, 'skills', 'magicspec-dev', 'workflows', `${name}.md`),
                ),
                `${name}: the body exists`,
            );
        }
        assert.ok(
            !/\/magicspec-dev:[a-z]/.test(router.replace('`/magicspec-dev:<command>`', '')),
            'the router prints no colon form',
        );

        // The maintenance command is stated in the repository's own documents, not in any shipped file.
        const development = readShipped('docs/development.md');
        assert.ok(
            development.includes('## Maintenance commands') &&
                development.includes('| `fix` | Carries error feedback about the engine'),
            'the development guide lists it',
        );
        assert.ok(
            readShipped('docs/distribution.md').includes(
                'the maintenance commands `init`, `test`, `sync`, `release` and `fix`',
            ),
            'the distribution page lists the set',
        );
        for (const rel of ['skills/magicspec/SKILL.md', 'skills/magicspec/workflows/fix.md'])
            assert.ok(
                !readShipped(rel).includes('magicspec-dev'),
                `${rel} names no maintenance command`,
            );
    });

    test('the constitution authorizes the whole maintenance set in C11 (word for word in the shipped template), C28 item 2 names the entry for engine bug reports, and the consumer guard stays intact', () => {
        const constitution = readShipped('.magicspec/RULES.md');
        const template = readShipped('skills/magicspec/templates/rules.md');
        const sectionOf = (text, heading) => {
            const start = text.indexOf(heading);
            assert.notStrictEqual(start, -1, `${heading} is in the text`);
            const end = text.indexOf('\n### ', start + 5);
            return text.slice(start, end === -1 ? undefined : end);
        };
        const c11 = sectionOf(constitution, '### C11 — ');
        assert.strictEqual(
            sectionOf(template, '### C11 — '),
            c11,
            'C11 is the same word for word in the template',
        );
        for (const needle of [
            '### C11 — Maintenance Commands (C2 Exception)',
            "The commands of `/magicspec-dev` — `init`, `test`, `sync`, `release` and `fix` — are explicitly authorized as developer-facing tools of the engine's own repository",
            'They are exceptions to C2. Not intended for use in regular project workflows.',
        ]) {
            assert.ok(c11.includes(needle), `C11 states: ${needle}`);
        }
        assert.ok(
            !c11.includes('one-time exception'),
            'it no longer authorizes `test` alone as a one-time exception',
        );

        const c28 = sectionOf(constitution, '### C28 — ');
        assert.ok(
            c28.includes(
                'is a work item to reproduce and fix, not a report to forward: it is entered through `/magicspec-dev fix`, whose steps are the reproduction and the repair.',
            ),
            'item 2 names the maintenance entry',
        );
        assert.ok(
            c28.includes(
                '5. **The shipped guard stays intact.** Do not weaken the read-only rules',
            ),
            'item 5 is untouched',
        );
        assert.ok(
            !template.includes('/magicspec-dev fix'),
            'the shipped template names no maintenance entry',
        );
        const shippedRules = readShipped('skills/magicspec/CONSTITUTION.md');
        assert.ok(
            shippedRules.includes(
                'do NOT edit it: emit the `MAGIC-SPEC ENGINE BUG REPORT` block for the user',
            ),
            'the consumer prohibition is as it was',
        );

        const history = constitution.split('\n').find((line) => line.startsWith('| 1.21.0 |'));
        assert.ok(
            history?.includes(
                '**C11 extends to the whole maintenance set and C28 item 2 names the entry for engine bug reports**',
            ),
            'the amendment has its history row',
        );
        assert.ok(history.includes('origin `user-stated`'), 'with its origin');
    });

    test('the fix body states its entry and argument contract, the steps FX-1 to FX-9 in order, the five classes and the specification test, the report layout, asks nothing and finalizes as a fix; the router row, help and the page agree (FX-1 to FX-9, CS-9)', () => {
        const body = readShipped('skills/magicspec/workflows/fix.md');
        assert.ok(
            body.startsWith('---\ndescription: Workflow for reported defects'),
            'the body has its description',
        );
        assert.ok(
            body.includes(
                '**Trigger:** `/magicspec fix [defect]`. The defect is required. Arguments:',
            ),
            'the defect is a required argument',
        );
        for (const form of [
            '- *(empty)* — the argument form asks for the defect once.',
            '- `{defect}` — what is wrong, in words;',
            '- `{workspace} "{defect}"` — the same, in a specific workspace',
        ]) {
            assert.ok(body.includes(form), `the entry lists: ${form}`);
        }
        assert.ok(
            body.includes('`node scripts/executor.js feedback list`'),
            'the suggestions come from the open findings',
        );
        assert.ok(
            body.includes('Examples: `/magicspec fix "the export drops the last row"`'),
            'the entry has examples the detail view reads',
        );
        assert.ok(
            body.includes(
                '**Asks nothing**: beyond the argument form for a missing defect, no question is asked (DA-2).',
            ),
            'it asks nothing',
        );
        assert.ok(
            body.includes('resolve-workspace --command fix'),
            'the routing chain knows the command',
        );

        // The steps, in order, with what each states.
        const steps = [
            '0. **Pre-flight**',
            '1. **Re-verify (first)**',
            '2. **Reproduce before changing**',
            '3. **Confirm the cause**',
            '4. **Classify (closed rule)**',
            '4a. **Group by cause**',
            '5. **Sibling sites**',
            '6. **Record the repair as a task**',
            '7. **Repair under the gates**',
            '8. **Regression left behind**',
        ];
        const positions = steps.map((s) => body.indexOf(`\n${s}`));
        for (const [i, at] of positions.entries())
            assert.notStrictEqual(at, -1, `the body has step ${steps[i]}`);
        assert.deepStrictEqual(
            [...positions].sort((a, b) => a - b),
            positions,
            'the steps run in order',
        );
        const step = (label) => {
            const at = body.indexOf(`\n${label}`);
            const next = steps[steps.indexOf(label) + 1];
            return body.slice(at, next ? body.indexOf(`\n${next}`) : body.indexOf('\n## Report'));
        };
        assert.ok(step('1. **Re-verify (first)**').includes('*fixed in the current version*'));
        assert.ok(
            step('2. **Reproduce before changing**').includes('classified `Unreproduced`') &&
                step('2. **Reproduce before changing**').includes(
                    '**nothing is changed for it and nothing is asked**',
                ),
        );
        assert.ok(
            step('3. **Confirm the cause**').includes('is a hypothesis') &&
                step('3. **Confirm the cause**').includes(
                    'make it in a scratch copy and never in the product',
                ),
        );
        const classify = step('4. **Classify (closed rule)**');
        const classes = [
            '**Implementation defect**',
            '**Specification gap**',
            '**Specification defect**',
            '**Not a defect**',
            '**External**',
        ].map((c) => classify.indexOf(`- ${c}`));
        assert.ok(
            classes.every((at) => at !== -1) &&
                [...classes].sort((a, b) => a - b).join() === classes.join(),
            'the five classes, in the order of the rule',
        );
        assert.ok(
            classify.includes(
                '*would an implementer who reads only the specifications reintroduce this defect?*',
            ),
            'the deciding question of the specification test, verbatim',
        );
        assert.ok(step('4a. **Group by cause**').includes('one cause is one task'));
        assert.ok(
            step('5. **Sibling sites**').includes(
                'the same guard, parser, path computation or rule in another file',
            ),
        );
        const record = step('6. **Record the repair as a task**');
        assert.ok(
            record.includes('`T-{phase}F{nn}`') &&
                record.includes('`Verify` line equal to the reproduction'),
        );
        assert.ok(
            record.includes('the body calls the planning write as one step of its own stage') &&
                record.includes('The body never edits `PLAN.md` by any other route.'),
            'PL-1: the plan is written by the planning write only',
        );
        assert.ok(
            record.includes('the Post-Update Review including its coherence check'),
            'a specification amendment follows the spec steps',
        );
        const repair = step('7. **Repair under the gates**');
        assert.ok(
            repair.includes('`workflows/run.md` Steps 2b to 4') &&
                repair.includes('`@role:debugger` takes the branch when the first attempt fails'),
        );
        assert.ok(
            step('8. **Regression left behind**').includes(
                'written and run **before** the repair so that it is seen to fail',
            ),
        );

        // The report layout, as the specification gives it, and the finalization.
        const layout = [
            '[Fix] {n} reported → {r} reproduced, {u} unreproduced, {a} already fixed',
            '  {id} {class} — {confirmed cause} — {spec change | none} — Verify: {check}',
            '  Sibling sites: {k} fixed, {m} recorded',
            'Next: {one command}',
        ].join('\n');
        assert.ok(
            body.includes(`\`\`\`plaintext\n${layout}\n\`\`\``),
            'the report layout is in a plaintext block',
        );
        assert.strictEqual(
            body.split(
                'node scripts/executor.js finalize --workflow=fix --workspace={active-workspace}',
            ).length - 1,
            2,
            'the scope and the protocol both name the fix finalization',
        );
        assert.ok(
            body.includes(
                "a confirmed cause inside the skill folder of this engine is the engine's, not the project's",
            ),
            'a cause in the skill folder is external',
        );

        // The router row, the help list and the page.
        const rows = require(path.join(scriptsDir, 'lib', 'hosts.js')).readCommands();
        const row = rows.find((r) => r.name === 'fix');
        assert.ok(row, 'the router has the row');
        assert.deepStrictEqual(
            { group: row.group, demand: row.demand, body: row.body },
            { group: 'quality & automation', demand: 'deep', body: 'fix.md' },
        );
        assert.ok(row.missing.startsWith('**required**'), 'a missing defect is asked for');
        assert.deepStrictEqual(
            rows.map((r) => r.name).slice(0, 5),
            ['spec', 'plan', 'task', 'run', 'fix'],
            "the row follows run, as in the specification's table",
        );
        const help = readShipped('skills/magicspec/workflows/help.md');
        const groupAt = help.indexOf('Quality & automation\n  fix');
        assert.notStrictEqual(groupAt, -1, 'help renders the new group');
        assert.ok(groupAt < help.indexOf('Health\n  status'), 'between Pipeline and Health');
        assert.ok(
            help.includes('`fix`: its *Entry*, the open findings'),
            'help names where the suggestions come from',
        );
        const triggers = /^\*\*Triggers:\*\*\s+(.+)$/m.exec(body)[1].trim();
        assert.ok(
            readShipped('docs/fix.md').includes(triggers),
            "the page carries the body's triggers verbatim",
        );
        assert.ok(
            readShipped('docs/fix.md').includes('**Slash command:** `/magicspec fix [defect]`'),
        );
    });

    test('the documentation draws four stages: docs/plan.md follows the plan body, docs/task.md keeps decomposition only, the pipeline reads spec, plan, task, run everywhere, and no page names a command the router lacks', () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
        const planBody = read('skills/magicspec/workflows/plan.md');
        const planDoc = read('docs/plan.md');
        const taskDoc = read('docs/task.md');

        // The page carries the body's triggers verbatim and its own slash command, so the maintenance sync has a line to propagate.
        const triggers = /^\*\*Triggers:\*\*\s+(.+)$/m.exec(planBody)[1].trim();
        assert.ok(
            planDoc.includes(`**Triggers:** ${triggers}`),
            'docs/plan.md carries the Triggers line of plan.md',
        );
        assert.ok(planDoc.includes('**Slash command:** `/magicspec plan [arg]`'));
        assert.ok(
            /## Sync Note\s+Synchronized with engine workflows on \d{4}-\d{2}-\d{2} \(v\d+\.\d+\.\d+\)\./.test(
                planDoc,
            ),
            'and a Sync Note',
        );

        // The planning steps are on the plan page, not on the task page.
        for (const owned of [
            'Pre-Planning Stabilization',
            'Planning Audit',
            'Circular Guard',
            'Stable-Spec Requirement',
            'C6 Selection',
        ]) {
            assert.ok(planDoc.includes(owned), `docs/plan.md describes ${owned}`);
            assert.ok(!taskDoc.includes(owned), `docs/task.md does not describe ${owned}`);
        }
        for (const kept of [
            'The Plan Gate',
            'Findings Go Back',
            'Replan Directive',
            'Stalled Plan',
        ]) {
            assert.ok(taskDoc.includes(kept), `docs/task.md describes ${kept}`);
        }
        assert.ok(taskDoc.includes('| `update` | Plan alias |'), 'the update alias is explained');

        // The pipeline, in each place it is drawn or sentenced.
        const readme = read('README.md');
        const index = read('docs/README.md');
        assert.ok(readme.includes('*Thought → Spec → Plan → Task → Run → Code*'));
        assert.ok(readme.includes('📋 Specification  →  🗺️ Plan  →  ✅ Task  →  ⚡ Run'));
        assert.ok(index.includes('*Thought → Spec → Plan → Task → Run → Code*'));
        assert.ok(index.includes('**4 core workflows** and **6 auxiliary workflows**'));
        assert.ok(
            index.includes('SPEC --> PLAN["🗺️ Plan"]') &&
                index.includes('PLAN --> TASK["✅ Task"]') &&
                index.includes('TASK --> RUN["⚡ Run"]'),
        );
        assert.ok(
            index.includes('| **2** | **Plan** | `plan.md`') &&
                index.includes('| **3** | **Task** | `task.md`'),
        );
        assert.ok(index.includes('Spec → Plan → Task → Run'));
        assert.ok(read('docs/spec.md').includes('before running `/magicspec plan`'));
        assert.ok(read('docs/rule.md').includes('`/magicspec plan {workspace}` by default'));

        // No page, and no shipped text, names a command the router does not list (an alias counts as listed).
        const hosts = require(path.join(scriptsDir, 'lib', 'hosts.js'));
        const known = new Set(hosts.readCommands().flatMap((r) => [r.name, ...r.aliases]));
        const phantoms = [];
        const scan = (rel) => {
            const full = path.join(repo, rel);
            if (fs.statSync(full).isDirectory()) {
                for (const entry of fs.readdirSync(full)) scan(path.join(rel, entry));
            } else if (rel.endsWith('.md')) {
                fs.readFileSync(full, 'utf8')
                    .split(/\r?\n/)
                    .forEach((line, i) => {
                        for (const m of line.matchAll(/(?:^|[\s`"(])\/magicspec ([a-z][a-z-]*)/g)) {
                            if (!known.has(m[1]))
                                phantoms.push(`${rel}:${i + 1} /magicspec ${m[1]}`);
                        }
                    });
            }
        };
        for (const rel of ['skills/magicspec', 'docs', 'README.md']) scan(rel);
        assert.deepStrictEqual(phantoms, [], 'every command a page names is a row of the router');
    });

    test('shipped text: no workflow body starts a later stage by itself, and a drift found in a run goes back to plan as a recorded directive (PS-1, PS-5, PL-6)', () => {
        const dir = path.join(shippedRoot, 'skills', 'magicspec', 'workflows');
        // Wording that makes one stage start the next: an automatic invocation, an auto-run, the old narration.
        const chaining =
            /automatically invoke|auto-run `\/magicspec|Auto-Handoff|invoking `?\/magicspec (?:plan|task|run)\b/i;
        for (const planted of [
            'automatically invoke `/magicspec task` to regenerate the plan',
            'auto-run `/magicspec task {workspace} update` to synchronize',
            '[Auto-Handoff] Specs Stable. Invoking /magicspec task.',
            'then proceed — invoking `/magicspec plan`',
        ]) {
            assert.ok(chaining.test(planted), `the detector fires on: ${planted}`);
        }
        for (const spared of [
            'name it as the next step, never started',
            'by editing the Draft or invoking `/magicspec spec amend`',
        ]) {
            assert.ok(!chaining.test(spared), `the detector spares: ${spared}`);
        }
        const bodies = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
        assert.ok(bodies.includes('plan.md') && bodies.includes('run.md'));
        for (const body of bodies) {
            assert.ok(
                !chaining.test(fs.readFileSync(path.join(dir, body), 'utf8')),
                `${body} starts no later stage`,
            );
        }

        // run: the drift guards end the run with the one next step, the plan.
        const run = readShipped('skills/magicspec/workflows/run.md');
        const sync = lineWith(run, '- **Sync**: `RULES.md` version > `TASKS.md` base');
        assert.ok(sync, 'run.md carries the Sync guard');
        for (const needle of [
            '**HALT**',
            'the plan is stale (PL-4) and is not repaired inside a run',
            '## Replan Directive',
            '**Plan version:**',
            '**Directive:**',
            '`/magicspec plan {workspace}` as the one next step',
        ]) {
            assert.ok(sync.includes(needle), `the Sync guard states: ${needle}`);
        }
        const handoff = lineWith(run, '- **Handoff**: spec ambiguous OR any drift signal');
        for (const needle of [
            "record the finding in the ledger's `## Replan Directive` section",
            'exactly ONE command — `/magicspec plan {workspace}`',
            'which reads the directive',
            'its Stalled Plan report',
        ]) {
            assert.ok(handoff?.includes(needle), `the run Handoff states: ${needle}`);
        }
        assert.ok(
            lineWith(run, '**Quarantine (C12)**')?.includes(
                'the plan decides the quarantine and `/magicspec task` applies it to the tasks',
            ),
        );
        assert.ok(
            lineWith(run, '**Spec Stability**')?.includes('Run `/magicspec plan {workspace}`'),
        );
        assert.ok(
            lineWith(run, '**Mid-Run Stability Check**')?.includes(
                'run `/magicspec plan {workspace}` to re-evaluate',
            ),
        );
        assert.ok(
            lineWith(run, '- *Backlog-Only*:')?.includes(
                'Run `/magicspec plan` to activate a phase',
            ),
        );
        assert.ok(run.includes('- **Replan** → `/magicspec plan`'));
        assert.ok(run.includes('next-step recommendation is `/magicspec plan` only'));
        // The read set, and no leftover naming the task stage as a recommendation.
        assert.ok(
            run.includes(
                '- **Reads**: the active phase workbook, the sections of the specifications its tasks cite, and the code.',
            ),
        );
        for (const old of [
            'ONE command — `/magicspec task {workspace}`',
            'ONE next step: `/magicspec task {workspace}`',
            're-run `/magicspec task`',
            '`/magicspec task {workspace} update`',
            'Force re-run of `/magicspec task`',
        ]) {
            assert.ok(!run.includes(old), `run.md no longer recommends the task stage: ${old}`);
        }
        assert.ok(run.includes("set by `task.md` Step 4 from the plan's `[Stabilize]` marker"));
    });

    test('shipped text: plan.md defines the Stable-spec branch of Pre-flight, the demoted-spec decision and the quarantine release, and task.md applies them to the tasks (T242, T244)', () => {
        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const task = readShipped('skills/magicspec/workflows/task.md');
        const steps = plan.slice(plan.indexOf('\n### Steps'));

        // Pre-flight runs `--require-specs` before Step 2 can promote anything, so the
        // script's `Stable specs` finding is the normal state of a Draft-only registry.
        const preflight = stepBlock(steps, '1.');
        assert.ok(preflight, 'Step 1 must be found');
        const branchAt = preflight.indexOf('**Stable-Spec Requirement**');
        assert.notStrictEqual(branchAt, -1, 'Pre-flight must define the Stable-Spec Requirement');
        assert.ok(
            branchAt < preflight.indexOf('**T4 Queue'),
            'it must precede the T4 Queue bullet, which covers the gates above it',
        );
        const branch = preflight.slice(branchAt, preflight.indexOf('\n', branchAt));
        for (const needle of [
            '`Stable specs`',
            'Pre-Planning Stabilization',
            'Bootstrap',
            '`Stable specs (0 specs found)`',
            '`/magicspec spec`',
            '`/magicspec analyze first-time`',
            '**HALT**',
        ]) {
            assert.ok(branch.includes(needle), `the branch must state ${needle}`);
        }

        // Update mode, the plan's side: a spec demoted after the plan was written moves to the backlog
        // with its reason, and the way back out returns it to the plan.
        const sync = stepBlock(steps, '6.');
        assert.ok(sync, 'plan.md Step 6 (Sync) must be found');
        const demoted = sync.slice(
            sync.indexOf('**Demoted Spec**'),
            sync.indexOf('**Quarantine Release**'),
        );
        assert.ok(demoted.length > 0, 'Step 6 must define Demoted Spec before Quarantine Release');
        for (const needle of ['## Backlog', 'Spec `{file}` is `{status}`']) {
            assert.ok(demoted.includes(needle), `Demoted Spec must state ${needle}`);
        }
        const release = sync.slice(sync.indexOf('**Quarantine Release**'));
        for (const needle of ['C12', 'Demoted Spec', '`Stable`', 'returns to the active plan']) {
            assert.ok(release.includes(needle), `Quarantine Release must state ${needle}`);
        }

        // The tasks' side: the block that decision causes, and the release that undoes it.
        const taskSync = stepBlock(task.slice(task.indexOf('\n### Steps')), '6.');
        assert.ok(taskSync, 'task.md Step 6 (Sync) must be found');
        const blocking = lineWith(taskSync, "**Blocking a demoted specification's tasks**");
        assert.ok(blocking, 'task.md must apply the demoted-spec decision to the tasks');
        for (const needle of [
            '## Backlog',
            '`Done`',
            '`Blocked [!]`',
            'Spec `{file}` is `{status}`',
        ]) {
            assert.ok(blocking.includes(needle), `the block must state ${needle}`);
        }
        const releasing = lineWith(taskSync, '**Releasing a block**');
        for (const needle of ['quarantine reason', 'return to `Todo`']) {
            assert.ok(releasing?.includes(needle), `the release must state ${needle}`);
        }
        assert.ok(
            /Preserve recorded task state[^\n]*release of a block/.test(task),
            'the rule that survivors keep their recorded status must name the release of a block among the explicit transitions',
        );
    });

    test('the collision rename spec.md prescribes keeps the layer prefix first, so check-prerequisites accepts it (T106)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const documented = spec.match(/`(l1-\{active-workspace\}-auth\.md)`/);
        assert.ok(documented, 'spec.md must show the renamed file with the layer prefix first');
        assert.ok(
            !spec.includes("'{active-workspace}-{file}'"),
            'the workspace name must not lead the file name',
        );

        const tempDir = createTempWorkspace();
        try {
            const { designDir, specsDir } = makeSpecWorkspace(tempDir);
            const prescribed = documented[1].replace('{active-workspace}', 'app');
            const legacyForm = 'app-l1-auth.md';
            for (const name of [prescribed, legacyForm]) {
                fs.writeFileSync(
                    path.join(specsDir, name),
                    '# Auth\n\n**Version:** 1.0.0\n**Status:** Stable\n',
                );
            }
            fs.writeFileSync(
                path.join(designDir, 'INDEX.md'),
                [
                    '# Index',
                    '',
                    `| [${prescribed}](specifications/${prescribed}) | x | Stable | 1 | 1.0.0 |`,
                    `| [${legacyForm}](specifications/${legacyForm}) | y | Stable | 1 | 1.0.0 |`,
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(path.join(designDir, 'RULES.md'), '# Rules');
            fs.writeFileSync(
                path.join(designDir, 'PLAN.md'),
                `# Plan\n- [ ] ([${prescribed}](specifications/${prescribed}), [${legacyForm}](specifications/${legacyForm}))\n`,
            );
            generateChecksums(tempDir);

            const flagged = runCheckPrerequisites(tempDir)
                .warnings.filter((w) => w.type === 'NAMING_VIOLATION')
                .map((w) => w.message.match(/^'([^']+)'/)[1]);
            assert.deepStrictEqual(
                flagged,
                [legacyForm],
                'the name the workflow prescribes passes the Layer Prefix rule; the workspace-first form it replaces does not',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('shipped text: no engine body promises a manual command it has no wrapper for, and Retro L2 names the step that fires it (T247)', () => {
        const promisesManualCommand = (text) => /\bmanual command\b/i.test(text);
        assert.ok(
            promisesManualCommand('| **L2** | Full audit | Plan Complete or manual command |'),
            'the detector must flag the retired wording',
        );
        assert.ok(
            !promisesManualCommand(
                '| **L2** | Full audit | Plan Complete (`run.md` Plan Completion) |',
            ),
            'and spare a trigger that names a step',
        );

        for (const { rel, text } of engineBodies()) {
            assert.ok(
                !promisesManualCommand(text),
                `${rel} advertises a "manual command" that no workflow wrapper provides`,
            );
        }
        const l2 = readShipped('skills/magicspec/references/retrospective.md')
            .split(/\r?\n/)
            .find((line) => line.startsWith('| **L2**'));
        assert.ok(l2, 'the Levels table must carry an L2 row');
        assert.match(
            l2,
            /Plan Complete[^|]*`run\.md` Plan Completion/,
            'the L2 trigger must name the step that fires it',
        );
    });

    test('shipped text: the Consistency Check flags a reference to a Deprecated spec as an advisory, never a HALT (T246)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const table = spec.slice(
            spec.indexOf('### Consistency Check (Pre-flight)'),
            spec.indexOf('## Finalization Protocol'),
        );
        const rows = table.split(/\r?\n/);
        const stale = rows.find((line) => line.startsWith('| **Stale References**'));
        assert.ok(stale, 'the table must carry a Stale References row');
        for (const needle of [
            '`Related Specifications`',
            '`Implements`',
            '`Deprecated`',
            '`STALE_REFERENCE`',
            'advisory',
        ]) {
            assert.ok(stale.includes(needle), `the row must state ${needle}`);
        }
        assert.ok(
            !stale.includes('**HALT**'),
            'a stale reference is reported, never a HALT — it mirrors the Deprecation Cascade report',
        );
        const layer = rows.find((line) => line.startsWith('| Layer Integrity'));
        assert.ok(
            layer?.includes('`Stable`'),
            'Layer Integrity must say the L1 parent has to be Stable, not merely valid (T25)',
        );
    });

    test('shipped text: the C12.1 stabilization exception has a data trigger — the stabilizes flag — in the planning workflow, the constitution and its template (T71)', (t) => {
        const task = readShipped('skills/magicspec/workflows/task.md');
        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const steps = task.slice(task.indexOf('\n### Steps'));

        // The flag is set by task.md Decompose, from the marker the plan wrote — never from the conversation.
        const decompose = stepBlock(steps, '4.');
        assert.ok(decompose, 'task.md Step 4 (Decompose) must be found');
        const setting = decompose.slice(decompose.indexOf('**Stabilizing Tasks'));
        assert.ok(
            setting.startsWith('**Stabilizing Tasks'),
            'Step 4 must define Stabilizing Tasks',
        );
        assert.ok(
            setting.includes('`stabilizes: {spec-file}`'),
            'Step 4 must define how the flag is set',
        );
        const settingLine = setting.slice(0, setting.indexOf('\n'));
        assert.ok(
            settingLine.includes('the plan marks `[Stabilize]`') &&
                /never from the request in the conversation/.test(settingLine),
            "the flag comes from the plan's marker, never from the request, never inferred from a title",
        );

        // The plan's side: only a marked spec bypasses the quarantine; every other child stays quarantined.
        const planSync = stepBlock(plan.slice(plan.indexOf('\n### Steps')), '6.');
        assert.ok(planSync, 'plan.md Step 6 must be found');
        const c12 = planSync.split(/\r?\n/).find((line) => line.includes('**C12 Quarantine**'));
        assert.ok(c12, 'plan.md Step 6 must carry the C12 Quarantine bullet');
        const exception = c12.slice(c12.indexOf('**C12.1 Stabilization Exception**'));
        assert.ok(
            exception.includes('`[Stabilize]`') && exception.includes('stays quarantined'),
            'C12.1 in plan.md must require the marker and keep every other child quarantined',
        );

        // The tasks' side: the flag is the one thing that lets a task past the block.
        const sync = stepBlock(steps, '6.');
        assert.ok(sync, 'task.md Step 6 must be found');
        const blocking = lineWith(sync, "**Blocking a quarantined specification's tasks**");
        assert.ok(
            blocking?.includes('`stabilizes: {spec-file}`') && blocking.includes('stays blocked'),
            'task.md must require the flag and keep every other task blocked',
        );

        // The constitution and the template shipped to consumers state the same exception.
        const clauses = {};
        for (const rel of ['.magicspec/RULES.md', 'skills/magicspec/templates/rules.md']) {
            if (!fs.existsSync(path.join(shippedRoot, rel))) {
                t.skip(`${rel} is not part of this checkout`);
                return;
            }
            clauses[rel] = readShipped(rel)
                .split(/\r?\n/)
                .find((line) => line.startsWith('**C12.1'));
            assert.ok(
                clauses[rel]?.includes('`stabilizes: {spec-file}`'),
                `${rel} C12.1 must name the flag`,
            );
        }
        assert.strictEqual(
            clauses['.magicspec/RULES.md'],
            clauses['skills/magicspec/templates/rules.md'],
            'the constitution and the shipped template must not diverge on C12.1',
        );
    });

    test('shipped text: spec.md queues a T4 rule once, for every HALT of the Sync step (T245)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const updating = spec.slice(spec.indexOf('### Updating an Existing Specification'));
        const sync = stepBlock(updating, '3.');
        assert.ok(sync, 'the Sync step must be found');

        assert.strictEqual(
            sync.split('**T4 Queue**').length - 1,
            1,
            'one T4 Queue statement — a single source, not a copy per guard',
        );
        const queueAt = sync.indexOf('**T4 Queue**');
        assert.ok(queueAt < sync.indexOf('**Version Drift Guard**'), 'it must precede the guards');
        const queue = sync.slice(queueAt, sync.indexOf('\n', queueAt));
        for (const needle of [
            'every HALT',
            'queued pending {reason} resolution',
            '`drift`',
            '`parity`',
            '`file`',
            'RULES.md',
            'rule.md',
        ]) {
            assert.ok(queue.includes(needle), `the T4 Queue rule must state ${needle}`);
        }
        assert.ok(
            !/queued pending (drift|file) resolution/.test(sync),
            'no guard may keep its own copy of the message',
        );
    });

    test('shipped text: the stabilizes flag is honored end to end — by every run guard and role card that demands a Stable spec, and by the Guided Planning Filter (T248, T249)', () => {
        const exception = lineWith(runGuards(), '**Stabilizing exception (C12.1)**');
        assert.ok(exception, 'run.md must define the Stabilizing exception among its Logic Guards');
        for (const needle of [
            '`stabilizes: {spec-file}`',
            'Quarantine (C12)',
            'Spec Stability',
            'Spot-Check',
            'Mid-Run',
            'File-Header Parity',
            'Phantom Spec',
        ]) {
            assert.ok(exception.includes(needle), `the exception must name ${needle}`);
        }

        // The two steps that repeat a guard point back to the exception instead of contradicting it.
        const spot = lineWith(runStep('1.'), '**Spec Stability Spot-Check**');
        assert.ok(spot?.includes('`stabilizes:`'), 'the Spot-Check must except the named spec');
        const midRun = lineWith(runStep('4.'), '**Mid-Run Stability Check**');
        assert.ok(
            midRun?.includes('`stabilizes:`'),
            'the Mid-Run check must use the dispatch baseline',
        );

        const filter = lineWith(
            readShipped('skills/magicspec/workflows/plan.md'),
            '**Guided Planning Filter**',
        );
        assert.ok(filter, 'plan.md must carry the Guided Planning Filter');
        for (const needle of [
            '**Stabilization interaction (C12.1)**',
            'whatever its status',
            '`[Stabilize]`',
        ]) {
            assert.ok(filter.includes(needle), `the filter must state ${needle}`);
        }

        // The role cards that repeat a Stable demand follow the same exception — in
        // Parallel mode (the default) the orchestrator's re-read runs before any guard
        // above — and the cards spec carries the two lines verbatim.
        const reread = cardLine('skills/magicspec/roles/orchestrator.md', '5. Between dispatches');
        assert.ok(
            reread?.includes('`stabilizes:`'),
            'the orchestrator re-read must hold a stabilization task to its status at dispatch',
        );
        const readStep = cardLine('skills/magicspec/roles/planner.md', '1. Read all');
        assert.ok(readStep, 'the planner card must open with a Read step');
        assert.ok(
            !readStep.includes('`Stable`'),
            'the planner must read the spec a stabilization task targets, not only Stable ones',
        );
        const cardsSpec = readShipped(
            '.magicspec/engine/specifications/l2-role-cards-execution.md',
        );
        for (const line of [reread, readStep]) {
            assert.ok(
                cardsSpec.includes(line),
                `the cards spec must carry the card line verbatim: ${line}`,
            );
        }
    });

    test('shipped text: a [Bootstrap] task passes every guard that demands a Stable spec — in run, in the orchestrator re-read and in the Sync step (T250, T251)', () => {
        const exception = lineWith(runGuards(), '**Bootstrap exception**');
        assert.ok(exception, 'run.md must define the Bootstrap exception among its Logic Guards');
        for (const needle of [
            '`[Bootstrap]`',
            'Task Start',
            'Quarantine (C12)',
            'Spec Stability',
            'Mid-Run',
            'orchestrator',
            'File-Header Parity',
            'Phantom Spec',
        ]) {
            assert.ok(exception.includes(needle), `the exception must name ${needle}`);
        }

        // Step 4 points back to the exception instead of demanding a spec that never was Stable.
        const midRun = lineWith(runStep('4.'), '**Mid-Run Stability Check**');
        assert.ok(
            midRun?.includes('`[Bootstrap]`'),
            'the Mid-Run check must use the Task Start baseline for a Bootstrap task',
        );

        // The orchestrator re-read runs before every guard above in Parallel mode (the default).
        const reread = cardLine('skills/magicspec/roles/orchestrator.md', '5. Between dispatches');
        assert.ok(
            reread?.includes('`[Bootstrap]`'),
            'the orchestrator re-read must hold a Bootstrap task to its status at dispatch',
        );
        const cardsSpec = readShipped(
            '.magicspec/engine/specifications/l2-role-cards-execution.md',
        );
        assert.ok(
            cardsSpec.includes(reread),
            `the cards spec must carry the card line verbatim: ${reread}`,
        );

        // Planning side: the Sync step must not return a tentative plan's specs to Backlog.
        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const sync = stepBlock(plan.slice(plan.indexOf('\n### Steps')), '6.');
        const bootstrapPlan = lineWith(sync, '**Bootstrap Plan**');
        assert.ok(
            bootstrapPlan,
            'plan.md Step 6 must define the Bootstrap Plan beside C12 and Demoted Spec',
        );
        for (const needle of [
            '`[Bootstrap]`',
            'C12 Quarantine',
            'Demoted Spec',
            'while it is `Draft`',
            'leaves `Draft`',
        ]) {
            assert.ok(bootstrapPlan.includes(needle), `the Bootstrap Plan must state ${needle}`);
        }
        assert.ok(
            sync.indexOf('**Bootstrap Plan**') < sync.indexOf('**Demoted Spec**'),
            'the Bootstrap Plan must come before Demoted Spec, the rule it limits',
        );

        // Task side: the tasks of a tentative spec are not blocked while it is Draft.
        const task = readShipped('skills/magicspec/workflows/task.md');
        const taskSync = stepBlock(task.slice(task.indexOf('\n### Steps')), '6.');
        const exemption = lineWith(taskSync, '**Bootstrap exemption**');
        assert.ok(exemption, 'task.md Step 6 must define the Bootstrap exemption');
        for (const needle of [
            '`[Bootstrap]`',
            'while its specification is `Draft`',
            'leaves `Draft`',
        ]) {
            assert.ok(exemption.includes(needle), `the exemption must state ${needle}`);
        }
        assert.ok(
            taskSync.indexOf('**Bootstrap exemption**') <
                taskSync.indexOf("**Blocking a demoted specification's tasks**"),
            'the exemption must come before the block it limits',
        );
    });

    test('shipped text: /magicspec-dev:test adjudicates and fixes its findings itself — no approval gate, an evidence ladder, one outcome per finding (T252)', () => {
        // Detector: wording that makes a fix wait for the user. C9 allows a question only at its
        // closed gate list, C28 removes every other gate in this repository, and DA-9 calls a
        // proposal with a marked default redundant by construction.
        const approvalGate = /show to user|for yes\/no|after (?:user )?approval|\|approve\|/i;
        for (const gated of [
            'Show to user for Yes/No (C1).',
            'Surgical Patch: Apply precisely after approval.',
            'Changes applied only after user approval.',
            'H -->|Approve| I[C14 Enforcement Gate]',
        ]) {
            assert.ok(approvalGate.test(gated), `the detector must flag: ${gated}`);
        }
        for (const clean of [
            'No approval prompt: only a C27 whitelist entry stops the run for a question.',
            'Apply the winner in the same run.',
        ]) {
            assert.ok(!approvalGate.test(clean), `the detector must spare: ${clean}`);
        }

        const workflow = 'skills/magicspec-dev/workflows/test.md';
        const skill = 'skills/magicspec-dev/workflows/test.md';
        const docs = 'docs/dev-test.md';
        for (const rel of [workflow, skill, docs]) {
            assert.ok(
                !approvalGate.test(readShipped(rel)),
                `${rel} must not make a fix wait for approval`,
            );
        }

        // The workflow and the skill generated from it state the ladder, the selection and the record.
        for (const rel of [workflow, skill]) {
            const text = readShipped(rel);
            for (const needle of [
                '**Adjudication**',
                '*Reproduction*',
                '*Dead end*',
                '*Contradiction*',
                '*Reading test*',
                '**Fix Selection**',
                'Exactly one outcome',
                '[DR] {finding}',
            ]) {
                assert.ok(text.includes(needle), `${rel} must state ${needle}`);
            }
        }
        assert.ok(
            readShipped(docs).includes('Adjudication'),
            'the docs page must describe the adjudication',
        );
    });

    test('shipped text: a fork the evidence does not settle is forecast, never asked — no surface hands the user a choice of route, workspace, scan mode or architecture (DA-10)', () => {
        // Detector: the wordings by which a workflow handed such a fork to the user. Each gate
        // now resolves by the Consequence Forecast. Consent questions (E1, E2, E4) and the idea
        // intake survey (E6) are not in the list and must stay untouched.
        const choiceGate = new RegExp(
            [
                'ask (?:the|one) (?:WI-4|multiple-choice)',
                'WI-4 three-option question',
                'HALTs? for (?:user|the) choice',
                'user picks Focused or Quick',
                'Question Only at Ambiguity Gate',
                'single specification-authoring exception',
                'Engineer Posture \\(C25\\) exception',
                'Step 0 ambiguity question',
                'only condition that pauses for user input',
                'Hard-fork ambiguities and Core-Amendment proposals',
            ].join('|'),
            'i',
        );
        for (const gated of [
            'On `ambiguous` → ask the WI-4 three-option question.',
            '>500 files: recommend Focused/Quick. HALT for user choice (C9 Depth Control gate).',
            'Hard-fork ambiguity is the only condition that pauses for user input.',
            'Re-enter the Step 0 ambiguity question (same three-option menu).',
        ]) {
            assert.ok(choiceGate.test(gated), `the detector must flag: ${gated}`);
        }
        for (const clean of [
            'On `ambiguous` → resolve it by the Consequence Forecast (DA-10); nothing is asked.',
            'Core-Amendment proposals (C27 E4) are the only exception that pauses for explicit user input.',
            'Deleting a spec (E1) asks one consent question.',
            '`/magicspec spec {idea}` may ask before writing specs — one survey round, options from the forecast.',
        ]) {
            assert.ok(!choiceGate.test(clean), `the detector must spare: ${clean}`);
        }

        // A document's history records what used to be true; only its body is shipped behavior.
        const body = (rel) => readShipped(rel).split(/\n## (?:Document History|Sync Note)\b/)[0];
        const surfaces = [
            ...engineBodies().map(({ rel }) => rel),
            ...listShipped('skills/magicspec/roles', ['.md']),
            'skills/magicspec/templates/rules.md',
            'skills/magicspec/CONSTITUTION.md',
            ...listShipped('workflows', ['.md']),
            ...listShipped('skills', ['.md']),
            '.magicspec/RULES.md',
            ...listShipped('docs', ['.md']),
        ];
        for (const rel of surfaces) {
            const hit = body(rel)
                .split(/\r?\n/)
                .find((line) => choiceGate.test(line));
            assert.ok(!hit, `${rel} still hands a fork to the user: ${hit}`);
        }
    });

    test('shipped text: the Consequence Forecast (DA-10) is stated where those forks used to be asked — constitution and template word for word, user rules, routing, intake and scan depth', () => {
        // C27 in the project constitution and in the template every consumer project receives.
        for (const prefix of [
            '2. **Escalation Whitelist (DA-2)**',
            '5. **Single-Question Format (DA-5)**',
            '8. **Consequence Forecast (DA-10)**',
            '3. **Bounded Ambiguity Resolution**',
        ]) {
            const project = lineWith(readShipped('.magicspec/RULES.md'), prefix);
            assert.ok(project, `RULES.md C27 must carry ${prefix}`);
            assert.strictEqual(
                lineWith(readShipped('skills/magicspec/templates/rules.md'), prefix),
                project,
                `the shipped template must mirror RULES.md word for word: ${prefix}`,
            );
        }
        // E7, the command intake, is named wherever the whitelist is stated.
        for (const prefix of [
            '2. **Escalation Whitelist (DA-2)**',
            '5. **Single-Question Format (DA-5)**',
            '3. **Bounded Ambiguity Resolution**',
        ]) {
            assert.ok(
                lineWith(readShipped('.magicspec/RULES.md'), prefix).includes('E7'),
                `${prefix} must name E7 in both constitutions`,
            );
        }
        const agentRules = readShipped('skills/magicspec/CONSTITUTION.md');
        assert.match(agentRules, /- \*\*E7 \(Command Intake\)\*\*/, 'the always-on rules state E7');
        assert.match(
            agentRules,
            /at the invocation itself \(E7, command intake\)/,
            'the checklist',
        );
        assert.match(
            agentRules,
            /- `\/magicspec help` — read-only list of the commands[\s\S]*- `\/magicspec migrate` — runs before the project/,
            'help and migrate join the drift-check exemptions',
        );
        const forecast = lineWith(
            readShipped('.magicspec/RULES.md'),
            '8. **Consequence Forecast (DA-10)**',
        );
        for (const needle of [
            'status quo',
            'hedge',
            'Expected',
            'Wrong premise',
            'Boundary',
            'Adversarial',
            'Change later',
            'worst-case',
            'Assumption (forecast)',
            'except at intake',
        ]) {
            assert.ok(forecast.includes(needle), `C27 DA-10 must name ${needle}`);
        }
        const whitelist = lineWith(
            readShipped('.magicspec/RULES.md'),
            '2. **Escalation Whitelist (DA-2)**',
        );
        assert.ok(/consent/.test(whitelist), 'DA-2 must ask for consent');
        assert.ok(
            whitelist.includes('at intake, through E6'),
            'DA-2 must keep the intake survey (E6)',
        );
        assert.ok(
            /E3[^.]*E5[^.]*Consequence Forecast/.test(whitelist),
            'DA-2 must send E3 and E5 to the forecast',
        );

        // C9: the hard fork and the scan-depth gate resolve by the forecast in both constitutions.
        for (const rel of ['.magicspec/RULES.md', 'skills/magicspec/templates/rules.md']) {
            for (const gate of ['3. **Architectural Hard Fork**', '7. **Depth Control Limit**']) {
                assert.ok(
                    lineWith(readShipped(rel), gate)?.includes('DA-10'),
                    `${rel} ${gate} must resolve by DA-10`,
                );
            }
        }

        // The user rules carry the procedure to watching-process agents.
        const rules = readShipped('skills/magicspec/CONSTITUTION.md');
        const start = rules.indexOf('**DA-10 (Consequence Forecast)**');
        assert.ok(start !== -1, 'skills/magicspec/CONSTITUTION.md §7 must state DA-10');
        const bullet = rules.slice(start, rules.indexOf('\n- ', start));
        for (const needle of [
            'hedge',
            'Wrong premise',
            'Adversarial',
            'worst-case',
            'Assumption (forecast)',
        ]) {
            assert.ok(
                bullet.includes(needle),
                `skills/magicspec/CONSTITUTION.md DA-10 must name ${needle}`,
            );
        }

        // Routing, intake and scan depth now resolve by the forecast.
        assert.ok(
            lineWith(
                readShipped('skills/magicspec/references/context.md'),
                '- `ambiguous` →',
            )?.includes('Consequence Forecast'),
            'context.md must route an ambiguous signal to the forecast',
        );
        // The intake survey (E6): two gates, forecast-written options with an Other, re-checked free
        // text, a convergent dialogue, delegated answers recorded as premises, the intent statement.
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const intake = spec.slice(spec.indexOf('### Step 0.5'), spec.indexOf('### Explore Mode'));
        for (const needle of [
            'Gate 1 — comprehension',
            'Gate 2 — sufficiency',
            'Consequence Forecast',
            'hedge',
            '**Other: …**',
            'goes back through Gates 1 and 2',
            'strictly smaller',
            '**Assumption (forecast):**',
            '`[Intake] Understood as:',
        ]) {
            assert.ok(intake.includes(needle), `spec.md Step 0.5 must state ${needle}`);
        }
        const e6 = rules.slice(
            rules.indexOf('**E6 (Idea Intake Gate)**'),
            rules.indexOf('### Exemptions', rules.indexOf('**E6 (Idea Intake Gate)**')),
        );
        for (const needle of [
            'may ask before writing',
            'Other',
            'you decide',
            'Assumption (forecast)',
            'never asked',
        ]) {
            assert.ok(
                e6.includes(needle),
                `skills/magicspec/CONSTITUTION.md E6 must state ${needle}`,
            );
        }
        assert.ok(
            lineWith(
                readShipped('skills/magicspec/workflows/analyze.md'),
                '**>500 files**',
            )?.includes('Consequence Forecast'),
            'analyze.md must choose the scan mode by the forecast',
        );
    });

    test('shipped text: run.md Select takes a task left In Progress by an earlier session before any Todo task, and never one a live track owns (T256)', () => {
        const select = runStep('2.');
        assert.ok(select, 'Step 2 (Select) must be found');
        const rule = select.split(/\r?\n/)[0];

        // The order is the contract: the task left in flight is named first, the Todo search is the
        // fallback, and only then do the three halting branches apply.
        const inFlightAt = rule.indexOf('reads `In Progress`');
        const todoAt = rule.indexOf('locate a `Todo` task');
        assert.notStrictEqual(
            inFlightAt,
            -1,
            'Select must name the `In Progress` task it takes first',
        );
        assert.notStrictEqual(
            todoAt,
            -1,
            'Select must keep locating a `Todo` task when nothing is in flight',
        );
        assert.ok(
            inFlightAt < todoAt,
            'the task left in flight must be taken before any `Todo` task',
        );
        assert.ok(
            rule.indexOf('*Stalled*') > todoAt,
            'the halting branches must be evaluated after the selection, not instead of it',
        );
        for (const needle of [
            'no track of this invocation is executing',
            'earlier session',
            'Task Start (2b)',
            'the scope the invocation selects',
        ]) {
            assert.ok(rule.includes(needle), `Select must state ${needle}`);
        }

        // The other half of the contract: Task Start treats an entry already `In Progress` as resumed.
        assert.match(
            runStep('2b.'),
            /already reads `In Progress`[^\n]*resumed/,
            'Task Start must treat an entry that already reads `In Progress` as a task being resumed',
        );
    });

    test('shipped text: task.md ends a phase left with only blocked tasks with the Stalled Plan report instead of a handoff to /magicspec run (T257)', () => {
        const task = readShipped('skills/magicspec/workflows/task.md');

        // The handoff is conditional on something to run, and names the report it falls back to.
        const handoff = lineWith(task, '**One Stage**');
        assert.ok(handoff, 'task.md must carry the One Stage guard');
        for (const needle of ['`Todo` or `In Progress` task', '`Blocked [!]`', 'Stalled Plan']) {
            assert.ok(handoff.includes(needle), `the handoff must state ${needle}`);
        }

        // Step 6 defines the report: its trigger, the single next step, the line a spec gap ends with
        // and the one block the workflow does not lift itself.
        const sync = stepBlock(task.slice(task.indexOf('\n### Steps')), '6.');
        assert.ok(sync, 'Step 6 must be found');
        const stalled = lineWith(sync, '**Stalled Plan**');
        assert.ok(stalled, 'Step 6 must define the Stalled Plan outcome');
        assert.ok(
            sync.indexOf('**Stalled Plan**') > sync.indexOf('**Releasing a block**'),
            'the outcome must follow the release rule: it judges what the rules above left',
        );
        for (const needle of [
            'no `Todo` or `In Progress` task',
            '≥1 `Blocked [!]`',
            '**HALT** after the ledger is written',
            'no handoff to `/magicspec run`',
            'exactly ONE next step',
            'first blocked task in checklist order',
            'requires design input',
            '`/magicspec spec`',
            'releases only the blocks it owns',
            "setting its task's `Status` to `Todo`",
        ]) {
            assert.ok(stalled.includes(needle), `Stalled Plan must state ${needle}`);
        }
        assert.ok(
            task.includes('☐ Stalled Plan:'),
            'the Completion Checklist must cover the Stalled Plan outcome',
        );

        // The recommendation that sends the user here stays the single one, and the run still never
        // names the specification workflow itself.
        const run = readShipped('skills/magicspec/workflows/run.md');
        assert.ok(
            lineWith(run, '*Stalled*:')?.includes(
                'exactly ONE next step: `/magicspec plan {workspace}`',
            ),
            'run.md *Stalled* must keep recommending /magicspec plan as its one next step',
        );
        assert.ok(
            lineWith(run, '*Stalled*:')?.includes('only inside a `/magicspec plan` HALT'),
            'run.md *Stalled* must say the specification workflow surfaces only inside a /magicspec plan HALT',
        );
        assert.ok(
            !/Pre-flight only/.test(run),
            'run.md must not say a blocked spec surfaces in /magicspec task Pre-flight only: the Stalled Plan report of task.md Step 6 is a second surface',
        );
    });

    test('shipped text: a spec ambiguity found in a run takes one route — the single /magicspec plan recommendation — in the debugger card, its mirror and the run page (T258)', () => {
        const card = cardLine('skills/magicspec/roles/debugger.md', '4. For (b)');
        assert.ok(card, 'the debugger card must carry its step for a spec ambiguity');
        for (const needle of [
            '`Notes`',
            '`run.md` Step 4',
            '`/magicspec plan {workspace}`',
            'only inside a `/magicspec plan` HALT',
        ]) {
            assert.ok(card.includes(needle), `the debugger step must state ${needle}`);
        }

        // The stale wordings: a handoff of the session to the specification workflow.
        const toSpec =
            /hand off to `spec\.md`|via `\/magicspec spec`|delegate to `\/magicspec spec`|jumps to the Spec Workflow/;
        assert.ok(
            !toSpec.test(card),
            'the debugger card must not hand the session to the specification workflow',
        );
        for (const stale of [
            'For (b): hand off to `spec.md` workflow via `magic.spec` to resolve the ambiguity.',
            'If spec is ambiguous → **HALT** and delegate to `/magicspec spec` for update.',
            'A delegated handoff jumps to the Spec Workflow (Explore Mode) where specifications are formally updated.',
        ]) {
            assert.ok(toSpec.test(stale), `the detector must flag: ${stale}`);
        }

        // The card spec carries the deployed card word for word.
        assert.strictEqual(
            lineWith(
                readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md'),
                '4. For (b)',
            ),
            card,
            'the mirror in l2-role-cards-execution.md must match the deployed card word for word',
        );

        // The run page agrees with the workflow body: one command, never the specification workflow.
        const page = readShipped('docs/run.md');
        assert.ok(
            !toSpec.test(page),
            'docs/run.md must not route a run to the specification workflow',
        );
        assert.ok(
            lineWith(page, '- **Handoff**:')?.includes('`/magicspec plan {workspace}`'),
            'the run page must name /magicspec plan as the one handoff',
        );
    });

    test('shipped text: the post-write constitutional conflict report names the rule that is already written and one way to resolve it (T259)', () => {
        const rule = readShipped('skills/magicspec/workflows/rule.md');
        const review = rule.slice(
            rule.indexOf('**Constitutional Review (Post-Write)**'),
            rule.indexOf('## Finalization Protocol'),
        );
        assert.notStrictEqual(review, '', 'the post-write review section must be found');
        const halt = lineWith(review, 'Practical conflict found');
        assert.ok(halt, 'the post-write review must define its HALT');
        for (const needle of ['**HALT**', '(already written)', '`/magicspec rule amend C{N}`']) {
            assert.ok(halt.includes(needle), `the post-write HALT must state ${needle}`);
        }
        assert.ok(
            !/resolve before writing/i.test(rule),
            'a review that runs after the write must not tell the agent to resolve before writing',
        );
    });
};
