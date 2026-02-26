if (!(Test-Path -Path ".git")) {
    Write-Host "Note: not a git repository. Proceeding with SDD initialization anyway."
}

$D = ".design"
foreach ($dir in @($D, "$D/specifications", "$D/tasks", "$D/archives/tasks")) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
$Date = Get-Date -Format "yyyy-MM-dd"

$IndexPath = "$D/INDEX.md"
if (!(Test-Path $IndexPath)) {
    Set-Content $IndexPath -Encoding UTF8 @"
# Specifications Registry
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
- **Last Updated**: $Date
"@
    Write-Host "Created .design/INDEX.md"
}

$RulesPath = "$D/RULES.md"
if (!(Test-Path $RulesPath)) {
    Set-Content $RulesPath -Encoding UTF8 @"
# Project Specification Rules
**Version:** 1.0.0
**Status:** Active

## Overview
Constitution of the specification system for this project.
Read by the agent before every operation. Updated only via explicit triggers.

## 1. Naming Conventions
- Spec files use lowercase kebab-case: ``api.md``, ``database-schema.md``.
- System files use uppercase: ``INDEX.md``, ``RULES.md``.
- Section names within specs are title-cased.

## 2. Status Rules
- **Draft -> RFC**: all required sections filled, ready for review.
- **RFC -> Stable**: reviewed, approved, no open questions.
- **RFC -> Draft**: needs rework or significant revision.
- **Stable -> RFC**: substantive amendment (minor/major bump) requires re-review.
- **Any -> Deprecated**: explicitly superseded; replacement must be named.

## 3. Versioning Rules
- patch (0.0.X): typo fixes, clarifications, no structural change.
- minor (0.X.0): new section added or existing section extended.
- major (X.0.0): structural restructure or scope change.

## 4. Formatting Rules
- Use plaintext blocks for all directory trees.
- Use mermaid blocks for all flow and architecture diagrams.
- Do not use other diagram formats.

## 5. Content Rules
- No implementation code (no Rust, JS, Python, SQL, etc.).
- Pseudo-code and logic flows are permitted.
- Every spec must have: Overview, Motivation, Document History.

## 6. Relations Rules
- Every spec that depends on another must declare it in Related Specifications.
- Cross-file content duplication is not permitted -- use a link instead.
- Circular dependencies must be flagged and resolved.

## 7. Project Conventions

### C1 -- .magic/ Engine Safety

``.magic/`` is the active SDD engine. Any modification must follow this protocol:

1. **Read first** -- open and fully read every file that will be affected.
2. **Analyse impact** -- trace how the changed file is referenced by other engine files and workflow wrappers.
3. **Verify continuity** -- confirm that after the change all workflows remain fully functional.
4. **Never edit blindly** -- if the scope of impact is unclear, stop and ask before proceeding.
5. **Document the change** -- record modifications in the relevant spec and commit message.

### C2 -- Workflow Minimalism

Limit the SDD workflow to the core command set to maximize automation and minimize cognitive overhead. Do not introduce new workflow commands unless strictly necessary and explicitly authorized as a C2 exception.

### C3 -- Parallel Task Execution Mode

Task execution defaults to **Parallel mode**. A Manager Agent coordinates execution, reads status, unblocks tracks, and escalates conflicts. Tasks with no shared constraints are implemented in parallel tracks.

### C4 -- Automate User Story Priorities

Skip the user story priority prompt. The agent must automatically assign default priorities (P2) to User Stories during task generation to maximize automation and avoid interrupting the user.

### C5 -- Standardized Onboarding Tutorial (C2 Exception)

``magic.onboard`` is explicitly authorized as a standardized, interactive entry point for new developers. This is a one-time, intentional exception to C2 to facilitate rapid team scaling and engine adoption.

### C6 -- Selective Planning

During plan updates, specs are handled by their status:
- **Draft specs**: automatically moved to ``## Backlog`` in ``PLAN.md`` without user input.
- **Stable specs**: agent asks which ones to pull into the active plan. All others go to Backlog.
- **Orphaned specs** (in INDEX.md but absent from both plan and backlog): flagged as critical blockers.

### C7 -- Universal Script Executor

All automation scripts must be invoked via the cross-platform executor:
``node .magic/scripts/executor.js <script-name> [args]``

Direct calls to ``.sh`` or ``.ps1`` scripts are not permitted in workflow instructions. The executor detects the OS and delegates to the appropriate implementation.

### C8 -- Phase Archival

On phase completion, the per-phase task file is moved from ``.design/tasks/`` to ``.design/archives/tasks/``. The link in ``TASKS.md`` is updated to point to the archive location. This keeps the active workspace small while preserving full history.

### C9 -- Zero-Prompt Automation

Once the user approves the plan and task breakdown, the agent proceeds through execution and conclusion workflows without further confirmation prompts. Silent operations include: retrospective Level 1, changelog Level 1, CONTEXT.md regeneration, and status updates. The single exception is changelog Level 2 (external release artifact) which requires one explicit user approval before writing.

### C10 -- Nested Phase Architecture

Implementation plans in ``PLAN.md`` must follow a nested hierarchy: **Phase -> Specification -> Atomic Tasks**. Each specification is decomposed into 2-3 atomic checklist items using standardized notation:
- ``[ ]`` Todo
- ``[/]`` In Progress
- ``[x]`` Done
- ``[~]`` Cancelled
- ``[!]`` Blocked

### C11 -- Simulation Workflow (C2 Exception)

``.magic.simulate`` is explicitly authorized as a developer-facing tool for engine validation and regression testing. It is a one-time exception to C2. Not intended for use in regular project workflows.

## Document History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0 | $Date | Agent | Initial constitution |
"@
    Write-Host "Created .design/RULES.md"
}
