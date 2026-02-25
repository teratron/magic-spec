# README Strategy

**Version:** 0.2.0
**Status:** RFC
**Layer:** implementation
**Implements:** N/A (Strategy)

## Overview

Defines the content strategy, structure, and maintenance rules for the three README files
distributed with `magic-spec`:

| # | README | Audience | Distributed via |
| :--- | :--- | :--- | :--- |
| 1 | `README.md` (repo root) | GitHub visitors, all developers | GitHub, npm fallback, PyPI fallback |
| 2 | `installers/node/README.md` | npm / npx users | npmjs.com package page |
| 3 | `installers/python/README.md` | PyPI / uvx users | pypi.org project page |

Each file serves a different reader in a different context. They must not be copies of each other.

## Related Specifications

- [distribution-npm.md](distribution-npm.md) — npm package structure; `README.md` is part of the `files` field.
- [distribution-pypi.md](distribution-pypi.md) — PyPI package; `readme` field in `pyproject.toml`.
- [architecture.md](architecture.md) — repository layout; defines where each README lives.

## 1. Motivation

When a user encounters `magic-spec`, they arrive from one of three places:

1. **GitHub** — via search, a link, or social media. They see the repo root `README.md`.
2. **npmjs.com** — via `npm search` or Google. They see the `README.md` packed inside the npm tarball.
3. **pypi.org** — via `pip search`, `uvx`, or Google. They see the `readme` declared in `pyproject.toml`.

Each context has different expectations:

- **GitHub reader** wants the big picture: what is this, why should I care, how do I install (both methods).
- **npm reader** already chose Node.js — they want `npx` instructions only, no Python clutter.
- **PyPI reader** already chose Python — they want `uvx` / `pip` instructions only, no Node.js clutter.

Serving all three audiences from a single README leads to confusion and diluted messaging.

## 2. Constraints & Assumptions

- All three READMEs are written in **English** (international product).
- The GitHub README is the canonical long-form document. Installer READMEs are focused subsets.
- GitHub README must not exceed ~200 lines — it is a landing page, not documentation.
- Installer READMEs must not exceed ~80 lines — they are quick-start guides.
- No implementation code in READMEs. Command examples and directory trees are permitted.
- Developer-facing documentation (build scripts, publishing) lives in `docs/contributing-ru.md` and is **not** part of any README.

## 3. Detailed Design

### 3.1 GitHub README (`README.md` — repo root)

**Role:** Landing page for the project. First impression.

**Target audience:** Any developer discovering the project.

**Structure:**

```plaintext
# 🪄 Magic Spec
  Badges (npm, PyPI, license)
  Tagline + one-line value proposition

## ✨ What is Magic Spec?
  Problem statement + pipeline diagram
  4 bullet points: what the agent does

## 🚀 Quick Start
  ### Option A — Node.js (npx)
  ### Option B — Python (uvx)
  What gets installed (3-step list)

## 🧭 Core Philosophy
  Table: 4 principles

## 📁 What Gets Installed
  Directory tree of .magic/, .agent/, .design/

## 🔗 The Workflow Pipeline
  Mermaid diagram
  Core Workflows table (3 rows)
  Auxiliary Workflows table (2 rows)

## 💬 How to Use
  Natural language examples → which workflow runs

## 🔄 Updating
  npx --update / uvx --update

## 🤝 Compatibility
  Supported AI agents list

## 📄 License
```

**Key rules:**

- Both installation methods (npx + uvx) must be equally prominent — no bias toward either ecosystem.
- The Mermaid pipeline diagram is the visual anchor of the page.
- No developer/contributor instructions here — link to `docs/` instead.

### 3.2 npm README (`installers/node/README.md`)

**Role:** Package page on npmjs.com. Quick-start for Node.js users.

**Target audience:** Developers who arrived via `npm search magic-spec` or a direct link.

**Structure:**

```plaintext
# 🪄 Magic Spec
  Badges (npm version, license)
  Tagline

## Quick Start
  npx magic-spec@latest
  (single command, no alternatives)

## What Gets Installed
  Short directory tree

## CLI Options
  --env <adapter>    (cursor, claude, gemini)
  --update           (update engine only)
  --help

## Compatibility
  Supported AI agents (compact list)

## License + Links
  GitHub repo, PyPI alternative
```

**Key rules:**

- **No mention of Python, pip, uvx, or PyPI** — the reader already chose Node.js.
- Maximum ~80 lines.
- The primary call-to-action is `npx magic-spec@latest` — it must appear within the first 10 lines.
- Link to the GitHub README for full documentation.

### 3.3 PyPI README (`installers/python/README.md`)

**Role:** Package page on pypi.org. Quick-start for Python users.

**Target audience:** Developers who arrived via `pip search`, `uvx`, or a direct link.

**Structure:**

```plaintext
# 🪄 Magic Spec
  Badges (PyPI version, license, Python versions)
  Tagline

## Quick Start
  uvx magic-spec
  (primary method, single command)
  Alternative: pip install magic-spec && magic-spec

## What Gets Installed
  Short directory tree

## CLI Options
  --env <adapter>    (cursor, claude, gemini)
  --update           (update engine only)
  --help

## Compatibility
  Supported AI agents (compact list)

## License + Links
  GitHub repo, npm alternative
```

**Key rules:**

- **No mention of Node.js, npm, or npx** — the reader already chose Python.
- Maximum ~80 lines.
- `uvx magic-spec` is the primary command. `pip install` is a secondary alternative.
- Link to the GitHub README for full documentation.

### 3.4 Content Deduplication Matrix

Shows which sections appear in which README to avoid drift:

| Section | GitHub | npm | PyPI |
| :--- | :--- | :--- | :--- |
| What is Magic Spec? | ✅ Full | ❌ | ❌ |
| Quick Start (npx) | ✅ | ✅ Primary | ❌ |
| Quick Start (uvx) | ✅ | ❌ | ✅ Primary |
| Core Philosophy | ✅ Full | ❌ | ❌ |
| What Gets Installed | ✅ Full tree | ✅ Short tree | ✅ Short tree |
| Workflow Pipeline | ✅ Mermaid | ❌ | ❌ |
| How to Use | ✅ | ❌ | ❌ |
| CLI Options | ❌ (link to docs) | ✅ | ✅ |
| Updating | ✅ Both methods | ❌ (in CLI Options) | ❌ (in CLI Options) |
| Compatibility | ✅ | ✅ Compact | ✅ Compact |
| License | ✅ | ✅ | ✅ |

### 3.5 Build-time Synchronization

The `build` scripts in both installers copy `README.md` from the installer directory (not from root)
into `dist/`. This means:

- **npm package** ships `installers/node/README.md` → appears on npmjs.com.
- **PyPI package** ships `installers/python/README.md` → appears on pypi.org.
- **GitHub** shows `README.md` from the repo root.

No automatic generation or templating. Each file is maintained manually.

## 4. Implementation Notes

1. Write all three READMEs in a single task to ensure consistency.
2. The GitHub README already exists and is close to the target structure — refine, don't rewrite from scratch.
3. Installer READMEs currently contain Russian developer guides — these should be moved to `docs/contributing-ru.md` (already done) and replaced with English user-facing content.
4. After writing, verify that `npm run build` and `uv build` correctly pick up the new READMEs.

## 5. Drawbacks & Alternatives

**Alternative: Single README for everything**
Use the GitHub README everywhere. Rejected — npm and PyPI pages would show irrelevant install
instructions for the wrong ecosystem, confusing users.

**Alternative: Auto-generate from template**
Maintain a single source and generate variants via script. Over-engineered for 3 small files
that change rarely. Manual maintenance is simpler and produces better copy.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 0.1.0 | 2026-02-21 | Agent | Initial Draft |
| 0.2.0 | 2026-02-25 | Agent | Added SDD standard metadata (Layer, RFC status update) |
