# Workflow Wrappers

**Version:** 1.4.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

User-facing workflow files in `workflows/` that serve as thin entry points to the core engine logic in `.magic/`. Each wrapper maps a `/magic.*` command to its engine counterpart and may include user-oriented trigger descriptions and argument routing.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core workflows and invariants.
- [l2-engine-automation.md](l2-engine-automation.md) - Automation scripts invoked by workflows.
- [l2-skill-wrappers.md](l2-skill-wrappers.md) - Projects each wrapper into a skill; owns the `name` and `description` Frontmatter Contract (§2.3) that the wrapper's own frontmatter must meet.
- [l2-test-suite.md](l2-test-suite.md) - Coverage of §5.2 and §7: the shipped-text contract over the wrappers and the bodies they point to.

## 1. Motivation

The `workflows/` directory is the public interface of the SDD engine. Unlike `.magic/` (internal, read-only for standard tasks), workflow wrappers are distributed to user projects and define the command surface. Without a specification, this critical boundary has no formal coverage — changes to wrappers could silently break the user-facing API.

## 2. Constraints & Assumptions

- Wrappers must not contain business logic — they delegate to `.magic/*.md`.
- Each wrapper corresponds 1:1 to a `.magic/` engine file. **Exception:** `magic.graph.md` is self-contained (full workflow in the wrapper, no `.magic/` body) — a read-only analysis workflow with no engine-internal callers.
- Naming convention: `magic.{command}.md` (dot-separated, not kebab-case).

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| Engine Safety (C1) | Wrappers are read-only proxies; modifications flow through `.magic/` |
| Workflow Minimalism (C2) | Wrapper set matches core command set exactly |
| Universal Script Executor (C7) | Wrappers invoke scripts via `executor.js`, not directly |

## 5. Detailed Design

### 5.1 Wrapper Inventory

**Project Structure:**

```plaintext
workflows/
  magic.analyze.md   -> .magic/analyze.md
  magic.graph.md     (self-contained — see §2 exception)
  magic.rule.md      -> .magic/rule.md
  magic.run.md       -> .magic/run.md
  magic.spec.md      -> .magic/spec.md
  magic.status.md    -> .magic/status.md   (C2 exception, SC-5)
  magic.task.md      -> .magic/task.md
```

> `magic.status.md` is the single authorized C2-exception addition — see [l1-session-continuity.md](l1-session-continuity.md) SC-5 and [l2-status-command.md](l2-status-command.md).

### 5.2 Wrapper Responsibilities

Each wrapper file contains:

1. **Trigger definitions** — command names, aliases, examples, and the natural-language trigger phrases of the workflow. The full phrase list stays in the body; the frontmatter `description` carries the discriminating subset as its `Use when` sentence (item 3).
2. **Argument routing** — parsing and forwarding to engine logic.
3. **User guidance** — the frontmatter `description`, shown in IDE command palettes and projected unchanged into the skill wrapper. It is authored here and nowhere else: [l2-skill-wrappers.md](l2-skill-wrappers.md) §2.3 owns its limits and its form, and this spec does not restate them. Its first sentence states what the workflow does and is the line a command palette shows; the `Use when` sentence follows it.

## 6. Wrapper-Body Parity Invariant & Verification

The wrapper↔body relationship is **one-directional**:

1. **Pointer wrappers** — a wrapper that references an engine body (the `> **Full implementation:** \`.magic/{cmd}.md\`` pointer) MUST have that file present on disk. A dangling pointer is a phantom mapping.
2. **Self-contained wrappers** — a wrapper with no body pointer carries the full workflow itself (e.g., `magic.graph.md`); it requires no `.magic/{cmd}.md`.
3. **Bodies without wrappers are allowed** — internal engine modules (`context.md`, `init.md`, `retrospective.md`) are invoked internally and intentionally have no user-facing wrapper. The invariant does NOT require a wrapper per body. Because they are not commands, user-facing text (workflow bodies, templates, docs) MUST NOT advertise them as `/magic.*` commands: a hint that names a non-command sends the user to a dead end. Field evidence: `/magic.pause` was advertised on eight shipped lines while `pause.md` has no wrapper (see [l1-session-continuity.md](l1-session-continuity.md) §1.5).

### 6.1 Automated Verification

`magic.analyze` Mode C MUST verify parity deterministically: for each `workflows/magic.{cmd}.md`, if the wrapper text references `.magic/{cmd}.md`, assert that file exists. A missing target is reported as `WRAPPER_BODY_DRIFT {wrapper} → missing .magic/{cmd}.md` (advisory). A self-contained wrapper (no pointer) is skipped. This catches phantom mappings — a wrapper or registry claiming a body that never shipped — before a release ships a dangling entry point.

The converse direction is checked the same way. `magic.analyze` Mode C MUST scan the shipped engine and documentation text (`.magic/`, `docs/`, `workflows/`, `rules/`, `README.md`) for `/magic.{cmd}` command mentions and assert that each resolves to `workflows/magic.{cmd}.md`. A mention that does not is reported as `PHANTOM_COMMAND {file}:{line} → /magic.{cmd} has no wrapper` (advisory). A token counts as a command mention only when it stands as its own word, preceded by whitespace, a backtick or an opening quote, so file paths such as `rules/magic.md` are never read as commands; developer-facing `magic.dev.*` names are exempt.

> Motivation: a phantom `magic.graph.md → .magic/graph.md` mapping persisted undetected across 13 registry versions until a manual inventory sync. The check makes that class of drift fail the audit instead of relying on manual discovery.

## 7. Body Navigation Contract `[ADDED]`

A wrapper points to one body, and a body points to the shared modules it applies (`context.md`, `init.md` and the like). A file reached through such a chain is not always read from end to end: an agent may preview its opening lines and read on only if what it saw says there is more, and a file with no contents list gives it no reason to think so — what lies below the preview does not exist for it. The failure is silent: nothing errors, and the workflow runs without the section the agent never reached.

**Measured exposure** (engine 2.1.133): six files under `.magic/` are longer than 100 lines and open with no contents list — `analyze.md` (417 lines), `spec.md` (356), `run.md` (192), `task.md` (182), `rule.md` (177) and `context.md` (145). The pointer chain is three hops long: wrapper, body, then a shared module, role card or template that can itself point to a further card or template. In `context.md` the Post-Resolution load of the constitution, `STATE.md` and the resume check begins at line 114, after the workspace-intent detection (lines 5–66) that only `magic.spec` applies and the resolution sections (lines 68–112); `spec.md` itself never names `STATE.md` or the resume check.

1. **Contents block.** Every engine body or shared module — a `.magic/*.md` file — longer than 100 lines opens, within its first 40 lines, with a contents list in which the text of every `##` heading of the file — outside fenced code blocks — appears, in file order. A preview of the opening lines then shows what lies beyond it.
2. **Wrapper size.** A wrapper stays within 500 lines. A host loads a wrapper whole when it selects it; the self-contained wrapper (`magic.graph.md`, §2) is the only one that can approach the limit, and it is 93 lines long.
3. **Scope.** The contract covers the files an agent opens by following a pointer. Templates are instantiated into the project and never read in place; role cards are at most 67 lines long; the rules file is injected at session start rather than navigated. None of the three is in scope.

Lines are counted as newline-terminated lines (what `wc -l` reports), so the limits and the measurements above agree.

Verification is a shipped-text contract in [l2-test-suite.md](l2-test-suite.md) (Script-Level Regression Harness).

## Canonical References

| Path | Role |
| --- | --- |
| `workflows/magic.analyze.md` | Analyze workflow entry point |
| `workflows/magic.graph.md` | Graph workflow entry point |
| `workflows/magic.rule.md` | Rule workflow entry point |
| `workflows/magic.run.md` | Run workflow entry point |
| `workflows/magic.spec.md` | Spec workflow entry point |
| `workflows/magic.status.md` | Status workflow entry point (implementation deliverable) |
| `workflows/magic.task.md` | Task workflow entry point |
| `.magic/*.md` | Engine bodies and shared modules the wrappers point to; subject of the §7 contents contract |

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.4.0 | 2026-10-05 | Added §7 **Body Navigation Contract**: every `.magic/*.md` longer than 100 lines opens, within its first 40 lines, with a contents list naming every `##` section in file order, and a wrapper stays within 500 lines; templates, role cards and the injected rules file are out of scope. §5.2 now records that the frontmatter `description` is authored in the wrapper alone and projected unchanged into the skill — its limits and form are owned by [l2-skill-wrappers.md](l2-skill-wrappers.md) §2.3, not restated here — with the first sentence as the palette line and the `Use when` sentence carrying the discriminating subset of the trigger phrases that stay in the body. Provenance: measured on engine 2.1.133 — six bodies and modules over 100 lines with no contents list, a three-hop pointer chain, and the Post-Resolution protocol of `context.md` starting at line 114 behind a `magic.spec`-only section, while `spec.md` itself never names `STATE.md` or the resume check. Source: a reference-mining pass over an external skill-authoring guide, recorded here by class only. Related Specifications gained the two links this amendment creates. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.3.1 | 2026-09-30 | Clarification patch, no status transition: the internal-module list in §6 item 3 drops `pause.md`, retired by [l1-session-continuity.md](l1-session-continuity.md) 2.5.0. No requirement changes. Typo-level patch (spec.md Amendment rule). |
| 1.3.0 | 2026-09-20 | Added the converse of the §6 parity check: internal-module bodies (`pause.md` and its siblings) MUST NOT be advertised as `/magic.*` commands in user-facing text, and `magic.analyze` Mode C gains an advisory `PHANTOM_COMMAND` scan over shipped engine and documentation text — own-word tokens only, so paths such as `rules/magic.md` are never read as commands, and `magic.dev.*` names are exempt. Field evidence: `/magic.pause` was advertised on eight shipped lines while `pause.md` has no wrapper ([l1-session-continuity.md](l1-session-continuity.md) §1.5). Engine deployment (the analyze check) is routed to `/magic.task engine` through [l2-session-checkpoint.md](l2-session-checkpoint.md) §7. Status reverted `Stable → RFC` (Amendment Rule, minor); Post-Update Review (5-lens) found no blocking issues, so Trust Mode (C9) auto-promoted back to `Stable` within the same invocation. |
| 1.2.0 | 2026-06-13 | Added §6 Wrapper-Body Parity Invariant & Verification (R4): one-directional parity (pointer wrappers need a body; self-contained do not; bodies may lack wrappers) + a deterministic `magic.analyze` Mode C `WRAPPER_BODY_DRIFT` check. Field evidence: phantom `magic.graph` mapping survived 13 registry versions. |
| 1.1.1 | 2026-06-12 | Factual fix: `magic.graph.md` is self-contained (no `.magic/graph.md` body exists); §2 exception documented. |
| 1.1.0 | 2026-06-12 | Inventory sync: added `magic.graph.md` (registry drift fix — wrapper shipped without spec coverage) and `magic.status.md` (C2 exception per l1-session-continuity.md SC-5). |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
