# Role System Workflow Integration

**Version:** 2.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-role-system.md

## Overview

Defines how the role registry defined in [l2-role-cards.md](l2-role-cards.md) is wired into existing engine workflow bodies (`run.md`, `task.md`, `spec.md`, `analyze.md`, `rule.md`, `retrospective.md`) and the `RULES.md` constitution. The engine-side tooling that supports the registry — the `role_registry_integrity` pre-flight check, the `update-engine-meta` checksum treatment, and the role authoring template — moved to [l2-role-tooling.md](l2-role-tooling.md) in the v2.0.0 decomposition; this spec now owns only the workflow-body wiring concern.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Parent concept.
- [l2-role-cards.md](l2-role-cards.md) - Role card content and frontmatter format.
- [l2-role-tooling.md](l2-role-tooling.md) - Sibling: engine tooling (check-prerequisites integrity, update-engine-meta, role template).
- [l2-engine-automation.md](l2-engine-automation.md) - Host spec for `check-prerequisites`, `update-engine-meta`, and checksum logic.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - User-facing workflow entry points; unchanged but must reflect role references in descriptions.

## Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| **R1 — Flat Registry** | Integration respects flat layout; no workflow assumes subdirectory structure. |
| **R2 — Declarative Handoffs** | Workflow bodies reference roles by `id`; handoff chains defined in cards, not in workflow bodies. |
| **R3 — Explicit Triggers** | Every trigger listed in card frontmatter maps to a named gate in this spec's §2 workflow amendments. |
| **R4 — Orchestration Context Not Role** | `run.md` Execution Setup table (§2.1) renames Manager→Orchestrator, removes Developer row, and introduces "Track Owner Context" prose. |
| **R5 — Self-Contained Cards** | Workflow bodies do not duplicate card content; they only reference and describe the gate. |
| **R6 — Skills Advisory Only** | Workflow amendments never auto-invoke skills; `skills_recommended` surface only in card bodies and optional user-facing hints (§5). |
| **R7 — C24 Backward Compatibility** | `RULES.md §C24` table rewritten as pointer-table (§4). Inline persona phrases removed from all workflow bodies and replaced with `@role:{id}` references. |
| **R8 — Engine Versioning** | Implemented by the tooling spec — see [l2-role-tooling.md](l2-role-tooling.md) §2. |
| **R9 — No Silent Dropout** | Implemented by the tooling spec — see [l2-role-tooling.md](l2-role-tooling.md) §1. |
| **R10 — Read-Only from Projects** | No opt-in extension surface introduced in this version. |

## 1. Integration Map

Full workflow-to-role mapping after integration:

| Workflow | Gate | Role(s) | Change Type |
| --- | --- | --- | --- |
| `run.md` | Parallel Mode Dispatch | `orchestrator` | Rename Manager → Orchestrator |
| `run.md` | Step 3 — Execute | `coder` | Name the previously-unnamed role |
| `run.md` | Step 3.3 — Decision Review (new, opt-in) | `code-skeptic` | New gate |
| `run.md` | Step 3.4 — Diff Review (new) | `code-reviewer` | New gate |
| `run.md` | Step 3.5 — QA Review | `test-engineer` | Rename Tester → Test-engineer |
| `run.md` | Step 3.6 — Simplify Pass (new, opt-in) | `code-simplifier` | New gate |
| `run.md` | Blocked Branch | `debugger` | New role for existing branch |
| `run.md` | Post-Done Docs Sync (new) | `docs-specialist` | New gate |
| `task.md` | Plan Write-back | `planner` | Absorb Planning Skeptic |
| `spec.md` | Post-Update Review | `spec-critic` | Migrate Project Critic |
| `analyze.md` | Pre-Advisory Audit | `project-auditor` | Migrate Auditor |
| `rule.md` | Impact Analysis | `constitutional-reviewer` | Migrate Constitutional Reviewer |
| `retrospective.md` | Signal Calculation | `retrospective-analyst` | Migrate Independent Analyst |

## 2. `run.md` Amendments

### 2.1 Execution Setup Table Rewrite

**Before:**

```markdown
| Mode | Role | Process |
| --- | --- | --- |
| Sequential | Mono-Agent | Picks next Todo → Executes → Updates Done → Repeats. |
| Parallel | Manager | Reads TASKS.md → Detects shared-file conflicts → Assigns tracks → Syncs PLAN.md. |
| Parallel | Developer | Track owner → Executes in order → Reports Done/Blocked. |
```

**After:**

```markdown
| Mode | Orchestration | Active Role(s) |
| --- | --- | --- |
| Sequential | No orchestrator | Track Owner Context → @role:coder → @role:code-reviewer → @role:test-engineer (sequence of hats within one agent) |
| Parallel | @role:orchestrator dispatches tracks | Per track: Track Owner Context → same role sequence as Sequential |

**Track Owner Context**: operational position of the agent owning a track — not a role. The agent adopts executor and reviewer roles in sequence while owning the track. In Parallel mode, the Orchestrator assigns tracks and serializes shared-file conflicts (see `@role:orchestrator` card for full protocol).
```

### 2.2 Step 3 Amendments

Current `run.md` Step 3 "Execute" prose is amended to begin with `Activate @role:coder`. The existing content (implement per spec, no scope creep) moves into the Coder card's Operating Protocol and is referenced from the step rather than duplicated.

### 2.3 New Gate: Step 3.3 — Decision Review (opt-in)

Inserted between Step 3 and Step 3.4. Triggered when:

- The task's spec section explicitly flags `requires-decision-review: true`, OR
- The Coder identifies non-trivial design choices during initial read.

Activates `@role:code-skeptic`. Proceeds to Step 3.4 on PASS, returns to Step 3 on revision, escalates to Planner on plan-level issues.

### 2.4 New Gate: Step 3.4 — Diff Review

Inserted between Step 3 (or 3.3 if active) and Step 3.5. Activates `@role:code-reviewer`. On FAIL, returns to Step 3. On PASS with simplification notes, proceeds to Step 3.6 (opt-in). On clean PASS, proceeds to Step 3.5.

### 2.5 Step 3.5 Amendment (rename Tester → Test-engineer) [MODIFIED]

Current `run.md` Step 3.5 "QA Review (C24)" prose is amended to begin with `Activate @role:test-engineer`. The gate includes five explicit checks: Verify Criterion, Spec Boundary, Edge Cases, Side Effects, and Regression Risk. The Test-engineer card owns the detailed protocol; the workflow keeps the checklist visible so agents cannot mark `Done` without task-specific evidence.

### 2.6 New Gate: Step 3.6 — Simplify Pass (opt-in)

Inserted between Step 3.4 and Step 3.5. Triggered when Code-reviewer emits complexity notes OR user flags `requires-simplify: true`. Activates `@role:code-simplifier`. Returns to Step 3.4 after revision.

### 2.7 Blocked Branch Role

Existing Blocked `[!]` branch gains the attribution `Activate @role:debugger`. Current prose (reason capture, handoff rules) moves into the Debugger card's Operating Protocol.

### 2.8 New Gate: Post-Done Docs Sync

Inserted between Step 3.5 PASS and the Step 4 "Update" transition. Triggered only when Test-engineer flagged docs-visible changes. Activates `@role:docs-specialist`. Returns to Test-engineer for final Done confirmation.

### 2.9 Run Completion Checklist Additions

Two new lines appended to the checklist block in `run.md`:

```
☐ Role Registry: All referenced role IDs resolve to cards in .magic/roles/
☐ Handoff Integrity: Handoff chains declared by card frontmatter respected
```

## 3. Other Workflow Amendments

### 3.1 `task.md`

Current Step 5 "Planning Audit (C24)" prose is amended: `Adopt a Planning Skeptic persona` → `Activate @role:planner (includes adversarial pass as intrinsic step 5)`. The Planning Skeptic gate is absorbed — see `@role:planner` Operating Protocol step 5.

Task Completion Checklist line `☐ Role-Switching (C24): Draft Plan audited in Skeptic Persona` changes to `☐ Role: Plan produced by @role:planner; adversarial pass executed`.

### 3.2 `spec.md`

Post-Update Review section is amended: `Adopt a Project Critic persona to audit the changes` → `Activate @role:spec-critic`. The seven checks (L1 Purity, Invariant Completeness, Substantive Compliance, Coherence, Links, Rules, Sync Check) remain in the workflow body as the gate's checklist (they are also mirrored in the card's Operating Protocol).

Task Completion Checklist line `☐ Review: Post-Update Review performed in Critic Persona` changes to `☐ Review: Post-Update Review performed by @role:spec-critic`.

### 3.3 `analyze.md`

Pre-Advisory Audit section: `Before generating recommendations, adopt an Auditor persona` → `Before generating recommendations, activate @role:project-auditor`.

Checklist line `☐ Pre-Advisory Audit (C24): Auditor persona applied` (appears twice in the file) changes to `☐ Pre-Advisory Audit: @role:project-auditor activated`.

### 3.4 `rule.md`

§5 Constitutional Reviewer Persona Audit: `Adopt the Constitutional Reviewer persona` → `Activate @role:constitutional-reviewer`. Interrogative hooks remain in the workflow body.

### 3.5 `retrospective.md`

Signal calculation section: `Before calculating Signal, adopt an Independent Analyst persona` → `Before calculating Signal, activate @role:retrospective-analyst`.

### 3.6 `simulate.md`

Simulate references `Skeptic persona` in three places (Confirmation Bias Check, Skeptic Persona Audit subsection, final approval phrase). These remain as-is in the first iteration — `simulate.md` is a diagnostic workflow, not a primary SDD workflow, and its Skeptic is a general cognitive stance, not a production role. Future iteration may add a `simulation-skeptic` role if needed; deferred to backlog.

## 4. `RULES.md §C24` Rewrite

### 4.1 Current §C24 (Role-Switching Gates)

A 6-row inline table describing each persona. To be replaced.

### 4.2 New §C24 (Role Registry Pointer)

```markdown
### C24 — Role Registry

The engine maintains a unified role registry at `.magic/roles/`. At critical workflow gates, agents activate named roles from this registry. The registry is the authoritative source for persona protocols; workflow bodies reference roles by `id` rather than inlining persona content.

| Workflow | Gate | Role | Card |
| --- | --- | --- | --- |
| `spec.md` | Post-Update Review | `spec-critic` | `.magic/roles/spec-critic.md` |
| `task.md` | Plan Write-back | `planner` | `.magic/roles/planner.md` |
| `run.md` | Step 3 Execute | `coder` | `.magic/roles/coder.md` |
| `run.md` | Step 3.4 Diff Review | `code-reviewer` | `.magic/roles/code-reviewer.md` |
| `run.md` | Step 3.5 QA Review | `test-engineer` | `.magic/roles/test-engineer.md` |
| `run.md` | Blocked Branch | `debugger` | `.magic/roles/debugger.md` |
| `run.md` | Parallel Dispatch | `orchestrator` | `.magic/roles/orchestrator.md` |
| `analyze.md` | Pre-Advisory Audit | `project-auditor` | `.magic/roles/project-auditor.md` |
| `rule.md` | Impact Analysis | `constitutional-reviewer` | `.magic/roles/constitutional-reviewer.md` |
| `retrospective.md` | Signal Calculation | `retrospective-analyst` | `.magic/roles/retrospective-analyst.md` |

**Opt-in roles** (triggered conditionally; not in mandatory gate table):
- `code-skeptic` — opt-in decision review before coding.
- `code-simplifier` — opt-in simplification pass after Code-reviewer.
- `docs-specialist` — triggered only when a Done task changes public API / docs-visible behavior.

Role activation is mandatory at listed gates — it is not skipped in Trust Mode (C9). Activating a role means applying that role's Operating Protocol. The agent adopts the role's stance for one reasoning pass; no user interaction required.

**Integrity:** The engine runs `role_registry_integrity` during `check-prerequisites` (see l2-role-tooling.md §1). A workflow reference to a non-existent role ID HALTs execution with `ROLE_MISSING`.
```

### 4.3 Document History Entry

Append to `RULES.md` Document History:

```markdown
| 1.3.0 | 2026-04-23 | §C24 rewritten as Role Registry pointer table. Persona content externalized to .magic/roles/. See l2-role-integration.md. |
```

## 5. Skill Surface Changes

No new skills are introduced by this spec. Existing skills are **not** modified.

The `skills_recommended` field in role cards is advisory only (per R6). Specifically:

- `code-simplifier` card lists `simplify` as recommended; no workflow change is required — the existing `/simplify` skill remains user-invocable and independent.
- No role card in the initial registry lists any other skill.

Future iterations may expand this field, but the surface between roles and skills remains strictly one-way (roles may suggest skills; skills never reference roles).

## 6. Drawbacks & Alternatives

### 6.1 Drawback: Workflow File Churn

Integration touches 6 workflow files (`run.md`, `task.md`, `spec.md`, `analyze.md`, `rule.md`, `retrospective.md`) plus `rules.md` template and `.checksums`. Mitigation: changes are localized edits (inline persona → `@role:{id}` reference), not restructuring. Checksums are regenerated by `update-engine-meta`.

> Tooling-side drawbacks (the `check-prerequisites` surface expansion, the hard-coded-index and auto-wire-skills alternatives) moved with their content to [l2-role-tooling.md](l2-role-tooling.md) §4.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[RUN]` | `.magic/run.md` | Host of 6 role integration points. |
| `[TASK]` | `.magic/task.md` | Host of planner integration. |
| `[SPEC]` | `.magic/spec.md` | Host of spec-critic integration. |
| `[ANALYZE]` | `.magic/analyze.md` | Host of project-auditor integration. |
| `[RULE]` | `.magic/rule.md` | Host of constitutional-reviewer integration. |
| `[RETRO]` | `.magic/retrospective.md` | Host of retrospective-analyst integration. |
| `[RULES-TPL]` | `.magic/templates/rules.md` | Source of C24 pointer-table rewrite. |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 2.0.0 | 2026-06-10 | Scope narrowed to workflow-body wiring: engine tooling (§5 check-prerequisites integrity, §6 update-engine-meta, §7 template) extracted verbatim to l2-role-tooling.md (SPEC_BLOAT fix). §8 Skill Surface → §5; §9 Drawbacks → §6 (tooling drawbacks moved with their content). Stable retained via Trust Mode re-review (C9). |
| 1.1.0 | 2026-05-12 | Added explicit Run QA `Verify Criterion` guard aligned with task `Verify` lines and Test-engineer role card. |
| 1.0.0 | 2026-04-23 | Initial Stable. Defines workflow amendments, RULES.md §C24 rewrite, check-prerequisites addition, update-engine-meta treatment, and template file. |
