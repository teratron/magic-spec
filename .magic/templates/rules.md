# Project Specification Rules

**Version:** 1.4.0
**Status:** Active

## Overview

Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions

- Spec files must include a layer prefix (e.g., `l1-`, `l2-`), followed by lowercase kebab-case: `l1-api.md`, `l2-database-schema.md`.
- System files use uppercase: `INDEX.md`, `RULES.md`.
- Section names within specs are title-cased.

## 2. Status Rules

- **Draft → RFC**: all required sections filled, ready for review.
- **RFC → Stable**: reviewed, approved, no open questions.
- **RFC → Draft**: needs rework or revision affecting ≥1 core section.
- **Stable → RFC**: substantive amendment (minor/major bump) requires re-review.
- **Any → Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules

- `patch` (0.0.X): typo fixes, clarifications — no structural change.
- `minor` (0.X.0): new section added or existing section extended.
- `major` (X.0.0): structural restructure or scope change.

## 4. Formatting Rules

- Use `plaintext` blocks for all directory trees.
- Use `mermaid` blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

## 5. Content Rules

- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

## 6. Relations Rules

- Every spec that depends on another must declare it in `Related Specifications`.
- Cross-file content duplication is not permitted — use a link instead.
- Circular dependencies must be flagged and resolved.

## 7. Project Conventions

### C1 — `.magic/` Engine Safety

`.magic/` is the active SDD engine. Any modification must follow this protocol:

1. **Read first** — open and fully read every file that will be affected.
2. **Analyse impact** — trace how the changed file is referenced by other engine files and workflow wrappers.
3. **Verify continuity** — confirm that after the change all workflows remain fully functional.
4. **Never edit blindly** — if the scope of impact is unclear, stop and ask before proceeding.
5. **Document the change** — record modifications in the relevant spec and commit message.
6. **Atomic Update** — apply changes simultaneously across all related files (scripts, workflows, and documentation) to maintain full engine consistency.
7. **No-Change, No-Bump** — NEVER trigger a version bump (C14) if no physical files in `.magic/` were modified (e.g., during dry runs or purely cognitive tasks).

### C2 — Workflow Minimalism

Limit the SDD workflow to the core command set to maximize automation and minimize cognitive overhead. Do not introduce new workflow commands unless strictly necessary and explicitly authorized as a C2 exception.

### C3 — Parallel Task Execution Mode

Task execution defaults to **Parallel mode**. A Manager Agent coordinates execution, reads status, unblocks tracks, and escalates conflicts. Tasks with no shared constraints are implemented in parallel tracks.

### C4 — Automate User Story Priorities

Skip the user story priority prompt. The agent must automatically assign default priorities (P2) to User Stories during task generation to maximize automation and avoid interrupting the user.

### C6 — Selective Planning

During plan updates, specs are handled by their status:

- **Draft specs**: automatically moved to `## Backlog` in `PLAN.md` without user input.
- **RFC specs**: surfaced to user with a recommendation to backlog until Stable.
- **Stable specs**: agent asks which ones to pull into the active plan. All others go to Backlog.
- **Orphaned specs** (in INDEX.md but absent from both plan and backlog): flagged as critical blockers.

### C7 — Universal Script Executor

All automation scripts must be invoked via the cross-platform executor:
`node .magic/scripts/executor.js <script-name> [args]`

Direct calls to `.sh` or `.ps1` scripts are not permitted in workflow instructions. The executor detects the OS and delegates to the platform-matching implementation.

### C8 — Phase Archival

On phase completion, the per-phase task file is moved from `$DESIGN_DIR/tasks/` to `$DESIGN_DIR/archives/tasks/`. The link in `TASKS.md` is updated to point to the archive location. This keeps the active workspace small while preserving full history.

### C9 — Default Autonomous Execution

**Default behavior**: the agent executes the full SDD lifecycle (Draft → RFC → Stable → Plan → Task → Run) autonomously — including status promotion, planning, dispatch, retrospective L1, changelog L1, and CONTEXT.md regeneration. User input is solicited **only** at the closed list of objective gates below. Outside this list, asking for confirmation, presenting choice menus, or hesitating is forbidden (see C25 Engineer Posture).

**Objective gates requiring user input or HALT**:

1. **Destructive Actions** — deleting specs, rules, files, or rewriting git history.
2. **Core Constitution Amendment** — modifying `RULES.md §1–6` (Universal Constitution).
3. **Architectural Hard Fork** — multiple incompatible paths exist with no objective tiebreaker (e.g., user must declare a stack preference). Present **decisions**, not browsing menus.
4. **Cross-Workspace Parity Collision** — same spec name with version mismatch across workspaces; canonical source not derivable.
5. **Drift HALT** — `VERSION_DRIFT` or `STATUS_DRIFT` between file header and `INDEX.md` (objective inconsistency requiring user resolution).
6. **Engine Integrity Failure** — `checksums_mismatch` or `GHOST_REGISTRY` blocks in-scope files (C15 Filter).
7. **Depth Control Limit** — analysis scope exceeds the depth threshold (>500 source files); user picks Focused or Quick mode.
8. **Pause / STATE.md Acknowledgment** — `Blocking Constraints` displayed before resuming work; informational, not a question.
9. **Changelog Level 2 / Release Artifacts** — public release entries; user reviews via the standard git commit gate, not inline.
10. **Constitutional Guard** — proposed §7 rule contradicts §1–6 → HALT.
11. **Hard-Dependency Cycle** — circular `Implements:` chain (soft `Related Specifications` cycles do NOT block).

For all other operations: act, narrate the action declaratively, log to `STATE.md` / `CONTEXT.md` / `CHANGELOG.md`, append a one-liner revert hint where the action is non-trivial.

### C10 — Task Architecture & Status Truth

Logic and progress tracking are distributed between two primary files to ensure clarity and automation:

1. **`PLAN.md` (Strategic)**: High-level overview of **Phase → Specification**. Each specification has a single checkbox representing its aggregate implementation status.
2. **`TASKS.md` (Tactical)**: The master execution ledger. Contains a concise **Phase Checklist** (items prefixed with unique `[T-XXXX]` IDs) followed by detailed task blocks.

All execution progress (`[x]`, `[/]`, etc.) must be recorded in the `TASKS.md` checklist first. `PLAN.md` is updated only when a specification or phase is fully completed.

### C11 — Simulation Workflow (C2 Exception)

`magic.simulate` is explicitly authorized as a developer-facing tool for engine validation and regression testing. It is a one-time exception to C2. Not intended for use in regular project workflows.

### C12 — Quarantine Cascade

If a Layer 1 (Concept) specification loses its `Stable` status or is removed, all dependent Layer 2/3 (Implementation) specifications must automatically and transparently be treated as demoted to `RFC` or moved to the Backlog by the Task workflow. The system must quarantine dependent specifications to prevent "orphaned" task scheduling without requiring manual status edits for every child in `INDEX.md`.

**C12.1 — Stabilization Exception**: Tasks explicitly intended to stabilize or fix mismatches to regain `Stable` status for the parent may bypass this quarantine.

### C13 — Agent Cognitive Discipline

All AI agents operating within the Magic SDD framework must adhere to strict cognitive discipline to prevent hallucinations and silent failures:

1. **Primary Source Principle**: Always read original `.magic/` and `.design/` files. Never rely on cached memory or interpretive assumptions.
2. **Anti-Truncation**: Execute checklists and multi-step processes literally. Do not skip, merge, or summarize steps.
3. **Zero Assumptions**: If an instruction is absent or ambiguous, halt and ask for clarification. Do not invent missing steps or scripts.
4. **Mandatory Self-Verification**: Cross-reference actions against original instructions before finalizing any task or presenting a completion checklist.
5. **Anti-Hallucination Audit**: All architectural conclusions, problem reports, and proposed changes must be directly traceable to specific statements within project specifications or engine rules.

### C14 — Engine Versioning Protocol

To ensure accurate engine state tracking and reliable updates, any modification to the core engine/kernel files (anything inside the `.magic/` directory, including workflows and templates) MUST be accompanied by an automated engine metadata update: `node .magic/scripts/executor.js update-engine-meta`.

1. **Scope**: Applies to all `.md` workflows, `scripts/`, `templates/`, and `config.json` inside the engine directory.
2. **Automation**: This command automatically increments the patch version in `.magic/.version` and regenerates `.magic/.checksums`. Version history is tracked via git log and `CHANGELOG.md`.
3. **Exclusion**: Modifications to `.design/` files (project content) do NOT trigger an engine version bump; they trigger project manifest bumps instead.
4. **Synchronization**: The version in `.magic/.version` should stay aligned with the latest meaningful change to the engine's functional logic.
5. **Simulation Exemption**: Purely cognitive simulations, dry runs, or audit tasks that do not modify files MUST NOT trigger a C14 version bump to avoid metadata noise.

### C15 — Workspace Scope Isolation

When operating in a workspace with a defined scope (via `.design/workspace.json`), the agent MUST restrict all analysis and file operations to the directories specified in the scope. All other project directories are treated as out-of-scope to ensure logical isolation and prevent context leakage or accidental modification of unrelated modules.

### C16 — Micro-spec Convention

For minor features, simple bugfixes, or changes expected to be under 50 lines of documentation, the agent is authorized to use the lightweight `.magic/templates/micro-spec.md` instead of the full specification template. If a Micro-spec exceeds 50 lines or architectural complexity increases, it MUST be promoted to the full Standard template.

### C17 — Adapter Distribution Reference

All supported IDE/Agent adapters and their target directories must be documented in `docs/distribution.md`. This file is the reference for users performing manual installation from GitHub Releases.

### C20 — Auto-Heal Recovery

The engine must proactively identify and repair its own metadata. If `executor.js` detects missing history files or corrupted checksums during non-critical operations, it should attempt to "Auto-Heal" (restore defaults or regenerate) before Proceeding or Halting.

### C21 — Project Ventilation (Analyze)

The command `/magic.analyze` (or `Analyze project`) triggers "Project Ventilation": a deep scan that treats the current codebase as the source of truth and compares it against `INDEX.md` and `RULES.md`. It must identify:

- **Registry Drift**: Specs in INDEX but missing on disk.
- **Coverage Gaps**: Code folders without corresponding specs.
- **Rule Violations**: Code patterns that contradict `RULES.md §7` (both global and workspace tiers).
- **Integrity Issues**: Mismatched checksums in `.magic/`.

### C22 — Workspace Rule Inheritance

Each workspace may maintain a local `RULES.md` at `.design/{workspace}/RULES.md`. These files:

1. Contain only workspace-specific §7 conventions, identified as `WC1`, `WC2`, … (workspace convention).
2. Inherit all §1-6 universal rules and global §7 conventions from `.design/RULES.md` — no re-declaration needed.
3. Must not contradict the global constitution (Constitutional Guard applies equally).
4. Are created on demand by `magic.rule` when the first workspace-scoped rule is requested.
5. Version independently from the global `RULES.md`.

### C23 — Context Economy & Validation Caching

To minimize redundant resource usage and improve performance, the agent may optimize `check-prerequisites` calls within a single task lifecycle:

1. **Turn-Aware Caching**: If `check-prerequisites` returned `ok: true` earlier in the current conversation turn or the immediately preceding turn, and the agent has NOT modified any files in `.magic/` or `.design/` since that check, the agent is authorized to skip the physical script execution and rely on the known "Clean State".
2. **External Drift Guard**: If >5 minutes have passed since the last check, the context window has been compacted, or the user has performed manual file operations (e.g. `git pull`, manual edits in terminal), the agent MUST perform a fresh `check-prerequisites` call.
3. **Halt Persistence**: If the previous check returned an error or warning (e.g. `checksums_mismatch`), the agent MUST re-run the check after any attempt to fix it. Never assume a "heal" without verification.
4. **Audit/Simulate Exemption**: In `/magic.analyze` (Ventilation) or `/magic.simulate` (Validation), caching is NOT permitted. These workflows must perform fresh, physical scans by definition to fulfill their audit purpose.

### C24 — Role-Switching Gates

At critical decision points, the agent MUST activate the designated role card from `.magic/roles/` before finalizing output. This prevents confirmation bias and "glazed eye" failures where the agent that produced work also approves it.

| Workflow | Gate | Role | Card |
| :--- | :--- | :--- | :--- |
| `spec.md` | Before `Post-Update Review` | `@role:spec-critic` | `.magic/roles/spec-critic.md` |
| `task.md` | Before `Plan Write-back` | `@role:planner` | `.magic/roles/planner.md` |
| `run.md` | Before marking task `Done` | `@role:test-engineer` | `.magic/roles/test-engineer.md` |
| `retrospective.md` | Before Signal calculation | `@role:retrospective-analyst` | `.magic/roles/retrospective-analyst.md` |
| `analyze.md` | Before Advisory Report | `@role:project-auditor` | `.magic/roles/project-auditor.md` |
| `rule.md` | Before Impact Analysis | `@role:constitutional-reviewer` | `.magic/roles/constitutional-reviewer.md` |

Role activation is mandatory — it is not skipped under C9. Each role card defines its own gate conditions and interrogative hooks. The role switch takes one internal reasoning pass; it does not require user interaction.

Full registry: `.magic/roles/` — 13 registered role cards (see `l1-role-system.md` for invariants).

### C25 — Engineer Posture (Narrate-and-Act)

The agent operates as a senior engineer, not as an assistant awaiting permission. User-facing chat output MUST adhere to:

1. **Forbidden phrasing** outside C9 objective gates: `"Should I…"`, `"Do you want me to…"`, `"Would you like…"`, `"How should we proceed?"`, `"Let me know if…"`, choice menus of the form `(a)…/(b)…/(c)…`.
2. **Mandatory phrasing**: declarative narration of completed or in-progress action — e.g., `"Writing X."`, `"Promoted Y to Stable."`, `"[Auto-SDD] Dispatched N specs."`, `"[Auto-Plan] Phase 2: {short list}."`.
3. **Tentative qualifiers banned** in user-facing summaries: no `"I think…"`, `"This might…"`, `"It seems like…"`. Code-level comments may remain explanatory; this rule governs chat output only.
4. **Revert hint convention** — when an auto-action is non-trivial, append a one-liner showing how to undo: `"(Revert: git restore <file>)"` or `"(Amend: /magic.spec amend X)"`.
5. **Interruption is the user's tool** — Ctrl+C, manual edits, and `git restore` form the user's safety net. The agent's job is to act decisively and let the user intervene when wrong.

C25 scope is chat output. It does NOT alter HALT logic or any objective C9 gate.
