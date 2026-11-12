#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SYNC — GRAPH AREA
// ═══════════════════════════════════════════════════════════════════════════
//
// Brings the wiki of the specification graph, and the artifact index that
// follows it, back in line with the specifications (SY-1). `export-wiki`
// prunes the wiki and rewrites every page on each run, which would write on
// every `sync` and delete a page nobody asked it to (SY-3, SY-5). So the
// wiki is rendered into a scratch folder outside the project with `--out`
// (which retires no legacy artifact and refreshes no index), each page is
// compared with the stored one, and only a page that differs is copied. A
// stored page no specification produces any more is reported with the
// command that removes it. The index is refreshed only after a page was
// written, through the executor, which gives the indexer its runtime flag.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { graphPaths } = require('../utils');

const EXECUTOR = path.join(__dirname, '..', 'executor.js');

/**
 * The Markdown pages of a folder, by name; an absent folder has none.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function pagesOf(dir) {
    try {
        return fs.readdirSync(dir).filter((name) => name.endsWith('.md'));
    } catch {
        return [];
    }
}

/**
 * Names the pages of `rendered` whose bytes differ from the stored page of the same name.
 *
 * @param {string} renderedDir
 * @param {string} wikiDir
 * @returns {string[]}
 */
function changedPages(renderedDir, wikiDir) {
    return pagesOf(renderedDir).filter((name) => {
        try {
            return !fs
                .readFileSync(path.join(renderedDir, name))
                .equals(fs.readFileSync(path.join(wikiDir, name)));
        } catch {
            return true; // not stored yet
        }
    });
}

/**
 * Runs the `graph` area.
 *
 * @param {{report: ReturnType<import('./sync-report').createReport>, projectRoot: string, designAbs: string}} ctx
 */
function syncGraph(ctx) {
    const { report, projectRoot, designAbs } = ctx;
    const wikiDir = graphPaths(designAbs).wiki;
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'magicspec-sync-wiki-'));
    try {
        const run = spawnSync(process.execPath, [EXECUTOR, 'export-wiki', '--out', scratch], {
            cwd: projectRoot,
            // A preview renders with the extraction cache read-only (it honors MAGIC_DRY_RUN).
            env: report.dryRun ? { ...process.env, MAGIC_DRY_RUN: '1' } : process.env,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
        });
        if (run.status !== 0) {
            report.disagreements.push({
                location: 'the specification graph',
                difference: `the wiki could not be rendered (${(run.stderr || '').trim().split('\n')[0] || `exit ${run.status}`})`,
                command: '/magicspec graph',
            });
            return;
        }
        const changed = changedPages(scratch, wikiDir);
        if (changed.length === 0) {
            report.inSync += 1;
        } else {
            if (!report.dryRun) {
                fs.mkdirSync(wikiDir, { recursive: true });
                for (const name of changed)
                    fs.copyFileSync(path.join(scratch, name), path.join(wikiDir, name));
            }
            report.written.push({
                area: 'graph',
                file: `${report.shown(wikiDir)}/`,
                what: `${changed.length} page${changed.length === 1 ? '' : 's'} (${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ', …' : ''}), then the artifact index`,
            });
            if (!report.dryRun) {
                spawnSync(process.execPath, [EXECUTOR, 'memory-index'], {
                    cwd: projectRoot,
                    env: process.env,
                    encoding: 'utf8',
                });
            }
        }
        const rendered = new Set(pagesOf(scratch));
        for (const name of pagesOf(wikiDir)) {
            if (rendered.has(name)) continue;
            report.stale.push({
                file: report.shown(path.join(wikiDir, name)),
                command: `node ${report.shown(EXECUTOR)} export-wiki`,
            });
        }
    } finally {
        fs.rmSync(scratch, { recursive: true, force: true });
    }
}

module.exports = { syncGraph };
