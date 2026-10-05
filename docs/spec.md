# Specification Workflow

This document explains the lifecycle, structure, and management of project specifications within the Magic SDD engine.

## 1. Overview

The Specification Workflow is the entry point of the Magic SDD process. It converts raw ideas, requirements, and feedback into structured, versioned documents located in `.design/specifications/`.

**Triggers:** *"Create spec"*, *"Update spec"*, *"Explore"*, *"Brainstorm"*, *"Review registry"*, *"Check specs"*, *"Verify specs"*.

**Slash command:** `/magic.spec`

> **Full implementation:** `.magic/spec.md` — the engine reads this file before executing any steps.

Key Goals:

- **No Code in Specs**: Technical requirements are defined before implementation begins. Technical contracts (interfaces, types, API schemas) marked as `[REFERENCE]` are permitted.
- **Traceability**: Every requirement links to its implementation layer.
- **Agreement**: A formal "contract" for AI agents and developers to follow.

## 2. Core Invariants

The engine enforces 12 mandatory invariants during every spec operation:

| # | Invariant | Summary |
| ---: | --- | --- |
| 1 | **Context (Zero-Prompt)** | Automatic workspace resolution chain (no user prompting needed) |
| 2 | **Prohibitions** | No implementation code in specs; technical contracts are permitted |
| 3 | **Auto-Init** | Silently creates `.design/` structure if missing |
| 4 | **Engine Integrity (C14)** | Checksums validated and updated after any `.magic/` modification |
| 5 | **Linking** | Every spec must be registered in `INDEX.md` |
| 6 | **Status** | Enforce Draft → RFC → Stable → Deprecated lifecycle |
| 7 | **Dispatch** | Use "Raw Input" flow for unstructured ideas |
| 8 | **Ventilation** | Delegate deep analysis to `.magic/analyze.md` |
| 9 | **Delta-Editing** | Files >200 lines use search-replace, not full rewrites |
| 10 | **Closure** | Every session ends with a mandatory Task Completion Checklist |
| 11 | **Rules** | `RULES.md` is the project constitution; check before every operation |
| 12 | **Anti-Stall** | If intent captured and >=1 question asked without writing a file, the agent must write a Draft spec on the next turn — suspended only while an Idea Intake Gate dialogue is still making progress (§5.0) |

## 3. Specification Layers

Magic uses a two-level layering system:

- **Layer 1 (Concept)**: Abstract, technology-agnostic requirements and business logic.
- **Layer 2 (Implementation)**: Concrete realization of a Layer 1 concept in a specific technology stack (e.g., Node.js, Python). Must reference its parent via the `Implements:` field.

> **Layer Respect**: A Layer 2 spec cannot transition to **Stable** unless its Layer 1 parent is also **Stable**.

## 4. Status Lifecycle (Encapsulated)

Specifications move through a lifecycle. In **Trust Mode (C9)**, transitions are hidden from the user:

1. **Draft**: Initial exploration and mapping.
2. **RFC (Request for Comments)**: Completed design, open for feedback. Transient in Trust Mode.
3. **Stable**: Approved/finalized design. **Auto-Stabilization** occurs if no conflicts detected.
4. **Deprecated**: Superseded or removed functionality.

> **Autonomous Mode**: The engine may auto-promote statuses (`Draft -> Stable`) silently if no architectural risks or `RULES.md` contradictions exist.
>
> **Minimum Viable Completeness (MVC)**: For auto-promotion, a spec needs `Overview` + at least one substantive design section. Missing optional sections do not block promotion.
>
> **Amendment Rule**: When a Stable spec receives substantive new requirements (minor or major version bump), its status reverts to `RFC`. Typo-only patches (0.0.X) do not require a status change.

## 5. Key Workflow Modes

### 5.0 Idea Intake Gate

Before writing anything, `/magic.spec {your idea}` checks whether it understood you and whether it has enough to go on. Most of the time this is invisible — the idea is clear enough and specifications appear straight away.

Occasionally the agent will ask you something first. It runs two checks, in this order, and asks only when one of them fails:

- **Did it understand you?** Your idea contradicts itself ("Save everything instantly, and always ask before saving" cannot both be true), or it has two honest readings that lead to different products ("Notify users about important changes" could mean a badge inside the app, or an email that reaches them when the app is closed).
- **Is there enough to go on?** The idea is clear, but it would have to invent *who it is for*, *what it must do* or *where it stops* — "Make a CRM" does not say whether it serves a sales team or a support desk, or whether invoices are part of it.

**How the questions look.** In plain language, describing outcomes rather than mechanisms ("saved even if you close the browser", not "persisted server-side"). Before asking, the agent plays each possible answer forward — what you most likely meant, what happens if it guessed wrong, edge cases, misuse, your plans changing later — and offers those answers as options, with the safest one marked as recommended and the consequence of each spelled out. Every question ends with **Other**, where you can write your own answer; the agent reads it as carefully as your original idea. At most three questions at a time, at most three options each.

**What you will never be asked.** Anything technical is the agent's job, not yours — which database, which library, what to name the files, which algorithm. If you are ever asked a question that needs engineering knowledge to answer, that is a defect in the question.

**How it ends.** The conversation continues only while it is making progress — each round has to settle more than it opens. Answer **"you decide"** at any point and the agent takes its recommended answer for whatever is still open, writes the specification, and notes each such choice under *Constraints & Assumptions* as *Assumption (forecast)*, with the single command that switches to the other answer. When the questions are done, it says in one paragraph what it understood and writes the specification in the same step — if that paragraph is off, correct it before planning starts.

Your answers are not stored separately. They go straight into the specification's own wording, so the finished document reads as a set of decisions rather than a transcript.

### 5.1 Explore Mode (Brainstorming)

A safe exploration phase. The agent scans `INDEX.md` and project structure, then proposes "Creative Sparks" (topics for new specs or refinement).

**Transition to Dispatch** happens automatically when:

- User provides specific logic or architectural constraints.
- User uses confirmation words ("go ahead", "do it", "looks good").
- **Auto-Transfer (C9)**: as soon as an exchange stops making progress — a reply that restates intent, adds nothing new, or hands the decision back ("you decide"). The bound is progress, not a fixed number of rounds (see §5.0).

### 5.2 Dispatching from Raw Input

The engine parses unstructured user chat and maps it to specification domains.

- **Multi-topic Dispatch**: A single user prompt can trigger multiple spec operations simultaneously.
- **Conflict Guard**: Contradictory requirements in one request are settled at intake (§5.0) — asked, with a middle path offered where one exists, or decided and recorded if you leave it to the agent. A conflict with `RULES.md` or an existing Stable spec is flagged.
- **Auto-Stabilization**: Specs that pass all checks (no RULES.md conflicts, no circular dependencies, MVC satisfied) are auto-promoted to Stable.

### 5.3 Post-Update Review (C24 — Critic Persona)

After every spec update, the engine switches to a **Critic Persona** and re-reads the spec for:

- Internal contradictions and logical gaps.
- Compliance with `RULES.md` conventions.
- Missing or broken cross-references.

### 5.4 Batch Stabilization

Multiple specs can be promoted to Stable in a single pass (L1 specs first, then their L2 dependents), preserving layer dependency order.

## 6. Safety & Integrity

### 6.1 Consistency Check (Pre-flight)

Before any plan is generated, the workflow verifies:

- **Path Validity**: Target spec file exists on disk.
- **Layer Integrity**: L2 spec's L1 parent is Stable.
- **Registry Sync**: Spec is registered in `INDEX.md`.
- **Version Drift (RE-1)**: Spec `Version:` header matches `INDEX.md` record.
- **Engine Integrity**: `.magic/` checksums are valid (C15 Filter).
- **Cross-Workspace Parity**: Detects spec name collisions across workspaces. At creation a colliding name is renamed with the workspace after the layer prefix (`l1-auth.md` → `l1-{workspace}-auth.md`).
- **File-Header Parity**: Status and version in file header match `INDEX.md`.
- **Stale References**: A `Related Specifications` or `Implements` link to a `Deprecated` spec is reported as `STALE_REFERENCE` — an advisory, never a HALT.

### 6.2 Version Drift Guard (RE-3)

If `VERSION_DRIFT` is detected on the target spec, the engine **HALTs** before writing changes, preventing corruption of the audit trail from untracked external edits.

### 6.3 Quarantine Cascade (C12)

If a Layer 1 spec drops status (e.g., Stable → RFC), all dependent Layer 2 specs are automatically quarantined and their tasks blocked.

### 6.4 Session Isolation (Phase Gates — C17)

The transition from Specification to Task Planning is protected by a **Hard Stop**. You must physically open a **New Chat** before running `/magic.task` to prevent context bleed-over.

### 6.5 T4 Rule Capture with Tier Routing

When user input contains a standing-rule signal ("remember that...", "project rule:"), the Spec workflow captures it as a T4 trigger and hands it to the Rule workflow's pipeline (see [rule.md](rule.md)) instead of guarding it itself:

1. **Tier Routing**: Global vs. workspace-scoped target file selection.
2. **Admission**: a rule the user wrote is recorded at the strength stated; a rule the agent composed is admitted only on evidence.
3. **Guards and reviews**: duplication, the §1–6 Constitutional Guard (contradiction → **HALT**), then the constitutional and wording reviews — all before anything is written.

If the update halts first (version drift, cross-workspace parity, or a missing file), the T4 rule is queued behind that HALT by a single rule and handed to the Rule workflow once the HALT is resolved — never written early, never dropped.

## 7. Maintenance

- **Version Bumping**: Semantic Versioning (Major.Minor.Patch). Minor for additions; Major for breaking changes; Patch for typos.
- **Document History**: Every change recorded in the file's internal history table.
- **Delta Edits**: Large specs updated surgically to minimize context overhead.
- **Structural Refactor**: When merging or splitting specs, the agent performs a Refactoring Sweep updating all T-IDs in `TASKS.md`.

## Sync Note

Synchronized with engine workflows on 2026-10-05 (v2.1.134).
