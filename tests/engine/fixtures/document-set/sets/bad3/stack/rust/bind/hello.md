# hello — binding for Rust

## Interface

Package `demo_hello`.

## Units

### hello.b1 — `greet`

`pub fn greet()`, which `greet_twice` calls.

- Defines: greet
- Realizes: hello.1
- Accept: compiles

### hello.b2 — `greet_twice`

`pub fn greet_twice()`.

- Defines: greet_twice
- Realizes: hello.1
- Accept: compiles

### hello.b3 — `greet` again

`pub fn greet()`, defined a second time.

- Defines: greet
- Realizes: hello.1
- Accept: compiles
