# Rule Module: Bug Reporting

Loaded on demand from `AGENT-RULES.md` (section 9). Paths are relative to the `magicspec` skill folder.

## 9. Bug Reporting Protocol (Engine Feedback)

The engine folder (the `magicspec` skill folder) is strictly read-only for standard workflows. If you find a bug, logic mismatch, or experience a crash in any engine script or layout, do NOT attempt to edit or fix it yourself. Instead, formulate a structured report so the user can easily submit it.

### Trigger

Any engine-level script error, template mismatch, run-time crash, or logic bug detected in the skill folder.

### Action

Output a dedicated, highly visible Markdown alert block for the user. Do not proceed to execute the task if the engine bug blocks correctness.

### Recording (Diagnostics Digest)

The chat block above is a one-shot emission — in a long session it scrolls away long before the work ends, and a user reading only the final summary never sees it. Alongside it, record the finding so it also survives to the next finalize digest:

```bash
node scripts/executor.js record-diagnostic \
    --severity=error --source=agent --code=<UPPER_SNAKE_CASE> \
    --message="<one line, matches the Symptom above>" \
    [--locus=<engine file:line>] [--remedy="<suggested fix, if any>"]
```

This applies to every finding the agent records this way — not only engine bugs: a specification ambiguity hit mid-execution, a containment leak spotted while reading a product file, or a guard the agent had to work around all qualify. Use `--severity=warning` for anything that did not block the task. The command always exits 0, including when the finding is malformed — recording a complaint never itself fails. This is not a substitute for a HALT: a finding that must stop the work still stops the work; recording is for what the run survives.

### Report Template

```markdown
> [!CAUTION]
> **MAGIC-SPEC ENGINE BUG REPORT**
>
> **Symptom:** {Clear description of the error / crash / unexpected behavior}
> **Engine Version:** {Local version from .version}
> **Environment Context:** {Workflow, Workspace, OS, Node version}
> **File/Line:** {Path and line number inside the engine directory if applicable}
> **Reproduction / Context:**
> - Command executed: `{command}`
> - State / Action during failure: `{action}`
> **Hypothesis / Fix:** {Your technical explanation or suggested fix, if any}
```
