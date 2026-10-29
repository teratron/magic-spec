---
phase: 28
name: "Silent-Failure Pair — Link Coverage & Regeneration Trigger"
status: Done
subsystem: "dev/scripts"
requires: []
provides:
  - "l2-agent-surface.md 1.1.0: SS4 closed three-group linked-pair inventory (AGENTS family, rules/, workflows/) + mandatory coverage invariant + explicit skills/ non-pair exclusion; SS2.1/SS2.3 corrected"
  - "l2-skill-wrappers.md 1.4.0: SS3.2 regeneration-trigger invariant, bound to workflows/ source files rather than the .magic/ checksum manifest"
  - "dev/scripts/validate-hardlinks.js: table-driven validateDirectoryPairLinks() covering rules/ and workflows/, module.exports + require.main guard added"
  - "STATE.md [C-001] widened to name all three linked-pair groups as one closed class"
  - ".magic/scripts/update-engine-meta.js: syncSkillWrappers() extracted and called unconditionally on the write path when .magic/ is unchanged; --check stays strictly read-only; scope-accurate log message"
  - "dev/tests/engine.js 69 -> 72 tests (5c/5d update-engine-meta.js, SS19 validate-hardlinks.js), all three new cases negative-controlled against reverted/pre-fix code; l2-test-suite.md 1.17.0"
  - "engine 2.1.79 -> 2.1.80, all 70 .magic/ files re-checksummed, 14 skill wrappers regenerated, dev-repo snapshot synced"
key_files:
  created: []
  modified:
    - ".design/engine/specifications/l2-agent-surface.md"
    - ".design/engine/specifications/l2-skill-wrappers.md"
    - ".design/engine/specifications/l2-test-suite.md"
    - "dev/scripts/validate-hardlinks.js"
    - ".design/engine/STATE.md"
    - ".magic/scripts/update-engine-meta.js"
    - "dev/tests/engine.js"
patterns_established:
  - "A tooling defect that reports success while shipping stale output is a silent-failure class bug — the fix must include a negative control proving the new test actually fails against the pre-fix code, not just that it passes against the fix"
  - "A validation script covering N hardcoded groups needs a companion inventory artifact (the spec's closed table) stating the invariant that ALL groups are covered — the code alone cannot express 'and there are no others'"
  - "Before widening a manifest/scope to fix a detection gap, read the code for why that scope was narrowed in the first place — an inline comment documenting a deliberate exclusion (here: workflows/ kept out of the checksum manifest for partial-install support) can turn the obvious fix into a regression"
  - "fs.writeFileSync() on Windows/NTFS rewrites through the existing inode and does NOT break a hardlink; only an unlink-then-write (or an editor's atomic-write pattern) replaces the inode — test fixtures simulating a 'broken hardlink' must use unlink+write, not a plain overwrite"
duration_minutes: ~
---

# Stage 28 Tasks — Silent-Failure Pair: Link Coverage & Regeneration Trigger

**Phase:** 28
**Status:** Done
**Strategic Goal:** Close the two engine defects Phase 27 hit in production (R25, R26). Both are silent-failure class — the integrity tooling reported success while shipping stale output — and they compose: the first delinks a source tree without warning, the second refuses to regenerate from the repaired one.

## Atomic Checklist

- [x] [T-28A01] Specify the linked-pair inventory and its validation invariant
- [x] [T-28A02] Specify the skill regeneration trigger
- [x] [T-28B01] Extend the hardlink validator to every declared pair
- [x] [T-28B02] Widen the C-001 blocking constraint to name every linked pair
- [x] [T-28C01] Decouple skill regeneration from the checksum verdict
- [x] [T-28T01] Harness coverage with negative controls for both fixes
- [x] [T-28T02] C14 bump and engine integrity verification

## Detailed Tracking

### [T-28A01] Specify the linked-pair inventory and its validation invariant

- **Spec:** l2-agent-surface.md (adapter-facing `.agents/` surface)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-agent-surface.md` gains a section enumerating the three linked pairs (AGENTS family, `rules/` ↔ `.agents/rules/`, `workflows/` ↔ `.agents/workflows/`) and stating the invariant that every declared pair is validated — no pair may exist that the validator does not check. The section explicitly records that `skills/` is **not** a linked pair. Version bumped; `.design/engine/INDEX.md` row matches; `check-prerequisites --verify-headers` clean.
- **Handoff:** Gates T-28B01 and T-28B02 — both implement what this task states.
- **Changes:** `l2-agent-surface.md` 1.0.1 → 1.1.0 — new §4 Linked-Pair Inventory & Validation Invariant (the closed three-group table, the mandatory-coverage invariant, the explicit `skills/` non-pair exclusion with its live-verified reason); §2.1 and §2.3 corrected — the latter had called `.agents/rules/` "Reserved" though it has been an active hardlink target since before this spec's 1.0.0; Canonical References cross-referenced to §4. INDEX row synced.
- **Notes:** SDD-First ordering: the invariant is written before the code enforcing it. The root cause of R25 was not a missing check but a missing *inventory* — `validate-hardlinks.js` hardcodes two groups and nothing anywhere lists what the complete set should be, so a third pair existed unguarded with no artifact to contradict it. Record the `skills/` exclusion with its reason (`sync-skills` generates independently into `skills/` and `.agents/skills/`, verified: `skills/magic-spec/SKILL.md` has one link, not two) — otherwise a future reader will "fix" a fourth pair that must not exist.

### [T-28A02] Specify the skill regeneration trigger

- **Spec:** l2-skill-wrappers.md (skill projection contract)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-skill-wrappers.md` gains an invariant stating that skill-wrapper regeneration is triggered by the engine-write operation itself, never gated on a change-detection scope narrower than the set of source files the generator reads. The clause names the concrete asymmetry: the generator reads `workflows/`, while `.magic/.checksums` deliberately excludes it. Version bumped; INDEX row matches.
- **Handoff:** Gates T-28C01.
- **Notes:** State the constraint that rules out the tempting fix. `update-engine-meta.js` excludes `workflows/`, `skills/`, and `rules/` from the checksum manifest **on purpose** — the inline comment cites user-customizable wrappers and partial-installation support — so widening the manifest to cover `workflows/` would break a live contract to repair a reporting bug. The invariant must therefore bind the *trigger*, not the *manifest*.
- **Changes:** `l2-skill-wrappers.md` 1.3.0 → 1.4.0 — new §3.2 Regeneration Trigger (Independent of Checksum Manifest): the asymmetry table (checksum manifest vs. regeneration trigger, what each reads and why), the mandatory invariant binding regeneration to every write invocation regardless of the `.magic/` verdict, and the `--check` exemption. New §5 Trigger Independence bullet. INDEX row synced.

### [T-28B01] Extend the hardlink validator to every declared pair

- **Spec:** l2-agent-surface.md (invariant authored in T-28A01)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/scripts/validate-hardlinks.js` reports three groups and exits 0 on the current tree (all 7 `workflows/*.md` pairs are presently intact). The directory-pair groups are table-driven — adding a future pair is a data change, not a fourth copy of the group-2 block. **Do not break a live pair to test the detection**: the negative control belongs in a throwaway fixture tree and is owned by T-28T01, which runs the validator against a deliberately delinked copy. Damaging the real `.agents/` tree to prove a check works risks the exact stale-content state this phase exists to prevent.
- **Handoff:** Pairs with T-28B02 to close R25.
- **Changes:** `dev/scripts/validate-hardlinks.js` — replaced the hardcoded `validateRulesLinks()` with a table-driven `validateDirectoryPairLinks(sourceDir, targetDir, label)`, called once for `rules/` (unchanged behavior) and once for the new `workflows/` group; `main()` aggregates all three groups' drift/missing counts. Added `module.exports` + `require.main === module` guard (matches the repo's `sync-skills.js`/`update-state.js` convention) so the harness can grow beyond CLI-only invocation later. **Found and fixed a real bug while writing the doc comment**: the literal path example `` skills/*/SKILL.md `` contains the character sequence `*/`, which terminates a JS block comment early — `node -c` failed with `SyntaxError: Unexpected identifier 'skills'` until reworded to `skills/{name}/SKILL.md`. Live-verified against the real tree: all 7 `workflows/*.md` pairs report linked, exit 0.
- **Notes:** Group 2 (`rules/`) and the new group 3 (`workflows/`) have identical shape — read the source directory, pair each `*.md` with its `.agents/` twin, compare inode fingerprints. Collapse them into one parameterized routine driven by the pair list rather than duplicating the block; the whole lesson of R25 is that a hardcoded subset silently under-covers. Group 1 (AGENTS siblings) has a different anchor-based shape and stays separate. The negative control is not optional: without it the new group passes vacuously on a healthy tree and would never have caught the Phase 27 break either.

### [T-28B02] Widen the C-001 blocking constraint to name every linked pair

- **Spec:** l2-agent-surface.md (invariant authored in T-28A01); l1-session-continuity.md (STATE.md contract)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `[C-001]` in `.design/engine/STATE.md` names all three linked pairs rather than `rules/*.md` alone, and states the verification step (`fsutil hardlink list` plus a hash comparison) that catches a break the edit itself never reveals. `.magic/templates/state.md` is **not** touched — its C-001 line is a `{Constraint Title}` placeholder, not this constraint.
- **Handoff:** Closes R25 together with T-28B01.
- **Changes:** `.design/engine/STATE.md` `[C-001]` rewritten to name all three linked pairs (AGENTS family, `rules/*.md`, `workflows/*.md`) as one closed class cross-referenced to `l2-agent-surface.md` §4, explicitly excludes `skills/`, and states the `fsutil hardlink list` + hash-comparison verification step. `.magic/templates/state.md` confirmed untouched — still the generic `{Constraint Title}` placeholder. Confirmed no other live (non-journal) file states a narrower C-001 definition needing sync; `l2-status-command.md`'s C-001 mention is an accurate historical deployment note for that phase's own `rules/`-only edit, left as-is.
- **Notes:** The constraint's entire value is in naming the paths it protects. During Phase 27 the C-001 ritual was executed correctly and thoroughly for `rules/magic.md` — and was silent one directory over for `workflows/magic.spec.md`, because the text named only the former. Widen the wording to bind on the *class* (any file with an `.agents/` twin) and list the current members, so the next unlisted pair fails the class test rather than slipping through.

### [T-28C01] Decouple skill regeneration from the checksum verdict

- **Spec:** l2-skill-wrappers.md (invariant authored in T-28A02)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** A `workflows/`-only edit followed by `node .magic/scripts/executor.js update-engine-meta` regenerates the affected `skills/*/SKILL.md` — verified end-to-end by editing a wrapper, running the command, and grepping the regenerated wrapper for the change. `update-engine-meta --check` remains strictly read-only: confirm it writes nothing and still exits 0 on a clean tree.
- **Handoff:** Closes R26.
- **Changes:** `.magic/scripts/update-engine-meta.js` — extracted the existing sync-skills invocation into a `syncSkillWrappers()` helper (removes duplication, documents *why* it's callable independent of the checksum verdict); the `if (anyChanged) {...} else {...}` split into three branches — the original write path unchanged, a new `else if (checkOnly)` that stays strictly read-only with a scope-accurate message, and a new plain `else` (write mode, `.magic/` unchanged) that calls `syncSkillWrappers()` unconditionally. Reworded "No changes detected in engine core" → "No changes detected in .magic/ (checksum-tracked engine core)" on both branches — the old wording was factually misleading exactly while `workflows/` held an uncommitted change. **Negative-controlled**: temporarily removed the new `else`-branch call, confirmed the new T-28T01 tests fail against that reverted state, restored, confirmed green again. `--check` verified to perform zero writes (`.version`/`.checksums` byte-identical before/after) and zero skill regeneration even with a pending `workflows/` change.
- **Notes:** Move the `sync-skills` invocation out of the `hasChanges` branch on the **write** path only. `--check` is an L1 user entry point — it is hardcoded into the pre-commit hook installed by `install-hooks.js` — so it must not gain a write side effect; that would turn every user commit into an engine mutation. Keep the existing `fs.existsSync` graceful-fallback guard around the dev-script call intact: it is the single sanctioned L1→L2 exception, and a user installation with no `dev/` tree must still warn and continue rather than crash. The "No changes detected in engine core" message is itself part of the defect — it was factually false while `workflows/` held uncommitted changes; reword it to name the scope it actually checked.

### [T-28T01] Harness coverage with negative controls for both fixes

- **Spec:** l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/tests/engine.js` green with new cases: (a) the validator detects a broken `workflows/` pair in a fixture and passes on an intact one; (b) a `workflows/`-only change triggers skill regeneration; (c) `--check` performs no write. Each case fails against the pre-fix logic — assert that by reconstructing it, per the negative-control precedent set when the `addDecision` fix was retro-covered. `l2-test-suite.md` version bumped with its INDEX row matching.
- **Handoff:** Precedes T-28T02.
- **Changes:** `dev/tests/engine.js` 69 → 72 tests. **5c** — `update-engine-meta.js` regenerates `skills/*/SKILL.md` from a `workflows/`-only edit even though `.magic/` reports no change; negative-controlled by temporarily removing the new-branch call and confirming failure (`ERR_ASSERTION` on the exact assertion the fix satisfies), then restoring. **5d** — `--check` performs zero writes to `.version`/`.checksums` and never regenerates skills under an identical pending-`workflows/`-change condition, pinning the boundary the write-path fix must not cross. **§19 (new top-level section)** — `validate-hardlinks.js` covers a hardlinked `workflows/` pair (control: intact pair passes, group actually runs) and detects one delinked via unlink+rewrite (the inode-replacing shape a write-replace editor produces); negative-controlled against the actual pre-fix two-group validator sourced from `git show HEAD:dev/scripts/validate-hardlinks.js` — confirmed the identical fixture passes silently there before confirming the fix catches it. `l2-test-suite.md` 1.16.0 → 1.17.0, Document History records both defects closed and the negative-control method used for each.
- **Notes:** Unlike Phase 27, this phase ships real executor code paths, so coverage belongs in the script harness rather than the cognitive suite. Both defects were invisible to every existing green check — a test that passes on a healthy tree without ever having failed on a broken one reproduces exactly the blindness being fixed, which is why the negative control is written into the Verify rather than left to judgment.

### [T-28T02] C14 bump and engine integrity verification

- **Spec:** RULES.md C14
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta` completes; `update-engine-meta --check` exits 0; `.magic/.version` incremented from 2.1.79; `node dev/scripts/validate-hardlinks.js` exits 0 across all three groups; `node dev/tests/engine.js` green.
- **Handoff:** Phase close.
- **Changes:** `node .magic/scripts/executor.js update-engine-meta` (no `--workflow` tag — only `.magic/scripts/update-engine-meta.js` fell inside `.magic/` this phase) bumped 2.1.79 → 2.1.80, regenerated all 14 skill wrappers (7 public + 7 dev), synced the dev-repo Engine Version snapshot to 2.1.80, regenerated `.magic/.checksums` over 70 files. Post-bump validation: `update-engine-meta --check` exit 0; `validate-hardlinks.js` exit 0 across all three groups (workflows/ 7/7 linked, rules/ 1/1, AGENTS 3/4 — the pre-existing, unrelated `GEMINI.md` gap, untouched by this phase); `dev/tests/engine.js` 72/72 green; `check-prerequisites --verify-headers` returns `ok: true` with only the expected `CONFIG_DRIFT` (uncommitted `.design/RULES.md`, pre-existing from Phase 27, unrelated to this phase's scope).
- **Notes:** Only `.magic/scripts/update-engine-meta.js` falls inside `.magic/`; `dev/scripts/` and `dev/tests/` are outside C14 tracking, and no workflow body is touched, so the bump carries **no** `--workflow` tag. This is also the first live exercise of T-28C01's own fix — the bump either regenerates wrappers unconditionally or it does not, and this task is the proof, in the same self-referential pattern Phases 24, 25, and 26 each recorded.

## Validation Coverage

`T-28T01` is this phase's validation task. Both fixes ship executable code, so coverage lives in the script harness (`dev/tests/engine.js`) with mandatory negative controls; the cognitive suite is not extended, since neither change alters workflow prose.
