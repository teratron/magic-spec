// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
    TESTS_DIR,
    createTempWorkspace,
    cleanup,
    generateChecksums,
    runEngineMetaCheck,
} = require('./lib/base');
const { listFilesUnder } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 1. generate-checksums.js
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-checksums.js should create .checksums file correctly', () => {
        const tempDir = createTempWorkspace();
        try {
            const scriptPath = path.join(tempDir, 'scripts', 'generate-checksums.js');
            execSync(`node "${scriptPath}"`, { cwd: tempDir });

            const checksumsPath = path.join(tempDir, 'skills', 'magicspec', '.checksums');
            assert.ok(fs.existsSync(checksumsPath), '.checksums should exist');
            const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));

            // Check if scripts are included
            assert.ok(checksums['scripts/init.js'], 'init.js should be tracked');
            // Check if history is ignored
            assert.ok(!checksums['history/init.md'], 'history should be ignored');
        } finally {
            cleanup(tempDir);
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1a. Architecture invariant — no volatile state caches inside skills/magicspec/
    //     (Historical: regressions used to flag ENGINE_INTEGRITY when sync sub-
    //      scripts wrote state caches into skills/magicspec/. State files now live in
    //      .magicspec/.cache/; skills/magicspec/ stays a clean engine kernel.)
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel must not ship volatile state caches in skills/magicspec/', () => {
        const magicRoot = path.join(TESTS_DIR, '..', 'skills', 'magicspec');
        const forbidden = ['.docs-state.json', '.project-meta-state.json', '.finalize-state.json'];
        for (const name of forbidden) {
            assert.ok(
                !fs.existsSync(path.join(magicRoot, name)),
                `${name} must not exist inside skills/magicspec/ — relocate to .magicspec/.cache/`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1b. Architecture invariant — the CommonJS module-scope boundary must ship
    //     Downstream projects whose root package.json declares "type":"module"
    //     would otherwise resolve skills/magicspec/scripts/*.js as ESM and die on require().
    //     The boundary only protects users if it is tracked: the release archive
    //     is built by walking a fresh CI checkout, so untracked files never ship,
    //     and update-engine-meta --check does NOT flag manifest entries whose
    //     file is absent — the omission would be silent.
    // ───────────────────────────────────────────────────────────────────────────
    test('engine kernel ships a tracked CommonJS scope boundary at skills/magicspec/scripts/package.json', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const relPath = 'skills/magicspec/scripts/package.json';
        const absPath = path.join(repoRoot, relPath);

        assert.ok(
            fs.existsSync(absPath),
            `${relPath} must exist — it pins CommonJS for the engine scripts`,
        );

        const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        assert.strictEqual(pkg.type, 'commonjs', `${relPath} must declare "type":"commonjs"`);

        // Ignored → omitted from the release archive → the boundary silently vanishes. A file is
        // counted when git would commit it: tracked, or new and not ignored (the state before a commit).
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert
        const committable = execSync(
            `git ls-files --cached --others --exclude-standard -- "${relPath}"`,
            {
                cwd: repoRoot,
                encoding: 'utf8',
            },
        )
            .split(/\r?\n/)
            .filter(Boolean);
        assert.deepStrictEqual(
            committable,
            [relPath],
            `${relPath} exists but is IGNORED or untracked — it will be missing from the release archive. Check .gitignore, then: git add ${relPath}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1c. Architecture invariant — every .checksums entry must be git-tracked
    //     (Historical: engine ≤2.1.86 baked four `.fallow/` cache-file hashes
    //     from an unrelated third-party tool into the manifest — a release
    //     archive is built from a fresh CI checkout (.github/workflows/release.yml),
    //     so an untracked path in .checksums can never exist on a fresh install,
    //     and every consumer's very first `update-engine-meta --check` failed
    //     unconditionally, with no self-heal path on a consumer install.)
    // ───────────────────────────────────────────────────────────────────────────
    test('every skills/magicspec/.checksums entry must be a git-tracked file', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        if (!fs.existsSync(path.join(repoRoot, '.git'))) return; // not a git checkout: nothing to assert

        const tracked = new Set(
            execSync('git ls-files --cached --others --exclude-standard skills/magicspec', {
                cwd: repoRoot,
                encoding: 'utf8',
            })
                .split(/\r?\n/)
                .filter(Boolean)
                .map((p) => p.slice('skills/magicspec/'.length)),
        );

        const checksums = JSON.parse(
            fs.readFileSync(path.join(repoRoot, 'skills', 'magicspec', '.checksums'), 'utf8'),
        );
        const untracked = Object.keys(checksums).filter((rel) => !tracked.has(rel));

        assert.deepStrictEqual(
            untracked,
            [],
            `skills/magicspec/.checksums references untracked path(s) — a release archive can never contain them, so every consumer's first commit would fail: ${untracked.join(', ')}. Run: git add ${untracked.map((rel) => 'skills/magicspec/' + rel).join(' ')}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1c-bis. Architecture invariant — no NUL byte anywhere in the engine kernel
    //     `lib/diagnostics.js` built its dedup key with two RAW NUL bytes as
    //     separators instead of the `\0` escape. Runtime-identical, but git
    //     classifies any file containing NUL as `-text` (so `eol=lf`
    //     normalisation never applies to it) and GNU grep answers "Binary file
    //     matches" instead of the matching lines — a core engine file hidden
    //     from grep-based review and audit tooling, this project's own included.
    // ───────────────────────────────────────────────────────────────────────────
    test('no engine kernel file contains a raw NUL byte', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const found = [];
        const skipped = /[\\/](?:history|\.git|node_modules)[\\/]/;
        for (const dir of [path.join('skills', 'magicspec')]) {
            for (const full of listFilesUnder(path.join(repoRoot, dir), (f) => !skipped.test(f))) {
                const at = fs.readFileSync(full).indexOf(0);
                if (at !== -1)
                    found.push(`${path.relative(repoRoot, full).split(path.sep).join('/')}@${at}`);
            }
        }

        assert.deepStrictEqual(
            found,
            [],
            `raw NUL byte(s) (file@offset) — write the \\0 escape instead: ${found.join(', ')}`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 1d. generate-checksums.js / update-engine-meta.js — gitignore-aware scan
    //     (Invariant 7 parity, engine v2.1.87). `detect-communities.js` and
    //     siblings already honor .gitignore (§10/§11 below); the checksum
    //     scanners never did, which is exactly how `.fallow/`'s cache entered
    //     .checksums in the first place.
    // ───────────────────────────────────────────────────────────────────────────
    test('generate-checksums.js excludes .gitignored directories from the manifest (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.foreign-cache/\n');

            const strayDir = path.join(tempDir, 'skills', 'magicspec', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile third-party cache content');

            generateChecksums(tempDir);

            const checksums = JSON.parse(
                fs.readFileSync(path.join(tempDir, 'skills', 'magicspec', '.checksums'), 'utf8'),
            );
            assert.ok(
                !Object.keys(checksums).some((rel) => rel.startsWith('.foreign-cache/')),
                'a .gitignored directory inside skills/magicspec/ must never enter the manifest',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    test('update-engine-meta.js --check does not flag a .gitignored file that newly appears inside skills/magicspec/ (Invariant 7)', () => {
        const tempDir = createTempWorkspace();
        try {
            fs.writeFileSync(path.join(tempDir, '.gitignore'), '.foreign-cache/\n');
            generateChecksums(tempDir);

            assert.strictEqual(
                runEngineMetaCheck(tempDir).failed,
                false,
                'baseline --check must be clean',
            );

            // A foreign tool (unrelated to the engine) drops a cache file inside
            // skills/magicspec/ after install — exactly how `.fallow/` appeared in engine
            // v2.1.86. A consumer install has no scripts/generate-checksums.js
            // to clear resulting drift, so this must never be flagged at all.
            const strayDir = path.join(tempDir, 'skills', 'magicspec', '.foreign-cache');
            fs.mkdirSync(strayDir, { recursive: true });
            fs.writeFileSync(path.join(strayDir, 'data.bin'), 'volatile');

            const after = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                after.failed,
                false,
                'a .gitignored file appearing inside skills/magicspec/ must never be reported as drift',
            );
            assert.doesNotMatch(
                after.output,
                /Detected change/,
                'gitignored content must not surface as a detected change',
            );
        } finally {
            cleanup(tempDir);
        }
    });

    // Real-world regression: a consumer project (e.g. metaquant) follows the
    // documented L1 contract and gitignores `skills/magicspec/` wholesale ("installed
    // from a release archive, not committed"). Before this
    // fix, the Invariant 7 exclusion applied unconditionally, so every single
    // manifested file read as "disowned" by the consumer's own .gitignore and
    // was reported missing — failing the pre-commit hook on every commit.
    test('update-engine-meta.js --check still verifies manifested files even when the consumer wholesale-gitignores skills/magicspec/ (Invariant 7 boundary)', () => {
        const tempDir = createTempWorkspace();
        try {
            generateChecksums(tempDir);

            // Consumer convention: skills/magicspec/ is an installed release artifact,
            // never committed — this is the documented, expected state for
            // every consumer install, not an edge case.
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'skills/magicspec/\n');

            const result = runEngineMetaCheck(tempDir);
            assert.strictEqual(
                result.failed,
                false,
                'unmodified manifested files must not be reported as missing merely because the consumer gitignores skills/magicspec/ wholesale',
            );
            assert.doesNotMatch(
                result.output,
                /Missing engine file/,
                "a manifested, unmodified file must never read as missing due to the consumer's own .gitignore",
            );
        } finally {
            cleanup(tempDir);
        }
    });
};
