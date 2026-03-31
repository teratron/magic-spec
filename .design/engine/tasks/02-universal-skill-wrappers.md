# Task 02: Universal Skill Wrappers Implementation

## [T-2A01] Create `sync-skills.js` automation script

- **Spec:** [l2-skill-wrappers.md](../specifications/l2-skill-wrappers.md) §3.1
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Script should be located in `.magic/scripts/sync-skills.js`. It must scan `workflows/` and `.agents/workflows/`, extract descriptions (YAML or 1st paragraph), and generate/update `skills/` and `.agents/skills/` directories with correct `SKILL.md` files.

## [T-2A02] Update `magic-dev-init` for skill junction support

- **Spec:** [l2-skill-wrappers.md](../specifications/l2-skill-wrappers.md) §4.1
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Update `.agents/skills/magic-dev-init/scripts/setup_windows.ps1` to include `junction` creation for both `workflows/` and `skills/`. Ensure existing linked paths in `.claude/`, `.gemini/`, etc., include the new `skills` folder if the agent supports it.

## [T-2I01] Update Node.js/Python installers

- **Spec:** [l2-skill-wrappers.md](../specifications/l2-skill-wrappers.md) §4.2
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Modify `installers/node/installer.js` and `installers/python/magic_spec/cli.py` to trigger `sync-skills.js` (or inline logic) after engine extraction. Ensure the "Skill Wrappers" are deployed to user projects by default.

## [T-2M01] Update `adapters.json` mapping

- **Spec:** [l2-skill-wrappers.md](../specifications/l2-skill-wrappers.md) §2
- **Status:** Done
- **Assignee:** Agent
- **Notes:** Review `installers/adapters.json`. Ensure that each agent's `dest` path is correctly configured to receive both workflows and skills if they support them.
