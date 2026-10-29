---
phase: 43
name: "Skill Folder Built Beside the Old Engine (Single-Skill Step 3, Part 1)"
status: Done
subsystem: "skills/magicspec (new), dev/scripts, dev/tests"
requires:
  - "The skill folder, the map from the present layout, the manifest scope, the developer signal and the link inventory (l2-skill-layout 1.2.0 §5.1, §5.2, §5.4-§5.6); the verified host table, the rule projection, the command surfaces, installation and removal (l2-skill-distribution 1.2.0 §5.1-§5.4); SP-1 to SP-7 and SP-9 (l1-skill-packaging 1.0.0): Stable at registry 1.50.0"
  - "Phase 41: the project root, the engine folder and the state folder name each defined once in utils.js (engineRoot, resolveProjectRoot, STATE_DIR_NAME), so a script in the new folder finds its own resources and the project without counting levels"
  - "The mutation-control driver and the script harness (l2-test-suite 1.32.0)"
provides:
  - "skills/magicspec/: the engine in its new shape beside the old one (scripts, templates, roles, references, the seven workflows with their entry sections folded in, the router SKILL.md, AGENT-RULES.md, one manifest and the version at the root), with every engine path and printed path resolved from the folder itself"
  - "Host projections: lib/hosts.js (the verified host table), init --host (rule copy, command entries, AGENTS.md pointer block, skill link, markers, staleness warning), remove, and the optional build-plugin"
  - "The developer-repository predicate in one place; the hook written with the engine folder as named at install and probing the folder; the manifest builder taking --dir"
  - "Harness 216 -> 226 under both script sets; 31 mutation entries, all caught; engine 2.1.146 (the old tree needed no C14 bump)"
key_files:
  created:
    - "skills/magicspec/"
    - "skills/magicspec/scripts/lib/hosts.js"
    - "skills/magicspec/scripts/remove.js"
    - "skills/magicspec/scripts/build-plugin.js"
  modified:
    - "dev/scripts/generate-checksums.js"
    - "dev/tests/engine.js"
    - ".gitignore"
patterns_established:
  - "A copied tree is proved by running the existing harness against it, with fixtures laid out as the old tree, so that printed paths must match byte for byte"
  - "A name the host reads from frontmatter is parsed by the host: a plain description with a colon followed by a space is not valid, so the router has a case that parses it with the generator's own checker"
  - "A rule that ignores a folder by a broad glob (*references/) hides a new folder of the same name from git and from the manifest; count the manifest's files against the folder's"
  - "A fixture that links a folder must skip links when it lists files, or a junction is read as a file"
duration_minutes: 240
---

# Stage 43 Tasks — Skill Folder Built Beside the Old Engine (Single-Skill Step 3, Part 1)

**Phase:** 43
**Status:** Done
**Strategic Goal:** Build `skills/magicspec/` as a complete, working copy of the engine in its new shape **beside** `.magic/`, and prove it, without switching anything over ([l2-skill-layout.md](../specifications/l2-skill-layout.md) §5.8 step 3, first half). The old tree stays the live engine for the whole phase, so the repository keeps building itself (SP-9); the next phase moves the repository, the harness pins and the command names onto the new tree and removes the old one. Paths are converted here; the dotted command names (`/magic.task`) and the harness pins on them are converted there.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-43A01] Copy the engine into `skills/magicspec/` byte for byte and freeze the old tree
- [x] [T-43A02] Scripts of the new tree: engine paths from `engineRoot()`, printed paths from one helper
- [x] [T-43A03] Router `SKILL.md`: frontmatter, command grammar, command table, notation rule
- [x] [T-43A04] Pipeline workflows `spec`, `task`, `run`: wrapper entry folded in, paths skill-relative
- [x] [T-43A05] Audit workflows `analyze`, `rule`, `status`, `graph`: the same
- [x] [T-43A06] References, role cards and templates: paths skill-relative
- [x] [T-43A07] `AGENT-RULES.md` from `rules/magic.md`
- [x] [T-43B01] Manifest and version at the skill root; the builder and `--check` work on the new tree
- [x] [T-43B02] The developer-repository predicate in one place
- [x] [T-43B03] Hook: the executor location is written at install; the disarm test follows
- [x] [T-43C01] Host data and `init --host`: rule projection, command entries, markers, staleness
- [x] [T-43C02] `remove`: exactly the marked projections and the folder
- [x] [T-43C03] Plugin generator (optional channel)
- [x] [T-43T01] Harness against the new scripts: a full run, every divergence resolved
- [x] [T-43T02] Validation: installed-shape, router, text-scan, projection, predicate, manifest and hook cases
- [x] [T-43T03] Validation: mutation controls
- [x] [T-43T04] Validation: closing run, hardlinks and the integrity check of the new tree
- [x] [T-43S01] Spec sync: the decisions taken in this phase

## Detailed Tracking

<!-- Optional entry field, created by /magic.run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-43A01] Copy the engine into `skills/magicspec/` byte for byte and freeze the old tree

- **Spec:** l2-skill-layout.md §5.1, §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a comparison that hashes every mapped source and its destination reports no difference and no missing file: `.magic/scripts/**` to `scripts/**`, `.magic/templates/**` to `templates/**`, `.magic/roles/**` to `roles/**`, `.magic/{analyze,rule,run,spec,status,task}.md` to `workflows/`, `workflows/magic.graph.md` to `workflows/graph.md`, `.magic/{context,init,retrospective}.md` to `references/`, `.magic/.version` to `.version`; `git status --short .magic workflows rules` prints nothing.
- **Handoff:** every other task of the phase works on the copy; none starts before this one is Done.
- **Notes:** a copy, not a move: the old tree is the live engine until the next phase. Do not copy `.checksums` (T-43B01 generates it) or the wrapper files `workflows/magic.*.md` other than `magic.graph.md` (their entry sections are folded in by T-43A04 and T-43A05 from the originals). Record the freeze as a Blocking Constraint with `update-state --constraint-title ... --constraint-desc ...`: while the two trees coexist, no engine edit goes to `.magic/` except the files C14 itself rewrites; an edit made there is lost at the switch.
- **Changes:** skills/magicspec/ holds 75 files, each equal by hash to its source (scripts with lib/, templates, roles, the seven bodies in workflows/, three modules in references/, .version); the old tree was not touched. Blocking Constraint C-002 records the freeze. Found: .gitignore ignored every folder named *references/, which would have kept the skill's references/ out of git and out of the manifest; the rule is now the repository's own /.references/ only.

### [T-43A02] Scripts of the new tree: engine paths from `engineRoot()`, printed paths from one helper

- **Spec:** l2-skill-layout.md §5.3, §5.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rn "\.magic" skills/magicspec/scripts` prints nothing; the executor of the new tree run from the repository root reports the same artifacts as the old one (`check-prerequisites --json`, ignoring integrity findings, which T-43B01 settles); in a fixture laid out as the old tree, every printed `node … executor.js` hint is byte-identical to the old scripts' (T-43T01 runs the whole harness to prove it).
- **Handoff:** T-43B01, T-43B03, T-43C01, T-43T01.
- **Notes:** about 70 references in code. Engine resources (roles, templates, the manifest, `.version`, the workflow bodies `check-prerequisites` scans) come from `engineRoot()` and the new names (`roles/`, `templates/`, `workflows/`, `references/`). Every printed command path comes from one helper in `utils.js` that returns the executor's path relative to the project root, so the same code prints `.magic/scripts/executor.js` in an old-shaped fixture and `skills/magicspec/scripts/executor.js` in this repository. Command names (`/magic.task`) and the rule file name (`rules/magic.md`) in messages stay as they are: the next phase renames them together with the harness pins. The hook text and the `../../dev` fallbacks are T-43B03 and T-43B02.
- **Changes:** Every engine path in the new scripts comes from engineRoot(); every printed path from engineRel()/executorHint() (utils.js), and the executor exports the path it was started through (MAGIC_ENGINE_DIR) so a link keeps its name. check-prerequisites scans workflows/, references/ and templates/ and still reads the earlier flat shape; generate-context, extract-rationale and the messages follow. Command names and the rule file name in messages are unchanged on purpose.

### [T-43A03] Router `SKILL.md`: frontmatter, command grammar, command table, notation rule

- **Spec:** l2-skill-layout.md §5.1, §5.2; l2-skill-distribution.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the frontmatter `name` is `magicspec`, the `description` is at most 1,024 characters, third person, holds a `Use when` sentence and names all seven commands; the command table lists exactly the files in `workflows/` (T-43T02 pins both).
- **Handoff:** T-43T02.
- **Notes:** the router is authored once. It states the grammar `magicspec <command> [args]` (and `magicspec:<command>` typed as text), one selection line per command, that every path in the skill is relative to the folder holding this file, and that scripts are run as `node <that folder>/scripts/executor.js`. Per-command `handoffs` that wrappers carried in frontmatter become the last lines of each workflow (T-43A04, T-43A05). The router describes the final grammar even though the bodies still use dotted names until the next phase; say so in one line of the router's own notes for the maintainer, not for the user.
- **Changes:** SKILL.md: name magicspec, a description under 1,024 characters that names all seven commands, the grammar, the command table (the one list every surface reads), the dispatch steps, the notation rule and the pointer to AGENT-RULES.md. Found by the new case: a colon followed by a space inside the plain description makes the frontmatter unparseable; the first draft had one.

### [T-43A04] Pipeline workflows `spec`, `task`, `run`: wrapper entry folded in, paths skill-relative

- **Spec:** l2-skill-layout.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -nE "\.magic/|rules/magic\.md|workflows/magic\." skills/magicspec/workflows/{spec,task,run}.md skills/magicspec/references/context.md` prints nothing; each body keeps a contents list naming every `##` heading (the body navigation contract); each body ends with its handoff lines.
- **Handoff:** T-43T02.
- **Notes:** the wrapper's entry section (triggers, arguments, scope, hints) becomes the head of the body; the wrapper's `Full implementation` pointer and the `Executor` line disappear into the router. `.magic/x.md` becomes `references/x.md` or `workflows/x.md`; `node .magic/scripts/executor.js` becomes `node scripts/executor.js`; `rules/magic.md §N` becomes `AGENT-RULES.md §N`. The dotted command names stay. These three bodies are the most-read text of the engine: take the originals from `.magic/` and the wrappers, not from memory.
- **Changes:** workflows/spec.md, task.md, run.md: the wrapper entry section folded in as ## Entry (triggers, arguments, scope, hints), handoffs as a closing ## Handoffs section, both added to the contents list; paths skill-relative; the lines that pointed at the generated wrappers removed or restated.

### [T-43A05] Audit workflows `analyze`, `rule`, `status`, `graph`: the same

- **Spec:** l2-skill-layout.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the same grep over `workflows/{analyze,rule,status,graph}.md` prints nothing; `graph.md` names `.design/graph/…` paths already (Phase 42) and no wrapper pointer; each body keeps its contents list.
- **Handoff:** T-43T02.
- **Notes:** `graph` has no body today: its wrapper is the whole text, so only the notation changes. `analyze.md` is the largest body (about 420 lines) and holds the containment and wiki checks that name paths.
- **Changes:** workflows/analyze.md, rule.md, status.md, graph.md: the same. The wrapper-parity checks of analyze are restated for the router (ROUTER_DRIFT, PHANTOM_COMMAND against the command table); the link-integrity and containment scopes name the skill folder.

### [T-43A06] References, role cards and templates: paths skill-relative

- **Spec:** l2-skill-layout.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `grep -rnE "\.magic/|rules/magic\.md" skills/magicspec/references skills/magicspec/roles skills/magicspec/templates` prints only the lines of `templates/rules.md` that mirror the constitution (listed in `Notes`); the role registry check of the new tree reports 14 cards, none dangling.
- **Handoff:** T-43T02.
- **Notes:** `templates/rules.md` is the shipped mirror of the live constitution (conventions C1, C7, C14 and others name `.magic/`); the live constitution is amended in the next phase, and the template follows it word for word, so those lines are left and listed in this entry's `Changes`. Role cards cite `.magic/roles/`: skill-relative `roles/`.
- **Changes:** references/, roles/ and templates/ converted; templates/rules.md keeps its lines that name the earlier folder (they mirror the live constitution word for word and follow it when it is amended); templates/retrospective.md names an engine file, not a folder.

### [T-43A07] `AGENT-RULES.md` from `rules/magic.md`

- **Spec:** l2-skill-distribution.md §5.1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/AGENT-RULES.md` has the sections §1 to §10 of the source in the same order and at most as many lines (`wc -l`); `grep -n "\.magic/" skills/magicspec/AGENT-RULES.md` prints nothing; the consumer guard names the skill folder and its projections instead of the four folders.
- **Handoff:** T-43C01 (the projection is a byte copy of this file).
- **Notes:** the file is always loaded in every host, so it must not grow. Engine resources are named relative to the skill; the cold-context step says to load the skill first and run the resume check from its folder, and that a step which cannot resolve the executor fails open and says nothing. The read-only contract for engine directories is kept for consumers (C28 §5): do not weaken it. Do not touch `rules/magic.md` (the live copy, hardlinked to `.agents/rules/magic.md`).
- **Changes:** AGENT-RULES.md: 499 lines like the source; paths relative to the skill folder, the consumer guard naming the skill folder, the resume check from references/context.md; the first line carries the marker the projections are recognized by.

### [T-43B01] Manifest and version at the skill root; the builder and `--check` work on the new tree

- **Spec:** l2-skill-layout.md §5.4
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node dev/scripts/generate-checksums.js --dir skills/magicspec` writes `skills/magicspec/.checksums` listing every file of the folder except itself and the volatile set (`.version`); the new tree's `update-engine-meta --check` reports no change; editing any file of the new tree (a workflow, a role, a template, a script) makes it report one.
- **Handoff:** T-43B02, T-43T02.
- **Notes:** the builder takes the folder from `--dir` (default `.magic` until the switch). The manifest now covers workflows, roles, templates, scripts and the rule source, which closes the release-version gap of the older layout. `.fallow`-style stray folders inside the skill folder stay excluded as before. The old tree's `.checksums` is not touched.
- **Changes:** The manifest lives at the skill root and covers 79 files (every file but itself and .version); the builder takes --dir; the folder's own --check passes untouched and names any edited file of any directory.

### [T-43B02] The developer-repository predicate in one place

- **Spec:** l2-skill-layout.md §5.5
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the predicate is true when the skill folder's real path is `<root>/skills/magicspec` and the manifest builder exists at the one location the helper names, and false in each other combination (a fixture with the builder but a different folder path, a fixture at `.agents/skills/magicspec` with a root `scripts/` folder of the project's own); the maintenance fallbacks of `update-engine-meta` (`sync-skills`, `generate-checksums`, the snapshot sync) are found through the same helper.
- **Handoff:** T-43T02.
- **Notes:** until the maintenance-layout phase the builder is at `dev/scripts/`; that location is one constant, so that phase changes one line. The probe is a presence check, never a `require` (the graceful-fallback rule of the layer boundary). The old tree keeps its own probe untouched.
- **Changes:** hasEngineWriteTooling needs both halves (the engine in its place, the builder in the maintenance folder, whose location is one constant); maintenanceScript() replaces the three ../../dev paths of update-engine-meta. The earlier folder name is accepted as the place during the transition.

### [T-43B03] Hook: the executor location is written at install; the disarm test follows

- **Spec:** l2-skill-layout.md §5.4; l2-skill-distribution.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** installing from the new tree in a fixture writes a hook whose executor path is the one of that fixture's skill folder; with the executor absent the hook prints its one line and lets the commit through; the marker, the saved copy of a changed body and the foreign-hook cases of the earlier installer still hold (T-43T01 runs them against the new script).
- **Handoff:** T-43C01.
- **Notes:** highest blast radius of the phase: the file this writes runs on every commit of every consumer. The location is relative to the project root and written at install, so a moved skill disarms the hook with the truthful one-line statement instead of failing the commit. The disarm test probes the executor path with the runtime (only ENOENT counts as absent), as the earlier hook does for `.magic`.
- **Changes:** The hook is written with the engine folder as named by the helper, quoted for sh where needed, and probes the folder: a removed folder disarms with one line, a folder with files missing still blocks (the earlier contract, which a harness case pins). A shared folder outside the project is named by its absolute path.

### [T-43C01] Host data and `init --host`: rule projection, command entries, markers, staleness

- **Spec:** l2-skill-distribution.md §5.1, §5.2, §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `init --host=claude,qwen,codex` in a fixture writes `.claude/rules/magicspec.md` and `.qwen/rules/magicspec.md` as byte copies of `AGENT-RULES.md`, a managed block with one pointer line in `AGENTS.md` for Codex, `.claude/commands/magicspec/<cmd>.md` and `.qwen/commands/magicspec/<cmd>.md` for the seven commands, and no command entry for Codex; every file carries the generated-by marker; a second run changes nothing; an unknown host name stops before writing anything and lists the known names; a projection that differs from its source is reported as stale.
- **Handoff:** T-43C02, T-43C03, T-43T02.
- **Notes:** the host table is data in one library file (`lib/hosts.js`), read again against the documentation at the start of this task (it changes). A file at a projection path that carries no marker is foreign: it is left untouched and reported, as the hook installer does. The AGENTS.md block is delimited by begin and end markers and `init` replaces only its content. Claude Code needs its skill folder at `.claude/skills/magicspec`: `init` creates a directory link or, where a link cannot be created, reports the one-line copy command; it never overwrites a folder that is not its own link (junction safety, CLAUDE.md §6). Entries are 2-3 lines pointing at the router with the command.
- **Changes:** lib/hosts.js holds the verified host table, the router reader, the rule and command projections, the pointer block, the skill link, findProjections and removeProjections; init --host writes them (an unknown host or an unreadable source stops before any write); a file without a marker is left alone; a second run changes nothing; check-prerequisites warns PROJECTION_STALE for a copy that differs from its source.

### [T-43C02] `remove`: exactly the marked projections and the folder

- **Spec:** l2-skill-distribution.md §5.3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** after `init --host=…` then `remove` in a fixture, every file that carried the marker is gone, the AGENTS.md block is gone while the rest of the file is byte-identical, the hook is restored to its prior content where one was saved, a foreign file at a projection path is untouched, and the state folder is untouched.
- **Handoff:** T-43T02.
- **Notes:** `remove` reads no record; it finds projections by their marker (SP-6). It deletes the skill folder last. Destructive: it prints what it will remove and removes only that.
- **Changes:** scripts/remove.js (executor subcommand remove, --dry-run): marked projections, links as links, the pointer block alone, the hook when marked; the engine folder last, kept inside the engine's own repository and outside the project; the state folder and unmarked files untouched.

### [T-43C03] Plugin generator (optional channel)

- **Spec:** l2-skill-distribution.md §5.2 (S3)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** the generator writes `.claude-plugin/plugin.json` with name `magicspec` and the skill's version, plus one skill per command whose text points at the router; a version mismatch between the manifest and `.version` fails the harness case of T-43T02.
- **Handoff:** T-43T02.
- **Notes:** the owner asked for this channel and keeps it in the plan. The verified documentation shows that S2 already gives the same `/magicspec:<command>` names, so the plugin adds marketplace distribution and updates, not new names; it is the last task of its track and ships behind its own flag in the archive. It writes files only under the plugin folder named by its argument.
- **Changes:** scripts/build-plugin.js (build-plugin --out <dir>): plugin.json with the engine version, the engine folder copied in as the magicspec skill, one command skill each with disable-model-invocation, a marker file; refuses a folder that is not its own. Kept in the plan at the owner's request.

### [T-43T01] Harness against the new scripts: a full run, every divergence resolved

- **Goal:** the new scripts behave exactly as the old ones wherever the harness looks.
- **Method:** add one override to `dev/tests/engine.js` (`MAGIC_SCRIPTS_DIR`, default `.magic/scripts`) and run `node --test dev/tests/engine.js` with it set to `skills/magicspec/scripts`; the harness copies scripts into fixtures laid out as the old tree, so the printed hints must match byte for byte. Each failing case is classified: a defect of the new scripts (fixed in T-43A02, T-43B01 to T-43B03, T-43C01), or a case that reads the old tree's text (unaffected, it reads the repository). Both runs, default and override, end at the same pass count.
- **Status:** Done
- **Changes:** dev/tests/engine.js reads its scripts from MAGIC_SCRIPTS_DIR (default .magic/scripts). The first run against the new scripts failed 6 of 216; each was a harness assumption, not a defect: wrapper validation met the router in skills/, the hook cases ran the repository's installer over throwaway repositories (they now name the engine as the executor would), the graph scan derived the repository from the scripts' folder, and one case pinned that a partly deleted engine still blocks, which made the hook probe the folder again. Both runs end at the same count.

### [T-43T02] Validation: installed-shape, router, text-scan, projection, predicate, manifest and hook cases

- **Goal:** the properties of the new tree that the old harness cannot see.
- **Method:** cases in `dev/tests/engine.js` that (a) install the new tree as a consumer would (`.agents/skills/magicspec`, and `.claude/skills/magicspec` as a directory link) and run the executor from a nested directory and through the link; (b) check the router: frontmatter limits and Selection Signal rules (reusing the generator's validator), the seven commands named, the table equal to the folder listing; (c) scan the new tree's text for `.magic/`, `rules/magic.md` and `workflows/magic.` (none), for `[x](path)` links that do not resolve inside the folder, and for contents lists that miss a heading; (d) run `init --host`/`remove` for each host (marker, byte copy, idempotence, unknown host, foreign file, staleness both ways); (e) the predicate in each direction; (f) the manifest covering the whole folder and any edit being a version event; (g) the hook with the executor present and absent; (h) the plugin version equality.
- **Status:** Done
- **Changes:** Ten cases (the router, the text scan, installed shapes and a link, init --host, foreign files and staleness for rule and command entries, remove, the predicate in each direction, the manifest over the whole folder, the hook, the plugin build).

### [T-43T03] Validation: mutation controls

- **Goal:** every case of T-43T02 fails without the line it guards.
- **Method:** a mutation list (`node dev/scripts/mutation-check.js`) over the helper that names the executor path, the host table, the marker, the unknown-host guard, the foreign-file guard, the predicate halves, the manifest scope, the hook's disarm test, the router limits and the text scans; every entry CAUGHT, a survivor closed by strengthening the fixture, not by dropping the entry.
- **Status:** Done
- **Changes:** 31 mutation entries over the engine-path helpers, the predicate halves, the manifest, the host table, the markers, staleness, removal, the hook probe and text, the plugin and the router and text scans; all caught. One survived at first (the hook probe's doubt rule is not reachable in a fixture on Windows) and is pinned on the generated hook text instead.

### [T-43T04] Validation: closing run, hardlinks and the integrity check of the new tree

- **Goal:** the phase ends with both trees working and the repository unchanged where it must be.
- **Method:** the full harness twice (default scripts and `MAGIC_SCRIPTS_DIR` override), the mutation list, `node dev/scripts/validate-hardlinks.js`, `node .magic/scripts/executor.js update-engine-meta --check` (the old tree: no change except what C14 itself wrote) and the new tree's own `--check`; `git status` shows no change under `.magic/`, `workflows/`, `rules/` and `skills/magic-*` other than the C14 files. No C14 bump is owed for the new tree until the switch.
- **Status:** Done
- **Changes:** Harness 216 -> 226, passing under both script sets (default and MAGIC_SCRIPTS_DIR=skills/magicspec/scripts); the old tree's --check and the new tree's --check report no change; hardlinks validate; no engine file of the old tree changed in this phase.

### [T-43S01] Spec sync: the decisions taken in this phase

- **Spec:** l2-skill-layout.md §5.9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `/magic.spec amend` leaves the touched specifications with a `Document History` row and a matching `INDEX.md` version; `check-prerequisites --verify-headers` reports `ok: true`.
- **Handoff:** Phase 44.
- **Notes:** record only what execution decided and the specifications do not yet say (the printed-path helper, the host data file, the `--dir` argument of the builder, the pointer-line form for Codex as built, the plugin outcome). The large amendments of the step (agent surface, wrappers, release kernel, containment exemption, the constitution) belong to the next phase, which makes them true.
- **Changes:** l2-skill-layout.md 1.3.0 and l2-skill-distribution.md 1.3.0: the helper pair and the link's name, the hook probing the folder, the builder's --dir, the predicate during the transition, PROJECTION_STALE, remove and the plugin build as built.
