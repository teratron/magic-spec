# Engine Workspace Changelog

## Phase 11 — 2026-06-13 (Archiver Eligibility Fix — R7)

- Fixed `phase-archiver.allChecked` (`scripts/lib/phase-archiver.js`) per `l2-engine-finalization.md` v1.2.0 §6: it now strips fenced code blocks and inline code-spans, then tests a line-anchored checklist pattern (`/^\s*- \[ \]/m`). Previously a whole-file `content.includes('- [ ]')` substring scan false-positived on any phase whose prose/Notes mentioned checkbox syntax, silently suppressing archival.
- Added an archiver-eligibility regression test to `dev/tests/engine.js` via the public `findArchiveCandidates` export: a phase with `- [ ]` quoted in Notes but all checklist items checked is archivable; a phase with a genuine unchecked checklist line is not. Harness 14 → 15 tests, all green.
- Re-archived `phase-10.md` — the phase R7 had blocked — via `archive-phases`; it moved to `archives/tasks/` and its TASKS.md row is now `Done (Archived)`.
- Engine version 2.1.39 → 2.1.40 (C14); checksums regenerated (65 files). `dev/tests/engine.js` is L2 (dev/) — the bump is from `phase-archiver.js`.
- Validation: harness 15/15; `update-engine-meta --check` no drift; `check-prerequisites` clean; hardlinks linked.
- Field evidence: phase-10's own task Notes (which discuss `- [ ]` detection for SC-2.1) tripped the old substring scan — the defect surfaced by the immediately preceding phase's content.

## Phase 10 — 2026-06-13 (Session-Continuity Hardening Deployment)

- Deployed SC-2.1 (plan-state-aware `Next Action`, `l1-session-continuity.md` v1.1.0): `computeNextAction` in `scripts/finalize.js` now derives the recommendation from the actual plan ledger — open `- [ ]` tasks → `/magic.run`; plan complete → `/magic.spec` (new scope); spec/rule → `/magic.task` (replan); unreadable ledger → `/magic.task` fallback. The static `task: "execute the active phase"` map entry — which misdirected the returning user whenever the plan was complete — is removed.
- Made `finalize.js` requirable for unit testing: `module.exports = { main, computeNextAction, updateSessionState }` behind an `if (require.main === module)` CLI guard (same pattern as `update-state.js`).
- Added the first finalize-pipeline regression coverage to `dev/tests/engine.js` (`l2-test-suite.md` v1.5.0 mandate): a `computeNextAction` unit test across all SC-2.1 branches (asserting the plan-complete branch never says "execute the active phase"), and an end-to-end skip-path test asserting SC-2 STATE.md patching, the SC-2.1 `/magic.spec` next-action, and the SC-3 non-bumping commit suggestion with no version bump. Harness 12 → 14 tests, all green.
- Engine version 2.1.38 → 2.1.39 (C14); checksums regenerated (65 files). `dev/tests/engine.js` is L2 (dev/) — no engine bump from the test edit; the bump is from `finalize.js`.
- Validation: harness 14/14; `update-engine-meta --check` no drift; `check-prerequisites` clean; hardlinks linked.
- Field evidence: `computeNextAction` produced a stale "execute the active phase" recommendation across this session's plan-complete states (hand-corrected in STATE.md three times) — the defect that motivated SC-2.1.

## Phase 9 — 2026-06-13 (DA-9 Engine Deployment — Proposal Surfaces)

- Deployed DA-9 (Proposal Surfaces Are Declarative, from `l1-decision-autonomy.md` v1.1.0) into the engine workflow bodies, closing the gap that let a proposal step render as a user-facing question.
- `spec.md`: Blank Trigger (Creative Sparks) rewritten from the pre-C27 "propose … in the next turn … auto-pick" wait-form to same-turn DA-3 selection narrated as a `[DR]`; Mode Transition and Dispatch Notice gained explicit DA-9 cross-references. Firing gates left intact (WI-4 three-option / E5; T1-T3 "Propose & Wait" / E4).
- `analyze.md`: post-dispatch Zero-Prompt Handoff rewritten — removed "Proceed to Plan/Run? and wait for reply"; now narrates `[DR] Specs Stable — invoking /magic.task` and pauses only on a firing E3 hard-fork (DA-5 single question).
- `task.md`: verified already DA-9-compliant (Auto-Plan "no Go confirm; no menu"); added a one-line DA-9 cross-reference so deployment coverage is audit-greppable across all three bodies.
- Engine version 2.1.37 → 2.1.38 (C14); checksums regenerated (65 files); skill wrappers re-projected.
- Validation: engine test harness 12/12 green; residual proposal-as-question grep clean across the three bodies (sole match is the negation phrase in `analyze.md`); firing gates verified present; `update-engine-meta --check` no drift; hardlinks linked.
- Field evidence: a live non-whitelisted `AskUserQuestion` in a `/magic.spec` Blank Trigger (this session) — the violation that motivated DA-9 and this deployment.

## Phase 8 — 2026-06-12 (Session Continuity & Status Command)

- Wired the SC-2 state-update step into `scripts/finalize.js`: STATE.md is patched (Updated timestamp, pipeline-order Next Action, auto-progress) on BOTH the significant and the skip path of every `finalize --workflow=<spec|task|run|rule>` run; non-blocking on failure; `--dry-run` previews the patch; output gains a `STATE.md` status row.
- Refactored `scripts/update-state.js`: CLI moved behind a `require.main` guard, `updateState`/`computeProgress` exported, new `--auto-progress` flag recomputes the STATE.md Progress block (active-phase checklist + overall phase registry) from TASKS.md.
- Implemented the SC-3 non-bumping commit-suggestion fallback: significance miss + dirty working tree → exactly one suggested Conventional Commits message labeled `(non-bumping)` with a neutral `chore` header (new `type`/`summary` overrides in `lib/commit-suggester.js`); no version bump, no CHANGELOG entry; write-side git remains forbidden.
- Created the `/magic.status` read-only resume briefing: `.magic/status.md` body (5 invariants, seven-section briefing, degraded states), `workflows/magic.status.md` thin wrapper, `skills/magic-status/SKILL.md` generated via skill sync — parity verified.
- Registered status in the upgrade-detection exemptions of `rules/magic.md` §1 (drift becomes an informational engine line, never a prompt); `.agents/rules/magic.md` hardlink recreated and validated after the edit.
- README command table: added `/magic.status` and `/magic.graph` (pre-existing gap).
- Engine version 2.1.34 → 2.1.37 (C14 ×3); checksums 64 → 65 files; skill wrappers re-projected.
- Validation: engine test harness 12/12 green; check-prerequisites clean (0 warnings); briefing dry-run renders all seven sections with a correct informational drift line.

## Phase 5 — 2026-06-12 (Decision Autonomy)

- Amended `templates/rules.md`: C13 §3 rewritten from halt-and-ask "Zero Assumptions" to "Bounded Ambiguity Resolution" (resolve via C27, halt only at the Escalation Whitelist); appended the C27 section (DA-1..DA-8 operational summary, RC-9-compliant wording).
- Added §7 "Autonomous Decision Protocol (C27 Session Posture)" to user-side `rules/magic.md`: DA-6 session persistence (next step narrated, never asked), DA-4 Decision Record grammar, whitelist summary; Completion Protocol renumbered §7→§8 with a new §7 checklist item; hardlink recreated and validated.
- Wired `Decision Autonomy (C27)` line into the completion checklists of `spec.md`, `task.md`, and `run.md`.
- Bound the C27 anti-pattern line ("Elective questions outside the C27 escalation whitelist (E1-E5) are a protocol violation.") into `templates/role.md` and all 14 role cards.
- Engine version 2.1.33 → 2.1.34 (C14); checksums regenerated (64 files); skill wrappers re-projected.
- Validation: session-evidence simulation — [DR] resolution at elective forks, single-question format at the whitelist gate — both assertions PASS; engine test harness 12/12 green.

## Phase 4 — 2026-06-12 (Prompt Quality Gate)

- Created `.magic/roles/prompt-engineer.md` — role card #14 (reviewer): five workflow triggers, six-dimension PQ-3 protocol, PQ-6 verdict semantics (PASS / PASS-WITH-REWRITES / FAIL).
- Wired five gates into workflow bodies: `spec.md` Post-Update Review gains the Instruction Quality Pass (second stage after spec-critic PASS); `task.md` gains step 5a Task Instruction Review (after planner audit, before write-back); `rule.md` gains §5a Rule Wording Review (after APPROVE, before write); `run.md` gains conditional Step 3.4b Instruction Diff Review (fires only on diffs touching AI-facing instruction artifacts); `analyze.md` Mode C gains step 7 Prompt Quality Audit (advisory sweep feeding the pre-advisory pool; steps renumbered 8-15).
- Extended `templates/rules.md` §C24 pointer table: 4 mandatory prompt-engineer gate rows + opt-in 3.4b note; registry count 13 → 14.
- Engine version 2.1.32 → 2.1.33 (C14); checksums 63 → 64 files; skill wrappers re-projected.
- Validation: role registry integrity 14/14 (0 dormant, 0 missing, 0 dangling); engine test harness 12/12 green. Step 3.4b self-applied to this phase's own diff — verdict PASS.

## Phase 7 — 2026-06-12

- Purged all 15 references to the engine repository's own SDD workspace from shipped engine files per RC-9 (l1-sdd-reference-containment.md v1.1.0), in three classes:
  - **Dead spec links (5)**: `rule.md`, `analyze.md` (×2), `spec.md`, `task.md` — markdown links into `.design/engine/specifications/` replaced with the invalidation rule stated inline.
  - **Baked-in workspace name (3)**: `run.md`, `spec.md`, `rules/magic.md` — phase-journal path generalized to `.design/{ws}/CHANGELOG.md` (consumers do not have an `engine` workspace).
  - **Governance citations (6)**: `context.md`, `init.md` (×2), `spec.md`, `templates/rules.md` (×2) — spec file names replaced with protocol names; WI-labels preserved as stable in-text identifiers.
- Annotated Phase 5 tasks (constitution-template mirroring) with an RC-9 guard so the leak class is not reintroduced.
- Engine version 2.1.31 → 2.1.32 (C14); checksums regenerated, skill wrappers re-projected; `.agents/rules/magic.md` hardlink recreated after the rules edit.
- Validation: containment greps 0/0/0 across `.magic/`, `workflows/`, `skills/`, `rules/` (sole residual hit is the illustrative BAD example, exempt); engine test harness 12/12 green.

## Phase 6 — 2026-06-12

- Added §6 "SDD Reference Containment" to user-side `rules/magic.md`: one-way traceability rule (SDD artifacts reference code, never the reverse), forbidden reference classes, exemptions, BAD/GOOD example, enforcement map; Completion Protocol renumbered §6→§7 with a new containment checklist line; recreated the broken `.agents/rules/magic.md` hardlink.
- Coder card (`.magic/roles/coder.md`): containment authoring gate inserted as protocol step 6 + anti-pattern — no SDD-artifact references in code, comments, docstrings, identifiers, string literals, or test names.
- Code-reviewer card (`.magic/roles/code-reviewer.md`): containment check inserted as protocol step 4 + anti-pattern — any SDD-layer reference in a product-file diff is FAIL; internal minimalism cross-reference renumbered.
- Ventilation (`.magic/analyze.md`): Mode C gained step 6 "SDD Reference Containment Scan" emitting advisory `SDD_REFERENCE_LEAK {file}:{line}` findings; "SDD Leak" row added to the Findings Schema; both Mode C checklists extended.
- Engine version 2.1.30 → 2.1.31 (C14): checksums regenerated (63 files), skill wrappers re-projected.
- Validation: containment-gate simulation passed (authoring forbid + review FAIL + repo scan clean outside exempt zones); engine test harness 12/12 green.
- Follow-up surfaced (not fixed, out of phase scope): shipped `analyze.md`/`spec.md`/`task.md` link to `.design/engine/specifications/l2-spec-graph-memory.md` — dead on consumer installs; same violation class, needs its own task.

## Phase 4 — 2026-05-12

- Integrated coding discipline from the local reference into `.magic/roles/`: Coder now surfaces material assumptions and writes minimal diffs; Code-reviewer enforces traceability; Code-simplifier rejects speculative complexity; Code-skeptic classifies material assumptions; Test-engineer requires explicit `Verify` evidence.
- Added mandatory `Verify` criteria to `.magic/task.md` decomposition and `.magic/templates/phase.md` task blocks.
- Added explicit `Verify Criterion` guard to `.magic/run.md` QA Review so the execution workflow mirrors the role-card requirement directly.
- Updated engine specs `l2-role-cards.md`, `l2-role-integration.md`, and `l2-engine-templates.md`; registry versions synchronized in `.design/engine/INDEX.md`.

## Phase 3 — 2026-04-23

- Created `.magic/roles/` directory with 13 role cards: orchestrator, planner, coder, code-reviewer, code-simplifier, code-skeptic, test-engineer, debugger, docs-specialist, spec-critic, project-auditor, constitutional-reviewer, retrospective-analyst
- Created `.magic/templates/role.md` authoring template with YAML frontmatter schema
- Amended `.magic/run.md`: rewrote Execution Setup table (Manager→Orchestrator, Developer→Track Owner Context), added gates 3.3/3.4/3.6, `@role:coder`, `@role:code-reviewer`, `@role:code-simplifier`, `@role:code-skeptic`, `@role:debugger`, `@role:docs-specialist`, `@role:test-engineer`, updated Run Completion Checklist; fixed "Developer track / Manager role" → "Track Owner / @role:orchestrator"
- Amended `.magic/task.md`: "Planning Skeptic persona" → `@role:planner`; updated Task Completion Checklist
- Amended `.magic/spec.md`: "Project Critic persona" → `@role:spec-critic`; updated Task Completion Checklist
- Amended `.magic/analyze.md`: "Auditor persona" → `@role:project-auditor`; updated Pre-Advisory Audit heading and both checklist lines
- Amended `.magic/rule.md`: "Constitutional Reviewer persona" → `@role:constitutional-reviewer`; updated section header and Post-Write checklist
- Amended `.magic/retrospective.md`: "Independent Analyst persona" → `@role:retrospective-analyst`; updated section header and Retro Checklist
- Rewrote `.magic/templates/rules.md` §C24 as role-registry pointer-table; bumped template to v1.3.0
- Extended `.magic/scripts/check-prerequisites.js` with `role_registry_integrity` block (ROLE_MISSING/ROLE_HANDOFF_DANGLING HALT; ROLE_DORMANT/ROLE_TRIGGER_UNRESOLVED WARN)
- Extended `.magic/scripts/update-engine-meta.js` with role-card history collapsing (`roles/*` → `roles` category)
- Engine version bumped: 1.5.182 → 1.5.183; all 13 role cards registered in `.checksums`
- `check-prerequisites` validation: `role_registry.total=13`, `missing=[]`, `dangling_handoffs=[]` ✓
