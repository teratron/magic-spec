# Context Economy

An agent turn re-reads the whole context, so the cost of a session is the sum, over its turns, of the context size at each turn. A long session at a large context is the expensive shape; the size of what was typed hardly matters. This page lists what the engine does about it and what is left to the session.

## 1. What the Engine Keeps Small

| Surface | Mechanism |
| --- | --- |
| Always-on rule | `AGENT-RULES.md` is a kernel (a size budget is pinned by the harness). Sections with a trigger live in `references/rules/` and are read when the trigger fires: finalization and archival, post-task replan, containment, bug reporting. |
| Working documents | `check-bloat` flags a registry, plan, task ledger or constitution over 30 KB (`DOC_BLOAT`) or 60 KB (`DOC_DECOMPOSE`), in the workspace and globally. Every workflow reads them whole. Override in `.magicspec/workspace.json` under `bloat.doc` (`soft` and `hard`, in KB; `0` turns a tier off). |
| Specifications and phases | `SPEC_BLOAT` / `SPEC_DECOMPOSE` (300 / 500 lines) and `TASK_BLOAT` / `TASK_DECOMPOSE` (250 / 400 lines), as before. |
| Graph queries | `build-spec-graph --json --out` writes the graph to `.magicspec/graph/query.json` and prints one line. Plain `--json` prints the whole graph, tens of thousands of tokens on a large registry. |
| Resuming | `resume-state` restores position from `STATE.md`, so a fresh session loses nothing that was saved. |

## 2. What the Session Has to Do

- Start a new session (or `/clear`) at a workflow boundary rather than carrying one context through Spec, Task and Run.
- Keep unused plugins, skills and connectors off: the host lists every one of them on every turn.
- Prefer reading a section to reading a file; the Context Budget Guard in `references/context.md` says how.

## 3. Measuring (Engine Repository)

`scripts/token-audit.js` reads the usage that Claude Code records in its transcripts:

```bash
node scripts/token-audit.js --since 2026-10-29            # one row per session of this project
node scripts/token-audit.js --session <transcript.jsonl>  # context-size buckets, largest tool results
```

As a `UserPromptSubmit` hook it adds one line of advice once the context passes `TOKEN_AUDIT_WARN` (default 300000 tokens) and prints nothing before that:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node scripts/token-audit.js --hook" }] }
    ]
  }
}
```

The engine itself never reads the context size (the agent has no reliable reading of it); the host does, which is why this lives in the host's hook and not in a workflow.
