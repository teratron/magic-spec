# Skill Layout, Location Resolution & Delivery Order

**Version:** 1.6.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-skill-packaging.md

## Overview

The concrete shape of the single-skill engine: the folder tree, where every file of the present layout goes, how the engine locates the project and its own resources, how the version and integrity manifest cover the folder, how the developer repository is laid out and told apart, where the graph artifacts live, and the order in which the restructuring is delivered. The always-on rule, the command surfaces, installation and migration are in `l2-skill-distribution.md`.

## Related Specifications

- [l1-skill-packaging.md](l1-skill-packaging.md) - The ten packaging invariants this specification implements.
- [l2-skill-distribution.md](l2-skill-distribution.md) - Always-on rule, command surfaces, installation, archive, migration, state-folder rename.
- [l2-engine-automation.md](l2-engine-automation.md) - The executor, the engine-meta flow and the pre-flight checks whose paths this layout changes.
- [l2-agent-surface.md](l2-agent-surface.md) - The linked-pair inventory that this layout shrinks and replaces by a link inventory.
- [l2-spec-graph-memory.md](l2-spec-graph-memory.md) - The graph, wiki and cache whose output location §5.7 consolidates.
- [l2-test-suite.md](l2-test-suite.md) - The harness each delivery step must keep green.

## 1. Motivation

`l1-skill-packaging.md` fixes what packaging must guarantee. Five facts about the present code decide how it can be met:

- Five scripts derive the project root from their own depth in the tree (`finalize`, `resume-state`, `archive-phases`, `check-bloat` and the diagnostics library); most others already take it from the working directory. A folder move changes the depth, and a skill folder installed elsewhere changes it again.
- The state folder name is spelled out in 22 scripts and throughout the shipped text; renaming it is a mechanical change only if it is first made one definition.
- The integrity manifest and the engine version cover one of the four shipped folders (`l2-release-pipeline.md` §5.3).
- The developer repository is told apart from an installation by the presence of a file in a sibling folder, a probe that depends on the old layout (`hasEngineWriteTooling`).
- The shipped rule, the wrappers and the skills are three projections of the workflows, kept in step by hardlinks and a generator.

## 2. Constraints & Assumptions

- Node's module loader resolves a symbolic link or junction on the main script to its real path, so a script's own directory name is the real location of the skill, which for a linked or cached skill lies outside the project.
- A host skill name is 1-64 characters of lowercase letters, digits and hyphens, and its description is at most 1,024 characters (`l2-skill-wrappers.md` §2.3). One router description must therefore carry the selection signal of every command.
- A directory cannot be hardlinked; a directory link (junction on Windows, symbolic link elsewhere) can, and editing a file through it writes the real file.
- **Assumption (forecast):** the folder name equals the skill name (`magicspec`) in the developer repository and in every installation. Override: the generator reads the name from `SKILL.md`, never from the folder.

## 4. Invariant Compliance

| L1 Invariant | Implementation |
| --- | --- |
| SP-1 One folder, one version | §5.1 tree; §5.4 manifest covers every file in the folder except itself |
| SP-2 Location independence | §5.3 two resolvers: project root from the working context, skill root from the script's own file |
| SP-3 Projections generated | §5.1 lists no projection inside the tree; generation and staleness checks are in `l2-skill-distribution.md` §5.1-5.3 |
| SP-4 Always-on text outside | The rule's source is `AGENT-RULES.md` in the tree; installation is in `l2-skill-distribution.md` §5.1 |
| SP-5 One source per workflow | §5.2 folds each wrapper and body into one `workflows/` file; the router lists exactly those files |
| SP-6 Removable without trace | §5.1 holds no file outside the folder; the link and projection inventories (§5.6) name everything else |
| SP-7 Maintenance not shipped; one signal | §5.5 layout and the single predicate |
| SP-8 State is not engine | §5.3 state-folder resolver is one definition; §5.7 graph artifacts stay under the state folder |
| SP-9 Working engine at every step | §5.8 delivery order with exit criteria |
| SP-10 Explicit migration | `l2-skill-distribution.md` §5.6 |

## 5. Detailed Design

### 5.1 The Skill Folder

```plaintext
skills/magicspec/                  # in the developer repository; <host>/skills/magicspec/ in an installation
├── SKILL.md                       # router: command grammar, one selection line per command, pointers
├── AGENT-RULES.md                 # source of the always-on rule (installed outside, see distribution §5.1)
├── README.md                      # short description and install pointer
├── .version                       # the one engine version (SP-1)
├── .checksums                     # manifest of every other file in this folder
├── workflows/                     # one file per user-invokable command: analyze, graph, rule, run, spec, status, task
├── references/                    # shared and internal modules: context, init, retrospective, and long-form notes
├── roles/                         # role cards (shared by several workflows, so not under workflows/)
├── templates/                     # file scaffolds
└── scripts/                       # executor, subcommands, lib/, package.json
```

A file belongs in `workflows/` if and only if it is a command a user can invoke; the router's command table and the folder listing must name the same set (§5.2, parity).

### 5.2 Map from the Present Layout

| Present | New |
| --- | --- |
| `.magic/scripts/` (incl. `lib/`, `package.json`) | `scripts/` |
| `.magic/templates/`, `.magic/roles/` | `templates/`, `roles/` |
| `.magic/.version`, `.magic/.checksums` | `.version`, `.checksums` at the skill root |
| `.magic/{analyze,rule,run,spec,status,task}.md` and `workflows/magic.{...}.md` | `workflows/{...}.md`: the wrapper's entry section (triggers, arguments, scope, hints, handoffs as prose) becomes the head of the body; the wrapper file is removed |
| `workflows/magic.graph.md` (no body) | `workflows/graph.md` |
| `.magic/{context,init,retrospective}.md` | `references/{context,init,retrospective}.md` |
| `skills/magic-*/SKILL.md` (generated) | removed; replaced by the router `SKILL.md` and the generated surfaces of `l2-skill-distribution.md` §5.2 |
| `rules/magic.md` (and its `.agents/rules/` twin) | `AGENT-RULES.md`; the installed twin is a projection |
| `dev/scripts/`, `dev/tests/`, `dev/package.json` | repository-root `scripts/`, `tests/`, `package.json` (§5.5) |
| `.agents/skills/magic-dev-*`, `.agents/workflows/magic.dev.*.md` | `skills/magicspec-dev/workflows/{init,release,test,sync}.md`; the executable parts (init scripts, release script) to `scripts/`; the dotted names `/magic.dev.*` become `/magicspec-dev:{init,release,test,sync}` |
| `.magicspec/{wiki,spec-graph.html,graph-before.json,.graph-cache}` | `graph/` under the state folder (§5.7) |

The router replaces seven wrapper descriptions with one: its `description` is within the 1,024-character limit and states, in the Selection Signal form, what the engine does and when to use it, listing the commands by name. Per-command selection lines live in the router body, where a host reads them after choosing the skill.

### 5.3 Location Resolution

Two resolvers, defined once in the shared script library and used by every script; no script computes a path from its own depth.

**Skill root** - the folder holding `.version`, found from the calling script's own file by a fixed number of levels owned by the library (the scripts' directory is the only fixed point). It locates templates, roles, references, the version and the manifest. It is the *real* location (§2).

**Project root** - the first of:

1. the explicit `--root` argument or the `MAGIC_ROOT` environment variable;
2. the nearest ancestor of the working directory that contains the state folder;
3. the nearest ancestor that contains a `.git` entry;
4. the working directory itself (a project that has neither yet, as at first install).

The result is used to form every project path (`workspace.json`, specifications, `CHANGELOG.md`, the hook directory). An engine invoked from a subdirectory therefore acts on the same project as from the root. Scripts that read the working directory directly (`analyze-coverage`, `build-spec-graph`, `detect-communities`, `export-wiki`, the hook installer, the changelog rotation) move to the resolver in the first delivery step, before any file moves.

**State folder** - its name is one constant in the library (today `.magicspec`); neither a script nor the generator spells it. Shipped text spells it, so a rename is a mechanical edit guarded by a residue search (§5.8, step 5).

**Notation in shipped text** - workflow and reference text names engine resources relative to the skill folder (`scripts/executor.js`, `templates/spec.md`) and project resources relative to the project root. The agent resolves the former against the folder of the `SKILL.md` it loaded. No text inside the skill folder spells an installation path.

### 5.4 Version and Integrity

- `.version` and `.checksums` sit at the skill root. The manifest lists every file in the folder except itself and the volatile set (today only `.version`).
- `update-engine-meta` (write branch, developer repository only) bumps the patch version, regenerates the manifest and runs the projection generator; its `--check` branch (user-reachable) verifies the folder against the manifest. Both keep their present roles and the graceful-fallback rule for the maintenance scripts.
- Because the manifest now covers the whole folder, a change to a workflow, a role, a template, a script or the rule source is a version event on its own. This closes the gap recorded in `l2-release-pipeline.md` §5.3 (a change outside `.magic/` carried no version).
- Engine paths in hints, remedies and the hook are named by one helper pair in the script library: the engine folder relative to the project root (absolute when it lies outside the project), and the command that starts its executor. The executor exports the path it was started through, so a skill folder reached through a link is named by the link — the path the project can run — and not by the real location Node resolves it to.
- The git pre-commit hook is written at installation with that path; it remains uncommitted, never packaged, and still disarms with a one-line statement when the engine **folder** is absent. A folder that exists with files missing is not absent: the check runs and blocks the commit, as the earlier hook did (`l2-engine-automation.md` §Git Hook Lifecycle). The manifest builder takes the folder as an argument (`--dir`).

### 5.5 Developer Repository

```plaintext
<repo>/
├── skills/magicspec/            # PROD, the shipped folder (§5.1)
├── skills/magicspec-dev/        # DEV skill: workflows only (init, release, test, sync) calling the root scripts
├── scripts/                     # DEV: manifest builder, projection generator, sync, hardlink/link validator, mutation driver
├── tests/                       # DEV: the harness
├── package.json                 # DEV
├── docs/  AGENTS.md (+ family)  # DEV
└── <state folder>/              # the engine's own SDD workspace
```

- **One dev home.** Maintenance scripts live only in the root `scripts/`; `skills/magicspec-dev/` holds the workflows that invoke them and nothing executable.
- **The signal (SP-7).** One predicate, `hasEngineWriteTooling`, answers "is this the developer repository". It is true when the skill folder's real path is `<root>/skills/magicspec` **and** the manifest builder exists in the maintenance folder, whose location is one constant (today `<root>/scripts/`, `<root>/scripts/` after the maintenance-layout step); each half alone is false (a project may own a `scripts/` folder; an installation places the skill under a host directory). It replaces the sibling-folder probe, is the only place the question is asked, and has a harness case in each direction. No host installs a skill at `<root>/skills/` (Claude Code, Codex and Qwen Code read `.claude/skills`, `.agents/skills` and `.qwen/skills`; `l2-skill-distribution.md` §5.2), so the first half of the predicate is not met by an installation.
- **Layer rule.** The classification algorithm of the maintenance guide keeps its meaning with a simpler first step: the shipped set is exactly the skill folder, and a script outside it is maintenance by location. A script inside it must not `require` anything outside it except through the guarded fallback.

### 5.6 Links in the Developer Repository

Directory links replace the hardlink pairs for the shipped content: `.agents/skills/magicspec` and `.agents/skills/magicspec-dev` point to the folders under `skills/`, and `.claude/skills` keeps pointing to `.agents/skills`; Codex and Qwen Code read `.agents/skills` themselves, so the `.codex/skills` and `.qwen/skills` links are not needed (`l2-skill-distribution.md` §5.2). Editing a file through a directory link edits the real file, so the delinking hazard that groups 2 and 3 of the linked-pair inventory exist to catch disappears for the engine content; group 1 (the AGENTS family) remains. The always-on rule's installed copy is a generated file, not a pair (`l2-skill-distribution.md` §5.1). The validator checks each link's target and the junction-safety order of the repository guide (create the link only after its path is out of the git index).

### 5.7 Graph Artifacts

One folder, `graph/`, under the state folder holds everything the graph subsystem derives: the extraction cache, the wiki, the interactive page and the comparison snapshot. The wiki belongs there because it is generated from the graph and is stale the moment the graph is. The subsystem's output paths are defined once in the library; the shipped rule and the workflows that name `wiki/index.md` or the page are edited in the same step. The general state cache (`.cache/`) is not graph-specific and stays where it is. A project on the earlier paths loses nothing: every file is regenerated.

### 5.8 Delivery Order

```mermaid
graph LR
    P1[1 Resolvers and notation] --> P2[2 Graph folder]
    P2 --> P3[3 Skill folder]
    P3 --> P4[4 Maintenance layout]
    P4 --> P5[5 State folder rename]
```

| Step | Content | Exit criterion | Ships |
| --- | --- | --- | --- |
| 1 | Project-root and state-folder resolvers; every script that reads the working directory or its own depth directly moved to them; no file moves | Harness green; every script gives the same result run from the root and from a subdirectory | 3.0.0 |
| 2 | Graph artifacts to `graph/`; paths defined once; shipped text updated | Harness green; a project with the old paths regenerates cleanly | 3.0.0 |
| 3 | The skill folder built **beside** `.magic/`; text switched to the new notation; the harness run against the new tree; the old tree removed last; router, rule source, link inventory, signal predicate, manifest at the new root | Harness green on the new tree before the old one is deleted; verified-host table complete (distribution §5.2) | 3.0.0 |
| 4 | Root `scripts/`, `tests/`, `package.json`; `skills/magicspec-dev/`; documentation of the maintenance layout | Harness green; the signal predicate true here and false in a fresh installation fixture | 3.0.0 |
| 5 | State folder renamed in the constant and the text; migration; archive smoke test | Migration passes on the fixtures of every supported earlier layout (2.x); residue search finds no old name | 3.0.0 |

The restructuring is released once, as 3.0.0 (owner decision, 2026-10-28), steps 1 and 2 included: no 2.x release carries any part of it. Steps 1 and 2 are still compatible with installed projects, which keeps each of them mergeable and the engine working at every step (SP-9); steps 3 to 5 change what a user installs and where state lives. All of them accumulate on the development branch and ship together with one migration. The version file holds its 2.1.x value, bumped by the patch step of the engine-meta update, until the release step sets 3.0.0. A step is never merged in a state that fails its exit criterion (SP-9). Step 3 keeps the engine able to build itself because the old tree stays until the new one has passed the harness. All five steps are done and released as 3.0.0.

### 5.9 Impact on Existing Specifications and the Constitution

Amended when the step that changes them is deployed, so that each specification describes the engine that exists:

| Specification | Change | Step |
| --- | --- | --- |
| `l2-agent-surface.md` | linked-pair groups 2 and 3 retired; link inventory added | 3 |
| `l2-workflow-wrappers.md`, `l2-skill-wrappers.md` | reduced to the router contract, the surface generator and the frontmatter limits; per-workflow wrapper parity becomes router-to-folder parity | 3 |
| `l2-release-pipeline.md` | archive composition and version source; archive smoke test; §5.3 constraint retired | 5 |
| `l2-engine-automation.md` | executor path, resolvers, hook text, signal predicate, manifest scope | 1, 3 |
| `l2-spec-graph-memory.md` | output paths | 2 |
| `l1-engine-core.md` | release-kernel statement | 3 |
| `l1-sdd-reference-containment.md` | engine-directory exemption restated for the skill folder | 3 |
| `l2-test-suite.md` | fixtures for installed layouts, the signal predicate, the resolvers | each |
| `workspace.json` (engine workspace `scope`) | scope entries follow the moved folders | 3, 4 |
| every specification naming the state folder | text sweep, a patch bump each, applied together with the rename | 5 |
| `l1-documentation-system.md` | `docs/` counterparts | each |

The constitution's `.magic/`-named conventions (C1, C7, C14, C15, C28) are amended at step 3, and the `dev/` paths in C15 and C28 at step 4, through `/magic.rule` as a user-stated change; this specification does not edit them.

## 6. Implementation Notes

1. Step 1 first: the resolvers are the one change that makes every later move mechanical.
2. Run the harness from a subdirectory and from a linked copy of the skill folder as new fixture cases in step 1; they fail on the present code, which is the control.
3. Do not delete the old tree until the harness has passed on the new one and the mutation driver has caught the new cases.

## 7. Drawbacks & Alternatives

- **One router description for seven commands** loses per-command selection by the host. The commands are used together in a fixed pipeline and are named in the router description; the cost is accepted and revisited if a host selects the skill wrongly in the verified-host table.
- **Handoff metadata** that wrappers carried in frontmatter becomes prose at the end of each workflow; hosts that read handoffs from frontmatter lose the button, not the behavior.
- **Moving everything in one release** was considered and rejected: the resolvers (step 1) are independently valuable, compatible with installs, and make the rest testable.
- **A compatibility link from `.magic/` to the new folder** during the transition was rejected: the paths inside differ (`.magic/spec.md` becomes `workflows/spec.md`), so a link would hide breakage rather than prevent it.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[PROPOSAL]` | `.drafts/new-structure.md` | The owner's proposed tree and the discussion it came from |
| `[UTILS]` | `.magic/scripts/utils.js` | Home of the present dev-signal probe and the manifest exclusions |
| `[EXECUTOR]` | `.magic/scripts/executor.js` | Present state-folder and root handling |
| `[HOOKS]` | `.magic/scripts/install-hooks.js` | Present hook text and executor path |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.6.0 | 2026-10-28 | Agent | Step 5 shipped: the state folder constant is `.magicspec` and the earlier name is spelled in one place (`LEGACY_STATE_DIR_NAME`, used by the executor guard and `migrate`); the engine reads `.magicspec/` and this repository's own workspace was renamed in the same step; the version file reads 3.0.0, the single release of steps 1 to 5. The delivery order is complete. Status reverted `Stable → RFC` (Amendment Rule, minor) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 1.5.1 | 2026-10-28 | Agent | Reality sync for the state folder rename: the folder is `.magicspec/` in all engine, maintenance and workspace text. No requirement changed. |
| 1.5.0 | 2026-10-28 | Agent | Recorded as built by the maintenance layout (step 4): `dev/scripts`, `dev/tests` and `dev/package.json` are at the repository root as `scripts/`, `tests/` and `package.json` (`package.json` also carries the `test` script); `skills/magicspec-dev/` holds the router and four workflows with nothing executable, the init and release scripts live in `scripts/init/` and `scripts/release.js`, and `scripts/init/project-dev-skill.js` writes its link and command entries; the dotted `/magic.dev.*` names are `/magicspec-dev:{init,release,test,sync}`; the wrapper generator is removed and its checker survives as `scripts/skill-frontmatter.js`; the predicate reads only `<root>/skills/magicspec` and `<root>/scripts/generate-checksums.js`, the earlier-layout branches are removed. Status reverted `Stable → RFC` (Amendment Rule, minor) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 1.4.0 | 2026-10-28 | Agent | Recorded as built by the switch (step 3, second half): the command form is the colon form `/magicspec:{cmd}` in all shipped text, and the workflow identifiers that `finalize` prints and `STATE.md` stores (`magic.{workflow}`) are data, not command names, and keep their form until the migration of step 5; the maintenance scripts reach the engine through one helper (`dev/scripts/engine-path.js`) so the maintenance-layout step moves one constant; the link table of the link validator replaces hardlink groups 2 and 3 and the harness, the constitution (1.16.0), the repository guide, the documentation and the specifications of the impact table follow the folder; the old tree was removed after the harness passed on the new one. The repository projects `claude` and `codex` only (hosts that share a command folder through links would alternate their argument placeholders). Engine 2.1.148 is the first manifest of the new tree. |
| 1.3.0 | 2026-10-28 | Agent | Decisions taken while building the folder: one helper pair names the engine folder and its executor in every hint and in the hook, and a link keeps its own name; the hook probes the engine folder, not the executor, so a partly deleted engine still blocks; the builder takes `--dir`; the predicate accepts the earlier folder name during the transition and reads the maintenance location from one constant. |
| 1.2.0 | 2026-10-28 | Agent | Follows the verified host table: the dev-repository links shrink to `.claude/skills` (Codex and Qwen Code read `.agents/skills`); the developer-signal assumption about `<root>/skills/` is verified. |
| 1.1.0 | 2026-10-28 | Agent | Delivery order: the whole restructuring ships once, as 3.0.0, steps 1 and 2 included (owner decision); the earlier plan to release them as 2.x is withdrawn. The version file keeps its 2.1.x value until the release step. No requirement of the steps changed. |
| 1.0.0 | 2026-10-28 | Agent | Initial draft: skill folder tree, map from the present layout, location resolvers, version and integrity scope, developer layout and signal, link inventory, graph folder, five-step delivery order, impact table. Post-Update Review: spec-critic PASS, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
