// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    antiPatternLines,
    copyStateTemplate,
    requirePhaseArchiverWorkspace,
    requireUpdateState,
    requireUpdateStateWithTasks,
    warnedBy,
} = require('./lib/base');
const { trimmedState, recordedCodes, patchState } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 7g. update-state.js — the goal block of live memory (GM-3)
    // ───────────────────────────────────────────────────────────────────────────
    const GOAL_FIXTURE = {
        statement: 'the import works end to end for all three formats',
        phase: 3,
        taskLimit: 5,
        bound: 'give up after 5 rounds without progress',
        withoutProgress: 1,
        tasksDone: 2,
        iterations: 4,
        phasesDone: 1,
        started: '2026-11-12 09:00',
        criteria: [
            { state: 'met', text: 'CSV import round-trips', check: 'scenario S-1 passes' },
            { state: 'open', text: 'JSON import round-trips', check: 'scenario S-2 passes' },
            {
                state: 'blocked',
                text: 'XML import - namespaces',
                check: 'a decision on the parser',
            },
        ],
        consents: [{ action: 'delete the old importer', reason: 'a destructive action' }],
    };

    const goalSectionOf = (state) => {
        const start = state.search(/^## Goal\b/m);
        if (start === -1) return null;
        const next = state.indexOf('\n## ', start + 1);
        return state.slice(start, next === -1 ? state.length : next);
    };

    const runGoalWriter = (tempDir, wsDir, ...args) =>
        spawnSync(
            process.execPath,
            [
                path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-state.js'),
                `--workspace=${wsDir}`,
                ...args,
            ],
            { cwd: tempDir, encoding: 'utf8' },
        );

    test('update-state records the goal from a file between Current Position and Progress, keeps it byte for byte under every other update, and a cleared goal leaves no section (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { updateState, wsDir } = requireUpdateStateWithTasks(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '# Tasks\n\n| Phase | Description | Status |\n| --- | --- | --- |\n| [Phase 1](tasks/phase-1.md) | A | `Todo` |\n',
            );
            fs.writeFileSync(path.join(tempDir, 'goal.json'), JSON.stringify(GOAL_FIXTURE));
            const statePath = path.join(wsDir, 'STATE.md');

            const written = runGoalWriter(tempDir, wsDir, '--phase=3', '--goal-file=goal.json');
            assert.strictEqual(written.status, 0, written.stdout + written.stderr);
            const state = fs.readFileSync(statePath, 'utf8');
            const section = goalSectionOf(state);
            assert.ok(section, 'the goal section is written');
            for (const line of [
                '- **Goal:** the import works end to end for all three formats',
                '- **Target phase:** 3',
                '- **Task limit:** 5',
                '- **Bound:** give up after 5 rounds without progress',
                '- **Without progress:** 1',
                '- **Tasks done:** 2',
                '- **Iterations:** 4',
                '- **Phases done:** 1',
                '- **Started:** 2026-11-12 09:00',
                '- [met] CSV import round-trips — scenario S-1 passes',
                '- [open] JSON import round-trips — scenario S-2 passes',
                '- [blocked] XML import - namespaces — a decision on the parser',
                '- [consent] delete the old importer — a destructive action',
            ]) {
                assert.ok(
                    section.includes(`${line}\n`) || section.endsWith(line),
                    `the section holds: ${line}`,
                );
            }
            assert.ok(
                state.indexOf('## Current Position') < state.indexOf('## Goal') &&
                    state.indexOf('## Goal') < state.indexOf('## Progress'),
                'the section sits between Current Position and Progress',
            );

            // Every other writer leaves the block byte for byte.
            updateState(
                wsDir,
                { nextAction: 'Continue', task: 'T-1 something' },
                { autoProgress: true },
            );
            updateState(wsDir, { decision: 'A decision' }, { addDecision: true });
            updateState(
                wsDir,
                { constraint: { title: 'A constraint', desc: 'never' } },
                { addConstraint: true },
            );
            assert.strictEqual(
                goalSectionOf(fs.readFileSync(statePath, 'utf8')),
                section,
                'the block survives every other update unchanged',
            );

            // A new block replaces the old one; a cleared goal removes the section and nothing else.
            const cleared = runGoalWriter(tempDir, wsDir, '--goal-clear');
            assert.strictEqual(cleared.status, 0, cleared.stdout + cleared.stderr);
            const after = fs.readFileSync(statePath, 'utf8');
            assert.strictEqual(goalSectionOf(after), null, 'no goal section remains');
            for (const heading of [
                '## Current Position',
                '## Progress',
                '## Recent Decisions',
                '## Blocking Constraints',
            ]) {
                assert.ok(after.includes(heading), `${heading} stays`);
            }
            assert.ok(
                !/\n\n\n/.test(after.replace(/\r/g, '')),
                'removing the section leaves no double blank line',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-state refuses a goal over its bound, with an unknown field or with a bad criterion, records one diagnostic and writes nothing (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { updateState, wsDir } = requireUpdateState(tempDir);
            updateState(wsDir, { nextAction: 'Start' });
            const statePath = path.join(wsDir, 'STATE.md');
            const before = fs.readFileSync(statePath, 'utf8');

            const cases = {
                'over the bound': {
                    ...GOAL_FIXTURE,
                    criteria: Array.from({ length: 30 }, (_, i) => ({
                        state: 'open',
                        text: `criterion ${i}`,
                        check: 'c',
                    })),
                },
                'an unknown field': { ...GOAL_FIXTURE, owner: 'someone' },
                'a bad criterion state': {
                    ...GOAL_FIXTURE,
                    criteria: [{ state: 'done', text: 'x', check: 'y' }],
                },
                'no statement, phase or limit': { bound: 'none' },
                'a start that is not a date': { ...GOAL_FIXTURE, started: 'yesterday-ish' },
            };
            for (const [name, goal] of Object.entries(cases)) {
                fs.writeFileSync(path.join(tempDir, 'goal.json'), JSON.stringify(goal));
                const result = runGoalWriter(
                    tempDir,
                    wsDir,
                    '--next-action=Changed',
                    '--goal-file=goal.json',
                );
                assert.notStrictEqual(result.status, 0, `${name}: refused`);
                assert.match(result.stderr, /HALT: .*goal/i, `${name}: the refusal names the goal`);
                assert.strictEqual(
                    fs.readFileSync(statePath, 'utf8'),
                    before,
                    `${name}: nothing was written, not even the other fields`,
                );
            }
            const { read } = requireFromFixture(tempDir, 'lib', 'diagnostics.js');
            const refused = read().filter((f) => f.code === 'STATE_GOAL_REFUSED');
            assert.strictEqual(
                refused.length,
                Object.keys(cases).length,
                'each refusal is recorded',
            );
            assert.ok(refused.every((f) => f.source === 'update-state' && f.severity === 'error'));

            // The two goal flags exclude each other, and an unreadable file is a refusal too.
            const both = runGoalWriter(tempDir, wsDir, '--goal-file=goal.json', '--goal-clear');
            assert.notStrictEqual(both.status, 0, 'a goal and a clear together are refused');
            const missing = runGoalWriter(tempDir, wsDir, '--goal-file=absent.json');
            assert.notStrictEqual(missing.status, 0, 'a missing goal file is refused');
            assert.strictEqual(fs.readFileSync(statePath, 'utf8'), before, 'still nothing written');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a STATE.md that records no goal gains no goal section from an ordinary update, and a fresh one carries none (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { updateState, wsDir } = requireUpdateState(tempDir);
            updateState(wsDir, { phase: '1 — A', nextAction: 'Start' });
            updateState(wsDir, { decision: 'D' }, { addDecision: true });
            updateState(wsDir, { constraint: { title: 'C', desc: 'd' } }, { addConstraint: true });
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');
            assert.strictEqual(goalSectionOf(state), null, 'no goal section appears');
            assert.ok(
                !/<!-- Written by update-state only/.test(state),
                'the template comment of the section does not leak either',
            );
            // Clearing a goal that was never recorded is a no-op and still succeeds.
            const cleared = runGoalWriter(tempDir, wsDir, '--goal-clear');
            assert.strictEqual(cleared.status, 0, cleared.stdout + cleared.stderr);
            assert.strictEqual(
                goalSectionOf(fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8')),
                null,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('the goal block renders and parses to the same object, a separator inside a text cannot split a line wrongly, and a file with no named goal reads as none (GM-3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { normalizeGoal, renderGoalSection, parseGoalSection } = requireFromFixture(
                tempDir,
                'lib',
                'goal-block.js',
            );
            const goal = normalizeGoal({
                ...GOAL_FIXTURE,
                criteria: [{ state: 'open', text: 'one — two', check: 'a — b' }],
            });
            assert.strictEqual(
                goal.criteria[0].text,
                'one - two',
                'the separator inside a text is replaced',
            );
            assert.deepStrictEqual(
                parseGoalSection(`# State\n\n${renderGoalSection(goal)}\n## Progress\n`),
                goal,
            );
            // Phase and count forms record without a statement.
            const phaseOnly = normalizeGoal({ phase: 4 });
            assert.deepStrictEqual(parseGoalSection(renderGoalSection(phaseOnly)), phaseOnly);
            assert.strictEqual(
                parseGoalSection('# State\n\n## Goal\n\n<!-- nothing recorded -->\n'),
                null,
            );
            assert.strictEqual(parseGoalSection('# State\n'), null);
        } finally {
            cleanup(tempDir);
        }
    });

    test('Updated is refreshed where present and never created where absent (SC-2)', () => {
        // No caller requests `Updated`: updateState injects a fresh stamp into
        // every call, including one that patches nothing, so creating the line
        // would hand every hand-trimmed file a new line on its first call.
        const bare = [
            '# Project State',
            '',
            '**Phase:** 2 — Build',
            '',
            '## Current Position',
            '',
            '- **Task:** t',
            '',
        ];

        const untouched = patchState(bare, {});
        assert.strictEqual(
            untouched.after,
            bare.join('\n'),
            'a call that patches nothing must leave a stampless file byte-identical',
        );
        assert.deepStrictEqual(untouched.warnings, [], 'and must announce nothing');

        const patched = patchState(bare, { phase: '3 — Ship' });
        assert.doesNotMatch(
            patched.after,
            /Updated/,
            'a patched file without a stamp must still have none',
        );
        assert.match(
            patched.after,
            /^\*\*Phase:\*\* 3 — Ship$/m,
            'while the requested field is applied',
        );
        assert.deepStrictEqual(patched.codes, [], 'and nothing is recorded as created');
    });

    test('a field a call created is found by the next call, which announces nothing (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 2 — Build',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** t',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { status: 'Blocked' }, {});
            const warnings = warnedBy(() => updateState(wsDir, { status: 'Active' }, {}));
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.deepStrictEqual(
                after.match(/^\*\*Status:\*\*.*$/gm),
                ['**Status:** Active'],
                'one line, holding the latest value',
            );
            assert.deepStrictEqual(warnings, [], 'the second call has nothing to announce');
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_FIELD_CREATED'],
                'creation is recorded once, not per call',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a field created in a CRLF file brings no bare LF with it (SC-2)', () => {
        const { after } = patchState(
            [
                '# Project State',
                '',
                '**Phase:** 2 — Build',
                '',
                '## Current Position',
                '',
                '- **Task:** t',
                '',
            ],
            { status: 'Active' },
            {},
            { eol: '\r\n' },
        );

        assert.match(
            after,
            /\*\*Phase:\*\* 2 — Build\r\n\*\*Status:\*\* Active\r\n/,
            'the field must sit directly under its neighbour',
        );
        assert.doesNotMatch(after, /(?<!\r)\n/, 'every line break in the file must still be CRLF');
    });

    test('autoProgress creates a missing "## Progress" section holding the counters (SC-2)', () => {
        const existing = [
            '# Project State',
            '',
            '**Phase:** 1',
            '**Status:** Active',
            '',
            '## Current Position',
            '',
            '- **Next Action:** go',
            '',
        ];
        const { after, codes } = patchState(
            existing,
            {},
            { autoProgress: true },
            { files: { 'TASKS.md': '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n' } },
        );

        assert.strictEqual(
            after,
            [...existing, '## Progress', '', '```', 'Overall: [1/1] ████████ 100%', '```', ''].join(
                '\n',
            ),
            'the section must be created at the end of the file with the recomputed counter in its fence',
        );
        assert.deepStrictEqual(codes, ['STATE_SECTION_CREATED']);
    });

    test('a "## Progress" heading without a fence is left untouched, and the skip is announced (SC-2)', () => {
        // The engine cannot tell narrative from a counter block it never wrote,
        // so it must not overwrite this — but a silent skip is what §13.1 removes.
        const existing = [
            '# Project State',
            '',
            '**Phase:** 1',
            '**Status:** Active',
            '',
            '## Progress',
            '',
            'Just prose, no counters here.',
            '',
        ];
        const { after, warnings, codes } = patchState(
            existing,
            {},
            { autoProgress: true },
            { files: { 'TASKS.md': '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n' } },
        );

        assert.strictEqual(after, existing.join('\n'), 'the block must be left exactly as it was');
        assert.ok(
            warnings.some((w) => /Progress/.test(w)),
            'the skip must be announced on stderr',
        );
        assert.deepStrictEqual(codes, ['PROGRESS_BLOCK_UNRECOGNISED']);
    });

    // §13.2 — the line-cap guard located the section with a substring search,
    // required a heading to follow it, and removed the oldest entry by looking
    // its text up again in the file.
    test('the line-cap guard prunes the oldest decision when Recent Decisions is the last section (SC-1.2)', () => {
        // The Next Action line quotes the heading text before the real heading:
        // a substring search would have anchored on it.
        const lines = [
            '# Project State',
            '',
            '**Phase:** 2 — Build',
            '**Status:** Active',
            '',
            '## Current Position',
            '',
            '- **Next Action:** revisit ## Recent Decisions once the cap is hit',
            '',
            '## Blocking Constraints',
            '',
            ...antiPatternLines(90),
            '',
            '## Recent Decisions',
            '',
            '- 2026-01-05 **Decision:** entry 5',
            '- 2026-01-04 **Decision:** entry 4',
            '- 2026-01-03 **Decision:** entry 3',
            '- 2026-01-02 **Decision:** entry 2',
            '- 2026-01-01 **Decision:** entry 1',
        ];

        for (const { name, tail } of [
            { name: 'a trailing newline', tail: [''] },
            { name: 'no trailing newline', tail: [] },
        ]) {
            const { after, warnings, codes } = patchState([...lines, ...tail], {});

            assert.strictEqual(
                after.trimEnd(),
                lines.slice(0, -1).join('\n').trimEnd(),
                `${name}: exactly the oldest entry must go, everything else byte-for-byte`,
            );
            assert.ok(
                warnings.some((w) => /Pruned oldest decision/.test(w)),
                `${name}: the prune must be reported`,
            );
            assert.ok(
                !warnings.some((w) => /nothing was pruned/.test(w)),
                `${name}: and must not be reported as exhausted`,
            );
            assert.deepStrictEqual(codes, ['STATE_DECISION_PRUNED'], name);
        }
    });

    test('the line-cap guard prunes in a CRLF file by position, not by text (SC-1.2)', () => {
        // The text the guard used to search for is LF-joined, so it never matched
        // a CRLF file — yet `pruned` was set unconditionally and the prune was
        // reported. Decisions are not last here, so the boundary is not in play.
        const lines = [
            ...trimmedState,
            '## Recent Decisions',
            '',
            ...[5, 4, 3, 2, 1].map((n) => `- 2026-01-0${n} **Decision:** entry ${n}`),
            '',
            '## Blocking Constraints',
            '',
            ...antiPatternLines(90),
            '',
        ];
        const { after, warnings } = patchState(lines, {}, {}, { eol: '\r\n' });

        assert.doesNotMatch(after, /entry 1\b/, 'the oldest entry must actually be gone');
        assert.match(after, /entry 2\b/, 'the next-oldest must stay');
        assert.ok(
            warnings.some((w) => /Pruned oldest decision/.test(w)),
            'the prune must be reported',
        );
        assert.doesNotMatch(after, /(?<!\r)\n/, 'the removal must not introduce a bare LF');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7f. phase-archiver.js — CRLF frontmatter tolerance (Windows checkouts)
    // ───────────────────────────────────────────────────────────────────────────
    test('phase-archiver findArchiveCandidates parses CRLF frontmatter (git autocrlf)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // A genuinely complete phase, but with CRLF line endings as produced
            // by git autocrlf on a Windows checkout.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-16.md'),
                '---\r\nphase: 16\r\nname: "Windows"\r\nstatus: Done\r\n---\r\n\r\n' +
                    '## Atomic Checklist\r\n\r\n- [x] [T-16A01] Done\r\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir);
            assert.deepStrictEqual(
                candidates.map((c) => c.file),
                ['phase-16.md'],
                'CRLF line endings must not hide a Done phase from archival',
            );
            assert.strictEqual(
                candidates[0].phase,
                '16',
                'frontmatter values must be parsed without trailing \\r',
            );
            assert.strictEqual(
                candidates[0].name,
                'Windows',
                'quoted values must be unwrapped under CRLF',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
