# Project Specification Rules
**Version:** 1.0.0
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
- Cross-file content duplication is not permitted вЂ” use a link instead.
- Circular dependencies must be flagged and resolved.

## 7. Project Conventions
<!-- Populated automatically via triggers T1-T4. Do not edit manually. -->
*(No project-specific conventions defined yet.)*

## Document History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-02-20 | Agent | Initial constitution |
