# Plan

<!-- Needs orders the build: each needed milestone closes a component that a component closed here depends on, an end of an integration this milestone wires, or a component it extends. An edge that only an observation uses goes under Observed after. A component is closed once; later work on it is Extends, and a change of what it does is Revises, and both need the milestone that closed it. A done milestone is never edited: a change adds a milestone at the end. -->

## M{n} — {title}

- Priority: {must | should | could}
- Works after it: {the observable increment}
- Observed by: {how it is observed, naming every component it closes; another milestone's component written as `key`, in backticks, is checked to be closed by a milestone this one needs or is observed after}
- Needs: {milestones whose work the build of this one uses}
- Observed after: {milestones whose work only the observation uses, or omitted}
- Integrates: {key+dep, … — optional integrations this milestone wires, or omitted}
- Extends: {key — what it adds; … — work on components closed earlier, or omitted}
- Revises: {key — what changes; … — work that changes behaviour of components closed earlier, or omitted}
- Closes: {component keys or requirement addresses}

## Backlog

- {address or description} — {priority} — {why it waits}
