const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../');
const nodeDist = path.join(__dirname, 'dist');

console.log('🚀 Starting build...');

// 1. Clean dist
if (fs.existsSync(nodeDist)) {
    fs.rmSync(nodeDist, { recursive: true, force: true });
}
fs.mkdirSync(nodeDist, { recursive: true });

// 2. Copy .magic and .agent
['/.magic', '/.agent'].forEach(dir => {
    const src = path.join(repoRoot, dir);
    const dest = path.join(nodeDist, dir);
    if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true, force: true });
        console.log(`✅ Copied ${dir}`);
    } else {
        console.warn(`⚠️ Warning: ${src} not found`);
    }
});

// 3. Copy adapters.json
const adaptersSrc = path.join(repoRoot, 'installers', 'adapters.json');
const adaptersDest = path.join(nodeDist, 'adapters.json');
if (fs.existsSync(adaptersSrc)) {
    fs.copyFileSync(adaptersSrc, adaptersDest);
    console.log('✅ Copied adapters.json');
}

// 4. Copy README and LICENSE
['README.md', 'LICENSE'].forEach(f => {
    const src = path.join(repoRoot, f);
    const dest = path.join(nodeDist, f);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✅ Copied ${f}`);
    }
});

// 5. Copy index.js and package.json
['index.js', 'package.json'].forEach(f => {
    const src = path.join(__dirname, f);
    const dest = path.join(nodeDist, f);
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied ${f}`);
});

console.log('🎉 Build complete in dist/');
