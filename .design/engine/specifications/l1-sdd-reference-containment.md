# SDD Reference Containment Specification

**Version:** 1.1.0
**Status:** Stable
**Layer:** concept

## Overview

Defines the one-way traceability boundary between the SDD layer (`.design/`) and product files in consumer projects. Product artifacts must stay fully self-contained when a release excludes `.design/`: no task IDs, phase references, plan/spec links, or `.design/` paths may appear in shipped code, comments, or product documentation. Traceability lives in the SDD layer and git metadata — never in the product itself.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Enforcement gates are realized as role-card duties.
- [l2-role-cards-execution.md](l2-role-cards-execution.md) - Authoring-gate carrier (Coder card, RC-5).
- [l2-role-cards-review.md](l2-role-cards-review.md) - Review-gate carrier (Code-reviewer card, RC-6).
- [l1-engine-core.md](l1-engine-core.md) - Hosts the run/analyze workflows that carry the enforcement and detection surfaces.

## 1. Motivation

Field report from a consumer project: source files accumulated comments such as "implements task T-2B03 from phase-2" and links into `.design/specifications/`. The product ships via release archives that exclude `.design/` — every such reference becomes dead content: links resolve nowhere, task IDs mean nothing to the reader, and SDD internals leak into the public artifact.

The engine already enforces the mirrored boundary internally: the L1 release kernel never references the `dev/` tree. This spec extends the same containment discipline to the code the engine produces inside user projects.

## 2. Constraints & Assumptions

- `.design/` is a development-time workspace; release packaging MAY exclude it entirely.
- Git metadata (commit messages, PR descriptions) is not part of a release artifact and remains a legitimate traceability channel.
- Engine directories in consumer projects (`.magic/`, `workflows/`, `skills/`, `rules/`) are engine-owned and read-only; cross-references inside the engine itself are out of scope.
- Enforcement is cognitive (workflow and role instructions), not a build-time stripper: the engine has no compile step in consumer stacks.

## 3. Core Invariants (Layer 1 only)

Rules that Layer 2 implementations MUST NOT violate:

- **RC-1 (One-Way Traceability)**: References cross the SDD boundary in one direction only: SDD artifacts → product files. Product files never reference SDD artifacts.
- **RC-2 (Containment Scope)**: "Product files" means every release-shippable artifact: source code (identifiers, string literals), comments and docstrings, test names, build/config files, and user-facing documentation (README, CHANGELOG). Forbidden references: task IDs (`[T-XXXX]`), phase designators (`phase-{n}`), SDD system files (`PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`), specification file names, and any `.design/…` path.
- **RC-3 (Self-Containment)**: Every comment and documentation passage must remain fully meaningful with `.design/` absent. Design rationale that matters at the code site is restated in plain language in place; provenance ("which task produced this") is never stated in code.
- **RC-4 (Traceability Relocation)**: The task ↔ code mapping lives exclusively in the SDD layer (task `Changes` fields, phase files) and git metadata (commit messages, PR descriptions).
- **RC-5 (Authoring Gate)**: The code-producing role MUST NOT introduce violations — write-time prevention.
- **RC-6 (Review Gate)**: Diff review MUST fail any diff that introduces an SDD reference into product files — merge-time prevention.
- **RC-7 (Leak Detection)**: Project ventilation MUST scan existing product files for violations and report each as an actionable finding — the cleanup path for legacy leaks.
- **RC-8 (Exemptions)**: Exempt from RC-1/RC-2: the `.design/` subtree itself; engine directories; git metadata; contributor-facing process documentation that documents the SDD workflow itself (there the reference IS the content, not traceability metadata). The magic-spec repository documents the SDD process as its product domain — its references to `.design/` are content, not leaks. The engine-directory exemption covers cross-references **among shipped files only**; references from shipped files into the engine repository's own SDD workspace are governed by RC-9, not exempted. `[MODIFIED]`
- **RC-9 (Shipped Self-Containment)**: Files distributed with the engine (`.magic/`, `workflows/`, `skills/`, `rules/`, and templates instantiated into user projects) MUST NOT reference the engine repository's own SDD workspace: no `.design/engine/…` paths and no engine-workspace specification file names. Normative content is restated inline or cross-referenced to another shipped file. Three forms stay valid: consumer-generic SDD paths (`.design/{workspace}/…`, `$DESIGN_DIR`, the user's own `.design/INDEX.md`), stable in-text protocol labels (`WI-n`, `DA-n`, `C{n}`), and illustrative examples of forbidden forms. `[ADDED]`

> L2 spec cannot reach RFC status until all invariants here are addressed in its "Invariant Compliance" section.

## 4. Detailed Design

### 4.1 Enforcement Surfaces

| Surface | Stage | Invariant | Carrier |
| --- | --- | --- | --- |
| Coder discipline | write time | RC-5 | Execution role card |
| Code-reviewer check | review time | RC-6 | Review-gate role card |
| Ambient agent rules | ad-hoc edits outside `run` | RC-1..RC-4 | Distributed agent rules (`rules/`) |
| Ventilation scan | audit time | RC-7 | `analyze` workflow checklist |

The ambient surface is mandatory because not every code change in a consumer project flows through the `run` workflow: direct user-prompted edits must obey the same containment, so the distributed agent-rules file states the policy once for every agent.

### 4.2 Detection Heuristic

```plaintext
for each file in release scope (respect .gitignore; skip .design/ and engine dirs):
    flag occurrences of:
        ".design/"                      — any path into the SDD tree
        task-ID tokens ([T-XXXX])       — checklist identifiers
        "PLAN.md" / "TASKS.md" / "INDEX.md" / "RULES.md" / "phase-{n}" file references
        spec filenames registered in INDEX.md
report each as: SDD_REFERENCE_LEAK {file}:{line} → "{matched token}"
```

False-positive guard: matches inside the exempt set (RC-8) are skipped. Findings are advisory (severity: warning) — ventilation never auto-edits product files.

### 4.3 Correct Form Examples

```plaintext
BAD : // Implements T-2B03 (see .design/engine/tasks/phase-2.md)
BAD : """Validator required by l1-input-rules.md §3."""
GOOD: // Reject zero-length payloads: the upstream queue treats them as poison messages.
GOOD: (commit message) feat(parser): add payload guard [T-2B03]
```

## 5. Implementation Notes

1. Amend the Coder card (authoring gate, RC-5) and Code-reviewer card (review gate, RC-6) — carried by their L2 specs.
2. Add the ambient containment section to the distributed agent rules file (RC-1..RC-4).
3. Extend the ventilation checklist with the RC-7 leak scan.
4. Steps 2-3 modify engine files → C14 applies at implementation time.
5. Purge engine-workspace references from already-shipped files (workflow bodies, templates, agent rules): replace dead spec links with inline restatement, replace baked-in workspace names with `{workspace}` placeholders, replace governance file-name citations with protocol names (RC-9). `[ADDED]`

## 6. Drawbacks & Alternatives

- **Ship `.design/` with releases** — rejected: bloats artifacts, exposes internal planning, and contradicts the release-kernel contract.
- **Build-time comment stripping** — rejected: stack-specific, fragile, does not fix docs or identifiers, and the engine has no build step in consumer projects.
- **Drawback**: restating rationale in plain language can drift from the spec wording over time. Accepted: the spec remains the source of truth; code comments state local constraints, not provenance.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CODER-CARD]` | `.magic/roles/coder.md` | Deployed authoring-gate carrier (RC-5). |
| `[REVIEWER-CARD]` | `.magic/roles/code-reviewer.md` | Deployed review-gate carrier (RC-6). |
| `[ANALYZE]` | `.magic/analyze.md` | Ventilation workflow hosting the RC-7 leak scan. |
| `[AGENT-RULES]` | `rules/magic.md` | Distributed ambient policy surface for ad-hoc edits. |
| `[RUN]` | `.magic/run.md` | Execution workflow activating the RC-5/RC-6 gates. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.1.0 | 2026-06-12 | Agent | Added RC-9 (Shipped Self-Containment): shipped engine files must not reference the engine repo's own SDD workspace — closes the gap where RC-8's engine exemption masked engine→`.design/engine/` leaks (15 sites found in first ventilation). RC-8 scope clarified; Implementation Notes step 5 added. |
| 1.0.0 | 2026-06-12 | Agent | Initial Stable. Field-driven: consumer-project releases exclude `.design/`, so SDD references in product code become dead content. Defines RC-1..RC-8 and four enforcement surfaces. |
