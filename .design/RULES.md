# Project Specification Rules

**Version:** 1.1.0
**Status:** Active

## Overview

Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions

- Spec files use lowercase kebab-case: `api.md`, `database-schema.md`.
- System files use uppercase: `INDEX.md`, `RULES.md`.
- Section names within specs are title-cased.

## 2. Status Rules

- **Draft -> RFC**: all required sections filled, ready for review.
- **RFC -> Stable**: reviewed, approved, no open questions.
- **Any -> Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules

- patch (0.0.X): typo fixes, clarifications, no structural change.
- minor (0.X.0): new section added or existing section extended.
- major (X.0.0): structural restructure or scope change.

## 4. Formatting Rules

- Use plaintext blocks for all directory trees.
- Use mermaid blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

## 5. Content Rules

- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

## 6. Relations Rules

- Every spec that depends on another must declare it in Related Specifications.
- Cross-file content duplication is not permitted — use a link instead.
- Circular dependencies must be flagged and resolved.

## 7. Project Conventions

<!-- Populated automatically via triggers T1-T4. Do not edit manually. -->

### C1 — `.magic/` is the live SDD engine: modify with extreme care

**Declared by:** User (T4 trigger, 2026-02-20)

`.magic/` is simultaneously the **active SDD engine** used in this very project and the source
that gets shipped to end users. Any modification to files inside `.magic/` must follow this protocol:

1. **Read first** — open and fully read every file that will be affected before touching anything.
2. **Analyse impact** — trace how the changed file is referenced by other `.magic/` files,
   `.agent/workflows/magic/` wrappers, `adapters/`, and `init.ps1` / `init.sh`.
3. **Verify SDD continuity** — confirm that after the change all five workflows
   (specification, plan, task, rule, retrospective) remain fully functional.
4. **Never edit blindly** — if the scope of impact is unclear, stop and ask before proceeding.
5. **Document the change** — any modification to engine files must be recorded in the
   relevant spec (if applicable) and in a git commit message explaining the reason.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-20 | Agent | Initial constitution |
| 1.1.0 | 2026-02-20 | Agent | Added C1: .magic/ modification safety protocol (T4 trigger) |
