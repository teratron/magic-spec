# Engine Toolchain: pnpm, TypeScript, Biome and Fallow

**Version:** 1.0.0
**Status:** Draft
**Layer:** implementation
**Implements:** l1-skill-packaging.md

## Overview

The development toolchain of the engine's repository: pnpm as the package manager of the maintenance tree, TypeScript as the type system of every script (checked first, then the source language), Biome as formatter and linter, and Fallow as the analyzer of unused code, dependencies, cycles and duplication. All four are maintenance tooling: none ships in the skill folder, and an installed engine still needs nothing but the runtime.

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

## 2. Constraints & Assumptions

- Nothing the user installs changes: the skill folder keeps zero dependencies and no build step, and the engine builds itself — an edit to a script runs as edited (SP-9).
- Formatting follows the existing style (four-space indent, single quotes, semicolons, LF line endings), so adopting the formatter is not a mass rewrite of meaning.
- **Assumption (forecast):** TypeScript arrives in two stages — first a strict type check over the existing JavaScript through its JSDoc, then the conversion of the sources to erasable-syntax TypeScript run directly by Node once the runtime floor is raised to Node 22.18 — because the first stage gives the type safety at once without touching what users run, while converting immediately would raise the floor for every user in the same step. Runner-up: convert at once and raise the floor now. Override: `/magicspec:spec amend l2-engine-toolchain.md "convert to TypeScript in one step"`.
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
| SP-9 Every step leaves a working engine | Each stage of §5.5 ends with the harness green; stage 2 converts files in groups that each keep the harness green, and no build step is introduced. |
| SP-10 Migration is explicit | Raising the runtime floor in stage 2 is a release note and a check in the executor that names the required version, not a silent failure. |

## 5. Detailed Design

### 5.1 pnpm

- The root manifest pins the package manager (`packageManager` with an exact pnpm version) and lists the toolchain as development dependencies only; `pnpm-lock.yaml` is committed.
- Continuous integration installs with a frozen lockfile.
- The skill folder's own `package.json` keeps only its module type and its `engines` field; it gains no dependency.

### 5.2 TypeScript

- Stage 1: `tsconfig.json` with `allowJs`, `checkJs`, `noEmit` and `strict`, covering `skills/magicspec/scripts/`, `skills/magicspec-dev/`, `scripts/` and `tests/`. JSDoc types are completed where the check needs them; `// @ts-expect-error` is allowed only with a reason on the same line.
- Stage 2 (with the floor at Node 22.18): sources move to `.cts`/`.ts` with erasable syntax only (`erasableSyntaxOnly`), still run directly by Node; the executor checks the runtime version before starting a child and names the required version when it is too old.

### 5.3 Biome

- One `biome.json` at the root: formatter and linter for JavaScript, TypeScript and JSON; Markdown is out of scope (the documentation has its own conventions).
- `biome ci` runs in continuous integration; the first adoption is one formatting commit with no other change.

### 5.4 Fallow

- `fallow check` with the engine's real entry points declared: the executor, every subcommand the command table names, the maintenance scripts and the harness — the executor starts subcommands by name, which a static analyzer cannot follow.
- Introduced as advisory (reported, not failing) until its first report is triaged; then failing on new findings.

### 5.5 Continuous Integration and Stages

```mermaid
graph LR
    A[Stage 0: pnpm + lockfile] --> B[Biome: format commit, then ci]
    B --> C[Stage 1: tsc --noEmit over JSDoc]
    C --> D[Fallow advisory → gating]
    D --> E[Stage 2: floor 22.18, sources to TypeScript]
```

The test job runs, in order: frozen install, `biome ci`, the type check, `fallow check`, the harness. The Node matrix covers the stated runtime floor as well as the current LTS line.

## 6. Implementation Notes

1. Stage 0 to stage 1 are independent of any user-visible change and can ship in a patch release.
2. Stage 2 is a minor release at the earliest, with the floor change in the release notes.
3. The harness takes minutes to run; the job keeps its timeout, and the faster checks run before it so that a formatting or type failure is reported first.

## 7. Drawbacks & Alternatives

- **ESLint and Prettier** — rejected in favour of one tool with one configuration.
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
| 1.0.0 | 2026-10-29 | Agent | Created from the owner's list of ideas (pnpm, TypeScript, Biome and Fallow). Tool facts checked the same day. |
