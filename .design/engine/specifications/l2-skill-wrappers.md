# L2 Specification: Universal Skill Wrappers

**Version:** 1.6.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Related Specifications

- [l2-workflow-wrappers.md](l2-workflow-wrappers.md) - The source side of the projection: owns the authored frontmatter `description` that §2.3 binds.
- [l1-engine-diagnostics.md](l1-engine-diagnostics.md) - Severity taxonomy for the `error` finding §3.3 records.
- [l1-rule-admission-gate.md](l1-rule-admission-gate.md) - RA-2 (evidence anchor) and RA-5 (user-stated regulations, recorded at the strength stated) govern §3.3's refusal.
- [l2-engine-automation.md](l2-engine-automation.md) - The Engine Meta Update Flow that calls the generator; §3.3 keeps its remaining steps running after a refusal.
- [l2-release-pipeline.md](l2-release-pipeline.md) - The release archive walks `skills/` without validating any frontmatter; part of §3.3's evidence.
- [l2-test-suite.md](l2-test-suite.md) - Coverage of §2.3 and §3.3: the shipped-text contract and the generator fixtures.

## 1. Objective

To provide a seamless interface for disparate AI agents (Claude Code, Gemini, GitHub Copilot, etc.) by projecting Magic SDD Workflows into native "Skills" (Tool-based definitions).

## 2. Architecture

Magic Spec primarily uses Markdown-based workflows for task execution. However, some agents prioritize "Skills" (directories with `SKILL.md`) over slash-commands. This specification defines a projection mechanism to treat Workflows as the Source of Truth and Skills as the generated interface.

### 2.1. File System Projection

| Source Path (Workflow) | Target Path (Skill Wrapper) | Agent Interface |
| --- | --- | --- |
| `workflows/*.md` | `skills/*/SKILL.md` | User-facing tools |
| `.agents/workflows/*.md` | `.agents/skills/*/SKILL.md` | Dev-facing tools |

### 2.2. Skill Format

Each generated `SKILL.md` must include standard YAML frontmatter derived from the workflow's own frontmatter. Its `name` and `description` are bound by the Frontmatter Contract (§2.3).

```markdown
---
name: magic-{command}
description: {description_from_workflow_frontmatter}
---

[Full Content of the Original Workflow]
```

The `name` is the workflow command name (its file name without `.md`) with every `.` replaced by `-` (`magic.analyze` → `magic-analyze`). The dotted form is the command's own name and is not a valid skill name (§2.3).

### 2.3. Frontmatter Contract `[ADDED]`

A host reads two fields of a wrapper before anything else in it: `name` and `description`. The validity limits below belong to the target skill format — a wrapper that breaks one is rejected or silently ignored by the host. The Selection Signal below is the form `description` needs for a host to choose the wrapper at all. Both bind every wrapper the generator writes, from both sources in §2.1.

**Validity limits (hard):**

| Field | Requirement |
| --- | --- |
| `name` | 1–64 characters; lowercase letters, digits and hyphens only; no `<` or `>` character; no word the target skill format reserves (at present its vendor's and its model family's own names); equal to the workflow's file name without `.md`, with every `.` replaced by `-` (`magic.dev.simulate.md` → `magic-dev-simulate`). |
| `description` | Present and not blank; at most 1,024 characters; no `<` or `>` character. |

**Selection Signal (form).** While a host chooses among every skill installed in a project, `description` is the only text it holds about this wrapper — the body is loaded after the choice. It therefore says what the wrapper does and when to use it:

1. **Two parts, in order.** The first sentence states what the workflow does, leading with its primary use, so a host that truncates a long skill listing keeps the part that matters most. A later sentence begins with `Use when` and names the situations that call for the workflow, in the words a user would use for them.
2. **Discriminating.** The `Use when` sentence names the artifact or state the workflow acts on — the plan, a task list, the registry, a rule file, the session position. A bare verb (run, apply, continue, check, start) is never its only cue: other workflows and ordinary requests use the same verbs.
3. **Third person.** The description declares what the workflow does; it never addresses the reader or speaks as the agent: none of the whole words `I`, `we`, `my`, `you` and `your` appears in it.
4. **One field.** The `Use when` sentence lives inside `description`. The wrapper carries no second description-like field, so there is one text to validate, one limit to meet, and no host-side concatenation of two fields that could cut the when-clause off.
5. **One authored source.** The text is the workflow's own frontmatter `description` ([l2-workflow-wrappers.md](l2-workflow-wrappers.md) §5.2). The generator never composes, trims or completes it. For a workflow with no frontmatter block it falls back to placeholder text or the first body line; neither is a valid source, so that wrapper is refused under §3.3. A frontmatter block whose `description` is missing or blank is refused as a validity violation.

The full list of natural-language trigger phrases stays in the workflow body; the `Use when` sentence carries the discriminating subset. The body cannot serve as the selection signal, since a host reads it only after the choice is made.

**Reading.** The checks read the frontmatter the generator is about to write, and its parsed `description` value: a quoted or folded multi-line value is measured as its text, not as its first line, and a frontmatter block that does not parse counts as a missing description. Other frontmatter fields (for example `handoffs`) pass through unchecked; whether each target host accepts them is outside this contract.

> **[REFERENCE] Illustrative description** (the form only — the shipped wording is authored in the workflow, not here): `Executes the planned tasks of the active phase from the task list, in parallel tracks when they are independent. Use when the user asks to start, continue or resume the planned work, to run the next task, or to implement a named task or phase.`

## 3. Synchronization (Source of Truth)

The workflows remain the primary source of truth. Manual modifications to generated `SKILL.md` files are prohibited.

### 3.1. Automation

The `executor.js update-engine-meta` command handles skill synchronization as part of engine meta updates:

1. Scan `workflows/` and `.agents/workflows/` for `.md` files.
2. Extract the description from the YAML header; a workflow with no YAML header falls back to its first paragraph, which §2.3 rule 5 does not accept as a valid source.
3. Generate/update the corresponding skill directories and `SKILL.md` files.
4. Clean up orphaned skills if the source workflow is deleted.

### 3.2. Regeneration Trigger (Independent of Checksum Manifest)

Step 1 above reads `workflows/` directly off disk — it does not consult `.magic/.checksums`. This is a deliberate asymmetry, and the two data sources must never be conflated:

| Mechanism | Reads | Purpose |
| --- | --- | --- |
| `.magic/.checksums` (C14 manifest) | `.magic/` only | Detects drift in the **engine core** the user must never hand-edit; deliberately excludes `workflows/`, `skills/`, `rules/` so those user-customizable wrapper layers stay editable without tripping engine-integrity HALTs. |
| Skill regeneration (this spec, §3.1) | `workflows/` + `.agents/workflows/` | Must fire whenever those source files differ from what was last projected — a concern the checksum manifest was never built to track and explicitly does not cover. |

**Invariant (mandatory)**: skill-wrapper regeneration runs on every `update-engine-meta` **write** invocation, unconditionally — never gated behind the `.magic/` checksum verdict. A write path that skips regeneration because "no changes detected in engine core" is reporting on the wrong data source: `workflows/` can hold real, un-synced changes while `.magic/.checksums` shows nothing, precisely because the manifest was designed to exclude that directory. `update-engine-meta --check` (the read-only mode invoked by the user's pre-commit hook) is exempt from this invariant — it must perform no write of any kind, including a skill regeneration, since it is a verification surface, not a synchronization one.

**Provenance**: written after a production gap. A `workflows/*.md` edit left `.magic/.checksums` untouched (by the design documented in the table above), so a subsequent `update-engine-meta` reported "No changes detected in engine core" and skipped Step 1 through Step 4 entirely — shipping a skill wrapper generated from pre-edit content while the command's own success message implied nothing was left to do.

### 3.3. Generation-Time Validation `[ADDED]`

The generator checks every wrapper against §2.3 before it writes it, and refuses a wrapper that breaks either kind of rule:

| Rule violated | What it protects | Outcome |
| --- | --- | --- |
| A validity limit (the §2.3 table) | The host rejects the wrapper or silently ignores it, so the output is invalid whatever its other merits. | **Refused** |
| A Selection Signal rule the generator can decide mechanically: no `Use when` sentence (rule 1), a first- or second-person word (rule 3), or a description the generator had to synthesize because the workflow has no frontmatter block (rule 5) | The wrapper works but is chosen less reliably, and the check is a heuristic, not a platform limit. The owner decided that such a wrapper is refused all the same, so a weak signal never ships. | **Refused** |

**Basis of the refusal.** For the validity limits, evidence: a limit violation is silent: the host ignores the wrapper and nothing downstream says so. It has already happened once — the dotted form `skills/magic.{command}/` shipped and was found by hand (commit `3f07bfa`, 2026-04-24, "normalize skill names to hyphen convention"), and this spec kept showing that form until 1.5.0. Nothing else catches the class: the suite's projection case pins the name for one fixture only, and the release archive walks `skills/` without reading any frontmatter ([l2-release-pipeline.md](l2-release-pipeline.md)). A wrapper in a release is an external artifact — the class RA-2 of [l1-rule-admission-gate.md](l1-rule-admission-gate.md) treats as irreversible, where the refusal is the hard form that class admits. For the Selection Signal rules the basis is the owner's decision, not evidence of harm — a weak signal is a reversible harm, and RA-5 records a user-stated regulation at the strength stated — so it covers only the rules the generator can decide mechanically.

**Refusal.** A violation of either kind is a defect of the source workflow — the generator cannot repair a description it must not rewrite (§2.3 rule 5) — so the wrapper is never emitted in a degraded form:

1. **Nothing invalid is written.** The wrapper is not created, and an existing valid wrapper for that workflow is left as it was; no partial file is produced.
2. **The failure is named.** The report names the source workflow, the field and the limit or rule — for example `magic.run: description: 1,203 characters, limit 1,024 (§2.3)` or `magic.run: description: no "Use when" sentence (§2.3 rule 1)`.
3. **It is recorded, and the run does not end in success.** The failure is recorded as an `error` finding (DG-2 of [l1-engine-diagnostics.md](l1-engine-diagnostics.md): something the engine set out to do did not happen, and the run continued). The generator reports the refusal to its caller instead of aborting, so `update-engine-meta` still performs the remaining steps of its flow ([l2-engine-automation.md](l2-engine-automation.md) §Engine Meta Update Flow — the snapshot refresh and the checksum regeneration — so the engine metadata never describes a half-finished state) and then exits non-zero without its success line. A direct run of the generator exits non-zero after the same all-wrappers pass.
4. **Every wrapper is checked in every run.** Validation covers all workflows of both sources before the run ends, so one defect cannot hide another, and a valid wrapper beside a refused one is still projected.

**Judgment and the shipped output.** Rule 2 (discriminating) and the primary-use lead of rule 1 are judgments no script can make: they are reviewed at authoring — the prompt-engineer's scope-ambiguity dimension — and probed by the cognitive selection cases of the suite. The harness holds the shipped output to the mechanical rules as well ([l2-test-suite.md](l2-test-suite.md), Shipped-text contract coverage): a refusal leaves the previous wrapper as it was, so a wrapper that predates the check, or one a refusal left in place, still fails the suite.

**Always.**

- **Read-only surfaces gain no failure mode.** `update-engine-meta --check` never runs the generator (§3.2). A dry run (`MAGIC_DRY_RUN`) checks, reports and exits exactly as a real run would, but writes nothing.
- **Scope.** Both outputs — `skills/` and `.agents/skills/` — are checked alike. A skill that is not generated (it carries no generated-file marker, so the generator already leaves it alone) is outside this contract.

**Order of adoption.** The check refuses a workflow whose description lacks the `Use when` sentence, so the descriptions of every workflow in both sources — the seven shipped ones, the dev-facing ones and the generator's own test fixtures — are rewritten in the same change that enables the check, or before it. Enabled first, the next `update-engine-meta` run refuses every wrapper.

## 4. Integration & Deployment

### 4.1. Development Workspace

`magic-dev-init` will be updated to create junction/symlink points for the generated skill directories, ensuring the agent sees them as active tools.

### 4.2. End-User Installation

GitHub Release archives include the generated `skills/` directory, ensuring that all available workflows are also exposed as skills for agents that support the Skills format.

## Canonical References

| Path | Role |
| --- | --- |
| `skills/magic-analyze/SKILL.md` | Generated skill wrapper for analyze |
| `skills/magic-graph/SKILL.md` | Generated skill wrapper for graph |
| `skills/magic-rule/SKILL.md` | Generated skill wrapper for rule |
| `skills/magic-run/SKILL.md` | Generated skill wrapper for run |
| `skills/magic-spec/SKILL.md` | Generated skill wrapper for spec |
| `skills/magic-status/SKILL.md` | Generated skill wrapper for status (implementation deliverable; produced by update-engine-meta sync from `workflows/magic.status.md`) |
| `skills/magic-task/SKILL.md` | Generated skill wrapper for task |
| `dev/scripts/sync-skills.js` | Skill-wrapper generator; the point where the §3.3 validation applies |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.6.0 | 2026-10-05 | Agent | §3.3 now **refuses** a wrapper that breaks a mechanically decidable Selection Signal rule — no `Use when` sentence, a first- or second-person word, a synthesized description — exactly as it refuses a validity-limit violation; 1.5.0 had projected such a wrapper with a `warning` (a reversible harm and a heuristic check, RA-4). Origin `user-stated`: the owner's override "refuse on form too" to that Decision Record, recorded at the strength stated (RA-5) and kept to the rules the generator can decide — rule 2 (discriminating) and the primary-use lead stay with review and the selection cases. The harness keeps holding the shipped output to the same rules, because a refusal leaves the previous wrapper in place. New **Order of adoption** paragraph: the seven shipped descriptions, the dev-facing ones and the generator's two test fixtures (placeholder descriptions) are rewritten in the same change that enables the check, or before it, since the first `update-engine-meta` run after it would otherwise refuse every wrapper. §2.3 rule 5, the §5 invariants and the Related Specifications follow (the RA gate is now cited). Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.5.0 | 2026-10-05 | Agent | Added §2.3 **Frontmatter Contract** — the validity limits of the target skill format (`name` grammar and length, `description` presence and length, no angle brackets) and the **Selection Signal** form of `description`: what the workflow does, then a `Use when` sentence, discriminating, third person, one field, authored only in the workflow's frontmatter — and §3.3 **Generation-Time Validation** in two tiers set by what each rule protects (a wrapper that breaks a validity limit is refused, named, recorded as an `error` finding and fails the invocation; a Selection Signal shortfall the generator can decide mechanically is projected with a `warning` finding, the harness being its hard stop — a reversible harm and a heuristic check take the weakest sufficient form; both generator outputs; hand-crafted skills out of scope). The refusal cites its evidence (the dotted skill names that shipped once, commit `3f07bfa`; no other check reads wrapper frontmatter before a release) and composes with the Engine Meta Update Flow — the refusal is reported to the caller, which completes its remaining steps and then exits non-zero, so the metadata never describes a half-finished run. Corrected §2.2 and the §5 Naming invariant: the dotted `magic.{command}` form they showed is the command's own name, which the grammar rejects as a skill name; the generator, the shipped output and the suite's projection case already used the hyphenated form. §3.1 step 2 notes that the first-paragraph fallback is not a valid source. Provenance: measured on the shipped output (engine 2.1.133) — all seven user-facing wrappers carry a 51–88 character description that says what the workflow is and never when to use it, their natural-language trigger phrases sit only in the body (which a host loads after it has already chosen the wrapper), and the generator checked neither limit. Source: a reference-mining pass over an external skill-authoring guide, recorded here by class only. Added a Related Specifications section for the links this amendment creates. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.4.0 | 2026-08-28 | Agent | Added §3.2 Regeneration Trigger — skill regeneration MUST run on every `update-engine-meta` write invocation, gated on the `workflows/` source it actually reads, never on the `.magic/` checksum manifest that deliberately excludes that directory for an unrelated reason (protecting user-customizable wrapper layers from engine-integrity HALTs). `--check` stays exempt and must perform no write. Authored after a production gap: a `workflows/`-only edit left the checksum manifest clean, so `update-engine-meta` reported "No changes detected" and silently skipped regeneration, shipping a stale skill wrapper. New §5 Trigger Independence invariant. |
| 1.2.0 | 2026-05-07 | Agent | Added Layer/Implements header fields. Updated skill dir names (magic.analyze → magic-analyze format). Added magic-graph. Removed stale sync-skills.js reference. |
| 1.1.0 | 2026-04-29 | Agent | Replaced legacy package deployment with GitHub Release archive distribution. |

## 5. Invariants

- **Parity**: Content of `SKILL.md` (excluding frontmatter) must exactly match the source workflow.
- **Naming**: a skill `name` is the workflow command name with every `.` replaced by `-` (e.g., `magic.analyze` → `magic-analyze`) and satisfies the §2.3 grammar.
- **Read-Only**: Generated skills are marked as read-only or contain a warning comment at the top.
- **Trigger Independence** (§3.2): regeneration runs on every write invocation of `update-engine-meta`, gated on nothing narrower than the source files it actually reads (`workflows/`, `.agents/workflows/`) — never on the `.magic/` checksum manifest, which deliberately excludes that directory for an unrelated reason.
- **Frontmatter Validity** (§2.3, §3.3): no wrapper is written whose `name` or `description` breaks a validity limit or a Selection Signal rule the generator can decide mechanically; the failure names the workflow, the field and the limit or rule, is recorded as an `error` finding, and fails the invocation.
- **Selection Signal** (§2.3, §3.3): every generated wrapper's `description` states what the workflow does and, in a `Use when` sentence, when to use it — in the third person, discriminating, in one field, authored only in the workflow's own frontmatter. The mechanical rules (the `Use when` sentence, the person words, the authored source) are enforced by refusal and held in the shipped output by the harness; discrimination and the primary-use lead are judged at review and probed by the selection cases.
