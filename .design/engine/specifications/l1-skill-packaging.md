# Single-Skill Packaging

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

The engine is delivered as one self-contained skill: a single folder that holds everything needed to run, verify and update it. Only what a host agent requires to *find* the engine — an always-on rule, command entries, links — lives outside that folder, and all of it is generated from it. This specification states the invariants that packaging must keep; the layout and the delivery mechanics are in the implementation specifications.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) - Defines the engine's workflows and the release-kernel boundary this packaging redraws.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - The scaffold boundary (RC-12): the engine must stay removable by deleting directories; SP-6 restates that for the new unit.
- [l1-documentation-system.md](l1-documentation-system.md) - Distribution documentation that must follow the packaging.
- [l2-skill-layout.md](l2-skill-layout.md) - Folder layout, location resolution, versioning and delivery order.
- [l2-skill-distribution.md](l2-skill-distribution.md) - The always-on rule, the command surfaces, installation, the archive and the migration.

## 1. Motivation

The engine reaches a project as four sibling folders in its root, each with a generic name that can collide with the project's own. Installing means copying four things; removing means finding four things. The engine version and the integrity manifest cover only one of the four, so a change to the others carries no version of its own and its distribution depends on a manual step. Deciding which script belongs to the shipped part and which to the maintenance part takes a five-step trace because the shipped part is not one place.

The widely adopted skill format — a folder with an entry file, scripts and reference material — already answers the packaging question for agent tooling. Adopting it turns the engine into one unit with one name, one version and one integrity check, and leaves the project root to the project.

## 2. Constraints & Assumptions

- The engine's mandatory runtime is already an interpreter every user has; packaging adds no runtime.
- Hosts differ in where they look for skills, in whether they load rules unconditionally, and in how a command is registered. No host behavior is assumed that the delivery specifications have not marked verified.
- The engine builds itself: its own repository is the first consumer of the layout, and every change to the layout is made with the engine that is being changed.
- **Assumption (forecast):** a command typed as plain text with an argument (`magicspec task`) is understood by every host that loads the skill, while a registered command with its own namespace exists only where the host provides one. Override: verify per host before a surface is promised in documentation.

## 3. Core Invariants

- **SP-1 One folder, one version.** Everything the engine needs to run, verify and update itself is inside one folder. That folder has one version and one integrity manifest covering all of it; a change to any file in it is a version event. No part of the shipped engine is versioned by hand.
- **SP-2 Location independence.** The engine behaves the same wherever the folder is installed and however deep. It finds the project from the working context, never from its own location; it finds its own resources from its own location, never from the project. Moving the folder, linking it or serving it from a shared cache changes no result.
- **SP-3 Projections are generated, never authored.** Whatever must exist outside the folder is derived from it by one generator: it can be deleted and regenerated without loss, carries no logic of its own, and is checked for staleness against its source.
- **SP-4 Always-on text lives outside demand-loaded content.** A rule that must hold in a session before any skill is invoked is installed where the host loads rules unconditionally. Its source stays inside the folder, and its wording is the same in every installation.
- **SP-5 One source per workflow.** Each workflow is defined once. Every command surface — plain-text routing, a host's registered command, a plugin entry — resolves to that definition and differs only in how the host registers it. Removing a surface removes no capability.
- **SP-6 Removable without trace.** Deleting the folder and its generated projections returns the project to its state before installation, except for the project's own SDD state. No product manifest is edited to install or to remove the engine.
- **SP-7 Maintenance tooling is not shipped, and the developer repository is told apart by one signal.** The tools that produce, verify and test the folder live outside it. One named predicate, defined in one place, is true only in the engine's own repository; every shipped behavior that differs between the two keys on it.
- **SP-8 State is not engine.** The project's SDD state lives outside the folder, under a name defined in exactly one place. Replacing the folder touches no state, and a change to the state layout ships with a migration.
- **SP-9 Every delivery step leaves a working engine.** The restructuring proceeds in steps, each of which ends with the engine runnable, its test harness green and its own repository still able to build itself.
- **SP-10 Migration is explicit.** A project on an earlier layout reaches the current one by one documented, scripted and verifiable path that never half-converts: either the old tree is intact or the new one is complete, and an old tree that has been edited is reported, not overwritten.

> L2 specs cannot reach RFC status until every invariant above is addressed in their Invariant Compliance section.

## 4. Drawbacks & Alternatives

- **Keep four folders and add a pointer file** — rejected: it leaves SP-1 and SP-6 unmet and the root cluttered; the cost it avoids (a layout change) is paid once, the clutter on every install.
- **Skill only, no outside rule** — rejected: skill content loads on demand, while the engine's session rules (drift detection, finalization, resume, containment) must hold before and outside any invocation (SP-4).
- **Per-host engine copies** — rejected: it multiplies versions and defeats SP-1; hosts that share a skills folder share one copy.
- **Cost accepted:** a layout change is breaking for installed projects (SP-10 provides the path), and every shipped text that names a path changes with it.

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-28 | Agent | Initial draft from the owner's restructuring proposal and the analysis of the existing layout: ten packaging invariants. Layout and delivery are in the two implementation specifications. Post-Update Review: spec-critic PASS, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
