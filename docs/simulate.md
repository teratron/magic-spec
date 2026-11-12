# Simulate Workflow

This document explains how Magic SDD checks a product from the user's side: written scenarios of people using it, run by an AI acting as those people, with every failed step handed to `fix` as a finding.

## 1. Overview

Tests check the code against what the developer understood when the code was written. Nothing in the pipeline checks the product against a person's journey through it: a feature built from ten tasks can pass all ten and still fail the user at the seam between them. `/magicspec simulate` closes that gap. It runs scenarios — short, written journeys of one actor through the product — live where the product can be driven in the session, traced through the code where it cannot, and says which for every step.

**Triggers:** *"Simulate the users"*, *"Run the scenarios"*, *"Walk through the user journeys"*, *"Test the product as a user"*, *"Check the user flows"*, *"Simulate"*.

**Slash command:** `/magicspec simulate [scope]`

> **Full implementation:** `skills/magicspec/workflows/simulate.md` — the engine reads this file before executing any steps.
>
> This is the product command. The engine's own test workflow, for maintainers of the engine, is described in [dev-test.md](dev-test.md).

Key Goals:

- **Written from the specifications**: a scenario's expected outcomes come from what a specification says, so it tests intent; the code is never the oracle.
- **Planned and kept with the work**: scenarios are listed when a phase is planned, written by its validation tasks and updated by every task that changes user-facing behaviour.
- **Honest about evidence**: every result says `live` or `traced`, and a traced pass is reported as the weaker evidence it is.
- **Findings, not patches**: a run changes no product code; each failed step is a finding for `/magicspec fix`.

## 2. Scenarios

Scenarios live beside the other working files, in `.magicspec/{workspace}/simulations/{area}.md`, one file per area of the product. They are instructions for an agent written from the specifications, so they stay out of the product's own tree. A scenario names who acts (a role the product has, from an anonymous visitor to an administrator), the state it starts from, numbered steps each stating an action and the outcome a person can observe, the specification statements it verifies, and its variants (edge input, error path, permission boundary, interruption). A step describes the observable surface only: no code, no selectors tied to markup, no internal function names.

```
## S-1: Pay by card

**Actor:** returning customer
**Verifies:** the checkout specification, §Payment
**Preconditions:** one item in the cart, a saved card

**Steps:**

1. Open the cart and choose "Pay" → expect: the order summary with the saved card
2. Confirm → expect: a confirmation page with an order number

**Variants:** error path — the card is declined; the page says so and the cart is kept

**Last run:** 2026-11-12 · v1.4.0

- Step 1: pass · live
- Step 2: fail · live — observed: the confirmation page shows no order number
```

The template is `skills/magicspec/templates/simulation.md`. Only the `Last run` lines are written by a run. A step whose expected outcome no specification states is not invented: it is reported as a specification gap.

## 3. Argument Routing

The scope is optional. Left out, every scenario of the workspace runs, and the first line says so.

| Input | Mode | Behavior |
| --- | --- | --- |
| *(empty)* | Everything | Every scenario of the resolved workspace |
| `{area}` | One area | The scenarios of one file |
| `"feature or specification"` | By topic | The scenarios that verify it |
| `--live-only` | Live only | A step that cannot run live is skipped and listed, never traced |
| `{workspace} …` | Scoped | Any of the above in a specific workspace |

```
/magicspec simulate
/magicspec simulate checkout
/magicspec simulate "refunds"
/magicspec simulate {workspace} --live-only
```

## 4. How a Run Goes

1. **Select** the scenarios the scope names. None exist → nothing runs and nothing is written: the report lists the user-facing statements no scenario verifies and names `/magicspec plan` as the next step, because scenarios are planned with the work.
2. **Decide the mode** of each step. A step is *live* when the product can be started and driven in the session and the instance is local or disposable; otherwise it is *traced* through the code and the specifications (or *skipped*, under `--live-only`).
3. **Run** each scenario as its actor, step by step. A step is `pass`, `fail` (the outcome differs from the expectation), `inconclusive` (it could not be observed or traced to an outcome) or `skipped`.
4. **Record** the run in each scenario's `Last run`: the date, the product's version and one line per step.
5. **Report** the findings and the coverage: the user-facing statements that no scenario verifies.

The command ends with one report and one next step:

```
[Simulate] 3 scenarios, 11 steps → 9 passed, 1 failed, 1 inconclusive, 0 skipped (8 live, 3 traced)
  S-1 Pay by card step 2 — fail — expected: a confirmation page with an order number — observed: no order number — live
  Coverage: 14 user-facing statements verified, 2 with no scenario
Next: /magicspec fix — deep reasoning
```

The next step is `/magicspec fix` while any scenario still records a failed or inconclusive step, and the command the pipeline state computes otherwise. `/magicspec fix` reads those steps as its open findings.

## 5. Safety

- **Local or disposable only.** A step runs live only against an instance of the product started for the run or named by the scenario as disposable. A shared, staging or production system, a real account, real money and real messages to people are never touched.
- **One consent question** before a step with an external side effect (sending, paying, deleting data outside a disposable instance): skip it (the default), trace it, or run it live.
- **No product change.** Nothing outside the scenario files is written; a failed step is a finding, never a patch.
- **Containment.** The product never refers to a scenario, a task or a specification.

## 6. Completion Checklist

- Scenarios selected by the scope; none found → nothing run, coverage reported, `/magicspec plan` named
- Every result labelled `live` or `traced`; a traced pass never counted as live
- No step run live against anything but a local or disposable instance
- `Last run` written for every scenario that ran; nothing else edited
- Report printed; next command named, not started

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.93).
