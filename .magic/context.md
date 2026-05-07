# Context Resolution (Zero-Prompt)

Shared workspace resolution logic referenced by all workflows.
Every workflow MUST apply this chain before any operation.

## Step 0: Workspace Intent Detection (Pre-Resolution)

> Governed by `l1-workspace-intent-routing.md` (WI-1 through WI-10). Run this
> step **before** the Workspace Resolution Chain below for any workflow that
> creates or amends specifications, tasks, or rules. Read-only workflows
> (`magic.analyze`, `magic.graph`) skip this step.

The detection produces exactly one of these outcomes for the calling workflow
to consume:

- `existing:{name}` → proceed to the Resolution Chain with `{name}` resolved.
- `create:{name}` → invoke `create-workspace --name={name}` first, then enter
  the Resolution Chain with the freshly created workspace.
- `ambiguous` → ask exactly one multiple-choice question (WI-4) before
  continuing.

### Signal Classes (closed set, WI-2)

Scan the user's most recent input message and the workflow argument for
these signals, in order. Detection is **semantic**, not literal: the agent
recognizes intent across any natural language it understands. The English
exemplars below are reference anchors, not an exhaustive token list.

1. **Explicit creation intent**: input states the goal of creating or
   adding a workspace. Reference anchors: `new workspace`, `separate
   workspace`, `another workspace`, `add a workspace`, `spin up a
   workspace`. Equivalent phrasings in any other language are matched
   semantically. If a name token is co-located in the same message →
   `create:{name}`. If no name is inferable → `ambiguous`.
2. **Stack/platform delta**: input names a stack, platform, runtime, or
   deployment surface (e.g., `mobile`, `iOS`, `Android`, `Go backend`,
   `Rust`, `web`, `cli`, `worker`, `desktop`, `extension`) absent from
   every existing workspace's lexicon. Match → `create:{normalized-token}`.
3. **Domain delta**: input names a top-level product surface (e.g.,
   `landing`, `admin`, `analytics`, `mobile-app`, `dashboard`) absent from
   every existing workspace's lexicon. Match → `create:{normalized-token}`.

A workspace's lexicon is the union of its `description`, `scope` path
segments (from `workspace.json`), spec filenames in
`.design/{ws}/specifications/` (suffix-stripped, layer prefix removed), and
the top-level heading of those spec files.

### Ambiguity Gate (WI-4)

Emit `ambiguous` and ask one multiple-choice question only when **all three**
hold:

1. A creation signal (class 1, 2, or 3) is present.
2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30%
   (prefix or stem match).
3. No explicit creation token (class 1) was used.

The question MUST be a fixed three-option menu — no free-text follow-up:

> Detected scope mismatch: input mentions `{X}` but workspace `{Y}` overlaps.
>
> 1. Create new workspace `{X}` and dispatch there.
> 2. Dispatch to existing workspace `{Y}`.
> 3. Cancel — I want to clarify first.

This question is the **single** Engineer Posture (C25) exception during
specification authoring. It is justified by the high cost of silent
mis-routing relative to the cost of one prompt.

### Skip Conditions

- Priority 1 explicit `--workspace=X` argument → skip Step 0 entirely; honor
  the override.
- Priority 2 `MAGIC_WORKSPACE=X` env → skip Step 0 entirely; honor the
  override.
- No `workspace.json` (Priority 4) → skip Step 0; the project has no
  workspace concept yet.
- Read-only workflows (`magic.analyze`, `magic.graph`) → skip Step 0.

### Outcome Routing

| Outcome | Action |
| :--- | :--- |
| `existing:{name}` | Proceed to Resolution Chain. After resolution, run Workspace Fit Validation (WI-7) before dispatching artifacts. |
| `create:{name}` | Invoke `node .magic/scripts/executor.js create-workspace --name={name}`. Narrate: `[Workspace] Created '{name}' for {reason}. Dispatching {artifact} now.` Then enter Resolution Chain with `{name}`. |
| `ambiguous` | Ask the WI-4 question. User picks option 1, 2, or 3 — the workflow follows the corresponding branch. |

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

## Workspace Fit Validation (WI-7, Second Contour)

After resolution returns `existing:{Y}` (Priorities 1–3), validate fit before
dispatching artifacts. This is the second contour that catches mis-routes
the Step 0 detection stage missed.

1. Compute domain match score between the artifact's filename / overview /
   user input terms and `{Y}`'s lexicon (same lexicon definition as Step 0).
2. If `workspace.json` registers ≥2 workspaces AND score < 0.30:
   - Emit narration: `[Workspace Fit Warning] Dispatching '{artifact}' to '{Y}', but lexicon overlap is below threshold ({score}). {Y} covers: {top-3-terms}.`
   - Re-enter the Step 0 ambiguity question (the same three-option menu).
3. If `workspace.json` registers exactly 1 workspace AND score < 0.30:
   - Emit narration only — informational, do not block. Single-workspace
     projects always have one valid target by definition.
4. Score ≥ 0.30 → proceed silently.

This contour is conservative: false positives (warning when fit is fine)
cost one info line; false negatives (silent mis-routing) cost spec
fragmentation across the wrong workspace.

## Argument Disambiguation

If the argument is a single unquoted word that matches both a workspace name and could be a directive keyword, **workspace takes priority**. To force directive interpretation, wrap in quotes: `/magic.{cmd} "{word}"`.

## Post-Resolution

After resolution, load:

1. Global `.design/RULES.md` (always).
2. Workspace `.design/{workspace}/RULES.md` (if it exists).
3. Workspace `.design/{workspace}/STATE.md` (if it exists) — load as **live memory**.
   - Read **before** any operation. This is the project's current position digest.
   - Fields `Current Position`, `Blockers`, `Blocking Constraints` take precedence over
     inferences from TASKS.md or PLAN.md when determining next action.
   - If `Blocking Constraints` section is non-empty, the agent MUST acknowledge each
     `[C-NNN]` entry explicitly before proceeding.
4. **Resume Detection**: If STATE.md `**Status:** Paused` or `HANDOFF.json` exists in workspace:
   - Display: `⚠ Paused session detected. Last action: {next_action from STATE/HANDOFF}.`
   - Zero-Prompt (Trust Mode): automatically resume from recorded position.
   - On resume: read `required_reading` from HANDOFF.json and load those files.
   - Acknowledge all `blocking_constraints` from HANDOFF.json before first action.
   - After successful resume → update STATE.md: set `**Status:** Active`, clear handoff field.
