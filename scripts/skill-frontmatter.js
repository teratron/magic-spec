#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SKILL FRONTMATTER CHECKER
// ═══════════════════════════════════════════════════════════════════════════
//
// The validity limits and the Selection Signal rules of the frontmatter of a skill's
// router (l2-skill-wrappers.md §2.3), as one checker the harness runs over every
// router of the repository. The wrapper generator this code was written for is gone;
// the rules are not.

const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const NAME_GRAMMAR = /^[a-z0-9-]+$/;

/** Words the target skill format reserves inside a `name`. Kept here and nowhere else. */
const RESERVED_NAME_WORDS = ['anthropic', 'claude'];

/** First- and second-person words a third-person description never contains. */
const PERSON_WORD = /\b(?:I|we|my|you|your)\b/i;

/** The "when" half of a description: a sentence that begins `Use when`. */
const USE_WHEN_SENTENCE = /(?:^|[.!?]\s+)Use when\b/;

/**
 * Reads one top-level scalar from a frontmatter block as its parsed value, so
 * a quoted or folded multi-line value is measured as its text and not as its
 * first line. This is not a YAML parser: it understands plain, quoted and
 * block (`>` / `|`) scalars and flags the plain-scalar shapes YAML itself
 * rejects (a colon followed by a space, a leading indicator character), which
 * is what an unparsable description looks like to a host.
 *
 * @param {string} frontmatterBody - Text between the `---` fences.
 * @param {string} key - Top-level key to read.
 * @returns {{ present: boolean, parsed: boolean, value: string }}
 */
function readScalar(frontmatterBody, key) {
    const lines = frontmatterBody.split(/\r?\n/);
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start === -1) return { present: false, parsed: true, value: '' };

    const head = lines[start].slice(key.length + 1).trim();
    const tail = [];
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim() === '') {
            tail.push('');
            continue;
        }
        if (!/^\s/.test(lines[i])) break;
        tail.push(lines[i].trim());
    }
    const continuation = tail.filter(Boolean);

    if (/^[>|][+-]?\d*[+-]?$/.test(head)) {
        return { present: true, parsed: true, value: continuation.join(' ') };
    }

    if (head.startsWith('"') || head.startsWith("'")) {
        const text = [head, ...continuation].join(' ');
        const quote = text[0];
        let value = '';
        for (let i = 1; i < text.length; i++) {
            const ch = text[i];
            if (quote === '"' && ch === '\\') {
                value += text[i + 1] ?? '';
                i++;
                continue;
            }
            if (ch === quote) {
                if (quote === "'" && text[i + 1] === "'") {
                    value += "'";
                    i++;
                    continue;
                }
                const after = text.slice(i + 1).trim();
                return { present: true, parsed: after === '' || after.startsWith('#'), value };
            }
            value += ch;
        }
        return { present: true, parsed: false, value };
    }

    const text = [head, ...continuation]
        .join(' ')
        .replace(/\s+#.*$/, '')
        .trim();
    const unparsable = /:(\s|$)/.test(text) || /^[[{*&!%@`]/.test(text);
    return { present: true, parsed: !unparsable, value: text };
}

/**
 * Checks the frontmatter a wrapper is about to be written with: the format's
 * validity limits and the form rules a script can decide. The judgment rules
 * (a discriminating `Use when` sentence, leading with the primary use) stay
 * with review and the selection cases.
 *
 * @param {{ name: string, frontmatter: string, synthesized: boolean }} projection
 * @returns {Array<{ field: string, rule: string }>} One entry per violated rule; empty when valid.
 */
function checkProjection(projection) {
    const problems = [];
    const refuse = (field, rule) => problems.push({ field, rule });
    const count = (n) => n.toLocaleString('en-US');

    const name = readScalar(projection.frontmatter, 'name');
    if (!name.present || !name.parsed || name.value === '') {
        refuse('name', name.present && !name.parsed ? 'does not parse' : 'missing or blank');
    } else {
        if (name.value.length > NAME_MAX_LENGTH) {
            refuse('name', `${count(name.value.length)} characters, limit ${NAME_MAX_LENGTH}`);
        }
        if (!NAME_GRAMMAR.test(name.value)) {
            refuse('name', 'only lowercase letters, digits and hyphens are allowed');
        }
        if (RESERVED_NAME_WORDS.some((word) => name.value.includes(word))) {
            refuse('name', 'contains a word the target skill format reserves');
        }
        if (name.value !== projection.name) {
            refuse('name', `differs from the workflow file name (expected ${projection.name})`);
        }
    }

    const description = readScalar(projection.frontmatter, 'description');
    if (!description.present || !description.parsed || description.value === '') {
        refuse(
            'description',
            description.present && !description.parsed ? 'does not parse' : 'missing or blank',
        );
        return problems;
    }

    const text = description.value;
    if (text.length > DESCRIPTION_MAX_LENGTH) {
        refuse(
            'description',
            `${count(text.length)} characters, limit ${count(DESCRIPTION_MAX_LENGTH)}`,
        );
    }
    if (/[<>]/.test(text)) refuse('description', 'contains a "<" or ">" character');

    if (projection.synthesized) {
        refuse(
            'description',
            'synthesized by the generator: the workflow has no frontmatter block',
        );
    } else {
        if (!USE_WHEN_SENTENCE.test(text)) refuse('description', 'no "Use when" sentence');
        const person = text.match(PERSON_WORD);
        if (person) refuse('description', `first- or second-person word "${person[0]}"`);
    }

    return problems;
}


module.exports = { checkProjection, readScalar, RESERVED_NAME_WORDS };
