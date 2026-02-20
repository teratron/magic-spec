---
description: Workflow for manually adding, amending, or removing project conventions in RULES.md.
---

# Rule Workflow

Manages `.design/RULES.md §7 Project Conventions` directly.
Use when you want to declare a convention without going through the Spec Workflow.

> Automatic rule capture during spec work (triggers T1–T4) is handled by `specification.md`.
> This workflow is for explicit, standalone rule management.

## Agent Guidelines

1. **Read First**: Always read `.design/RULES.md` in full before any operation.
2. **Auto-Init**: If `.design/` or `RULES.md` is missing, automatically trigger the Init pre-flight check (`.magic/init.md`) before proceeding.
3. **Scope**: Only §7 Project Conventions is modified here. Sections 1–6 are the universal constitution — amend them only if the user explicitly targets them.
4. **No Silent Changes**: Always show the proposed change before writing.
5. **Version Discipline**: Every change to RULES.md requires a version bump and a Document History row.

## Workflow Steps

### Adding a Convention

**Trigger phrase**: *"Add rule"*, *"Add convention"*

1. Read `.design/RULES.md`.
2. Parse the user's input into a clean, declarative rule statement.
3. Propose before writing:

    ```
    Proposed addition to RULES.md §7:

    → "All async functions must be documented with their error surface."

    Version bump: 1.0.0 → 1.1.0 (minor — new convention added)

    Add? (yes / adjust / cancel)
    ```

4. On approval: append to §7, bump version (`minor`), add Document History row.

### Amending a Convention

**Trigger phrase**: *"Amend rule"*, *"Change rule"*, *"Update convention"*

1. Read `.design/RULES.md §7`.
2. Show the current rule and the proposed change side by side:

    ```
    Current:  "All APIs must follow REST. GraphQL is not permitted."
    Proposed: "All APIs must follow REST or GraphQL. No mixing within one service."

    Version bump: 1.1.0 → 1.2.0 (minor — convention amended)

    Apply? (yes / adjust / cancel)
    ```

3. On approval: replace the rule in place, bump version (`minor`), add Document History row.

### Removing a Convention

**Trigger phrase**: *"Remove rule"*, *"Delete convention"*

1. Show the rule to be removed and ask for explicit confirmation:

    ```
    Removing from RULES.md §7:
    → "All APIs must follow REST. GraphQL is not permitted."

    Version bump: 1.2.0 → 2.0.0 (major — convention removed)

    ⚠️ This cannot be undone automatically. Confirm? (yes / cancel)
    ```

2. On approval: remove the entry, bump version (`major`), add Document History row.

### Listing Conventions

**Trigger phrase**: *"Show rules"*, *"List conventions"*

Read and display all entries in `.design/RULES.md §7` as a numbered list.
No writes performed.

## Task Completion Checklist

```
Rule Workflow Checklist — {operation description}

  ☐ RULES.md was read in full before any change
  ☐ Only §7 was modified (unless user explicitly targeted §1–6)
  ☐ Proposed change shown to user before writing
  ☐ Version bumped correctly (minor for add/amend, major for remove)
  ☐ Document History row added
  ☐ No contradiction with existing rules in §1–6
```
