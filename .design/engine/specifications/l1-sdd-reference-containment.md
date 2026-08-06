# SDD Reference Containment Specification

**Version:** 1.3.0
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

A second field report (engine 2.1.49) surfaced a leak source none of RC-1..RC-10 covers: `finalize.js`'s single-spec CHANGELOG branch composes `` Updated specification `{artifact-id}` (workspace) `` and writes it straight to the product's root `CHANGELOG.md` — no Coder typed the string, no Code-reviewer reviewed a diff, because the script generates and applies the change atomically. The multi-spec branch already used the safe generic form (`` Updated {N} specifications (workspace) ``); only the single-item path interpolated the identifier. See **RC-11**.

## 2. Constraints & Assumptions

- `.design/` is a development-time workspace; release packaging MAY exclude it entirely.
- Git metadata (commit messages, PR descriptions) is not part of a release artifact and remains a legitimate traceability channel.
- Engine directories in consumer projects (`.magic/`, `workflows/`, `skills/`, `rules/`) are engine-owned and read-only; cross-references inside the engine itself are out of scope.
- Enforcement is cognitive (workflow and role instructions), not a build-time stripper: the engine has no compile step in consumer stacks.

## 3. Core Invariants (Layer 1 only)

Rules that Layer 2 implementations MUST NOT violate:

- **RC-1 (One-Way Traceability)**: References cross the SDD boundary in one direction only: SDD artifacts → product files. Product files never reference SDD artifacts.
- **RC-2 (Containment Scope)**: "Product files" means every release-shippable artifact: source code (identifiers, string literals), comments and docstrings, test names, build/config files, and user-facing documentation (README, CHANGELOG). Forbidden references: task IDs, phase designators, SDD system files (`PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`), specification file names, and any `.design/…` path.
- **RC-2.1 (Notation Independence)**: a containment check MUST match a forbidden class in **every notation it can appear in**, not in the notation the SDD layer happens to use internally. Concretely: task IDs match `T-\d+[A-Z]\d+(\.\d+)?` — bracketed *and* bare, any phase width; phase designators match both the file form (`phase-\d+(\.md)?`) and the prose form (`[Pp]hase[-\s]\d+`). Binding a check to the bracketed checklist form (`[T-XXXX]`) or to a fixed width is a **specification defect**, not a tuning choice: those are the SDD layer's own internal spellings, and a reference leaks precisely when it is *quoted out* of that layer — bare, in prose, inside a test name. Field evidence: a consumer project accumulated 121 leaks across 44 files with zero reports, because the documented literal matched almost none of them. `[ADDED]`
- **RC-3 (Self-Containment)**: Every comment and documentation passage must remain fully meaningful with `.design/` absent. Design rationale that matters at the code site is restated in plain language in place; provenance ("which task produced this") is never stated in code.
- **RC-4 (Traceability Relocation)**: The task ↔ code mapping lives exclusively in the SDD layer (task `Changes` fields, phase files) and git metadata (commit messages, PR descriptions).
- **RC-5 (Authoring Gate)**: The code-producing role MUST NOT introduce violations — write-time prevention.
- **RC-6 (Review Gate)**: Diff review MUST fail any diff that introduces an SDD reference into product files — merge-time prevention.
- **RC-7 (Leak Detection)**: Project ventilation MUST scan existing product files for violations and report each as an actionable finding. Ventilation owns **detection only** — it is read-only by contract and never edits product files. `[MODIFIED]`
- **RC-10 (Remediation Owner)**: Every detection surface MUST name the owner that repairs what it finds; a detection surface with no named owner is incomplete. Because ventilation is read-only and the spec-authoring workflow's write scope is confined to `.design/`, no workflow that *detects* a leak may *fix* it. Remediation therefore routes through the normal pipeline: the `SDD_REFERENCE_LEAK` finding carries the path `→ /magic.task {ws}` to schedule a containment-cleanup task, which `/magic.run` executes under the code-producing role — the same role that owns the RC-5 write-time gate. Detection without a routed owner is what lets leaks re-accumulate between audits. `[ADDED]`
- **RC-8 (Exemptions)**: Exempt from RC-1/RC-2: the `.design/` subtree itself; engine directories; git metadata; contributor-facing process documentation that documents the SDD workflow itself (there the reference IS the content, not traceability metadata). The magic-spec repository documents the SDD process as its product domain — its references to `.design/` are content, not leaks. The engine-directory exemption covers cross-references **among shipped files only**; references from shipped files into the engine repository's own SDD workspace are governed by RC-9, not exempted. `[MODIFIED]`
- **RC-9 (Shipped Self-Containment)**: Files distributed with the engine (`.magic/`, `workflows/`, `skills/`, `rules/`, and templates instantiated into user projects) MUST NOT reference the engine repository's own SDD workspace: no `.design/engine/…` paths and no engine-workspace specification file names. Normative content is restated inline or cross-referenced to another shipped file. Three forms stay valid: consumer-generic SDD paths (`.design/{workspace}/…`, `$DESIGN_DIR`, the user's own `.design/INDEX.md`), stable in-text protocol labels (`WI-n`, `DA-n`, `C{n}`), and illustrative examples of forbidden forms. `[ADDED]`
- **RC-11 (Generator Self-Containment)**: Text an engine script composes and writes directly into a product file is bound by RC-1/RC-2 exactly as text a role authors by hand — machine generation is not an exemption. This surface receives no RC-5/RC-6 mediation: nothing is typed by a Coder or reviewed as a diff by a Code-reviewer, because the script generates and applies the change atomically inside a workflow's finalize step. It is also a weak signal for RC-7's cognitive scan: a spec's **artifact ID** — the identifier the engine derives internally by stripping the `l1-`/`l2-` prefix and `.md` extension (e.g. `model-runtime` from `l1-model-runtime.md`) — carries none of the markers (path segment, extension, registered filename) the scan looks for, so a leaked artifact ID reads as an unremarkable word rather than an SDD reference. Enforcement is regression-test coverage on the generator function's output shape, pinned in the finalize-pipeline harness ([l2-test-suite.md](l2-test-suite.md)) — not RC-5/RC-6/RC-7, none of which reach this surface. `[ADDED]`

> L2 spec cannot reach RFC status until all invariants here are addressed in its "Invariant Compliance" section.

## 4. Detailed Design

### 4.1 Enforcement Surfaces

| Surface | Stage | Invariant | Carrier |
| --- | --- | --- | --- |
| Coder discipline | write time | RC-5 | Execution role card |
| Code-reviewer check | review time | RC-6 | Review-gate role card |
| Ambient agent rules | ad-hoc edits outside `run` | RC-1..RC-4 | Distributed agent rules (`rules/`) |
| Ventilation scan | audit time | RC-7 | `analyze` workflow checklist |
| Cleanup task | remediation time | RC-10 | `task` → `run` pipeline (Coder role) |
| Generator output | generation time | RC-11 | `dev/tests/engine.js` regression — no role card mediates this surface |

The ambient surface is mandatory because not every code change in a consumer project flows through the `run` workflow: direct user-prompted edits must obey the same containment, so the distributed agent-rules file states the policy once for every agent.

The generator surface (RC-11) is structurally different from the other four: RC-5/RC-6/RC-7 all assume a human or agent produces or reviews the text before it reaches a product file. A finalize-pipeline helper composes and writes CHANGELOG/README fragments with no such step, so the only enforcement available is pinning the generator function's output shape with a regression test — the same discipline already applied to `phase-archiver.js`'s eligibility predicate (§6 of `l2-engine-finalization.md`).

### 4.2 Detection Heuristic

```plaintext
for each file in release scope (respect .gitignore; skip .design/ and engine dirs):
    flag unconditionally:
        ".design/"                          — any path into the SDD tree
        /T-\d+[A-Z]\d+(\.\d+)?/             — task IDs, BRACKETED AND BARE
        /phase-\d+(\.md)?/                  — phase file references
        "PLAN.md" / "TASKS.md" / "INDEX.md" / "RULES.md"
        spec filenames registered in INDEX.md
    flag contextually (self-containment test, see below):
        /[Pp]hase[-\s]\d+/                  — prose phase designators
report each as: SDD_REFERENCE_LEAK {file}:{line} → "{matched token}"
if finding_count > 0: state remediation path → /magic.task {ws}   (RC-10)
```

Per RC-2.1 the task-ID and phase patterns are notation-independent: bare `T-22A01` and prose `Phase 20 Track B` are the forms that actually leak, because a reference leaves the SDD layer by being *quoted out* of its internal bracketed/file spelling.

Prose `Phase {n}` is the sole contextual class — many domains own the word (handshake phases, build phases). Disambiguate with RC-3's self-containment test: if the passage stops making sense once `.design/` is absent, it denotes the plan's phase and is a leak; otherwise it is domain vocabulary. Report contextual hits in a separate sub-list so they can be triaged apart from unconditional ones.

False-positive guard: matches inside the exempt set (RC-8) are skipped. Findings are advisory (severity: warning) — ventilation never auto-edits product files; repair is routed per RC-10.

### 4.3 Correct Form Examples

```plaintext
BAD : // Implements T-2B03 (see .design/engine/tasks/phase-2.md)
BAD : """Validator required by l1-input-rules.md §3."""
BAD : // T-22A01: @test: block round-trip          <- bare ID, two-digit phase
BAD : // Added in Phase 20 Track B                 <- prose phase designator
BAD : fn test_phase_22_closing_validation() {}     <- leak in a test name
BAD : (CHANGELOG.md, generated) Updated specification `model-runtime` (main)
GOOD: // Reject zero-length payloads: the upstream queue treats them as poison messages.
GOOD: // Round-trip must be lossless: the encoder and decoder share no state.
GOOD: (commit message) feat(parser): add payload guard [T-2B03]
GOOD: (CHANGELOG.md, generated) Updated specification (main)
GOOD: (CHANGELOG.md, generated) Updated 3 specifications (main)
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
- **Extend RC-7's regex to match bare artifact-ID stems** — rejected: a stem like `model-runtime` or `engine-core` is indistinguishable from ordinary compound-word prose without cross-referencing every product-file token against the live spec registry on every scan, which would produce large false-positive volumes for common English compounds. Fixing at generation time (RC-11) is precise instead of probabilistic: the generator has ground truth that a string originated from a spec's own identifier at the moment it composes it, no whole-file semantic diffing required.

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
| 1.3.0 | 2026-08-06 | Agent | Added **RC-11 (Generator Self-Containment)**: RC-1/RC-2 bind to text an engine script composes and writes into a product file, exactly as to hand-authored text — closes a leak class none of RC-5/RC-6/RC-7 can reach, since no role authors or reviews generator output. §4.1 gained a Generator-output enforcement row; §4.3 gained a generated-CHANGELOG BAD/GOOD pair; §6 gained the rejected-alternative rationale for why the fix belongs at generation time rather than in RC-7's detection regex. Field evidence: `finalize.js`'s single-spec CHANGELOG branch interpolated the spec's artifact ID (`model-runtime`, stripped of `l1-`/`.md`) into root `CHANGELOG.md` — the multi-spec branch already used safe generic wording, so only the single-item path leaked (field report, engine 2.1.49). |
| 1.2.0 | 2026-08-06 | Agent | Added **RC-2.1 (Notation Independence)** and **RC-10 (Remediation Owner)**; RC-7 narrowed to detection-only; §4.2 heuristic split into unconditional and contextual classes with explicit patterns; §4.3 gained bare-form BAD examples. Two compounding defects: (a) every audit surface bound the task-ID class to the bracketed checklist literal `[T-XXXX]` and the phase class to the file form `phase-{n}` — the SDD layer's *internal* spellings — so bare `T-22A01` and prose `Phase 20 Track B`, the forms references actually take when quoted into code, matched nothing; (b) RC-7 called ventilation "the cleanup path" while ventilation is read-only and the spec workflow's write scope is `.design/`-only, leaving detection with no repair owner. Field evidence: 121 leaks across 44 files in a consumer project, unreported, 16 of them inside a crate whose purpose is standalone extraction (field report, engine 2.1.49). |
| 1.1.0 | 2026-06-12 | Agent | Added RC-9 (Shipped Self-Containment): shipped engine files must not reference the engine repo's own SDD workspace — closes the gap where RC-8's engine exemption masked engine→`.design/engine/` leaks (15 sites found in first ventilation). RC-8 scope clarified; Implementation Notes step 5 added. |
| 1.0.0 | 2026-06-12 | Agent | Initial Stable. Field-driven: consumer-project releases exclude `.design/`, so SDD references in product code become dead content. Defines RC-1..RC-8 and four enforcement surfaces. |
