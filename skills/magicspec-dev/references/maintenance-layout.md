# Maintenance Layout

The developer repository keeps the shipped engine and its maintenance tooling apart:

| Path | Role |
| --- | --- |
| `skills/magicspec/` | The product: the shipped skill folder |
| `skills/magicspec-dev/` | This skill: the maintenance workflows, nothing executable |
| `scripts/` | Maintenance scripts: manifest builder, lifecycle sync, link validator, mutation driver, init and release scripts |
| `tests/` | The script harness (`engine.js`) and the cognitive suite (`suite.md`) |
| `package.json` | The repository's own manifest (CommonJS scope, the `test` script); never packaged |

The developer predicate (`hasEngineWriteTooling`) is true when the skill folder's real path is `<root>/skills/magicspec` and `<root>/scripts/generate-checksums.js` exists; each half alone is false.

A script inside `skills/magicspec/` must not `require` anything outside it except through a presence-guarded fallback; a script outside it is maintenance by location.
