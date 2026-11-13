// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TESTS_DIR, devScriptsDir } = require('./lib/base');

module.exports = () => {
    // ───────────────────────────────────────────────────────────────────────────
    // 5e. skills/ — the frontmatter contract on the shipped wrappers.
    //     A host reads `name` and `description` before anything else in a
    //     wrapper, and chooses among every installed skill from the
    //     description alone. Each shipped wrapper must meet the format's
    //     limits and say, in the third person, what it does and when to use
    //     it. The assertions are written out here rather than borrowed from the
    //     generator, so the generator is not graded by its own validator. The
    //     wording of the descriptions is not pinned — only the contract.
    // ───────────────────────────────────────────────────────────────────────────
    test('skill frontmatter: the router of each skill satisfies the contract (name grammar, description limits, Use when sentence, third person)', () => {
        const syncSkills = require(path.join(devScriptsDir, 'skill-frontmatter.js'));
        const repoRoot = path.resolve(TESTS_DIR, '..');
        // Both routers are authored; the contract is the same for the engine skill and the maintenance skill.
        const sourceNames = new Set(['magicspec', 'magicspec-dev']);
        const dirs = ['magicspec', 'magicspec-dev'].map((name) => ({
            name,
            file: path.join(repoRoot, 'skills', name, 'SKILL.md'),
        }));

        for (const dirent of dirs) {
            const text = fs.readFileSync(dirent.file, 'utf8');
            const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            assert.ok(block, `${dirent.name}: SKILL.md must open with a frontmatter block`);

            // A top-level scalar, with any indented continuation lines folded in.
            const field = (key) => {
                const lines = block[1].split(/\r?\n/);
                const at = lines.findIndex((l) => l.startsWith(`${key}:`));
                if (at === -1) return '';
                const parts = [lines[at].slice(key.length + 1).trim()];
                for (let i = at + 1; i < lines.length && /^\s/.test(lines[i]); i++) {
                    parts.push(lines[i].trim());
                }
                return parts.filter(Boolean).join(' ');
            };
            const name = field('name');
            const description = field('description');

            assert.match(
                name,
                /^[a-z0-9-]{1,64}$/,
                `${dirent.name}: name must be 1-64 characters of lowercase letters, digits and hyphens`,
            );
            assert.ok(
                syncSkills.RESERVED_NAME_WORDS.every((word) => !name.includes(word)),
                `${dirent.name}: name must not contain a word the target skill format reserves`,
            );
            assert.ok(
                sourceNames.has(name),
                `${dirent.name}: name "${name}" must be the hyphenated file name of a workflow`,
            );
            assert.strictEqual(name, dirent.name, `${dirent.name}: name must equal its directory`);

            assert.ok(description.length > 0, `${name}: description must not be blank`);
            assert.ok(
                description.length <= 1024,
                `${name}: description is ${description.length} characters, limit 1,024`,
            );
            assert.doesNotMatch(
                description,
                /[<>]/,
                `${name}: description must not contain "<" or ">"`,
            );
            assert.match(
                description,
                /(^|[.!?]\s+)Use when\b/,
                `${name}: description must carry a "Use when" sentence`,
            );
            assert.doesNotMatch(
                description,
                /\b(I|we|my|you|your)\b/i,
                `${name}: description must be third person`,
            );
        }
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5h. skills/magicspec/*.md — body navigation. A wrapper points to a body and a body to
    //     the shared modules it applies, and an agent may preview a file it
    //     reaches through such a chain instead of reading it through. A body over
    //     100 lines therefore opens with a contents list that names every `##`
    //     section, and a pointer to a shared module applies the module as a
    //     whole: a section list silently excludes each section it omits.
    // ───────────────────────────────────────────────────────────────────────────

    /** A body longer than this many lines needs a contents list, within its first CONTENTS_WINDOW lines. */
    const LONG_BODY_LINES = 100;
    const CONTENTS_WINDOW = 40;

    /** Newline-terminated lines, as `wc -l` counts them. */
    const countLines = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

    /** The `##` headings of a body outside fenced code blocks, in file order. */
    const h2Headings = (text) => {
        const found = [];
        let fence = null;
        for (const line of text.split('\n')) {
            const f = line.match(/^\s*(```+|~~~+)/);
            if (f) {
                if (fence === null) fence = f[1][0];
                else if (f[1][0] === fence) fence = null;
                continue;
            }
            if (fence) continue;
            const m = line.match(/^## (.+?)\s*$/);
            if (m) found.push(m[1]);
        }
        return found;
    };

    /** The list items within the first 40 lines, with the bullet stripped. */
    const contentsItems = (text) =>
        text
            .split('\n')
            .slice(0, CONTENTS_WINDOW)
            .filter((line) => /^\s*[-*]\s+/.test(line))
            .map((line) => line.replace(/^\s*[-*]\s+/, '').trim());

    /**
     * A body of at most 100 lines needs nothing; a longer one needs the text of
     * every `##` heading as a list item within its first 40 lines, in file order.
     * An entry may carry a trailing note after an em dash.
     */
    const contentsProblems = (text) => {
        if (countLines(text) <= LONG_BODY_LINES) return [];
        const items = contentsItems(text);
        const problems = [];
        let from = 0;
        for (const heading of h2Headings(text)) {
            const at = items.findIndex(
                (item, i) => i >= from && (item === heading || item.startsWith(`${heading} —`)),
            );
            if (at === -1) {
                problems.push(`no contents entry, in file order, for "${heading}"`);
                continue;
            }
            from = at + 1;
        }
        return problems;
    };

    /**
     * Sections the shared module itself marks as one workflow's alone — a
     * contents entry that ends with an em dash, a backticked name and "only".
     */
    const narrowerSections = (moduleText) =>
        new Set(
            h2Headings(moduleText).filter((heading) =>
                contentsItems(moduleText).some(
                    (item) => item.startsWith(`${heading} —`) && /— `[^`]+` only$/.test(item),
                ),
            ),
        );

    /**
     * Every link to the shared module in a body: with no section list after it
     * the pointer applies the module as a whole; with one, the list must carry
     * the heading text of every section the module does not mark as narrower.
     */
    const pointerProblems = (bodyText, moduleText) => {
        const problems = [];
        const required = h2Headings(moduleText).filter((h) => !narrowerSections(moduleText).has(h));
        for (const line of bodyText.split('\n')) {
            const link = line.match(
                /\]\((?:[./]*(?:skills\/magicspec\/)?(?:references\/)?)context\.md\)/,
            );
            if (!link) continue;
            const listed = line.slice(link.index + link[0].length).match(/^\s*\(([^)]*)\)/);
            if (!listed) continue;
            const items = listed[1].split(',').map((s) => s.trim());
            for (const heading of required) {
                if (!items.some((item) => item === heading)) {
                    problems.push(
                        `pointer lists sections but omits "${heading}": ${line.trim().slice(0, 90)}`,
                    );
                }
            }
        }
        return problems;
    };

    // The engine bodies and shared modules of the skill folder, as repository-relative paths.
    const engineBodyPaths = (repoRoot) =>
        ['workflows', 'references'].flatMap((dir) =>
            fs
                .readdirSync(path.join(repoRoot, 'skills', 'magicspec', dir))
                .filter((f) => f.endsWith('.md'))
                .map((f) => path.join('skills', 'magicspec', dir, f)),
        );

    test('body navigation: every shipped body over 100 lines carries a contents list of its ## headings', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const bodies = engineBodyPaths(repoRoot);
        assert.ok(bodies.length >= 9, 'the engine bodies and shared modules must be found');

        let checked = 0;
        for (const rel of bodies) {
            const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
            if (countLines(text) > LONG_BODY_LINES) checked++;
            assert.deepStrictEqual(contentsProblems(text), [], rel);
        }
        assert.ok(
            checked >= 6,
            'at least the six long bodies must be subject to the contents-list rule',
        );
    });

    test('body navigation: the scans flag a body without a contents list, a list that omits a heading, a list out of order or past line 40, and a pointer that omits a section', () => {
        // A throwaway body of well over 100 lines with three sections, one of them
        // marked as another workflow's alone, and a fenced block holding a `##` line
        // that is not a section.
        const make = (contents, before = 0) => {
            const lines = ['# Title', '', 'Intro.', ''];
            for (let i = 0; i < before; i++) lines.push(`filler ${i}`);
            lines.push(...contents, '');
            for (const name of ['Alpha', 'Beta', 'Gamma']) {
                lines.push(`## ${name}`, '');
                for (let i = 0; i < 30; i++) lines.push(`${name} line ${i}`);
                if (name === 'Beta') lines.push('```', '## Not a section', '```');
            }
            return lines.join('\n') + '\n';
        };
        const full = ['**Contents:**', '', '- Alpha', '- Beta — `magic.spec` only', '- Gamma'];

        assert.ok(countLines(make(full)) > 100, 'the fixture must be over 100 lines');
        assert.deepStrictEqual(
            contentsProblems(make(full)),
            [],
            'a complete list passes, and a fenced `##` line is not a section',
        );
        assert.strictEqual(
            contentsProblems(make([])).length,
            3,
            'a body with no contents list is flagged for every heading',
        );
        assert.strictEqual(
            contentsProblems(make(['- Alpha', '- Gamma'])).length,
            1,
            'a list that omits one heading is flagged for exactly that heading',
        );
        assert.ok(
            contentsProblems(make(['- Beta', '- Alpha', '- Gamma'])).length >= 1,
            'a list out of file order is flagged',
        );
        assert.strictEqual(
            contentsProblems(make(full, 45)).length,
            3,
            'a list that starts past line 40 is not a contents list',
        );
        assert.deepStrictEqual(
            contentsProblems('# Short\n\n## One\n\nText.\n'),
            [],
            'a body of at most 100 lines needs no list',
        );

        // Pointers to the module that body describes.
        const moduleText = make(full);
        assert.deepStrictEqual(
            pointerProblems('1. Apply [context.md](context.md) as a whole.', moduleText),
            [],
        );
        assert.deepStrictEqual(
            pointerProblems('1. Apply [context.md](context.md) (Alpha, Gamma).', moduleText),
            [],
            'a list that carries every section not marked narrower passes',
        );
        assert.strictEqual(
            pointerProblems('1. Apply [context.md](context.md) (Alpha).', moduleText).length,
            1,
            'a list that omits one section is flagged for exactly that section',
        );
        assert.strictEqual(
            pointerProblems(
                '1. Apply [context.md](../../skills/magicspec/references/context.md) (Priority 1-4, Disambiguation).',
                moduleText,
            ).length,
            2,
            'a list of other names carries none of the sections',
        );
    });

    test('body navigation: every pointer to context.md applies the module as a whole', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const moduleText = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec', 'references', 'context.md'),
            'utf8',
        );
        const sites = engineBodyPaths(repoRoot).filter((rel) => !rel.endsWith('context.md'));
        sites.push(path.join('skills', 'magicspec-dev', 'workflows', 'test.md'));

        let pointers = 0;
        for (const rel of sites) {
            const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
            pointers += text
                .split('\n')
                .filter((l) =>
                    /\]\((?:[./]*(?:skills\/)?(?:magicspec\/)?(?:references\/)?)context\.md\)/.test(
                        l,
                    ),
                ).length;
            assert.deepStrictEqual(pointerProblems(text, moduleText), [], rel);
        }
        assert.ok(
            pointers >= 10,
            `the shipped text points to context.md in at least ten places (found ${pointers})`,
        );
    });

    // ───────────────────────────────────────────────────────────────────────────
    // 5i. magicspec-dev:test — the reader tier of the fresh literal reader.
    //     The reading test is only as strong as its reader: independence of
    //     context was already stated, capability was not. The workflow is
    //     instruction text with no script behind it, so the harness pins its
    //     shipped wording — in the workflow and in the skill generated from it.
    // ───────────────────────────────────────────────────────────────────────────
    test('simulation workflow: the fresh literal reader takes the lowest tier the host offers, reports the files it opened, and a lowest-tier-only divergence needs a second reader (reader tier)', () => {
        const repoRoot = path.resolve(TESTS_DIR, '..');
        const workflow = fs.readFileSync(
            path.join(repoRoot, 'skills', 'magicspec-dev', 'workflows', 'test.md'),
            'utf8',
        );
        // The workflow is the one text now; the wrapper generated from it is gone.
        const skill = workflow;
        const rung = workflow.split('\n').find((line) => line.includes('*Reading test*'));
        assert.ok(rung, 'the adjudication ladder must carry the reading test');

        const statements = [
            'takes the lowest-capability tier it offers',
            'where the host exposes none, nothing more is required',
            'returns its predicted action with the engine files it opened and the line range it read of each',
            'is a **structure** finding',
            'a second fresh agent of the same tier reproduces it',
        ];
        for (const statement of statements) {
            assert.ok(rung.includes(statement), `the reading test must state: ${statement}`);
        }
        assert.ok(
            skill.includes('takes the lowest-capability tier it offers'),
            'the generated skill must carry the reader tier too',
        );
    });
};
