---
phase: 68
name: "The 4.0 Document Set: Format, Checker and Pack (4.0 Step 1)"
status: Done
subsystem: "skills/magicspec (scripts, scripts/lib, templates/set), tests/engine, .magicspec/engine/specifications"
requires:
  - "Phase 41: the project-root and state-folder resolvers every script uses"
  - "Phase 48: every cache has an owner that prunes it (clean-cache)"
  - "Phase 56: biome, the type check and fallow; Phase 59: the harness by domain behind tests/engine.js"
  - "The specifications: l1-sdd-document-set 1.0.1 and l2-sdd-document-set-engine 1.0.1, Stable at registry 1.96.0, plan 1.83.0"
  - "The lab sources ported: ../sdd-lab/tools/check-docs.js, build-pack.js, count-tokens.js, test-tools.js and tools/fixtures/{good,bad,bad3,bad4}"
provides:
  - "check-docs built: the lab checker on the engine's resolvers, every finding of concept §5.9 verbatim, --budget, one line and exit 0 on a workspace not in the 4.0 format (\"format\": \"4\" in workspace.json); equal to the lab checker on the four fixtures, 32 lab sets and 600 mutants"
  - "pack built: the pack of a task under .cache/packs/{workspace}/{task}.md in the lab's section order, its size against the 10,000-token budget, Done before this task from the Creates of the earlier tasks and the map row of a revising or extending milestone, --include, the over-budget report"
  - "lib/count-tokens.js (characters / 4, rounded up), the pack cache owned by clean-cache and listed in the cache inventory, the thirteen templates of the set in templates/set/"
  - "Harness 462 -> 479: the document-set module (17 cases) over the lab's four fixture sets and golden.json; engine 3.0.160 -> 3.0.164; l2-sdd-document-set-engine 1.0.2, l2-engine-automation 1.33.0, l2-engine-templates 1.3.5, l2-test-suite 1.48.6; registry 1.97.0"
key_files:
  created:
    - "skills/magicspec/scripts/check-docs.js"
    - "skills/magicspec/scripts/pack.js"
    - "skills/magicspec/scripts/lib/count-tokens.js"
    - "skills/magicspec/templates/set/ (13 templates)"
    - "tests/engine/document-set.js"
    - "tests/engine/fixtures/document-set/ (sets/{good,bad,bad3,bad4}, golden.json)"
  modified:
    - "skills/magicspec/scripts/lib/commands.js"
    - "skills/magicspec/scripts/clean-cache.js"
    - "tests/engine.js, tests/engine/registered-folders-and-caches.js"
    - ".magicspec/engine/specifications/ (four specifications), .magicspec/engine/INDEX.md"
patterns_established:
  - "A port of a large module from outside the repository is proved equal by a differential corpus — every document set the source has and random one-edit mutants of them — and only then split to meet the complexity thresholds; the corpus is rerun after each split"
  - "A script that writes a cache adds its inventory row and its reader or writer classification in the harness in the same change; the first full run names the one that was missed"
  - "A new script that a type-checked file must guard takes its argument guard as the literal call every script makes, so the guard's parameter type is widened, not the call cast"
duration_minutes: 195
---

# Stage 68 Tasks — The 4.0 Document Set: Format, Checker and Pack (4.0 Step 1)

**Phase:** 68
**Status:** Done
**Strategic Goal:** The engine can check a 4.0 document set and compute a task's pack, with the templates of the set, behind `"format": "4"`: `check-docs` and `pack` run through the executor in a user project, require nothing outside the skill folder, and change nothing a 3.x workspace reads or writes.

**Shared names (fixed here so no two tasks choose different spellings):**

- Executor commands: `check-docs [--workspace {name}]`, `pack {task} [--workspace {name}] [--include {file}]`.
- Files: `skills/magicspec/scripts/check-docs.js` (exports `loadDocSet`, `computePack`, `checkDocSet`), `skills/magicspec/scripts/pack.js`, `skills/magicspec/scripts/lib/count-tokens.js` (exports `countTokens`), templates under `skills/magicspec/templates/set/`, fixtures under `tests/engine/fixtures/document-set/`, harness module `tests/engine/document-set.js`.
- The 4.0 predicate: the workspace's entry in `.magicspec/workspace.json` carries `"format": "4"`. The set's root is `.magicspec/{workspace}/`.
- The 3.x line, exit 0: `[check-docs] {workspace} is not a 4.0 workspace (no "format": "4" in workspace.json).` from `check-docs`, and the same text with the tag `[pack]` from `pack`.
- The pack cache: `.magicspec/.cache/packs/{task}.md`; budget 10,000 tokens for the computed units (concept §5.6).

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-68C01] Port the token counter to `scripts/lib/count-tokens.js`
- [x] [T-68C02] Port the checker to `scripts/check-docs.js` on the engine's resolvers
- [x] [T-68C03] Register `check-docs` and `pack` in the executor's command table
- [x] [T-68H01] Checker fixtures and harness cases
- [x] [T-68P01] Port the pack builder to `scripts/pack.js`
- [x] [T-68P02] The pack cache gets its owner in `clean-cache`
- [x] [T-68H02] Pack and cache harness cases
- [x] [T-68F01] The thirteen templates of the set in `templates/set/`
- [x] [T-68H03] Template harness case
- [x] [T-68S01] The specifications as built
- [x] [T-68T01] Validation: static checks, full harness, C14

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-68C01] Port the token counter to `scripts/lib/count-tokens.js`

- **Spec:** l2-sdd-document-set-engine.md §5.2 (`pack` prints its size against the budget); l1-sdd-document-set.md §5.6 (the budget)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node -e "const a=require('./skills/magicspec/scripts/lib/count-tokens.js').countTokens, b=require('../sdd-lab/tools/count-tokens.js').countTokens; const t=require('fs').readFileSync('../sdd-lab/skeleton/skeleton.md','utf8'); if(a(t)!==b(t)) process.exit(1)"` exits 0; the file starts with `// @ts-check`
- **Handoff:** T-68C02 and T-68P01 import `countTokens` from it.
- **Notes:** The same heuristic as the lab's tool, not a new one: the measured budgets were taken with it. Module only, no command line of its own.
- **Changes:** scripts/lib/count-tokens.js: countTokens (characters / 4, rounded up), equal to the lab's counter on the skeleton text; biome clean; C14 3.0.160 -> 3.0.161

### [T-68C02] Port the checker to `scripts/check-docs.js` on the engine's resolvers

- **Spec:** l1-sdd-document-set.md §5.1–§5.9 (every finding of §5.9); l2-sdd-document-set-engine.md §5.2 (`check-docs`), §2 (both layouts, layer boundary)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js check-docs --workspace=engine` prints exactly the 3.x line of the shared names and exits 0; `grep -n "require(" skills/magicspec/scripts/check-docs.js` shows only `node:` modules and paths inside `skills/magicspec/scripts/`; the four fixtures give the results of T-68H01
- **Handoff:** T-68P01 imports `loadDocSet` and `computePack`; T-68H01 pins the behaviour.
- **Notes:** Port the lab's 1,260 lines with their behaviour and their finding texts verbatim; replace only how the set's folder is found (the lab takes a folder argument, the engine resolves `.magicspec/{workspace}/` through the project-root and state-folder resolvers and `resolve-workspace`'s rules) and how the result is printed (one finding per line, then one summary line, exit 1 on findings). Keep the lab's exports. Starts with `// @ts-check`; JSDoc and section blocks per the repository's style. No address or path of an SDD written into anything the script outputs into product files (it writes none).
- **Changes:** scripts/check-docs.js: the lab checker ported with its findings verbatim on the engine's resolvers (locateSet from MAGIC_DESIGN_DIR and workspace.json format 4; the 3.x line exits 0); Rust adapter left in the lab; every function split below the fallow thresholds (16 functions, 0 findings on the file); the four fixtures, the 32 lab sets and 600 one-edit mutants give the lab checker's output exactly; biome, tsc clean

### [T-68C03] Register `check-docs` and `pack` in the executor's command table

- **Spec:** l2-sdd-document-set-engine.md §5.2; l2-engine-automation.md (the executor's command contract)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js --help` lists `check-docs` and `pack` with their usage lines; `node skills/magicspec/scripts/executor.js pack` with no task prints the usage error the table defines and exits non-zero; the command-line-contract cases of the harness pass
- **Handoff:** T-68H01 and T-68H02 run both through the executor.
- **Notes:** In `skills/magicspec/scripts/lib/commands.js`, in the form of the existing entries (arguments, usage line, help text). If fallow cannot see the two scripts as entry points, add them where the other executor-loaded scripts are declared in `.fallowrc.json`; never suppress a finding.
- **Changes:** lib/commands.js: check-docs (--budget) and pack (<task>, --include) registered with usage and help; unknown and valueless options refused by the table; pack's script follows in T-68P01

### [T-68H01] Checker fixtures and harness cases

- **Spec:** l2-sdd-document-set-engine.md §2 (fixtures in `tests/`); l2-test-suite.md (the harness by domain)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes: `good` reports nothing and exits 0; `bad`, `bad3` and `bad4` report the findings `../sdd-lab/tools/test-tools.js` expects of them (bad4: 20), verbatim, and exit 1; a project whose workspace lacks `"format": "4"` prints the 3.x line and exits 0
- **Handoff:** T-68H02 and T-68H03 add to the same module.
- **Notes:** Copy the four fixture sets to `tests/engine/fixtures/document-set/`; the module copies one into a disposable project with a `workspace.json` carrying `"format": "4"` and runs the executor there, never against this repository's `.magicspec/`. Register the module in `tests/engine.js` like the other domains. Case names begin with `document set:`.
- **Changes:** tests/engine/document-set.js (registered in tests/engine.js): good gives no finding; bad, bad3, bad4 give the lab checker's findings from fixtures/document-set/golden.json verbatim (2, 10, 20); a 3.x workspace prints its one line and changes nothing; --budget; the resolved workspace; the layer boundary; fixtures copied to tests/engine/fixtures/document-set/sets; 8 cases pass, biome and tsc clean

### [T-68P01] Port the pack builder to `scripts/pack.js`

- **Spec:** l1-sdd-document-set.md §5.6 (the pack, its order, its budget); l2-sdd-document-set-engine.md §5.2 (`pack`)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** in a disposable project holding the `good` fixture as a 4.0 workspace, `node skills/magicspec/scripts/executor.js pack M1.T1` writes `.magicspec/.cache/packs/M1.T1.md` with the sections in the order of concept §5.6 and prints `{n} / 10000 tokens`; T-68H02 pins it
- **Handoff:** T-68H02.
- **Notes:** Port the lab's `build-pack.js` (136 lines) with its behaviour; it imports from `./check-docs.js` and `./lib/count-tokens.js`. A pack over budget is written and the line says it is over budget, exit 0 (the checker, not the pack, is the gate). `--include {file}` adds a file to *Done before this task* as the lab's option does. On a 3.x workspace it prints the `[pack]` form of the 3.x line and exits 0. Starts with `// @ts-check`.
- **Changes:** scripts/pack.js: the lab's pack builder on the engine's resolvers (pack <task> [--include]...); the same pack file as the lab's builder on 16 tasks of 4 lab sets; Done before this task is read from the files the earlier tasks' Creates name and, for a revising or extending milestone, the component's files from memory/map.md; a missing --include file is refused; the pack goes to .cache/packs/{workspace}/{task}.md (one folder per workspace, so two workspaces cannot collide); the 3.x line exits 0; biome, tsc clean

### [T-68P02] The pack cache gets its owner in `clean-cache`

- **Spec:** l2-sdd-document-set-engine.md §5.2 (the cache path); the cache-owner rule of Phase 48 (every cache has an owner that prunes it)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `rebuildableCaches` in `skills/magicspec/scripts/clean-cache.js` lists `.cache/packs`; after a `pack` run in a disposable project, `executor.js clean-cache` removes the folder and reports it; the existing cache cases pass
- **Handoff:** T-68H02.
- **Notes:** One entry in the list, after `memory.json`. If a specification inventories the rebuildable caches, T-68S01 adds the entry there.
- **Changes:** clean-cache.js: .cache/packs listed among the rebuildable caches (dry run lists it with its size, a run removes it); the JSDoc names the task packs

### [T-68H02] Pack and cache harness cases

- **Spec:** l1-sdd-document-set.md §5.6; l2-sdd-document-set-engine.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes with the pack cases: the order of the sections, the size line, the over-budget line on a fixture task made to exceed the budget, `--include`, the 3.x line, and `clean-cache` removing `.cache/packs`
- **Handoff:** T-68T01.
- **Notes:** In `tests/engine/document-set.js`. An over-budget task may be built in the test by copying `good` and widening one task's Context; do not add a fifth fixture folder for it.
- **Changes:** tests/engine/document-set.js: pack cases (section order and size line, over the budget and the checker's report of the same task, --include and its refusal of a missing or outside file, Done before from the Creates of earlier tasks, the component's files for a revising milestone, unknown task / usage / 3.x line, clean-cache listing and removing .cache/packs); tests/engine/registered-folders-and-caches.js: inventory row for .cache/packs owned by pack.js; lib/commands.js: guardArgv takes any module object so a type-checked script calls it; the argument guard now literal in both scripts; 23 related cases pass

### [T-68F01] The thirteen templates of the set in `templates/set/`

- **Spec:** l2-sdd-document-set-engine.md §5.3; l1-sdd-document-set.md §5.1, §5.3, §5.7, §5.8 (the field lines)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `ls skills/magicspec/templates/set/` lists `product.md`, `rules.md`, `plan.md`, `spec.md`, `profile.md`, `stack-rules.md`, `deps.md`, `bind.md`, `tasks.md`, `state.md`, `decisions.md`, `map.md`, `changes.md`; T-68H03 passes; the five 3.x templates of the same names in `templates/` are byte-identical to HEAD
- **Handoff:** T-68H03; Phase 69's documenter writes from these files.
- **Notes:** Each holds the field lines of the concept verbatim and placeholders in braces, no example content and no third-party name. Take the field lines from the lab skeleton v7.3 where the concept summarizes them; where the two differ, the concept wins and the difference is recorded under the task's Changes for T-68S01. The folder name `templates/set/` is the [DR] of plan 1.83.0.
- **Changes:** templates/set/: product, rules, plan, spec, profile, stack-rules, deps, bind, tasks, state, decisions, map and changes, each with the field lines of the concept and placeholders only; the five 3.x templates of the same names untouched; the folder name templates/set/ is the [DR] of plan 1.83.0

### [T-68H03] Template harness case

- **Spec:** l2-sdd-document-set-engine.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test --test-name-pattern="document set" tests/engine.js` passes a case that copies `templates/set/` into a disposable 4.0 workspace, replaces each placeholder with one minimal unit, runs `check-docs` and finds no parse error (content findings such as a missing owner are allowed and listed in the case)
- **Handoff:** T-68T01.
- **Notes:** The case proves the templates and the parser agree on the field lines; it does not prove a filled set is clean, which is Phase 69's run.
- **Changes:** tests/engine/document-set.js: the thirteen templates are present and no other file; each holds every field line the checker reads; filled with minimal values they parse (12 or more addresses, one task, no 'does not belong here' or 'missing' finding); the 3.x templates keep their meaning; 17 document-set cases pass, biome and tsc clean

### [T-68S01] The specifications as built

- **Spec:** l2-sdd-document-set-engine.md §5.2, §5.3, §6 item 2 (l2-engine-templates.md amended in step 1); l2-engine-automation.md (script inventory); l2-test-suite.md (the new domain module and fixtures)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js check-prerequisites --json --require-specs --verify-headers --workspace=engine` returns `"ok": true` with no `STATUS_DRIFT` or `VERSION_DRIFT`; each amended specification has a Document History row naming Phase 68; the registry row of each carries the new version
- **Handoff:** T-68T01.
- **Notes:** Patch-level as-built amendments: the templates folder `templates/set/` in l2-sdd-document-set-engine §5.3 and in the inventory of l2-engine-templates; `check-docs`, `pack`, `lib/count-tokens.js` and the pack cache in l2-engine-automation; `tests/engine/document-set.js` and its fixtures in l2-test-suite. A requirement that changed while building is not patched here: it goes back through `/magicspec spec amend`.
- **Changes:** l2-sdd-document-set-engine 1.0.2 (check-docs --budget and the non-4.0 line; pack under .cache/packs/{workspace}/, Done before this task from the Creates of earlier tasks and the map row, the over-budget report; templates/set/), l2-engine-automation 1.33.0 (the three scripts, the cache row, clean-cache's list), l2-engine-templates 1.3.5 (the set/ sub-folder), l2-test-suite 1.48.6 (the document-set module); registry 1.97.0; header parity ok; no requirement changed

### [T-68T01] Validation: static checks, full harness, C14

- **Spec:** l2-sdd-document-set-engine.md §5.6 step 1; CLAUDE.md §3.2 and C14
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node_modules/.bin/biome check` on every file the phase created or changed reports nothing; `pnpm run typecheck` passes; `pnpm exec fallow dead-code` and `pnpm run audit` report no finding on the new code; `node --test tests/engine.js` passes in full (the pass counter grows by the new cases, the fail counter is 0); `node skills/magicspec/scripts/executor.js update-engine-meta --check` passes after the last C14 run
- **Handoff:** Phase 69 (the forward gate), outlined in the plan.
- **Notes:** C14 runs after every edit inside `skills/magicspec/`, not once at the end. The full harness runs in the background (several minutes); read its `pass` and `fail` counters.
- **Changes:** biome clean on the new files (the format drift of lib/commands.js and clean-cache.js is inherited: HEAD has it); tsc 0; fallow dead-code 0 issues; fallow audit: no introduced issue in 69 changed files (inherited: validateEntry, clean-cache main); full harness 479 cases, 478 pass at first run and the one failure — the MAGIC_DESIGN_DIR classification, check-docs.js was unclassified — fixed in the test and green; update-engine-meta --check clean at 3.0.164
