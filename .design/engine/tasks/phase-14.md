---
phase: 14
name: "Shipped Reference Hygiene & Documentation Sync"
status: Todo
subsystem: ".magic, workflows, skills, docs"
requires: []
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 14 Tasks — Shipped Reference Hygiene & Documentation Sync

**Phase:** 14
**Status:** Todo
**Strategic Goal:** Every reference inside a shipped artifact resolves on a case-sensitive filesystem, and the user-facing documentation set matches the engine it documents. Closes the findings raised by the 2026-08-06 ventilation.

## Atomic Checklist

- [ ] [T-14A01] Preserve file extensions in the skill-wrapper body normalizer
- [ ] [T-14A02] Regenerate skill wrappers and verify no mangled filenames remain
- [ ] [T-14B01] Purge `rules/MAGIC.md` case drift from engine workflow bodies
- [ ] [T-14B02] Purge `rules/MAGIC.md` case drift from workflow wrappers; restore hardlinks
- [ ] [T-14C01] Sync README version reference and engine upgrade-rule citation
- [ ] [T-14C02] Fix CONTRIBUTING spec count and workspace registry link
- [ ] [T-14C03] Repair `docs/README.md` dead link and complete the workflow table
- [ ] [T-14C04] Author `docs/graph.md` and `docs/status.md`
- [ ] [T-14D01] Add `## Canonical References` to `l2-multi-angle-review.md`
- [ ] [T-14D02] Bind conventions C6 and C10 to `l1-engine-core.md`
- [ ] [T-14T01] Validation — harness, link integrity, engine meta parity

## Detailed Tracking

### [T-14A01] Preserve file extensions in the skill-wrapper body normalizer

- **Spec:** l2-skill-wrappers.md §Projection
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (generator)
- **Files:** `dev/scripts/sync-skills.js`
- **Verify:** `node -e "const s='rules/magic.md';const {normalizeBody}=require('./dev/scripts/sync-skills.js');" ` is not required — instead assert behaviour end-to-end in T-14A02. Direct check: `grep -n 'endsWith(.\.md.)' dev/scripts/sync-skills.js` returns a hit inside the **body** normalizer block (currently the guard exists only in the frontmatter block near line 133).
- **Handoff:** Gates T-14A02 and the whole of Track B.
- **Notes:** The body path applies `.replace(/\bmagic(\.[a-z][a-z0-9-]*)+(?=\b)/gi, m => m.replace(/\./g, '-'))`. For the input `rules/magic.md` it matches `magic.md` and emits `magic-md`, destroying the extension — the exact case the comment on the preceding line claims to avoid. Reuse the `.md`-preserving branch already present in the frontmatter normalizer rather than writing a second variant; two divergent implementations of the same rule are how this drifted. The rewrite must remain correct for genuine command references (`/magic.run` → `/magic-run`) and for dotted dev commands (`magic.dev.sync` → `magic-dev-sync`).

### [T-14A02] Regenerate skill wrappers and verify no mangled filenames remain

- **Spec:** l2-skill-wrappers.md §Projection
- **Status:** Todo
- **Assignment:** Agent
- **Track:** A (generator)
- **Depends:** T-14A01
- **Files:** `skills/**/SKILL.md`
- **Verify:** `node .magic/scripts/executor.js update-engine-meta --workflow magic.run magic.task` completes, then `grep -rnoE '[A-Za-z0-9._]+-md\b' skills/ | grep -v -- '--include-md'` returns **zero** lines.
- **Handoff:** Track B may start.
- **Notes:** Review the full `git diff skills/` — the regex change touches every wrapper, not only the two known-bad lines. Any wrapper whose diff is not explained by the extension guard is a regression.

### [T-14B01] Purge `rules/MAGIC.md` case drift from engine workflow bodies

- **Spec:** l1-documentation-system.md §Reference Integrity
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (engine bodies)
- **Depends:** T-14A02
- **Files:** `.magic/analyze.md` (2 refs, incl. the markdown link near line 362), `.magic/run.md` (2 refs, near lines 85 and 106)
- **Verify:** `grep -rn 'MAGIC\.md' .magic/` returns zero lines; the link target `rules/magic.md` resolves from `.magic/` (`test -f rules/magic.md`).
- **Handoff:** T-14B02.
- **Notes:** The occurrence in `analyze.md` is a real markdown link `[...](../rules/MAGIC.md)`, dangling on any case-sensitive filesystem — every Linux and macOS installation. The rest are prose citations. `CHANGELOG.md` records that a dangling `rules/MAGIC.md` reference was already repaired once; these are the branches that repair missed, so grep the whole shipped tree rather than the two files named here.

### [T-14B02] Purge `rules/MAGIC.md` case drift from workflow wrappers; restore hardlinks

- **Spec:** l2-workflow-wrappers.md §Inventory · l2-agent-surface.md
- **Status:** Todo
- **Assignment:** Agent
- **Track:** B (engine bodies)
- **Depends:** T-14B01
- **Files:** `workflows/magic.run.md`, `workflows/magic.task.md`, `.agents/workflows/` mirrors
- **Verify:** `grep -rn 'MAGIC\.md' workflows/ .agents/ skills/` returns zero lines **and** `node dev/scripts/validate-hardlinks.js` exits 0.
- **Handoff:** Track T.
- **Notes:** Blocking constraint **[C-001]** applies directly: `.agents/workflows/` mirrors `workflows/` by hardlink, and write-replace editors create a new inode, silently delinking the twin and leaving a stale copy. After editing, recreate the links (`/magic.dev.init`) and re-validate. Changing `workflows/` content triggers C14 — run `update-engine-meta --workflow magic.run magic.task`, which re-runs the skill projection fixed in Track A.

### [T-14C01] Sync README version reference and engine upgrade-rule citation

- **Spec:** l1-documentation-system.md §docs Sync Policy
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (documentation)
- **Files:** `README.md`
- **Verify:** `grep -n 'Active Development' README.md` shows the version from `.magic/.version`; `grep -c 'MAGIC\.md' README.md` returns 0.
- **Notes:** Line 181 states `**Active Development** (v2.1.55)` against an engine at 2.1.61 — six releases of drift. Line 72 carries the same `rules/MAGIC.md` case error as the engine bodies. Both live in this one file, so they are one task; splitting them would collide two tracks on the same file.

### [T-14C02] Fix CONTRIBUTING spec count and workspace registry link

- **Spec:** l1-documentation-system.md §docs Sync Policy
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (documentation)
- **Files:** `CONTRIBUTING.md`
- **Verify:** the workspace row reports the same count as `ls .design/engine/specifications/*.md | wc -l` (27), and the link target resolves from the repository root (`test -f .design/engine/INDEX.md`).
- **Notes:** Line 86 claims 25 specs and links to `engine/INDEX.md`, which is relative to the root and therefore dead — the correct target is `.design/engine/INDEX.md`.

### [T-14C03] Repair `docs/README.md` dead link and complete the workflow table

- **Spec:** l1-documentation-system.md §Knowledge Base Structure
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (documentation)
- **Depends:** T-14C04 (table rows must point at pages that exist)
- **Files:** `docs/README.md`
- **Verify:** every relative markdown link in `docs/README.md` resolves on disk; the workflow table contains rows for `/magic.graph` and `/magic.status`.
- **Notes:** Line 76 links `./workspaces.md`, which has never existed — either author the page or fold the workspace configuration prose into an existing page and drop the link. Prefer the latter unless the content warrants its own page; a stub page is worse than an inlined paragraph.

### [T-14C04] Author `docs/graph.md` and `docs/status.md`

- **Spec:** l1-documentation-system.md §Knowledge Base Structure · l2-status-command.md · l2-spec-graph-memory.md
- **Status:** Todo
- **Assignment:** Agent
- **Track:** C (documentation)
- **Files:** `docs/graph.md`, `docs/status.md`
- **Verify:** both files exist and each is referenced from the workflow table in `docs/README.md`; `grep -c '^#' docs/graph.md docs/status.md` shows real section structure, not a stub.
- **Notes:** `docs/` carries a detailed guide for every other workflow. `/magic.graph` and `/magic.status` shipped in Phases 8 and later without their pages, so the documentation set silently under-reports the command surface. Source the content from `l2-status-command.md` and `l2-spec-graph-memory.md` rather than paraphrasing the workflow bodies.

### [T-14D01] Add `## Canonical References` to `l2-multi-angle-review.md`

- **Spec:** l2-multi-angle-review.md
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (SDD layer)
- **Files:** `.design/engine/specifications/l2-multi-angle-review.md`, `.design/engine/INDEX.md`
- **Verify:** `grep -c '## Canonical References' .design/engine/specifications/l2-multi-angle-review.md` returns 1; the spec version in the file header equals the version in the `INDEX.md` row.
- **Notes:** The only `Stable` spec of 27 lacking the section — ventilation's `CANONICAL_MISSING` finding. The parent L1 already lists `.magic/spec.md`, `.magic/analyze.md`, `.magic/context.md`; this L2 documents the lens prompts and blind-review flow, so its own reference table should name the files that carry them. Amending a `Stable` spec requires a version bump plus the matching `INDEX.md` row update — the two writes are atomic.

### [T-14D02] Bind conventions C6 and C10 to `l1-engine-core.md`

- **Spec:** l1-engine-core.md
- **Status:** Todo
- **Assignment:** Agent
- **Track:** D (SDD layer)
- **Files:** `.design/engine/specifications/l1-engine-core.md`, `.design/engine/INDEX.md`
- **Verify:** `node .magic/scripts/executor.js build-spec-graph` reports `Orphaned : 0` under Convention Coverage.
- **Notes:** C6 (Autonomous Selective Planning) and C10 (Task Architecture & Status Truth) are the only two conventions no specification cites, so the graph classifies them as orphaned. They are not dead — `.magic/task.md` implements both — the traceability edge is simply missing, the same binding already recorded for C8, C11 and C17. Cite them in the sections of `l1-engine-core.md` that already describe planning selection and task status truth; do not invent new sections to host them.

### [T-14T01] Validation — harness, link integrity, engine meta parity

- **Spec:** l2-test-suite.md
- **Status:** Todo
- **Assignment:** Agent
- **Track:** T (validation)
- **Depends:** T-14A02, T-14B02, T-14C03, T-14C04, T-14D01, T-14D02
- **Verify:** all four must hold —
  1. `node dev/tests/engine.js` exits 0 with no failures;
  2. `node .magic/scripts/executor.js update-engine-meta --check` reports no unexpected drift;
  3. `grep -rn 'MAGIC\.md' .magic/ workflows/ skills/ rules/ README.md CONTRIBUTING.md docs/` returns zero lines;
  4. a link sweep over `.design/`, `docs/`, `README.md`, `CONTRIBUTING.md`, `rules/` and `workflows/` reports zero broken relative targets.
- **Notes:** Criterion 4 is the regression guard for this whole phase — the phase exists because broken references accumulated unnoticed in shipped artifacts. Run it on the final tree, not per-track.
