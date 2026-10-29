---
phase: 30
name: "Checksum Scan Hygiene, Git-Commit Scope Retirement, Fresh-Project Drift Silence"
status: Done
subsystem: ".magic + rules"
requires: []
provides:
  - "generate-checksums.js / update-engine-meta.js: gitignore-aware scan (Invariant 7 parity) — a foreign tool's cache inside .magic/ can no longer enter the manifest"
  - "rules/magic.md + all four workflow bodies + templates/rules.md: no assertion, in either direction, about whether the agent may invoke a write-side git operation"
  - "rules/magic.md §1: Engine Upgrade Detection distinguishes a never-initialized project (`fresh`, silent) from a registry present without the snapshot field (`unknown`, still narrates)"
key_files:
  created: []
  modified:
    - "dev/scripts/generate-checksums.js"
    - ".magic/scripts/update-engine-meta.js"
    - ".magic/.checksums"
    - "rules/magic.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/run.md"
    - ".magic/rule.md"
    - ".magic/templates/rules.md"
    - "dev/tests/engine.js"
patterns_established:
  - "A manifest entry for a path the project's own .gitignore disowns can never be satisfied by a release archive built from a fresh CI checkout — the same Invariant 7 gitignore-union every other tree-walking scanner already applies closes the class, not just the one instance."
  - "Retiring an agent-facing behavioral rule means removing the topic from operational text entirely, not restating it in permissive form — a paragraph explaining why the engine 'takes no position' still keeps the topic present at every read. The historical Document History record of the retirement is a different surface (audit trail, not runtime instruction) and is exempt from that bar."
duration_minutes: ~
---

# Stage 30 Tasks — Checksum Scan Hygiene, Git-Commit Scope Retirement, Fresh-Project Drift Silence

**Phase:** 30
**Status:** Done
**Strategic Goal:** Close three independent Required Fixes authored across the `/magic.spec` passes that immediately preceded this planning invocation. Track A and Track B were executed directly as Engine Improvement during the same session that authored them (user-directed, immediate action) — this phase records that work retrospectively, matching this workspace's established practice for session chronology running ahead of formal planning (Phase 24 §"the phase validates itself"). Track C was executed via `/magic.run engine` following formal planning.

## Atomic Checklist

- [x] [T-30A01] Checksum scanners join Invariant 7 gitignore parity
- [x] [T-30B01] Retire the write-side git prohibition from every agent-facing surface
- [x] [T-30C01] Reword `rules/magic.md` §1 steps 2-4 (fresh vs. unknown)
- [x] [T-30C02] Regression: drift line absent on a truly fresh project
- [x] [T-30T01] Verification

## Detailed Tracking

### [T-30A01] Checksum scanners join Invariant 7 gitignore parity

- **Spec:** [l2-engine-automation.md](../specifications/l2-engine-automation.md) v1.13.0 §Scan Hygiene — Checksum scanners
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --check` reports clean on the real repo; removing `.magic/.fallow/` and re-running it reproduces the pre-fix `missingFiles` failure (confirms the manifest no longer references it); `dev/tests/engine.js` gained 3 cases (every `.checksums` entry is git-tracked; both scanners exclude a synthetic gitignored fixture directory) — 81 → 84.
- **Handoff:** None — independent of Tracks B/C.
- **Changes:** `dev/scripts/generate-checksums.js` and `.magic/scripts/update-engine-meta.js` union their existing `history`/`VOLATILE_STATE_FILES` excludes with `utils.loadGitignore()` + `utils.BUILD_NOISE_DIRS` (the floor the other four scanners already use). Stray, untracked `.magic/.fallow/` directory (a third-party `fallow` CLI cache, unrelated to the engine) purged from disk; manifest regenerated 75 → 71 tracked entries. `node .magic/scripts/executor.js update-engine-meta` bumped engine 2.1.86 → 2.1.87.
- **Notes:** Root-caused from a user bug report describing the symptom as conditional ("if the `.fallow/` cache regenerates"); verification found it unconditional — every consumer install's first commit failed, since the manifest referenced files no fresh CI-built release archive could ever contain. Executed directly as Engine Improvement (explicit user authorization: "исправляй всё") in the same turn the spec was authored, ahead of this formal planning pass — recorded here per this workspace's retrospective-documentation precedent (Phase 24, Phase 29).

### [T-30B01] Retire the write-side git prohibition from every agent-facing surface

- **Spec:** [l1-session-continuity.md](../specifications/l1-session-continuity.md) v2.2.0 §1.4; [l2-engine-finalization.md](../specifications/l2-engine-finalization.md) v3.2.0 §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "git commit\|git add\|write-side git" rules/magic.md .magic/spec.md .magic/task.md .magic/run.md .magic/rule.md .magic/templates/rules.md` returns no agent-facing policy statement (the two remaining `rules/magic.md` git-metadata mentions are RC-8-exempt provenance examples, unrelated to commit permission — unchanged by design). `node dev/scripts/validate-hardlinks.js` reports all groups linked. Full suite 84/84 green.
- **Handoff:** None — file-independent of Track A; shares `rules/magic.md` with Track C but touches a disjoint section (§3/§8 here, §1 there).
- **Changes:** Removed the "HARD RULE: agent MUST NOT call git commit/git add" step from `rules/magic.md` §3 (renumbered) and its restatement in §8's Completion Protocol checklist; removed the identical step from `.magic/spec.md`/`task.md`/`run.md`/`rule.md` Finalization Protocol; reworded two `.magic/run.md` mentions and one `.magic/templates/rules.md` mention that used "the standard git commit gate" as a rationale for skipping an inline approval prompt, to name the actual reason (user reviews independently afterward) without naming git. Opportunistic cleanup of already-stale text riding the same paragraphs: "+ suggested commit message" (dead since the 2026-08-27 SC-3 retirement) and the `--no-commit-msg` flag (dead since the same retirement, per `l2-engine-finalization.md` v3.0.0) removed from `rules/magic.md`. `node .magic/scripts/executor.js update-engine-meta` bumped engine 2.1.87 → 2.1.89 across two passes (2.1.88 mid-correction, 2.1.89 final — the first pass reworded the rule permissively per a misreading of the request; user corrected that a permissive restatement still keeps the topic present, and the rule was removed outright instead).
- **Notes:** By explicit, repeated user directive: the engine ships as scaffolding for more than one AI agent (`.agents/` adapters), and dictating git-commit policy to whichever agent a project has chosen sits outside an SDD methodology's scope — every capable agent already governs its own git behavior through its own operating rules. `rules/magic.md`'s hardlink to `.agents/rules/magic.md` ([C-001]) delinked twice across the two edit passes on this file; both restored via `mklink /H` and reverified with `dev/scripts/validate-hardlinks.js` before proceeding. Executed directly as Engine Improvement in the same turn `l1-session-continuity.md` §1.4 was authored, ahead of this formal planning pass. Per explicit user decision, the historical retirement record in both specs' Document History (§1.4, §5.2) is kept as-is — that is audit trail, not a runtime instruction, and is exempt from the "no mention" bar.

### [T-30C01] Reword `rules/magic.md` §1 steps 2-4 (fresh vs. unknown)

- **Spec:** [l1-engine-core.md](../specifications/l1-engine-core.md) v1.8.0 §Known Process Gaps — Fresh-Project Snapshot Ambiguity
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `rules/magic.md` §1 step 2 names two distinct outcomes (`fresh`: `.design/INDEX.md` absent; `unknown`: file present, field absent); step 3's silent-proceed branch includes `fresh`; step 4 fires only on a real mismatch or `unknown`. `node dev/scripts/validate-hardlinks.js` → `all groups linked correctly` after re-linking.
- **Handoff:** Gated T-30C02 (the regression test asserts the reworded behavior).
- **Changes:** §1 step 2 → *"Missing `.design/INDEX.md` → treat as `fresh` (no prior analysis exists — nothing has drifted from anything). File present but the `**Engine Version:**` field missing → treat as `unknown` (a registry exists without the snapshot)."* Step 3 → *"If `local_engine == snapshot_engine`, or the result is `fresh` → proceed silently. A fresh project has no prior snapshot to revalidate against; Auto-Init creates `.design/INDEX.md` with a correctly-seeded snapshot on its own."* Step 4's firing condition narrowed from *"On mismatch (including `unknown`)"* to *"On mismatch, or `unknown`"*. No version bump — `rules/` sits outside C14 tracking (matches Phase 13, Phase 24 Track E precedent).
- **Notes:** Concept authority fully specified the exact replacement wording — no design decision needed, pure text implementation. **[C-001] fired as predicted**: editing `rules/magic.md` delinked it from `.agents/rules/magic.md` (confirmed via `validate-hardlinks.js` reporting drifted inodes immediately after the edit); restored via `mklink /H` and reverified before proceeding, same procedure as Tracks A/B earlier this session.

### [T-30C02] Regression: drift line absent on a truly fresh project

- **Spec:** [l1-engine-core.md](../specifications/l1-engine-core.md) v1.8.0 §Known Process Gaps — Fresh-Project Snapshot Ambiguity (Required Fix, point 4)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="distinguishes a fresh project" dev/tests/engine.js` → 1 passed. Full suite: `node --test dev/tests/engine.js` → 85 passed, 0 failed (was 84).
- **Handoff:** Closed Track C.
- **Changes:** `dev/tests/engine.js` §17 — new test `rules/magic.md §1 distinguishes a fresh project from an unknown-field registry`, reading the real `rules/magic.md` and asserting against its §1 section text: the collapsed old wording ("Missing file (fresh project) or missing field... treat as unknown") is absent; step 2 names `fresh` and `unknown` as distinct outcomes; step 3's silent-proceed branch includes `fresh`; step 4 narrates on mismatch-or-`unknown` and no longer says "including unknown". Structural/textual assertion, not an executable CLI harness case.
- **Notes:** Confirmed at execution time (per T-30C01/T-29S01 precedent, verify the actual mechanism before writing a test): Engine Upgrade Detection has no executor subcommand implementing the compare/narrate logic anywhere in `.magic/scripts/` — it is purely cognitive, evaluated by the agent reading `rules/magic.md` at the start of each `/magic.*` invocation. A behavioral CLI test was therefore not possible; structural/textual assertion on the rule text itself is the correct and only coverage shape, matching T-29T01's precedent exactly (a cognitive `.magic/analyze.md` instruction verified the same way).

### [T-30T01] Verification

- **Spec:** l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` → 85/85 green. `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`, zero warnings. `node dev/scripts/validate-hardlinks.js` → all groups linked, exit 0.
- **Handoff:** Phase close.
- **Notes:** No C14 bump at this task, as predicted — Track C touched only `rules/magic.md` and `dev/tests/engine.js`, both outside `.magic/` checksum tracking (same shape as Phase 13, Phase 18 Track E). Phase's total engine-version delta remains 2.1.86 → 2.1.89, entirely from Tracks A/B.

## Validation Coverage

Track A: 3 new cases (every `.checksums` entry git-tracked; both scanners exclude a synthetic gitignored fixture) — 81 → 84. Track B: covered by the existing suite (confirmed no test asserted the removed wording before deletion) plus `validate-hardlinks.js`. Track C: 1 new structural case (T-30C02) — 84 → 85. Harness 81 → 85 across the whole phase.
