# {Area}

<!-- One file per area of the product, at `.magicspec/{workspace}/simulations/{area}.md`. A scenario describes what a person can observe, never how it is built: no code, no selectors tied to markup, no internal function names. Every expected outcome comes from a statement a specification makes (`Verifies`); a step whose expectation no specification states is not invented here, it is reported as a specification gap. Only `Last run` is written by a run, and a run changes no product code. Before the first run `Last run` reads `never` and has no step lines; a traced pass is weaker evidence than a live one and is labelled so. Delete this comment when the first scenario is written. -->

## S-{n}: {title}

**Actor:** {a role or persona the product has, from anonymous visitor to administrator}
**Verifies:** {spec.md} §{section}, {spec.md} §{section}
**Preconditions:** {the state the product and its data are in before step 1}

**Steps:**

1. {user action} → expect: {observable outcome}
2. {user action} → expect: {observable outcome}

**Variants:** {edge input, error path, permission boundary or interruption} — {what changes and the outcome expected}

**Last run:** {YYYY-MM-DD} · v{product version}

- Step 1: {pass, fail, inconclusive or skipped} · {live or traced}
- Step 2: fail · live — observed: {what happened instead of the expected outcome}
