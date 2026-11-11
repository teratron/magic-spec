'use strict';

const { spawnSync } = require('child_process');
const feedback = require('./feedback');
const drafts = require('./feedback-draft');

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK SUBMISSION (Consent, Look-up, Creation, Outcomes)
// ═══════════════════════════════════════════════════════════════════════════
//
// Publishing is a step apart from drafting (EF-2). It takes the identifier of a draft the person
// was shown in full and nothing else — no text, no repository, no label — so what is
// published is exactly what was shown, at the one address the skill folder states (EF-3). The
// engine cannot verify the person's yes; the agent is bound to ask for it before it calls this,
// and the channel setting `draft` removes the call altogether (EF-10).
//
// The tracker is reached only through the person's own signed-in command-line client. The
// engine stores no credential, and no outcome is claimed that the tracker did not confirm.

/** The outcomes a submission can report: exactly one (§5.3). */
const OUTCOMES = Object.freeze(['created', 'duplicate found', 'not created', 'unknown']);

/** The client of the tracker, run with an argument list and never through a shell. */
const CLIENT = 'gh';

/** How long the client may take before its answer is given up on, in milliseconds. */
const CLIENT_TIMEOUT_MS = 60000;

const ISSUE_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+/;

/**
 * Runs the tracker's command-line client. The default way; a caller may pass its own runner.
 *
 * @param {string[]} args - Arguments for the client.
 * @param {string} [input] - Text for its standard input.
 * @returns {{status: number|null, stdout: string, stderr: string, missing: boolean}} What the client answered; `missing` when it is not installed.
 */
function runClient(args, input) {
    const run = spawnSync(CLIENT, args, { input, encoding: 'utf8', timeout: CLIENT_TIMEOUT_MS });
    return {
        status: run.status,
        stdout: run.stdout || '',
        stderr: run.stderr || '',
        missing: Boolean(run.error && run.error.code === 'ENOENT'),
    };
}

/**
 * @param {string} reason - Why nothing was created.
 * @param {string} draftId - The draft, for the recovery step.
 * @returns {{outcome: string, reason: string, recovery: string}} A `not created` outcome with its one recovery step.
 */
function notCreated(reason, draftId) {
    return {
        outcome: 'not created',
        reason,
        recovery: `copy the text with \`feedback keep ${draftId}\`, or open the link of the draft and file it by hand`,
    };
}

/**
 * Looks for an open issue that carries the draft's fingerprint (EF-8). A look-up that fails
 * never blocks the submission; it is reported.
 *
 * @param {string} slug - `owner/name` of the tracker.
 * @param {Object} draft - The draft.
 * @param {(args: string[], input?: string) => Object} client - The client runner.
 * @returns {{url: string|null, failed: string|null, missing?: boolean}} The address of the issue found, the reason the look-up failed when it did, and `missing` when no client is installed.
 */
function lookUp(slug, draft, client) {
    const answer = client([
        'issue',
        'list',
        '--repo',
        slug,
        '--state',
        'open',
        '--search',
        `${draft.fingerprint} in:body`,
        '--json',
        'url',
        '--limit',
        '5',
    ]);
    if (answer.missing) return { url: null, failed: null, missing: true };
    if (answer.status !== 0)
        return {
            url: null,
            failed: drafts
                .scrubText(answer.stderr.split('\n')[0] || 'the client did not answer')
                .slice(0, 200),
        };
    try {
        const found = JSON.parse(answer.stdout);
        return {
            url:
                Array.isArray(found) && found[0] && typeof found[0].url === 'string'
                    ? found[0].url
                    : null,
            failed: null,
        };
    } catch {
        return { url: null, failed: 'the answer of the look-up could not be read' };
    }
}

/**
 * Publishes a draft the person approved: a refusal for what is not allowed, a look-up for a duplicate,
 * then the creation. A failed submission leaves the draft intact; a created one leaves the store.
 *
 * @param {string} id - A draft identifier (`d1`) — the only text this takes.
 * @param {{forceNew?: boolean, client?: (args: string[], input?: string) => Object, root?: string}} [options] - `forceNew` asks for a new issue although one carries the fingerprint.
 * @returns {{outcome: string, url?: string, reason?: string, recovery?: string, lookup?: string}} Exactly one of the four outcomes.
 */
function submitDraft(id, options = {}) {
    const client = options.client || runClient;
    const store = feedback.loadStore(options.root);
    const draft = store.drafts.find((entry) => entry.id === id);
    if (!draft) return notCreated(`there is no draft ${id || '(none given)'}`, id || 'dN');
    const { channel } = feedback.readChannel(options.root);
    if (channel !== 'full')
        return notCreated(`the feedback channel is '${channel}': the agent cannot publish`, id);
    if (!draft.shownAt)
        return notCreated(
            `the draft was not shown in full; show it with \`feedback draft ${id}\` first`,
            id,
        );

    const repository = drafts.readRepository();
    if (!repository)
        return notCreated("the engine's tracker address is not defined in the skill folder", id);
    const slug = repository.replace('https://github.com/', '');

    const found = lookUp(slug, draft, client);
    if (found.missing)
        return notCreated(`no tracker client (${CLIENT}) is installed or signed in`, id);
    if (found.url && !options.forceNew) {
        return {
            outcome: 'duplicate found',
            url: found.url,
            reason: 'an open issue carries this fingerprint; nothing was created (submit with --new to file another)',
        };
    }
    const answer = client(
        ['issue', 'create', '--repo', slug, '--title', draft.title, '--body-file', '-'],
        draft.body,
    );
    const lookup = found.failed
        ? `the duplicate look-up failed (${found.failed}); the submission went on`
        : undefined;
    if (answer.status === null)
        return {
            outcome: 'unknown',
            reason: 'the client did not finish in time; check the tracker before retrying',
            lookup,
        };
    if (answer.status !== 0) {
        return {
            ...notCreated(
                drafts
                    .scrubText(
                        answer.stderr.split('\n')[0] ||
                            `the client exited with status ${answer.status}`,
                    )
                    .slice(0, 200),
                id,
            ),
            lookup,
        };
    }
    const url = ISSUE_URL.exec(answer.stdout)?.[0];
    if (!url)
        return {
            outcome: 'unknown',
            reason: 'the client reported success but its answer carried no issue address; check the tracker before retrying',
            lookup,
        };
    drafts.closeDraft(id, options.root);
    return { outcome: 'created', url, lookup };
}

/**
 * @param {{outcome: string, url?: string, reason?: string, recovery?: string, lookup?: string}} result - A submission result.
 * @returns {string} The lines to print: the outcome word first, then its address or reason and recovery step.
 */
function formatOutcome(result) {
    const lines = [`[feedback] ${result.outcome}${result.url ? `: ${result.url}` : ''}`];
    if (result.reason) lines.push(`  ${result.reason}`);
    if (result.recovery) lines.push(`  Next: ${result.recovery}`);
    if (result.lookup) lines.push(`  Note: ${result.lookup}`);
    return lines.join('\n');
}

module.exports = { OUTCOMES, submitDraft, formatOutcome };
