---
phase: 45
name: "Maintenance Layout (Single-Skill Step 4)"
status: Done
subsystem: "scripts, tests, package.json, skills/magicspec-dev, .agents, docs, .design/RULES.md"
requires:
  - "Phase 44: skills/magicspec/ is the only engine; the maintenance scripts reach it through dev/scripts/engine-path.js; the harness runs against it (227 cases)"
  - "The maintenance layout, the developer signal and the layer rule (l2-skill-layout 1.4.0 §5.5, §5.8 step 4, §5.9); SP-7 and SP-9 (l1-skill-packaging 1.0.0): Stable at registry 1.54.0"
provides:
  - "The maintenance tooling at its final place: scripts/, tests/ and package.json at the repository root, skills/magicspec-dev/ with the router and four workflows (init, release, test, sync), the init and release scripts under scripts/, the entry writer scripts/init/project-dev-skill.js, the frontmatter checker scripts/skill-frontmatter.js"
  - "The dotted /magic.dev.* names are /magicspec-dev:*; the wrapper generator and every generated wrapper are gone"
  - "The developer predicate reads <root>/skills/magicspec and <root>/scripts/generate-checksums.js only; the earlier-layout branches are removed; the link table has two rows"
  - "Engine 2.1.150; harness 227; l2-skill-layout 1.5.0, l2-skill-wrappers 2.1.0, l2-test-suite 1.35.0; registry 1.56.0"
key_files:
  created:
    - "skills/magicspec-dev/"
    - "scripts/init/project-dev-skill.js"
    - "scripts/skill-frontmatter.js"
  modified:
    - "scripts/ (moved from dev/scripts), tests/ (moved from dev/tests), package.json (moved from dev/package.json)"
    - "skills/magicspec/scripts/utils.js, check-prerequisites.js, update-engine-meta.js; AGENT-RULES.md"
patterns_established:
  - "A scripted rename of a folder name that is also a generic word needs a residue search for the forms the pattern cannot see (escaped slashes, path segments passed as separate arguments)"
  - "Retire a generator together with its fixtures, but keep the rules it enforced as a checker the harness runs"
  - "A move that changes the depth of a script from the root changes every relative path it computes: search for the depth, not the name"
duration_minutes: 240
---

# Stage 45 Tasks — Maintenance Layout (Single-Skill Step 4)

**Phase:** 45
**Status:** Done
**Strategic Goal:** Give the maintenance tooling its final home ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.5, §5.8 step 4): the scripts at the repository-root `scripts/`, the harness at `tests/`, `package.json` at the root, and a second skill, `skills/magicspec-dev/`, that holds only the four maintenance workflows (`init`, `release`, `test`, `sync`) calling those scripts. The dotted `/magic.dev.*` names become `/magicspec-dev:*`. Exit criterion: the harness is green and the developer predicate is true here and false in a fresh installation fixture. Nothing is released here.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-45A01] Move `dev/scripts`, `dev/tests` and `dev/package.json` to `scripts/`, `tests/` and `package.json`; the helper and the cache follow
- [x] [T-45A02] Every path that names `dev/` follows: the predicate constant, the harness, CI, ignore files, the guide, documentation and the constitution
- [x] [T-45B01] `skills/magicspec-dev/`: router, the four workflows, the maintenance guide; the executable parts move to `scripts/`
- [x] [T-45B02] The dotted `/magic.dev.*` names become `/magicspec-dev:*` everywhere; the old maintenance workflows and wrappers are removed
- [x] [T-45B03] The repository's links and entries for the maintenance skill, and the init scripts
- [x] [T-45C01] The predicate and the layer rule: true here, false in an installation, each half alone false
- [x] [T-45D01] Specifications of the impact table (step 4) amended
- [x] [T-45G01] C14 and the closing run
- [x] [T-45T01] Validation: harness, mutation lists, links, residue search
- [x] [T-45S01] Spec sync: the decisions taken in this phase

## Detailed Tracking

### [T-45A01] Move `dev/scripts`, `dev/tests` and `dev/package.json` to `scripts/`, `tests/` and `package.json`; the helper and the cache follow

- **Spec:** l2-skill-layout.md §5.5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `dev/` no longer exists; `node scripts/engine-path.js`'s `enginePath('.version')` resolves to `skills/magicspec/.version` from the new place (one `..` less); `node scripts/validate-hardlinks.js` and `node scripts/sync.js --dry-run` run; the state cache of the docs sync lives under a root `.cache/` that `.gitignore` ignores.
- **Handoff:** T-45A02.
- **Notes:** a plain move, not `git mv` (the index is not touched; git sees the renames at the next commit). `engine-path.js`: `repoRoot()` is `..` of the scripts folder; `MAINTENANCE_DIR` is `scripts`. The root `package.json` keeps `"type": "commonjs"` and gains `"private": true` and a `test` script (`node --test tests/engine.js`) — it belongs to this repository only and is never packaged.
- **Changes:** dev/scripts, dev/tests and dev/package.json moved to scripts/, tests/ and package.json (a plain move, the index untouched); the docs-sync state cache moved to a root .cache/ (ignored); engine-path.js counts one level up and names scripts/ as the maintenance folder; depth assumptions in the scripts and the harness corrected.

### [T-45A02] Every path that names `dev/` follows: the predicate constant, the harness, CI, ignore files, the guide, documentation and the constitution

- **Spec:** l2-skill-layout.md §5.5, §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "dev/\(scripts\|tests\|package\|\.cache\)"` outside CHANGELOG history, archived workbooks, specification history rows and the drafts prints nothing; `maintenanceScript()` in `utils.js` names `<root>/scripts/`; the harness fixtures hold `scripts/`; `.design/workspace.json` `scope` lists `scripts`, `tests`, `package.json` where it listed `dev`; C15 and C28 name the new paths.
- **Handoff:** T-45C01, T-45T01.
- **Notes:** one scripted pass behind a residue search, the same method as the previous phase. The fallbacks in `update-engine-meta` and the sibling-folder probe keep their meaning with the new constant; the harness fixture builder copies `scripts/` into `<tmp>/scripts`. The constitution amendment is a user-stated change (the restructuring order) made as in the previous phase; `templates/rules.md` mirrors it.
- **Changes:** About 360 references followed in one scripted pass (dev/scripts, dev/tests, dev/package.json, dev/.cache, the path-join segments and the escaped regex spellings), history rows, CHANGELOG and archived workbooks untouched; maintenanceScript() names <root>/scripts, the harness fixtures hold scripts/, workspace.json scope lists scripts, tests and package.json, the guide and C28 name the maintenance tooling, the root package.json gained private and a test script. Found on the way: a fixture that created dev/ for an unrelated file, two regex spellings the plain rename missed, and a state-cache path built from separate segments.

### [T-45B01] `skills/magicspec-dev/`: router, the four workflows, the maintenance guide; the executable parts move to `scripts/`

- **Spec:** l2-skill-layout.md §5.5, §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec-dev/` holds `SKILL.md`, `workflows/{init,release,test,sync}.md`, `references/` and nothing executable; the executable parts (the Windows and Unix init scripts with their registry, the release script) are under `scripts/`; the router's command table equals the files of `workflows/` (the router case of the harness covers both skills); the description meets the frontmatter contract.
- **Handoff:** T-45B02, T-45B03.
- **Notes:** `init` ← the `magic-dev-init` skill, `release` ← `magic-dev-release`, `test` ← the `magic.dev.simulate` workflow (its suite stays `tests/suite.md`), `sync` ← `magic.dev.sync`. The hand-crafted skills `eval-prompts` and `reference-mining` stay where they are: they are not part of the maintenance layout.
- **Changes:** skills/magicspec-dev/ holds SKILL.md (the router: grammar, four-row table, dispatch), workflows/{init,release,test,sync}.md (each opens with a Command line and keeps the former body) and references/maintenance-layout.md; the executable parts moved to scripts/init/ (the Windows and Unix init scripts and agents.json, path arithmetic corrected) and scripts/release.js; the hand-crafted eval-prompts and reference-mining skills stayed.

### [T-45B02] The dotted `/magic.dev.*` names become `/magicspec-dev:*` everywhere; the old maintenance workflows and wrappers are removed

- **Spec:** l2-skill-layout.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "magic\.dev\|magic-dev"` outside history prints nothing; `.agents/workflows/magic.dev.*.md` and `.agents/skills/magic-dev-*` are gone; `dev`/`scripts/sync-skills.js` (the wrapper generator) is removed with its harness cases and mutation entries; the harness pins use the new names.
- **Handoff:** T-45B03.
- **Notes:** the generator's only remaining source was the maintenance workflows, which are now plain workflow bodies of a skill; its frontmatter-refusal contract (l2-skill-wrappers §3.3) goes with it, and the router case keeps the same limits for both routers.
- **Changes:** The dotted names became /magicspec-dev:{init,release,test,sync} in 24 files (the guide, constitution, template, rule source, analyze body, docs, harness pins, suite); .agents/workflows/magic.dev.*.md and .agents/skills/magic-dev-* are removed; scripts/sync-skills.js is removed and its checker survives as scripts/skill-frontmatter.js (readScalar, checkProjection, RESERVED_NAME_WORDS) which the harness runs over both routers; the finding SKILL_SYNC_UNAVAILABLE left the diagnostics spec with it.

### [T-45B03] The repository's links and entries for the maintenance skill, and the init scripts

- **Spec:** l2-skill-layout.md §5.6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.agents/skills/magicspec-dev` is a directory link to `skills/magicspec-dev`; the link table of the validator lists it; command entries `/magicspec-dev:{init,release,test,sync}` exist for Claude Code; the init scripts link both skills and call `init --host` for the engine one; the validator and a throwaway run of the Windows script's guard agree.
- **Handoff:** T-45T01.
- **Notes:** the entries for the maintenance skill are not the engine generator's business (`init --host` projects `magicspec` only); the init script writes four pointer entries. Entries and the link are ignored by git like the engine's.
- **Changes:** scripts/init/project-dev-skill.js links .agents/skills/magicspec-dev to skills/magicspec-dev and writes four marked command entries under .agents/workflows/magicspec-dev/ (a file without a marker is left alone); both init scripts call it after init --host and list the new paths in their cleanup; the link table of the validator has two rows and its harness case checks both (2/2 linked).

### [T-45C01] The predicate and the layer rule: true here, false in an installation, each half alone false

- **Spec:** l2-skill-layout.md §5.5; l1-skill-packaging.md SP-7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the existing predicate case passes in each direction with the builder at `<root>/scripts/generate-checksums.js`; a project that owns a `scripts/` folder without the builder, and an installation with a builder in a `scripts/` folder, both read false; the `.magic` branch of the predicate and the legacy flat-shape readers are removed (no fixture uses them now) with a case that the earlier shape is not read.
- **Handoff:** T-45G01.
- **Notes:** the dead compatibility branches recorded in the previous phase go here: `utils.js` predicate (`.magic`), `check-prerequisites` flat-shape scan, `install-hooks` probes. The layer-rule paragraph of the guide says the shipped set is exactly the skill folder.
- **Changes:** The predicate reads only <root>/skills/magicspec and <root>/scripts/generate-checksums.js; the .magic branch of hasEngineWriteTooling and the flat-body scan of check-prerequisites are removed; the existing predicate case passes in each direction (here true, an installation false, each half alone false).

### [T-45D01] Specifications of the impact table (step 4) amended

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** each specification naming `dev/` carries the new paths with a history row and a matching `INDEX.md` version; `l2-test-suite.md` names `tests/engine.js`; `workspace.json` scope follows; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** T-45S01.
- **Notes:** a reality sync with a patch bump each, as in the previous phase; history rows are not rewritten.
- **Changes:** Nine specifications that name the maintenance folders received their patch bump with a history row, five more earlier in the pass; l2-skill-wrappers 2.1.0 (the maintenance router replaces the generated skills), l2-engine-diagnostics 1.3.2 (SKILL_SYNC_UNAVAILABLE retired), l2-test-suite 1.35.0, l2-agent-surface 2.0.1; registry 1.56.0, header parity ok, workspace scope follows the moved folders.

### [T-45G01] C14 and the closing run

- **Spec:** l2-skill-layout.md §5.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `update-engine-meta` bumps the version and the manifest; a second run is quiet; the full harness passes; `node scripts/mutation-check.js` over the retargeted lists reports every entry CAUGHT.
- **Handoff:** T-45T01.
- **Notes:** every edit inside `skills/magicspec/` made by this phase is a version event of its own.
- **Changes:** update-engine-meta bumped 2.1.148 -> 2.1.150 over the phase (the second run refreshed the rule projection); quiet on a second run and from the root, a subdirectory and through the link; harness 227 of 227.

### [T-45T01] Validation: harness, mutation lists, links, residue search

- **Goal:** the maintenance tooling lives in its final place and nothing names the old one.
- **Method:** the full harness; the mutation lists; `node scripts/validate-hardlinks.js`; the integrity check from the root, a subdirectory and through the link; a residue search for `dev/` and the dotted maintenance names; `finalize` and `export-wiki` from the new location.
- **Status:** Done
- **Changes:** Harness 227 of 227 at the end; 36 mutation entries of the earlier phases and the new link table re-run against the new paths, 34 CAUGHT, two refused for a path or a needle that no longer exists (retargeted, then CAUGHT) and one meaningless entry dropped; validate-hardlinks passes with two link rows; the integrity check is quiet from the root and through the link; a residue search finds the earlier names only in history rows, the CHANGELOG, archived workbooks and the drafts.

### [T-45S01] Spec sync: the decisions taken in this phase

- **Spec:** l2-skill-layout.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the specifications describe the maintenance layout as built; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** Phase 46.
- **Notes:** record only what execution decided and the specifications do not yet say.
- **Changes:** l2-skill-layout.md 1.5.0 records the layout as built (the move, the maintenance skill, the entry writer, the checker, the predicate without the earlier-layout branch) and repairs the map row the scripted rename had flattened; the registry notes name the rest.
