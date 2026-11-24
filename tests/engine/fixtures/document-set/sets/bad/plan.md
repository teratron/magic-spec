# Plan

## M1 — Core

- Priority: must
- Works after it: shared types compile
- Observed by: `cargo check` of core
- Needs: —
- Closes: core

## M2 — Greeting

- Priority: must
- Works after it: the greeting prints
- Observed by: a unit test of hello reads the output
- Needs: M1
- Closes: hello
