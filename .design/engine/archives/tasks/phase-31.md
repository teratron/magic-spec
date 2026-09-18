---
phase: 31
name: "Diagnostics Revalidation Before Render (DG-10)"
status: Done
subsystem: ".magic/scripts"
requires: []
provides:
  - "lib/diagnostics.js: record() suppresses recording for the duration of a recheck (MAGIC_DIAGNOSTICS_SUPPRESS) — self-reference guard, l1-engine-diagnostics.md DG-10"
  - "lib/diagnostics.js: revalidate(findings) — groups by recheck signature, reruns each once, drops findings whose code no longer reproduces, fails open on any recheck error"
  - "check-prerequisites.js: warn() attaches a recheck descriptor to every finding it records (its own script, its own current flags/MAGIC_DESIGN_DIR)"
  - "finalize.js: revalidate() wired between drain()/read() and emitTail() on both exit paths — a resolved condition no longer renders as still open"
key_files:
  created: []
  modified:
    - ".magic/scripts/lib/diagnostics.js"
    - ".magic/scripts/check-prerequisites.js"
    - ".magic/scripts/finalize.js"
    - "dev/tests/engine.js"
patterns_established:
  - "A finding that asserts a condition about current repository state, not an event that already happened, carries the means to reverify itself (`recheck`) — the digest reruns it once per signature immediately before every render, and a resolved condition is dropped rather than shown as still open."
  - "Any recheck that runs the same code path an emitter's normal recording call sits inside must run under an explicit suppression guard — otherwise the act of checking becomes a second, unrecorded write into the very sink being read."
duration_minutes: ~
---

# Stage 31 Tasks — Diagnostics Revalidation Before Render (DG-10)

**Phase:** 31
**Status:** Done
**Strategic Goal:** Close a field-reported false positive: `finalize --workflow=task` rendered `ORPHANED_SPEC`/`SYNC_GAP` findings that `check-prerequisites` had recorded at a workflow's own Pre-flight, after that same invocation's own writes (e.g. `magic.task` regenerating `PLAN.md`/`TASKS.md`) had already resolved the condition — reproduced live during this phase's own planning session. Implements [l1-engine-diagnostics.md](../specifications/l1-engine-diagnostics.md) v1.1.0 DG-10 and [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §4.10: a condition finding declares a read-only `recheck`; the digest reruns it once per signature immediately before every render and drops what no longer reproduces.

## Atomic Checklist

- [x] [T-31A01] Self-reference suppression guard on `record()`
- [x] [T-31A02] `revalidate(findings)` in `lib/diagnostics.js`
- [x] [T-31B01] `check-prerequisites.js` attaches `recheck` to every finding
- [x] [T-31C01] Wire `revalidate()` into `finalize.js`'s terminal pipeline
- [x] [T-31T01] Regression: 6 new cases (§6.10-15)
- [x] [T-31T02] Verification

## Detailed Tracking

### [T-31A01] Self-reference suppression guard on `record()`

- **Spec:** [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §4.2 (Collector Contract) — `record()`'s `MAGIC_DIAGNOSTICS_SUPPRESS` check; concept authority [l1-engine-diagnostics.md](../specifications/l1-engine-diagnostics.md) v1.1.0 DG-10, "Self-reference guard"
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node -e` smoke check confirmed `record()` under `MAGIC_DIAGNOSTICS_SUPPRESS=1` returns `false` and creates no sink file. Full assertion lands in `dev/tests/engine.js` §6.15 (T-31T01).
- **Handoff:** None — file-independent of Track B. T-31A02 landed in the same file.
- **Changes:** `lib/diagnostics.js` `record()` gains `if (process.env.MAGIC_DIAGNOSTICS_SUPPRESS) return false;` as its first line, before the `try` block — a suppressed call pays for nothing, not even `normalize()`.
- **Notes:** Check MUST be the first thing `record()` does, before `normalize()` — a suppressed call should not even pay for validation.

### [T-31A02] `revalidate(findings)` in `lib/diagnostics.js`

- **Spec:** [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §4.2 (Collector Contract, `revalidate()` signature) + §4.10 (Revalidation — full mechanics); concept authority [l1-engine-diagnostics.md](../specifications/l1-engine-diagnostics.md) v1.1.0 DG-10
- **Status:** Done
- **Assignment:** Agent
- **Verify:** manually dry-ran all five shapes against a throwaway fixture before committing them to the suite; formalized in `dev/tests/engine.js` §6.10-14 (T-31T01) — all pass, all negative-controlled against `git show HEAD` (pre-fix `diagnostics.js` has no `revalidate` export at all).
- **Handoff:** Gated T-31C01 — satisfied.
- **Changes:** `lib/diagnostics.js` gains `runRecheck(recheck)` (spawns `node .magic/scripts/{script}.js {...args}` via `execFileSync`, 5s timeout, `MAGIC_DIAGNOSTICS_SUPPRESS=1` forced onto the child env, returns the recheck's `warnings[].type` as a `Set` or `null` on any failure) and `revalidate(findings)` (partitions by presence of `recheck`, groups recheck-bearing findings by signature, calls `runRecheck` once per signature, keeps a finding iff its `code` is in the signature's result set or the recheck failed). Also fixed `normalize()`, discovered mid-implementation: it destructured only the five original DG-3 fields and silently dropped `recheck` before the finding ever reached the sink — now threads `recheck` through with its own shape validation (malformed → no revalidation for that finding, finding itself still recorded).
- **Notes:** Spawns the L1 script directly (not through `executor.js` — rejected per [l1-engine-diagnostics.md](../specifications/l1-engine-diagnostics.md) §5 Drawbacks: `executor.js` re-resolves `MAGIC_DESIGN_DIR` from ambient `--workspace`/`workspace.json` at revalidation time, which can diverge from the workspace the original check actually ran against). Matches findings to survivors by `code` present in the recheck's `warnings[].type` — class-level, same granularity DG-4's existing dedup already uses, not per-instance (documented limitation, [l1-engine-diagnostics.md](../specifications/l1-engine-diagnostics.md) §5 Drawbacks "Granularity (DG-10)"). Also added `SCRIPT_NAME_RE` (mirrors `executor.js`'s own path-traversal guard on a script name) and `RECHECK_TIMEOUT_MS = 5000`, neither in the original spec's [REFERENCE] pseudo-code but both direct consequences of spawning a named script from data.

### [T-31B01] `check-prerequisites.js` attaches `recheck` to every finding

- **Spec:** [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §4.10 ("`check-prerequisites.js` is, as of this version, the only emitter that attaches one") + §5.4 (Migration Inventory)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** ran `node .magic/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` live against this repository (already mid-refactor, so `ENGINE_INTEGRITY` fired genuinely) and inspected `.design/.cache/diagnostics.jsonl` directly — each recorded entry carried `recheck.script === "check-prerequisites"`, `recheck.args === ["--json"]` (no other semantic flags were set on that particular invocation), `recheck.env.MAGIC_DESIGN_DIR === ".design/engine"`. Confirmed live.
- **Handoff:** Feeds T-31C01's end-to-end path; independent of Track A's own file. Satisfied.
- **Changes:** `check-prerequisites.js` gains module-scope `RECHECK_ARGS` (built once from `reqPlan`/`reqTasks`/`reqSpecs`/`verifyHeaders`, `--json` forced unconditionally) declared just above `warn()`. `warn()` attaches `finding.recheck = { script: 'check-prerequisites', args: RECHECK_ARGS, env: { MAGIC_DESIGN_DIR: process.env.MAGIC_DESIGN_DIR || '.design' } }` before calling `diagnostics.record(finding)`.
- **Notes:** A real ordering hazard, caught before it shipped: the module-scope `designDir` const isn't declared until after the `ENGINE_INTEGRITY` checksum-integrity block, but `warn()` is called from inside that same block (this script's earliest possible warning) — closing over `designDir` in `warn()`'s body would have thrown a TDZ `ReferenceError` on the very first warning the script can ever produce. Fixed by re-reading `process.env.MAGIC_DESIGN_DIR || '.design'` fresh inside `warn()` instead of referencing the outer const. `reqPlan`/`reqTasks`/`reqSpecs`/`verifyHeaders` have no such hazard — declared at the top of the file, before any call site.

### [T-31C01] Wire `revalidate()` into `finalize.js`'s terminal pipeline

- **Spec:** [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §4.7 (Tail Emitter and Terminal Order, amended) + §4.10
- **Status:** Done
- **Assignment:** Agent
- **Verify:** live end-to-end reproduction against this repository, not just a fixture: temporarily set `PLAN.md`'s `Based on` pointer to a stale version, ran Pre-flight (recorded a real `SYNC_GAP` with `recheck` attached), restored the pointer to correct, then ran `finalize --workflow=task --workspace=engine --dry-run` — the `### Engine diagnostics` section listed only the still-genuinely-open `ENGINE_INTEGRITY`, with **no** `SYNC_GAP`. `git diff --stat` on `PLAN.md` before/after the temporary edit confirmed byte-for-byte restoration (no stray data loss from the round-trip). Structural terminal-order regression formalized in T-31T01.
- **Handoff:** Gated T-31T01's end-to-end cases; depended on T-31A02 (satisfied) and was exercised with real recheck-bearing findings once T-31B01 landed (satisfied).
- **Changes:** `finalize.js`: both `const findings = opts.dryRun ? diagnostics.read() : diagnostics.drain();` call sites (the `emitSkip` path and the `emitSuccess` path) become `const findings = diagnostics.revalidate(opts.dryRun ? diagnostics.read() : diagnostics.drain());` — `revalidate()` still runs last of all, after every other pipeline step, on both paths.
- **Notes:** Applies to both `--dry-run` (`read()`) and the real path (`drain()`) — DG-4.1's "render is unrestricted, drain belongs to the mutating path alone" extends unchanged to revalidation, which is a read operation with respect to the sink.

### [T-31T01] Regression: 6 new cases (§6.10-15)

- **Spec:** [l2-engine-diagnostics.md](../specifications/l2-engine-diagnostics.md) v1.2.0 §6 (Regression Coverage, items 10-15)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` → 92 passed, 0 failed (was 86). `node --test --test-name-pattern="DG-10" dev/tests/engine.js` → 6 passed in isolation.
- **Handoff:** Gated T-31T02 — satisfied.
- **Changes:** New subsection "16a-2. lib/diagnostics.js — revalidation before render (DG-10)" in `dev/tests/engine.js`, between the existing `formatDigest` coverage and the `--dry-run` finalize test: a `writeRevalidateFixture()` helper (a controllable recheck target echoing `{warnings: JSON.parse(FIXTURE_WARNINGS)}` and counting its own invocations) plus 6 tests — drops a resolved condition, keeps an unresolved one, collapses two same-signature findings to one spawn, fails open on a nonexistent recheck target, passes an event finding through untouched, and (combined) confirms `record()`'s suppression guard plus a live self-reference check through the real `check-prerequisites.js` emitter.
- **Notes:** Negative control confirmed via `git show HEAD:{file}` on all three modified scripts — none contained `revalidate`, `MAGIC_DIAGNOSTICS_SUPPRESS`, or a `recheck` attachment, so every new case exercises genuinely new code, not a coincidental pass against old behavior (this stands in for the reverted-code re-run Phase 28 used, and is stronger where applicable — the new API surface plainly did not exist at all rather than existing-but-buggy).

### [T-31T02] Verification

- **Spec:** l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node .magic/scripts/executor.js update-engine-meta` → engine `2.1.93 → 2.1.94`, 71 files checksummed, dev-repo `.design/INDEX.md` Engine Version snapshot synced (Phase 24 exemption). `node --test dev/tests/engine.js` (post-C14) → 92/92 green. `node .magic/scripts/executor.js check-prerequisites --json --verify-headers --workspace=engine` → `ok: true`, `warnings: []` — the `ENGINE_INTEGRITY` findings that were genuinely open mid-phase are gone now that checksums match again.
- **Handoff:** Phase close.
- **Notes:** C14 ran once, here, after every track landed — matches the one-bump-per-phase convention used throughout this workspace's history. No `--workflow` tag: this phase touched only `.magic/scripts/*.js`, no dotted workflow-doc body, matching the Phase 21 precedent.

## Validation Coverage

Track A: 5 new cases (§6.10, §6.11, §6.12, §6.13, §6.14). Track A+B shared: 1 new case (§6.15, "Recheck does not feed the sink" — exercised live against the real `check-prerequisites.js` emitter). Track C: covered by the live field-report reproduction against this repository's own `PLAN.md`/`INDEX.md` (no new numbered harness case — structural confirmation, same shape as Phase 30's T-30C02 precedent). Harness 86 → 92 across the whole phase. Engine 2.1.93 → 2.1.94.
