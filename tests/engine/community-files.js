'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const {
    TESTS_DIR,
    scriptsDir,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
} = require('./lib/base');
const {
    listFilesUnder,
    writeTreeFiles,
    makeArchivalProject,
    runEngine,
    readShipped,
    lineWith,
    cardLine,
    routerRows,
} = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // The contribution guide: marked blocks only, and a template that does not ship
    // ───────────────────────────────────────────────────────────────────────────
    const guideFixture = (guide) => {
        const dir = createTempWorkspace(true);
        fs.mkdirSync(path.join(dir, '.magicspec'));
        fs.writeFileSync(
            path.join(dir, '.magicspec', 'RULES.md'),
            '## 1. Naming\nUNIQUE-RULE-LINE\n## 7. Misc\n',
        );
        fs.writeFileSync(
            path.join(dir, '.magicspec', 'INDEX.md'),
            '## Workspaces\n\n| Workspace | Description |\n| --- | --- |\n| engine | costs $& and $1 | [engine/INDEX.md](engine/INDEX.md) |\n\n## Meta\n',
        );
        fs.writeFileSync(
            path.join(dir, 'skills', 'magicspec', 'SKILL.md'),
            [
                '| Command | Group | What it does | Argument | When it is missing | Demand | Body |',
                '| --- | --- | --- | --- | --- | --- | --- |',
                '| `spec` | pipeline | Writes specifications | an idea | **required** | deep | `workflows/spec.md` |',
                '| `run` (alias `go`) | pipeline | Runs the tasks | a workspace | optional | standard | `workflows/run.md` |',
                '',
            ].join('\n'),
        );
        if (guide !== null) fs.writeFileSync(path.join(dir, 'CONTRIBUTING.md'), guide);
        fs.mkdirSync(path.join(dir, 'scripts', 'templates'), { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'scripts', 'templates', 'contributing.md'),
            '# Contributing to {{project_name}}\n\nSeed prose.\n\n<!-- generated:commands -->\n<!-- /generated:commands -->\n',
        );
        const run = () =>
            execFileSync(process.execPath, [path.join(dir, 'scripts', 'sync-docs.js')], {
                cwd: dir,
                stdio: 'pipe',
            });
        return { dir, run, guidePath: path.join(dir, 'CONTRIBUTING.md') };
    };
    const withoutBlockBodies = (text) =>
        text.replace(/(<!-- generated:([a-z]+) -->)[\s\S]*?(<!-- \/generated:\2 -->)/g, '$1$3');

    test('the guide generator writes only between its markers, leaves the prose as written, and a second run changes nothing', () => {
        const guide = [
            '# Hand-written guide',
            '',
            'Version <!-- generated:version -->v0.0.0<!-- /generated:version --> of the engine.',
            '',
            '## Commands',
            '',
            '<!-- generated:commands -->',
            'STALE COMMAND TABLE',
            '<!-- /generated:commands -->',
            '',
            'Prose between the blocks stays exactly as written.',
            '',
            '<!-- generated:workspaces -->',
            'STALE WORKSPACES',
            '<!-- /generated:workspaces -->',
            '',
            'Closing prose.',
            '',
        ].join('\n');
        const { dir, run, guidePath } = guideFixture(guide);
        try {
            run();
            const after = fs.readFileSync(guidePath, 'utf8');
            assert.strictEqual(
                withoutBlockBodies(after),
                withoutBlockBodies(guide),
                'nothing outside the markers changed',
            );
            assert.ok(
                after.includes('<!-- generated:version -->v1.0.0<!-- /generated:version -->'),
            );
            assert.ok(after.includes('| `/magicspec spec` | Writes specifications |'));
            assert.ok(after.includes('| `/magicspec run` | Runs the tasks |'));
            assert.ok(
                !after.includes('/magicspec go'),
                'an alias is not a row of its own: the guide lists commands',
            );
            assert.ok(!after.includes('STALE'), 'the stale block bodies were replaced');
            assert.ok(
                after.includes('costs $& and $1'),
                'a body is data: its dollar sequences are written as they are',
            );
            assert.ok(
                after.includes('(.magicspec/engine/INDEX.md)'),
                'registry links are rebased to the project root',
            );
            assert.ok(!after.includes('UNIQUE-RULE-LINE'), 'the constitution is not embedded');
            run();
            assert.strictEqual(
                fs.readFileSync(guidePath, 'utf8'),
                after,
                'a second run changes nothing',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('a guide without markers receives them once, below its prose, and a second run changes nothing', () => {
        const guide = '# Hand-written guide\n\nOnly prose lives here.\n';
        const { dir, run, guidePath } = guideFixture(guide);
        try {
            run();
            const after = fs.readFileSync(guidePath, 'utf8');
            assert.ok(after.startsWith(guide), 'the prose is kept byte for byte');
            for (const key of ['version', 'commands', 'workspaces']) {
                assert.strictEqual(
                    after.split(`<!-- generated:${key} -->`).length - 1,
                    1,
                    `the ${key} block is added once`,
                );
            }
            assert.ok(after.includes('| `/magicspec spec` | Writes specifications |'));
            run();
            assert.strictEqual(
                fs.readFileSync(guidePath, 'utf8'),
                after,
                'the markers are not added twice',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('a repository with no guide is seeded from the maintenance template, and a block with unpaired markers is left alone', () => {
        const seeded = guideFixture(null);
        try {
            seeded.run();
            const text = fs.readFileSync(seeded.guidePath, 'utf8');
            assert.ok(text.includes('Seed prose.'), 'the seed is the starting text');
            assert.ok(text.includes('| `/magicspec run` | Runs the tasks |'));
        } finally {
            cleanup(seeded.dir);
        }
        const broken =
            '# Guide\n\n<!-- generated:commands -->\nhand text without a closing marker\n';
        const unpaired = guideFixture(broken);
        try {
            unpaired.run();
            const text = fs.readFileSync(unpaired.guidePath, 'utf8');
            assert.ok(
                text.includes('<!-- generated:commands -->\nhand text without a closing marker\n'),
                'an unpaired block is left as it is',
            );
            assert.strictEqual(
                text.split('<!-- generated:commands -->').length - 1,
                1,
                'and no second pair of markers is added beside it',
            );
        } finally {
            cleanup(unpaired.dir);
        }
    });

    test('the contribution-guide template is a maintenance artifact: it is not in the shipped folder and nothing shipped names it', () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const engine = path.join(repo, 'skills', 'magicspec');
        assert.ok(
            !fs.existsSync(path.join(engine, 'templates', 'contributing.md')),
            'the template left the engine folder',
        );
        assert.ok(
            fs.existsSync(path.join(repo, 'scripts', 'templates', 'contributing.md')),
            'and lives beside the generator',
        );
        const offenders = listFilesUnder(
            engine,
            (f) => /\.(md|js|json)$/.test(f) || path.basename(f) === '.checksums',
        )
            .filter((f) => /templates\/contributing\.md/.test(fs.readFileSync(f, 'utf8')))
            .map((f) => path.relative(repo, f));
        assert.deepStrictEqual(offenders, [], 'no shipped file names the template');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // Issue forms and the maintainer instruction (community health files)
    // ───────────────────────────────────────────────────────────────────────────
    // A small reader, no dependency: the top-level keys of a form and the labels of its fields, in order.
    const readIssueForm = (file) => {
        const text = fs.readFileSync(file, 'utf8');
        return {
            keys: [...text.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]),
            labels: [...text.matchAll(/^ {6}label: (.+)$/gm)].map((m) => m[1].trim()),
            text,
        };
    };
    const issueFormsDir = path.resolve(TESTS_DIR, '..', '.github', 'ISSUE_TEMPLATE');

    test("the issue forms carry the sections the engine's reports and the policy name, and the chooser disables blank issues", () => {
        const keys = ['name', 'description', 'title', 'labels', 'body'];
        const bug = readIssueForm(path.join(issueFormsDir, 'bug-report.yml'));
        const change = readIssueForm(path.join(issueFormsDir, 'change-proposal.yml'));
        const feedback = readIssueForm(path.join(issueFormsDir, 'agent-feedback.yml'));
        for (const form of [bug, change, feedback]) assert.deepStrictEqual(form.keys, keys);

        // The bug form asks for the version, the host, the command, the steps, the expectation and the outcome.
        assert.deepStrictEqual(bug.labels, [
            'Engine version',
            'Host and operating system',
            'Command typed',
            'Steps to reproduce',
            'What you expected',
            'What happened',
        ]);

        // The agent-feedback form has the seven sections of the report layout, in that order.
        const layout = [
            'Summary',
            'What happened',
            'Expected / suggestion',
            'Impact',
            'Environment',
            'Engine-observed context',
            'Report details',
        ];
        assert.deepStrictEqual(feedback.labels, layout);
        assert.match(feedback.text, /^labels: \["agent-feedback"\]$/m);
        const spec = path.resolve(
            TESTS_DIR,
            '..',
            '.magicspec',
            'engine',
            'specifications',
            'l1-agent-feedback.md',
        );
        if (fs.existsSync(spec)) {
            const specText = fs.readFileSync(spec, 'utf8');
            const specLines = [...specText.matchAll(/^ {2}## (.+)$/gm)].map((m) => m[1]);
            assert.strictEqual(
                specLines.length,
                layout.length,
                'the specification lists the same number of sections',
            );
            for (const [index, label] of layout.entries()) {
                assert.ok(
                    specLines[index].startsWith(label),
                    `section ${index + 1} of the report layout is: ${label}`,
                );
            }
        }

        // The chooser: blank issues off, the private reporting page linked, no Discussions page.
        const config = readIssueForm(path.join(issueFormsDir, 'config.yml'));
        assert.deepStrictEqual(config.keys, ['blank_issues_enabled', 'contact_links']);
        assert.match(config.text, /^blank_issues_enabled: false$/m);
        assert.ok(
            config.text.includes('/security/advisories/new'),
            'the private vulnerability reporting page is linked',
        );
        assert.ok(!/discussions/i.test(config.text), 'no Discussions page is linked');
    });

    test('the maintainer instruction lists the three settings with their paths, the observed state and the files that depend on them, and the documentation index links it', () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const page = fs.readFileSync(path.join(repo, 'docs', 'repository-settings.md'), 'utf8');
        for (const setting of [
            'Private vulnerability reporting',
            'Discussions',
            'Label `agent-feedback`',
        ]) {
            // The row of the settings table: the setting, then its path through the service's settings.
            assert.ok(
                page.includes(`\n| ${setting} | Repository `),
                `the table has a row for: ${setting}`,
            );
        }
        assert.ok(
            page.includes(
                '**Settings** → **Security** → **Advanced Security** → **Private vulnerability reporting**',
            ),
        );
        assert.ok(page.includes('**Settings** → **General** → **Features** → **Discussions**'));
        assert.ok(page.includes('**Issues** → **Labels** → **New label**'));
        assert.match(page, /State observed \d{4}-\d{2}-\d{2}/);
        for (const file of [
            'SECURITY.md',
            '.github/ISSUE_TEMPLATE/config.yml',
            '.github/ISSUE_TEMPLATE/agent-feedback.yml',
        ]) {
            assert.ok(
                page.includes(`| \`${file}\` |`),
                `the page names the dependent file: ${file}`,
            );
        }
        assert.ok(
            !/T-\d{2}[A-Z]\d{2}|Phase \d+|\.magicspec\//.test(page),
            'a product page carries no task identifier, phase or state-folder path',
        );
        const index = fs.readFileSync(path.join(repo, 'docs', 'README.md'), 'utf8');
        assert.ok(index.includes('(repository-settings.md)'), 'docs/README.md links the page');
    });

    test("the repository's contribution guide keeps the contract order, copies no part of the constitution and lists the router's commands", () => {
        const repo = path.resolve(TESTS_DIR, '..');
        const guide = fs.readFileSync(path.join(repo, 'CONTRIBUTING.md'), 'utf8');

        // The five sections, in the order the contract states.
        const headings = [...guide.matchAll(/^## (\d)\. (.+)$/gm)].map((m) => [Number(m[1]), m[2]]);
        assert.deepStrictEqual(
            headings.map(([n]) => n),
            [1, 2, 3, 4, 5],
        );
        const patterns = [
            /report a bug.*propose a change/i,
            /set up.*checks/i,
            /pull request/i,
            /conventions/i,
            /conduct/i,
        ];
        for (const [index, [, title]] of headings.entries()) assert.match(title, patterns[index]);

        // The three generated blocks are present and paired.
        for (const key of ['version', 'commands', 'workspaces']) {
            assert.ok(
                guide.includes(`<!-- generated:${key} -->`) &&
                    guide.includes(`<!-- /generated:${key} -->`),
                `the ${key} block is paired`,
            );
        }

        // A product file names no task identifier and no phase designator.
        assert.ok(
            !/\bT-\d+[A-Z]\d+\b|\bPhase \d+\b|\bphase-\d+\b/.test(guide),
            'no task identifier or phase designator',
        );

        // No three consecutive lines of the guide equal three consecutive lines of the constitution's sections 1 to 6.
        const rules = fs.readFileSync(path.join(repo, '.magicspec', 'RULES.md'), 'utf8');
        const from = rules.indexOf('## 1.');
        const to = rules.indexOf('## 7.');
        const lines = (text) => text.split(/\r?\n/).map((line) => line.trim());
        const runs = (all) => all.slice(0, -2).map((_, i) => all.slice(i, i + 3).join('\n'));
        const constitutionRuns = new Set(
            runs(lines(rules.slice(from, to))).filter((run) => run.replace(/\s/g, '').length > 40),
        );
        const copied = runs(lines(guide)).filter((run) => constitutionRuns.has(run));
        assert.deepStrictEqual(copied, [], 'the guide links the constitution and does not copy it');

        // The command table lists exactly the commands of the router (a stale table means: run the maintenance sync).
        const router = fs.readFileSync(path.join(repo, 'skills', 'magicspec', 'SKILL.md'), 'utf8');
        const hosts = require(path.join(scriptsDir, 'lib', 'hosts.js'));
        const routerCommands = router
            .split(/\r?\n/)
            .map((l) => hosts.parseCommandRow(l))
            .filter(Boolean)
            .map((r) => r.name);
        const block = guide.slice(
            guide.indexOf('<!-- generated:commands -->'),
            guide.indexOf('<!-- /generated:commands -->'),
        );
        const guideCommands = [...block.matchAll(/^\| `\/magicspec ([a-z-]+)` \|/gm)].map(
            (m) => m[1],
        );
        assert.deepStrictEqual(
            guideCommands,
            routerCommands,
            "the guide's command table follows the router; run the maintenance sync",
        );
    });

    test('the scenario template carries the scenario contract — actor, verified statements, preconditions, numbered steps with expected outcomes, variants and a per-step last-run record — and says a step describes the observable surface only (SM-1, SM-2, SM-5)', () => {
        const text = readShipped('skills/magicspec/templates/simulation.md');
        for (const needle of [
            '# {Area}',
            '`.magicspec/{workspace}/simulations/{area}.md`',
            '## S-{n}: {title}',
            '**Actor:** {a role or persona the product has, from anonymous visitor to administrator}',
            '**Verifies:** {spec.md} §{section}, {spec.md} §{section}',
            '**Preconditions:**',
            '**Steps:**',
            '1. {user action} → expect: {observable outcome}',
            '**Variants:**',
            '**Last run:** {YYYY-MM-DD} · v{product version}',
            '- Step 1: {pass, fail, inconclusive or skipped} · {live or traced}',
            '- Step 2: fail · live — observed: {what happened instead of the expected outcome}',
        ]) {
            assert.ok(text.includes(needle), `the template carries: ${needle}`);
        }
        for (const variant of ['edge input', 'error path', 'permission boundary', 'interruption']) {
            assert.ok(text.includes(variant), `a scenario names the variant: ${variant}`);
        }
        for (const needle of [
            'no code, no selectors tied to markup, no internal function names',
            'a step whose expectation no specification states is not invented here, it is reported as a specification gap',
            'Only `Last run` is written by a run, and a run changes no product code',
            'a traced pass is weaker evidence than a live one',
        ]) {
            assert.ok(text.includes(needle), `the template states: ${needle}`);
        }
        assert.ok(
            !/\bl[12]-[a-z0-9-]+\.md\b/.test(text),
            'a shipped template names no specification file of this repository',
        );
    });

    test('the constitution names the maintenance workflow where it named simulate.md, counts sixteen role cards, lists fix and simulate in C2, and the amendment has its history row', () => {
        const constitution = readShipped('.magicspec/RULES.md');
        const template = readShipped('skills/magicspec/templates/rules.md');
        const developerRow =
            '| `test.md` (maintenance: `/magicspec-dev test`) | During Logic Audit | Skeptic persona (dev-only; no role card) | — |';
        assert.strictEqual(
            constitution.split(developerRow).length - 1,
            1,
            'C24 has the developer row once',
        );
        assert.ok(
            !constitution.includes('| `simulate.md` |'),
            'no C24 row names simulate.md any more',
        );
        assert.ok(
            !template.includes('Skeptic persona (dev-only'),
            'the shipped template carries no developer row',
        );
        for (const text of [constitution, template]) {
            const registryLine = lineWith(text, 'Full registry:');
            assert.ok(
                registryLine?.includes('16 registered role cards'),
                'the registry line counts sixteen cards',
            );
            assert.ok(!registryLine.includes('14 registered role cards'), 'and no longer fourteen');
        }
        const historyRow = constitution.split('\n').find((line) => line.startsWith('| 1.22.0 |'));
        assert.ok(
            historyRow?.includes(
                "**C24's developer row names the maintenance workflow, C24 counts sixteen role cards and C2 lists `fix` and `simulate` as shipped**",
            ),
            'the amendment has its history row',
        );
        assert.ok(historyRow.includes('origin `user-stated`'), 'with its origin');
        assert.ok(
            historyRow.includes('Constitutional review: APPROVE') &&
                historyRow.includes('rule wording review: PASS'),
            'and both reviews',
        );
    });

    // A deployed role card and its mirror in a specification: the frontmatter lines named, then the mission,
    // every protocol step and every anti-pattern line for line. Returns the mission text for the caller's own checks.
    const assertCardMirrored = (card, mirror, frontmatterLines, missionStart, minLines) => {
        for (const line of frontmatterLines) {
            assert.ok(card.includes(line), `the card carries: ${line}`);
            assert.ok(mirror.includes(line), `the mirror carries: ${line}`);
        }
        const body = card.slice(card.indexOf('## Mission'));
        const lines = body.split('\n').filter((line) => /^(\d+\. |- )/.test(line));
        assert.ok(
            lines.length >= minLines,
            `the card has its steps and anti-patterns (${lines.length})`,
        );
        for (const line of lines) assert.ok(mirror.includes(line), `the mirror carries: ${line}`);
        const mission = body.split('\n').find((line) => line.startsWith(missionStart));
        assert.ok(
            mission && mirror.includes(`**Mission:** ${mission}`),
            'the mirror carries the mission',
        );
        return mission;
    };

    test('the simulator-tester card is distinct from the test-engineer, states the scenario contract, the two execution modes, the safety rule and findings-not-patches, and its mirror and listings carry it word for word (SM-1 to SM-9)', () => {
        const card = readShipped('skills/magicspec/roles/simulator-tester.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-review.md');
        const mission = assertCardMirrored(
            card,
            mirror,
            [
                'id: simulator-tester',
                'layer: reviewer',
                '  - workflow: plan.md',
                '  - workflow: run.md',
                '  - workflow: simulate.md',
                '  - to: debugger',
                '  - to: test-engineer',
            ],
            'Judge the product from the user',
            15,
        );
        assert.ok(
            mission.includes(
                'Distinct from `test-engineer`, which gates one task against its `Verify` line',
            ),
            'the role is distinct from the QA gate (SM-8)',
        );

        for (const needle of [
            'a role or persona the product has, from anonymous visitor to administrator',
            'edge input, error path, permission boundary, interruption',
            'no code, no selectors tied to markup, no internal function names',
            'A step whose expectation no specification states is not invented',
            'run a step live only when the product can be started and driven in the session and the instance is local or disposable; otherwise trace the step',
            'a traced pass is weaker evidence than a live one',
            'never run live without consent',
            'Change no product code.',
            'exactly one next step: `/magicspec fix` with the findings',
            'A phase with user-facing behaviour and no scenario is a planning finding.',
            '`scenario out of date`',
        ]) {
            assert.ok(card.includes(needle), `the card states: ${needle}`);
        }

        // The listings: the index row, the content-spec table and the integration map.
        const index = readShipped('.magicspec/engine/specifications/l2-role-cards.md');
        assert.ok(
            index.includes(
                '| `simulator-tester` | reviewer | `plan.md` → Scenario List (planning) · `run.md` → Scenario Upkeep (task completion) · `simulate.md` → Scenario Run | review |',
            ),
        );
        const integration = readShipped('.magicspec/engine/specifications/l2-role-integration.md');
        for (const row of [
            '| `plan.md` | Scenario List (planning) | `simulator-tester` |',
            '| `run.md` | Scenario Upkeep (task completion) | `simulator-tester` |',
            '| `simulate.md` | Scenario Run | `simulator-tester` |',
        ]) {
            assert.ok(integration.includes(row), `the integration map has: ${row}`);
        }
    });

    test('the simulate body states its entry and scope forms, the labelled modes, the safety rule with its one consent question, findings not patches, the coverage report and one next step; the router row and the role card agree (SM-1 to SM-9, CS-1)', () => {
        const body = readShipped('skills/magicspec/workflows/simulate.md');
        assert.ok(
            body.startsWith('---\ndescription: Workflow for product simulation'),
            'the body has its description',
        );
        assert.ok(
            body.includes(
                '**Trigger:** `/magicspec simulate [scope]`. The scope is optional. Arguments:',
            ),
            'the scope is optional',
        );
        for (const form of [
            '- *(empty)* — every scenario of the resolved workspace',
            '- `{area}` — the scenarios of one file',
            '- `"{feature or specification}"` — the scenarios that verify it',
            '- `--live-only` — steps that cannot run live are skipped and listed, never traced',
            '- `{workspace} …` — any of the above in a specific workspace',
        ]) {
            assert.ok(body.includes(form), `the entry has: ${form}`);
        }
        for (const needle of [
            'resolve-workspace --command simulate',
            'every step result carries `live` or `traced`',
            'A traced `pass` is weaker evidence than a live one',
            'is never counted as a live pass',
            'only against a local or disposable instance of the product',
            'is never run live',
            'one question, at most three fixed options — skip it (the default',
            'no product file, specification or test is changed',
            'a specification gap, reported as a finding',
            '**Coverage report**',
            "found by searching the specifications' text for what a person sees or does, not read from the graph",
            '`scenario out of date`',
            '[Simulate] {s} scenarios, {n} steps',
            '`/magicspec fix` with the findings when there are any',
            'finalize --workflow=simulate',
        ]) {
            assert.ok(body.includes(needle), `the body states: ${needle}`);
        }
        for (const step of [
            '1. **Pre-flight**',
            '2. **Decide the mode**',
            '3. **Run**',
            '4. **Record**',
            '5. **Findings and coverage**',
        ]) {
            assert.ok(body.includes(step), `the steps run in order: ${step}`);
        }
        assert.ok(
            body.indexOf('1. **Pre-flight**') < body.indexOf('2. **Decide the mode**') &&
                body.indexOf('4. **Record**') < body.indexOf('5. **Findings and coverage**'),
            'in that order',
        );
        for (const heading of [
            '## Entry',
            '## Argument Routing',
            '## Core Invariants (Mandatory)',
            '## Workflow: Simulation',
            '## Report',
            '## Finalization Protocol (Mandatory)',
            '## Simulate Completion Checklist',
            '## Handoffs',
        ]) {
            assert.ok(body.includes(`\n${heading}\n`), `the body has ${heading}`);
        }
        assert.ok(
            body.includes('`@role:simulator-tester`'),
            'the card is named by the body, so it is not dormant',
        );
        assert.ok(
            !/\bl[12]-[a-z0-9-]+\.md\b/.test(body) && !/\.magicspec\/engine\b/.test(body),
            'a shipped body names no specification file or workspace of this repository',
        );

        // The router row, the group and the demand.
        const row = routerRows().find((r) => r.name === 'simulate');
        assert.ok(row, 'the router lists simulate');
        assert.deepStrictEqual(
            { group: row.group, demand: row.demand, file: row.file },
            { group: 'quality & automation', demand: 'standard', file: 'simulate' },
        );
        assert.ok(
            row.missing.startsWith('optional'),
            'its scope is optional: it runs its default and says which',
        );
        const router = readShipped('skills/magicspec/SKILL.md');
        assert.ok(
            router.includes("`simulate` to run the product's user scenarios"),
            'the router description names it',
        );
    });

    test('finalize --workflow=simulate: accepted, the scenario files are the significant change, the next step is fix while failed or inconclusive steps stay in them and the plan-state step when none does, and the reader ignores a layout shown in a comment or a code block (SM-7)', () => {
        const scenarioFile = (steps) =>
            [
                '# Checkout',
                '',
                '<!-- - Step 9: fail · live — observed: a layout shown in a comment is not a finding -->',
                '',
                '## S-1: Pay by card',
                '',
                '**Actor:** visitor',
                '**Verifies:** {spec.md} §{section}',
                '',
                '**Steps:**',
                '',
                '1. Add an item → expect: the cart shows one item',
                '',
                '**Last run:** 2026-11-12 · v1.0.0',
                '',
                ...steps,
                '',
                '```',
                '- Step 8: fail · live — observed: a layout in a code block is not a finding',
                '```',
                '',
            ].join('\n');
        const failing = makeArchivalProject(undefined, { done: false });
        const clean = makeArchivalProject(undefined, { done: false });
        try {
            writeTreeFiles(failing.dir, {
                '.magicspec/ws/simulations/checkout.md': scenarioFile([
                    '- Step 1: pass · live',
                    '- Step 2: fail · live — observed: the total is `0`',
                    '- Step 3: inconclusive · traced',
                ]),
            });
            const result = runEngine(
                failing.dir,
                'finalize',
                '--workflow=simulate',
                '--workspace=ws',
            );
            const out = result.stdout + result.stderr;
            assert.strictEqual(result.status, 0, out);
            assert.match(out, /\| Workflow \| \/magicspec simulate \|/, 'the workflow is accepted');
            assert.strictEqual(
                fs.readFileSync(path.join(failing.dir, '.magicspec', '.version'), 'utf8').trim(),
                '0.1.1',
                'a changed scenario file is a significant change: the version bumps',
            );
            assert.match(
                fs.readFileSync(path.join(failing.dir, 'CHANGELOG.md'), 'utf8'),
                /### Changed\n[\s\S]*Ran the user scenarios \(ws\)/,
                'the entry names a run of scenarios and no internal identifier',
            );
            assert.match(
                fs.readFileSync(path.join(failing.ws, 'STATE.md'), 'utf8'),
                /\*\*Next Action:\*\* Run \/magicspec fix ws to repair 2 simulation findings/,
                'two open findings: the next action is fix',
            );
            assert.match(
                out,
                /Next: \/magicspec fix ws — deep reasoning/,
                'the handoff line names fix with its demand',
            );

            // Every step passed: nothing is handed to fix, the plan state decides.
            writeTreeFiles(clean.dir, {
                '.magicspec/ws/simulations/checkout.md': scenarioFile([
                    '- Step 1: pass · live',
                    '- Step 2: pass · traced',
                ]),
            });
            const calm = runEngine(clean.dir, 'finalize', '--workflow=simulate', '--workspace=ws');
            assert.strictEqual(calm.status, 0, calm.stdout + calm.stderr);
            assert.doesNotMatch(
                fs.readFileSync(path.join(clean.ws, 'STATE.md'), 'utf8'),
                /\*\*Next Action:\*\* Run \/magicspec fix/,
                'no open finding: fix is not named',
            );
            assert.match(
                calm.stdout,
                /Next: \/magicspec run ws/,
                'the open task of the plan comes next',
            );
        } finally {
            cleanup(failing.dir);
            cleanup(clean.dir);
        }

        // The reader: area, scenario, step, result, mode and the observed text as written.
        const reader = requireFromFixture(
            path.resolve(TESTS_DIR, '..'),
            'lib',
            'simulation-findings.js',
        );
        const found = reader.findingsOfFile(
            scenarioFile([
                '- Step 1: pass · live',
                '- Step 2: fail · live — observed: the total is `0`',
                '- Step 3: inconclusive · traced',
            ]),
            'checkout',
        );
        assert.deepStrictEqual(found, [
            {
                area: 'checkout',
                scenario: 'S-1',
                title: 'Pay by card',
                step: 2,
                result: 'fail',
                mode: 'live',
                observed: 'the total is `0`',
            },
            {
                area: 'checkout',
                scenario: 'S-1',
                title: 'Pay by card',
                step: 3,
                result: 'inconclusive',
                mode: 'traced',
                observed: '',
            },
        ]);
        assert.deepStrictEqual(
            reader.readSimulationFindings(path.join(os.tmpdir(), 'magic-no-such-workspace')),
            [],
            'a missing folder holds no finding',
        );

        // The bullet, the category and the whitelist come from one place each.
        const bullets = requireFromFixture(
            path.resolve(TESTS_DIR, '..'),
            'lib',
            'changelog-bullets.js',
        );
        assert.strictEqual(bullets.deriveChangelogCategory('simulate', []), 'Changed');
        assert.strictEqual(
            bullets.buildChangelogBullet('simulate', 'ws', [
                { path: '.magicspec/ws/simulations/a.md', status: 'modified' },
            ]),
            'Ran the user scenarios (ws)',
        );
        assert.strictEqual(
            bullets.buildChangelogBullet('simulate', 'ws', [
                { path: '.magicspec/ws/simulations/a.md', status: 'modified' },
                { path: '.magicspec/ws/simulations/b.md', status: 'added' },
            ]),
            'Ran the user scenarios of 2 areas (ws)',
        );
        assert.deepStrictEqual(
            requireFromFixture(path.resolve(TESTS_DIR, '..'), 'lib', 'significance.js').WHITELIST[
                'magic.simulate'
            ],
            ['.magicspec/{ws}/simulations/**/*.md'],
        );

        // The rule kernel names the workflow and stays within its budget; the fix body says where the findings are read.
        const kernel = readShipped('skills/magicspec/CONSTITUTION.md');
        assert.ok(
            Buffer.byteLength(kernel) < 16384,
            `the rule kernel is under 16 KB (${Buffer.byteLength(kernel)} bytes)`,
        );
        const fix = readShipped('skills/magicspec/workflows/fix.md');
        assert.ok(
            fix.includes(
                'the `fail` and `inconclusive` steps of the `Last run` records under `.magicspec/{workspace}/simulations/`',
            ),
            'the argument form reads them there',
        );
        assert.ok(
            fix.includes("a failed or inconclusive step of a scenario's `Last run` record"),
            'and so does the argument table',
        );
    });

    test('the ui-ux-designer card states context first, one design system, states, accessibility, the early draft and verification by looking, the coder adopts its stance, and the mirrors and listings carry them word for word (UI-1 to UI-7)', () => {
        const card = readShipped('skills/magicspec/roles/ui-ux-designer.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        const mission = assertCardMirrored(
            card,
            mirror,
            [
                'id: ui-ux-designer',
                'layer: executor',
                '  - workflow: spec.md',
                '  - workflow: task.md',
                '  - workflow: run.md',
                '  - to: code-reviewer',
                '  - to: test-engineer',
                '  - to: simulator-tester',
            ],
            'Treat a product',
            13,
        );
        assert.ok(
            mission.includes('is the stance `coder` adopts for layout and front-end work'),
            'the card names the coder stance (UI-7)',
        );
        assert.ok(
            mission.includes('advisory hints: the role works with none installed'),
            'recommended skills are hints (R6)',
        );

        for (const needle of [
            'gather and cite the existing design context',
            'one design-system specification',
            'never redefine a token',
            'the normal state and the empty, loading, error, partial, disabled and long-content states',
            'contrast, keyboard operation and focus order, accessible names, reduced motion, and the sizes or windows it must work at',
            'nothing pauses for a look',
            'a screenshot, a driven browser, a captured terminal',
            'the check is a review against the specification',
            "The method is named in the task's `Verify` line.",
        ]) {
            assert.ok(card.includes(needle), `the card states: ${needle}`);
        }

        // The coder adopts the stance: one sub-bullet under the minimal-diff step, in the card and its mirror.
        const stance =
            "   - **Interface work:** when the task changes what a person sees or operates (layout, front-end), adopt the stance of `@role:ui-ux-designer` for that part: the design system and the specification's states and accessibility statements govern, and the `Verify` line names how the result is looked at.";
        assert.ok(
            readShipped('skills/magicspec/roles/coder.md').includes(stance),
            'the coder card carries the stance',
        );
        assert.ok(mirror.includes(stance), 'and so does its mirror');
        assert.strictEqual(
            readShipped('skills/magicspec/roles/coder.md').split('@role:ui-ux-designer').length - 1,
            1,
            'the coder names the role once',
        );

        // The listings: the index row, the content-spec table and the integration map.
        const index = readShipped('.magicspec/engine/specifications/l2-role-cards.md');
        assert.ok(
            index.includes(
                '| `ui-ux-designer` | executor | `spec.md` → Interface Specification · `task.md` → Interface Tasks · `run.md` → Interface Implementation | execution |',
            ),
        );
        assert.ok(
            index.includes('`docs-specialist`, `ui-ux-designer` |'),
            'the content-spec table lists it with the execution cards',
        );
        const integration = readShipped('.magicspec/engine/specifications/l2-role-integration.md');
        for (const row of [
            '| `spec.md` | Interface Specification | `ui-ux-designer` |',
            '| `task.md` | Interface Tasks | `ui-ux-designer` |',
            '| `run.md` | Interface Implementation | `ui-ux-designer` |',
        ]) {
            assert.ok(integration.includes(row), `the integration map has: ${row}`);
        }
    });

    test('the design-system template carries tokens, components, overrides and the accessibility baseline in one place, and the specification template gains an optional interface section with the states and accessibility statements (UI-1 to UI-4)', () => {
        const design = readShipped('skills/magicspec/templates/design-system.md');
        for (const needle of [
            '# {Product} Design System',
            '## 1. Motivation',
            '## 2. Design Context',
            'Absent all of them, say so here and state where the choices below come from.',
            '## 3. Tokens',
            '| Colour — {name} |',
            '| Type — {name} |',
            '| Spacing — {name} |',
            '| Radius — {name} |',
            '| Elevation — {name} |',
            '| Motion — {name} |',
            '## 4. Components',
            '- **Variants:**',
            '- **States:**',
            '## 5. Overrides',
            '## 6. Accessibility Baseline',
            '- **Reduced motion:**',
            '## Document History',
            'screen and flow specifications reference it and never redefine a token',
        ]) {
            assert.ok(design.includes(needle), `the design-system template carries: ${needle}`);
        }
        const spec = readShipped('skills/magicspec/templates/spec.md');
        const at = spec.indexOf('\n## Interface\n');
        assert.ok(
            at !== -1 &&
                at > spec.indexOf('### 5.2 Component B') &&
                at < spec.indexOf('\n## 6. Implementation Notes'),
            'the interface section sits after the detailed design and before the implementation notes',
        );
        const section = spec.slice(at, spec.indexOf('\n## 6. Implementation Notes'));
        for (const needle of [
            'Optional: used only when the specification describes an interface',
            '`templates/design-system.md`',
            'never redefines a token',
            '| View | Normal | Empty | Loading | Error | Partial | Disabled | Long content |',
            '**Accessibility:** contrast {level}; keyboard operation and focus order {order}; accessible names {rule}; reduced motion {rule}.',
            '**Sizes:** {narrowest} … {widest}.',
        ]) {
            assert.ok(section.includes(needle), `the interface section carries: ${needle}`);
        }
        for (const template of [design, spec]) {
            assert.ok(
                !/\bl[12]-[a-z0-9-]+\.md\b/.test(template.replace(/\{l1-layer-1-file\.md\}/g, '')),
                'a shipped template names no specification file of this repository',
            );
        }
    });

    test('planning lists the scenarios a phase writes: the planner card has the step after the plan check, its mirror carries it word for word, and plan.md names it in the draft, the audit and the checklist (SM-3)', () => {
        const card = readShipped('skills/magicspec/roles/planner.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        const step = cardLine(
            'skills/magicspec/roles/planner.md',
            '7. **Scenario list (for a phase with user-facing behaviour, before write-back):**',
        );
        assert.ok(step, 'the scenario list is step 7 of the card');
        for (const needle of [
            'activate `@role:simulator-tester` for each phase that adds or changes what a person sees or does with the product',
            'lists in the phase entry the scenarios to write or update (the area file and the scenario titles)',
            "the phase's validation tasks write them",
            'A phase with user-facing behaviour and no scenario is a planning finding, resolved before the plan is written',
            'a phase with none lists none and records no finding',
        ]) {
            assert.ok(step.includes(needle), `step 7 states: ${needle}`);
        }
        assert.ok(mirror.includes(step), 'the mirror carries the step word for word');
        assert.ok(
            card.indexOf('6. **Plan check') < card.indexOf(step) &&
                card.indexOf(step) < card.indexOf('8. Write back to `PLAN.md` only'),
            'the list sits between the plan check and the write-back',
        );
        assert.ok(
            card.includes('9. End at the stage boundary:') &&
                mirror.includes('9. End at the stage boundary:'),
            'the stage boundary is step 9 in both',
        );

        const plan = readShipped('skills/magicspec/workflows/plan.md');
        assert.ok(
            plan.includes(
                'also records the scenarios it writes or updates (Step 5, Scenario list)',
            ),
            'the draft step names the list',
        );
        const audit = lineWith(plan, '   - **Scenario list (SM-3)**');
        assert.ok(audit, 'the audit has the bullet');
        for (const needle of [
            '`@role:simulator-tester` lists in the phase entry the scenarios to write or update',
            '`- Scenarios: {area} — {scenario titles}`',
            "the phase's validation tasks (`/magicspec task`) write them",
            'is a planning finding',
            'records no finding',
        ]) {
            assert.ok(audit.includes(needle), `the audit bullet states: ${needle}`);
        }
        assert.ok(
            plan.indexOf('**Plan check (CH-5)**') < plan.indexOf(audit),
            'after the plan check',
        );
        assert.ok(
            plan.indexOf(audit) < plan.indexOf('6. **Sync (Update Mode)**'),
            'inside the Planning Audit step',
        );
        assert.ok(plan.includes('  ☐ Scenario list (SM-3):'), 'the checklist has the line');
        assert.ok(
            !/\.magicspec\/engine\b/.test(plan),
            'the shipped body names no workspace of this repository',
        );
    });

    test('decomposition writes the listed scenarios in the validation tasks and gives an interface task its draft, its design acceptance and a named way of looking (SM-3, UI-5, UI-6)', () => {
        const task = readShipped('skills/magicspec/workflows/task.md');
        const scenarios = lineWith(task, '   - **Scenarios (SM-3)**');
        assert.ok(scenarios, 'Step 4 has the scenarios bullet');
        for (const needle of [
            '`- Scenarios: {area} — {scenario titles}`',
            'the validation tasks of the tracks that change that behaviour include writing or updating them',
            '`templates/simulation.md`, by `@role:simulator-tester`',
            "with the scenario file named in the task's `Verify` line",
            'is a finding that goes back to `plan` (Findings Go Back)',
        ]) {
            assert.ok(scenarios.includes(needle), `the scenarios bullet states: ${needle}`);
        }
        const interfaces = lineWith(task, '   - **Interface tasks (UI-5, UI-6)**');
        assert.ok(interfaces, 'Step 4 has the interface bullet');
        for (const needle of [
            '`@role:ui-ux-designer` adds the design acceptance',
            'starts with a draft task the person can look at',
            'the build continues without waiting for that look (DA-2)',
            'The `Verify` line of every interface task names how the result is looked at',
            'a screenshot, a driven browser, a captured terminal',
            'or, where it cannot render, reviewed against that section',
        ]) {
            assert.ok(interfaces.includes(needle), `the interface bullet states: ${needle}`);
        }
        const step4 = task.indexOf('4. **Decompose**');
        assert.ok(
            step4 < task.indexOf(scenarios) &&
                task.indexOf(interfaces) < task.indexOf('5. **Task Instruction Review**'),
            'both bullets sit inside Step 4',
        );
        assert.ok(
            task.indexOf('- **Testing (Mandatory)**') < task.indexOf(scenarios),
            'after the validation task rule',
        );
        for (const line of ['  ☐ Scenarios (SM-3):', '  ☐ Interface tasks (UI-5, UI-6):']) {
            assert.ok(task.includes(line), `the checklist has: ${line}`);
        }
        assert.ok(
            !/\.magicspec\/engine\b/.test(task),
            'the shipped body names no workspace of this repository',
        );
    });

    test('execution keeps the scenarios with the code, implements an interface task in the designer stance and looks at the result as its Verify line names, and the QA review asks for both (SM-4, UI-6, UI-7)', () => {
        const run = readShipped('skills/magicspec/workflows/run.md');
        const interfaceStep = lineWith(run, '3.1. **Interface Implementation (conditional)**');
        const scenarioStep = lineWith(run, '3.2. **Scenario Upkeep (conditional)**');
        assert.ok(interfaceStep && scenarioStep, 'Step 3 has both conditional steps');
        for (const needle of [
            'adopts the `@role:ui-ux-designer` stance (UI-7)',
            "the design system and the specification's interface section govern",
            "the way the task's `Verify` line names (UI-6)",
            'a screenshot, a driven browser, a captured terminal',
            'otherwise reviewed against it; the method used is recorded in `Changes`',
            'Nothing pauses for a look (DA-2): the render is evidence, not a gate.',
        ]) {
            assert.ok(interfaceStep.includes(needle), `step 3.1 states: ${needle}`);
        }
        for (const needle of [
            'activate `@role:simulator-tester` in the same task, as tests are kept (SM-4)',
            'under `.magicspec/{workspace}/simulations/` are updated to the behaviour the specification states',
            'recorded as the finding `scenario out of date`',
            'corrected in the same task when the specification settles its expectation',
            'is the ambiguity of the Handoff in Step 4',
        ]) {
            assert.ok(scenarioStep.includes(needle), `step 3.2 states: ${needle}`);
        }
        const order = [
            '3. **Execute**',
            '3.1. **Interface Implementation',
            '3.2. **Scenario Upkeep',
            '3.3. **Decision Review',
            '3.4. **Diff Review',
        ].map((s) => run.indexOf(s));
        assert.ok(
            order.every((at, i) => at !== -1 && (i === 0 || order[i - 1] < at)),
            'the steps run in order between Execute and Decision Review',
        );
        assert.ok(
            run.includes(
                '   - **Scenario and interface evidence**: a task that changed user-facing behaviour shows its scenarios updated (3.2); an interface task shows how it was looked at (3.1).',
            ),
            'the QA review asks for both',
        );
        for (const line of ['  ☐ Scenario upkeep (SM-4):', '  ☐ Interface (UI-6, UI-7):']) {
            assert.ok(run.includes(line), `the checklist has: ${line}`);
        }
        assert.ok(
            !/\.magicspec\/engine\b/.test(run),
            'the shipped body names no workspace of this repository',
        );
    });

    test('the specification workflow has the interface designer write the interface section — context first, one design system, the states and the accessibility statements — and the specification guide says the same (UI-1 to UI-4)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const bullet = lineWith(spec, '   - **Interface (UI-1 to UI-4)**');
        assert.ok(bullet, 'the Creation step has the interface bullet');
        for (const needle of [
            '`@role:ui-ux-designer` writes its `## Interface` section from `templates/spec.md`',
            'The design context is gathered and cited first',
            'with none of them the specification says so and says where its choices come from (UI-1)',
            'one design-system specification, written from `templates/design-system.md`',
            'never redefine a token of (UI-2)',
            'the normal state and the empty, loading, error, partial, disabled and long-content states that apply',
            'what the person can do in each (UI-3)',
            'contrast, keyboard operation and focus order, accessible names, reduced motion, the sizes or windows it must work at',
            'as verifiable statements (UI-4)',
            'An amendment of such a specification holds to the same.',
        ]) {
            assert.ok(bullet.includes(needle), `the interface bullet states: ${needle}`);
        }
        assert.ok(
            spec.indexOf('- Use `templates/spec.md` (Standard)') < spec.indexOf(bullet) &&
                spec.indexOf(bullet) < spec.indexOf('3. **Closure**: Post-Update Review'),
            'the bullet sits in the Creation step',
        );
        assert.ok(spec.includes('  ☐ Interface (UI-1 to UI-4):'), 'the checklist has the line');
        assert.ok(
            !/\.magicspec\/engine\b/.test(spec),
            'the shipped body names no workspace of this repository',
        );

        const guide = readShipped('docs/spec.md');
        const section = guide.slice(
            guide.indexOf('### 5.5 Interface Specifications'),
            guide.indexOf('## 6. Safety & Integrity'),
        );
        assert.ok(
            section.length > 0 && guide.indexOf('### 5.5 Interface Specifications') !== -1,
            'the guide has the section',
        );
        for (const needle of [
            '**Context first**',
            '**One design system**',
            '**States**',
            '**Accessibility**',
            'skills/magicspec/templates/design-system.md',
            'never redefine a token',
        ]) {
            assert.ok(section.includes(needle), `the guide states: ${needle}`);
        }
    });
};
