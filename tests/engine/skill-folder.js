'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { scriptsDir, devScriptsDir, cleanup } = require('./lib/base');
const {
    skillSrc,
    makeConsumer,
    installSkill,
    skillExec,
    initAllHosts,
    assertRuleCopies,
    walkFiles,
    tableRowsOf,
    routerRows,
} = require('./lib/sim');

module.exports = () => {
    test('the router names the skill, fits the host limits and lists exactly the workflows of the folder (skill folder)', () => {
        const syncSkills = require(path.join(devScriptsDir, 'skill-frontmatter.js'));
        const text = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
        const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        assert.ok(block, 'the router opens with a frontmatter block');

        const problems = syncSkills.checkProjection({
            name: 'magicspec',
            frontmatter: block[1],
            synthesized: false,
        });
        assert.deepStrictEqual(
            problems,
            [],
            'the router meets the validity limits and the selection-signal rules',
        );

        const description = syncSkills.readScalar(block[1], 'description').value;
        assert.ok(
            description.length <= 1024,
            `the description is ${description.length} characters, limit 1,024`,
        );

        const rows = routerRows();
        const files = fs
            .readdirSync(path.join(skillSrc, 'workflows'))
            .filter((f) => f.endsWith('.md'))
            .map((f) => path.basename(f, '.md'))
            .sort();
        assert.deepStrictEqual(
            rows.map((r) => r.name).sort(),
            files,
            'the table and the folder name the same commands',
        );
        for (const row of rows) {
            assert.strictEqual(
                row.file,
                row.name,
                `${row.name}: the row points at workflows/${row.name}.md`,
            );
            assert.ok(
                new RegExp(`\`${row.name}\``).test(description),
                `${row.name}: the description names the command`,
            );
        }
        assert.strictEqual(rows.length, 14);
        assert.ok(
            !fs.existsSync(path.join(skillSrc, 'workflows', 'context.md')),
            'a shared module is not a command',
        );
    });

    test('the router table has a demand for every command, an alias that is never a command, and one parser that reads it the way the harness does (skill folder)', () => {
        const hosts = require(path.join(scriptsDir, 'lib', 'hosts.js'));
        const text = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
        const rows = routerRows();
        const parsed = hosts.readCommands();

        // The demands of the specification's table (l1-pipeline-stages.md §5.2), one per command.
        const demands = {
            spec: 'deep',
            plan: 'deep',
            task: 'standard',
            run: 'standard',
            fix: 'deep',
            simulate: 'standard',
            goal: 'per step',
            analyze: 'deep',
            rule: 'standard',
            status: 'light',
            graph: 'light',
            migrate: 'light',
            sync: 'light',
            help: 'light',
        };
        assert.deepStrictEqual(
            Object.fromEntries(rows.map((r) => [r.name, r.demand])),
            demands,
            'every command declares the demand of the specification',
        );
        for (const row of rows) {
            assert.ok(
                fs.existsSync(path.join(skillSrc, 'workflows', `${row.file}.md`)),
                `${row.name}: the body exists`,
            );
        }

        // An alias is read as its command and is never the name of another one.
        const names = new Set(rows.map((r) => r.name));
        const aliases = rows.filter((r) => r.alias).map((r) => [r.alias, r.name]);
        assert.deepStrictEqual(aliases, [['audit', 'analyze']]);
        for (const [alias] of aliases) assert.ok(!names.has(alias), `${alias} is not a command`);

        // The engine's parser and the harness's own pattern read the same table.
        assert.deepStrictEqual(
            parsed.map((r) => [r.name, r.demand, r.aliases, r.body]),
            rows.map((r) => [r.name, r.demand, r.alias ? [r.alias] : [], `${r.file}.md`]),
            'the one parser and the harness agree on every row',
        );
        assert.deepStrictEqual(
            parsed.map((r) => r.summary),
            rows.map((r) => r.summary),
        );
        // A row that is not seven columns, has no known demand or an alias that is not backticked is not a row.
        assert.strictEqual(
            hosts.parseCommandRow('| `x` | pipeline | s | a | m | `workflows/x.md` |'),
            null,
            'six columns',
        );
        assert.strictEqual(
            hosts.parseCommandRow('| `x` | pipeline | s | a | m | fast | `workflows/x.md` |'),
            null,
            'an unknown demand',
        );
        assert.strictEqual(
            hosts.parseCommandRow('| `x` | pipeline | s | a | m | per step | `workflows/x.md` |')
                .demand,
            'per step',
            'the demand of a command that runs other commands',
        );
        assert.strictEqual(
            hosts.parseCommandRow(
                '| `x` (alias y) | pipeline | s | a | m | light | `workflows/x.md` |',
            ),
            null,
            'an alias with no backticks',
        );
        assert.deepStrictEqual(
            hosts.parseCommandRow(
                '| `x` (aliases `y`, `z`) | pipeline | s | a | m | light | `workflows/x.md` |',
            ).aliases,
            ['y', 'z'],
        );

        // The dispatch reads an alias as its command, with no narration, and the pipeline reads plan between spec and task.
        assert.match(text, /or an alias in its row \(`audit` is `analyze`\) → that command/);
        assert.match(text, /An alias runs the command with no narration/);
        assert.match(text, /Pipeline: `spec` → `plan` → `task` → `run`/);
    });

    test('the router has the goal row with the demand per step in its group, lets a bare goal reach its body, names the command in its description, and the handoff line prints the demand as the table has it (CS-1, GM-3, GM-9)', () => {
        const hosts = require(path.join(scriptsDir, 'lib', 'hosts.js'));
        const text = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
        const help = fs.readFileSync(path.join(skillSrc, 'workflows', 'help.md'), 'utf8');
        const rows = routerRows();
        const row = rows.find((r) => r.name === 'goal');
        assert.ok(row, 'the router lists goal');
        assert.deepStrictEqual(
            { group: row.group, demand: row.demand, file: row.file },
            { group: 'quality & automation', demand: 'per step', file: 'goal' },
        );
        for (const form of ['a goal statement', '`phase-3`', '`5 tasks`']) {
            assert.ok(row.argument.includes(form), `the argument cell names the form ${form}`);
        }
        assert.ok(
            row.missing.startsWith(
                '**required** unless a goal is recorded — a recorded goal continues',
            ),
            'the missing cell: required unless a goal is recorded',
        );
        const order = rows.map((r) => r.name);
        assert.ok(
            order.indexOf('simulate') < order.indexOf('goal') &&
                order.indexOf('goal') < order.indexOf('analyze'),
            'the goal row follows simulate, in its group, in the order of the specification',
        );
        assert.ok(
            hosts.readCommands().some((c) => c.name === 'goal' && c.demand === 'per step'),
            'the one parser reads the row',
        );

        // A bare goal is not asked for: the body continues a recorded goal and asks only when none is recorded.
        assert.ok(
            text.includes('**Exception — `goal`**'),
            'the argument contract has the goal exception',
        );
        assert.match(
            text,
            /With no argument the body looks for the recorded goal first and continues it/,
        );
        assert.match(text, /only when none is recorded does the argument form ask/);
        assert.match(
            text,
            /`goal` has no demand of its own: each of its steps carries the demand of the command it runs/,
        );
        assert.ok(
            help.includes('`goal`: its *Entry*'),
            'help names where the goal argument comes from',
        );

        // The description names the command, and the handoff line prints the demand the table gives.
        const description = /^description: (.*)$/m.exec(text)[1];
        assert.ok(description.includes('`goal`') && description.length <= 1024);
        const finalize = require(path.join(scriptsDir, 'finalize.js'));
        assert.strictEqual(
            finalize.handoffLine('Run /magicspec goal to continue the recorded goal', 'engine'),
            'Next: /magicspec goal — per step reasoning',
        );
    });

    test('the help body is rendered from the router table: no second list, the picker by host capability, a bounded ask and verbatim names (skill folder)', () => {
        const help = fs.readFileSync(path.join(skillSrc, 'workflows', 'help.md'), 'utf8');
        assert.deepStrictEqual(
            tableRowsOf(help),
            [],
            'the help body holds no copy of the command table',
        );
        assert.ok(
            help.includes('Usage: /magicspec <command> [argument]'),
            'it renders the usage line of the layout',
        );
        assert.ok(!/\/magicspec:[a-z]/.test(help), 'it prints no colon form');
        for (const [needle, what] of [
            [/\*\*Read-Only\*\*/, 'read-only'],
            [
                /ignoring letter case, is the command — only the first such token[\s\S]*[Aa]ny other token is read as a language/,
                'command versus language',
            ],
            [
                /in `<…>` when the \*When it is missing\* cell says \*\*required\*\*/,
                'argument brackets',
            ],
            [/two steps: the group, then the command/, 'the two-step picker'],
            [/a group with one command skips its second step/, 'a one-command group skips a step'],
            [/numbered list in the chat/, 'the chat fallback'],
            [/free-text choice/, 'free text is always accepted'],
            [/Nothing runs before the user has chosen/, 'nothing runs unasked'],
            [/runs nothing; say so in one line/, 'cancel'],
            [/Asking is bounded \(E7\)/, 'E7'],
            [/never translated, in any language/, 'verbatim names'],
            [/one line saying which value was not recognized/, 'an unrecognized language'],
        ]) {
            assert.match(help, needle, `help.md: ${what}`);
        }
        // Both forms — the picker and the argument form — say that a dismissed form runs nothing.
        assert.strictEqual(
            (help.match(/runs nothing; say so in one line/g) || []).length,
            2,
            'a cancelled picker and a cancelled argument form each run nothing',
        );
    });

    test('the migrate body runs the dry run, asks one consent question only for a plan that removes or renames, and applies only on a yes (skill folder)', () => {
        const body = fs.readFileSync(path.join(skillSrc, 'workflows', 'migrate.md'), 'utf8');
        assert.match(body, /node scripts\/executor\.js migrate`/, 'the dry run is the first step');
        assert.match(body, /node scripts\/executor\.js migrate --apply`/, 'the apply step');
        assert.match(body, /One consent question \(E1\)/, 'one E1 question');
        assert.match(
            body,
            /asked only when the plan removes or renames something/,
            'only for a plan',
        );
        assert.match(body, /On a yes, run/, 'apply only on a yes');
        assert.match(body, /`Nothing to migrate`/, 'the finished message');
        assert.match(body, /The sweep edits only SDD artifacts/, 'the vocabulary sweep');
        assert.match(
            body,
            /a product file that still uses the earlier names is reported, never edited/,
        );
        assert.match(body, /Never finalizes/, 'no finalize');
        assert.match(
            body,
            /does not initialize the project/,
            'no Auto-Init beside the old state folder',
        );
        assert.ok(!/\/magicspec:[a-z]/.test(body), 'it prints no colon form');
    });

    test('a bare spec and a bare rule ask for their required argument once, through the argument form; nothing else in the bodies asks for an optional one (skill folder)', () => {
        const spec = fs.readFileSync(path.join(skillSrc, 'workflows', 'spec.md'), 'utf8');
        const blank = spec.slice(
            spec.indexOf('**Blank Trigger (Argument Form)**'),
            spec.indexOf('### Mode Transition'),
        );
        assert.ok(blank.length > 200, 'the Blank Trigger is the argument form');
        assert.match(blank, /E7, \[help\.md\]\(help\.md\) Step 4/, 'it names E7 and the form');
        assert.match(
            blank,
            /Rank up to 3 candidate topics\*\* \(new specs or refinements\) \*\*by DA-3/,
        );
        assert.match(
            blank,
            /highest-coverage gap first, marked recommended/,
            'winner first and marked',
        );
        assert.match(blank, /free text always accepted/, 'free text is accepted');
        assert.match(
            blank,
            /passes Step 0\.5 and then Dispatch/,
            'the idea passes the intake gate',
        );
        assert.match(blank, /A dismissed form writes nothing/, 'a cancelled form writes nothing');
        assert.ok(
            !/never\*\* by a question or option menu/.test(spec),
            'the earlier "never a question" wording is gone',
        );
        assert.match(spec, /☐ Command Intake \(E7\)/, 'the spec checklist names E7');

        const rule = fs.readFileSync(path.join(skillSrc, 'workflows', 'rule.md'), 'utf8');
        assert.match(rule, /## Missing Rule Text/, 'rule has the same form');
        assert.match(rule, /\(E7, \[help\.md\]\(help\.md\) Step 4\)/);
        assert.match(rule, /☐ Command Intake \(E7\)/, 'the rule checklist names E7');

        // The commands whose argument is optional never ask for it.
        for (const row of routerRows().filter((r) => r.missing.startsWith('optional'))) {
            // The help picker is the one place an optional argument is offered.
            if (row.name === 'help') continue;
            const body = fs.readFileSync(
                path.join(skillSrc, 'workflows', `${row.file}.md`),
                'utf8',
            );
            assert.ok(
                !/Command Intake \(E7\)/.test(body),
                `${row.name}: an optional argument is never asked for`,
            );
        }
    });

    test('help explains one command with its demand, reads an alias as its command, explains itself once with no picker, stops its recursion at one level and answers an unknown token (skill folder)', () => {
        const help = fs.readFileSync(path.join(skillSrc, 'workflows', 'help.md'), 'utf8');
        for (const [needle, what] of [
            [
                "- `{command}` — that command's argument, its forms, its reasoning demand and one example each",
                'the Entry names the demand in the detail view',
            ],
            [
                'an alias names its command, `help help` explains this command like any other and offers no picker',
                'help help and the alias are explained',
            ],
            ['`/magicspec help help`, `/magicspec help audit`', 'the examples carry both'],
            [
                'only the first such token: a further one is ignored with one line saying so',
                'the recursion is bounded',
            ],
            ['so `help help help` renders what `help help` renders', 'at one level'],
            [
                'a token that is neither a command, an alias nor a recognized language is answered with one line naming it, the command one edit away when there is one, and then the whole list',
                'an unknown token is answered',
            ],
            [
                "An alias follows its command's name in parentheses (`analyze (audit)`)",
                'the list shows the alias',
            ],
            ['(`audit is analyze`)', 'the detail view says an alias is its command'],
            ['the offer is dropped: the list is one `help` away', 'help help offers no picker'],
            [
                '/magicspec {command} {argument}      ({demand} reasoning)',
                'the detail layout carries the demand',
            ],
            [
                'one edit away from a command name or an alias',
                'an alias counts for the near-miss suggestion',
            ],
            [
                'through the one parser of the engine (`lib/hosts.js`)',
                "the help reads the table through the engine's parser",
            ],
        ]) {
            assert.ok(help.includes(needle), what);
        }
        // The demand is advice: help never prints it as a warning and no list row carries it.
        assert.ok(help.includes('it is never printed as a warning and never changes what runs'));
        const list = help.slice(
            help.indexOf('Magic Spec {version}'),
            help.indexOf('Next:  /magicspec'),
        );
        assert.ok(!/reasoning/.test(list), 'the list layout carries no demand');
    });

    test('the router states one grammar, carries the argument contract of every command and routes the bare, unknown and missing-argument forms (skill folder)', () => {
        const text = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
        const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        assert.match(
            block[1],
            /^argument-hint: "<command> \[argument\]"$/m,
            'the frontmatter declares the argument hint',
        );

        // The table: every row carries a group, an argument and a when-missing value.
        const groups = new Set(['pipeline', 'quality & automation', 'health', 'maintenance', '—']);
        const rows = routerRows();
        assert.ok(rows.length > 0, 'the table has rows');
        for (const row of rows) {
            assert.ok(groups.has(row.group), `${row.name}: group "${row.group}" is a known group`);
            assert.ok(row.argument.length > 0, `${row.name}: the argument column is filled`);
            assert.match(
                row.missing,
                /^(\*\*required\*\*|optional|—)/,
                `${row.name}: the when-missing column states required, optional or none`,
            );
            assert.ok(row.summary.length > 0, `${row.name}: the summary column is filled`);
        }
        const required = rows
            .filter((r) => r.missing.startsWith('**required**'))
            .map((r) => r.name);
        assert.deepStrictEqual(
            required.sort(),
            ['fix', 'goal', 'rule', 'spec'],
            'the commands that cannot act without input are the ones that ask for it (goal asks only when no goal is recorded)',
        );

        const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
        assert.strictEqual(byName.help.group, '—', 'help belongs to no group');
        assert.strictEqual(byName.migrate.group, 'maintenance', 'migrate is maintenance');
        assert.match(byName.spec.missing, /^\*\*required\*\* — up to three suggested topics/);

        // The grammar and the dispatch branches.
        const body = text.slice(text.indexOf('\n# Magic Spec'));
        assert.ok(
            body.includes('`/magicspec <command> [argument]`'),
            'the one printed form is stated',
        );
        assert.ok(
            !/\/magicspec:[a-z]/.test(body),
            'the router prints no colon form (it only reads one)',
        );
        assert.match(
            body,
            /colon spelling `magicspec:<command>` and the dot spelling `magicspec\.<command>`[^.]*are read as that command too/,
            'a slip in the form is read as the command',
        );
        assert.match(body, /Nothing follows `magicspec`, or the word is `help`/, 'bare and help');
        assert.ok(body.includes('`workflows/help.md`'), 'the help body is named');
        assert.match(
            body,
            /any other word → the same help with the typed text kept/,
            'unknown word',
        );
        assert.match(body, /one edit away from a command name/, 'a typo offers the command first');
        assert.match(body, /Input in quotation marks is an idea for `spec`/, 'quotes force spec');
        assert.match(body, /\*\*Required\*\* and absent → ask for it once/, 'required, absent');
        assert.match(body, /\*\*Optional\*\* and absent → run the default/, 'optional, absent');
        assert.match(body, /route it to `spec` instead and narrate one `\[DR\]` line/, 'misfit');
    });

    test('the text of the skill folder names no earlier place, resolves every link and lists every section in its contents (skill folder)', () => {
        const stripFences = (t) => t.replace(/```[\s\S]*?```/g, '');
        const problems = [];
        for (const file of walkFiles(skillSrc).filter((f) => f.endsWith('.md'))) {
            const rel = path.relative(skillSrc, file).split(path.sep).join('/');
            const text = fs.readFileSync(file, 'utf8');

            text.split('\n').forEach((line, i) => {
                if (
                    /\.magic\/|rules\/magic\.md|workflows\/magic\.|skills\/magic-|\/magic\.(spec|task|run|rule|analyze|status|graph)\b/.test(
                        line,
                    )
                ) {
                    problems.push(`${rel}:${i + 1} names an earlier place`);
                }
            });

            if (!rel.startsWith('templates/')) {
                for (const m of stripFences(text).matchAll(/\]\(([^)\s]+)\)/g)) {
                    const target = m[1].split('#')[0];
                    if (!target || /^(https?:|mailto:)/.test(target)) continue;
                    if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
                        problems.push(`${rel}: link ${m[1]} does not resolve inside the folder`);
                    }
                }
            }

            const lines = text.split('\n');
            if (
                (rel.startsWith('workflows/') || rel.startsWith('references/')) &&
                lines.length > 100
            ) {
                const at = lines.findIndex((l) => l.startsWith('**Contents:**'));
                if (at < 0) {
                    problems.push(`${rel}: over 100 lines and no contents list`);
                    continue;
                }
                const items = [];
                for (let i = at + 1; i < lines.length; i++) {
                    if (lines[i].startsWith('- ')) items.push(lines[i].slice(2).trim());
                    else if (lines[i].trim() === '' && items.length === 0) continue;
                    else break;
                }
                const flat = (t) => t.replace(/[`*]/g, '');
                for (const heading of stripFences(text)
                    .split('\n')
                    .filter((l) => l.startsWith('## '))) {
                    const h = flat(heading.slice(3).trim());
                    if (!items.some((it) => h.includes(flat(it)) || flat(it).includes(h))) {
                        problems.push(`${rel}: section "${h}" is not in the contents list`);
                    }
                }
            }
        }
        assert.deepStrictEqual(problems, []);
    });

    test('the folder runs wherever a host installs it: from a nested directory, and through a link that keeps its own name (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const real = installSkill(dir);
            const link = path.join(dir, '.claude', 'skills', 'magicspec');
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.symlinkSync(real, link, 'junction');
            const nested = path.join(dir, 'src', 'deep');
            fs.mkdirSync(nested, { recursive: true });

            // init through the link, from a nested directory: the state goes to the repository root
            // and the hook names the link, which is the path this project can run.
            const init = skillExec(link, nested, 'init');
            assert.strictEqual(init.status, 0, init.stdout + init.stderr);
            assert.ok(
                fs.existsSync(path.join(dir, '.magicspec', 'main', 'specifications')),
                'state at the root',
            );
            assert.ok(!fs.existsSync(path.join(nested, '.magicspec')), 'nothing beside the caller');
            const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'utf8');
            assert.match(
                hook,
                /node \.claude\/skills\/magicspec\/scripts\/executor\.js update-engine-meta --check/,
            );

            // a hint printed through the real path names the real path
            const viaReal = skillExec(real, nested, 'check-prerequisites', ['--json']);
            const report = JSON.parse(viaReal.stdout);
            const fix = JSON.stringify(report.warnings);
            assert.ok(!fix.includes('.magic/'), 'no hint names the earlier folder');
            assert.strictEqual(report.design_dir, '.magicspec/main');

            // an engine folder shared from outside the project is named by its absolute path
            const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'magic-shared-'));
            const other = makeConsumer();
            try {
                fs.cpSync(skillSrc, path.join(shared, 'magicspec'), { recursive: true });
                const run = skillExec(path.join(shared, 'magicspec'), other, 'init');
                assert.strictEqual(run.status, 0, run.stdout + run.stderr);
                const outside = fs.readFileSync(
                    path.join(other, '.git', 'hooks', 'pre-commit'),
                    'utf8',
                );
                const executor = path
                    .join(shared, 'magicspec', 'scripts', 'executor.js')
                    .split(path.sep)
                    .join('/');
                assert.ok(
                    outside.includes(`node ${executor} update-engine-meta --check`),
                    'the hook names the shared folder by its absolute path',
                );
            } finally {
                cleanup(shared);
                cleanup(other);
            }
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test('init --host writes the rule and the skill link for each host, marks them, writes no command entry anywhere, and writes nothing for an unknown host (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Mine\n\nKeep this.\n');

            const bad = skillExec(skill, dir, 'init', ['--host=claude,zed']);
            assert.strictEqual(bad.status, 1);
            assert.match(bad.stderr, /Unknown host 'zed'\. Known hosts: claude, codex, qwen\./);
            assert.ok(
                !fs.existsSync(path.join(dir, '.magicspec')) &&
                    !fs.existsSync(path.join(dir, '.claude')),
                'nothing written',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'),
                '# Mine\n\nKeep this.\n',
            );

            const run = initAllHosts(skill, dir);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);

            const source = assertRuleCopies(skill, dir);
            assert.ok(source.includes('<!-- magicspec-rule -->'), 'the source carries the marker');

            // The router is the only command surface: no host receives an entry, and the printed
            // ignore lines name no command folder.
            for (const host of ['.claude', '.qwen', '.codex']) {
                assert.ok(
                    !fs.existsSync(path.join(dir, host, 'commands')),
                    `${host}: no command folder is created`,
                );
            }
            assert.ok(
                !walkFiles(dir).some((f) => f.split(path.sep).includes('commands')),
                'no file lies under any commands/ folder',
            );
            assert.ok(!/commands/.test(run.stdout), 'the printed lines name no command folder');

            const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
            assert.ok(agents.startsWith('# Mine\n\nKeep this.\n'), 'the project text is kept');
            assert.match(
                agents,
                /<!-- magicspec:begin -->\nBefore any work in this project, read `\.agents\/skills\/magicspec\/CONSTITUTION\.md`/,
            );

            // idempotent
            const before = walkFiles(dir)
                .filter((f) => !f.includes(`${path.sep}.git${path.sep}`))
                .map((f) => [f, fs.readFileSync(f, 'utf8')]);
            const again = skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            assert.strictEqual(again.status, 0);
            for (const [f, content] of before)
                assert.strictEqual(
                    fs.readFileSync(f, 'utf8'),
                    content,
                    `${path.relative(dir, f)} unchanged by a second run`,
                );
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test('a file at a projection path that carries no marker is left alone, a copy that differs from its source is reported stale, and a command entry of an earlier installation is reported retired and removed (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.mkdirSync(path.join(dir, '.claude', 'rules'), { recursive: true });
            fs.mkdirSync(path.join(dir, '.claude', 'commands', 'magicspec'), { recursive: true });
            fs.writeFileSync(
                path.join(dir, '.claude', 'rules', 'magicspec.md'),
                "the project's own rule\n",
            );
            fs.writeFileSync(
                path.join(dir, '.claude', 'commands', 'magicspec', 'run.md'),
                "the project's own command\n",
            );
            // An entry as a 3.0.x installation wrote it.
            const leftover = path.join(dir, '.claude', 'commands', 'magicspec', 'task.md');
            fs.writeFileSync(
                leftover,
                '---\ndescription: x\n---\n<!-- magicspec-command task -->\nRun the command.\n',
            );
            const retiredOf = () =>
                JSON.parse(
                    skillExec(skill, dir, 'check-prerequisites', ['--json']).stdout,
                ).warnings.filter((w) => w.type === 'PROJECTION_RETIRED');
            const retired = retiredOf();
            assert.strictEqual(retired.length, 1, 'the leftover entry is reported');
            assert.match(retired[0].message, /'\.claude\/commands\/magicspec\/task\.md'/);
            assert.match(retired[0].fix, /init --host=claude/);

            const run = skillExec(skill, dir, 'init', ['--host=claude']);
            assert.strictEqual(run.status, 0, run.stdout + run.stderr);
            assert.match(
                run.stdout,
                /Left alone \(not written by this engine\): \.claude\/rules\/magicspec\.md/,
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'utf8'),
                "the project's own rule\n",
            );
            assert.strictEqual(
                fs.readFileSync(
                    path.join(dir, '.claude', 'commands', 'magicspec', 'run.md'),
                    'utf8',
                ),
                "the project's own command\n",
            );
            assert.ok(
                !fs.existsSync(leftover),
                'the marked entry of an earlier install is removed',
            );
            assert.match(run.stdout, /Removed \(command entry of an earlier installation\)/);
            assert.deepStrictEqual(retiredOf(), [], 'nothing is reported retired afterwards');
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude', 'commands', 'magicspec', 'extra.md')),
                'and no entry is written in its place',
            );

            // stale: a marked copy edited, and a marked copy whose source changed
            fs.rmSync(path.join(dir, '.claude', 'rules', 'magicspec.md'));
            skillExec(skill, dir, 'init', ['--host=claude']);
            const staleOf = () =>
                JSON.parse(
                    skillExec(skill, dir, 'check-prerequisites', ['--json']).stdout,
                ).warnings.filter((w) => w.type === 'PROJECTION_STALE');
            assert.deepStrictEqual(staleOf(), [], 'a fresh projection is not stale');

            fs.appendFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'edited\n');
            let stale = staleOf();
            assert.strictEqual(stale.length, 1);
            assert.match(
                stale[0].message,
                /'\.claude\/rules\/magicspec\.md' differs from its source/,
            );
            assert.match(stale[0].fix, /init --host=claude/);

            skillExec(skill, dir, 'init', ['--host=claude']);
            assert.deepStrictEqual(staleOf(), [], 'init writes the copy again');

            fs.appendFileSync(path.join(skill, 'CONSTITUTION.md'), '\nA new sentence.\n');
            stale = staleOf();
            assert.ok(
                stale.some((w) => /magicspec\.md/.test(w.message)),
                'a changed source makes the copy stale',
            );
        } finally {
            cleanup(dir);
        }
    });

    test('refreshProjections rewrites only the projections that fell behind their source, removes every command entry, creates none, and leaves an unmarked file alone (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            // The engine names its own folder relative to the project root, which is read from the
            // environment of the call: refresh as the executor would run it, with the root set.
            const hosts = require(path.join(skill, 'scripts', 'lib', 'hosts.js'));
            const refresh = () => {
                const previous = process.env.MAGIC_ROOT;
                process.env.MAGIC_ROOT = dir;
                try {
                    return hosts.refreshProjections(dir);
                } finally {
                    if (previous === undefined) delete process.env.MAGIC_ROOT;
                    else process.env.MAGIC_ROOT = previous;
                }
            };

            assert.deepStrictEqual(refresh(), [], 'with no projection there is nothing to refresh');
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude')),
                'refreshing creates no projection',
            );

            assert.strictEqual(skillExec(skill, dir, 'init', ['--host=claude,codex']).status, 0);
            assert.deepStrictEqual(refresh(), [], 'a current projection is not rewritten');

            // Entries as 3.0.x installations wrote them, reached through two hosts whose command
            // folders are one folder (this repository's own layout): each is one projection.
            const entry = (name) =>
                `---\ndescription: x\n---\n<!-- magicspec-command ${name} -->\nRun the command.\n`;
            const folder = path.join(dir, '.claude', 'commands', 'magicspec');
            fs.mkdirSync(folder, { recursive: true });
            fs.writeFileSync(path.join(folder, 'task.md'), entry('task'));
            fs.writeFileSync(path.join(folder, 'graph.md'), entry('graph'));
            fs.writeFileSync(path.join(folder, 'run.md'), "the project's own command\n");
            fs.mkdirSync(path.join(dir, '.qwen'), { recursive: true });
            fs.symlinkSync(
                path.join(dir, '.claude', 'commands'),
                path.join(dir, '.qwen', 'commands'),
                'junction',
            );

            // A source that moved on, and the entries.
            fs.appendFileSync(path.join(skill, 'CONSTITUTION.md'), '\nA new sentence.\n');
            const rewritten = refresh()
                .map((r) => r.path)
                .sort();
            assert.ok(
                rewritten.includes('.claude/rules/magicspec.md'),
                'the rule copy follows its source',
            );
            assert.strictEqual(
                rewritten.filter((p) => /commands\/magicspec\/(task|graph)\.md$/.test(p)).length,
                2,
                'each entry is one projection, even through two hosts',
            );
            assert.ok(
                !fs.existsSync(path.join(folder, 'task.md')) &&
                    !fs.existsSync(path.join(folder, 'graph.md')),
                'every marked entry is removed, current or not',
            );
            assert.ok(
                !rewritten.includes('.claude/commands/magicspec/run.md'),
                'a file without a marker is not ours',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(folder, 'run.md'), 'utf8'),
                "the project's own command\n",
            );
            assert.ok(
                fs.existsSync(folder),
                'a folder that still holds a file of the project stays',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, '.claude', 'rules', 'magicspec.md'), 'utf8'),
                fs.readFileSync(path.join(skill, 'CONSTITUTION.md'), 'utf8'),
                'the copy equals its source again',
            );
            fs.rmdirSync(path.join(dir, '.qwen', 'commands'));
            fs.rmSync(path.join(folder, 'run.md'));
            fs.writeFileSync(path.join(folder, 'task.md'), entry('task'));
            assert.strictEqual(refresh().length, 1, 'a lone entry is removed');
            assert.ok(!fs.existsSync(folder), 'and the emptied folder goes with it');
            assert.deepStrictEqual(refresh(), [], 'after a refresh nothing is left behind');
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* not a link */
            }
            cleanup(dir);
        }
    });

    test("remove deletes exactly what carries a marker, keeps a project's own files and the state, and a dry run changes nothing (skill folder)", () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Mine\n');
            skillExec(skill, dir, 'init', ['--host=claude,codex,qwen']);
            fs.mkdirSync(path.join(dir, '.claude', 'rules'), { recursive: true });
            fs.writeFileSync(path.join(dir, '.claude', 'rules', 'other.md'), 'mine\n');
            fs.mkdirSync(path.join(dir, '.claude', 'commands', 'magicspec'), { recursive: true });
            fs.writeFileSync(
                path.join(dir, '.claude', 'commands', 'magicspec', 'extra.md'),
                'mine\n',
            );
            fs.writeFileSync(
                path.join(dir, '.claude', 'commands', 'magicspec', 'task.md'),
                '<!-- magicspec-command task -->\n',
            );

            const snapshot = () =>
                walkFiles(dir)
                    .filter((f) => !f.includes(`${path.sep}.git${path.sep}`))
                    .map((f) => path.relative(dir, f))
                    .sort();
            const before = snapshot();
            const dry = skillExec(skill, dir, 'remove', ['--dry-run']);
            assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
            assert.deepStrictEqual(snapshot(), before, 'a dry run changes nothing');
            assert.match(dry.stdout, /Would remove: the managed block in AGENTS\.md/);

            const real = skillExec(skill, dir, 'remove');
            assert.strictEqual(real.status, 0, real.stdout + real.stderr);
            const left = snapshot().map((f) => f.split(path.sep).join('/'));
            assert.ok(left.includes('.claude/rules/other.md'), "the project's own rule stays");
            assert.ok(
                left.includes('.claude/commands/magicspec/extra.md'),
                "the project's own command stays",
            );
            assert.ok(
                left.some((f) => f.startsWith('.magicspec/')),
                'the state folder stays',
            );
            assert.strictEqual(
                fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').trim(),
                '# Mine',
                'the block goes, the text stays',
            );
            assert.ok(
                !left.some(
                    (f) => /magicspec\.md$/.test(f) || f.startsWith('.agents/skills/magicspec/'),
                ),
                'every marked file and the folder are gone',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.git', 'hooks', 'pre-commit')),
                'the hook this engine wrote is gone',
            );
            assert.ok(
                !fs.existsSync(path.join(dir, '.claude', 'skills', 'magicspec')),
                'the skill link is gone',
            );
        } finally {
            try {
                fs.rmdirSync(path.join(dir, '.claude', 'skills', 'magicspec'));
            } catch {
                /* already gone */
            }
            cleanup(dir);
        }
    });

    test('the developer-repository predicate needs both halves: the engine in its place and the manifest builder beside it (skill folder)', () => {
        const probe = (dir, skillRel) => {
            const skill = path.join(dir, ...skillRel.split('/'));
            const out = spawnSync(
                process.execPath,
                [
                    '-e',
                    `process.stdout.write(String(require(${JSON.stringify(path.join(skill, 'scripts', 'utils.js'))}).hasEngineWriteTooling()))`,
                ],
                { cwd: dir, encoding: 'utf8' },
            );
            return out.stdout;
        };
        const withBuilder = (dir) => {
            fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'scripts', 'generate-checksums.js'), '// builder\n');
        };

        const repoLike = makeConsumer();
        const installed = makeConsumer();
        const inPlaceNoBuilder = makeConsumer();
        try {
            installSkill(repoLike, 'skills/magicspec');
            withBuilder(repoLike);
            installSkill(installed, '.agents/skills/magicspec');
            withBuilder(installed); // a project with a folder of its own at the maintenance location
            installSkill(inPlaceNoBuilder, 'skills/magicspec');

            assert.strictEqual(
                probe(repoLike, 'skills/magicspec'),
                'true',
                'the engine in its place and the builder present',
            );
            assert.strictEqual(
                probe(installed, '.agents/skills/magicspec'),
                'false',
                'a host install is not the repository, builder or not',
            );
            assert.strictEqual(
                probe(inPlaceNoBuilder, 'skills/magicspec'),
                'false',
                'the place alone is not enough',
            );
        } finally {
            cleanup(repoLike);
            cleanup(installed);
            cleanup(inPlaceNoBuilder);
        }
    });

    test('one manifest covers the whole folder, so an edit to any file of it is a version event (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            fs.rmSync(path.join(skill, '.checksums'), { force: true });
            const build = spawnSync(
                process.execPath,
                [path.join(devScriptsDir, 'generate-checksums.js'), '--dir', skill],
                { encoding: 'utf8' },
            );
            assert.strictEqual(build.status, 0, build.stdout + build.stderr);

            const manifest = JSON.parse(fs.readFileSync(path.join(skill, '.checksums'), 'utf8'));
            for (const rel of [
                'SKILL.md',
                'CONSTITUTION.md',
                'workflows/run.md',
                'references/context.md',
                'roles/coder.md',
                'templates/spec.md',
                'scripts/utils.js',
            ]) {
                assert.ok(rel in manifest, `${rel} is in the manifest`);
            }
            assert.ok(
                !('.checksums' in manifest) && !('.version' in manifest),
                'the manifest and the version are outside it',
            );

            const check = () => skillExec(skill, dir, 'update-engine-meta', ['--check']);
            assert.strictEqual(check().status, 0, 'an untouched folder passes');

            for (const rel of [
                'SKILL.md',
                'CONSTITUTION.md',
                'workflows/run.md',
                'references/context.md',
                'roles/coder.md',
                'templates/spec.md',
                'scripts/utils.js',
            ]) {
                const file = path.join(skill, ...rel.split('/'));
                const original = fs.readFileSync(file);
                fs.appendFileSync(file, '\n');
                const result = check();
                assert.notStrictEqual(result.status, 0, `an edit to ${rel} fails the check`);
                assert.ok(
                    (result.stdout + result.stderr).includes(rel),
                    `${rel}: the check names the file`,
                );
                fs.writeFileSync(file, original);
            }
            assert.strictEqual(check().status, 0, 'restored, it passes again');
        } finally {
            cleanup(dir);
        }
    });

    test('the hook names the engine where it is installed, disarms with a line when the folder is gone and blocks drift while it is there (skill folder)', () => {
        const dir = makeConsumer();
        try {
            const skill = installSkill(dir);
            const manifest = spawnSync(
                process.execPath,
                [path.join(devScriptsDir, 'generate-checksums.js'), '--dir', skill],
                { encoding: 'utf8' },
            );
            assert.strictEqual(manifest.status, 0, manifest.stdout + manifest.stderr);
            const init = skillExec(skill, dir, 'init');
            assert.strictEqual(init.status, 0, init.stdout + init.stderr);

            const hookPath = path.join(dir, '.git', 'hooks', 'pre-commit');
            const hook = fs.readFileSync(hookPath, 'utf8');
            assert.match(
                hook,
                /node \.agents\/skills\/magicspec\/scripts\/executor\.js update-engine-meta --check/,
            );
            assert.match(hook, /statSync\('\.agents\/skills\/magicspec'\)/);
            // Only a path that does not exist counts as absent; a failure to inspect it counts as present.
            // (Not reachable portably in a fixture: Windows reports a path through a file as missing.)
            assert.match(hook, /process\.exit\(e\.code==='ENOENT'\?3:0\)/);

            const commit = () => {
                fs.writeFileSync(path.join(dir, 'file.txt'), `${Math.random()}\n`);
                spawnSync('git', ['add', 'file.txt'], { cwd: dir });
                return spawnSync('git', ['commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
            };
            const ok = commit();
            assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
            assert.match(ok.stdout + ok.stderr, /Engine in sync/);

            fs.appendFileSync(path.join(skill, 'roles', 'coder.md'), '\n');
            const drift = commit();
            assert.notStrictEqual(
                drift.status,
                0,
                'drift in any file of the folder blocks the commit',
            );
            assert.match(
                drift.stdout + drift.stderr,
                /Engine drift detected in \.agents\/skills\/magicspec\//,
            );

            fs.rmSync(skill, { recursive: true, force: true });
            const gone = commit();
            assert.strictEqual(gone.status, 0, 'a removed engine lets the commit through');
            const lines = (gone.stdout + gone.stderr)
                .split('\n')
                .filter((l) => l.includes('[Magic Sync]'));
            assert.strictEqual(lines.length, 1);
            assert.match(
                lines[0],
                /\(\.agents\/skills\/magicspec\/\) is not installed here, so nothing was checked/,
            );
        } finally {
            cleanup(dir);
        }
    });

    test('the plugin channel is gone: no builder script, no executor command, no shipped text that offers one (skill folder)', () => {
        // The name is assembled so that a search for the removed command finds only history.
        const removed = ['build', 'plugin'].join('-');
        assert.ok(
            !fs.existsSync(path.join(skillSrc, 'scripts', `${removed}.js`)),
            'the builder script is removed',
        );
        const run = spawnSync(
            process.execPath,
            [path.join(skillSrc, 'scripts', 'executor.js'), removed],
            { encoding: 'utf8' },
        );
        assert.strictEqual(run.status, 1, 'the executor no longer knows the command');
        assert.match(run.stderr, /Unknown command/);
        const manifest = fs.readFileSync(path.join(skillSrc, '.checksums'), 'utf8');
        assert.ok(!manifest.includes(removed), 'the integrity manifest does not list it');
        for (const file of walkFiles(skillSrc).filter((f) => /\.(md|js|json)$/.test(f))) {
            assert.ok(
                !fs.readFileSync(file, 'utf8').includes(removed),
                `${path.relative(skillSrc, file)} names the removed command`,
            );
        }
    });
};
