---
phase: 58
name: "Artifact Memory: Readable Citations, Announced Cut, Credential and Vector Identity"
status: Done
subsystem: "skills/magicspec (scripts/memory-query.js, scripts/memory-index.js, scripts/lib/memory-sections.js, scripts/lib/memory-sqlite.js, scripts/lib/memory-fallback.js, scripts/lib/memory-embed.js, scripts/lib/commands.js, roles/spec-critic.md, roles/planner.md, workflows/analyze.md, workflows/fix.md, workflows/spec.md), docs, tests"
requires:
  - "Phase 54: the index, memory-index and memory-query, both backends behind one interface, lib/memory-refresh.js and the provider adapter lib/memory-embed.js"
  - "Phase 50: the comparison-set steps of the spec-critic card (step 1), the planner card (step 6) and analyze.md Mode C step 7a, whose text changes"
  - "Phase 51: the sibling-site step of fix.md (step 5), whose text changes"
  - "Phase 56 and Phase 57: Biome, the type check and Fallow over the changed scripts; children started with process.execPath; harness 438, the cognitive suite 1.9.104 (last case T352), engine 3.0.136, the rule kernel at 16263 of 16384 bytes"
  - "The specifications: l1-artifact-memory 1.1.0 (AM-2, AM-3, AM-7, AM-9), l2-artifact-memory-store 1.2.0, l2-test-suite 1.45.0, Stable at registry 1.77.0, plan 1.67.0"
provides:
  - "memory-query results carry the lines their section occupies (lib/memory-sections.js records the file line of every heading and body line; schema 2 in both backends, one rebuild; a lines-only move keeps a section's row and vector) and a size estimate (ceil(chars/4) to two significant figures)"
  - "A cut list says so: the first line counts the sections that matched in force and in history and names the next --offset; --offset pages the same ranking (--k stays capped at 50); the fused pool is every lexical match plus the best 250 vector candidates whatever --k is; the JSON gains total, byMeaning, historyTotal, offset, next, lines and tokens; both backends gained count()"
  - "A machine that does not hold the credential a shared provider setting names sends nothing (credentialProblem, checked in embed() before any request) and ranks lexically with one MEMORY_EMBEDDINGS_FAILED naming the variable; vectors are comparable by provider address, model and size, checked where they are stored and where a query ranks them"
  - "The five readers of a result (spec-critic and planner cards, Mode C 7a, fix step 5, IK-2) read the cited lines and take the next page or narrow a cut list before treating a set as complete, with the two card mirrors in step (l2-role-cards-governance 1.4.9, l2-role-cards-execution 1.3.2); docs/graph.md section 6 shows the output and how a team shares the setting"
  - "Specifications as built at registry 1.78.0: l2-artifact-memory-store 1.3.0, l2-test-suite 1.46.0 (l1-artifact-memory 1.1.0 from the planning); harness 438 to 445, the cognitive suite 1.9.105 (T353-T356), twenty mutation entries all caught, the rule kernel unchanged at 16263 bytes"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/memory-query.js"
    - "skills/magicspec/scripts/lib/memory-sections.js"
    - "skills/magicspec/scripts/lib/memory-sqlite.js"
    - "skills/magicspec/scripts/lib/memory-fallback.js"
    - "skills/magicspec/scripts/lib/memory-embed.js"
    - "skills/magicspec/scripts/lib/commands.js"
    - "skills/magicspec/roles/spec-critic.md"
    - "skills/magicspec/roles/planner.md"
    - "skills/magicspec/workflows/analyze.md"
    - "skills/magicspec/workflows/fix.md"
    - "skills/magicspec/workflows/spec.md"
    - ".magicspec/engine/specifications/"
    - "docs/graph.md"
    - "docs/context-economy.md"
    - "docs/README.md"
    - "tests/engine.js"
    - "tests/suite.md"
patterns_established:
  - "A list cut to a budget carries a count and the way to the rest, and a caller that needs every match treats a cut list as incomplete until it has paged or narrowed"
  - "A shared setting does not make a machine take part: the credential it names is checked where the request is made, before any request, and the reason names the variable and never a value"
  - "Vectors are comparable by provider address, model and size, and the three are checked both where vectors are stored and where a query ranks them"
  - "A citation's location is computed where the text is cut and verified by reading the file back, over every unit of the real corpora, not by a sample"
duration_minutes: ~
---

# Stage 58 Tasks — Artifact Memory: Readable Citations, Announced Cut, Credential and Vector Identity

**Phase:** 58
**Status:** Done
**Strategic Goal:** A result of `memory-query` is readable at its cost — its lines and a size estimate — and a cut list says how many matched and how to page to the rest, so a comparison set built from it is complete or knows it is not. A clone whose shared provider setting names a key it does not hold sends no text. Vectors from another provider address are never ranked against the current ones.

**Phase notes:**

- **Tracks.** `M` changes the store in the plan's order: the line columns first (M01, shared by both backends), then the query output (M02), the command table (M04). M03 (credential and identity) touches only `lib/memory-embed.js` and the backends' `meta`, depends on nothing else and may land first. `W` changes the instruction text that reads a result. `D` documents it. `E` writes the suite and the harness. `T` validates, `S` syncs the specifications.
- **C14.** Every task that changes a file in `skills/magicspec/` runs `node skills/magicspec/scripts/executor.js update-engine-meta` right after the change, before its next step.
- **Static checks.** After changing a script: `node_modules/.bin/biome check <changed files>`, `pnpm run typecheck`, `pnpm run audit`. A touched script that passes the type check gains `// @ts-check` (a C14 event like any other edit in the folder).
- **Fixture root.** Every harness case that calls a writing subcommand in process passes the fixture root, copied with the engine, so nothing writes `.magicspec/.cache/memory.*` of this repository.
- **The rule kernel.** `CONSTITUTION.md` is not edited (plan note 2). A task that finds a kernel line needed stops and records the finding for `/magicspec plan`.
- **No 2.x port** (plan note 7): the index exists only on the 3.x line.
- **Task Instruction Review (PQ-6).** `@role:prompt-engineer` reviewed this workbook before it was written. Verdict: PASS-WITH-REWRITES. Three rewrites were applied inline: M01 defines which line a cut part starts on; M02 states that the counts are computed before `--k` and `--offset`; M03 names what the recorded reason may and may not contain.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-58M01] Section lines: `line_start`/`line_end` from `lib/memory-sections.js`, stored by both backends, schema version 2
- [x] [T-58M02] Query output: lines, size estimate, the counts of a cut list, `--offset` paging and the fixed fused pool, in text and JSON, on both backends
- [x] [T-58M03] Provider guard: no request when `apiKeyEnv` names an unset or empty variable; vector identity `url` + `model` + `dimensions`
- [x] [T-58M04] Command table: `memory-query` lists `--offset` among its value options
- [x] [T-58W01] Consumer text: the five sites read the cited lines and page or narrow a cut list; the two card mirrors
- [x] [T-58D01] Documentation: the new output line and `--offset` in the three pages that show `memory-query`
- [x] [T-58E01] The cognitive suite: the four scenarios the plan lists (T353–T356)
- [x] [T-58E02] The harness: §Artifact Memory Query Coverage, with controls and mutation entries
- [x] [T-58T01] Validation: harness, mutation checks, suite, static checks, C14, both backends, the kernel untouched
- [x] [T-58S01] Spec sync: the store's §6 item 4 (f) and item 5 as built, the registry

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-58M01] Section lines: `line_start`/`line_end` from `lib/memory-sections.js`, stored by both backends, schema version 2

- **Spec:** l2-artifact-memory-store.md §5.2 (schema, Lines of a section), §5.3; l1-artifact-memory.md AM-2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `sectionsOf()` returns `lineStart` and `lineEnd` (1-based, inclusive) on every unit, counted in the file text after newline normalization so they match the file on disk line for line. The first part of a section starts on its heading line; a later part of a section cut by §5.3 starts on that part's own first line; a `Document History` unit spans its table. For every unit of every Markdown file of this repository's state folder, the file's line `lineStart` is the heading or the part's first line, and lines `lineStart..lineEnd` contain the unit's body (a throwaway check script in the scratchpad, output pasted into `Changes`). `lib/memory-sqlite.js` has `line_start INTEGER, line_end INTEGER` in `sections` and `SCHEMA_VERSION = '2'`; `lib/memory-fallback.js` stores the same two fields and bumps its own layout version the same way. Opening an index of schema 1 rebuilds it (one run of `memory-index` on a copy of `.magicspec/.cache/memory.sqlite` reports every section indexed). `replaceFile` still keeps the row, id and vector of a section whose heading and text did not change, and updates its lines when only they moved.
- **Handoff:** T-58M02 prints the lines; T-58E02 reads them back.
- **Notes:** A section whose text is unchanged but whose lines moved (an edit above it) keeps its vector: the lines are location, not content, and AM-5 refreshes them with the file.
- **Changes:** `lib/memory-sections.js`: `blocksOf` records the file line of each heading and of each body line, `paragraphsOf` and `splitBody` the line offsets of each paragraph and part, and every unit gains `lineStart` and `lineEnd` (1-based, inclusive; the first part starts on the heading line, a later part on its own first line; a file with a front-matter block has its title inside the first block, so that range includes the title line). `memory-sqlite.js`: schema 2 (`line_start`, `line_end` before `body`; `refile` updates the lines of a kept section, so a moved section keeps its id and vector; reads return `lineStart`/`lineEnd`); `memory-fallback.js`: layout version 2, the units carry the fields as they are. Checked: for every one of 13,531 units across this state folder and five consumer corpora the file's lines `lineStart..lineEnd` hold the unit's text line for line (the heading line aside), and unit text and order are byte-identical to HEAD on 10,653 units; a schema-1 database opens empty at schema 2; sqlite and fallback hold identical rows and lines for 2,887 sections; a lines-only move keeps id and vector on both. The harness's hand-made units gained their lines, and the rebuild case compares with the exported `SCHEMA_VERSION`; memory cases 29 of 29 pass. biome clean, typecheck clean, C14 run.

### [T-58M02] Query output: lines, size estimate, the counts of a cut list, `--offset` paging and the fixed fused pool, in text and JSON, on both backends

- **Spec:** l2-artifact-memory-store.md §5.4 (Location, size and the cut); l1-artifact-memory.md AM-3, AM-9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `memory-query "check-prerequisites"` on this repository prints a first line of the form `modes: lexical · 1-10 of {n} in force, {h} more in history — next: --offset=10 (--k up to 50), --history for history`, with `{n}` and `{h}` equal to a direct count over `sections_fts` joined with `sections` under the same filters (79 and 220 measured on 2026-11-13 before this phase's own edits; the numbers at run time are what the direct count gives). The counts are computed before `--k` and `--offset` are applied. Each result line shows `{file}:{line_start}-{line_end}` and `~N tokens` with N = `ceil(chars / 4)` rounded to two significant figures. `--offset=10` returns ranks 11 to 20 numbered from 11; the last page prints no `next`; a query whose matches all fit prints only `modes: …`; `--history` drops the history count. `--offset` that is not a whole number is refused like a bad `--k`. The JSON output has `total`, `historyTotal` (null with `--history`), `offset`, `next`, and `lines` and `tokens` per result. With a provider (a stub `embedFn` in a fixture), the fused pool is every lexical match plus the top 250 of the vector ranking whatever `--k` is, the first line reads `{n} lexical matches + {m} by meaning`, and walking every page returns each section once. Both backends give the same counts and pages on one fixture.
- **Handoff:** T-58W01 and T-58D01 describe this output; T-58E02 pins it.
- **Notes:** The fixed pool replaces the as-built max(50, 5 × k) of the store's §6 item 4 (f); T-58S01 rewrites that item.
- **Changes:** `memory-query.js`: each result shows `{file}:{start}-{end}` and `~N tokens` (`tokensOf`: ceil(chars/4) of the section's text to two significant figures, `formatTokens` prints thousands as `1.2k`); the first line counts a cut list (`1-10 of 79 in force, 220 more in history — next: --offset=10 (--k up to 50), --history for history`; a list that holds every match prints only `modes: …`; with `--history` or `--kind` no history count; with vectors `(79 lexical matches + 226 by meaning)`); `--offset` (whole number, 0 or more) pages the same ranking, ranks numbered from the offset, the last page names no next; JSON gains `total`, `byMeaning`, `historyTotal`, `offset`, `next` and per result `lines`, `tokens`; the fused pool is every lexical match plus the best 250 vector candidates whatever `--k` is. Both backends gained `count(phrases, options)` (SQLite: the query's filters shared through `filtersOf`; fallback: `rank` then slice). [DR] With an explicit `--kind` the history count is null, because the list then names exactly what it returns. (Override: `/magicspec spec amend l2-artifact-memory-store.md "count history under --kind"`.) Checked: `check-prerequisites` counts 79 in force and 220 in history, equal to a direct count by kind (52+13+8+4+2, 173+30+13+4); walking pages of 7 and of 50 returns the same ordered list with no duplicate and the sum equal to `total`, for 4 queries, `--history` and `--kind`, on sqlite and fallback alike (identical counts), and fused with a stub provider for 3 queries on both backends (total 305 = 79 lexical + 226 by meaning); past the end prints `0 of 79` and `No sections from 10000; 79 matched.`; `--offset=-1` and `--offset=abc` exit 1 with the message. Harness: the two cases that pinned the old line format and the closed modes line were updated (memory and command-table cases 37 of 37). biome clean.

### [T-58M03] Provider guard: no request when `apiKeyEnv` names an unset or empty variable; vector identity `url` + `model` + `dimensions`

- **Spec:** l2-artifact-memory-store.md §5.5 (A credential this machine lacks, Vector identity), §6 item 5 (c), (d); l1-artifact-memory.md AM-7
- **Status:** Done
- **Assignment:** Agent
- **Verify:** In `lib/memory-embed.js`, a setting whose `apiKeyEnv` names a variable that is unset or empty makes `embed()` throw before any request is spawned, with a reason that names the variable and never a value; `memory-index` and `memory-query` then rank lexically and record `MEMORY_EMBEDDINGS_FAILED` with that reason. Checked with a local HTTP server on `127.0.0.1` that counts requests: zero requests from `memory-index` and from `memory-query` with the variable unset, and zero with it set to an empty string; with it set, one request carrying `Authorization: Bearer {value}` (the control). A setting without `apiKeyEnv` still sends as configured. `embedPending` compares `url`, `model` and `dim` against `meta` and clears the vectors when any differs; `meta` stores `url`. A change of `url` alone makes the next index run embed every section again; an unchanged setting embeds nothing.
- **Handoff:** T-58E02 registers both cases under mutation control.
- **Notes:** The failing form of the credential case is the reproduction of 2026-11-13 (a 54-byte body with no `Authorization` header, answered 401). The recorded reason may contain the variable's name, the provider host and the HTTP status, and nothing of the section text or of a key.
- **Changes:** `lib/memory-embed.js`: `credentialProblem(setting, env)` (exported) names a variable that `apiKeyEnv` points to when it is unset, empty or blank, and `embed()` throws it before spawning any request, so `memory-index` and `memory-query` alike rank lexically and record the existing `MEMORY_EMBEDDINGS_FAILED` with that reason (the variable's name, never a value); a setting without `apiKeyEnv` is used as configured. `embedPending` compares `url` with `model` and `dim` against `meta` and clears the vectors when any differs, and `meta` stores `url`; `memory-query` answers lexically when the stored `url` is not the setting's, until the next index run re-embeds. Checked against a stub provider in its own process (requests counted in a log): key unset, empty and blank → 0 requests from the index run and from a query, one diagnostic naming the variable; key set → 57 requests carrying `Authorization: Bearer …` for 1,809 sections; vectors present then key removed → the query sends nothing and answers lexically; no `apiKeyEnv` → unchanged; a `url` change alone → a query before the index run is lexical, the run embeds all 1,809 sections again, a second run embeds 0. The reproduction of 2026-11-13 (a body with no `Authorization` header answered 401) now stops at "the environment variable PROBE_UNSET_KEY … is not set here, so nothing was sent", and the stub server sees no request. Memory harness cases 29 of 29. biome clean, C14 run.

### [T-58M04] Command table: `memory-query` lists `--offset` among its value options

- **Spec:** l2-artifact-memory-store.md §6 item 5 (the command-table entry); l2-engine-automation.md §Command Line Contract
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `skills/magicspec/scripts/lib/commands.js` lists `--offset` for `memory-query`, the executor's argument check accepts it and refuses an unknown option as before, and the harness case "every option an entry lists is read by its script" passes. `node skills/magicspec/scripts/executor.js memory-query --help` names `--offset`.
- **Handoff:** T-58D01 documents the option.
- **Changes:** `lib/commands.js`: `memory-query` lists `--offset` (value option, with its help line) among its options; the executor accepts it, still refuses an unknown option, and `memory-query --help` names it. Done together with T-58M02 because the executor's argument check refuses an option the table does not list, so the new paging could not be run through the executor without it. The harness's command-table cases pass (37 of 37 with T-58M02's). C14 run.

### [T-58W01] Consumer text: the five sites read the cited lines and page or narrow a cut list; the two card mirrors

- **Spec:** l2-artifact-memory-store.md §6 item 5 (the shipped text); l1-artifact-memory.md AM-3, AM-9; l2-role-cards-governance.md §1; l2-role-cards-execution.md §1
- **Status:** Done
- **Assignment:** Agent
- **Verify:** Each of `roles/spec-critic.md` (step 1, comparison set), `roles/planner.md` (step 6), `workflows/analyze.md` (Mode C step 7a), `workflows/fix.md` (step 5) and `workflows/spec.md` (Step 0.5, IK-2) says to read the cited lines rather than the file, and that when the query's first line counts more matches than it showed, the reader takes the page it names or narrows the query before treating the set as complete. The sentence about an unavailable index stays. The spec-critic and planner sentences are copied word for word into the mirrors in `l2-role-cards-governance.md` §1 and `l2-role-cards-execution.md` §1, each with a patch bump and a history row. `grep -n "read a cited section" skills/magicspec` returns nothing. C14 run after the edits.
- **Handoff:** T-58E01 writes the scenarios that read this text.
- **Changes:** The five sites now say "cites each with its lines; read the cited lines, not the file, before relying on a result. When the first line counts more matches than it showed, the list was cut: take the next page it names (`--offset`) or narrow the query … before treating the set as complete; when the query prints that the index is unavailable, search the text directly": the spec-critic card (step 1), the planner card (step 6, "search the entries"), Mode C step 7a of `analyze.md`, step 5 of `fix.md` ("the set of sites") and the IK-2 step of `spec.md` ("before concluding that the repository does not answer"). The two card mirrors follow word for word: `l2-role-cards-governance.md` 1.4.9 and `l2-role-cards-execution.md` 1.3.2, each with a history row and its registry cell; `check-prerequisites --verify-headers` reports no drift. `grep "read a cited section" skills` returns nothing. The fallback clause kept its lowercase "when …" so the harness's three shipped-text pins for it hold; the pins on the cite-then-read sentence were updated to the new wording. Related harness cases 82 of 82. C14 run.

### [T-58D01] Documentation: the new output line and `--offset` in the three pages that show `memory-query`

- **Spec:** l2-artifact-memory-store.md §5.4; l1-documentation-system.md (the pages the engine keeps in step)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `docs/README.md`, `docs/graph.md` and `docs/context-economy.md` show the first line with the counts, a result line with its lines and size, and `--offset`; `docs/graph.md` states that a remote provider whose `apiKeyEnv` variable is unset on a machine gets no text from it. No page names a specification file, a task identifier or a phase (SDD containment).
- **Handoff:** none.
- **Changes:** `docs/graph.md` section 6: the sample now shows the cut first line and a result with its lines and `~1.1k tokens`, the options table gains `--offset`, the "how to read it" bullet says to read the cited lines and what the size is (an estimate of the cost, not a saving), a paragraph says a cut list is incomplete until the next page is taken or the query narrowed, a new "Sharing it with a team" paragraph says the setting travels with the project, the key does not, and a machine without the variable sends nothing and ranks lexically with one warning naming it, and the re-send rule now lists the provider address with the model and dimensions; `docs/README.md` and `docs/context-economy.md` mention the lines, the size and the next page in their one-line descriptions (the full output sample lives in `graph.md` only). No page names a specification file, a task or a phase; the one file name in the sample (`l1-x.md`) is the pre-existing illustration.

### [T-58E01] The cognitive suite: the four scenarios the plan lists (T353–T356)

- **Spec:** PLAN.md Phase 58 Scenarios; l2-test-suite.md §Cognitive Test Suite
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `tests/suite.md` gains T353 (a review whose comparison set comes from a cut list takes the next page or narrows the query before it reports its set), T354 (a cited section is read by its lines, not by reading the whole file), T355 (a clone whose provider setting names a key it does not hold ranks lexically, sends nothing and records one diagnostic) and T356 (the control: a list that holds every match prints only its modes line and the reader does not page), each with its pass criteria, and the suite version is bumped with a history row.
- **Handoff:** T-58T01 runs the suite.
- **Changes:** `tests/suite.md` 1.9.104 → 1.9.105: T353 (a comparison set from a cut list takes the next page or narrows the query before it is reported; the control is a four-section term that prints only the modes line), T354 (a cited section is read by its lines, not by reading the plan or the registry), T355 (a clone whose setting names a key it does not hold sends nothing, ranks lexically and records one diagnostic, with the key-set control and the address change), T356 (the complete list is not annotated and not paged, with `--history` control); each with Synthetic State, Action, Expected, Control, Guards tested and Regression for. Run by `/magicspec-dev:test` in T-58T01.

### [T-58E02] The harness: §Artifact Memory Query Coverage, with controls and mutation entries

- **Spec:** l2-test-suite.md §Artifact Memory Query Coverage (mandatory)
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `tests/engine.js` has a case for each bullet of the section — the cut and its control, the location read back from the file (each part of a cut section), the size, the credential and its control, the identity, the shipped text of the five sites — run against both backends on a fixture copied with the engine. Each fix has a mutation entry (`scripts/mutation-check.js`) whose withdrawal turns at least one case red: the count line, the offset, the line columns, the size rounding, the credential guard, the `url` comparison. `node --test tests/engine.js` passes with the count up from 438; the mutation report shows every new entry CAUGHT or explains an equivalent mutant.
- **Handoff:** T-58T01.
- **Changes:** `tests/engine.js`: seven cases added (438 → 445). Cut list (needs SQLite): 25 sections of one name in force and 3 in history; the first line `modes: lexical · 1-10 of 25 in force, 3 more in history — next: --offset=10 (--k up to 50), --history for history`; the pages walked by `--offset` return the 25 sections once, ranks numbered from the offset, the last page names no next; `--history` and `--kind` drop the history count; past the end prints `0 of 25 …` and `No sections from 501; 25 matched.`; control: a two-section name prints only `modes: lexical` even with a history match behind it, and a name that matches nothing prints `No sections match.`; `--offset=-1`, `abc` and `1.5` exit 1; the fallback and SQLite give the same counts, pages and order in process. Location and size: exact lines on a small file ([1,4], [6,9], [14,16], [18,22]), every unit of six file shapes (a long cut section, a long table, a fenced block with a blank line, a front-matter file, leading blank lines and an indented first line, a file with no title) holds its lines line for line, a later part starts at its own first line and the first at the heading, `tokensOf` and `formatTokens` over a table of boundary values, and through the command the lines, the tokens, the text line and the file read back. Fused pool: a stub provider, pages of two equal the list of fifty in order, the pool does not depend on the page size, the first line counts `lexical matches + by meaning`. Credential: key unset, empty and blank send nothing from `memory-index` or `memory-query` (the provider's request log stays empty), one warning names `STUB_KEY` and never a value, control with the key set (`Authorization: Bearer …`, fused query), and vectors present with the key gone. Identity: only the address changes → a query before the next index run is lexical, the run embeds every section again, a second run embeds none. Layout: a database of the earlier layout is rebuilt empty at the new version, and on both backends a lines-only move keeps row and vector and updates the lines. Shipped text: the five readers carry the cited-lines sentence, the cut-list clause and the lowercase fallback clause (three older pins moved to the new wording; a fourth changed its modes-line pattern). The fixture code for three cases was extracted (`makeVectorFixture`, `memoryFindings`) and the older degraded-provider case reuses it. Mutation control (`scripts/mutation-check.js`, list kept outside the repository): 20 entries — the count line, the offset, the next page, the history count, the history count under `--kind`, the offset check, the line end, the first-part start, the later-part start, the size rounding, the credential guard, the blank key, the address comparison, the query-time address check, the fixed pool, the by-meaning count, the old reading rule, the fix workflow's clause, the stale lines on a move, the layout version — 20 CAUGHT, 0 SURVIVED, rerun after the refactor of `rank` and `splitBody`. Full harness 445 of 445. biome clean; fallow: no finding on the 31 changed files (the five reported are inherited).

### [T-58T01] Validation: harness, mutation checks, suite, static checks, C14, both backends, the kernel untouched

- **Spec:** l2-test-suite.md; l1-artifact-memory.md AM-2, AM-3, AM-7, AM-9
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `node --test tests/engine.js` all pass (the `ℹ pass` and `ℹ fail` counters pasted); the mutation driver over the new entries reports CAUGHT; `/magicspec-dev:test` cognitive pass over T353–T356; `biome check` on the changed files, `pnpm run typecheck` and `pnpm run audit` with no finding on code of this phase; `update-engine-meta --check` clean; `CONSTITUTION.md` still 16263 bytes; `memory-query` run once with `node:sqlite` and once with the fallback forced gives the same counts and pages; `sync --dry-run` writes nothing (Phase 55's case re-run).
- **Handoff:** T-58S01.
- **Changes:** Validation, all on Node 24.12 with SQLite and with the fallback forced. Harness: `node --test tests/engine.js` → `ℹ tests 445, ℹ pass 445, ℹ fail 0, ℹ skipped 0` (438 before the phase; 292 s). Mutation control: 20 entries (18 on the query, sections, embedding, text and 2 on the layout and the stale lines), 20 CAUGHT, 0 SURVIVED, 0 REFUSED, 0 RESTORE FAILED, rerun after the refactors. Cognitive pass over T353–T356 by reading the shipped text of the five sites against each Expected line: T353 PASS (the cut-list clause names `--offset`, a narrower query and the whole set before the `[Coherence]` line; the planner keeps `--history`), T354 PASS (the lines are cited and "read the cited lines, not the file" is the rule; reading neighbouring lines is not forbidden), T355 PASS (a missing key is not the "unavailable" line, so no workflow stops and nothing is asked; the digest groups findings by severity, source and code, so the index run's warning shows once), T356 PASS (no count on the first line means a whole list, and the text pages only on a counted cut). Static: biome clean on the 7 changed scripts and the harness; `pnpm run typecheck` clean; `pnpm run audit` reports no finding on the 31 changed files (the two it raised on code of this phase, `rank` and `splitBody`, and four duplicated fixture blocks were fixed: `scoresOf` with the existing `matchesFilters`, `atomsOf`, `makeVectorFixture`, `memoryFindings`; the five left are inherited). `update-engine-meta --check` clean at engine 3.0.142; `CONSTITUTION.md` 16263 bytes, unchanged. SQLite and fallback give the same counts, pages and lines (2,887 sections, 79 and 220 for the reference name; pages of 7 and 50 equal in lexical and fused mode). `sync --dry-run` writes no file (two writes listed, none made). The credential reproduction of 2026-11-13 stops before any request.

### [T-58S01] Spec sync: the store's §6 item 4 (f) and item 5 as built, the registry

- **Spec:** l2-artifact-memory-store.md §6; l1-artifact-memory.md; l2-test-suite.md; INDEX.md
- **Status:** Done
- **Assignment:** Agent
- **Verify:** `l2-artifact-memory-store.md` §6 item 4 (f) states the fixed fused pool instead of max(50, 5 × k), item 5 changes from "To deploy" to "As built (Phase 58)" with what the build decided, and its history gains a row; `l2-test-suite.md` records the harness and suite counts and the case IDs; the engine registry rows and versions match every file header (`check-prerequisites --verify-headers` clean); no requirement changed, so every specification stays Stable.
- **Handoff:** `/magicspec run` ends the phase with `finalize --workflow=run`, which archives the workbook.
- **Changes:** `l2-artifact-memory-store.md` 1.2.0 → 1.3.0: §5.4 records what the build fixed (no history count under `--kind` as well as `--history`, an unannotated list even with history behind it, the page past the end, the vector-mode first line, the size as the section's text, JSON `total` as the pool's size with `byMeaning`), §6 item 4 (f) records the fixed fused pool that replaced the per-call bound, item 5 changes from "to deploy" to "as built (Phase 58)" with the decisions of the build (the file lines and the front-matter title, `count` on both backends, the credential check in `embed()`, the query-time address check, the pages' ranks, the lowercase fallback clause, the harness and the mutation list); `l2-test-suite.md` 1.45.0 → 1.46.0: the coverage section as built (the cut case's name, the fused-pool and layout cases, 438 → 445, T353–T356, 20 entries caught). Registry rows and versions: store 1.3.0, test suite 1.46.0, the two card mirrors 1.4.9 and 1.3.2; engine registry 1.77.0 → 1.78.0 with its Last Updated entry, global registry 1.49.0 → 1.50.0. `check-prerequisites --verify-headers` reports no header drift; its one warning is the plan's `SYNC_GAP` against the new registry, recorded as the ledger's replan directive. No requirement changed: every specification stays Stable. The unit count in the store's note (13,531, six corpora) corrects the 13,531 first written in T-58M01's record.
