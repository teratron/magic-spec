// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { TESTS_DIR, cleanup } = require('./lib/base');
const { listFilesUnder, writeTreeFiles, makeArchivalProject, runEngine } = require('./lib/sim');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 5j. Registry text contract and question routing.
    //     Both are instruction text with no script behind them, so the shipped
    //     prose is the implementation and can regress silently. The harness pins
    //     the concept each sentence carries, in every place it ships.
    // ───────────────────────────────────────────────────────────────────────────
    test('registry text contract: spec.md registers a Description with its form, changes it only when what or when changed, and the checklist names it', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const lines = fs
            .readFileSync(
                path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'spec.md'),
                'utf8',
            )
            .split('\n');

        const register = lines.find((l) => l.includes('Register in `INDEX.md`'));
        assert.ok(register, 'the creation step must register the specification in the registry');
        assert.ok(
            register.includes('(Name, Status, Layer, Version, Description)'),
            'registration must list the Description among the fields it writes',
        );
        for (const statement of [
            'what the specification is for and when to open it',
            'at most two sentences',
            'a router, not an index of contents',
            'is answered by searching the specification text',
        ]) {
            assert.ok(
                register.includes(statement),
                `the registration step must state: ${statement}`,
            );
        }

        const sync = lines.find((l) =>
            l.includes('Update `Version`, `Status`, `Layer` in `INDEX.md`'),
        );
        assert.ok(sync, 'the Sync step must update the registry row');
        for (const statement of [
            'Change the `Description` only when',
            'rewrite the whole cell in the form above, never append to it',
            'byte-identical',
            "the amendment goes to the specification's `Document History`",
        ]) {
            assert.ok(sync.includes(statement), `the Sync step must state: ${statement}`);
        }

        const checklist = lines.find((l) => l.includes('Registry: INDEX.md updated'));
        assert.ok(
            checklist?.includes('Description only if what or when changed'),
            'the checklist registry line must name the Description and its condition',
        );
    });

    test('registry text contract: task.md says the ledger overview describes the ledger and is not appended to', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const lines = fs
            .readFileSync(
                path.join(repoRoot, 'skills', 'magicspec', 'workflows', 'task.md'),
                'utf8',
            )
            .split('\n');
        const bullet = lines.find((l) => l.startsWith('- TASKS.md: master Phase Index'));
        assert.ok(bullet, 'Plan Write-back must describe TASKS.md');
        for (const statement of [
            'says what the file is and how to read it and tracks nothing',
            "the phase table's status column",
            'its phase file, the workspace changelog and the archive',
            'Nobody appends to the `Overview`',
        ]) {
            assert.ok(bullet.includes(statement), `the TASKS.md bullet must state: ${statement}`);
        }
    });

    test('registry text contract: each registry and ledger template carries its comment at the placeholder, outside any table', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const expected = [
            [
                'workspace-index.md',
                '<!-- Description: what the specification is for and when to open it',
            ],
            ['global-index.md', '<!-- Description: what the workspace is for and when to open it'],
            ['tasks.md', '<!-- Describes this file, not the plan'],
        ];
        for (const [file, comment] of expected) {
            const lines = fs
                .readFileSync(path.join(repoRoot, 'skills', 'magicspec', 'templates', file), 'utf8')
                .split('\n');
            const at = lines.findIndex((l) => l.startsWith(comment));
            assert.ok(at >= 0, `${file} must carry the comment: ${comment}`);
            assert.ok(
                !lines[at - 1]?.startsWith('|') && !lines[at + 1]?.startsWith('|'),
                `${file}: the comment must stand outside any table row`,
            );
        }
    });

    test('question routing: skills/magicspec/CONSTITUTION.md sends a mechanic named in a question to the specification text and a structural one to the graph, in both copies', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const text = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec', 'CONSTITUTION.md'),
            'utf8',
        );
        const start = text.indexOf('## 2. Specification Knowledge Graph');
        const end = text.indexOf('\n## 3.', start);
        assert.ok(
            start >= 0 && end > start,
            'skills/magicspec/CONSTITUTION.md must carry the graph section',
        );
        const bullets = text.slice(start, end).split('\n- ');

        const graphBullet = bullets.find((b) => b.includes('build-spec-graph'));
        assert.ok(graphBullet, 'a bullet must send structural questions to the graph');
        assert.ok(
            !graphBullet.includes('what covers Z'),
            'a question about what covers a mechanic must not be sent to the graph',
        );

        const contentBullet = bullets.find((b) => b.includes('hold no specification text'));
        assert.ok(
            contentBullet,
            'a bullet must say the graph and the wiki hold no specification text',
        );
        for (const statement of [
            'names a mechanic',
            '.magicspec/{workspace}/specifications/',
            'reading the matching section',
        ]) {
            assert.ok(
                contentBullet.replace(/\s+/g, ' ').includes(statement),
                `the routing bullet must state: ${statement}`,
            );
        }

        // The developer machine's projection is generated (by init, refreshed by C14) and kept out of
        // version control, so a fresh clone has none; where it exists it must carry the same text.
        const twinPath = path.join(repoRoot, '.agents', 'rules', 'magicspec.md');
        if (fs.existsSync(twinPath)) {
            assert.strictEqual(
                fs.readFileSync(twinPath, 'utf8'),
                text,
                'the projection under .agents/rules must carry the same routing',
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5k. Setting parity and the archival opt-out.
    //     A setting that a shipped file defines or names is a promise to whoever
    //     writes its value; a setting with no reader breaks it silently. The rule
    //     is decided here over a tree root, so one function judges both a
    //     throwaway fixture and the shipped tree.
    // ───────────────────────────────────────────────────────────────────────────
    const SETTING_FILE_EXTENSIONS = new Set([
        'md',
        'js',
        'json',
        'sh',
        'ps1',
        'yml',
        'yaml',
        'txt',
        'html',
        'css',
        'mjs',
        'cjs',
    ]);

    // Splits JavaScript into the part that executes and the part that only says
    // things: comments are dropped, and the contents of string and template
    // literals are blanked, so a message that names a key cannot read as an
    // access to it. `withStrings` keeps the literals, so a bracket access by
    // name stays visible.
    const splitJavaScript = (source) => {
        let code = '';
        let withStrings = '';
        let i = 0;
        while (i < source.length) {
            const c = source[i];
            const next = source[i + 1];
            if (c === '/' && next === '/') {
                while (i < source.length && source[i] !== '\n') i++;
            } else if (c === '/' && next === '*') {
                const end = source.indexOf('*/', i + 2);
                i = end < 0 ? source.length : end + 2;
            } else if (c === '"' || c === "'" || c === '`') {
                let j = i + 1;
                while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
                const literal = source.slice(i, j + 1);
                withStrings += literal;
                code += c + ' '.repeat(Math.max(0, literal.length - 2)) + c;
                i = j + 1;
            } else {
                code += c;
                withStrings += c;
                i++;
            }
        }
        return { code, withStrings };
    };

    // The names a script reads off an object: `.name`, and `['name']`.
    const accessedNames = (source) => {
        const { code, withStrings } = splitJavaScript(source);
        const names = new Set();
        for (const m of code.matchAll(/\.\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
        for (const m of withStrings.matchAll(/\[\s*(['"])([^'"\\]+)\1\s*\]/g)) names.add(m[2]);
        return names;
    };

    // A reader is a script under `skills/magicspec/scripts/` that takes the section off the
    // parsed file and the key off the section — directly, or through a defaults
    // table merged over it. A comment, a string or a message that only names the
    // key is not a read, and a script anywhere else does not count.
    const settingReaders = (root) =>
        listFilesUnder(path.join(root, 'skills', 'magicspec', 'scripts'), (f) =>
            f.endsWith('.js'),
        ).map((file) => accessedNames(fs.readFileSync(file, 'utf8')));

    const hasSettingReader = (key, readers) => {
        const segments = key.split('.');
        return readers.some((names) => segments.every((segment) => names.has(segment)));
    };

    // Every key of the workspace template outside the workspace registry.
    const templateSettings = (root) => {
        const rel = 'skills/magicspec/templates/workspace.json';
        const text = fs.readFileSync(path.join(root, rel), 'utf8');
        const lines = text.split('\n');
        const leaves = [];
        const walkValue = (value, parts) => {
            if (
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                Object.keys(value).length > 0
            ) {
                for (const [k, v] of Object.entries(value)) walkValue(v, [...parts, k]);
            } else {
                leaves.push(parts);
            }
        };
        for (const [k, v] of Object.entries(JSON.parse(text))) {
            if (k === 'default' || k === 'workspaces') continue;
            walkValue(v, [k]);
        }
        return leaves.map((parts) => {
            const from = lines.findIndex((l) => l.includes(`"${parts[0]}"`));
            const at = lines.findIndex(
                (l, i) => i >= from && l.includes(`"${parts[parts.length - 1]}"`),
            );
            return { file: rel, line: at + 1, key: parts.join('.') };
        });
    };

    // Every dotted key path that a line of shipped text names together with
    // `workspace.json`. File names (`a.md`, `b.js`) are not paths.
    const textSettings = (root) => {
        const files = ['skills', 'magicspec', 'docs', 'workflows', 'rules'].flatMap((d) =>
            listFilesUnder(path.join(root, d), (f) => f.endsWith('.md')),
        );
        const readme = path.join(root, 'README.md');
        if (fs.existsSync(readme)) files.push(readme);
        const found = [];
        for (const file of files) {
            const rel = path.relative(root, file).split(path.sep).join('/');
            fs.readFileSync(file, 'utf8')
                .split('\n')
                .forEach((line, index) => {
                    if (!line.includes('workspace.json')) return;
                    const paths = line.matchAll(
                        /(?<![\w./-])([a-z][A-Za-z0-9]+(?:\.[a-zA-Z][A-Za-z0-9]+)+)(?![\w/-])/g,
                    );
                    for (const m of paths) {
                        if (SETTING_FILE_EXTENSIONS.has(m[1].split('.').pop())) continue;
                        found.push({ file: rel, line: index + 1, key: m[1] });
                    }
                });
        }
        return found;
    };

    const settingParityFindings = (root) => {
        const readers = settingReaders(root);
        return [...templateSettings(root), ...textSettings(root)].filter(
            (setting) => !hasSettingReader(setting.key, readers),
        );
    };

    const makeSettingTree = (files) => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-setting-'));
        writeTreeFiles(root, files);
        return root;
    };

    const describeFinding = (f) => `${f.file}:${f.line} → ${f.key}`;

    test('archival opt-out: archival.enabled false keeps a finished phase in tasks/ and says so, while the version bump, the changelog entry and the state update still run', () => {
        const kept = makeArchivalProject({ enabled: false });
        const idle = makeArchivalProject({ enabled: false }, { done: false });
        try {
            const result = runEngine(kept.dir, 'finalize', '--workflow=run', '--workspace=ws');
            const out = result.stdout + result.stderr;
            assert.strictEqual(result.status, 0, out);
            assert.ok(
                fs.existsSync(path.join(kept.ws, 'tasks', 'phase-1.md')),
                'the workbook must stay in tasks/',
            );
            assert.ok(
                !fs.existsSync(path.join(kept.ws, 'archives', 'tasks', 'phase-1.md')),
                'nothing may be archived',
            );
            assert.ok(
                fs
                    .readFileSync(path.join(kept.ws, 'TASKS.md'), 'utf8')
                    .includes('(tasks/phase-1.md)'),
                'the TASKS.md link must stay',
            );
            assert.ok(
                fs
                    .readFileSync(path.join(kept.ws, 'PLAN.md'), 'utf8')
                    .includes('(tasks/phase-1.md)'),
                'the PLAN.md link must stay',
            );
            assert.ok(!out.includes('### Archived phases'), 'there is no archived-phases block');
            assert.strictEqual(
                out.split('\n').filter((l) => l.includes('archival.enabled')).length,
                1,
                'exactly one informational line names the setting',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(kept.dir, '.magicspec', '.version'), 'utf8').trim(),
                '0.1.1',
                'the version bump still runs',
            );
            assert.match(
                fs.readFileSync(path.join(kept.dir, 'CHANGELOG.md'), 'utf8'),
                /\[Unreleased\]/,
                'the changelog entry is still written',
            );
            assert.match(out, /STATE\.md \| updated/, 'the state update still runs');

            // Control: with no finished phase waiting, a skipped step is not announced.
            const quiet = runEngine(idle.dir, 'finalize', '--workflow=run', '--workspace=ws');
            assert.strictEqual(quiet.status, 0, quiet.stdout + quiet.stderr);
            assert.ok(
                !(quiet.stdout + quiet.stderr).includes('archival.enabled'),
                'nothing waiting means nothing to announce',
            );
        } finally {
            cleanup(kept.dir);
            cleanup(idle.dir);
        }
    });

    test('archival opt-out: archival stays on for an absent key, a section without the key, true, the string "false" and null, and the explicit archive-phases command archives with the key off', () => {
        const variants = [undefined, {}, { enabled: true }, { enabled: 'false' }, null];
        for (const archival of variants) {
            const project = makeArchivalProject(archival);
            try {
                const result = runEngine(
                    project.dir,
                    'finalize',
                    '--workflow=run',
                    '--workspace=ws',
                );
                const out = result.stdout + result.stderr;
                const label = JSON.stringify(archival) ?? 'absent';
                assert.strictEqual(result.status, 0, out);
                assert.ok(
                    fs.existsSync(path.join(project.ws, 'archives', 'tasks', 'phase-1.md')),
                    `archival must stay on for ${label}`,
                );
                assert.ok(
                    out.includes('### Archived phases'),
                    `the archived-phases block is printed for ${label}`,
                );
                assert.ok(!out.includes('archival.enabled'), `no opt-out line for ${label}`);
            } finally {
                cleanup(project.dir);
            }
        }

        const off = makeArchivalProject({ enabled: false });
        try {
            const preview = runEngine(off.dir, 'archive-phases', '--dry-run', '--workspace=ws');
            assert.strictEqual(preview.status, 0, preview.stdout + preview.stderr);
            assert.match(preview.stdout, /would archive/, 'the dry run previews as before');
            assert.ok(
                fs.existsSync(path.join(off.ws, 'tasks', 'phase-1.md')),
                'the dry run moves nothing',
            );

            const explicit = runEngine(off.dir, 'archive-phases', '--workspace=ws');
            assert.strictEqual(explicit.status, 0, explicit.stdout + explicit.stderr);
            assert.ok(
                fs.existsSync(path.join(off.ws, 'archives', 'tasks', 'phase-1.md')),
                "the explicit command is the user's own request and archives with the key off",
            );
        } finally {
            cleanup(off.dir);
        }
    });

    test('setting parity: a key read through its section (with or without a defaults table) has a reader; a key named only in a comment, a string or a message does not, nor one read outside skills/magicspec/scripts or one whose section is never read', () => {
        const root = makeSettingTree({
            'skills/magicspec/templates/workspace.json': JSON.stringify(
                {
                    default: 'main',
                    workspaces: { main: { description: 'x' } },
                    alpha: { on: true, level: 1 },
                    beta: { x: 1 },
                    gamma: { g: 1 },
                    epsilon: { enabled: true },
                },
                null,
                2,
            ),
            'skills/magicspec/scripts/reads.js':
                "'use strict';\n" +
                'const data = JSON.parse(text);\n' +
                'const defaults = { level: 1 };\n' +
                'const config = Object.assign({}, defaults, data.alpha || {});\n' +
                'if (data.alpha.on) use(config.level);\n' +
                '// data.beta.x is read somewhere else\n' +
                "const note = 'then read data.beta.x here';\n" +
                "console.log('data.beta.x is not read here');\n" +
                'if (other.enabled) use(1);\n',
            'scripts/elsewhere.js': 'const v = data.gamma.g;\n',
        });
        try {
            assert.deepStrictEqual(
                settingParityFindings(root)
                    .map((f) => f.key)
                    .sort(),
                ['beta.x', 'epsilon.enabled', 'gamma.g'],
                'the commented, quoted, out-of-tree and section-less keys are flagged, and the two read keys are not',
            );

            // A flagged key stops being flagged once a shipped script reads it.
            writeTreeFiles(root, {
                'skills/magicspec/scripts/later.js': 'const v = data.beta.x;\n',
            });
            assert.deepStrictEqual(
                settingParityFindings(root)
                    .map((f) => f.key)
                    .sort(),
                ['epsilon.enabled', 'gamma.g'],
                'a shipped reader clears beta.x',
            );
        } finally {
            cleanup(root);
        }
    });

    test('setting parity: a dotted path that shipped text names with workspace.json needs a reader, reported with its file and line', () => {
        const root = makeSettingTree({
            'skills/magicspec/templates/workspace.json': JSON.stringify(
                { default: 'main', workspaces: { main: {} }, alpha: { on: true } },
                null,
                2,
            ),
            'skills/magicspec/scripts/reads.js': 'if (data.alpha.on) use(1);\n',
            'docs/page.md':
                'Set `alpha.on` to false in `.magicspec/workspace.json`.\n' +
                'Use `alpha.off` in `.magicspec/workspace.json`.\n' +
                'The executor.js script and `workspace.json` are unrelated to keys.\n' +
                'A key `ghost.setting` that no line ties to the file.\n',
            'README.md': 'Edit workspace.json and set `ghost.thing` there.\n',
        });
        try {
            assert.deepStrictEqual(
                settingParityFindings(root).map(describeFinding).sort(),
                ['README.md:1 → ghost.thing', 'docs/page.md:2 → alpha.off'],
                'a path with no reader is reported where it is named; file names and untied keys are not paths',
            );
        } finally {
            cleanup(root);
        }
    });

    test('setting parity: every setting of the shipped workspace.json template and every path the shipped text names with it has a reader (standing check)', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const findings = settingParityFindings(repoRoot);
        assert.deepStrictEqual(
            findings.map((f) => `PHANTOM_SETTING ${describeFinding(f)} has no reader`),
            [],
            'a setting a shipped file defines or names must be given its reader or removed in the change that finds it',
        );
        const known = templateSettings(repoRoot).map((s) => s.key);
        assert.ok(
            known.includes('archival.enabled') && known.includes('finalization.enabled'),
            'the check reads the shipped template (archival.enabled and finalization.enabled are in it)',
        );
    });

    const analyzeWorkflowLines = () =>
        fs
            .readFileSync(
                path.join(
                    path.resolve(TESTS_DIR, '..'),
                    'skills',
                    'magicspec',
                    'workflows',
                    'analyze.md',
                ),
                'utf8',
            )
            .split('\n');

    test('shipped text: ventilation carries the setting-parity check and its checklist entry', () => {
        const lines = analyzeWorkflowLines();

        const step = lines.find((l) => l.includes('**Setting Parity** (`PHANTOM_SETTING`)'));
        assert.ok(step, 'Mode C step 2 must carry the setting-parity check');
        for (const statement of [
            'PHANTOM_SETTING {file}:{line} → {key} has no reader',
            'a key of the `workspace.json` template outside the workspace registry',
            'this skill folder, `docs/`, `README.md`',
            'a script under `scripts/`',
            'only names the key is not a read',
            '(advisory, non-blocking)',
            'Environment variables and executor flags are outside this check',
        ]) {
            assert.ok(step.includes(statement), `the check must state: ${statement}`);
        }

        const checklistAt = lines.findIndex((l) => l.startsWith('Analysis Checklist — Mode C'));
        assert.ok(checklistAt >= 0, 'the Mode C checklist must exist');
        const entry = lines
            .slice(checklistAt)
            .find((l) => l.startsWith('  ☐ Setting Parity: PHANTOM_SETTING'));
        assert.ok(entry, 'the Mode C checklist must carry the setting-parity entry');
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5l. Containment quoting boundary. The ventilation scan for SDD references is
    //     a cognitive grep whose rules are prose, so the prose is the
    //     implementation. A blanket "a quoted occurrence is a mention" ahead of the
    //     match classes hid 92 of 279 matches in measured consumer projects; the
    //     harness pins who the precondition covers and what a consumer's quoted
    //     occurrence becomes. The hook sentence is pinned beside it: the hook
    //     stays behind when the scaffold is deleted, so the text may not say it
    //     goes with it.
    // ───────────────────────────────────────────────────────────────────────────
    test("shipped text: the containment scan keeps the quoting precondition for the engine's own files only, and reports a code-quoted occurrence in a consumer's product markdown", () => {
        const lines = analyzeWorkflowLines();

        const bullet = lines.find((l) => l.includes('**Precondition (SH-1)'));
        assert.ok(bullet, 'step 6 must carry the quoting precondition');
        for (const statement of [
            "the engine's own authored files in this engine's own repository only",
            'In a consumer project the precondition does not apply',
            'an occurrence inside a code span or a fence in a markdown product file is **reported**',
            'in the contextual sub-list when the passage reads as an illustration of a forbidden form rather than a use of it',
            'A passage that stops making sense uses the reference; one that reads the same only shows what a leak looks like',
            'is never silently skipped',
            'When it is unclear which, report it',
        ]) {
            assert.ok(bullet.includes(statement), `the precondition must state: ${statement}`);
        }
        assert.ok(
            !bullet.includes('**Precondition (SH-1)**: in a markdown product file'),
            'the precondition must not be stated for every markdown product file',
        );

        // The bullet sits ahead of the match classes: whatever it says reaches them.
        const bulletAt = lines.indexOf(bullet);
        const classesAt = lines.findIndex((l) => l.includes('Match classes (unconditional)'));
        assert.ok(
            bulletAt >= 0 && classesAt > bulletAt,
            'the precondition precedes the match classes it qualifies',
        );
    });

    test('shipped text: the scaffold-removal exemption says the pre-commit hook disarms itself and never that it is removed with the scaffold, in step 6a and in the rules (both copies)', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const stepLine = analyzeWorkflowLines().find((l) =>
            l.includes('**Exempt**: the git pre-commit hook'),
        );
        assert.ok(stepLine, 'step 6a must exempt the hook');

        const rules = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec', 'references', 'rules', 'containment.md'),
            'utf8',
        );
        const start = rules.indexOf('**Exempt**: the git pre-commit hook');
        assert.ok(start >= 0, 'the rules must exempt the hook');
        const paragraph = rules.slice(start, rules.indexOf('\n\n', start)).replace(/\s+/g, ' ');

        for (const [where, text] of [
            ['step 6a', stepLine],
            ['skills/magicspec/references/rules/containment.md', paragraph],
        ]) {
            assert.doesNotMatch(
                text,
                /removed with|goes away with/,
                `${where}: the hook does not go with the scaffold`,
            );
            assert.match(text, /it disarms itself/, `${where}: the hook disarms itself`);
            assert.match(
                text,
                /with the engine folder absent it says so once and lets the commit through/,
                `${where}: what disarming means`,
            );
            assert.match(
                text,
                /stays behind when the scaffold is deleted/,
                `${where}: why it must`,
            );
        }

        // Generated and ignored by version control: absent on a fresh clone, identical where present.
        const twinPath = path.join(repoRoot, '.agents', 'rules', 'magicspec.md');
        if (fs.existsSync(twinPath)) {
            assert.strictEqual(
                fs.readFileSync(twinPath, 'utf8'),
                fs.readFileSync(
                    path.join(repoRoot, 'skills', 'magicspec', 'CONSTITUTION.md'),
                    'utf8',
                ),
                'the projection under .agents/rules must carry the same text as the rule source',
            );
        }
    });

    test('rule kernel: CONSTITUTION.md stays within its size budget, keeps every section heading, and names each rule module that exists', () => {
        const skill = path.join(path.resolve(TESTS_DIR, '..'), 'skills', 'magicspec');
        const kernel = fs.readFileSync(path.join(skill, 'CONSTITUTION.md'), 'utf8');

        // The kernel is loaded into every turn of every session: its size is the budget.
        assert.ok(
            Buffer.byteLength(kernel) <= 16 * 1024,
            `the always-on rule is ${Buffer.byteLength(kernel)} bytes; move a section that has a trigger into references/rules/`,
        );
        for (let n = 1; n <= 10; n++) {
            assert.match(kernel, new RegExp(`^## ${n}\\. `, 'm'), `section ${n} keeps its heading`);
        }

        const moduleDir = path.join(skill, 'references', 'rules');
        const modules = fs.readdirSync(moduleDir).filter((f) => f.endsWith('.md'));
        assert.ok(modules.length >= 4, 'the sections with a trigger live in rule modules');
        for (const file of modules) {
            assert.ok(
                kernel.includes(`(references/rules/${file})`),
                `the kernel must link references/rules/${file}, or the module is never read`,
            );
        }
    });
};
