# Stack: {name}

<!-- The profile is not pulled into a pack, so it holds no convention a builder must follow: such a convention is a stack rule, listed in the Context of the tasks it governs. Tools names the runtime and its own test runner with their versions; what is installed beside them is pinned in deps.md. -->

## Tools

{Languages; the runtime and its own test runner, with their versions.}

## Notions

| Neutral notion | Here |
| --- | --- |
| component | {what a component is on this stack, e.g. a package in a given folder} |
| interface | {what is exported} |
| manifest | {the manifest file} |
| optional integration | {how an optional integration is switched} |
| test | {where a test lives} |
| observe | {the commands that run builds, tests and examples, and how a milestone's Observed by is run here} |

## Components

<!-- Components only this stack has. Required by: the neutral components that depend on it, `?` when optionally. A stack with no component of its own writes `- none` in place of the table. -->

| Key | Responsibility | Depends on | Required by | Milestone | Observed by |
| --- | --- | --- | --- | --- | --- |
| {key} | {one line} | {keys, or —} | {neutral component keys, or —} | M{n} | {how it is observed} |

## Vocabulary

{Words that belong to this stack and must not appear in the neutral layer, separated by commas.}
