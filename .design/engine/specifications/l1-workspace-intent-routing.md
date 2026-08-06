# Workspace Intent Routing

**Version:** 1.1.0
**Status:** Stable
**Layer:** concept

## Overview

Defines how the engine decides which workspace receives newly authored or
amended specifications. Establishes a deterministic chain that runs **before**
the existing `context.md` Workspace Resolution and surfaces a single
clarifying question only when intent and existing scopes are demonstrably
inconsistent.

This specification supersedes the implicit "Zero-Prompt always silently picks
default" behaviour and resolves three production defects observed in the
field:

1. Spec files written into `.design/` root instead of `.design/{workspace}/`.
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

The current Workspace Resolution Chain (`.magic/context.md`) is a config-only
function: it consults `workspace.json` and the active argument. It never
inspects the user's stated intent. In single-workspace projects this is
silently incorrect — Priority 3 picks the only registered workspace even when
the user is clearly describing a different domain. In multi-workspace
projects the same defect manifests as silent dispatch to the default
workspace despite explicit signals naming a new scope.

Two further defects were found during root-cause analysis:

- `.magic/init.md` "Structure Created" diagram contradicts the actual
  per-workspace layout enforced by `init.js`. Agents reading the diagram
  reproduce the wrong shape.
- `.magic/scripts/executor.js` falls back to `.design/` root when the named
  workspace directory is missing. A fresh `workspace.json` declaring
  `default: "main"` therefore routes all subsequent script calls into the
  global registry directory, where files accumulate at root.

A third, later field report (engine 2.1.58) found the diagram fix did not close WI-10 completely: the diagram's *shape* was corrected, but `init.md` §Step 2's prose and the Init Completion Checklist still claim `init.js` copies `STATE.md` from template during bootstrap. It does not — verified against engine 2.1.62, `initWorkspace()` creates `INDEX.md`, `specifications/`, `tasks/`, and `archives/tasks/` only. `STATE.md` is bootstrapped lazily, by `update-state.js`'s own template-copy branch, the first time any mutating workflow's SC-2 step runs ([l1-session-continuity.md](l1-session-continuity.md) SC-2: "adds the end-of-command guarantee"). Non-blocking — nothing downstream assumes `STATE.md` exists immediately after `init` — but an agent trusting the Completion Checklist would falsely conclude bootstrap failed. WI-10's original wording bound only the diagram; the same file has two more surfaces making the same class of claim.

The same false claim also sits inside `dev/tests/suite.md`'s expected outcomes — T01 ("Post-init verification checks all 6 artifacts: `INDEX.md`, `RULES.md`, `STATE.md`, …"), T02 ("Post-init verification confirms all 6 artifacts present (including `STATE.md`)"), and T58 ("`.design/main/` directory created with `INDEX.md`, `STATE.md`, …"). Because `magic.dev.simulate` evaluates these scenarios cognitively against the documented contract rather than by executing `init.js`, none of the three can currently catch this divergence — the suite's own expected outcome already assumes the wrong behavior. Correcting `init.md` without correcting these three scenarios would leave the cognitive suite asserting a fact its own source-of-truth (the corrected docs) no longer supports.

## 2. Constraints & Assumptions

- Detection runs in the agent's reasoning pass — no NLP service, no model
  call beyond what already happens during prompt evaluation.
- Detection must be **deterministic given identical input** so that
  simulations and tests are reproducible.
- Trust Mode (C9) remains the default disposition: detection produces a
  routing decision without prompting **unless** at least one objective
  ambiguity gate triggers.
- The agent may write a workspace creation outcome (new entry in
  `workspace.json`, new `.design/{name}/` directory tree) only via the
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
  `existing:{name}` · `create:{name}` · `ambiguous`.

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
  - filenames in `.design/{workspace}/specifications/` (suffix-stripped, layer
    prefix removed);
  - top-level headings (`# {Name}`) of those spec files when readable in the
    current pass.

  The lexicon is computed lazily; in DEGRADING/POOR context tier the agent
  may read only `workspace.json` and INDEX.md filenames.

- **WI-4 — Ambiguity Gate**: The chain emits `ambiguous` and asks ONE
  question (multiple-choice, no free-text) only when:

  1. A creation signal is present, AND
  2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30% (token
     prefix or stem match), AND
  3. No explicit creation token was used.

  In every other case the chain proceeds without a question.

- **WI-5 — Engineer Posture Exception**: WI-4's question is the **single**
  exception to C25 Engineer Posture for chat output during specification
  authoring. The question MUST be phrased as a multiple-choice menu of three
  options: `(1) create:{X}` · `(2) dispatch to existing:{Y}` · `(3) cancel`.
  Free-text follow-up is NOT permitted; the user picks an option or cancels.

- **WI-6 — Creation Atomicity**: When the chain outputs `create:{name}` (or
  the user picks option 1 at WI-4), the implementation MUST:

  1. Validate `{name}` against the existing workspace name regex
     (`^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`).
  2. Add an entry under `workspace.json#workspaces.{name}` with a `description`
     auto-derived from the triggering signal.
  3. Create `.design/{name}/` with the standard subtree
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
     `[Workspace Fit Warning]` and re-enter the WI-4 question with the same
     three options. This catches misroutes the detection stage missed.
  3. In single-workspace projects the warning is informational only; the
     dispatch proceeds.

- **WI-8 — Reversibility**: Every routing decision is reversible by `git
  restore .design/workspace.json` plus deletion of the new workspace
  directory. The narration line at WI-6 step 5 satisfies C25 revert-hint
  convention by appending: `(Revert: git restore .design/workspace.json &&
  rm -rf .design/{name})`.

- **WI-9 — Executor Auto-mkdir**: When `executor.js` resolves a workspace
  name registered in `workspace.json` whose directory does not yet exist,
  it MUST create the standard subtree (per WI-6 step 3) before dispatching
  the script — replacing the current silent fallback to `.design/` root.

- **WI-10 — Documentation Parity**: `.magic/init.md` MUST accurately describe
  what `init.js` produces, on **every surface where it makes that claim** —
  the "Structure Created" diagram, the numbered Steps narrative, and the Init
  Completion Checklist — not the diagram alone. A claim about *when* an
  artifact is created is bound by this invariant exactly as a claim about
  *whether* it is created; both are load-bearing for an agent deciding what to
  verify after `init` runs. Any divergence between a documented claim and
  actual init output is a release blocker. `[MODIFIED]`

## 4. Status Lifecycle Hooks

This spec inserts no new status; existing Draft/RFC/Stable/Deprecated lifecycle
applies unchanged. Workspace creation does not alter the spec status of any
existing artifact.

## 5. Interaction Outcomes (closed enumeration)

For deterministic simulation, the chain produces exactly these outcomes:

| Code | User input shape | Existing workspaces | Outcome |
| --- | --- | --- | --- |
| **A1** | Generic spec text | 0 (no `workspace.json`) | Use `.design/` root (Priority 4 unchanged). |
| **A2** | Generic spec text | 1, no signal | Use sole workspace (Priority 3 unchanged). |
| **A3** | Generic spec text | N, default set | Use default (Priority 3 unchanged). |
| **A4** | Generic spec text | N, no default | Run existing Disambiguation (`context.md` §Workspace Disambiguation). |
| **B1** | Explicit creation token + name | any | `create:{name}` per WI-2.1, no question. |
| **B2** | Explicit creation token, no name | any | `ambiguous` → ask WI-4 question with inferred candidates. |
| **C1** | Stack/platform signal, no overlap | any | `create:{token}` per WI-2.2, no question. |
| **C2** | Stack/platform signal, overlap ≥30% | any | `ambiguous` → ask WI-4 question. |
| **D1** | Domain signal, no overlap | any | `create:{token}` per WI-2.3, no question. |
| **D2** | Domain signal, overlap ≥30% | any | `ambiguous` → ask WI-4 question. |
| **E1** | Any | resolved workspace fit ≥0.30 | Dispatch normally. |
| **E2** | Any | resolved workspace fit <0.30 (multi-ws) | WI-7 warning → re-enter WI-4 question. |
| **F1** | `--workspace=X` arg | any | Use X (Priority 1 unchanged); skip detection entirely. |
| **F2** | `MAGIC_WORKSPACE=X` env | any | Use X (Priority 2 unchanged); skip detection entirely. |

These twelve outcomes are the canonical simulation matrix. Any Layer 2
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

**Alternative — Auto-create on every signal, no question**: Aggressive but
risks creating spurious workspaces from casual mentions. Rejected: WI-4's
overlap gate is a cheap insurance policy against fragmentation.

**Alternative — Make `init.js` create `STATE.md` eagerly, matching the old doc claim** — rejected in favor of fixing the documentation instead. `update-state.js` already owns template instantiation (placeholder substitution, default field values); duplicating that logic in `init.js` would be two code paths doing the same job, the exact drift mechanism this file's other two field reports already trace to. [l1-session-continuity.md](l1-session-continuity.md) SC-2 independently guarantees `STATE.md` exists by the end of the first mutating command regardless of `init`, so eager creation would add a redundant code path to close a gap that is, in practice, already closed.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CONTEXT]` | `.magic/context.md` | Hosts the new Step 0 Workspace Intent Detection block. |
| `[INIT-DOC]` | `.magic/init.md` | Hosts the corrected Structure Created diagram, Step 2 narrative, and Completion Checklist (WI-10). |
| `[INIT-SCRIPT]` | `.magic/scripts/init.js` | Hosts the standalone `--workspace={name}` CLI mode. |
| `[CREATE-WS]` | `.magic/scripts/create-workspace.js` | New executor script implementing WI-6 atomicity. |
| `[EXECUTOR]` | `.magic/scripts/executor.js` | Hosts WI-9 auto-mkdir replacement for the silent fallback. |
| `[SPEC-WORKFLOW]` | `.magic/spec.md` | Hosts the new Workspace Creation flow + WI-7 fit validation. |
| `[WS-CONFIG]` | `.design/workspace.json` | Mutated by WI-6 step 2 atomically with directory creation. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.1.0 | 2026-08-06 | Agent | Broadened **WI-10** from "the diagram must match" to "every surface in `init.md` claiming what/when `init` produces must match" — a claim about *timing* is bound exactly as a claim about *existence*. §1 gained a third field-report defect: `init.md` §Step 2 and the Completion Checklist claim `init.js` bootstraps `STATE.md`; verified against engine 2.1.62, it does not — `STATE.md` is lazily bootstrapped by `update-state.js` on the first mutating workflow's SC-2 step. The same false claim was also found baked into `dev/tests/suite.md`'s expected outcomes (T01, T02, T58), which `magic.dev.simulate` cannot catch because it evaluates cognitively against the documented contract rather than by executing `init.js` — all three scenarios need their expected-outcome text corrected alongside `init.md`. §6 gained the rejected alternative (make `init.js` create it eagerly instead) and why: `update-state.js` already owns template instantiation, duplicating it would recreate the exact doc/code drift mechanism this spec exists to close, and SC-2 already guarantees existence by the first command regardless. Canonical Reference for `[INIT-DOC]` extended to name all three affected surfaces. Field report against engine 2.1.58. |
| 1.0.0 | 2026-05-07 | Agent | Initial stable specification — addresses workspace dispatch defects observed in field reports. |
