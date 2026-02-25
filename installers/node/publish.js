const { execSync } = require('child_process');
const path = require('path');

const DIST = path.join(__dirname, 'dist');

console.log('--- Publishing Node.js Package ---');

try {
    // Run npm publish from the dist directory
    // Note: requires npm login previously
    execSync('npm publish --access public', {
        cwd: DIST,
        stdio: 'inherit'
    });
    console.log('Successfully published to npm.');
} catch (err) {
    console.error('Publish failed:', err.message);
    process.exit(1);
}
