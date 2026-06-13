# Release Pipeline

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

The GitHub Actions workflow (`.github/workflows/release.yml`) that packages the Layer-1 release kernel and publishes it as a GitHub Release. It is the engine's sole distribution channel: end users download the produced archive and copy the four L1 folders into their project. This spec documents the release contract (trigger, version source, archive composition, publication) so the distribution boundary has formal coverage — and records the engine-version tracking constraint the pipeline depends on.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Defines the L1 release kernel (`.magic/`, `workflows/`, `skills/`, `rules/`) and the L1/L2 distribution boundary this pipeline ships.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Manages `.design/.version` (project release version); distinct from `.magic/.version` (engine version) which this pipeline consumes.
- [l1-documentation-system.md](l1-documentation-system.md) — Distribution docs (`README`, `docs/distribution.md`) referenced by the release notes.

## 1. Motivation

GitHub Releases is the project's only distribution mechanism (per `README` and `docs/distribution.md`): there is no package registry. The release CI is therefore a critical shipped-adjacent artifact, yet it had no specification — a change to the trigger, archive composition, or version source could silently break or mis-ship the engine to every downstream user. This spec closes that coverage gap (retrospec of existing stable CI) and pins the contract.

## 2. Constraints & Assumptions

- **Single version source**: the engine version is read exclusively from `.magic/.version`; the release tag and archive name derive from it.
- **Tag-driven**: releases fire only on a pushed `v*` tag — never on branch pushes or manually mutated artifacts.
- **No build-time exclusions**: the L1 folders are walked wholesale; cleanliness is an upstream invariant (volatile state lives under `dev/.cache/` and `.design/.cache/`, never inside L1), not a per-path filter at packaging time.
- **Idempotent publication**: re-running a tag must not hard-fail; the workflow clobbers an existing asset and tolerates API rate limits.

## 4. Invariant Compliance

| L1 Invariant (l1-engine-core) | Implementation |
| --- | --- |
| L1 Release Kernel = `.magic/` + `workflows/` + `skills/` + `rules/` | The archive walk bundles exactly these four folders plus `AGENTS.md`, `README.md`, `LICENSE`. |
| Engine Safety (C1) — L1 ships clean | No `dev/`, `.design/`, or cache paths are walked; cleanliness is enforced upstream, not patched at build time. |
| Engine Versioning (C14) | The tag and archive name are derived from `.magic/.version`, the C14-managed engine version. |

## 5. Detailed Design

### 5.1 Trigger & Concurrency

- **Trigger**: `push` of a tag matching `v*`.
- **Permissions**: `contents: write` (to create the Release).
- **Concurrency**: grouped by `github.ref_name`, `cancel-in-progress: true` — a superseding tag push cancels an in-flight run.

### 5.2 Pipeline Steps

**Flow:**

```plaintext
tag v* pushed
  → Checkout (no persisted credentials)
  → Read version  (.magic/.version → output)
  → Build archive (magic-spec-v{version}.zip)
  → Create GitHub Release (tag v{version}, generated notes, retry)
```

1. **Read version**: `.magic/.version` → step output, the single source for tag and archive name.
2. **Build archive**: `magic-spec-v{version}.zip`, every path prefixed `magic-spec-v{version}/`. Contents: root `AGENTS.md` / `README.md` / `LICENSE` (when present) + a full walk of `.magic`, `workflows`, `skills`, `rules`.
3. **Create GitHub Release**: tag `v{version}`, title `v{version}`, notes generated inline (install instructions + changelog link). Retry loop (≤4 attempts): on `already exists` → `gh release upload --clobber`; on `rate limit` → backoff `attempt × 900s`; other errors → fail with the captured status.

### 5.3 Engine-Version Tracking Constraint

The release tag/version derives from `.magic/.version`, which is bumped by the C14 mechanism (`update-engine-meta`) on changes to **`.magic/` content only** — the checksum manifest (`.magic/.checksums`) does not cover `workflows/`, `skills/`, or `rules/`. Consequences:

- A change confined to `rules/` or hand-edited `skills/` does **not** bump `.magic/.version`, so it cannot carry its own release version or trip downstream upgrade-detection on its own.
- In practice this is benign: such changes normally ride alongside a `.magic/` change (templates, workflow bodies) that does bump the version; `skills/` is generated from `workflows/` during `update-engine-meta`.
- For a deliberate L1-only release (e.g., an isolated `rules/` fix), the engine version MUST be bumped explicitly so the tag advances and users detect the update. This is the operating constraint, not an automated guarantee.

## 7. Drawbacks & Alternatives

- **Checksum scope** — extending `.magic/.checksums` to the full L1 set would make any L1 edit bump the version automatically (removing §5.3's manual step), but it widens the load-bearing integrity manifest and risks false-positive drift (e.g., generated `skills/` churn). Deferred: documented as a constraint rather than a mechanism change.
- **No archive content test** — the workflow does not assert the archive excludes `dev/`/`.design/`; it relies on the upstream cleanliness invariant. A packaging smoke test is a possible future hardening.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CI]` | `.github/workflows/release.yml` | The release workflow this spec documents |
| `[VERSION]` | `.magic/.version` | Single source for the release tag and archive name |
| `[DIST]` | `docs/distribution.md` | User-facing manual-install reference linked from release notes |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 1.0.0 | 2026-06-13 | Agent | Initial Stable retrospec of `.github/workflows/release.yml` (tag-driven build + publish of the L1 archive). Documents the §5.3 engine-version tracking constraint, consolidating backlog finding R8. |
