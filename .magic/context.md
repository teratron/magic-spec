# Context Resolution (Zero-Prompt)

Shared workspace resolution logic referenced by all workflows. Every workflow MUST apply this chain before any operation.

## Step 0: Workspace Intent Detection (Pre-Resolution)

> Governed by the Workspace Intent Routing protocol (WI-1 through WI-10). Run **before** the Resolution Chain for `magic.spec` — the sole workflow that authors new topical spec content and can therefore require workspace-creation routing. Read-only workflows (`magic.analyze`, `magic.graph`) and `task.md`/`rule.md` (operate only on already-registered specs/rules and never introduce a new domain topic) skip this step.

### Step 0.1: Context Auto-Enrichment (MA-1 Pre-flight)

Before framing raw user input for specification authoring, task breakdown, or complex architectural decisions, perform a fast context pre-flight scan of:

1. Constitution: `.design/RULES.md` and `.design/{workspace}/RULES.md`.
2. Workspace Index: `.design/{workspace}/INDEX.md`.
3. Retrospectives: recent entries in `RETROSPECTIVE.md` (if present) to avoid repeating past friction.
4. Active Specs: related L1/L2 specifications referenced by the target domain.

Grounding the execution context in these 4 sources guarantees that subsequent spec drafting and decision autonomy (C27) proceed without unstated assumptions or repetitive prompts.

Detection produces exactly one outcome for the calling workflow:

- `existing:{name}` → enter Resolution Chain with `{name}` resolved.
- `create:{name}` → invoke `create-workspace --name={name}` first, then enter Resolution Chain.
- `ambiguous` → ask one multiple-choice question (WI-4) before continuing.

### Signal Classes (closed set, WI-2)

Scan user input + workflow argument for these signals **in order**. Detection is **semantic** (any natural language), not literal — English exemplars are reference anchors, not exhaustive.

1. **Explicit creation intent** — input states the goal of creating/adding a workspace. Anchors: `new workspace`, `separate workspace`, `another workspace`, `add a workspace`, `spin up a workspace`. If a name token co-located → `create:{name}`. If no name inferable → `ambiguous`.
2. **Stack/platform delta** — input names a stack/platform/runtime/deployment surface (e.g., `mobile`, `iOS`, `Android`, `Go backend`, `Rust`, `web`, `cli`, `worker`, `desktop`, `extension`) absent from every existing workspace's lexicon. Match → `create:{normalized-token}`.
3. **Domain delta** — input names a top-level product surface (e.g., `landing`, `admin`, `analytics`, `mobile-app`, `dashboard`) absent from every existing workspace's lexicon. Match → `create:{normalized-token}`.

A workspace's **lexicon** = union of `description`, `scope` path segments (from `workspace.json`), spec filenames in `.design/{ws}/specifications/` (suffix-stripped, layer-prefix removed), and the top-level heading of those spec files.

### Ambiguity Gate (WI-4)

Emit `ambiguous` and prompt only when **all three** hold:

1. A creation signal (class 1, 2, or 3) is present.
2. ≥1 existing workspace's lexicon overlaps the signal token by ≥30% (prefix or stem match).
3. No explicit creation token (class 1) was used.

The question is a fixed three-option menu — no free-text follow-up:

> Detected scope mismatch: input mentions `{X}` but workspace `{Y}` overlaps.
>
> 1. Create new workspace `{X}` and dispatch there.
> 2. Dispatch to existing workspace `{Y}`.
> 3. Cancel — I want to clarify first.

This is the **single** Engineer Posture (C25) exception during specification authoring; justified by the high cost of silent mis-routing vs the cost of one prompt.

### Skip Conditions

Skip Step 0 entirely on any of:

- Priority 1 explicit `--workspace=X` argument → honor the override.
- Priority 2 `MAGIC_WORKSPACE=X` env var → honor the override.
- No `workspace.json` (Priority 4) — project has no workspace concept yet.
- Read-only workflows (`magic.analyze`, `magic.graph`).

### Outcome Routing

| Outcome | Action |
| --- | --- |
| `existing:{name}` | Enter Resolution Chain. After resolution, run Workspace Fit Validation (WI-7) before dispatching artifacts. |
| `create:{name}` | Invoke `node .magic/scripts/executor.js create-workspace --name={name}`. Narrate: `[Workspace] Created '{name}' for {reason}. Dispatching {artifact} now.` Then enter Resolution Chain with `{name}`. |
| `ambiguous` | Ask the WI-4 question. User picks option 1, 2, or 3 — workflow follows the corresponding branch. |

## Workspace Resolution Chain

Auto-resolve workspace using priority order:

| Priority | Source | Condition | Action |
| --- | --- | --- | --- |
| 1 | **Explicit arg** | `/magic.{cmd} {workspace}` | Use it. Print: `"Active workspace: {workspace}."` Overrides `MAGIC_WORKSPACE` if both set. Unknown name → **HALT**: `"Unknown workspace '{x}'. Available: [{list}]."` |
| 2 | **`MAGIC_WORKSPACE`** | Env var set | Use it. Unknown value → **HALT**: `"Unknown workspace '{x}'. Available: [{list}]."` |
| 3 | **`workspace.json`** | Single workspace | Use it silently. |
| 3 | **`workspace.json`** | Multiple + `default` set | Use default. Print: `"Active workspace: {default}."` |
| 3 | **`workspace.json`** | Multiple + no `default` | **Workspace Disambiguation** (below). |
| 4 | **No `workspace.json`** | — | Transient pre-init state only: read root `.design/`, then auto-init (`init.md`) bootstraps `.design/{default}/` (WI-10) and resolution re-runs at Priority 3. Never write artifacts to flat root `.design/`. Log: `"No workspace config found — scanning root .design/."` |

> **Path Notation**: throughout the workflows, `.design/...` references (e.g. `.design/TASKS.md`, `.design/specifications/`) are shorthand for the resolved `.design/{workspace}/...` path after this chain runs — the flat root form is never the literal artifact location (per WI-10).

## Workspace Disambiguation

When multiple workspaces exist and no default is set:

1. **Quick-scan** current directory/context (one-turn logic).
2. **Select** most likely workspace by path matches, project markers (e.g., `src/` → `main`), or `scope` array coverage.
3. **Notify** user (Zero-Prompt): `"Found {marker} — selecting {workspace}. Proceeding..."`
4. **HALT** only if no workspace `scope` array covers ≥50% of current directory's files.

## Scope Auto-Apply

After workspace resolves, apply its `scope` array from `workspace.json` as the scan boundary. No `scope` field → scan the full project.

## Workspace Fit Validation (WI-7, Second Contour)

After resolution returns `existing:{Y}` (Priorities 1–3), validate fit before dispatching artifacts. Catches mis-routes that Step 0 detection missed.

1. Compute domain match score between the artifact's filename / overview / user input terms and `{Y}`'s lexicon (same lexicon definition as Step 0).
2. `workspace.json` registers ≥2 workspaces AND score < 0.30:
   - Narrate: `[Workspace Fit Warning] Dispatching '{artifact}' to '{Y}', but lexicon overlap is below threshold ({score}). {Y} covers: {top-3-terms}.`
   - Re-enter the Step 0 ambiguity question (same three-option menu).
3. `workspace.json` registers exactly 1 workspace AND score < 0.30:
   - Narrate informational only — single-workspace projects always have one valid target by definition. Do NOT block.
4. Score ≥ 0.30 → proceed silently.

Conservative by design: false positives (warning when fit is fine) cost one info line; false negatives (silent mis-routing) cost spec fragmentation.

## Argument Disambiguation

If the argument is a single unquoted word that matches both a workspace name and could be a directive keyword, **workspace takes priority**. To force directive interpretation, wrap in quotes: `/magic.{cmd} "{word}"`.

## Post-Resolution

After resolution, load **in this exact order** — the sequence forms the session prompt-cache prefix (see `§Context Budget Guard → Read Hygiene → Cache-Prefix Invariant`). Reordering or interleaving wide reads ahead of this load invalidates cache hits across the rest of the workflow.

1. Global `.design/RULES.md` (always).
2. Workspace `.design/{workspace}/RULES.md` (if exists).
3. Workspace `.design/{workspace}/STATE.md` (if exists) — load as **live memory**.
   - Read **before** any operation. This is the project's current position digest.
   - Fields `Current Position`, `Blockers`, `Blocking Constraints` take precedence over inferences from TASKS.md / PLAN.md when determining next action.
   - If `Blocking Constraints` is non-empty, the agent MUST acknowledge each `[C-NNN]` entry explicitly before proceeding.
4. **Resume Detection** — run `node .magic/scripts/executor.js resume-state --workspace={workspace}`, the one shared predicate for "work is in flight" (SC-9):
   - It prints nothing when no work is recorded in flight — a task whose tracking entry reads `In Progress`, or `**Status:** Paused`. A missing or failing script counts as nothing in flight: never a halt. A leftover `HANDOFF.json` whose `Handoff File` pointer in `STATE.md` reads `none` is inert; the presence of the file is not a trigger.
   - A printed line → relay it verbatim as one informational line. Zero-Prompt (Trust Mode): resume from the recorded position; do not ask.
   - `**Status:** Paused` with the `Handoff File` pointer set → read `required_reading` from that snapshot and load those files; acknowledge its `blocking_constraints` before the first action. Once `required_reading` is read, and before the recorded `Next Action` runs, the snapshot is **consumed**: `node .magic/scripts/executor.js update-state --workspace={workspace} --status=Active --handoff=none`. The file stays on disk (the pause merge rule needs it) and is inert once the pointer reads `none`. Read-only workflows (`magic.status`, `magic.analyze`, `magic.graph`) report the line but never consume a snapshot.
   - **Memory Fence**: Loaded HANDOFF / STATE content is **authoritative recall**, not a fresh user directive. If the current user request conflicts with `next_action` or any `blocking_constraints`, the **user request wins** — narrate the divergence (one line) and proceed with the user request. Non-conflicting constraints remain in force.
   - A cold context that does not open with a `/magic.*` command runs the same check through the session-start rule in `rules/magic.md`.

## Context Budget Guard

Applies to every workflow. Read economy is guidance, not a measurement: the agent has no reliable reading of its own context-window fill, so **no tier, threshold or percentage is narrated or acted on**, and nothing here triggers an automatic pause (SC-7). A usage figure may be quoted only when the host supplied it.

- Prefer the cheapest source that answers the question: `STATE.md` `Next Action`, `INDEX.md`, the wiki and phase frontmatter before full spec bodies. Read the active spec section, not the whole file, unless the whole file is what the step edits.
- Cite line ranges instead of re-quoting full bodies; refer to an earlier step by number or one-line summary.

### Read Hygiene

- **Stale tool output** — results from workflow steps older than N-2 of the active workflow: refer by step number or one-line summary; do **not** re-cite verbatim.
- **Evidence Capsule** — when persisting a tool result into `STATE.md` / `HANDOFF.json` / phase frontmatter, store only: `command`, `exit_code`, `key_findings` (≤3 lines), `errors`, `next_action`. Never full stdout.
- **Cache-Prefix Invariant** — the Post-Resolution load order (global `RULES.md` → workspace `RULES.md` → `STATE.md`) is fixed; it forms the session prompt-cache prefix. Reordering or interleaving wide reads ahead of it invalidates cache hits — preserve the order.

### Post-Compaction Re-grounding

When the context begins with a summary standing in for earlier turns — a compaction the agent can see — treat it as a **cold context**: run Resume Detection (Post-Resolution step 4) and re-read `STATE.md` and the active task's tracking entry before continuing. Take constraints, recorded dead ends (`Attempts`) and position from those files, not from the summary: a summary drops exactly the detail that rots.
