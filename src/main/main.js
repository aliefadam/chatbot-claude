const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

function parseEnvFile(envPath) {
    if (!fs.existsSync(envPath)) return {};
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    const env = {};
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIndex = line.indexOf('=');
        if (eqIndex <= 0) continue;
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
    return env;
}

function loadAppEnv() {
    const appRoot = app.getAppPath();
    const envCandidates = [
        path.join(appRoot, '.env'),
        path.join(process.cwd(), '.env')
    ];
    for (const envPath of envCandidates) {
        const parsed = parseEnvFile(envPath);
        if (Object.keys(parsed).length > 0) {
            return parsed;
        }
    }
    return {};
}

// Store windows
let mainWindow = null;

// Global exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false // Allow loading local files
        },
        icon: path.join(__dirname, '../../assets/icon.png'),
        backgroundColor: '#ffffff',
        show: false,
        frame: true,
        titleBarStyle: 'default'
    });

    // Load React build
    const indexPath = path.join(__dirname, '../../dist-react/index.html');
    mainWindow.loadFile(indexPath);

    // Open DevTools in development
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('Main window displayed');
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Log any loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });
}

// Wait for app to be ready
app.whenReady().then(() => {
    // Configure logging
    log.transports.file.level = 'info';
    log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');
    log.info('App started');

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Get API config path
function getApiConfigPath() {
    // In packaged app, config is in src/config/api-config.json
    // __dirname is resources/app/src/main/ (or inside asar)
    if (app.isPackaged) {
        // Use app.getAppPath() to get the root of the app
        const appRoot = app.getAppPath();
        // Navigate from app root to config file
        return path.join(appRoot, 'src', 'config', 'api-config.json');
    }
    return path.join(__dirname, '../config/api-config.json');
}

// Read API config
function readApiConfig() {
    const env = loadAppEnv();
    const envConfig = {
        baseUrl: process.env.API_BASE_URL || env.API_BASE_URL,
        authToken: process.env.API_AUTH_TOKEN || env.API_AUTH_TOKEN,
        model: process.env.API_MODEL || env.API_MODEL || 'claude-sonnet-4-6'
    };

    if (envConfig.baseUrl && envConfig.authToken) {
        return envConfig;
    }

    try {
        const configPath = getApiConfigPath();
        log.info('Reading API config from:', configPath);
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        log.info('API config loaded successfully');
        return config;
    } catch (error) {
        log.error('Failed to read API config:', error);
        // Fallback: try alternate paths
        const altPaths = [
            path.join(__dirname, 'api-config.json'),
            path.join(__dirname, '..', '..', 'config', 'api-config.json'),
            path.join(process.resourcesPath, 'app', 'src', 'config', 'api-config.json'),
        ];
        for (const altPath of altPaths) {
            try {
                if (fs.existsSync(altPath)) {
                    log.info('Found config at alternate path:', altPath);
                    const configData = fs.readFileSync(altPath, 'utf-8');
                    return JSON.parse(configData);
                }
            } catch (e) {
                // Continue to next path
            }
        }
        return null;
    }
}

// IPC Handlers
ipcMain.handle('read-api-config', () => {
    return readApiConfig();
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const buffer = fs.readFileSync(filePath);
        return { success: true, data: buffer };
    } catch (error) {
        log.error('Failed to read file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content: content };
    } catch (error) {
        log.error('Failed to read text file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        log.info('File written:', filePath);
        return { success: true };
    } catch (error) {
        log.error('Failed to write file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        log.info('File created:', filePath);
        return { success: true };
    } catch (error) {
        log.error('Failed to create file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-file', async (event, filePath) => {
    try {
        if (fs.statSync(filePath).isDirectory()) {
            fs.rmdirSync(filePath, { recursive: true });
        } else {
            fs.unlinkSync(filePath);
        }
        log.info('File deleted:', filePath);
        return { success: true };
    } catch (error) {
        log.error('Failed to delete file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = items.map(item => {
            const fullPath = path.join(dirPath, item.name);
            let stats = null;
            try {
                stats = fs.statSync(fullPath);
            } catch (e) {}
            return {
                name: item.name,
                path: fullPath,
                isDirectory: item.isDirectory(),
                size: stats ? stats.size : 0,
                modified: stats ? stats.mtime.toISOString() : null
            };
        }).sort((a, b) => {
            // Directories first, then by name
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        return { success: true, items: result };
    } catch (error) {
        log.error('Failed to list directory:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
    try {
        fs.mkdirSync(dirPath, { recursive: true });
        log.info('Directory created:', dirPath);
        return { success: true };
    } catch (error) {
        log.error('Failed to create directory:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return {
            success: true,
            stats: {
                size: stats.size,
                isDirectory: stats.isDirectory(),
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Project selection
ipcMain.handle('select-project-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result;
});

// Projects data (saved to disk)
ipcMain.handle('save-projects', async (event, projects) => {
    try {
        const dataPath = app.getPath('userData');
        const projectsPath = path.join(dataPath, 'projects.json');
        fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2));
        log.info('Projects saved');
        return { success: true };
    } catch (error) {
        log.error('Failed to save projects:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-projects', async () => {
    try {
        const dataPath = app.getPath('userData');
        const projectsPath = path.join(dataPath, 'projects.json');
        if (fs.existsSync(projectsPath)) {
            const data = fs.readFileSync(projectsPath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        log.error('Failed to load projects:', error);
        return [];
    }
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });
    return result;
});

ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('save-history', async (event, conversations) => {
    try {
        const dataPath = app.getPath('userData');
        const historyPath = path.join(dataPath, 'conversations.json');
        fs.writeFileSync(historyPath, JSON.stringify(conversations, null, 2));
        return { success: true };
    } catch (error) {
        log.error('Failed to save history:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-history', async () => {
    try {
        const dataPath = app.getPath('userData');
        const historyPath = path.join(dataPath, 'conversations.json');
        if (fs.existsSync(historyPath)) {
            const data = fs.readFileSync(historyPath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        log.error('Failed to load history:', error);
        return [];
    }
});

ipcMain.handle('get-file-info', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return {
            success: true,
            info: {
                name: path.basename(filePath),
                path: filePath,
                size: stats.size,
                type: path.extname(filePath).slice(1).toLowerCase()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('is-dark-mode', () => {
    return nativeTheme.shouldUseDarkColors;
});

ipcMain.on('log-message', (event, level, message) => {
    log[level](message);
});

// Usage Stats Handler
ipcMain.handle('get-usage-stats', async () => {
    const https = require('https');
    const http = require('http');

    const apiConfig = readApiConfig();
    if (!apiConfig) {
        return { success: false, error: 'API config not found' };
    }

    return new Promise((resolve) => {
        const url = new URL(`${apiConfig.baseUrl}/v1/usage`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiConfig.authToken}`
            }
        };

        const req = client.request(options, (res) => {
            let buffer = '';

            res.on('data', (chunk) => {
                buffer += chunk.toString();
            });

            res.on('end', () => {
                try {
                    const data = JSON.parse(buffer);
                    resolve({ success: true, data });
                } catch (e) {
                    resolve({ success: false, error: 'Failed to parse usage data', raw: buffer });
                }
            });
        });

        req.on('error', (error) => {
            log.error('Usage API error:', error);
            resolve({ success: false, error: error.message });
        });

        req.setTimeout(30000, () => {
            req.destroy();
            resolve({ success: false, error: 'Request timeout' });
        });

        req.end();
    });
});

// API Proxy Handler with Streaming Support
ipcMain.handle('send-api-request-stream', async (event, requestData) => {
    const https = require('https');
    const http = require('http');

    const apiConfig = readApiConfig();
    if (!apiConfig) {
        log.error('API config not found in send-api-request handler');
        return { success: false, error: 'API config not found. Please check your settings.' };
    }

    return new Promise((resolve) => {
        const baseUrl = (apiConfig.baseUrl || '').replace(/\/+$/, '');
        const endpoint = baseUrl.endsWith('/v1')
            ? `${baseUrl}/chat/completions`
            : `${baseUrl}/v1/chat/completions`;
        const url = new URL(endpoint);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const postData = JSON.stringify({
            model: requestData.model || apiConfig.model,
            messages: requestData.messages,
            stream: true
        });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${apiConfig.authToken}`
            }
        };

        const req = client.request(options, (res) => {
            let buffer = '';
            let doneSent = false;

            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') {
                            if (!doneSent) {
                                doneSent = true;
                                event.sender.send('api-stream-chunk', { type: 'done' });
                            }
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const textDelta = parsed?.choices?.[0]?.delta?.content;
                            if (typeof textDelta === 'string' && textDelta.length > 0) {
                                event.sender.send('api-stream-chunk', {
                                    type: 'text_delta',
                                    text: textDelta
                                });
                            }

                            const finishReason = parsed?.choices?.[0]?.finish_reason;
                            if (finishReason && !doneSent) {
                                doneSent = true;
                                event.sender.send('api-stream-chunk', { type: 'done' });
                            }
                        } catch (e) {
                            log.error('Failed to parse stream chunk:', e);
                            log.error('Raw data:', data);
                        }
                    }
                });
            });

            res.on('end', () => {
                // Send final done event if not already sent
                if (!doneSent) {
                    doneSent = true;
                    event.sender.send('api-stream-chunk', { type: 'done' });
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true });
                } else {
                    resolve({
                        success: false,
                        error: `API Error: ${res.statusCode}`,
                        statusCode: res.statusCode
                    });
                }
            });
        });

        req.on('error', (error) => {
            log.error('API request error:', error);
            event.sender.send('api-stream-chunk', {
      type: 'error',
                error: error.message
            });
            resolve({
                success: false,
                error: error.message
            });
        });

        req.setTimeout(120000, () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout'
            });
        });

        req.write(postData);
        req.end();
    });
});
