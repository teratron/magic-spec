# Project Specification Rules

**Version:** 1.12.0
**Status:** Stable
**Based on:** `.magic/spec.md`

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
9. **Changelog Level 2 / Release Artifacts** — public release entries; user reviews independently afterward, not inline.
10. **Constitutional Guard** — proposed §7 rule contradicts §1–6 → HALT.
11. **Hard-Dependency Cycle** — circular `Implements:` chain (soft `Related Specifications` cycles do NOT block).

For all other operations: act, narrate the action declaratively, log to `STATE.md` / `CONTEXT.md` / `CHANGELOG.md`, append a one-liner revert hint where the action is non-trivial.

### C10 — Task Architecture & Status Truth

Logic and progress tracking are distributed between two primary files to ensure clarity and automation:

1. **`PLAN.md` (Strategic)**: High-level overview of **Phase → Specification**. Each specification has a single checkbox representing its aggregate implementation status.
2. **`TASKS.md` (Tactical)**: The master execution ledger. Contains a concise **Phase Checklist** (items prefixed with unique `[T-XXXX]` IDs) followed by detailed task blocks.

All execution progress (`[x]`, `[/]`, etc.) must be recorded in the `TASKS.md` checklist first. `PLAN.md` is updated only when a specification or phase is fully completed.

### C11 — Simulation Workflow (C2 Exception)

`magic.dev.simulate` is explicitly authorized as a developer-facing tool for engine validation and regression testing. It is a one-time exception to C2. Not intended for use in regular project workflows.

### C12 — Quarantine Cascade

If a Layer 1 (Concept) specification loses its `Stable` status or is removed, all dependent Layer 2/3 (Implementation) specifications must automatically and transparently be treated as demoted to `RFC` or moved to the Backlog by the Task workflow. The system must quarantine dependent specifications to prevent "orphaned" task scheduling without requiring manual status edits for every child in `INDEX.md`.

**C12.1 — Stabilization Exception**: Tasks explicitly intended to stabilize or fix mismatches to regain `Stable` status for the parent may bypass this quarantine.

### C13 — Agent Cognitive Discipline

All AI agents operating within the Magic SDD framework must adhere to strict cognitive discipline to prevent hallucinations and silent failures:

1. **Primary Source Principle**: Always read original `.magic/` and `.design/` files. Never rely on cached memory or interpretive assumptions.
2. **Anti-Truncation**: Execute checklists and multi-step processes literally. Do not skip, merge, or summarize steps.
3. **Bounded Ambiguity Resolution**: If an instruction is absent or ambiguous, do not invent missing steps or scripts. Resolve via the Autonomous Decision Protocol (C27): adopt the most conservative documented interpretation, record a Decision Record (or `<!-- TBD: ... -->` marker in authored artifacts), and proceed. Halt-and-ask is permitted only when the ambiguity matches the C27 Escalation Whitelist.
4. **Mandatory Self-Verification**: Cross-reference actions against original instructions before finalizing any task or presenting a completion checklist.
5. **Anti-Hallucination Audit**: All architectural conclusions, problem reports, and proposed changes must be directly traceable to specific statements within project specifications or engine rules.

### C14 — Engine Versioning Protocol

To ensure accurate engine state tracking and reliable updates, any modification to the core engine/kernel files (anything inside the `.magic/` directory, including workflows and templates) MUST be accompanied by an automated engine metadata update: `node .magic/scripts/executor.js update-engine-meta --workflow {workflow}`.

1. **Scope**: Applies to all `.md` workflows, `scripts/`, and `templates/` inside the engine directory.
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

The engine must proactively identify and repair its own metadata. If `executor.js` detects missing or corrupted metadata (`.version`, `.checksums`) during non-critical operations, it should attempt to "Auto-Heal" (restore defaults or regenerate) before Proceeding or Halting.

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
2. **External Drift Guard**: If >5 minutes have passed since the last check, the context window has been compacted, or the user has performed manual file operations (e.g. `git pull`, manual edits in terminal), the agent MUST perform a fresh `check-prerequisites` call.
3. **Halt Persistence**: If the previous check returned an error or warning (e.g. `checksums_mismatch`), the agent MUST re-run the check after any attempt to fix it. Never assume a "heal" without verification.
4. **Audit/Simulate Exemption**: In `/magic.analyze` (Ventilation) or `/magic.dev.simulate` (Validation), caching is NOT permitted. These workflows must perform fresh, physical scans by definition to fulfill their audit purpose.

### C24 — Role-Switching Gates

At critical decision points, the agent MUST activate the designated role card from `.magic/roles/` before finalizing output. This prevents confirmation bias and "glazed eye" failures where the agent that produced work also approves it.

| Workflow | Gate | Role | Card |
| --- | --- | --- | --- |
| `spec.md` | Before `Post-Update Review` | `@role:spec-critic` | `.magic/roles/spec-critic.md` |
| `task.md` | Before `Plan Write-back` | `@role:planner` | `.magic/roles/planner.md` |
| `run.md` | Before marking task `Done` | `@role:test-engineer` | `.magic/roles/test-engineer.md` |
| `retrospective.md` | Before Signal calculation | `@role:retrospective-analyst` | `.magic/roles/retrospective-analyst.md` |
| `analyze.md` | Before Advisory Report | `@role:project-auditor` | `.magic/roles/project-auditor.md` |
| `rule.md` | Before Impact Analysis | `@role:constitutional-reviewer` | `.magic/roles/constitutional-reviewer.md` |
| `spec.md` | Instruction Quality Pass (after spec-critic PASS) | `@role:prompt-engineer` | `.magic/roles/prompt-engineer.md` |
| `task.md` | Task Instruction Review (before Plan Write-back) | `@role:prompt-engineer` | `.magic/roles/prompt-engineer.md` |
| `rule.md` | Rule Wording Review (after APPROVE verdict) | `@role:prompt-engineer` | `.magic/roles/prompt-engineer.md` |
| `analyze.md` | Prompt Quality Audit (Mode C) | `@role:prompt-engineer` | `.magic/roles/prompt-engineer.md` |
| `simulate.md` | During Logic Audit | Skeptic persona (dev-only; no role card) | — |

**Opt-in conditional gate:** `prompt-engineer` also fires in `run.md` Step 3.4b when the diff touches AI-facing instruction artifacts (specifications, rules, plan/task units, role cards, workflow bodies, templates, adapter instructions); diffs touching only non-instruction code or data skip it silently.

Role activation is mandatory — it is not skipped under C9. Each role card defines its own gate conditions and interrogative hooks. The role switch takes one internal reasoning pass; it does not require user interaction.

Full registry: `.magic/roles/` — 14 registered role cards; each card is self-contained and defines its own gates and invariants.

### C25 — Engineer Posture (Narrate-and-Act)

The agent operates as a senior engineer, not as an assistant awaiting permission. User-facing chat output MUST adhere to:

1. **Forbidden phrasing** outside C9 objective gates: `"Should I…"`, `"Do you want me to…"`, `"Would you like…"`, `"How should we proceed?"`, `"Let me know if…"`, choice menus of the form `(a)…/(b)…/(c)…`.
2. **Mandatory phrasing**: declarative narration of completed or in-progress action — e.g., `"Writing X."`, `"Promoted Y to Stable."`, `"[Auto-SDD] Dispatched N specs."`, `"[Auto-Plan] Phase 2: {short list}."`.
3. **Tentative qualifiers banned** in user-facing summaries: no `"I think…"`, `"This might…"`, `"It seems like…"`. Code-level comments may remain explanatory; this rule governs chat output only.
4. **Revert hint convention** — when an auto-action is non-trivial, append a one-liner showing how to undo: `"(Revert: git restore <file>)"` or `"(Amend: /magic.spec amend X)"`.
5. **Interruption is the user's tool** — Ctrl+C, manual edits, and `git restore` form the user's safety net. The agent's job is to act decisively and let the user intervene when wrong.

C25 scope is chat output. It does NOT alter HALT logic or any objective C9 gate.

### C26 — Workspace Intent Routing

Workspace dispatch is the **single** specification-authoring exception to C25 Engineer Posture: a multiple-choice question is permitted when intent and existing workspace lexicons are demonstrably inconsistent. The cost of silent mis-routing (specs accumulating in the wrong workspace, registry fragmentation) outweighs the cost of one prompt.

Governed in full by `l1-workspace-intent-routing.md`. Operational summary:

1. **Pre-Resolution Detection**: Every workflow that creates or amends specs / tasks / rules MUST run Workspace Intent Detection (per `.magic/context.md` §Step 0) BEFORE the existing Workspace Resolution Chain. Read-only workflows (`magic.analyze`, `magic.graph`) are exempt.
2. **Auto-Create on Clear Signal**: When detection emits `create:{name}` (explicit creation intent, or unambiguous stack/domain delta with no overlap against existing workspaces), the agent invokes `node .magic/scripts/executor.js create-workspace --name={name}` without prompting. The new workspace becomes the dispatch target for the current operation.
3. **Question Only at Ambiguity Gate**: A multiple-choice question is asked only when all three hold: (a) a creation signal is present, (b) ≥1 existing workspace lexicon overlaps the signal token by ≥30%, (c) no explicit creation token was used. The question is a fixed three-option menu — no free-text follow-up.
4. **Second Contour at Dispatch**: After resolution returns `existing:{Y}`, validate fit before writing files. Match score below 0.30 in a multi-workspace project triggers re-entry of the question; in a single-workspace project the warning is informational only.
5. **Atomic Creation**: `create-workspace` mutates `workspace.json` and provisions `.design/{name}/{specifications,tasks,archives/tasks,INDEX.md}` atomically; rollback on any failure. The new workspace does NOT auto-promote to `default` unless `--default` is passed.
6. **Doc/Code Parity**: `.magic/init.md` "Structure Created" diagram MUST match the layout produced by `init.js` and `create-workspace.js`. Divergence is a release blocker.
7. **Executor Auto-mkdir**: When `executor.js` encounters a workspace registered in `workspace.json` whose directory is missing, it provisions the standard subtree before dispatching — replacing the legacy silent fallback to `.design/` root.

### C27 — Autonomous Decision Protocol ("Engineer Decides")

Governed in full by `l1-decision-autonomy.md`. Operational summary:

1. **Decide-by-Default (DA-1)**: every elective fork in the SDD lifecycle is resolved autonomously; asking the user is the exception, never the default.
2. **Escalation Whitelist (DA-2)**: user input is solicited ONLY for — E1 destructive/irreversible actions, E2 external release artifacts, E3 hard-fork architectural ambiguity with no objective tiebreaker, E4 constitutional amendments (T1–T3), E5 workspace-routing ambiguity (C26), E6 intent incoherence or essence ambiguity in freshly supplied idea input (`l1-idea-intake-gate.md`). The list is closed; extending it is itself an E4 event.
3. **Deterministic Selection (DA-3)**: rank candidates by pipeline stage order → dependency topology → status maturity → coverage gap → `INDEX.md` row order. First discriminating criterion wins; the procedure always yields exactly one outcome.
4. **Decision Record (DA-4)**: `[DR] {decision} — {criterion}. (Override: {command})` — a one-line narration replaces the question while preserving the user's control point.
5. **Single-Question Format (DA-5)**: at whitelist gates — exactly one question, at most three fixed options, recommended default marked. Open-ended question batteries are forbidden in every mode, including Explore.
6. **Session Persistence (DA-6)**: the protocol applies between workflow invocations; on completion the next step is computed and narrated, never asked.
7. **Integrity HALTs exempt (DA-8)**: objective guards (checksums, drift, parity) remain hard HALTs; each HALT report states exactly one recommended resolution path — no option menus.

Relationship to neighbors: C9 grants the authorization scope, C25 governs output phrasing, C26 supplies whitelist entry E5, the Idea Intake Gate supplies E6 — C27 adds the decision procedure itself.

> **E6 is narrow by construction.** It fires only on the content of a freshly supplied idea, and only after the agent has exhausted what the repository can answer (IK-2). Technical realization — storage, library, schema, naming, algorithm — is never routed to the user (IK-3); Selection and Sequencing forks stay declarative `[DR]` narrations under DA-9. Questions must be answerable without engineering expertise (IK-5), and the dialogue must shrink its open-question set each round or terminate (IK-6).

### C28 — Self-Hosting Engine Repository

This repository **is** the Magic Spec engine's source, and it builds itself: `.design/` specifies the engine, and the engine's own `/magic.*` workflows plan and execute changes to the engine that runs them. `.magic/`, `workflows/`, `skills/`, and `rules/` are installed, read-only, by *other* projects — it is those projects, never this one, that must not modify the engine.

1. **Ordinary work, not an exception.** Changing `.magic/`, `workflows/`, `skills/`, `rules/`, or `dev/` is this repository's normal activity, authorized by the request itself — no "Engine Improvement" keyword, no confirmation gate beyond C27 E1 (destructive or irreversible actions).
2. **Consumer-facing guards describe someone else.** The `rules/magic.md` CAUTION block, its §9 "do not fix it yourself" bug-reporting protocol, and its §1.1 user contract are written for a project that *installed* the engine. A `MAGIC-SPEC ENGINE BUG REPORT` surfacing here is a work item to reproduce and fix, not a report to forward.
3. **A workflow's write scope is not a repository boundary.** `/magic.spec` writing only to `.design/` and `/magic.rule` writing only to `RULES.md` describe what each workflow itself writes; they do not mean engine-directed work must be routed into `.design/` when it belongs in `.magic/`, `workflows/`, `rules/`, or `dev/` instead. Carry it out directly, in the same turn.
4. **Procedure still applies.** C1 (read first, trace impact, atomic update), C14 (`update-engine-meta` after any `.magic/`/`workflows/` change), and `[C-001]` (hardlink recreation) bind every engine change exactly as elsewhere.
5. **The shipped guard stays intact.** Do not weaken the read-only rules in `rules/magic.md` or `.magic/templates/rules.md` to match this repository's own freedom — a downstream project must keep receiving the stricter contract. A script distinguishing the two checks for `dev/scripts/generate-checksums.js`, the existing dev-repo signal — never an assumption.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.12.0 | 2026-09-30 | Agent | Realigned the live constitution with the shipped template it is documented to mirror (owner-approved E4 amendment after a prompt-surface audit; per-convention blame showed the template copies newer). **C9** now carries the shipped objective-gate form ("Default Autonomous Execution", 11 gates) instead of the 2026-03 "Zero-Prompt Automation" three-exception list — the old text contradicted `run.md` (Changelog L2 needs no inline approval) and left C25's "objective C9 gate" undefined; `l1-decision-autonomy.md` DA-2 was renumbered to match (gates 1/9/3). **C24** now names the role cards under `.magic/roles/` (with the prompt-engineer gates) instead of the retired persona table; the dev-only `simulate.md` Skeptic gate is kept. **C14** no longer names `config.json` or the removed `.magic/history/` mechanism (the shipped template dropped it 2026-05-06); **C20** no longer names history files; **C17** drops the removed-registry archaeology. No change to §1–6, C1–C8, C10–C13, C15, C16, C18, C19, C21–C23 or C25–C28. |
| 1.11.0 | 2026-09-28 | Agent | Added **C28 — Self-Hosting Engine Repository**: this project is the Magic Spec engine's own source and builds itself, so the "Engine Improvement" gate and the consumer-facing "do not fix it yourself" guard in `rules/magic.md` describe a *different* project — one that installed the engine — not this one. Prompted by a live misfire this session: a `/magic.rule` request naming `.magic` as its target was routed into `.design/engine/RULES.md` as a self-imposed restriction instead of amending the engine directly, because the engine-directories-are-read-only framing in `AGENTS.md`/`rules/magic.md` carries no exception for the repository that authors them. C28 states the exception once, at the constitution level; `AGENTS.md` §0 carries the same identity for agents reading that file first. The shipped `rules/magic.md` and `.magic/templates/rules.md` are deliberately left unchanged — the stricter read-only contract they state remains correct for every downstream project that installs the engine. |
| 1.10.0 | 2026-08-28 | Agent | Extended C27's Escalation Whitelist with **E6 — intent incoherence or essence ambiguity in freshly supplied idea input**, governed by `l1-idea-intake-gate.md`. DA-2 declares its own list closed and extension an E4 event; the amendment is discharged by explicit owner directive. Added the narrowing note that bounds E6: it fires only on a freshly supplied idea and only after repository investigation is exhausted (IK-2), technical realization is never routed to the user (IK-3), Selection and Sequencing forks remain declarative under DA-9, questions must be answerable without engineering expertise (IK-5), and the dialogue must shrink each round or terminate (IK-6). Mirrored verbatim in `.magic/templates/rules.md` — the two must not diverge. |
| 1.9.0 | 2026-07-10 | Agent | Amended C23 §2: quantified External Drift Guard (">5 minutes / context compaction / manual file ops" replacing vague "significant time"), aligning the live constitution with templates/rules.md per C13 vague-term elimination. Recorded C11/C23 §4 simulate-command rename (magic.simulate → magic.dev.simulate) propagated by engine sync v2.1.55. |
| 1.8.0 | 2026-06-12 | Agent | Added C27 (Autonomous Decision Protocol) per field-feedback T4 rule; amended C13 §3 from halt-and-ask to Bounded Ambiguity Resolution, resolving the C13↔C25 contradiction. |
| 1.7.0 | 2026-05-07 | Agent | Backported C25 (Engineer Posture) from template; added C26 (Workspace Intent Routing) governing pre-resolution detection, auto-create-on-clear-signal, ambiguity gate, and second-contour fit validation. |
| 1.6.1 | 2026-04-29 | Agent | Removed legacy distribution wording from active adapter conventions. |
| 1.6.0 | 2026-04-03 | Agent | Baseline SDD role-switching constitution (C24) finalized across all core workflows. |
| 1.5.2 | 2026-04-03 | Agent | Fully expanded C24 to cover 7 core personas across all workflows. |
| 1.5.1 | 2026-04-03 | Agent | Integrated the Auditor persona (C24) into the operational logic. |
| 1.5.0 | 2026-04-03 | Agent | Integrated the Reviewer/Critic persona (C24) into the operational logic. |
| 1.4.1 | 2026-03-31 | Antigravity | RE-6: Quantified Workspace Disambiguation (≥50%) and removed "high-confidence" term (simulation fix). |
| 1.4.0 | 2026-03-31 | Agent | C6: Removed undefined "Strong/Weak Tier" qualifier (RE-3 simulation fix). |
| 1.3.0 | 2026-03-16 | Antigravity | Added C23: Context Economy & Validation Caching. |
| 1.2.0 | 2026-03-05 | Agent | Added C22: Workspace Rule Inheritance. |
| 1.1.0 | 2026-03-03 | Antigravity | Added C17-C21: Adapter distribution, Security, Parity, and Ventilation. |
| 1.0.0 | 2026-03-03 | Agent | Initial constitution |
