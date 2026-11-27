# Pipeline Stages: One Stage per Invocation, File-Borne Handoffs and Model Choice

**Version:** 1.2.1
**Status:** Stable
**Layer:** concept

## Overview

The pipeline `spec` → `plan` → `task` → `run` is a sequence of separate stages, and every invocation of a pipeline command performs exactly one of them. A stage ends by recording, in the workspace's files, everything the next stage needs and by naming the next command; it does not start that command itself. The boundary is what lets a person — or a host acting for them — start the next stage in a fresh session or with a different model, chosen for how much reasoning the stage needs. `goal` is the one command that chains stages, and it crosses the same boundaries through the same records.

## Related Specifications

- [l1-plan-command.md](l1-plan-command.md) - The split of planning from decomposition whose boundary this specification makes a real one (PL-4, PL-5, PL-8).
- [l1-goal-mode.md](l1-goal-mode.md) - The one command that chains stages (PS-6).
- [l1-command-surface.md](l1-command-surface.md) - The command table that carries each command's reasoning demand (CS-14).
- [l1-session-continuity.md](l1-session-continuity.md) - The live memory and the next-step computation that carry a handoff.
- [l1-decision-autonomy.md](l1-decision-autonomy.md) - DA-6: the next step is computed and narrated, never asked.
- [l1-engine-core.md](l1-engine-core.md) - The pipeline and the automatic execution of the constitution's C9 that this specification bounds.
- [l2-demand-routing.md](l2-demand-routing.md) - The tier setting and the host bindings of PS-8 and PS-9.
- [l1-role-system.md](l1-role-system.md) - The roles a delegated unit carries into its agent.

## 1. Motivation

The owner's list of 2026-11-11 reverses an earlier choice: planning was folded into `task`, and use of the engine has shown that splitting development into stages is the better process — among other reasons, so that the person can switch models by hand, or ask the host to switch them, according to how much reasoning each stage needs, and spend fewer tokens on the stages that need less. The owner asks that the split of the old `task` be thought through seriously.

A split into commands is not yet a split into stages. Today three bodies start the next stage on their own: `spec` invokes `task` after a dispatch, `analyze` invokes task generation after a reverse-engineering dispatch, and `task` runs planning inside itself when the plan is stale (`l1-plan-command.md` 1.0.1, PL-4). Each of these chains runs in the model and the context of the stage that started it, so a person who wants a stronger model for planning, or a cheaper one for decomposition, never gets the moment to switch. And a stage that relies on what an earlier stage said in the conversation, rather than on what it wrote, gives a different result when it is started in a new session — which is exactly what switching a model often means.

### 1.1 The Owner's List of 2026-11-27 `[ADDED]`

The owner asks that the model or the reasoning effort change when the command changes, to spend fewer tokens — nearly every agent host has commands for both — and that whether this is possible be checked in the session before anything is specified. The check, on Claude Code 2.1.332: the host's skill and agent definitions accept a model and an effort (read from the schema of the running host); a temporary forked skill declaring the smallest model and a low effort answered from that model at that effort; the agent's own tool for delegated agents takes a model and an effort; the host's model and effort commands are built-in commands the agent cannot invoke; the session's effort is visible to scripts in the environment, its model is not. A reference project studied the same day (an orchestrator on the strongest model that delegates every build to the smallest one and checks each result itself) confirmed the pattern PS-8 adopts.

`[ADDED]` The owner added the same day that the engine's users work with other agents too, not only Claude. Two more hosts the engine projects to were read on this machine: Codex's own tool for delegated agents, as recorded in one of its session logs, takes a model and a reasoning effort and prefers the inherited model; Qwen Code's configuration shows a session model and nothing about delegated agents. Neither could be started for a live check. Capabilities therefore differ per host and are known to different degrees — the reason PS-10 exists.

## 2. Constraints & Assumptions

- `[MODIFIED]` The engine does not switch the model or the reasoning effort of the session it runs in, and cannot: the host's own commands for that are typed by the person and are not reachable by the agent. What some hosts do let a skill choose is the model and effort of work it **delegates** — a subagent, a forked skill. Verified on 2026-11-27 in a live session on one host (§1.1): a forked skill that declared a small model and a low effort ran on exactly those, while the session itself stayed on its own model. So the engine names each stage's reasoning demand (PS-4) on every host, tells the person how to switch where the host has commands for it (PS-9), and on a host that allows it may run the delegable part of a stage on the demand's tier (PS-8).
- The boundary adds no question. A stage ends with a narrated next step (DA-6), never with a prompt.
- Every guard inside a stage is unchanged; this specification moves where a stage ends, not what it checks.
- **Assumption (forecast):** a stage ends instead of chaining by default, and `goal` is the chaining mode, because the owner's two statements of 2026-11-11 — stages to switch models between, and `goal` to run non-stop — describe exactly that division; if the default were the chain, the switch would need an interruption at the right moment. Runner-up: chain by default, with a setting to stop at boundaries. Override: `/magicspec spec amend l1-pipeline-stages.md "chain stages by default"`.
- **Assumption (forecast):** three reasoning levels — `deep`, `standard`, `light` — are enough, and the assignment of §5.2 is the engine's, because a finer scale would name differences no host can act on. Runner-up: a per-task level set by the planner. Override: `/magicspec spec amend l1-pipeline-stages.md "per-task reasoning level"`.
- `[MODIFIED]` The host interface the earlier marker waited for exists for delegated work (PS-8); for the session's own model it still does not, and the engine is one command with one entry, so a per-command setting of the session's model would need per-command entries the command surface rejects (`l1-command-surface.md` §1.1).
- **Assumption (forecast):** the switch hint (PS-9) is on by default and delegation on a mapped tier (PS-8) is off until the project's setting turns it on, because the hint costs nothing when it is wrong, while delegation on a weaker tier that turns out wrong costs retried work in a project nobody asked; turning it on is one setting. Runner-up: delegation on by default. Override: `/magicspec spec amend l1-pipeline-stages.md "delegation on the demand's tier is on by default"`.
- <!-- TBD: whether a skill that declares a model without being forked moves the rest of the session's turn to that model on the verified host. Not tested on 2026-11-27: the test would switch the very session running it. It matters only if the command surface ever reopens per-command entries. -->

## 3. Core Invariants

- **PS-1 One stage per invocation.** An invocation of `spec`, `plan`, `task` or `run` performs that command's stage and ends. It never starts a later stage of the pipeline in the same invocation. Exactly two things continue past a boundary: `goal` (PS-6), and a request whose own words ask for the following stage too ("specify this and plan it") — then the next stage starts, and the narration says the request asked for it. A body that needs a write only another command may make — `fix` opening a maintenance phase through the planning command (`l1-fix-command.md` §6) — calls that write as a step of its own stage; it does not run the other command's whole stage.
- **PS-2 File-borne handoff.** When a stage ends, everything the next stage needs is in the workspace's files: the artifacts the stage wrote, the decisions it took (as `[DR]` lines and forecast premises in the artifacts they govern), any directive it leaves for the next stage, and live memory's `Next Action` naming the next command with its argument. Nothing the next stage needs exists only in the conversation. The test: the next stage started in a new session, by another model, reaches the same result as the same stage started in the conversation that ran the previous one.
- **PS-3 Bounded read set.** Each stage reads what its row of §5.1 lists and no more than its steps require, so a stage started cold loads only its own inputs. A stage never re-reads the previous stage's inputs to reconstruct a decision that stage should have written down. A missing record is a PS-2 defect of the earlier stage: the stage names it as a finding in its report and proceeds on what the files state, or, when what is missing is its input itself, ends with a backward handoff (PS-5) — it never fills the gap by guessing.
- **PS-4 Reasoning demand.** Every command declares one reasoning demand: `deep` for stages whose output is a judgement others build on (understanding intent, ordering work, finding a cause), `standard` for stages that apply a settled plan, `light` for reports and mechanical passes. The handoff line names the demand of the next command: `Next: /magicspec task — standard reasoning`. The demand is advice. The engine never asks the person to switch, never refuses to run under any model, and never prints the demand as a warning.
- **PS-5 Backward handoff carries its reason.** A stage that finds its input unusable — `task` finding that the plan cannot be decomposed as it stands, `run` finding drift — does not repair the earlier stage's files (each file keeps its one owner, PL-1). It ends, recording a directive for the earlier stage in plain words — what was found and where — and the next step names that stage with the directive as its argument: `/magicspec plan "{directive}"`. The earlier stage reads the directive as its input; nothing of it is lost to a session change.
- **PS-6 `goal` crosses boundaries the same way.** `goal` executes the next step instead of naming it, but every step it takes ends at its own boundary and leaves the PS-2 records before the next one starts. A goal interrupted at any boundary resumes from the files — in a new session and with another model — exactly as a typed command would.
- **PS-7 The boundary is not a pause.** Ending a stage asks nothing and waits for nothing: the stage finalizes, records, narrates its next step and its demand in one line, and the invocation is over. Whether the next command is typed at once, after a model switch or in another session is the person's choice.
- **PS-8 Delegation on the demand's tier.** `[ADDED]` A project may map each demand to a **tier** — a model and a reasoning effort of the host, or `inherit` (the session's own). Where the host lets the engine choose the model and effort of a delegated agent and the mapping names a tier for the demand, the delegable units of a `standard` or `light` stage run on that tier (§5.5). A unit is delegable when it asks the person nothing and its result is checked by the session before it counts: the session keeps the intake (E6, E7), every consent question, the verification of the delegated result (a `Verify` line, an `Observe`, a review verdict) and the finalization. A `deep` stage is never delegated down, and nothing is delegated to a tier above the session's own. Without such a host, or with no mapping, the stage runs in the session exactly as before. A delegated unit that fails its verification is retried once in the session itself before it is recorded as a failure, so a tier too weak for the unit costs one retry, never a wrong result.
- **PS-9 The switch hint.** `[ADDED]` On a host whose session model and effort the person switches by commands, and when the next command's demand differs from the demand of the stage just finished, the handoff line names the commands that switch to the mapped tier: `Next: /magicspec task — standard reasoning (switch: {host's model command} · {host's effort command})`. The hint is advice like the demand (PS-4): never a question, never a condition of running, absent on a host the engine cannot identify and when the demands are the same.
- **PS-10 Host-neutral by construction.** `[ADDED]` The demand, the stages and their boundaries are the same on every host; only the binding differs. A tier is expressed in the identified host's own vocabulary — its model names, its effort words, or one of them where the host has only one — and the switch hint uses that host's own commands. Each host's binding states which capability has been checked and how; an unchecked capability is never used on that host by default, and the project may state it for its own use. A host is identified by a marker it sets, else by the agent, which knows the host it runs in; nothing is asked. A host the engine knows nothing about runs every stage exactly as before — the demand is still named — so no host is worse off for the existence of another.

## 5. Detailed Design

### 5.1 Stages, Inputs and Outputs

| Stage | Reads | Writes | Next on success | Next on a backward finding |
| --- | --- | --- | --- | --- |
| `spec` | the idea, the constitution, the registry, the specifications on the idea's topic | specifications, the registry | `plan` | — |
| `plan` | the registry, the Stable specifications' headers, overviews and invariants, the constitution, the plan with its backlog, a directive left for it | the plan | `task` | `spec amend`, named in the plan's report, when a specification must change before it can be planned |
| `task` | the plan's active (or next) phase, the specifications that phase holds, the constitution | the task ledger, the phase workbooks | `run` | `plan "{directive}"` (PL-8) |
| `run` | the active phase workbook, the sections of the specifications its tasks cite, the product's code | product code, the workbook's state, the phase journals | `run` while tasks remain; then the step live memory computes (SC-2): `task` for an undecomposed next phase, `run` for a decomposed one | `plan "{directive}"` (PL-6) |

Live memory and the changelog are written by finalization at the end of every stage, as today.

### 5.2 Reasoning Demand per Command

| Demand | Commands |
| --- | --- |
| `deep` | `spec`, `plan`, `fix`, `analyze` |
| `standard` | `task`, `run`, `simulate`, `rule` |
| `light` | `status`, `help`, `graph`, `migrate`, `sync` |

`goal` has no demand of its own: each of its steps carries the demand of the command it runs. `resume` likewise carries the demand of the command it continues (`l1-session-continuity.md` SC-11(e)). `[ADDED]`

### 5.3 Flow

```mermaid
graph LR
    S[spec] -.->|ends, names plan| P[plan]
    P -.->|ends, names task| T[task]
    T -.->|ends, names run| R[run]
    T -.->|directive| P
    R -.->|drift directive| P
    G[goal] ==>|executes each named step| S
```

Dotted arrows are handoffs a person starts; the double arrow is `goal`, which takes each of them itself.

### 5.4 Handoff Line

```plaintext
Next: /magicspec {command} {argument} — {demand} reasoning
```

One line, printed once, after the finalization output and before the completion checklist; the same command and argument are what live memory's `Next Action` records. `[MODIFIED]` The switch hint of PS-9 is appended in parentheses when it applies; live memory never records it.

### 5.5 Tiers and Delegable Units `[ADDED]`

| Demand | Default tier | Delegable units |
| --- | --- | --- |
| `deep` | `inherit` | none |
| `standard` | `inherit` | the build of one task in `run` (the session reviews and verifies it); one scenario of `simulate` (the session adjudicates its findings); the decomposition draft of `task` (the session checks it against the plan before writing) |
| `light` | `inherit` | none: a briefing or a mechanical pass costs less in the session than a delegated agent's cold start |

The mapping is the project's setting; its form and the host bindings are [l2-demand-routing.md](l2-demand-routing.md). With every tier `inherit` — the default — PS-8 changes nothing, and PS-9 names the tier the project mapped, or, with none mapped, the host's tier names that match the demand.

## 6. Implementation Notes

1. The bodies of `spec` (Dispatching from Raw Input, Post-Update) and `analyze` (its Zero-Prompt Handoff after a dispatch) stop invoking the next stage and print the handoff line instead.
2. `task` stops running planning inside itself (PL-4 in [l1-plan-command.md](l1-plan-command.md) 2.0.0).
3. The router's command table gains the demand column (CS-14); the handoff line reads it from there.
4. The finalize next-step computation emits the demand with the command, so the line and `Next Action` agree.
5. The cognitive suite gains a cold-start scenario per boundary: the next stage started from the files alone reaches the recorded next step.
6. Declared supersessions (`l1-coherence-check.md` CH-9): the Zero-Prompt Handoff of `workflows/spec.md` and `workflows/analyze.md`; the auto-handoff wording of the constitution's C9 ("executes the full SDD lifecycle autonomously"), which becomes "executes each stage autonomously; `goal` chains them" — amended through `/magicspec rule` (origin `user-stated`) when the boundary ships, with the shipped constitution template mirrored; the handoff rows of [l1-plan-command.md](l1-plan-command.md) (PL-4, PL-5); the auto-handoff descriptions in [l1-engine-core.md](l1-engine-core.md) and [l1-session-continuity.md](l1-session-continuity.md) SC-2 (the computed step is unchanged; only who starts it moves).

## 7. Drawbacks & Alternatives

- **One more typed command per stage.** Accepted: it is the moment the owner asks for; `goal` removes it for whoever does not want it.
- **A setting that chooses chain or stop** — rejected for now: the two owner statements already divide the cases between two commands, and a setting would add a third behaviour to test without a case that needs it.
- **The engine choosing the model** — `[MODIFIED]` impossible for the session itself (§2); possible for delegated work on some hosts, which PS-8 uses behind a project setting, the host-specific part kept in the implementation layer.
- **Per-command entries carrying their own model** — rejected: one command with one entry is the owner's decision of 2026-10-30 (`l1-command-surface.md` §1.1), and the effect on the session's own turn is unverified (§2). `[ADDED]`
- **Delegating every stage** — rejected: a delegated agent starts cold and cannot ask the person, so the intake, consent and the deep judgements would be lost or doubled; the saving is in the many repeated units of `run` and `simulate`, which PS-8 delegates. `[ADDED]`
- **A per-task reasoning level** — the forecast's runner-up (§2); a planner's estimate per task would be a new judgement with no check that it was right.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[SPEC]` | `skills/magicspec/workflows/spec.md` | The Zero-Prompt Handoff PS-1 replaces. |
| `[ANALYZE]` | `skills/magicspec/workflows/analyze.md` | The reverse-engineering handoff PS-1 replaces. |
| `[TASK]` | `skills/magicspec/workflows/task.md` | The in-body planning PL-4 removes. |
| `[ROUTER]` | `skills/magicspec/SKILL.md` | The command table that gains the demand. |
| `[RULES]` | `.magicspec/RULES.md` | C9, amended when the boundary ships. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.2.1 | 2026-11-27 | Agent | As built in Phase 88, Stable retained, no requirement changed: §5.2 names `resume` beside `goal` as a command without a demand of its own, as the router prints it. |
| 1.2.0 | 2026-11-27 | Agent | **Every host** (origin `user-stated`: the owner's remark of 2026-11-27 that users work with other agents, not only Claude). New PS-10: the binding differs per host, tiers in the host's own vocabulary, a checked/unchecked record per capability with unchecked ones unused by default, identification by marker or by the agent, an unknown host unchanged. §1.1 records what was read for Codex and Qwen Code. Stable retained after the Amendment Rule round trip (Post-Update Review). |
| 1.1.0 | 2026-11-27 | Agent | **Model and effort per command** (origin `user-stated`: the owner's list of 2026-11-27, checked in the session first, §1.1). The constraint that the engine cannot switch models is narrowed to the session's own model; new PS-8 (delegable units of a `standard` or `light` stage run on the project's tier for the demand where the host allows it, the session keeping intake, consent, verification and finalization; never a `deep` stage, never above the session's tier; one retry in the session on a failed verification) and PS-9 (the handoff line names the host's switch commands when the demand changes); §5.5 the default tiers (`inherit`) and the delegable units; §5.4 the hint's place. Forecast: the hint on by default, delegation off until the setting turns it on. The old TBD is answered; a narrower one (an unforked skill's model on the session's turn) is left open. Stable retained after the Amendment Rule round trip (Post-Update Review). |
| 1.0.1 | 2026-11-11 | Agent | Clarification patch, Stable retained (as built in Phase 49; the requirement moved with the amendment that declared it, this record follows). **The handoff line as built:** `finalize.js` builds `Next: /magicspec {command} {argument} — {demand} reasoning` from the persisted `Next Action` — the first `/magicspec <command>` it names, the workspace and a quoted directive as the argument, an alias read as its command and printed by its own name — and the demand is read from the router's table through the one parser (`lib/hosts.js`, `readCommands`), never from a copy; it is printed once, as the last line of the `### Next step` block, after the unchanged `Next Action` text; a `Next Action` that names no command or one the router does not list gets no line, and an unreadable router costs the line and never the finalization. The five pipeline bodies say so in their finalization step. **Each body's read set** is one `**Reads**` line equal to its row of §5.1 and the sentence that a missing record of an earlier stage is reported as a finding and never guessed. **Delivered supersessions (§6 item 6):** the Zero-Prompt Handoff of `spec.md` and `analyze.md` names the next stage and starts nothing; the constitution's C9 reads that the agent executes each stage autonomously and `goal` chains them (constitution 1.19.0, the shipped template word for word); a stage found in a cold session reaches the recorded next step from the files alone (harness and the cognitive suite scenarios T283 to T290). |
| 1.0.0 | 2026-11-11 | Agent | Created from the owner's list of commands of 2026-11-11 (origin `user-stated`): stages split so that a model can be switched between them, `goal` as the non-stop mode. One stage per invocation, file-borne handoffs, a bounded read set, a reasoning demand per command, backward handoffs with a directive. |
