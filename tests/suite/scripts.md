# Workflow Test Suite — scripts

Cases of the area `scripts` of the cognitive suite. The index, the way to run it and the pass criteria are in [../suite.md](../suite.md).

### T80 — Engine Integrity Mandatory HALT

- **Workflow:** `check-prerequisites.js`
- **Synthetic State:**
  - `skills/magicspec/workflows/spec.md` is modified manually (hash mismatch).
- **Action:** Call any workflow.
- **Expected:**
  - [ ] `ok: false` in JSON output.
  - [ ] `warnings` contain "Engine Integrity".
  - [ ] Workflow (e.g., `run.md`) triggers HALT and does NOT begin execution.
- **Guards tested:** Engine Integrity Mandatory HALT (C1).

### T103 — Ghost Registry Critical HALT Barrier

- **Workflow:** `check-prerequisites.js`
- **Synthetic State:**
  - `cache-layer.md` registered in INDEX.md (Stable)
  - `cache-layer.md` is manually deleted from the `.magicspec/specifications/` folder.
  - No `PLAN.md` exists yet (the first `/magicspec plan` is about to write it); the outcome is the same with a plan.
- **Action:** Any engine script/workflow triggered (e.g. `/magicspec plan`)
- **Expected:**
  - [ ] `check-prerequisites.js` detects missing file while scanning `INDEX.md` — with or without a `PLAN.md` (T240).
  - [ ] `GHOST_REGISTRY` violation recorded.
  - [ ] **HALT** triggered: `ok: false` due to `GHOST_REGISTRY` failing `integrity_ok` check.
  - [ ] Workflow does not proceed to `view_file` or plan generation, preventing cascading hallucinations.
- **Guards tested:** Engine Integrity (Ghost Registry critical barrier)

### T190 — Skill Projection Parity

- **Workflow:** `sync-skills.js`
- **Synthetic State:**
  - `workflows/magic.test.md` exists with frontmatter and body.
  - Body contains instructions.
  - `skills/magic-test/SKILL.md` exists (generated).
- **Expected:**
  - [ ] `SKILL.md` frontmatter `name` = `magic-test` (filename-based default, hyphenated).
  - [ ] `SKILL.md` body contains the verbatim body of `magic.test.md`.
  - [ ] `SKILL.md` includes the read-only warning comment with correct source path.
  - [ ] If `magic.test.md` is deleted, `skills/magic-test/` directory is removed (Orphan Cleanup).
- **Guards tested:** Parity (exact match), Orphan cleanup, Metadata extraction.

### T191 — Mechanical File-Header Parity (--verify-headers)

- **Workflow:** `check-prerequisites.js` + `plan.md` / `run.md`
- **Synthetic State:**
  - `INDEX.md`: `auth.md` — Status: Stable, Version: 1.0.0
  - `auth.md` file header: `**Version:** 1.1.0`, `**Status:** Stable`
  - Engine checksums valid (no ENGINE_INTEGRITY warning)
- **Action:** Run `node skills/magicspec/scripts/executor.js check-prerequisites --json --verify-headers`
- **Expected:**
  - [ ] Script reads each spec file header and compares `Version:` / `Status:` against INDEX.md
  - [ ] `VERSION_DRIFT` warning emitted: `'auth.md' file header Version (1.1.0) ≠ INDEX.md (1.0.0)`
  - [ ] `ok: false` due to `VERSION_DRIFT` in `integrity_ok` check
  - [ ] Workflow (plan.md / run.md) HALTs mechanically — no LLM compliance required
  - [ ] Without `--verify-headers` flag, no header check is performed (backward compatibility)
- **Guards tested:** Mechanical File-Header Parity (Mechanical Guard, RE-2 simulation fix), VERSION_DRIFT/STATUS_DRIFT blocking

### T219 — Wholesale-Gitignored `.magic/` Must Not Fail `--check` (Invariant 7 Boundary, Regression)

- **Workflow:** `update-engine-meta.js --check` (pre-commit hook, consumer install)
- **Synthetic State:**
  - Consumer project (e.g. `metaquant`) installs the engine from a release archive and follows the documented L1 contract: its own `.gitignore` contains `.magic/` (engine is "installed from a release archive, not committed").
  - `skills/magicspec/.checksums` lists all shipped engine files, unmodified on disk.
- **Action:** run `node skills/magicspec/scripts/executor.js update-engine-meta --check` (as the pre-commit hook does).
- **Expected:**
  - [ ] Every file listed in `.checksums` is still verified against disk, regardless of the consumer's own `.gitignore` — a manifested path is never treated as "disowned."
  - [ ] `--check` exits 0 with "No changes detected" when the shipped files are unmodified.
  - [ ] The Invariant 7 gitignore exclusion still applies to paths **not yet in the manifest** (stray dev-machine cruft, e.g. `.foreign-cache/`), preserving the original protection (see `generate-checksums.js` / `update-engine-meta.js` gitignore-parity tests in `tests/engine.js`).
- **Guards tested:** Invariant 7 scope boundary — gitignore-based exclusion must be scoped to *new/unmanifested* paths only, never to paths already in `.checksums`. Found live in `metaquant` (a real consumer project): its pre-commit hook failed on every commit because `isGitignored` was applied unconditionally in `update-engine-meta.js`'s on-disk scan, causing all 71 manifested files to read as "missing" the instant the consumer's `.gitignore` disowned `.magic/` — the exact convention this engine mandates. Fixed engine v2.1.93 by gating the exclusion on `!isManifested`.

### T238 — A Stale-Plan Remedy Names the Workspace It Reported On, and Audit Has One Spelling

- **Workflow:** `check-prerequisites.js` (remedy strings) + `run.md` (Spec Stability, Mid-Run Stability) + `rule.md` (Next step) + `analyze.md` (Pre-flight)
- **Synthetic State:**
  - `workspace.json` registers `engine` (default) and `docs`. The `docs` plan is based on an older registry version (`SYNC_GAP`); a `docs` spec is listed in `INDEX.md` but absent from `PLAN.md` (`ORPHANED_SPEC`).
- **Action A:** `MAGIC_DESIGN_DIR=.magicspec/docs node skills/magicspec/scripts/executor.js check-prerequisites --json`.
- **Expected A:**
  - [ ] The `SYNC_GAP`, `ORPHANED_SPEC` and `RULE_57_VIOLATION` remedies read `/magicspec plan docs`, not a bare `/magicspec plan` that would re-plan `engine`.
  - [ ] With the flat legacy layout (`MAGIC_DESIGN_DIR` unset, `.magicspec/`) the remedy is `/magicspec plan` — no workspace is invented.
  - [ ] The `REGISTRY_MISMATCH` remedy reads `/magicspec spec audit`.
- **Action B:** static scan of `run.md`, `rule.md`, `analyze.md`, `docs/rule.md`.
- **Expected B:**
  - [ ] Every halt message and next step that sends the user to re-plan reads `/magicspec plan {workspace}`.
  - [ ] The audit command is spelled `/magicspec spec audit` everywhere; `--audit` appears nowhere.
- **Guards tested:** Handoff Propagation (`run.md` Argument Routing note), verb-to-interface parity, one spelling per command.
- **Regression for:** "The Undeclared Verb" crisis (Improv Mode 2026-09-30) — a remedy without a workspace re-planned the default workspace in a multi-workspace project.

### T240 — The Registry-vs-Disk Scan Needs No Plan: a Deleted or Misnamed Spec Is Reported Between the First Spec and the First Plan

- **Workflow:** `check-prerequisites.js` (registry scan), `plan.md` / `spec.md` Pre-flight
- **Synthetic State:**
  - `INDEX.md` registers `l1-real.md`, `l1-missing.md` and `legacy.md`, all `Stable`; only `l1-real.md` exists on disk.
  - No `PLAN.md` exists yet (the first `/magicspec plan` has not run).
- **Action A:** `check-prerequisites --json --require-specs`.
- **Expected A:**
  - [ ] `GHOST_REGISTRY` is reported for `l1-missing.md` and `legacy.md`; `NAMING_VIOLATION` for `legacy.md`.
  - [ ] `ok: false` — the C15 Filter then decides (in scope → **HALT** before any planning).
  - [ ] No plan-dependent finding (`ORPHANED_SPEC`, `REGISTRY_MISMATCH`, `SYNC_GAP`, `RULE_57_VIOLATION`) appears: each compares against a plan that does not exist.
- **Action B:** the same state with a `PLAN.md` that lists only `l1-real.md`.
- **Expected B:**
  - [ ] The same `GHOST_REGISTRY` and `NAMING_VIOLATION` findings: a plan changes nothing about what the registry-vs-disk scan reports.
- **Guards tested:** Mechanical registry guard independence from the plan; `--verify-headers` can rely on `GHOST_REGISTRY` to cover a spec file that is missing.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the ghost scan sat inside the plan-dependent block of `check-prerequisites.js`, so a spec deleted before the first plan raised nothing, and header parity skipped the missing file on the strength of a finding that could not fire.

### T243 — Config Drift Watches the Global Constitution Beside a Workspace One

- **Workflow:** `check-prerequisites.js` (CONFIG_DRIFT), `init.md` Step 1
- **Synthetic State:**
  - A git repository. `.magicspec/RULES.md` (global) and `.magicspec/docs/RULES.md` (workspace, C22) are both committed. `MAGIC_DESIGN_DIR=.magicspec/docs`.
- **Action:** edit the global file by hand and run `check-prerequisites --json`; edit the workspace file too and run it again; restore the global file and run it a third time.
- **Expected:**
  - [ ] Global edit only → one `CONFIG_DRIFT` finding, for `.magicspec/RULES.md`.
  - [ ] Both edited → two findings (`.magicspec/RULES.md`, `.magicspec/docs/RULES.md`).
  - [ ] Workspace edit only → one finding, for `.magicspec/docs/RULES.md`.
  - [ ] Every finding is non-blocking (`ok` is unaffected); the workflow logs the advisory and proceeds without a prompt (`init.md` Step 1).
- **Guards tested:** Config Drift scope — the global and every workspace `RULES.md` (C22); advisory, never a HALT.
- **Regression for:** `/magicspec-dev:test test` (2026-10-01) — the workspace `RULES.md` replaced the global one in the watch list, so hand edits to the project constitution went unreported in any project that has a workspace-level rules file.

### T282 — A Release Whose Security Policy Does Not Support Its Line Is Blocked

- **Workflow:** `scripts/release.js` and the release workflow (`check-security-policy.js`)
- **Synthetic State (Test A):** the version being released is `3.1.0`; `SECURITY.md` lists `3.0.x` as supported and no `3.1.x` row.
- **Action A:** the maintainer runs `node scripts/release.js`, then `node scripts/release.js --yes`.
- **Expected A:**
  - [ ] The plan names the blocker: the security policy does not match this release, the 3.1 line is not listed, and `3.0.x` is listed as supported although only the latest minor line is.
  - [ ] `--yes` refuses; nothing is committed, tagged or pushed.
- **Synthetic State (Test B — control):** the table lists `3.1.x` as supported and every earlier line as not supported.
- **Expected B:**
  - [ ] The plan is clean of this blocker, and the release workflow runs the same check before it builds the archive.
- **Guards tested:** HF-7: the supported-versions table is checked against the version at release.
- **Regression for:** none yet — new with the community health files.

### T290 — The Handoff Line Names the Reasoning Demand of the Next Command, Read From the Router

- **Workflow:** `finalize.js` (handoff line) with the router `SKILL.md` (Demand column)
- **Synthetic State:** four finished stages in turn — `spec` (next: `plan`), `plan` (next: `task`), `task` (next: `run`), `run` with a drift signal (next: `plan`).
- **Action:** each stage runs the Finalization Protocol.
- **Expected:**
  - [ ] The lines read `Next: /magicspec plan engine — deep reasoning`, `Next: /magicspec task engine — standard reasoning`, `Next: /magicspec run engine — standard reasoning` and `Next: /magicspec plan engine — deep reasoning`: the demand is the row of the next command, not of the stage that just ended.
  - [ ] The line is printed once, by the script, after the summary and before the Completion Checklist; the agent does not restate it.
  - [ ] The demand is advice: the line is not a condition and the next stage runs on any model.
- **Control:** the router table changes the demand of `task` to `light`: the line follows the table with no edit to `finalize.js`.
- **Guards tested:** PS-4 demand declared once; PS-7 one line; derived-not-copied (one parser of the router).
- **Regression for:** none yet — new with the four stages.

### T312 — A Submission Finds a Duplicate and Creates Nothing; an Unshown Draft Is Refused

- **Workflow:** `scripts/lib/feedback-submit.js` through `feedback submit`
- **Synthetic State:** a draft was shown in full; an open issue already carries its fingerprint. A second draft was created but never shown.
- **Action:** `feedback submit d1` and `feedback submit d2`, with the person's yes to the first only.
- **Expected:**
  - [ ] The first reports `duplicate found` with the issue's address and creates nothing; the draft stays; `--new` would file another.
  - [ ] The second is refused, naming `feedback draft d2` as the step that shows it.
  - [ ] No argument names a repository, a host or a label; the destination is the one the skill folder states.
  - [ ] A creation the tracker confirms reports `created` with the address and removes the draft and its notes; an answer without an address reports `unknown`, never `created`.
- **Control:** no tracker client is installed: `not created`, with the recovery step `feedback keep {id}`; the draft stays.
- **Guards tested:** EF-2 submission is separate, explicit and bound to a shown draft; EF-3; EF-8; §5.3 outcomes.
- **Regression for:** none yet — new with the feedback channel.

### T314 — In the Engine's Repository the Notes Are Fix Candidates and Nothing Is Offered

- **Workflow:** `finalize.js` (pending notes) in the engine's repository
- **Synthetic State:** the maintenance tooling is present; two notes are pending; the plan has an open task.
- **Action:** a workflow ends with `finalize`.
- **Expected:**
  - [ ] The output has `### Feedback notes — fix candidates`, listing both and saying nothing is drafted or offered for submission; no note is marked offered.
  - [ ] The next step is `/magicspec fix {workspace}` with the number of notes, and the handoff line names its demand.
  - [ ] When the plan state says `Run /magicspec plan …` (a stale plan, a pending directive), that step keeps its place.
- **Control:** an installation without the maintenance tooling: the notes are offered once and the next step is the plan state.
- **Guards tested:** EF-12 work queue; EF-10; EF-11.
- **Regression for:** none yet — new with the feedback channel.

### T338 — A Changed File Is Re-indexed Before the Answer

- **Workflow:** `scripts/memory-query.js`, `scripts/memory-index.js` and `scripts/export-wiki.js`
- **Synthetic State:** a built index; afterwards a specification gains the word `zebra`, a new specification is added and another is deleted.
- **Action:** `memory-query "zebra"` with no `memory-index` run before it; then another edit followed by `export-wiki`, then `memory-index`.
- **Expected:**
  - [ ] The query answers from the edited text and the new specification, and no result comes from the deleted one.
  - [ ] After the edit and `export-wiki`, `memory-index` reports `0 indexed`: the export left the index current.
  - [ ] A run with nothing changed reads no file's text (`0 indexed`, every file `unchanged`).
- **Control:** `export-wiki --out {folder}` and `export-wiki --from-file {graph.json}` leave the index as it was.
- **Guards tested:** AM-5; AM-1 (the index is rebuilt from the files).
- **Regression for:** none yet — new with the artifact index.

### T339 — History Stays Out of the Results Unless Asked For

- **Workflow:** `scripts/memory-query.js` (`--history`, `--kind`)
- **Synthetic State:** a word that occurs only in an archived phase, a changelog entry and a retrospective; a second word that occurs in a plan phase and in the changelog.
- **Action:** `memory-query` for each word with no option, with `--history`, and with `--kind=changelog`.
- **Expected:**
  - [ ] With no option the first word returns nothing and the second returns only the plan phase.
  - [ ] With `--history` the archive, changelog and retrospective sections are returned, each labelled with its kind.
  - [ ] `--kind=changelog` returns the changelog section without `--history`: a named kind is what was asked for.
- **Control:** the comparison set of a review (T336) never contains a history section.
- **Guards tested:** AM-6.
- **Regression for:** none yet — new with the artifact index.

### T340 — With No Provider Nothing Leaves the Machine, and the Query Says It Ran Lexically

- **Workflow:** `scripts/memory-index.js`, `scripts/memory-query.js` and `lib/memory-embed.js`
- **Synthetic State:** a project with no `memory.embeddings` in `workspace.json`; then the same project with a provider configured and a key named by `apiKeyEnv`.
- **Action:** `memory-index` and `memory-query "retry rule"` in each state.
- **Expected:**
  - [ ] With no provider, no network call is made, `memory-index` prints no `Sent` line and the first line of the query is `modes: lexical`.
  - [ ] With a provider, `memory-index` sends the sections that have no vector yet and prints exactly one line with the host and the count; a second run sends nothing; the query's first line is `modes: lexical + vector`.
  - [ ] When the provider answers an error, the query returns the lexical results as before, a warning `MEMORY_EMBEDDINGS_FAILED` is recorded and the index is not reported unavailable.
- **Control:** changing the model or the dimensions sends every section again; the key never appears in a project file or in any output.
- **Guards tested:** AM-4; AM-7; AM-8.
- **Regression for:** none yet — new with the artifact index.

### T341 — An Index That Cannot Be Built Leaves the Workflow on Text Search with One Diagnostic

- **Workflow:** `scripts/memory-index.js`, `scripts/memory-query.js` and `scripts/export-wiki.js` with `finalize.js`
- **Synthetic State:** both index files are folders, so neither backend can open its file; a separate case with the indexer crashing when `export-wiki` runs it.
- **Action:** `memory-query "retry"` during a review, `memory-index`, then `finalize`; `export-wiki` with the crashing indexer.
- **Expected:**
  - [ ] Both commands exit 0, print one line saying the index is unavailable and telling the reader to search the text directly, and record the warning `MEMORY_INDEX_UNAVAILABLE`; the review goes on by text search.
  - [ ] The finalize digest shows the finding once, with its remedy; the workflow it follows is not marked failed.
  - [ ] With the crashing indexer `export-wiki` leaves the wiki written, exits 0 and prints `[Index-Refresh]` with the same advice.
- **Control:** once the folders are removed, the next run builds the index and the finding is not recorded again.
- **Guards tested:** AM-8; AM-1.
- **Regression for:** none yet — new with the artifact index.

### T342 — A Task Title That Names a Command Is a Title, Not the Next Step

- **Workflow:** `scripts/finalize.js` after `task` or `run`
- **Synthetic State:** the first open task of the active phase has the title ``The constitution through `/magicspec rule`: C2 lists `sync` as shipped``; a second fixture has a title that names `/magicspec spec`.
- **Action:** `finalize --workflow=task`, reading the `Next Action` it records and the handoff line it prints.
- **Expected:**
  - [ ] The `Next Action` reads `Execute {id} {title} via /magicspec run {workspace}` with the title as the ledger wrote it, and the handoff line is `Next: /magicspec run {workspace} — standard reasoning`, not a line for the command the title names.
  - [ ] The second fixture's `Next Action` is not replaced by the planning funnel, and no `NEXT_ACTION_SUBSTITUTED` finding is recorded.
- **Control:** a step that itself names `/magicspec spec` (a recommendation, not a title) is still replaced by the planning funnel with the finding recorded.
- **Guards tested:** PS-4 (the handoff line carries the command the `Next Action` records); the reserved-command rule of the constitution's §5.
- **Regression for:** feedback note n1 — the handoff line took the first `/magicspec` command of the whole `Next Action`, a task title included.

### T345 — A Recorded Goal Survives Sync

- **Workflow:** `scripts/lib/sync-state.js` with `scripts/update-state.js`
- **Synthetic State:** live memory records a goal with criteria and hand-written decisions, and its progress counters are stale.
- **Action:** `/magicspec sync state`.
- **Expected:**
  - [ ] The counters are recomputed from the ledger and the phase workbooks.
  - [ ] The goal block, its criteria, the decisions and every other hand-written section are byte for byte as they were.
  - [ ] With the counters already current, `update-state` is not called and the file's `Updated` stamp does not move.
- **Control:** a project with no goal block gets the same recomputation.
- **Guards tested:** SY-1; SY-3; the goal block's one writer (`update-state`).
- **Regression for:** none yet — new with the sync command.

### T346 — A Disagreement That Needs a Judgement Is Reported With Its Command and Left Alone

- **Workflow:** `scripts/lib/sync-registry.js`
- **Synthetic State:** a specification whose header says `RFC` and `1.3.0` while its registry row says `Stable` and `1.2.0`; a registry row whose file is missing from the disk; a specification file no row registers; a stale count.
- **Action:** `/magicspec sync`.
- **Expected:**
  - [ ] Each of the three disagreements is listed with its place, the difference and one command: `/magicspec spec` for the header, `/magicspec analyze` for the missing file and the unregistered one.
  - [ ] Neither the header nor the row is changed, whichever source is newer; the stale count is still written.
  - [ ] The `Next:` line names the command of the first disagreement.
- **Control:** reconciling the header by `/magicspec spec` and running `sync` again lists no disagreement.
- **Guards tested:** SY-2.
- **Regression for:** none yet — new with the sync command.

### T347 — A Version Reaches the Declared Anchors and Nowhere Else

- **Workflow:** `scripts/lib/sync-versions.js` with `scripts/lib/sync-config.js`
- **Synthetic State:** the project's version file reads `2.5.0`; the registration declares a JSON key in a manifest and a marker in the README; the README also holds the text `0.0.1` outside the marker, and the manifest holds a second key with the same old value.
- **Action:** `/magicspec sync versions`, then again.
- **Expected:**
  - [ ] The manifest key and the marker content read `2.5.0`; the manifest keeps its formatting and its other key; the README text outside the marker is untouched.
  - [ ] The second run writes nothing.
  - [ ] A declared marker missing from its file, a key that is not a string and a pair that occurs twice are each reported with the file and left as they are.
- **Control:** with no `sync` section in the registration, the area writes and reports nothing.
- **Guards tested:** SY-4; SY-2.
- **Regression for:** none yet — new with the sync command.

### T348 — A Stale Derived File Is Reported With Its Command and Kept

- **Workflow:** `scripts/lib/sync-projections.js`, `scripts/lib/sync-graph.js`, `scripts/lib/sync-registry.js`
- **Synthetic State:** a retired command entry an earlier release wrote into a host folder; a wiki page of a specification that was removed; a row of the global registry for a workspace that is not registered.
- **Action:** `/magicspec sync`.
- **Expected:**
  - [ ] Each is listed as stale with the command that removes it (`init` for the host, `export-wiki` for the page, a manual edit for the row).
  - [ ] No file is deleted and no row is removed by `sync`; the rest of the run completes.
- **Control:** after the person runs the listed command, `sync` lists nothing stale.
- **Guards tested:** SY-5.
- **Regression for:** none yet — new with the sync command.

### T349 — A Registered Documentation Block Is Rewritten Between Its Markers Only and Carries No SDD Reference

- **Workflow:** `scripts/lib/sync-docs.js` with `scripts/lib/sync-markers.js`
- **Synthetic State:** a page holding a registered block between `<!-- sync:{key} -->` markers; a source file holding the block's text; later, a source that mentions a task identifier, a phase designator, a registry file name, a specification file name or a path into the state folder.
- **Action:** `/magicspec sync docs`.
- **Expected:**
  - [ ] The text between the markers equals the source; every byte outside the markers, line endings included, is identical.
  - [ ] A source carrying any of the five classes is refused: the page is as it was and the report names the class and the source.
  - [ ] A missing source, a missing page and a missing marker are each reported and nothing is written.
- **Control:** removing the reference from the source and running `sync docs` again writes the block.
- **Guards tested:** SY-6; SY-2.
- **Regression for:** none yet — new with the sync command.

### T350 — A Preview Writes Nothing, the Wiki and the Index Included

- **Workflow:** `scripts/sync.js` with `scripts/lib/sync-graph.js` and `scripts/graph-cache.js`
- **Synthetic State:** a project with a stale count, stale counters, a missing wiki and no artifact index.
- **Action:** `/magicspec sync --dry-run`, then `/magicspec sync`.
- **Expected:**
  - [ ] The preview's counts line reads `(dry run)` and each write reads `would write`, the wiki pages and the index refresh among them.
  - [ ] Not one byte of the project changed: no registry cell, no counter, no wiki page, no index file, no extraction-cache entry, no `.cache` folder.
  - [ ] The real run then writes what the preview listed.
- **Control:** a second preview after the real run lists nothing and prints the one-line report.
- **Guards tested:** SY-7.
- **Regression for:** none yet — new with the sync command.

### T351 — A Failed Engine Integrity Check Skips Projections Only

- **Workflow:** `scripts/lib/sync-projections.js`
- **Synthetic State:** one file of the installed skill folder differs from its recorded checksum; the host's rule copy is older than the folder's rules; the registry count is stale.
- **Action:** `/magicspec sync`.
- **Expected:**
  - [ ] The report lists one disagreement naming the folder and the command to restore it from the release archive; the rule copy is not rewritten.
  - [ ] The registry count, the counters and the graph are still brought up to date.
- **Control:** after the folder is restored, `sync projections` rewrites the stale copy.
- **Guards tested:** SY-2; §5.4 (an integrity failure skips only the projections area).
- **Regression for:** none yet — new with the sync command.

### T355 — A Clone Whose Provider Setting Names a Key It Does Not Hold Ranks Lexically, Sends Nothing and Records One Diagnostic

- **Workflow:** `scripts/memory-index.js` and `scripts/memory-query.js` (`lib/memory-embed.js`)
- **Synthetic State:** a committed `workspace.json` whose `memory.embeddings` names `apiKeyEnv: "EMBEDDINGS_API_KEY"` and a provider that counts requests; the developer's environment has no such variable.
- **Action:** `memory-index`, then `memory-query "{name}"`, then the next `finalize`.
- **Expected:**
  - [ ] The provider receives no request from either command; the query's first line reads `modes: lexical` (or the cut line of a lexical list) and its results are the lexical ones.
  - [ ] One warning `MEMORY_EMBEDDINGS_FAILED` names the variable and never a value; the digest shows it once.
  - [ ] No workflow stops and nothing is asked: the missing key is not a finding of the review that ran the query.
- **Control:** with the variable set, the provider receives the requests with `Authorization: Bearer {value}`, the first line reads `modes: lexical + vector`, and a change of the provider address alone makes the next `memory-index` embed every section again while the query before it answers lexically.
- **Guards tested:** AM-7; AM-8; AM-4.
- **Regression for:** the unset key that sent section text with no authorization header (found by a reference-mining pass: a body of section text answered 401 on every refresh).
