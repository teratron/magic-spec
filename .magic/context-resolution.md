# Context Resolution (Zero-Prompt)

Shared workspace resolution logic referenced by all workflows.
Every workflow MUST apply this chain before any operation.

## Workspace Resolution Chain

Auto-resolve workspace using the following priority:

| Priority | Source | Condition | Action |
| :---: | :--- | :--- | :--- |
| 1 | **Explicit arg** | `/magic.{cmd} {workspace}` | Use it. Print: "Active workspace: {workspace}." Overrides `MAGIC_WORKSPACE` if both set. If name not in `workspace.json` → **HALT**: "Unknown workspace '{x}'. Available: [{list}]." |
| 2 | **`MAGIC_WORKSPACE`** | Env var set | Use it. If value not in `workspace.json` → **HALT**: "Unknown workspace '{x}'. Available: [{list}]." |
| 3 | **`workspace.json`** | Single workspace | Use it silently. |
| 3 | **`workspace.json`** | Multiple + `default` set | Use default. Print: "Active workspace: {default}." |
| 3 | **`workspace.json`** | Multiple + no `default` | **Workspace Disambiguation** (see below). |
| 4 | **No `workspace.json`** | — | Use root `.design/`. Log: "No workspace config found — scanning root .design/." |

## Workspace Disambiguation

When multiple workspaces exist and no default is set:

1. **Quick-scan** the current directory/context (one-turn logic).
2. **Select** the most likely workspace based on path matches, project markers (e.g., `src/` → `main`), or `scope` array coverage.
3. **NOTIFY** the user of the selection, proceeding immediately (Zero-Prompt): "Found {marker} — selecting {workspace}. Proceeding..."
4. Only **HALT** if no workspace `scope` array covers ≥50% of the current directory's files.

## Scope Auto-Apply

After workspace is resolved, apply its `scope` array from `workspace.json` as the scan boundary. If the workspace has no `scope` field, scan the full project.

## Argument Disambiguation

If the argument is a single unquoted word that matches both a workspace name and could be a directive keyword, **workspace takes priority**. To force directive interpretation, wrap in quotes: `/magic.{cmd} "{word}"`.

## Post-Resolution

After resolution, load:

1. Global `.design/RULES.md` (always).
2. Workspace `.design/{workspace}/RULES.md` (if it exists).
