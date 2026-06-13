---
phase: 13
name: "Upgrade-Detection Decision-Autonomy Alignment"
status: Done
subsystem: "rules/magic.md §1 + README.md"
requires: []
provides:
  - "rules/MAGIC.md §1 Engine Upgrade Detection is DA-8/DA-9-aligned: drift narrated with one recommended path (/magic.analyze), no [y/n] prompt"
  - "README Updating section describes narrate-and-recommend (no blocking prompt)"
key_files:
  created: []
  modified:
    - "rules/magic.md"
    - "README.md"
patterns_established:
  - "Drift-revalidation offers narrate a single recommended path and proceed (SC-4 form) — never a [y/n] menu"
duration_minutes: 12
---

# Stage 13 Tasks — Upgrade-Detection Decision-Autonomy Alignment

**Phase:** 13
**Status:** Done
**Strategic Goal:** Deploy l1-decision-autonomy.md v1.2.0 §5.3(c). Replace the `[y/n]` prompt in `rules/MAGIC.md` §1 Engine Upgrade Detection with the DA-8/DA-9 single-path form (narrate drift + one recommended path, proceed), matching the SC-4 informational-line treatment the status command already uses.

## Atomic Checklist

- [x] [T-13A01] Rewrite rules/magic.md §1 steps 4-6 to single-path form + recreate hardlink
- [x] [T-13A02] Update README Updating section ([y/n] → narrate-and-proceed)
- [x] [T-13T01] Validation: C14, harness, residual grep, hardlink, integrity

## Detailed Tracking

### [T-13A01] Rewrite §1 to single-path DA-8/DA-9 form

- **Spec:** l1-decision-autonomy.md §DA-9 (drift-revalidation clause) / §5.3(c)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `rules/magic.md` §1 contains no `[y/n]` prompt and no `On y` / `On n` branches; on drift it narrates one recommended path (`/magic.analyze`) and proceeds. Grep `grep -nE "\[y/n\]|On \*\*y\*\*|On \*\*n\*\*" rules/magic.md` returns zero. `node dev/scripts/validate-hardlinks.js` passes (the `.agents/rules/magic.md` hardlink recreated after the edit).
- **Handoff:** T-13A02.
- **Notes:** Replace steps 4-6: step 4 emits a single informational `[DR]`-style line — `SDD engine drift {snapshot}→{local} — recommend /magic.analyze to revalidate; proceeding with {workflow}. (Override: run /magic.analyze)`; preserve the snapshot-update-only-via-analyze contract and the "stale snapshot re-narrates next session" behavior (no auto-update outside analyze). Keep Exemptions + `MAGIC_DRIFT_CHECK=0`. **C-001**: editing `rules/*.md` with write tools breaks the `.agents/` hardlink — recreate via `New-Item -ItemType HardLink` and revalidate. `rules/` is engine L1 → C14 (T-13T01).
- **Changes:** rules/magic.md §1 steps 4-6 rewritten: step 4 → single informational NOTE (drift + recommend /magic.analyze + proceed, "Override: run /magic.analyze"), no [y/n]; step 5 → proceed, do not block/auto-divert; step 6 → snapshot-only-via-analyze contract + re-narrate-by-design. Procedure intro already carried analyze/status exemptions (Phase 9). Hardlink recreated (New-Item HardLink), validate-hardlinks: rules/ group linked. Residual [y/n] grep: only the prohibition line remains. Note: update-engine-meta detected no .magic/ change → no version bump (rules/ outside .checksums scope — finding R8).

### [T-13A02] Update README Updating section

- **Spec:** l1-decision-autonomy.md §5.3(c)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `README.md` Updating section no longer says the agent "asks **[y/n]**" or "will prompt you"; it describes the narrate-the-drift-and-recommend behavior. Grep `grep -n "\[y/n\]" README.md` returns zero.
- **Handoff:** T-13T01.
- **Notes:** Line ~72 ("asks **[y/n]** whether to re-run") and line ~78 ("the agent will prompt you to run /magic.analyze") → reword to "surfaces the drift and recommends `/magic.analyze` to ratify the upgrade (no blocking prompt)". README is not under `.magic/` — no C14 from this file alone.
- **Changes:** README Updating section: line 72 "asks [y/n]" → "surfaces the drift and recommends /magic.analyze ... then proceeds — no blocking prompt"; step 3 "will prompt you" → "surfaces the drift and recommends /magic.analyze (run it when ready)". Residual [y/n] grep on README: zero.

### [T-13T01] Validation Task

- **Goal:** Verify §1 is DA-8/DA-9-aligned, integral, and consistent.
- **Method:** (1) `node .magic/scripts/executor.js update-engine-meta` — C14 bump for the `rules/` engine change + checksum regen. (2) `node dev/tests/engine.js` → all pass (15; no new test — doc/rule wording). (3) Residual grep: `grep -nE "\[y/n\]" rules/magic.md README.md` → zero; `rules/magic.md` §1 still lists the analyze + status exemptions and `MAGIC_DRIFT_CHECK=0`. (4) `node dev/scripts/validate-hardlinks.js` → all linked. (5) `update-engine-meta --check` (note: `.checksums` covers `.magic/` only — confirm no unexpected drift); `check-prerequisites --json --workspace engine` → ok.
- **Status:** Done
- **Changes:** Harness 15/15. Residual [y/n]: zero actual prompts (only the prohibition line in §1). Exemptions + MAGIC_DRIFT_CHECK=0 intact. validate-hardlinks: rules/ group linked. check-prerequisites: ok, 0 warnings. **Engine version NOT bumped** — update-engine-meta found no .magic/ change (rules/ + README outside .checksums scope); engine stays 2.1.41. Two findings → Backlog: R8 (rules/ + skills/ outside C14 version/checksum tracking) and R9 (AGENTS-family hardlinks GEMINI/QWEN/CODEX delinked, nlink=2, pre-existing — restore via /magic.dev.init).
