const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// rootDir is now 2 levels up from installers/node/
const rootDir = path.resolve(__dirname, '../..');
const envFile = process.env.PUBLISH_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.join(rootDir, envFile);

console.log(`📡 Using native Node.js env loader for ${envFile}...`);

if (fs.existsSync(envPath)) {
    try {
        process.loadEnvFile(envPath);
    } catch (err) {
        console.warn(`⚠️  Warning: Failed to load ${envFile} using process.loadEnvFile().`);
        console.warn(err.message);
    }
} else {
    console.warn(`⚠️  Warning: ${envFile} not found at root (${rootDir}). Using existing process environment.`);
}

if (!process.env.NPM_TOKEN && process.env.PUBLISH_ENV === 'production') {
    console.error('❌ Error: NPM_TOKEN is required for production publish but not found in environment.');
    process.exit(1);
}

console.log('📦 Publishing to npm from dist/...');

// Run npm publish using the loaded environment
const result = spawnSync('npm', ['publish', '--access', 'public'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, 'dist'),
    env: process.env
});

if (result.status === 0) {
    console.log('✅ magic-spec published to npm successfully!');
} else {
    console.error('❌ Failed to publish to npm.');
    process.exit(result.status || 1);
}
