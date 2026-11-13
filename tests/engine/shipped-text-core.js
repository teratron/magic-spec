// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
    shippedRoot,
    readShipped,
    listShipped,
    engineBodies,
    stepBlock,
    lineWith,
    cardLine,
} = require('./lib/sim');

module.exports = () => {
    // The own-word rule `analyze.md` states for PHANTOM_COMMAND: a `/magicspec {cmd}`
    // token is a command mention only when nothing but whitespace, a backtick or
    // an opening quote precedes it — so a path such as `skills/magicspec x` is never
    // one; `{cmd}` is a lowercase word (a hyphen ends it).
    const phantomCommands = (files, wrappers) => {
        const found = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                for (const match of line.matchAll(/(?<![^\s`"'“‘])\/magicspec ([a-z]+)/g)) {
                    if (wrappers.has(match[1])) continue;
                    found.push(`${rel}:${index + 1}: /magicspec ${match[1]}`);
                }
            });
        }
        return found;
    };

    test('shipped text advertises no phantom command, and the scan flags one when it is planted (H10a)', () => {
        // The detector, on synthetic text.
        const wrappers = new Set(['run', 'task']);
        const sample = [
            {
                rel: 'sample.md',
                text: [
                    'Run `/magicspec pause` to stop.',
                    'Say "/magicspec context" first.',
                    'Use /magicspec retrospective now',
                    'See skills/magicspec x and .agents/workflows/magic.run.md.',
                    'The `/magicspec run`-executable flag and /magicspec task both resolve.',
                    'Developer-facing: `/magicspec-dev:init`.',
                    '/magicspec pause at a line start',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            phantomCommands(sample, wrappers),
            [
                'sample.md:1: /magicspec pause',
                'sample.md:2: /magicspec context',
                'sample.md:3: /magicspec retrospective',
                'sample.md:7: /magicspec pause',
            ],
            'flags a mention after a backtick, a quote, whitespace and a line start; spares paths, resolving commands, a hyphen-ended token and the maintenance commands',
        );

        // The shipped tree: `skills/magicspec/` (bodies, scripts, templates), docs, README.
        const resolved = new Set(
            fs
                .readdirSync(path.join(shippedRoot, 'skills', 'magicspec', 'workflows'))
                .map((name) => name.match(/^([a-z]+)\.md$/))
                .filter(Boolean)
                .map((match) => match[1]),
        );
        assert.ok(
            resolved.has('run') && resolved.has('task'),
            "the command set is read from the skill folder's workflows/",
        );
        const scanned = [
            ...listShipped('skills/magicspec', ['.md', '.js', '.json']),
            ...listShipped('docs', ['.md']),
            ...(fs.existsSync(path.join(shippedRoot, 'README.md')) ? ['README.md'] : []),
        ].map((rel) => ({ rel, text: readShipped(rel) }));
        assert.ok(
            scanned.length > 30,
            `the scan must actually see the shipped tree (saw ${scanned.length} files)`,
        );

        assert.deepStrictEqual(
            phantomCommands(scanned, resolved),
            [],
            'a /magicspec {cmd} mention must resolve to skills/magicspec/workflows/{cmd}.md — internal modules must not be advertised as commands',
        );
        // The pause module stays a module: no shipped text names it as a command,
        // whether or not a wrapper ever appears for it.
        assert.deepStrictEqual(
            phantomCommands(scanned, new Set()).filter((hit) => hit.endsWith('/magicspec pause')),
            [],
            '/magicspec pause is not a command',
        );
    });

    test('shipped text prints one command form, /magicspec <command>: the colon spelling appears nowhere the engine prints, and the detector flags it when planted (CS-2)', () => {
        // The old form, plain and as a regex source, with or without the slash. `magicspec-dev:`
        // names and the `<!-- magicspec:begin -->` markers are different words and are not matched.
        const commands =
            'spec|task|run|analyze|rule|status|graph|help|migrate|plan|fix|simulate|goal';
        const colonForm = new RegExp(
            `\\/magicspec:[a-z*{(<]|(?<![\\w/.-])magicspec:(?:${commands})(?![\\w-])`,
        );
        for (const planted of [
            'Run /magicspec:task engine.',
            'Pipeline: `magicspec:spec` then run.',
            "re.test('\\/magicspec:run')",
            'Any /magicspec:* workflow.',
        ]) {
            assert.ok(colonForm.test(planted), `the detector must flag: ${planted}`);
        }
        for (const clean of [
            'Run /magicspec task engine.',
            'The colon spelling magicspec:<command> is read, never printed.',
            '<!-- magicspec:begin -->',
            'Developer-facing: /magicspec-dev:init.',
        ]) {
            assert.ok(!colonForm.test(clean), `the detector must spare: ${clean}`);
        }

        const scanned = [
            ...listShipped('skills/magicspec', ['.md', '.js', '.json']),
            ...listShipped('docs', ['.md']),
            ...listShipped('scripts', ['.js']),
            'README.md',
            'CONTRIBUTING.md',
        ].filter((rel) => fs.existsSync(path.join(shippedRoot, rel)));
        assert.ok(
            scanned.length > 40,
            `the scan must see the shipped tree (saw ${scanned.length})`,
        );
        const hits = [];
        for (const rel of scanned) {
            readShipped(rel)
                .split(/\r?\n/)
                .forEach((line, index) => {
                    if (colonForm.test(line)) hits.push(`${rel}:${index + 1}: ${line.trim()}`);
                });
        }
        assert.deepStrictEqual(hits, [], 'no shipped text prints the colon spelling');
    });

    // A context-fill tier: a table cell holding only a percentage range,
    // threshold or open end (`0–40%`, `75%+`, `>70%`), or a narration of the form
    // `at 63%` / `at {n}%`. Percentages inside prose — a similarity threshold, a
    // coverage share — are not tiers and are spared.
    const fillTiers = (files) => {
        const cellRe = /\|\s*(?:[<>≥≤]=?\s*)?\d{1,3}\s*(?:[–—-]\s*\d{1,3}\s*)?%\+?\s*\|/;
        const narrationRe = /\bat\s+(?:\{\w+\}|\d{1,3})\s*%/i;
        const found = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                if (cellRe.test(line) || narrationRe.test(line)) found.push(`${rel}:${index + 1}`);
            });
        }
        return found;
    };

    test('shipped text carries no context-fill percentage tier or narration in any engine body (H10b)', () => {
        const retired = [
            {
                rel: 'retired.md',
                text: [
                    '| **PEAK** | 0–40% | Full files, parallel spec scans. |',
                    '| **DEGRADING** | 50-70% | Read only relevant spec sections. |',
                    '| **POOR** | 75%+ | Halt new reads. |',
                    '| **POOR** | >70% | Skip full spec reads. |',
                    'Crossing a tier → narrate one line (e.g. `[Budget] NORMAL → DEGRADED at 63%`).',
                    'Narrate `at {n}%` when a tier is crossed.',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            fillTiers(retired),
            [
                'retired.md:1',
                'retired.md:2',
                'retired.md:3',
                'retired.md:4',
                'retired.md:5',
                'retired.md:6',
            ],
            'every shape the retired tier tables used must be flagged',
        );
        const legitimate = [
            {
                rel: 'legitimate.md',
                text: [
                    '**RESCUE (AOP)**: name, title, or semantic similarity >80% → propose rename/sync.',
                    '🟢 = <5% uncovered/drift AND <3 shadow logic files.',
                    "2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30% (prefix or stem match).",
                    '| Threshold | 80% similarity | rename |',
                    'Overall: [2/3] ██░░ 66%',
                    'Look at 100 files before deciding.',
                ].join('\n'),
            },
        ];
        assert.deepStrictEqual(
            fillTiers(legitimate),
            [],
            'thresholds and shares inside prose are not tiers',
        );

        // The shipped engine bodies: `skills/magicspec/*.md`, not only `context.md` — a
        // narrower scan passed while `task.md` still shipped its own tier table.
        const bodies = engineBodies();
        assert.ok(bodies.length >= 8, `the scan must see the engine bodies (saw ${bodies.length})`);
        assert.deepStrictEqual(
            fillTiers(bodies),
            [],
            'the agent has no reading of its own context fill: no body may key behavior to a percentage tier',
        );
    });

    test('shipped text: run.md records Task Start and all three Attempts events, in order (H10c)', () => {
        const run = readShipped('skills/magicspec/workflows/run.md');

        // Step numbers repeat elsewhere in the file (another list has its own
        // "3."), so the steps are looked up inside their own section only.
        const stepsStart = run.indexOf('\n### Steps');
        const stepsEnd = run.indexOf('\n### Dead-End Record');
        assert.ok(
            stepsStart !== -1 && stepsEnd > stepsStart,
            'run.md must carry the Steps section followed by the Dead-End Record section',
        );
        const steps = run.slice(stepsStart, stepsEnd);

        // Task Start sits between Select and Execute — the record must exist
        // before the executor is activated.
        const select = steps.indexOf('\n2. **Select**');
        const start = steps.indexOf('\n2b. **Task Start**');
        const execute = steps.indexOf('\n3. **Execute**');
        assert.ok(
            select !== -1 && start !== -1 && execute !== -1,
            'run.md must carry Select, Task Start and Execute steps',
        );
        assert.ok(
            select < start && start < execute,
            'Task Start must sit between Select and Execute',
        );
        const taskStart = stepBlock(steps, '2b.');
        assert.match(taskStart, /`In Progress`/, 'Task Start records the task as in flight');
        assert.match(taskStart, /- \[ \]/, 'Task Start states that the checklist line stays open');
        assert.match(
            taskStart,
            /Attempts/,
            'Task Start reads the recorded dead ends before an approach is chosen',
        );

        // The three moments a dead end is recorded, each at its own step.
        assert.match(
            stepBlock(steps, '3.'),
            /Attempts/,
            'an approach discarded or reverted in Step 3 is recorded',
        );
        assert.match(
            stepBlock(steps, '3.4.'),
            /FAIL[^\n]*Attempts/,
            'a Diff Review return is recorded',
        );
        assert.match(
            stepBlock(steps, '3.4b.'),
            /FAIL[^\n]*Attempts/,
            'an Instruction Diff Review return is recorded',
        );
        const qa = stepBlock(steps, '3.5.');
        assert.ok(
            qa.includes('Attempts') &&
                qa.includes('Blocked [!]') &&
                qa.indexOf('Attempts') < qa.indexOf('Blocked [!]'),
            'a Verify or QA failure is recorded before the task is set Blocked',
        );

        // The closed list and the cap, stated once.
        const section = run.match(
            /^### Dead-End Record \(`Attempts`\)\n([\s\S]*?)(?=\n### |\n## |(?![\s\S]))/m,
        );
        assert.ok(section, 'run.md must carry the Dead-End Record section');
        assert.match(section[1], /^1\. .*(Verify|QA)/m, 'event 1: a Verify or QA failure');
        assert.match(
            section[1],
            /^2\. .*review/im,
            'event 2: a review verdict that returns work to Step 3',
        );
        assert.match(
            section[1],
            /^3\. .*(discard|revert)/im,
            'event 3: an approach discarded or reverted',
        );
        assert.match(
            section[1],
            /At most \*\*five\*\* entries/,
            'the dead-end list is capped at five',
        );

        assert.match(run, /☐ Task Start:/, 'the Run Completion Checklist verifies Task Start');
        assert.match(
            run,
            /☐ Dead-End Record:/,
            'the Run Completion Checklist verifies the dead-end record',
        );
    });

    test('shipped text: skills/magicspec/CONSTITUTION.md carries the session resume check and its opt-out (H10d)', () => {
        const rules = readShipped('skills/magicspec/CONSTITUTION.md');
        assert.match(
            rules,
            /^## 10\. Session Resume Check/m,
            'skills/magicspec/CONSTITUTION.md must carry section 10',
        );
        assert.ok(
            rules.indexOf('\n## 9. ') < rules.indexOf('\n## 10. '),
            'section 10 follows section 9',
        );
        assert.match(
            rules,
            /executor\.js resume-state --all/,
            'the rule runs the shared predicate over every workspace',
        );
        assert.match(rules, /MAGIC_RESUME_CHECK=0/, 'the rule states its opt-out');
        assert.match(
            rules,
            /verify §1–§10 were honored/,
            'the completion protocol counts section 10',
        );
        assert.match(
            rules,
            /\*\*§10 Session Resume Check\*\*/,
            'the completion protocol carries a section 10 item',
        );
    });

    // A registered specification's file name in shipped text is a dead pointer
    // on every consumer install (the specifications do not ship) and leaks this
    // repository's own workspace into the product. The class is unconditional
    // and mechanically decidable, so it is pinned here; task IDs and phase
    // designators need a mention-versus-use judgment (format documentation is
    // legitimate) and stay with the ventilation scan.
    const specCitations = (text, registered) => {
        const re = new RegExp(`\\b(${registered.join('|')})\\.md\\b`, 'g');
        const hits = [];
        text.split(/\r?\n/).forEach((line, i) => {
            for (const m of line.matchAll(re)) hits.push({ line: i + 1, name: m[0] });
        });
        return hits;
    };

    test('shipped text: the registered-specification citation detector flags and spares correctly', () => {
        const registered = ['l1-alpha', 'l2-beta-gamma'];
        const flagged = specCitations(
            'ok\nsee `l2-beta-gamma.md` §3 and l1-alpha.md.\n',
            registered,
        );
        assert.deepStrictEqual(
            flagged.map((h) => `${h.line}:${h.name}`),
            ['2:l2-beta-gamma.md', '2:l1-alpha.md'],
            'a registered name is flagged wherever it stands, with its line',
        );
        assert.deepStrictEqual(
            specCitations(
                'an example name l1-api.md and l2-alpha-extra.md and l1-alpha.txt',
                registered,
            ),
            [],
            'an unregistered example filename, a longer name and another extension are spared',
        );
    });

    test('shipped text names no specification registered in this workspace', (t) => {
        const specsDir = path.join(shippedRoot, '.magicspec', 'engine', 'specifications');
        if (!fs.existsSync(specsDir)) {
            t.skip('no engine workspace specifications in this checkout');
            return;
        }
        const registered = fs
            .readdirSync(specsDir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => f.slice(0, -'.md'.length));
        const files = [
            ...listShipped('skills/magicspec', ['.md', '.js']),
            ...listShipped('workflows', ['.md']),
            ...listShipped('skills', ['.md']),
            ...listShipped('rules', ['.md']),
        ];
        const found = [];
        for (const rel of files) {
            for (const h of specCitations(readShipped(rel), registered))
                found.push(`${rel}:${h.line} → ${h.name}`);
        }
        assert.deepStrictEqual(
            found,
            [],
            'shipped text must not cite a specification file — restate the rationale in plain language and keep only the protocol label:\n' +
                found.join('\n'),
        );
    });

    // A script command in workflow text names the workspace it runs for: `executor.js`
    // resolves a missing `--workspace` to the default workspace, so an explicit workspace
    // argument reaches the script only through the flag.
    const bareWorkspaceCommands = (files, script) => {
        const command = new RegExp('executor\\.js ' + script + '\\b[^`\\n]*', 'g');
        const seen = [];
        const bare = [];
        for (const { rel, text } of files) {
            text.split(/\r?\n/).forEach((line, index) => {
                for (const match of line.matchAll(command)) {
                    seen.push(`${rel}:${index + 1}`);
                    if (!match[0].includes('--workspace={active-workspace}')) {
                        bare.push(`${rel}:${index + 1}`);
                    }
                }
            });
        }
        return { seen, bare };
    };

    test('shipped text: every check-prerequisites command in an engine body names its workspace, and the scan flags a bare one when it is planted (T239)', () => {
        const planted = bareWorkspaceCommands(
            [
                {
                    rel: 'planted.md',
                    text: [
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace={active-workspace}`.',
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json`.',
                        '`node skills/magicspec/scripts/executor.js check-prerequisites --json --require-tasks --workspace={active-workspace}`.',
                        'Prose that merely names check-prerequisites is not an invocation.',
                    ].join('\n'),
                },
            ],
            'check-prerequisites',
        );
        assert.deepStrictEqual(planted.seen, ['planted.md:1', 'planted.md:2', 'planted.md:3']);
        assert.deepStrictEqual(
            planted.bare,
            ['planted.md:2'],
            'only the command without the flag may be flagged',
        );

        const { seen, bare } = bareWorkspaceCommands(engineBodies(), 'check-prerequisites');
        assert.ok(
            seen.length >= 8,
            `the scan must see every Pre-flight command (saw ${seen.length})`,
        );
        assert.deepStrictEqual(
            bare,
            [],
            'a Pre-flight without --workspace validates the default workspace in place of the one the workflow was given:\n' +
                bare.join('\n'),
        );
    });

    test('shipped text: every finalize command names its workspace, and the scan flags a bare one when it is planted (T241)', () => {
        const planted = bareWorkspaceCommands(
            [
                {
                    rel: 'planted.md',
                    text: [
                        '1. Run `node skills/magicspec/scripts/executor.js finalize --workflow=task --workspace={active-workspace}`.',
                        '1. Run `node skills/magicspec/scripts/executor.js finalize --workflow=run`.',
                        '   node skills/magicspec/scripts/executor.js finalize --workflow=<spec|plan|task|run|rule>',
                        'Prose that merely mentions finalize is not an invocation.',
                    ].join('\n'),
                },
            ],
            'finalize',
        );
        assert.deepStrictEqual(planted.seen, ['planted.md:1', 'planted.md:2', 'planted.md:3']);
        assert.deepStrictEqual(
            planted.bare,
            ['planted.md:2', 'planted.md:3'],
            'a command in a fenced block counts too, and only the flagged one may pass',
        );

        // Workflow bodies (each opens with the entry section that used to be a wrapper) and the ambient rule carry the command.
        const read = (rel) => ({ rel, text: readShipped(rel) });
        const { seen, bare } = bareWorkspaceCommands(
            [...engineBodies(), read('skills/magicspec/CONSTITUTION.md')],
            'finalize',
        );
        assert.ok(
            seen.length >= 8,
            `the scan must see every finalize command (saw ${seen.length})`,
        );
        assert.deepStrictEqual(
            bare,
            [],
            'finalize without --workspace computes significance and writes STATE.md for the default workspace, not the one the workflow ran for:\n' +
                bare.join('\n'),
        );
    });

    test('shipped text: every planning guard has one owner — plan.md carries it once and task.md does not (PL-1, PL-2)', () => {
        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const task = readShipped('skills/magicspec/workflows/task.md');
        const count = (text, label) => text.split(label).length - 1;

        // The guards and steps that moved from the old planning workflow, by their bold label.
        const planOwned = [
            '**C15 Filter**',
            '**File-Header Parity**',
            '**Cross-Workspace Parity**',
            '**Cross-Workspace Parent Header Parity**',
            '**Parent Header Parity (Cross-Workspace)**',
            '**Design-Debt Backlog**',
            '**Stable-Spec Requirement**',
            '**T4 Queue (Cross-Workflow)**',
            '**Circular Guard (Semantic Split)**',
            '**Hard Dependencies**',
            '**Soft References**',
            '**Cycle Resolution**',
            '**Layer Respect**',
            '**Autonomous Selection (C6)**',
            '**Guided Planning Filter**',
            '**C6 Bootstrap Exception**',
            '**Pre-Planning Stabilization (Trust Mode Batch)**',
            '**Field Normalization**',
            '**Planning Audit**',
            '**C12 Quarantine**',
            '**Cross-Workspace C12**',
            '**C12.1 Stabilization Exception**',
            '**Demoted Spec**',
            '**Quarantine Release**',
            '**Phantom Specs**',
            '**Phantom Parent Guard**',
            '**Renames**',
            '**No Orphans**',
            '**Auto-Plan (C9 default)**',
        ];
        for (const label of planOwned) {
            assert.strictEqual(count(plan, label), 1, `plan.md carries ${label} exactly once`);
            assert.strictEqual(count(task, label), 0, `task.md does not carry ${label}`);
        }

        // The decomposition guards stay with task.md and are not copied into plan.md.
        const taskOwned = [
            '**Atomic Tasks (C10)**',
            '**Execution Mode**',
            '**Verify Line (Mandatory)**',
            '**Testing (Mandatory)**',
            '**Stabilizing Tasks (C12.1)**',
            '**Structural Refactor**',
            '**ID Splitting**',
            '**Stalled Plan**',
            '**Task Instruction Review**',
            '**Preserve recorded task state (Update mode)**',
            '**Phase Frontmatter**',
        ];
        for (const label of taskOwned) {
            if (label === '**Execution Mode**' || label === '**Task Instruction Review**') continue; // step names, not bullets
            assert.strictEqual(count(task, label), 1, `task.md carries ${label} exactly once`);
            assert.strictEqual(count(plan, label), 0, `plan.md does not carry ${label}`);
        }

        // The files each writes: the plan writes PLAN.md and no part of the task layer, the tasks the reverse.
        assert.match(
            plan,
            /It writes `PLAN\.md` and nothing else of the task layer: never `TASKS\.md`, a phase workbook or a tracking entry/,
        );
        assert.match(task, /It writes `TASKS\.md` and the phase workbooks and never `PLAN\.md`/);
        assert.ok(
            !/(?:^|\n)\s*- Use `templates\/phase\.md`/.test(plan),
            'plan.md uses no phase template',
        );
        assert.ok(!/templates\/plan\.md/.test(task), 'task.md uses no plan template');
    });

    test('shipped text: task.md stops on a missing or stale plan, hands findings back as a replan directive, reads the plan marker for stabilization and keeps update as an alias of plan (PL-4, PL-8)', () => {
        const task = readShipped('skills/magicspec/workflows/task.md');
        const template = readShipped('skills/magicspec/templates/tasks.md');
        for (const [needle, what] of [
            ['**Plan Gate (PL-4)**: the plan is missing, or stale', 'the stale-plan stop'],
            [
                'check-prerequisites --json --require-specs --require-plan --workspace={active-workspace}',
                'the missing plan is reported by the script, not left to the reader',
            ],
            [
                'decomposes nothing, writes nothing and ends with `/magicspec plan {workspace}` as its next step, naming why',
                'it names plan and why',
            ],
            ['(which version moved, which specification is unplanned)', 'the reasons it names'],
            ['**Findings Go Back (PL-8)**', 'the directive rule'],
            ['a specification too large for one phase', 'the first finding class'],
            [
                'a dependency between specifications the plan does not state',
                'the second finding class',
            ],
            ["a phase order that the tasks' dependencies contradict", 'the third finding class'],
            [
                'a specification whose content leaves a task without a verifiable outcome',
                'the fourth finding class',
            ],
            [
                'ends with `/magicspec plan {workspace} "{directive}"` as its next step',
                'the next step carries the directive',
            ],
            ['## Replan Directive', 'the section in the ledger'],
            ['`**Plan version:**`', 'it records the plan version'],
            [
                "It is pending only while `PLAN.md`'s version equals the recorded one",
                'and retires when the plan is rewritten',
            ],
            ['`plan` never writes this file', 'the plan never writes the ledger'],
            ['`update` — an alias of `/magicspec plan`', 'the update alias'],
            ['carries the flag `stabilizes: {spec-file}`', 'the flag'],
            ['the plan marks `[Stabilize]`', "from the plan's marker"],
            ['never from the request in the conversation', 'and never from the conversation'],
        ]) {
            assert.ok(task.includes(needle), what);
        }
        assert.ok(
            template.includes('## Replan Directive') &&
                template.includes('- **Plan version:**') &&
                template.includes('- **Directive:**'),
            'the ledger template carries the section, commented out',
        );
        assert.ok(
            /<!--[\s\S]*## Replan Directive[\s\S]*-->/.test(template),
            'and as a comment: absent means none',
        );
        // The Plan Gate runs before anything is read for decomposition or written.
        assert.ok(
            task.indexOf('1. **Plan Gate**') < task.indexOf('2. **Select the Phase**'),
            'the gate is Step 1',
        );
    });

    test('shipped text: the always-on rules and the rule modules finalize plan, name /magicspec plan as the one replan step after a run, and still never offer spec or analyze unasked (PL-6)', () => {
        const rules = readShipped('skills/magicspec/CONSTITUTION.md');
        const replan = readShipped('skills/magicspec/references/rules/replan.md');
        const finalization = readShipped('skills/magicspec/references/rules/finalization.md');
        const containment = readShipped('skills/magicspec/references/rules/containment.md');

        // §3: plan finalizes, and its whitelist row is the plan file; task no longer owns the plan file.
        assert.ok(
            rules.includes(
                '`/magicspec spec`, `/magicspec plan`, `/magicspec task`, `/magicspec run`, `/magicspec fix`, `/magicspec simulate` or `/magicspec rule` complete their',
            ),
        );
        assert.ok(rules.includes('finalize --workflow=<spec|plan|task|run|rule|fix|simulate>'));
        assert.ok(
            rules.includes('after `/magicspec spec|plan|task|run|rule|fix|simulate`, ran'),
            'the completion checklist names the workflow',
        );
        assert.ok(
            finalization.includes('finalize --workflow=<spec|plan|task|run|rule|fix|simulate>'),
        );
        assert.ok(
            finalization.includes(
                '| `/magicspec simulate` | `.magicspec/{ws}/simulations/**/*.md`',
            ),
            'the whitelist row of simulate',
        );
        assert.ok(finalization.includes('| `/magicspec plan` | `.magicspec/{ws}/PLAN.md` |'));
        assert.ok(
            finalization.includes(
                '| `/magicspec task` | `.magicspec/{ws}/TASKS.md`, `tasks/**/*.md` |',
            ),
        );

        // §5: one visible next step after a run — plan on drift, run when clean.
        assert.ok(
            rules.includes(
                'step: `/magicspec plan` (or `/magicspec run` when clean). Never proactively offer `/magicspec analyze`',
            ),
        );
        assert.ok(rules.includes('ONE command: `/magicspec plan` (with'));
        assert.ok(replan.includes('collapses to ONE command — `/magicspec plan`'));
        assert.ok(
            replan.includes(
                '> Post-task drift detected. Run `/magicspec plan` to revalidate the plan.',
            ),
        );
        assert.ok(
            replan.includes(
                'The user sees exactly ONE next step after a phase: `/magicspec plan` (on drift) or `/magicspec run` (clean).',
            ),
        );
        assert.ok(replan.includes('it surfaces ONLY inside `/magicspec plan` on a real HALT'));
        assert.ok(replan.includes('each stage ends at its boundary and starts nothing'));
        assert.ok(
            replan.includes('yes → /magicspec plan') &&
                replan.includes('→ /magicspec task → /magicspec run'),
            'the chain shows plan, then task, then run',
        );
        assert.ok(
            containment.includes('`→ /magicspec plan {ws}` to plan a containment-cleanup task'),
        );

        // No replan sentence names the task stage as the step (the old spelling).
        for (const text of [rules, replan, finalization]) {
            assert.ok(
                !/replan[^\n]*\/magicspec task\b|\/magicspec task\b[^\n]*revalidate the plan\b/.test(
                    text,
                ),
                'no replan sentence names the task stage',
            );
        }

        // spec and analyze stay unoffered after a run.
        assert.ok(rules.includes('or `/magicspec spec` after a run.'));
        assert.ok(
            replan.includes(
                'NEVER recommend `/magicspec analyze` proactively after `/magicspec run`',
            ),
        );
    });

    test('the goal body states the three scope forms, one intake, the criteria and their block, the choice of the next step, the consent queue, the six stop conditions and one report, runs each step as its own body and finalizes as none (GM-1 to GM-9)', () => {
        const body = readShipped('skills/magicspec/workflows/goal.md');
        const has = (needle, what) =>
            assert.ok(body.includes(needle), `goal.md states ${what}: ${needle}`);

        // Entry and routing: the forms of GM-9.
        has('`/magicspec goal [scope]`', 'the trigger');
        for (const form of [
            '`"{statement}"`',
            '`phase-{N}`',
            '`{N} tasks`',
            '`phase-{N} {N} tasks`',
            '`"{statement}" {N} tasks`',
            '`{workspace} …`',
        ]) {
            has(form, 'a scope form');
        }
        has(
            "A phase the plan does not hold is answered with one line listing the plan's phases, and nothing runs",
            'GM-9 item 2',
        );
        has(
            'stops at a task boundary after N tasks reach `Done`, never in the middle of one',
            'GM-9 item 3',
        );
        has('A number with no unit', 'the unit-less number');
        has('is read as a goal statement', 'the unit-less number is a statement');
        has(
            'replaces it, narrated as one `[DR]` line naming the replaced goal',
            'a new scope over a recorded goal',
        );
        has('a phase and a count are names and run none', 'the Input Pass for names');

        // The invariants: one intake, the queue, no relaxed guard, the files, the body of the step.
        has('**One intake, then no questions (GM-1)**', 'GM-1');
        has('**Consent is queued, never assumed (GM-5)**', 'GM-5');
        has('waiting for consent: {action}', 'the dependent work blocked with its reason');
        has('**No guard is relaxed (GM-7)**', 'GM-7');
        has('**The files carry the state (PS-6)**', 'PS-6');
        has('read `workflows/{step}.md` in full and follow it', 'the step is its body');
        has('this workflow does not finalize as itself', 'finalization by step');
        assert.ok(!/finalize --workflow=goal/.test(body), 'no finalization of its own is named');
        has('**Never commits**', 'no commit');

        // The recorded goal: the one writer, the temporary file, the closed schema, a refusal that halts.
        has(
            'update-state --workspace={active-workspace} --goal-file {path-to-the-json}',
            'the one writer',
        );
        has("from a temporary file outside the project's tree", 'the file outside the tree');
        for (const field of [
            'statement',
            'phase',
            'taskLimit',
            'bound',
            'withoutProgress',
            'tasksDone',
            'iterations',
            'phasesDone',
            'started',
            'criteria',
            'consents',
        ]) {
            has(`\`${field}\``, 'a field of the block');
        }
        has(
            'A refusal (an unknown field, a block over its bound) is a **HALT** of the mode',
            'the refusal',
        );
        has('resume-state --all --json', 'the search for a recorded goal');

        // The criteria and the choice of the step.
        has(
            'each verifiable by a named check: a command, a test, a simulation scenario, or a specification statement whose tasks are `Done`',
            'GM-2',
        );
        has('recorded as an `Assumption (forecast)`', 'the criterion with no check');
        has(
            '| A criterion of a statement that no `Stable` specification states (the criterion of a phase or a count is not one) | `spec`',
            'the first row',
        );
        has('| An open finding', 'the fix row');
        has(
            '| A phase goal and the phase has no workbook yet | `task {workspace} "phase-{N}"` |',
            'the decomposition row of a phase goal',
        );
        has(
            '| A phase goal and the phase holds a `Todo` or `In Progress` task | `run {workspace} "phase-{N}"` |',
            'the run row of a phase goal',
        );
        has(
            "`STATE.md`'s `Next Action` names `/magicspec spec`, `plan`, `task` or `run`",
            'the pipeline rows',
        );
        has('| Scenarios verify an open criterion', 'the simulate row');
        has('`run` execute one task at a time', 'the exact task count');

        // The six stop conditions, closed, in order, with the definition of progress.
        const stops = body.slice(body.indexOf('6. **Stop condition**'), body.indexOf('## Report'));
        const conditions = [...stops.matchAll(/^ {3}(\d)\. \*\*([^*]+)\*\*/gm)].map((m) => m[2]);
        assert.deepStrictEqual(conditions, [
            'Done',
            'Consent queued',
            'No progress',
            'Integrity halt',
            'A bound the goal states',
            'Interrupted',
        ]);
        has('three consecutive iterations without progress', 'GM-6');
        has(
            'an iteration makes progress when it changes a recorded state',
            'the definition of progress',
        );
        has(
            'Repeating a step on unchanged input with an unchanged outcome is no progress',
            'the repeated step',
        );
        has('the mode stops on exactly one of the six conditions', 'the closed list');

        // One report, in the layout, with its consents asked after it.
        for (const line of [
            'Goal: {scope}',
            'Stopped: {done | consent queued | no progress | integrity halt | bound reached | interrupted}',
            '[met]     {criterion} — {evidence}',
            'Work: Phase {N}: {summary} — commit suggestion: {message}',
            'Queued consents: {n}',
        ]) {
            has(line, 'a line of the report');
        }
        has('are asked after the report, only now (GM-5)', 'the consents asked at the stop');
        has(
            "one question, at most three fixed options, the forecast's winner marked as the default",
            'the consent question',
        );
        has('`Next: /magicspec {command} {argument} — {demand} reasoning`', 'the handoff line');

        // The shape of a body: frontmatter, contents, checklist, handoffs.
        assert.match(body, /^---\ndescription: Workflow for goal mode — /);
        for (const heading of [
            '## Entry',
            '## Argument Routing',
            '## Core Invariants (Mandatory)',
            '## Workflow: Pursuit',
            '## Report',
            '## Goal Completion Checklist',
            '## Handoffs',
        ]) {
            assert.ok(body.includes(`\n${heading}\n`), `the body has ${heading}`);
            assert.ok(
                body.includes(`- ${heading.replace(/^## /, '')}\n`),
                `the Contents names ${heading}`,
            );
        }
        has('`/magicspec goal`: name it, with its demand `per step`', 'the continue handoff');
        assert.ok(!/AskUserQuestion/.test(body), 'the body asks no question itself');
    });

    test('the status briefing shows a recorded goal as one line under Position and recommends /magicspec goal first while a criterion is not met, and stays read-only (GM-3, SC-4)', () => {
        const status = readShipped('skills/magicspec/workflows/status.md');
        const page = readShipped('docs/status.md');

        // The line: where it sits, what it holds, when it is absent, and that nothing is re-checked.
        const position = lineWith(status, '2. **Position**');
        assert.ok(position, 'the body has the Position item');
        for (const needle of [
            '`## Goal` section that names a goal',
            '`Goal: {scope} — {met} met, {open} open, {blocked} blocked`',
            '`, {k} consent(s) queued`',
            '`Goal: {scope} — done`',
            'a section that names no goal adds no line',
            're-checks nothing',
        ]) {
            assert.ok(position.includes(needle), `the Position item states: ${needle}`);
        }

        // The next step: the goal comes before every other rule, and a finished goal is passed over.
        const nextStart = status.indexOf('7. **Next**');
        const goalRule = status.indexOf(
            'A goal is recorded and not every criterion is `met`',
            nextStart,
        );
        const firstOther = status.indexOf(
            'STATE.md `Next Action` states that nothing is pending',
            nextStart,
        );
        assert.ok(
            nextStart !== -1 && goalRule > nextStart && goalRule < firstOther,
            'the goal rule is the first line of Next',
        );
        assert.ok(
            status.includes(
                '→ `/magicspec goal`, which continues it; this comes before every line below',
            ),
        );
        assert.ok(status.includes('a goal with no criteria yet counts as not met'));
        assert.ok(
            status.includes('A goal whose criteria are all `met` is done and is passed over.'),
        );

        // The resume line, the checklist and the handoff follow, and the briefing is still read-only.
        assert.ok(
            status.includes('a task recorded `In Progress`, a recorded goal, or both in one line'),
        );
        assert.ok(
            status.includes('`/magicspec goal` recommended first while a criterion is not `met`'),
        );
        assert.ok(
            status.includes(
                '- **Continue a goal** → `/magicspec goal`: Continue the recorded goal in a new session. Condition: `goal_open`.',
            ),
        );
        assert.ok(
            status.includes('this workflow performs ZERO writes'),
            'the read-only invariant is untouched',
        );
        assert.ok(!/update-state/.test(status), 'the briefing names no writer');

        // The page says the same.
        for (const needle of [
            'a recorded goal adds one line',
            '`Goal: {scope}',
            '`/magicspec goal` first while a recorded goal',
        ]) {
            assert.ok(page.includes(needle), `docs/status.md states: ${needle}`);
        }
    });

    test('shipped text: spec and analyze end at their boundary and name plan; rule, status and help name the stage that owns what they recommend (PS-1, PL-5)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const analyze = readShipped('skills/magicspec/workflows/analyze.md');
        const rule = readShipped('skills/magicspec/workflows/rule.md');
        const status = readShipped('skills/magicspec/workflows/status.md');
        const help = readShipped('skills/magicspec/workflows/help.md');

        // spec: the handoff names the plan and starts nothing, unless the request asked for it.
        assert.ok(
            spec.includes(
                '- **Pipeline**: `/magicspec spec` → `/magicspec plan` → `/magicspec task` → `/magicspec run`. One stage per invocation',
            ),
        );
        const handoff = lineWith(spec, '**Handoff (C9 default, one stage)**');
        assert.ok(handoff, 'spec.md carries the one-stage handoff');
        for (const needle of [
            'end the invocation',
            'named, never started',
            'Next: /magicspec plan {workspace}',
            "When the request's own words asked for the following stage too",
            'say in one line that the request asked for it',
        ]) {
            assert.ok(handoff.includes(needle), `the spec handoff states: ${needle}`);
        }
        assert.ok(
            spec.includes(
                '- **Plan** → `/magicspec plan`: Name it as the next step, with the workspace; it is not started here (one stage per invocation).',
            ),
        );
        assert.ok(
            spec.includes('**Trigger**: the pre-flight of `/magicspec plan` or *"Verify specs"*.'),
        );

        // analyze: the same boundary for the reverse-engineering dispatch, and the remedies name the plan.
        const analyzeHandoff = lineWith(analyze, '**Handoff (C9 / DA-6 / DA-9)**');
        assert.ok(analyzeHandoff, 'analyze.md carries the handoff');
        for (const needle of [
            'then end the invocation',
            'named, never started',
            '/magicspec plan is next',
            "the request's own words asked for the following stage too",
        ]) {
            assert.ok(analyzeHandoff.includes(needle), `the analyze handoff states: ${needle}`);
        }
        assert.ok(analyze.includes('**Plan Sync needed** → emit `→ /magicspec plan`'));
        assert.ok(analyze.includes('`→ /magicspec plan {ws}` to plan a containment-cleanup task'));
        assert.ok(analyze.includes('- **Plan repairs** → `/magicspec plan`'));
        for (const [name, text] of [
            ['spec.md', spec],
            ['analyze.md', analyze],
        ]) {
            assert.ok(
                !/automatically invoke|Auto-Handoff|invoking \/magicspec (?:task|plan)/i.test(text),
                `${name} invokes no later stage`,
            );
        }

        // rule: the rule feeds the plan.
        assert.ok(rule.includes('Rule changes feed into `/magicspec plan` (plan updates)'));
        assert.ok(
            rule.includes(
                'default `/magicspec plan {workspace}` (propagate the rule into the plan)',
            ),
        );
        assert.ok(rule.includes('- **Update the plan** → `/magicspec plan`'));
        assert.ok(
            !/\/magicspec task \{workspace\} update/.test(rule),
            'the update spelling is gone',
        );

        // status and help compute the recommendation in the same pipeline order.
        const orderOf = (text, tokens) => tokens.map((t) => text.indexOf(t));
        const statusStep = lineWith(status, 'Absent → compute by pipeline order');
        const helpStep = lineWith(help, '4. Find the recommended command');
        assert.ok(statusStep && helpStep);
        for (const [text, tokens] of [
            [
                statusStep,
                ['/magicspec spec', '/magicspec plan', '/magicspec task', '/magicspec run'],
            ],
            [helpStep, ['→ `spec`', '→ `plan`', '→ `task`', '→ `run`']],
        ]) {
            const at = orderOf(text, tokens);
            assert.ok(
                at.every((i) => i !== -1) && at.every((i, k) => k === 0 || i > at[k - 1]),
                `the order is spec, plan, task, run in: ${text.slice(0, 80)}`,
            );
        }
        assert.ok(
            statusStep.includes('older than the registry or the constitution') &&
                helpStep.includes('older than the registry or the constitution'),
        );
        assert.ok(status.includes('plus the recommendation to run `/magicspec plan {workspace}`'));
        assert.ok(status.includes('- **Replan** → `/magicspec plan`'));
    });

    test('shipped text: each stage names what it reads and never guesses a missing record, and the plan and the tasks each end complete for the next stage (PS-3, PL-9)', () => {
        const reads = {
            spec: "- **Reads**: the idea, the constitution, the registry, and the specifications on the idea's topic.",
            plan: '- **Reads**: the registry, the headers, overviews and invariants of the Stable specifications, the constitution, the plan with its backlog, the `provides` of finished phases, and a replan directive a later stage left for it',
            task: "- **Reads**: the plan's active (or next) phase, the sections of the specifications that phase holds, the constitution, and the ledger and workbooks it updates.",
            run: '- **Reads**: the active phase workbook, the sections of the specifications its tasks cite, and the code.',
        };
        for (const [body, line] of Object.entries(reads)) {
            const text = readShipped(`skills/magicspec/workflows/${body}.md`);
            assert.ok(text.includes(line), `${body}.md carries its Reads line`);
            assert.strictEqual(
                text.split('- **Reads**:').length - 1,
                1,
                `${body}.md has one Reads line`,
            );
            assert.ok(
                text.includes(
                    'A missing record of an earlier stage is reported as a finding and never guessed.',
                ),
                `${body}.md never guesses a missing record`,
            );
        }
        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const task = readShipped('skills/magicspec/workflows/task.md');
        assert.ok(
            plan.includes(
                'the plan names, for each phase, its specifications, the order and the reason for it, the dependencies that order rests on, and for each backlog item its disposition',
            ),
        );
        assert.ok(
            plan.includes(
                'so `/magicspec task` decomposes the phase without reading what this workflow read',
            ),
        );
        assert.ok(
            task.includes(
                'each task names the specification section it implements and its `Verify` line, so `/magicspec run` executes it without reading the plan',
            ),
        );
    });

    test('the constitution and its shipped template say the same about the four stages: C2 names the command set, C9 runs each stage autonomously and lets only goal chain them, C24 puts the planner gate in plan.md', () => {
        const constitution = readShipped('.magicspec/RULES.md');
        const template = readShipped('skills/magicspec/templates/rules.md');
        const sectionOf = (text, id) => {
            const start = text.indexOf(`### ${id} `);
            assert.notStrictEqual(start, -1, `${id} is in the text`);
            const end = text.indexOf('\n### ', start + 5);
            return text.slice(start, end === -1 ? undefined : end);
        };
        for (const id of ['C2', 'C9']) {
            assert.strictEqual(
                sectionOf(template, id),
                sectionOf(constitution, id),
                `${id} is the same word for word in the template`,
            );
        }
        const c2 = sectionOf(constitution, 'C2');
        assert.ok(
            c2.includes(
                'The command set as it ships: `spec`, `plan`, `task`, `run`, `fix`, `simulate`, `goal`, `analyze`, `rule`, `status`, `graph`, `migrate`, `sync` and `help`. `audit` is',
            ),
        );
        assert.ok(
            !c2.includes('authorized C2 exception that joins with its own delivery'),
            'no exception is left to come',
        );
        assert.ok(c2.includes('`audit` is an alias of `analyze` and not a command'));
        const c9 = sectionOf(constitution, 'C9');
        for (const needle of [
            'executes each stage of the SDD lifecycle (specify: Draft → RFC → Stable; plan; task; run) autonomously',
            'One stage per invocation',
            'naming the next command with its reasoning demand',
            "it never starts the next stage itself, unless the request's own words asked for it",
            '`goal` is the one command that chains the stages',
        ]) {
            assert.ok(c9.includes(needle), `C9 states: ${needle}`);
        }
        assert.ok(!c9.includes('executes the full SDD lifecycle'), 'the old sentence is gone');
        for (const text of [constitution, template]) {
            assert.ok(
                text.includes(
                    '| `plan.md` | Before `Plan Write-back` | `@role:planner` | `roles/planner.md` |',
                ),
                'the planner gate is in plan.md',
            );
            assert.ok(
                !text.includes('| `task.md` | Before `Plan Write-back`'),
                'and no longer named for task.md',
            );
            assert.ok(
                text.includes('| `task.md` | Task Instruction Review (before Plan Write-back) |'),
                'the task instruction review stays with task.md',
            );
        }
        // The amendment is a minor bump with its history row, and the ledger records the constitution it was written against.
        const version = /\*\*Version:\*\* (\S+)/.exec(constitution)[1];
        const historyRows = constitution.split('\n');
        assert.ok(
            historyRows.some((line) => line.startsWith(`| ${version} |`)),
            'the current version has its history row',
        );
        const stagesRow = historyRows.find((line) => line.startsWith('| 1.19.0 |'));
        assert.ok(
            stagesRow?.includes('**The pipeline is four stages**'),
            'the amendment that made the pipeline four stages keeps its history row',
        );
        const ledger = readShipped('.magicspec/engine/TASKS.md');
        assert.ok(
            ledger.includes(`**Based on RULES:** .magicspec/RULES.md v${version}`),
            'TASKS.md records the current constitution version',
        );
    });

    test('the planner card triggers on plan.md, its mirror carries it word for word, the task instruction review stays with task.md, and the listings agree', () => {
        const card = readShipped('skills/magicspec/roles/planner.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        for (const line of [
            '  - workflow: plan.md',
            '    gate: "Plan Write-back"',
            'Own plan construction in `plan.md`.',
            '1. Read all specs the plan holds or the draft places: their headers, overviews and invariants.',
            '3. Group specifications into phases that minimize cross-phase dependencies.',
            '4. Draft `PLAN.md` with phase summaries, the specifications each phase holds, the order and the reason for it.',
            '8. Write back to `PLAN.md` only; the task ledger belongs to `task.md`.',
            '9. End at the stage boundary: the plan is the record, and `/magicspec task` is named as the next step, never started.',
        ]) {
            assert.ok(card.includes(line), `the card carries: ${line}`);
            assert.ok(mirror.includes(line), `the mirror carries: ${line}`);
        }
        assert.ok(!card.includes('workflow: task.md'), 'the card no longer triggers on task.md');
        assert.ok(
            !/active-phase tasks|task dependency graph/.test(card),
            'and no longer plans tasks',
        );

        // The prompt-engineer's gate in task.md is untouched.
        const governance = readShipped('skills/magicspec/roles/prompt-engineer.md');
        assert.ok(
            /workflow: task\.md/.test(governance),
            'the task instruction review stays with task.md',
        );

        // The listings: the index row, the integration table and the reference list.
        const index = readShipped('.magicspec/engine/specifications/l2-role-cards.md');
        assert.ok(
            index.includes('| `planner` | advisor | `plan.md` → Plan Write-back | execution |'),
        );
        const integration = readShipped('.magicspec/engine/specifications/l2-role-integration.md');
        assert.ok(
            integration.includes(
                '| `plan.md` | Plan Write-back | `planner` | `skills/magicspec/roles/planner.md` |',
            ),
        );
        assert.ok(
            integration.includes(
                '| `[PLAN]` | `skills/magicspec/workflows/plan.md` | Host of planner integration. |',
            ),
        );
        assert.ok(
            !integration.includes('| `task.md` | Plan Write-back | `planner`'),
            'no gate row names task.md for the planner',
        );
    });

    test('the spec-critic card carries the coherence check as its first step, its mirror carries it word for word, and the Post-Update Review runs it before the lenses and the Instruction Quality Pass (CH-1, CH-4, CH-6, CH-7, CH-9)', () => {
        const card = readShipped('skills/magicspec/roles/spec-critic.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-governance.md');
        const protocol = card.slice(card.indexOf('## Operating Protocol'));
        const step = stepBlock(protocol, '1.');
        assert.ok(
            step?.startsWith('1. **Coherence check (runs first):**'),
            'the coherence check is step 1 of the card',
        );
        for (const needle of [
            'every other specification that touches the same mechanics, whether or not it is declared in `Related Specifications`',
            'Search the specification text of every registered workspace for each name',
            'direct neighbours of the specification in the specification graph',
            'Archives, history tables and retrospectives are history and never part of the set',
            '*contradiction*',
            '*duplicate definition*',
            '*interaction gap*',
            'the exact text of both sides with file and section',
            'blocks promotion until it is resolved in the same invocation',
            'decide by the Consequence Forecast and record the premise as an `Assumption (forecast)`',
            'replacing one copy with a link',
            'is reported as `superseded` and does not block',
            '`[Coherence] {N} artifacts compared — {k} findings`',
            'zero findings print only the first line',
            'A patch-level change (typo fix, clarification) introduces no mechanic',
        ]) {
            assert.ok(step.includes(needle), `step 1 states: ${needle}`);
        }
        assert.strictEqual(
            (card.match(/^\d+\. \*\*Coherence/gm) ?? []).length,
            1,
            'one step of the card is named coherence',
        );
        assert.ok(
            card.includes(
                '5. **Internal consistency:** Does the document read consistently after edits?',
            ),
            'the old coherence line is renamed',
        );
        assert.ok(
            lineWith(card, '10. Emit PASS or FAIL')?.includes(
                'PASS is never emitted without step 1 having run (CH-6)',
            ),
            'the verdict needs the check',
        );
        assert.ok(mirror.includes(step), 'the mirror carries the step word for word');
        for (const line of card
            .split('\n')
            .filter(
                (l) =>
                    /^(10|[2-9])\. /.test(l) &&
                    !l.includes('Regulation Necessity') &&
                    !l.includes('Sync Check'),
            )) {
            assert.ok(mirror.includes(line), `the mirror carries: ${line.slice(0, 60)}`);
        }

        // The Post-Update Review of the specification workflow.
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const review = spec.slice(
            spec.indexOf('### Post-Update Review (Mandatory)'),
            spec.indexOf('### Graph Refresh (Post-Dispatch)'),
        );
        const at = (marker) => {
            const i = review.indexOf(marker);
            assert.notStrictEqual(i, -1, `the review has: ${marker}`);
            return i;
        };
        assert.ok(
            at('**Coherence check (first stage)**') < at('**Spec Council'),
            'the check runs before the lenses',
        );
        assert.ok(
            at('**Spec Council') < at('**Instruction Quality Pass (second stage)**'),
            'and the Instruction Quality Pass is last',
        );
        const stage = lineWith(review, '**Coherence check (first stage)**');
        for (const needle of [
            'A contradiction or an interaction gap blocks promotion',
            'declare as a supersession',
            '`superseded`',
            '`[Coherence] {N} artifacts compared — {k} findings`',
        ]) {
            assert.ok(stage.includes(needle), `the review stage states: ${needle}`);
        }
        assert.ok(
            lineWith(review, '3. **Ecosystem & Extensibility Lens')?.includes(
                'every other specification that shares a mechanic with it',
            ),
            'the Ecosystem lens composes with the comparison set',
        );
        assert.ok(spec.includes('☐ Coherence (CH-4):'), 'the checklist has the coherence line');
        assert.ok(
            !review.includes('Planning Audit in `task.md`'),
            'the analog names plan.md, where the Planning Audit lives',
        );
    });

    test('the planner card carries the plan check, its mirror carries it word for word, and plan.md runs it in the Planning Audit with one halt toward /magicspec spec (CH-5, CH-6, CH-7)', () => {
        const card = readShipped('skills/magicspec/roles/planner.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-execution.md');
        const step = cardLine(
            'skills/magicspec/roles/planner.md',
            '6. **Plan check (mandatory, before write-back):**',
        );
        assert.ok(step, 'the plan check is step 6 of the card');
        for (const needle of [
            '(a) the other phases of the same plan',
            '(b) the plan of every other workspace `workspace.json` registers',
            '(c) what archived phases record as delivered',
            'Read only the matching entries',
            '*ordering conflict*',
            '*contradiction*',
            '*duplicate definition*',
            '*interaction gap*',
            'the exact text of both sides with file and section',
            'Resolve every finding before the plan is written',
            'assign work duplicated across workspaces to one workspace and reference it from the other',
            'halt once with the single recommendation `/magicspec spec`, quoting both sides',
            'this card writes no specification',
            '`[Coherence] {N} artifacts compared — {k} findings`',
            'The audit is not passed without this step (CH-6)',
        ]) {
            assert.ok(step.includes(needle), `step 6 states: ${needle}`);
        }
        assert.ok(mirror.includes(step), 'the mirror carries the step word for word');
        assert.ok(
            card.indexOf('5. **Adversarial pass') < card.indexOf(step) &&
                card.indexOf(step) < card.indexOf('7. **Scenario list') &&
                card.indexOf('7. **Scenario list') < card.indexOf('8. Write back'),
            'the plan check sits between the adversarial pass and the write-back',
        );
        assert.ok(
            card.includes(
                '- Passing the audit without the plan check, or comparing the draft only with its own plan.',
            ),
            'the anti-pattern is there',
        );

        const plan = readShipped('skills/magicspec/workflows/plan.md');
        const audit = stepBlock(plan.slice(plan.indexOf('\n### Steps')), '5.');
        const check = lineWith(audit, '**Plan check (CH-5)**');
        assert.ok(check, 'Step 5 lists the plan check');
        for (const needle of [
            'with the plan of every other registered workspace',
            'archived phases record as delivered',
            '**HALT** once with the single recommendation',
            '`/magicspec spec`',
            'this workflow writes no specification',
            '`[Coherence] {N} artifacts compared — {k} findings`',
        ]) {
            assert.ok(check.includes(needle), `the plan check line states: ${needle}`);
        }
        assert.ok(plan.includes('☐ Plan check (CH-5):'), 'the checklist has the plan check');
        assert.ok(
            lineWith(plan, '**Author what the plan cannot place**')?.includes(
                'Step 5 (the plan check)',
            ),
            'the handoff names the new halt',
        );
    });

    test('ventilation resolves the same four classes through the same resolutions and the specification template says where a supersession is declared (CH-8, CH-9)', () => {
        const analyze = readShipped('skills/magicspec/workflows/analyze.md');
        const line = lineWith(analyze, '7a. **Cross-Artifact Coherence (`COHERENCE`)**');
        assert.ok(line, 'Mode C has step 7a');
        for (const needle of [
            '*contradiction*',
            '*duplicate definition*',
            '*interaction gap*',
            '*ordering conflict*',
            'in plans only',
            '`COHERENCE {class} {file-a} §{x} ↔ {file-b} §{y}`',
            '`COHERENCE superseded`',
            '`→ /magicspec spec amend {file}`',
            '`→ /magicspec plan {ws}`',
            'Assumption (forecast)',
            'no artifact is rewritten during ventilation',
        ]) {
            assert.ok(line.includes(needle), `step 7a states: ${needle}`);
        }
        assert.ok(
            analyze.indexOf('7a. **Cross-Artifact') <
                analyze.indexOf('8. **Specification Knowledge Graph**'),
            'the step precedes the graph step and no later step was renumbered',
        );
        assert.ok(
            lineWith(analyze, '| **Coherence** |')?.includes('never by the audit'),
            'the findings schema has its row',
        );
        const template = readShipped('skills/magicspec/templates/spec.md');
        const notes = template.slice(
            template.indexOf('## 6. Implementation Notes'),
            template.indexOf('## 7. Drawbacks'),
        );
        assert.ok(
            notes.includes('is declared here') &&
                notes.includes('name each specification and section it supersedes'),
            'the template says where a supersession is declared',
        );
    });
};
