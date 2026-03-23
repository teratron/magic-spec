# 🛠️ Contributing Guide / Developer Manual

This guide describes how to contribute to `magic-spec`, work with scripts, build, and publish packages to npm and PyPI.

## 📂 Repository Structure

```plaintext
magic-spec/                         # Repository Root
│
├── .magic/                         # 🔧 Template Engine (Source of Truth)
├── .agents/                         # 🎯 Template Workflows
│
├── installers/
│   ├── node/                       # 📦 Node.js Installer (Thin Client)
│   ├── python/                     # 📦 Python Installer (Thin Client)
│   ├── scripts/                    # 🚀 Automation & Release scripts
│   ├── tests/                      # 🧪 Integration & Unit tests
│   ├── adapters.json               # 🔌 IDE Adapter definitions
│   └── config.json                 # ⚙️ Installer configuration
│
├── .design/                        # 🏠 Self-referential SDD State
└── docs/                           # 📄 Documentation
    ├── README.md                   #    Main Guide
    └── contributing.md             #    Developer Guide (This file)
```

### Build Process

The Node.js installer is a **Thin Client**. It doesn't bundle the engine; instead, it downloads the current version from the GitHub repository during installation.

To test the installer locally:

1. Ensure `installers/config.json` is present.
2. Run the commands from the project root.

### Script Reference

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm test` | `python installers/scripts/run_tests.py` | Runs all integration tests. |
| `npm run build` | `npm pack --pack-destination dist` | Creates an npm package archive in `dist/`. |
| `npm run publish:dry` | `npm publish --dry-run` | Simulation of npm publication. |

### Local Testing

**Method A: Direct Execution** (Instant feedback):

```bash
node installers/node/index.js --info
```

## 🔵 Python Installer (`installers/python/`)

### Build Process

Run this from the project root:

```bash
uv build
```

This generates both `.whl` and `.tar.gz` files in the `dist/` directory using `hatchling` as the backend.

### Script Reference

| Command | Description |
| :--- | :--- |
| `uv build` | Build the package into `dist/`. |
| `uv publish` | Publish to PyPI (interactive token entry). |

### editable install (Recommended for dev)

```bash
pip install -e .
```

This installs `magic-spec` command pointing to your local source.

### Run via Module

```bash
python -m magic_spec --info
```

(Requires `PYTHONPATH` to include `installers/python`)

## 🚀 Release Process

We use a unified release script located in `installers/scripts/publish.py`. This script handles version bumping, documentation updates, and registry publication.

**Usage:**

```bash
python installers/scripts/publish.py <old_version> <new_version>
```

### Release Checklist

Before every release, ensure:

1. [ ] Changes are committed and pushed to git.
2. [ ] Tests pass: `npm test`.
3. [ ] Checksums/Version updated: `node .magic/scripts/executor.js update-engine-meta --workflow {names}`.
4. [ ] Version is set in `.magic/.version` (The Source of Truth).
5. [ ] `python installers/scripts/publish.py` executed successfully.

## ❓ Common Issues

- **"No such file or directory"**: Ensure you are in the correct directory. Developers should work from the root or `installers/` subfolders.
- **"Payload not found"**: Ensure the version in `package.json` or `.magic/.version` has been tagged and pushed to GitHub.
- **Version Collision**: npm and PyPI do not allow overwriting versions. Increment the version number in `.magic/.version` before running `publish.py`.
