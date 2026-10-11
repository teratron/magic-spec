---
phase: 40
name: "Setting Parity, Git Hook Lifecycle, Deleted Engine Files & Quoted Notation Deployment"
status: Todo
subsystem: ".magic (scripts, analyze.md, templates), rules, docs, dev/tests"
requires:
  - "The setting parity rule, the git hook contract, the deleted-file pre-flight fix and the bloat reader (l2-engine-automation 1.21.0), the archival opt-out (l2-engine-finalization 3.6.0), SH-6 (l1-scan-input-hygiene 1.3.0), RC-2.2 and the RC-12 hook exemption (l1-sdd-reference-containment 1.7.0) and their coverage (l2-test-suite 1.30.0): all Stable at registry 1.43.0"
  - "The body navigation contract (Phase 38): analyze.md keeps a contents list naming every ## heading, so edits to its steps add or remove no heading"
  - "dev/scripts/mutation-check.js (Phase 37): the driver that controls every new assertion"
  - "The routing clause of Phase 39: rules/magic.md is 501 lines and always-on, so this phase must not lengthen it"
provides: []
key_files:
  created: []
  modified: []
patterns_established: []
duration_minutes: ~
---

# Stage 40 Tasks — Setting Parity, Git Hook Lifecycle, Deleted Engine Files & Quoted Notation Deployment

**Phase:** 40
**Status:** Todo
**Strategic Goal:** Deploy the three 2026-10-11 amendments that a reference-mining pass produced and that no engine file carries yet (registry 1.40.0 → 1.43.0): a setting that a shipped file defines or names has a reader, with the archival opt-out as its first case ([l2-engine-automation.md](../specifications/l2-engine-automation.md) 1.21.0 §Setting Parity, [l2-engine-finalization.md](../specifications/l2-engine-finalization.md) 3.6.0 §4); the installed pre-commit hook is owned, truthful and disarms itself when the engine is gone (§Git Hook Lifecycle, with [l1-sdd-reference-containment.md](../specifications/l1-sdd-reference-containment.md) 1.7.0 RC-12); the pre-flight reports a deleted engine file as the update check already does (§Engine Meta Update Flow, Deleted engine files); the containment scan reports a code-quoted occurrence in a consumer's product markdown ([l1-scan-input-hygiene.md](../specifications/l1-scan-input-hygiene.md) 1.3.0 SH-6, RC-2.2); and the bloat advisory reads the override and the recursive scan it was specified with. Coverage follows in [l2-test-suite.md](../specifications/l2-test-suite.md) 1.30.0. Order matters twice: a text claim lands only after the behavior it states (the hook disarms before any file says so; the reader exists before the standing parity check runs), and the harness cases follow the code they pin.

## Atomic Checklist

- [ ] [T-40A01] `finalize.js`: `archival.enabled: false` skips phase archival and nothing else
- [ ] [T-40A02] Workspace template and docs: `archiveDir` withdrawn, the opt-out named
- [ ] [T-40A03] `.magic/analyze.md` Mode C: the `PHANTOM_SETTING` line, its checklist entry and the docs line
- [ ] [T-40A04] Validation: archival opt-out cases and the standing setting-parity check, with mutation controls
- [ ] [T-40B01] `install-hooks.js`: ownership, protection of a foreign hook and a truthful exit code
- [ ] [T-40B02] `install-hooks.js`: the written hook disarms itself when `.magic/` is absent
- [ ] [T-40B03] `rules/magic.md`: the §4 notice withdrawn, the §6 hook exemption restated ([C-001])
- [ ] [T-40B04] `.magic/analyze.md` step 6a: the hook exemption restated
- [ ] [T-40B05] Validation: git-hook cases over throwaway repositories, with mutation controls
- [ ] [T-40C01] `check-prerequisites.js`: a manifested engine file absent from disk is an `ENGINE_INTEGRITY` finding
- [ ] [T-40C02] Validation: the pre-flight and `--check` agree on untouched, modified and deleted layouts
- [ ] [T-40D01] `.magic/analyze.md` step 6: a code-quoted occurrence in a consumer's product markdown is reported
- [ ] [T-40D02] Validation: shipped-text pin for the quoting boundary and the hook restatement
- [ ] [T-40D03] Validation: cognitive case T267 with two controls
- [ ] [T-40E01] `check-bloat.js`: read the `bloat` override and walk `specifications/` recursively
- [ ] [T-40E02] Validation: bloat override and recursion cases
- [ ] [T-40T01] Validation: harness, mutation lists, scans, hardlinks, docs sync; single C14 bump
- [ ] [T-40T02] Validation: run the new cognitive case against the shipped text

## Detailed Tracking

<!-- Optional entry field, created by /magic.run on a task's first dead end — absent means none. A nested list under the entry's field list, one line per abandoned approach, at most five (run.md, Dead-End Record):
  - **Attempts:**
    - {what was tried} → {why it failed}
-->

### [T-40A01] `finalize.js`: `archival.enabled: false` skips phase archival and nothing else

- **Spec:** l2-engine-finalization.md §4 (Archival opt-out); l2-engine-automation.md §Setting Parity item 1 and the resolution of the cited cases
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In a throwaway project whose `.design/workspace.json` holds `"archival": { "enabled": false }` and whose workspace holds a `Done`, fully checked workbook `tasks/phase-1.md`, `node .magic/scripts/executor.js finalize --workflow=run --workspace=<ws>` after a significant change (a) leaves `phase-1.md` in `tasks/` and the links in `TASKS.md` and `PLAN.md` unchanged, (b) prints no archived-phases block and exactly one informational line that contains `archival.enabled`, and (c) still bumps the version, writes the changelog entry and updates `STATE.md`. The same fixture with the `archival` key absent, with `"enabled": true` and with `"enabled": "false"` (a string, which is not the value `false`) moves the workbook to `archives/tasks/` and prints no such line. `node .magic/scripts/executor.js archive-phases` archives the workbook with the key `false` and with it absent, and `archive-phases --dry-run` previews as before. With the key `false` and no eligible workbook, no informational line is printed.
- **Handoff:** T-40A04 pins these cases; T-40A02 withdraws the sibling key.
- **Notes:** Highest blast radius of track A: this is the `run` path of every consumer finalize, and archival stays on unless the value is exactly `false` — a missing or unparsable `workspace.json` also leaves it on, as `loadConfig()` does for `finalization`. To print the line only when something would have been archived, ask the archiver for its eligible list in dry-run mode instead of restating the eligibility rule. The line is informational, as the specification words it; no diagnostics finding is specified for it. New or changed functions carry JSDoc and the repository's section separators, and comments use plain language (no specification file, section, phase or task ID: the engine directories are product here).

### [T-40A02] Workspace template and docs: `archiveDir` withdrawn, the opt-out named

- **Spec:** l2-engine-finalization.md §4 (the archive location is not a setting); l2-engine-automation.md §Setting Parity (resolution of the cited cases)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `.magic/templates/workspace.json` still parses (`node -e "JSON.parse(require('fs').readFileSync('.magic/templates/workspace.json','utf8'))"` exits 0); its `archival` object has exactly one key, `enabled`, with the value `true`; `git diff -U0` on the file shows the `archiveDir` line and the comma before it removed and nothing else. `grep -rn "archiveDir" .magic docs workflows rules README.md` prints only the two local variable names in `.magic/scripts/lib/phase-archiver.js` (a variable, not a read of a configuration key). The Archival bullet of `docs/task.md` gains one clause saying that finished phases stay in `tasks/` when `archival.enabled` is `false` in `workspace.json`; no heading changes; `node dev/scripts/sync-docs.js` run twice reports every page current on the second run.
- **Handoff:** T-40A04's standing check needs this edit before it can be green on the tree.
- **Notes:** `.magic/templates/` content is C14 content (one bump at T-40T01). A consumer's existing `workspace.json` keeps its `archiveDir` key; it is inert and nothing here rewrites a user's file. The docs sentence is user-facing: state the effect in plain words and name no specification file, section, phase or task ID.

### [T-40A03] `.magic/analyze.md` Mode C: the `PHANTOM_SETTING` line, its checklist entry and the docs line

- **Spec:** l2-engine-automation.md §Setting Parity items 1, 3 and 4
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `grep -n "PHANTOM_SETTING" .magic/analyze.md` prints exactly two lines: one in Mode C step 2, beside Wrapper-Body Parity and Phantom Commands, and one in the Mode C Completion Checklist. The step-2 line states the finding format `PHANTOM_SETTING {file}:{line} → {key} has no reader` (advisory, non-blocking); that a *setting* is a key of the `workspace.json` template outside `default` and `workspaces`, or a dotted key path that a line of shipped text names together with `workspace.json`; that the shipped text is `.magic/`, `docs/`, `workflows/`, `rules/` and `README.md`; that a *reader* is a script under `.magic/scripts/` that consumes the value, so a comment, a string or a message that only names the key is not a read; and that environment variables and executor flags are outside the check. `docs/analyze.md` gains one clause in the Mode C list that names the check in plain words (`grep -n -i "setting" docs/analyze.md` shows it); no `##` heading is added or removed in either file, so `node --test dev/tests/engine.js --test-name-pattern "contents"` stays green; the added-line containment scan prints nothing.
- **Handoff:** T-40A04 pins the line and the checklist entry; T-40B04 and T-40D01 edit other steps of the same file next.
- **Notes:** `.magic/analyze.md` is edited by three tasks in this phase (A03 step 2 and checklist, B04 step 6a, D01 step 6), which is why they are sequenced and not parallel. The ventilation check is cognitive and read-only: no script is added to ship, and the standing version of the same rule lives in the harness (T-40A04). `docs/analyze.md` does not list the sibling checks (`WRAPPER_BODY_DRIFT`, `PHANTOM_COMMAND`), so the clause describes this one in a sentence of its own rather than extending a list that does not exist.

### [T-40A04] Validation: archival opt-out cases and the standing setting-parity check, with mutation controls

- **Spec:** l2-test-suite.md (Shipped-text contract coverage, setting parity); l2-engine-finalization.md §4 (regression coverage)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains at least four cases. (a) The archival opt-out, over the fixture of T-40A01: key `false` leaves the workbook and prints the informational line while the version bump, the changelog entry and the state update still run; key absent archives it; the explicit `archive-phases` archives it in both. (b) The setting-parity rule over throwaway fixtures: a key that a fixture script reads through the section object (with and without a defaults table merged over it) is not flagged; a key named only in a comment, a string or a message is flagged; a dotted path named in a fixture text file and absent from the fixture template is flagged with its file and line; a key that only a script outside `.magic/scripts/` reads is flagged; a flagged key stops being flagged once a shipped script reads it. (c) The same rule as a standing check over the shipped tree: zero findings, failing the suite on any. (d) `.magic/analyze.md` Mode C step 2 carries the `PHANTOM_SETTING` line and the checklist carries its entry. A mutation list with one entry per assertion (at least 10), run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED, and the modified files are byte-identical afterwards. The entry that replaces the reader test with a substring search turns the comment-only case red; the entry that puts `archiveDir` back into the template turns the standing check red.
- **Handoff:** T-40T01 re-runs the harness after the bump.
- **Notes:** Needs T-40A01 to T-40A03 landed (the standing check is green only once `archival.enabled` has its reader and `archiveDir` is gone; a probe at planning found no other first finding: `finalization.enabled`, `autoBump`, `autoChangelog`, `changelogPath` and `versionPath` are read through the defaults table `loadConfig()` merges over the section). The rule lives in the harness as a helper — no shipped script is added. It must accept that defaults-table pattern or it fails on the keys that are fine. Pin the contract, not the wording. `dev/tests/engine.js` is shared with B05, C02, D02 and E02, which is what fixes the order.

### [T-40B01] `install-hooks.js`: ownership, protection of a foreign hook and a truthful exit code

- **Spec:** l2-engine-automation.md §Git Hook Lifecycle, Required Fix items 1 and 2
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** Over throwaway repositories made with `git init`, running `node .magic/scripts/install-hooks.js` from the repository root: (1) no hook → the hook is written, its text contains the line `# Magic Spec Pre-commit Hook`, the success line is printed, exit 0; a second run leaves the file byte-identical and exits 0. (2) A hook without the marker → the file is byte-identical afterwards, the output contains the line `node .magic/scripts/executor.js update-engine-meta --check || exit 1`, exit non-zero, no success line. (3) A hook with the marker and a different body → the original bytes are saved beside it as `pre-commit.magic-spec.bak` (a numbered name when that one exists, never overwriting an existing copy), the output names the copy, the copy is byte-identical to the original, the hook is replaced, exit 0. (4) `git config core.hooksPath <dir>` set → nothing is written under `.git/hooks/`, the chain line is printed, exit non-zero, no success line. (5) `pre-commit` is a symbolic link → the link and its target are untouched, exit non-zero. (6) `.git/hooks` is a symbolic link → untouched, exit non-zero. (7) `pre-commit` is a directory → exit non-zero with the error on stderr. (8) A directory whose `.git/hooks` was made with `mkdir` only (not a repository) → the hook is written and the exit is 0, so the existing case `install-hooks.js should install functional hooks` stays green. Scenarios 5 and 6 may be skipped on a platform that cannot create links; Changes records the skip.
- **Handoff:** T-40B02 changes the hook body in the same file; T-40B05 pins the scenarios.
- **Notes:** The highest blast radius of the phase together with B02: `init.js` runs this installer in every new project and the written file runs on every commit. `init.js` already records `GIT_HOOKS_NOT_INSTALLED` when the installer exits non-zero, so the exit codes are the whole interface; do not edit `init.js`. The `core.hooksPath` probe (`git config --get core.hooksPath` in the project root) fails open: when git cannot answer — not a repository, no git — it counts as unset; record that choice in Changes. "The body being written" is the text of `hookContent` after T-40B02 changes it, so re-run scenarios (1) to (3) after B02. JSDoc and the repository's section separators on new functions; plain-language comments with no specification file, section, phase or task ID.

### [T-40B02] `install-hooks.js`: the written hook disarms itself when `.magic/` is absent

- **Spec:** l2-engine-automation.md §Git Hook Lifecycle, Required Fix item 3 and its resolution
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The hook text begins its work with a test for the `.magic/` directory, before the integrity check runs. In a repository where `.magic/` does not exist, running `.git/hooks/pre-commit` (as `sh .git/hooks/pre-commit` and through `git commit`) prints exactly one line saying that the engine is not installed here, that nothing was checked and that the file can be deleted if the removal was intended, exits 0, and prints no stack trace and no `Engine drift detected` text. Three controls, each in its own repository with the written hook: `.magic/` present with one manifested file modified → exit 1 and the three existing guidance lines; `.magic/` present with `.magic/scripts/executor.js` deleted → non-zero exit and output that tells the user to restore `.magic/`; `.magic/` present and in sync → exit 0 and the existing `Engine in sync` line.
- **Handoff:** T-40B03 and T-40B04 state the behavior in shipped text after this lands; T-40B05 pins it.
- **Notes:** The test is for the directory, not the executor, so a partly deleted engine still blocks. The specification adds a doubt rule — the directory counts as absent only when it does not exist, and one that cannot be inspected counts as present — and POSIX `test -d` cannot tell a missing path from an uninspectable one: choose the mechanism by the Consequence Forecast (a plain directory test whose failure mode is documented, or a probe that separates "does not exist" from "cannot be read") and record it as a Decision Record in Changes. The control that matters is the partly deleted engine: the mutation entry of T-40B05 that turns the directory test into an executor test must turn it red. An already-installed hook keeps its old script; reinstalling over it is safe after T-40B01, and nothing in this phase refreshes existing hooks (that stays in the Backlog).

### [T-40B03] `rules/magic.md`: the §4 notice withdrawn, the §6 hook exemption restated ([C-001])

- **Spec:** l2-engine-automation.md §Setting Parity (resolution: the notice is withdrawn) and §Git Hook Lifecycle (deployment); l1-sdd-reference-containment.md RC-12
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In `rules/magic.md` §4 the sentence that begins "The pre-commit hook issues a non-blocking notice" is gone (`grep -n "non-blocking notice" rules/magic.md` prints nothing) and the rest of §4 is unchanged. The §6 Exempt paragraph no longer says the hook "goes away with the scaffold" (`grep -n "goes away with\|removed with" rules/magic.md` prints nothing); it says the hook disarms itself when the engine is absent and keeps its statements that the hook lives in `.git/hooks/`, is never committed or packaged, and that gating a commit is not gating a build. The line count does not grow (`wc -l rules/magic.md` is at most 501). The CAUTION block, §9 and the other consumer guards are untouched. The twin under `.agents/rules/` is the same file: `fsutil hardlink list rules\magic.md` lists both paths, `Get-FileHash` of the two is equal and `node dev/scripts/validate-hardlinks.js` exits 0 after the edit; a write that replaced the inode is repaired by recreating the link (**[C-001]**). The added lines name no specification file, section, phase or task ID. No C14 bump: `rules/` is outside it.
- **Handoff:** T-40D02 pins the §6 sentence.
- **Notes:** Needs T-40B01 and T-40B02 landed: "the hook disarms itself" must be true when it ships. The file is always-on in every project that installed the engine; edit once, both hunks in one write, then check the link. Do not weaken the consumer guards to match this repository's own freedom.

### [T-40B04] `.magic/analyze.md` step 6a: the hook exemption restated

- **Spec:** l1-sdd-reference-containment.md RC-12 and §5 item 7; l2-engine-automation.md §Git Hook Lifecycle (deployment)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** The Exempt line of step 6a no longer says the hook "is removed with the scaffold" (`grep -n "removed with" .magic/analyze.md` prints nothing); it says the hook disarms itself when the engine is absent and keeps its statements about `.git/hooks/` being neither committed nor packaged and a commit not being a build. `git diff -U0 .magic/analyze.md` for this task is one hunk on that line; no `##` heading changes; the contents-list case stays green.
- **Handoff:** T-40D01 edits step 6 of the same file next; T-40D02 pins this line.
- **Notes:** Needs T-40B02 landed. One line changed, nothing else in step 6a: the five-point inspection and the report format are not part of this contract.

### [T-40B05] Validation: git-hook cases over throwaway repositories, with mutation controls

- **Spec:** l2-test-suite.md (Git-hook coverage)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains at least seven cases, one per bullet of the specification's git-hook list, over throwaway repositories made with `git init`: the fresh install with the marker and an idempotent second run; the foreign hook kept byte for byte with a non-zero exit and the chain line in the output; the marker with a different body replaced after its bytes are saved beside it, the copy byte-identical to the original; `core.hooksPath` set, nothing written under `.git/hooks/`, non-zero exit; a symbolic-link `pre-commit` and a symbolic-link `.git/hooks` untouched with a non-zero exit; a `pre-commit` that is a directory giving a non-zero exit; the hook run in a repository with no `.magic/` printing its one line and exiting 0 with no stack trace, with its two controls (`.magic/` present with one manifested file modified → exit 1 and the drift message; `.magic/` present with the executor deleted → non-zero and still saying restore). A mutation list with one entry per assertion, run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED; the entry that turns the directory test of the hook into an executor test turns the partly-deleted-engine control red. The existing case `install-hooks.js should install functional hooks` is still green.
- **Handoff:** T-40T01 re-runs the harness after the bump.
- **Notes:** Needs T-40B01 and T-40B02. A symlink case that the platform cannot create is reported as skipped by the test runner, not as passed. Pin the contract, not the wording of the printed lines: each assertion looks for the concept (the marker, the chain command, the copy's bytes, the exit code). Shared file: `dev/tests/engine.js`.

### [T-40C01] `check-prerequisites.js`: a manifested engine file absent from disk is an `ENGINE_INTEGRITY` finding

- **Spec:** l2-engine-automation.md §Engine Meta Update Flow, Deleted engine files (Required fix)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** On a throwaway copy of the live `.magic/` with its `.checksums`, in three states: (a) untouched — `check-prerequisites --json` has no `ENGINE_INTEGRITY` warning and `node .magic/scripts/executor.js update-engine-meta --check` exits 0; (b) `.magic/templates/plan.md` deleted — the pre-flight has a warning whose message is `'.magic/templates/plan.md' is missing locally.` followed, in a user installation (no `dev/scripts/generate-checksums.js`), by the restore-from-archive hint with `fix: null`, and in the developer repository by the C14 command as `fix`; `ok` is false; `--check` exits non-zero; (c) a space appended to `.magic/templates/spec.md` — the existing modified-file wording is unchanged, `ok` is false, `--check` exits non-zero. In every state the two checks agree on clean-versus-drift.
- **Handoff:** T-40C02 pins the three states.
- **Notes:** Highest blast radius of track C: this script runs before every workflow in every installation, and a false finding stops the run (in a workspace whose scope lists `.magic/`, an `ENGINE_INTEGRITY` finding is an in-scope HALT). Loop over the manifest keys as the existing loop does and report `!fs.existsSync`; do not walk the tree (the manifested-path boundary exists because a tree walk produced false findings), and keep the exclusions the existing loop applies. The message begins with the same `'.magic/{file}'` prefix as the modified-file message, so the engine-scope filter reads both alike. Not in scope, for want of an occurrence: a stray unmanifested file, and the uncaught `MODULE_NOT_FOUND` when a required module is missing.

### [T-40C02] Validation: the pre-flight and `--check` agree on untouched, modified and deleted layouts

- **Spec:** l2-test-suite.md (Pre-flight deletion coverage)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains at least two cases that run both checks over one throwaway extracted layout in the three states and assert agreement in each (both clean, both reporting drift, both reporting drift). The deleted state is also asserted on the pre-flight alone: `ENGINE_INTEGRITY` names the file as missing, `ok` is false, and the remedy is the installation kind's — the user-installation fixture gets the restore instruction, the developer fixture the C14 command. The untouched state is the control that shows the new finding is not a blanket warning, and the modified state keeps its own wording. A mutation list with one entry per assertion, run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED; the entry that restores the `existsSync` skip turns the deleted-state case red.
- **Handoff:** T-40T01 re-runs the harness after the bump.
- **Notes:** Needs T-40C01. The existing cases at the `ENGINE_INTEGRITY` remedy and both-hashes wording stay green. Shared file: `dev/tests/engine.js`.

### [T-40D01] `.magic/analyze.md` step 6: a code-quoted occurrence in a consumer's product markdown is reported

- **Spec:** l1-scan-input-hygiene.md SH-6 and §6 item 7; l1-sdd-reference-containment.md RC-2.2 and §5 item 7
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** In step 6 the "Precondition (SH-1)" bullet states three things: (i) in this engine's own repository, for the engine's own authored files, an occurrence inside a fenced code block or inline code span is a mention (the present text, kept for that population); (ii) in a consumer project, an occurrence inside a code span or a fence in a markdown product file is reported — in the contextual sub-list when the passage reads as an illustration of a forbidden form and not a use of it, judged by the self-containment test — and never silently skipped; (iii) when it is unclear which, the occurrence is reported. The match-class bullets are unchanged. Reading step 6 for a consumer project turns a README line that tells the reader to open a code-quoted `.design/…` specification path into a finding. `git diff -U0 .magic/analyze.md` for this task has hunks only in that bullet; no heading changes; the contents-list case stays green; the added-line containment scan prints nothing.
- **Handoff:** T-40D02 pins it; T-40D03 adds the cognitive case.
- **Notes:** Follows T-40B04 in the same file; the two edits do not interact. The measured evidence (how many matches the blanket precondition hid) belongs to the specification and stays out of shipped text. Protocol labels (SH-1, SH-6, RC-9) are allowed in shipped text; a specification file name or section sign is not.

### [T-40D02] Validation: shipped-text pin for the quoting boundary and the hook restatement

- **Spec:** l2-test-suite.md (Shipped-text contract coverage, containment quoting boundary)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains at least two cases that read the shipped text. (a) `.magic/analyze.md` step 6 states the SH-1 precondition as holding for the engine's own authored files and states that in a consumer project a code-quoted occurrence in a product markdown file is reported; a blanket precondition ahead of the match classes turns the case red. (b) The step 6a exemption line and `rules/magic.md` §6 contain neither "removed with" nor "goes away with" and say the hook disarms itself; the copy under `.agents/rules/` is byte-equal to `rules/magic.md`. A mutation list with one entry per pinned fragment (at least 6), run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED, and `node dev/scripts/validate-hardlinks.js` still exits 0 afterwards.
- **Handoff:** T-40T01 re-runs the harness after the bump.
- **Notes:** Needs T-40B03, T-40B04 and T-40D01. Pin the concept (whose files the precondition covers, what a consumer's quoted occurrence becomes, what the hook does), not exact wording. Shared file: `dev/tests/engine.js`.

### [T-40D03] Validation: cognitive case T267 with two controls

- **Spec:** l2-test-suite.md (Shipped-text contract coverage, containment quoting boundary — the cognitive case)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/suite.md` gains one case, T267, after T266 in the `### T{N} — {name}` form with `Synthetic State`, `Action`, `Expected` and `Guards tested`, and two controls. Case: in a consumer project a README line that tells the reader to open a code-quoted `.design/` specification path yields an `SDD_REFERENCE_LEAK` finding. Control B: a contributor page that documents the SDD workflow itself yields none (the reference is the content). Control C: a line that shows what a task-ID leak looks like, inside a fence, lands in the contextual sub-list and not among the unconditional findings. A scratch check prints every case header in the expected form, numbered consecutively, the closing line moved to `v1.9.97 (Last: T267)`, and no carriage return or U+FFFD in the file.
- **Handoff:** T-40T02 runs it.
- **Notes:** Cognitive-only by design: no script stands behind the behavior, so the harness pins the wording (T-40D02) and the suite probes the behavior. Write each Expected line only from behavior a shipped sentence states — the previous phase found three Expected lines that asked for behavior no sentence stated. The suite's closing line is the only place its count and version are recorded.

### [T-40E01] `check-bloat.js`: read the `bloat` override and walk `specifications/` recursively

- **Spec:** l2-engine-automation.md §Bloat Advisory Configuration; §Setting Parity (deployment)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** (a) With no `bloat` key, `node .magic/scripts/executor.js check-bloat --json` on this repository prints output identical to its output before the edit (capture it first). (b) In a throwaway project, `"bloat": { "spec": { "soft": 20, "hard": 40 } }` in `.design/workspace.json` makes a 25-line specification a soft signal and a 45-line one a hard signal, while the `task` thresholds stay 250 and 400 because their keys are omitted. (c) A `soft` of 0 produces no soft-tier signal for that kind and a `hard` of 0 no hard-tier signal. (d) A specification placed in a subdirectory of `specifications/` is scanned and flagged when over a threshold. (e) A missing or unparsable `workspace.json` leaves the defaults 300/500 and 250/400.
- **Handoff:** T-40E02 pins these cases.
- **Notes:** The specification's "a threshold set to `0` disables that signal class" is read one-to-one: the soft threshold governs the soft signal and the hard threshold the hard signal; record the reading in Changes. Defaults stay 300/500 and 250/400. This workspace's `specifications/` is flat, so (a) must hold. After this lands, the specification's line "Deployment status (engine 2.1.136): specified, not built" is stale; specification edits are outside `/magic.run`'s write scope, so T-40T01 records it for a `/magic.spec` patch.

### [T-40E02] Validation: bloat override and recursion cases

- **Spec:** l2-engine-automation.md §Bloat Advisory Configuration (the contract the cases pin); task.md Step 7 (every feature track carries a Validation Task)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** `dev/tests/engine.js` gains at least two cases over a throwaway workspace: the override is honored for specifications and for task phase files, omitted keys fall back to the defaults, a threshold of 0 disables only its own tier, a nested specification is scanned, and the no-override control reports exactly the signals the defaults produce. A mutation list with one entry per assertion (at least 5), run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED.
- **Handoff:** T-40T01 re-runs the harness after the bump.
- **Notes:** Needs T-40E01. The no-override control is what shows the override is read and not just tolerated. Shared file: `dev/tests/engine.js`.

### [T-40T01] Validation: harness, mutation lists, scans, hardlinks, docs sync; single C14 bump

- **Spec:** l2-test-suite.md; l2-engine-automation.md §Engine Meta Update Flow
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** (1) `node --test dev/tests/engine.js` is green before and after the bump, and its count equals 178 plus the cases recorded by T-40A04, T-40B05, T-40C02, T-40D02 and T-40E02. (2) Each of those tasks' mutation lists, re-run with `node dev/scripts/mutation-check.js`, reports every entry CAUGHT with 0 SURVIVED, 0 REFUSED and 0 RESTORE FAILED, and the modified files are restored byte-identical. (3) `node dev/scripts/validate-hardlinks.js` exits 0 and `fsutil hardlink list AGENTS.md` shows 5 paths. (4) The added-line containment scan over the diff of `.magic/`, `rules/`, `docs/` and `workflows/` prints no task ID, phase designator, `PLAN.md`, `TASKS.md`, `INDEX.md` or `RULES.md` name, specification file name or `.design/engine` path. (5) `node dev/scripts/sync-docs.js` run twice: the second run reports every page current. (6) One `node .magic/scripts/executor.js update-engine-meta`: `.magic/.version` moves by one patch step from its value when this task starts, `update-engine-meta --check` exits 0, and `check-prerequisites --json --verify-headers --workspace=engine` reports `ok: true` with no `ENGINE_INTEGRITY` warning. (7) Two stale statements are recorded with `record-diagnostic` for a `/magic.spec engine` patch pass: the bloat section's "specified, not built" status line, and the enforcement-surface row of the scan-hygiene specification that reads "Non-compliant" for the containment scan.
- **Handoff:** T-40T02 follows.
- **Notes:** One bump covers every `.magic/` edit of the phase (T-40A01, T-40A02, T-40A03, T-40B01, T-40B02, T-40B04, T-40C01, T-40D01, T-40E01); `rules/` and `docs/` are outside C14. Mid-phase harness runs on the live tree may report engine drift until this bump; that is expected, not a defect. If the run is interrupted after the first `.magic/` edit, the next pre-flight reports `ENGINE_INTEGRITY` in a workspace whose scope lists `.magic/` and stops with the C14 command; running it then is correct and costs one extra version step. The root `CHANGELOG.md` is written by finalize, not by hand.

### [T-40T02] Validation: run the new cognitive case against the shipped text

- **Spec:** l2-test-suite.md (Cognitive Test Suite)
- **Status:** Todo
- **Assignment:** Agent
- **Verify:** T267, its control B and its control C are run against `.magic/analyze.md` step 6 and `rules/magic.md` §6 as shipped after the bump, read literally with no specification open: each probe resolves as its `Expected` says, with each control resolving the other way. A probe that resolves wrongly or ambiguously is adjudicated as a finding of the shipped wording (Finding Adjudication) and fixed in this phase before the task is marked Done; a fix that changes `.magic/` repeats step (6) of T-40T01. The result records that the author read its own text unless a fresh reader was run, so the Context Bleed note applies.
- **Handoff:** None.
- **Notes:** Last, after T-40T01 and T-40D03. Run in a fresh session where possible; a fresh reader on the lowest tier the host offers is the stronger check (the same run is still open for the Phase 38 and Phase 39 cases). The previous phase's run found a shipped sentence that lacked a stated rule and cost a second C14 bump, so plan for that outcome.
