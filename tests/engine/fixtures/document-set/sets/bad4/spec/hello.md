# hello — Greeter

Depends on: core

## Purpose

Prints a greeting.

## Contract

`greet()` prints the greeting.

## Requirements

### hello.1 — Greets

`greet()` prints "hello".

- Accept: the output is "hello"

- Rev: 2 — C1

### hello.2 — Waves

`greet()` waves.

- Withdrawn: C2 — replaced by nothing

### hello.3 — Says the name

`greet()` says the name; it no longer waves as hello.2 said.

- Open: which name?
- Accept: the output holds the name

### hello.4 — Is polite

`greet()` says please.

- Rev: 2 — C1
- Accept: the output holds "please"
