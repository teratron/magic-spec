# Task Workflow

Generates `PLAN.md` (Phases) and `TASKS.md` (Atomic Tasks). Input: `.design/specifications/`.

## Argument Routing

Parse the `[arg]` to determine the planning mode:

| Input | Detection | Result |
| :--- | :--- | :--- |
| *(empty)* | No argument | **Full Planning**: Resolve workspace via §Workspace Resolution, then plan all specs |
| `engine` | Matches a workspace name in `workspace.json` | **Scoped Planning**: Plan only specs registered in that workspace's `INDEX.md` |
| `"decompose phase-2"` | Quoted text or text that does NOT match any workspace name | **Guided Planning**: Interpret text as planning directive (focus, instruction, filter) |
| `engine "only new specs"` | First token is workspace + remaining is quoted text | **Scoped + Guided**: Planning directive applied within workspace scope |

> **Workspace Fallback (Modes A, C)**: When no workspace is specified in the argument, resolve workspace via Core Invariant #1 (Zero-Prompt chain) before applying the planning directive. The directive text filters or guides planning but does not replace workspace resolution.
> **Disambiguation**: If the argument is a single unquoted word that matches both a workspace name and could be a directive keyword, workspace takes priority. To force directive interpretation, wrap in quotes: `/magic.task "engine"`.
> **Handoff Propagation**: When recommending `/magic.run` after planning, propagate the workspace context: `/magic.run {workspace}`.

## Core Invariants (Mandatory)

1. **Context (Zero-Prompt)**: Apply the full workspace resolution chain from [context-resolution.md](context-resolution.md) (Priority 1-4, Disambiguation, Scope Auto-Apply).
2. **Registry Integrity**: Read ALL specs in `INDEX.md` before planning. No exceptions.
3. **Auto-Init**: If `.design/` missing, silently execute `.magic/init.md` (do not prompt user).
    - **Intent Preservation**: If `init.md` or `analyze.md` is sub-delegated during this workflow, memo the original user intent before delegating. After delegation resolves, resume explicitly: "Resuming: '{original intent}'." Intent MUST NOT be silently dropped across workflow boundaries.
4. **Logic Guards**:
    - **No Orphans**: Every registered spec must be in `PLAN.md` or `## Backlog`.
    - **Atomic Tasks (C10)**: Every spec in Phase 1+ must have a concise checklist in **`TASKS.md`** (Phase Checklist) with `T-XXXX` IDs.
    - **User Gate**: In **Trust Mode (C9)**, automatically generate and write the Plan & Checklist without asking for a "Go" confirm. Show a summary of the generated plan to the user.
    - **Zero-Prompt handoff**: After writing tasks, hand off to execution mode if applicable (subject to wrapper constraints).
5. **Rules Parity**: Record current `RULES.md` version in `TASKS.md` header. Notify user of drift and re-sync during update.
6. **Engine Integrity (C14)**: If engine files (`.magic/`) modified → `node .magic/scripts/executor.js update-engine-meta --workflow task` (Smart History: redundant automated entries are skipped).
7. **Architectural Logic**:
    - **Circular Guard (Semantic Split)**:
        - **Hard Dependencies** (`Implements:` chains, L2→L1): Deep scan across ALL levels. If ANY cycle detected → **HALT**. These are blocking dependencies that define build/planning order.
        - **Soft References** (`Related Specifications`): Scan for mutual references. Cycles here are **warnings**, not HALTs — peer modules in the same layer commonly cross-reference each other (e.g., ECS core systems, networking subsystem). Log: `[Cycle-Info] {N} mutual references detected in Related Specifications (non-blocking).`
    - **Cycle Resolution** (Hard Dependencies only): Suggest breaking the chain by identifying the "weakest link" — the edge that should be downgraded from `Implements` to `Related Specifications`.
    - **Layer Respect**: L1 (Concept) always scheduled BEFORE L2 (Implementation).
    - **Autonomous Selection (C6)**: **Default**: Auto-pull ALL `Stable` specs into the active `PLAN.md`. Move `Draft`/`RFC` to `## Backlog`. No user prompt required unless a priority conflict is detected.
    - **C6 Bootstrap Exception**: If, after Pre-Planning Stabilization (Step 2), **zero** specs reached `Stable` AND the project has **no prior `PLAN.md`** (file missing or contains zero active phase entries) → activate Bootstrap Mode. In Bootstrap Mode, `Draft` specs that pass MVC criteria (Overview + at least one design section) are treated as plannable with a `[Bootstrap]` marker. The generated plan is explicitly tentative: `[Bootstrap Plan] {N} Draft specs planned tentatively. Plan will be finalized when specs reach Stable.` Bootstrap Mode is automatically deactivated once ≥1 spec reaches `Stable` through normal lifecycle.
    - **Actionable Outcome**: After planning, show: `[Auto-Plan] {N} specs added to Phase {X}, {M} moved to Backlog.`
    - **Parent Header Parity (Cross-Workspace)**: When planning an L2 spec that implements an L1 parent in a DIFFERENT workspace, the agent MUST verify the parent's file header against its own workspace's `INDEX.md`. If drift (`STATUS_DRIFT`/`VERSION_DRIFT`) is found in the cross-workspace parent → **HALT**. This ensures L2 tasks are never planned against mismatched L1 definitions.

## Workflow: Planning & Orchestration

```mermaid
graph TD
    A[Trigger: Plot/Sync] --> B[Pre-flight: Pre-reqs & Engine Guard]
    B --> S[Pre-Planning Stabilization: Trust Mode Batch]
    S --> C[Build Dependency Graph]
    C --> D[Apply Mode Choice §7]
    D --> E[Selective Selection C6 + Bootstrap]
    E --> F[Decompose Phase 1 Tasks]
    F --> G[Log Plan & Breakdown Summary]
    G --> H[Write PLAN, TASKS, phase-*.md]
    H --> I[Generate CONTEXT.md]
```

### Steps

1. **Pre-flight**: `node .magic/scripts/executor.js check-prerequisites --json --require-specs --workspace {active-workspace}`.
    - **C15 Filter**: `checksums_mismatch` or `GHOST_REGISTRY` → **C15 Filter** (see `init.md` §1). If in-scope → **HALT**. If out-of-scope → proceed silently.
    - **File-Header Parity**: For each spec in `INDEX.md`, read the actual file's `Status:` and `Version:` header fields. If either mismatches the corresponding `INDEX.md` entry → **HALT** with `STATUS_DRIFT` or `VERSION_DRIFT`. Report: "Header parity failure on `{file}`: file {field} `{file_val}` ≠ registry `{index_val}`. Resolve via `magic.spec` or `magic.analyze` before planning." This catches manual edits that bypassed the spec workflow.
    - **Cross-Workspace Parity**: If `workspace.json` registers >1 workspace, scan for identically-named spec files across workspaces. If any name collision with version mismatch is found → **HALT**. Report: "Source of Truth Drift: `{file}` exists in `{ws-a}` (v{X}) and `{ws-b}` (v{Y})." Options: (a) Sync from canonical source workspace, (b) Rename to unique name per workspace, (c) Force ignore (document reason). Also verify header parity for any cross-workspace L1 parents (see Architecture Logic above).
2. **Pre-Planning Stabilization (Trust Mode Batch)**:
    - Iterate all `Draft` specs registered in `INDEX.md`, processing **L1 specs first**, then **L2 specs** (layer order is mandatory — an L2 spec cannot promote until its L1 parent is `Stable`). **Workspace order**: When multiple workspaces exist, process the `default` workspace first (per `workspace.json`), then remaining workspaces in registration order. This ensures foundational specs are promoted before consumer workspaces that depend on them.
    - For each spec, evaluate Trust Mode criteria from `spec.md`:
        - (a) No `RULES.md` conflicts.
        - (b) No hard-dependency cycles (per Circular Guard Semantic Split above — soft reference cycles do NOT block promotion).
        - (c) Layer constraints satisfied (`Implements:` field present and valid for L2).
        - (d) **Minimum Viable Completeness (MVC)**: `Overview` + at least one design section (`Core Invariants` for L1, `Invariant Compliance` for L2, `Detailed Design`, or for non-standard layers like `test`/`tool` — any numbered section with substantive content). Full template compliance is NOT required for Draft→Stable batch promotion — missing optional sections (`Drawbacks`, `Implementation Notes`) do not block.
    - **Promote**: Specs passing all criteria are promoted `Draft → Stable`. Update both file headers and `INDEX.md` entries atomically.
    - **Skip**: Specs failing any criterion remain `Draft` with a logged reason.
    - Report: `[Pre-Plan] {N} specs promoted to Stable, {M} remain Draft. Reasons: {summary}.`
    - **Field Normalization**: During iteration, if an L2 spec uses a non-standard field name for its L1 parent reference (e.g., `L1 Reference:` instead of `Implements:`), auto-rename to the canonical `Implements:` field. Log: `[Normalize] {file}: 'L1 Reference' → 'Implements'.`
3. **Analyze**: Extract `Related Specifications` and `Implementation Notes`.
4. **Draft Plan**: Group by Layer. Build full dependency matrix *before* task generation to detect N-level cycles.
5. **Planning Audit (C24)**: Adopt a **Planning Skeptic** persona to review the draft `PLAN.md`. Audit for:
    - **Optimism Bias**: Have task sizes been underestimated?
    - **Hidden Dependencies**: Are parallel tracks truly independent, or is there a shared resource/config bottleneck?
    - **Cascade Risk**: If a critical spec fails to implement in Phase 1, how many Phase 2 tasks are instantly blocked?
6. **Execution Mode**: Default to **Parallel mode (C3)**. If mode is not defined in `RULES.md §7`, assume Parallel (do not ask).
7. **Decompose**: Split the active phase into 2-3 tasks per spec.
    - **IDs**: `T-{phase}{track}{seq}` (e.g., `T-1A01`).
    - **Tracks**: Group tasks by file independence.
    - **Testing (Mandatory)**: Every feature track MUST include at least one `Validation Task` (e.g., `T-1T01`) to verify implementation vs spec.
8. **Sync (Update Mode)**:
    - **C12 Quarantine**: If L1 parent is not `Stable` in `INDEX.md` (status already changed by `spec.md` C12 cascade) → Move L2 children to `## Backlog` in `PLAN.md`; mark their tasks `Blocked [!]` with reason: "L1 parent `{file}` is `{status}` (C12)". **Cross-Workspace C12**: If the L1 parent resides in a different workspace, verify its status by reading that parent workspace's `INDEX.md`. **Do NOT modify INDEX.md** — status changes are the responsibility of `spec.md` only. **C12.1 Stabilization Exception**: Tasks intended to stabilize or fix mismatches to regain `Stable` status may bypass quarantine.
    - **Phantom Specs**: If spec in PLAN/INDEX but missing from disk → Cancel `Todo` / `Pending`; archive `Done`. Block active tasks.
    - **Phantom Parent Guard**: If an L2 spec's parent is missing from disk or `INDEX.md` (cross-workspace or local) → **HALT**. Report: "Parent Spec `{parent-file}` (L1) is missing. Cannot plan dependent `{file}` (L2)." Move L2 to `## Backlog` with reason: "Missing L1 Parent (Phantom)."
    - **Structural Refactor**: If sections merged or split, validate all `T-{ID}` mappings to §sections. Re-map in TASKS.md & phase files. **ID Splitting**: Keep original `T-{ID}` for the first sub-task; append `.N` suffixes (e.g., `T-1A01.1`, `T-1A01.2`) for others.
    - **Renames**: Global search-and-replace on filename changes (exclude archives). Ensure new names follow the `l1-`/`l2-` prefix convention.

### Plan Write-back

- Use `.magic/templates/plan.md`, `.magic/templates/tasks.md` and `.magic/templates/phase.md`.
- PLAN.md: Strategic overview (Phases & Specifications). No atomic checklist items.
- TASKS.md: Master Phase Index. Contains phase registry and status tracking.
- tasks/phase-{n}.md: Tactical execution workbooks. Contain atomic checklists (T-XXXX) for specific phases.

### Context Regeneration

After writing PLAN.md, TASKS.md, and phase files, regenerate the workspace context file:
`node .magic/scripts/executor.js generate-context --workspace {active-workspace}`

## Task Completion Checklist

```
Task Workflow Checklist — {operation}
  ☐ All registered specs read; no orphans/phantoms left unaddressed
  ☐ Pre-Planning Stabilization: Trust Mode batch applied (L1→L2 order); field normalization done
  ☐ Circular Guard: hard-dependency cycles checked (Implements chains); soft reference cycles logged
  ☐ Selective Planning (C6) and Quarantine (C12) applied; Bootstrap Exception evaluated if needed
  ☐ Testing Track: Validation tasks (T-XXXX) included for all new features
  ☐ Rules Parity: Current RULES.md version recorded in TASKS.md; Task IDs valid
  ☐ Role-Switching (C24): Draft Plan audited in **Skeptic Persona** (Optimism, Dependencies, Risk)
  ☐ PLAN.md (Strategic) / TASKS.md (Tactical) written; CONTEXT.md regenerated
  ☐ Engine Meta: C14 bump performed if .magic/ files modified
```
