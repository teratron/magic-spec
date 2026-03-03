# Conception of Magic Spec

## 🧠 The SDD Philosophy

> *"No code without a spec. No spec without a plan."*

Magic Spec is built around a single conviction: **AI agents write better code when they are forced to think before they act.** Left unconstrained, they jump straight to implementation — producing code that is fragile, misaligned, and expensive to refactor. Magic Spec installs a structured pipeline that makes this impossible.

### Human-Minimal Engineering

The core design goal is to **keep humans out of the loop as much as possible** — without sacrificing control over what actually matters.

Once you describe what you want, the engine takes over:

- Specifications are drafted, reviewed, and promoted through their lifecycle automatically.
- Tasks are decomposed, prioritized, and assigned default values without prompting (C4).
- Phases execute end-to-end: retrospective snapshots fire, changelogs are compiled, and context files are regenerated — all silently (C9).
- The only moments requiring human input are deliberate gates: approving a spec before implementation begins, and signing off on an external release changelog.

Everything else is automated. The agent does the engineering. You approve the direction.

### Two-Layer Specification Model

Every specification in Magic Spec belongs to one of two layers, and this separation is strictly enforced:

**Layer 1 — Concept** (`layer: concept`)
Technology-agnostic. Describes *what* the system must do: business rules, domain invariants, data contracts, and behavioral requirements. It is the permanent source of truth.

*Example: If you migrate from Node.js/PostgreSQL to Go/MongoDB, your Layer 1 specifications remain untouched. You only author new Layer 2 specs to map the same business logic to the new technology stack.*

**Layer 2 — Implementation** (`layer: implementation`)
Stack-specific. Describes *how* a Layer 1 concept is realized in a concrete technology (e.g., a Node.js REST API, a PostgreSQL schema, a React component). Every Layer 2 spec must declare its parent via `Implements: {l1-file.md}` and cannot reach `RFC` or `Stable` status until its parent is `Stable`.

This separation prevents a common failure mode in AI-assisted development: mixing "what we want" with "how we build it" in a single document, which leads to specs that are impossible to reuse, validate, or evolve independently.

**Adaptive Weight (C16)**
Magic Spec scales with the task. While complex features require the full Standard template, minor bugfixes and tactical changes (< 50 lines) can use the **Micro-spec** track — a lightweight documentation format that maintains the "No code without spec" rule without unnecessary overhead. If a micro-spec grows in complexity, the engine enforces its promotion to the Standard template.

### Integrity by Design

The engine actively protects specification integrity throughout the project lifecycle:

- **Quarantine Cascade**: If a Layer 1 spec is destabilized (demoted from `Stable`), all dependent Layer 2 specs are automatically flagged and their tasks are blocked. The plan cannot proceed on a broken foundation.
- **Registry Parity**: Every spec that exists on disk must be registered in `INDEX.md`. Every registered spec must appear in the implementation plan or the backlog. Orphaned specs are treated as critical blockers.
- **Rules Parity**: If project conventions change (`RULES.md`), any existing task plan is flagged as stale. The agent will not execute tasks generated under outdated rules without an explicit sync.
- **Engine Integrity**: Core engine files are checksummed. Any untracked modification halts all workflows until the engine state is reconciled.

### Self-Improving Feedback Loop

Magic Spec includes a built-in retrospective engine that runs automatically at two levels:

- **Level 1** fires after every phase completes: captures a lightweight snapshot of spec health, task metrics, and signal status.
- **Level 2** fires when the full plan is complete: performs a deep audit — identifying spec drift, blocked-task patterns, shadow logic, and workflow friction. It also captures **DORA metrics** (Deployment Frequency and Change Failure Rate) to measure the actual delivery performance of the SDD process.

These retrospectives fire back actionable recommendations into the specification layer, closing the loop between what was planned and what was actually built.
