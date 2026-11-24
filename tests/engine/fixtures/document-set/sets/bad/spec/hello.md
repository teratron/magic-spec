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

### hello.2 — Long

This requirement is deliberately long so that a pack holding it exceeds the small budget the fixture check runs with. It repeats one idea in several sentences. The greeting is printed once per call. The greeting is printed without a trailing space. The greeting is printed in lower case. The greeting is printed to standard output. The greeting is printed even when the terminal is not interactive. The greeting is printed before any other output of the call. The greeting is printed with a single line ending. The greeting is printed with the platform's line ending. The greeting is printed with no colour codes. The greeting is printed with no prefix. The greeting is printed with no suffix. The greeting is printed exactly as specified. The greeting is printed by the same function every time. The greeting is printed without allocation where the platform allows it. The greeting is printed without locking anything other than the output stream. The greeting is printed and the function returns nothing.

- Accept: the output is "hello" followed by one line ending
