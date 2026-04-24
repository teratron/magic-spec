---
name: magic-dev-graph-serve
description: Graph Infrastructure — starts the spec graph MCP server and runs token efficiency benchmarks
handoffs:
  - label: "Build fresh graph"
    workflow: magic-dev-graph
    prompt: "MCP server requires a valid graph. Run build-spec-graph first."
    condition: "graph_missing"
  - label: "Review architecture"
    workflow: magic-analyze
    prompt: "Benchmark shows high token cost per query. Run Mode C Ventilation to improve spec coverage and reduce corpus size."
    condition: "high_token_cost"
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: .agents/workflows/magic.dev.graph-serve.md (relative to workspace root) -->

# Graph Infrastructure Workflow

**Triggers:** *"Start MCP server"*, *"Serve spec graph"*, *"Graph server"*, *"Token benchmark"*, *"Benchmark specs"*, *"Context efficiency"*, *"How many tokens"*

> **Executor:** Use `node .magic/scripts/executor.js <script>` for all commands.
> **Infrastructure tools:** These commands instrument the graph for external consumption and measure SDD efficiency.

## Steps

### 1. MCP Server — Serve Spec Graph

Start the spec graph as an MCP (Model Context Protocol) tool server over stdio:

```bash
node .magic/scripts/executor.js serve-spec-graph
```

The server bootstraps by running `build-spec-graph --json` internally, then exposes these tools over JSON-RPC 2.0:

| Tool | Description |
| :--- | :--- |
| `query_graph` | Search nodes by label/id substring with optional type filter |
| `get_node` | Full metadata for a single node by ID |
| `get_neighbors` | Adjacent nodes with their edge relation types |
| `find_gaps` | Orphaned files, missing Implements links, convention orphans |
| `shortest_path` | BFS shortest path between two node IDs |
| `get_coverage` | Per-workspace coverage statistics |
| `god_nodes` | Top-N nodes by degree (architectural hotspots) |

**Integration:** Register as an MCP server in Claude Code settings:

```json
{
  "mcpServers": {
    "spec-graph": {
      "command": "node",
      "args": [".magic/scripts/executor.js", "serve-spec-graph"]
    }
  }
}
```

The server runs until terminated (Ctrl+C). Restart after major spec changes to reload the graph.

### 2. Token Efficiency Benchmark

Measure the token cost of answering architecture questions via three strategies:

```bash
node .magic/scripts/executor.js benchmark
```

Options:

| Flag | Default | Description |
| :--- | :--- | :--- |
| `--depth <n>` | 2 | BFS depth for graph queries |
| `--top <n>` | 5 | Top-N god nodes used as query seeds |
| `--json` | — | Output raw JSON instead of human-readable report |

Report the comparison table:

- **Raw Corpus**: token cost of loading all source + doc files.
- **Spec Layer**: token cost of loading only `.design/` specs.
- **Graph BFS** (avg over top seeds): token cost of a targeted subgraph query.

Flag if Graph BFS average exceeds 10K tokens → `HIGH_TOKEN_COST` advisory (spec coverage may be too thin).

### 3. Advisory

- 🟢 **Green**: Spec/Corpus ratio ≥ 10×, Graph/Corpus ratio ≥ 50×.
- 🟡 **Yellow**: Spec/Corpus ratio 5–10× OR Graph/Corpus ratio 20–50×.
- 🔴 **Red**: Spec/Corpus ratio < 5× (specs are not compressing knowledge effectively) or Graph BFS avg > 10K tokens.

## Infrastructure Checklist

```
Infrastructure Checklist
  ☐ serve-spec-graph started; all 7 MCP tools verified reachable
  ☐ MCP server registration documented (settings or README)
  ☐ benchmark executed; Raw / Spec / Graph token counts reported
  ☐ Spec/Corpus and Graph/Corpus ratios calculated
  ☐ HIGH_TOKEN_COST advisory issued if avg graph query > 10K tokens
  ☐ Advisory Signal (🟢/🟡/🔴) issued
```