#!/usr/bin/env node
'use strict';

// Help and unknown options are answered before this script reads or writes anything.
require('./lib/commands').guardArgv('feedback', module);

const { parseFlags } = require('./utils');
const feedback = require('./lib/feedback');
const drafts = require('./lib/feedback-draft');
const submission = require('./lib/feedback-submit');

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK (Engine Feedback Channel, EF-1 to EF-12)
// ═══════════════════════════════════════════════════════════════════════════

/** Option flags that carry a note's text or a piece of what the caller saw fail. */
const VALUE_FLAGS = [
    '--kind',
    '--summary',
    '--tried',
    '--happened',
    '--expected',
    '--suggestion',
    '--impact',
    '--engine-file',
    '--code',
    '--workflow',
    '--script',
    '--exit-status',
];

/** The actions this command runs, in the order the help lists them. */
const ACTIONS = ['note', 'list', 'draft', 'submit', 'keep', 'discard'];

/**
 * Drafts the pending notes (or the problem of one note), or prints an existing draft again; every draft is printed in full.
 *
 * @param {string|undefined} target - A note identifier (`n2`), a draft identifier (`d1`) or nothing.
 * @returns {void}
 */
function runDraft(target) {
    if (target?.startsWith('d')) {
        const shown = drafts.showDraft(target);
        console.log(shown.draft ? drafts.renderDraft(shown.draft) : `[feedback] ${shown.message}`);
        return;
    }
    const created = drafts.createDrafts(target);
    for (const draft of created.drafts) console.log(`${drafts.renderDraft(draft)}\n`);
    if (created.message) console.log(`[feedback] ${created.message}`);
}

/**
 * Keeps a draft as text: prints it in full for the person to copy and closes it, its notes with it.
 *
 * @param {string|undefined} target - A draft identifier.
 * @returns {void}
 */
function runKeep(target) {
    const shown = drafts.showDraft(target);
    if (!shown.draft) {
        console.log(`[feedback] ${shown.message}`);
        return;
    }
    console.log(drafts.renderDraft(shown.draft));
    const closed = drafts.closeDraft(target);
    console.log(
        `[feedback] ${closed.closed ? `Draft ${target} closed as text; its notes are delivered.` : `Draft ${target} not closed (dry run).`}`,
    );
}

/**
 * Discards a note or a whole draft with the notes it holds.
 *
 * @param {string|undefined} target - A note identifier or a draft identifier.
 * @returns {void}
 */
function runDiscard(target) {
    if (target?.startsWith('d')) {
        const closed = drafts.closeDraft(target);
        console.log(
            `[feedback] ${closed.draft ? `Discarded draft ${target} and its ${closed.draft.noteIds.length} note${closed.draft.noteIds.length === 1 ? '' : 's'}.` : `No draft ${target}.`}`,
        );
        return;
    }
    console.log(`[feedback] ${feedback.discardNote(target).message}`);
}

/**
 * Runs one action of the channel and prints its outcome. Every path ends with exit status 0:
 * recording or listing a note must never fail a workflow (EF-11), so a fault inside the
 * channel is one line on the output and nothing more.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {void}
 */
function runCli(argv = process.argv.slice(2)) {
    const { values, flags, rest, errors } = parseFlags(argv, {
        valueFlags: VALUE_FLAGS,
        boolFlags: ['--new'],
    });
    if (errors.length > 0) {
        console.warn(`[feedback] ${errors[0]}`);
        return;
    }
    const [action, target] = rest;
    try {
        if (action === 'note') {
            const outcome = feedback.addNote(
                {
                    kind: values['--kind'],
                    summary: values['--summary'],
                    tried: values['--tried'],
                    happened: values['--happened'],
                    expected: values['--expected'],
                    suggestion: values['--suggestion'],
                    impact: values['--impact'],
                    engineFile: values['--engine-file'],
                    code: values['--code'],
                    workflow: values['--workflow'],
                },
                { script: values['--script'], exitStatus: values['--exit-status'] },
            );
            console.log(`[feedback] ${outcome.message}`);
        } else if (action === 'list') {
            console.log(
                [feedback.formatNotes(feedback.listNotes()), feedback.formatOpenFindings()]
                    .filter(Boolean)
                    .join('\n\n'),
            );
        } else if (action === 'draft') {
            runDraft(target);
        } else if (action === 'submit') {
            console.log(
                submission.formatOutcome(
                    submission.submitDraft(target, { forceNew: flags['--new'] }),
                ),
            );
        } else if (action === 'keep') {
            runKeep(target);
        } else if (action === 'discard') {
            runDiscard(target);
        } else {
            console.log(`[feedback] Actions: ${ACTIONS.join(', ')}. See: feedback --help`);
        }
    } catch (e) {
        console.warn(`[feedback] ${e.message}`);
    }
}

if (require.main === module) {
    runCli();
    process.exit(0);
}

module.exports = { runCli, ACTIONS };
