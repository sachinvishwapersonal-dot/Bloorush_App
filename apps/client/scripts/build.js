const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const wwwDir = path.resolve(__dirname, '../www');

console.log('Building Client Mobile App assets...');

if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${path.basename(src)} -> www/`);
  } else {
    console.warn(`Source file not found: ${src}`);
  }
}

// 1. Copy Client App index.html
copyFile(path.join(rootDir, 'index.html'), path.join(wwwDir, 'index.html'));

// 2. Copy mobile bridge
copyFile(path.join(rootDir, 'mobile-bridge.js'), path.join(wwwDir, 'mobile-bridge.js'));

console.log('Client mobile web assets successfully prepared in apps/client/www/');
