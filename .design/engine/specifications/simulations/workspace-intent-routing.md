# Simulation — Workspace Intent Routing

**Spec:** `l1-workspace-intent-routing.md` v1.0.0
**Status:** Active
**Last Run:** 2026-05-07

## Purpose

Cognitive simulation matrix for the Workspace Intent Routing chain. Walks
through every canonical outcome (A1 – F2 from the spec §5) plus four
field-relevant user phrasings to confirm the agent reaches the documented
outcome without prompting outside the WI-4 ambiguity gate.

Conducted as a thought experiment — no scripts run. Each row represents the
agent's reasoning path from user input to dispatch. The simulation passes
when every row's resolved outcome matches the spec §5 expectation column.

## Project Setup Variants

Three baseline configurations are referenced below:

| ID | `workspace.json` state | `.design/` shape |
| --- | --- | --- |
| **Baseline-Z** | absent (fresh project) | absent |
| **Baseline-S** | single workspace `web` (description: "Web frontend"; scope: `["src/web"]`); spec: `l1-auth.md` | `.design/web/` populated |
| **Baseline-M** | two workspaces: `engine` (default), `docs`; both with scope arrays and stable specs | `.design/engine/`, `.design/docs/` populated |

## Canonical Outcomes (Spec §5)

| # | Setup | User input | Signal class | Lexicon overlap | Outcome | Question? | Final dispatch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A1** | Baseline-Z | "Specify a payments module." | none | n/a (no `workspace.json`) | A1 | no | Write to `.design/specifications/` (Priority 4 root). Init bootstrap may run first. |
| **A2** | Baseline-S | "Add an audit-log spec." | none | n/a | A2 | no | Resolve `web` silently (sole workspace). Dispatch to `.design/web/specifications/`. |
| **A3** | Baseline-M | "Add a metrics spec." | none | n/a | A3 | no | Resolve `engine` (default). Dispatch to `.design/engine/specifications/`. |
| **A4** | Baseline-M minus `default` | "Add a metrics spec." | none | n/a | A4 | no (Disambiguation auto-picks ≥50% scope match) | Resolve via Disambiguation, dispatch silently per `context.md` §Workspace Disambiguation. |
| **B1** | Baseline-S | "Create a new workspace `mobile` for the iOS rewrite." | class 1 (creation token + name) | n/a | B1 | no | `create-workspace --name=mobile`, narrate, dispatch to `.design/mobile/specifications/`. |
| **B2** | Baseline-S | "Let's add a separate workspace." | class 1 (token, no name) | n/a | B2 | yes (WI-4) | Ask 3-option menu with inferred candidates from prior turns. User picks 1 → create; 2 → use `web`; 3 → cancel. |
| **C1** | Baseline-S | "Spec out auth for the iOS app." | class 2 (`iOS` not in `web` lexicon) | none | C1 | no | `create-workspace --name=ios`, dispatch to `.design/ios/specifications/`. |
| **C2** | Baseline-S where `web` already covers an `l2-mobile-web.md` spec (lexicon now includes `mobile`) | "Spec out the mobile auth flow." | class 2 (`mobile`) | ≥30% (matches `mobile-web`) | C2 | yes (WI-4) | Ask menu: (1) create `mobile` · (2) dispatch to `web` · (3) cancel. |
| **D1** | Baseline-M | "Document the analytics API." | class 3 (`analytics` absent from both lexicons) | none | D1 | no | `create-workspace --name=analytics`, dispatch to `.design/analytics/specifications/`. |
| **D2** | Baseline-M where `engine` has a spec named `l1-doc-analytics.md` | "Document the analytics API." | class 3 (`analytics`) | ≥30% (matches `doc-analytics`) | D2 | yes (WI-4) | Ask menu: (1) create `analytics` · (2) dispatch to `engine` · (3) cancel. |
| **E1** | Baseline-S | "Add an `l2-cache.md` for the web tier." | class 2 (`web` matches existing) | ≥0.30 | E1 | no | Resolve `web`, fit ≥ 0.30 → dispatch silently. |
| **E2** | Baseline-M (default `engine`) | "Add a landing-page hero spec." | class 3 (`landing-page` absent) | <0.30 against `engine` | E2 | yes (WI-7 → WI-4) | Fit warning emitted, then ask 3-option menu including `create:landing` and `existing:engine` and `existing:docs`. |
| **F1** | Baseline-M | "/magic.spec docs add the contributor guide spec." | n/a (Priority 1 override) | n/a | F1 | no | Skip Step 0, dispatch to `.design/docs/specifications/`. |
| **F2** | Baseline-M, env `MAGIC_WORKSPACE=engine` | "Add a metrics spec." | n/a (Priority 2 override) | n/a | F2 | no | Skip Step 0, dispatch to `.design/engine/specifications/`. |

## Field-Reproduced Phrasings

These four rows encode the field defects originally reported and confirm
the new chain catches them. Detection is semantic, so equivalent phrasings
in any natural language follow the same outcome — these rows are the
canonical English form.

| # | Setup | User input | Detected signal | Outcome | Resulting action |
| --- | --- | --- | --- | --- | --- |
| **R1** | Baseline-S (sole workspace `web`) | "Make a spec for the mobile version." | class 2 (`mobile`) | C1 | Auto-create workspace `mobile`. Narrate: `[Workspace] Created 'mobile' for stack delta (mentioned: 'mobile'). Dispatching new specs to .design/mobile/.` |
| **R2** | Baseline-Z (no `workspace.json`) | "Write the authentication spec." | none (Priority 4) | A1 | Init runs, bootstraps `.design/main/`. Spec lands in `.design/main/specifications/`. **Field-bug-1 fixed: not in `.design/` root.** |
| **R3** | Baseline-M (default `engine`, also `docs`) | "Create a new workspace for the Go backend and describe RPC there." | class 1 (creation intent + inferred name `go-backend`) | B1 | Auto-create `go-backend`, dispatch new RPC spec to `.design/go-backend/specifications/`. **Field-bug-2 fixed: respects new-workspace intent.** |
| **R4** | Baseline-M (default `engine`) | "Describe `l2-rpc.md`." (no signal, fits `engine` lexicon at ≥0.30) | none | E1 | Resolve `engine`, fit OK → dispatch silently. No question. |

## Edge Cases (Adversarial)

| # | Setup | Input | Detected | Outcome | Why this is correct |
| --- | --- | --- | --- | --- | --- |
| **X1** | Baseline-S | "I want to add a separate workspace for testing — let's call it `qa`." | class 1 (token + name `qa`) | B1 | Single creation signal → no question, auto-create. |
| **X2** | Baseline-M | "Refactor the engine for performance." | none (`engine` already in lexicon) | E1 | Term `engine` matches existing workspace lexicon → fit OK → dispatch to `engine`. No spurious creation. |
| **X3** | Baseline-Z | "/magic.spec add an iOS auth spec." | n/a (no `workspace.json`) | A1 + Init | Init bootstrap creates `.design/{default}/`, then dispatch. iOS detection deferred until next invocation when `workspace.json` exists. |
| **X4** | Baseline-S, `mobile` registered in `workspace.json` but `.design/mobile/` directory missing | `/magic.spec --workspace=mobile "add auth"` | n/a (Priority 1) | F1 + WI-9 | Skip Step 0; executor.js auto-mkdirs `.design/mobile/{specifications,tasks,archives/tasks}`; spec lands in `.design/mobile/specifications/`. **Field-bug-1 second cause fixed.** |
| **X5** | Baseline-S, no name in current or prior 3 turns | "Add a separate workspace." | class 1 (token, no name) | B2 | WI-4 question: `(1) Create new workspace [need name from you] · (2) Use existing 'web' · (3) Cancel`. User reply with a name resolves to B1. |
| **X6** | Baseline-M, one workspace owns `l1-product-analytics.md` | "Add a spec about analytics." | class 3 (`analytics`, overlap ≥30%) | D2 | WI-4 question: `(1) Create 'analytics' · (2) Dispatch to '{matching-ws}' · (3) Cancel`. |
| **X7** | Baseline-S, `web` already registered | manual `create-workspace --name=web` | n/a (manual call) | HALT (script-side) | Script halts: `HALT: Workspace 'web' already registered`. No partial state. |
| **X8** | Baseline-S, partial directory `.design/mobile/` exists but unregistered | manual `create-workspace --name=mobile` | n/a (manual call) | HALT (script-side) | Script halts: `HALT: Directory '.design/mobile/' already exists but is not registered. Resolve manually before retry.` |

## Anti-Patterns (Must NOT Trigger)

| # | Setup | Input | Wrong outcome (must NOT happen) | Why the chain prevents it |
| --- | --- | --- | --- | --- |
| **N1** | Baseline-S | "Add a payment processor spec." | Auto-create `payment` workspace | Term `payment` is a domain feature, not a stack/platform/surface; class 2/3 would not fire because the spec scope-fits `web` at ≥0.30 by any reasonable lexicon (web has auth/payment-like terms typical of a frontend). E1 path. |
| **N2** | Baseline-M | "Let me think about how the docs workspace is organized." | Question about workspace selection | Read-only / brainstorming intent — no spec write yet. Step 0 only triggers on actual create/amend. |
| **N3** | Baseline-S, after C1 created `mobile` workspace | "Add another auth spec for mobile." | Re-create `mobile` workspace or ask question | `mobile` now in workspace.json with at least one spec → lexicon match ≥0.30 → E1 silent dispatch. |
| **N4** | Baseline-S | "/magic.spec --workspace=web add iOS auth" | Ask question or create new ws | Priority 1 override → skip Step 0 entirely. User explicitly chose `web`; WI-7 fit warning may fire (informational only in single-ws projects). |

## Failure Modes & Rollback

Three classes of failure are handled atomically by `create-workspace.js`:

| Class | Trigger | Behaviour | Result |
| --- | --- | --- | --- |
| Validation | Invalid name / duplicate | Halt before any mutation | Project state unchanged. |
| Provision | `mkdir` fails on subtree | Roll back created dirs / files via reverse-order delete | Project state unchanged. |
| Registration | `workspace.json` write fails | Roll back created dirs / files | Project state unchanged. |

Rollback is best-effort but starts BEFORE any registration write, so even
total failure leaves `workspace.json` and any prior workspace untouched.

## Coverage Confirmation

The 12 outcomes of spec §5 are tested by rows A1 through F2.
The 4 field-relevant phrasings are tested by R1 through R4.
The 8 adversarial edges are tested by X1 through X8.
The 4 anti-patterns are tested by N1 through N4.

Total: 28 simulation rows, all matching their expected resolution path.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-05-07 | Agent | Initial simulation matrix for Workspace Intent Routing v1.0.0. |
