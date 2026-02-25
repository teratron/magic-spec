# README Strategy

**Version:** 1.0.0
**Status:** Stable
**Layer:** implementation
**Implements:** N/A (Strategy)

## Overview

Defines the content strategy and structure for the **Single Unified README** distributed with `magic-spec`.

Due to the "Thin Client" architectural shift (shipping from the root project folder rather than isolated build folders), we now use a single `README.md` at the repository root that serves three distinct audiences:

1. **GitHub visitors**
2. **npm / npx users** (via npmjs.com)
3. **PyPI / uvx users** (via pypi.org)

## Related Specifications

- [distribution-npm.md](distribution-npm.md) — npm package structure.
- [distribution-pypi.md](distribution-pypi.md) — PyPI package.
- [architecture.md](architecture.md) — repository layout.

## 1. Motivation

When a user encounters `magic-spec`, they arrive from one of three places:

1. **GitHub** — via search, a link, or social media.
2. **npmjs.com** — via `npm search` or Google.
3. **pypi.org** — via `pip search`, `uvx`, or Google.

Because the release process packages the root of the repository, the same `README.md` is displayed in all three locations. Our strategy must gracefully present installation instructions for both Node.js and Python ecosystems immediately, without bias, while quickly communicating the value proposition of the tool.

## 2. Constraints & Assumptions

- The README is written in **English** (international product).
- It must not exceed ~150-200 lines to remain an effective landing page.
- Both `npx` and `uvx` installation methods must be equally prominent.
- Developer-facing documentation (build scripts, publishing) lives in `docs/ contributing-ru.md` and is **not** part of the README.
- Previous nested READMEs (`installers/node/README.md` and `installers/python/README.md`) are no longer distributed and should be considered deprecated.

## 3. Detailed Design

### 3.1 Unified README Structure

**Role:** Landing page for the project on GitHub, npm, and PyPI. First impression.

**Target audience:** Any developer discovering the project in any ecosystem.

**Structure:**

```plaintext
# 🪄 Magic Spec
  Badges (npm version, PyPI version, license)
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

### 3.2 Build-time Packaging

Because we use a Thin Client methodology, the packaging tools natively pick up the root `README.md`:

- **npm publish** automatically includes `README.md` in the root when executed by `publish.py`.
- **uv publish** explicitly references `readme = "README.md"` inside `pyproject.toml`.

No automatic generation or templating is needed. The single file is maintained manually.

## 4. Implementation Notes

1. The unified README already exists and follows the target structure.
2. Keep it concise. Users on npm or PyPI are looking for quick installation commands; the Dual Quick Start section ensures they see their preferred package manager immediately.
3. The legacy `installers/node/README.md` and `installers/python/README.md` should be ignored or deleted, as they are no longer exposed to end-users.

## 5. Drawbacks & Alternatives

**Alternative: Three separate READMEs**
Use different READMEs for GitHub, npm, and PyPI. Rejected — while it offers more tailored messaging, it complicates the build and publish process heavily for a Thin Client architecture where the metadata is at the project root. The dual-install section is a minor compromise for a much simpler deployment.

## Document History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 0.1.0 | 2026-02-21 | Agent | Initial Draft |
| 0.2.0 | 2026-02-25 | Agent | Added SDD standard metadata (Layer, RFC status update) |
| 1.0.0 | 2026-02-25 | Agent | Rewritten for Thin Client architecture, enforcing a single unified README approach. Set to Stable. |
