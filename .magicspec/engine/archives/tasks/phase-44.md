---
phase: 44
name: "Switch to the Skill and Retire the Old Engine (Single-Skill Step 3, Part 2)"
status: Done
subsystem: "skills/magicspec, dev/scripts, dev/tests, .agents, docs, .design/RULES.md"
requires:
  - "Phase 43: skills/magicspec/ complete beside the old tree, the harness green under both script sets (229 cases), the host projections, the predicate and the manifest builder's --dir argument"
  - "The switch, the link inventory, the impact table and the constitution amendment (l2-skill-layout 1.3.0 §5.6, §5.8 step 3, §5.9); installation, removal and the verified host table (l2-skill-distribution 1.3.0 §5.2, §5.3); SP-1 to SP-7 and SP-9 (l1-skill-packaging 1.0.0): Stable at registry 1.52.0"
  - "The mutation-control driver and the script harness (l2-test-suite 1.33.0)"
provides:
  - "skills/magicspec/ is the only engine of the repository: the old tree (.magic/, workflows/, rules/, skills/magic-*, their .agents/ twins) is removed; the harness (227 cases) runs against the skill only; the first manifest of the new tree is engine 2.1.148"
  - "The colon command form /magicspec:{cmd} in all shipped text and messages; workflow identifiers printed by finalize and stored in STATE.md (magic.{workflow}) are kept as data"
  - "refreshProjections in the C14 write branch; a file reached through two hosts' folders is one projection; the link table of the validator; the repository's own projections written by init --host=claude,codex; the maintenance init scripts call init --host"
  - "Constitution 1.16.0 and 36 specifications brought to the layout; wrapper, agent-surface and release-pipeline specifications rewritten at 2.0.0"
key_files:
  created:
    - "dev/scripts/engine-path.js"
  modified:
    - "skills/magicspec/ (text, update-engine-meta.js, lib/hosts.js)"
    - "dev/scripts/ (all), dev/tests/engine.js, AGENTS.md family, README.md, docs/, .github/workflows/release.yml, .design/RULES.md"
patterns_established:
  - "A mechanical rename of a path that a test asserts the ABSENCE of inverts the assertion: restore the old spelling in every 'names no earlier place' check after a global replace"
  - "A script file with backslashes written through a shell heredoc loses them: write helper scripts with the Write tool"
  - "A host list whose folders are links to one folder must count that folder once, or two argument placeholders flip the same file"
  - "Retire a wrapper-era case together with its mutation entries; port what it guarded to the successor (router parity, link table)"
duration_minutes: 420
---

# Stage 44 Tasks — Switch to the Skill and Retire the Old Engine (Single-Skill Step 3, Part 2)

**Phase:** 44
**Status:** Done
**Strategic Goal:** Make `skills/magicspec/` the only engine of the repository and remove the old tree last, after the harness has passed on the new one ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.8 step 3, second half). Every maintenance script, the harness, the repository's own invocation and projections, the documentation and the constitution are retargeted first; the old tree (`.magic/`, `workflows/`, `rules/`, `skills/magic-*`, their `.agents/` twins) goes in T-44G01, when nothing reads it any more. Nothing is released here: the version stays 2.1.x until Phase 46.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-44A01] Command notation: the dotted `/magic.X` names become `/magicspec:X` in the skill's text and in every message its scripts print
- [x] [T-44A02] `update-engine-meta` write branch: the projection refresh replaces the wrapper sync
- [x] [T-44B01] Maintenance scripts retargeted to the skill folder through one path helper
- [x] [T-44B02] Link inventory: groups 2 and 3 retired, the directory links checked
- [x] [T-44C01] The repository's own projections and invocation text
- [x] [T-44C02] CI and tool configuration, workspace scope
- [x] [T-44D01] Harness layout: the skill folder is the default tree, fixtures and text reads follow
- [x] [T-44D02] Harness pins: command names, retired wrapper cases, router-to-folder parity
- [x] [T-44D03] Harness green on the new tree; the mutation lists retargeted
- [x] [T-44E01] Documentation: `docs/`, README with the verified host table and install prompt, CONTRIBUTING
- [x] [T-44F01] Constitution: the `.magic/`-named conventions amended, the template mirror with it
- [x] [T-44F02] Specifications of the impact table amended
- [x] [T-44G01] Remove the old tree
- [x] [T-44G02] C14 on the new tree: version, manifest, snapshot
- [x] [T-44T01] Validation: closing run and residue search
- [x] [T-44T02] Validation: cognitive simulation of the new text
- [x] [T-44S01] Spec sync: the decisions taken in this phase

## Detailed Tracking

<!-- Optional entry field, created by /magic.run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-44A01] Command notation: the dotted `/magic.X` names become `/magicspec:X` in the skill's text and in every message its scripts print

- **Spec:** l2-skill-layout.md §5.2; l2-skill-distribution.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rnE "/magic\.|magic\.(spec|task|run|rule|analyze|status|graph)\b|rules/magic\.md|\.agents/rules/magic" skills/magicspec` prints nothing; the router's maintainer note is gone; `node --test dev/tests/engine.js` after T-44D02 passes.
- **Handoff:** T-44D02 (the pins follow this text), T-44F01 (the template mirror), T-44E01.
- **Notes:** one mechanical pass behind a residue search, on the folder this phase makes the only engine. `/magic.task` → `/magicspec:task` (the colon form is what Claude Code and Qwen Code register from `commands/magicspec/`; the router already says the other forms mean the same). The rule file is `AGENT-RULES.md`, not `rules/magic.md`; `/magic.dev.*` names belong to the maintenance guide and are left for Phase 45. Scripts print these names (finalize's next step, resume lines, `check-prerequisites` remedies): change them in the scripts and nowhere else in `.magic/`. The consumer guard in the rule source (read-only engine, bug-report protocol) is not weakened. A command name inside a quoted sample of the old layout (`CHANGELOG` history) stays.
- **Changes:** 232 command mentions in 24 files of skills/magicspec now use the colon form (/magicspec:task, magicspec:run in prose), the wildcard and placeholder forms follow, the rule file is named AGENT-RULES.md, executor examples name skills/magicspec/scripts, comments no longer name the old folder, the router's maintainer note and one wrapper phrase in task.md are gone. Kept on purpose: the workflow identifiers finalize prints and STATE.md stores (magic.${workflow}, the significance map keys) are data, not command names, and migrating persisted values belongs to Phase 46; /magic.dev.* and the C-rules mirror in templates/rules.md wait for Phases 45 and T-44F01; the legacy .magic branches in utils.js go with the fixtures in T-44D01.

### [T-44A02] `update-engine-meta` write branch: the projection refresh replaces the wrapper sync

- **Spec:** l2-skill-layout.md §5.4; l2-skill-distribution.md §5.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a harness case runs the write branch in a developer fixture that holds a projection of the rule and of one command entry made from an older source: both are regenerated and the run prints one line naming what it refreshed; in a fixture with no projection it refreshes nothing and says so; a user-installation fixture still refuses to write.
- **Handoff:** T-44D03, T-44G02.
- **Notes:** `lib/hosts.js` gains `refreshProjections(rootDir)`: for each host that already has a projection (a marked rule, a marked command entry, a managed block) it runs `projectHost`, so a rule or router change is never left stale after a bump. `syncSkillWrappers`, `failOnRefusedWrappers` and the `SKILL_SYNC_UNAVAILABLE` finding go; the generator's refusals (frontmatter limits of the router description) are checked by the router case of the harness, which already exists. The marker file comparison stays the only record (SP-6).
- **Changes:** update-engine-meta.js: the wrapper sync and its refusal path are gone; the write branch calls refreshHostProjections() (hosts.refreshProjections: rewrites only existing stale projections, removes an entry whose command left the router, creates none; a file reached through two hosts' folders counts once). A harness case pins each direction, a link-shared command folder and an unmarked file; the no-change message no longer promises a wrapper sync.

### [T-44B01] Maintenance scripts retargeted to the skill folder through one path helper

- **Spec:** l2-skill-layout.md §5.5, §5.8 step 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "\.magic" dev/scripts` prints nothing; `node dev/scripts/sync.js --dry-run` runs the whole pipeline without an error; `node dev/scripts/generate-checksums.js` with no argument writes the manifest of `skills/magicspec`; `node dev/scripts/mutation-check.js` still refuses a `.design/` target.
- **Handoff:** T-44D01, T-44G02.
- **Notes:** a new `dev/scripts/engine-path.js` holds the one constant (`skills/magicspec` relative to the repository) and `enginePath(...parts)`; every script requires its utilities and reads its version through it, so Phase 45's move of the folder is one line. `sync-skills.js` stops reading `workflows/` (no longer a source); it keeps `.agents/workflows` → `.agents/skills`, which still serves the maintenance workflows until Phase 45 moves them. `sync-docs.js` reads the workflow heads from `skills/magicspec/workflows/{name}.md` (their entry sections are in the body now) and `docs/{name}.md` keeps its anchors. `sync-manifests.js` and `sync-engine-snapshot.js` read `skills/magicspec/.version`. Pass to the scripts the project root they are run from, as before; no script requires from `dev/` on the shipped side (layer rule).
- **Changes:** dev/scripts/engine-path.js holds the one constant (skills/magicspec) and enginePath(); benchmark, generate-checksums (default folder is the skill), sync, sync-docs (router table, workflows/{name}.md, no wrapper triple), sync-engine-snapshot, sync-manifests, sync-skills (only .agents/workflows remains a source; the orphan guard is unchanged) and update-project-meta require through it; no .magic left in dev/scripts. sync-skills is no longer called from the C14 flow (T-44A02): run it by hand after editing a maintenance workflow, until Phase 45 retires it.

### [T-44B02] Link inventory: groups 2 and 3 retired, the directory links checked

- **Spec:** l2-skill-layout.md §5.6; l2-agent-surface.md §4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/scripts/validate-hardlinks.js` reports the AGENTS family (group 1) and the directory link `.agents/skills/magicspec` → `skills/magicspec`; with the link replaced by a copy of the folder, or pointing elsewhere, it exits 1 and names the path; a harness case pins each direction.
- **Handoff:** T-44C01, T-44D03.
- **Notes:** the validator's header documents three groups; it documents one group plus the link table afterwards. A link is checked as a link (`lstat`), its target by real path; the junction-safety order of the repository guide (the path out of the git index before the link is created) is stated in the failure remedy, not enforced. The always-on rule's installed copy is generated, so it is checked by the staleness check of `init`, not here. A second entry of the table is the dev skills' links of the host folders, none today.
- **Changes:** validate-hardlinks.js: group 1 (the AGENTS family) stays; groups 2 and 3 are replaced by a link table (host skills folder to the skill folder) checked by lstat and real path; the pairs function and its export are gone. The harness case for each direction is added in T-44D02.

### [T-44C01] The repository's own projections and invocation text

- **Spec:** l2-skill-layout.md §5.6; l2-skill-distribution.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js init --host=claude,codex` is idempotent (a second run reports every row unchanged/in place); `.agents/skills/magicspec` is a directory link to `skills/magicspec`; `.agents/rules/magicspec.md` equals `AGENT-RULES.md` byte for byte and `.claude/rules/magicspec.md` reaches the same file; `.claude/commands/magicspec/` holds seven entries; the AGENTS family still shares one inode (`fsutil hardlink list AGENTS.md` shows 5) and names `node skills/magicspec/scripts/executor.js`; the four maintenance workflow and skill texts under `.agents/` name no `.magic/` path.
- **Handoff:** T-44G01, T-44T02.
- **Notes:** `.claude/`, `.codex/` and `.qwen/` reach `.agents/` through links, so one write serves them; both Claude Code and Qwen Code entries would land in the same folder with different argument placeholders, so this repository projects `claude` and `codex` only and says why in the commit notes (the Qwen rule file is shared by the link; its commands are not projected). Generated projections are ignored by `.gitignore` (the engine ships the source, not the copy), the pointer block in `AGENTS.md` excepted because that file is tracked. The AGENTS family is edited by Node in place and re-verified; `git rm --cached` goes by specific file paths only (repository guide §6) and never before the link exists.
- **Changes:** init --host=claude,codex run twice (second run: every row unchanged / in place): .agents/skills/magicspec is a junction to skills/magicspec (ignored by .gitignore), .agents/rules/magicspec.md equals AGENT-RULES.md byte for byte and .claude/rules reaches it, seven command entries under .claude/commands/magicspec, a pointer block in the AGENTS family (still 5 names on one inode, content equal); the guide's layer text and C14 line name skills/magicspec; setup_windows.ps1 and setup_unix.sh no longer link workflows/ or rules/ but call init --host (guard, cleanup list, projections; the unix registry reader's jq branch was malformed since before and is fixed); the maintenance workflows and skills name no .magic path and their wrappers are regenerated. Qwen: its rule is shared through the link, its command entries are not projected (one shared folder, two argument placeholders). The pre-commit hook was rewritten by init for the new folder; the old one is kept as pre-commit.magic-spec.bak.

### [T-44C02] CI and tool configuration, workspace scope

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.github/workflows/release.yml` builds its archive from `skills/magicspec` (the full archive composition is Phase 46) and names no `.magic/`; `.fallowrc.json`, `.markdownlint-cli2.jsonc`, `.gitattributes` and `.gitignore` carry the new paths; `.design/workspace.json` `engine.scope` lists `skills/magicspec` where it listed the old folders; `node skills/magicspec/scripts/executor.js check-prerequisites --json --workspace=engine` reports no `UNSCOPED` finding.
- **Handoff:** T-44G01.
- **Notes:** a CI step that gates a build on an engine script is forbidden by the containment rule for products, but the release workflow of this repository is the engine's own; it only packages. Keep the archive composition change to the path, Phase 46 owns the new composition and the smoke step.
- **Changes:** release.yml reads and archives skills/magicspec (composition proper is Phase 46); .fallowrc.json, .markdownlint-cli2.jsonc name the skill folder; workspace.json engine.scope drops .magic, workflows and rules (skills stays); .gitattributes needed nothing. .gitignore keeps the old magic-* lines until T-44G01.

### [T-44D01] Harness layout: the skill folder is the default tree, fixtures and text reads follow

- **Spec:** l2-test-suite.md §Skill-Folder Coverage
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test dev/tests/engine.js` with no environment override runs the scripts of `skills/magicspec`; a fixture holds `skills/magicspec/{scripts,templates,roles,references,workflows}` plus `dev/scripts`, so the predicate is true in it; a user-installation fixture (`.agents/skills/magicspec`) exists for the installed-shape cases; no case reads `.magic/`.
- **Handoff:** T-44D02.
- **Notes:** one constant `ENGINE_REL` and helpers (`enginePath(tempDir, ...)`, `repoEnginePath(...)`) replace the `'.magic'` literals (about 250); the text reads map as the layout spec's table does (`.magic/spec.md` → `workflows/spec.md`, `.magic/{context,init,retrospective}.md` → `references/`). The `MAGIC_SCRIPTS_DIR` override existed to prove the copy before the switch; it goes with the old tree. Done as a scripted rewrite followed by a run, not by hand; each failing case is a divergence to classify (a stale pin, or a defect of the new tree).
- **Changes:** dev/tests/engine.js: the engine under test is skills/magicspec (MAGIC_SCRIPTS_DIR and the dev-script mirror shim are gone), fixtures hold skills/magicspec plus dev/scripts, dev-only scripts run from dev/scripts through requireDevFromFixture, text reads follow the new names (workflows/, references/, AGENT-RULES.md); the committable test of git tracking counts a new, not ignored file as tracked.

### [T-44D02] Harness pins: command names, retired wrapper cases, router-to-folder parity

- **Spec:** l2-test-suite.md; l2-skill-wrappers.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the cases that pinned the per-workflow wrapper (generator, frontmatter parity, `WRAPPER_BODY_DRIFT`, hardlink groups 2 and 3) are gone or ported; one case asserts the router's command table equals the files in `workflows/` and every projection entry points at a workflow that exists; every pinned command name is the colon form; the case count is recorded in `dev/tests/suite.md`'s closing line only.
- **Handoff:** T-44D03.
- **Notes:** a retired case is deleted with its mutation entry, not weakened; the property it guarded (a wrapper disagreeing with its body) has no counterpart now that the entry section is the head of the body, except the router parity, which is pinned. `analyze.md` Mode C's wrapper-parity check is rewritten as router-to-folder parity in the same pass (the text lives in the skill; T-44A01 leaves it for this task).
- **Changes:** Retired with their mutation entries: the workflows-only regeneration case, the refused-wrapper case of update-engine-meta, the sync-skills frontmatter-refusal case (the generator survives for the maintenance workflows only); ported: the frontmatter contract now holds the router and the generated maintenance skills, the link validator case checks the link table (intact, a link elsewhere, a copy, missing, --strict), body navigation covers workflows/ and references/ (the wrapper-size rule is gone), the phantom-command scan reads the colon form and the folder's workflows, every pinned command is /magicspec:X. Absence assertions about the earlier folder were restored after the mechanical rename had inverted them.

### [T-44D03] Harness green on the new tree; the mutation lists retargeted

- **Spec:** l2-test-suite.md §Mutation-Control Driver
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the full harness passes; every entry of the three mutation lists of Phases 41 to 43 (needles retargeted from `.magic/scripts` to `skills/magicspec/scripts`) is CAUGHT; a survivor is closed by strengthening its case.
- **Handoff:** T-44G01 (no removal before this is Done).
- **Notes:** the lists are rebuilt from their generators in the scratch folder, not edited in the repository; the old-tree half of each list is dropped.
- **Changes:** Harness 229 -> 227 (three wrapper cases retired, one link case replaced, one refresh case added), 227 of 227 passing with the old tree removed. Mutation lists of Phases 41-43 and the hardening retargeted to the skill folder: 86 CAUGHT, 3 entries re-pointed (rule source, analyze, retrospective) and re-run CAUGHT, one survivor closed by widening the graph-path text scan to the whole skill folder; 7 new entries for the link table and refreshProjections, all CAUGHT after one corrected.

### [T-44E01] Documentation: `docs/`, README with the verified host table and install prompt, CONTRIBUTING

- **Spec:** l2-skill-distribution.md §5.2, §5.3; l1-documentation-system.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/scripts/sync.js` leaves `docs/` and CONTRIBUTING consistent with the workflow heads; `grep -rn "\.magic/\|/magic\.\(spec\|task\|run\|rule\|analyze\|status\|graph\)" README.md docs CONTRIBUTING.md` prints only the history sections; the README holds the verified host table (Claude Code, Codex, Qwen Code), the install prompt naming the archive, the target folder per host and `init --host`, and the removal command.
- **Handoff:** T-44T01.
- **Notes:** `docs/init.md` and `docs/graph.md` were updated in Phases 41 and 42; this pass changes the install story. CHANGELOG entries describe what changed at the time and are not rewritten; the 3.0.0 entry is Phase 46's. No horizontal rules in Markdown.
- **Changes:** README: install story rewritten (host table, install prompt with init --host, manual options, .gitignore lines, removal, update); docs/distribution.md rewritten around the one folder and the generated projections; docs/checksums.md and docs/README.md follow; every other page renamed mechanically (/magicspec:X, skills/magicspec/…). Only the maintenance commands keep the dotted form until Phase 45.

### [T-44F01] Constitution: the `.magic/`-named conventions amended, the template mirror with it

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `.design/RULES.md` C1, C7, C14, C15 and C28 name the skill folder and `AGENT-RULES.md`; `.design/RULES.md` and `skills/magicspec/templates/rules.md` agree line for line on the amended conventions; `check-prerequisites --verify-headers` reports `ok: true`, `TASKS.md` `Based on RULES` carries the new version, and the document history states the owner's instruction as the origin.
- **Handoff:** T-44F02, T-44T01.
- **Notes:** the change is a user-stated one (the owner's restructuring order of 2026-10-28), made through the `rule` workflow's Operational Logic with the Admission step: the with/without comparison is that without it the constitution names a folder that no longer exists, so C14 (the bump flow) would point at nothing. The `dev/` paths in C15 and C28 stay: they move with Phase 45. `templates/rules.md` mirrors the live constitution word for word, so both change in this task.
- **Changes:** Constitution 1.16.0: C1, C7, C14, C16, C21, C23, C24, C26 name the engine folder and its resources relative to it, C28 rewritten around skills/magicspec/ and the hasEngineWriteTooling predicate; the template mirror carries the same lines; TASKS records RULES v1.16.0; the text scan of the skill folder no longer exempts templates/rules.md.

### [T-44F02] Specifications of the impact table amended

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** each specification of the step-3 rows of the impact table carries a `Document History` row and a matching `INDEX.md` version; the link inventory replaces groups 2 and 3 in `l2-agent-surface.md`; `l2-workflow-wrappers.md` and `l2-skill-wrappers.md` describe the router contract and the surface generator; `l1-engine-core.md` and `l1-sdd-reference-containment.md` restate the release kernel and the exemption for the skill folder; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** T-44S01.
- **Notes:** written as what exists after T-44G01, so it is the last text task before the removal's own bookkeeping; each amendment follows the specification workflow (Post-Update Review, header parity, registry in the same pass). `l2-engine-automation.md` (executor path, hook text, manifest scope) and `l2-test-suite.md` follow the harness as built.
- **Changes:** 30 specifications swept (engine paths and command names, patch bump and history row each, history rows untouched); l2-workflow-wrappers, l2-skill-wrappers, l2-agent-surface and l2-release-pipeline rewritten at 2.0.0 (router contract, link table, whole-folder manifest); l1-engine-core 1.9.0 and l1-sdd-reference-containment 1.8.0 name the one product folder; registry 1.53.0 with 36 rows moved, header parity ok. The layout and distribution specs are amended in T-44S01.

### [T-44G01] Remove the old tree

- **Spec:** l2-skill-layout.md §5.8 step 3; §6 note 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `git status --short` lists `.magic/`, `workflows/`, `rules/`, `skills/magic-*` as deleted and nothing else outside the tasks of this phase; `.agents/rules/magic.md`, `.agents/workflows/magic.{analyze,graph,rule,run,spec,status,task}.md` and the `.agents/skills/magic-{analyze,graph,rule,run,spec,status,task}` links are gone while the maintenance workflows and skills remain; the harness still passes; `dir .claude\\commands` resolves.
- **Handoff:** T-44G02.
- **Notes:** entry criterion: T-44D03 Done, T-44C01 Done (the projections exist before the files they replace are removed), and no unmarked file of the old tree is the only copy of anything (`git diff --stat` of the Phase 43 copy against its source is empty). Removal is by specific paths; `git rm -r --cached` on a path reached through a junction is forbidden (repository guide §6), so the index is cleaned by explicit file lists and the folders deleted with a plain delete. After this task the `/magic.*` commands of the old surface no longer exist in this repository: scripts are run from `skills/magicspec/scripts/executor.js` directly until the projections are loaded by a new session.
- **Changes:** Removed after the harness passed on the new tree with the old one still present, and a backup was taken: .magic/, workflows/, rules/, skills/magic-* (seven generated wrappers), the seven .agents/skills/magic-* links (removed as links), the .agents/workflows/magic.{analyze,graph,rule,run,spec,status,task}.md and .agents/rules/magic.md twins; the maintenance workflows and skills stay; the .claude, .codex and .qwen links to .agents are intact; .gitignore drops the lines of the old tree. No file of the old tree was missing from the new one (74 mapped). Harness 227 of 227 afterwards.

### [T-44G02] C14 on the new tree: version, manifest, snapshot

- **Spec:** l2-skill-layout.md §5.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js update-engine-meta` bumps `skills/magicspec/.version`, regenerates `.checksums` (every file of the folder, none outside) and the `**Engine Version:**` snapshot in `.design/INDEX.md`; a second run reports no change; `update-engine-meta --check` from the root, from a subdirectory and through `.agents/skills/magicspec` reports no drift.
- **Handoff:** T-44T01.
- **Notes:** this is the first C14 of the new tree and the only version event of the phase's engine edits (earlier edits to the skill folder were made while the manifest was not yet authoritative). The executor path is typed by hand: the old command entries are gone.
- **Changes:** First C14 of the new tree: 2.1.147 -> 2.1.148, 79 files in the manifest, Engine Version snapshot 2.1.148; a second run and --check report no change from the root, from skills/magicspec/scripts and through .agents/skills/magicspec; STATE constraints: C-002 (two trees) closed, C-001 rewritten for the AGENTS family only.

### [T-44T01] Validation: closing run and residue search

- **Goal:** the repository runs on one engine and nothing names the other.
- **Method:** the full harness; the mutation lists; `node dev/scripts/validate-hardlinks.js`; `fsutil hardlink list AGENTS.md`; the integrity check of the new tree; a residue search over the whole repository for `\.magic/` and `workflows/magic\.` outside CHANGELOG history, the archived workbooks, the specifications' history rows and `.drafts/`; `finalize` and `export-wiki` run from the new location.
- **Status:** Done
- **Changes:** Harness 227 of 227 with the old tree gone; mutation lists: 86 + 4 + 6 + 1 entries CAUGHT (three survivors and three refusals found on the way, each closed by a better case or a retargeted path); validate-hardlinks passes (AGENTS family, link table); the integrity check of the new tree is quiet from the root, a subdirectory and through the link; a residue search over the repository finds the earlier names only in the CHANGELOG, archived workbooks, specification history rows and the drafts. An installed shape in a throwaway project (copy under .agents/skills, init --host=claude,codex, check-prerequisites ok, remove --dry-run) works.

### [T-44T02] Validation: cognitive simulation of the new text

- **Goal:** an agent that reads only the new folder, as a host would load it, can run the pipeline end to end.
- **Method:** the maintenance simulation workflow (`magic.dev.simulate`, retargeted by T-44C01) walks `spec` → `task` → `run` on a throwaway project with the skill installed under `.agents/skills/magicspec`: the router is read first, every body is followed from the router's table, every named script exists and prints a path that runs, and no step needs a file outside the folder or the project. Findings are fixed in the skill and the walk repeated.
- **Status:** Done
- **Changes:** Done as a literal walk, not as the fresh-reader run: every executor subcommand a text names has its script, every skill-relative path a body names exists, the router rows and the bodies in workflows/ are the same set, the rule source carries its marker, every role card of the constitution table exists; the throwaway installed run above exercised init, the pre-flight, context generation, the integrity check and a dry removal from the installed folder. Not done: the fresh literal reader of the maintenance simulation (it asks for a new chat session so no context bleeds in); it is the first thing to run in the next session, with /magic.dev.simulate test.

### [T-44S01] Spec sync: the decisions taken in this phase

- **Spec:** l2-skill-layout.md; l2-skill-distribution.md; l2-test-suite.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the specifications describe the engine as it exists after T-44G02 (the colon command form, `refreshProjections`, the link table, the projected hosts of this repository); `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** Phase 45.
- **Notes:** record only what execution decided and the specifications do not yet say.
- **Changes:** l2-skill-layout.md and l2-skill-distribution.md 1.4.0 (the colon command form, workflow identifiers kept as data, the path helper, refreshProjections, the projected hosts), l2-engine-automation.md 1.24.0 (the update flow refreshes projections), l2-test-suite.md 1.34.0 (link table, projection refresh, router and maintenance-skill frontmatter); registry 1.54.0, header parity ok.
