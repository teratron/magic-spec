---
description: Workflow for manually adding, amending, or removing project conventions in RULES.md.
---

# Rule Workflow

Manages `.design/RULES.md §7 Project Conventions` directly.
Use when you want to declare a convention without going through the Spec Workflow.

> **Scope**: Direct management of `RULES.md §7 Project Conventions`.
> Automatic rule capture during spec work (triggers T1–T4) is handled by `spec.md`.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Read First**: Always read `.design/RULES.md` in full before any operation.
2. **Auto-Init**: If `.design/` or its system files are missing, automatically trigger the Init pre-flight check (`.magic/init.md`) before proceeding. Do not ask — just initialize and continue.
3. **Scope**: Only §7 Project Conventions is modified here. Sections 1–6 are the universal constitution — amend them only if the user explicitly targets them.
4. **No Silent Changes**: Always show the proposed change before writing.
5. **Version Discipline**: Every change to RULES.md requires a version bump and a Document History row. Clarification: Typo fixes or rephrasing without changing intent is a `patch` (0.0.X).
6. **Context Awareness**: Before adding a manual rule, check `.design/CONTEXT.md` to see if it aligns with recent project decisions.
7. **Checklist Before Done**: Every workflow operation must end with the *Task Completion Checklist*. A task is not complete until the checklist is presented.

## Directory Structure

```plaintext
.design/
├── RULES.md         # Output: project constitution (§7 modified here)
└── specifications/  # Input: spec files (read-only in this workflow)
```

## Workflow Steps

### Adding a Convention

**Trigger phrase**: *"Add rule"*, *"Add convention"*

0. **Pre-flight**: Run `node .magic/scripts/executor.js check-prerequisites --json` to verify `.design/` integrity. If `ok: false`, trigger Auto-Init.
1. Read `.design/RULES.md`.
2. Parse the user's input into a clean, declarative rule statement.
3. **Constitutional Guard**: Check §1–6 of `RULES.md` to ensure the new statement doesn't contradict established project-wide invariants. If it does, flag the conflict and ask for an amendment to the core section instead.
4. Propose before writing:

    ```
    Proposed addition to RULES.md §7:

    → "All async functions must be documented with their error surface."

    Version bump: 1.0.0 → 1.1.0 (minor — new convention added)

    Add? (yes / adjust / cancel)
    ```

5. On approval: assign the next sequential convention ID (C{N+1}), append to §7 as a new subsection `### C{N+1} — {Title}`, bump version (`minor`), add Document History row.
6. **Impact Analysis**: Propose the next steps to the user:
    - "Should I run an audit of existing specifications to check compliance with this new rule?"
    - "Should I update the implementation plan to reflect this convention in upcoming tasks?"
    - Note: If `TASKS.md` exists, its `Based on RULES:` version is now stale. The next `magic.task` update will detect and reconcile this.
7. **Task Completion Checklist**: Present the checklist.

### Amending a Convention

**Trigger phrase**: *"Amend rule"*, *"Change rule"*, *"Update convention"*

0. **Pre-flight**: Run `node .magic/scripts/executor.js check-prerequisites --json` to verify `.design/` integrity. If `ok: false`, trigger Auto-Init.
1. Read `.design/RULES.md §7`.
   Identify the target convention by its ID (e.g., C15) or by keyword match. If ambiguous, list matching rules and ask the user to confirm.
2. **Constitutional Guard**: Ensure the amendment does not contradict project-wide invariants in §1–6.
3. Show the current rule and the proposed change side by side:

    ```
    Current:  "All APIs must follow REST. GraphQL is not permitted."
    Proposed: "All APIs must follow REST or GraphQL. No mixing within one service."

    Version bump: 1.1.0 → 1.2.0 (minor — convention amended)

    Apply? (yes / adjust / cancel)
    ```

4. On approval: replace the rule in place, bump version (`minor`), add Document History row.
5. **Impact Analysis**: Propose the next steps to the user:
    - "Should I run an audit of existing specifications to check compliance with this amendment?"
    - "Should I update the implementation plan to reflect this change in upcoming tasks?"
    - Note: If `TASKS.md` exists, its `Based on RULES:` version is now stale. The next `magic.task` update will detect and reconcile this.
6. **Task Completion Checklist**: Present the checklist.

### Removing a Convention

**Trigger phrase**: *"Remove rule"*, *"Delete convention"*

0. **Pre-flight**: Run `node .magic/scripts/executor.js check-prerequisites --json` to verify `.design/` integrity. If `ok: false`, trigger Auto-Init.
1. Identify the target convention by its ID (e.g., C16) or by keyword match. If ambiguous, list matching rules and ask which to remove.
2. Show the rule to be removed and ask for explicit confirmation:

    ```
    Removing from RULES.md §7:
    → "All APIs must follow REST. GraphQL is not permitted."

    Version bump: 1.2.0 → 2.0.0 (major — convention removed)

    ⚠️ This cannot be undone automatically. Confirm? (yes / cancel)
    ```

3. On approval: remove the entry, bump version (`major`), add Document History row.
    - *Exception*: If removal is part of a refactor where the rule is moved or merged without loss of intent, use `minor`.
4. **Impact Analysis**: Propose the next steps to the user:
    - "Should I run an audit to identify specifications that now rely on non-existent rules?"
    - Note: If `TASKS.md` exists, its `Based on RULES:` version is now stale. The next `magic.task` update will detect and reconcile this.
5. **Task Completion Checklist**: Present the checklist.

### Listing Conventions

**Trigger phrase**: *"Show rules"*, *"List conventions"*

Read and display all entries in `.design/RULES.md §7` as a numbered list.
No writes performed. No checklist required.

## Task Completion Checklist

**Must be shown at the end of every rule operation — no exceptions.**

```
Task Completion Checklist — {operation description}

  ☐ RULES.md was read in full before any change
  ☐ Only §7 was modified (unless user explicitly targeted §1–6)
  ☐ Proposed change shown to user before writing
  ☐ Version bumped correctly (minor for add/amend, major for remove)
  ☐ Document History row added
  ☐ No contradiction with existing rules in §1–6
  ☐ Impact Analysis presented to user (audit/plan-update suggestions)
```

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-23 | Antigravity | Initial migration from workflow-enhancements.md |
| 1.1.0 | 2026-02-26 | Antigravity | Added pre-flight to all write paths, convention ID assignment (C{N+1}), target rule identification in Amend/Remove, Convention Sync note in Impact Analysis, Impact Analysis checklist item |
