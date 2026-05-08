---
name: magic-graph
description: Specification Knowledge Graph — builds, analyzes, and visualizes the SDD artifact graph
handoffs:
  - label: "Fix spec gaps"
    workflow: magic-spec
    prompt: "Orphaned files or missing Implements links found. Proceed to create or amend specifications."
    condition: "gaps_detected"
  - label: "Adjust workspace boundaries"
    workflow: magic-rule
    prompt: "Community detection found boundary drift or split suggestions. Update workspace.json or RULES.md conventions."
    condition: "boundary_drift"
  - label: "Run full ventilation"
    workflow: magic-analyze
    prompt: "Run full Mode C Ventilation to combine graph findings with registry, coverage, and rationale audit."
    condition: "deep_audit_needed"
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.graph.md (relative to workspace root) -->

# Specification Knowledge Graph Workflow

**Analysis triggers:** *"Build graph"*, *"Spec graph"*, *"Graph analysis"*, *"Knowledge graph"*, *"Community detection"*, *"Workspace discovery"*

**HTML triggers:** *"Visualize graph"*, *"Graph HTML"*, *"Show graph"*, *"Open graph visualization"*, *"Generate graph visualization"*

> **Executor:** Use `node .magic/scripts/executor.js <script>` for all commands.
> **Read-only:** This workflow does not modify `.design/` artifacts. Findings may trigger handoffs to `magic.spec` or `magic.rule`.

## Steps

### 1. Build the Specification Knowledge Graph

Run the full extract → build → analyze → export pipeline over `.design/` SDD artifacts:

```bash
node .magic/scripts/executor.js build-spec-graph
```

Report the summary to the user:

- **Graph size**: total nodes and edges
- **God Nodes** (top 5 by degree): architectural hotspots. Flag any god node with `status ≠ Stable` as `PRIORITY_SPEC`.
- **Coverage stats** per workspace (specs, files covered, coverage %).
- **Orphaned files**: scoped in `workspace.json` but not covered by any spec's Canonical References. Each orphan is a gap candidate.
- **Missing Implements**: L2 specs without an explicit `Implements:` link to a parent spec. Report workspace and spec name.
- **Bridge specs**: specs referencing files across multiple workspaces — candidates for extraction into a cross-workspace spec.

### 2. Community Detection (Workspace Boundary Analysis)

Run label propagation on the code + markdown dependency graph:

```bash
node .magic/scripts/executor.js detect-communities --include-md
```

Report:

- **Community listing**: each community with node count, cohesion score, and best-matching workspace (Jaccard score).
- **Workspace alignment**: for each workspace, avg Jaccard and `LOW ALIGNMENT` / `WELL ALIGNED` signal.
- **Oversized communities** (>25% of graph): report BFS-derived sub-cluster suggestions with proposed workspace names.
- If Jaccard < 0.3 for any community → raise `BOUNDARY_DRIFT` advisory.

### 3. HTML Visualization (HTML triggers only)

Generated **only** when invocation matches an HTML trigger phrase. Skip this step for analysis triggers.

```bash
node .magic/scripts/executor.js build-spec-graph --html
```

Output: `.design/spec-graph.html` — interactive vis.js visualization (community coloring, node inspector, search).

Inform the user: "Graph visualization saved to `.design/spec-graph.html`. Open in a browser to explore."

### 4. Advisory

Produce a consolidated graph advisory with 🟢/🟡/🔴 signal:

- 🟢 **Green**: 0 orphaned files, 0 missing Implements, all communities Jaccard ≥ 0.5.
- 🟡 **Yellow**: 1–3 orphaned files OR 1–2 missing Implements OR any community Jaccard 0.3–0.5.
- 🔴 **Red**: god node without spec, bridge specs, community Jaccard < 0.3, or oversized community with split suggestion.

## Graph Completion Checklist

```
Graph Checklist
  ☐ build-spec-graph executed; god nodes, orphaned files, bridge specs reported
  ☐ detect-communities --include-md executed; Jaccard alignment reported
  ☐ PRIORITY_SPEC advisory issued for unstable god nodes (if any)
  ☐ BOUNDARY_DRIFT advisory issued for low-Jaccard communities (if any)
  ☐ Split suggestions reported for oversized communities (if any)
  ☐ Advisory Signal (🟢/🟡/🔴) issued
  ☐ [HTML only] spec-graph.html generated at .design/spec-graph.html
```