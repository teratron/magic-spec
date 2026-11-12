# Contributing to magic-spec

Thank you for contributing to **magic-spec** (engine <!-- generated:version -->v3.0.102<!-- /generated:version -->).
This guide tells you, in order, how to report a bug, how to propose a change, how to run the repository's checks, what a pull request must contain, and which conventions a change follows.

## 1. Report a bug or propose a change

1. Search the open and closed issues for the same report.
2. Open the issue form that fits: **Bug report**, **Change proposal** or **Agent feedback**. Blank issues are disabled.
3. Report one bug or one proposal per issue.
4. For a bug, give the engine version (the content of `skills/magicspec/.version`), your host and operating system, the exact command you typed, numbered steps to reproduce, what you expected and what happened.
5. Use **Agent feedback** when an AI agent drafted the report. Its sections match the report an agent submits itself.
6. Report a security vulnerability privately, as [SECURITY.md](SECURITY.md) says. Never open a public issue for it.

## 2. Set up the repository and run its checks

1. Install the Node.js version that `engines` in `package.json` requires.
2. Clone the repository and enter it:

    ```bash
    git clone https://github.com/teratron/magic-spec.git
    cd magic-spec
    ```

3. Run the regression harness. It needs no installation and takes about two minutes:

    ```bash
    node --test tests/engine.js
    ```

4. Check that the engine folder matches its integrity manifest:

    ```bash
    node skills/magicspec/scripts/executor.js update-engine-meta --check
    ```

5. Check that the linked agent files share one file:

    ```bash
    node scripts/validate-hardlinks.js
    ```

6. After you change anything inside `skills/magicspec/`, update the version and the manifest before you run the harness:

    ```bash
    node skills/magicspec/scripts/executor.js update-engine-meta
    ```

[Developing the Engine](docs/development.md) explains the layout, the command tables and the release.

## 3. Open a pull request

1. Branch from `develop` and open the pull request against `develop`.
2. Keep one change per pull request.
3. State what changed and why, and link the issue it answers.
4. Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) for every change a user can see.
5. Add or update a harness case for every change in behaviour. A case that does not fail without your change does not prove it.
6. Update the documentation a user reads when the change alters a command, an option or a file.
7. Confirm that every check of section 2 passes before you request a review.

## 4. Follow the conventions

1. Read the project constitution in [.magicspec/RULES.md](.magicspec/RULES.md). It governs how specifications, plans and the engine are changed. This guide does not copy it.
2. Write code, comments, documentation and commit messages in English.
3. Describe a behaviour change in a specification before you implement it. The specifications are in [.magicspec/](.magicspec/INDEX.md).
4. Keep the shipped engine folder, `skills/magicspec/`, free of anything that only maintains the repository.
5. Write JavaScript with JSDoc on every function, following the style of the file you edit.

### Commands

The engine is used through one command. This table is generated from the router.

<!-- generated:commands -->
| Command | Description |
| --- | --- |
| `/magicspec spec` | Creates, amends and checks specifications and the registry, from a raw idea through status promotion |
| `/magicspec plan` | Plans and replans: which specifications are built in which phase, in what order, and what waits in the backlog |
| `/magicspec task` | Turns a planned phase into atomic tasks, tracks and verify lines, and keeps their recorded state in step with the plan |
| `/magicspec run` | Executes the planned tasks of the active phase, in parallel tracks when they are independent |
| `/magicspec fix` | Triages and repairs reported defects: reproduces each, classifies it against the specifications by a closed rule, repairs it with a regression check left behind |
| `/magicspec simulate` | Runs the product's user-interaction scenarios, live or traced and always labelled, and reports each failed step as a finding |
| `/magicspec goal` | Pursues a goal through the pipeline without pausing between steps, stopping on a closed list of conditions and reporting once |
| `/magicspec analyze` | Audits the project against its registry, rules and engine integrity; reverse-engineers specifications from existing code |
| `/magicspec rule` | Adds, amends or removes a project convention in the constitution, global or per workspace |
| `/magicspec status` | Briefs a session on where the project stands, read-only |
| `/magicspec graph` | Builds, analyzes and visualizes the specification knowledge graph |
| `/magicspec migrate` | Moves a project from the earlier layout to this skill folder: a dry run, one consent question, then the apply step |
| `/magicspec help` | Lists the commands, explains one and offers to run one, in the host's choice form or in the chat |
<!-- /generated:commands -->

### Workspaces

This table is generated from the registry.

<!-- generated:workspaces -->
| Workspace | Description | Specs | Registry |
| --- | --- | --- | --- |
| engine | Magic SDD core engine logic, workflows, rules, and history. | 55 | [engine/INDEX.md](.magicspec/engine/INDEX.md) |
<!-- /generated:workspaces -->

## 5. Expected conduct

1. Be respectful and constructive in every issue, review and discussion.
2. Assume good faith, and ask when something is unclear.
3. Keep feedback about the work, never about the person.
