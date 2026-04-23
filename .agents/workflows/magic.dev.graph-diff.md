---
name: magic.dev:graph-diff
description: Spec Graph Diff — compares two graph snapshots to surface structural drift between SDD states
handoffs:
  - label: "Fix regressions"
    workflow: magic.spec
    prompt: "New orphaned files or removed specs detected. Proceed to create or amend specifications to restore coverage."
    condition: "coverage_regression"
  - label: "Review god node drift"
    workflow: magic.analyze
    prompt: "God node degree has grown significantly. Run Mode C Ventilation to reassess architectural hotspots."
    condition: "god_node_growth"
  - label: "Full graph analysis"
    workflow: magic.dev.graph
    prompt: "Build fresh graph snapshot and run community detection to get current state."
    condition: "baseline_missing"
---

# Spec Graph Diff Workflow

**Triggers:** *"Graph diff"*, *"Snapshot diff"*, *"What changed in the graph"*, *"Spec drift"*, *"Compare snapshots"*, *"Retrospective graph"*

> **Executor:** Use `node .magic/scripts/executor.js <script>` for all commands.
> **Read-only:** This workflow does not modify `.design/` artifacts. It surfaces structural deltas for review.

## Steps

### 1. Capture Current Snapshot

Export the current graph state to a JSON snapshot:

```bash
node .magic/scripts/executor.js build-spec-graph --json > .design/graph-snapshot.json
```

### 2. Run the Diff

Compare against the baseline snapshot (`graph-before.json`):

```bash
node .magic/scripts/executor.js diff-spec-graph .design/graph-before.json .design/graph-snapshot.json
```

If `graph-before.json` does not exist, report `BASELINE_MISSING` and hand off to `magic.dev.graph` to build the initial snapshot.

### 3. Report Structural Deltas

Surface the following changes from the diff output:

- **Nodes added / removed**: new specs, deleted specs, files promoted to spec nodes.
- **Edges added / removed**: new Implements links, lost dependency edges.
- **Status changes**: specs that moved Draft → Review → Stable, or regressed.
- **Degree shifts**: nodes whose degree changed by ≥ 3 (potential god node emergence or dissolution).
- **Coverage delta**: per-workspace change in `specs`, `covered`, and `coverage_pct`.
- **Orphan drift**: newly orphaned files (`✗ new`) and resolved orphans (`✓ resolved`).
- **Missing-Implements drift**: links gained or lost since baseline.

### 4. Rolling Baseline Update

After reporting, rotate the snapshot files:

```bash
# Promote current snapshot to baseline for next comparison
# (rename manually or instruct user — do NOT delete graph-before.json without confirmation)
```

Inform the user: "Rename `.design/graph-snapshot.json` → `.design/graph-before.json` to set a new baseline."

### 5. Advisory

Issue a signal based on delta severity:

- 🟢 **Green**: No regressions — orphan count stable or decreasing, coverage stable or improving.
- 🟡 **Yellow**: 1–3 new orphans OR coverage drop < 5% OR degree shift on existing god nodes.
- 🔴 **Red**: New god node (degree ≥ 10) without a Stable spec, coverage drop ≥ 5%, or spec removals without replacement.

## Graph Diff Checklist

```
Graph Diff Checklist
  ☐ graph-snapshot.json generated via build-spec-graph --json
  ☐ diff-spec-graph executed against graph-before.json
  ☐ Node/edge additions and removals reported
  ☐ Status changes and degree shifts reported
  ☐ Coverage delta reported per workspace
  ☐ Orphan drift (new / resolved) reported
  ☐ Rolling baseline rotation instructed to user
  ☐ Advisory Signal (🟢/🟡/🔴) issued
```
