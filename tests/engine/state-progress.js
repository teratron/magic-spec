// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
    TESTS_DIR,
    createTempWorkspace,
    requireFromFixture,
    cleanup,
    antiPatternLines,
    copyStateTemplate,
    makeWorkspace,
    requireUpdateState,
    requireUpdateStateWithTasks,
    autoProgressState,
    warnedBy,
} = require('./lib/base');
const { trimmedState, recordedCodes, patchState } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 7e. update-state.js — autoProgress merges, never clobbers narrative (SC-2)
    // ───────────────────────────────────────────────────────────────────────────
    test('updateState autoProgress refreshes counter lines but preserves narrative in the Progress block', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '# Master Task Index',
                    '',
                    '### Phase 2 Checklist',
                    '',
                    '- [x] [T-2A01] First',
                    '- [x] [T-2A02] Second',
                    '- [ ] [T-2A03] Third',
                    '',
                    '## Registry',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '| [Phase 2](tasks/phase-2.md) | Feature | `In Progress` |',
                    '',
                ].join('\n'),
            );

            // STATE.md with stale counters AND hand-authored narrative in the fence.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** engine',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 2',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Next Action:** whatever',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 2: [0/3] ░░░░░░░░ 0%',
                    'Overall: [0/2] ░░░░░░░░ 0%',
                    'T-2A02 landed the parser rework; edge cases in Notes.',
                    '```',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(state, /Phase 2: \[2\/3\]/, 'phase counter line must be recomputed');
            assert.match(state, /Overall: \[1\/2\]/, 'overall counter line must be recomputed');
            assert.doesNotMatch(state, /\[0\/3\]/, 'stale counters must not survive');
            assert.match(
                state,
                /T-2A02 landed the parser rework/,
                'hand-authored narrative inside the Progress fence must be preserved',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('updateState autoProgress replaces template placeholder counters without duplicating them', () => {
        const tempDir = createTempWorkspace();
        try {
            const realTemplate = path.resolve(
                TESTS_DIR,
                '..',
                'skills',
                'magicspec',
                'templates',
                'state.md',
            );
            fs.copyFileSync(
                realTemplate,
                path.join(tempDir, 'skills', 'magicspec', 'templates', 'state.md'),
            );
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '',
                ].join('\n'),
            );

            // Bootstrap STATE.md from the real template (placeholder counters),
            // then recompute: `{filled}/{total}`-style placeholders are engine-owned
            // lines and must be replaced, not preserved as narrative.
            const state = autoProgressState(updateState, wsDir, { phase: '1' });

            assert.match(
                state,
                /Overall: \[1\/1\]/,
                'placeholder block must be recomputed from TASKS.md',
            );
            assert.doesNotMatch(
                state,
                /\{filled\}|\{done\}/,
                'template placeholder counters must not survive as narrative',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a STATE.md created from the template carries no placeholder, and the writers still work on it (§18)', () => {
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { updateState } = requireFromFixture(tempDir, 'update-state.js');
            const wsDir = makeWorkspace(tempDir, 'main');
            const statePath = path.join(wsDir, 'STATE.md');
            const stateText = () => fs.readFileSync(statePath, 'utf8');

            // The finalize shape: a Next Action and a progress recompute, and
            // nothing else — every other field keeps whatever the bootstrap gave it.
            warnedBy(() =>
                updateState(wsDir, { nextAction: 'Do the thing' }, { autoProgress: true }),
            );
            const fresh = stateText();
            assert.deepStrictEqual(
                fresh.split('\n').filter((line) => /\{[^}]*\}/.test(line)),
                [],
                'no line of a fresh STATE.md may still hold a template placeholder',
            );
            assert.match(fresh, /^\*\*Workspace:\*\* main$/m, 'the workspace name is filled in');
            assert.match(fresh, /^\*\*Status:\*\* Active$/m);
            assert.match(fresh, /^- \*\*Next Action:\*\* Do the thing$/m, 'the caller value wins');
            assert.doesNotMatch(fresh, /\n\n\n/, 'removing examples must not leave a double blank');

            // The decision examples are gone, so the first real decision is the only entry.
            warnedBy(() => updateState(wsDir, { decision: 'first' }, { addDecision: true }));
            assert.strictEqual(
                (stateText().match(/^- \d{4}-\d{2}-\d{2} /gm) || []).length,
                1,
                'the first decision is the only one in the section',
            );

            // The progress block is still recognised: counters land inside its fence.
            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '| Phase | Description | Status |\n| --- | --- | --- |\n' +
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n',
            );
            warnedBy(() => updateState(wsDir, { phase: '1' }, { autoProgress: true }));
            assert.match(
                stateText(),
                /```\nOverall: \[1\/1\][^\n]*\n```/,
                'counters recompute into the fence',
            );

            // A root-level design directory is no workspace name.
            const rootDir = path.join(tempDir, '.magicspec');
            fs.rmSync(path.join(rootDir, 'main'), { recursive: true });
            warnedBy(() => updateState(rootDir, {}));
            assert.match(
                fs.readFileSync(path.join(rootDir, 'STATE.md'), 'utf8'),
                /^\*\*Workspace:\*\* unknown$/m,
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress emits a phase counter for the two-level task layout (SC-2.3)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir, tasksDir, tasksPath } =
                requireUpdateStateWithTasks(tempDir);

            // Registry-only TASKS.md: no inline `### Phase N Checklist` heading.
            // This is the canonical layout, so the phase line must come from the
            // phase file — deriving it from the inline heading alone produced an
            // aggregate-only block for every project on the modern format.
            fs.writeFileSync(
                tasksPath,
                [
                    '# Master Task Index',
                    '',
                    '| Phase | Description | Status |',
                    '| --- | --- | --- |',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |',
                    '| [Phase 3](tasks/phase-3.md) | Feature | `In Progress` |',
                    '',
                ].join('\n'),
            );

            fs.writeFileSync(
                path.join(tasksDir, 'phase-3.md'),
                [
                    '---',
                    'phase: 3',
                    'status: In Progress',
                    '---',
                    '',
                    '## Atomic Checklist',
                    '',
                    '- [x] [T-3A01] One',
                    '- [x] [T-3A02] Two',
                    '- [ ] [T-3A03] Three',
                    '- [ ] [T-3A04] Four',
                    '- [ ] [T-3A05] Five',
                    '',
                    '## Detailed Tracking',
                    '',
                    '### [T-3A03] Three',
                    '',
                    '- **Notes:** the archiver looks for `- [ ]` lines; quoting one here',
                    '  must not inflate the count.',
                    '',
                ].join('\n'),
            );

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 3',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Overall: [0/2] ░░░░░░░░ 0%',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(
                state,
                /Phase 3: \[2\/5\]/,
                'phase counter must be derived from the phase file',
            );
            assert.match(state, /Overall: \[1\/2\]/, 'aggregate counter must still be recomputed');
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress preserves counter-shaped lines under labels the engine never writes (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                [
                    '### Phase 1 Checklist',
                    '',
                    '- [x] [T-1A01] One',
                    '- [ ] [T-1A02] Two',
                    '',
                    '## Registry',
                    '',
                    '| [Phase 1](tasks/phase-1.md) | Bootstrap | `In Progress` |',
                    '',
                ].join('\n'),
            );

            // `Overall` and `Phase {N}` are the only labels computeProgress emits.
            // Anything else sharing the shape is operator narrative: nothing
            // regenerates it, so matching it as engine-owned means deleting it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 1: [0/2] ░░░░░░░░ 0%',
                    'Overall: [0/1] ░░░░░░░░ 0%',
                    'Specification: [3/3] complete',
                    'Plan: [1/1] complete',
                    'Implementation: [1/5] in progress — see notes below',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const state = autoProgressState(updateState, wsDir);

            assert.match(
                state,
                /Phase 1: \[1\/2\]/,
                'engine-owned phase counter must be regenerated',
            );
            assert.match(
                state,
                /Overall: \[0\/1\]/,
                'engine-owned aggregate counter must be regenerated',
            );
            assert.match(
                state,
                /Specification: \[3\/3\] complete/,
                'custom counter-shaped line must survive',
            );
            assert.match(
                state,
                /Plan: \[1\/1\] complete/,
                'custom counter-shaped line must survive',
            );
            assert.match(
                state,
                /Implementation: \[1\/5\] in progress — see notes below/,
                'custom counter-shaped line must survive verbatim, trailing prose included',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('computeProgress leaves `$`-digit sequences in narrative untouched (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'TASKS.md'),
                '| [Phase 1](tasks/phase-1.md) | Bootstrap | `Done` |\n',
            );

            // A string-form .replace() re-scans its own result for `$1`-`$9`,
            // so a dollar amount in preserved narrative used to splice captured
            // fence fragments into the middle of the note — corrupting the
            // document's structure, not merely a counter's value.
            const narrative = [
                'Budget check: spend is $1,200 of the',
                '$3,000 sprint allocation — on track.',
            ];
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Overall: [0/1] ░░░░░░░░ 0%',
                    ...narrative,
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            const before = (
                fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8').match(/```/g) || []
            ).length;
            const state = autoProgressState(updateState, wsDir);

            for (const line of narrative) {
                assert.ok(
                    state.includes(line),
                    `narrative line must survive byte-for-byte → missing "${line}"`,
                );
            }
            assert.strictEqual(
                (state.match(/```/g) || []).length,
                before,
                'the fence count must not change — an injected fence unbalances every section below it',
            );
            assert.doesNotMatch(
                state,
                /## Progress[\s\S]*## Progress/,
                'no structural fragment may be spliced into the fence',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('the line-cap guard distinguishes a real prune from an exhausted one (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            const captureWarnings = (fn) => warnedBy(fn).join('\n');

            // Blocking Constraints grow monotonically by design and are never
            // pruned, so they can push the file past the cap on their own. Once
            // Recent Decisions is at its 1-entry floor the guard has nothing
            // left to remove — and must say so instead of reusing the message
            // that claims a prune happened.
            const buildState = (decisionCount) =>
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Recent Decisions',
                    '',
                    ...Array.from(
                        { length: decisionCount },
                        (_, i) => `- 2026-01-0${i + 1} **Decision:** entry ${i + 1}`,
                    ),
                    '',
                    '## Blocking Constraints',
                    '',
                    ...antiPatternLines(95),
                    '',
                ].join('\n');

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(1));
            const exhausted = captureWarnings(() => updateState(wsDir, {}, {}));

            fs.writeFileSync(path.join(wsDir, 'STATE.md'), buildState(3));
            const restored = captureWarnings(() => updateState(wsDir, {}, {}));

            assert.match(exhausted, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.match(restored, /exceeds 100 lines/, 'the cap breach must still be reported');
            assert.notStrictEqual(
                exhausted,
                restored,
                'an exhausted guard must be observably different from a successful prune',
            );
            assert.match(
                exhausted,
                /nothing was pruned/,
                'the exhausted case must say nothing was removed',
            );
            assert.match(
                exhausted,
                /Blocking Constraints/,
                'the exhausted case must name the section to review',
            );
            assert.doesNotMatch(
                restored,
                /nothing was pruned/,
                'a real prune must not claim exhaustion',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test("addDecision/addConstraint preserve existing entries' wrapped continuation lines (SC-1.2)", () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A wrapped list-item continuation line is valid, common Markdown —
            // and the section rebuild used to lose it: `existingLines` filtered
            // `block.split(/\r?\n/)` down to lines matching the entry marker
            // regex alone, so a continuation line (carrying no marker of its
            // own) was silently dropped on every subsequent rebuild.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1',
                    '**Status:** Active',
                    '',
                    '## Recent Decisions',
                    '',
                    '<!-- Last 3-5 locked decisions. -->',
                    '',
                    '- 2026-01-01 **Decision:** This is a long decision that wraps',
                    '  onto a second continuation line for readability.',
                    '- 2025-12-31 **Pattern:** A short one-line entry.',
                    '',
                    '## Blocking Constraints',
                    '',
                    '<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->',
                    '<!-- Agent MUST explicitly acknowledge each constraint before working. -->',
                    '',
                    '- [C-001] **Do not X**: because Y happened before',
                    '  and here is the continuation explaining Y.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { decision: 'A brand new decision' }, { addDecision: true });
            updateState(
                wsDir,
                { constraint: { title: 'No Z', desc: 'Because W' } },
                { addConstraint: true },
            );
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(
                state,
                /- 2026-01-01 \*\*Decision:\*\* This is a long decision that wraps\r?\n {2}onto a second continuation line for readability\./,
                'the wrapped decision continuation must survive the window rebuild, attached to its own entry',
            );
            assert.match(
                state,
                /- \[C-001\] \*\*Do not X\*\*: because Y happened before\r?\n {2}and here is the continuation explaining Y\./,
                'the wrapped constraint continuation must survive the rebuild, attached to its own entry',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('the line-cap guard prunes a whole multi-line decision entry, not just its marker line (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // `decLines` used to be filtered to marker-only lines, and the
            // prune removed just `decLines[last] + '\n'` — for a wrapped
            // oldest entry that deletes only its first line, leaving the
            // continuation as an orphaned fragment where the entry used to be.
            const state = [
                '# Project State',
                '',
                '**Phase:** 1',
                '**Status:** Active',
                '',
                '## Recent Decisions',
                '',
                '- 2026-01-05 **Decision:** entry 5',
                '- 2026-01-04 **Decision:** entry 4',
                '- 2026-01-03 **Decision:** entry 3',
                '- 2026-01-02 **Decision:** the oldest entry wraps',
                '  onto a continuation line that must be pruned along with it.',
                '',
                '## Blocking Constraints',
                '',
                ...antiPatternLines(95),
                '',
            ].join('\n');
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), state);

            updateState(wsDir, {}, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.doesNotMatch(
                after,
                /onto a continuation line that must be pruned along with it\./,
                "the oldest entry's continuation line must be pruned along with its marker line",
            );
            assert.doesNotMatch(
                after,
                /the oldest entry wraps/,
                "the oldest entry's own marker line must be pruned too",
            );
            assert.match(after, /entry 3/, 'entries within the cap must survive');
        } finally {
            cleanup(tempDir);
        }
    });

    test('scalar field patches replace a wrapped entry whole, not just its first line (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The scalar-field loop patched each field with a single-line `.*`
            // pattern, so an entry an agent had hand-wrapped onto indented
            // continuation lines lost only its marker line: the new (shorter)
            // text landed there and the old continuation lines stayed behind,
            // orphaned, under text they no longer belonged to. Every field goes
            // through the same loop, so a header field is covered as well as
            // the three `- **X:**` bullets.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 4 — A long phase name that an agent wrapped',
                    '  onto a continuation line',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-3A02] A long task title that an agent wrapped onto',
                    '  a second physical line because it exceeded the column limit,',
                    '  and then a third.',
                    '- **Spec:** l1-example.md §3, wrapped so that the',
                    '  spec pointer spills onto its own continuation line.',
                    '- **Next Action:** Run the next task; the description is long',
                    '  enough that it wraps once more onto a continuation line.',
                    '',
                    '## Recent Decisions',
                    '',
                    '- 2026-01-02 **Decision:** an entry this call must not touch',
                    '  together with its own continuation line.',
                    '',
                ].join('\n'),
            );

            updateState(
                wsDir,
                {
                    phase: '5 — Next',
                    task: '[T-3A03] Short',
                    spec: 'x.md',
                    nextAction: 'Go',
                },
                {},
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            // Whole-file equality (modulo the volatile timestamp) rather than a
            // presence check: it fails on a surviving orphan *and* on a patch
            // that swallowed a neighbouring line.
            assert.strictEqual(
                after.replace(/^\*\*Updated:\*\* .*\n/m, ''),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Phase:** 5 — Next',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-3A03] Short',
                    '- **Spec:** x.md',
                    '- **Next Action:** Go',
                    '',
                    '## Recent Decisions',
                    '',
                    '- 2026-01-02 **Decision:** an entry this call must not touch',
                    '  together with its own continuation line.',
                    '',
                ].join('\n'),
                'each patched field must occupy exactly one line, its old continuation lines gone and every other line untouched',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a header field consumes indented continuation lines only; an unindented line under it is left alone (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // Header fields sit against one another with no list structure, so
            // unlike a `- **X:**` bullet there is nothing for a lazy (unindented)
            // continuation to attach to: an unindented line under one is as
            // likely to be its neighbour or a stray note as its wrap, and
            // guessing wrong deletes it. Indentation is the only continuation
            // signal a header field honours.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Updated:** 2026-01-01 00:00',
                    '**Phase:** 1 — Bootstrap',
                    '  wrapped and indented',
                    '**Status:** Active',
                    'An unindented line directly under the header fields.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { phase: '2 — Build', status: 'Blocked' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                after.replace(/^\*\*Updated:\*\* .*\n/m, ''),
                [
                    '# Project State',
                    '',
                    '**Workspace:** docs',
                    '**Phase:** 2 — Build',
                    '**Status:** Blocked',
                    'An unindented line directly under the header fields.',
                    '',
                ].join('\n'),
                'the indented wrap goes with its field; the unindented line under Status must survive',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a list-item field also consumes lazily wrapped (unindented) continuation lines (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // CommonMark lets a list item's paragraph continue on an unindented
            // line — it renders identically to the indented wrap — so an agent
            // that wraps `- **Task:**` without indenting still produces one
            // logical entry, and replacing only its marker line orphans the
            // rest. An indented sub-bullet hangs under the entry it follows.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A01] A long title that an agent wrapped',
                    'without indenting the second line, which Markdown still',
                    'reads as part of the same list item.',
                    '- **Spec:** l1-example.md §3, wrapped in two styles',
                    '  first indented',
                    'then unindented',
                    '- **Next Action:** Run the next task;',
                    'a lazy line',
                    '  - a nested sub-bullet that belongs to the entry above it',
                    '',
                    '## Progress',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { task: '[T-1A02] Short', spec: 'x.md', nextAction: 'Go' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                after,
                [
                    '# Project State',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A02] Short',
                    '- **Spec:** x.md',
                    '- **Next Action:** Go',
                    '',
                    '## Progress',
                    '',
                ].join('\n'),
                'lazy, indented and mixed continuation lines must all go with their entry, and nothing else',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a list-item field stops at a blank line and at every construct that opens a new block (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The lazy rule must never reach past its own entry. Each line below
            // can directly follow a bullet field with no blank line between them
            // and has to be left exactly where it is: dropping any one of them
            // from the engine's stop-set would delete it on the next patch.
            const blockStarts = [
                '- **Spec:** the next bullet',
                '* a star bullet',
                '+ a plus bullet',
                '1. an ordered item',
                '2) another ordered item',
                '**Handoff File:** none',
                '# a heading',
                '> a quote',
                '| a | table |',
                '<!-- a comment -->',
                '```text',
                '~~~',
                '---',
            ];
            const stateFile = path.join(wsDir, 'STATE.md');

            for (const start of blockStarts) {
                fs.writeFileSync(
                    stateFile,
                    [
                        '# Project State',
                        '',
                        '- **Task:** old task',
                        'a lazy line that is part of the entry',
                        start,
                        '',
                    ].join('\n'),
                );

                updateState(wsDir, { task: 'new task' }, {});

                assert.strictEqual(
                    fs.readFileSync(stateFile, 'utf8'),
                    ['# Project State', '', '- **Task:** new task', start, ''].join('\n'),
                    `a line opening \`${start}\` must survive the patch of the bullet above it`,
                );
            }

            fs.writeFileSync(
                stateFile,
                [
                    '# Project State',
                    '',
                    '- **Task:** old task',
                    'a lazy line that is part of the entry',
                    '',
                    'A plain paragraph after a blank line.',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { task: 'new task' }, {});

            assert.strictEqual(
                fs.readFileSync(stateFile, 'utf8'),
                [
                    '# Project State',
                    '',
                    '- **Task:** new task',
                    '',
                    'A plain paragraph after a blank line.',
                    '',
                ].join('\n'),
                'a blank line must end the entry',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a wrapped field is replaced whole in a CRLF file without introducing a bare LF (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A Windows checkout under `core.autocrlf` leaves STATE.md CRLF, so
            // the continuation pattern has to span `\r\n` line breaks — and the
            // replacement must not disturb the endings of the lines around it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1 — Bootstrap',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** [T-1A01] A long title that wraps',
                    '  onto an indented continuation line,',
                    'then a lazy one.',
                    '- **Next Action:** Go',
                    '',
                ].join('\r\n'),
            );

            updateState(wsDir, { task: '[T-1A02] Short' }, {});
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.doesNotMatch(
                after,
                /onto an indented continuation line/,
                'the indented continuation must not survive as an orphan',
            );
            assert.doesNotMatch(
                after,
                /then a lazy one/,
                'the lazy continuation must not survive as an orphan',
            );
            assert.match(
                after,
                /- \*\*Task:\*\* \[T-1A02\] Short\r\n- \*\*Next Action:\*\* Go\r\n/,
                'the patched entry must be followed directly by the next bullet, CRLF intact',
            );
            assert.doesNotMatch(after, /[^\r]\n/, 'no bare LF may be introduced into a CRLF file');
        } finally {
            cleanup(tempDir);
        }
    });

    test('a task-scoped update leaves the phase-level Status field alone (SC-1.1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 1 — Bootstrap',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** T-1A01 Scaffold the app',
                    '- **Next Action:** whatever',
                    '',
                ].join('\n'),
            );

            // `status` is the phase-level field and its vocabulary is
            // Active | Blocked | Paused. One task finishing is not a phase
            // transition, so the per-task patch carries no status at all.
            updateState(
                wsDir,
                { task: 'T-1A02 Wire the parser', nextAction: 'Execute T-1A03' },
                {},
            );
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.match(
                state,
                /\*\*Status:\*\* Active/,
                'the phase-level Status must survive a task-scoped update',
            );
            assert.match(
                state,
                /- \*\*Task:\*\* T-1A02 Wire the parser/,
                'the task field must be updated',
            );
            assert.doesNotMatch(
                state,
                /\*\*Status:\*\* (Done|Cancelled|Todo)/,
                'task vocabulary must never reach the phase field',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('field patches insert `$`-bearing values verbatim, never as replacement patterns (SC-2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A string-form .replace() re-scans its replacement text for `$'`
            // (right context), `` $` `` (left context), `$&` (whole match) and
            // `$$` — none of which need a capture group to fire. finalize.js's
            // synthesizeNextAction() embeds arbitrary task titles, so a title
            // with bash ANSI-C quoting (`$'…'`) used to splice the entire tail
            // of STATE.md into the Next Action line and duplicate every section
            // below it, a second stale `## Progress` counter among them.
            const evilTitle = "Handle the $'refund' path and the $& fallback";
            const nextAction = `Execute T-8B04 ${evilTitle} via /magicspec run engine`;

            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    '# Project State',
                    '',
                    '**Phase:** 8 — Payments',
                    '**Status:** Active',
                    '',
                    '## Current Position',
                    '',
                    '- **Task:** T-8B03 Wire the webhook',
                    '- **Next Action:** whatever',
                    '',
                    '## Progress',
                    '',
                    '```',
                    'Phase 8: [3/7] ███░░░░░ 43%',
                    'Overall: [2/5] ███░░░░░ 40%',
                    '```',
                    '',
                    '## Recent Decisions',
                    '',
                ].join('\n'),
            );

            updateState(wsDir, { nextAction, task: `T-8B04 ${evilTitle}` }, {});
            const state = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.ok(
                state.includes(`- **Next Action:** ${nextAction}`),
                'the Next Action value must be inserted byte-for-byte',
            );
            assert.ok(
                state.includes(`- **Task:** T-8B04 ${evilTitle}`),
                'the Task value must be inserted byte-for-byte',
            );
            assert.strictEqual(
                (state.match(/^## Progress$/gm) || []).length,
                1,
                "a `$'`/`$&` expansion must not duplicate a document section",
            );
            assert.strictEqual(
                (state.match(/```/g) || []).length,
                2,
                'the fence count must stay balanced',
            );
        } finally {
            cleanup(tempDir);
        }
    });
    const decisionsPreamble =
        '<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) — see PLAN.md / CHANGELOG.md for phase history. -->';
    const constraintsPreamble = [
        '<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->',
        '<!-- Agent MUST explicitly acknowledge each constraint before working. -->',
    ];
    // Whole-file view with the two volatile parts normalised — the
    // `**Updated:**` stamp is dropped and an entry's date becomes `DATE` — so a
    // test can assert equality rather than presence.
    const withoutVolatile = (state) =>
        state
            .replace(/^\*\*Updated:\*\* .*\r?\n/m, '')
            .replace(/^- \d{4}-\d{2}-\d{2} /gm, '- DATE ');

    test('addDecision creates a missing "## Recent Decisions" section instead of dropping the entry (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\n'));

            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'Adopt the strict parser' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            // Whole-file equality pins where the section lands, the single blank
            // line on each side and the preamble — not merely that the text exists.
            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(
                    [
                        ...trimmedState,
                        '## Recent Decisions',
                        '',
                        decisionsPreamble,
                        '',
                        '- DATE **Decision:** Adopt the strict parser',
                        '',
                    ].join('\n'),
                ),
                'the entry must be recorded in a newly created section at the end of the file',
            );
            assert.ok(
                warnings.some((w) => /Recent Decisions/.test(w) && /created/i.test(w)),
                'creating the section must be announced on stderr',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_SECTION_CREATED'],
                'creating the section must be recorded once as a diagnostic',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('a section addDecision created is reused by the next call, which announces nothing (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\n'));

            updateState(wsDir, { decision: 'first' }, { addDecision: true });
            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'second' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                (after.match(/^## Recent Decisions$/gm) || []).length,
                1,
                'the second call must find the section the first created, not add another',
            );
            assert.match(
                after,
                /- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* second\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* first/,
                'entries must sit newest-first in the one section',
            );
            assert.deepStrictEqual(
                warnings,
                [],
                'a call that finds its section has nothing to announce',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                ['STATE_SECTION_CREATED'],
                'creation is recorded once, not once per call',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('addConstraint creates a missing "## Blocking Constraints" section at its template position (SC-1.2)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // The section's slot is set by the template order, not by where the
            // file happens to end: it goes before the earliest section that
            // follows it, and at the end of the file only when none does.
            const cases = [
                {
                    name: 'nothing follows it, so it is appended at the end of the file',
                    existing: [
                        '## Recent Decisions',
                        '',
                        '- 2026-01-02 **Decision:** an existing entry',
                        '',
                    ],
                    expected: [
                        '## Recent Decisions',
                        '',
                        '- 2026-01-02 **Decision:** an existing entry',
                        '',
                        '## Blocking Constraints',
                        '',
                        ...constraintsPreamble,
                        '',
                        '- [C-001] **No Z**: Because W',
                        '',
                    ],
                },
                {
                    name: 'Session Continuity follows it, so it is inserted before that section',
                    existing: ['## Session Continuity', '', '**Handoff File:** none', ''],
                    expected: [
                        '## Blocking Constraints',
                        '',
                        ...constraintsPreamble,
                        '',
                        '- [C-001] **No Z**: Because W',
                        '',
                        '## Session Continuity',
                        '',
                        '**Handoff File:** none',
                        '',
                    ],
                },
            ];

            for (const { name, existing, expected } of cases) {
                fs.writeFileSync(
                    path.join(wsDir, 'STATE.md'),
                    [...trimmedState, ...existing].join('\n'),
                );
                updateState(
                    wsDir,
                    { constraint: { title: 'No Z', desc: 'Because W' } },
                    { addConstraint: true },
                );
                const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

                assert.strictEqual(
                    withoutVolatile(after),
                    withoutVolatile([...trimmedState, ...expected].join('\n')),
                    `${name}: the constraint must be recorded as C-001 in a newly created section`,
                );
            }
        } finally {
            cleanup(tempDir);
        }
    });

    // Records one decision in a STATE.md made of `trimmedState` plus `following`
    // and asserts the new section landed directly after `## Progress`, with
    // `following` — everything that used to come next — untouched below it.
    // Whole-file equality also proves the section is set off by exactly one
    // blank line on each side (no MD012/MD022 drift).
    const assertDecisionSectionCreatedAhead = (following, message) => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [...trimmedState, ...following].join('\n'),
            );

            updateState(wsDir, { decision: 'Adopt the strict parser' }, { addDecision: true });
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(
                    [
                        ...trimmedState,
                        '## Recent Decisions',
                        '',
                        decisionsPreamble,
                        '',
                        '- DATE **Decision:** Adopt the strict parser',
                        '',
                        ...following,
                    ].join('\n'),
                ),
                message,
            );
        } finally {
            cleanup(tempDir);
        }
    };

    test('addDecision places a created section before the sections that follow it in template order (SC-1)', () => {
        assertDecisionSectionCreatedAhead(
            [
                '## Blockers',
                '',
                '- [blocking] none',
                '',
                '## Blocking Constraints',
                '',
                ...constraintsPreamble,
                '',
                '- [C-001] **Do not X**: because Y',
                '',
                '## Session Continuity',
                '',
                '**Handoff File:** none',
                '',
            ],
            'the section must land between Progress and Blockers, the sections after it untouched',
        );
    });

    test('a STATE.md that only quotes the heading text is not corrupted by addDecision (SC-2)', () => {
        // The heading is absent, but its text appears mid-line in another
        // section. The old substring search took that occurrence for the
        // heading and spliced the rebuilt block into the middle of the line:
        // its tail was destroyed and a decisions section appeared inside
        // `## Blocking Constraints`.
        assertDecisionSectionCreatedAhead(
            [
                '## Blocking Constraints',
                '',
                ...constraintsPreamble,
                '',
                '- [C-001] **Heads-up**: update-state ignores ## Recent Decisions when it is absent',
                '',
                '## Session Continuity',
                '',
                '**Handoff File:** none',
                '',
            ],
            'the quoted line must survive whole and the decision must get a real section of its own',
        );
    });

    test('a CRLF STATE.md missing the section gets it created once, and both entries survive (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // A Windows checkout under git autocrlf. The section rebuild has
            // always written its own block with bare LF; what matters here is
            // that the heading is found on the second call and not created again.
            fs.writeFileSync(path.join(wsDir, 'STATE.md'), trimmedState.join('\r\n'));

            updateState(wsDir, { decision: 'first' }, { addDecision: true });
            updateState(wsDir, { decision: 'second' }, { addDecision: true });
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.strictEqual(
                (after.match(/^## Recent Decisions$/gm) || []).length,
                1,
                'the heading must be created once, then found on the next call',
            );
            assert.match(
                after,
                /\*\*Decision:\*\* second\r?\n- \d{4}-\d{2}-\d{2} \*\*Decision:\*\* first/,
                'both entries must be present, newest first',
            );
            assert.deepStrictEqual(recordedCodes(tempDir), ['STATE_SECTION_CREATED']);
        } finally {
            cleanup(tempDir);
        }
    });

    test('a hand-suffixed "## Recent Decisions (last 5)" heading is still the section, not a missing one (SC-1)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { updateState, wsDir } = requireUpdateState(tempDir);

            // Anchoring the heading to the start of a line must not demand the
            // end of it too: a heading someone suffixed by hand was found by the
            // old substring search, and a second section here would duplicate it.
            fs.writeFileSync(
                path.join(wsDir, 'STATE.md'),
                [
                    ...trimmedState,
                    '## Recent Decisions (last 5)',
                    '',
                    '- 2026-01-02 **Decision:** an earlier entry',
                    '',
                ].join('\n'),
            );

            const warnings = warnedBy(() =>
                updateState(wsDir, { decision: 'a later entry' }, { addDecision: true }),
            );
            const after = fs.readFileSync(path.join(wsDir, 'STATE.md'), 'utf8');

            assert.deepStrictEqual(
                after.match(/^## Recent Decisions.*$/gm),
                ['## Recent Decisions'],
                'exactly one section, rebuilt to the canonical heading',
            );
            assert.match(
                after,
                /\*\*Decision:\*\* a later entry\r?\n- 2026-01-02 \*\*Decision:\*\* an earlier entry/,
                'the existing entry must be kept below the new one',
            );
            assert.deepStrictEqual(
                warnings,
                [],
                'an existing section must not be announced as created',
            );
            assert.deepStrictEqual(
                recordedCodes(tempDir),
                [],
                'an existing section must not be recorded as created',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // §13.1 — the scalar-field loop and the Progress recompute used to skip,
    // silently, a write whose anchor was absent, and matched their anchors
    // anywhere in a line rather than at its start.
    test('a requested header field with no line is created in template order (SC-2)', () => {
        const tail = ['## Current Position', '', '- **Task:** [T-2A01] Wire the parser', ''];
        const headerOf = (...fields) => [
            '# Project State',
            '',
            ...(fields.length ? [...fields, ''] : []),
            ...tail,
        ];
        const stamp = '**Updated:** 2026-01-01 00:00';
        const cases = [
            {
                name: 'before the earliest present field that follows it',
                existing: headerOf('**Workspace:** docs', stamp, '**Status:** Active'),
                patch: { phase: '3 — Ship' },
                expected: headerOf(
                    '**Workspace:** docs',
                    stamp,
                    '**Phase:** 3 — Ship',
                    '**Status:** Active',
                ),
            },
            {
                name: 'after the last present field when none follows it',
                existing: headerOf('**Workspace:** docs', stamp, '**Phase:** 2 — Build'),
                patch: { status: 'Blocked' },
                expected: headerOf(
                    '**Workspace:** docs',
                    stamp,
                    '**Phase:** 2 — Build',
                    '**Status:** Blocked',
                ),
            },
            {
                name: 'after the title when the header holds no field at all',
                existing: headerOf(),
                patch: { phase: '2 — Build' },
                expected: headerOf('**Phase:** 2 — Build'),
            },
        ];

        for (const { name, existing, patch, expected } of cases) {
            const { after, warnings, codes } = patchState(existing, patch);
            assert.strictEqual(
                withoutVolatile(after),
                withoutVolatile(expected.join('\n')),
                `${name}: the field must be created where the template puts it, adjacent to its neighbours`,
            );
            assert.deepStrictEqual(
                codes,
                ['STATE_FIELD_CREATED'],
                `${name}: creation must be recorded once`,
            );
            assert.ok(
                warnings.some((w) => /created/i.test(w)),
                `${name}: creation must be announced on stderr`,
            );
        }
    });

    test('a requested Current Position field with no line is created, and so is the section when it is gone (SC-2)', () => {
        const header = ['# Project State', '', '**Phase:** 2 — Build', ''];
        const progress = ['## Progress', '', '```', 'Overall: [1/2] ████░░░░ 50%', '```', ''];
        const cases = [
            {
                name: 'appended after the last field of the section',
                existing: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A01] Wire the parser',
                    '',
                ],
                patch: { nextAction: 'Go' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A01] Wire the parser',
                    '- **Next Action:** Go',
                    '',
                ],
                codes: ['STATE_FIELD_CREATED'],
            },
            {
                name: 'inserted before the earliest present field that follows it',
                existing: [...header, '## Current Position', '', '- **Next Action:** Continue', ''],
                patch: { task: '[T-2A02] New task' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Task:** [T-2A02] New task',
                    '- **Next Action:** Continue',
                    '',
                ],
                codes: ['STATE_FIELD_CREATED'],
            },
            {
                name: 'with the section itself created ahead of Progress when the file has none',
                existing: [...header, ...progress],
                patch: { nextAction: 'Go' },
                expected: [
                    ...header,
                    '## Current Position',
                    '',
                    '- **Next Action:** Go',
                    '',
                    ...progress,
                ],
                codes: ['STATE_SECTION_CREATED', 'STATE_FIELD_CREATED'],
            },
        ];

        for (const { name, existing, patch, expected, codes } of cases) {
            const result = patchState(existing, patch);
            assert.strictEqual(
                withoutVolatile(result.after),
                withoutVolatile(expected.join('\n')),
                `${name}: position and blank-line separation must be exactly the template's`,
            );
            assert.deepStrictEqual(result.codes, codes, `${name}: every creation must be recorded`);
        }
    });

    test('update-state no longer knows the handoff pointer: an existing line is left untouched and the flag is refused like any unknown one (SC-9(g))', () => {
        // (e) A STATE.md written before the snapshot was retired still carries
        // the line. No update rewrites, moves or removes it, and a patch key
        // for it has no writer, so it changes nothing.
        const existing = [
            ...trimmedState,
            '## Session Continuity',
            '',
            '**Handoff File:** none',
            '**Bootstrap Mode:** false',
            '',
        ];
        const before = withoutVolatile(existing.join('\n'));
        for (const patch of [
            { handoff: '.magicspec/docs/HANDOFF.json' },
            { nextAction: 'Continue' },
        ]) {
            const { after } = patchState(existing, patch);
            assert.match(after, /^\*\*Handoff File:\*\* none$/m, 'the old line survives an update');
            if (patch.handoff) {
                assert.strictEqual(
                    withoutVolatile(after),
                    before,
                    'a handoff patch key writes nothing',
                );
            }
        }

        // (d) The flag goes down the ordinary unknown-option path: refused before the script
        // reads or writes anything, with the same message shape and the same exit as a
        // made-up flag, and no line is created.
        const tempDir = createTempWorkspace();
        try {
            copyStateTemplate(tempDir);
            const { wsDir } = requireUpdateState(tempDir);
            const run = (flag) =>
                spawnSync(
                    process.execPath,
                    [
                        path.join(tempDir, 'skills', 'magicspec', 'scripts', 'update-state.js'),
                        `--workspace=${wsDir}`,
                        '--next-action=Continue',
                        flag,
                    ],
                    { cwd: tempDir, encoding: 'utf8' },
                );
            const retired = run('--handoff=x');
            const madeUp = run('--handoof=x');
            assert.match(retired.stderr, /Unknown option '--handoff'/);
            assert.notStrictEqual(retired.status, 0, 'refused, as any unknown flag is');
            assert.strictEqual(retired.status, madeUp.status, 'the same exit as any unknown flag');
            assert.strictEqual(
                retired.stderr.replace('--handoff', '--handoof'),
                madeUp.stderr,
                'the same message as any unknown flag',
            );
            const stateFile = path.join(wsDir, 'STATE.md');
            assert.ok(
                !fs.existsSync(stateFile) ||
                    !/Handoff File/.test(fs.readFileSync(stateFile, 'utf8')),
                'the retired field is not created on a fresh file',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
