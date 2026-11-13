'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createTempWorkspace, cleanup, requirePhaseArchiverWorkspace } = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 7c. phase-archiver.js — eligibility precision (R7 / l2-engine-finalization §6)
    // ───────────────────────────────────────────────────────────────────────────
    test('phase-archiver findArchiveCandidates matches checklist lines, not prose `- [ ]` (R7)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // (a) Done, all checklist items [x], but Notes quote `- [ ]` in prose → archivable.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-20.md'),
                '---\nphase: 20\nname: "Quoting"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-20A01] Done item\n\n' +
                    '## Detailed Tracking\n\n### [T-20A01]\n- **Notes:** detect open `- [ ]` tasks via regex.\n',
            );

            // (b) Done but a genuine unchecked checklist line → NOT archivable.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-21.md'),
                '---\nphase: 21\nname: "Open"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-21A01] Done\n- [ ] [T-21A02] Still open\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                candidates.includes('phase-20.md'),
                'prose `- [ ]` must not block archival (R7 fix)',
            );
            assert.ok(
                !candidates.includes('phase-21.md'),
                'a real unchecked checklist line must still block archival',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 7c-2. phase-archiver.js — name recognition (l2-engine-finalization §6.1)
    // ───────────────────────────────────────────────────────────────────────────
    test('findArchiveCandidates recognizes track-suffixed phase files (phase-10b.md)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // A track-split workbook: Done, checklist fully checked. Before the
            // fix the name filter dropped it before its status was ever read.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-10b.md'),
                '---\nphase: 10\nname: "Track B"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-10B01] Done item\n',
            );

            // Same shape, still open → the suffix must not become a free pass.
            fs.writeFileSync(
                path.join(tasksDir, 'phase-10a.md'),
                '---\nphase: 10\nname: "Track A"\nstatus: Done\n---\n\n' +
                    '## Atomic Checklist\n\n- [x] [T-10A01] Done\n- [ ] [T-10A02] Open\n',
            );

            const candidates = archiver.findArchiveCandidates(wsDir).map((c) => c.file);
            assert.ok(
                candidates.includes('phase-10b.md'),
                'a track-suffixed phase file must be evaluated on status, not excluded by name',
            );
            assert.ok(
                !candidates.includes('phase-10a.md'),
                'an open checklist must still block archival for suffixed files',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('findArchiveCandidates orders phase files numerically, suffix as tiebreaker', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Lexical sort would yield phase-10* before phase-2 — the numeric
            // ordering below is what callers and the archival log rely on.
            for (const [file, phase] of [
                ['phase-10b.md', 10],
                ['phase-2.md', 2],
                ['phase-10a.md', 10],
            ]) {
                fs.writeFileSync(
                    path.join(tasksDir, file),
                    `---\nphase: ${phase}\nname: "W"\nstatus: Done\n---\n\n` +
                        '## Atomic Checklist\n\n- [x] [T-1A01] Done\n',
                );
            }

            assert.deepStrictEqual(
                archiver.findArchiveCandidates(wsDir).map((c) => c.file),
                ['phase-2.md', 'phase-10a.md', 'phase-10b.md'],
                'phase files sort by number first, then by track suffix',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('archiveCompletedPhases reports unrecognized task files instead of dropping them silently', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);

            // Not a phase workbook by any spelling — it must never be archived,
            // but the caller has to be able to say so out loud. A silent drop is
            // indistinguishable from "evaluated and found ineligible".
            fs.writeFileSync(
                path.join(tasksDir, '02-legacy-workbook.md'),
                '# Legacy\n\n- [x] done\n',
            );

            const result = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(result.archived, [], 'a non-phase file is never archived');
            assert.deepStrictEqual(
                result.unrecognized,
                ['02-legacy-workbook.md'],
                'a non-phase .md in tasks/ is surfaced, not swallowed',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // A completed, archivable Phase 3 ("Shipping") plus its TASKS.md registry
    // row — the fixed point every archival-rewrite test in this section starts
    // from before layering its own PLAN.md content.
    const makeDoneShippingPhaseFixture = (tasksDir, wsDir) => {
        fs.writeFileSync(
            path.join(tasksDir, 'phase-3.md'),
            '---\nphase: 3\nname: "Shipping"\nstatus: Done\n---\n\n' +
                '## Atomic Checklist\n\n- [x] [T-3A01] Ship it\n',
        );

        const tasksPath = path.join(wsDir, 'TASKS.md');
        fs.writeFileSync(
            tasksPath,
            [
                '# Master Task Index',
                '',
                '| Phase | Description | Status |',
                '| --- | --- | --- |',
                '| [Phase 3](tasks/phase-3.md) | Shipping | `Done` |',
                '',
            ].join('\n'),
        );
        return tasksPath;
    };

    // require()s phase-archiver.js, applies the Done-Shipping-phase fixture,
    // and returns the PLAN.md path — the pairing both archival index-rewrite
    // tests below start from before diverging on PLAN.md's own content.
    const requireShippingPhaseWithPlan = (tempDir) => {
        const { archiver, wsDir, tasksDir } = requirePhaseArchiverWorkspace(tempDir);
        const tasksPath = makeDoneShippingPhaseFixture(tasksDir, wsDir);
        return { archiver, wsDir, tasksDir, tasksPath, planPath: path.join(wsDir, 'PLAN.md') };
    };

    // ───────────────────────────────────────────────────────────────────────────
    // 7d. phase-archiver.js — archival rewrites links in PLAN.md, not only TASKS.md
    // ───────────────────────────────────────────────────────────────────────────
    test('archiveCompletedPhases rewrites phase links in both TASKS.md and PLAN.md', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksDir, tasksPath, planPath } =
                requireShippingPhaseWithPlan(tempDir);
            fs.writeFileSync(
                planPath,
                [
                    '# Implementation Plan',
                    '',
                    '## Phase 3 — Shipping',
                    '',
                    'Breakdown lives in [Phase 3](tasks/phase-3.md).',
                    '',
                ].join('\n'),
            );

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(
                archived.map((a) => a.file),
                ['phase-3.md'],
                'the Done phase must be archived',
            );

            assert.ok(
                fs.existsSync(path.join(wsDir, 'archives', 'tasks', 'phase-3.md')),
                'phase file must be moved into archives/tasks/',
            );
            assert.ok(
                !fs.existsSync(path.join(tasksDir, 'phase-3.md')),
                'archival is a move, not a copy',
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(
                tasks,
                /\(archives\/tasks\/phase-3\.md\)/,
                'TASKS.md link must be rewritten',
            );
            assert.match(
                tasks,
                /`Done \(Archived\)`/,
                'TASKS.md row status must become Done (Archived)',
            );

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(
                plan,
                /\(archives\/tasks\/phase-3\.md\)/,
                'PLAN.md link must be rewritten',
            );
            assert.doesNotMatch(
                plan,
                /\(tasks\/phase-3\.md\)/,
                'PLAN.md must not keep a dangling link to the moved file',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('archiveCompletedPhases rewrites a self-labelling PLAN.md link without touching prose (R10)', () => {
        const tempDir = createTempWorkspace();
        try {
            const { archiver, wsDir, tasksPath, planPath } = requireShippingPhaseWithPlan(tempDir);

            // PLAN.md's own convention: the "Tasks:" line is self-labelling —
            // the label *is* the path — which is the form the R10 fix targets.
            // A separate Backlog line mentions the same path in plain prose,
            // describing history; that mention must survive byte-for-byte.
            fs.writeFileSync(
                planPath,
                [
                    '### Phase 3 — Shipping',
                    '',
                    '- [x] **Shipping** [L2]',
                    '  - Tasks: [tasks/phase-3.md](tasks/phase-3.md)',
                    '',
                    '## Backlog',
                    '',
                    '- Historical note: the original breakdown lived at tasks/phase-3.md before later restructuring.',
                    '',
                ].join('\n'),
            );

            const { archived } = archiver.archiveCompletedPhases(wsDir);
            assert.deepStrictEqual(
                archived.map((a) => a.file),
                ['phase-3.md'],
            );

            const plan = fs.readFileSync(planPath, 'utf8');
            assert.match(
                plan,
                /Tasks: \[archives\/tasks\/phase-3\.md\]\(archives\/tasks\/phase-3\.md\)/,
                'the self-labelling link must move both its label and its target together',
            );
            assert.doesNotMatch(
                plan,
                /\[tasks\/phase-3\.md\]/,
                'no trace of the pre-move self-label may remain',
            );
            assert.match(
                plan,
                /Historical note: the original breakdown lived at tasks\/phase-3\.md before later restructuring\./,
                'a bare prose mention of the path must survive byte-for-byte — it describes history, not a live link',
            );

            const tasks = fs.readFileSync(tasksPath, 'utf8');
            assert.match(
                tasks,
                /\[Phase 3\]\(archives\/tasks\/phase-3\.md\)/,
                'TASKS.md label (a phase number, not a path) must be unchanged',
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
