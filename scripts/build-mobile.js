const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('Building all mobile apps (Client & Partner)...');
execSync('node apps/client/scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
execSync('node apps/partner/scripts/build.js', { cwd: rootDir, stdio: 'inherit' });
console.log('All mobile apps successfully built.');
