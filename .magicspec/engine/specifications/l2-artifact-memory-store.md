# Artifact Memory Store (SQLite)

**Version:** 1.3.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-artifact-memory.md

## Overview

The Node implementation of the artifact memory index: a SQLite database opened through the runtime's built-in SQLite module, a full-text table with ranked search over section units, optional embedding vectors stored in the same database and compared in process, a pure-JavaScript fallback with the same results contract where the runtime has no SQLite module, and two executor subcommands — `memory-index` and `memory-query`. No package is added to the shipped engine.

## Related Specifications

- [l1-artifact-memory.md](l1-artifact-memory.md) - The concept and its invariants AM-1 to AM-8.
- [l2-spec-graph-memory.md](l2-spec-graph-memory.md) - The refresh (`export-wiki`) the indexer joins, and the extraction cache it sits beside.
- [l2-engine-automation.md](l2-engine-automation.md) - The executor's command table, the cache retention contract and the file lock the indexer uses.
- [l2-engine-diagnostics.md](l2-engine-diagnostics.md) - The finding the indexer records when it cannot work.

## 1. Motivation

The owner asks for SQLite with vectors. The runtime the engine already requires carries SQLite: Node's built-in `node:sqlite` module, whose bundled build includes the FTS5 full-text extension (verified 2026-10-29 on Node 24.12: an FTS5 table, a `MATCH` query and `bm25()` ranking work; the module still prints an experimental warning). Using it adds no dependency. Vector search does not need a native vector extension at this corpus size — thousands of sections — because a brute-force cosine comparison over them takes milliseconds in process.

## 2. Constraints & Assumptions

- The engine's stated runtime floor (Node 18) does not move: where `node:sqlite` is missing, the fallback serves the same contract.
- The SQLite module's experimental warning must not reach the workflow's output: the executor starts the indexer's child process with the runtime flag that disables experimental warnings, and only on a runtime that has both the module and the flag — an older runtime rejects an unknown flag and takes the fallback without it.
- **The backend is chosen by trying, not by a version table.** `node:sqlite` loads without a flag from Node 22.13 and 23.4 (it was added behind `--experimental-sqlite` in 22.5; checked against the Node documentation's history table, 2026-11-12), and a runtime can lack it or be built without FTS5, so the engine loads the module and creates the full-text table, and takes the fallback when either fails. No release number is compared anywhere.
- **Assumption (forecast):** vectors are compared in process rather than through a loadable SQLite vector extension, because the extension is a per-platform native binary — the engine's first — and the corpus is small enough not to need it. Runner-up: load a vector extension when present. Override: `/magicspec spec amend l2-artifact-memory-store.md "use a vector extension"`.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| AM-1 Derived and disposable | The database lives at `.magicspec/.cache/memory.sqlite` (the fallback at `.magicspec/.cache/memory.json`); `memory-index --rebuild` recreates it from the artifacts; the cache retention contract lists it as rebuildable. |
| AM-2 Section units with provenance | §5.2: one row per section with file, heading path, first and last line, kind, status and version. |
| AM-3 Cite, then read | `memory-query` prints citations with their lines, a score, the size estimate and a snippet; it never composes an answer (§5.4). |
| AM-4 Lexical always, semantic optional | FTS5 `bm25()` ranking always; vector ranking only with a configured provider; Reciprocal Rank Fusion when both; the output's first line names the modes. |
| AM-5 Fresh on use | A `files` table holds each file's SHA-256; `memory-query` re-indexes changed files first; `export-wiki` runs the indexer after the wiki. |
| AM-6 History stays history | Kinds `archive`, `history`, `retrospective`, `changelog` are filtered out unless `--history`. |
| AM-7 Local unless configured | No network call exists outside the provider adapter; an indexing run that uses a remote provider prints one line with the provider host and the number of sections sent. A setting whose `apiKeyEnv` names a variable that is unset or empty in this environment sends no request (§5.5). |
| AM-8 Never in the way | Any failure exits 0 with the finding `MEMORY_INDEX_UNAVAILABLE` recorded and a line telling the caller to use text search. |
| AM-9 A cut list says so | The first line of `memory-query` counts the matches in force and in history whenever it prints fewer than matched, and names the next `--offset`; the JSON output carries the same counts and the next offset (§5.4). |

## 5. Detailed Design

### 5.1 Modules

```plaintext
skills/magicspec/scripts/
├── memory-index.js        # builds / refreshes the index
├── memory-query.js        # ranked query, text or JSON output
└── lib/
    ├── memory-sections.js # markdown → section units (shared by both backends)
    ├── memory-sqlite.js   # node:sqlite + FTS5 backend
    ├── memory-fallback.js # pure-JS BM25 backend, same interface
    ├── memory-refresh.js  # open under the lock, refresh from the files, report a failure
    └── memory-embed.js    # optional provider adapter + cosine + RRF
```

### 5.2 Schema [REFERENCE]

```plaintext
meta(key TEXT PRIMARY KEY, value TEXT)            -- schema_version, backend, provider, model, dim
files(path TEXT PRIMARY KEY, sha256 TEXT, indexed_at TEXT)
sections(id INTEGER PRIMARY KEY, path TEXT, heading TEXT, kind TEXT,
         workspace TEXT, status TEXT, version TEXT, ordinal INTEGER,
         line_start INTEGER, line_end INTEGER, body TEXT)   -- lines: 1-based, inclusive
sections_fts USING fts5(heading, body, content='sections', content_rowid='id',
                        tokenize='unicode61 remove_diacritics 2')
vectors(section_id INTEGER PRIMARY KEY, model TEXT, dim INTEGER, data BLOB)  -- Float32, optional
```

A schema version mismatch rebuilds the database. The two line columns raise the schema version to 2 `[ADDED]`; the first run after the change rebuilds, and with a provider configured that run embeds every section again — once, announced by the sent-sections line.

**Lines of a section `[ADDED]`.** `line_start` is the line of the section's heading (for the first part of a section cut by §5.3) or of the part's first line; `line_end` is the part's last line. They are counted in the file as it is on disk, so the host's read of those lines returns the section; for the Document History table they span the table.

### 5.3 Sectioning

- A section starts at each `##` or `###` heading; the heading path (`# Title › ## A › ### B`) is stored with it.
- A section over 2,000 characters is split at paragraph boundaries; every part keeps the heading path.
- A `Document History` table is its own section of kind `history`.
- Kinds by location: `specifications/` → `spec`; `RULES.md` → `rules`; `PLAN.md` → `plan`; `TASKS.md`, `tasks/` → `tasks`; `STATE.md` → `state`; `RETROSPECTIVE.md` → `retrospective`; `CHANGELOG.md` → `changelog`; `archives/` → `archive`; `INDEX.md` → `registry`.

### 5.4 Query

```plaintext
memory-query "<text>" [--kind=spec,rules] [--workspace=<ws>] [--k=10] [--offset=0] [--history] [--json]

modes: lexical            (or: lexical + vector)
 1. 12.4  specifications/l1-x.md › ## 3. Core Invariants › X-4   (spec, Stable v1.2.0)
          … snippet with the match …
```

Hyphenated and dotted names are queried as phrases, so `check-prerequisites` matches the adjacent tokens. With a provider, the query text is embedded once and both rankings are fused by Reciprocal Rank Fusion with k = 60.

**Location, size and the cut `[ADDED]`.** Each result line gains its lines and a size estimate, and the first line gains the counts when the list is cut:

```plaintext
modes: lexical · 1-10 of 79 in force, 220 more in history — next: --offset=10 (--k up to 50), --history for history
 1. 12.4  specifications/l1-x.md:120-164 › ## 3. Core Invariants › X-4   (spec, Stable v1.2.0, ~1.1k tokens)
          … snippet with the match …
```

- The counts are of the sections that match the query under its filters (`--kind`, `--workspace`), before `--k` and `--offset` are applied; the history count is shown only when history is left out of the list, so neither `--history` nor an explicit `--kind` (which names exactly what the list holds) has one. A list that holds every match prints only `modes: …`, even when matches in history lie behind it. A page past the end prints `0 of {n}` in the first line and `No sections from {offset + 1}; {n} matched.`.
- `--offset=<n>` (new, default 0, a whole number) skips the first `n` results of the same ranking, so the rest is reachable at any size although `--k` stays capped at 50: the hint names the next offset, and the last page prints no hint. Ranks are numbered from the offset (`11.`, `12.` …). Walking the pages returns each section once only if every page ranks the same pool, so the fused pool no longer depends on `k`: it is every lexical match plus the top 250 of the vector ranking (the largest pool `--k=50` reached before, 5 × 50), replacing the per-call max(50, 5 × k) of §6 item 4 (f).
- In lexical mode a match is a section that holds at least one of the query's terms. A vector ranking orders every section and matches none, so with vectors the count is the size of the fused pool, printed as its two parts — `1-10 of 305 in force (79 lexical matches + 226 by meaning)`, where the second part counts the vector candidates that are not lexical matches; a caller that needs every section holding a name reads the lexical part. The history count stays the lexical one.
- The size is `ceil(chars / 4)` tokens, rounded to two significant figures and printed with `~`: the same approximation `l2-spec-graph-memory.md` §2 uses. It counts the section's text (its blank lines aside), not the file around it, and what reading costs, not a saving.
- The JSON output gains `total` (the size of the pool the pages are cut from: the lexical matches, and with vectors the by-meaning candidates besides), `byMeaning` (0 without vectors), `historyTotal` (null when history is included or `--kind` is given), `offset`, `next` (the next offset, or null on the last page), and per result `lines: [start, end]` and `tokens`.

### 5.5 Provider Setting

```plaintext
workspace.json → "memory": { "embeddings": { "url": "...", "model": "...", "dimensions": 768 } }
```

An optional `apiKeyEnv` names the environment variable that holds a bearer key; the key is never written to a project file. Absent or empty: lexical only. The adapter speaks the widely implemented embeddings request shape (a JSON body with `model` and `input`). A provider failure leaves the lexical results intact and records a warning.

**A credential this machine lacks `[ADDED]`.** `workspace.json` is committed, so every clone receives the setting. When `apiKeyEnv` is named and the variable is unset or empty in the environment of the run, the adapter makes no request: no section text leaves the machine, the run ranks lexically, and `MEMORY_EMBEDDINGS_FAILED` is recorded with the variable's name as its reason (never its value). The check is made before the first batch, in `memory-index` and in `memory-query` alike. A setting without `apiKeyEnv` is a provider that needs no key, and is used as configured.

**Vector identity `[ADDED]`.** Vectors are comparable only when the same `url`, `model` and `dimensions` produced them: one model name can be served by two endpoints that build it differently, and their vectors would rank against each other without error. A change of any of the three discards the stored vectors, as a change of model or size already does; `meta` records the `url` beside `model` and `dim`.

## 6. Implementation Notes

1. `lib/memory-sections.js` first, with tests over this repository's own state folder; then the fallback backend; then the SQLite backend, checked to return the same ordering as the fallback on a fixed corpus (ties aside).
2. The executor's command table gains both subcommands as reading commands (`memory-index` writes only the cache).
3. `export-wiki` calls the indexer last; its failure never fails the refresh.
4. **As built (Phase 54), no requirement changed.** (a) The index reads the Markdown files of the state folder whose location gives a kind (§5.3); the extraction cache, the graph folder with its wiki, and the generated `CONTEXT.md` are never read, because nothing derived may enter an index built from the artifacts (AM-1). A scenario file below `specifications/` is read as a specification by location, with its own header. (b) A section over 2,000 characters is cut at paragraph boundaries; a paragraph that alone exceeds the bound (a long table, a run of list items) is cut at its line boundaries, so a row or an item stays whole — measured on this repository, cutting at blank lines alone left 411 sections over the bound, one of 70 KB. (c) Queries join their terms by OR, not by FTS5's default AND, so a question of several words still finds the sections that hold some of them; BM25 ranks the fuller matches first. A hyphenated or dotted word, and a quoted stretch, are phrases of adjacent tokens. The tokenizer and the query parser are shared by both backends (`lib/memory-sections.js`), so they agree on what a word is. (d) `replaceFile` keeps the row, the id and the vector of a section whose heading and text did not change, so only changed sections are sent for embedding again. (e) The refresh, the lock and the failure report are one library (`lib/memory-refresh.js`) because both commands and the wiki export need them and a script must not require another script; the unavailable finding is `MEMORY_INDEX_UNAVAILABLE` and a failing or misconfigured provider is the separate warning `MEMORY_EMBEDDINGS_FAILED` (the index still answers lexically), both in [l2-engine-diagnostics.md](l2-engine-diagnostics.md) §5.4. (f) Embedding happens in `memory-index`, and so in the wiki refresh that calls it, not in `memory-query`: a query embeds only its own text, so the first query after a provider is configured is never a long upload, and a section edited since the last index run has no vector until the next one (its text is never answered stale: a changed section loses its vector at once). The query fused the two rankings over the top max(50, 5 x k) of each; Phase 58 replaced that bound, which moved with `--k` and so made pages of one query rank different pools, with every lexical match plus the best 250 vector candidates whatever `--k` is (§5.4). (g) A run of `export-wiki` with `--out` or `--from-file` does not touch the index: it belongs to the project's state folder. (h) The comparison-set searches of the specification check, the plan check and Mode C of the audit, and the intake investigation (IK-2) and the sibling-site search (FX-6), name `memory-query` first and a direct text search as the fallback; the plan check adds `--history` for archived phases, the others keep history out. The product's code is searched as text, because the index covers the state folder only. (i) The command table gains the entry field `usesSqlite`, and the executor starts such a command with `--disable-warning=ExperimentalWarning` only when the runtime lists that flag.

5. **As built (Phase 58), no requirement changed `[ADDED]`.** Found by a reference-mining pass of 2026-11-13 and checked against the engine as it then was (3.0.136):
   (a) *The cut.* `memory-query "check-prerequisites"` prints ten results and no count, while the index holds 79 matching sections in force (52 specification, 13 plan, 8 registry, 4 task, 2 constitution) and 220 in history. (b) *The location.* The JSON result carries `file` and `heading` only, so the reader finds the section by reading the file. (c) *The credential.* `embed()` reads the named variable and posts the request whether or not it holds a value: a local server received the 54-byte body `{"model":"m","input":["…"]}` with no `Authorization` header and answered 401; `embedPending` sends one batch of up to 32 sections (6,000 characters each at most) per refresh before it stops, and every later refresh sends it again. (d) *The identity.* `embedPending` compares `model` and `dim` only; a changed `url` keeps the vectors.
   The shipped text that tells the reader what to do with a result changes with the output: the comparison-set steps of `roles/spec-critic.md` and `roles/planner.md`, Mode C step 7a of `workflows/analyze.md`, step 5 of `workflows/fix.md` and the IK-2 step of `workflows/spec.md` read "read the cited lines" and, when the first line counts more matches than were shown, "take the next page it names, or narrow the query, before treating the set as complete". The missing credential is one more `{reason}` of the existing `MEMORY_EMBEDDINGS_FAILED` message (`The embeddings provider could not be used: {reason}`, [l2-engine-diagnostics.md](l2-engine-diagnostics.md) §5.4), so no diagnostic code is added. The executor's command-table entry for `memory-query` gains `--offset` among its value options ([l2-engine-automation.md](l2-engine-automation.md) §Command Line Contract).
   **What the build decided.** (e) `lib/memory-sections.js` records, for each block of a file, the file line of its heading and of every body line, so a unit's `lineStart` and `lineEnd` are exact; in a file that opens with a front-matter block the title stands in the middle of the first block, so the range of that block includes the title line. Verified on 13,531 units of this repository's state folder and five consumer corpora (the lines hold the unit's text line for line), with the text and order of the units unchanged. Schema version 2 rebuilds an index of the earlier layout once. (f) Both backends gained `count(phrases, options)` beside `query`, over the same filters, so the counts and the pages agree; the fallback ranks once and slices. (g) The credential check is the first line of `embed()` (`credentialProblem`), so it holds for the index run and the query alike and for any future caller; a setting without `apiKeyEnv` is used as configured. A query also answers lexically when the stored `url` differs from the setting's, until the next index run embeds again. (h) `memory-query` prints the pages' ranks from the offset; `--offset` that is not a whole number, 0 or more, is refused like a bad `--k`. (i) The five sites keep their lowercase fallback clause ("; when the query prints that the index is unavailable, search …") after the new cut-list clause. (j) The harness gained seven cases (438 to 445) and the cognitive suite T353 to T356, under a mutation list of 20 entries that were all caught; documentation: `docs/graph.md` section 6 shows the new output, the paging and, for a team, that the setting travels with the project and the key does not.

## 7. Drawbacks & Alternatives

- **Vectors kept apart from the index, by content** — not taken now: a store keyed by the hash of the embedded text and the vector identity would survive `--rebuild`, a schema change and a damaged file without sending the corpus again (one project in the collection keeps such a cache, one file per vector identity). Measured here, a full embedding sends about 2,900 sections, half of them history; the cost is one upload per rebuild, rare by design. Revisit when a rebuild is observed to be frequent. `[ADDED]`
- **Experimental runtime module.** The fallback covers a removal or a change; the backend is behind one interface.
- **A third-party SQLite binding** — rejected: a native dependency in the shipped engine.
- **A separate vector database** — rejected: a service to run, for a corpus that fits in memory.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[EXPORT-WIKI]` | `skills/magicspec/scripts/export-wiki.js` | The refresh the indexer joins. |
| `[GRAPH-CACHE]` | `skills/magicspec/scripts/graph-cache.js` | The extraction cache beside which the index lives. |
| `[FILE-LOCK]` | `skills/magicspec/scripts/lib/file-lock.js` | Serializes concurrent indexers. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.3.0 | 2026-11-13 | Agent | **As built in Phase 58, Stable retained.** §5.4 records what the build fixed: the history count absent under `--kind` as well as `--history`, the page past the end, the vector-mode first line, the size as the section's text, and the JSON `total` as the pool's size with `byMeaning`; §6 item 4 (f) records the fixed fused pool that replaced the per-call bound; item 5 moves from "to deploy" to "as built" with the decisions of the build (the file lines, `count` on both backends, the credential check in `embed()`, the query-time address check, the harness and the mutation list). No requirement changed. |
| 1.2.0 | 2026-11-13 | Agent | **Follows `l1-artifact-memory.md` 1.1.0** (second reference-mining pass). §4 rows AM-2, AM-3, AM-7 and the new AM-9; §5.2 adds `line_start`/`line_end` (schema version 2, one rebuild); §5.4 adds the lines, the size estimate, the counts of a cut list and `--offset` for the next page (`--k` stays capped at 50), in text and JSON; §5.5 adds the missing-credential rule and the vector identity (`url` with `model` and `dimensions`); §6 item 5 records the four reproduced gaps and the shipped text that changes with them; §7 records the content-keyed vector store as not taken now. Specification only; deployment through `/magicspec plan`. |
| 1.1.0 | 2026-11-12 | Agent | **As built in Phase 54, Stable retained.** §2: the open question of the first release that loads the module without a flag is settled (22.13 and 23.4, checked against the Node documentation) and the backend is chosen by trying the module and an FTS5 table, never by a version. §5.1 lists `lib/memory-refresh.js`; §5.5 gains the optional `apiKeyEnv`; §6 gains item 4 with the decisions of the build (what the index reads, the cut of a long table, OR terms, id-preserving replacement, where embedding happens, the two diagnostic codes, the skipped export runs, the wired consumers, the command-table field). No requirement changed. |
| 1.0.1 | 2026-10-30 | Agent | **Reality sync: the printed command form** is `/magicspec <command>` ([l1-command-surface.md](l1-command-surface.md) CS-2); the earlier colon spelling is rewritten wherever the text prints a command. No requirement changed. |
| 1.0.0 | 2026-10-29 | Agent | Created with `l1-artifact-memory.md` from the owner's request for SQLite vector memory. `node:sqlite` with FTS5 probed on Node 24.12 the same day. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
