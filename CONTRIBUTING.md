# Contributing to magic-spec

Thank you for your interest in contributing to **magic-spec**.
This document outlines the development workflow, coding standards, and contribution process.

## 🚀 SDD Workflow (Magic Spec)

This project follows **Specification-Driven Development (SDD)** managed by `magic-spec`.

### Primary Workflows

You can trigger these workflows via your AI agent (Claude, Cursor, Windsurf, etc.):

| Command | Description |
| --- | --- |
| `/magic.analyze` | Audits the health of a project against its specification registry, rules and engine integrity, and reverse-engineers specifications from existing code. Use when the user asks to ventilate or analyze the project, to compare the code with the registry for gaps and drift, or to scan an existing codebase for missing specifications. |
| `/magic.graph` | Builds, analyzes and visualizes the specification knowledge graph of the SDD artifacts, with god nodes, communities and coverage. Use when the user asks for the spec graph, graph analysis, community detection or workspace discovery, or for an interactive visualization of the specification graph. |
| `/magic.rule` | Adds, amends or removes project conventions in the RULES.md constitution, global or per workspace. Use when the user states a project rule or convention to record, or asks to amend or remove a convention in RULES.md. |
| `/magic.run` | Executes the planned tasks of the active phase from the task list, in parallel tracks when they are independent. Use when the user asks to start, continue or resume the planned work, to run the next task of the plan, or to implement a named task or phase from TASKS.md. |
| `/magic.spec` | Creates, amends and checks the specifications and the specification registry (INDEX.md), from a raw idea through status promotion. Use when the user asks to create or update a spec, to explore or brainstorm a specification, or to check, verify or review the registry entries, versions and statuses of the specs themselves. |
| `/magic.status` | Briefs a session on where the project stands from STATE.md and the registries, covering the current position, progress, blockers and recorded decisions, and ending with the one next command; read-only. Use when the user asks where the project stands, what the recorded next step is, or for a resume briefing, without asking for any work to be done. |
| `/magic.task` | Turns the Stable specifications into the implementation plan (PLAN.md) and the atomic task list (TASKS.md with phase workbooks), and re-syncs them when the registry or the rules change. Use when the user asks to create, generate, update or sync the plan or the task list. |

### Development Cycle

1. **Spec First**: Always update or create a specification in `.design/{workspace}/specifications/` before writing code.
2. **Task & Plan**: Use `/magic.task` to generate or update the implementation plan.
3. **Run**: Use `/magic.run` to execute tasks and write implementation code.
4. **Analyze**: Run `/magic.analyze` regularly to ensure documentation and code stay in sync.

## 📂 Project Structure

```plaintext
root-project/
├── .agents/workflows/        # Slash commands wrapper (e.g., magic.spec, magic.task)
├── .magic/                   # The SDD Engine (workflow logic and scripts - read-only)
└── .design/                  # Your Project Design Workspace (INDEX.md, RULES.md, PLAN.md)
```

## 🏷️ Conventions & Standards

This project adheres to the following constitutional rules (defined in `RULES.md`):

## 1. Naming Conventions

- Spec files must include a layer prefix (e.g., `l1-`, `l2-`), followed by lowercase kebab-case: `l1-api.md`, `l2-database-schema.md`.
- System files use uppercase: `INDEX.md`, `RULES.md`.
- Section names within specs are title-cased.

## 2. Status Rules

- **Draft → RFC**: all required sections filled, ready for review.
- **RFC → Stable**: reviewed and approved (Human Signal) **OR** Auto-Stabilized via Trust Mode (C9) if logic fits the architecture and satisfies MVC criteria.
- **RFC → Draft**: needs rework or significant revision.
- **Stable → RFC**: substantive amendment (minor/major bump) requires re-review.
- **Any → Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules

- `patch` (0.0.X): typo fixes, clarifications — no structural change.
- `minor` (0.X.0): new section added or existing section extended.
- `major` (X.0.0): structural restructure or scope change.

## 4. Formatting Rules

- Use `plaintext` blocks for all directory trees.
- Use `mermaid` blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

## 5. Content Rules

- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

## 6. Relations Rules

- Every spec that depends on another must declare it in `Related Specifications`.
- Cross-file content duplication is not permitted — use a link instead.
- Circular dependencies must be flagged and resolved.

## 🧱 Workspaces

| Workspace | Description | Specs | Registry |
| --- | --- | --- | --- |
| engine | Magic SDD core engine logic, workflows, rules, and history. | 37 | [engine/INDEX.md](engine/INDEX.md) |

## 🛠️ Getting Started

1. **Verify Prerequisites**:

    ```bash
    node .magic/scripts/executor.js check-prerequisites --json
    ```

2. **Verify Integrity**:

    ```bash
    /magic.analyze
    ```

*Generated by Magic Spec Engine* (v2.1.134) on 2026-10-05
