// @ts-check
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { TESTS_DIR } = require('./lib/base');

/** The most lines a domain module may hold (the layout's soft bound). */
const MODULE_LINE_BOUND = 2500;
/** The most bytes an area file of the cognitive suite may hold. */
const AREA_BYTE_BOUND = 60 * 1024;

module.exports = () => {
    test('harness layout: the entry registers every domain module exactly once, holds no case itself, no module is missing or left out, and none passes the line bound (HL-1, HL-2, HL-7)', () => {
        const entry = fs.readFileSync(path.join(TESTS_DIR, 'engine.js'), 'utf8');
        const registered = [...entry.matchAll(/require\('\.\/engine\/([\w-]+)'\)\(\)/g)].map(
            (m) => m[1],
        );
        const dir = path.join(TESTS_DIR, 'engine');
        const onDisk = fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isFile() && e.name.endsWith('.js'))
            .map((e) => e.name.slice(0, -3))
            .sort();

        assert.ok(registered.length > 0, 'the entry registers modules');
        assert.strictEqual(new Set(registered).size, registered.length, 'no module twice');
        assert.deepStrictEqual(
            [...registered].sort(),
            onDisk,
            'the registered modules are exactly the modules on disk',
        );
        assert.ok(
            !registered.includes('lib') && fs.existsSync(path.join(dir, 'lib')),
            'the helper layers are required, never registered as a domain',
        );
        assert.ok(!/^\s*test\(/m.test(entry), 'the entry holds no case of its own');
        assert.ok(entry.startsWith('#!/usr/bin/env node'), 'the entry keeps its shebang');
        assert.strictEqual(
            (entry.match(/describe\('Magic Engine Scripts'/g) ?? []).length,
            1,
            'one describe',
        );
        for (const name of onDisk) {
            const lines = fs.readFileSync(path.join(dir, `${name}.js`), 'utf8').split('\n').length;
            assert.ok(lines <= MODULE_LINE_BOUND, `${name}.js holds ${lines} lines`);
        }
    });

    test('suite layout: every case identifier appears once across the area files, each index row lists exactly the identifiers and the count of its file, no area file is missing, and Last is the greatest identifier (SL-1, SL-3, SL-5)', () => {
        const index = fs.readFileSync(path.join(TESTS_DIR, 'suite.md'), 'utf8');
        const dir = path.join(TESTS_DIR, 'suite');
        const files = fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.md'))
            .sort();
        assert.ok(files.length > 0, 'area files exist');
        assert.ok(!/^### T\d+/m.test(index), 'the index holds no case');

        const idsOf = new Map();
        const all = [];
        for (const file of files) {
            const body = fs.readFileSync(path.join(dir, file), 'utf8');
            assert.ok(Buffer.byteLength(body) <= AREA_BYTE_BOUND, `${file} passes the size bound`);
            const headers = body.match(/^### T\d+\b.*$/gm) ?? [];
            const malformed = headers.filter((h) => !/^### T\d+ — \S/.test(h));
            assert.deepStrictEqual(malformed, [], `${file}: every header is "### T{N} — {name}"`);
            const ids = headers.map((h) => Number(/^### T(\d+)/.exec(h)[1]));
            idsOf.set(file, ids);
            all.push(...ids);
        }
        assert.strictEqual(new Set(all).size, all.length, 'no identifier appears twice');

        const expand = (text) =>
            text.split(', ').flatMap((part) => {
                const m = /^T(\d+)(?:–T(\d+))?$/.exec(part.trim());
                assert.ok(m, `an identifier range: ${part}`);
                const from = Number(m[1]);
                const to = m[2] ? Number(m[2]) : from;
                return Array.from({ length: to - from + 1 }, (_, i) => from + i);
            });
        const rows = [
            ...index.matchAll(
                /^\| [^|]+ \| \[suite\/([^\]]+)\]\([^)]*\) \| (\d+) \| ([^|]+) \| [^|]+ \|$/gm,
            ),
        ];
        assert.deepStrictEqual(
            rows.map((r) => r[1]).sort(),
            files,
            'the index lists every area file, once',
        );
        for (const [, file, count, ranges] of rows) {
            const ids = [...idsOf.get(file)].sort((a, b) => a - b);
            assert.deepStrictEqual(expand(ranges), ids, `${file}: the listed identifiers`);
            assert.strictEqual(Number(count), ids.length, `${file}: the listed count`);
        }

        const closing = [
            ...index.matchAll(/\*\*Test Suite Finalized\*\* - v([\d.]+) \(Last: T(\d+)\)/g),
        ];
        assert.strictEqual(closing.length, 1, 'one closing line');
        assert.strictEqual(
            Number(closing[0][2]),
            Math.max(...all),
            'Last is the greatest identifier',
        );
        assert.strictEqual(
            closing[0][1],
            /\*\*Version:\*\* ([\d.]+)/.exec(index)[1],
            'the closing line carries the suite version',
        );
    });
};
