'use strict';

const fs = require('fs');
const path = require('path');
const { engineRoot, engineRel, normalizePath } = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// HOST PROJECTIONS (rule, command entries, skill link)
// ═══════════════════════════════════════════════════════════════════════════
//
// Whatever must exist outside the skill folder for a host to find it is derived from
// the folder here, by one generator, and carries a marker that says so. A file at a
// projection path that carries no marker belongs to the project and is left alone.
// The locations below were read from each host's own documentation; what a host
// documents may change, so this table is the one place to correct.

/** Marker inside the rule source: its copies carry it, and that is how they are recognized. */
const RULE_MARKER = '<!-- magicspec-rule -->';

/** Delimiters of the managed block in a host instruction file. */
const BLOCK_BEGIN = '<!-- magicspec:begin -->';
const BLOCK_END = '<!-- magicspec:end -->';

/** Marker of a generated command entry. */
const COMMAND_MARKER = (cmd) => `<!-- magicspec-command ${cmd} -->`;
const COMMAND_MARKER_RE = /<!-- magicspec-command ([\w-]+) -->/;

/**
 * The hosts, by the name `init --host` accepts.
 *
 * - `skills`: the project folder the host reads skills from.
 * - `rule`: where the always-on rule goes — a file of its own, or a managed block in
 *   the host's instruction file when the host documents no rules folder.
 * - `commands`: the host's command folder (a `magicspec/` subfolder is the colon
 *   namespace) and the placeholder it substitutes with the typed arguments; null when
 *   the host has no per-project command entry.
 */
const HOSTS = Object.freeze({
    claude: {
        label: 'Claude Code',
        skills: '.claude/skills',
        rule: { kind: 'file', path: '.claude/rules/magicspec.md' },
        commands: { dir: '.claude/commands/magicspec', args: '$ARGUMENTS' },
    },
    codex: {
        label: 'Codex',
        skills: '.agents/skills',
        rule: { kind: 'block', path: 'AGENTS.md' },
        commands: null,
    },
    qwen: {
        label: 'Qwen Code',
        skills: '.agents/skills',
        rule: { kind: 'file', path: '.qwen/rules/magicspec.md' },
        commands: { dir: '.qwen/commands/magicspec', args: '{{args}}' },
    },
});

// ───────────────────────────────────────────────────────────────────────────
// Sources
// ───────────────────────────────────────────────────────────────────────────

/**
 * Splits a comma list of host names into known and unknown ones.
 *
 * @param {string} list - For example `claude,qwen`.
 * @returns {{hosts: string[], unknown: string[]}} Distinct names, in the order given.
 */
function parseHosts(list) {
    const names = [
        ...new Set(
            String(list)
                .split(',')
                .map((n) => n.trim())
                .filter(Boolean),
        ),
    ];
    return {
        hosts: names.filter((n) => Object.hasOwn(HOSTS, n)),
        unknown: names.filter((n) => !Object.hasOwn(HOSTS, n)),
    };
}

/**
 * Reads the command table of the router: the one list of commands every surface uses.
 *
 * @returns {{name: string, summary: string}[]} The commands, in table order.
 * @throws {Error} When the router is missing or holds no command rows.
 */
function readCommands() {
    const routerPath = path.join(engineRoot(), 'SKILL.md');
    if (!fs.existsSync(routerPath)) {
        throw new Error(`Router not found: ${routerPath} (the engine folder holds no SKILL.md).`);
    }
    const commands = [];
    for (const line of fs.readFileSync(routerPath, 'utf8').split(/\r?\n/)) {
        const row = /^\| `([a-z][a-z-]*)` \| (.+?) \| `workflows\/[a-z-]+\.md` \|$/.exec(line);
        if (row) commands.push({ name: row[1], summary: row[2] });
    }
    if (commands.length === 0)
        throw new Error(`No command rows in the router table of ${routerPath}.`);
    return commands;
}

/**
 * @returns {string} The text of the rule source, which every rule copy repeats byte for byte.
 * @throws {Error} When the source is missing or carries no marker.
 */
function readRuleSource() {
    const sourcePath = path.join(engineRoot(), 'AGENT-RULES.md');
    if (!fs.existsSync(sourcePath)) throw new Error(`Rule source not found: ${sourcePath}.`);
    const text = fs.readFileSync(sourcePath, 'utf8');
    if (!text.includes(RULE_MARKER))
        throw new Error(`The rule source carries no ${RULE_MARKER} marker.`);
    return text;
}

// ───────────────────────────────────────────────────────────────────────────
// Generated content
// ───────────────────────────────────────────────────────────────────────────

/**
 * The text of one command entry: a pointer to the router with the command, nothing more.
 *
 * @param {{name: string, summary: string}} command - The command.
 * @param {string} argsPlaceholder - How the host spells "the arguments typed after the command".
 * @returns {string} Markdown with frontmatter.
 */
function commandEntry(command, argsPlaceholder) {
    const description = command.summary.replace(/\s+/g, ' ').trim();
    return [
        '---',
        `description: ${description}`,
        '---',
        COMMAND_MARKER(command.name),
        `Run the magicspec command \`${command.name}\`: load the \`magicspec\` skill, read its \`workflows/${command.name}.md\` and follow it.`,
        `Arguments: ${argsPlaceholder}`,
        '',
    ].join('\n');
}

/**
 * The managed block that points a host instruction file at the rule.
 *
 * @returns {string} The block, delimiters included, without a trailing newline.
 */
function pointerBlock() {
    return [
        BLOCK_BEGIN,
        `Before any work in this project, read \`${engineRel()}/AGENT-RULES.md\` and follow it for the whole session.`,
        BLOCK_END,
    ].join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Writing
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} p - Path to inspect.
 * @returns {boolean} True for a symbolic link or a junction, without following it.
 */
function isLink(p) {
    try {
        return fs.lstatSync(p).isSymbolicLink();
    } catch {
        return false;
    }
}

/**
 * @param {string} p - Path to probe.
 * @returns {string|null} Its real path, or null when it does not exist.
 */
function realOrNull(p) {
    try {
        return fs.realpathSync.native(p);
    } catch {
        return null;
    }
}

/**
 * Writes a generated file unless something that is not ours is already there.
 *
 * @param {string} file - Absolute target path.
 * @param {string} content - What to write.
 * @param {(existing: string) => boolean} isOurs - Recognizes a file this generator wrote.
 * @returns {'written'|'unchanged'|'replaced'|'foreign'} What happened.
 */
function writeProjection(file, content, isOurs) {
    if (!fs.existsSync(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        return 'written';
    }
    const existing = fs.readFileSync(file, 'utf8');
    if (!isOurs(existing)) return 'foreign';
    if (existing === content) return 'unchanged';
    fs.writeFileSync(file, content);
    return 'replaced';
}

/**
 * Puts the managed block into an instruction file, creating the file if it is absent
 * and replacing only the block's own content if it is there.
 *
 * @param {string} file - Absolute path of the instruction file.
 * @param {string} block - The block text.
 * @returns {'written'|'unchanged'|'replaced'} What happened.
 */
function writeBlock(file, block) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, `${block}\n`);
        return 'written';
    }
    const existing = fs.readFileSync(file, 'utf8');
    const begin = existing.indexOf(BLOCK_BEGIN);
    const end = existing.indexOf(BLOCK_END);
    if (begin !== -1 && end > begin) {
        const next = existing.slice(0, begin) + block + existing.slice(end + BLOCK_END.length);
        if (next === existing) return 'unchanged';
        fs.writeFileSync(file, next);
        return 'replaced';
    }
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    fs.writeFileSync(file, `${existing}${separator}${block}\n`);
    return 'written';
}

/**
 * Makes the skill reachable from a host's skills folder: nothing to do when it already
 * lies there, a directory link when the place is free, and a report when the place
 * holds something else. A folder that is not this link is never overwritten.
 *
 * @param {string} rootDir - Project root.
 * @param {string} skillsRel - The host's skills folder, project-relative.
 * @returns {{path: string, action: 'in place'|'linked'|'conflict'|'unlinkable', detail?: string}}
 */
function ensureSkillLink(rootDir, skillsRel) {
    const place = path.join(rootDir, skillsRel, 'magicspec');
    const shown = normalizePath(path.relative(rootDir, place));
    const here = fs.realpathSync.native(engineRoot());
    const existing = realOrNull(place);
    if (existing !== null) {
        return existing === here
            ? { path: shown, action: 'in place' }
            : { path: shown, action: 'conflict', detail: 'another folder is already there' };
    }
    try {
        fs.mkdirSync(path.dirname(place), { recursive: true });
        fs.symlinkSync(here, place, 'junction');
        return { path: shown, action: 'linked' };
    } catch (err) {
        return { path: shown, action: 'unlinkable', detail: err.message };
    }
}

/**
 * Writes the projections of one host: the skill link, the rule and the command entries.
 *
 * @param {string} name - A key of `HOSTS`.
 * @param {string} rootDir - Project root.
 * @returns {{path: string, action: string, detail?: string}[]} One row per file or link touched.
 */
function projectHost(name, rootDir) {
    const host = HOSTS[name];
    const results = [];
    const rel = (file) => normalizePath(path.relative(rootDir, file));

    results.push(ensureSkillLink(rootDir, host.skills));

    if (host.rule.kind === 'file') {
        const file = path.join(rootDir, host.rule.path);
        const action = writeProjection(file, readRuleSource(), (t) => t.includes(RULE_MARKER));
        results.push({ path: rel(file), action });
    } else {
        const file = path.join(rootDir, host.rule.path);
        results.push({ path: rel(file), action: writeBlock(file, pointerBlock()) });
    }

    if (host.commands) {
        for (const command of readCommands()) {
            const file = path.join(rootDir, host.commands.dir, `${command.name}.md`);
            const action = writeProjection(file, commandEntry(command, host.commands.args), (t) =>
                COMMAND_MARKER_RE.test(t),
            );
            results.push({ path: rel(file), action });
        }
    }
    return results;
}

// ───────────────────────────────────────────────────────────────────────────
// Finding and removing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists every projection present in a project, by its marker, with whether it is stale.
 * Nothing is read from a record: a copy that lost its marker is no longer ours.
 *
 * @param {string} rootDir - Project root.
 * @returns {{path: string, host: string, kind: 'rule'|'block'|'command'|'link', stale: boolean}[]}
 */
function findProjections(rootDir) {
    const found = [];
    const rel = (file) => normalizePath(path.relative(rootDir, file));
    const seen = new Set();
    let ruleSource = null;
    try {
        ruleSource = readRuleSource();
    } catch {
        /* no source: nothing can be compared, nothing is stale */
    }
    let commands = null;
    try {
        commands = readCommands();
    } catch {
        /* same */
    }

    for (const [name, host] of Object.entries(HOSTS)) {
        const rulePath = path.join(rootDir, host.rule.path);
        const ruleKey = realOrNull(rulePath) || rulePath;
        if (!seen.has(ruleKey) && fs.existsSync(rulePath)) {
            seen.add(ruleKey);
            const text = fs.readFileSync(rulePath, 'utf8');
            if (host.rule.kind === 'file' && text.includes(RULE_MARKER)) {
                found.push({
                    path: rel(rulePath),
                    host: name,
                    kind: 'rule',
                    stale: ruleSource !== null && text !== ruleSource,
                });
            } else if (
                host.rule.kind === 'block' &&
                text.includes(BLOCK_BEGIN) &&
                text.includes(BLOCK_END)
            ) {
                const begin = text.indexOf(BLOCK_BEGIN);
                const current = text.slice(begin, text.indexOf(BLOCK_END) + BLOCK_END.length);
                found.push({
                    path: rel(rulePath),
                    host: name,
                    kind: 'block',
                    stale: current !== pointerBlock(),
                });
            }
        }
        if (host.commands && fs.existsSync(path.join(rootDir, host.commands.dir))) {
            for (const file of fs.readdirSync(path.join(rootDir, host.commands.dir))) {
                const full = path.join(rootDir, host.commands.dir, file);
                if (!file.endsWith('.md') || !fs.statSync(full).isFile()) continue;
                const text = fs.readFileSync(full, 'utf8');
                const marker = COMMAND_MARKER_RE.exec(text);
                if (!marker) continue;
                // Host folders may be links to one folder: the same file is one projection.
                const commandKey = realOrNull(full) || full;
                if (seen.has(commandKey)) continue;
                seen.add(commandKey);
                const command = commands?.find((c) => c.name === marker[1]);
                found.push({
                    path: rel(full),
                    host: name,
                    kind: 'command',
                    stale:
                        Boolean(commands) &&
                        (!command || text !== commandEntry(command, host.commands.args)),
                });
            }
        }
        const link = path.join(rootDir, host.skills, 'magicspec');
        if (isLink(link) && !seen.has(link)) {
            seen.add(link);
            found.push({ path: rel(link), host: name, kind: 'link', stale: false });
        }
    }
    return found;
}

/**
 * Regenerates the projections that exist and have fallen behind their source, in place.
 * Nothing is created: a host that has no projection is `projectHost`'s business, and a
 * file whose marker is gone is not ours to touch.
 *
 * @param {string} rootDir - Project root.
 * @returns {{path: string, host: string, kind: string}[]} The projections rewritten.
 */
function refreshProjections(rootDir) {
    const refreshed = [];
    for (const item of findProjections(rootDir)) {
        if (!item.stale || item.kind === 'link') continue;
        const full = path.join(rootDir, item.path);
        const host = HOSTS[item.host];
        if (item.kind === 'rule') {
            fs.writeFileSync(full, readRuleSource());
        } else if (item.kind === 'block') {
            writeBlock(full, pointerBlock());
        } else {
            const name = COMMAND_MARKER_RE.exec(fs.readFileSync(full, 'utf8'))[1];
            const command = readCommands().find((c) => c.name === name);
            // An entry whose command left the router is removed with the command.
            if (!command) {
                fs.unlinkSync(full);
            } else {
                fs.writeFileSync(full, commandEntry(command, host.commands.args));
            }
        }
        refreshed.push({ path: item.path, host: item.host, kind: item.kind });
    }
    return refreshed;
}

/**
 * Removes the projections found in a project, and nothing else.
 *
 * @param {string} rootDir - Project root.
 * @returns {string[]} Project-relative paths removed.
 */
function removeProjections(rootDir) {
    const removed = [];
    for (const item of findProjections(rootDir)) {
        const full = path.join(rootDir, item.path);
        if (item.kind === 'link') {
            // A link is removed as a link: the folder it leads to is not touched.
            try {
                fs.rmdirSync(full);
            } catch {
                fs.unlinkSync(full);
            }
        } else if (item.kind === 'block') {
            const text = fs.readFileSync(full, 'utf8');
            const begin = text.indexOf(BLOCK_BEGIN);
            const end = text.indexOf(BLOCK_END) + BLOCK_END.length;
            let rest = text.slice(0, begin) + text.slice(end);
            rest = rest.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
            if (rest.trim() === '') fs.unlinkSync(full);
            else fs.writeFileSync(full, rest.endsWith('\n') ? rest : `${rest}\n`);
        } else {
            fs.unlinkSync(full);
        }
        removed.push(item.path);
    }
    // Command folders left empty by the removal go with their files.
    for (const host of Object.values(HOSTS)) {
        if (!host.commands) continue;
        const dir = path.join(rootDir, host.commands.dir);
        try {
            if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
        } catch {
            /* absent or not empty: leave it */
        }
    }
    return removed;
}

module.exports = {
    HOSTS,
    RULE_MARKER,
    BLOCK_BEGIN,
    BLOCK_END,
    parseHosts,
    readCommands,
    readRuleSource,
    commandEntry,
    pointerBlock,
    projectHost,
    findProjections,
    refreshProjections,
    removeProjections,
};
