# Project Specification Rules

**Version:** 1.6.0
**Status:** Stable
**Based on:** [.magic/spec.md](file:///d:/Projects/src/github.com/teratron/magic-spec/.magic/spec.md)

## Overview

Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions

- Spec files must include a layer prefix (e.g., `l1-`, `l2-`), followed by lowercase kebab-case: `l1-api.md`, `l2-database-schema.md`.
- System files use uppercase: `INDEX.md`, `RULES.md`.
- Section names within specs are title-cased.

## 2. Status Rules

- **Draft → RFC**: all required sections filled, ready for review.
- **RFC → Stable**: reviewed and approved (Human Signal) **OR** Auto-Stabilized via Trust Mode (C9) if logic fits the architecture and satisfies MVC criteria.
- **RFC → Draft**: needs rework or significant revision.
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
7. **No-Change, No-Bump** — NEVER trigger a version bump (C14) if no physical files in `.magic/` were modified (e.g., during simulations, dry runs, or purely cognitive tasks).

### C2 — Workflow Minimalism

Limit the SDD workflow to the core command set to maximize automation and minimize cognitive overhead. Do not introduce new workflow commands unless strictly necessary and explicitly authorized as a C2 exception.

### C3 — Parallel Task Execution Mode

Task execution defaults to **Parallel mode**. A Manager Agent coordinates execution, reads status, unblocks tracks, and escalates conflicts. Tasks with no shared constraints are implemented in parallel tracks.

### C4 — Automate User Story Priorities

Skip the user story priority prompt. The agent must automatically assign default priorities (P2) to User Stories during task generation to maximize automation and avoid interrupting the user.

### C6 — Autonomous Selective Planning

During plan updates, specifications are automatically handled by their status to minimize user friction:

- **Draft/RFC specs**: Automatically moved to `## Backlog` in `PLAN.md` without prompting.
- **Stable specs**: Automatically pulled into the active plan.
- **Orphaned specs** (in INDEX.md but absent from both plan and backlog): Flagged as critical blockers.

**Note**: Safety is maintained through **Structural Validation** (check-prerequisites) rather than status gates.

### C7 — Universal Script Executor

All automation scripts must be invoked via the cross-platform executor:
`node .magic/scripts/executor.js <script-name> [args]`

Direct calls to `.sh` or `.ps1` scripts are not permitted in workflow instructions. The executor detects the OS and delegates to the appropriate implementation.

### C8 — Phase Archival

On phase completion, the per-phase task file is moved from `$DESIGN_DIR/tasks/` to `$DESIGN_DIR/archives/tasks/`. The link in `TASKS.md` is updated to point to the archive location. This keeps the active workspace small while preserving full history.

### C9 — Zero-Prompt Automation (Trust Mode)

Once the user provides high-level intent (ideation), the agent is authorized to proceed through the entire lifecycle (Draft → RFC → Stable → Plan → Task → Run) without further confirmation prompts, provided the logic is clear and non-conflicting. Silent operations include: status auto-promotion, planning, retrospective Level 1, changelog Level 1, and CONTEXT.md regeneration. Critical exceptions requiring explicit user approval:

1. **Changelog Level 2** (external release artifacts).
2. **Destructive Actions** (deleting files or specifications).
3. **Ambiguous Triggers** (where >1 architectural path exists).

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

To ensure accurate engine state tracking and reliable updates, any modification to the core engine/kernel files (anything inside the `.magic/` directory, including workflows and templates) MUST be accompanied by an automated engine metadata update: `node .magic/scripts/executor.js update-engine-meta --workflow {workflow}`.

1. **Scope**: Applies to all `.md` workflows, `scripts/`, `templates/`, and `config.json` inside the engine directory.
2. **Automation**: This command automatically increments the patch version in `.magic/.version`, updates the relevant history file in `.magic/history/`, and regenerates `.magic/.checksums`. **Smart History**: Redundant automated entries are skipped if the last entry matches.
3. **Exclusion**: Modifications to `.design/` files (project content) do NOT trigger an engine version bump; they trigger project manifest bumps instead.
4. **Synchronization**: The version in `.magic/.version` should stay aligned with the latest meaningful change to the engine's functional logic.
5. **Simulation Exemption**: Purely cognitive simulations, dry runs, or audit tasks that do not modify files MUST NOT trigger a C14 version bump to avoid metadata noise.

### C15 — Workspace Scope Isolation

When operating in a workspace with a defined scope (via `.design/workspace.json`), the agent MUST restrict all analysis and file operations to the directories specified in the scope. All other project directories are treated as out-of-scope to ensure logical isolation and prevent context leakage or accidental modification of unrelated modules.

### C16 — Micro-spec Convention

For minor features, simple bugfixes, or changes expected to be under 50 lines of documentation, the agent is authorized to use the lightweight `.magic/templates/micro-spec.md` instead of the full specification template. If a Micro-spec exceeds 50 lines or architectural complexity increases, it MUST be promoted to the full Standard template.

### C17 — Adapter Distribution Reference

All supported IDE/Agent adapters and their target directories must be documented in `docs/distribution.md`. This file is the reference for users performing manual installation from GitHub Releases. (Replaces the `installers/adapters.json` registry removed in v2.0.0.)

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
2. Inherit all §1–6 universal rules and global §7 conventions from `.design/RULES.md` — no re-declaration needed.
3. Must not contradict the global constitution (Constitutional Guard applies equally).
4. Are created on demand by `magic.rule` when the first workspace-scoped rule is requested.
5. Version independently from the global `RULES.md`.

### C23 — Context Economy & Validation Caching

To minimize redundant resource usage and improve performance, the agent may optimize `check-prerequisites` calls within a single task lifecycle:

1. **Turn-Aware Caching**: If `check-prerequisites` returned `ok: true` earlier in the current conversation turn or the immediately preceding turn, and the agent has NOT modified any files in `.magic/` or `.design/` since that check, the agent is authorized to skip the physical script execution and rely on the known "Clean State".
2. **External Drift Guard**: If a significant time has passed or the user has performed manual file operations (e.g. `git pull`, manual edits in terminal), the agent MUST perform a fresh `check-prerequisites` call.
3. **Halt Persistence**: If the previous check returned an error or warning (e.g. `checksums_mismatch`), the agent MUST re-run the check after any attempt to fix it. Never assume a "heal" without verification.
4. **Audit/Simulate Exemption**: In `/magic.analyze` (Ventilation) or `/magic.simulate` (Validation), caching is NOT permitted. These workflows must perform fresh, physical scans by definition to fulfill their audit purpose.

### C24 — Role-Switching Gates

At critical decision points, the agent MUST adopt a specific adversarial persona before finalizing output. This prevents confirmation bias and "glazed eye" failures where the agent that produced work also approves it.

| Workflow | Gate | Persona | Key Questions |
| :--- | :--- | :--- | :--- |
| `spec.md` | Before `Post-Update Review` | **Project Critic** | L1 purity? Invariant completeness? L2 compliance substantive? |
| `task.md` | Before `Plan Write-back` | **Planning Skeptic** | Optimism bias? Hidden dependencies? Cascade risk? |
| `run.md` | Before marking task `Done` | **Tester** | Spec boundary? Edge cases? Side effects? Regression risk? |
| `retrospective.md` | Before Signal calculation | **Independent Analyst** | Does Signal reflect spec quality, not just execution stats? |
| `analyze.md` | Before Advisory Report | **Auditor** | Severity correct? Systemic pattern behind findings? |
| `rule.md` | Before Impact Analysis | **Constitutional Reviewer** | Practical conflict with C1–C23 in running workflows? |
| `simulate.md` | During Logic Audit | **Skeptic** | Are guards enforceable (HALT) vs. just LLM compliance? |

Switching is mandatory — it is not skipped in Trust Mode (C9). The persona switch takes one internal reasoning pass; it does not require user interaction.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.6.0 | 2026-04-03 | Agent | Baseline SDD role-switching constitution (C24) finalized across all core workflows. |
| 1.5.2 | 2026-04-03 | Agent | Fully expanded C24 to cover 7 core personas across all workflows. |
| 1.5.1 | 2026-04-03 | Agent | Integrated the Auditor persona (C24) into the operational logic. |
| 1.5.0 | 2026-04-03 | Agent | Integrated the Reviewer/Critic persona (C24) into the operational logic. |
| 1.4.1 | 2026-03-31 | Antigravity | RE-6: Quantified Workspace Disambiguation (≥50%) and removed "high-confidence" term (simulation fix). |
| 1.4.0 | 2026-03-31 | Agent | C6: Removed undefined "Strong/Weak Tier" qualifier (RE-3 simulation fix). |
| 1.3.0 | 2026-03-16 | Antigravity | Added C23: Context Economy & Validation Caching. |
| 1.2.0 | 2026-03-05 | Agent | Added C22: Workspace Rule Inheritance. |
| 1.1.0 | 2026-03-03 | Antigravity | Added C17-C21: Installers, Security, Parity, and Ventilation. |
| 1.0.0 | 2026-03-03 | Agent | Initial constitution |
