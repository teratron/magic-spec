# SDD Document Set (4.0)

**Version:** 1.3.1
**Status:** Stable
**Layer:** concept

## Overview

The documentation architecture of an SDD workspace from engine version 4.0.0: what documents a workspace holds, how each fact is addressed, how a task's reading is computed, how the build is remembered, and how an input that arrives after the documents exist is recorded and placed. It replaces the 3.x workspace of a registry, layered specifications, a phase plan and a task ledger. It serves the full cycle from an idea to code: an idea becomes product, rules and behaviour units; the plan orders milestones by priority; tasks are written per stack; a builder reads one computed pack per task; later inputs become recorded changes. The format was designed and measured outside this repository, in a documentation lab, before it was adopted here (§1).

## Related Specifications

- [l2-sdd-document-set-engine.md](l2-sdd-document-set-engine.md) - Its realization in this engine: the workspace tree, the checker and pack scripts, the workflows, the migration from 3.x and the release.
- [l1-engine-core.md](l1-engine-core.md) - The engine contract whose workspace architecture and templates subsystem this specification supersedes (§6).
- [l1-plan-command.md](l1-plan-command.md) - Planning, whose phases become milestones.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Containment, which this specification keeps as invariant I13 with the new address forms.
- [l1-session-continuity.md](l1-session-continuity.md) - The recorded state of work, which becomes the memory files.
- [l1-documentation-system.md](l1-documentation-system.md) - The project's own knowledge base under `docs/`; a different subject (the name is close, the scope is not).

## 1. Motivation

The 3.x workspace grew from use, not from measurement. Its specifications are written per topic and per layer and are read whole; the plan holds phases of specifications; a task names files and a verify line; what a builder must read is chosen by the builder. Nothing tells whether a builder that reads the documents, and only them, writes what the author meant.

The architecture specified here was built the other way round. Finished projects were documented in the format under test; clean-context builders replayed their builds from the documents alone; independent auditors compared every item of every answer with the real code; each loss was traced to a format gap or a content gap, and the format was revised. The measurements behind the adoption:

- **Building from the documents.** Five projects in four languages, documented in reverse from their code. Line agreement of the builders' answers with the real code rose from 81 % to 96 % over the revisions. In two compiled replays the builders wrote the code and the projects' own tests, which no builder saw, gave the same outcome on their code as on the real code (50 of 52 and 144 of 144 per test).
- **Inputs after the documents exist.** Documenters with no code placed real release notes and commits into the documents: 2 of 5 right at first, then 3 of 4, 2 of 2, 3 of 4, 2 of 2 and 5 of 6 as the change rules were revised; an input the documents already satisfy and an input that names no place now end in the right status without work.
- **Another stack.** A builder on a second stack, given the neutral layer only, covered the behaviours with few concept leaks once the neutral writing rules (§5.3) were in place.
- **The auditors.** A second audit of three samples found every difference above minor that the first had found; only the counting of minor items differed.

What was not measured is the forward path: a documenter that has only an idea writes the first documents, and builders build from them. The release of 4.0 is gated on that run (C-3). It was measured once, on 2026-11-24: the first milestone of an unseen product was built from packs and observed (218 tests pass), and the run failed three of its pre-registered criteria for gaps of the format that only a forward run exposes. The format was amended for them (1.1.0: §5.3, §5.5, §5.6, §5.9), and the run is repeated on the same idea. It was repeated on 2026-11-25 with those amendments and did not pass either (criteria 5 and 6; every finding of the first run closed in its stated form, new smaller ones found). The format was amended again for them (1.2.0: §5.1, §5.3, §5.5, §5.6, §5.8), and the run is repeated a third time on the same idea. The third run, on 2026-11-25, built and observed its milestone, closed every cross-stack leak and met every earlier finding no more, and did not pass criterion 6 (nine small format items, none of which changed what was built). The owner of the gate then decided what criterion 6 counts (C-3), the format was amended for the nine items (1.3.0), and the run is repeated a fourth time on the same idea. The fourth run, on 2026-11-25, built the whole product as its first milestone and observed it by running it, and did not pass: criterion 5 (the second reading repeated two cross-stack leaks) and criteria 3 and 4 as written; criterion 6 held under the owner's measure.

## 2. Constraints & Assumptions

- **C-1 One set per workspace.** A workspace holds one document set; a repository with several products or stacks holds several workspaces, as in 3.x.
- **C-2 Plain text.** Every document is Markdown with the fixed field lines of §5; a checker reads them without a model.
- **C-3 Forward gate.** The format is not released for projects before one forward run passes: an agent given only a product idea writes the set, builders build every task of the first milestone from computed packs, and the milestone's checks hold on what they built. **Run 1 (2026-11-24) did not pass** (its criteria 1, 5 and 6; record `.magicspec/engine/simulations/forward-gate.md`): the amendments the record names are made in 1.1.0 (§5.3 a rule's `From` is written by the plan stage; a convention only the stack has is a stack rule the tasks it governs list in Context; the neutral writing table gains its rows for text and calendar rules; five guidance lines of the forms), and the gate stays closed until a second run on the same idea passes the same criteria. **Run 2 (2026-11-25) did not pass** (criteria 5 and 6; the same record, section Run 2): the amendments its evaluation names are made in 1.2.0 (the pack states the containment of the documents; an extended file of any kind is marked and Done before follows After directly or not; which rules a task lists; how a milestone is observed; the empty lists, the marks and the pinned tools; the review repeated until a reading finds no earlier leak), and the gate stays closed until a third run on the same idea passes the same criteria. **Run 3 (2026-11-25) did not pass** (criterion 6; the same record, section Run 3): the amendments its evaluation names are made in 1.3.0 (an owner for the stack's manifest; a binding unit built by one task; the runtime reaching the builder; the empty `Realizes`, one visibility per unit and the binding's interface in the pack; `Needs` without transitive milestones; what an external need is; how a vocabulary word is matched; and the first milestone observed by running the product), and the gate stays closed until a fourth run on the same idea passes. `[ADDED]` **The measure of criterion 6, decided by the owner of the gate on 2026-11-25 before run 4:** a loss attributed to the format counts against the gate only when it changed the built product's behaviour or what was written into it; a format item that changed neither is recorded and amended, and does not fail the gate. Runs 1 to 3 were measured with every format item counting. **Run 4 (2026-11-25) did not pass** (criterion 5, and criteria 3 and 4 as written; the same record, section Run 4): criterion 6 held under the owner's measure, the amendments its evaluation names are not made, and the gate stays closed.
- **C-4 The lab stays outside.** The documentation lab is the source of the design and its evidence; this engine ports the format and its checks and does not depend on the lab at run time.
- **Assumption (forecast):** projects keep a 3.x workspace until they migrate, and the engine reads both layouts during the 4.x line. Runner-up: 4.0 reads only the new layout and every 3.x project migrates on upgrade. Override: /magicspec spec amend l1-sdd-document-set.md "4.0 reads only the new layout".
- **Assumption (forecast):** the per-specification status lifecycle (Draft, RFC, Stable, Deprecated) does not survive into the new set: readiness is expressed by open questions in units and by the status of changes (§5.8). Runner-up: units keep a status field beside their revision. Override: /magicspec spec amend l1-sdd-document-set.md "units keep a status field".

## 3. Core Invariants (Layer 1 only)

- **I1 The task is the only entry point, and its pack is computed.** A builder reads its task's pack and nothing else; the pack holds what the task's own fields reach, one level of the units those reference, the units that define the names they use, and what the earlier tasks have built (§5.6). Nothing is loaded in case it helps, and nothing the task needs is left to be guessed.
- **I2 One fact, one place, one address.** Every fact lives in exactly one unit with a stable address; every other mention is a reference that resolves. A name of the stack layer is defined by exactly one binding unit.
- **I3 A unit pins what changes behaviour, and only that.** Whatever it leaves out is the implementer's choice; in the stack layer names, signatures, visibility, constraints and observable side effects of interface items change behaviour.
- **I4 Decisions are written down once,** with their reason and their layer, and a settled decision moves into a unit or a rule.
- **I5 A task has a budget.** Its computed pack fits the pack budget, or the task is split.
- **I6 Seams are exact.** A task names what it uses from earlier work and what it hands to later work, by exact name and signature, internal seams included.
- **I7 Every check is observable:** a completion is stated as a check with its expected result and the means of observing it.
- **I8 Built code is the source of exact signatures.** For a component already built the map names the files that hold its interface; the files earlier tasks created reach a later task through its pack.
- **I9 Two layers.** The neutral layer says what the product is and does and never names a technology of the stack nor assumes a mechanism only some stacks have; the stack layer says how it is realized on one stack. Changing the stack means a new stack layer and new tasks; the neutral layer stays.
- **I10 Priority is explicit, separate from order, and inherited.** Order comes from dependencies; priority (`must`, `should`, `could`) decides what is taken first among ready work and what may move out; what higher-priority work requires takes that priority.
- **I11 Everything the build produces has an owner:** code components and the repository's own assets, optional integrations, and the work a milestone adds to a component closed earlier.
- **I12 The documents change only through recorded changes.** An input that arrives after the documents exist is recorded as a change with its kind, then placed at new revisions of the units it alters; what was built from an older revision is found by comparing revisions, never by memory.
- **I13 The documents stay outside the product.** No address or path of the documents is written into the product's code, comments, tests, commit messages or build.

## 4. Invariant Compliance (Layer 2 only)

Not applicable to a concept specification; see [l2-sdd-document-set-engine.md](l2-sdd-document-set-engine.md).

## 5. Detailed Design

### 5.1 Documents of a set

| Document | Layer | Answers |
| --- | --- | --- |
| `product.md` | neutral | what this is, for whom, of what parts: purpose, scope items, glossary, components (Kind `code`, `asset`, `existing`), cross-cutting decisions, external needs |
| `rules.md` | neutral | how work is done on any stack |
| `plan.md` | neutral | milestones in priority and dependency order, and the backlog |
| `spec/{key}.md` | neutral | the behaviour of one component, as addressed requirements with an Accept check each |
| `stack/{stack}/profile.md` | stack | the neutral notions on this stack, stack-only components, tools, commands, vocabulary |
| `stack/{stack}/rules.md` | stack | rules that realize neutral rules on this stack |
| `stack/{stack}/deps.md` | stack | external libraries that meet the product's external needs, pinned |
| `stack/{stack}/bind/{key}.md` | stack | names, signatures and paths of one component, as binding units |
| `stack/{stack}/tasks/M{n}.md` | stack | the tasks of one milestone, written when the milestone is next |
| `memory/state.md` | — | where the build is: now, done, next, open |
| `memory/decisions.md` | either | decisions taken during the build |
| `memory/map.md` | stack | what exists where, at which revision of each unit |
| `changes.md` | either | every change after the first version: kind, status, what it affects, what builds it |

A list a document holds with nothing in it — the backlog, the libraries of a stack, the stack-only components of a profile — is the one line `- none`. A dependency of a component that only an optional integration (a product item) needs is marked `?` after its key. The stack's runtime and its own test runner are named with their versions in the profile's tools; `deps.md` pins what is installed beside them, a tool a task runs included, with its version and checksum. `[ADDED]` An external need of `product.md` is a capability the product takes from outside its own code that a stack may meet with a library; what every runtime offers — reading a file, the local date and time, writing to the outputs — is not listed. The stack's manifest is pinned, path and content, by a binding unit of the component that the first milestone closes; any other file of the repository that a stack needs and no unit pins is a component of Kind `asset` with an owner (I11).

### 5.2 Addresses

| Unit | Address | Unit | Address |
| --- | --- | --- | --- |
| Rule | `R{n}` | Stack rule | `S{n}` |
| Product item | `P{n}` | External library | `X{n}` |
| Glossary term | `term:{word}` | Binding unit | `{key}.b{n}` |
| Component | `{key}` | Task | `M{n}.T{k}` |
| Behaviour requirement | `{key}.{n}` | Build decision | `D{n}` |
| Milestone | `M{n}` | Change | `C{n}` |
| Map entry | `map:{key}` | Repository text no unit pins | `asset:{path}` (in Affects only) |

An address is unique in the set and never reused; an address written in a unit is a reference and must resolve; a neutral unit references only neutral units.

### 5.3 Units

- **Behaviour requirement** `{key}.{n}`: one behaviour stated so that it can be checked on any stack, with `Accept:`. The neutral layer states needs, not mechanisms; the neutral writing table below and a review by a reader of another stack keep concepts out.
- **Rule** `R{n}` / `S{n}`: one or two imperative sentences with `Applies to`, `From` (neutral), `Checked by`, `Realizes` (stack), `Why`.
  - `From` names the milestone from which the rule applies, and the plan stage writes it: a rule written before a plan exists has no `From` line, and the stage that writes the milestones adds one to every rule.
  - `Realizes` names the neutral rules a stack rule realizes, or is `—` for a convention only the stack has (a fact every file of the stack follows, such as a line at the top of each source file or the form in which built-in modules are named). Such a rule is listed in the `Context` of every task it governs, because a rule reaches a pack only through a task's fields (§5.6); the stack profile is not pulled into a pack, so it holds no convention a builder must follow, and a task never copies a rule's text into its own fields.
  - A task lists in `Context` the stack rules that govern it and no neutral rule that one of them realizes; a neutral rule that no stack rule of its stack realizes is listed itself.
- **Binding unit** `{key}.b{n}`: names, signatures, visibility, constraints and mechanisms of one part of the interface, with `Defines`, `Visibility` (interface or internal), `Realizes`, `Accept`. `Defines` lists bare names, the signatures being in the unit's text. Test scaffolding several tasks share is an internal binding unit. `[ADDED]` A unit that realizes no behaviour — scaffolding, the manifest — writes `Realizes: —`. A unit has one visibility: names exported for tests only are interface, and a unit that would mix interface and internal names is split. A binding unit is built by exactly one task; a unit too large for one task is split into units before the tasks are written.
- **Milestone** `M{n}`: `Priority`, `Works after it`, `Observed by`, `Needs`, optional `Observed after`, `Integrates`, `Extends`, `Revises`, and `Closes`. `Closes` names component keys only: a milestone that builds part of a component's requirements closes it, and a later milestone that builds the rest Extends it (§5.5). A milestone that needs none writes `Needs: —`. `Observed by` states the observation in neutral words — which components' checks are run, or which use of the product and its outcome — and the stack profile's `observe` row says how it is run on that stack; the literal command is written in the `Done when` of the tasks.
- **Task** `M{n}.T{k}`: `Goal`, `Priority`, `After`, `Builds`, `Consumes`, `Context`, `Produces` (with the consuming task), `Creates` (with the task's tests), `Done when` (with `Observe:`). A task whose work no later task of its milestone uses writes `Produces: —`; a later milestone reaches that work through the map. A file that a later task extends, source or test, is created by the earlier task and named in the later task's `Creates` as `` `{file}` (extends M{n}.T{k}) ``, the path alone in the code span and the address being the task that created it; the later task is After the earlier one, directly or not, so its pack holds the file as built. A `Done when` whose observation runs a command states the command's exit status in its expected result ("exits 0 and prints …").

**The neutral writing table.** A word list catches the words of a stack; these rows catch its concepts. A neutral unit that would use the left column writes the right one, and where a stack's own library would decide the matter (which letters fold, what ends a line), the neutral unit names the set and the stack layer chooses the means:

| Instead of | Write |
| --- | --- |
| a type known at run time, a generic resource, "the type's full name" | one per state type, keyed by that type; the stack layer adds an explicit key where types are erased |
| "fails the build", "does not compile" | is rejected at the earliest stage the stack offers, with a message that says why |
| an implementation limit ("a tuple of 1 to 15") | the need ("a group of several"); the limit lives in the binding |
| threads, processes, "in parallel", "once per process" | at the same time where the stack runs work concurrently; once in a run of the program |
| a pattern of values | a predicate over values |
| trait or interface names for capabilities ("equality, hashing, copying, debug printing") | the need: comparable for equality, usable as a key, cheap to copy, printable in logs |
| a mechanism of declaration ("derive", "marker", "annotation") | its effect: "a single declaration makes it a plain state" |
| closures with sharing bounds | function values |
| taking a part out of a container for a scope ("for the duration of a closure") | used in one operation together with the rest of the container |
| cloning ("it can be cloned") | the use the copy serves: "the same condition can gate several systems" |
| feature flags, configurations of a build tool | optional integrations, included by default or not (product items) |
| a dependency on a component only one stack has | nothing: that component is declared in the stack profile |
| "ignoring case", "case-insensitive", "a letter" | the exact characters that match regardless of case ("the letters A to Z and a to z"); every other character matches only itself |
| "a digit", "a number" read from text | the exact characters that count as digits ("0 to 9"); every other character is not a digit |
| "a word", "at a word boundary" | the characters that separate words, listed ("a space, a tab, the start or the end of the line") |
| "a newline", "the line ending of the machine", "the platform's line ending" | the characters that end a line, named for what is read and for what is written ("a line ends at a line feed, or at a carriage return followed by a line feed; every line written ends with a line feed") |
| "the text", "a string", for input read from outside the program | what counts as valid text (an encoding named by its standard) and what happens to input that is not valid text |
| "a date", "a day", "today" | the calendar and its range ("the Gregorian calendar extended backwards, years 1000 to 9999"), and where today's date comes from (the local date of the machine, or a date given as input) |

A neutral layer is reviewed across stacks before its first use on any stack: a reviewer who knows only another stack reads it and lists every concept that stack does not have, and each is rewritten by the table. A rewrite that names the mechanism it means to exclude ("whatever the usual line ending of the machine is") is the same leak and is rewritten again.

After each rewrite a fresh reader of the same stack reads the layer again; the review ends when a reading lists none of the leaks the readings before it listed, and after three rewrites a leak still listed stays as an `Open:` line on its unit (§5.8).

### 5.4 Priority

`must` for the first usable release (a task: the milestone's increment cannot be observed without it), `should` for what the release or milestone is usable without, `could` for what may move out. An item never depends on one of lower priority; a component takes the highest priority of the work that requires it; the next milestone or task is the ready one of highest priority, ties to the order of the file; a milestone is done when its `must` and `should` tasks are done and its Observed by holds, and its open `could` tasks move to the backlog.

### 5.5 Plan rules

Needs orders the build and is justified (a needed milestone closes something this one depends on, an end of an integration it wires, or a component it extends); an edge only an observation uses is Observed after. A component is closed once; later work on it is Extends, a change of what it does is Revises, and both need the closing milestone. A done milestone is never edited: a change adds a milestone at the end. A backlog with nothing waiting holds the one line `- none` (§5.1). `[ADDED]` The first milestone is observed by running the product: its `Observed by` is a use of the product and its outcome, so it closes every component that use needs, building of a component only the requirements that use reaches where the rest can wait for a later milestone that Extends it (§5.3). Needs names each milestone that closes a direct dependency, and not one that is reached only through another.

### 5.6 The pack of a task

Computed, in this order: one line that states I13 for the task (no address or path of the documents is written into anything the task creates); `[ADDED]` the stack's tools, the profile's Tools section with the runtime and its versions; the task and the preamble of the component it builds — its behaviour preamble and its binding's Interface section; every unit in Consumes and Context; one level from them (every requirement and binding unit their text references, and every binding unit of the built component that defines a name their text uses in code, acceptance lines excepted; a dependency's binding units only through Consumes); **Done before this task**, the files the tasks it is After created, directly or through the tasks those are After, as built, and for a task of a revising or extending milestone the component as built before it; and for a task that rewrites tests it did not write, the present text of those tests only. Nothing is pulled through rules, product items or decisions: a rule, a stack rule with `Realizes: —` included, reaches a pack only by being named in the task's Context (§5.3). The budget is 10,000 tokens for the computed units, without the task and without Done before. A produced unit uses only names produced by then; every test under Observe passes with the work of its task and of the tasks it is After.

### 5.7 Memory

`state.md` holds `Now`, `Done`, `Next`, `Open`; `decisions.md` holds `D{n}` with `Layer`, `Why`, `Affects`, `Moves to`; `map.md` holds per component its path, its interface files and manifest, and the units it provides as built, `{address}` at revision 1 and `{address}@{n}` at revision n. A task's Creates becomes the map entry when the task is done.

### 5.8 Changes after the first version

A change `C{n}` has `Source`, `Kind`, `Status`, `Affects`, `Changes`, `Built by`, `Evidence` (for a fix, a revision or a satisfied change) and `Why`.

| Kind | What it is | What the plan gets |
| --- | --- | --- |
| addition | new behaviour or a new part | new units; Closes or Extends |
| revision | behaviour others rely on changes | units at a new revision; Revises |
| fix | the code did not do what the units say, or the units were silent | the silent units gain a sentence; Revises |
| withdrawal | behaviour or a part goes away | units marked withdrawn; Revises |
| stack | only the stack layer changes | stack units only |
| clarification | the documents said less than the code does, and a reader depended on it | units at a new revision, no milestone |

Statuses: `open`, `placed`, `built`, and `satisfied` for an input the documents already state. Marks on any unit: `Rev: n — Ck`, `Withdrawn: Ck — replaced by …`, `Assumption: … — if wrong: …`, `Open: …` (a task whose pack holds an open unit is not ready), and `Was (rev n): …`, the text of the built revision, kept until the change is built. A mark is a list line of the unit's field list, after its last field (`- Assumption: …`).

The handling, in three steps:

1. **Record.** First compare the end state the input names with the present units; when a unit already states it, the change is `satisfied`, with no work and the stating units as Evidence, and no assumption that the code differs from a unit that states the contrary. Otherwise record the change `open` before touching any unit. An input that fits several places, or names none (`Evidence: none found`), stays open with an `Open:` question to its source that lists the candidates. Before placing, read every unit that names the same state or operation, those a governing rule covers included; keep stated behaviour the input does not mention, except a sentence that is an exception to a governing rule when the input calls the documented behaviour wrong, which is withdrawn whole; "replace X by Y" withdraws the unit that is X and moves what it stated to its caller; a reused helper's initialisations are declared authoritative and the sibling flow whose order is followed is named.
2. **Place.** Edit the units at a new revision, add and withdraw units, add the milestone that builds the change and its tasks with the change and the revised units in their Context; a repository text no unit pins is named `asset:{path}` and created by a task. Status `placed`.
3. **Build.** When its milestones are done, Status `built`, the map takes the new revisions and the `Was` lines go.

A unit whose revision is newer than the map's is stale, and every stale unit is in the pack of a task of a milestone not yet done that builds its component. A stack change touches no neutral unit.

### 5.9 The checker

A checker reads a set and reports, without a model: unresolved and duplicate addresses; neutral units that reference stack units or use stack vocabulary (a vocabulary word matches as a whole word, in any letter case, and a component key is never matched) `[MODIFIED]`; priorities against dependencies; Needs without justification; components and assets without an owner; produced names used before they are produced; consumed names whose defining unit is missing; packs over budget; tasks whose Creates names no test; changes without a kind, status, Evidence or building milestone; rules without `From` on a set whose plan defines a milestone (a rule written before the plan has none, §5.3); revised units without `Was`; stale units no task builds; open questions in a ready task's pack; satisfied changes that carry work; assets no task creates. A set with findings is not handed to a builder.

## 6. Implementation Notes

1. The forward run of C-3 is the first milestone of the realization and gates the rest.
2. **Supersession, declared.** When the realization is deployed, this specification supersedes: in [l1-engine-core.md](l1-engine-core.md) the workspace architecture and the templates subsystem (§Architecture); in [l2-engine-templates.md](l2-engine-templates.md) the template inventory; the per-specification status lifecycle and the L1/L2 layer rules of the `spec` workflow; the phase plan of [l1-plan-command.md](l1-plan-command.md) and the task ledger with phase files; the recorded state of [l1-session-continuity.md](l1-session-continuity.md) (into `memory/state.md`); and the address forms that [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) keeps out of the product (task identifiers and phase designators become the addresses of §5.2). On a workspace in the new set the same holds for the mechanics that name phases, tasks or the registry: the phase arguments of [l1-goal-mode.md](l1-goal-mode.md) (`phase-3`, `phase-3..5`) name milestones (`M3`, `M3..M5`); a repair of [l1-fix-command.md](l1-fix-command.md) is a change of kind `fix` built by its milestone, not a task of the active phase; the scenarios [l1-product-simulation.md](l1-product-simulation.md) SM-3 lists per phase are listed per milestone; the registry cells [l1-sync-command.md](l1-sync-command.md) SY-1 recomputes do not exist, and its derived state is the map, the state file and the checker's report; and the lifecycle rule of the constitution (Draft → RFC → Stable, and Draft or RFC specifications held in the backlog) is narrowed to 3.x workspaces through `/magicspec rule`. Each is amended when the part of the realization that replaces it is deployed; until then no deployed text contradicts it.

## 7. Drawbacks & Alternatives

- **More files.** A set has more, smaller files than a 3.x workspace; the pack, not the reader, picks among them. The alternative of keeping per-topic specifications and adding addresses inside them was rejected: a pack cannot take one requirement out of a long file without the rest, and the measured unused share of a pack fell from 39 % to between 3 % and 19 % only once units were addressed and pulled on their own.
- **The forward path failed its first gate** (§1, C-3): three gaps of the format, found by writing forward; the gate bounds the cost of being wrong to one milestone of the realization. The amendments of 1.1.0 answered them; the second run built its milestone with none of them recurring in its stated form and failed on smaller format gaps and on a leak the rewrite repeated, which the amendments of 1.2.0 answer before a third run. The third run held every other criterion; whether criterion 6, which admits no format item of any size, is the measure the gate keeps is a decision made before a further run. The owner decided it before run 4 (C-3): a format item fails the gate only when it changed what was built. The alternative, keeping every format item as a failure, was rejected because each of three runs found new small items in places no reader of the product depends on, so the gate could not close on evidence of the product. The fourth run held criterion 6 under that measure and failed on a leak the second reading repeated, one of them a comment of the format's own product template.
- **Model-free checking has limits.** The checker cannot see a change placed on the wrong operation, or an exception kept against a governing rule; those rules live in the format and in the workflow, and were measured with documenter agents.
- **Status lifecycle.** Dropping Draft/RFC/Stable removes a familiar signal; open questions and change statuses carry the same information per unit rather than per file (assumption in §2).

## Canonical References

The three paths are outside this repository, in the documentation lab beside it; a reader without the lab has this specification and, once step 1 of the realization is built, the ported checker and its fixtures under `tests/`.

| Alias | Path | Purpose |
| --- | --- | --- |
| `[SKELETON]` | `../sdd-lab/skeleton/skeleton.md` | The format under test (v7.3), with its history and evidence per element; the source this specification ports |
| `[PROTOCOL]` | `../sdd-lab/runs/protocol.md` | How a build is replayed and measured, including the compiled replay and the blind placement |
| `[CHECKER]` | `../sdd-lab/tools/check-docs.js` | The checker of §5.9 as built in the lab, with its fixtures |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-11-24 | Agent | Initial specification of the 4.0 document set, from the lab's skeleton v7.3 |
| 1.0.2 | 2026-11-24 | Agent | Recorded the first forward run (Phase 69), Stable retained, no requirement changed: the run built and observed the first milestone of an unseen product and did not pass its criteria (a rule's `From` before the plan, a stack-only convention that reaches no pack, the rows of the neutral writing table for text); C-3, §1 and §7 state the result and that the gate stays closed until the amendments are made and the run is repeated. |
| 1.3.1 | 2026-11-25 | Agent | Recorded run 4 of the forward gate (Phase 78), Stable retained, no requirement changed: criteria 1, 2 and 7 hold, criterion 5 does not, criteria 3 and 4 hold on the expected exit status and not as written, criterion 6 holds under the owner's measure; C-3, §1 and §7 state the result and that the gate stays closed. |
| 1.3.0 | 2026-11-25 | Agent | **The owner's decision for run 4 and the amendments of run 3** (origin `user-stated`: the owner's directive of 2026-11-25 — criterion 6 counts only format items that change the product's behaviour or what is written into it, the first milestone is observed by running the product, then amend and run a fourth time; the seven amendments from the record's section Run 3 and `runs/run-27-state/summary.md`). C-3: the measure of criterion 6, recorded as decided before run 4. §5.5: the first milestone observed by running the product; `Needs` without milestones reached through another. §5.1: what an external need is; the manifest pinned by a binding unit of the first milestone's component, other unpinned files components of Kind `asset`. §5.3: `Realizes: —` for a unit that realizes nothing, one visibility per unit, a binding unit built by one task. §5.6: the profile's Tools in the pack, the binding's Interface section part of the component's preamble. §5.9: how a vocabulary word is matched. §1 and §7: the decision and the fourth run. The markers of 1.2.0 removed. Amendment Rule round trip: RFC, Post-Update Review (coherence: 8 artifacts compared — 3 findings, interaction gaps resolved by amending `l2-sdd-document-set-engine.md` 1.3.0: the pack's Tools section, the templates, the vocabulary and preamble rules already built by the checker and stated as built; spec-critic PASS; prompt-engineer PASS), Stable. |
| 1.2.1 | 2026-11-25 | Agent | Recorded run 3 of the forward gate (Phase 76), Stable retained, no requirement changed: criteria 1 to 5 and 7 hold, criterion 6 does not (nine format items, none changing what was built); C-3, §1 and §7 state the result and that the gate stays closed, and §7 names the open question on criterion 6. |
| 1.2.0 | 2026-11-25 | Agent | **The amendments of run 2 of the forward gate** (origin: the record's section Run 2 and the evaluation in the documentation lab, `runs/run-26-state/summary.md`, six amendments). §5.6: the pack opens with a line stating I13, so containment reaches the builder without a rule in each set; Done before this task follows After directly or not. §5.3: a file a later task extends is marked whatever its kind, the path alone in the code span; a task lists the stack rules that govern it and a neutral rule only where no stack rule realizes it; `Defines` lists bare names; `Observed by` is neutral and the profile's `observe` row maps it; the review repeats rewrite and fresh reading until a reading finds no earlier leak, at most three rewrites, the rest as `Open:`. §5.1: an empty list is `- none`; the optional-integration dependency is marked `?`; the runtime and its test runner are in the profile, `deps.md` pins what is installed beside them. §5.8: a mark is a list line after the unit's last field. §1, C-3 and §7: the gate waits for a third run. The markers of 1.1.0 removed. Amendment Rule round trip: RFC, Post-Update Review (coherence: 7 artifacts compared — 3 findings, interaction gaps resolved by amending `l2-sdd-document-set-engine.md` 1.2.0: the pack's output pinned by the harness, the templates' comments and field lines, the checker's reading of `- none`; spec-critic PASS; prompt-engineer PASS-WITH-REWRITES, the review sentence split in two), Stable. |
| 1.1.1 | 2026-11-25 | Agent | Recorded run 2 of the forward gate (Phase 74), Stable retained, no requirement changed: the run built and observed the first milestone (103 tests pass) and did not pass criteria 5 and 6; C-3, §1 and §7 state the result and that the gate stays closed. The amendments the run's evaluation names are made, if made, through a specification pass. |
| 1.1.0 | 2026-11-25 | Agent | **The amendments of the forward gate** (origin: the record of run 1, `.magicspec/engine/simulations/forward-gate.md`, and its evaluation in the documentation lab, format findings F1 to F8). §5.3: a rule's `From` is written by the plan stage and is absent before it (F1); a convention only the stack has is a stack rule with `Realizes: —`, listed in the Context of the tasks it governs, the profile holding no convention a builder must follow (F2); the neutral writing table is stated in full and gains six rows — letter case, digits, word boundaries, line endings, valid text, the calendar and today's date — and a rewrite that names the excluded mechanism is the same leak (F3); `Closes` names component keys only (F4), `Needs: —` (F5), `Produces: —` (F6), a test file a later task extends (F7), the exit status in a `Done when` (F8). §5.5 the empty backlog (F5); §5.6 a rule reaches a pack only through Context; §5.9 the checker reports a rule without `From` once the plan defines a milestone; C-3, §1 and §7 state that the gate waits for the second run. Amendment Rule round trip: RFC, Post-Update Review (coherence: 8 artifacts compared — `l2-sdd-document-set-engine.md`, `l2-engine-templates.md`, `l1-sdd-reference-containment.md`, the forward-gate record, the templates of `templates/set/`, `check-docs`, its four fixture sets and the lab's evaluation — 2 findings, both interaction gaps resolved by amending `l2-sdd-document-set-engine.md` 1.1.0: the thirteen templates of `l2-engine-templates.md`, and three fixture sets whose rules have no `From`; spec-critic PASS; prompt-engineer PASS), Stable. |
| 1.0.1 | 2026-11-24 | Agent | Stabilized on the owner's signal: the supersession of §6 extended to the goal arguments, the fix trace, the scenario list, the sync command's registry cells and the constitution's lifecycle rule (coherence check); the canonical references say where they live |
