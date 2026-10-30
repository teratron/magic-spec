# Workflow Wrappers

**Version:** 2.0.1
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

The user-facing command surface of the engine: one workflow body per command in `skills/magicspec/workflows/`, listed by the router `SKILL.md` of the same folder. There is no separate wrapper file: each body opens with the entry section a wrapper used to carry (trigger phrases, argument routing, scope, hints, handoffs written as prose) and continues with the workflow itself. The name of the file is kept from the earlier layout, in which `workflows/magic.{command}.md` pointed at a body in `.magic/`.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core workflows and invariants.
- [l1-skill-packaging.md](l1-skill-packaging.md) - SP-1 and SP-5: one skill, and every command surface resolves to a file in `workflows/`.
- [l2-skill-layout.md](l2-skill-layout.md) - The folder, the map from the earlier layout and the location resolvers.
- [l2-engine-automation.md](l2-engine-automation.md) - Automation scripts invoked by workflows.
- [l2-skill-wrappers.md](l2-skill-wrappers.md) - Owns the router contract and the frontmatter limits of `SKILL.md`, and the generator of the host surfaces.
- [l2-test-suite.md](l2-test-suite.md) - Coverage of §6 and §7: the shipped-text contract over the bodies.

## 1. Motivation

The `workflows/` folder is the public interface of the SDD engine. Without a specification, this critical boundary has no formal coverage — a body added without a router row, or a router row without a body, would silently break the user-facing command surface.

## 2. Constraints & Assumptions

- A file belongs in `workflows/` if and only if it is a command a user can invoke; the router's command table and the folder listing name the same set.
- Internal modules (`context`, `init`, `retrospective`) live in `references/` and are never advertised as commands.
- Naming convention: `{command}.md`, kebab-case; the command is typed `/magicspec {command}` (or `magicspec {command}` where the host has no per-project command entry).
- `graph.md` is self-contained, as it always was: a read-only analysis workflow with no engine-internal callers.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| Engine Safety (C1) | The bodies are the engine; every change inside the folder is a version event (C14) |
| Workflow Minimalism (C2) | The command set equals the router's table exactly |
| Universal Script Executor (C7) | Bodies invoke scripts via `scripts/executor.js`, not directly |

## 5. Detailed Design

### 5.1 Inventory

```plaintext
skills/magicspec/
  SKILL.md            router: grammar, command table, dispatch
  workflows/
    analyze.md  graph.md  rule.md  run.md  spec.md  status.md  task.md
  references/
    context.md  init.md  retrospective.md
```

> `status.md` is the single authorized C2-exception addition — see [l1-session-continuity.md](l1-session-continuity.md) SC-5 and [l2-status-command.md](l2-status-command.md).

### 5.2 Entry Section of a Body

Each body opens with:

1. **Trigger definitions** — command names, aliases, examples, and the natural-language trigger phrases of the workflow.
2. **Argument routing** — parsing and forwarding to the workflow's own steps.
3. **Hints and handoffs** — the scope, the finalization step and the next command, as prose at the head or the end of the body (a host that read them from frontmatter loses a button, not behavior).

The one line a host shows beside the command is the router's selection line for it; [l2-skill-wrappers.md](l2-skill-wrappers.md) owns its form and its limits.

## 6. Router-to-Folder Parity Invariant & Verification

The router↔folder relationship is **two-directional**:

1. **Every row has a body** — a command in the router's table MUST have its file in `workflows/`. A row without a file is a phantom command.
2. **Every body has a row** — a file in `workflows/` MUST appear in the table. A body no row names cannot be reached from the router.
3. **Modules are not commands** — `references/` holds the internal modules (`context.md`, `init.md`, `retrospective.md`); they are invoked internally and have no row. Because they are not commands, user-facing text (workflow bodies, templates, docs) MUST NOT advertise them as `/magicspec <command>` commands: a hint that names a non-command sends the user to a dead end. Field evidence: the earlier `/magic.pause` was advertised on eight shipped lines while `pause.md` had no wrapper (see [l1-session-continuity.md](l1-session-continuity.md) §1.5).

### 6.1 Automated Verification

`/magicspec analyze` Mode C MUST verify parity deterministically. **Router Parity** compares the command table of `SKILL.md` with the files of `workflows/`: a row with no file is reported as `ROUTER_DRIFT {cmd}: missing workflows/{cmd}.md`, a file with no row as `ROUTER_DRIFT {file}: not in the command table` (both advisory). The converse is **Phantom Commands**: the check scans the shipped engine and documentation text (the skill folder, `docs/`, `README.md`) for `/magicspec {cmd}` command mentions and asserts that each resolves to a row of the table. A mention that does not is reported as `PHANTOM_COMMAND {file}:{line}: /magicspec {cmd} is not in the command table` (advisory). A token counts as a command mention only when it stands as its own word, preceded by whitespace, a backtick or an opening quote, so file paths are never read as commands.

> Motivation: a phantom mapping persisted undetected across 13 registry versions until a manual inventory sync. The check makes that class of drift fail the audit instead of relying on manual discovery.

## 7. Body Navigation Contract `[ADDED]`

A router points to one body, and a body points to the shared modules it applies (`context.md`, `init.md` and the like). A file reached through such a chain is not always read from end to end: an agent may preview its opening lines and read on only if what it saw says there is more, and a file with no contents list gives it no reason to think so — what lies below the preview does not exist for it. The failure is silent: nothing errors, and the workflow runs without the section the agent never reached.

**Measured exposure** (engine 2.1.133, files then under `.magic/`): six files were longer than 100 lines and opened with no contents list — `analyze.md` (417 lines), `spec.md` (356), `run.md` (192), `task.md` (182), `rule.md` (177) and `context.md` (145). The pointer chain was three hops long: wrapper, body, then a shared module, role card or template that can itself point to a further card or template. In `context.md` the Post-Resolution load of the constitution, `STATE.md` and the resume check began at line 114, after the workspace-intent detection that only `/magicspec spec` applies and the resolution sections; `spec.md` itself never named `STATE.md` or the resume check. The pointer to that module was a section list in five bodies, and only one added Post-Resolution — so an agent that followed the list literally applied none of the load, in the bodies that had no step of their own for it.

1. **Contents block.** Every engine body or shared module — a `workflows/*.md` or `references/*.md` file — longer than 100 lines opens, within its first 40 lines, with a contents list in which the text of every `##` heading of the file — outside fenced code blocks — appears, in file order. A preview of the opening lines then shows what lies beyond it.
2. **Pointer completeness.** A body's pointer to a shared module applies the module as a whole. A pointer that narrows to named sections carries the heading text of every `##` section of the module that does not itself state a narrower applicability: a section list silently excludes each section it omits, and an agent that follows the pointer literally never applies it. In `context.md`, Step 0 states that it applies to `/magicspec spec` alone, so every other section — Post-Resolution among them — belongs in any list. The simplest compliant pointer lists no sections at all.
3. **Scope.** The contract covers the files an agent opens by following a pointer. Templates are instantiated into the project and never read in place; role cards are at most 67 lines long; the rule file is loaded at session start rather than navigated. None of the three is in scope.

Lines are counted as newline-terminated lines (what `wc -l` reports), so the limits and the measurements above agree.

Verification is a shipped-text contract in [l2-test-suite.md](l2-test-suite.md) (Script-Level Regression Harness).

## Canonical References

| Path | Role |
| --- | --- |
| `skills/magicspec/SKILL.md` | The router: grammar, command table, dispatch |
| `skills/magicspec/workflows/*.md` | The command bodies; subject of the §7 contents contract |
| `skills/magicspec/references/*.md` | Shared modules the bodies point to; subject of the §7 contents contract |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 2.0.1 | 2026-10-30 | Agent | **Reality sync: the printed command form** is `/magicspec <command>` ([l1-command-surface.md](l1-command-surface.md) CS-2); the earlier colon spelling is rewritten wherever the text prints a command. No requirement changed. |
| 2.0.0 | 2026-10-28 | The per-workflow wrapper is retired with the move to the single skill ([l1-skill-packaging.md](l1-skill-packaging.md) SP-1, SP-5; [l2-skill-layout.md](l2-skill-layout.md) §5.2, §5.9). The command surface is now the bodies in `skills/magicspec/workflows/`, each opening with the entry section the wrapper used to carry (triggers, arguments, scope, hints, handoffs as prose), and the router `SKILL.md` that lists them. §6 becomes **Router-to-Folder Parity** (`ROUTER_DRIFT`, `PHANTOM_COMMAND` over the colon form `/magicspec:{cmd}`); §7 covers the bodies of `workflows/` and `references/` and drops the wrapper-size rule, which had no counterpart once the wrapper was gone. The file keeps its name because other specifications and the registry link it. Status reverted `Stable → RFC` (Amendment Rule, major) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 1.5.0 | 2026-10-05 | §7 gains rule 3, **Pointer completeness**: a body's pointer to a shared module applies the module as a whole, and a pointer that lists sections lists every section without a narrower stated applicability — a list silently excludes what it omits. Evidence (file and line): the pointer to `context.md` is a section list in five bodies (`spec.md:15`, `task.md:30`, `run.md:24`, `analyze.md:14`, `rule.md:10`), and only `rule.md` includes Post-Resolution, while `spec.md` and `task.md` have no start-of-run load of `STATE.md` of their own. Origin: the owner's override of a Decision Record that had left this as a diagnostic (`CONTEXT_POST_RESOLUTION_POINTER`) for the simulation reading test; the rule is a shipped-text invariant, not a gate on the agent's work. Premise (forecast): the argument reached the workflow truncated at `l2-wor` and was read as this specification; override `/magic.spec amend l2-workflow-wrappers "drop the pointer rule"`. The old rule 3 (Scope) is now rule 4; the contents-list coverage in [l2-test-suite.md](l2-test-suite.md) grows by the pointer scan. Engine deployment (the five pointers) is routed to `/magic.task engine`. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.4.0 | 2026-10-05 | Added §7 **Body Navigation Contract**: every `.magic/*.md` longer than 100 lines opens, within its first 40 lines, with a contents list naming every `##` section in file order, and a wrapper stays within 500 lines; templates, role cards and the injected rules file are out of scope. §5.2 now records that the frontmatter `description` is authored in the wrapper alone and projected unchanged into the skill — its limits and form are owned by [l2-skill-wrappers.md](l2-skill-wrappers.md) §2.3, not restated here — with the first sentence as the palette line and the `Use when` sentence carrying the discriminating subset of the trigger phrases that stay in the body. Provenance: measured on engine 2.1.133 — six bodies and modules over 100 lines with no contents list, a three-hop pointer chain, and the Post-Resolution protocol of `context.md` starting at line 114 behind a `magic.spec`-only section, while `spec.md` itself never names `STATE.md` or the resume check. Source: a reference-mining pass over an external skill-authoring guide, recorded here by class only. Related Specifications gained the two links this amendment creates. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.3.1 | 2026-09-30 | Clarification patch, no status transition: the internal-module list in §6 item 3 drops `pause.md`, retired by [l1-session-continuity.md](l1-session-continuity.md) 2.5.0. No requirement changes. Typo-level patch (spec.md Amendment rule). |
| 1.3.0 | 2026-09-20 | Added the converse of the §6 parity check: internal-module bodies (`pause.md` and its siblings) MUST NOT be advertised as `/magic.*` commands in user-facing text, and `magic.analyze` Mode C gains an advisory `PHANTOM_COMMAND` scan over shipped engine and documentation text — own-word tokens only, so paths such as `rules/magic.md` are never read as commands, and `magic.dev.*` names are exempt. Field evidence: `/magic.pause` was advertised on eight shipped lines while `pause.md` has no wrapper ([l1-session-continuity.md](l1-session-continuity.md) §1.5). Engine deployment (the analyze check) is routed to `/magic.task engine` through [l2-session-checkpoint.md](l2-session-checkpoint.md) §7. Status reverted `Stable → RFC` (Amendment Rule, minor); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.2.0 | 2026-06-13 | Added §6 Wrapper-Body Parity Invariant & Verification (R4): one-directional parity (pointer wrappers need a body; self-contained do not; bodies may lack wrappers) + a deterministic `magic.analyze` Mode C `WRAPPER_BODY_DRIFT` check. Field evidence: phantom `magic.graph` mapping survived 13 registry versions. |
| 1.1.1 | 2026-06-12 | Factual fix: `magic.graph.md` is self-contained (no `.magic/graph.md` body exists); §2 exception documented. |
| 1.1.0 | 2026-06-12 | Inventory sync: added `magic.graph.md` (registry drift fix — wrapper shipped without spec coverage) and `magic.status.md` (C2 exception per l1-session-continuity.md SC-5). |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
