'use strict';

const fs = require('fs');
const path = require('path');
const {
    engineRoot,
    engineRel,
    normalizePath,
    STATE_DIR_NAME,
    GRAPH_DIR_NAME,
} = require('../utils');

// ═══════════════════════════════════════════════════════════════════════════
// HOST PROJECTIONS (rule, skill link; retired command entries)
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

/**
 * Marker of a command entry an earlier 3.0.x installation wrote. The engine writes none any
 * more (the router is the only command surface); the marker is how a leftover is recognized
 * and removed.
 */
const COMMAND_MARKER_RE = /<!-- magicspec-command ([\w-]+) -->/;

/**
 * The hosts, by the name `init --host` accepts.
 *
 * - `skills`: the project folder the host reads skills from.
 * - `rule`: where the always-on rule goes — a file of its own, or a managed block in
 *   the host's instruction file when the host documents no rules folder.
 * - `retired`: the folder in which 3.0.x installations placed command entries (a
 *   `magicspec/` subfolder of the host's command folder); null when the host never had one.
 *   Nothing is written there; whatever carries the entry marker is removed.
 */
const HOSTS = Object.freeze({
    claude: {
        label: 'Claude Code',
        skills: '.claude/skills',
        rule: { kind: 'file', path: '.claude/rules/magicspec.md' },
        retired: '.claude/commands/magicspec',
    },
    codex: {
        label: 'Codex',
        skills: '.agents/skills',
        rule: { kind: 'block', path: 'AGENTS.md' },
        retired: null,
    },
    qwen: {
        label: 'Qwen Code',
        skills: '.agents/skills',
        rule: { kind: 'file', path: '.qwen/rules/magicspec.md' },
        retired: '.qwen/commands/magicspec',
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
 * Reads the command table of the router. `init` calls it to prove the router is readable
 * before it writes anything.
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
        // Columns: command, group, what it does, argument, when it is missing, body.
        const row =
            /^\| `([a-z][a-z-]*)` \| [^|]+ \| ([^|]+) \| [^|]+ \| [^|]+ \| `workflows\/[a-z-]+\.md` \|$/.exec(
                line,
            );
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
 * Writes the projections of one host: the skill link and the rule, and removes the command
 * entries an earlier installation left. Nothing is written into a command folder.
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

    results.push(...retireCommandEntries(name, rootDir));
    return results;
}

// ───────────────────────────────────────────────────────────────────────────
// Retired command entries
// ───────────────────────────────────────────────────────────────────────────

/**
 * Removes a command folder the removal of its entries left empty.
 *
 * @param {string} rootDir - Project root.
 * @returns {void}
 */
function removeEmptyCommandFolders(rootDir) {
    for (const host of Object.values(HOSTS)) {
        if (!host.retired) continue;
        const dir = path.join(rootDir, host.retired);
        try {
            if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
        } catch {
            /* absent or not empty: leave it */
        }
    }
}

/**
 * Removes the command entries an earlier 3.0.x installation placed for one host: exactly the
 * files that carry the entry marker. A file of the project's own in the same folder stays, and
 * so does the folder when it is not empty afterwards.
 *
 * @param {string} name - A key of `HOSTS`.
 * @param {string} rootDir - Project root.
 * @returns {{path: string, action: 'retired'}[]} One row per entry removed.
 */
function retireCommandEntries(name, rootDir) {
    const host = HOSTS[name];
    const rows = [];
    if (!host.retired) return rows;
    const dir = path.join(rootDir, host.retired);
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch {
        return rows;
    }
    for (const file of files) {
        const full = path.join(dir, file);
        try {
            if (!file.endsWith('.md') || !fs.statSync(full).isFile()) continue;
            if (!COMMAND_MARKER_RE.test(fs.readFileSync(full, 'utf8'))) continue;
            fs.unlinkSync(full);
            rows.push({ path: normalizePath(path.relative(rootDir, full)), action: 'retired' });
        } catch {
            /* unreadable or already gone: not ours to report */
        }
    }
    removeEmptyCommandFolders(rootDir);
    return rows;
}

// ───────────────────────────────────────────────────────────────────────────
// Finding and removing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Lists every projection present in a project, by its marker, with whether it is stale.
 * A command entry an earlier installation left is always listed as stale: it is retired.
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
        if (host.retired && fs.existsSync(path.join(rootDir, host.retired))) {
            for (const file of fs.readdirSync(path.join(rootDir, host.retired))) {
                const full = path.join(rootDir, host.retired, file);
                if (!file.endsWith('.md') || !fs.statSync(full).isFile()) continue;
                const text = fs.readFileSync(full, 'utf8');
                const marker = COMMAND_MARKER_RE.exec(text);
                if (!marker) continue;
                // Host folders may be links to one folder: the same file is one projection.
                const commandKey = realOrNull(full) || full;
                if (seen.has(commandKey)) continue;
                seen.add(commandKey);
                // An entry is never current: the engine registers none, so every one is retired.
                found.push({ path: rel(full), host: name, kind: 'command', stale: true });
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
 * Regenerates the projections that exist and have fallen behind their source, in place, and
 * removes every command entry it finds (all are retired). Nothing is created: a host that has
 * no projection is `projectHost`'s business, and a file whose marker is gone is not ours to touch.
 *
 * @param {string} rootDir - Project root.
 * @returns {{path: string, host: string, kind: string}[]} The projections rewritten.
 */
function refreshProjections(rootDir) {
    const refreshed = [];
    for (const item of findProjections(rootDir)) {
        if (!item.stale || item.kind === 'link') continue;
        const full = path.join(rootDir, item.path);
        if (item.kind === 'rule') {
            fs.writeFileSync(full, readRuleSource());
        } else if (item.kind === 'block') {
            writeBlock(full, pointerBlock());
        } else {
            fs.unlinkSync(full);
        }
        refreshed.push({ path: item.path, host: item.host, kind: item.kind });
    }
    removeEmptyCommandFolders(rootDir);
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
    removeEmptyCommandFolders(rootDir);
    return removed;
}

// ───────────────────────────────────────────────────────────────────────────
// Version-control guidance
// ───────────────────────────────────────────────────────────────────────────

/**
 * The lines a project adds to `.gitignore` so the engine and what is generated from it stay
 * out of its history: the engine and each host's copy of the skill, the rule projections of
 * the named hosts, and the graph and cache folders under the state folder.
 *
 * @param {string[]} hostNames - Hosts the project is set up for; may be empty.
 * @param {string} rootDir - Project root.
 * @returns {{ignore: string[], engineInProject: string|null}} The lines, and the engine folder
 *   relative to the project (null when it lies outside, for example in a shared cache).
 */
function versionControlLines(hostNames, rootDir) {
    const rel = normalizePath(path.relative(rootDir, process.env.MAGIC_ENGINE_DIR || engineRoot()));
    const engineInProject = rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : null;
    const ignore = [];
    const add = (line) => {
        if (!ignore.includes(line)) ignore.push(line);
    };
    if (engineInProject) add(`/${engineInProject}/`);
    for (const name of hostNames) {
        const host = HOSTS[name];
        add(`/${host.skills}/magicspec/`);
        if (host.rule.kind === 'file') add(`/${host.rule.path}`);
    }
    add(`/${STATE_DIR_NAME}/${GRAPH_DIR_NAME}/`);
    add(`/${STATE_DIR_NAME}/*cache*/`);
    return { ignore, engineInProject };
}

module.exports = {
    HOSTS,
    RULE_MARKER,
    BLOCK_BEGIN,
    BLOCK_END,
    versionControlLines,
    parseHosts,
    readCommands,
    readRuleSource,
    pointerBlock,
    projectHost,
    findProjections,
    refreshProjections,
    removeProjections,
};
