# Project Specification Rules

**Version:** 1.9.0
**Status:** Active

## Overview

Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions

- Spec files use lowercase kebab-case: `api.md`, `database-schema.md`.
- System files use uppercase: `INDEX.md`, `RULES.md`.
- Section names within specs are title-cased.

## 2. Status Rules

- **Draft -> RFC**: all required sections filled, ready for review.
- **RFC -> Stable**: reviewed, approved, no open questions.
- **Any -> Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules

- patch (0.0.X): typo fixes, clarifications, no structural change.
- minor (0.X.0): new section added or existing section extended.
- major (X.0.0): structural restructure or scope change.

## 4. Formatting Rules

- Use plaintext blocks for all directory trees.
- Use mermaid blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

### 4.1. Checklist Notation

To maintain consistent state tracking across all documents (`PLAN.md`, `TASKS.md`, `task.md` artifacts), the following notation must be used for checkboxes:

- `[ ]` — **Todo**: Task identified but not yet started.
- `[/]` — **In Progress**: Task currently being addressed by an agent.
- `[x]` — **Done**: Task completed and verified.
- `[~]` — **Cancelled**: Task no longer relevant or superseded.
- `[!]` — **Blocked**: Task requires external input or dependency completion.

## 5. Content Rules

- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

### 5.1. SDD Metadata (New)

- **Layer**: Declare the implementation layer (`concept` or `implementation`).
- **Implements**: Reference the parent specification or standard (or `N/A`).
- **Layering Rule**: Layer 2 (implementation) specs must implement a Layer 1 (concept) parent. Layer 2 cannot be `RFC` or `Stable` until its Layer 1 parent is `Stable`.
- **Status Mapping**:
  - `Draft`: Development version.
  - `RFC`: Ready for review/Request for Comments.
  - `Stable`: Approved and implemented.

## 6. Relations Rules

- Every spec that depends on another must declare it in Related Specifications.

## 7. Project Conventions

<!-- Populated automatically via triggers T1-T4. Do not edit manually. -->

### C1 — `.magic/` is the live SDD engine: modify with extreme care

**Declared by:** User (T4 trigger, 2026-02-20)

`.magic/` is simultaneously the **active SDD engine** used in this very project and the source
that gets shipped to end users. Any modification to files inside `.magic/` must follow this protocol:

1. **Read first** — open and fully read every file that will be affected before touching anything.
2. **Analyse impact** — trace how the changed file is referenced by other `.magic/` files,
   `.agent/workflows/magic.*.md` wrappers, `adapters/`, and `init.ps1` / `init.sh`.
3. **Verify SDD continuity** — confirm that after the change all five workflows
   (specification, plan, task, rule, retrospective) remain fully functional.
4. **Never edit blindly** — if the scope of impact is unclear, stop and ask before proceeding.
5. **Document the change** — any modification to engine files must be recorded in the
   relevant spec (if applicable) and in a git commit message explaining the reason.

#### 7.1.1 Internal Engine Development (New)

When manually updating workflows or engine logic in `.magic/`, always regenerate checksums to prevent installer conflicts:

```powershell
node .magic/scripts/executor.js generate-checksums
```

### C2 — Workflow Minimalism

**Declared by:** User (2026-02-23)

Limit the SDD workflow to the core set of commands (`magic.specification`, `magic.plan`, `magic.task`, `magic.rule`) to maximize process automation and minimize cognitive overhead. Do not introduce new workflow commands unless strictly necessary.

### C3 — Parallel Task Execution Mode

**Declared by:** User (2026-02-23)

Task execution defaults to **Parallel mode**. A Manager Agent coordinates execution, reads status, unblocks tracks, and escalates conflicts, while tasks with no shared constraints are implemented in parallel tracks.

### C4 — Automate User Story Priorities

**Declared by:** User (2026-02-23)

Skip user story priority prompt: true. The agent must automatically assign default priorities (e.g., P2) to User Stories during task generation to maximize automation and avoid interrupting the user.

### C5 — Standardized Onboarding Tutorial

**Declared by:** User (2026-02-23)

The `magic.onboard` workflow is explicitly authorized as a standardized, interactive entry point for new developers. This is a one-time, intentional exception to the **Workflow Minimalism (C2)** rule to facilitate rapid team scaling and engine adoption.

### C6 — Selective Planning & Backlog

**Declared by:** Agent (Fix Engine Friction, 2026-02-25)

To prevent "Waterfall traps", only `Stable` specifications prioritized by the user are included in the active `PLAN.md`. All other specifications in `INDEX.md` reside in a virtual **Backlog** until explicitly pulled into a phase.

### C7 — Universal Script Execution

**Declared by:** Agent (Fix Engine Friction, 2026-02-25)

To ensure cross-platform reliability, all internal engine scripts must be invoked via `node .magic/scripts/executor.js <script_name>`. This wrapper handles the `bash` vs `powershell` detection automatically.

### C8 — Phase Archival

**Declared by:** Agent (Fix Engine Friction, 2026-02-25)

To maintain a clean workspace, completed phase task files (e.g., `phase-1.md`) must be moved to `.design/archives/tasks/` immediately after a successful Level 1 retrospective.

### C9 — Simulation Mandatory (Zero-Prompt Fix)

**Declared by:** Agent (Simulator Workflow, 2026-02-25)

After any modification to `.magic/` engine files or `.agent/workflows/` wrappers, the `magic.simulate` workflow must be executed to verify logical integrity. Identified "rough edges" (шероховатости) must be fixed autonomously by the agent without further confirmation (Zero-Prompt).

### C10 — Nested Phase Architecture

**Declared by:** Agent (Nested Phase Architecture, 2026-02-25)

To improve implementation clarity and reduce cognitive overhead, all implementation plans (`PLAN.md`) must follow a nested hierarchy: **Phase -> Specification -> Atomic Tasks/Sub-points**. Each phase must decompose its constituent specifications into 2-3 atomic actionable items that can be tracked independently.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-20 | Agent | Initial constitution |
| 1.1.0 | 2026-02-20 | Agent | Added C1: .magic/ modification safety protocol (T4 trigger) |
| 1.2.0 | 2026-02-23 | Agent | Added C2: Workflow Minimalism |
| 1.3.0 | 2026-02-23 | Agent | Added C3: Parallel Task Execution Mode |
| 1.4.0 | 2026-02-23 | Agent | Added C4: Automate User Story Priorities |
| 1.5.0 | 2026-02-23 | Agent | Added C5: Standardized Onboarding Tutorial (C2 Exception) |
| 1.6.0 | 2026-02-25 | Agent | Added C6-C8: Selective Planning, Universal Executor, and Phase Archival |
| 1.7.0 | 2026-02-25 | Agent | Added C9: Simulation Mandatory; added `magic.simulate` workflow |
| 1.8.0 | 2026-02-25 | Agent | Hardened C1-C9; added Section 5.1 (Layer/Implements metadata) |
| 1.9.0 | 2026-02-25 | Agent | Added C10: Nested Phase Architecture |
| 1.10.0 | 2026-02-25 | Agent | Aligned Section 5.1 with .magic/spec.md (concept/implementation layers) |
| 1.11.0 | 2026-02-25 | Agent | Hardened C9 with Zero-Prompt Fix rule |
