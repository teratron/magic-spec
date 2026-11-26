// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FINALIZATION: STATE PATCHING, BLOCKED WORK, SIGNIFICANCE AND THE REPORT
// ═══════════════════════════════════════════════════════════════════════════
//
// The state update and the computation of the next step are in finalize-session.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawnSync } = require('child_process');
const {
    TESTS_DIR,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    makeWorkspace,
    createFinalizeFixture,
    commitFixture,
    requirePhaseArchiverWorkspace,
    requireFinalizeWorkspace,
    registryTable,
    requireFinalizePlan,
    requireUpdateState,
    autoProgressState,
} = require('./lib/base');

module.exports = () => {
    test('finalize.js patches STATE.md on the skip path (SC-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { designDir, wsDir, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n*None — plan complete.*\n',
            );
            // No whitelisted file changes after this baseline → skip path.
            commitFixture(tempDir);

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            assert.match(
                out,
                /No significant changes|Finalization complete/,
                'finalize should run on the skip path',
            );
            const statePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(statePath),
                'SC-2: STATE.md created/patched even on the skip path',
            );
            const state = fs.readFileSync(statePath, 'utf8');
            assert.match(state, /\*\*Updated:\*\*/, 'STATE.md carries an Updated timestamp');
            assert.match(
                state,
                /\/magicspec plan main/,
                'SC-2.1 e2e: plan-complete next-action routes through the /magicspec plan funnel',
            );
            assert.doesNotMatch(
                state,
                /Next Action:.*\/magicspec spec/,
                '§5: the persisted Next Action never names /magicspec spec',
            );
            // SC-3 retirement regression pins: the STATE.md write dirties the
            // tree (previously the SC-3 fallback's trigger condition), but no
            // commit-related output is ever emitted any more.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
            assert.match(
                fs.readFileSync(path.join(designDir, '.version'), 'utf8'),
                /^0\.1\.0$/,
                'skip path does not bump the version',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js resolveWorkspaceDir: an explicit --workspace or MAGIC_WORKSPACE always outranks MAGIC_DESIGN_DIR (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize } = requireFinalizeWorkspace(tempDir);
            const designAbs = path.join(tempDir, '.magicspec');
            const savedDesignDir = process.env.MAGIC_DESIGN_DIR;
            const savedWorkspaceEnv = process.env.MAGIC_WORKSPACE;
            try {
                // A stale MAGIC_DESIGN_DIR naming a different workspace must never
                // win over an explicit --workspace flag.
                process.env.MAGIC_DESIGN_DIR = '.magicspec/other';
                delete process.env.MAGIC_WORKSPACE;
                assert.strictEqual(
                    finalize.resolveWorkspaceDir('engine', 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'an explicit --workspace must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Same precedence for MAGIC_WORKSPACE (no CLI flag, but the env
                // var that named `workspace` still outranks MAGIC_DESIGN_DIR).
                process.env.MAGIC_WORKSPACE = 'engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.join(designAbs, 'engine'),
                    'MAGIC_WORKSPACE must win over a disagreeing MAGIC_DESIGN_DIR',
                );

                // Legitimate case: neither a flag nor MAGIC_WORKSPACE was given,
                // so MAGIC_DESIGN_DIR was itself the signal resolveWorkspace()
                // used to name `workspace` — it is trusted as the literal directory.
                delete process.env.MAGIC_WORKSPACE;
                process.env.MAGIC_DESIGN_DIR = '.magicspec/engine';
                assert.strictEqual(
                    finalize.resolveWorkspaceDir(null, 'engine', designAbs),
                    path.resolve(tempDir, '.magicspec/engine'),
                    'MAGIC_DESIGN_DIR is authoritative only when it is the sole naming signal',
                );
            } finally {
                if (savedDesignDir === undefined) delete process.env.MAGIC_DESIGN_DIR;
                else process.env.MAGIC_DESIGN_DIR = savedDesignDir;
                if (savedWorkspaceEnv === undefined) delete process.env.MAGIC_WORKSPACE;
                else process.env.MAGIC_WORKSPACE = savedWorkspaceEnv;
            }
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js does not let a stale MAGIC_DESIGN_DIR redirect STATE.md away from an explicit --workspace (workspace-scoping defect)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
            });
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [ ] [T-1A01] Todo\n',
            );

            // A second, unrelated workspace with its own STATE.md — never named
            // by this invocation's --workspace, only by a stale MAGIC_DESIGN_DIR
            // left in the environment (e.g. from an earlier command in the same
            // shell/session targeting a different workspace).
            const otherWsDir = makeWorkspace(tempDir, 'other');
            const otherStatePath = path.join(otherWsDir, 'STATE.md');
            const sentinel = [
                '# Project State',
                '',
                '**Workspace:** other',
                '**Updated:** 2020-01-01 00:00',
                '**Phase:** 1',
                '**Status:** Active',
                '',
                '## Current Position',
                '',
                '- **Task:** [T-0000] Sentinel — must never change',
                '- **Spec:** sentinel.md',
                '- **Next Action:** SENTINEL-UNTOUCHED',
                '',
            ].join('\n');
            fs.writeFileSync(otherStatePath, sentinel);
            commitFixture(tempDir);

            // An uncommitted, whitelisted change → the success path, matching
            // the shape of the real-world repro (a workflow that just landed
            // new TASKS.md content, then invoked finalize).
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );

            const out = execSync(`node "${finalizePath}" --workflow=task --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
                env: {
                    ...process.env,
                    MAGIC_DESIGN_DIR: '.magicspec/other',
                },
            });

            assert.match(
                out,
                /Finalization complete/,
                'the whitelisted TASKS.md change must still be significant',
            );
            assert.match(
                out,
                /\| Workspace \| main \|/,
                'finalize reports the explicitly-requested workspace',
            );
            assert.match(
                out,
                /\.magicspec[\\/]main[\\/]STATE\.md/,
                'STATE.md update must target the main workspace explicitly, not one named by MAGIC_DESIGN_DIR',
            );
            const mainStatePath = path.join(wsDir, 'STATE.md');
            assert.ok(
                fs.existsSync(mainStatePath),
                'STATE.md must have been created/patched inside the main workspace directory',
            );
            const mainState = fs.readFileSync(mainStatePath, 'utf8');
            assert.match(
                mainState,
                /- \*\*Next Action:\*\* Plan complete/,
                'main STATE.md received the real computed Next Action, not the template placeholder',
            );
            assert.doesNotMatch(
                mainState,
                /SENTINEL/,
                "main STATE.md must never carry the other workspace's sentinel content",
            );

            assert.strictEqual(
                fs.readFileSync(otherStatePath, 'utf8'),
                sentinel,
                'the unrelated workspace named only by a stale MAGIC_DESIGN_DIR must be left byte-for-byte untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction never recommends executing a task in a Blocked phase (SC-2.1(a))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const phaseFile = (status) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${status}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                ].join('\n');

            // The two Blocked signals are written by different steps and are not
            // updated atomically, so each must be sufficient on its own —
            // requiring agreement would wave a half-applied transition through.
            const blockedCases = {
                'frontmatter only': {
                    registry: 'In Progress',
                    phase: 'Blocked',
                },
                'registry row only': {
                    registry: 'Blocked',
                    phase: 'In Progress',
                },
                'both signals': {
                    registry: 'Blocked',
                    phase: 'Blocked',
                },
            };

            for (const [label, state] of Object.entries(blockedCases)) {
                fs.writeFileSync(tasksPath, registryTable(state.registry));
                fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile(state.phase));

                const next = finalize.computeNextAction('run', 'engine', wsDir);
                assert.doesNotMatch(
                    next,
                    /^Execute T-/,
                    `${label}: Blocked phase must not yield an execute-style recommendation → "${next}"`,
                );
                assert.match(next, /T-1A01/, `${label}: the blocked task should still be named`);
                // The redirected value passes the same single-exit screen.
                assert.doesNotMatch(
                    next,
                    /\/magicspec (spec|analyze)/,
                    `${label}: §5 reserved command leaked`,
                );
                assert.strictEqual(
                    (next.match(/\/magicspec [a-z]+/g) || []).length,
                    1,
                    `${label}: exactly one command expected → "${next}"`,
                );
            }

            // Control: an unblocked phase with the same open item still dispatches.
            fs.writeFileSync(tasksPath, registryTable('In Progress'));
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('In Progress'));
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A01/,
                'a healthy phase must still resolve to execution — the guard must not fire on every phase',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction skips a task whose own Detailed Tracking marks it Blocked or Assignment: User (SC-2.1(c))', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, title, status, assignment) =>
                [
                    `### [${id}] ${title}`,
                    '',
                    `- **Status:** ${status}`,
                    `- **Assignment:** ${assignment}`,
                    '',
                ].join('\n');

            const phaseFile = (firstStatus, firstAssignment) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', firstStatus, firstAssignment),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'Agent'),
                ].join('\n');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) first item Status: Blocked → the later actionable item is named.
            // The pre-T-23A01 code named T-1A01 unconditionally here (manually
            // confirmed against the single-match lookup during spec authoring —
            // same shape as the Phase 19 R12 negative-control pattern).
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Blocked', 'Agent'));
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'a Status: Blocked first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (ii) first item Assignment: User → the later actionable item is named.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'User'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A02/,
                'an Assignment: User first item must be skipped for the actionable second item',
            );
            assert.doesNotMatch(
                next,
                /T-1A01/,
                'the excluded task must not be named as executable',
            );

            // (iii) every open item excluded → terminal branch: not Execute-style,
            // not the plan-complete funnel, no reserved command, exactly one
            // /magic.* command named.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] First task',
                    '- [ ] [T-1A02] Second task',
                    '',
                    '## Detailed Tracking',
                    '',
                    trackingBlock('T-1A01', 'First task', 'Blocked', 'Agent'),
                    trackingBlock('T-1A02', 'Second task', 'Todo', 'User'),
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(
                next,
                /^Execute T-/,
                'all-excluded phase must not yield an execute-style recommendation',
            );
            assert.doesNotMatch(
                next,
                /Plan complete/,
                'all-excluded phase must not be reported as plan-complete — tasks remain',
            );
            assert.doesNotMatch(
                next,
                /\/magicspec (spec|analyze)/,
                'reserved command must not leak',
            );
            assert.strictEqual(
                (next.match(/\/magicspec [a-z]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.match(
                next,
                /T-1A01/,
                'the terminal message should still name a task for context',
            );

            // (iv) negative control — everything Todo/Agent still dispatches
            // normally, the same shape as the existing SC-2.1(a) control case.
            fs.writeFileSync(path.join(tasksDir, 'phase-1.md'), phaseFile('Todo', 'Agent'));
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /^Execute T-1A01/,
                'a fully agent-actionable phase must still dispatch its first task',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reads a "- [!]" checklist line as an unfinished, blocked task, never as a finished phase (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);

            const trackingBlock = (id, status) =>
                [
                    `### [${id}] Task ${id}`,
                    '',
                    `- **Status:** ${status}`,
                    '- **Assignment:** Agent',
                    '',
                ].join('\n');
            const phaseFile = (items, tracking) =>
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    ...items,
                    '',
                    '## Detailed Tracking',
                    '',
                    ...tracking,
                ].join('\n');
            const phasePath = path.join(tasksDir, 'phase-1.md');

            fs.writeFileSync(tasksPath, registryTable('In Progress'));

            // (i) the reported shape: every open task written `- [!]`, each
            // tracking entry `Status: Blocked`. Neither glyph was a task to the
            // old reader, so the phase read as finished and the registry row
            // alone produced "Continue Phase 1 via /magicspec run".
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    [
                        '- [!] [T-1A01] First task',
                        '- [!] [T-1A02] Second task',
                    ],
                    [
                        trackingBlock('T-1A01', 'Blocked'),
                        trackingBlock('T-1A02', 'Blocked'),
                    ],
                ),
            );
            const plan = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                {
                    kind: plan.kind,
                    id: plan.id,
                },
                {
                    kind: 'all-excluded',
                    id: 'T-1A01',
                },
                'a phase holding only "- [!]" tasks has open work, none of it executable',
            );
            const next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.doesNotMatch(next, /^Continue Phase/, `registry fallback leaked → "${next}"`);
            assert.doesNotMatch(next, /^Execute T-/, `blocked task offered → "${next}"`);
            assert.doesNotMatch(next, /Plan complete/, `tasks remain → "${next}"`);
            assert.match(next, /T-1A01/, 'the terminal message should still name a task');
            assert.strictEqual(
                (next.match(/\/magicspec [a-z]+/g) || []).length,
                1,
                `exactly one command expected → "${next}"`,
            );
            assert.strictEqual(
                finalize.reconcileStatus(plan, 'Active'),
                'Blocked',
                'the checkpoint Status must agree with the Next Action it was derived with',
            );

            // (ii) the glyph alone is the declaration: a tracking entry that
            // still says Todo does not turn a `- [!]` line back into work.
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    [
                        '- [!] [T-1A01] First task',
                    ],
                    [
                        trackingBlock('T-1A01', 'Todo'),
                    ],
                ),
            );
            assert.strictEqual(finalize.classifyPlanState(wsDir).kind, 'all-excluded');

            // (iii) a blocked line is skipped, not fatal: the next open line in
            // the same phase is named.
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    [
                        '- [!] [T-1A01] First task',
                        '- [ ] [T-1A02] Second task',
                    ],
                    [
                        trackingBlock('T-1A01', 'Blocked'),
                        trackingBlock('T-1A02', 'Todo'),
                    ],
                ),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-1A02/,
                'an open task behind a blocked one must still dispatch',
            );

            // (iv) ...and so is a later phase file's task.
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    [
                        '- [!] [T-1A01] First task',
                    ],
                    [
                        trackingBlock('T-1A01', 'Blocked'),
                    ],
                ),
            );
            fs.writeFileSync(
                path.join(tasksDir, 'phase-2.md'),
                phaseFile(
                    [
                        '- [ ] [T-2A01] Later task',
                    ],
                    [
                        trackingBlock('T-2A01', 'Todo'),
                    ],
                ),
            );
            assert.match(
                finalize.computeNextAction('run', 'engine', wsDir),
                /^Execute T-2A01/,
                'an actionable task in a later phase file must still dispatch',
            );
            fs.rmSync(path.join(tasksDir, 'phase-2.md'));

            // (v) negative control: a `- [!]` quoted in a code span is prose,
            // not a task (SH-1) — a finished plan stays finished.
            fs.writeFileSync(tasksPath, registryTable('Done'));
            fs.writeFileSync(
                phasePath,
                phaseFile(
                    [
                        '- [x] [T-1A01] First task',
                    ],
                    [
                        '### [T-1A01] Task T-1A01',
                        '',
                        '- **Status:** Done',
                        '- **Notes:** a blocked line reads `- [!] [T-1A09] quoted` here.',
                        '',
                    ],
                ),
            );
            assert.strictEqual(
                finalize.classifyPlanState(wsDir).kind,
                'complete',
                'a quoted "- [!]" must not be read as a task in force',
            );

            // (vi) legacy inline layout: the same two outcomes without a phase file.
            fs.rmSync(phasePath);
            fs.writeFileSync(tasksPath, '# Tasks\n\n- [!] [T-1A01] Only task\n');
            const inlineBlocked = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                {
                    kind: inlineBlocked.kind,
                    id: inlineBlocked.id,
                },
                {
                    kind: 'all-excluded',
                    id: 'T-1A01',
                },
                'an inline "- [!]" must not be recommended as executable',
            );
            fs.writeFileSync(
                tasksPath,
                '# Tasks\n\n- [!] [T-1A01] Blocked one\n- [ ] [T-1A02] Open one\n',
            );
            const inlineOpen = finalize.classifyPlanState(wsDir);
            assert.deepStrictEqual(
                {
                    kind: inlineOpen.kind,
                    id: inlineOpen.id,
                },
                {
                    kind: 'inline-open',
                    id: 'T-1A02',
                },
                'an inline open task behind a blocked one must still dispatch',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a "- [!]" checklist line holds its phase back from archival and stays in the progress total (§17)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Done by frontmatter, but one task is unresolved → stays in tasks/.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-30.md'),
                '---\nphase: 30\nname: "Held"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-30A01] Done\n- [!] [T-30A02] Blocked\n',
            );
            // Negative control: the same glyph quoted in a code span is prose.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-31.md'),
                '---\nphase: 31\nname: "Quoting"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-31A01] Done\n\n' +
                    '## Detailed Tracking\n\n### [T-31A01]\n- **Notes:** blocked reads `- [!]` here.\n',
            );
            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                !candidates.includes('phase-30.md'),
                'a phase with a "- [!]" task is unfinished and must not be archived',
            );
            assert.ok(
                candidates.includes('phase-31.md'),
                'a quoted "- [!]" must not block archival',
            );

            // Progress: one done, one blocked, one open → 1 of 3, not 1 of 1.
            const { updateState, wsDir: stateDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(stateDir, 'TASKS.md'),
                [
                    '### Phase 1 Checklist',
                    '',
                    '- [x] [T-1A01] Done',
                    '- [!] [T-1A02] Blocked',
                    '- [ ] [T-1A03] Open',
                    '',
                ].join('\n'),
            );
            fs.writeFileSync(
                path.join(stateDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 1: [0/0] ░░░░░░░░ 0%',
                    '```',
                    '',
                ].join('\n'),
            );
            assert.match(
                autoProgressState(updateState, stateDir),
                /Phase 1: \[1\/3\]/,
                'a blocked task is unfinished work and belongs in the total',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reconciles Status between Active and Blocked at the checkpoint, and only there (SC-1.4)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, tasksPath } = requireFinalizeWorkspace(tempDir);
            const { updateState } = requireFromFixture(tempDir, 'update-state.js');
            const statePath = path.join(wsDir, 'STATE.md');

            const setStatus = (value) => {
                if (!fs.existsSync(statePath)) updateState(wsDir, {});
                const text = fs.readFileSync(statePath, 'utf8');
                fs.writeFileSync(
                    statePath,
                    text.replace(/^\*\*Status:\*\* .*/m, `**Status:** ${value}`),
                );
            };
            const readStatus = () =>
                fs
                    .readFileSync(statePath, 'utf8')
                    .match(/^\*\*Status:\*\* (.+)$/m)[1]
                    .trim();
            const checkpoint = () =>
                finalize.updateSessionState(
                    {
                        workflow: 'run',
                        dryRun: false,
                    },
                    'engine',
                    wsDir,
                );

            const phaseFile = (phaseStatus, trackStatus, trackAssignment) =>
                [
                    '---',
                    'phase: 1',
                    `status: ${phaseStatus}`,
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Scaffold the app',
                    '',
                    '## Detailed Tracking',
                    '',
                    '### [T-1A01] Scaffold the app',
                    '',
                    `- **Status:** ${trackStatus}`,
                    `- **Assignment:** ${trackAssignment}`,
                    '',
                ].join('\n');
            const writeLedger = (registryStatus, phase) => {
                fs.writeFileSync(tasksPath, registryTable(registryStatus));
                const phasePath = path.join(tasksDir, 'phase-1.md');
                if (phase) fs.writeFileSync(phasePath, phaseFile(...phase));
                else
                    fs.rmSync(phasePath, {
                        force: true,
                    });
            };

            // ledger → [start value → value after the checkpoint]. `Paused` is a
            // hand-set value outside the engine's two, so it must survive every
            // ledger state; that column is the (e) control of the reconciliation.
            const ledgers = {
                'open agent task in a healthy phase (a)': {
                    build: () =>
                        writeLedger('In Progress', [
                            'In Progress',
                            'Todo',
                            'Agent',
                        ]),
                    expect: {
                        Active: 'Active',
                        Blocked: 'Active',
                        Paused: 'Paused',
                    },
                },
                'Blocked phase with an open task (b)': {
                    build: () =>
                        writeLedger('In Progress', [
                            'Blocked',
                            'Todo',
                            'Agent',
                        ]),
                    expect: {
                        Active: 'Blocked',
                        Blocked: 'Blocked',
                        Paused: 'Paused',
                    },
                },
                'every open item Blocked (c)': {
                    build: () =>
                        writeLedger('In Progress', [
                            'In Progress',
                            'Blocked',
                            'Agent',
                        ]),
                    expect: {
                        Active: 'Blocked',
                        Blocked: 'Blocked',
                        Paused: 'Paused',
                    },
                },
                'every open item assigned to the user (c)': {
                    build: () =>
                        writeLedger('In Progress', [
                            'In Progress',
                            'Todo',
                            'User',
                        ]),
                    expect: {
                        Active: 'Blocked',
                        Blocked: 'Blocked',
                        Paused: 'Paused',
                    },
                },
                'plan complete (d)': {
                    build: () => writeLedger('Done', null),
                    expect: {
                        Active: 'Active',
                        Blocked: 'Active',
                        Paused: 'Paused',
                    },
                },
                'registry row not Done, no workbook to read': {
                    build: () => writeLedger('In Progress', null),
                    expect: {
                        Active: 'Active',
                        Blocked: 'Blocked',
                        Paused: 'Paused',
                    },
                },
            };

            for (const [label, ledger] of Object.entries(ledgers)) {
                for (const [start, want] of Object.entries(ledger.expect)) {
                    ledger.build();
                    setStatus(start);
                    const result = checkpoint();
                    assert.strictEqual(result.updated, true, `${label}: the checkpoint wrote`);
                    assert.strictEqual(
                        readStatus(),
                        want,
                        `${label}: Status ${start} should read ${want} after the checkpoint`,
                    );
                }
            }

            // One read, two derivations: the two fields cannot describe different plans.
            ledgers['Blocked phase with an open task (b)'].build();
            setStatus('Active');
            checkpoint();
            assert.match(
                fs.readFileSync(statePath, 'utf8'),
                /Next Action:\*\* Resolve blocker on T-1A01/,
            );
            assert.strictEqual(readStatus(), 'Blocked', 'Status and Next Action agree');

            // A preview reports the decision but writes nothing.
            setStatus('Active');
            const before = fs.readFileSync(statePath, 'utf8');
            const originalLog = console.log;
            const logged = [];
            console.log = (...args) => logged.push(args.join(' '));
            try {
                finalize.updateSessionState(
                    {
                        workflow: 'run',
                        dryRun: true,
                    },
                    'engine',
                    wsDir,
                );
            } finally {
                console.log = originalLog;
            }
            assert.strictEqual(fs.readFileSync(statePath, 'utf8'), before, 'dry-run wrote nothing');
            assert.match(logged.join('\n'), /Status=Blocked/, 'dry-run names the decision');

            // (f) The per-task call is not the reconciliation point: a task
            // transition with no --status leaves a stale Blocked alone.
            ledgers['open agent task in a healthy phase (a)'].build();
            setStatus('Blocked');
            updateState(wsDir, {
                task: 'T-1A01 Scaffold the app',
                nextAction: 'Continue',
            });
            assert.strictEqual(
                readStatus(),
                'Blocked',
                'a per-task update must never write Status (SC-1.1)',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js computeNextAction preserves code spans in task titles while still ignoring quoted checklist lines', () => {
        const tempDir = createTempWorkspace();
        try {
            const { finalize, wsDir, tasksDir, writePhase } = requireFinalizePlan(tempDir);

            // (i) a title carrying a backticked path must survive verbatim.
            // `stripQuoted()` (SH-1) blanks matched characters rather than
            // removing them — same line count, not same character offsets —
            // so a title read from the stripped text loses the span. This
            // pins the field regression named `NEXT_ACTION_TITLE_STRIPPED`,
            // introduced by the SC-2.1(c) per-item scan itself.
            writePhase([
                '- [ ] [T-1A01] New `scripts/sync-engine-snapshot.js` (L2 snapshot writer)',
            ]);
            let next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(
                next,
                /`scripts\/sync-engine-snapshot\.js`/,
                `title's code span must survive verbatim → "${next}"`,
            );
            assert.doesNotMatch(
                next,
                / {2}/,
                `no double-space artifact from a blanked span → "${next}"`,
            );

            // (ii) control — the detector must still read stripped text, not
            // raw: a quoted checklist line in prose must not be picked up as
            // a real task. This is the assertion that stops a future fix
            // from reverting to raw content wholesale and reopening SH-1.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-1.md'),
                [
                    '---',
                    'phase: 1',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [ ] [T-1A01] Real actionable task',
                    '',
                    '## Notes',
                    '',
                    '`- [ ] [T-9Z99] Not a real task, just documentation`',
                    '',
                ].join('\n'),
            );
            next = finalize.computeNextAction('run', 'engine', wsDir);
            assert.match(next, /^Execute T-1A01/, `quoted line must not be picked up → "${next}"`);
            assert.doesNotMatch(next, /T-9Z99/, `quoted task ID must not be named → "${next}"`);
        } finally {
            cleanup(tempDir);
        }
    });

    test('token-audit.js sums the context each turn re-reads, counts a repeated message once, and its hook speaks only past the threshold (token audit)', () => {
        const script = path.join(TESTS_DIR, '..', 'scripts', 'token-audit.js');
        const tempDir = createTempWorkspace();
        try {
            const turn = (id, usage) =>
                JSON.stringify({
                    type: 'assistant',
                    message: {
                        id,
                        model: 'm',
                        usage,
                    },
                });
            const transcript = path.join(tempDir, 'session.jsonl');
            fs.writeFileSync(
                transcript,
                [
                    turn('a', {
                        input_tokens: 10,
                        cache_creation_input_tokens: 90,
                        output_tokens: 5,
                    }),
                    turn('a', {
                        input_tokens: 10,
                        cache_creation_input_tokens: 90,
                        output_tokens: 5,
                    }),
                    turn('b', {
                        input_tokens: 2,
                        cache_read_input_tokens: 150,
                        output_tokens: 7,
                    }),
                    'not json at all',
                ].join('\n'),
            );

            const report = spawnSync(
                'node',
                [
                    script,
                    '--session',
                    transcript,
                ],
                {
                    encoding: 'utf8',
                },
            );
            assert.strictEqual(report.status, 0, report.stdout + report.stderr);
            assert.match(report.stdout, /turns=2 firstCtx=100 maxCtx=152 cacheRead=150/);

            const hook = (limit) =>
                spawnSync(
                    'node',
                    [
                        script,
                        '--hook',
                    ],
                    {
                        encoding: 'utf8',
                        input: JSON.stringify({
                            transcript_path: transcript,
                        }),
                        env: {
                            ...process.env,
                            TOKEN_AUDIT_WARN: String(limit),
                        },
                    },
                ).stdout;
            assert.strictEqual(hook(153), '', 'below the threshold the hook prints nothing');
            const advice = JSON.parse(hook(152));
            assert.strictEqual(advice.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
            assert.match(advice.hookSpecificOutput.additionalContext, /152 tokens/);
        } finally {
            cleanup(tempDir);
        }
    });

    test('mutation-check.js reports CAUGHT, SURVIVED and REFUSED correctly and always restores the mutated file (mutation-control driver)', () => {
        const crypto = require('crypto');
        const digest = (file) =>
            crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        const driverPath = path.join(TESTS_DIR, '..', 'scripts', 'mutation-check.js');
        const driver = require(driverPath);

        const tempDir = createTempWorkspace();
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-outside-'));
        try {
            // Files a mutation must never touch, present so that only the guard refuses them.
            const outsideFile = path.join(outsideDir, 'elsewhere.js');
            fs.writeFileSync(outsideFile, 'a');
            const specFile = path.join(
                tempDir,
                '.magicspec',
                'engine',
                'specifications',
                'l1-x.md',
            );
            fs.mkdirSync(path.dirname(specFile), {
                recursive: true,
            });
            fs.writeFileSync(specFile, 'a');

            // A throwaway project: one source file and one tiny node:test file
            // that guards its value and nothing else.
            fs.mkdirSync(path.join(tempDir, 'src'), {
                recursive: true,
            });
            const source = path.join(tempDir, 'src', 'target.js');
            fs.writeFileSync(
                source,
                [
                    "'use strict';",
                    'const unguarded = 1; // no case reads this',
                    "const twin = 'x';",
                    "const twin2 = 'x';",
                    "module.exports = () => 'good';",
                    '',
                ].join('\n'),
            );
            const fixtureHarness = path.join(tempDir, 'fixture.test.js');
            fs.writeFileSync(
                fixtureHarness,
                [
                    "const { test } = require('node:test');",
                    "const assert = require('node:assert');",
                    "test('guards the value', () => {",
                    "    assert.strictEqual(require('./src/target.js')(), 'good');",
                    '});',
                    "test('an unrelated case', () => {",
                    '    assert.ok(true);',
                    '});',
                    '',
                ].join('\n'),
            );
            const original = digest(source);

            const list = [
                {
                    name: 'caught',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'guards the value',
                },
                {
                    name: 'survived',
                    file: 'src/target.js',
                    needle: 'const unguarded = 1;',
                    replacement: 'const unguarded = 2;',
                    test: 'guards the value',
                },
                {
                    name: 'needle twice',
                    file: 'src/target.js',
                    needle: "= 'x';",
                    replacement: "= 'y';",
                    test: 'guards the value',
                },
                {
                    name: 'needle absent',
                    file: 'src/target.js',
                    needle: 'not in the file',
                    replacement: 'x',
                    test: 'guards the value',
                },
                {
                    name: 'no such case',
                    file: 'src/target.js',
                    needle: "'good'",
                    replacement: "'bad'",
                    test: 'a case that does not exist',
                },
                {
                    name: 'outside the root',
                    file: path.relative(tempDir, outsideFile),
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                {
                    name: 'a specification',
                    file: '.magicspec/engine/specifications/l1-x.md',
                    needle: 'a',
                    replacement: 'b',
                    test: 'guards the value',
                },
                {
                    name: 'malformed',
                    file: 'src/target.js',
                },
            ];
            const specPath = path.join(tempDir, 'mutations.json');
            fs.writeFileSync(specPath, JSON.stringify(list));

            // Through the command line, exactly as a task would use it.
            const cli = spawnSync(
                process.execPath,
                [
                    driverPath,
                    specPath,
                    `--root=${tempDir}`,
                    `--harness=${fixtureHarness}`,
                ],
                {
                    cwd: tempDir,
                    encoding: 'utf8',
                },
            );
            const verdictOf = (name) =>
                (cli.stdout.split('\n').find((line) => line.includes(` ${name}`)) || '').split(
                    /\s{2,}| — /,
                )[0];
            assert.strictEqual(cli.status, 1, 'a survivor or a refusal fails the run');
            assert.strictEqual(verdictOf('caught'), 'CAUGHT');
            assert.strictEqual(verdictOf('survived'), 'SURVIVED');
            for (const name of [
                'needle twice',
                'needle absent',
                'no such case',
                'outside the root',
                'a specification',
                'malformed',
            ]) {
                assert.strictEqual(verdictOf(name), 'REFUSED', name);
            }
            assert.match(
                cli.stdout,
                /8 mutation\(s\): 1 CAUGHT, 1 SURVIVED, 6 REFUSED, 0 RESTORE FAILED/,
            );
            assert.strictEqual(
                digest(source),
                original,
                'the file is byte-identical after the run',
            );
            assert.strictEqual(
                fs.readFileSync(outsideFile, 'utf8'),
                'a',
                'a file outside the root is untouched',
            );
            assert.strictEqual(
                fs.readFileSync(specFile, 'utf8'),
                'a',
                'a specification is untouched',
            );

            // A list in which every entry is caught exits 0.
            fs.writeFileSync(
                specPath,
                JSON.stringify([
                    list[0],
                ]),
            );
            const clean = spawnSync(
                process.execPath,
                [
                    driverPath,
                    specPath,
                    `--root=${tempDir}`,
                    `--harness=${fixtureHarness}`,
                ],
                {
                    cwd: tempDir,
                    encoding: 'utf8',
                },
            );
            assert.strictEqual(clean.status, 0, clean.stdout);

            // A run that throws mid-mutation still leaves the file as it was, and
            // the replacement reached the file literally ("$&" is not a pattern).
            let seen = '';
            const lines = [];
            const results = driver.checkMutations(
                [
                    {
                        name: 'boom',
                        file: 'src/target.js',
                        needle: "'good'",
                        replacement: "'$&'",
                        test: 'x',
                    },
                ],
                {
                    root: tempDir,
                    harness: fixtureHarness,
                    log: (line) => lines.push(line),
                    run: () => {
                        seen = fs.readFileSync(source, 'utf8');
                        throw new Error('boom');
                    },
                },
            );
            assert.match(
                seen,
                /module\.exports = \(\) => '\$&';/,
                'the replacement was applied verbatim',
            );
            assert.strictEqual(results[0].verdict, 'REFUSED');
            assert.match(results[0].detail, /boom/);
            assert.strictEqual(
                digest(source),
                original,
                'a throwing run is restored byte for byte',
            );
        } finally {
            cleanup(tempDir);
            fs.rmSync(outsideDir, {
                recursive: true,
                force: true,
            });
        }
    });

    test('finalize.js counts a RULES.md-only change as significant under magic.spec and not under magic.task (spec-side rule capture)', () => {
        // A T1–T4 capture during /magicspec spec writes the constitution and nothing
        // else, so the spec workflow's whitelist has to see RULES.md itself.
        for (const rulesRel of [
            '.magicspec/RULES.md',
            '.magicspec/main/RULES.md',
        ]) {
            const tempDir = createTempWorkspace(true);
            try {
                const { versionPath, finalizePath } = createFinalizeFixture(tempDir, {
                    workspace: 'main',
                    autoChangelog: true,
                });
                commitFixture(tempDir);
                fs.writeFileSync(
                    path.join(tempDir, rulesRel),
                    '# Rules\n\n- A rule captured during a spec session.\n',
                );
                const run = (workflow) =>
                    execSync(`node "${finalizePath}" --workflow=${workflow} --workspace=main`, {
                        cwd: tempDir,
                        encoding: 'utf8',
                    });

                // Control: the same change is not a plan change, so it counts for no one but the rule and spec workflows.
                const asTask = run('task');
                assert.match(asTask, /No significant changes/, `${rulesRel}: task workflow`);
                assert.strictEqual(fs.readFileSync(versionPath, 'utf8').trim(), '0.1.0');

                const asSpec = run('spec');
                assert.match(asSpec, /Finalization complete/, `${rulesRel}: spec workflow`);
                assert.match(asSpec, /RULES\.md/, `${rulesRel}: the changed file is listed`);
                assert.strictEqual(
                    fs.readFileSync(versionPath, 'utf8').trim(),
                    '0.1.1',
                    `${rulesRel}: the project version is bumped`,
                );
                assert.match(
                    fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8'),
                    rulesRel === '.magicspec/RULES.md'
                        ? /Updated global project rules \(main\)/
                        : /Updated workspace rules \(main\)/,
                    `${rulesRel}: a changelog entry describing the rules is written`,
                );
            } finally {
                cleanup(tempDir);
            }
        }
    });

    test('finalize.js names the workflow in the printed form /magicspec <command> on both outcomes, never the retired dotted name (CS-2)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { finalizePath } = createFinalizeFixture(tempDir, {
                workspace: 'main',
                autoChangelog: true,
            });
            commitFixture(tempDir);
            const run = (workflow) =>
                execSync(`node "${finalizePath}" --workflow=${workflow} --workspace=main`, {
                    cwd: tempDir,
                    encoding: 'utf8',
                });

            // Skip outcome: nothing changed, so the plan workflow finds nothing significant.
            const skipped = run('plan');
            assert.match(
                skipped,
                /No significant changes detected for \/magicspec plan on workspace 'main'/,
            );
            assert.doesNotMatch(skipped, /\bmagic\.plan\b/, 'the skip line names no dotted form');

            // Success outcome: a constitution change is significant for the rule workflow.
            fs.writeFileSync(
                path.join(tempDir, '.magicspec', 'RULES.md'),
                '# Rules\n\n- A rule that makes the change significant.\n',
            );
            const finished = run('rule');
            assert.match(finished, /Finalization complete/);
            assert.match(finished, /\| Workflow \| \/magicspec rule \|/);
            assert.doesNotMatch(finished, /\bmagic\.rule\b/, 'the table names no dotted form');
        } finally {
            cleanup(tempDir);
        }
    });

    test('finalize.js reports every changed file, not just whitelisted ones (stdout listing completeness)', () => {
        const tempDir = createTempWorkspace(true);
        try {
            const { wsDir, versionPath, finalizePath } = createFinalizeFixture(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n',
            );
            fs.mkdirSync(path.join(tempDir, 'dev'), {
                recursive: true,
            });
            fs.writeFileSync(path.join(tempDir, 'dev', 'deliverable.js'), '// baseline\n');
            commitFixture(tempDir);

            // One whitelisted change (TASKS.md status flip) and one outside the
            // whitelist — the shape of every magic.run whose task produced real
            // source changes, since product code is never inside the whitelist.
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '## Active Phases\n\n- [x] [T-1A01] Done\n- [x] [T-1A02] Also done\n',
            );
            fs.writeFileSync(
                path.join(tempDir, 'dev', 'deliverable.js'),
                "// the task's actual output\n",
            );

            const out = execSync(`node "${finalizePath}" --workflow=run --workspace=main`, {
                cwd: tempDir,
                encoding: 'utf8',
            });

            // (a) Significance is unchanged: the whitelisted file still drives the bump.
            assert.match(
                out,
                /Finalization complete/,
                'whitelisted change must still be significant',
            );
            assert.strictEqual(
                fs.readFileSync(versionPath, 'utf8').trim(),
                '0.1.1',
                'the whitelist subset alone must still decide the version bump',
            );

            // (b) The stdout listing names the non-whitelisted file alongside the whitelisted one.
            const artifacts = out.slice(
                out.indexOf('### Changed artifacts'),
                out.indexOf('### Next step'),
            );
            assert.match(
                artifacts,
                /dev\/deliverable\.js/,
                'stdout listing must name the non-whitelisted change',
            );
            assert.match(
                artifacts,
                /TASKS\.md/,
                'stdout listing must still name the whitelisted change',
            );

            // SC-3 retirement regression pin: no commit-message output at all.
            assert.doesNotMatch(
                out,
                /Suggested commit message/i,
                'SC-3 retired: no commit suggestion is emitted',
            );
            assert.doesNotMatch(
                out,
                /Auto-commit/i,
                'SC-3 retired: no auto-commit notice is emitted',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('buildChangelogBullet keeps spec identifiers out of the product CHANGELOG (RC-11)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { buildChangelogBullet } = requireFromFixture(
                tempDir,
                'lib',
                'changelog-bullets.js',
            );

            // Asserted against the function's return value, not a written
            // CHANGELOG.md — only a real invocation touches that file, and this
            // generator is the only surface where the containment gates cannot
            // reach: nothing here is authored by a role or reviewed as a diff.
            const single = buildChangelogBullet('spec', 'main', [
                {
                    path: '.magicspec/main/specifications/l1-model-runtime.md',
                    status: 'modified',
                },
            ]);
            assert.doesNotMatch(
                single,
                /model-runtime/,
                'single-spec branch must not embed the artifact ID',
            );
            assert.match(single, /specification/, 'the bullet must still describe what changed');
            assert.match(
                single,
                /\(main\)/,
                'the workspace stays in the bullet — it is not an SDD identifier',
            );

            // The branch that was already correct must stay correct.
            const multi = buildChangelogBullet('spec', 'main', [
                {
                    path: '.magicspec/main/specifications/l1-model-runtime.md',
                    status: 'modified',
                },
                {
                    path: '.magicspec/main/specifications/l2-model-runtime.md',
                    status: 'modified',
                },
            ]);
            assert.doesNotMatch(multi, /model-runtime/, 'multi-spec branch must stay generic');

            // No other branch may regress into interpolating an identifier.
            const runBullet = buildChangelogBullet('run', 'main', [
                {
                    path: '.magicspec/main/tasks/phase-7.md',
                    status: 'modified',
                },
            ]);
            assert.doesNotMatch(
                runBullet,
                /phase-7/,
                'run branch must not embed a task-file identifier',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
