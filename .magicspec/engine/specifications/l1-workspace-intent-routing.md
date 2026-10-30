# Workspace Intent Routing

**Version:** 3.0.0
**Status:** Stable
**Layer:** concept

## Overview

Defines how the engine decides which workspace a command acts on — the
workspace that receives newly authored or amended specifications, and, for
every other command, the registered workspace whose plan, tasks, rules or
findings it reads and writes. Establishes a deterministic chain that runs
**before** the existing `context.md` Workspace Resolution, routes by the code
locations a request touches before its topic, writes only into registered
workspaces, and resolves a demonstrable inconsistency between intent and
existing scopes by the Consequence Forecast (C27 DA-10), narrated as one
Decision Record — it asks nothing. `[MODIFIED]`

This specification supersedes the implicit "Zero-Prompt always silently picks
default" behaviour and resolves three production defects observed in the
field:

1. Spec files written into `.magicspec/` root instead of `.magicspec/{workspace}/`.
2. Spec files dispatched into a legacy workspace despite user input naming a
   new domain or stack.
3. No first-class API for creating an additional workspace inside an existing
   project.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Core engine workflows; this spec
  inserts a new pre-resolution stage and a workspace creation handler.
- [l2-engine-automation.md](l2-engine-automation.md) — Hosts the new
  `create-workspace` executor script.
- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) — Wrapper integration is
  unaffected; resolution remains `context.md`-driven.

## 1. Motivation

The current Workspace Resolution Chain (`skills/magicspec/references/context.md`) is a config-only
function: it consults `workspace.json` and the active argument. It never
inspects the user's stated intent. In single-workspace projects this is
silently incorrect — Priority 3 picks the only registered workspace even when
the user is clearly describing a different domain. In multi-workspace
projects the same defect manifests as silent dispatch to the default
workspace despite explicit signals naming a new scope.

Two further defects were found during root-cause analysis:

- `skills/magicspec/references/init.md` "Structure Created" diagram contradicts the actual
  per-workspace layout enforced by `init.js`. Agents reading the diagram
  reproduce the wrong shape.
- `skills/magicspec/scripts/executor.js` falls back to `.magicspec/` root when the named
  workspace directory is missing. A fresh `workspace.json` declaring
  `default: "main"` therefore routes all subsequent script calls into the
  global registry directory, where files accumulate at root.

A third, later field report (engine 2.1.58) found the diagram fix did not close WI-10 completely: the diagram's *shape* was corrected, but `init.md` §Step 2's prose and the Init Completion Checklist still claim `init.js` copies `STATE.md` from template during bootstrap. It does not — verified against engine 2.1.62, `initWorkspace()` creates `INDEX.md`, `specifications/`, `tasks/`, and `archives/tasks/` only. `STATE.md` is bootstrapped lazily, by `update-state.js`'s own template-copy branch, the first time any mutating workflow's SC-2 step runs ([l1-session-continuity.md](l1-session-continuity.md) SC-2: "adds the end-of-command guarantee"). Non-blocking — nothing downstream assumes `STATE.md` exists immediately after `init` — but an agent trusting the Completion Checklist would falsely conclude bootstrap failed. WI-10's original wording bound only the diagram; the same file has two more surfaces making the same class of claim.

The same false claim also sits inside `tests/suite.md`'s expected outcomes — T01 ("Post-init verification checks all 6 artifacts: `INDEX.md`, `RULES.md`, `STATE.md`, …"), T02 ("Post-init verification confirms all 6 artifacts present (including `STATE.md`)"), and T58 ("`.magicspec/main/` directory created with `INDEX.md`, `STATE.md`, …"). Because `magicspec-dev:test` evaluates these scenarios cognitively against the documented contract rather than by executing `init.js`, none of the three can currently catch this divergence — the suite's own expected outcome already assumes the wrong behavior. Correcting `init.md` without correcting these three scenarios would leave the cognitive suite asserting a fact its own source-of-truth (the corrected docs) no longer supports.

### 1.1 Routing for Every Command `[ADDED]`

The owner's list of 2026-10-29 asks for "normal" workspace routing, and chose
its meaning the same day: every command determines its workspace by the code
folders and the topic of the request, narrates the choice in one line, lets an
explicit workspace always win, and never writes into an unregistered folder.
Three facts make the change necessary:

1. **Only one command routes.** Detection runs in `spec` alone; `task`, `run`
   and `rule` take the explicit argument or the `default`, so in a project with
   several workspaces the person names the workspace on every command, and
   forgetting it acts on the default.
2. **The constitution and the shared module disagree.** C26 item 1 states that
   every workflow that creates or amends specifications, tasks or rules runs
   detection; `references/context.md` Step 0 states that only `spec` does and
   that the planning and rule workflows skip it. Both texts are in force.
3. **An artifact landed outside every workspace.** A consumer project
   (engine 2.x, 2026-05) holds a phase journal under a state-folder directory
   named `engine` that its `workspace.json` does not register — the name of
   this repository's own workspace. Probable cause (unverified): shipped
   examples use `engine` as the sample workspace name.

## 2. Constraints & Assumptions

- Detection runs in the agent's reasoning pass — no NLP service, no model
  call beyond what already happens during prompt evaluation.
- Detection must be **deterministic given identical input** so that
  simulations and tests are reproducible.
- Trust Mode (C9) remains the default disposition: detection always
  produces a routing decision without prompting; an objective ambiguity
  (WI-4) is resolved by the forecast. `[MODIFIED]`
- The agent may write a workspace creation outcome (new entry in
  `workspace.json`, new `.magicspec/{name}/` directory tree) only via the
  documented `create-workspace` executor script. Inline `mkdir` from
  workflows is forbidden (C7 Universal Script Executor).
- The chain is additive: existing Priority 1 (explicit `--workspace=` arg)
  and Priority 2 (`MAGIC_WORKSPACE` env) override detection without
  exception.

## 3. Core Invariants

The following invariants govern any Layer 2 implementation:

- **WI-1 — Intent Stage Precedence**: Workspace Intent Detection runs
  immediately after the calling workflow has parsed user input and **before**
  `context.md` Workspace Resolution. Outputs are one of:
  `existing:{name}` · `create:{name}` · `ambiguous`; `ambiguous` is
  resolved by the WI-4 forecast into one of the other two, or no dispatch.

- **WI-2 — Signal Classes (closed set)**: Detection considers exactly three
  classes of signal in the user's most recent input message and the active
  spec/task argument:

  1. **Explicit creation intent**: input states the goal of creating or
     adding a workspace. Reference anchors: `new workspace`, `separate
     workspace`, `another workspace`, `add a workspace`. Detection is
     semantic — the agent recognises equivalent phrasings in any natural
     language it understands. Match → output `create:{inferred}` if a
     name can be inferred from the same message; otherwise `ambiguous`.
  2. **Stack/platform delta**: input names a stack, platform, runtime, or
     deployment target (`mobile`, `iOS`, `Android`, `Go backend`, `Rust
     rewrite`, `web`, `cli`, `worker`, …) that does not appear in any
     existing workspace's `description`, `scope`, or registered specs. Match
     → output `create:{normalized-token}`.
  3. **Domain delta**: input names a top-level domain or product surface
     (`landing`, `admin`, `mobile-app`, `analytics`, …) absent from every
     existing workspace's lexicon. Match → output `create:{normalized-token}`.

  Inputs containing none of the above produce no signal; the chain proceeds
  to `context.md` resolution for `existing:{resolved}`.

- **WI-3 — Lexicon Source**: A workspace's lexicon is the union of:

  - keys: `description`, `scope` (path segments only) from `workspace.json`;
  - filenames in `.magicspec/{workspace}/specifications/` (suffix-stripped, layer
    prefix removed);
  - top-level headings (`# {Name}`) of those spec files when readable in the
    current pass.

  The lexicon is computed lazily; in DEGRADING/POOR context tier the agent
  may read only `workspace.json` and INDEX.md filenames.

- **WI-4 — Ambiguity Gate (Forecast)** `[MODIFIED]`: The chain emits
  `ambiguous` only when:

  1. A creation signal is present, AND
  2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30% (token
     prefix or stem match), AND
  3. No explicit creation token was used —

  or when an explicit creation token carries no inferable name (WI-2.1).
  The route is then chosen by the Consequence Forecast (C27 DA-10) among
  `create:{X}`, `existing:{Y}` and no dispatch:

  - *Wrong premise* weighs a spurious workspace against a misrouted spec:
    undoing a creation removes a directory and a registry entry — a
    deletion that needs consent (E1) — while moving a misrouted spec later
    is one rename and two registry rows. `existing:{Y}` therefore has the
    lower worst case and wins; between existing workspaces, the one with
    the higher lexicon fit wins (the lower cost in *Expected*). A probe —
    reading the Overview of the overlapping spec — that finds a name
    collision only removes the overlap: the case is then C1 or D1 and
    creates without the gate.
  - An explicit creation request without a name makes `existing:{Y}`
    contradict the requester's words — a Blocker — so `create` wins, under
    a name inferred from the surrounding turns or the topic being
    dispatched (else `workspace-{n}`), recorded as the premise.
  - No dispatch carries a stall and wins only if every other candidate
    meets a Blocker.

  In every other case the chain proceeds without the gate.

- **WI-5 — Narration Instead of a Menu** `[MODIFIED]`: WI-4 asks nothing;
  the single C25 exception it used to hold is retired. The forecast is
  narrated as one line — `[DR] Routed '{artifact}' to '{winner}' —
  {criterion}; worst case if wrong: {cost}; runner-up: {candidate}.
  (Override: /magicspec:spec {runner-up-workspace} …)` — and the routing premise
  is recorded in the dispatched specification's `Constraints & Assumptions`
  as an `Assumption (forecast)` bullet, so a misroute is visible where the
  work lands.

- **WI-6 — Creation Atomicity**: When the chain outputs `create:{name}` (or
  the WI-4 forecast picks it), the implementation MUST:

  1. Validate `{name}` against the existing workspace name regex
     (`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`).
  2. Add an entry under `workspace.json#workspaces.{name}` with a `description`
     auto-derived from the triggering signal.
  3. Create `.magicspec/{name}/` with the standard subtree
     (`specifications/`, `tasks/`, `archives/tasks/`, `INDEX.md`).
  4. If `workspace.json#default` is unset, leave it unset (do NOT auto-promote
     the new workspace to default — the existing workspace remains canonical).
  5. Emit a single narration line: `[Workspace] Created '{name}' for {reason}.
     Dispatching {artifact} now.`

  These steps are atomic — failure of any sub-step rolls back the others.

- **WI-7 — Workspace Fit Validation (Second Contour)**: When the chain
  outputs `existing:{Y}`, the implementation MUST validate fit before
  dispatching:

  1. Compute domain match score between the artifact's filename / overview
     terms and the resolved workspace's lexicon.
  2. If score < 0.30 AND the workspace is multi-workspace registered, emit a
     `[Workspace Fit Warning]` and re-enter the WI-4 forecast with the same
     three candidates. This catches misroutes the detection stage missed.
  3. In single-workspace projects the warning is informational only; the
     dispatch proceeds.

- **WI-8 — Reversibility**: Every routing decision is reversible by `git
  restore .magicspec/workspace.json` plus deletion of the new workspace
  directory. The narration line at WI-6 step 5 satisfies C25 revert-hint
  convention by appending: `(Revert: git restore .magicspec/workspace.json &&
  rm -rf .magicspec/{name})`.

- **WI-9 — Executor Auto-mkdir**: When `executor.js` resolves a workspace
  name registered in `workspace.json` whose directory does not yet exist,
  it MUST create the standard subtree (per WI-6 step 3) before dispatching
  the script — replacing the current silent fallback to `.magicspec/` root.

- **WI-10 — Documentation Parity**: `skills/magicspec/references/init.md` MUST accurately describe
  what `init.js` produces, on **every surface where it makes that claim** —
  the "Structure Created" diagram, the numbered Steps narrative, and the Init
  Completion Checklist — not the diagram alone. A claim about *when* an
  artifact is created is bound by this invariant exactly as a claim about
  *whether* it is created; both are load-bearing for an agent deciding what to
  verify after `init` runs. Any divergence between a documented claim and
  actual init output is a release blocker. `[MODIFIED]`

- **WI-11 — Every Command Routes** `[ADDED]`: Every command that acts on one
  workspace's artifacts resolves that workspace through one shared chain, in
  this order: explicit argument → `MAGIC_WORKSPACE` → location signal (WI-12)
  → topic signal (the WI-3 lexicon, scored as in WI-7, ≥ 0.30 required) →
  work in flight (the one workspace whose live memory records an
  `In Progress` task, when exactly one does) → `default` → Workspace
  Disambiguation. Only `spec` — and `goal` through it — may create a
  workspace (WI-2, WI-4, WI-6); every other command routes among registered
  workspaces only. A read-only command that reports on every workspace
  (`status`, `graph`) keeps doing so. This chain supersedes the statement in
  `references/context.md` Step 0 that only `spec` runs detection; C26 item 1
  already states the rule.

- **WI-12 — Location Signal** `[ADDED]`: The paths a request names or a
  piece of work touches — paths in the prose, the files a task changes, the
  files a defect report cites — are matched against every workspace's
  `scope`. Each path belongs to the workspace whose scope entry matches it
  most specifically (the longest matching prefix or pattern). The workspace
  with the most matched paths wins; a tie falls through to the topic signal.
  The match is computed from the paths by the engine, not judged, so
  identical input routes identically. Paths matched by no scope give no
  signal; a workspace with an empty `scope` covers no path by this signal.
  It is a routing signal among registered workspaces, not a creation signal:
  WI-2's closed set is unchanged.

- **WI-13 — Narrated Once** `[ADDED]`: In a project with more than one
  workspace, the resolved workspace and the signal that chose it are narrated
  once per invocation — `[Workspace] {name} — {signal}. (Override:
  /magicspec:{command} {other} …)` — and when matched paths also fell to
  other workspaces, those are named in the same line. A single-workspace
  project routes silently.

- **WI-14 — Registered Folders Only** `[ADDED]`: No artifact is written under
  a state-folder directory that `workspace.json` does not register. An
  unregistered name — in an argument, the environment, a script flag or an
  agent-composed path — stops the command with the list of registered
  workspaces; every script that writes a per-workspace file applies the same
  check before writing. Shipped examples never use a real workspace name of
  the engine's own repository; they use a placeholder (`{workspace}`).

## 4. Status Lifecycle Hooks

This spec inserts no new status; existing Draft/RFC/Stable/Deprecated lifecycle
applies unchanged. Workspace creation does not alter the spec status of any
existing artifact.

## 5. Interaction Outcomes (closed enumeration)

For deterministic simulation, the chain produces exactly these outcomes:

| Code | User input shape | Existing workspaces | Outcome |
| --- | --- | --- | --- |
| **A1** `[MODIFIED]` | Generic spec text | 0 (no `workspace.json`) | Transient: auto-init creates the default workspace (`context.md` Priority 4), then A2 applies; nothing is written to the state-folder root (WI-14). |
| **A2** | Generic spec text | 1, no signal | Use sole workspace (Priority 3 unchanged). |
| **A3** | Generic spec text | N, default set | Use default (Priority 3 unchanged). |
| **A4** | Generic spec text | N, no default | Run existing Disambiguation (`context.md` §Workspace Disambiguation). |
| **B1** | Explicit creation token + name | any | `create:{name}` per WI-2.1, no question. |
| **B2** | Explicit creation token, no name | any | `ambiguous` → WI-4 forecast: `create:{inferred}` (the explicit request rules out `existing`); the name is the premise. |
| **C1** | Stack/platform signal, no overlap | any | `create:{token}` per WI-2.2, no question. |
| **C2** | Stack/platform signal, overlap ≥30% | any | `ambiguous` → WI-4 forecast: `existing:{Y}`; a probe showing a name collision only turns the case into C1. |
| **D1** | Domain signal, no overlap | any | `create:{token}` per WI-2.3, no question. |
| **D2** | Domain signal, overlap ≥30% | any | `ambiguous` → WI-4 forecast: `existing:{Y}`; a probe showing a name collision only turns the case into D1. |
| **E1** | Any | resolved workspace fit ≥0.30 | Dispatch normally. |
| **E2** | Any | resolved workspace fit <0.30 (multi-ws) | WI-7 warning → re-enter the WI-4 forecast: the best-fitting existing workspace; no creation without a creation signal. |
| **F1** | `--workspace=X` arg | any | Use X (Priority 1 unchanged); skip detection entirely. |
| **F2** | `MAGIC_WORKSPACE=X` env | any | Use X (Priority 2 unchanged); skip detection entirely. |
| **G1** `[ADDED]` | Any command; paths matching one workspace's scope | N | That workspace (WI-12); narrated (WI-13). |
| **G2** `[ADDED]` | Any command; paths matching several workspaces | N | Most matched paths wins; the others named in the narration (WI-13); a tie → topic signal. |
| **G3** `[ADDED]` | A command other than `spec`; no paths, topic fits one workspace | N | That workspace by the topic signal (WI-11); never a creation. |
| **G4** `[ADDED]` | Unregistered workspace name in an argument, the environment or a script flag | any | Stop with the list of registered workspaces (WI-14); nothing written. |

These sixteen outcomes are the canonical simulation matrix. Any Layer 2
implementation MUST reproduce these outcomes given the matching input.

## 6. Drawbacks & Alternatives

**Drawback — Lexicon false negatives**: If a user's existing workspace
covers `mobile` work but the spec dir is empty and `workspace.json` lacks
`mobile` in `description`/`scope`, the new spec for "mobile auth" will be
routed to `create:mobile`. Mitigation: WI-4's overlap check uses prefix/stem
matching against spec filenames; once one mobile spec exists, future routing
is correct. The first creation is the cost of ambiguity.

**Drawback — Multilingual robustness**: WI-2.1 lists English exemplars but
detection is semantic — the agent recognises creation intent in any
natural language it understands without a hardcoded token table. The risk
is that a low-resource language paraphrase may slip through; mitigation is
the WI-7 second contour, which catches mis-routed dispatches by lexicon
overlap regardless of the input language.

**Alternative — User-Edited workspace.json only**: Force the user to edit
`workspace.json` manually before any new-scope work. Rejected: contradicts
C9 Trust Mode and adds friction the engine can eliminate.

**Alternative — Auto-create on every signal, no gate**: Aggressive but
risks creating spurious workspaces from casual mentions. Rejected: WI-4's
overlap gate is a cheap insurance policy against fragmentation.

**Alternative — keep the WI-4 question** `[ADDED]`: rejected in 2.0.0. The
question stalls the pipeline in every case, including the common one where
its marked default was right; the forecast reaches the same default
(`existing:{Y}`) without the stall, honours an explicit creation request as
a Blocker against `existing`, and makes a misroute visible as a recorded
premise in the dispatched specification.

**Alternative — Make `init.js` create `STATE.md` eagerly, matching the old doc claim** — rejected in favor of fixing the documentation instead. `update-state.js` already owns template instantiation (placeholder substitution, default field values); duplicating that logic in `init.js` would be two code paths doing the same job, the exact drift mechanism this file's other two field reports already trace to. [l1-session-continuity.md](l1-session-continuity.md) SC-2 independently guarantees `STATE.md` exists by the end of the first mutating command regardless of `init`, so eager creation would add a redundant code path to close a gap that is, in practice, already closed.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CONTEXT]` | `skills/magicspec/references/context.md` | Hosts the new Step 0 Workspace Intent Detection block; WI-11 widens it from `spec` to every command. |
| `[TASK-WORKFLOW]` | `skills/magicspec/workflows/task.md` | Argument Routing, whose sample workspace name WI-14 replaces with a placeholder. |
| `[INIT-DOC]` | `skills/magicspec/references/init.md` | Hosts the corrected Structure Created diagram, Step 2 narrative, and Completion Checklist (WI-10). |
| `[INIT-SCRIPT]` | `skills/magicspec/scripts/init.js` | Hosts the standalone `--workspace={name}` CLI mode. |
| `[CREATE-WS]` | `skills/magicspec/scripts/create-workspace.js` | New executor script implementing WI-6 atomicity. |
| `[EXECUTOR]` | `skills/magicspec/scripts/executor.js` | Hosts WI-9 auto-mkdir replacement for the silent fallback. |
| `[SPEC-WORKFLOW]` | `skills/magicspec/workflows/spec.md` | Hosts the new Workspace Creation flow + WI-7 fit validation. |
| `[WS-CONFIG]` | `.magicspec/workspace.json` | Mutated by WI-6 step 2 atomically with directory creation. |
| `[SIM-MATRIX]` | `specifications/simulations/workspace-intent-routing.md` | Cognitive simulation matrix validating the twelve canonical outcomes (§5) against representative inputs across the Baseline-Z/S/M setups. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 3.0.0 | 2026-10-29 | Agent | **Routing for every command** (scope change, origin `user-stated`: the owner chose "automatic in every command" on 2026-10-29 among the intake survey's three readings): new §1.1 and WI-11 to WI-14 — one shared chain for every command acting on one workspace, with only `spec` (and `goal` through it) allowed to create; a location signal computed from the paths a request touches against each workspace's `scope`, ahead of the topic signal; one narration line in multi-workspace projects; no write into an unregistered state-folder directory, and no shipped example naming this repository's own workspace. Resolves the contradiction between C26 item 1 and `context.md` Step 0 in favour of C26. Outcomes G1–G4 added (sixteen in all). Amendment Rule: `Stable → RFC`, re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 2.0.3 | 2026-10-28 | Agent | Reality sync for the state folder rename: the folder is `.magicspec/` in all engine, maintenance and workspace text. No requirement changed. |
| 2.0.2 | 2026-10-28 | Agent | Reality sync for the maintenance layout: the maintenance folders (`scripts/`, `tests/`, `skills/magicspec-dev/`) and the `/magicspec-dev:` command names follow the move out of `dev/` and the dotted names. No requirement changed. |
| 2.0.1 | 2026-10-28 | Agent | Reality sync for the single-skill layout: engine paths and command names follow `skills/magicspec/` and the `/magicspec:` form. No requirement changed. |
| 2.0.0 | 2026-10-01 | Agent | **WI-4 forecasts instead of asking** (breaking): the gate's three conditions stay, and an explicit creation token without a name also enters it; the route is chosen by the Consequence Forecast (C27 DA-10) among `create`, `existing` and no dispatch — `existing:{Y}` by default (moving a spec later is cheaper than undoing a workspace, whose removal needs a deletion consent), the best-fitting existing workspace between several, and `create` when the requester explicitly asked to create (a Blocker against `existing`); a probe that finds a name collision only turns C2/D2 into C1/D1. WI-5 retires the C25 exception: the route is narrated as a `[DR]` and its premise recorded in the dispatched spec. WI-1, WI-6, WI-7 and the §5 outcomes B2, C2, D2, E2 follow; §6 records the rejected alternative. Owner directive of 2026-10-01 discharges the E4 event ([l1-decision-autonomy.md](l1-decision-autonomy.md) 2.0.0). Amendment Rule applied — reverted to `RFC`, re-promoted to `Stable` after the Post-Update Review in the same invocation, which fixed one finding: *Safety & Boundary* — outcome B2 (creation requested, no name) would have defaulted to `existing:{Y}` against the requester's explicit words; the contradiction is now a Blocker and B2 creates under the inferred name. Simulating the §5 outcomes against the forecast (the companion matrix) found two more: undoing a creation needs a deletion consent, so `create` cannot be the cheap default it first appeared to be after a probe — a name-collision probe now reclassifies C2/D2 as C1/D1 instead; and E2 had no rule between several existing workspaces — the better fit wins. The companion matrix's own E2 example was a D1 case (a domain delta absent from every lexicon); its input is replaced. |
| 1.1.1 | 2026-08-07 | Agent | Registered `[SIM-MATRIX]` Canonical Reference for `specifications/simulations/workspace-intent-routing.md` — the cognitive simulation matrix backing §5's twelve canonical outcomes was present on disk but unregistered, landing `UNCOVERED` in `analyze-coverage.js` (ventilation finding). No content change to the simulation file itself; registry linkage only. |
| 1.1.0 | 2026-08-06 | Agent | Broadened **WI-10** from "the diagram must match" to "every surface in `init.md` claiming what/when `init` produces must match" — a claim about *timing* is bound exactly as a claim about *existence*. §1 gained a third field-report defect: `init.md` §Step 2 and the Completion Checklist claim `init.js` bootstraps `STATE.md`; verified against engine 2.1.62, it does not — `STATE.md` is lazily bootstrapped by `update-state.js` on the first mutating workflow's SC-2 step. The same false claim was also found baked into `dev/tests/suite.md`'s expected outcomes (T01, T02, T58), which `magic.dev.simulate` cannot catch because it evaluates cognitively against the documented contract rather than by executing `init.js` — all three scenarios need their expected-outcome text corrected alongside `init.md`. §6 gained the rejected alternative (make `init.js` create it eagerly instead) and why: `update-state.js` already owns template instantiation, duplicating it would recreate the exact doc/code drift mechanism this spec exists to close, and SC-2 already guarantees existence by the first command regardless. Canonical Reference for `[INIT-DOC]` extended to name all three affected surfaces. Field report against engine 2.1.58. |
| 1.0.0 | 2026-05-07 | Agent | Initial stable specification — addresses workspace dispatch defects observed in field reports. |
