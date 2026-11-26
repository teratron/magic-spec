# {key} — binding for {stack}

## Interface

{Package and module paths; what is exported.}

## Units

<!-- A document written from this template keeps none of its comments. Test scaffolding that several tasks' tests share — a fixture, a stub, a harness — is an internal unit, produced by the first task whose tests need it. A unit that realizes no behaviour — scaffolding, the manifest — writes `Realizes: —`. A unit has one visibility: names exported for tests only are interface, and a unit that would mix interface and internal names is split. A unit is built by exactly one task; a unit too large for one task is split into units before the tasks are written. The stack's manifest is pinned, path and content, by a unit of the component through which the first milestone's use of the product enters it, for a program its entry point. -->

### {key}.b{n} — {title}

{Names, signatures, visibility, constraints and mechanisms of one part of the interface.}

- Defines: {bare names, without signatures, that this unit introduces and other units use — types, free functions, constants; each name defined once per stack — or — for a unit that defines no name}
- Visibility: {interface | internal}
- Realizes: {behaviour addresses, or — for a unit that realizes nothing}
- Accept: {the stack-level check, e.g. "compiles", with its expected result}
