---
phase: 48
name: "Independent Hardening: Routing in Every Command, Cache Retention, Community Health Files"
status: Todo
subsystem: "skills/magicspec (context.md, workflows, scripts, commands table), scripts (sync-docs, release checks), tests, docs, SECURITY.md, CONTRIBUTING.md, .github"
requires:
  - "Phase 47: the one command form; new text is written as /magicspec <command>; harness 277"
  - "Routing for every command, cache retention and community health files: l1-workspace-intent-routing 3.0.1 (WI-11 to WI-14, G1 to G4), l2-engine-automation 1.27.0 (Cache Retention), l1-community-health-files 1.0.1 (HF-1 to HF-9): Stable at registry 1.62.1"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 48 Tasks — Independent Hardening: Routing in Every Command, Cache Retention, Community Health Files

**Phase:** 48
**Status:** Todo
**Strategic Goal:** Every command that acts on one workspace chooses it by one shared chain computed by the engine — explicit argument, environment, the paths the work touches against each scope, the topic, work in flight, the default — narrates the choice once in a multi-workspace project, and writes only into registered folders ([l1-workspace-intent-routing.md](../specifications/l1-workspace-intent-routing.md) WI-11 to WI-14); every cache the engine writes has an owner that prunes it and one simple command removes the rebuildable ones ([l2-engine-automation.md](../specifications/l2-engine-automation.md) §Cache Retention); and the repository's security policy, contribution guide, issue forms and maintainer instruction meet the hosting platform's rules and stay current ([l1-community-health-files.md](../specifications/l1-community-health-files.md) HF-1 to HF-9).

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-48A01] The routing chain as a script: `resolve-workspace`, the location signal computed from paths against each scope
- [x] [T-48A02] Registered folders only: the stop lists the registered workspaces and every writer applies the check
- [x] [T-48A03] Every command routes: the shared module and the bodies, narrated once
- [x] [T-48A04] Shipped examples name no workspace of this repository
- [x] [T-48B01] The graph extraction cache is pruned after each successful build
- [x] [T-48B02] Every inventoried cache has its bound, and the inventory is complete
- [x] [T-48B03] `clean-cache`: the rebuildable caches removed, findings, notes and backups never touched
- [ ] [T-48C01] The response commitments of the security policy
- [ ] [T-48C02] `SECURITY.md` by the policy contract
- [ ] [T-48C03] The contribution-guide generator keeps only its marked blocks; its template leaves the shipped folder
- [ ] [T-48C04] `CONTRIBUTING.md` by the guide contract
- [ ] [T-48C05] The issue forms and the chooser
- [ ] [T-48C06] The maintainer instruction for the hosting-service settings
- [ ] [T-48C07] The release checks the supported-versions table
- [ ] [T-48C08] The documentation audit and the `docs-specialist` trigger
- [ ] [T-48T01] Validation: harness, mutation lists, routing and cache scenarios, C14
- [ ] [T-48S01] Spec sync: as-built decisions, the simulation matrix and the registry

## Detailed Tracking

### [T-48A01] The routing chain as a script: `resolve-workspace`, the location signal computed from paths against each scope

- **Spec:** l1-workspace-intent-routing.md WI-11, WI-12, §5 G1 to G3 (topic scoring as WI-3 and WI-7); l2-engine-automation.md §Path Matching Contract
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js resolve-workspace --command {name} --text "{request}" [--paths a,b]` prints the chosen workspace, the signal that chose it and the matched paths per workspace, and writes nothing; on a three-workspace fixture new harness cases assert, in this order: an explicit `--workspace` and then `MAGIC_WORKSPACE` win over a contrary path (F1, F2); paths matching one workspace's scope choose it with signal `location` (G1); paths split between two scopes choose the one with more matches and name the other (G2); a tie falls to the topic signal, which needs a lexicon score of at least 0.30 and never creates a workspace (G3); with no signal, the one workspace whose live memory records an `In Progress` task wins, else `default`, else the workspace with the highest scope coverage, then registry order; the same input run twice prints identical output; the command table lists the command and `--help` prints its usage; `node --test tests/engine.js` passes; `update-engine-meta` has run.
- **Handoff:** T-48A03.
- **Notes:** matching reuses `utils.compilePathEntry` and `compilePathSet` (one matcher); "most specific" is the longest matching prefix or pattern, so `src/api/` beats `src/`. Paths are extracted from the prose by shape (a `/` or a file extension) plus the explicit `--paths`. The creation signal (WI-2, WI-4, WI-6) stays in `spec` and is not part of this script. L1 script, read-only; reached from the bodies named by A03, so no `require` crosses into the maintenance folders.
- **Changes:** `resolve-workspace` (script, command-table entry, `lib/workspace-routing.js`) computes the chain argument → environment → sole workspace → location → topic → work in flight → default → coverage; writes nothing; the narration line is computed by the script. As-built decisions for T-48S01: (1) the executor hands the child `MAGIC_WORKSPACE_SOURCE` (`argument`, `environment`, `default`), because it strips `--workspace` and forwards only the folder, so a script cannot otherwise tell a typed name from the default; (2) "work in flight" moved into `lib/in-flight.js` and `resume-state` reads it from there, so the two scripts share one predicate; (3) a path belongs to the workspace with the most specific matching entry (literal folder depth, then literal over pattern, then length), a path two workspaces match equally counts for both, and a tie of totals falls through; (4) the topic signal scores the words of the request with the path-shaped words removed, against the lexicon of WI-3 (description, scope segments, specification names without layer prefix, top-level headings; not the workspace name), counting a word as held on equality, on a four-letter prefix or on a five-letter shared stem; the score is held words over request words to two decimals, at least 0.30 and strictly above every other workspace; (5) the coverage step counts files of the whole project (the executor runs scripts from the project root, so the caller's current directory is not known), up to 20000 files in name order, four decimals; (6) a registry entry that is not an object registers nothing; (7) `unknownWorkspaceMessage` added to `utils.js` as the one sentence for an unregistered name, for T-48A02 to reuse. Evidence: 10 new harness cases, 15 of 15 mutations CAUGHT (`scripts/mutation-check.js`), `node --test tests/engine.js` 294/294, `update-engine-meta` run (3.0.22), `validate-hardlinks.js` clean.

### [T-48A02] Registered folders only: the stop lists the registered workspaces and every writer applies the check

- **Spec:** l1-workspace-intent-routing.md WI-14, WI-9, §5 G4; l2-engine-automation.md §Command Line Contract
- **Status:** Done
- **Assignment:** Agent
- **Verify:** an unregistered name in `--workspace`, in `MAGIC_WORKSPACE` and in `MAGIC_DESIGN_DIR` stops with exit 1 and a message that names the name and lists the registered workspaces; a table-driven harness case runs every script that writes a per-workspace file (the list comes from a grep over the writers of `MAGIC_DESIGN_DIR`, recorded in this entry's `Notes`) once against a registered and once against an unregistered folder — the first writes, the second leaves the directory listing identical; `create-workspace` and `init` are the only scripts that create a workspace folder; the new cases fail under `scripts/mutation-check.js`; `update-engine-meta` has run.
- **Handoff:** T-48A03.
- **Notes:** most scripts take the folder from the executor, which is the choke point (it already stops on an unknown name, without the list); the audit is for scripts started directly with `MAGIC_DESIGN_DIR` set by hand, as the harness and hooks do. The shared check belongs in `utils.js`. Sibling-site rule: grep the guard's phrase over `skills/magicspec/` before calling the task done.
- **Changes:** one check, `utils.unregisteredWorkspaceMessage(folder)`, with `registeredWorkspaceNames(registry)` and `unknownWorkspaceMessage(name, registered)` beside it: a folder whose registry lies beside it and does not hold it is refused with `Unknown workspace '{x}'. Available: [{list}].`; the state folder itself, a folder with no registry beside it and a registry without a `workspaces` object are not judged. The executor now stops on an unregistered `--workspace`, `MAGIC_WORKSPACE` or registry default with that sentence (it said `Unknown workspace name '{x}'. Fix and retry.` and listed nothing; the shipped `context.md` already promised the list). Audit of the writers, from `grep MAGIC_DESIGN_DIR` and from every `writeFile`/`mkdir`/`rename` call over `skills/magicspec/scripts/`: writers into a workspace folder that now make the check — `update-state.js` (before its lock file, in `updateState` and in the command), `finalize.js` (after the folder is resolved, before any write), `archive-phases.js`, `generate-context.js`; creators — `create-workspace.js`, `init.js`, and the executor's provisioning of a registered folder that is missing; readers that write only at the state folder's level — `check-prerequisites`, `check-bloat`, `analyze-coverage`, `extract-rationale`, `resume-state`, `resolve-workspace`, `lib/diagnostics`, `build-spec-graph` and `export-wiki` (they write `graph/`, `.cache/` and an `--out` the caller names); `migrate.js` moves the whole state folder. A harness case classifies every script that mentions `MAGIC_DESIGN_DIR`, so a new reader or writer fails the suite until it is placed. Evidence: 5 new harness cases (the executor stop in three forms and for a registered-looking default; the four writers each against a registered, an absent and a present unregistered folder; the update-state command and library; what the registry cannot judge; the classification), 10 of 10 mutations CAUGHT, `node --test tests/engine.js` 299/299, `update-engine-meta` run (3.0.23).

### [T-48A03] Every command routes: the shared module and the bodies, narrated once

- **Spec:** l1-workspace-intent-routing.md WI-11, WI-13, §1.1; C26 item 1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `references/context.md` states the chain of WI-11 (explicit argument → `MAGIC_WORKSPACE` → location → topic → work in flight → `default` → Workspace Disambiguation) with `resolve-workspace` as its computation, and no longer says that only `spec` runs detection; the bodies of `task`, `run`, `rule`, `analyze` and `status` call it in their context step, and their checklists carry the narration line `[Workspace] {name} — {signal}. (Override: /magicspec {command} {other} …)`, printed once and only when more than one workspace is registered; `graph` and the all-workspace form of `status` still report every workspace; a harness case greps the bodies and finds `create-workspace` in `spec.md` only; the shipped-text cases (forks handed to the user, links and contents lists, phantom commands, one command form) pass; `update-engine-meta` has run.
- **Handoff:** T-48A04.
- **Notes:** edits `context.md`, `task.md`, `run.md`, `rule.md`, `analyze.md` and `status.md`; serialized with A04 and C08, which edit the same bodies.
- **Changes:** `references/context.md` states the chain of WI-11 (priorities 1 and 2 unchanged; priority 3 for several workspaces is the numbered list location → topic → work in flight → default → Workspace Disambiguation) with `resolve-workspace` as its computation, the narration line, and the registered-folders rule; its Step 0 no longer says that only `spec` runs detection and that `task` and `rule` skip it (Step 0 now detects creation intent only, for `spec`); Workspace Disambiguation became the script's coverage step. The bodies of `task`, `run`, `rule`, `analyze` and `status` call `resolve-workspace --command {name}` in their context invariant and carry the routing line in every checklist (three in `analyze`, one per mode); `spec` calls it at the `existing:{name}` outcome of its Step 0 and keeps the sole right to create a workspace; `graph`, `help` and `migrate` do not route. Priority numbers were kept, so the references to "Priority 3" and "Priorities 1–3" elsewhere stay true. `@role:prompt-engineer` reviewed the changed text: PASS-WITH-REWRITES (ambiguity: when `--workspace` is passed and what `{request}` is; cognitive load: five signals in one table cell) — both applied inline. Evidence: 1 new harness case (the six bodies, the three that do not route, `create-workspace` in `spec.md` only, the chain's order and the old claim gone), 7 of 7 mutations CAUGHT, `node --test tests/engine.js` 300/300 including the shipped-text cases, `update-engine-meta` run (3.0.25), `--check` clean.

### [T-48A04] Shipped examples name no workspace of this repository

- **Spec:** l1-workspace-intent-routing.md WI-14 (last sentence), §1.1 item 3
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a residue search for this repository's workspace name used as an example (`/magicspec <command> engine`, `--workspace=engine`, `--workspace engine`, `.magicspec/engine/`) over `skills/magicspec/`, `docs/`, `README.md`, `CONTRIBUTING.md` and the templates finds only the prose listed in `Notes` before the pass, where the word is not a workspace; the examples read `{workspace}`; a harness case holds the residue at zero and plants the pattern to prove its detector fires; `node --test tests/engine.js` passes; `update-engine-meta` has run.
- **Handoff:** T-48T01.
- **Notes:** one scripted pass with literal replacement (`split`/`join`, never a replacement string with `$` sequences); exemptions listed first. Code that interpolates the real workspace name into a message is data, not an example. Exemptions, listed before the pass: the workspace table of `CONTRIBUTING.md` (this repository's own contributor guide lists its real workspaces: data, a row beginning `| engine |`); prose that says "engine" for the product (the engine folder, `update-engine-meta`) is not the workspace and matches no shape. Residue before the pass: 33 lines in 13 files — the examples of `README.md` (the layout note and four command lines), `docs/` (`analyze`, `README`, `run`, `status`, `task`), the Argument Routing tables, example lists and disambiguation notes of `task`, `run`, `analyze` and `status`, one sample report line in `analyze`, the BAD example of the containment rule, a design-folder comment in `extract-rationale.js` and a node-id example in `serve-spec-graph.js`; the harness detector found two more in the new `resolve-workspace.js` (JSDoc samples), fixed the same way.
- **Changes:** the 33 lines read `{workspace}` (or "one workspace" in the comment beside a command), the comment columns of the code blocks kept; the layout note of `README.md` says one `.magicspec/{workspace}/` folder per registered workspace; the two JSDoc samples of `resolve-workspace.js` use `web`. A harness case walks `skills/magicspec/`, `docs/`, `README.md` and `CONTRIBUTING.md` for the shapes the examples took (`/magicspec <command> engine`, `--workspace=engine`, `--workspace engine`, `.magicspec/engine/`, a backtick-quoted `engine` token, `"engine"`, `Ventilate engine`, `[engine, …]`, `ws:engine`) and holds the residue at zero; the same case plants twelve spellings to prove the detector fires and four lines of prose, the placeholder and the contributor table row to prove it spares them. Evidence: 4 of 4 mutations CAUGHT, `node --test tests/engine.js` 301/301, `update-engine-meta` run (3.0.26), `--check` clean.

### [T-48B01] The graph extraction cache is pruned after each successful build

- **Spec:** l2-engine-automation.md §Cache Retention (inventory row 1, rule 1)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** after `build-spec-graph` on a fixture where one Markdown file changed and one was deleted, `graph/.cache/` holds exactly one entry per current file of the scanned state folder; a build that fails before its write prunes nothing (the entry count is unchanged); two successive builds on unchanged input leave the folder byte-identical; the new cases are CAUGHT by `scripts/mutation-check.js`; on this repository the entry count before and after is recorded in `Changes` (148 entries for 98 files at the specification's measurement); `update-engine-meta` has run.
- **Handoff:** T-48B02.
- **Changes:** `graph-cache.js` records the hash of every entry the process reads or writes and gains `pruneUnused(designAbs)`, which removes the entries nobody asked for and the `*.json.tmp` leftovers of interrupted writes, spares files that are not entries, and empties the set; `build-spec-graph.js` runs the pipeline in `buildAndExport()` and its `main()` prunes only after that returned: a build that throws prunes nothing, `--no-cache` (no entry used, every entry would look stale) never prunes, and the human summary adds one line (`Extraction cache : pruned N stale files`) while `--json` and `--html` output stay untouched. The cache holds the entries of the specification files a build extracts, so "one entry per current file" is one per specification file of the registered workspaces. Measured on this repository: 226 entries before for 53 specification files (none of them matched a current file: 0 of 53 hits), 53 after the first build, and 53 after a second build that hit 53 of 53; the specification's earlier figure was 148 entries for 98 files. Evidence: 5 new harness cases (edit and delete, two unchanged builds byte for byte, a failed build and a bypassed one, debris and foreign files, the library contract), 9 of 9 mutations CAUGHT (one survivor of the first list, a write that is not recorded as in use, is caught by the library-level case added after it), `update-engine-meta` run (3.0.27), `--check` clean; the full harness runs with T-48B03.

### [T-48B02] Every inventoried cache has its bound, and the inventory is complete

- **Spec:** l2-engine-automation.md §Cache Retention (inventory, rules 1 and 3)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** a harness case holds the inventory of the specification as a table and, for each rebuildable cache (`graph/wiki/`, `graph/query.json`, `graph/graph.html`, `.cache/finalize-state.json`, `.cache/project-meta-state.json`), writes it twice with changed input and asserts that the files left equal the files the current input needs; the lock files `update-state` leaves under `.cache/` are removed after use or have a row in the inventory (the case asserts whichever is chosen); a grep of the shipped scripts for writers into `.cache/` finds no cache missing from the inventory (the grep and its result are recorded in `Notes`); a gap found is fixed in the owning script and listed in `Changes` for T-48S01.
- **Handoff:** T-48B03.
- **Notes:** the grep that finds the writers into a cache folder — `'.cache'` and `graphPaths(` over `skills/magicspec/scripts/` and `'.cache'` over `scripts/` — returns: `finalize.js` (`.cache/finalize-state.json`), `lib/diagnostics.js` (`.cache/diagnostics.jsonl`), `update-state.js` (`.cache/state-{workspace}.lock`), `graph-cache.js`, `export-wiki.js` and `build-spec-graph.js` (through `graphPaths`: `graph/.cache/`, `graph/wiki/`, `graph/query.json`, `graph/graph.html`), `utils.js` (defines `graphPaths`, writes nothing), `scripts/update-project-meta.js` (`.cache/project-meta-state.json`) and `scripts/sync-docs.js` (`.docs-state.json` in a `.cache/` at the project root, outside the state folder: moved afterwards, see Changes). The memory index of the specification's inventory has no writer in the engine today.
- **Changes:** the harness holds the inventory as a table (eight rows: the five rebuildable caches of the verify line, the lock file, the extraction cache, the diagnostics sink) and fails when a script outside it mentions a cache folder or a row's writer stops writing it. Gaps found, for T-48S01: (1) the wiki prune removed `*.md` only, so the `*.md.tmp` of an interrupted write stayed for good (no later write replaces it, and for a page that no longer exists nobody ever would): `export-wiki.js` `pruneWiki` now removes both; (2) the lock `update-state` takes under `.cache/` has no row in the inventory: it is removed after use (`lib/file-lock.js`, in `finally`) and a lock left by a killed process is taken over by age (30 s), so the row reads "removed after use", and a case asserts both; (3) the documentation sync kept its state in a `.cache/` at the project root, outside the state folder and out of reach of `clean-cache`: moved, at the maintainer's suggestion, to `.magicspec/.cache/docs-state.json` (the earlier file is read once, so no Sync Note is re-stamped, and then retired; its folder goes only when empty), with an inventory row in the harness and an entry in `clean-cache` (engine 3.0.30), 6 of 6 mutations CAUGHT — S01 adds the row to the specification and drops the root-folder remark of rule 3; (4) the memory index row names a writer that does not exist in the engine; (5) `graph/snapshot.json` and `graph/before.json` are baselines a person writes by redirecting `build-spec-graph --json`, not caches, and `clean-cache` must not touch them. Checked and needing no change: the wiki is cleared before it is regenerated, the query snapshot, the page and the finalize state are single files overwritten by the next run (the finalize state is rewritten by a run that found nothing significant as well), the project-meta state is one file (one key per workspace seen). Evidence: 5 new harness cases, 7 of 7 mutations CAUGHT (one survivor, the skipped-run state write, caught after a third finalize run was added to the case), `update-engine-meta` run (3.0.28), `--check` clean; the full harness runs with T-48B03.

### [T-48B03] `clean-cache`: the rebuildable caches removed, findings, notes and backups never touched

- **Spec:** l2-engine-automation.md §Cache Retention (rules 2 and 3)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node skills/magicspec/scripts/executor.js clean-cache --dry-run` lists each rebuildable cache path with its size and removes nothing; without `--dry-run` it removes exactly those paths (graph extraction cache, query snapshot, interactive page, wiki, finalize state, project-meta state, memory index when present) and asks nothing; fixtures prove that `.cache/diagnostics.jsonl`, the feedback notes and `magicspec-migration-backup-*/` are byte-identical afterwards and that the listing names each backup with its age and the command that deletes one by hand; a second run reports nothing to remove; a project with no state folder exits 0 with one line; the command table lists it and `--help` prints its usage; the documentation names the command; every new case is CAUGHT by `scripts/mutation-check.js`; `update-engine-meta` has run.
- **Handoff:** T-48T01.
- **Notes:** L1 script, reached from the user through the documentation; no `require` of the maintenance folders. Nothing outside the state folder is removed; the root-level `.cache/` of the maintenance tools this note once called out of scope no longer holds a cache (the documentation sync's state moved into the state folder, see T-48B02).
- **Changes:** `clean-cache` (script, command-table entry, `docs/graph.md` section) removes the seven rebuildable caches of the inventory — the extraction cache, the query snapshot, the page, the wiki, the finalize state, the project-meta state and the memory index when present — and nothing else, asks nothing, prints each path with its file count and size (`--dry-run` lists without removing; a second run says `Nothing to remove`), never follows a link (it says `is a link: left alone`), lists the migration backups with their age and the command that deletes one by hand (`Remove-Item -Recurse -Force "…"` on Windows, `rm -r "…"` elsewhere) and leaves them, and exits 0 with one line in a project with no state folder. The graph baselines a person saves (`graph/snapshot.json`, `graph/before.json`) are kept as well, and the output says so. Layer: L1, reached through the documentation; it requires only `utils` and the command table. Evidence: 4 new harness cases (the dry run, the real run with byte-for-byte kept files and the second run, a link and no state folder, the table and the documentation), 8 of 8 mutations CAUGHT, `update-engine-meta` run (3.0.29), `--check` clean, `validate-hardlinks.js` clean, `node --test tests/engine.js` 314 of 315 on the first run (the inventory case flagged `clean-cache.js` itself, which only removes; exempted in the case) and the case green on re-run.

### [T-48C01] The response commitments of the security policy

- **Spec:** l1-community-health-files.md §2 (the open marker), §5.3
- **Status:** Todo
- **Assignment:** User
- **Verify:** the maintainer records two numbers in this entry's `Changes`: the days within which a report is acknowledged and the days within which a decision is given. They are a commitment to the public, so the agent does not choose them.
- **Handoff:** T-48C02.
- **Notes:** does not block the other tasks. A starting point for the decision: 7 days to acknowledge, 30 days to a decision, for one maintainer. If the numbers are not recorded when C02 is reached, C02 stays `Blocked [!]` with this reason.

### [T-48C02] `SECURITY.md` by the policy contract

- **Spec:** l1-community-health-files.md HF-1, HF-2, HF-5, HF-6; §2 forecasts (private reporting; the latest minor line of the current major); §5.3
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `SECURITY.md` states, in short sections with descriptive headings: the supported versions as a table whose rows are the released versions (the 3.0 line supported, each older line stated as not supported); the exact private reporting place — the repository's Security tab, "Report a vulnerability", with numbered steps and the URL of its advisories page; what a reporter can expect and when (the two numbers of T-48C01, then fix, then disclosure through a published advisory); what is in and out of scope; and no channel that does not exist — a grep of the file for `issues/new`, `discussions` and `Public Bug Report` finds nothing; the hosting platform's documentation for a security policy was read again and the date is recorded in `Changes` for T-48S01 (HF-1); `@role:docs-specialist` wrote it and `@role:prompt-engineer` reviewed the changed text, the verdict recorded in `Changes`; the report names `docs/repository-settings.md` for the setting it depends on.
- **Handoff:** T-48C07, T-48C08.

### [T-48C03] The contribution-guide generator keeps only its marked blocks; its template leaves the shipped folder

- **Spec:** l1-community-health-files.md HF-3, HF-8, §6 item 1; the layer classification algorithm (`CLAUDE.md` §1.3)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the §1.3 trace for `skills/magicspec/templates/contributing.md` is written in `Notes` (entry points that name it, the closure, read versus write path) and decides its layer; if it is maintenance-only, it is moved to the maintenance tree and a grep finds no file of `skills/magicspec/` naming it; `scripts/sync-docs.js` renders the command table (from the router), the workspace table (from the registry) and the version into marked blocks of a hand-written `CONTRIBUTING.md` and writes nothing outside the markers; a guide without markers receives them once and a second run changes nothing; the constitution is no longer embedded; the sync-docs harness cases are updated and pass; `update-engine-meta` has run.
- **Handoff:** T-48C04.
- **Notes:** do not relocate on intuition — the trace comes first. The generated tables read the router's six-column table through the shared row parser.

### [T-48C04] `CONTRIBUTING.md` by the guide contract

- **Spec:** l1-community-health-files.md HF-3, HF-5, HF-6; §2 (the SDD commands are part of the product here and may be named)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `CONTRIBUTING.md` has these sections in this order: how to report a bug and how to propose a change (pointing to the issue forms), how to set up the repository and run its checks (exact commands in code blocks: the harness, `update-engine-meta --check`, `validate-hardlinks.js`), what a pull request must contain and pass, the conventions a change follows (linked, not copied), and the expected conduct; the command table, the workspace table and the version sit inside the generator's markers and a harness case regenerates and compares them; no run of three consecutive lines equals a run of lines of the constitution's sections 1 to 6; it names no task identifier and no phase designator; procedures are numbered steps; `@role:docs-specialist` wrote it and `@role:prompt-engineer` reviewed the changed text, the verdict recorded in `Changes`.
- **Handoff:** T-48C08.

### [T-48C05] The issue forms and the chooser

- **Spec:** l1-community-health-files.md HF-4, HF-5; l1-agent-feedback.md §5.2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.github/ISSUE_TEMPLATE/bug-report.yml`, `change-proposal.yml`, `agent-feedback.yml` and `config.yml` exist; `config.yml` disables blank issues and links the repository's private vulnerability reporting page and no Discussions page; `agent-feedback.yml` has the seven sections of the agent-feedback report layout in that order and applies the `agent-feedback` label; the bug form asks for the engine version, the host, the command typed, the steps, and what was expected and what happened; a harness case reads each file's top-level keys and the labels of its form fields (a small reader inside the case, no new dependency) and compares them with those lists; `@role:prompt-engineer` reviewed the changed text, the verdict recorded in `Changes`; the report names `docs/repository-settings.md` for the label.
- **Handoff:** T-48C08.

### [T-48C06] The maintainer instruction for the hosting-service settings

- **Spec:** l1-community-health-files.md HF-9, §5.2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `docs/repository-settings.md` lists, as a table, the three settings of the specification (private vulnerability reporting, Discussions, the `agent-feedback` label) with the exact path through the service's settings, why each matters, the state observed on the date the page is written and how to verify it, and names the tasks that depend on it (C02, C05); `docs/README.md` links it; the documentation link check passes.
- **Handoff:** T-48C07.
- **Notes:** the state of a setting is read from the service when the access exists, else carried over from the specification with its date and marked as not re-observed.

### [T-48C07] The release checks the supported-versions table

- **Spec:** l1-community-health-files.md HF-7, §6 item 2; l2-release-pipeline.md
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** a maintenance script reads `SECURITY.md` and the version being released and exits non-zero, naming the mismatch, when the table does not list the release's minor line as supported or lists as supported a line the policy states as not supported; `.github/workflows/release.yml` runs it before the archive is built and the plan of `scripts/release.js` includes it; harness fixtures — a matching table passes, a missing line fails, a stale supported row fails; every new case is CAUGHT by `scripts/mutation-check.js`.
- **Handoff:** T-48T01.
- **Notes:** L2 (maintenance script); the archive composition is unchanged.

### [T-48C08] The documentation audit and the `docs-specialist` trigger

- **Spec:** l1-community-health-files.md HF-6, HF-7, §6 items 3 and 4 (declared supersession of the card's trigger)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the documentation step of `workflows/analyze.md` Mode C, which runs in the engine's own repository only (the developer-repository predicate), checks HF-2 (the supported-versions table, the private reporting place, no channel that does not exist), HF-3 (the section order) and HF-4 (the three forms, the chooser with blank issues disabled) and reports a mismatch as documentation drift; the `docs-specialist` role card gains the trigger "a community health file must change", and `l2-role-cards-execution.md` carries the card word for word (the mirror case passes); a harness case on a fixture without the developer predicate shows the check skipped; `update-engine-meta` has run.
- **Handoff:** T-48T01.
- **Notes:** edits `analyze.md`, serialized after A04. The one specification line this task edits is the card's mirror, because the harness requires the card and its mirror to be identical in the same delivery; T-48S01 records it in that specification's history.

### [T-48T01] Validation: harness, mutation lists, routing and cache scenarios, C14

- **Spec:** l1-workspace-intent-routing.md WI-11 to WI-14; l2-engine-automation.md §Cache Retention; l1-community-health-files.md HF-1 to HF-9
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` reports zero failures with the new cases (the resolver's outcomes and determinism, writers refusing an unregistered folder, every command routing and only `spec` creating, the example residue, cache pruning, the inventory walk, `clean-cache`, the policy's elements, the guide's order and markers, the form fields, the release check, the documentation audit, the card mirror); every new case is CAUGHT by `scripts/mutation-check.js`; `tests/suite.md` covers a location-signal routing in a three-workspace project (narrated once), the same in a single-workspace project (silent), an explicit workspace that wins over a contrary path, an unregistered name stopping with the list, `clean-cache` as a dry run and as a run, and a release with a stale supported-versions table; `update-engine-meta --check` is clean; `node scripts/validate-hardlinks.js` passes; two successive `build-spec-graph` runs on this repository leave `graph/.cache/` with one entry per file (the count in `Changes`).
- **Handoff:** T-48S01.

### [T-48S01] Spec sync: as-built decisions, the simulation matrix and the registry

- **Spec:** l1-workspace-intent-routing.md; l2-engine-automation.md; l1-community-health-files.md; the simulation matrix of routing
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** the decisions taken while building are recorded with a history row each in `l1-workspace-intent-routing.md` (the resolver's inputs, output and tie rules; the sixteen outcomes simulated), `l2-engine-automation.md` (`resolve-workspace` and `clean-cache` in Components, the cache inventory as built with the lock files, the writers' check) and `l1-community-health-files.md` (the date of the platform-documentation check of HF-1, the response times replacing the open marker, the template's new place, the card mirror edit of C08); `specifications/simulations/workspace-intent-routing.md` covers G1 to G4; the registry rows follow; `check-prerequisites --verify-headers` reports no drift.
- **Handoff:** Phase 49.
- **Notes:** specification work, done through the specification workflow.
