// This script runs after the app is packed, before creating the installer
// It removes problematic macOS symlinks that cause issues on Windows
const path = require('path');
const fs = require('fs');

exports.default = async function afterPack(context) {
    const resourcesDir = context.packager.platform.name === 'windows'
        ? path.join(context.appOutDir, 'resources')
        : path.join(context.appOutDir, 'Contents', 'Resources');

    // Find and remove the darwin folder if it exists (macOS binaries we don't need)
    const appDir = path.dirname(resourcesDir);
    const possiblePaths = [
        path.join(appDir, 'darwin'),
        path.join(resourcesDir, 'darwin'),
        path.join(appDir, '..', 'darwin')
    ];

    for (const darwinPath of possiblePaths) {
        if (fs.existsSync(darwinPath)) {
            try {
                fs.rmSync(darwinPath, { recursive: true, force: true });
                console.log(`Removed: ${darwinPath}`);
            } catch (err) {
                console.log(`Could not remove ${darwinPath}: ${err.message}`);
            }
        }
    }
};
