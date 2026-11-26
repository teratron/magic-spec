// @ts-check
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CREATED FILES (the file names a task's Creates writes)
// ═══════════════════════════════════════════════════════════════════════════
//
// A task of a 4.0 document set names the files it creates in prose, among other words. The pack
// reads them to show what earlier tasks built, and `mark-built` to write a component's map row;
// both read them the same way, from here.

/** A task address, which the `(extends M{n}.T{k})` marker writes beside a file name. */
const TASK_ADDRESS = /^M\d+\.T\d+$/;

/**
 * The file names written in a task's Creates text: words with an extension, such as
 * `src/hello.rs` or `` `go.mod` ``, a task address left out. A word that is not a file of the
 * project is dropped by the caller that reads the files.
 *
 * @param {string} creates - The Creates field.
 * @returns {string[]} Distinct names, in the order written.
 */
function fileNamesIn(creates) {
    const names = creates.match(/[\w./-]+/g) ?? [];
    return [
        ...new Set(
            names.filter((n) => /^[\w./-]*[\w-]\.[A-Za-z0-9]+$/.test(n) && !TASK_ADDRESS.test(n)),
        ),
    ];
}

module.exports = {
    fileNamesIn,
};
