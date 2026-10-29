'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// FILE LOCK (one writer at a time for a read-modify-write)
// ═══════════════════════════════════════════════════════════════════════════
//
// Parallel tracks of one run each report to the same STATE.md. Each report reads the file,
// changes a section and writes it back, so two at once keep only the later write. A lock file,
// created with an exclusive flag, lets one writer at a time through; the others wait their turn.
// A lock left behind by a process that was killed is judged stale by its age and taken over.

/** How long a waiter keeps trying, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15000;
/** Age after which a lock is taken to belong to a process that no longer exists. */
const DEFAULT_STALE_MS = 30000;

/**
 * Sleeps without burning a core.
 *
 * @param {number} ms - Milliseconds.
 * @returns {void}
 */
function pause(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Runs a function while holding an exclusive lock on a path.
 *
 * @template T
 * @param {string} lockPath - The lock file (created and removed by this function).
 * @param {function(): T} fn - The critical section.
 * @param {{timeoutMs?: number, staleMs?: number}} [options] - Waiting limits.
 * @returns {T} What `fn` returns.
 * @throws {Error} When the lock cannot be taken within the timeout.
 */
function withFileLock(lockPath, fn, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });

    const deadline = Date.now() + timeoutMs;
    let fd = null;
    for (;;) {
        try {
            fd = fs.openSync(lockPath, 'wx');
            fs.writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
            break;
        } catch (err) {
            // On Windows a lock that is being removed can answer EPERM or EACCES instead of EEXIST.
            if (!['EEXIST', 'EPERM', 'EACCES'].includes(err.code)) throw err;
            try {
                if (Date.now() - fs.statSync(lockPath).mtimeMs > staleMs) {
                    fs.unlinkSync(lockPath);
                    continue;
                }
            } catch {
                /* the holder released it between the two calls: try again at once */
            }
            if (Date.now() > deadline) {
                throw new Error(
                    `Timed out after ${timeoutMs} ms waiting for ${lockPath}. If no other engine command is running, delete that file.`,
                );
            }
            pause(20 + Math.floor(Math.random() * 30));
        }
    }

    try {
        return fn();
    } finally {
        try {
            fs.closeSync(fd);
        } catch {
            /* already closed */
        }
        try {
            fs.unlinkSync(lockPath);
        } catch {
            /* already gone */
        }
    }
}

module.exports = { withFileLock };
