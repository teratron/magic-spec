# Engine Feedback Channel

**Version:** 1.0.0
**Status:** Stable
**Layer:** concept

## Overview

Defines how an agent using the engine in someone's project tells the engine's maintainers what it found broken, missing or misleading in the engine. The agent records feedback notes while it works — engine bug reports among them — and they are kept locally across the session and its compactions. When a workflow ends with notes pending, the agent turns them into one formatted report per problem and hands it to the human, who copies it, opens a prefilled issue page from it, or approves its submission to the engine's public issue tracker by the agent. Nothing leaves the machine without that approval, and nothing of the project's own content enters a report. In the engine's own repository the same notes are work items, not reports.

## Related Specifications

- [l1-engine-diagnostics.md](l1-engine-diagnostics.md) - The digest that already accumulates findings across a workflow; feedback notes ride the same recording path but outlive the digest's drain (EF-1).
- [l1-sdd-reference-containment.md](l1-sdd-reference-containment.md) - The boundary EF-4 applies in the outward direction: the project's content never leaves through a report.
- [l1-decision-autonomy.md](l1-decision-autonomy.md) - E1, the consent submission needs: publishing is irreversible.
- [l1-fix-command.md](l1-fix-command.md) - Where notes go in the engine's own repository (EF-12).
- [l1-community-health-files.md](l1-community-health-files.md) - The repository's issue forms, which match the report layout (§5.2).
- [l1-skill-packaging.md](l1-skill-packaging.md) - SP-7, the one predicate that tells the engine's repository from an installation.

## 1. Motivation

The agent is the engine's most frequent user: it is the first to learn that a workflow instruction is ambiguous, that a script failed, that a guard had to be worked around or that a capability is missing. Today that knowledge has three weak exits:

- The Bug Reporting Protocol (always-on rules §9) prints a `MAGIC-SPEC ENGINE BUG REPORT` block once. In a long session it scrolls away; it covers bugs only — not missing capabilities, improvements or misleading documentation — and the user has to re-type it to file it.
- `record-diagnostic` keeps a one-line finding in the per-workspace sink, and finalization shows it once in the digest and drains it. The line is not a report: no reproduction, no environment, no fingerprint.
- Nothing reaches the maintainers unless a human writes it up. The owner asks for the agent to determine, as it works, what is missing, what to improve and what to fix, and to offer at the end a formatted report the user can submit by hand, or that the agent submits itself to the repository's issues.

Two opposite failures bound the design. Silence loses the signal. An agent that files issues on its own publishes text shaped by whatever it read — the user's code, specifications, a web page — under the human's identity in a public place, and many users' agents report the same defect again and again.

## 2. Constraints & Assumptions

- The destination is the engine's public issue tracker on GitHub; its address is stored once, in the skill folder's own metadata.
- The engine stores no credentials. Submission uses the human's own signed-in command-line client of the tracker.
- Reports are written in English, the tracker's language; the conversation stays in the human's language.
- GitHub facts (docs.github.com, *Creating an issue*): a prefilled new-issue link accepts `title`, `body`, `labels`, `assignees`, `milestone`, `projects` and `template`; every parameter except title and body needs a permission the visitor may lack, and an over-long link fails without a published limit. The link therefore carries only title and body, and the body is cut to a fixed size budget that the implementation sets below the lowest limit known to fail.
- **Assumption (forecast):** the channel is on by default, with submission offered behind the human's approval, because the owner asks for the agent itself to be able to send the report. Runner-up: drafting only by default. Override: the channel setting (EF-10).
- **Assumption (forecast):** one report covers one problem, grouping related notes, because separate issues can be triaged and recognized as duplicates. Runner-up: one report per session. Override: `/magicspec:spec amend l1-agent-feedback.md "one report per session"`.

## 3. Core Invariants

Terms: a **note** is one observation the agent records; **evidence** is context the engine observed itself; a **draft** is a report assembled from selected notes plus evidence; **submission** publishes a draft to the tracker; the **human** is the person running the agent.

- **EF-1 Local until approved, durable until handled.** Notes live in the project's local runtime state — never in a tracked file, never in a product file — and survive the end of a session and any compaction until they are drafted and delivered or discarded. The channel contacts no remote service except as the direct result of a submission (EF-2). Draining the diagnostics digest does not remove a note.
- **EF-2 Submission is separate, explicit and bound to a shown draft.** Publishing is a distinct step from drafting. It takes the identifier of a draft the human was shown in full, and runs only after the human's explicit yes to that draft (E1: publishing cannot be undone). It takes no text of its own, so what is published is exactly what was shown. A draft already created as an issue is never created again.
- **EF-3 Fixed destination.** The tracker is fixed by the engine. No argument, setting or note can redirect a report to another repository, host or address.
- **EF-4 Scrubbed by construction.** Every piece of text entering a draft is first scrubbed of: anything shaped like a credential or secret; absolute filesystem paths and the names of the project, its directories and its users; and Markdown that would notify people or make the tracker fetch content (mentions, issue references, raw markup, images). A report never carries the project's specifications, code, file contents, task text or plan. Engine files are named by their path inside the skill folder. The human's review of the complete text is the actual gate, and every draft says it will be public.
- **EF-5 Bounded.** The number of notes, the length of each note field, the number of drafts and the size of a report have fixed limits; a note over a limit is rejected with the limit named, and the oldest evidence gives way first.
- **EF-6 Evidence apart from opinion.** A note states its kind, what the agent tried, what happened and, optionally, what it expected and suggests. The engine adds what it observed: engine version, workflow, finding codes recorded in the same workflow, the failing engine script and its exit status, operating system, runtime version and host. A report labels which parts the agent wrote and which the engine observed.
- **EF-7 Closed kinds.** A note is one of `bug`, `missing-capability`, `improvement`, `docs`. An engine bug report emitted under the Bug Reporting Protocol is also recorded as a `bug` note, so every such report accumulates instead of scrolling away.
- **EF-8 One problem per issue, duplicates not filed.** A draft carries a fingerprint derived from stable facts — kind, engine file, finding code, workflow — not from wording. Submission first looks for an open issue with the fingerprint; when one exists, it reports that issue and creates nothing, unless the human asks for a new one. A failed look-up never blocks submission and is reported.
- **EF-9 A text path always exists.** In every environment — no tracker client, not signed in, offline, submission switched off — a draft yields the complete report text and, when it fits the budget, a link to a prefilled new-issue page. A failed submission leaves the draft intact.
- **EF-10 Guidance in, switch out.** The always-on rules tell the agent when to record a note, what is not worth reporting (a defect of the user's product, of the host, or of the user's environment), and to offer the drafts when a workflow ends with notes pending. Each draft is offered once; the person's answer — submit, keep as text, discard — closes it, and an unanswered offer leaves the draft listed in the next digest without asking again. The human sets the channel to `full` (default: copy, link, submission), `draft` (text and link only; the agent can never publish) or `off` (no notes, no offer). An unrecognized value gives `draft` and is reported; it never widens the channel.
- **EF-11 Never in the way.** Recording a note changes no workflow's result or exit status; a fault inside the channel never fails a workflow.
- **EF-12 Work queue in the engine's repository.** Where the developer-repository predicate holds, notes are not drafted or offered for submission: they are listed at the end of a workflow as fix candidates, and the one next step is `/magicspec:fix` with them.

## 5. Detailed Design

### 5.1 Flow

```mermaid
sequenceDiagram
    participant A as Agent
    participant E as Engine (local state)
    participant H as Human
    participant T as Issue tracker
    A->>E: note (kind, summary, details, engine file?)
    Note over E: also attaches evidence observed in the same workflow
    A->>E: finalize (workflow end)
    E-->>A: digest + pending notes
    A->>E: draft
    E-->>A: report text, link, fingerprint, draft id
    A->>H: shows the complete report; offers submit / keep as text / discard
    alt human copies or opens the link
        H->>T: files it by hand
    else human approves submission
        A->>E: submit (draft id)
        E->>T: duplicate look-up, then create (human's signed-in client)
        E-->>A: created / duplicate / not created / unknown
        A->>H: outcome and issue address
    end
```

### 5.2 Report Layout

```plaintext
Title: [agent-feedback] {kind}: {summary}
Body:
  ## Summary                 agent-written; one bullet per note when grouped
  ## What happened           agent-written: what was tried and what came back
  ## Expected / suggestion   agent-written, omitted when empty
  ## Impact                  agent-written: blocked | workaround | minor
  ## Environment             engine-observed: engine version, workflow, OS, runtime, host
  ## Engine-observed context engine-observed: finding codes, failing script and exit status
  ## Report details          fingerprint, format version, notice that an agent drafted it
```

The repository's `agent-feedback` issue form carries the same sections, so a report filed by hand and one submitted by the agent read the same.

### 5.3 Outcomes

Submission reports exactly one of: **created** (with the issue address), **duplicate found** (with its address), **not created** (with the reason and one recovery step) or **unknown** (the client's answer could not be read — check the tracker before retrying). It never claims creation without the tracker's confirmation.

## 6. Implementation Notes

1. The notes store sits beside the diagnostics sink in the state folder's runtime cache, with its own retention (it is not drained by the digest). Declared supersession (`l1-coherence-check.md` CH-9): the constraint of [l1-engine-diagnostics.md](l1-engine-diagnostics.md) that findings are drained, not kept, holds for findings; notes are a separate store, and [l2-engine-diagnostics.md](l2-engine-diagnostics.md) gains the note record when it is built.
2. Recording, drafting and submission are executor subcommands invoked by the agent; no new user-facing command is needed (C2).
3. The Bug Reporting rule module gains the recording of a `bug` note and the offer at workflow end.
4. The issue forms are delivered with the repository's community health files.

## 7. Drawbacks & Alternatives

- **Residual risk of the approval.** The engine cannot authenticate a human; an agent steered by hostile content could claim a yes it never received. What bounds it: the text is scrubbed, bounded and shown in the conversation, a draft publishes once, and the human can edit or delete the issue. A user who wants no such risk sets `draft`.
- **Submission through the tracker's web API with a stored token** — rejected: credential storage and a larger attack surface.
- **Telemetry** — rejected: nothing leaves the machine without a shown report and a yes.
- **Notes in chat only** — rejected: that is today's protocol, and the report scrolls away.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[BUG-RULE]` | `skills/magicspec/references/rules/bug-reporting.md` | The protocol EF-7 and EF-10 extend. |
| `[RECORDER]` | `skills/magicspec/scripts/record-diagnostic.js` | The recording path notes share. |
| `[REFERENCE]` | external: an MCP server project's agent-feedback specification | Prior design this one adapts to an engine with no server process. |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-10-29 | Agent | Created from the owner's list of ideas: a feedback mechanism from the engine's users to its developers (copyable report or agent submission to the issue tracker), accumulation of every `MAGIC-SPEC ENGINE BUG REPORT` during the work, and the issue report format. Adapted from a sibling project's agent-feedback specification, recorded by class only. Post-Update Review: spec-critic PASS after the fixes of the review, prompt-engineer PASS-WITH-REWRITES (rewrites applied in the same pass); promoted to Stable under Trust Mode. |
