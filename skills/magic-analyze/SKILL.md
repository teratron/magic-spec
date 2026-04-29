---
name: magic-analyze
description: Project Ventilation — audits health, registry, and rule compliance
handoffs:
  - label: "Create specifications"
    workflow: magic-spec
    prompt: "Proceed to create suggested specifications for uncovered areas."
    condition: "gaps_detected"
  - label: "Generate tasks"
    workflow: magic-task
    prompt: "Plan repairs and task synchronization for discovered issues."
    condition: "repairs_needed"
---

<!-- ⚠️ GENERATED FILE - DO NOT EDIT MANUALLY. SOURCE: workflows/magic.analyze.md (relative to workspace root) -->

# Analyze Workflow

Perform a deep "Ventilation" scan of the project. This command checks for spec/code drift, missing coverage, engine metadata integrity, and provides advisory recommendations.

1. **Analyze & Ventilate**: Read `.magic/analyze.md` and execute its steps.
2. **Report**: provide a consolidated report of findings and suggested repairs.
3. **Advisory**: append actionable recommendations for spec quality, coverage, and structure improvements.

Trigger: `/magic-analyze [arg]`, "Ventilate", "Analyze project"

Arguments:

- *(empty)* — full analysis across all workspaces
- `{workspace}` — scoped analysis with structural integrity checks
- `"text"` — focused analysis on a specific area/concern
- `{workspace} "text"` — focused analysis within a workspace

Examples: `/magic-analyze`, `/magic-analyze engine`, `/magic-analyze "check API"`, `/magic-analyze docs "focus on examples"`
// turbo-all