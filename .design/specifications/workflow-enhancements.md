# Workflow Enhancements

**Version:** 1.2.0
**Status:** Stable
**Layer:** implementation
**Implements:** N/A (Core enhancements)

## Overview

Eight targeted improvements to the Magic SDD engine that increase automation and reduce
friction without adding new commands (with one strict exception for onboarding). All changes are
additive — they extend existing workflows rather than replace them.

## Related Specifications

- [specification.md](specification.md) — Spec authoring workflow (prerequisite check integration)
- [plan.md](plan.md) — Plan workflow (handoffs consumer)
- [task.md](task.md) — Task workflow (user story structure, handoffs consumer)
- [init.md](init.md) — Init pre-flight (prerequisite validation target)

---

## 1. Motivation

The current engine executes each workflow in isolation. The agent has no built-in signal
for what comes next, tasks lack explicit priority and parallelism markers, prerequisite
validation is done via prose instructions rather than machine-readable checks, and there
is no single aggregated context file for the agent to read current state without burning tokens on old specs.
Furthermore, users lack native support for safe architectural brainstorming without mutating live specs,
there is no soft-landing interactive tutorial for new users, CLI health checks lack human-readable output,
and AI agents risk file corruption when rewriting large specs from scratch.

These eight improvements address each gap independently. They share no dependencies on
each other and can be implemented in any order.

---

## 2. Constraints & Assumptions

- No new user-facing commands. Every enhancement is embedded inside an existing workflow.
- Handoffs are hints, not hard routing — the agent may deviate based on context.
- The prerequisite script must run on macOS, Linux, and Windows (bash + PowerShell parity).
- User story structure is optional per phase — phases with a single track may omit it.
- JSON output from the prerequisite script is the canonical format; human-readable output
  is a secondary convenience layer.

---

## 3. Detailed Design

### 3.1 Handoffs in Workflow Frontmatter

Each `.agent/workflows/magic.*.md` file gains a `handoffs` block in its YAML frontmatter.
A handoff is a suggested next action the agent surfaces to the user at the end of a
successful workflow run.

**Frontmatter schema:**

```yaml
---
description: Workflow for creating and managing project specifications.
handoffs:
  - label: "Create plan"
    workflow: magic.plan
    prompt: "Create a plan based on the finalized specifications."
    condition: "specs_stable"        # optional — only show if condition is met
  - label: "Add a rule"
    workflow: magic.rule
    prompt: "Add a project-wide convention discovered during spec work."
    condition: null                  # always show
---
```

**Field definitions:**

| Field | Required | Description |
| :--- | :--- | :--- |
| `label` | yes | Short action label shown to the user (imperative phrase, ≤5 words) |
| `workflow` | yes | Target workflow file name without extension |
| `prompt` | yes | Pre-filled message the agent sends when the user picks this handoff |
| `condition` | no | Named condition that must be true for the handoff to appear |

**Defined conditions:**

| Condition key | Meaning |
| :--- | :--- |
| `specs_stable` | At least one spec in INDEX.md has status `Stable` |
| `plan_exists` | `.design/PLAN.md` exists |
| `tasks_exist` | `.design/tasks/TASKS.md` exists |
| `phase_complete` | Current phase has all tasks in `Done` status |

**Agent rendering rule:**

At the end of every successful workflow operation, the agent reads the current workflow's
`handoffs` block, evaluates conditions, and presents only qualifying handoffs:

```
What's next?
  → Create plan   (magic.plan)
  → Add a rule    (magic.rule)
```

If a condition cannot be evaluated (e.g., `.design/` does not exist), the handoff is
silently skipped — never shown as an error.

**Proposed handoffs per workflow:**

| Workflow | Handoffs |
| :--- | :--- |
| `magic.specification` | Create plan (`specs_stable`), Add a rule (always) |
| `magic.plan` | Generate tasks (`plan_exists`) |
| `magic.task` | Update plan (always) |
| `magic.rule` | Create spec (always), Update plan (always) |

> **Note:** Retrospective is not a user-facing handoff — it runs automatically inside
> `magic.task` at phase completion (Level 1) and plan completion (Level 2).

---

### 3.2 User Story Structure in Tasks

Task files (`.design/tasks/phase-{n}.md`) gain an optional **User Stories** section
above the track breakdown. Each user story groups related tasks, declares a priority
tier, and marks parallel-safe tasks explicitly.

**Priority tiers:**

| Tier | Label | Meaning |
| :--- | :--- | :--- |
| P1 | Critical path | Blocks all other stories in the phase |
| P2 | High value | Should ship in this phase; no hard blockers |
| P3 | Nice to have | Can defer to next phase without breaking P1/P2 |

**Parallel marker:**

Tasks safe to run simultaneously within the same story carry a `[P]` tag in their title.
The tag signals that the task has no data dependency on other `[P]`-tagged siblings in
the same story.

**Phase file structure with user stories:**

```markdown
# Phase {N} — {Phase Name}

**Status:** Active
**Execution Mode:** Sequential | Parallel
**Tracks:** A, B, C

## User Stories

### [P1] US-01 — As a user, I can launch the app without manual path configuration

Tasks: T-{N}A01, T-{N}A02, T-{N}B01
Parallel-safe: T-{N}A01 [P], T-{N}B01 [P]

### [P2] US-02 — As a developer, I can override settings via environment variables

Tasks: T-{N}C01, T-{N}C02
Parallel-safe: none (sequential dependency)

### [P3] US-03 — As a user, I see a progress indicator during initialization

Tasks: T-{N}D01
Parallel-safe: T-{N}D01 [P]

---

## Track A — {Track Name}

### [T-{N}A01] {Title} [P]

- **Story:** US-01
- **Spec:** ...
```

**Task anatomy additions:**

Two new optional fields are appended to every task block:

```
[T-{phase}{track}{seq}] {Title} [P]?
  Spec:     ...
  Story:    US-{NN}          ← new: parent user story
  Priority: P1 | P2 | P3    ← new: inherited from story tier
  Depends:  ...
  Status:   ...
```

**Agent rules for user story generation:**

1. Extract user stories from `Implementation Notes` in spec files if present; otherwise
   derive them from section groupings in `Detailed Design`.
2. Assign priority by asking the user once per phase before writing:

   ```
   Phase 2 user stories detected:
     US-01 — Launch without path config
     US-02 — Environment variable overrides
     US-03 — Progress indicator

   Assign priorities (P1/P2/P3) or accept defaults? (yes / adjust)
   ```

3. Mark `[P]` automatically for tasks in different tracks with no shared state.
   Surface the full list for user confirmation before writing.
4. If a phase has only one track, omit the User Stories section entirely — it adds
   no value when there is nothing to parallelize or prioritize relative to each other.

---

### 3.3 Prerequisite Validation Script (JSON Output)

A new script pair validates that all required `.design/` artifacts exist before a
workflow begins execution. It is called automatically at the start of `plan.md` and
`task.md` as part of their existing Step 0 (Auto-Init).

**Script locations:**

```plaintext
.magic/scripts/check-prerequisites.sh   # macOS / Linux
.magic/scripts/check-prerequisites.ps1  # Windows
```

**CLI interface:**

```bash
# Basic check — exits 0 if all required files present, 1 if not
bash .magic/scripts/check-prerequisites.sh

# JSON output — always exits 0; result encoded in JSON
bash .magic/scripts/check-prerequisites.sh --json

# Require specific artifacts
bash .magic/scripts/check-prerequisites.sh --json --require-plan
bash .magic/scripts/check-prerequisites.sh --json --require-tasks
bash .magic/scripts/check-prerequisites.sh --json --require-specs
```

**JSON output schema:**

```json
{
  "ok": true,
  "checked_at": "2026-02-23",
  "design_dir": ".design",
  "artifacts": {
    "INDEX.md":  { "exists": true,  "path": ".design/INDEX.md" },
    "RULES.md":  { "exists": true,  "path": ".design/RULES.md" },
    "PLAN.md":   { "exists": false, "path": ".design/PLAN.md"  },
    "TASKS.md":  { "exists": false, "path": ".design/tasks/TASKS.md" },
    "specs":     { "count": 4, "stable": 2, "draft": 2 }
  },
  "missing_required": ["PLAN.md"],
  "warnings": []
}
```

`ok` is `true` only when all artifacts declared via `--require-*` flags are present.

**Failure response format (for agent consumption):**

```json
{
  "ok": false,
  "missing_required": ["PLAN.md"],
  "warnings": ["2 of 4 specs are still in Draft status"]
}
```

**Agent integration in plan.md and task.md:**

Replace the current prose prerequisite description in Step 0 with:

```
0. Pre-flight check:
   Run: bash .magic/scripts/check-prerequisites.sh --json --require-specs
   (Windows: pwsh .magic/scripts/check-prerequisites.ps1 --json --require-specs)

   Parse JSON result:
   - If ok: false → surface missing_required list to user, halt, do not proceed.
   - If warnings non-empty → surface warnings, continue.
   - If ok: true → proceed silently.
```

**Script behavior rules:**

- Never modifies any file. Read-only.
- Always returns valid JSON when `--json` is passed, even on unexpected errors
  (wraps the error in `{ "ok": false, "error": "..." }`).
- Counts spec files by reading INDEX.md status column — does not scan the filesystem.
- PowerShell version is functionally identical to the bash version; output format is
  the same JSON.

---

### 3.4 Auto-Generated Context File (CONTEXT.md)

To optimize token usage and prevent agents from digesting stale requirements, a new `CONTEXT.md` file is generated and maintained in the `.design/` directory.

**Purpose:** Provide the AI with a single, highly condensed snapshot of the project's current active state. Instead of reading all specification files and history, the agent uses `CONTEXT.md` alongside `INDEX.md` and `RULES.md` to establish its baseline context.

**Content Structure:**

- **Active Technologies**: Extracted from recent `PLAN.md` logic (e.g., framework, DB, language).
- **Core Project Structure**: The current high-level repository structure diagram.
- **Recent Changes**: The last 3 implemented features/phases (extracted from `CHANGELOG.md` or closed phase files).

**Generation Trigger:**
The file is compiled and overwritten automatically at key milestones without user-facing commands:

1. End of `magic.plan` execution (when technical stack is solidified or modified).
2. End of a Phase in `magic.task` (when a feature is shipped and changelog is accumulated).

**Agent Consumption:**
All workflows instruct the agent to read `.design/CONTEXT.md` if it exists to gain immediate project awareness without re-reading the entire `.design/specifications/` folder.

---

### 3.5 Explore Mode Integration (`magic.specification`)

To support safe brainstorming without violating the "Workflow Minimalism" rule (Rule C2), the existing `magic.specification` workflow is expanded to include an **Explore Mode**.

**Concept**: Instead of a dedicated `/magic.explore` command, the agent recognizes triggers like *"Explore"*, *"Brainstorm"*, or *"Analyze"*.

**Agent Rules**:

- The agent acts as a thinking partner.
- It may use codebase reasoning tools (e.g., `Sequential Thinking`, `grep_search`).
- It may output thoughts directly to the chat or create a temporary `proposal.md` file.
- **Strict Prohibition**: The agent MUST NOT modify `INDEX.md`, `PLAN.md`, `TASKS.md`, or any live `.design/specifications/` documents until the user explicitly approves transitioning the brainstorm into a formal spec update.

---

### 3.6 Interactive Onboarding Workflow (`magic.onboard`)

A new, targeted workflow command to dramatically lower the entry barrier for new developers. This is an explicit, one-time exception to the Workflow Minimalism rule.

**Trigger**: *"Onboard"*, *"Tutorial"*, *"Start learning"*

**Execution Strategy**:

1. The AI introduces itself and the magic-spec methodology.
2. The AI creates a "toy" specification (e.g., a simple logging module) step by step.
3. The AI guides the user through registering it in `INDEX.md`.
4. The AI generates a mini `PLAN.md`.
5. The AI generates a single atomic task in `TASKS.md` and simulates its execution.
6. The onboarding concludes, leaving the user with hands-on experience of the SDD lifecycle.

---

### 3.7 CLI Doctor Command (`--doctor` / `--check`)

Building on the JSON Prerequisite Script (Enhancement 3.3), the CLI exposes a human-readable variant to help developers diagnose environment issues instantly without AI assistance.

**Execution**: `npx magic-spec@latest --doctor` (or `--check`)

**Output**:
Instead of raw JSON, the CLI prints a colored health log:

```text
🔍 Magic-spec Doctor:
✅ .design/INDEX.md is present
✅ .design/RULES.md is present
❌ .design/PLAN.md is missing (Hint: Run /magic.plan)
⚠️ 2 specifications are in Draft status
```

---

### 3.8 Semantic Spec Updates (Delta Hints)

To prevent LLM file corruption when rewriting massive specification documents, the engine introduces a delta-editing constraint.

**Agent Rules**:

- When updating an existing large spec (e.g., >200 lines), the agent MUST utilize surgical search-and-replace tools (`replace_file_content`, `multi_replace_file_content`) instead of regenerating and overwriting the entire file.
- The agent marks the specific blocks semantically in the `CHANGELOG.md` or task result using tags like `[ADDED]`, `[MODIFIED]`, or `[REMOVED]` (e.g., `[MODIFIED] Settings Domain: Added dark mode toggle`).

---

## 4. Implementation Notes

1. **Handoffs first** — purely additive to existing frontmatter, zero risk of breakage.
   Add to all four `.agent/workflows/magic.*.md` files in one pass.
2. **Prerequisite script second** — self-contained, testable independently. Write bash
   version first, then port to PowerShell.
3. **User story structure third** — requires changes to task.md workflow logic and
   phase file templates. Depends on understanding of how tasks are actually generated
   in practice.
4. **Context File Generation** — create a new script `generate-context.sh`/`.ps1` that parses `PLAN.md` and `CHANGELOG.md` to rewrite `CONTEXT.md`. Hook it into `plan.md` and `task.md`.
5. **Explore & Delta Hints** — Update the `magic.specification` engine logic (`.magic/specification.md`) and the triggers in `.agent/workflows/magic.specification.md`.
6. **CLI Doctor** — Update the CLI entry point to parse the JSON script output and print terminal UI elements.
7. **Onboarding Workflow** — Create `.magic/onboard.md` and its corresponding wrapper.

---

## 5. Drawbacks & Alternatives

**Handoffs:** Conditions require the agent to read filesystem state at render time.
On large projects this is a negligible cost. Alternative: always show all handoffs
unconditionally — simpler but noisier.

**User stories:** Adds a lightweight ceremony (priority confirmation dialog) per phase.
If users find it disruptive, the dialog can be made opt-in via a RULES.md §7 convention:
`"Skip user story priority prompt: true"`.

**Prerequisite script:** JSON parsing adds a thin dependency on the agent's ability to
read structured output. If the agent cannot parse JSON reliably, fall back to exit codes
only — `0` = ok, `1` = missing required, `2` = warnings.

---

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 0.1.0 | 2026-02-23 | Agent | Initial Draft — three workflow enhancements |
| 0.2.0 | 2026-02-23 | Agent | Added 4th enhancement: Auto-Generated Context File (CONTEXT.md) |
| 0.3.0 | 2026-02-23 | Agent | Added enhancements 3.5-3.8 |
| 0.4.0 | 2026-02-23 | Agent | Removed magic.retrospective from handoffs (retrospective is automatic in task.md); updated handoffs table to 4 workflows |
| 0.5.0 | 2026-02-23 | Agent | Status changed to Stable for planning |
| 1.2.0 | 2026-02-25 | Agent | Added SDD standard metadata (Layer, RFC status update) |
