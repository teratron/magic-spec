# Demo

## Purpose

A demo product that prints a greeting.

## Scope

- P1 In (must): greeting → hello
- P2 In (could): logging → log; observed in M3
- P5 In (should): the greeting in a browser → hello
- P3 Out: farewell

## Glossary

- term:greeting — a short welcome

## Components

| Key | Kind | Responsibility (one line) | Depends on |
| --- | --- | --- | --- |
| ci | asset | Automation | — |
| core | code | Shared types | — |
| hello | code | Prints a greeting | core, log, extra? |
| log | code | Logging | core |
| extra | code | Extra greetings | core, hello |

## Cross-cutting decisions

- P4 No global state — Why: testability
