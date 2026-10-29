# Release Pipeline

**Version:** 2.2.0
**Status:** Stable
**Layer:** implementation
**Implements:** l1-engine-core.md

## Overview

The GitHub Actions workflow (`.github/workflows/release.yml`) that packages the Layer-1 release kernel — the skill folder `skills/magicspec/` — and publishes it as a GitHub Release. It is the engine's sole distribution channel: end users download the produced archive, copy the folder into a host's skills folder and run `init --host`. This spec documents the release contract (trigger, version source, archive composition, publication) so the distribution boundary has formal coverage.

## Related Specifications

- [l1-engine-core.md](l1-engine-core.md) — Defines the L1 release kernel (`skills/magicspec/`) and the L1/L2 distribution boundary this pipeline ships.
- [l1-skill-packaging.md](l1-skill-packaging.md) — SP-1 (one skill) and SP-9 (each step ships working).
- [l2-skill-distribution.md](l2-skill-distribution.md) — §5.5: the archive composition and its smoke step, released with 3.0.0.
- [l2-engine-finalization.md](l2-engine-finalization.md) — Manages `.magicspec/.version` (project release version); distinct from `skills/magicspec/.version` (engine version) which this pipeline consumes.
- [l1-documentation-system.md](l1-documentation-system.md) — Distribution docs (`README`, `docs/distribution.md`) referenced by the release notes.

## 1. Motivation

GitHub Releases is the project's only distribution mechanism (per `README` and `docs/distribution.md`): there is no package registry. The release CI is therefore a critical shipped-adjacent artifact, yet it had no specification — a change to the trigger, archive composition, or version source could silently break or mis-ship the engine to every downstream user. This spec pins the contract.

## 2. Constraints & Assumptions

- **Single version source**: the engine version is read exclusively from `skills/magicspec/.version`; the release tag and archive name derive from it.
- **Tag-driven**: releases fire only on a pushed `v*` tag — never on branch pushes or manually mutated artifacts.
- **No build-time exclusions**: the product folder is walked wholesale; cleanliness is an upstream invariant (volatile state lives under `.cache/` and `.magicspec/.cache/`, never inside the folder), not a per-path filter at packaging time.
- **Idempotent publication**: re-running a tag must not hard-fail; the workflow clobbers an existing asset and tolerates API rate limits.

## 4. Invariant Compliance

| L1 Invariant (l1-engine-core) | Implementation |
| --- | --- |
| L1 Release Kernel = `skills/magicspec/` | The archive walk bundles the skill folder plus `README.md` and `LICENSE` (when present). |
| Engine Safety (C1) — L1 ships clean | No `dev/`, `.magicspec/`, or cache paths are walked; cleanliness is enforced upstream, not patched at build time. |
| Engine Versioning (C14) | The tag and archive name are derived from `skills/magicspec/.version`, the C14-managed engine version. |

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
  → Read version  (skills/magicspec/.version → output)
  → Build archive (magic-spec-v{version}.zip)
  → Create GitHub Release (tag v{version}, generated notes, retry)
```

1. **Read version**: `skills/magicspec/.version` → step output, the single source for tag and archive name.
2. **Build archive**: `magic-spec-v{version}.zip`, every path prefixed `magic-spec-v{version}/`. Contents: the files printed by `scripts/archive-composition.js list` — root `README.md` / `LICENSE` (when present) + a full walk of `skills/magicspec`. `AGENTS.md` is a repository identity file and is not part of the distribution.
3. **Smoke-check the archive**: the finished archive is listed and piped to `scripts/archive-composition.js check`, which fails the job on any path outside the composition or any missing required file.
4. **Create GitHub Release**: tag `v{version}`, title `v{version}`, notes generated inline (install instructions + changelog link). Retry loop (≤4 attempts): on `already exists` → `gh release upload --clobber`; on `rate limit` → backoff `attempt × 900s`; other errors → fail with the captured status.

### 5.3 Engine-Version Tracking [RETIRED]

The earlier constraint — a change confined to `workflows/`, `skills/` or `rules/` did not bump the engine version, because the manifest covered `.magic/` only — is gone with the layout that produced it. The manifest covers the whole product folder ([l2-skill-layout.md](l2-skill-layout.md) §5.4), so every edit inside it is a version event of its own and the tag advances with it. A change outside the folder is not part of the product.

## 7. Drawbacks & Alternatives

- **Archive content test** — closed by the smoke step (§5.2): the archive is checked against the same composition that built it.

## Canonical References

| Alias | Path | Purpose |
| --- | --- | --- |
| `[CI]` | `.github/workflows/release.yml` | The release workflow this spec documents |
| `[VERSION]` | `skills/magicspec/.version` | Single source for the release tag and archive name |
| `[DIST]` | `docs/distribution.md` | User-facing install reference linked from release notes; its host and target-directory content is mandated by **C17 (Adapter Distribution Reference)** |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| 2.2.0 | 2026-10-28 | Agent | The archive composition and its smoke step as built ([l2-skill-distribution.md](l2-skill-distribution.md) §5.5): the workflow builds the archive from the list printed by `scripts/archive-composition.js list` and runs `unzip -Z1 … | scripts/archive-composition.js check --prefix …`, which exits non-zero on a path outside the composition or a missing required file; the "no archive content test" gap in §7 is closed. Status reverted `Stable → RFC` (Amendment Rule, minor) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 2.0.2 | 2026-10-28 | Agent | Reality sync for the state folder rename: the folder is `.magicspec/` in all engine, maintenance and workspace text. No requirement changed. |
| 2.0.1 | 2026-10-28 | Agent | Reality sync for the maintenance layout: the maintenance folders (`scripts/`, `tests/`, `skills/magicspec-dev/`) and the `/magicspec-dev:` command names follow the move out of `dev/` and the dotted names. No requirement changed. |
| 2.0.0 | 2026-10-28 | Agent | The pipeline packages the one product folder, `skills/magicspec/` ([l1-skill-packaging.md](l1-skill-packaging.md), [l2-skill-layout.md](l2-skill-layout.md) §5.2), and reads the engine version from its `.version`. §5.3 (the engine-version tracking constraint) is retired: the manifest now covers the whole folder, so a change to any body, role, template, script or the rule source is a version event on its own — the gap the constraint recorded no longer exists, and §7's deferred checksum-scope alternative is adopted. The archive composition proper (the layout inside the archive, the host install instructions and the smoke step) is the release step of [l2-skill-distribution.md](l2-skill-distribution.md) §5.5 and lands with the 3.0.0 release. Status reverted `Stable → RFC` (Amendment Rule, major) and re-promoted to `Stable` after the Post-Update Review in the same pass. |
| 1.0.1 | 2026-07-10 | Agent | Traceability: the `[DIST]` canonical reference now cites the **C17 (Adapter Distribution Reference)** convention that governs `docs/distribution.md` content. No logic change (patch — Stable retained). |
| 1.0.0 | 2026-06-13 | Agent | Initial Stable retrospec of `.github/workflows/release.yml` (tag-driven build + publish of the L1 archive). Documents the §5.3 engine-version tracking constraint, consolidating backlog finding R8. |
