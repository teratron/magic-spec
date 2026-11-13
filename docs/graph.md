# Graph — Specification Knowledge Graph

This document explains the Graph workflow, which turns the `.magicspec/` artifact set into a navigable graph and reports what the structure reveals.

## 1. Overview

Specifications accumulate relationships that no single file shows: which spec everything depends on, which files no spec claims, which Layer 2 spec lost its parent link, where the real module boundaries sit versus where the workspace config says they sit. The Graph workflow extracts those relationships and reports them.

**Analysis triggers:** `/magicspec graph`, *"Build graph"*, *"Spec graph"*, *"Graph analysis"*, *"Knowledge graph"*, *"Community detection"*, *"Workspace discovery"*.

**Visualization triggers:** *"Visualize graph"*, *"Graph HTML"*, *"Show graph"*, *"Open graph visualization"*.

> **Self-contained workflow**: unlike the other commands, `workflows/graph.md` carries its own implementation rather than pointing at an engine body in `skills/magicspec/`.
>
> **Read-only**: this workflow modifies no `.magicspec/` artifact. Findings hand off to the Spec or Rule workflows.

## 2. Node Types

The graph is built from `.magicspec/` and the files specifications claim:

| Type | Source |
| --- | --- |
| **Workspace** | Entries in `workspace.json` |
| **Spec** | Files in `{workspace}/specifications/` |
| **File** | Paths listed in a spec's `Canonical References` |
| **Convention** | `C{n}` headings in `RULES.md`, linked to the specs that cite them |
| **Phase** | Phase entries from the plan |

## 3. Analysis

```bash
node skills/magicspec/scripts/executor.js build-spec-graph
```

Reports:

- **God Nodes** — the highest-degree nodes; architectural hotspots. A god node whose status is not `Stable` is flagged `PRIORITY_SPEC`: the project leans on it while it is still provisional.
- **Coverage stats** — per workspace: spec count, files covered against files in scope.
- **Orphaned files** — inside a workspace `scope` but claimed by no spec's `Canonical References`. Each is a coverage gap candidate.
- **Missing Implements** — Layer 2 specs with no `Implements:` link to a parent. The layer hierarchy is broken at that point.
- **Bridge specs** — specs referencing files across more than one workspace. Either the spec should be extracted, or the boundary is drawn wrong.
- **Orphaned conventions** — rules in `RULES.md` that no specification cites. Not necessarily dead, but untraceable.

An extraction cache keyed on file content makes repeat runs cheap; unchanged specs are not re-parsed, and the entries of files that changed or disappeared are removed after each build.

To clear every cache the engine can rebuild — that extraction cache, the wiki, the page and the query snapshot of the graph, the artifact index of section 6, and the state files of `finalize` and, in the engine's own repository, of the project-metadata and documentation syncs — run:

```bash
node skills/magicspec/scripts/executor.js clean-cache --dry-run   # list each path with its size; remove nothing
node skills/magicspec/scripts/executor.js clean-cache             # remove them
```

The command asks nothing: each cache is rebuilt by the command that owns it. It never removes recorded findings, feedback notes, saved graph baselines or the migration backups in the project root; it lists the backups with their age and the command that deletes one by hand.

## 4. Community Detection

```bash
node skills/magicspec/scripts/executor.js detect-communities --include-md
```

Label propagation over the combined code and markdown dependency graph finds clusters that actually cohere, then scores each against the declared workspace boundaries.

- **Community listing** — node count, cohesion, and best-matching workspace with a Jaccard score.
- **Workspace alignment** — average Jaccard per workspace, signalled `WELL ALIGNED` or `LOW ALIGNMENT`.
- **`BOUNDARY_DRIFT`** — any community scoring below 0.3 against its best workspace: its members are not where the config says they are.
- **Split suggestions** — a community exceeding a quarter of the graph is partitioned further, and the sub-clusters are proposed as workspace names.

> Read the alignment score in context. A single-workspace project whose `scope` covers the whole repository will always score low, because every cluster is a small fraction of one large declared set. Low alignment is a signal to investigate, not a defect by itself.

## 5. Wiki Export

```bash
node skills/magicspec/scripts/executor.js export-wiki
```

Generates `.magicspec/graph/wiki/` — a per-spec article set with an index, linked in the style of a wiki. Agents navigating the wiki obtain layer, status, version, and references at a fraction of the token cost of reading raw specification files.

The wiki is a derivative artifact: any specification, plan, or rules change invalidates it. Re-export after writing to `.magicspec/`. An audit reports `WIKI_STALE` when the index is older than its sources. Each export also refreshes the artifact index of section 6 as its last step.

## 6. Artifact Index

The graph answers questions about structure. Questions about content — *which specification already defines the retry rule*, *has a decision about the lock been recorded* — are answered by searching the text, and the text is large. `memory-query` searches it for you: it finds the sections of your specifications, rules, plan, tasks and decisions that bear on a question, ranked, each with its file, its heading, the lines it occupies and what reading it costs.

```bash
node skills/magicspec/scripts/executor.js memory-query "retry rule"
node skills/magicspec/scripts/executor.js memory-query "check-prerequisites" --kind=spec,rules --k=5
node skills/magicspec/scripts/executor.js memory-query "check-prerequisites" --offset=10   # the next page
node skills/magicspec/scripts/executor.js memory-query "retry rule" --history --json
node skills/magicspec/scripts/executor.js memory-index              # build or refresh the index
node skills/magicspec/scripts/executor.js memory-index --rebuild    # delete it and build from nothing
```

```plaintext
modes: lexical · 1-10 of 79 in force, 220 more in history — next: --offset=10 (--k up to 50), --history for history
 1. 12.4  .magicspec/ws/specifications/l1-x.md:120-164 › ## 3. Core Invariants › X-4   (spec, Stable v1.2.0, ~1.1k tokens)
      … a failed call is retried three times with a pause …
```

When every match fits, the first line is only `modes: lexical`. When the list is cut, the first line says how many sections matched in force, how many more matched in history, and the `--offset` that returns the next page (`--k` stays at 50 or less, so a long list is read in pages). Treat a cut list as incomplete: take the next page, or narrow the query with a more specific name, `--kind` or `--workspace`, before you rely on the set.

| Option | Effect |
| --- | --- |
| `--kind=spec,rules` | Keep only these kinds: `spec`, `rules`, `plan`, `tasks`, `state`, `registry`, and the history kinds `archive`, `history`, `retrospective`, `changelog` |
| `--k=10` | Most results to print, 1 to 50 |
| `--offset=0` | Results to skip, for the next page of a cut list; the first line names the next offset |
| `--history` | Include archives, history tables, retrospectives and changelogs, which are left out otherwise |
| `--json` | The same results as data |
| `--workspace={name}` | Only that workspace's sections |

How to read it:

- **A result is a citation, never an answer.** It names the section, the lines of the file it occupies, its kind (and status and version for a specification), a score, a size estimate and a snippet. Read the cited lines, not the file, before relying on it: the index finds, the text decides. The size is the section's characters over four, to two significant figures: what reading that section costs, not a saving.
- **It reads the state folder only** — the Markdown of `.magicspec/` — not your product's code, and not what the engine derives from it (the graph folder, the caches, the generated context).
- **It is always current.** A file whose content changed is re-indexed before a query answers, so no result comes from a stale section; unchanged files are not read again. `export-wiki` refreshes the index after the wiki, so one refresh keeps graph, wiki and index current.
- **It is disposable.** The index lives in `.magicspec/.cache/` (`memory.sqlite`, or `memory.json` where the runtime has no SQLite module) and is rebuilt from your files at any time; `clean-cache` removes it and nothing is lost.
- **It is never in the way.** If the index cannot be built or opened, the command still exits 0, records a warning for the next `finalize` digest and prints one line telling you to search the text directly.

### Semantic search (optional)

Out of the box the ranking is lexical: it works on every installation and sends nothing anywhere. To add search by meaning, configure an embeddings provider in `.magicspec/workspace.json`:

```json
{
  "memory": {
    "embeddings": {
      "url": "https://example.com/v1/embeddings",
      "model": "your-model",
      "dimensions": 768,
      "apiKeyEnv": "EMBEDDINGS_API_KEY"
    }
  }
}
```

The provider must answer the widely implemented request: a JSON body with `model` and `input` (a list of texts), returning `{"data": [{"embedding": [...]}]}`. `apiKeyEnv` is optional and names an environment variable that holds a bearer key; the key itself is never written to a project file.

**Sharing it with a team.** The setting lives in `workspace.json`, which goes into version control, so every developer who clones the project receives it; the key does not travel. Each developer sets the variable on their own machine. A machine where the variable is unset or empty sends nothing and ranks lexically, with one warning that names the variable, so a teammate without a key is never in the way and never uploads anything. Each developer builds their own index from the same files; nothing but the files and the setting is shared.

**What is sent, and when.** Nothing leaves the machine until you configure this. `memory-index` sends, for each section that has no vector yet, its heading path and its text (cut at 6000 characters), in requests of 32 sections, and prints one line with the host and the number of sections sent; a section is sent again only when its text changes, and every section is sent again when you change the model, its dimensions or the provider address (vectors from another address are never ranked against the current ones). A query sends its own text, once. Results then combine the lexical and the vector ranking, and the first line reads `modes: lexical + vector`; a cut list counts the pool as the lexical matches plus the sections that match by meaning only. If the provider fails, the lexical results are returned as before and a warning is recorded.

## 7. Visualization

Generated only on an explicit visualization trigger — never automatically.

```bash
node skills/magicspec/scripts/executor.js build-spec-graph --html
```

Output: `.magicspec/graph/graph.html`, a self-contained interactive view with community coloring, a node inspector, and search. Open it in a browser.

## 8. Advisory Signal

| Signal | Condition |
| --- | --- |
| 🟢 | No orphaned files, no missing `Implements`, all communities at Jaccard ≥ 0.5 |
| 🟡 | 1–3 orphaned files, or 1–2 missing `Implements`, or any community at Jaccard 0.3–0.5 |
| 🔴 | A god node without a spec, any bridge spec, a community below Jaccard 0.3, or an oversized community with a split suggestion |

## 9. Relationship to Other Workflows

| Workflow | Relationship |
| --- | --- |
| **Analyze** (`analyze.md`) | Consumer — ventilation runs the graph as one of its audit steps |
| **Spec** (`spec.md`) | Handoff — orphaned files and missing `Implements` links are spec work |
| **Rule** (`rule.md`) | Handoff — boundary drift and split suggestions are configuration work |
| **Task** (`task.md`) | Consumer — planning reads the wiki instead of raw specs to build the dependency matrix |

## Sync Note

Synchronized with engine workflows on 2026-11-12 (v3.0.129).
