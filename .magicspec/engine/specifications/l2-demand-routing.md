# Demand Routing: Tier Setting, Delegation and the Switch Hint

**Version:** 1.1.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-pipeline-stages.md

## Overview

How the engine realizes PS-8 and PS-9 of [l1-pipeline-stages.md](l1-pipeline-stages.md): the project setting that maps each reasoning demand to a tier, the host bindings that turn a tier into a delegated agent's model and effort, the delegation steps of `run`, `simulate` and `task`, and the switch hint the handoff line gains. Open it before changing which work is delegated, on which model, or what the handoff line tells the person to type.

## Related Specifications

- [l1-pipeline-stages.md](l1-pipeline-stages.md) - Parent concept: PS-4 the demand, PS-8 delegation on the demand's tier, PS-9 the switch hint, §5.5 the delegable units.
- [l1-command-surface.md](l1-command-surface.md) - CS-14: the demand column this routing reads.
- [l2-skill-wrappers.md](l2-skill-wrappers.md) - The router's frontmatter, which stays free of a model or an effort (one entry for every command).
- [l2-engine-finalization.md](l2-engine-finalization.md) - The `### Next step` block whose handoff line gains the hint.
- [l1-sdd-document-set.md](l1-sdd-document-set.md) - The 4.0 `run`, whose builder is already a fresh subagent and receives only its pack.
- [l1-role-system.md](l1-role-system.md) - The role cards a delegated unit is briefed with.

## 1. Motivation

[l1-pipeline-stages.md](l1-pipeline-stages.md) §1.1 records the check of 2026-11-27. What it found, as the facts this specification builds on:

| Fact | How it was established |
| --- | --- |
| Claude Code skill and agent definitions accept `model` and `effort`; skills also `context: fork` | the frontmatter schema of the running host, 2.1.332 |
| A forked skill with `model: haiku`, `effort: low` runs as `claude-haiku-5-5` at effort `low` | a temporary probe skill, invoked once and deleted |
| The agent's tool for delegated agents takes `model` (`fable`, `opus`, `sonnet`, `haiku`) and `effort` | the tool's own definition in the session |
| `/model` and `/effort` are built-in commands, not skills; the agent cannot invoke them | the skill tool rejects built-in commands |
| Scripts see `CLAUDECODE=1` and the session's effort as `CLAUDE_EFFORT`; the session's model is not exposed; `CLAUDE_CODE_SUBAGENT_MODEL` sets the default model of every delegated agent, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` makes it override any choice | the environment of a tool call in the session; the reference project's settings |
| `[ADDED]` Codex: the session's tool for delegated agents (`spawn_agent`) takes `model` and `reasoning_effort` overrides and says the inherited parent model is preferred; it lists the account's models with their efforts (`low` to `max`); the session itself has a model and a reasoning effort (`model`, `model_reasoning_effort` in `config.toml`) | the tool definition recorded in a Codex session log on this machine (2026-11-02) and the user's `config.toml`; no live session — the installed CLI did not start |
| `[ADDED]` Codex: no environment variable marks a Codex session to a script (the logs show only `CODEX_HOME`, a configuration path) | the same logs |
| `[ADDED]` Qwen Code: a session model (`model.name` in `settings.json`) and a model registry; nothing found about the model of a delegated agent or a reasoning effort | the user's `~/.qwen`; no live session — the installed CLI did not start |

The reference project the owner pointed to (`.references/.tools/super-claude`) runs the strongest model as an orchestrator with a high effort and delegates every build to the smallest model through agent definitions, accepting a build only after running its check itself. PS-8 is that pattern, limited to the units whose result the session checks anyway.

## 2. Constraints & Assumptions

- The router (`SKILL.md`) declares no `model` and no `effort`: it is the one entry of every command, and a model there would apply to `spec` and `status` alike.
- No hidden per-command skill entries are added: the command surface keeps one entry ([l1-command-surface.md](l1-command-surface.md) §1.1), and the effect of an unforked skill's model on the session's turn is unverified (the TBD of [l1-pipeline-stages.md](l1-pipeline-stages.md) §2).
- `[MODIFIED]` **Every host, not one.** The engine runs under several hosts (the ones `lib/hosts.js` lists — Claude Code, Codex, Qwen Code — and any other that loads the skill), and a project may be worked on from more than one. Nothing in this specification is a Claude Code rule with other hosts as an afterthought: the setting is keyed by host, the binding table holds one record per host, and each record states which capability has been checked and how (§5.2). A capability not checked for a host is not used on it unless the project's setting states it for that host.
- `[MODIFIED]` **Identification, never by asking**: first by an environment marker the host sets (Claude Code: `CLAUDECODE=1`); otherwise by the agent, which knows which host it runs in and passes it to the scripts that need it (`finalize --host={name}`, §5.4). A host the table does not hold and the setting does not describe gets no hint and no delegation, and works as before.
- `[ADDED]` **Vocabularies differ.** Model names, effort words and the commands that switch them are the host's own and change with its releases; some hosts have no effort at all. A tier therefore holds the host's words as written, may omit the effort, and the defaults of §5.2 prefer what changes least — an effort over a model name where the host allows it.
- A host setting that forces the delegated model (`CLAUDE_CODE_SUBAGENT_MODEL_FORCE`) wins over the project's tier: the engine passes its choice and the host decides; the delegation stays correct, only the saving changes.
- **Assumption (forecast):** the tier names in the setting are the host's own model aliases and effort words (`sonnet`, `medium`), not engine-invented ones, because a person writes the setting with the words the host's `/model` already taught them, and a mapping table between two vocabularies would be one more thing to keep current. Runner-up: engine tier names (`strong`, `medium`, `small`) mapped per host. Override: `/magicspec spec amend l2-demand-routing.md "engine tier names"`.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| PS-4 Reasoning demand | Read from the router's table through `lib/hosts.js` `readCommands`, never from a copy (§5.1). |
| PS-8 Delegation on the demand's tier | The `tiers` setting (§5.1), the host binding (§5.2), the delegation steps (§5.3) and the retry rule (§5.3 item 4). |
| PS-9 The switch hint | `finalize`'s handoff line (§5.4). |
| PS-10 Host-neutral by construction | The setting keyed by host (§5.1), one binding record per host with how each capability was checked (§5.2), identification by marker or `--host` (§2, §5.4). `[ADDED]` |

## 5. Detailed Design

### 5.1 The Setting

`workspace.json`, top level, beside `finalization`:

```json
{
  "tiers": {
    "deep": "inherit",
    "standard": {
      "claude": { "model": "sonnet", "effort": "medium" },
      "codex": { "effort": "medium" },
      "qwen": { "model": "<a model the account has>" }
    },
    "light": {
      "claude": { "model": "haiku", "effort": "low" },
      "codex": { "effort": "low" }
    },
    "delegate": false,
    "hosts": {
      "qwen": { "switch": { "model": "/model {model}" }, "delegate": false }
    }
  }
}
```

`[REFERENCE]` A demand maps to `inherit` or to an object keyed by host name — the names of `lib/hosts.js` (`claude`, `codex`, `qwen`), or any other name the agent passes as `--host`; a host absent from the object is `inherit` for that demand. A tier object holds `model`, `effort` or both, in the host's own words. `hosts` describes, per host, what the table of §5.2 does not hold or holds unchecked: `switch` — the session commands, with `{model}` and `{effort}` placeholders — and `delegate` — whether the host's delegation tool takes a model and an effort (`true` states it for that project). `[MODIFIED]` `delegate` turns PS-8 on (default `false`); the hint of PS-9 needs no switch. A missing `tiers` key is every demand `inherit`, `delegate` false. `deep` accepts only `inherit` (PS-8: a `deep` stage is never delegated); another value is reported by `check-prerequisites` as a warning and read as `inherit`. A model or effort word the host does not list is passed as written, and the host's refusal is reported by the delegation step (§5.3 item 4).

When `tiers` names nothing for a demand on the identified host, the hint uses the host's defaults of §5.2.

### 5.2 Host Bindings

| Host (`lib/hosts.js`) | Identified by | Delegated agent | Session switch commands | Default tier per demand | Checked |
| --- | --- | --- | --- | --- | --- |
| Claude Code (`claude`) | `CLAUDECODE=1` | the agent tool with `model` and `effort` | `/model {model}`, `/effort {effort}` | `deep`: `opus`, `high` · `standard`: `sonnet`, `medium` · `light`: `haiku`, `low` | delegation and effort live (§1); the switch commands from the host's command list |
| Codex (`codex`) | `--host=codex` from the agent | `spawn_agent` with `model` and `reasoning_effort` | `/model` (one picker for the model and its effort) | effort only, the model inherited, as the tool prefers: `deep`: `high` · `standard`: `medium` · `light`: `low` | delegation from the recorded tool definition (§1); the switch command not checked |
| Qwen Code (`qwen`) | `--host=qwen` from the agent | not checked | not checked | none | nothing checked: no hint and no delegation unless the project's `tiers.hosts.qwen` states them |
| any other host | `--host={name}` from the agent | as the project's `tiers.hosts` states | as `tiers.hosts` states | none | — |

`[MODIFIED]` `lib/hosts.js` holds the table as data beside the host projections it already describes, one record per host, each capability carrying how it was checked; nothing else reads the environment for it. A record moves from *not checked* to checked when a live session of that host, or its own tool definition, has been read the way §1 records, and the change is an amendment of this specification. The project's `tiers.hosts` wins over the table for its host, so a project never waits for the engine to learn a host.

Delegation on a host whose delegated agent takes only a model, or only an effort, uses the part it takes and narrates the other as ignored in the `[DR]` line of §5.3 item 5. A host whose delegation tool takes neither runs every unit in the session.

### 5.3 Delegation Steps

With `delegate: true`, an identified host and a non-`inherit` tier for the stage's demand:

1. **`run`, the build of one task** (3.x Steps 3.1 to 3.3; 4.0 step 4). The session writes the brief — on a 4.0 workspace the pack file the builder already receives, on 3.x the task's entry, the sections of the specification it cites and the `Attempts` recorded against it — and starts one delegated agent on the tier with `@role:coder`'s card. The agent edits and reports what it changed and what it ran. The session then runs the reviews (Steps 3.4 to 3.6), the `Verify` lines or the `Observe` checks itself, and records the task; the delegated agent never writes the workbook, the ledger, live memory or a checkpoint.
2. **`simulate`, one scenario.** The delegated agent runs the scenario and reports each step's observation; the session compares with the expected results and records the findings.
3. **`task`, the decomposition draft.** The delegated agent drafts the tasks of the selected phase from the plan and the specifications; the session checks the draft against the plan's phase and the constitution (the task body's own checks) before it writes the ledger and the workbook.
4. **Failure and retry.** A unit whose verification fails, or a delegation the host refuses, is retried once in the session itself, and the retry is recorded as one `Attempts` line naming the tier that failed (3.x) or one `Open` line (4.0) — so a tier too weak for a project shows up in its records. A second failure is the task's ordinary failure.
5. **Narration.** The first delegation of an invocation prints one line: `[DR] Delegated {unit} to {model} at {effort} — demand {demand} (setting tiers). (Override: set "delegate": false in .magicspec/workspace.json)`. Later units of the same invocation are silent.

A tier above the session's own model or effort is run as `inherit`: the session knows its own model and effort, and judges the order by the host's own description of its models (on Claude Code `haiku` below `sonnet` below `opus`; on Codex the efforts in the order its tool lists them). Where the order cannot be judged, the tier is used as the project wrote it. `[MODIFIED]`

Parallel mode (C3) keeps its tracks: each track's builds may be delegated, and the orchestrator's serialization of shared files is unchanged.

### 5.4 The Switch Hint

`finalize` builds the handoff line as before ([l1-pipeline-stages.md](l1-pipeline-stages.md) §5.4). It takes the host from the environment marker or from `--host={name}`, which every body passes in its finalization step on a host without a marker (the agent names its own host). When the host is identified, has switch commands (§5.2 or `tiers.hosts`), and the next command's demand differs from the demand of the workflow being finalized (`--workflow`), it appends the hint for the next demand's tier, built from that host's own commands:

```plaintext
Next: /magicspec task engine — standard reasoning (switch: /model sonnet · /effort medium)     Claude Code
Next: /magicspec task engine — standard reasoning (switch: /model, effort medium)              Codex
```

`[MODIFIED]` A part the tier does not hold, or the host has no command for, is left out. The effort part is also left out when the host exposes the session's effort and it already equals the tier's (Claude Code: `CLAUDE_EFFORT`). A model part is always shown when the tier names a model, the session's model being unknown to a script. No hint for a demand of `per step`, for an unidentified host, for a host without switch commands, or when the demands are equal. Live memory's `Next Action` never carries the hint.

## 6. Implementation Notes

Deployment, routed to `/magicspec plan engine`:

| # | Touch-point | Change |
| --- | --- | --- |
| 1 | `skills/magicspec/scripts/lib/hosts.js` | The host-binding records of §5.2 (all three hosts, each capability with how it was checked) and one reader of `tiers` with its `hosts` overrides (§5.1). |
| 2 | `skills/magicspec/scripts/finalize.js` | `--host`, and the hint of §5.4 from the identified host's own commands. |
| 2a | `skills/magicspec/workflows/*.md` (the finalization step of the pipeline bodies) | Pass `--host={host}` on a host without an environment marker. `[ADDED]` |
| 3 | `skills/magicspec/scripts/check-prerequisites.js` | The warning for a `deep` tier other than `inherit`. |
| 4 | `skills/magicspec/workflows/run.md`, `simulate.md`, `task.md` | The delegation steps of §5.3, each one paragraph pointing at the setting; nothing changes when the setting is off. |
| 5 | `skills/magicspec/templates/` (the `workspace.json` seed of `init`) | No `tiers` key is written: the default is the absence. |
| 6 | `docs/` | One page section on the setting, with the facts of §1. |
| 7 | `tests/engine/` | The hint per host: Claude Code by `CLAUDECODE=1` (effort part dropped when `CLAUDE_EFFORT` matches), Codex by `--host=codex` (effort only), Qwen Code silent with no `tiers.hosts.qwen` and built from it when present, an unknown `--host` silent; absent on equal demands; the `tiers` reader's defaults and the `deep` warning. `[MODIFIED]` |
| 8 | `tests/suite/` | A `run` with `delegate: true` on a fixture, once as Claude Code and once as Codex: the build is delegated with the host's own parameters, the session runs the `Verify` itself, a failing build is retried once in the session with one `Attempts` line; on Qwen Code with no `tiers.hosts` nothing is delegated. `[MODIFIED]` |
| 9 | Live checks still owed | Codex's `/model` and the Qwen Code capabilities, in a live session of each, before their records change (§5.2). `[ADDED]` |

## 7. Drawbacks & Alternatives

- **The model in the router's frontmatter** — rejected: one model for every command, the opposite of the request.
- **Hidden per-command skills with their own model** — rejected for now (§2); the runner-up if the unforked case is ever verified and the owner reopens per-command entries.
- **Delegating `light` commands** — rejected: a cold agent reading the same files costs about what the session does, and the briefing must be relayed anyway.
- **Choosing the tier per task** (the planner estimating each task's difficulty) — rejected, as in [l1-pipeline-stages.md](l1-pipeline-stages.md) §7: an estimate with no check. The retry record of §5.3 item 4 gives the evidence a later per-task rule would need.
- **Defaults guessed for unchecked hosts** — rejected: a model name or a command invented for a host prints a hint the person cannot use and delegates with a parameter the host may refuse; a host earns its record by a check, and the project's `tiers.hosts` covers it meanwhile. `[ADDED]`
- **Engine-neutral tier names translated per host** — the runner-up of §2; it would make one setting serve every host, at the price of a translation table that every model release outdates. `[ADDED]`
- **Residual**: the delegation steps are prose the session follows; a session that ignores the setting runs everything itself, which is the behaviour before this specification, never a wrong result.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[HOSTS]` | `skills/magicspec/scripts/lib/hosts.js` | The router-table reader and the host records (§5.2) |
| `[FINALIZE]` | `skills/magicspec/scripts/finalize.js` | The handoff line and its hint (§5.4) |
| `[RUN]` | `skills/magicspec/workflows/run.md` | The build delegation (§5.3 item 1) |
| `[CONFIG]` | `.magicspec/workspace.json` | The `tiers` setting (§5.1) |
| `[REFERENCE-PROJECT]` | `.references/.tools/super-claude/.claude/` | The orchestrator-and-builders pattern studied (§1) |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.1.0 | 2026-11-27 | Agent | **Every host, not only Claude Code** (origin `user-stated`: the owner's remark of 2026-11-27 that users work with other agents too). The setting is keyed by the host names of `lib/hosts.js` and gains `tiers.hosts` (switch commands and delegation for a host the table does not hold or holds unchecked); the binding table holds Claude Code, Codex and Qwen Code, each capability with how it was checked (Codex's `spawn_agent` takes `model` and `reasoning_effort`, read from its recorded tool definition; Qwen Code nothing checked); a host without an environment marker is named by the agent (`finalize --host`); tiers hold the host's own words and may omit model or effort, the Codex default changing only the effort; the hint is built from the host's own commands. Live checks owed for Codex's `/model` and Qwen Code (§6 item 9). Stable retained after the Amendment Rule round trip (Post-Update Review). |
| 1.0.0 | 2026-11-27 | Agent | Created from the owner's list of 2026-11-27 (origin `user-stated`), after the check in the session (§1): the `tiers` setting with `inherit` defaults and `delegate` off, the Claude Code binding, the delegation of a task's build, a scenario and a decomposition draft with the session verifying and one retry in the session, and the switch hint on a demand change. Stable after the Post-Update Review. |
