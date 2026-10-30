# Artifact Memory Store (SQLite)

**Version:** 1.0.0
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
- <!-- TBD: the first Node release that loads `node:sqlite` without a flag (believed 22.13 / 23.4) — verify against the release notes before the version check is written. -->
- **Assumption (forecast):** vectors are compared in process rather than through a loadable SQLite vector extension, because the extension is a per-platform native binary — the engine's first — and the corpus is small enough not to need it. Runner-up: load a vector extension when present. Override: `/magicspec:spec amend l2-artifact-memory-store.md "use a vector extension"`.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| AM-1 Derived and disposable | The database lives at `.magicspec/.cache/memory.sqlite` (the fallback at `.magicspec/.cache/memory.json`); `memory-index --rebuild` recreates it from the artifacts; the cache retention contract lists it as rebuildable. |
| AM-2 Section units with provenance | §5.2: one row per section with file, heading path, kind, status and version. |
| AM-3 Cite, then read | `memory-query` prints citations, a score and a snippet; it never composes an answer. |
| AM-4 Lexical always, semantic optional | FTS5 `bm25()` ranking always; vector ranking only with a configured provider; Reciprocal Rank Fusion when both; the output's first line names the modes. |
| AM-5 Fresh on use | A `files` table holds each file's SHA-256; `memory-query` re-indexes changed files first; `export-wiki` runs the indexer after the wiki. |
| AM-6 History stays history | Kinds `archive`, `history`, `retrospective`, `changelog` are filtered out unless `--history`. |
| AM-7 Local unless configured | No network call exists outside the provider adapter; an indexing run that uses a remote provider prints one line with the provider host and the number of sections sent. |
| AM-8 Never in the way | Any failure exits 0 with the finding `MEMORY_INDEX_UNAVAILABLE` recorded and a line telling the caller to use text search. |

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
    └── memory-embed.js    # optional provider adapter + cosine + RRF
```

### 5.2 Schema [REFERENCE]

```plaintext
meta(key TEXT PRIMARY KEY, value TEXT)            -- schema_version, backend, provider, model, dim
files(path TEXT PRIMARY KEY, sha256 TEXT, indexed_at TEXT)
sections(id INTEGER PRIMARY KEY, path TEXT, heading TEXT, kind TEXT,
         workspace TEXT, status TEXT, version TEXT, ordinal INTEGER, body TEXT)
sections_fts USING fts5(heading, body, content='sections', content_rowid='id',
                        tokenize='unicode61 remove_diacritics 2')
vectors(section_id INTEGER PRIMARY KEY, model TEXT, dim INTEGER, data BLOB)  -- Float32, optional
```

A schema version mismatch rebuilds the database.

### 5.3 Sectioning

- A section starts at each `##` or `###` heading; the heading path (`# Title › ## A › ### B`) is stored with it.
- A section over 2,000 characters is split at paragraph boundaries; every part keeps the heading path.
- A `Document History` table is its own section of kind `history`.
- Kinds by location: `specifications/` → `spec`; `RULES.md` → `rules`; `PLAN.md` → `plan`; `TASKS.md`, `tasks/` → `tasks`; `STATE.md` → `state`; `RETROSPECTIVE.md` → `retrospective`; `CHANGELOG.md` → `changelog`; `archives/` → `archive`; `INDEX.md` → `registry`.

### 5.4 Query

```plaintext
memory-query "<text>" [--kind=spec,rules] [--workspace=<ws>] [--k=10] [--history] [--json]

modes: lexical            (or: lexical + vector)
 1. 12.4  specifications/l1-x.md › ## 3. Core Invariants › X-4   (spec, Stable v1.2.0)
          … snippet with the match …
```

Hyphenated and dotted names are queried as phrases, so `check-prerequisites` matches the adjacent tokens. With a provider, the query text is embedded once and both rankings are fused by Reciprocal Rank Fusion with k = 60.

### 5.5 Provider Setting

```plaintext
workspace.json → "memory": { "embeddings": { "url": "...", "model": "...", "dimensions": 768 } }
```

Absent or empty: lexical only. The adapter speaks the widely implemented embeddings request shape (a JSON body with `model` and `input`). A provider failure leaves the lexical results intact and records a warning.

## 6. Implementation Notes

1. `lib/memory-sections.js` first, with tests over this repository's own state folder; then the fallback backend; then the SQLite backend, checked to return the same ordering as the fallback on a fixed corpus (ties aside).
2. The executor's command table gains both subcommands as reading commands (`memory-index` writes only the cache).
3. `export-wiki` calls the indexer last; its failure never fails the refresh.

## 7. Drawbacks & Alternatives

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
| 1.0.0 | 2026-10-29 | Agent | Created with `l1-artifact-memory.md` from the owner's request for SQLite vector memory. `node:sqlite` with FTS5 probed on Node 24.12 the same day. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
