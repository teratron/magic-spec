# Spec Graph Memory & Token Economy

**Version:** 1.2.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

Three adapters that reduce token cost and rebuild time for the Specification Knowledge Graph subsystem, ported from the external reference project: per-file extraction cache with frontmatter-aware hashing, Wikipedia-style wiki export for agent navigation, and token-budget truncation on the MCP `query_graph` tool. The subsystem describes how specifications relate and holds none of their wording, so the specification also states which questions it answers and which it does not (§4.5).

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Parent L1 contract for the engine.
- [l2-engine-automation.md](l2-engine-automation.md) — Automation scripts registry (extended by this spec).
- [l2-engine-templates.md](l2-engine-templates.md) — The registry `Description` is a router, not an index of contents (§5.3 there); §4.5 here is the route for content questions.
- [l2-test-suite.md](l2-test-suite.md) — Coverage of the §4.5 routing sentence and its cognitive cases.

## 1. Motivation

The Spec Graph subsystem (`build-spec-graph.js`, `serve-spec-graph.js`) already converts `.design/` artifacts into a navigable graph, but three gaps remain:

1. **Every build re-parses every spec file**, even when only YAML frontmatter (`Version`, `Last Updated`, `Status`) changed. As `.design/` grows, this becomes the dominant cost of `build-spec-graph` invocations.
2. **Agents still read raw specs** when answering architecture questions — there is no intermediate "agent-friendly" navigation layer that gives a community summary + god-node map in a fraction of the tokens.
3. **The MCP server returns unbounded results**. As the graph grows, a single `query_graph` call can blow past the agent's context budget.

The three mechanisms below address each gap independently and compose cleanly — all three are opt-in and do not affect existing graph consumers.

A fourth gap shows only on a large corpus. The graph and the wiki are structural by design, yet shipped text sends every "what covers Z" question to them. A question about content cannot be answered from structure, and in a consumer project of 325 specifications the hand-written registry `Description` had become the substitute: an inventory of each specification's mechanics, far longer than the registry can carry (§4.5, [l2-engine-templates.md](l2-engine-templates.md) §1).

## 2. Constraints & Assumptions

- The graph and the wiki carry structure — nodes, layers, status, versions, references, enforced conventions, edges — and no specification text. No field of a graph node or wiki article holds a specification's wording, and §4 adds none (§6).
- Pure-Node, zero new npm dependencies (stays aligned with `l2-engine-automation.md`).
- Cache lives under `$designDir/.graph-cache/` (workspace-scoped, not committed).
- Wiki output lives under `$designDir/wiki/` (deterministic, regenerable).
- Frontmatter-aware hashing applies **only** to `.md` specs; `.json` / `.js` are hashed in full.
- Token budget is an approximation: `chars ≈ tokens × 4` (industry heuristic).

## 3. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| C1 — Kernel integrity (checksums) | New scripts are registered in `.magic/.checksums` via `generate-checksums` after write. |
| C14 — Automatic meta-updates on engine changes | New scripts under `.magic/scripts/` trigger `update-engine-meta` → version bump + `.checksums` regen. |
| C21 — Project ventilation for consistency | Wiki export failures surface as warnings in `analyze` coverage audit; cache mismatches are detected on next full build. |
| C23 — Context Economy & Validation Caching | Extraction cache is the file-level analogue of C23's turn-aware caching; token-budget enforces economy on MCP reads. |

## 4. Detailed Design

### 4.1 Per-File Extraction Cache

**Module:** `.magic/scripts/graph-cache.js`

**Goal:** skip the parse step in `build-spec-graph.js` when a spec file's *body* hasn't changed, even if frontmatter-like fields have.

**Hashing rule:**

- For `.md`: SHA-256 of the file body after stripping a leading YAML frontmatter block (`---` / `---`). For SDD specs that don't use YAML frontmatter, the hash degrades to SHA-256 of full content.
- For all other suffixes: SHA-256 of the full raw bytes.
- The hash is combined with the workspace-relative path (so cache entries are portable across machines).

**Storage:** `$designDir/.graph-cache/{hash}.json`. One entry per extracted spec file. Value shape:

```json
{ "refs": ["..."], "parent": "l1-...", "conventions": [14, 23] }
```

Exactly matches the return shape of `parseSpecBody()` in `build-spec-graph.js`.

**API:**

```javascript
// graph-cache.js exports
fileHash(absPath, rootDir)       -> string           // SHA-256 hex
cacheDir(designAbs)              -> string           // ensures directory exists
loadCached(absPath, designAbs)   -> object | null    // null on miss/corruption
saveCached(absPath, result, designAbs) -> void       // atomic write via .tmp rename
clearCache(designAbs)            -> number           // deletes all entries, returns count
```

**Integration point:** `build-spec-graph.js → extractSpecDetails()`. Before calling `parseSpecBody(specPath)`, try `loadCached()`; on hit, use the cached dict directly. On miss, call `parseSpecBody()` and `saveCached()` the result.

**Invalidation:** no TTL. Cache is keyed by content hash, so any body edit produces a new hash and a fresh entry. Stale entries are orphaned but harmless; `clearCache` is available for manual reset.

**Opt-out:** `--no-cache` CLI flag on `build-spec-graph`.

### 4.2 Wiki Export

**Module:** `.magic/scripts/export-wiki.js`

**Goal:** generate a navigable, agent-friendly knowledge map in Markdown — one index file + one page per workspace, per L1 spec (god-node analogue), and per L2 spec cluster.

**Inputs:** `build-spec-graph --json` output (or cached `graph.json` if `--from-file` is passed).

**Outputs:** `$designDir/wiki/`

- `index.md` — entry point. Lists all workspaces with spec counts + god-nodes (top-N by degree) as a navigation catalog.
- `{workspace}.md` — one per workspace. Lists contained specs grouped by Layer, with cross-workspace bridge specs flagged.
- `spec__{workspace}__{spec-slug}.md` — per-spec article: canonical references, implements chain, enforced conventions, neighbors grouped by edge relation.

**Cross-links:** every reference uses Obsidian-style `[[wiki-link]]` so tools like Obsidian, VS Code Markdown preview, and LLM agents can traverse without disk scans.

**Invocation:**

```bash
node .magic/scripts/executor.js export-wiki             # regenerate from fresh build
node .magic/scripts/executor.js export-wiki --from-file .design/spec-graph.json
node .magic/scripts/executor.js export-wiki --out .design/wiki    # explicit out dir
```

**Agent contract:** after this spec lands, `CLAUDE.md` and `magic.analyze` can recommend "read `.design/wiki/index.md` before scanning raw specs" — for structural questions; a content question takes the route of §4.5.

### 4.3 Token-Budget Truncation on `query_graph`

**Module:** `.magic/scripts/serve-spec-graph.js` (modification).

**Goal:** bound MCP `query_graph` output at a caller-specified token limit.

**Design:**

- `query_graph` schema gains `token_budget: { type: 'number', default: 2000 }`.
- Results are serialized as JSON and truncated at `chars = budget × 4` before return. Truncation appends a `"... (truncated to ~{budget} tokens)"` suffix so the agent knows the result was cut.
- Existing `limit` parameter stays; `token_budget` is a second, orthogonal cap.

**Why not change all tools?** `query_graph` is the only tool with unbounded output variance (label-match returns vary wildly). `get_node`, `get_neighbors`, `shortest_path`, `god_nodes` are naturally bounded by their inputs. Keeping the change minimal reduces surface area.

### 4.4 Workflow Integration Triggers

The cache (§4.1), wiki (§4.2), and graph data are subsystems with no value unless workflows refresh them at the right moments. This section defines the trigger policy.

**Canonical refresh command:** `node .magic/scripts/executor.js export-wiki`

This single call internally invokes `build-spec-graph --json`, which transparently populates `.graph-cache/`. It then writes the refreshed wiki under `$designDir/wiki/`. One process spawn refreshes all three artifacts (cache, in-memory graph, wiki). Cost on a warm cache is dominated by I/O — typically <1s for `.design/` of <100 specs.

**Trigger classes:**

| Class | When | Workflows | Action |
| --- | --- | --- | --- |
| **Write-side** | After any mutation of `.design/` artifacts that contribute graph nodes/edges (specs, PLAN.md phases, RULES.md conventions, INDEX.md entries) | `spec.md` (Creating, Updating, Batch Stabilization), `task.md` (after writing PLAN/TASKS), `analyze.md` (Mode A/B/D after dispatch), `rule.md` (after RULES.md write) | Run canonical refresh **once per workflow invocation**, post-dispatch, before the Task Completion Checklist. |
| **Read-side** | Before architectural reasoning (impact analysis, planning, audit) | `task.md` (planning), `run.md` (impact check), `analyze.md` (Mode C) | For structural questions (§4.5) prefer reading `$designDir/wiki/index.md` over scanning raw `.design/specifications/`. If the MCP graph server is running (see [`l2-spec-graph-memory.md` §4.3](#43-token-budget-truncation-on-query_graph)), use `query_graph` with a bounded `token_budget`. |
| **Audit-side** | Periodic consistency checks | `analyze.md` Mode C step 6 | Already runs `build-spec-graph` (full mode). Additionally compares `wiki/index.md` mtime against `.design/specifications/**/*.md` and `.design/{ws}/PLAN.md` mtimes; if any source is newer → emit `WIKI_STALE` advisory. |
| **Visual** | Explicit user request | `analyze.md` (`--html` flag), future `magic.dev.graph` skill | Run `build-spec-graph --html [path]`. Never auto-generated. |

**Anti-trigger policy** (do NOT refresh on these):

- `magic.run` task execution loops — code changes don't affect spec graph; refreshing per-task wastes process spawns.
- Read-only modes (`analyze.md` Mode C without dispatch, `spec.md` Explore Mode) — no mutation occurred.
- `magic.rule` patch-only edits (typo fixes that don't add/remove rule entries) — graph extracts rule **count**, not text content.

**Failure handling:** the refresh call is best-effort. If `export-wiki` fails (e.g., malformed spec frontmatter), the workflow MUST log the failure as a non-blocking warning and continue. Stale wiki is a degraded but functional state — blocking the workflow on graph refresh would convert a warning into an outage.

**Cache hygiene:** the per-file extraction cache accumulates orphaned entries when specs are renamed or deleted. `graph-cache.js` exports `clearCache(designAbs)` to reclaim that disk, but no workflow step calls it, so reclaiming is a manual act. Entries are keyed by the hash of the file body, so an orphaned entry costs disk only and never produces a stale hit.

### 4.5 Question Routing: Structure Versus Content

The graph, the wiki and the MCP tools describe how specifications relate and hold none of their wording (§2). Two kinds of question therefore take different routes:

| Question | Route |
| --- | --- |
| **Structure** — what depends on X, how X relates to Y, which specifications are load-bearing, what is orphaned, what implements an L1 specification | The graph and the wiki (§4.2, §4.4). |
| **Content** — which specification covers mechanic M, where parameter P is defined, whether a mechanism already exists (whether a *rule* exists is checked in `RULES.md`, as `rule.md` already requires) | Search the specification text (`.design/{workspace}/specifications/`) for M, then read the matching section. Neither the graph, the wiki nor the registry `Description` is an index of contents ([l2-engine-templates.md](l2-engine-templates.md) §5.3). |

Nothing here changes what `export-wiki` or `build-spec-graph` write. Measured on a consumer project's registries (325 specifications), the hand-written cell had become an inventory of mechanics with a median of 87 distinct terms: 94% of those terms are found in the specification's own text, but only 12% in its `Overview` paragraph and 20% in the `Overview` plus its headings. A search of the text therefore recovers what the cell carried, with the current wording instead of a copy that goes stale; a summary derived from the `Overview` and the headings would not (§6).

Surfaces that carry the routing when it is deployed:

| Surface | What it states |
| --- | --- |
| `rules/magic.md` §2 Auto-Use (and its hardlinked twin, **[C-001]**) | The clause that today sends "what covers Z" to the graph gains the split above: structure to the graph and the wiki, a mechanic named in the question to the specification text. `rules/` is outside C14's version and checksum tracking |

## 5. Implementation Notes

1. `graph-cache.js` must be written first — both `build-spec-graph.js` (cache integration) and future callers depend on it.
2. `build-spec-graph.js` integration is one point of change — only `extractSpecDetails` calls `parseSpecBody`.
3. `export-wiki.js` is independent of cache work — it consumes the already-built graph.
4. `serve-spec-graph.js` change is isolated to `query_graph` dispatch.
5. No change to `executor.js` is required — it auto-resolves `{script-name}.js` in `.magic/scripts/`.
6. Follow C14 after all writes: `node .magic/scripts/executor.js update-engine-meta`.

## 6. Drawbacks & Alternatives

- **Cache storage under `$designDir`** — alternative was `/.graph-cache/` at repo root. Chose workspace-scope for parity with `.design/spec-graph.html` and to keep cache invalidation local to workspace resets.
- **Obsidian-style `[[links]]`** — alternative was standard Markdown links.
- **A summary generated into each wiki article (rejected)** — the first paragraph of the `Overview`, optionally with the section headings, written by `export-wiki` so the registry cell can stay short. Measured recall of the registry-cell vocabulary (§4.5): 12% from the paragraph, 20% with the headings, against 94% for the text itself. It would add a field to the extraction cache's value shape — and, because entries are keyed by body hash and never invalidated, every unchanged specification would keep its old entry without the field until it was edited — and a text field to every graph consumer's payload, to recover a fifth of what a search recovers whole.
- **Specification text in graph nodes (rejected)** — the graph is read by agents for structure; adding wording to every specification node (325 in the corpus measured) would enlarge every `build-spec-graph --json` read and make `diff-spec-graph` report every wording edit.
- **Token-budget as JSON truncation** — arguably produces invalid JSON. Alternative was structured pagination. Chose truncation because `query_graph` results are already agent-consumed prose-style; invalid JSON is still informative text for an LLM and the truncation sentinel is explicit.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CACHE]` | `.magic/scripts/graph-cache.js` | Extraction cache module — hash, load, save. |
| `[BUILD]` | `.magic/scripts/build-spec-graph.js` | Graph builder that integrates the cache. |
| `[WIKI]` | `.magic/scripts/export-wiki.js` | Wiki generator from `graph.json`. |
| `[SERVE]` | `.magic/scripts/serve-spec-graph.js` | MCP server — hosts the token-budget-aware `query_graph`. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.2.0 | 2026-10-06 | Agent | New §4.5 **Question Routing**: the graph and the wiki answer structural questions and hold no specification text; a content question — which specification covers a mechanic — is answered by searching the specification text, and the registry `Description` is not an index of contents. Measured on a consumer project (325 specifications): the vocabulary of the hand-written registry cells is 94% in the specifications' text, 12% in their `Overview` paragraph, 20% with the headings, so a summary generated into the wiki is rejected (§6) and `export-wiki` and `build-spec-graph` are unchanged. Shipped-text change deferred to deployment: the "what covers Z" clause of `rules/magic.md` §2. Status reverted `Stable → RFC` (Amendment Rule, minor); re-promoted to `Stable` after the Post-Update Review in the same invocation. |
| 1.1.4 | 2026-09-30 | Agent | Clarification patch, no status transition: the cache-hygiene paragraph named a `magic.spec --audit --fix` healing path that calls `clearCache()`; neither exists — `--fix` is not an argument and no workflow step calls `clearCache()`. The paragraph now states what is true: the function is exported, reclaiming is manual, and entries keyed by body hash cannot yield a stale hit. No contract change. |
| 1.1.3 | 2026-09-30 | Agent | Clarification patch, no status transition: Implementation Notes step 6 passed `--workflow build-spec-graph,serve-spec-graph,graph-cache,export-wiki` to `update-engine-meta`, which reads only `--check`; the command is now bare (see l2-engine-automation.md 1.18.0 §Engine Meta Update Flow). |
| 1.1.2 | 2026-08-07 | Agent | Normalized `**Layer:**` field from `2` to `implementation` — the only L2 spec in the registry using the numeric form instead of the project convention (15/15 other L2 specs unaffected, all already `implementation`); no logic change (ventilation finding). |
| 1.0.0 | 2026-04-24 | Agent | Initial spec. Adapts mechanisms: extraction cache, wiki export, token-budget MCP. |
| 1.1.0 | 2026-04-25 | Agent | §4.4 Workflow Integration Triggers: canonical refresh command, write/read/audit/visual classes, anti-trigger policy, failure handling, cache hygiene. |
| 1.1.1 | 2026-06-10 | Agent | Promoted RFC → Stable: all four design sections verified implemented (graph-cache.js, export-wiki.js, serve-spec-graph.js token_budget, §4.4 workflow triggers). Removed stale benchmark.js references. |
