const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist-react', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[fix-electron-assets] dist-react/index.html not found');
  process.exit(1);
}

const original = fs.readFileSync(indexPath, 'utf8');
const fixed = original.replace(/\s+crossorigin(?=(\s|>))/g, '');

if (fixed !== original) {
  fs.writeFileSync(indexPath, fixed, 'utf8');
  console.log('[fix-electron-assets] Removed crossorigin attributes for Electron file:// compatibility');
} else {
  console.log('[fix-electron-assets] No crossorigin attributes found, nothing changed');
}
