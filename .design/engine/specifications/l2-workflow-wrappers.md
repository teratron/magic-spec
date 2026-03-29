# Workflow Wrappers

**Version:** 1.0.0
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
- Each wrapper corresponds 1:1 to a `.magic/` engine file.
- Naming convention: `magic.{command}.md` (dot-separated, not kebab-case).

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| :--- | :--- |
| Engine Safety (C1) | Wrappers are read-only proxies; modifications flow through `.magic/` |
| Workflow Minimalism (C2) | Wrapper set matches core command set exactly |
| Universal Script Executor (C7) | Wrappers invoke scripts via `executor.js`, not directly |

## 5. Detailed Design

### 5.1 Wrapper Inventory

**Project Structure:**

```plaintext
workflows/
  magic.analyze.md   -> .magic/analyze.md
  magic.rule.md      -> .magic/rule.md
  magic.run.md       -> .magic/run.md
  magic.spec.md      -> .magic/spec.md
  magic.task.md      -> .magic/task.md
```

### 5.2 Wrapper Responsibilities

Each wrapper file contains:
1. **Trigger definitions** — command names, aliases, examples.
2. **Argument routing** — parsing and forwarding to engine logic.
3. **User guidance** — brief descriptions visible in IDE command palettes.

## Document History

| Version | Date | Description |
| :--- | :--- | :--- |
| 1.0.0 | 2026-03-29 | Initial Stable (bootstrapped from existing code) |
