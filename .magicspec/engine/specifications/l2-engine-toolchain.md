# Engine Toolchain: pnpm, TypeScript, Biome and Fallow

**Version:** 1.2.1
**Status:** Stable
**Layer:** implementation
**Implements:** l1-skill-packaging.md

## Overview

The development toolchain of the engine's repository: pnpm as the package manager of the maintenance tree, TypeScript as a type checker over the existing JavaScript (its JSDoc is the type language; no source is converted), Biome as formatter and linter, and Fallow as the analyzer of unused code, dependencies, cycles and duplication. All four are maintenance tooling: none ships in the skill folder, and an installed engine still needs nothing but the runtime.

## Related Specifications

- [l1-skill-packaging.md](l1-skill-packaging.md) - The packaging invariants the toolchain must keep (SP-1 to SP-10).
- [l2-skill-layout.md](l2-skill-layout.md) - The maintenance layout the configuration files join.
- [l2-release-pipeline.md](l2-release-pipeline.md) - The archive that must exclude every toolchain file.
- [l2-test-suite.md](l2-test-suite.md) - The harness the continuous-integration job keeps running.
- [l2-engine-automation.md](l2-engine-automation.md) - The scripts the type check and the analyzers cover, and the stated runtime floor.

## 1. Motivation

The engine is about fifty Node scripts and libraries, in plain CommonJS with JSDoc, checked by one harness (`node --test tests/engine.js`) and nothing else: no type check, no linter, no formatter, no dead-code analysis. The record of this repository shows what that costs — a bulk rename corrupted the hook backup's file name inside a string literal and no check noticed (`l2-engine-automation.md` 1.26.0), and several field-report fixes were a missed branch of the same defect, the kind of site an unused-export or duplication report points at. The owner's list of 2026-10-29 names the tools: pnpm, TypeScript, Biome and Fallow.

Facts checked on 2026-10-29:

- Node 22.18 and later run TypeScript files by stripping types, without a flag; Node 24 has done so since its first release. Only erasable syntax is supported (no `enum`, no `namespace`, no parameter properties).
- Biome formats and lints JavaScript, TypeScript and JSON with one configuration.
- Fallow is a Rust-native analyzer for JavaScript and TypeScript, distributed through npm (`fallow check` for unused files, exports, dependencies and types; `fallow dupes`; `fallow health`), MIT-licensed for its static analysis.
- The continuous-integration job runs the harness on Node 22 only, while the stated runtime floor is Node 18; both 18 and 20 are past their end of life.
- Checked on 2026-11-12: Fallow declares `engines.node >=22`, the root manifest `>=24`, the skill folder's manifest `>=18`, and the executor refuses a runtime older than 18. The tools therefore cannot run on the floor, and the harness — which starts with `node --test` and installs nothing — can.

## 2. Constraints & Assumptions

- Nothing the user installs changes: the skill folder keeps zero dependencies and no build step, and the engine builds itself — an edit to a script runs as edited (SP-9).
- Formatting follows the existing style (four-space indent, single quotes, semicolons, LF line endings), so adopting the formatter is not a mass rewrite of meaning.
- **Assumption (forecast):** TypeScript is a checker and not a source language: the scripts stay JavaScript with JSDoc, and no source is converted. Converting would need Node 22.18 to run the files, which raises the floor for every user, and would put `.ts` files into a skill folder that is installed as it is and that the repository runs as edited, with no build step. Runner-up: convert after the floor is raised, as the first version of this section planned. Override: `/magicspec spec amend l2-engine-toolchain.md "convert to TypeScript at the next floor raise"`.
- **Assumption (forecast):** the type check is not strict, and it covers a set of files that grows, because a measurement on 2026-11-12 found 1999 errors under `strict` (825 implicit-any parameters, 569 accesses to a property of a value the JSDoc declares only as `object`, 845 of the errors in the harness) and 488 without it, dominated by the same loose `object` annotations, with no defect among a sample of the findings. Clearing them is hours of annotation across the skill folder, each edit a C14 event, for a defect class the harness, Biome and Fallow already catch. A file joins the checked set by carrying `// @ts-check` when it passes; a new script starts with it; the pragma is never removed to make a check pass. Runner-up: strict over every file, cleared to zero first (the first version of this section). Override: `/magicspec spec amend l2-engine-toolchain.md "type-check every script under strict"`.
- **Assumption (forecast):** the toolchain checks and the harness run as two jobs (§5.5), the toolchain on the current LTS line only and the harness across the runtime floor and the LTS line, because the floor stays at Node 18 for every user (`l2-artifact-memory-store.md` §2: the fallback serves it) and raising it is a stage-2 decision with a release note (SP-10). Runner-up: one job on one version and the floor untested, or raising the floor now. Override: `/magicspec spec amend l2-engine-toolchain.md "raise the runtime floor to Node 22"`.
- **Assumption (forecast):** the `harness` job waits for the `toolchain` job, because the faster checks run first so that a formatting or type failure is reported before the harness (§6 item 3). Runner-up: the two jobs in parallel, which reports both results at once and costs one run of the harness more when the toolchain is red. Override: the same amend command with "run the jobs in parallel".
- **Assumption (forecast):** the harness itself runs on the floor. Unverified on 2026-11-12: whether `tests/engine.js` passes on Node 18. If the first floor run fails for a reason of the runtime and not of the engine, that entry is advisory until the failure is classified (`/magicspec fix`), and the finding is not hidden by dropping the floor from the matrix.
- **Assumption (forecast):** compiling TypeScript to JavaScript for the release is rejected, because the engine's own repository runs the skill folder through a link, and a build output would have to be rebuilt after every edit before the engine could run itself. Runner-up: compile at release. Override: the same amend command with "compile at release".

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| SP-1 One folder, one version | Toolchain files live outside the skill folder; the folder's manifest and version are unaffected. The stage-2 `.ts` sources are inside the folder and are covered by its manifest like any file. |
| SP-2 Location independence | No tool resolves paths at run time; the type check and the analyzers run from the repository root only. |
| SP-3 Projections are generated | Unaffected; no tool writes a projection. |
| SP-4 Always-on text outside demand-loaded content | Unaffected. |
| SP-5 One source per workflow | Unaffected. |
| SP-6 Removable without trace | The skill folder carries no toolchain file, so removing the engine from a project removes nothing of it. |
| SP-7 Maintenance tooling not shipped | `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `biome.json` and the Fallow configuration are maintenance files at the repository root; the archive composition excludes them and its check fails on any of them. |
| SP-8 State is not engine | Unaffected. |
| SP-9 Every step leaves a working engine | Each stage of §5.5 ends with the harness green; the type check adds a comment and no behaviour, and no build step is introduced. |
| SP-10 Migration is explicit | The runtime floor does not move; raising it is a decision of its own with a release note and a check in the executor that names the required version, not a silent failure. |

## 5. Detailed Design

### 5.1 pnpm

- The root manifest pins the package manager (`packageManager` with an exact pnpm version) and lists the toolchain as development dependencies only; `pnpm-lock.yaml` is committed.
- Continuous integration installs with a frozen lockfile.
- The skill folder's own `package.json` keeps only its module type and its `engines` field; it gains no dependency.

### 5.2 TypeScript

- `tsconfig.json` with `allowJs`, `noEmit` and `module` `nodenext`, `checkJs` off and `strict` off, its `include` listing `skills/magicspec/scripts/`, `skills/magicspec-dev/`, `scripts/` and `tests/` so that every file is in the program. A file is checked when it begins with `// @ts-check`; an unchecked file is read for the types it exports and reports nothing.
- The checked set only grows: a script that passes gains the pragma when it is touched, a new script starts with it, and a pragma is never removed or replaced by `// @ts-expect-error` without a reason on the same line to make a check pass. The type check is gating from the first run, because the set is clean by construction.
- The sources stay JavaScript. Converting them to `.ts` is not planned: it would raise the runtime floor to Node 22.18 and put build-less `.ts` files into the skill folder (§2).

### 5.3 Biome

- One `biome.json` at the root: formatter and linter for JavaScript and JSON; Markdown and YAML are out of scope (the documentation has its own conventions). As built, `files.includes` lists `**/*.js`, `**/*.cjs`, `**/*.mjs` and `**/*.json`, because Biome formats every file type it knows unless told otherwise, and `files.maxSize` is raised above the largest script so that no file is skipped for its size without a trace.
- `biome ci` runs in continuous integration; the first adoption was one formatting change with no other change (checked by the harness passing unchanged and every script still parsing).

### 5.4 Fallow

- `fallow dead-code` (Fallow 3.42 deprecates the name `check`) with the engine's real entry points declared: `skills/magicspec/scripts/*.js` — the executor and every script the command table names — the maintenance scripts and the harness; the executor starts subcommands by name, which a static analyzer cannot follow, and the skill folder is not ignored.
- Introduced as advisory (reported, not failing) until its first report is triaged; then failing on new findings. As built the first report was 79 unused exports and 2 duplicate exports; every unused export was used inside its own file, so `ignoreExportsUsedInFile` is on (an export its own file uses is not dead code), and the two backends of the artifact index, which share the names `SCHEMA_VERSION` and `open` by design, are exempt by name. The step gates from there.

### 5.5 Continuous Integration and Stages

```mermaid
graph LR
    A[Stage 0: pnpm + lockfile] --> B[Biome: format commit, then ci]
    B --> C[Stage 1: tsc --noEmit over JSDoc]
    C --> D[Fallow advisory → gating]
```

Continuous integration is two jobs, because the tools and the harness do not share a runtime range: Fallow declares Node 22 or later and the root manifest Node 24 or later, while the engine's stated runtime floor is Node 18, and the harness needs no installed package.

| Job | Runs on | Steps, in order |
| --- | --- | --- |
| `toolchain` | the current LTS line, one operating system | frozen install, `biome ci`, the type check, `fallow check` |
| `harness` | each supported operating system, on the stated runtime floor and on the current LTS line | `node --test tests/engine.js`, started directly — no install, no package script |

The `harness` job starts only after `toolchain` has passed, so a formatting, type or analysis failure is reported before the minutes-long harness run. On the floor, which has no SQLite module, the harness exercises the artifact index's fallback; on the LTS line it exercises the SQLite backend ([l2-artifact-memory-store.md](l2-artifact-memory-store.md)). The Node versions of the `harness` job are the ones this section names: [l2-release-pipeline.md](l2-release-pipeline.md) §5.2b defines the workflow's triggers and the harness's freedom from untracked files, and takes its Node versions from here.

## 6. Implementation Notes

1. Every stage is independent of any user-visible change and can ship in a patch release; the `// @ts-check` comments are the only change inside the skill folder, and each is a C14 event.
2. The first checked set is the files that pass `tsc` without the pragma's help (the compiler run with `checkJs` on, no error in the file); the order in which the rest join is the order in which they are touched.
3. The harness takes minutes to run; the `harness` job keeps its timeout, and the `toolchain` job it waits for runs the faster checks first so that a formatting or type failure is reported first.

## 7. Drawbacks & Alternatives

- **ESLint and Prettier** — rejected in favour of one tool with one configuration.
- **Strict type checking of every script, cleared to zero** — rejected for now on a measurement (§2): about two thousand findings of annotation, no defect among a sample, hours of work and a version bump for each edited script. It stays reachable through the growing checked set.
- **TypeScript as the source language** — rejected (§2): it raises the floor to Node 22.18 and breaks the zero-build, runs-as-edited property of the skill folder.
- **Knip** instead of Fallow — the owner named Fallow; both answer the same question, and the configuration of entry points is the same work.
- **npm** — kept as the tool a user could run, but no user runs it: the shipped engine has no dependencies to install.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[ROOT-MANIFEST]` | `package.json` | Gains the package manager pin and the development dependencies. |
| `[SKILL-MANIFEST]` | `skills/magicspec/scripts/package.json` | Keeps `engines`; gains nothing else. |
| `[CI]` | `.github/workflows/test.yml` | The job §5.5 extends. |
| `[ARCHIVE]` | `scripts/archive-composition.js` | Excludes the toolchain files. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.2.1 | 2026-11-12 | Agent | As built in Phase 56, Stable retained, no requirement changed: §5.3 records the Biome scope (code only, by `files.includes`) and the size limit that stopped the harness being skipped; §5.4 the command (`dead-code`), the entry points, the triage of the first report and the gate; the type check is the checked set of §5.2 with `strict` and `checkJs` written as `false` (TypeScript 7 turns `strict` on by default) and 27 files in the first set; the two CI jobs are `.github/workflows/test.yml` (Node 24 for the tools, Node 18 and 24 for the harness, the floor entries advisory). The premise of §2 that `tests/engine.js` passes on Node 18 stays **unverified**: the run was refused by the session's permission check, and the floor entries are advisory for that reason. |
| 1.2.0 | 2026-11-12 | Agent | **TypeScript is a checker, not a source language, and the check is not strict** (§2, §5.2, §5.5, §6, §7), decided on a measurement in the run of Phase 56 and the owner's choice of that option: the type check found 1999 errors under `strict` and 488 without it, almost all annotation (an untyped parameter, a property of a value the JSDoc declares as `object`), with no defect in a sample, and clearing them would edit most of the skill folder, each edit a C14 event. The first version's stage 2 (convert the sources to `.ts` and raise the floor to Node 22.18) is removed: it would break the Node 18 floor and the zero-build skill folder. The type check becomes a growing set of files that carry `// @ts-check` (the compiler's own per-file switch), gating from the first run. Forecasts recorded with their runner-ups and overrides. Amendment Rule: `Stable → RFC`; re-promoted `Stable` after the Post-Update Review (`@role:spec-critic`: the coherence check against the packaging, release-pipeline, automation and artifact-store specifications found no contradiction — none states the strict check or the conversion; `@role:prompt-engineer`: PASS). |
| 1.1.0 | 2026-11-12 | Agent | **The continuous-integration job split in two** (§5.5), decided in the planning of Phase 56 on a field of facts, not an opinion: Fallow declares Node 22 or later and the root manifest Node 24 or later while the stated runtime floor is Node 18, so the earlier single job — frozen install, `biome ci`, the type check, `fallow check` and the harness across the floor and the LTS line — could not run its tool steps on the floor. The `toolchain` job runs the tools on the current LTS line; the `harness` job runs the harness alone on the floor and on the LTS line, waits for the `toolchain` job and installs nothing. Facts recorded in §1; three forecasts recorded in §2 with their runner-ups and overrides (two jobs; the order; the floor run, with its unverified premise). Amendment Rule: `Stable → RFC`; re-promoted `Stable` after the Post-Update Review (`@role:spec-critic`: the coherence check against the release-pipeline, artifact-store, skill-packaging and engine-automation specifications found one contradiction — the release pipeline's test workflow names only the current LTS — resolved in this invocation by a patch there; `@role:prompt-engineer`: PASS). |
| 1.0.1 | 2026-10-30 | Agent | **Reality sync: the printed command form** is `/magicspec <command>` ([l1-command-surface.md](l1-command-surface.md) CS-2); the earlier colon spelling is rewritten wherever the text prints a command. No requirement changed. |
| 1.0.0 | 2026-10-29 | Agent | Created from the owner's list of ideas (pnpm, TypeScript, Biome and Fallow). Tool facts checked the same day. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
