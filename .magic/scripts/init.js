const fs = require('fs');
const path = require('path');

const designDir = process.env.MAGIC_DESIGN_DIR || '.design';

if (!fs.existsSync('.git')) {
    console.log('Note: not a git repository. Proceeding with SDD initialization anyway.');
}

const dirsToCreate = [
    path.join(designDir, 'specifications'),
    path.join(designDir, 'tasks'),
    path.join(designDir, 'archives', 'tasks')
];

dirsToCreate.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
});

const workspacePath = path.join(designDir, 'workspace.json');
if (!fs.existsSync(workspacePath)) {
    const workspaceContent = {
        "default": "root",
        "workspaces": {
            "root": {
                "description": "Primary project workspace"
            }
        }
    };
    fs.writeFileSync(workspacePath, JSON.stringify(workspaceContent, null, 2));
    console.log(`Created ${workspacePath.replace(/\\/g, '/')}`);
} else {
    console.log(`Registry preservation: ${workspacePath.replace(/\\/g, '/')} already exists. Skipping.`);
}

const date = new Date().toISOString().split('T')[0];

const indexPath = path.join(designDir, 'INDEX.md');
if (!fs.existsSync(indexPath)) {
    const indexContent = `# Specifications Registry
**Version:** 1.0.0
**Status:** Active

## Overview
Central registry of all project specifications and their current state.

## System Files
- [RULES.md](RULES.md) - Project constitution and standing conventions.

## Domain Specifications
| File | Description | Status | Layer | Version |
| :--- | :--- | :--- | :--- | :--- |
<!-- Add your specifications here -->

## Meta Information
- **Maintainer**: Core Team
- **License**: MIT
- **Last Updated**: ${date}
`;
    fs.writeFileSync(indexPath, indexContent);
    console.log(`Created ${indexPath.replace(/\\/g, '/')}`);
} else {
    console.log(`Registry preservation: ${indexPath.replace(/\\/g, '/')} already exists. Skipping.`);
}

const rulesPath = path.join(designDir, 'RULES.md');
if (!fs.existsSync(rulesPath)) {
    let rulesContent = `# Project Specification Rules
**Version:** 1.0.0
**Status:** Active

## Overview
Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions
- Spec files use lowercase kebab-case: \`api.md\`, \`database-schema.md\`.
- System files use uppercase: \`INDEX.md\`, \`RULES.md\`.
- Section names within specs are title-cased.

## 2. Status Rules
- **Draft → RFC**: all required sections filled, ready for review.
- **RFC → Stable**: reviewed, approved, no open questions.
- **RFC → Draft**: needs rework or significant revision.
- **Stable → RFC**: substantive amendment (minor/major bump) requires re-review.
- **Any → Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules
- \`patch\` (0.0.X): typo fixes, clarifications — no structural change.
- \`minor\` (0.X.0): new section added or existing section extended.
- \`major\` (X.0.0): structural restructure or scope change.

## 4. Formatting Rules
- Use \`plaintext\` blocks for all directory trees.
- Use \`mermaid\` blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

## 5. Content Rules
- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

## 6. Relations Rules
- Every spec that depends on another must declare it in \`Related Specifications\`.
- Cross-file content duplication is not permitted — use a link instead.
- Circular dependencies must be flagged and resolved.

## 7. Project Conventions

### C1 — \`.magic/\` Engine Safety

\`.magic/\` is the active SDD engine. Any modification must follow this protocol:

1. **Read first** — open and fully read every file that will be affected.
2. **Analyse impact** — trace how the changed file is referenced by other engine files and workflow wrappers.
3. **Verify continuity** — confirm that after the change all workflows remain fully functional.
4. **Never edit blindly** — if the scope of impact is unclear, stop and ask before proceeding.
5. **Document the change** — record modifications in the relevant spec and commit message.
6. **Atomic Update** — apply changes simultaneously across all related files (scripts, workflows, and documentation) to maintain full engine consistency.
7. **No-Change, No-Bump** — NEVER trigger a version bump (C14) if no physical files in \`.magic/\` were modified (e.g., during simulations, dry runs, or purely cognitive tasks).

### C2 — Workflow Minimalism

Limit the SDD workflow to the core command set to maximize automation and minimize cognitive overhead. Do not introduce new workflow commands unless strictly necessary and explicitly authorized as a C2 exception.

### C3 — Parallel Task Execution Mode

Task execution defaults to **Parallel mode**. A Manager Agent coordinates execution, reads status, unblocks tracks, and escalates conflicts. Tasks with no shared constraints are implemented in parallel tracks.

### C4 — Automate User Story Priorities

Skip the user story priority prompt. The agent must automatically assign default priorities (P2) to User Stories during task generation to maximize automation and avoid interrupting the user.

### C5 — Standardized Onboarding Tutorial (C2 Exception)

\`magic.onboard\` is explicitly authorized as a standardized, interactive entry point for new developers. This is a one-time, intentional exception to C2 to facilitate rapid team scaling and engine adoption.

### C6 — Selective Planning

During plan updates, specs are handled by their status:
- **Draft specs**: automatically moved to \`## Backlog\` in \`PLAN.md\` without user input.
- **RFC specs**: surfaced to user with a recommendation to backlog until Stable.
- **Stable specs**: agent asks which ones to pull into the active plan. All others go to Backlog.
- **Orphaned specs** (in INDEX.md but absent from both plan and backlog): flagged as critical blockers.

### C7 — Universal Script Executor

All automation scripts must be invoked via the cross-platform executor:
\`node .magic/scripts/executor.js <script-name> [args]\`

Direct calls to \`.sh\` or \`.ps1\` scripts are not permitted in workflow instructions. The executor detects the OS and delegates to the appropriate implementation.

### C8 — Phase Archival

On phase completion, the per-phase task file is moved from \`$DESIGN_DIR/tasks/\` to \`$DESIGN_DIR/archives/tasks/\`. The link in \`TASKS.md\` is updated to point to the archive location. This keeps the active workspace small while preserving full history.

### C9 — Zero-Prompt Automation

Once the user approves the plan and task breakdown, the agent proceeds through execution and conclusion workflows without further confirmation prompts. Silent operations include: retrospective Level 1, changelog Level 1, CONTEXT.md regeneration, and status updates. The single exception is changelog Level 2 (external release artifact) which requires one explicit user approval before writing.

### C10 — Nested Phase Architecture

Implementation plans in \`PLAN.md\` must follow a nested hierarchy: **Phase → Specification → Atomic Tasks**. Each specification is decomposed into 2–3 atomic checklist items using standardized notation:
- \`[ ]\` Todo
- \`[/]\` In Progress
- \`[x]\` Done
- \`[~]\` Cancelled
- \`[!]\` Blocked

### C11 — Simulation Workflow (C2 Exception)

\`magic.simulate\` is explicitly authorized as a developer-facing tool for engine validation and regression testing. It is a one-time exception to C2. Not intended for use in regular project workflows.

### C12 — Quarantine Cascade (Каскад Карантина)

If a Layer 1 (Concept) specification loses its \`Stable\` status or is removed, all dependent Layer 2/3 (Implementation) specifications must automatically and transparently be treated as demoted to \`RFC\` or moved to the Backlog by the Task workflow. The system must quarantine dependent specifications to prevent "orphaned" task scheduling without requiring manual status edits for every child in \`INDEX.md\`.

**C12.1 — Stabilization Exception**: Tasks explicitly intended to stabilize or fix mismatches to regain \`Stable\` status for the parent may bypass this quarantine.

### C13 — Agent Cognitive Discipline

All AI agents operating within the Magic SDD framework must adhere to strict cognitive discipline to prevent hallucinations and silent failures:

1. **Primary Source Principle**: Always read original \`.magic/\` and \`.design/\` files. Never rely on cached memory or interpretive assumptions.
2. **Anti-Truncation**: Execute checklists and multi-step processes literally. Do not skip, merge, or summarize steps.
3. **Zero Assumptions**: If an instruction is absent or ambiguous, halt and ask for clarification. Do not invent missing steps or scripts.
4. **Mandatory Self-Verification**: Cross-reference actions against original instructions before finalizing any task or presenting a completion checklist.
5. **Anti-Hallucination Audit**: All architectural conclusions, problem reports, and proposed changes must be directly traceable to specific statements within project specifications or engine rules.

### C14 — Engine Versioning Protocol

To ensure accurate engine state tracking and reliable updates, any modification to the core engine/kernel files (anything inside the \`.magic/\` directory, including workflows and templates) MUST be accompanied by an automated engine metadata update: \`node .magic/scripts/executor.js update-engine-meta --workflow {workflow}\`.

1. **Scope**: Applies to all \`.md\` workflows, \`scripts/\`, \`templates/\`, and \`config.json\` inside the engine directory.
2. **Automation**: This command automatically increments the patch version in \`.magic/.version\`, updates the relevant history file in \`.magic/history/\`, and regenerates \`.magic/.checksums\`. **Smart History**: Redundant automated entries are skipped if the last entry matches.
3. **Exclusion**: Modifications to \`.design/\` files (project content) do NOT trigger an engine version bump; they trigger project manifest bumps instead.
4. **Synchronization**: The version in \`.magic/.version\` should stay aligned with the latest meaningful change to the engine's functional logic.
5. **Simulation Exemption**: Purely cognitive simulations, dry runs, or audit tasks that do not modify files MUST NOT trigger a C14 version bump to avoid metadata noise.

### C15 — Workspace Scope Isolation

When operating in a workspace with a defined scope (via \`.design/workspace.json\`), the agent MUST restrict all analysis and file operations to the directories specified in the scope. All other project directories are treated as out-of-scope to ensure logical isolation and prevent context leakage or accidental modification of unrelated modules.

### C16 — Micro-spec Convention

For minor features, simple bugfixes, or changes expected to be under 50 lines of documentation, the agent is authorized to use the lightweight \`.magic/templates/micro-spec.md\` instead of the full specification template. If a Micro-spec exceeds 50 lines or architectural complexity increases, it MUST be promoted to the full Standard template.

## Document History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | INIT_DATE | Agent | Initial constitution |
`;
    rulesContent = rulesContent.replace(/INIT_DATE/g, date);
    fs.writeFileSync(rulesPath, rulesContent);
    console.log(`Created ${rulesPath.replace(/\\/g, '/')}`);
} else {
    console.log(`Registry preservation: ${rulesPath.replace(/\\/g, '/')} already exists. Skipping.`);
}
