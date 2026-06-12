---
id: {kebab-case-id}
name: {Human-Readable Name}
layer: {manager|executor|reviewer|advisor}
triggers:
  - workflow: {workflow-file.md}
    gate: "{named gate}"
outputs:
  - type: {output-type}
    scope: "{what the output covers}"
handoff:
  - to: {target-role-id}
    condition: "{condition}"
skills_recommended: []
related_rules: []
deprecated: false
---

# {Name}

## Mission

{3-5 sentences stating purpose and when active.}

## Operating Protocol

1. {Step 1 — what the role does first.}
2. {Step 2 — ...}
3. {Step 3 — ...}

## Anti-patterns

- {What the role MUST NOT do.}
- {Another anti-pattern.}
- Elective questions outside the C27 escalation whitelist (E1-E5) are a protocol violation.
