const { spawnSync } = require('child_process');
const path = require('path');

console.log('📦 Publishing to npm from dist/...');

const result = spawnSync('npm', ['publish', '--access', 'public'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, 'dist'),
});

if (result.status === 0) {
    console.log('✅ magic-spec published to npm successfully!');
} else {
    console.error('❌ Failed to publish to npm.');
    process.exit(result.status || 1);
}
