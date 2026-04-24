# Graph Report - .  (2026-04-24)

## Corpus Check
- 29 files · ~22,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 192 nodes · 307 edges · 15 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Installer Architecture & Adapters|Installer Architecture & Adapters]]
- [[_COMMUNITY_Workflow Meta-Process & Rationale|Workflow Meta-Process & Rationale]]
- [[_COMMUNITY_Python Installer Internals|Python Installer Internals]]
- [[_COMMUNITY_Node Installer Internals|Node Installer Internals]]
- [[_COMMUNITY_Specification & Task Workflows|Specification & Task Workflows]]
- [[_COMMUNITY_Integration Test Suite|Integration Test Suite]]
- [[_COMMUNITY_SDD Engine & Checksums|SDD Engine & Checksums]]
- [[_COMMUNITY_Publish & Versioning Pipeline|Publish & Versioning Pipeline]]
- [[_COMMUNITY_Test Runner Script|Test Runner Script]]
- [[_COMMUNITY_SkillWorkflow Pairs|Skill/Workflow Pairs]]
- [[_COMMUNITY_Adapter Flag Parsing Tests|Adapter Flag Parsing Tests]]
- [[_COMMUNITY_SDD Philosophy|SDD Philosophy]]
- [[_COMMUNITY_Installer CLI & README|Installer CLI & README]]
- [[_COMMUNITY_magic_spec Package Init|magic_spec Package Init]]
- [[_COMMUNITY_Dev Mode Installation|Dev Mode Installation]]

## God Nodes (most connected - your core abstractions)
1. `TestIntegration` - 18 edges
2. `main()` - 17 edges
3. `main()` - 16 edges
4. `main() (Python entrypoint)` - 14 edges
5. `main() (Node entrypoint)` - 13 edges
6. `main()` - 11 edges
7. `Workflow: magic.spec` - 11 edges
8. `Workflow: magic.task` - 9 edges
9. `installAdapter()` - 7 edges
10. `install_adapter()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Thin-Client Installer Architecture` --implements--> `Node Installer CLI (index.js)`  [INFERRED]
  AGENTS.md → installers/node/index.js
- `Thin-Client Installer Architecture` --implements--> `Python Installer CLI (__main__.py)`  [INFERRED]
  AGENTS.md → installers/python/magic_spec/__main__.py
- `magic_spec __version__ 1.5.170` --shares_data_with--> `installers/config.json (shared config)`  [INFERRED]
  installers/python/magic_spec/__init__.py → installers/config.json
- `Node Installer CLI (index.js)` --shares_data_with--> `installers/config.json (shared config)`  [INFERRED]
  installers/node/index.js → installers/config.json
- `loadInstallerConfig()` --references--> `installers/config.json (shared config)`  [EXTRACTED]
  installers/node/index.js → installers/config.json

## Hyperedges (group relationships)
- **Cross-language installer parity (Node and Python implement same CLI surface)** — node_index_installer_cli, main_py_installer_cli, installer_config_json, installer_adapters_json [INFERRED 0.90]
- **Engine Integrity enforcement flow (checksums + conflict detector + C14)** — concept_checksums_passport, concept_conflict_detector, concept_c14_update_engine_meta, node_index_handleConflicts, main_py_handle_conflicts [EXTRACTED 0.90]
- **Release publication pipeline (version bump → git tag → npm/pypi publish)** — publish_py_update_python_version, publish_py_update_node_version, publish_py_update_magic_version, publish_py_commit_and_tag, publish_py_publish_python, publish_py_publish_node [EXTRACTED 0.95]
- **SDD Core Workflow Pipeline (Spec -> Task -> Run)** — spec_workflow, task_workflow, run_workflow, retrospective_workflow [EXTRACTED 0.95]
- **C24 Persona Audits Across Workflows** — spec_critic_persona, task_planning_skeptic, run_tester_persona, rule_constitutional_reviewer, simulate_skeptic_persona, retrospective_independent_analyst [INFERRED 0.90]
- **Skills Wrap Workflow Files** — skill_magic_spec, skill_magic_task, skill_magic_run, skill_magic_rule, skill_magic_analyze, workflow_magic_spec, workflow_magic_task, workflow_magic_run, workflow_magic_rule, workflow_magic_analyze [EXTRACTED 0.90]

## Communities

### Community 0 - "Installer Architecture & Adapters"
Cohesion: 0.1
Nodes (28): Adapter Pattern (cursor/windsurf/gemini/claude), sync-skills.js (Skill Wrapper projection), installers/adapters.json (adapter registry), _append_to_gitignore() (Python), _convert_to_mdc() (Python), download_and_extract(), _get_directory_checksums() (Python), _handle_conflicts() (+20 more)

### Community 1 - "Workflow Meta-Process & Rationale"
Cohesion: 0.15
Nodes (25): _append_to_gitignore(), _convert_to_mdc(), _copy_dir(), create_backup(), _detect_environments(), download_and_extract(), _find_installer_config_path(), _get_directory_checksums() (+17 more)

### Community 2 - "Python Installer Internals"
Cohesion: 0.19
Nodes (24): appendToGitignore(), askQuestion(), collectEnvValues(), convertToMdc(), convertToToml(), copyDir(), createBackup(), detectEnvironments() (+16 more)

### Community 3 - "Node Installer Internals"
Cohesion: 0.13
Nodes (5): Test that installers correctly convert Markdown to TOML for Gemini adapter., Test that installers correctly convert Markdown to MDC for Windsurf adapter., Test the --doctor flag in the python installer., Test the --doctor flag in the node installer., TestIntegration

### Community 4 - "Specification & Task Workflows"
Cohesion: 0.2
Nodes (13): commit_and_tag(), get_current_old_version(), get_magic_version_target(), load_env(), main(), publish_node(), publish_python(), run_command() (+5 more)

### Community 5 - "Integration Test Suite"
Cohesion: 0.17
Nodes (15): .agents/workflows/ slash commands, .design/ Workspace, .magic/ Engine, Pipeline: Thought → Spec → Task → Run → Code, Project Anatomy: Engine / Installers / Design, Specification-Driven Development (SDD), Thin-Client Installer Architecture, installers/config.json (shared config) (+7 more)

### Community 6 - "SDD Engine & Checksums"
Cohesion: 0.28
Nodes (15): .magic/analyze.md Engine Implementation, .magic/rule.md Engine Implementation, .magic/run.md Engine Implementation, .magic/spec.md Engine Implementation, .magic/task.md Engine Implementation, Skill: magic.analyze, Skill: magic.rule, Skill: magic.run (+7 more)

### Community 7 - "Publish & Versioning Pipeline"
Cohesion: 0.25
Nodes (10): Verifies that --dev flag installs development-specific files.      Args:, Discovers and runs all unit tests in the tests directory.      Returns:, Resets the sandbox directory for clean testing.      Deletes the existing sandbo, Runs a shell command and captures output.      Args:         cmd: List of comman, Tests the specified installer against all defined adapters.      Args:         i, reset_sandbox(), run_all_tests(), run_cmd() (+2 more)

### Community 8 - "Test Runner Script"
Cohesion: 0.25
Nodes (5): magic_spec __version__ 1.5.170, publish.py main(), update_node_version(), update_python_version(), TestPublish

### Community 9 - "Skill/Workflow Pairs"
Cohesion: 0.25
Nodes (3): Verify that the Node installer logic correctly identifies --cursor flag., Verify that the Python installer logic correctly identifies --cursor flag from s, TestAdapterFlags

### Community 10 - "Adapter Flag Parsing Tests"
Cohesion: 0.5
Nodes (4): Adapter Shortcuts, Installer CLI Commands, Magic Spec Installers, Thin Client Architecture

### Community 11 - "SDD Philosophy"
Cohesion: 1.0
Nodes (1): magic-spec: Specification-Driven Development (SDD) Workflow Installer.

### Community 12 - "Installer CLI & README"
Cohesion: 1.0
Nodes (1): --dev installation mode (dev workflows/skills)

### Community 14 - "magic_spec Package Init"
Cohesion: 1.0
Nodes (1): CHANGELOG 1.5.176 (Spec Graph)

### Community 15 - "Dev Mode Installation"
Cohesion: 1.0
Nodes (1): CHANGELOG 1.5.170 (Read-Only Invariant)

## Knowledge Gaps
- **28 isolated node(s):** `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`, `Returns the tarball URL for the given version tag.`, `Returns the installed package version from __init__.py.`, `Resets the sandbox directory for clean testing.      Deletes the existing sandbo`, `Runs a shell command and captures output.      Args:         cmd: List of comman` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `SDD Philosophy`** (2 nodes): `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`, `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Installer CLI & README`** (2 nodes): `--dev installation mode (dev workflows/skills)`, `run_tests.test_dev_mode()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `magic_spec Package Init`** (1 nodes): `CHANGELOG 1.5.176 (Spec Graph)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dev Mode Installation`** (1 nodes): `CHANGELOG 1.5.170 (Read-Only Invariant)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `install_adapter()` connect `Workflow Meta-Process & Rationale` to `Node Installer Internals`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `main() (Python entrypoint)` connect `Installer Architecture & Adapters` to `Integration Test Suite`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `magic-spec: Specification-Driven Development (SDD) Workflow Installer.`, `Returns the tarball URL for the given version tag.`, `Returns the installed package version from __init__.py.` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Installer Architecture & Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Node Installer Internals` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._