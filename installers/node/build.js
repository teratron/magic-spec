const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DIST = path.join(__dirname, 'dist');

console.log('--- Assembling Node.js Package ---');

// 1. Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// 2. Synchronize engine files from root
const toCopy = ['.magic', '.agent', 'adapters'];
toCopy.forEach(dir => {
    const src = path.join(ROOT, dir);
    const dest = path.join(DIST, dir);
    if (fs.existsSync(src)) {
        console.log(`Syncing ${dir}...`);
        fs.cpSync(src, dest, { recursive: true });
    } else {
        console.warn(`Warning: ${dir} not found in root.`);
    }
});

// 3. Copy local installer files
console.log('Copying index.js...');
fs.copyFileSync(path.join(__dirname, 'index.js'), path.join(DIST, 'index.js'));

console.log('Copying package.json...');
fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(DIST, 'package.json'));

// 4. Copy README from root
console.log('Copying README.md...');
fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(DIST, 'README.md'));

console.log('Done! Package assembled in: installers/node/dist/');
