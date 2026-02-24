# Automation Scripts

This directory contains utility scripts for development, testing, and releasing Magic Spec.

## 🚀 Scripts Overview

| Script | Purpose |
| :--- | :--- |
| `run_tests.py` | Runs all unit and integration tests found in the `tests/` directory. |
| `publish.py` | Bumps versions across the project, updates docs, tags git, and publishes to registries. |

---

## 🧪 Testing (`run_tests.py`)

Run this script before every commit or release to ensure no regressions.

**Usage:**

```bash
python scripts/run_tests.py
```

*Note: You can also use `npm test` which triggers this script.*

---

## 📦 Releasing (`publish.py`)

The unified release script for both Python (PyPI) and Node.js (npm).

**Usage:**

```bash
python scripts/publish.py <old_version> <new_version> [flags]
```

**Common Flags:**

- `--dry-run`: Simulation mode. No files are modified, no tags created, no publishing.
- `--skip-publish`: Only bumps versions and create git tags, but doesn't push to npm/PyPI.

**Example:**

```bash
python scripts/publish.py 1.2.3 1.2.4
```

---

## 🛠️ Requirements

- **Python >= 3.8**
- **Node.js >= 16**
- **uv** (for Python publishing)
- **npm** (for Node.js publishing)
