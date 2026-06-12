---
phase: 7
name: "Shipped Self-Containment — RC-9 purge"
status: Done
subsystem: ".magic (workflow bodies, templates) + rules/"
requires: []
provides:
  - "Shipped engine files free of engine-workspace references (RC-9): 15 sites purged in 3 classes"
  - "Workspace-generic phase-journal path (.design/{ws}/CHANGELOG.md) in run/spec/rules"
  - "Engine 2.1.32 (C14 bump, checksums, skill wrappers synced)"
key_files:
  created: []
  modified:
    - ".magic/rule.md"
    - ".magic/analyze.md"
    - ".magic/spec.md"
    - ".magic/task.md"
    - ".magic/run.md"
    - ".magic/context.md"
    - ".magic/init.md"
    - ".magic/templates/rules.md"
    - "rules/magic.md"
patterns_established:
  - "Governance pointers in shipped files use protocol names and stable labels (WI-n/DA-n/C{n}), never engine-workspace spec file names"
duration_minutes: ~
---

# Stage 7 Tasks — Shipped Self-Containment (RC-9)

**Phase:** 7
**Status:** Done
**Strategic Goal:** Purge all references to the engine repository's own SDD workspace from shipped engine files per `l1-sdd-reference-containment.md` RC-9 (v1.1.0). 15 sites in three classes: dead spec links, baked-in workspace names, governance file-name citations. After this phase a consumer install contains zero references to documents that do not ship.

> **Serialization note (planner audit):** No hard dependency on Phases 4-5. MUST NOT execute concurrently with them (shared workflow-body files). Editing `rules/magic.md` requires hardlink revalidation afterwards (Edit breaks the `.agents/rules/` inode link). Single C14 bump after all edits (proven pattern).

## Atomic Checklist

- [x] [T-7A01] Class A: replace 5 dead spec links with inline restatement
- [x] [T-7A02] Class B: replace 3 baked-in `.design/engine/CHANGELOG.md` with `.design/{ws}/CHANGELOG.md`
- [x] [T-7A03] Class C: replace 6 governance file-name citations with protocol names
- [x] [T-7D01] C14 engine meta update (single bump)
- [x] [T-7T01] Validation: containment greps + hardlink integrity
- [x] [T-7T02] Validation: engine test harness green

## Detailed Tracking

### [T-7A01] Class A — dead spec links

- **Spec:** l1-sdd-reference-containment.md §3 RC-9
- **Status:** Done
- **Changes:** 5 dead links removed: rule.md, analyze.md (×2), spec.md, task.md — invalidation rule restated inline; grep returns 0.
- **Assignment:** Agent
- **Verify:** `grep -r "l2-spec-graph-memory" .magic workflows skills rules` returns 0 matches
- **Handoff:** T-7D01
- **Notes:** Sites: `.magic/rule.md:105`, `.magic/analyze.md:186`, `.magic/analyze.md:357`, `.magic/spec.md:243`, `.magic/task.md:135`. Replace the markdown link with the rule stated inline ("the spec graph and wiki are invalidated by ... — refresh via export-wiki"); the normative source remains the engine-workspace spec, provenance stays in this phase file.

### [T-7A02] Class B — baked-in workspace name

- **Spec:** l1-sdd-reference-containment.md §3 RC-9 (consumer-generic paths are the valid form)
- **Status:** Done
- **Changes:** run.md, spec.md, rules/magic.md: phase-journal path now `.design/{ws}/CHANGELOG.md`; hardlink recreated and validated after the rules/ edit.
- **Assignment:** Agent
- **Verify:** `grep -r "design/engine/CHANGELOG" .magic workflows skills rules` returns 0 matches; hardlink validation passes after rules/magic.md edit
- **Handoff:** T-7D01
- **Notes:** Sites: `.magic/run.md:139`, `.magic/spec.md:308`, `rules/magic.md:121`. `engine` is this repo's workspace name — consumers have their own; the shipped text must say `.design/{ws}/CHANGELOG.md`.

### [T-7A03] Class C — governance file-name citations

- **Spec:** l1-sdd-reference-containment.md §3 RC-9 (protocol labels are the valid form)
- **Status:** Done
- **Changes:** context.md, init.md (×2), spec.md, templates/rules.md (×2): spec-file citations replaced with protocol names; WI-labels preserved. Phase 5 tasks T-5A01/T-5A02 annotated with RC-9 guard to prevent reintroduction.
- **Assignment:** Agent
- **Verify:** `grep -rE "l1-(workspace-intent-routing|role-system)\.md" .magic workflows skills rules` returns 0 matches
- **Handoff:** T-7D01
- **Notes:** Sites: `.magic/context.md:7`, `.magic/init.md:74`, `.magic/init.md:84`, `.magic/spec.md:88`, `.magic/templates/rules.md:213`, `.magic/templates/rules.md:235`. Replace file names with protocol names ("the Workspace Intent Routing protocol (WI-…)", "the role system invariants"); WI-/DA-/C-labels stay (valid in-text identifiers).

### [T-7D01] C14 Engine Meta Update

- **Spec:** RULES.md C14; l2-role-tooling.md §2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `update-engine-meta --workflow spec,task,run,rule,analyze` exits 0; `.magic/.version` patch-bumped; checksums regenerated; wrappers synced
- **Handoff:** T-7T01
- **Notes:** Single serialized bump after ALL edits.
- **Changes:** Engine 2.1.31→2.1.32; 8 changed engine files detected; checksums (63 files) and skill wrappers re-projected.

### [T-7T01] Validation: Containment Greps + Hardlinks

- **Goal:** Prove shipped directories carry zero engine-workspace references.
- **Method:** Run the three Verify greps above plus `grep -r ".design/engine/" .magic workflows skills rules` (expected matches: only the illustrative BAD example in `rules/magic.md` §6); `node dev/scripts/validate-hardlinks.js` passes.
- **Verify:** all greps meet expectations; hardlink validation exit 0 (non-strict warnings allowed)
- **Status:** Done
- **Changes:** Classes A/B/C greps all 0; residual `.design/engine/` only at rules/magic.md illustrative BAD example (RC-9 exempt); hardlink validation passed (3 pre-existing non-strict anchor warnings).

### [T-7T02] Validation: Engine Test Harness

- **Goal:** No regression after workflow-body edits.
- **Method:** `node dev/tests/engine.js`
- **Verify:** exit code 0; no failed assertions
- **Status:** Done
- **Changes:** 12/12 tests pass, 0 failures.
