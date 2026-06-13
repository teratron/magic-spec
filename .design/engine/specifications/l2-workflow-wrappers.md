# Workflow Wrappers

**Version:** 1.2.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

User-facing workflow files in `workflows/` that serve as thin entry points to the core engine logic in `.magic/`. Each wrapper maps a `/magic.*` command to its engine counterpart and may include user-oriented trigger descriptions and argument routing.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Parent concept defining core workflows and invariants.
- [l2-engine-automation.md](l2-engine-automation.md) - Automation scripts invoked by workflows.

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

1. **Trigger definitions** — command names, aliases, examples.
2. **Argument routing** — parsing and forwarding to engine logic.
3. **User guidance** — brief descriptions visible in IDE command palettes.

## 6. Wrapper-Body Parity Invariant & Verification

The wrapper↔body relationship is **one-directional**:

1. **Pointer wrappers** — a wrapper that references an engine body (the `> **Full implementation:** \`.magic/{cmd}.md\`` pointer) MUST have that file present on disk. A dangling pointer is a phantom mapping.
2. **Self-contained wrappers** — a wrapper with no body pointer carries the full workflow itself (e.g., `magic.graph.md`); it requires no `.magic/{cmd}.md`.
3. **Bodies without wrappers are allowed** — internal engine modules (`context.md`, `init.md`, `pause.md`, `retrospective.md`) are invoked internally and intentionally have no user-facing wrapper. The invariant does NOT require a wrapper per body.

### 6.1 Automated Verification

`magic.analyze` Mode C MUST verify parity deterministically: for each `workflows/magic.{cmd}.md`, if the wrapper text references `.magic/{cmd}.md`, assert that file exists. A missing target is reported as `WRAPPER_BODY_DRIFT {wrapper} → missing .magic/{cmd}.md` (advisory). A self-contained wrapper (no pointer) is skipped. This catches phantom mappings — a wrapper or registry claiming a body that never shipped — before a release ships a dangling entry point.

> Motivation: a phantom `magic.graph.md → .magic/graph.md` mapping persisted undetected across 13 registry versions until a manual inventory sync. The check makes that class of drift fail the audit instead of relying on manual discovery.

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

## Document History

| Version | Date | Description |
| --- | --- | --- |
| 1.2.0 | 2026-06-13 | Added §6 Wrapper-Body Parity Invariant & Verification (R4): one-directional parity (pointer wrappers need a body; self-contained do not; bodies may lack wrappers) + a deterministic `magic.analyze` Mode C `WRAPPER_BODY_DRIFT` check. Field evidence: phantom `magic.graph` mapping survived 13 registry versions. |
| 1.1.1 | 2026-06-12 | Factual fix: `magic.graph.md` is self-contained (no `.magic/graph.md` body exists); §2 exception documented. |
| 1.1.0 | 2026-06-12 | Inventory sync: added `magic.graph.md` (registry drift fix — wrapper shipped without spec coverage) and `magic.status.md` (C2 exception per l1-session-continuity.md SC-5). |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
