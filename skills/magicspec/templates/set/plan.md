# Plan

<!-- Needs orders the build: each needed milestone closes a component that a component closed here depends on, an end of an integration this milestone wires, or a component it extends. An edge that only an observation uses goes under Observed after. A milestone closes components, never single requirements: one that builds part of a component closes it, and a later milestone that builds the rest Extends it. A component is closed once; later work on it is Extends, and a change of what it does is Revises, and both need the milestone that closed it. A done milestone is never edited: a change adds a milestone at the end. The first milestone is observed by running the product: its Observed by is a use of the product and its outcome, so it closes every component that use needs, building of a component only the requirements that use reaches where the rest can wait for a later milestone that Extends it. Needs names each milestone that closes a direct dependency, and not one that is reached only through another. -->

## M{n} — {title}

- Priority: {must | should | could}
- Works after it: {the observable increment}
- Observed by: {how it is observed, in neutral words — which components' checks are run, or which use of the product and its outcome, the stack profile's observe row saying how it runs on a stack — naming every component it closes; another milestone's component written as `key`, in backticks, is checked to be closed by a milestone this one needs or is observed after}
- Needs: {milestones whose work the build of this one uses, or — for none}
- Observed after: {milestones whose work only the observation uses, or omitted}
- Integrates: {key+dep, … — optional integrations this milestone wires, or omitted}
- Extends: {key — what it adds; … — work on components closed earlier, or omitted}
- Revises: {key — what changes; … — work that changes behaviour of components closed earlier, or omitted}
- Closes: {component keys}

## Backlog

<!-- A backlog with nothing waiting holds the one line `- none`. -->

- {address or description} — {priority} — {why it waits}
