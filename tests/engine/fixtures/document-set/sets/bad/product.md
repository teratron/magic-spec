# Demo

## Purpose

A demo product that prints a greeting.

## Scope

- P1 In: greeting
- P2 Out: farewell

## Glossary

- term:greeting — a short welcome

## Components

| Key | Responsibility (one line) | Depends on | Spec |
| --- | --- | --- | --- |
| core | Shared types | — | — |
| hello | Prints a greeting | core | spec/hello.md |

## Cross-cutting decisions

- P3 No global state — Why: testability
