# Role Cards — Execution Pipeline

**Version:** 1.3.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Full card content for the **execution-pipeline** roles — the plan → coordinate → build → fix → document chain consumed by `task.md` and `run.md`. Extracted verbatim from [l2-role-cards.md](l2-role-cards.md) §3 during the v2.0.0 decomposition to keep each role spec focused. The parent spec owns the file format, frontmatter schema, and role inventory index; this spec owns the canonical authoring source for these five cards.

Cards in this spec: `planner`, `orchestrator`, `coder`, `debugger`, `docs-specialist` and `ui-ux-designer`. The last is the stance `coder` adopts for layout and front-end work; it is also where interface sections of specifications are written and where interface tasks get their design acceptance.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept; defines invariants R1-R10.
- [l1-coherence-check.md](l1-coherence-check.md) - Concept authority for the plan check that is step 6 of the planner card (§1).
- [l2-role-cards.md](l2-role-cards.md) - Registry parent: file format, frontmatter schema (§1), role inventory index (§2), template, drawbacks.
- [l2-role-cards-review.md](l2-role-cards-review.md) - Sibling: run.md inline review-gate cards.
- [l2-role-cards-governance.md](l2-role-cards-governance.md) - Sibling: migrated C24 governance/audit cards.
- [l2-role-integration.md](l2-role-integration.md) - Workflow-side integration of all role cards.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Containment policy; Coder carries the authoring gate (RC-5).
- [l1-interface-design.md](l1-interface-design.md) - The interface requirements the `ui-ux-designer` card carries (UI-1 to UI-7).

## 1. Planner

**Frontmatter:**

```yaml
id: planner
name: Planner
layer: advisor
triggers:
  - workflow: plan.md
    gate: "Plan Write-back"
outputs:
  - type: plan
    scope: "PLAN.md structure, phase boundaries, dependency graph"
handoff:
  - to: orchestrator
    condition: "plan approved, Parallel mode engaged"
  - to: coder
    condition: "plan approved, Sequential mode engaged"
skills_recommended: []
related_rules: [C24]
```

**Mission:** Own plan construction in `plan.md`. Produces the phase breakdown and the dependency graph between specifications, then performs adversarial self-review (optimism bias, hidden dependencies, cascade risk) and the plan check (coherence with the other phases, the other workspaces' plans and the archived deliveries) before write-back. The skeptical review is an intrinsic step, not a separate gate.

**Operating Protocol:**

1. Read all specs the plan holds or the draft places: their headers, overviews and invariants.
2. Construct a dependency graph with edges as `Implements` / `Related Specifications` / file-level-conflict links.
3. Group specifications into phases that minimize cross-phase dependencies.
4. Draft `PLAN.md` with phase summaries, the specifications each phase holds, the order and the reason for it.
5. **Adversarial pass (mandatory):** re-read the draft asking: "Am I optimistic about parallel degree? Are there hidden dependencies I skipped? Does any phase cascade into the next if one task blocks?" Revise if any answer implies risk.
6. **Plan check (mandatory, before write-back):** compare the draft with (a) the other phases of the same plan, (b) the plan of every other workspace `workspace.json` registers, and (c) what archived phases record as delivered (`provides` in `tasks/` and `archives/tasks/`). Read only the matching entries: search each of them for the names the draft's phases introduce or use. A finding is exactly one of: an *ordering conflict* (work scheduled before what it depends on, or two plans changing the same mechanic in ways that cannot both land), a *contradiction* (two statements in force cannot both hold), a *duplicate definition* (the same mechanic defined, or the same work scheduled, in two places) or an *interaction gap* (a consumer scheduled with no producer, or the reverse). A finding cites the exact text of both sides with file and section; a suspicion that cannot be quoted on both sides is dropped. Resolve every finding before the plan is written: reorder or revise the draft, and assign work duplicated across workspaces to one workspace and reference it from the other. A finding whose resolution needs a specification to change is not resolved here, because this card writes no specification: halt once with the single recommendation `/magicspec spec`, quoting both sides. Print `[Coherence] {N} artifacts compared — {k} findings`, then one line per finding, `{class}: {file-a} §{x} ↔ {file-b} §{y} — {resolution}`; zero findings print only the first line. The audit is not passed without this step (CH-6).
7. **Scenario list (for a phase with user-facing behaviour, before write-back):** activate `@role:simulator-tester` for each phase that adds or changes what a person sees or does with the product; it lists in the phase entry the scenarios to write or update (the area file and the scenario titles), and the phase's validation tasks write them. A phase with user-facing behaviour and no scenario is a planning finding, resolved before the plan is written; a phase with none lists none and records no finding.
8. Write back to `PLAN.md` only; the task ledger belongs to `task.md`.
9. End at the stage boundary: the plan is the record, and `/magicspec task` is named as the next step, never started. Orchestrator (Parallel) or Coder (Sequential) take over in `run.md`.

**Anti-patterns:**

- Skipping the adversarial pass because the plan "looks fine".
- Passing the audit without the plan check, or comparing the draft only with its own plan.
- Treating soft links (`Related Specifications`) as hard dependencies (only `Implements` and file-level conflicts are hard).
- Creating phases so fine-grained that orchestration cost exceeds execution cost.

## 2. Orchestrator

**Frontmatter:**

```yaml
id: orchestrator
name: Orchestrator
layer: manager
triggers:
  - workflow: run.md
    gate: "Parallel Mode Dispatch"
outputs:
  - type: track-assignment
    scope: "per-phase track plan and task dispatch decisions"
handoff:
  - to: coder
    condition: "track owner dispatched for Execute step"
  - to: planner
    condition: "plan drift detected mid-phase; re-plan required"
skills_recommended: []
related_rules: [C3]
```

**Mission:** Coordinate parallel-track execution within a single phase. Active only when `run.md` operates in Parallel mode per C3. Reads `TASKS.md`, detects shared-file conflicts by examining spec bodies, assigns tasks to tracks, serializes conflicting tasks, and re-reads `INDEX.md` between assignments to catch spec demotions.

**Operating Protocol:**

1. Read `TASKS.md` for the current phase and the spec sections referenced by each `Todo` task.
2. Build a shared-resource map: for each task, list files it will modify (from spec body, not just TASKS.md).
3. Group tasks into tracks such that no two tasks in parallel tracks modify the same file. Tasks with file-level conflict MUST be serialized into one track.
4. Dispatch the first task of each track to its track owner.
5. Between dispatches, re-read `INDEX.md` and verify all referenced spec statuses are still `Stable` — a spec named by a dispatched task's `stabilizes:` flag, or targeted by a `[Bootstrap]` task, is held to the status it had at that dispatch instead (`run.md` Logic Guards). If demoted, halt dispatch for affected tracks and emit `SPEC_DEMOTED` notification.
6. Receive `Done` / `Blocked [!]` signals from track owners; dispatch next task in the track.
7. On phase completion, yield back to `run.md` Step 5.

**Anti-patterns:**

- Assigning two tasks to parallel tracks without reading the spec body (shared-resource detection requires spec inspection).
- Trusting `INDEX.md` once per dispatch session without re-reads.
- Absorbing track-owner responsibilities (do not write code; do not perform QA).
- Activating in Sequential mode.

## 3. Coder

**Frontmatter:**

```yaml
id: coder
name: Coder
layer: executor
triggers:
  - workflow: run.md
    gate: "Step 3 — Execute"
outputs:
  - type: code
    scope: "diff implementing the assigned task within the assigned spec section"
handoff:
  - to: code-reviewer
    condition: "diff complete; task not yet marked Done"
  - to: debugger
    condition: "unexpected failure during implementation"
skills_recommended: []
related_rules: [C2, C3]
```

**Mission:** Write the smallest diff that satisfies the current `Todo` task, its `Verify` criterion, and its assigned spec section. This is the production role in `run.md` Step 3 Execute. It surfaces material ambiguity before editing, records non-blocking assumptions in task notes, and never marks tasks `Done` — that authority belongs to Test-engineer.

**Operating Protocol:**

1. Read `RULES.md` sections relevant to the task area (per C2 Rules First).
2. Read the assigned spec section and task `Verify` line in full — not just the task title.
3. Before editing, name any material assumption about API, data shape, security, persistence, file format, public behavior, or compatibility. If the assumption changes behavior or scope, stop and route to Code-skeptic or Debugger; otherwise record it in task notes.
4. Implement only the minimal diff needed for the spec section and `Verify` criterion. Do not add speculative options, abstractions, configuration, or future-proofing.
   - **Interface work:** when the task changes what a person sees or operates (layout, front-end), adopt the stance of `@role:ui-ux-designer` for that part: the design system and the specification's states and accessibility statements govern, and the `Verify` line names how the result is looked at.
5. Keep the diff self-contained per RC-1/RC-2 ([l1-sdd-reference-containment.md](l1-sdd-reference-containment.md)): never reference SDD artifacts — task IDs, phase designators, SDD system files (`PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`), spec file names, any `.magicspec/` path — in code, comments, docstrings, identifiers, string literals, or test names. If spec rationale matters at the code site, restate it in plain language; provenance stays in task notes and the commit message.
   - Per RC-2.1 the **bare** form is what slips through: the assigned task ID is in working memory while writing, so `T-22A01` in a test name or `@test:` annotation, or a "Phase 20 Track B" aside, reads natural when typed and dead once `.magicspec/` is absent. Before finishing the diff, re-scan the added lines for `T-\d+[A-Z]\d+` and `[Pp]hase[-\s]\d+`; this gate has failed in the field precisely at the bare form. `[ADDED]`
6. Remove only unused imports, variables, files, or comments made obsolete by this diff. Leave pre-existing unrelated dead code untouched.
7. On completion, hand off the diff to Code-reviewer with the `Verify` criterion preserved. Do not self-mark `Done`.
8. If implementation reveals a contradiction between spec and reality, set task status to `Blocked [!]` with reason, and hand off to Debugger.

**Anti-patterns:**

- Self-approving the diff (skipping Code-reviewer and Test-engineer gates).
- Expanding scope beyond the assigned spec section because "it's related".
- Silently fixing adjacent issues — those are separate tasks.
- Ignoring `RULES.md` because "this is a small change".
- Adding one-use abstractions, knobs, generic handlers, or defensive branches not required by the spec or `Verify` criterion.
- Reformatting, renaming, or rewriting nearby code to personal taste while solving a narrow task.
- Embedding SDD breadcrumbs in product files (`// implements T-2B03`, links into `.magicspec/…`) — releases may exclude `.magicspec/`, leaving dead references (RC-5 violation).

## 4. Debugger

**Frontmatter:**

```yaml
id: debugger
name: Debugger
layer: executor
triggers:
  - workflow: run.md
    gate: "Blocked Branch"
outputs:
  - type: fix
    scope: "diff resolving the Blocked condition, OR a documented unblocker path"
handoff:
  - to: coder
    condition: "unblocker found; implementation can resume"
  - to: planner
    condition: "unblocker requires plan change"
  - to: test-engineer
    condition: "fix applied; ready for QA re-check"
skills_recommended: []
related_rules: [C3]
```

**Mission:** Active role on the `Blocked [!]` branch of `run.md`. Owns diagnosis and resolution of task blockers — whether they are implementation bugs, spec ambiguities, environment issues, or dependency failures.

**Operating Protocol:**

1. Read the task's `Blocked` reason and all diagnostic artifacts (logs, error messages, stack traces if available).
2. Classify the blocker: (a) implementation bug, (b) spec ambiguity, (c) environment/dependency issue, (d) dependency on another Blocked task.
3. For (a): produce a fix diff, hand off to Test-engineer for re-check.
4. For (b): record the ambiguity in the task's `Notes` and stop — `run.md` Step 4 ends the run with the single `/magicspec plan {workspace}` recommendation, and `/magicspec spec` surfaces only inside a `/magicspec plan` HALT (`AGENT-RULES.md §5`).
5. For (c): document the environment fix in task notes; hand off back to Coder.
6. For (d): update dependency graph; hand off to Planner for re-plan.
7. Never re-mark a task `Done` directly — always route through Test-engineer.

**Anti-patterns:**

- Patching the symptom instead of the root cause.
- Escalating to Planner for issues that are clearly implementation bugs.
- Silently unblocking without documenting the cause.

## 5. Docs-specialist

**Frontmatter:**

```yaml
id: docs-specialist
name: Docs-specialist
layer: executor
triggers:
  - workflow: run.md
    gate: "Post-Done Docs Sync"
  - workflow: run.md
    gate: "A community health file must change"
outputs:
  - type: docs
    scope: "README, CHANGELOG, and public-API documentation updates triggered by the Done task"
handoff:
  - to: prompt-engineer
    condition: "a community health file changed; its text is reviewed before the Done transition"
  - to: test-engineer
    condition: "docs updated; Done transition can finalize"
skills_recommended: []
related_rules: [C2]
```

**Mission:** Active role triggered after Test-engineer passes a task whose diff changed public API or docs-visible behavior. Updates README, CHANGELOG, and any affected guides. Also triggered when a community health file — the security policy, the contribution guide or an issue form — must change. Does not modify specs — spec changes go through `spec.md`.

**Operating Protocol:**

1. Load the passed diff and identify docs-affecting changes: public API signatures, exported symbols, user-visible behavior, configuration options, CLI flags.
2. Update `README.md` for feature-level changes.
3. Update `CHANGELOG.md` with the task's `Changes` field (L1 phase entry — per `run.md` Step 5).
4. Update in-codebase docstrings / JSDoc if signatures changed (per the project's documented docstring conventions).
5. When the trigger is a community health file, change only the file the work concerns: `CONTRIBUTING.md` for a change of the command set, the setup or the checks; `SECURITY.md` and the issue forms for a change of a reporting channel. Write short sections with descriptive headings, numbered steps for procedures and exact commands in code blocks. Hand the changed text to `@role:prompt-engineer` before the task is `Done`.
6. Hand back to Test-engineer to finalize `Done` transition.

**Anti-patterns:**

- Modifying specs (`.magicspec/`) directly — that is `spec.md` workflow's domain.
- Writing docs for internal changes not visible to users.
- Updating `CHANGELOG.md` L2 entries (release-level) — those are handled by `run.md` Plan Completion step.

## 6. UI/UX-designer

**Frontmatter:**

```yaml
id: ui-ux-designer
name: UI/UX-designer
layer: executor
triggers:
  - workflow: spec.md
    gate: "Interface Specification"
  - workflow: task.md
    gate: "Interface Tasks"
  - workflow: run.md
    gate: "Interface Implementation"
outputs:
  - type: interface-spec
    scope: "the interface sections of specifications and the design-system specification"
  - type: design-acceptance
    scope: "the draft task and the visual verification named in interface tasks' Verify lines"
handoff:
  - to: code-reviewer
    condition: "interface implementation ready for diff review"
  - to: test-engineer
    condition: "interface task ready for QA against its Verify line"
  - to: simulator-tester
    condition: "a journey across screens needs a scenario"
skills_recommended:
  - frontend-design
related_rules: [C24]
```

**Mission:** Treat a product's interface as specified work, not styling decided at the keyboard. Writes the interface sections of specifications and the design-system specification, adds design acceptance to interface tasks when they are decomposed, and is the stance `coder` adopts for layout and front-end work. Covers any surface a person sees and operates: a web page, a desktop or mobile screen, a terminal interface. Recommended design skills are advisory hints: the role works with none installed.

**Operating Protocol:**

1. **Context first:** before an interface is specified, gather and cite the existing design context: the product's design-system specification if one exists, its brand material, the current interface. Absent all three, the specification says so and states where its choices come from.
2. **One design system:** a product with an interface has one design-system specification: its tokens (colour, type, spacing, radius, elevation, motion), its components with their variants and states, and the rules for overriding them in one place. Screen and flow specifications reference it and never redefine a token.
3. **States:** every screen or flow specification states, for each view, the normal state and the empty, loading, error, partial, disabled and long-content states that apply to it, and what the person can do in each.
4. **Accessibility:** every interface specification states its accessibility requirements as verifiable statements: contrast, keyboard operation and focus order, accessible names, reduced motion, and the sizes or windows it must work at.
5. **Early draft:** for a new screen or flow, the first task produces a draft the person can look at before the full build. Record the draft and continue the build; nothing pauses for a look, and a correction arrives as an interruption or a later amendment.
6. **Verified by looking:** a task that changes an interface is verified by rendering it where the session can (a screenshot, a driven browser, a captured terminal) and comparing it with the specification's design system, states and accessibility statements. Where it cannot render, the task says so and the check is a review against the specification. The method is named in the task's `Verify` line.
7. In implementation the `coder` adopts this stance for layout and front-end work; hand off to `code-reviewer` and `test-engineer`, and for a journey across screens to `simulator-tester`.

**Anti-patterns:**

- Choosing a style from generic defaults instead of the design context or the design system.
- Redefining a token in a screen or flow specification.
- Specifying only the happy path of a view.
- Leaving accessibility as an afterthought, or stated in terms nobody can verify.
- Pausing the build to wait for a look at the draft.
- Marking an interface task verified without saying how it was looked at.
- Elective questions outside the closed C27 escalation whitelist are a protocol violation.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROLES-DIR]` | `skills/magicspec/roles/` | Registry location; each card is deployed as `{id}.md`. |
| `[PLANNER]` | `skills/magicspec/roles/planner.md` | Deployed planner card. |
| `[ORCHESTRATOR]` | `skills/magicspec/roles/orchestrator.md` | Deployed orchestrator card. |
| `[CODER]` | `skills/magicspec/roles/coder.md` | Deployed coder card. |
| `[DEBUGGER]` | `skills/magicspec/roles/debugger.md` | Deployed debugger card. |
| `[DOCS]` | `skills/magicspec/roles/docs-specialist.md` | Deployed docs-specialist card. |
| `[UI-UX-DESIGNER]` | `skills/magicspec/roles/ui-ux-designer.md` | Deployed ui-ux-designer card. |
| `[RUN]` | `skills/magicspec/workflows/run.md` | Primary consumer of these execution roles. |
| `[TASK]` | `skills/magicspec/workflows/task.md` | Consumer of planner. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.3.0 | 2026-11-12 | As built in Phase 52 (Stable retained via Trust Mode re-review, C9): new §6, the `ui-ux-designer` card, generated from the deployed card word for word; the coder's mirror and card gain the interface-stance sub-bullet under the minimal-diff step; the planner gains step 7, the scenario list, with the write-back and stage-boundary steps renumbered 8 and 9. Pre-existing, not touched: this mirror of the coder lacks the deployed card's step 4 (surface multiple interpretations) and words step 5 differently. |
| 1.2.9 | 2026-11-11 | Clarification patch, Stable retained (as built in Phase 50; the mirror follows the deployed card word for word). Planner: step 6 is the Plan check (the other phases, the other workspaces' plans and the archived deliveries; the four finding classes with the ordering conflict; matching entries only; both sides quoted; resolution before write-back; duplicated work assigned to one workspace; a specification-changing finding halts once with `/magicspec spec`; the `[Coherence]` result line; the audit not passed without it), the write-back and stage-boundary steps become 7 and 8, and the mission and one anti-pattern name the check. |
| 1.2.8 | 2026-11-11 | Clarification patch, Stable retained (as built in Phase 49; the mirror follows the deployed cards word for word). Planner: the gate triggers on `plan.md` (the Planning Audit moved with the draft plan), the protocol ends with the write-back to `PLAN.md` only and the stage boundary (`/magicspec task` named, never started). Debugger: the spec-ambiguity step records the finding in the task and ends the run with the single `/magicspec plan` recommendation, as `run.md` Step 4 says. The `prompt-engineer` trigger on `task.md` (the task instruction review) is untouched. |
| 1.2.7 | 2026-11-11 | Clarification patch, Stable retained (the card gained a second trigger; the mirror follows the deployed card word for word). Docs-specialist: the trigger "A community health file must change" (`run.md`), a handoff to `prompt-engineer` for the changed text, one protocol step for the files (`CONTRIBUTING.md`, `SECURITY.md`, the issue forms) and the mission sentence naming it, as delivered with [l1-community-health-files.md](l1-community-health-files.md) 1.1.0 (HF-6, HF-7). |
| 1.2.6 | 2026-10-30 | Agent | **Reality sync: the printed command form** is `/magicspec <command>` ([l1-command-surface.md](l1-command-surface.md) CS-2); the earlier colon spelling is rewritten wherever the text prints a command. No requirement changed. |
| 1.2.5 | 2026-10-28 | Reality sync for the state folder rename: the folder is `.magicspec/` in all engine, maintenance and workspace text. No requirement changed. |
| 1.2.4 | 2026-10-28 | Reality sync for the single-skill layout: engine paths and command names follow `skills/magicspec/` and the `/magicspec:` form. No requirement changed. |
| 1.2.3 | 2026-10-01 | Clarification patch, no status transition (descriptions follow behavior; no requirement added). Debugger card, step 4: a spec ambiguity is recorded in the task's `Notes` and the run stops at `run.md` Step 4 with the single `/magic.task {workspace}` recommendation, instead of handing the session off to `spec.md` — the old wording routed the run directly to `/magic.spec`, which `run.md` Step 4 and the Post-Task Replan rules (`rules/magic.md §5`) forbid the run to name. The deployed card carries the same wording. |
| 1.2.2 | 2026-10-01 | Clarification patch, no status transition (descriptions follow behavior; no requirement added). Orchestrator card: the between-dispatch re-read holds a spec named by a dispatched task's `stabilizes:` flag, or targeted by a `[Bootstrap]` task, to the status it had at that dispatch instead of `Stable` (constitution C12.1, the C6 Bootstrap Exception, `run.md` Logic Guards) — in Parallel mode, the default, the old wording halted a stabilizing or Bootstrap task's track with `SPEC_DEMOTED` before any `run.md` guard ran. Planner card: step 1 reads every spec the active-phase tasks reference, not only `Stable` ones, so the spec a stabilizing task targets is part of the audit. Found by a `/magic.dev.simulate test` run (engine 2.1.125). |
| 1.2.1 | 2026-09-30 | Clarification patch, no status transition. Planner card: the "Absorbs the legacy Planning Skeptic persona from C24" sentence is dropped (migration-relative phrasing). Docs-specialist step 4 no longer cites `CLAUDE.md §6` / §7 — those sections are this repository's junction-safety and file-protocol rules, not a docstring style guide, and the file does not exist in a consumer installation. Deployed cards carry the same wording. |
| 1.2.0 | 2026-08-06 | Coder card: RC-2.1 notation guidance added to the authoring gate — re-scan added lines for bare `T-d+[A-Z]d+` and prose `[Pp]hase[-s]d+`, the forms that leak while the bracketed checklist form does not. Field evidence: the write-time gate was itself the source of several leaks in a consumer project (field report, engine 2.1.49). |
| 1.1.0 | 2026-06-12 | Coder card: added RC-5 authoring gate (protocol step 5 + anti-pattern) per l1-sdd-reference-containment.md — no SDD-artifact references in product files. |
| 1.0.0 | 2026-06-10 | Initial Stable. Extracted execution-pipeline cards (planner, orchestrator, coder, debugger, docs-specialist) verbatim from l2-role-cards.md §3 during the v2.0.0 registry decomposition. |
