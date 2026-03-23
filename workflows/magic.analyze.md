---
description: Project Ventilation — audits health, registry, and rule compliance
---
# Analyze Workflow

Perform a deep "Ventilation" scan of the project. This command checks for spec/code drift, missing coverage, engine metadata integrity, and provides advisory recommendations.

1. **Analyze & Ventilate**: Read `.magic/analyze.md` and execute its steps.
2. **Report**: provide a consolidated report of findings and suggested repairs.
3. **Advisory**: append actionable recommendations for spec quality, coverage, and structure improvements.

Trigger: `/magic.analyze [arg]`, "Ventilate", "Analyze project"

Arguments:

- *(empty)* — full analysis across all workspaces
- `{workspace}` — scoped analysis with structural integrity checks
- `"text"` — focused analysis on a specific area/concern
- `{workspace} "text"` — focused analysis within a workspace

Examples: `/magic.analyze`, `/magic.analyze engine`, `/magic.analyze "проверь API"`, `/magic.analyze installers "фокус на тестах"`
// turbo-all
