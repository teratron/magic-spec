# Rule Module: SDD Containment

Loaded on demand from `AGENT-RULES.md` (section 6). Paths are relative to the `magicspec` skill folder.

**Contents:**

- SDD Containment (Code ↔ SDD Boundary)

## 6. SDD Containment (Code ↔ SDD Boundary)

The SDD is **scaffolding**: erected around the work, never a component of it,
removed when the work is done. The boundary has two dimensions, and both answer
the same question — *is the product still whole once the scaffold is gone?*

- **Reference containment** — products may ship releases that exclude
  `.magicspec/`, so any reference to SDD artifacts inside product files becomes
  dead content. Traceability is one-way: SDD artifacts reference code; code
  never references SDD artifacts.
- **Structural containment** — with `.magicspec/`, the skill folder and the host
  copies generated from it deleted, the product must still build, test, run, and
  package. Making the scaffold load-bearing leaves no forbidden token behind, so
  no reference rule can catch it.

### Structural Rule (Scaffold Boundary)

Never wire the engine or the SDD into the product's own lifecycle. Forbidden:
build or package manifests invoking engine scripts (`package.json` `scripts`,
`Makefile` targets, `pyproject.toml`, `Cargo.toml`, Gradle tasks); CI/CD steps
gating a build, test, or release on a `/magicspec <command>` workflow or an `executor.js`
subcommand; product build or runtime code reading anything under `.magicspec/` or
the engine directories; product tests asserting on SDD artifact structure;
release artifacts (archives, images, published packages) that include those
directories; and toolchain dependencies added solely to run the engine — a Node
runtime introduced into a Python-only project is coupling even where no file
names the engine.

The engine installs by unpacking an archive and is removed by deleting
directories. It is not a package-manager dependency, and must stay removable
without editing a single product manifest.

**Exempt**: the git pre-commit hook installed during setup. It lives in
`.git/hooks/` — never committed, never packaged — and gating a *commit* is not
gating a *build*. It stays behind when the scaffold is deleted, so it disarms
itself: with the engine folder absent it says so once and lets the commit through.

### Reference Rule

Never write references to SDD artifacts into product files — source code,
comments, docstrings, identifiers, string literals, test names, build/config
files, or user-facing docs (README, CHANGELOG). Forbidden reference classes:

- Task IDs in **any** form — bracketed (`[T-1A01]`), bare (`T-22A01`), or split
  (`T-1A01.1`). The generated shape is `T-{phase}{track}{seq}` and phase numbers
  reach two digits, so match `T-\d+[A-Z]\d+(\.\d+)?`, never a fixed width. Bare
  is the form that actually leaks — checklists bracket the ID, prose and code
  do not.
- Phase designators in **any** form — the file form (`phase-{n}`,
  `phase-{n}.md`) **and** prose (`Phase 20`, `Phase 20 Track B`, `Phase 22's
  closing validation`). Match `[Pp]hase[-\s]\d+`.
- SDD system files: `PLAN.md`, `TASKS.md`, `INDEX.md`, `RULES.md`.
- Specification file names (e.g., `l1-*.md`, `l2-*.md`).
- Any `.magicspec/…` path.

Prose `Phase {n}` is the one class that needs judgment: many domains own the
word (handshake phases, build phases, moon phases). Disambiguate by the
self-containment test — if the sentence stops making sense once `.magicspec/` is
absent, it denotes the plan's phase and is a leak; if it reads fine, it is
domain vocabulary and is not. Every other class above is unconditional.

If design rationale matters at a code site, restate it in plain language.
Provenance ("which task produced this") lives in the SDD layer (task `Changes`
fields, phase files) and git metadata (commit messages, PR descriptions) —
both legitimate channels.

### Example

```plaintext
BAD : // Implements T-2B03 (see .magicspec/engine/tasks/phase-2.md)
GOOD: // Reject zero-length payloads: the upstream queue treats them as poison messages.
GOOD: (commit message) feat(parser): add payload guard [T-2B03]
```

### Exemptions

- The `.magicspec/` subtree itself.
- The engine folder (the skill folder and the host copies generated from it) —
  **in a consumer project only**. There they are a vendored, never-authored drop, so a
  reference-containment scan over them is noise, not signal.
- Git metadata — not part of release artifacts.
- Contributor-facing process docs that document the SDD workflow itself
  (there the reference IS the content).

**In this engine's own repository, the engine-folder exemption above does
not hold.** The skill folder is the product
here — the same flip the Structural Rule above already makes for scaffold
boundary — so a task ID, phase designator, or spec file name inside a shipped
script's comment is a leak exactly as it would be in any consumer's product
file, and refusing to introduce one applies to editing the skill folder itself, not
only to editing a downstream project. A stable in-text protocol label (`C14`,
`SC-2`, `WC1`, and siblings such as `RC-n`/`DA-n`/`WI-n`) is not a reference to
a file or task and stays outside this rule either way.

### Enforcement

- **Write time** — the Coder role refuses to introduce violations.
- **Review time** — the Code-reviewer role FAILs any diff adding an SDD reference.
- **Audit time** — `/magicspec analyze` ventilation reports
  `SDD_REFERENCE_LEAK {file}:{line}` findings (advisory; product files are
  never auto-edited), and inspects build, CI, packaging, source, and toolchain
  for structural coupling, reported as `SDD_SCAFFOLD_COUPLING {file}:{line}`.
  The two are separate checks because a token scan cannot see coupling — the
  ambient surface matters most here, since coupling usually arrives through a
  direct request ("add a lint script", "wire this into CI") rather than through
  a workflow the role cards mediate.
- **Remediation time** — detection and repair are separate duties, and audit
  owns only the first. Ventilation is read-only by contract, so a leak it finds
  is cleaned by scheduling it: the finding carries the path
  `→ /magicspec task {ws}` to plan a containment-cleanup task, which `/magicspec run`
  then executes under the Coder role — the same role that owns the write-time
  gate. Never treat a `SDD_REFERENCE_LEAK` report as self-resolving, and never
  edit product files from a workflow whose write scope is `.magicspec/`.
