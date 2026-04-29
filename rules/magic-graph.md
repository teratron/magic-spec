# magic.graph

This project has a Specification Knowledge Graph managed by `magic.graph`.

## Auto-Use Rules

- Before answering architecture, cross-module, or design questions, run `node .magic/scripts/executor.js build-spec-graph` and read its output for god nodes, community structure, and coverage stats.
- If `.design/wiki/index.md` exists, navigate it instead of reading raw spec files.
- For "how does X relate to Y" or "what covers Z" questions, prefer `node .magic/scripts/executor.js build-spec-graph --json` over grep — it traverses Implements links and canonical references.
- After modifying or creating files in `.design/` in this session, run `node .magic/scripts/executor.js export-wiki` to keep the graph current.

## On-Demand

- `/magic.graph` — full analysis: god nodes, orphaned files, missing Implements, community detection, advisory signal.
- `/magic.graph` + *"Visualize graph"* / *"Graph HTML"* — generates `.design/spec-graph.html` (interactive vis.js visualization).

## Completion Protocol

Before declaring a task finished that involved spec or architecture changes:

- [ ] **Graph**: verify the spec graph is current:
  - **Context**: ran `build-spec-graph` before answering architecture questions.
  - **Navigation**: used `wiki/index.md` (if exists) instead of raw spec files.
  - **Updated**: ran `export-wiki` if `.design/` files were modified.
