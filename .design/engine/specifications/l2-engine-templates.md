# Engine Templates

**Version:** 1.3.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Template files in `.magic/templates/` that define the structural blueprints for specifications, plans, tasks, phases, and retrospectives. These templates are consumed by engine workflows during artifact creation. Phase task entries include an explicit `Verify` line so execution has a concrete completion criterion before `Done`. The specification also owns the authoring contract of the two texts the templates leave to hand-writing: the `Description` cell of a registry row and the `Overview` of the task ledger (§5.3).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core engine logic.
- [l2-engine-automation.md](l2-engine-automation.md) - Scripts that instantiate templates.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - The wrapper `description` has the same what-then-when shape (§5.2 there).
- [l2-spec-graph-memory.md](l2-spec-graph-memory.md) - §4.5 routes a content question to the specification text, which is why a registry cell needs no inventory.
- [l2-test-suite.md](l2-test-suite.md) - Coverage of the §5.3 contract: shipped-text pins and cognitive cases.

## 1. Motivation

Templates are the structural DNA of every `.design/` artifact. Changes to templates silently propagate to all future specifications, plans, and tasks. Without explicit coverage, template drift or inconsistency goes undetected.

A template fixes structure, not wording, and two pieces of wording sit in files the workflows re-read each time they run: the one-line description of each specification in the registry, which is what a reader scans to decide which specification to open, and the overview of the task ledger. Nothing told the author what either should hold, so both grew by appending: `spec.md` registers a specification's name, status, layer and version but not its description, an amendment updates only version, status and layer, and `task.md` does not mention the ledger overview. Measured on two corpora. The engine's own workspace: the 37 registry descriptions have a median of 387 characters, 12 exceed 500 and two exceed 1,024, and one carries a `Use when` sentence; the task ledger is 39.6 KB, of which the overview is 27 KB. A consumer project's two workspaces (302 and 23 specifications): the descriptions have medians of 1,578 and 2,086 characters, 230 of 325 exceed 1,024, none carries a `Use when` sentence, and in the larger workspace 46% of the cells carry a version or a date; its registry is 597 KB, 80% of it descriptions, more than the file reader of the host used for the measurement will return in one call (256 KB); the ledger overview is 20.8 KB of per-phase narrative in that workspace and a 0.1 KB description of the file in the other. The bloat advisory counts lines, so it sees none of it (the 597 KB registry is 361 lines). Text that is change history makes every reader pay for what it did not need, and that history already has a home in each specification's Document History and in the workspace changelog.

The cells show why they grew. Each is an inventory of the specification's mechanics followed by an appended version narrative, so a hand-written cell had become the only index of content: the graph and the wiki hold no specification text, and shipped text sends "what covers Z" to them. The inventory's vocabulary (a median of 87 distinct terms) is found in the specification's own text for 94% of the terms and in its `Overview` paragraph plus headings for 20% ([l2-spec-graph-memory.md](l2-spec-graph-memory.md) §4.5). A cell therefore does not need to carry it.

## 2. Constraints & Assumptions

- Templates must not contain project-specific content — only structural placeholders.
- Placeholder syntax: `{placeholder_name}` for substitution points.
- All templates reside in `.magic/templates/` (flat directory, no nesting).
- The §5.3 contract is guidance, not a gate. The engine does not write these texts, so no script refuses and no workflow halts on them; the wrapper generator can refuse a description because it is the writer of the wrapper.
- §5.3 fixes a form and specifies no size signal. The signal belongs with the bloat advisory ([l2-engine-automation.md](l2-engine-automation.md), Bloat Advisory Configuration) and is sequenced after the contract is deployed, so its thresholds are calibrated on registries that follow the form, not on the ones that motivated it. The one anchor measured is the whole-file read limit of a host (256 KB).
- **Assumption (forecast):** the task-ledger overview describes the ledger and does not track the plan; the state lives in the phase table. Runner-up: an overview that states the plan's present state, replaced by whoever changes it (the reading of version 1.2.0 of this specification). Override: `/magic.spec amend l2-engine-templates "current-state overview"`. Evidence: of a consumer project's two workspaces, one overview grew to 20.8 KB of per-phase narrative and the other is a 0.1 KB description of the file; the second needs no writer to keep it true.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| Engine Safety (C1) | Templates are engine files — C14 meta-sync applies on modification |
| Content Rules (RULES.md §5) | Templates enforce required sections (Overview, Motivation, Document History) |
| Micro-spec Convention (C16) | `micro-spec.md` template provides lightweight alternative under 50 lines |
| Verifiable Execution | `phase.md` requires a `Verify` field for every atomic task; vague success criteria are rejected by `task.md` decomposition |
| Linking (every specification is registered) | The registry `Description` is the text a reader scans to choose a specification; §5.3 gives it a form and keeps change history out of it |

## 5. Detailed Design

### 5.1 Template Inventory

```plaintext
.magic/templates/
  spec.md            — Full specification (L1/L2)
  micro-spec.md      — Lightweight spec for minor changes (<50 lines)
  plan.md            — Implementation plan
  tasks.md           — Task breakdown ledger
  phase.md           — Phase definition
  retrospective.md   — Phase retrospective
  workspace-index.md — Workspace registry
  global-index.md    — Global registry (one row per workspace)
```

### 5.2 Template Contracts

Each template guarantees:

- Required metadata header (`Version`, `Status`, `Layer`).
- Required sections per RULES.md §5 (Overview, Motivation, Document History).
- Placeholder markers for automation substitution.
- For `phase.md`, each atomic task block includes `Verify:` with a concrete command, check, or evidence source required before `Done`.
- Where a template invites hand-written text that the engine does not bound — the `Description` placeholder of the two registry templates and the `Overview` of `tasks.md` — it carries a one-line comment stating the form of that text (§5.3), in the way `workspace-index.md` already carries `<!-- Add your specifications here -->`.

### 5.3 Registry Text Contract

Two texts are written by hand where a template leaves a placeholder: the `Description` cell of a registry row (`workspace-index.md`; the workspace row of `global-index.md`) and the `Overview` of the task ledger (`tasks.md`; not the `Overview` section of a specification).

1. **A description says what and when.** The `Description` of a registry row names what its subject — a specification, or a workspace in the global registry — is for and when to open it, in at most two sentences and nothing else: no change history, no list of sections or invariants, no figure that goes stale (a count, a version, a date). The shape matches the wrapper description ([l2-workflow-wrappers.md](l2-workflow-wrappers.md) §5.2) — what first, then when — but a literal `Use when` is not required, because its value for choosing among specifications is unmeasured. The cell is a router, not an index of contents: which specification covers a mechanic is a content question, answered by searching the specification text ([l2-spec-graph-memory.md](l2-spec-graph-memory.md) §4.5), so the index of contents does not have to live in the cell.
2. **A description is replaced, never appended.** Registering a row writes the cell. After that the cell changes only when what the subject is for, or when to open it, has changed. Any other amendment to a specification leaves the cell byte-identical and is recorded in the specification's own Document History, which every specification already carries (RULES.md §5).
3. **The ledger overview describes the ledger.** It says what the file is and how to read it, and tracks nothing: which phase is active is the status column of the phase table, and what a finished phase produced is recorded in its phase file (`provides`), the workspace changelog and the archive. Nobody appends to the overview, and no step rewrites a sentence of it as the plan moves.
4. **Guidance, not a gate.** No script refuses and no workflow halts on either text (§2). The rule is carried by the instructions that tell the author how to write the text. The registries stay outside the instruction-quality review, which classes them as navigational data (PQ-1); the contract does not move them into it.
5. **Scope.** The contract covers these two texts. The registry's own change history (the `Document History` table of the global registry, the `Meta Information` journal of a workspace registry) and `PLAN.md` are outside it.

Surfaces that carry the contract when it is deployed — each is shipped text, so a change to `.magic/` or `workflows/` triggers C14:

| Surface | What it states |
| --- | --- |
| `spec.md`, Creating a New Specification | Registration writes the `Description` (rule 1) |
| `spec.md`, Updating an Existing Specification, Sync | The `Description` changes only when what or when changed; the amendment goes to Document History (rule 2) |
| `task.md`, Plan Write-back | The ledger overview describes the ledger and is not appended to (rule 3) |
| `workspace-index.md`, `global-index.md`, `tasks.md` | A one-line comment at the placeholder (§5.2) |
| `rules/magic.md` §2 (hardlinked twin, **[C-001]**) | A content question goes to the specification text, a structural one to the graph and the wiki ([l2-spec-graph-memory.md](l2-spec-graph-memory.md) §4.5) |

Order of adoption: the `rules/magic.md` row lands with or before the `spec.md` rows. A short description is safe only once the content question has its own route; before that, a cell that shrinks leaves the question to whatever the reader improvises. `rules/` is outside C14's version and checksum tracking, so that row ships without a version bump.

Rewriting the rows and the overview that already exist in a workspace is a task of the phase that deploys the contract, not part of it.

## Canonical References

| Path | Role |
| --- | --- |
| `.magic/templates/spec.md` | Full specification scaffold |
| `.magic/templates/micro-spec.md` | Lightweight spec scaffold |
| `.magic/templates/plan.md` | Implementation plan scaffold |
| `.magic/templates/tasks.md` | Task ledger scaffold |
| `.magic/templates/phase.md` | Phase definition scaffold |
| `.magic/templates/retrospective.md` | Phase retrospective scaffold |
| `.magic/templates/workspace-index.md` | Workspace registry scaffold; the `Description` placeholder is the subject of §5.3 |
| `.magic/templates/global-index.md` | Global registry scaffold |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.3.0 | 2026-10-06 | Revised after measuring a consumer project's registries (325 specifications): descriptions have medians of 1,578 and 2,086 characters, and the registry of the larger workspace is 597 KB. The cell had become the only index of content because the graph and the wiki hold no text, so rule 1 gains its counterpart — a content question is answered by searching the specification text ([l2-spec-graph-memory.md](l2-spec-graph-memory.md) §4.5) — and the order of adoption puts that route first. Rule 3 now has the ledger overview *describe the ledger* instead of tracking the plan, on the evidence of the consumer's second workspace (a 0.1 KB static overview beside a 20.8 KB narrative one); the `run.md` surface is dropped and the forecast assumption flips, runner-up recorded. The size signal is sequenced after deployment. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.2.0 | 2026-10-06 | New §5.3 **Registry Text Contract**: a registry row's `Description` says what the specification is for and when to open it (two sentences, no history, replaced only when that changes, otherwise byte-identical), and the task-ledger `Overview` states the plan's present state, replaced by whoever changes it. Guidance, not a gate; no size signal specified. The two registry templates join the inventory. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.1.0 | 2026-05-12 | Added mandatory `Verify` field to phase task entries and documented verifiable execution contract. |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
