# Graph Report - D:\Projects\src\github.com\teratron\magic-spec  (2026-04-24)

## Corpus Check
- 8 files · ~31,617 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 87 nodes · 94 edges · 28 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `main() (Python entrypoint)` - 12 edges
2. `main() (Node entrypoint)` - 11 edges
3. `Workflow: magic.spec` - 11 edges
4. `Workflow: magic.task` - 9 edges
5. `publish.py main()` - 6 edges
6. `Skill: magic.spec` - 5 edges
7. `Workflow: magic.run` - 5 edges
8. `Node Installer CLI (index.js)` - 4 edges
9. `installAdapter() (Node)` - 4 edges
10. `install_adapter() (Python)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Node Installer CLI (index.js)` --implements--> `Thin-Client Installer Architecture`  [INFERRED]
  installers/node/index.js → AGENTS.md
- `Python Installer CLI (__main__.py)` --implements--> `Thin-Client Installer Architecture`  [INFERRED]
  installers/python/magic_spec/__main__.py → AGENTS.md
- `Skill: magic.rule` --references--> `.magic/rule.md Engine Implementation`  [INFERRED]
  skills/magic.rule/SKILL.md → .magic/rule.md
- `Skill: magic.spec` --references--> `.magic/spec.md Engine Implementation`  [EXTRACTED]
  skills/magic.spec/SKILL.md → .magic/spec.md
- `Workflow: magic.spec` --references--> `.magic/spec.md Engine Implementation`  [EXTRACTED]
  workflows/magic.spec.md → .magic/spec.md

## Hyperedges (group relationships)
- **Cross-language installer parity (Node and Python implement same CLI surface)** — node_index_installer_cli, main_py_installer_cli, installer_config_json, installer_adapters_json [INFERRED 0.90]
- **Engine Integrity enforcement flow (checksums + conflict detector + C14)** — concept_checksums_passport, concept_conflict_detector, concept_c14_update_engine_meta, node_index_handleConflicts, main_py_handle_conflicts [EXTRACTED 0.90]
- **Release publication pipeline (version bump → git tag → npm/pypi publish)** — publish_py_update_python_version, publish_py_update_node_version, publish_py_update_magic_version, publish_py_commit_and_tag, publish_py_publish_python, publish_py_publish_node [EXTRACTED 0.95]
- **SDD Core Workflow Pipeline (Spec -> Task -> Run)** — spec_workflow, task_workflow, run_workflow, retrospective_workflow [EXTRACTED 0.95]
- **C24 Persona Audits Across Workflows** — spec_critic_persona, task_planning_skeptic, run_tester_persona, rule_constitutional_reviewer, simulate_skeptic_persona, retrospective_independent_analyst [INFERRED 0.90]
- **Skills Wrap Workflow Files** — skill_magic_spec, skill_magic_task, skill_magic_run, skill_magic_rule, skill_magic_analyze, workflow_magic_spec, workflow_magic_task, workflow_magic_run, workflow_magic_rule, workflow_magic_analyze [EXTRACTED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (17): _append_to_gitignore() (Python), _get_directory_checksums() (Python), _handle_conflicts(), main() (Python entrypoint), run_check(), run_doctor(), run_eject(), run_info() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.28
Nodes (15): .magic/analyze.md Engine Implementation, .magic/rule.md Engine Implementation, .magic/run.md Engine Implementation, .magic/spec.md Engine Implementation, .magic/task.md Engine Implementation, Skill: magic.analyze, Skill: magic.rule, Skill: magic.run (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.29
Nodes (4): publish.py main(), update_node_version(), update_python_version(), TestPublish

### Community 3 - "Community 3"
Cohesion: 0.4
Nodes (6): .agents/workflows/ slash commands, .design/ Workspace, .magic/ Engine, Pipeline: Thought → Spec → Task → Run → Code, Project Anatomy: Engine / Installers / Design, Specification-Driven Development (SDD)

### Community 4 - "Community 4"
Cohesion: 0.6
Nodes (5): Thin-Client Installer Architecture, Python Installer CLI (__main__.py), Node Installer CLI (index.js), TestAdapterFlags, TestIntegration

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): _convert_to_mdc() (Python), install_adapter() (Python), convertToMdc() (Node), installAdapter() (Node)

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (4): download_and_extract(), _safe_extract_tar(), downloadPayload(), Rationale: path traversal tar safety check

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (4): Adapter Shortcuts, Installer CLI Commands, Magic Spec Installers, Thin Client Architecture

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (1): magic-spec: Specification-Driven Development (SDD) Workflow Installer.

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (1): Rationale: config.json as single source of truth

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (1): Returns the tarball URL for the given version tag.

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (1): Returns the installed package version from __init__.py.

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (1): Resets the sandbox directory for clean testing.      Deletes the existing sandbo

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (1): Runs a shell command and captures output.      Args:         cmd: List of comman

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (1): Tests the specified installer against all defined adapters.      Args:         i

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (1): Verifies that --dev flag installs development-specific files.      Args:

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (1): Discovers and runs all unit tests in the tests directory.      Returns:

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Verify that the Python installer logic correctly identifies --cursor flag from s

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): Verify that the Node installer logic correctly identifies --cursor flag.

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Test the --doctor flag in the python installer.

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Test the --doctor flag in the node installer.

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Test that installers correctly convert Markdown to TOML for Gemini adapter.

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Test that installers correctly convert Markdown to MDC for Windsurf adapter.

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): Adapter Pattern (cursor/windsurf/gemini/claude)

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): CHANGELOG 1.5.176 (Spec Graph)

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): CHANGELOG 1.5.170 (Read-Only Invariant)

## Knowledge Gaps
- **27 isolated node(s):** `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`, `Rationale: config.json as single source of truth`, `Returns the tarball URL for the given version tag.`, `Returns the installed package version from __init__.py.`, `Resets the sandbox directory for clean testing.      Deletes the existing sandbo` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (2 nodes): `__init__.py`, `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `Rationale: config.json as single source of truth`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `run_tests.test_dev_mode()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (1 nodes): `run_tests.run_all_tests()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `Returns the tarball URL for the given version tag.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `Returns the installed package version from __init__.py.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `Resets the sandbox directory for clean testing.      Deletes the existing sandbo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `Runs a shell command and captures output.      Args:         cmd: List of comman`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `Tests the specified installer against all defined adapters.      Args:         i`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `Verifies that --dev flag installs development-specific files.      Args:`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `Discovers and runs all unit tests in the tests directory.      Returns:`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Verify that the Python installer logic correctly identifies --cursor flag from s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `Verify that the Node installer logic correctly identifies --cursor flag.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Test the --doctor flag in the python installer.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `Test the --doctor flag in the node installer.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Test that installers correctly convert Markdown to TOML for Gemini adapter.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Test that installers correctly convert Markdown to MDC for Windsurf adapter.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `Adapter Pattern (cursor/windsurf/gemini/claude)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `CHANGELOG 1.5.176 (Spec Graph)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `CHANGELOG 1.5.170 (Read-Only Invariant)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main() (Python entrypoint)` connect `Community 0` to `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `Thin-Client Installer Architecture` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`, `Rationale: config.json as single source of truth`, `Returns the tarball URL for the given version tag.` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._