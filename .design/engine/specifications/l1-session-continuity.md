# Session Continuity & Status Surface

**Version:** 1.5.1
**Status:** Stable
**Layer:** concept

## Overview

Defines the engine-wide session-continuity contract: `STATE.md` as per-workspace live memory, a universal post-workflow state update, a commit-message suggestion guarantee for every mutating command, and a read-only status briefing surface for resuming work after a break. Consolidates the previously unspecified live-memory subsystem (state template, update utility, pause/handoff flow) under explicit invariants SC-1..SC-5.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Core workflows and invariants this contract binds to.
- [l1-decision-autonomy.md](l1-decision-autonomy.md) - DA-3/DA-6 compute the next step; SC-4 surfaces it on demand as a briefing.
- [l2-engine-finalization.md](l2-engine-finalization.md) - Finalization pipeline carrying SC-2 and SC-3 at a single choke point.
- [l2-status-command.md](l2-status-command.md) - Implementation of the status briefing surface (SC-4, SC-5).

## 1. Motivation

### 1.1 Field Evidence (user directive, 2026-06-12)

- `STATE.md` must be filled and updated after **every** completed task or command, including progression. Today only the run workflow (per-task) and the task workflow (plan write-back) update it; spec and rule workflows complete without touching live memory, so a session ending on a spec operation leaves stale resume data.
- After every command the engine must propose a commit message matching the performed work — **propose only, never commit**. Today the suggestion appears only when the finalize significance whitelist hits; real-but-non-whitelisted changes end without any suggestion.
- After a break the user has no single command answering "where am I and what is next": that information is scattered across `STATE.md`, `TASKS.md`, `PLAN.md`, and `INDEX.md`.

### 1.2 Coverage Gap

The live-memory subsystem (state template, update utility, pause/handoff flow, context load order) ships with the engine but is governed by no specification — behavior is defined only by workflow prose. This spec closes the gap and adds the missing invariants.

## 2. Constraints & Assumptions

- `STATE.md` stays a per-workspace file capped at 100 lines (template contract; oldest decisions are pruned).
- Read-only workflows stay read-only: a status briefing performs zero writes.
- The commit decision belongs to the user: the engine and the agent never invoke write-side git operations (restates the Finalization Protocol hard rule as a session-level invariant).
- New user-facing commands require an explicit Workflow Minimalism (C2) exception; this spec records exactly one (SC-5).
- No new artifact files are introduced: the briefing is composed from existing artifacts.
- SC-2 and SC-3 are carried by the Finalization Protocol pipeline and inherit its documented opt-outs (`MAGIC_FINALIZE=0`, `finalization.enabled: false`): a user who disables finalization knowingly suspends both guarantees for that scope.

## 3. Core Invariants

### SC-1 — Live Memory Contract

Every workspace owns exactly one `STATE.md`, instantiated from the engine template. It records: position (phase, task, spec), progress indicators, next action, recent decisions, blockers, blocking constraints, and session-continuity fields. Workflows load it as live memory before execution (per the context load order) and treat its `Next Action` as the authoritative resume point.

**`Status` Field Scope (SC-1.1):** the top-level `**Status:**` field is **phase/workspace-level only** — its confirmed vocabulary is `Active | Blocked | Paused` (`pause.md` writes and clears `Paused`; Pause Propagation and `task.md` phase-start writes set `Blocked`/`Active`), describing the state of the *phase currently in progress* (or the workspace as a whole), never an individual task. Plan completion is communicated through `Next Action`'s text (SC-2.1(c)), not a fourth `Status` value — no code path currently writes one, and this invariant does not introduce one. A task's own completion state is tracked authoritatively in `TASKS.md` / `tasks/phase-{N}.md`'s checklist (`- [x]`/`- [ ]`) and Detailed Tracking `**Status:**` sub-field — `STATE.md` does not duplicate it. A write that sets the top-level `Status` field from a task-scoped event (e.g. one task among several completing) is an SC-1 violation regardless of which value is written: it conflates two different vocabularies (task status includes `Done`/`Cancelled`, which are not valid phase-level values) and misrepresents the phase as finished when work remains. This does not forbid Pause Propagation's `--status=Blocked` call: that call is conditioned on phase-wide exhaustion (no `Todo` tasks anywhere in the phase), not on any single task's transition, so it is a phase-scoped assessment even though one task's transition is what triggers the check. Field report (engine 2.1.58): a per-task update call paired `--task="{T-ID} {Title}"` with `--status=Done`, and the phase-level field became `Done` — a value outside its own confirmed vocabulary — after a single task of an active phase completed.

### SC-2 — Universal Post-Workflow Update

Every mutating workflow (spec, task, run, rule) MUST update `STATE.md` after its main steps complete and before its Completion Checklist — at minimum: `Updated` timestamp, `Status`, progress indicators, and a recomputed `Next Action` (per DA-6). Existing mid-workflow updates (e.g., the run workflow's per-task updates) remain; this invariant adds the end-of-command guarantee. Read-only workflows (analyze, graph, status) are exempt. A workflow invocation that mutated artifacts but left `STATE.md` stale is incomplete.

**Plan-State-Aware Next Action (SC-2.1):** the recomputed `Next Action` MUST reflect the actual plan state, not a fixed per-workflow string. The computation reads the workspace plan/task ledger and resolves to, **checked in this order**: (a) **active phase Blocked** (its phase-file frontmatter `status: Blocked`, or its `TASKS.md` registry row reading `Blocked`) → point to blocker resolution, never to execution — this check runs before, and takes precedence over, (b) even when the phase has open checklist items; (b) **open tasks in the active phase** (not Blocked) → point to execution (`/magic.run {ws}`); (c) **plan complete** (no open `- [ ]` tasks and no active phase) → point to the planning funnel (`/magic.task {ws}`), **uniformly for every originating workflow**; (d) **registered specs without a plan** → point to planning (`/magic.task {ws}`). In no case may the recommendation be "execute the active phase" against an empty plan, nor may it recommend executing a task the same computation pass would report as Blocked.

**Blocked-Phase Precedence (SC-2.1(a) detail):** SC-1 designates `STATE.md` authoritative live memory; a Blocked phase whose `Next Action` still recommends the very execution the recorded blocker prevents makes the file self-contradictory rather than merely stale — the `**Status:** Blocked` field, the populated `## Blockers` section, and the `Next Action` line disagree about whether it is safe to proceed. The gate MUST treat either signal — phase-file frontmatter `status: Blocked` or the phase's `TASKS.md` registry-row status — as sufficient on its own; the two are not guaranteed to be updated atomically, so requiring both would let a partially-applied Blocked transition slip through unguarded. An open checklist item (`- [ ]`) inside a Blocked phase remains legitimately unchecked — Blocked is not Done — so the same regex match that identifies the next task must not be read as license to recommend it. Field report (engine 2.1.58): a phase recorded `status: Blocked` in both its frontmatter and its `TASKS.md` row, with a populated `## Blockers` entry, still received `Next Action: Execute T-1A01 {title} via /magic.run {ws}` — dispatching a resuming session straight into the recorded blocker.

**Provenance-Free Field (SC-2.2):** `Next Action` is persisted without any record of which workflow wrote it, and SC-4 replays it **verbatim** in the briefing. Its value is therefore read back in contexts unrelated to the workflow that produced it, and MUST satisfy the Post-Task Replan rule (`rules/magic.md` §5) unconditionally rather than per originating workflow:

- The synthesized value MUST name **exactly one** command (§5's single-next-step contract, DA-6).
- The synthesized value MUST NOT name `/magic.spec` or `/magic.analyze`. §5 reserves the former to a real `/magic.task` Pre-flight HALT and keeps the latter on-demand; a value chosen as legal for one workflow otherwise resurfaces under another — a `/magic.spec` written by a `task` finalize reappears in the briefing after `/magic.run`, precisely where §5 forbids it.
- The constraint MUST be enforced at the **single exit** of the computation, not per branch. Branch-local enforcement is the demonstrated failure mode: a fix that corrected only the `run` branch left `task` emitting `/magic.spec` (field report, engine 2.1.49 → 2.1.58).

Routing plan-complete through the funnel is not circular: `/magic.task`'s Pre-flight raises the HALT that sanctions spec authoring, so new scope is still reached — through the one sanctioned door instead of a hardcoded command name.

A `Next Action` that recommends running a phase that does not exist, re-planning a plan with no pending specs, names more than one command, names a command §5 reserves, or recommends executing a task in a phase the same `STATE.md` records as Blocked, is an SC-2 defect: the briefing then misdirects the returning user (SC-1/SC-4 consume this field as the authoritative resume point). A post-workflow update that sets the phase-level `Status` field (SC-1.1) from a task-scoped event, that deletes a hand-authored progress line because its shape resembles an engine-owned counter, or that corrupts the file's markdown structure while rewriting it (e.g. an unbalanced fence), is the same class of SC-2 defect: the update was supposed to make `STATE.md` more accurate and instead made it less — or, in the structural case, made the file itself less trustworthy to parse.

**Progress Granularity (SC-2.3):** the recomputed progress indicators MUST include a per-phase counter for the active phase whenever the workspace uses the canonical two-level task layout (`tasks/phase-{N}.md`), not only the aggregate phase-count line. A recompute that silently drops to an aggregate-only line because it cannot locate the active phase's checklist is an SC-2 defect of the same class as SC-2.1's contradiction: `STATE.md` is supposed to be more precise after an update, not less. Field report (engine 2.1.58): the same finalize pass that produced the Blocked contradiction above also collapsed a two-line `Phase {N}: [d/t] …` / `Overall: [d/t] …` block down to `Overall: [0/1]` alone — independent of the Blocked status, reproducible on any healthy in-progress phase using the two-level layout, because the recompute's phase-line source only ever checked for an inline `### Phase {N} Checklist` heading in `TASKS.md`, a legacy single-file layout most Stable-workflow projects — including this engine's own workspace — no longer use.

### SC-3 — Commit Suggestion Guarantee

Every mutating workflow invocation that produced file changes MUST end by presenting exactly one suggested commit message (Conventional Commits) describing the performed work. The suggestion is informational only: no write-side git operation (add, commit, push) is ever invoked by the engine or the agent. When the significance whitelist does not hit but the working tree changed relative to the invocation start, a fallback suggestion is still produced and labeled as non-bumping (no version bump, no changelog entry — message only).

### SC-4 — Status Briefing Surface

The engine exposes a read-only command that composes a resume briefing from existing artifacts: current position and progress (`STATE.md`), open and next tasks (`TASKS.md`), registry state (`INDEX.md`), blockers and blocking constraints, recent decisions, engine-version drift state (local engine version vs. registry snapshot), and exactly one recommended next command (selected per DA-3/DA-6). The command performs no writes, triggers no version bump, no finalization, and no automatic delegation to other workflows; drift is reported as a briefing line, never as an interactive prompt.

### SC-5 — C2 Exception (Status Command)

The status command is an authorized Workflow Minimalism (C2) exception, requested by explicit user directive (2026-06-12). The user-facing wrapper set grows by exactly one command; any further command addition requires its own explicit authorization.

## 4. Detailed Design

### 4.1 Session Loop

```mermaid
graph LR
    A["Mutating workflow (spec/task/run/rule)"] --> B["Main steps"]
    B --> C["SC-2: STATE.md update"]
    C --> D["Finalize: bump + changelog when significant"]
    D --> E["SC-3: one suggested commit message"]
    E --> F["User commits manually"]
    G["Status command"] -. reads .-> C
```

### 4.2 Single Choke Point

The SC-2 state update and the SC-3 suggestion are owned by the Finalization Protocol step of each mutating workflow, not duplicated as prose in every workflow body. One pipeline is auditable and testable; scattered prose drifts. The implementation contract lives in [l2-engine-finalization.md](l2-engine-finalization.md).

### 4.3 Briefing Composition

The status surface is intentionally thin: it renders what SC-1/SC-2 already maintain. If the briefing is inaccurate, the defect is in the state updates, not in the briefing — this keeps one source of truth. Composition order and degraded states are specified in [l2-status-command.md](l2-status-command.md).

## 5. Drawbacks & Alternatives

- **Per-workflow prose updates** (each workflow body re-describes the state write) — rejected: duplicated prose drifts apart; a single finalize choke point is verifiable by tests.
- **Auto-running analysis on detected drift inside the status briefing** — rejected: violates read-only purity (SC-4); the briefing reports, the user decides.
- **Churn**: updating `STATE.md` on every command increases write frequency on one file — mitigated by the 100-line cap with pruning, and by the file's role as disposable live memory (history lives in `PLAN.md`/`CHANGELOG.md`).

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[TEMPLATE]` | `.magic/templates/state.md` | STATE.md structure contract (SC-1) |
| `[UPDATER]` | `.magic/scripts/update-state.js` | Key-value patch utility implementing state writes (SC-2) |
| `[CONTEXT]` | `.magic/context.md` | Live-memory load order and resume detection |
| `[PAUSE]` | `.magic/pause.md` | Pause/handoff flow that snapshots STATE.md |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.5.1 | 2026-08-06 | Agent | SC-2's defect enumeration extended with a third example: an update that corrupts `STATE.md`'s markdown structure (e.g. an unbalanced fence) while rewriting it is the same class of defect as misplacing a value or deleting narrative — patch, no new invariant. Field report (engine 2.1.58, informal — no reproduction steps): investigated independently, root cause and fix tracked in [l2-engine-finalization.md](l2-engine-finalization.md) §8.5. |
| 1.5.0 | 2026-08-06 | Agent | New **SC-1.1 (`Status` Field Scope)**: the top-level `Status` field is phase/workspace-level only (confirmed vocabulary `Active \| Blocked \| Paused`; plan completion is a `Next Action` text state, not a fourth `Status` value — no code path writes one) and must never be written from a task-scoped event, with an explicit carve-out for Pause Propagation's phase-wide-exhaustion check — a task's completion state lives in `TASKS.md`/phase-file checklists, not duplicated here. SC-2's defect enumeration extended to name both this and a Progress-narrative-line deletion as the same class of defect (the update makes `STATE.md` less accurate, not more). Field report (engine 2.1.58): a per-task update call paired `--status=Done` with `--task=`, writing `Done` — outside the phase-level vocabulary entirely — into the phase Status field after one task of an active phase completed; the same session also reported hand-authored `Label: [n/m]`-shaped progress lines (e.g. `Specification:`, `Plan:`, `Implementation:`) silently deleted by a recompute that could not distinguish them from the two labels (`Overall`, `Phase {N}`) the engine actually regenerates. Concrete fixes tracked in [l2-engine-finalization.md](l2-engine-finalization.md) §8. |
| 1.4.0 | 2026-08-06 | Agent | SC-2.1 gained a **Blocked-phase check** (new case (a), checked before the open-tasks case, re-lettering the rest to (b)/(c)/(d)) plus a **Blocked-Phase Precedence** detail paragraph: `Next Action` must never recommend executing a task in a phase whose frontmatter or `TASKS.md` row reads `Blocked`, on pain of contradicting the same file's `**Status:**` and `## Blockers` fields. New **SC-2.3 (Progress Granularity)**: the per-phase counter must survive for the canonical two-level task layout, not only the legacy inline-`TASKS.md` layout. Both closed by a single field report: a Blocked phase with an open checklist item received an execute-me `Next Action` while its `## Progress` block silently lost its phase-level counter — independent defects sharing one root symptom (`STATE.md` becoming less accurate after the update meant to refresh it). Field report against engine 2.1.58. |
| 1.3.0 | 2026-08-06 | Agent | SC-2.1(b) plan-complete resolution reverted to **workflow-agnostic** (`/magic.task {ws}` for every originating workflow) and new **SC-2.2 Provenance-Free Field** added. 1.2.0's workflow-sensitive split was unsound: `Next Action` records no provenance and SC-4 replays it verbatim, so the `/magic.spec` it kept for the `task` branch resurfaced in the briefing after `/magic.run` — the very §5 violation 1.2.0 set out to fix, laundered through STATE.md. SC-2.2 binds the §5 constraint (exactly one command; never `/magic.spec` or `/magic.analyze`) to the field itself and mandates enforcement at the computation's single exit, since branch-local enforcement is the demonstrated failure mode. Field evidence: field report against engine 2.1.49, re-verified against 2.1.58 where the `task` branch still emitted `/magic.spec`. |
| 1.2.0 | 2026-07-18 | Agent | SC-2.1(b) plan-complete resolution made workflow-sensitive: after `run` → `/magic.task {ws}` funnel (Post-Task Replan `rules/magic.md` §5 forbids naming `/magic.spec` proactively after `/magic.run`); after `task` → `/magic.spec` (unchanged — a repeat `/magic.task` recommendation would be circular). Field evidence: finalize `--workflow=run` at a phase close wrote a `/magic.spec` Next Action into STATE.md, contradicting §5's single-next-step contract (field report, engine 2.1.49). |
| 1.1.0 | 2026-06-13 | Agent | SC-2.1 Plan-State-Aware Next Action: the recomputed `Next Action` must reflect actual plan state (open tasks → run; plan-complete → /magic.spec; specs-no-plan → task), never a fixed "execute the active phase" against an empty plan. Field evidence: finalize `computeNextAction` returned a stale run-recommendation across this session's plan-complete states. Re-reviewed under Trust Mode (C9). |
| 1.0.0 | 2026-06-12 | Agent | Initial Stable version. SC-1..SC-5 per user directive: live memory contract, universal post-command state updates, commit suggestion guarantee, status briefing surface (C2 exception). |
