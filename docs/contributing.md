# 🛠️ Contributing Guide / Developer Manual

This guide describes how to contribute to `magic-spec`, work with scripts, build, and publish packages to npm and PyPI.

---

## 📂 Repository Structure

```plaintext
magic-spec/                         # Repository Root
│
├── .magic/                         # 🔧 SDD Engine (Source of Truth)
├── .agent/                         # 🎯 AI Agent Entry Points
├── adapters/                       # 🔌 Environment-specific Adapters
│   ├── cursor/
│   ├── github/
│   ├── kilocode/
│   └── windsurf/
│
├── installers/
│   ├── node/                       # 📦 npm Package (npx magic-spec)
│   │   ├── src/index.js            #    CLI: Entry point
│   │   ├── publish.js              #    npm Publishing script
│   │   ├── package.json            #    npm Config & Scripts
│   │   └── dist/                   #    Build output (gitignored)
│   │
│   └── python/                     # 📦 PyPI Package (uvx magic-spec)
│       ├── magic_spec/
│       │   ├── __init__.py
│       │   └── __main__.py         #    CLI: Entry point
│       ├── pyproject.toml          #    PyPI Config
│       └── dist/                   #    Build output (gitignored)
│
└── docs/                           # 📄 Documentation
    ├── README.md                   #    Main Guide
    └── contributing.md             #    Developer Guide (This file)
```

---

## 🟢 Node.js Installer (`installers/node/`)

All commands should be executed from the `installers/node/` directory.

### Build Process

Before publishing, you must **build** the package by assembling files from the repository root into the `dist/` directory:

```bash
cd installers/node
npm run build
```

The `build` command:

1. Removes the old `dist/` folder.
2. Copies `index.js` and `package.json` into `dist/`.
3. Synchronizes `.magic/`, `.agent/`, and `adapters/` from the root.
4. Copies `README.md` and `LICENSE` from the root.

### Script Reference

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `node build.js` | Assembles everything into `dist/`. |
| `npm run check` | `build` + `npm pack --dry-run` | Inspects package contents without uploading. |
| `npm run publish` | `build` + `node publish.js` | Builds and publishes to npm. |
| `npm run test:link` | `build` + `npm link` | Installs the local version globally. |
| `npm run test:pack` | `build` + `npm pack` | Creates a `.tgz` archive in `dist/`. |

### Local Testing

**Method A: npm link** (Fastest for global testing):

```bash
cd installers/node
npm run test:link
# Now 'magic-spec' is available globally.
```

**Method B: Direct Execution** (Instant feedback):

```bash
node installers/node/index.js --info
```

---

## 🔵 Python Installer (`installers/python/`)

All commands should be executed from the `installers/python/` directory.

### Build Process

```bash
cd installers/python
uv build
```

This generates both `.whl` and `.tar.gz` files in the `dist/` directory using `hatchling` as the backend.

### Script Reference

| Command | Description |
| :--- | :--- |
| `uv build` | Build the package into `dist/`. |
| `uv publish` | Publish to PyPI (interactive token entry). |
| `pip install -e .` | Editable install for development. |
| `python -m magic_spec` | Run directly without installation. |

---

## 🚀 Release Checklist

Before every release, ensure:

1. [ ] Changes are committed and pushed to git.
2. [ ] Version is updated in `installers/node/package.json`.
3. [ ] Version is updated in `installers/python/pyproject.toml`.
4. [ ] Versions match across both files.
5. [ ] `npm run build` passes for both installers.
6. [ ] Engine files (`.magic/`, `.agent/`) are up-to-date.
7. [ ] `npm run publish` (Node) and `uv publish` (Python) executed.
8. [ ] Git tag created: `git tag vX.Y.Z && git push --tags`.

---

## ❓ Common Issues

- **"No such file or directory"**: Ensure you are in the correct `installers/` subdirectory.
- **"Readme file does not exist"**: Run the synchronization script or copy `README.md` from the root.
- **Version Collision**: npm and PyPI do not allow overwriting versions. Increment the version number before publishing.
