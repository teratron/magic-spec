'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const _os = require('os');
const { spawnSync } = require('child_process');
const { createTempWorkspace, requireFromFixture, cleanup } = require('./lib/base');
const { shippedRoot, readShipped, lineWith, feedbackRunner } = require('./lib/sim');

module.exports = () => {
    test('the input pass is defined once in the prompt-engineer card, its mirror carries it, every shipped body is a trigger, and every body names it in one line right after its argument parsing (IP-1 to IP-7)', () => {
        const card = readShipped('skills/magicspec/roles/prompt-engineer.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-governance.md');
        const section = card.slice(
            card.indexOf('## Input Pass'),
            card.indexOf('## Idea Intake Gate Audit'),
        );
        assert.ok(
            section.length > 0 && card.indexOf('## Input Pass') !== -1,
            'the card has the section',
        );
        const items = section.split('\n').filter((l) => /^[1-7]\. /.test(l));
        assert.strictEqual(items.length, 7, 'seven items');
        const expected = [
            ['1. **Coverage:**', 'names, flags or paths', 'runs no pass'],
            [
                '2. **Nothing lost:**',
                'listed as set aside, with the reason',
                'wins any dispute over the person',
            ],
            [
                '3. **Request apart from material:**',
                'quoted or referenced unchanged',
                'is not followed',
            ],
            [
                '4. **Intent statement:**',
                'the request in one precise paragraph',
                'the PQ-3 dimension',
            ],
            [
                '5. **Findings:**',
                'F1 incoherence, F2 essence ambiguity',
                'it never becomes a question',
            ],
            ['6. **Silent by default:**', 'print nothing', '`[Intake] Understood as: {statement}`'],
            ['7. **Bar:**', 'PQ-4 precision bar', 'never a verdict'],
        ];
        expected.forEach((needles, i) => {
            for (const needle of needles)
                assert.ok(items[i].includes(needle), `item ${i + 1} states: ${needle}`);
            assert.ok(mirror.includes(items[i]), `the mirror carries item ${i + 1}`);
        });
        assert.ok(
            mirror.includes('**Input Pass:** Runs before a workflow acts on human prose'),
            'the mirror carries the section lead',
        );

        // Triggers: exactly the shipped bodies, one `Input Pass` gate each.
        const bodies = fs
            .readdirSync(path.join(shippedRoot, 'skills/magicspec/workflows'))
            .filter((f) => f.endsWith('.md'))
            .map((f) => f.slice(0, -3))
            .sort();
        assert.strictEqual(bodies.length, 14, 'fourteen shipped bodies');
        const triggered = [...card.matchAll(/- workflow: (\S+)\.md\n {4}gate: "Input Pass"/g)]
            .map((m) => m[1])
            .sort();
        assert.deepStrictEqual(
            triggered,
            bodies,
            'every shipped body, and no other, is an Input Pass trigger',
        );
        for (const body of bodies)
            assert.ok(
                mirror.includes(`  - workflow: ${body}.md\n    gate: "Input Pass"`),
                `the mirror lists ${body}`,
            );

        // Every body: one line, naming the section, placed between its argument parsing and the next step.
        const placement = {
            'skills/magicspec/workflows/plan.md': [
                '## Argument Routing',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec/workflows/task.md': [
                '## Argument Routing',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec/workflows/run.md': [
                '## Argument Routing',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec/workflows/analyze.md': [
                '## Argument Routing',
                '## Workspace Resolution',
            ],
            'skills/magicspec/workflows/rule.md': ['## Entry', '## Core Invariants (Mandatory)'],
            'skills/magicspec/workflows/status.md': ['## Entry', '## Core Invariants (Mandatory)'],
            'skills/magicspec/workflows/migrate.md': ['## Entry', '## Core Invariants (Mandatory)'],
            'skills/magicspec/workflows/help.md': ['## Entry', '## Core Invariants (Mandatory)'],
            'skills/magicspec/workflows/graph.md': [
                '## Steps',
                '### 1. Build the Specification Knowledge Graph',
            ],
            'skills/magicspec/workflows/fix.md': [
                '**Trigger:** `/magicspec fix [defect]`',
                '**Scope:**',
            ],
            'skills/magicspec/workflows/simulate.md': [
                '## Argument Routing',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec/workflows/goal.md': [
                '## Argument Routing',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec-dev/workflows/init.md': ['## Arguments', '## Agent Map'],
            'skills/magicspec-dev/workflows/fix.md': ['**Command:**', '## Inputs'],
            'skills/magicspec-dev/workflows/test.md': [
                '**Scope:**',
                '## Core Invariants (Mandatory)',
            ],
            'skills/magicspec-dev/workflows/release.md': [
                '# Release Workflow',
                '## Agent Guidelines',
            ],
            'skills/magicspec-dev/workflows/sync.md': [
                '# Sync Workflow',
                'Pipeline (orchestrated by',
            ],
        };
        for (const [rel, [before, after]] of Object.entries(placement)) {
            const text = readShipped(rel);
            const lines = text.split('\n').filter((l) => l.startsWith('**Input Pass**:'));
            assert.strictEqual(lines.length, 1, `${rel} carries one Input Pass line`);
            const where = text.indexOf(lines[0]);
            assert.ok(
                text.indexOf(before) !== -1 && text.indexOf(before) < where,
                `${rel}: after ${before}`,
            );
            assert.ok(text.indexOf(after, where) !== -1, `${rel}: before ${after}`);
            const cardPath = rel.startsWith('skills/magicspec-dev/')
                ? '`skills/magicspec/roles/prompt-engineer.md`'
                : '`roles/prompt-engineer.md`';
            for (const needle of [
                cardPath,
                'section `## Input Pass`',
                'arguments that are only names, flags or paths run no pass',
                'never asked (IP-5)',
            ]) {
                assert.ok(lines[0].includes(needle), `${rel}: the line states ${needle}`);
            }
        }
        assert.ok(
            lineWith(readShipped('skills/magicspec/workflows/task.md'), '**Input Pass**:').includes(
                'T4 Capture of Core Invariant 4',
            ),
            'task hands a set-aside rule clause to the T4 Capture',
        );
        assert.ok(
            lineWith(readShipped('skills/magicspec/workflows/help.md'), '**Input Pass**:').includes(
                'before `spec` is offered with it',
            ),
            'help passes typed text through the pass before offering spec',
        );
        // goal starts with the intake (IP-6): its statement runs the pass, a phase and a count are names, and the card says the comprehension check is performed in `goal` too.
        assert.ok(
            lineWith(readShipped('skills/magicspec/workflows/goal.md'), '**Input Pass**:').includes(
                'a phase and a count are names and run none',
            ),
            'goal runs the pass for a statement and none for a phase or a count',
        );
        assert.ok(
            card.includes(
                '5. **Findings:** in `spec` — and in `goal`, which starts with it — they feed the intake gate',
            ),
            'the card widens item 5 to goal (IP-6)',
        );
        assert.ok(
            mirror.includes(
                '5. **Findings:** in `spec` — and in `goal`, which starts with it — they feed the intake gate',
            ),
            'and so does its mirror',
        );

        // The specification workflow: the pass is the first step, the intake gate judges comprehension on its statement.
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const passAt = spec.indexOf('### Input Pass (First Step, Before Step 0)');
        assert.notStrictEqual(passAt, -1, 'the specification workflow has the pass section');
        assert.ok(
            passAt < spec.indexOf('### Step 0: Workspace Intent Detection'),
            'the pass precedes Step 0',
        );
        assert.ok(
            lineWith(spec, '2. **Gate 1 — comprehension (IK-4)**')?.includes(
                'Judged in the `prompt-engineer` stance, on the intent statement the Input Pass produced',
            ),
            'Gate 1 runs on the statement',
        );
        assert.ok(
            spec.includes('run the Input Pass of `roles/prompt-engineer.md`'),
            'the pass names the card',
        );
        assert.ok(
            spec.includes('its IK-7 line below is the one printed, once'),
            'one intake line per invocation',
        );
        assert.ok(spec.includes('☐ Input Pass (IP):'), 'the checklist has the line');

        // The listings.
        const integration = readShipped('.magicspec/engine/specifications/l2-role-integration.md');
        assert.ok(
            integration.includes(
                '| every shipped workflow body (`spec.md`, `plan.md`, `task.md`, `run.md`, `analyze.md`, `rule.md`, `status.md`, `graph.md`, `migrate.md`, `help.md`, `fix.md`, `simulate.md`) | Input Pass',
            ),
            'the integration map has the row',
        );
        assert.ok(
            readShipped('.magicspec/engine/specifications/l2-role-cards.md').includes(
                'every shipped workflow body → Input Pass',
            ),
            'the card index has it',
        );
    });

    test('the constitution and its shipped template carry the Input Pass row of C24 word for word, and the amendment has its history row', () => {
        const row =
            '| every workflow body | Input Pass (before the workflow acts on prose) | `@role:prompt-engineer` | `roles/prompt-engineer.md` |';
        const constitution = readShipped('.magicspec/RULES.md');
        const template = readShipped('skills/magicspec/templates/rules.md');
        for (const text of [constitution, template]) {
            assert.strictEqual(text.split(row).length - 1, 1, 'the row is in the table once');
            assert.ok(
                text.indexOf(row) >
                    text.indexOf('| `analyze.md` | Prompt Quality Audit (Mode C) |'),
                'after the audit row',
            );
            assert.ok(
                text.includes('16 registered role cards'),
                'the card count follows the registry',
            );
        }
        const historyRow = constitution
            .split('\n')
            .find((line) => line.includes('**C24 gains the Input Pass row**'));
        assert.ok(historyRow?.startsWith('| 1.20.0 |'), 'the amendment has its own history row');
        assert.ok(historyRow.includes('origin `user-stated`'), 'with its origin');
    });

    test('the text an argument form returns passes the Input Pass in every body that has a form, and a chosen suggestion passes none (CS-10 item 5, IP-1)', () => {
        const spec = readShipped('skills/magicspec/workflows/spec.md');
        const help = readShipped('skills/magicspec/workflows/help.md');
        const rule = readShipped('skills/magicspec/workflows/rule.md');
        const card = readShipped('skills/magicspec/roles/prompt-engineer.md');
        const mirror = readShipped('.magicspec/engine/specifications/l2-role-cards-governance.md');

        const hint = lineWith(spec, '- **Command Intake (E7)**');
        assert.ok(
            hint.includes('Text typed into the form passes the Input Pass, then Step 0.5'),
            'the E7 hint names the pass',
        );
        assert.ok(
            hint.includes('a suggestion the person chooses is engine-made text and passes no pass'),
            'and spares a chosen suggestion',
        );
        const blank = lineWith(spec, '4. The collected idea passes Step 0.5 and then Dispatch');
        assert.ok(
            blank?.includes(
                'typed text first passes the Input Pass, a chosen suggestion is engine-made text and passes none',
            ),
            'the Blank Trigger step names the pass',
        );
        assert.ok(
            !spec.includes(
                'The collected idea — a chosen suggestion or typed text — passes Step 0.5',
            ),
            'no line sends the form text straight to the gate',
        );
        assert.ok(
            lineWith(spec, '☐ Command Intake (E7)')?.includes(
                'typed text passed the Input Pass and the returned idea passed Step 0.5',
            ),
            'the checklist asks for it',
        );

        const item = lineWith(
            help,
            '5. Free text entered in a form is read exactly as a typed argument is',
        );
        assert.ok(
            item?.includes('it passes the Input Pass before the command runs'),
            'help Step 4 names the pass',
        );
        assert.ok(
            item.includes('a suggestion the person chooses is engine-made text and passes none'),
            'and spares a chosen suggestion',
        );

        const collected = lineWith(rule, '3. **Collected**');
        assert.ok(
            collected?.includes(
                'the text the person typed passes the Input Pass, then continues at Operational Logic step 2',
            ),
            'the rule form names the pass',
        );
        assert.ok(
            collected.includes(
                'a chosen suggestion is an engine-made candidate and passes no pass',
            ),
            'and spares a chosen candidate',
        );

        const covered =
            "a goal, text entered in an argument form, or the person's message that accompanies the invocation.";
        assert.ok(card.includes(covered), 'the card covers text entered in an argument form');
        assert.ok(mirror.includes(covered), 'and the mirror carries it');
    });

    test("feedback note: closed kinds, required text, the limits named, the engine's own evidence, the channel switch read, exit 0 on every path (EF-1, EF-5, EF-6, EF-7, EF-10, EF-11)", () => {
        const tempDir = createTempWorkspace();
        try {
            const { executor, feedback } = feedbackRunner(tempDir);
            const storeFile = path.join(tempDir, '.magicspec', '.cache', 'feedback.json');
            const readStore = () => JSON.parse(fs.readFileSync(storeFile, 'utf8'));
            const valid = [
                'note',
                '--kind=bug',
                '--summary=finalize fails on an empty phase',
                '--tried=ran finalize after a run',
                '--happened=exit status 1 and no entry',
            ];

            // Evidence the engine observed in the same workflow: a finding recorded just before the note.
            const recorded = spawnSync(
                process.execPath,
                [
                    executor,
                    'record-diagnostic',
                    '--severity=warning',
                    '--code=CLI_PROBE',
                    '--message=probe',
                ],
                { cwd: tempDir, encoding: 'utf8' },
            );
            assert.strictEqual(recorded.status, 0);
            const first = feedback(
                ...valid,
                '--impact=blocked',
                '--engine-file=scripts/finalize.js',
                '--code=FINALIZE_EMPTY_PHASE',
                '--workflow=run',
                '--script=finalize',
                '--exit-status=1',
            );
            assert.strictEqual(first.status, 0, first.stderr);
            assert.match(first.stdout, /Recorded bug note n1/);
            const note = readStore().notes[0];
            assert.strictEqual(note.kind, 'bug');
            assert.strictEqual(note.tried, 'ran finalize after a run');
            assert.strictEqual(note.impact, 'blocked');
            assert.strictEqual(note.engineFile, 'scripts/finalize.js');
            assert.strictEqual(note.workflow, 'run');
            assert.strictEqual(
                note.evidence.engineVersion,
                '1.0.0',
                'the engine version comes from the skill folder',
            );
            assert.deepStrictEqual(
                note.evidence.findingCodes,
                ['CLI_PROBE'],
                'the finding recorded in the same workflow is evidence',
            );
            assert.strictEqual(note.evidence.failingScript, 'finalize');
            assert.strictEqual(note.evidence.exitStatus, 1);
            assert.strictEqual(note.evidence.runtime, process.version);
            assert.ok(
                note.evidence.os && note.evidence.host,
                'the operating system and the host are observed',
            );

            // A failing script that is no command of the executor, and an exit status that is no integer, are not evidence.
            const second = feedback(...valid, '--script=rm -rf', '--exit-status=abc');
            assert.strictEqual(second.status, 0);
            const droppedEvidence = readStore().notes[1].evidence;
            assert.strictEqual(droppedEvidence.failingScript, undefined);
            assert.strictEqual(droppedEvidence.exitStatus, undefined);

            // The digest drain removes no note (EF-1): the store is a different file from the sink.
            const diagnostics = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            assert.deepStrictEqual(
                diagnostics.drain().map((f) => f.code),
                ['CLI_PROBE'],
            );
            assert.match(
                feedback('list').stdout,
                /n1 {2}bug {2}finalize fails on an empty phase/,
                'the note survives the drain',
            );

            // The closed kinds, the required text and the limits: rejected with the reason, exit status 0.
            const rejections = [
                [
                    ['note', '--kind=wish', '--summary=x', '--tried=x', '--happened=x'],
                    /kind must be one of bug, missing-capability, improvement, docs/,
                ],
                [['note', '--kind=bug', '--summary=x', '--happened=x'], /tried is required/],
                [
                    [
                        'note',
                        '--kind=bug',
                        `--summary=${'s'.repeat(121)}`,
                        '--tried=x',
                        '--happened=x',
                    ],
                    /summary is 121 characters; the limit is 120/,
                ],
                [
                    [
                        'note',
                        '--kind=bug',
                        '--summary=x',
                        '--tried=x',
                        `--happened=${'h'.repeat(1201)}`,
                    ],
                    /happened is 1201 characters; the limit is 1200/,
                ],
                [
                    [
                        'note',
                        '--kind=bug',
                        '--summary=x',
                        '--tried=x',
                        '--happened=x',
                        '--impact=huge',
                    ],
                    /impact must be one of/,
                ],
                [
                    [
                        'note',
                        '--kind=bug',
                        '--summary=x',
                        '--tried=x',
                        '--happened=x',
                        '--engine-file=/etc/passwd',
                    ],
                    /engine-file must be a path inside the skill folder/,
                ],
                [
                    [
                        'note',
                        '--kind=bug',
                        '--summary=x',
                        '--tried=x',
                        '--happened=x',
                        '--engine-file=../secret',
                    ],
                    /engine-file must be a path inside the skill folder/,
                ],
                [
                    [
                        'note',
                        '--kind=bug',
                        '--summary=x',
                        '--tried=x',
                        '--happened=x',
                        '--code=lower',
                    ],
                    /code must be UPPER_SNAKE_CASE/,
                ],
            ];
            for (const [args, pattern] of rejections) {
                const result = feedback(...args);
                assert.strictEqual(result.status, 0, `exit 0 for ${args.slice(0, 3).join(' ')}`);
                assert.match(result.stdout, pattern);
                assert.match(result.stdout, /Note rejected/);
            }
            assert.strictEqual(
                readStore().notes.length,
                2,
                'a rejected note leaves the store as it was',
            );

            // The count limit names itself.
            const library = requireFromFixture(tempDir, 'lib', 'feedback.js');
            for (let i = 2; i < library.LIMITS.notes; i++)
                assert.ok(
                    library.addNote(
                        { kind: 'docs', summary: `n${i}`, tried: 't', happened: 'h' },
                        {},
                        tempDir,
                    ).recorded,
                );
            const full = library.addNote(
                { kind: 'docs', summary: 'one too many', tried: 't', happened: 'h' },
                {},
                tempDir,
            );
            assert.strictEqual(full.recorded, false);
            assert.match(full.message, /holds 40 notes, the limit/);

            // The store's byte bound gives way oldest evidence first (EF-5): the oldest notes lose theirs, the newest keep it.
            const store = library.loadStore(tempDir);
            store.notes = Array.from({ length: 30 }, (_, i) => ({
                id: `n${i + 1}`,
                kind: 'docs',
                summary: 's',
                tried: 't',
                happened: 'h',
                evidence: { os: 'x'.repeat(3000) },
            }));
            const saved = library.saveStore(store, tempDir);
            assert.ok(saved.trimmed > 0, 'evidence was dropped');
            const after = readStore().notes;
            assert.strictEqual(after[0].evidence, null, 'the oldest evidence goes first');
            assert.ok(after[29].evidence, 'the newest evidence stays');
            assert.ok(
                fs.statSync(storeFile).size <= library.LIMITS.storeBytes + 4096,
                'the store is within its bound',
            );

            // discard removes one note.
            const discarded = feedback('discard', 'n1');
            assert.match(discarded.stdout, /Discarded note n1/);
            assert.strictEqual(
                readStore().notes.find((n) => n.id === 'n1'),
                undefined,
            );
            assert.match(feedback('discard', 'n999').stdout, /No note n999 is pending/);

            // clean-cache removes what can be rebuilt and never the notes.
            const dry = spawnSync(process.execPath, [executor, 'clean-cache', '--dry-run'], {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.ok(
                !dry.stdout.includes('feedback.json'),
                'the notes are not listed for removal',
            );
            spawnSync(process.execPath, [executor, 'clean-cache'], {
                cwd: tempDir,
                encoding: 'utf8',
            });
            assert.ok(fs.existsSync(storeFile), 'clean-cache keeps the notes');
        } finally {
            cleanup(tempDir);
        }
    });
};
