const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../../');
const partnerDir = path.join(rootDir, 'partner-test');
const wwwDir = path.resolve(__dirname, '../www');

console.log('Building Partner Mobile App assets...');

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

// 1. Copy partner.html as the primary index.html entry point for Capacitor
copyFile(path.join(partnerDir, 'partner.html'), path.join(wwwDir, 'index.html'));

// 2. Copy dependencies from partner-test
const deps = ['styles.css', 'data.js', 'services.js', 'partner.js'];
deps.forEach((dep) => {
  copyFile(path.join(partnerDir, dep), path.join(wwwDir, dep));
});

// 3. Copy mobile bridge
copyFile(path.join(rootDir, 'mobile-bridge.js'), path.join(wwwDir, 'mobile-bridge.js'));

// 4. Update the mobile-bridge script path in index.html
const indexHtmlPath = path.join(wwwDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let content = fs.readFileSync(indexHtmlPath, 'utf8');
  content = content.replace(/src="\.\.\/mobile-bridge\.js"/g, 'src="mobile-bridge.js"');
  fs.writeFileSync(indexHtmlPath, content, 'utf8');
  console.log('Normalized script paths in apps/partner/www/index.html');
}

console.log('Partner mobile web assets successfully prepared in apps/partner/www/');
