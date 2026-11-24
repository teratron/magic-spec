# {Product name}

## Purpose

{Who it is for and what it does, at most five lines.}

## Scope

<!-- A scope item is observed at its own priority: by a milestone of that priority that closes one of its components, or by the milestone it names after `observed in`; a `could` item may wait in the plan's Backlog instead. -->

- P{n} In ({must | should | could}): {capability} → {component keys}[; observed in M{n}]
- P{n} Out: {what the product deliberately does not do}

## Glossary

- term:{word} — {one-line definition}

## Components

<!-- Kind: code, asset or existing. An existing component is present before the first milestone, at a pinned version. A dependency marked `?` is optional: it is needed only when the integration it serves is enabled. A component that exists only because of one stack is declared in that stack's profile, not here. -->

| Key | Kind | Responsibility (one line) | Depends on |
| --- | --- | --- | --- |
| {key} | {code, asset or existing} | {one line} | {keys, `?` after an optional one, or —} |

## Cross-cutting decisions

- P{n} {decision that constrains several components} — Why: {one line}

## External needs

- P{n} Needs: {capability the product takes from outside} — for {component keys}
