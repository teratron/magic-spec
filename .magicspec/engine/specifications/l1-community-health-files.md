# Community Health Files

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

How the repository's community health files — the security policy, the contribution guide and the issue forms — are written and kept current: what each must contain to meet the hosting platform's rules, how it stays readable both for a person and for an AI agent that contributes, which role writes it and which reviews it, when it is updated, and how a maintainer is told about settings that only a person can change on the hosting service. The engine's own repository is the first and, for now, only user; the mechanism is written so that it can later be offered to the projects that install the engine without being redesigned.

## Related Specifications

- [l1-documentation-system.md](l1-documentation-system.md) - The knowledge base these files belong to and its synchronization with the engine.
- [l1-agent-feedback.md](l1-agent-feedback.md) - The report layout the `agent-feedback` issue form mirrors.
- [l1-prompt-quality-gate.md](l1-prompt-quality-gate.md) - The review that keeps the files readable for agents (HF-5, HF-6).
- [l1-role-system.md](l1-role-system.md) - The `docs-specialist` and `prompt-engineer` roles this spec gives a trigger.
- [l2-release-pipeline.md](l2-release-pipeline.md) - The release, at which the supported-versions table is checked.
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - Why a product's contribution guide must not carry SDD vocabulary (HF-8).

## 1. Motivation

The repository's files, as of 2026-10-29:

- **The security policy is wrong in three ways.** It lists `v2.1.x` as the supported line while the engine is 3.0.x; it tells reporters to open a public issue for a vulnerability and not to use private reporting, which publishes the defect before a fix exists; and it points to a `security-issue.md` issue template and to a Discussions page, neither of which exists (the repository has no issue templates and Discussions are disabled). Private vulnerability reporting is already enabled on the repository, so the policy forbids the one channel that works.
- **The contribution guide is a copy of the constitution.** It is regenerated from a template that embeds `RULES.md` §1–6 verbatim — a duplication the constitution's own §6 forbids — and says nothing a contributor needs first: how to report a bug well, how to propose a change, how to set up the repository, which checks a pull request must pass.
- **There are no issue forms.** Reports arrive as free text, and the engine's agent-feedback reports (`l1-agent-feedback.md`) have no form to match.

The hosting platform's guidance (docs.github.com): a security policy states the supported versions and how to report a vulnerability; a contribution guide may live in the root, `docs/` or `.github/` (checked in that order: `.github/`, root, `docs/`), is linked from every new issue and pull request, and should give the steps for good issues and pull requests, links to further documentation and a code of conduct, and the community's expectations; issue and pull-request templates carry issue-specific guidance.

The owner asks for both files to be filled in by those rules and kept filled in when needed, readable for people and for AI, with a decision on which role does the work, and with written instructions whenever a developer must do something by hand on the hosting service.

## 2. Constraints & Assumptions

- These are product files of the repository, not SDD artifacts: they are written by an execution task, never by the specification workflow, and carry no task identifiers, phase designators or state-folder paths. In the engine's own repository the SDD commands are part of the product being documented, so the contribution guide may name them.
- **Assumption (forecast):** vulnerabilities are reported privately through the platform's private reporting, and the transparency the current policy wants is kept by publishing an advisory once a fix is released. Runner-up: keep public reporting. Override: `/magicspec:spec amend l1-community-health-files.md "public vulnerability reports"`.
- <!-- TBD: the acknowledgement and decision times the maintainers commit to in the policy (§5.3 shows them as {N} and {M} days). -->
- **Assumption (forecast):** security fixes go to the latest minor line of the current major version only. Runner-up: also the last minor line of the previous major for a stated period. Override: `/magicspec:spec amend l1-community-health-files.md "support the previous major until {date}"`.

## 3. Core Invariants

- **HF-1 Platform rules first.** Each file carries every element the hosting platform's documentation names for it, checked against that documentation at the time of writing, with the date of the check recorded in the specification that delivers it.
- **HF-2 Security policy contract.** The policy states: the supported versions as a table that matches the released versions; how to report a vulnerability privately, with the exact place to do it; what a reporter can expect and when (acknowledgement, assessment, fix, disclosure); what is in and out of scope; and how disclosure happens after a fix. It names only channels that exist.
- **HF-3 Contribution guide contract.** The guide states, in this order: how to report a bug and how to propose a change (pointing to the issue forms); how to set up the repository and run its checks; what a pull request must contain and pass; the conventions a change follows, linked rather than copied; and the expected conduct. Facts that change with the repository — the command table, the version, the check commands — are generated into marked blocks from their sources; the prose around them is written and reviewed, not generated.
- **HF-4 Issue forms.** The repository offers a form for a bug report, one for a change proposal and one for agent feedback whose sections match the engine's report layout; blank issues are disabled, and the chooser links the private vulnerability reporting page instead of a form.
- **HF-5 Readable by people and by agents.** Every file uses short sections with descriptive headings, numbered steps for procedures, exact commands in code blocks, and one requirement per sentence, so that an agent can follow it as instructions and a person can scan it. The files are AI-facing artifacts for the instruction-quality review (PQ-1, contributor instructions).
- **HF-6 Roles.** The `docs-specialist` writes and updates the files; the `prompt-engineer` reviews the changed text for agent readability (PQ-3) before the task is `Done`. The `spec-critic` has no part: it reviews specifications, and these files are not specifications.
- **HF-7 When they are updated.** A release checks the supported-versions table against the version being released; a change to the command set, the setup or the checks updates the contribution guide; a change to a reporting channel updates the policy and the forms. The repository's documentation audit reports a mismatch as documentation drift.
- **HF-8 Portable by construction.** Every rule above that names this repository's specifics names them as inputs (the tracker, the versions, the commands). Offered later to a consuming project, the same contracts produce that project's files without SDD vocabulary, and the offer is a separate decision.
- **HF-9 Manual steps are written down.** A setting that only a maintainer can change on the hosting service is never assumed done: it is listed in a maintainer instruction with the exact path through the service's settings, why it matters, and how to verify it, and the task that needs it names the instruction in its report.

## 5. Detailed Design

### 5.1 Files

| File | Location | Owner | Generated parts |
| --- | --- | --- | --- |
| Security policy | `SECURITY.md` (root) | `docs-specialist` | none |
| Contribution guide | `CONTRIBUTING.md` (root) | `docs-specialist` | command table, workspace table, version |
| Bug report form | `.github/ISSUE_TEMPLATE/bug-report.yml` | `docs-specialist` | none |
| Change proposal form | `.github/ISSUE_TEMPLATE/change-proposal.yml` | `docs-specialist` | none |
| Agent feedback form | `.github/ISSUE_TEMPLATE/agent-feedback.yml` | `docs-specialist` | sections mirror `l1-agent-feedback.md` §5.2 |
| Chooser | `.github/ISSUE_TEMPLATE/config.yml` | `docs-specialist` | none |
| Maintainer instruction | `docs/repository-settings.md` | `docs-specialist` | none |

### 5.2 Maintainer Instruction (state observed 2026-10-29)

| Setting | Where | State | Action |
| --- | --- | --- | --- |
| Private vulnerability reporting | Settings → Security → Advanced Security → Private vulnerability reporting | Enabled | None; verify the "Report a vulnerability" button on the Security tab. |
| Discussions | Settings → General → Features → Discussions | Disabled | Either enable it, or keep it disabled and remove every link to it (the policy links it today). |
| Label `agent-feedback` | Issues → Labels → New label | Missing | Create it, so the agent-feedback form can apply it. |

### 5.3 Example — the reporting section

```plaintext
## Reporting a vulnerability
1. Do not open a public issue.
2. Open the repository's Security tab and choose "Report a vulnerability".
3. Include: affected version, steps to reproduce, impact.
You will get an acknowledgement within {N} days and a decision within {M} days.
```

## 6. Implementation Notes

1. The generator of the contribution guide keeps only the marked blocks; the constitution is linked, not copied. The template it reads today ships inside the skill folder although only a maintenance script uses it; it moves to the maintenance tree unless and until HF-8's offer ships.
2. The release workflow checks the supported-versions table (HF-7).
3. The documentation audit in `analyze` (engine repository only) checks HF-2 to HF-4 alongside the existing contribution-guide check.
4. Declared supersession ([l1-coherence-check.md](l1-coherence-check.md) CH-9): the `docs-specialist` card in [l2-role-cards-execution.md](l2-role-cards-execution.md) is triggered only by public API changes in `run`; it gains the trigger "a community health file must change" (HF-7) when the card is next amended.

## 7. Drawbacks & Alternatives

- **Fully generated files** — rejected: generation produced today's guide, which is a constitution dump.
- **Fully hand-written files** — rejected: the command table and versions would drift, as the policy's version table already has.
- **Engine-wide delivery now** — deferred by the owner's choice of 2026-10-29: this repository first, portable by construction (HF-8).

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[SECURITY]` | `SECURITY.md` | The policy HF-2 rewrites. |
| `[CONTRIBUTING]` | `CONTRIBUTING.md` | The guide HF-3 rewrites. |
| `[SYNC-DOCS]` | `scripts/sync-docs.js` | The generator reduced to marked blocks. |
| `[TEMPLATE]` | `skills/magicspec/templates/contributing.md` | The template that embeds the constitution today. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-29 | Agent | Created from the owner's list of ideas (fill and keep filling `SECURITY.md` and `CONTRIBUTING.md` by the platform's rules, readable for people and AI; decide the role; write instructions for manual steps on the hosting service) and the issue-report item. Scope by the owner's choice of 2026-10-29: this repository now, portable later. Repository settings read through the platform's API on 2026-10-29. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
