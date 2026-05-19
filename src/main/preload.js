const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // API Config
    readApiConfig: () => ipcRenderer.invoke('read-api-config'),

    // File operations
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    createFile: (filePath, content) => ipcRenderer.invoke('create-file', filePath, content),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),

    selectFile: () => ipcRenderer.invoke('select-file'),
    selectImage: () => ipcRenderer.invoke('select-image'),
    selectProjectDirectory: () => ipcRenderer.invoke('select-project-directory'),
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

    // Projects & History
    saveProjects: (projects) => ipcRenderer.invoke('save-projects', projects),
    loadProjects: () => ipcRenderer.invoke('load-projects'),
    saveHistory: (conversations) => ipcRenderer.invoke('save-history', conversations),
    loadHistory: () => ipcRenderer.invoke('load-history'),

    // App info
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    isDarkMode: () => ipcRenderer.invoke('is-dark-mode'),

    // Logging
    log: (level, message) => ipcRenderer.send('log-message', level, message),

    // API Proxy with Streaming
    sendApiRequestStream: (requestData) => ipcRenderer.invoke('send-api-request-stream', requestData),
    onStreamChunk: (callback) => {
        ipcRenderer.on('api-stream-chunk', (event, data) => callback(data));
    },
    removeStreamListener: () => {
        ipcRenderer.removeAllListeners('api-stream-chunk');
    },

    // Usage API
    getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
});
