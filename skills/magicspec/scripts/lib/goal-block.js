'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// GOAL BLOCK (Shared Library)
// ═══════════════════════════════════════════════════════════════════════════
//
// The goal `/magicspec goal` pursues lives in one section of STATE.md, `## Goal`:
// the statement, a phase or a task limit, an optional stated bound, the two counters the
// stop conditions read, each criterion with its state and the consents queued
// until the mode stops. One module renders it, parses it and checks it, so the
// writer (`update-state.js`) and the reader (`resume-state.js`) cannot come to
// disagree about its layout. The section is wholly engine-owned: it is rebuilt from a
// validated object on every write and is never patched line by line.

/** The heading that opens the section; absent from a STATE.md that records no goal. */
const GOAL_HEADING = '## Goal';

/** Most lines the section may hold, heading and comment included. */
const MAX_GOAL_LINES = 28;

/** Longest single text (statement, criterion, check, consent), in characters. */
const MAX_TEXT = 300;

/** The states a criterion is in. */
const CRITERION_STATES = Object.freeze(['open', 'met', 'blocked']);

/** The keys a goal object may carry; anything else is refused. */
const GOAL_KEYS = Object.freeze([
    'statement',
    'phase',
    'taskLimit',
    'bound',
    'withoutProgress',
    'tasksDone',
    'iterations',
    'phasesDone',
    'started',
    'criteria',
    'consents',
]);

const SECTION_COMMENT =
    '<!-- Written by update-state only; this section is absent when no goal is recorded. -->';

/** Raised for a goal object the section cannot hold; the caller records it and writes nothing. */
class GoalError extends Error {
    /** @param {string} message */
    constructor(message) {
        super(message);
        this.name = 'GoalError';
    }
}

// ───────────────────────────────────────────────────────────────────────────
// Normalization
// ───────────────────────────────────────────────────────────────────────────

/**
 * Reduces a text to one physical line: whitespace runs become one space and the
 * separator the criterion and consent lines use (` — `) becomes ` - `, so a
 * line can always be split back at its first separator.
 *
 * @param {unknown} value - Any value; a non-string is refused.
 * @param {string} label - What the text is, for the message.
 * @returns {string} The text, trimmed.
 * @throws {GoalError} When the value is not a string or is longer than the bound.
 */
function oneLine(value, label) {
    if (typeof value !== 'string') throw new GoalError(`${label} must be a string.`);
    const text = value.replace(/\s+/g, ' ').replace(/ — /g, ' - ').trim();
    if (text.length > MAX_TEXT) {
        throw new GoalError(`${label} is ${text.length} characters; the bound is ${MAX_TEXT}.`);
    }
    return text;
}

/**
 * Reads a whole number a field holds.
 *
 * @param {unknown} value - The field, or `undefined` for its default.
 * @param {string} label - The field's name, for the message.
 * @param {number} min - The smallest value allowed.
 * @param {number|null} fallback - The default for an absent field; `null` means absent stays null.
 * @returns {number|null}
 * @throws {GoalError} When the field is present and is not a whole number of at least `min`.
 */
function wholeNumber(value, label, min, fallback) {
    if (value === undefined || value === null) return fallback;
    if (!Number.isInteger(value) || value < min) {
        throw new GoalError(`${label} must be a whole number of at least ${min}.`);
    }
    return value;
}

/**
 * Reads the moment the goal was started, which a bound of elapsed time is measured from.
 *
 * @param {unknown} value - A date or a date and time, or `undefined` for none.
 * @returns {string|null}
 * @throws {GoalError} When the value is present and is not a date.
 */
function readStarted(value) {
    if (value === undefined || value === null) return null;
    const text = oneLine(value, 'started');
    if (text === '' || Number.isNaN(Date.parse(text))) {
        throw new GoalError('started must be a date or a date and time.');
    }
    return text;
}

/**
 * Checks one list of `{a, b}` items and reduces each text to one line.
 *
 * @param {unknown} list - The field, or `undefined`.
 * @param {string} label - The field's name.
 * @param {(item: object, at: string) => object} read - Reads one item.
 * @returns {object[]}
 * @throws {GoalError} When the field is not a list.
 */
function readList(list, label, read) {
    if (list === undefined || list === null) return [];
    if (!Array.isArray(list)) throw new GoalError(`${label} must be a list.`);
    return list.map((item, index) => {
        if (item === null || typeof item !== 'object') {
            throw new GoalError(`${label}[${index}] must be an object.`);
        }
        return read(item, `${label}[${index}]`);
    });
}

/**
 * Checks a goal object against the closed schema and returns it in the one form
 * the renderer reads. At least one of `statement`, `phase` and `taskLimit` names
 * what the goal is.
 *
 * @param {unknown} input - The parsed JSON the caller passed.
 * @returns {{statement: string|null, phase: number|null, taskLimit: number|null,
 *   bound: string|null, withoutProgress: number, tasksDone: number, iterations: number,
 *   phasesDone: number, started: string|null,
 *   criteria: {state: string, text: string, check: string}[],
 *   consents: {action: string, reason: string}[]}}
 * @throws {GoalError} For any shape the section cannot hold.
 */
function normalizeGoal(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new GoalError('The goal must be an object.');
    }
    for (const key of Object.keys(input)) {
        if (!GOAL_KEYS.includes(key)) throw new GoalError(`Unknown goal field '${key}'.`);
    }
    const statement =
        input.statement === undefined || input.statement === null
            ? null
            : oneLine(input.statement, 'statement') || null;
    const phase = wholeNumber(input.phase, 'phase', 1, null);
    const taskLimit = wholeNumber(input.taskLimit, 'taskLimit', 1, null);
    if (statement === null && phase === null && taskLimit === null) {
        throw new GoalError('A goal needs a statement, a phase or a task limit.');
    }
    const bound =
        input.bound === undefined || input.bound === null
            ? null
            : oneLine(input.bound, 'bound') || null;

    const criteria = readList(input.criteria, 'criteria', (item, at) => {
        if (!CRITERION_STATES.includes(item.state)) {
            throw new GoalError(`${at}.state must be one of ${CRITERION_STATES.join(', ')}.`);
        }
        const text = oneLine(item.text, `${at}.text`);
        if (text === '') throw new GoalError(`${at}.text must not be empty.`);
        const check = item.check === undefined ? '' : oneLine(item.check, `${at}.check`);
        return { state: item.state, text, check };
    });
    const consents = readList(input.consents, 'consents', (item, at) => {
        const action = oneLine(item.action, `${at}.action`);
        const reason = oneLine(item.reason, `${at}.reason`);
        if (action === '' || reason === '') {
            throw new GoalError(`${at} needs an action and a reason.`);
        }
        return { action, reason };
    });

    return {
        statement,
        phase,
        taskLimit,
        bound,
        withoutProgress: wholeNumber(input.withoutProgress, 'withoutProgress', 0, 0),
        tasksDone: wholeNumber(input.tasksDone, 'tasksDone', 0, 0),
        iterations: wholeNumber(input.iterations, 'iterations', 0, 0),
        phasesDone: wholeNumber(input.phasesDone, 'phasesDone', 0, 0),
        started: readStarted(input.started),
        criteria,
        consents,
    };
}

// ───────────────────────────────────────────────────────────────────────────
// Rendering
// ───────────────────────────────────────────────────────────────────────────

/**
 * Renders the section for a normalized goal. The text runs from the heading to
 * its last line and ends in one line break, the shape every engine-owned
 * section of STATE.md has, so the blank line before the next heading is the
 * file's own.
 *
 * @param {ReturnType<typeof normalizeGoal>} goal - A normalized goal.
 * @returns {string} The section text.
 * @throws {GoalError} When the section would be longer than the bound.
 */
function renderGoalSection(goal) {
    const lines = [GOAL_HEADING, '', SECTION_COMMENT, ''];
    if (goal.statement !== null) lines.push(`- **Goal:** ${goal.statement}`);
    if (goal.phase !== null) lines.push(`- **Target phase:** ${goal.phase}`);
    if (goal.taskLimit !== null) lines.push(`- **Task limit:** ${goal.taskLimit}`);
    if (goal.bound !== null) lines.push(`- **Bound:** ${goal.bound}`);
    lines.push(`- **Without progress:** ${goal.withoutProgress}`);
    lines.push(`- **Tasks done:** ${goal.tasksDone}`);
    lines.push(`- **Iterations:** ${goal.iterations}`);
    lines.push(`- **Phases done:** ${goal.phasesDone}`);
    if (goal.started !== null) lines.push(`- **Started:** ${goal.started}`);
    for (const { state, text, check } of goal.criteria) {
        lines.push(`- [${state}] ${text}${check === '' ? '' : ` — ${check}`}`);
    }
    for (const { action, reason } of goal.consents) lines.push(`- [consent] ${action} — ${reason}`);
    if (lines.length > MAX_GOAL_LINES) {
        throw new GoalError(
            `The goal section would be ${lines.length} lines; the bound is ${MAX_GOAL_LINES}.`,
        );
    }
    return `${lines.join('\n')}\n`;
}

// ───────────────────────────────────────────────────────────────────────────
// Parsing
// ───────────────────────────────────────────────────────────────────────────

/**
 * Splits a criterion or consent line at its first separator.
 *
 * @param {string} rest - The text after the state marker.
 * @returns {[string, string]} The text and what follows the separator (empty when none).
 */
function splitAtSeparator(rest) {
    const at = rest.indexOf(' — ');
    return at === -1 ? [rest.trim(), ''] : [rest.slice(0, at).trim(), rest.slice(at + 3).trim()];
}

/**
 * Reads the goal a STATE.md records. Tolerant by design — it is the reader a
 * resuming session depends on: a line it does not know is skipped, and a file
 * with no goal section, or one that names no goal, gives `null`.
 *
 * @param {string} stateText - The text of STATE.md.
 * @returns {ReturnType<typeof normalizeGoal>|null} The goal, or `null` when none is recorded.
 */
function parseGoalSection(stateText) {
    const heading = /^## Goal\b/m.exec(stateText);
    if (!heading) return null;
    const next = stateText.indexOf('\n## ', heading.index + 1);
    const section = stateText.slice(heading.index, next === -1 ? stateText.length : next);

    const goal = {
        statement: null,
        phase: null,
        taskLimit: null,
        bound: null,
        withoutProgress: 0,
        tasksDone: 0,
        iterations: 0,
        phasesDone: 0,
        started: null,
        criteria: [],
        consents: [],
    };
    const count = (text) => (/^\d+$/.test(text) ? Number(text) : 0);
    const field = /^- \*\*([^*:]+):\*\* ?(.*)$/;
    const item = /^- \[(open|met|blocked|consent)\] (.*)$/;
    for (const raw of section.split(/\r?\n/)) {
        const asField = field.exec(raw);
        if (asField) {
            const [, label, value] = asField;
            if (label === 'Goal') goal.statement = value.trim() || null;
            else if (label === 'Target phase') goal.phase = count(value) || null;
            else if (label === 'Task limit') goal.taskLimit = count(value) || null;
            else if (label === 'Bound') goal.bound = value.trim() || null;
            else if (label === 'Without progress') goal.withoutProgress = count(value);
            else if (label === 'Tasks done') goal.tasksDone = count(value);
            else if (label === 'Iterations') goal.iterations = count(value);
            else if (label === 'Phases done') goal.phasesDone = count(value);
            else if (label === 'Started') goal.started = value.trim() || null;
            continue;
        }
        const asItem = item.exec(raw);
        if (!asItem) continue;
        const [text, after] = splitAtSeparator(asItem[2]);
        if (asItem[1] === 'consent') goal.consents.push({ action: text, reason: after });
        else goal.criteria.push({ state: asItem[1], text, check: after });
    }
    const names = goal.statement !== null || goal.phase !== null || goal.taskLimit !== null;
    return names ? goal : null;
}

// ───────────────────────────────────────────────────────────────────────────
// Description
// ───────────────────────────────────────────────────────────────────────────

/**
 * Counts the criteria by state.
 *
 * @param {ReturnType<typeof normalizeGoal>} goal - A goal.
 * @returns {{met: number, open: number, blocked: number}}
 */
function countCriteria(goal) {
    const counts = { met: 0, open: 0, blocked: 0 };
    for (const { state } of goal.criteria) counts[state] += 1;
    return counts;
}

/**
 * Names the scope of a goal in the words the commands use: the statement, `phase-N`,
 * `N tasks`, or the statement or phase with its task limit.
 *
 * @param {ReturnType<typeof normalizeGoal>} goal - A goal.
 * @returns {string}
 */
function describeScope(goal) {
    const parts = [];
    if (goal.statement !== null) parts.push(`"${goal.statement}"`);
    if (goal.phase !== null) parts.push(`phase-${goal.phase}`);
    if (goal.taskLimit !== null) parts.push(`${goal.taskLimit} tasks`);
    return parts.join(' ');
}

module.exports = {
    GOAL_HEADING,
    MAX_GOAL_LINES,
    MAX_TEXT,
    CRITERION_STATES,
    GoalError,
    normalizeGoal,
    renderGoalSection,
    parseGoalSection,
    countCriteria,
    describeScope,
};
