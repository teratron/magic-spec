# Graph — Specification Knowledge Graph

This document explains the Graph workflow, which turns the `.design/` artifact set into a navigable graph and reports what the structure reveals.

## 1. Overview

Specifications accumulate relationships that no single file shows: which spec everything depends on, which files no spec claims, which Layer 2 spec lost its parent link, where the real module boundaries sit versus where the workspace config says they sit. The Graph workflow extracts those relationships and reports them.

**Analysis triggers:** `/magic.graph`, *"Build graph"*, *"Spec graph"*, *"Graph analysis"*, *"Knowledge graph"*, *"Community detection"*, *"Workspace discovery"*.

**Visualization triggers:** *"Visualize graph"*, *"Graph HTML"*, *"Show graph"*, *"Open graph visualization"*.

> **Self-contained workflow**: unlike the other commands, `magic.graph.md` carries its own implementation rather than pointing at an engine body in `.magic/`.
>
> **Read-only**: this workflow modifies no `.design/` artifact. Findings hand off to the Spec or Rule workflows.

## 2. Node Types

The graph is built from `.design/` and the files specifications claim:

| Type | Source |
| --- | --- |
| **Workspace** | Entries in `workspace.json` |
| **Spec** | Files in `{workspace}/specifications/` |
| **File** | Paths listed in a spec's `Canonical References` |
| **Convention** | `C{n}` headings in `RULES.md`, linked to the specs that cite them |
| **Phase** | Phase entries from the plan |

## 3. Analysis

```bash
node .magic/scripts/executor.js build-spec-graph
```

Reports:

- **God Nodes** — the highest-degree nodes; architectural hotspots. A god node whose status is not `Stable` is flagged `PRIORITY_SPEC`: the project leans on it while it is still provisional.
- **Coverage stats** — per workspace: spec count, files covered against files in scope.
- **Orphaned files** — inside a workspace `scope` but claimed by no spec's `Canonical References`. Each is a coverage gap candidate.
- **Missing Implements** — Layer 2 specs with no `Implements:` link to a parent. The layer hierarchy is broken at that point.
- **Bridge specs** — specs referencing files across more than one workspace. Either the spec should be extracted, or the boundary is drawn wrong.
- **Orphaned conventions** — rules in `RULES.md` that no specification cites. Not necessarily dead, but untraceable.

An extraction cache keyed on file content makes repeat runs cheap; unchanged specs are not re-parsed.

## 4. Community Detection

```bash
node .magic/scripts/executor.js detect-communities --include-md
```

Label propagation over the combined code and markdown dependency graph finds clusters that actually cohere, then scores each against the declared workspace boundaries.

- **Community listing** — node count, cohesion, and best-matching workspace with a Jaccard score.
- **Workspace alignment** — average Jaccard per workspace, signalled `WELL ALIGNED` or `LOW ALIGNMENT`.
- **`BOUNDARY_DRIFT`** — any community scoring below 0.3 against its best workspace: its members are not where the config says they are.
- **Split suggestions** — a community exceeding a quarter of the graph is partitioned further, and the sub-clusters are proposed as workspace names.

> Read the alignment score in context. A single-workspace project whose `scope` covers the whole repository will always score low, because every cluster is a small fraction of one large declared set. Low alignment is a signal to investigate, not a defect by itself.

## 5. Wiki Export

```bash
node .magic/scripts/executor.js export-wiki
```

Generates `.design/wiki/` — a per-spec article set with an index, linked in the style of a wiki. Agents navigating the wiki obtain layer, status, version, and references at a fraction of the token cost of reading raw specification files.

The wiki is a derivative artifact: any specification, plan, or rules change invalidates it. Re-export after writing to `.design/`. An audit reports `WIKI_STALE` when the index is older than its sources.

## 6. Visualization

Generated only on an explicit visualization trigger — never automatically.

```bash
node .magic/scripts/executor.js build-spec-graph --html
```

Output: `.design/spec-graph.html`, a self-contained interactive view with community coloring, a node inspector, and search. Open it in a browser.

## 7. Advisory Signal

| Signal | Condition |
| --- | --- |
| 🟢 | No orphaned files, no missing `Implements`, all communities at Jaccard ≥ 0.5 |
| 🟡 | 1–3 orphaned files, or 1–2 missing `Implements`, or any community at Jaccard 0.3–0.5 |
| 🔴 | A god node without a spec, any bridge spec, a community below Jaccard 0.3, or an oversized community with a split suggestion |

## 8. Relationship to Other Workflows

| Workflow | Relationship |
| --- | --- |
| **Analyze** (`analyze.md`) | Consumer — ventilation runs the graph as one of its audit steps |
| **Spec** (`spec.md`) | Handoff — orphaned files and missing `Implements` links are spec work |
| **Rule** (`rule.md`) | Handoff — boundary drift and split suggestions are configuration work |
| **Task** (`task.md`) | Consumer — planning reads the wiki instead of raw specs to build the dependency matrix |

## Sync Note

Synchronized with engine workflows on 2026-08-06 (v2.1.64).
