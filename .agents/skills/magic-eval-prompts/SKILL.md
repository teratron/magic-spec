---
name: magic-eval-prompts
description: Semantic evaluation of markdown prompt, skill, instruction, and rule files. Detects contradictions, ambiguity, persona conflicts, cognitive load issues, and coverage gaps.
---

# Evaluate Prompt Files

LLM-powered semantic analysis of markdown files used as AI agent instructions — skills, workflows, rules, and other prompt files. Inspired by the [VS Code Chat Customizations Evaluations](https://github.com/microsoft/vscode-chat-customizations-evaluation) extension.

**Triggers:** *"Evaluate prompts"*, *"Check skills"*, *"Analyze instructions"*, *"Lint markdown prompts"*

## Arguments

```
/magic-eval-prompts [targets...]
```

| Mode | Effect |
| --- | --- |
| `/magic-eval-prompts` | Scan all project prompt files (see [Target Files](#target-files)) |
| `/magic-eval-prompts SKILL.md` | Analyze a single file |
| `/magic-eval-prompts AGENTS.md rules/watch.md` | Analyze specific files |
| `/magic-eval-prompts .agents/skills/` | Analyze all prompt files in a directory (recursive) |

## Target Files

When run without arguments, the skill discovers files by glob patterns relative to the project root:

| Glob | Type |
| --- | --- |
| `AGENTS.md` | Agent master instructions |
| `rules/*.md` | Rule files |
| `workflows/*.md` | Workflow files |
| `.agents/skills/*/SKILL.md` | Skill files |
| `.agents/workflows/*.md` | Agent workflow wrappers |
| `.agents/rules/*.md` | Agent rule wrappers |
| `*.instructions.md` | Instruction files |
| `*.prompt.md` | Prompt files |
| `*.agent.md` | Agent files |

When a directory is passed as an argument, recursively find `*.md` files within it.

> Skip `node_modules/`, `.git/`, `dist/`, `out/`, `.references/`, and `__pycache__/` directories.

## Analysis Categories

For **each** file, perform the following semantic analyses. These correspond to the diagnostic categories from the reference evaluator.

### 1. Contradiction Detection

Find instructions that directly conflict with each other. Explain exactly **why** they conflict and what behavior the model would exhibit.

### 2. Semantic Ambiguity

Find vague or underspecified instructions that a model could interpret in multiple ways. Explain the different possible interpretations and suggest a concrete rewrite.

### 3. Persona Consistency

Find places where the expected tone, personality, or role contradicts itself. Explain the specific mismatch.

### 4. Cognitive Load Assessment

Find overly complex instruction patterns — deeply nested conditions, too many competing priorities, unclear precedence. Explain why they are hard for a model to follow.

### 5. Semantic Coverage

Find scenarios or edge cases the prompt doesn't address where the model would have to guess. Identify missing error handling.

### 6. Composition Conflict Analysis

If the file links to other prompt files via markdown references (`[text](path)`), detect conflicts between the current file and linked/imported files:

- Behavioral conflicts (e.g., "Never refuse" in one file vs "Refuse harmful requests" in another)
- Format conflicts (e.g., "limit to 10 words" in one file vs "include code blocks" in another)
- Priority conflicts (two files both claiming highest priority)

## Quality Bar

- Only report issues with **high confidence** that they are real and materially harmful.
- Do NOT report speculative, stylistic, or low-impact nits.
- If evidence is weak or ambiguous, do not include that finding.
- It is valid to report no issues when the file is already strong.
- Prefer **precision over recall**: fewer findings is better than uncertain ones.

## Procedure

### Step 1: Discover Files

- If arguments are provided, resolve each argument:
  - If it is a file path — add to target list.
  - If it is a directory — recursively find `*.md` files (excluding skip-dirs above).
- If no arguments — use the glob patterns from [Target Files](#target-files) to discover all prompt files.

### Step 2: Read and Analyze Each File

For each target file:

1. **Read** the entire file content.
2. **Run all 6 analysis categories** from [Analysis Categories](#analysis-categories).
3. For composition conflicts, also read any linked markdown files referenced via `[text](relative/path.md)` links (skip external URLs, skip non-`.md` links).
4. **Collect findings** as structured diagnostics.

### Step 3: Report Results

Present a structured report for each file that has findings:

```markdown
## 📄 `path/to/file.md`

### ⚠️ Contradiction
**Line ~N:** `<exact text from the file>`
conflicts with **Line ~M:** `<exact conflicting text>`
**Explanation:** <why these conflict>

### 🔍 Ambiguity
**Text:** `<exact ambiguous text>`
**Problem:** <multiple interpretations>
**Suggestion:** <concrete rewrite>

### 🎭 Persona Inconsistency
**Description:** <what is inconsistent>
**Traits:** `<trait1>` vs `<trait2>`
**Suggestion:** <how to reconcile>

### 🧠 Cognitive Load
**Type:** nested-conditions | priority-conflict | deep-decision-tree | constraint-overload
**Text:** `<relevant text>`
**Problem:** <why it's hard to follow>
**Suggestion:** <restructuring advice>

### 📋 Coverage Gap
**Gap:** <scenario not addressed>
**Impact:** high | medium | low
**Suggestion:** <text to add>

### 🔗 Composition Conflict
**Summary:** <short description>
**File A:** `<instruction from this file>`
**File B:** `<instruction from linked file>`
**Suggestion:** <how to resolve>
```

### Step 4: Summary

After all files are analyzed, output a summary table:

```markdown
## Summary

| File | Contradictions | Ambiguity | Persona | Cognitive | Coverage | Composition | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | 1 | 2 | 0 | 1 | 3 | 0 | 7 |
| `rules/watch.md` | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| **Total** | **1** | **2** | **0** | **1** | **4** | **0** | **8** |
```

If all files are clean, report:

```
✅ All N files analyzed — no issues found.
```

### Step 5: Fix Suggestions (Optional)

If the user requests fixes (e.g., "fix them", "apply suggestions"), apply the suggested changes directly to the files:

- Use the suggestion from each diagnostic.
- Preserve overall structure, tone, and intent of the file.
- Only change what is necessary to resolve the diagnostic.
- If two diagnostics conflict, prefer the fix that keeps the prompt clearer and more consistent.
- Do NOT add new instructions or sections that were not in the original file.
- Do NOT remove instructions unless a diagnostic specifically calls for it.

## Constraints

- All report output and suggestions must be in **English** (technical content).
- Conversational discussion around findings may be in **Russian** per project rules.
- Do not analyze frontmatter (YAML between `---` delimiters) — focus on the instruction body.
- Maximum file size to analyze: 100 KB. Skip larger files with a warning.
