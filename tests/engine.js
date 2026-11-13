#!/usr/bin/env node
// @ts-check
'use strict';

const { describe } = require('node:test');

// The harness: one `describe`, and the domain modules registered in the order their sections had.
// Run it as `node --test tests/engine.js` or `node tests/engine.js`.
describe('Magic Engine Scripts', () => {
    require('./engine/manifest')();
    require('./engine/init-sync-context')();
    require('./engine/engine-meta')();
    require('./engine/skill-wrappers')();
    require('./engine/registry-and-settings')();
    require('./engine/bloat-and-prerequisites')();
    require('./engine/finalize-session')();
    require('./engine/archiver')();
    require('./engine/state-progress')();
    require('./engine/state-goal')();
    require('./engine/executor-input-and-hooks')();
    require('./engine/scanners-and-context')();
    require('./engine/diagnostics')();
    require('./engine/release-changelog')();
    require('./engine/analysis-scripts')();
    require('./engine/resume-and-checkpoint')();
    require('./engine/shipped-text-core')();
    require('./engine/input-pass')();
    require('./engine/feedback')();
    require('./engine/routing-and-constitution')();
    require('./engine/project-root-and-graph-folder')();
    require('./engine/skill-folder')();
    require('./engine/hardening')();
    require('./engine/migrate')();
    require('./engine/release-archive')();
    require('./engine/command-line-contract')();
    require('./engine/workspace-routing')();
    require('./engine/registered-folders-and-caches')();
    require('./engine/community-files')();
    require('./engine/artifact-index')();
    require('./engine/sync-command')();
    require('./engine/toolchain-and-runtime')();
    require('./engine/layout')();
});
