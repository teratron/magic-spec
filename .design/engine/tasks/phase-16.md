---
phase: 16
name: "Documentation Parity & Scaffold Boundary"
status: Todo
subsystem: ".magic, rules, dev/tests"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 16 Tasks — Documentation Parity & Scaffold Boundary

**Phase:** 16
**Status:** Todo
**Strategic Goal:** Every `init.md` surface that claims what `init` produces matches what `init.js` actually produces — including the three cognitive-suite scenarios that bake the false claim into their own expected outcomes — and the SDD gains a detection surface for structural coupling, the one containment failure no token scan can see.

## Atomic Checklist

- [ ] [T-16A01] Correct the `STATE.md` bootstrap claim on every `init.md` surface (WI-10)
- [ ] [T-16A02] Correct the same claim in the cognitive suite's expected outcomes (WI-10)
- [ ] [T-16B01] Add the RC-12 scaffold-removal check to ventilation
- [ ] [T-16B02] State the scaffold framing in the ambient agent rules (RC-12)
- [ ] [T-16T01] Validation — C14 bump, hardlink parity, harness

## Detailed Tracking

### [T-16A01] Correct the `STATE.md` bootstrap claim on every `init.md` surface (WI-10)

- **Spec:** l1-workspace-intent-routing.md §3 WI-10 (v1.1.0)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (documentation parity)
- **Files:** `.magic/init.md` (§Step 2 narrative ~line 47, Structure Created diagram ~line 68, Init Completion Checklist ~line 95)
- **Verify:** `grep -n "STATE.md" .magic/init.md` — no surface may state or imply that `init` creates `STATE.md`; the Completion Checklist MUST NOT list it among the artifacts to verify, and the diagram entry MUST be annotated as created on the first mutating command. Cross-check the claim against the code: `grep -n "writeFileSync" .magic/scripts/init.js` shows writes for `workspace.json`, `INDEX.md`, and `RULES.md` only.
- **Handoff:** Gates T-16A02 — the suite corrections must match the corrected wording, not the other way round.
- **Notes:** Verified against engine 2.1.62: `initWorkspace()` creates `INDEX.md`, `specifications/`, `tasks/`, and `archives/tasks/`; `STATE.md` is bootstrapped lazily by `update-state.js`'s own template-copy branch, the first time any mutating workflow's SC-2 step runs. WI-10 was widened in v1.1.0 precisely because its original wording bound the diagram alone while the same file makes the claim on two more surfaces — a claim about *when* an artifact is created is load-bearing exactly as a claim about *whether* it is. Do **not** "fix" this by making `init.js` create the file eagerly: `update-state.js` already owns template instantiation, duplicating it recreates the drift mechanism this spec exists to close, and SC-2 already guarantees existence by the first command (rejected alternative, §6).

### [T-16A02] Correct the same claim in the cognitive suite's expected outcomes (WI-10)

- **Spec:** l1-workspace-intent-routing.md §1 (v1.1.0), third field report
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (documentation parity)
- **Files:** `dev/tests/suite.md` (T01 ~line 49, T02 ~line 65, T58 ~line 968)
- **Verify:** `grep -n "all 6 artifacts\|including \`STATE.md\`" dev/tests/suite.md` returns nothing; T01/T02/T58 expected outcomes name only the artifacts `init.js` actually creates. Then run `/magic.dev.simulate` scoped to T01, T02, T58 — all three MUST report PASS against the corrected `init.md`.
- **Handoff:** Requires T-16A01. Gates T-16T01.
- **Notes:** `magic.dev.simulate` evaluates these scenarios cognitively against the documented contract rather than by executing `init.js`, so none of the three can catch this divergence — their own expected outcome already assumes the wrong behavior. Correcting `init.md` alone would leave the suite asserting a fact its source of truth no longer supports, which is a worse state than the current consistent-but-wrong one. Suite version and test count are unchanged: this is expected-outcome text, not a new scenario.

### [T-16B01] Add the RC-12 scaffold-removal check to ventilation

- **Spec:** l1-sdd-reference-containment.md §4.4, §5 note 6 (v1.4.0)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (scaffold boundary)
- **Files:** `.magic/analyze.md` (Mode C Ventilation steps after the existing step 6, Advisory Report Findings Schema, both Completion Checklists)
- **Verify:** `grep -n "SDD_SCAFFOLD_COUPLING" .magic/analyze.md` returns hits in the Mode C step body, the Findings Schema table, and both checklists; the step MUST enumerate all five inspection points from §4.4 and state the `→ /magic.task {ws}` remediation path when the finding count is above zero.
- **Notes:** Model this on the existing `SDD_REFERENCE_LEAK` step (step 6) — same advisory severity, same read-only contract, same RC-10 remediation owner; severity is *described* as higher (coupling can break a build, a leak only dirties an artifact) but the owner is unchanged and product files are still never auto-edited. The five points are build/lifecycle manifests, CI/CD configs, packaging include lists, product source and tests, and product toolchain manifests. Two carve-outs must survive into the shipped text: the check runs in consumer projects only (RC-8's partial exemption — the engine directories are the product in this repository, while `.design/` is scaffolding here as everywhere), and the pre-commit hook `init.js` installs is exempt, since `.git/hooks/` is neither committed nor packaged and gating a commit is not gating a build. This is a cognitive check — no script.

### [T-16B02] State the scaffold framing in the ambient agent rules (RC-12)

- **Spec:** l1-sdd-reference-containment.md §5 note 6 (v1.4.0)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (scaffold boundary)
- **Files:** `rules/magic.md` §6, `.agents/rules/magic.md` (hardlink twin)
- **Verify:** Both paths MUST be byte-identical and share an inode — `fsutil hardlink list rules\magic.md` lists both, and `Get-FileHash rules\magic.md, .agents\rules\magic.md` returns matching hashes. Content check: `grep -n "scaffold" rules/magic.md` returns the framing statement and the removal test.
- **Notes:** [C-001] applies — both Write and Edit create a new inode in this repository, silently delinking the twin, which then keeps the pre-edit content. Recreate the link and verify by hash, never by the editor's exit code. The ambient surface is where this matters most: coupling is typically introduced by a direct user-prompted edit ("add a lint script", "wire this into CI") rather than inside a `run` workflow the role cards mediate. State the framing once — the SDD and engine directories are scaffolding, and the product must build, test, run, and package with all five directories deleted — and keep it short; §6 is already the longest section in the file. Note that `rules/` sits outside C14 checksum tracking (R8), so this edit alone does not bump the engine version — T-16B01's `.magic/` edit is what carries the bump.

### [T-16T01] Validation — C14 bump, hardlink parity, harness

- **Spec:** l2-test-suite.md §Shipped-text contract coverage; AGENTS.md §2.4 (C14)
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Files:** `.magic/.version`, `.magic/.checksums`
- **Verify:** All four MUST pass — `node .magic/scripts/executor.js update-engine-meta`; `node dev/scripts/validate-hardlinks.js` reports zero drift; `node --test dev/tests/engine.js` green (the RC-2.1 shipped-text assertions read `rules/magic.md` and `.magic/analyze.md`, both edited by this phase); `node .magic/scripts/executor.js update-engine-meta --check` reports no drift.
- **Notes:** C14 runs once here, after both tracks land. The shipped-text harness cases are the reason this phase needs the harness at all despite touching no script — they assert contracts over the prose files this phase rewrites, so a careless rewrite of §6 can fail a test that no code change caused.
