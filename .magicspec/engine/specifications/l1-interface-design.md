# Interface Design: UI/UX, Layout and Front-End Work

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

How the engine treats a product's user interface as specified work rather than as styling decided at the keyboard. When a product has an interface a person sees and operates, its design context is gathered before anything is invented; its design system is recorded once as a specification; every screen or flow specification states its states, its accessibility requirements and its behaviour across sizes; and the implementation is verified by looking at it, against those statements. The `ui-ux-designer` role carries this through specification, planning and execution.

## Related Specifications

- [l1-role-system.md](l1-role-system.md) - Registers the `ui-ux-designer` role (executor).
- [l1-product-simulation.md](l1-product-simulation.md) - Interface scenarios exercise the states and journeys this spec requires.
- [l1-engine-core.md](l1-engine-core.md) - The execution gates the role works inside.
- [l2-role-cards-execution.md](l2-role-cards-execution.md) - Where the role's card is specified at deployment.

## 1. Motivation

The engine's roles cover planning, coding, review, testing, debugging and documentation, and none of them owns how an interface looks, reads and behaves. An agent asked for a screen writes markup and styles from defaults: the result is the generic look the design references call "AI slop", states other than the happy path are missing, and nothing checks contrast, keyboard use or a narrow window. The backlog has held a `frontend-specialist` role as parked "with no current demand signal" since 2026-09-30; the owner's list of 2026-10-29 is that signal — a UI/UX role covering layout and front-end work, informed by the design references collected in `.references/.design`.

A reference-mining pass over that collection (283 skills in ten collections) found the same mechanics recurring across independent authors, recorded here by class:

1. **Context before invention** — load the existing brand, design system and earlier decisions first; start cold only when there is nothing.
2. **A declared design system before code** — tokens (colour, type, spacing, radius, elevation, motion) and components fixed in one place, with per-page overrides kept apart from the master.
3. **An early draft** — a rough version shown before the full build, so a wrong direction costs little.
4. **States and edge cases enumerated in the handoff** — empty, loading, error, partial, disabled, long content, offline, localization.
5. **Accessibility as a gate**, not an afterthought — contrast, keyboard and focus order, labels, reduced motion.
6. **Verification by looking** — render the result and check it against the specification; a review of the change, not of the whole codebase.
7. **Grounded taste** — style chosen from references or the existing system, never from generic defaults, and the decisions persisted for reuse.

## 2. Constraints & Assumptions

- Technology-neutral: "interface" covers any surface a person sees and operates — a web page, a desktop or mobile screen, a terminal interface.
- Design artifacts are specifications in the state folder; the product receives only code and its own assets (containment).
- **Assumption (forecast):** one role covers design, layout and front-end work, because R4 forbids modelling a "developer" as a role and the coding itself stays with `coder`, who adopts this stance for interface work. Runner-up: separate designer and front-end roles. Override: `/magicspec:spec amend l1-interface-design.md "split the role"`.

## 3. Core Invariants

- **UI-1 Context first.** Before an interface is specified, the existing design context is gathered and cited: the product's design system specification if one exists, its brand material, the current interface. Absent all three, the specification says so and states where its choices come from.
- **UI-2 One design system.** A product with an interface has one design-system specification: its tokens, its components with their variants and states, and the rules for overriding them in one place. Screen and flow specifications reference it and never redefine a token.
- **UI-3 States are specified.** Every screen or flow specification states, for each view: the normal state and the empty, loading, error, partial, disabled and long-content states that apply to it, and what the person can do in each.
- **UI-4 Accessibility is specified.** Every interface specification states its accessibility requirements — contrast, keyboard operation and focus order, accessible names, reduced motion, and the sizes or windows it must work at — as verifiable statements.
- **UI-5 Early draft.** For a new screen or flow, the first task produces a draft the person can look at before the full build. The draft is recorded and the build continues; nothing pauses for a look (DA-2), and a correction arrives as the person's interruption or a later amendment.
- **UI-6 Verified by looking.** A task that changes an interface is verified by rendering it where the session can (a screenshot, a driven browser or a captured terminal) and comparing it with the statements of UI-2 to UI-4; where it cannot render, the task says so and the check is a review against the specification. The verification method is named in the task's `Verify` line.
- **UI-7 The role.** `ui-ux-designer` (executor) writes the interface sections of specifications and the design-system specification, adds design acceptance to interface tasks at planning time, and is the stance `coder` adopts for layout and front-end work. It hands off to `code-reviewer`, `test-engineer` and, for journeys, `simulator-tester`.

## 5. Detailed Design

### 5.1 Where the Role Fires

| Workflow | Gate | Output |
| --- | --- | --- |
| `spec` | a specification describes an interface | interface sections (UI-3, UI-4); the design-system specification (UI-2) |
| `plan` / `task` | a phase holds interface work | the draft task (UI-5); design acceptance in `Verify` lines (UI-6) |
| `run` | a task changes an interface | implementation in the role's stance; visual verification (UI-6) |

### 5.2 Interface Section of a Specification

```plaintext
## Interface
Design system: {design-system spec} (tokens, components used)
Views:
  {view}: normal | empty | loading | error | partial | disabled | long content
Accessibility: contrast {level}; keyboard: {order}; names: {...}; reduced motion: {...}
Sizes: {narrowest} … {widest}
```

## 6. Implementation Notes

1. The role card (`l2-role-cards-execution.md`) with `skills_recommended` pointing at design skills as advisory hints (R6).
2. A design-system specification template among the engine templates.
3. The parked `frontend-specialist` backlog item is closed by this specification.

## 7. Drawbacks & Alternatives

- **Heavier interface specifications.** Accepted: the states and accessibility statements are exactly what goes missing without them.
- **Delegating to an installed design skill instead of a role** — rejected as the mechanism: skills are optional and replaceable (R6); the role names the stance and the gates, and may recommend a skill.
- **Visual regression tooling as the check** — deferred: a product may add it; the engine requires only that the result is looked at.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[DESIGN-REFS]` | `.references/.design/` | The collection mined for §1 (local, not part of the product). |
| `[CODER]` | `skills/magicspec/roles/coder.md` | The executor that adopts the stance. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-29 | Agent | Created from the owner's list of ideas (a UI/UX role for layout and front-end work, informed by `.references/.design`). Reference-mining over the collection recorded by class only. Closes the parked `frontend-specialist` backlog item. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
