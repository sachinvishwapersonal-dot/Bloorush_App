const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');

// Clean and recreate www directory
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

// Helper to copy file
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${path.basename(src)} -> www/`);
  }
}

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`Copied directory ${path.basename(src)} -> www/${path.basename(dest)}`);
}

// 1. Copy index.html
copyFile(path.join(rootDir, 'index.html'), path.join(wwwDir, 'index.html'));

// 2. Copy mobile-bridge.js
copyFile(path.join(rootDir, 'mobile-bridge.js'), path.join(wwwDir, 'mobile-bridge.js'));

// 3. Copy partner-test folder
copyDir(path.join(rootDir, 'partner-test'), path.join(wwwDir, 'partner-test'));

console.log('Mobile web assets successfully prepared in www/');
