# Rules & Constitution Workflow

This document explains the management of the project's central constitution and conventions.

## 1. Overview

The Rule Workflow manages the `.design/RULES.md` file, which acts as the project's "Living Constitution." It governs all development decisions, architectural constraints, and workflow preferences.

Key Goals:

- **Consistency**: Ensuring all AI agents and developers follow the same project-specific conventions.
- **Safety**: Preventing accidental violations of core design principles.
- **Evolution**: Providing a structured way to add, amend, or remove rules as the project matures.

## 2. The Project Constitution

Magic divides rules into two main categories:

- **Universal Rules (§1–6)**: Pre-populated during initialization. These define the "laws of physics" for the Magic SDD engine.
- **Project Conventions (§7)**: Accumulated over time based on project-specific needs (e.g., "Use Tailwind for all components").

## 3. Automation & Workflows

### 3.1 Direct Management

The `magic.rule` workflow provides commands to **Add**, **Amend**, and **Remove** rules. Every modification requires a version bump and a Document History entry to maintain a full audit trail.

### 4.2 Automatic Rule Capture

During the Specification Workflow, the engine automatically detects potential new rules (triggers T1–T4):

- **T1**: Universally-scoped language ("always", "never").
- **T2**: Recurring patterns found across multiple specifications.
- **T4**: Explicit user declarations ("From now on, use...").

## 4. Maintenance

### 4.1 Periodic Audit

Rules are audited during the Specification Audit to identify overlaps, contradictions, or outdated conventions.

### 4.2 Version Discipline

- **Minor Bump**: Adding or amending a convention.
- **Major Bump**: Removing a convention (breaking change to the project constitution).

## 5. Security & Governance

- **Manual Approval (T1–T3)**: The engine must suggest and wait for user approval before adding rules based on detected patterns.
- **No Silent Overrides**: If a new requirement contradicts an existing rule, the engine must flag it explicitly rather than silently ignoring the conflict.
