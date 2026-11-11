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

### Feedback Notes (Engine Feedback Channel)

The chat block and the digest finding are two exits. A third keeps what you learn about the engine as a note, so it survives the session and any compaction and can be offered at the end of the work as a report the person can send:

```bash
node scripts/executor.js feedback note --kind={bug|missing-capability|improvement|docs} \
    --summary="<one line>" --tried="<what you tried>" --happened="<what happened>" \
    [--expected="<…>"] [--suggestion="<…>"] [--impact=blocked|workaround|minor] \
    [--engine-file=<path inside the skill folder>] [--code=<UPPER_SNAKE_CASE>] [--workflow=<command>]
```

- **Every `MAGIC-SPEC ENGINE BUG REPORT` you emit is also recorded as a `bug` note** (beside `record-diagnostic`), so reports accumulate instead of scrolling away.
- **Kinds:** `bug` — the engine does not do what its text says; `missing-capability` — something the work needed and the engine lacks; `improvement` — it works and could work better; `docs` — an instruction that is misleading, ambiguous or missing.
- **Not worth a note:** a defect of the user's product, of the host, or of the user's environment. Those are not the engine's.
- **A note carries no project content:** no code, file contents, task text, plan, secret or personal name. The engine scrubs what it drafts, but the text you write is the first gate.
- **The channel** is the setting `feedback.channel` of `.magicspec/workspace.json`: `full` (the default: copy, link, submission), `draft` (text and link only; you can never publish) or `off` (no notes, no offer). An unrecognized value means `draft`. The command always exits 0; recording a note never changes a workflow's result.

#### Offering the drafts

When a workflow ends with notes pending, offer each draft **once**: run `node scripts/executor.js feedback draft`, show the person the complete report it prints, and offer three answers — **submit** (`feedback submit {draft-id}`, only after the person's explicit yes to the draft you showed, never on your own and never in the `draft` channel; add `--new` only if the person asks for a new issue although an open one carries the fingerprint), **keep as text** (`feedback keep {draft-id}`) or **discard** (`feedback discard {draft-id}`). The answer closes the draft. A draft left unanswered is listed again in the next digest; do not ask again. Submission reports exactly one of `created`, `duplicate found`, `not created` (with one recovery step) or `unknown` (check the tracker before retrying); never say a report was filed unless it said `created`.

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
