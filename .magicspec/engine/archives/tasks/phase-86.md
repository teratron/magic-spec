---
phase: 86
name: "Maintenance: The Engine and Its Harness Hold on Every Runner"
status: Done
subsystem: "skills/magicspec/scripts (utils, check-prerequisites, check-bloat, remove), tests/engine"
requires:
  - "l2-engine-automation 1.34.0, l2-sdd-document-set-engine 1.8.0 §5.2, l2-skill-distribution 2.2.0 §5.6"
provides:
  - "Ignore rules applied inside the project only; no 3.x file read in a 4.0 workspace; remove deletes its engine however the project path is spelled; the harness green on Linux and Windows, Node 18 and 24; 543 cases; engine 4.0.0"
key_files:
  created: []
  modified:
    - "skills/magicspec/scripts/utils.js"
    - "skills/magicspec/scripts/check-prerequisites.js"
    - "skills/magicspec/scripts/check-bloat.js"
    - "skills/magicspec/scripts/remove.js"
    - "tests/engine/lib/base.js"
    - "tests/engine/skill-folder.js"
    - "tests/engine/document-set.js"
    - "tests/engine/scanners-and-context.js"
patterns_established:
  - "A change to path handling or to the harness is proved on Linux and Windows both"
  - "A directory link is removed through removeLink, never rmdir alone"
duration_minutes: ~
---

# Stage 86 Tasks — Maintenance: The Engine and Its Harness Hold on Every Runner

**Phase:** 86
**Status:** Done
**Strategic Goal:** The harness passes on Linux and Windows runners on Node 18 and 24, and the engine answers the same on a case-sensitive file system, a case-insensitive one and a project reached by another spelling of its path.

**Phase notes:**

- **Opened by `/magicspec-dev fix`** with no phase active in the ledger: the planning write added this phase entry and the plan header, nothing else of the planning workflow ran.
- **Reported by the continuous-integration run** of `develop` at `f30dd8d`, the first whose `harness` job ran after the format check passed again: six cases failed on Ubuntu, three on Windows, one of them common (eight cases).
- **Release lines:** `develop` repaired. `v2.1` — absent: the ignore predicate there is only ever given paths inside the project, and the 2.x line has no document set, no `remove` and no runner workflow.
- **Order of record:** the repairs and their cases were made before these entries were written.

## Atomic Checklist

<!-- A line is `- [ ]` (open) or `- [x]` (done). A Blocked task keeps `- [ ]`: it is blocked by its `Status` in Detailed Tracking, and the `[!]` the workflows write after "Blocked" spells that status — it is not a checkbox state. -->

- [x] [T-86F01] A project's ignore rules stop at its edge
- [x] [T-86F02] No 3.x file name is read in the folder of a 4.0 workspace
- [x] [T-86F03] `remove` reads the project folder by its real name
- [x] [T-86F04] The harness holds on every runner

## Detailed Tracking

<!-- Optional entry field, created by /magicspec run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-86F01] A project's ignore rules stop at its edge

- **Spec:** l2-engine-automation.md §Scan Hygiene
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *utils.loadGitignore applies no rule to a path outside the folder it was loaded for*, written first and seen to fail on `../tmp/engine/SKILL.md`; the two manifest cases of the skill folder pass in a Linux container laid out as the runner; `scripts/mutation-check.js` reports the reverting entry `CAUGHT`.
- **Handoff:** T-86F04 for the runner proof.
- **Notes:** Failing cases: *one manifest covers the whole folder* and *the hook names the engine where it is installed* (Linux). Confirmed cause, reproduced in a container: `generate-checksums.js` asked the predicate about `../../../tmp/…/SKILL.md` and the repository's `*tmp/` matched the `tmp` segment, so the manifest was empty. Class: specification gap. Sibling sites: the one predicate, read by seven scripts and the manifest builder; `update-engine-meta` asked it about an engine folder outside the project, repaired by the same line.
- **Changes:** `utils.loadGitignore` answers false for a path that leaves the root or is absolute.

### [T-86F02] No 3.x file name is read in the folder of a 4.0 workspace

- **Spec:** l2-sdd-document-set-engine.md §5.2
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *the 3.x plan and constitution are not looked for in the folder of a set*, written first and seen to fail on Windows; the updated pre-flight case passes on both systems; three reverting entries `CAUGHT`.
- **Handoff:** T-86F04 for the runner proof.
- **Notes:** Failing case: *check-prerequisites reports the checker in place of the registry on a 4.0 workspace* (Linux reported `RULES.md` missing). Confirmed cause: on Windows `{workspace}/RULES.md` is the set's `rules.md`, so the pre-flight took the set's rules for the constitution and its `plan.md` for the 3.x plan; the case passed there by that accident, and its fixture had no global constitution. Class: specification gap. Sibling sites: every read of a 3.x file name in a workspace folder; the other readers take a 4.0 branch before reading. `check-bloat` measured the set's two files on Windows only, repaired.
- **Changes:** `check-prerequisites` takes the global constitution for a set, reports no plan or ledger there and watches no workspace constitution; `check-bloat` measures the global documents only; the pre-flight case writes a global constitution.

### [T-86F03] `remove` reads the project folder by its real name

- **Spec:** l2-skill-distribution.md §5.6
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The case *remove deletes an engine that lies in the project when the project is reached by another spelling of its path*, written first and seen to fail with `lies outside this project`; the reverting entry `CAUGHT`.
- **Handoff:** T-86F04 for the runner proof.
- **Notes:** Failing case: *remove deletes exactly what carries a marker* (Windows runner, temporary folder `RUNNER~1`). Confirmed cause, reproduced with a directory link: the engine folder was read by its real path and the project by the path as spelled, so the engine seemed to lie outside and was kept, as one shared by others. Class: specification gap. Sibling sites: the path comparisons of the shipped folder — `resolveInsideProject` and `migrate`'s boundary compare real paths already; the version-control lines and the engine's printed path compare two paths as spelled.
- **Changes:** `remove` compares and prints against the real path of the project.

### [T-86F04] The harness holds on every runner

- **Spec:** l2-release-pipeline.md §5.2b; l2-test-suite.md §Layout of the Suites
- **Status:** Done
- **Assignment:** Agent
- **Verify:** The full harness: Linux containers on Node 24 and Node 18, run as an unprivileged user from a fresh checkout laid out as the runner, and Windows with a `~` in the temporary path; the failing cases were reproduced there first.
- **Handoff:** A push, whose `Tests` run is the runners' own confirmation.
- **Notes:** Failing cases: *validate-hardlinks.js checks the directory link* and *refreshProjections rewrites only the projections* (`rmdir` on a symbolic link), *the rule kernel exempts sync* (a generated, ignored copy read on a fresh clone, all four jobs), *the folder runs wherever a host installs it* (the installer quotes a hook path holding `~`). Class: implementation defect of the harness; the engine behaved as specified.
- **Changes:** `removeLink` moved to `lib/base.js` and used wherever a case removes a link; the rule copy is compared where it exists; the hook assertion quotes as the installer does.
