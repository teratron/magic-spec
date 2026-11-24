# Plan

## M1 — Core

- Priority: must
- Works after it: shared types compile and automation runs
- Observed by: a check of core runs in ci
- Needs: —
- Closes: core, ci

## M2 — Greeting

- Priority: must
- Works after it: the greeting prints and is logged
- Observed by: a unit test of hello reads the output; log records it
- Needs: M1
- Extends: extra — a second greeting
- Closes: hello, log

## M3 — Extras

- Priority: could
- Works after it: extra greetings print
- Observed by: a unit test of extra
- Needs: M1, M2
- Closes: extra
