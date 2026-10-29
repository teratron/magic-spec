#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN AUDIT (Session Transcript Usage)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reads the usage figures that Claude Code records in its session transcripts and
 * reports where the tokens went. A turn re-reads the whole context, so the cost of
 * a session is the sum over its turns of the context size at that turn, not the sum
 * of what was typed: a long session at a large context is the expensive shape.
 *
 * Layer 2: a maintenance tool, never shipped, importing nothing from the engine.
 *
 * Usage:
 *   node scripts/token-audit.js [--dir <transcript folder>] [--since <date>]  table of sessions (default: this project)
 *   node scripts/token-audit.js --session <transcript.jsonl>                 one session in depth
 *   node scripts/token-audit.js --hook                                       UserPromptSubmit hook:
 *       reads the hook payload on stdin and, when the context passes TOKEN_AUDIT_WARN
 *       (default 300000), adds one line of advice to the prompt; prints nothing otherwise.
 */

const DEFAULT_WARN = 300000;
const BUCKETS = [
    ['<100K', 100e3],
    ['100-200K', 200e3],
    ['200-400K', 400e3],
    ['400-700K', 700e3],
    ['>700K', Infinity],
];

// ───────────────────────────────────────────────────────────────────────────
// Transcript Reading
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} file - Transcript path (one JSON object per line).
 * @returns {object[]} Parsed entries; unparsable lines are skipped.
 */
function readTranscript(file) {
    const entries = [];
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line) continue;
        try {
            entries.push(JSON.parse(line));
        } catch {
            // A truncated last line of a live transcript is not an error.
        }
    }
    return entries;
}

/**
 * @param {object} usage - The `usage` object of an assistant message.
 * @returns {number} Tokens the turn read: fresh input plus cache writes plus cache reads.
 */
function contextOf(usage) {
    return (
        (usage.input_tokens || 0) +
        (usage.cache_creation_input_tokens || 0) +
        (usage.cache_read_input_tokens || 0)
    );
}

/**
 * Collects the assistant turns of a transcript, once per message.
 *
 * @param {object[]} entries - Parsed transcript.
 * @returns {object[]} Usage objects in order, each with a model name.
 */
function turnsOf(entries) {
    const seen = new Set();
    const turns = [];
    for (const entry of entries) {
        const message = entry.message;
        if (entry.type !== 'assistant' || !message || !message.usage) continue;
        const key = `${message.id}:${message.usage.output_tokens}`;
        if (message.id && seen.has(key)) continue;
        seen.add(key);
        turns.push({ ...message.usage, model: message.model });
    }
    return turns;
}

// ───────────────────────────────────────────────────────────────────────────
// Summaries
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {object[]} turns - From {@link turnsOf}.
 * @returns {{turns: number, first: number, max: number, fresh: number, written: number, read: number, output: number, buckets: Object<string, number>}}
 */
function summarize(turns) {
    const total = {
        turns: turns.length,
        first: turns.length ? contextOf(turns[0]) : 0,
        max: 0,
        fresh: 0,
        written: 0,
        read: 0,
        output: 0,
        buckets: Object.fromEntries(BUCKETS.map(([name]) => [name, 0])),
    };
    for (const turn of turns) {
        const ctx = contextOf(turn);
        total.max = Math.max(total.max, ctx);
        total.fresh += turn.input_tokens || 0;
        total.written += turn.cache_creation_input_tokens || 0;
        total.read += turn.cache_read_input_tokens || 0;
        total.output += turn.output_tokens || 0;
        total.buckets[BUCKETS.find(([, limit]) => ctx < limit)[0]]++;
    }
    return total;
}

/**
 * The biggest tool results of a transcript, by the tool call that produced them.
 *
 * @param {object[]} entries - Parsed transcript.
 * @param {number} top - How many to return.
 * @returns {{tokens: number, call: string}[]} Approximate tokens (characters / 3.5).
 */
function largestResults(entries, top) {
    const calls = {};
    const results = [];
    for (const entry of entries) {
        const content = entry.message?.content;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
            if (part.type === 'tool_use') {
                const input = part.input || {};
                const detail = input.command || input.file_path || input.pattern || '';
                calls[part.id] =
                    `${part.name} ${String(detail).slice(0, 70).replace(/\s+/g, ' ')}`.trim();
            } else if (part.type === 'tool_result') {
                const text =
                    typeof part.content === 'string' ? part.content : JSON.stringify(part.content);
                results.push({
                    tokens: Math.round(text.length / 3.5),
                    call: calls[part.tool_use_id] || '?',
                });
            }
        }
    }
    return results.sort((a, b) => b.tokens - a.tokens).slice(0, top);
}

/**
 * @param {number} n
 * @returns {string} The number with thousands separators.
 */
function fmt(n) {
    return n.toLocaleString('en-US');
}

// ───────────────────────────────────────────────────────────────────────────
// Modes
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string} dir - Folder of transcripts.
 * @param {number} sinceMs - Only transcripts modified after this instant.
 */
function table(dir, sinceMs) {
    const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.jsonl'))
        .map((f) => ({ f, p: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .filter((x) => x.mtime >= sinceMs)
        .sort((a, b) => a.mtime - b.mtime);
    let read = 0;
    for (const { f, p } of files) {
        const s = summarize(turnsOf(readTranscript(p)));
        read += s.read;
        console.log(
            `${f.slice(0, 8)} turns=${s.turns} firstCtx=${fmt(s.first)} maxCtx=${fmt(s.max)} cacheRead=${fmt(s.read)} cacheWrite=${fmt(s.written)} output=${fmt(s.output)}`,
        );
    }
    console.log(`TOTAL cacheRead=${fmt(read)} over ${files.length} session(s)`);
}

/**
 * @param {string} file - One transcript.
 */
function session(file) {
    const entries = readTranscript(file);
    const s = summarize(turnsOf(entries));
    console.log(
        `turns=${s.turns} firstCtx=${fmt(s.first)} maxCtx=${fmt(s.max)} cacheRead=${fmt(s.read)}`,
    );
    console.log(`turns by context size: ${JSON.stringify(s.buckets)}`);
    console.log('largest tool results:');
    for (const r of largestResults(entries, 8))
        console.log(`  ~${fmt(r.tokens)} tokens  ${r.call}`);
}

/**
 * The folder where Claude Code keeps the transcripts of a working directory: its path with
 * every character outside letters and digits turned into a hyphen. The case of the drive
 * letter varies, so the folder is matched without regard to case.
 *
 * @param {string} cwd - Working directory.
 * @returns {string} Absolute path of the transcript folder.
 */
function projectFolder(cwd) {
    const root = path.join(os.homedir(), '.claude', 'projects');
    const name = cwd.replace(/[^A-Za-z0-9]/g, '-').toLowerCase();
    const found = fs.existsSync(root) && fs.readdirSync(root).find((f) => f.toLowerCase() === name);
    return path.join(root, found || name);
}

/**
 * UserPromptSubmit hook: one line of advice once the context passes the threshold.
 *
 * @param {string} payload - The hook's JSON payload from stdin.
 */
function hook(payload) {
    let transcript;
    try {
        transcript = JSON.parse(payload).transcript_path;
    } catch {
        return;
    }
    if (!transcript || !fs.existsSync(transcript)) return;
    const turns = turnsOf(readTranscript(transcript));
    if (turns.length === 0) return;
    const ctx = contextOf(turns[turns.length - 1]);
    const limit = Number(process.env.TOKEN_AUDIT_WARN) || DEFAULT_WARN;
    if (ctx < limit) return;
    const advice = `Context is ${fmt(ctx)} tokens and every turn re-reads all of it. Tell the user once that /clear or /compact at the next boundary is cheaper; the project state is saved and resume-state restores it.`;
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: advice },
        }),
    );
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv - Arguments after the script name.
 */
function main(argv) {
    const value = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
    if (argv.includes('--hook')) {
        hook(fs.readFileSync(0, 'utf8'));
        return;
    }
    if (value('--session')) {
        session(path.resolve(value('--session')));
        return;
    }
    const dir = value('--dir') ? path.resolve(value('--dir')) : projectFolder(process.cwd());
    table(dir, Date.parse(value('--since') || '1970-01-01'));
}

module.exports = { readTranscript, turnsOf, contextOf, summarize, largestResults };

if (require.main === module) main(process.argv.slice(2));
