#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE-STATE — STATE.md update utility
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { parseFlags } = require('./utils');
const { stripQuoted } = require('./lib/scan-hygiene');
const diagnostics = require('./lib/diagnostics');

/**
 * Groups a Markdown list section into logical entries, keeping each entry's
 * wrapped continuation lines attached to it, and returns where each one sits.
 * An entry starts at a line matching `startRe`; every following non-blank line
 * that does not itself start a new entry is a continuation of it (how a
 * wrapped Recent Decisions or Blocking Constraints line looks on disk — marker
 * line, then indented continuation lines). Filtering lines by `startRe` alone,
 * as the section rebuilds below used to, keeps only each entry's first line and
 * silently drops the continuations on every rebuild (field report, engine
 * v2.1.93).
 *
 * This is the one place the grouping rule lives: `collectEntries` reads the
 * entries' text through it, and the line-cap prune removes an entry by these
 * offsets instead of looking its text up again in the file — a lookup that
 * never matched a CRLF file or a last entry with no trailing newline, yet was
 * reported as a prune (l2-finalize-state-accuracy.md section 13.2).
 *
 * @param {string} block    Section text (heading through the line before the next heading).
 * @param {RegExp} startRe  Pattern matching an entry's first line.
 * @returns {{start: number, end: number}[]} Offsets into `block`, in file order;
 *   `end` is exclusive and includes the entry's last line terminator when it has one.
 */
function entryRanges(block, startRe) {
    const ranges = [];
    let current = null;
    let offset = 0;
    for (const raw of block.split(/(?<=\n)/)) {
        const line = raw.replace(/\r?\n$/, '');
        if (startRe.test(line)) {
            if (current) ranges.push(current);
            current = { start: offset, end: offset + raw.length };
        } else if (current) {
            if (line.trim() === '') {
                ranges.push(current);
                current = null;
            } else {
                current.end = offset + raw.length;
            }
        }
        offset += raw.length;
    }
    if (current) ranges.push(current);
    return ranges;
}

/**
 * Reads a section's entries as text — each one string, its lines joined with
 * `\n` whatever the file's own line endings are, ready to be re-emitted by a
 * rebuild.
 *
 * @param {string} block    Section text (heading through the line before the next heading).
 * @param {RegExp} startRe  Pattern matching an entry's first line.
 * @returns {string[]} One string per entry; multi-line entries keep internal `\n`.
 */
function collectEntries(block, startRe) {
    return entryRanges(block, startRe).map(({ start, end }) =>
        block.slice(start, end).replace(/\r?\n$/, '').split(/\r?\n/).join('\n'));
}

/**
 * Widens a single-line field pattern to the field's whole logical entry: its
 * marker line plus the wrapped continuation lines hanging beneath it. A field
 * value an agent hand-wrapped over several lines is one entry, and a pattern
 * that matches only its first physical line replaces that line alone — the new
 * text lands on the marker line and the old continuation stays behind as
 * orphaned prose under text it no longer belongs to (field report, engine
 * v2.1.95; l2-finalize-state-accuracy.md section 12.1, the scalar-field sibling
 * of the section-rebuild defect `collectEntries` closes).
 *
 * What counts as a continuation is narrower than the "every following
 * non-blank line" rule `collectEntries` applies, on purpose: inside an
 * engine-owned list section nothing but entries can follow an entry, but field
 * lines sit directly against their neighbours (`**Phase:**` / `**Status:**`,
 * the three `- **X:**` bullets) with no blank line between them, so the broad
 * rule would swallow the next field. Two rules stand in for it:
 *
 * - An indented, non-blank line continues the entry above it, for every field.
 * - For a field written as a list item (`- **Task:** ...`) an unindented line
 *   continues it too — CommonMark's lazy continuation, which renders exactly
 *   like the indented wrap — unless it opens a new block: a line starting with
 *   `-`, `+` or `*` (a bullet, a `**Label:**` field, a thematic break), an
 *   ordered-list marker, `#`, `>`, `|`, `<` (heading, quote, table row, HTML or
 *   comment) or a code fence. The set errs toward stopping: a line outside it
 *   is consumed, so an incomplete set fails by deleting, whereas a line that
 *   stops early leaves only the orphan this function exists to remove — the
 *   milder failure. Header fields get no lazy rule: with no list structure to
 *   anchor "continues" to, an unindented line under `**Phase:**` is as likely
 *   to be a neighbouring field or a stray note as its wrap.
 *
 * A blank line ends every entry. Line breaks match as `\r?\n` so a CRLF
 * checkout works, and the terminator of the last matched line stays in place,
 * so the replacement never disturbs line endings.
 *
 * @param {RegExp} lineRe       Pattern matching the field's first physical line (ends in `.*`).
 * @param {boolean} isListItem  True when the field is written as a Markdown list item.
 * @returns {RegExp} `lineRe` extended over the entry's continuation lines.
 */
function wholeEntryRe(lineRe, isListItem) {
    const indented = '[ \\t]+\\S';
    const lazy = '(?![-+*#>|<]|```|~~~|\\d+[.)][ \\t])\\S';
    const continuation = isListItem ? `(?:${indented}|${lazy})` : indented;
    return new RegExp(`${lineRe.source}(?:\\r?\\n${continuation}.*)*`, lineRe.flags);
}

// ───────────────────────────────────────────────────────────────────────────
// Section Location
// ───────────────────────────────────────────────────────────────────────────

/**
 * STATE.md's `## ` sections in template order (`templates/state.md`). A section
 * the file lacks is created at its slot in this order — before the earliest
 * present section that follows it — so a repaired file reads the way a freshly
 * bootstrapped one does.
 */
const SECTION_ORDER = [
    '## Current Position',
    '## Progress',
    '## Recent Decisions',
    '## Blockers',
    '## Blocking Constraints',
    '## Session Continuity',
];

/**
 * Builds the pattern that recognises a section heading: the marker at the
 * *start of a line*, then a word boundary. It is a heading test, not a
 * substring search: `content.indexOf('## Recent Decisions')` also hits a line
 * that merely quotes the heading — a constraint naming the section, say — and a
 * rebuild spliced at that offset lands mid-line, destroying the quoting line's
 * tail and creating the section inside the wrong one
 * (l2-finalize-state-accuracy.md section 13). A word boundary, not end-of-line,
 * follows the marker so a hand-suffixed heading (`## Recent Decisions (last 5)`)
 * is still the section. Markers are the engine's own literal constants, so they
 * need no regex escaping.
 *
 * @param {string} marker  Section heading, e.g. `## Recent Decisions`.
 * @returns {RegExp} A fresh multiline pattern (no `lastIndex` state is shared).
 */
function headingRe(marker) {
    return new RegExp(`^${marker}\\b`, 'm');
}

/**
 * Locates a `## ` section: from its heading up to the line break that precedes
 * the next level-2 heading, or to the end of the file for the last section.
 *
 * @param {string} content  STATE.md text.
 * @param {string} marker   Section heading, e.g. `## Recent Decisions`.
 * @returns {{start: number, end: number}|null} Bounds, or null when the file has no such heading.
 */
function locateSection(content, marker) {
    const heading = headingRe(marker).exec(content);
    if (!heading) return null;
    const next = content.indexOf('\n## ', heading.index + 1);
    return { start: heading.index, end: next !== -1 ? next : content.length };
}

/**
 * Locates a `## ` section, first creating an empty one when the file has none.
 * The two list-section writers (`addDecision`, `addConstraint`) used to guard
 * their whole rebuild with `if (secStart !== -1)` and no alternative, so a
 * STATE.md without the heading — routine for a file agents maintain by hand —
 * took the request, wrote nothing, and still printed `STATE.md updated`
 * (l2-finalize-state-accuracy.md section 13). Creating the section is safe
 * because both are wholly engine-owned: the caller's deterministic rebuild
 * fills it exactly as it fills one that was always there, and there is no
 * hand-authored content to protect. The heading goes before the earliest
 * present section that follows it in SECTION_ORDER, else at the end of the
 * file, set off by one blank line on each side. The repair is announced on
 * stderr and recorded as a `fix` diagnostic so it cannot pass unnoticed. The
 * same step creates the container a missing field belongs in (`ensureField`)
 * and a missing `## Progress` (section 13.1).
 *
 * @param {string} content    STATE.md text.
 * @param {string} marker     Section heading; must be one of SECTION_ORDER.
 * @param {string} statePath  Path of STATE.md, for the diagnostic's locus.
 * @returns {{content: string, start: number, end: number}} STATE.md text (with
 *   the section added when it was missing) and the section's bounds within it.
 */
function ensureSection(content, marker, statePath) {
    const found = locateSection(content, marker);
    if (found) return { content, ...found };

    let at = content.length;
    for (const following of SECTION_ORDER.slice(SECTION_ORDER.indexOf(marker) + 1)) {
        const heading = headingRe(following).exec(content);
        if (heading && heading.index < at) at = heading.index;
    }
    // Normalise the gap on the near side to exactly one blank line; the far
    // side gets its blank line from the rest of the file (or none, at the end).
    // The separators follow the file's own line ending.
    const eol = lineEnding(content);
    const head = content.slice(0, at).trimEnd();
    const rest = content.slice(at);
    const created = `${head ? `${head}${eol}${eol}` : ''}${marker}${eol}${rest ? `${eol}${rest}` : ''}`;

    const message = `STATE.md had no "${marker}" section; created it so the requested write could be recorded.`;
    console.warn(`[update-state] ${message}`);
    diagnostics.record({
        severity: 'fix', source: 'update-state', code: 'STATE_SECTION_CREATED',
        message, locus: statePath,
    });
    return { content: created, ...locateSection(created, marker) };
}

// ───────────────────────────────────────────────────────────────────────────
// Field Location
// ───────────────────────────────────────────────────────────────────────────

/**
 * The scalar fields `update-state` patches: a line-anchored pattern for each
 * field's first physical line, and the prefix a line is (re)written with. The
 * anchor matters for the reason a heading's does (`headingRe`): a pattern that
 * matches anywhere in a line takes a label merely quoted mid-line for the field
 * and rewrites the quoting line from there on, destroying its tail
 * (l2-finalize-state-accuracy.md section 13.1). The `- ` prefix marks the three
 * fields written as Markdown list items (see `wholeEntryRe`).
 */
const FIELD_MAP = {
    workspace: { re: /^\*\*Workspace:\*\* .*/m, prefix: '**Workspace:** ' },
    updated: { re: /^\*\*Updated:\*\* .*/m, prefix: '**Updated:** ' },
    phase: { re: /^\*\*Phase:\*\* .*/m, prefix: '**Phase:** ' },
    status: { re: /^\*\*Status:\*\* .*/m, prefix: '**Status:** ' },
    task: { re: /^- \*\*Task:\*\* .*/m, prefix: '- **Task:** ' },
    spec: { re: /^- \*\*Spec:\*\* .*/m, prefix: '- **Spec:** ' },
    nextAction: { re: /^- \*\*Next Action:\*\* .*/m, prefix: '- **Next Action:** ' },
    handoff: { re: /^\*\*Handoff File:\*\* .*/m, prefix: '**Handoff File:** ' },
    bootstrap: { re: /^\*\*Bootstrap Mode:\*\* .*/m, prefix: '**Bootstrap Mode:** ' },
};

/**
 * Where each patchable field lives and the order the template lists them in:
 * the header block (the text before the first level-2 heading) or a `## `
 * section. `ensureField` places a missing line by this.
 */
const FIELD_CONTAINERS = [
    { section: null, keys: ['workspace', 'updated', 'phase', 'status'] },
    { section: '## Current Position', keys: ['task', 'spec', 'nextAction'] },
    { section: '## Session Continuity', keys: ['handoff', 'bootstrap'] },
];

/** A line that is itself a field: `**Label:** …` or `- **Label:** …`. */
const FIELD_LINE_RE = /^(?:- )?\*\*[^*\n]+:\*\*/;

/**
 * The line ending a file uses, for text the engine inserts into it: CRLF when
 * the file has any, else LF.
 *
 * @param {string} content  File text.
 * @returns {string} `\r\n` or `\n`.
 */
function lineEnding(content) {
    return content.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Adds a field line that the file lacks. The scalar-field loop used to patch a
 * field only when its line was found and to do nothing otherwise, so on a
 * hand-trimmed file a `--next-action`, `--status` or `--handoff` was accepted
 * and dropped while `STATE.md updated` was still printed
 * (l2-finalize-state-accuracy.md section 13.1). The line goes before the
 * earliest present field that follows it in template order within its
 * container, else after the container's last non-blank line; a container
 * section the file lacks is created first (`ensureSection`). Field lines stay
 * adjacent to one another, and a field that follows a heading or prose is set
 * off by one blank line. Separators and the line's own terminator use the
 * file's line ending, so a CRLF file gains no bare LF from this step.
 *
 * @param {string} content    STATE.md text.
 * @param {string} key        A key of FIELD_MAP.
 * @param {string} line       The complete line to add (prefix and value).
 * @param {string} statePath  Path of STATE.md, for a created section's diagnostic.
 * @returns {string} STATE.md text with the line added.
 */
function ensureField(content, key, line, statePath) {
    const container = FIELD_CONTAINERS.find((c) => c.keys.includes(key));
    let start = 0;
    let end = content.length;
    if (container.section) {
        const section = ensureSection(content, container.section, statePath);
        ({ content, start, end } = section);
    } else {
        const firstHeading = content.search(/^## /m);
        if (firstHeading !== -1) end = firstHeading;
    }
    const block = content.slice(start, end);
    const eol = lineEnding(content);

    let at = -1;
    for (const following of container.keys.slice(container.keys.indexOf(key) + 1)) {
        const found = FIELD_MAP[following].re.exec(block);
        if (found && (at === -1 || found.index < at)) at = found.index;
    }

    let updated;
    if (at !== -1) {
        updated = `${block.slice(0, at)}${line}${eol}${block.slice(at)}`;
    } else {
        const body = block.trimEnd();
        const lastLine = body.slice(body.lastIndexOf('\n') + 1);
        const gap = FIELD_LINE_RE.test(lastLine) ? eol : `${eol}${eol}`;
        updated = `${body}${gap}${line}${block.slice(body.length)}`;
    }
    return `${content.slice(0, start)}${updated}${content.slice(end)}`;
}

/**
 * Updates STATE.md with provided key-value patches.
 * Reads the existing state file, applies changes, and writes back.
 * Never exceeds 100 lines — prunes old Decisions if needed.
 *
 * @param {string} designDir   Path to .design/{workspace} directory.
 * @param {object} patch       Key-value pairs to apply.
 * @param {object} [options]   Optional flags.
 * @param {boolean} [options.addDecision]   If true, prepend a decision entry.
 * @param {boolean} [options.addConstraint] If true, prepend a constraint entry.
 * @returns {void}
 */
function updateState(designDir, patch, options = {}) {
    const statePath = path.join(designDir, 'STATE.md');
    const templatePath = path.join(__dirname, '..', 'templates', 'state.md');

    // ───────────────────────────────────────────────────────────────────────
    // Bootstrap: create STATE.md from template if missing
    // ───────────────────────────────────────────────────────────────────────
    if (!fs.existsSync(statePath)) {
        if (!fs.existsSync(templatePath)) {
            console.error('[update-state] Template not found, creating minimal STATE.md');
            diagnostics.record({
                severity: 'fix', source: 'update-state', code: 'STATE_TEMPLATE_MISSING',
                message: 'templates/state.md not found; created a minimal STATE.md instead.',
                locus: statePath,
            });
            const minimal = [
                '# Project State',
                '',
                `**Workspace:** unknown`,
                `**Updated:** ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`,
                '**Phase:** 0',
                '**Status:** Active',
                '',
                '## Current Position',
                '',
                '- **Next Action:** Initialize project',
                '',
            ].join('\n');
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.writeFileSync(statePath, minimal, 'utf8');
        } else {
            fs.mkdirSync(path.dirname(statePath), { recursive: true });
            fs.copyFileSync(templatePath, statePath);
        }
    }

    let content = fs.readFileSync(statePath, 'utf8');
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // ───────────────────────────────────────────────────────────────────────
    // Apply simple field patches (regex-based line replacement)
    // ───────────────────────────────────────────────────────────────────────

    // Always update timestamp
    patch.updated = now;

    const createdFields = [];
    for (const [key, { re, prefix }] of Object.entries(FIELD_MAP)) {
        if (patch[key] !== undefined) {
            // Match the whole entry, not just its first physical line: a wrapped
            // value's continuation lines are replaced along with its marker line
            // (see wholeEntryRe). Every field goes through this one loop; the
            // `- ` prefix marks the three fields that are Markdown list items.
            const entryRe = wholeEntryRe(re, prefix.startsWith('- '));
            const line = `${prefix}${patch[key]}`;
            if (entryRe.test(content)) {
                // Function-form replacement: the returned string is spliced in
                // verbatim. A string-form second argument is re-scanned for the
                // $-dollar patterns $$, $&, $` and $' (the last three need no
                // capture group), and patch[key] is not engine-controlled here
                // -- nextAction embeds a finalize.js-synthesized task title,
                // task carries the raw title, and titles about shell tooling
                // routinely contain bash ANSI-C quoting ($'...'). Left as a
                // string replacement, $' expanded to the entire remainder of
                // STATE.md: the field was truncated and every section below it
                // duplicated, a stale ## Progress counter among them. Same
                // defect class as the ## Progress fence rewrite below
                // (l2-finalize-state-accuracy.md sections 6 and 6.1).
                content = content.replace(entryRe, () => line);
            } else if (key !== 'updated') {
                // Absent: create the line at its template position rather than
                // drop the write (section 13.1). `updated` is the exception —
                // no caller requests it, a fresh stamp is injected into every
                // call — so it is refreshed where present and left absent where
                // absent, and a call that patches nothing stays a no-op.
                content = ensureField(content, key, line, statePath);
                createdFields.push(prefix.replace(/^- /, '').trim());
            }
        }
    }
    if (createdFields.length > 0) {
        const message = `STATE.md lacked the field line(s) ${createdFields.join(', ')}; ` +
            'created so the requested update could be recorded.';
        console.warn(`[update-state] ${message}`);
        diagnostics.record({
            severity: 'fix', source: 'update-state', code: 'STATE_FIELD_CREATED',
            message, locus: statePath,
        });
    }

    // ───────────────────────────────────────────────────────────────────────
    // Prepend Decision (keeps last 5 entries)
    //
    // The whole section is engine-owned (unlike ## Progress, which interleaves
    // hand-authored narrative and must merge, never clobber) — so it is
    // rebuilt deterministically on every call rather than insertion-point
    // arithmetic against the existing bytes. The prior approach searched for
    // the first line not starting with `<` via `/^[^<]/m` to skip past the
    // blank-line/comment preamble, but a blank line's own line-terminating
    // `\n` satisfies `[^<]` too (it is "a character other than `<`"), so the
    // search matched at position 0 on every call, `commentEnd > 0` was always
    // false, and every entry was inserted directly after the heading — never
    // advancing past the blank line and `<!-- ... -->` comment at all. A full
    // rebuild sidesteps the whole class of positional bugs and self-heals any
    // spacing drift already present, rather than requiring a correctly-shaped
    // preamble to begin with (markdownlint MD022/MD032/MD012, field report).
    // ───────────────────────────────────────────────────────────────────────
    if (options.addDecision && patch.decision) {
        const marker = '## Recent Decisions';
        // A hand-trimmed file may lack the heading: ensureSection creates the
        // section instead of letting the write be skipped (section 13).
        const section = ensureSection(content, marker, statePath);
        content = section.content;
        const block = content.slice(section.start, section.end);

        const existingEntries = collectEntries(block, /^- \d{4}-\d{2}-\d{2}/);
        const newEntry = `- ${now.slice(0, 10)} **Decision:** ${patch.decision}`;
        const decisionEntries = [newEntry, ...existingEntries].slice(0, 5);

        const rebuilt = [
            marker,
            '',
            '<!-- Last 3-5 locked decisions. Older entries are dropped (not archived) ' +
                '— see PLAN.md / CHANGELOG.md for phase history. -->',
            '',
            ...decisionEntries,
            '',
        ].join('\n');

        content = content.slice(0, section.start) + rebuilt + content.slice(section.end);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Prepend Blocking Constraint (auto-numbered [C-NNN])
    //
    // The whole section is engine-owned (the template marks it MANDATORY
    // reading, not hand-authored narrative), so — like ## Recent Decisions
    // above — it is rebuilt deterministically on every call rather than
    // insertion-point arithmetic against the existing bytes. The prior
    // approach searched for the first line not starting with `<` via
    // `/^[^<]/m` to skip past the blank-line/comment preamble — the exact
    // same defect `addDecision` was rewritten away from above: a blank
    // line's own line-terminating `\n` satisfies `[^<]` too, so the search
    // matched at position 0 on every call, `contentStart > 0` was always
    // false, and every constraint was inserted directly after the heading —
    // never advancing past the blank line and MANDATORY-reading comment at
    // all. Each new constraint piled up there, pushing the comment (and
    // every prior constraint) further down instead of joining the list
    // below it. Unlike decisions, constraints are never pruned — every
    // entry is kept by design (l1-session-continuity.md SC-1.2) — so the
    // rebuild carries the full existing list, not a capped slice.
    // ───────────────────────────────────────────────────────────────────────
    if (options.addConstraint && patch.constraint) {
        const marker = '## Blocking Constraints';
        // Same as ## Recent Decisions above: an absent section is created, not
        // skipped — and it is the one whose entries must never be lost.
        const section = ensureSection(content, marker, statePath);
        content = section.content;
        const block = content.slice(section.start, section.end);

        const existingEntries = collectEntries(block, /^- \[C-\d{3}\]/);
        // Auto-number from entries already inside this block, not a
        // whole-file scan — a `[C-NNN]` mentioned in passing elsewhere
        // (e.g. a Recent Decisions note referencing a constraint) must
        // not inflate the next id.
        const id = `C-${String(existingEntries.length + 1).padStart(3, '0')}`;
        const newEntry = `- [${id}] **${patch.constraint.title}**: ${patch.constraint.desc}`;
        const constraintEntries = [newEntry, ...existingEntries];

        const rebuilt = [
            marker,
            '',
            '<!-- Anti-patterns discovered through real failures. MANDATORY reading. -->',
            '<!-- Agent MUST explicitly acknowledge each constraint before working. -->',
            '',
            ...constraintEntries,
            '',
        ].join('\n');

        content = content.slice(0, section.start) + rebuilt + content.slice(section.end);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Auto-Progress (SC-2: best-effort recompute from TASKS.md)
    // ───────────────────────────────────────────────────────────────────────
    if (options.autoProgress) {
        try {
            const progress = computeProgress(designDir, content);
            if (progress) {
                const progressRe = /(^## Progress\s*\n+```\r?\n)([\s\S]*?)(\r?\n```)/m;
                const existing = content.match(progressRe);
                if (!existing && !locateSection(content, '## Progress')) {
                    // No section at all: create it holding the counters instead
                    // of skipping the recompute (section 13.1). Built with plain
                    // concatenation — the fence carries backticks, and nothing
                    // here may be a replacement string.
                    const section = ensureSection(content, '## Progress', statePath);
                    content = section.content.slice(0, section.start) +
                        '## Progress\n\n```\n' + progress + '\n```\n' +
                        section.content.slice(section.end);
                } else if (!existing) {
                    // A heading with no fence directly under it is a shape the
                    // merge-not-clobber rule does not recognise, and the engine
                    // cannot tell narrative from a counter block it never wrote:
                    // leave it exactly as it is, but say so.
                    const message = 'STATE.md has a "## Progress" heading with no counter block under it that ' +
                        'the recompute recognises; left it untouched.';
                    console.warn(`[update-state] ${message}`);
                    diagnostics.record({
                        severity: 'warning', source: 'update-state', code: 'PROGRESS_BLOCK_UNRECOGNISED',
                        message, locus: statePath,
                        remedy: 'Put the counters in a fenced block directly under the heading, or delete the section and let the recompute recreate it.',
                    });
                } else {
                    // Only the two labels `computeProgress()` itself emits are
                    // engine-owned and recomputed (including their template
                    // `{filled}/{total}` placeholder form). Any other line inside
                    // the fence is hand-authored narrative and is preserved below
                    // the counters — the recompute merges, it never clobbers.
                    // The label set is closed on purpose: an open class matched
                    // operator lines that merely share the counter shape, and
                    // since nothing regenerates those labels, matching them meant
                    // deleting them. The phase label also has a placeholder form
                    // (`Phase {N}`) — that is the shape a freshly bootstrapped
                    // STATE.md carries, and it is engine-owned like the rest.
                    const counterRe =
                        /^(?:Overall|Phase (?:\d+|\{[^}]*\})):\s+\[(?:\d+\/\d+|\{[^}]*\}\/\{[^}]*\})\]/;
                    const preserved = existing[2]
                        .split(/\r?\n/)
                        .filter((l) => l.trim() !== '' && !counterRe.test(l));
                    const body = preserved.length > 0
                        ? `${progress}\n${preserved.join('\n')}`
                        : progress;
                    // Function-form replacement: the returned string is used
                    // verbatim. A string-form replacement would re-scan the whole
                    // result for `$1`-`$9`/`` $` ``/`$'`/`$&`, and `body` carries
                    // unconstrained narrative — a literal `$1` in an operator's
                    // note would splice a captured fence fragment into the middle
                    // of the file and unbalance its code fences.
                    content = content.replace(progressRe, (_match, open, _oldBody, close) =>
                        `${open}${body}${close}`);
                }
            }
        } catch (e) {
            console.warn(`[update-state] Progress recompute skipped: ${e.message}`);
            diagnostics.record({
                severity: 'error', source: 'update-state', code: 'PROGRESS_RECOMPUTE_SKIPPED',
                message: `Progress recompute skipped: ${e.message}`, locus: statePath,
            });
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Line-count guard (100 lines max) — prune oldest decision
    //
    // `## Recent Decisions` is the only section this guard can prune, and it has
    // a floor of one entry. `## Blocking Constraints` grows monotonically by
    // design (the template marks it MANDATORY reading, so entries are never
    // dropped silently), which means the cap can be exceeded with nothing left
    // to remove. That state is reported distinctly instead of reusing the
    // routine-prune message: an operator told "pruning" while the file keeps
    // growing has no signal that the cap stopped holding.
    // ───────────────────────────────────────────────────────────────────────
    const lines = content.split('\n');
    if (lines.length > 100) {
        let pruned = false;
        // Located by the same anchored, end-of-file-bounded locator the section
        // writers use, and the oldest entry removed by its position in the file
        // — not by looking its text up again, which never matched a CRLF file or
        // a last entry with no trailing newline while `pruned` was still set,
        // and never ran at all when the section was the file's last
        // (l2-finalize-state-accuracy.md section 13.2).
        const section = locateSection(content, '## Recent Decisions');
        if (section) {
            const ranges = entryRanges(content.slice(section.start, section.end), /^- \d{4}-\d{2}-\d{2}/);
            if (ranges.length > 1) {
                const oldest = ranges[ranges.length - 1];
                content = content.slice(0, section.start + oldest.start) +
                    content.slice(section.start + oldest.end);
                pruned = true;
            }
        }
        if (pruned) {
            console.warn(`[update-state] STATE.md exceeds 100 lines (${lines.length}). Pruned oldest decision.`);
            diagnostics.record({
                severity: 'fix', source: 'update-state', code: 'STATE_DECISION_PRUNED',
                message: `STATE.md exceeded 100 lines (${lines.length}); pruned the oldest Recent Decisions entry.`,
                locus: statePath,
            });
        } else {
            console.warn(
                `[update-state] STATE.md exceeds 100 lines (${lines.length}) and ## Recent Decisions ` +
                'is already at its floor — nothing was pruned. ' +
                'Review ## Blocking Constraints and archive stale entries.'
            );
            diagnostics.record({
                severity: 'warning', source: 'update-state', code: 'STATE_CAP_EXHAUSTED',
                message: `STATE.md exceeds 100 lines (${lines.length}); Recent Decisions is at its floor, nothing was pruned.`,
                locus: statePath, remedy: 'Review ## Blocking Constraints and archive stale entries.',
            });
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Persist
    // ───────────────────────────────────────────────────────────────────────
    fs.writeFileSync(statePath, content, 'utf8');
    console.log(`[update-state] STATE.md updated: ${statePath}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Progress Recompute Helpers
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renders one progress line with an 8-segment bar.
 *
 * @param {string} label  Line label (e.g. `Phase 8`, `Overall`).
 * @param {number} done   Completed item count.
 * @param {number} total  Total item count (must be > 0).
 * @returns {string}
 */
function progressLine(label, done, total) {
    const pct = Math.round((done / total) * 100);
    const filled = Math.min(8, Math.round((pct / 100) * 8));
    const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
    return `${label}: [${done}/${total}] ${bar} ${pct}%`;
}

/**
 * Reads the active phase's checklist from the canonical two-level task layout
 * (`tasks/phase-{N}.md`), for workspaces whose TASKS.md carries no inline
 * `### Phase {N} Checklist` heading.
 *
 * Fenced blocks and inline code-spans are stripped first: these files routinely
 * quote checkbox syntax while discussing it, and counting those quotations would
 * inflate the total — the same false-positive class that once suppressed
 * archival eligibility.
 *
 * @param {string} designDir  Path to .design/{workspace} directory.
 * @param {string} n          Active phase number.
 * @returns {string|null} Checklist source text, or null when no such file exists.
 */
function readPhaseChecklist(designDir, n) {
    const phasePath = path.join(designDir, 'tasks', `phase-${n}.md`);
    if (!fs.existsSync(phasePath)) return null;
    return stripQuoted(fs.readFileSync(phasePath, 'utf8'));
}

/**
 * Recomputes the STATE.md Progress block from TASKS.md. Best-effort: any
 * unparsable structure yields `null` and the existing block is preserved.
 *
 * Sources:
 * - Active-phase line: `### Phase {N} Checklist` items in TASKS.md (legacy
 *   single-file layout), falling back to `tasks/phase-{N}.md` (canonical
 *   two-level layout). `{N}` is taken from the STATE.md `**Phase:**` field.
 * - Overall line: `| [Phase {N}](...)` registry rows in TASKS.md; a row
 *   counts as done when it contains the `Done` status keyword.
 *
 * @param {string} designDir     Path to .design/{workspace} directory.
 * @param {string} stateContent  Current STATE.md content (for phase number).
 * @returns {string|null} Replacement block body, or null to skip.
 */
function computeProgress(designDir, stateContent) {
    const tasksPath = path.join(designDir, 'TASKS.md');
    if (!fs.existsSync(tasksPath)) return null;
    const tasks = fs.readFileSync(tasksPath, 'utf8');

    const lines = [];

    const phaseMatch = stateContent.match(/\*\*Phase:\*\* (\d+)/);
    if (phaseMatch) {
        const n = phaseMatch[1];
        const section = tasks.match(new RegExp(`### Phase ${n} Checklist\\n([\\s\\S]*?)(?=\\n#|$)`));
        // The inline heading exists only in the legacy single-file layout. On the
        // canonical two-level layout the checklist lives in tasks/phase-{N}.md,
        // so without the fallback no phase line is ever produced there and the
        // block silently degrades to the aggregate `Overall` counter alone.
        const checklist = section ? section[1] : readPhaseChecklist(designDir, n);
        if (checklist) {
            const done = (checklist.match(/^- \[x\]/gim) || []).length;
            const open = (checklist.match(/^- \[ \]/gm) || []).length;
            if (done + open > 0) lines.push(progressLine(`Phase ${n}`, done, done + open));
        }
    }

    const phaseRows = tasks.match(/^\| \[Phase \d+\]\([^)]*\)[^\n]*$/gm) || [];
    if (phaseRows.length > 0) {
        const phasesDone = phaseRows.filter((r) => /\bDone\b/.test(r)).length;
        lines.push(progressLine('Overall', phasesDone, phaseRows.length));
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses CLI arguments and applies the requested STATE.md patch.
 *
 * @returns {void}
 */
function runCli() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error(
            'Usage: node update-state.js --workspace=<dir> ' +
            '[--task=<id>] [--status=<s>] [--phase=<n>] ' +
            '[--next-action=<text>] [--decision=<text>] ' +
            '[--constraint-title=<t>] [--constraint-desc=<d>] ' +
            '[--handoff=<path>] [--bootstrap=<true|false>]'
        );
        process.exit(1);
    }

    // One shared grammar (utils.parseFlags): `--flag=value` and `--flag value`
    // are equivalent, and a valueless value-flag is an error. Previously a bare
    // `--workspace` yielded an empty value that fell through to `.design/`,
    // writing STATE.md into the global registry root instead of a workspace.
    const { values, flags, rest, errors } = parseFlags(args, {
        valueFlags: [
            '--workspace', '--task', '--status', '--phase', '--next-action',
            '--handoff', '--bootstrap', '--decision',
            '--constraint-title', '--constraint-desc',
        ],
        boolFlags: ['--auto-progress'],
    });

    if (errors.length > 0) {
        console.error(`[update-state] HALT: ${errors[0]}`);
        process.exit(1);
    }
    for (const unknown of rest) {
        console.warn(`[update-state] Unknown argument: ${unknown}`);
        diagnostics.record({
            severity: 'warning', source: 'update-state', code: 'UNKNOWN_ARGUMENT',
            message: `Unknown argument ignored: ${unknown}`,
        });
    }

    const parsed = {};
    const opts = {};

    if (values['--task'] !== undefined) parsed.task = values['--task'];
    if (values['--status'] !== undefined) parsed.status = values['--status'];
    if (values['--phase'] !== undefined) parsed.phase = values['--phase'];
    if (values['--next-action'] !== undefined) parsed.nextAction = values['--next-action'];
    if (values['--handoff'] !== undefined) parsed.handoff = values['--handoff'];
    if (values['--bootstrap'] !== undefined) parsed.bootstrap = values['--bootstrap'];
    if (flags['--auto-progress']) opts.autoProgress = true;

    if (values['--decision'] !== undefined) {
        parsed.decision = values['--decision'];
        opts.addDecision = true;
    }
    if (values['--constraint-title'] !== undefined) {
        parsed.constraint = parsed.constraint || {};
        parsed.constraint.title = values['--constraint-title'];
        opts.addConstraint = true;
    }
    if (values['--constraint-desc'] !== undefined) {
        parsed.constraint = parsed.constraint || {};
        parsed.constraint.desc = values['--constraint-desc'];
        opts.addConstraint = true;
    }

    // `--workspace` here is a design *directory* (may contain separators), not
    // the bare workspace name that executor.js validates. Absent → ambient env.
    const workspaceArg = values['--workspace'] || process.env.MAGIC_DESIGN_DIR || '.design';

    updateState(workspaceArg, parsed, opts);
}

module.exports = { updateState, computeProgress };

if (require.main === module) {
    runCli();
}
