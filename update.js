const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog, ipcMain, app, screen } = require('electron');
const path = require('path');
const os = require('os');
const dotenvPath = path.join(__dirname, '.env');
require('dotenv').config({ path: dotenvPath });

let updateWindow = null;
const enable_update_server = process.env.ENABLE_UPDATE_SERVER || "false";

const UPDATE_SERVER_URL_macos = process.env.UPDATE_SERVER_URL_macos || "http://example.com/updates/mac/"

const UPDATE_SERVER_URL_windows = process.env.UPDATE_SERVER_URL_windows || "http://example.com/updates/win/"

function setFeedURL() {
    if (os.platform() === 'darwin') {
        autoUpdater.setFeedURL({
            provider: 'generic',
            url: UPDATE_SERVER_URL_macos,
        });
        console.log("FeedURL:", UPDATE_SERVER_URL_macos);
    } else if (os.platform() === 'win32') {
        autoUpdater.setFeedURL({
            provider: 'generic',
            url: UPDATE_SERVER_URL_windows
        });
        console.log("FeedURL:", UPDATE_SERVER_URL_windows);
    } else {
        console.warn('Unsupported platform for auto-updates');
    }
    autoUpdater.autoDownload = false;
}

function createUpdateWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const actualWidth = Math.round(Math.min(800, width * 0.8));
    if (updateWindow) {
        updateWindow.focus();
        return;
    }

    updateWindow = new BrowserWindow({
        width: actualWidth,
        height: actualWidth,
        resizable: false,
        modal: true,
        autoHideMenuBar: true,
        parent: app.mainWindow,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    updateWindow.loadFile(path.join(__dirname, 'resources', 'html', 'update.html'));
    // updateWindow.webContents.openDevTools();
    updateWindow.on('closed', () => {
        updateWindow = null;
    });
}

function initAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
        console.log('正在检查更新...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('发现新版本:', info.version);
        if (updateWindow) {
            updateWindow.webContents.send('update-available', info.version);
        } else {
            createUpdateWindow();
            updateWindow.webContents.on('did-finish-load', () => {
                updateWindow.webContents.send('update-available', info.version);
            });
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('当前已是最新版本');
        if (updateWindow) {
            updateWindow.webContents.send('update-not-available');
        } else {
            dialog.showMessageBox({
                type: 'info',
                title: '更新',
                message: '当前已是最新版本。',
                buttons: ['确认'],
            });
        }
    });

    autoUpdater.on('error', (err) => {
        console.error('更新错误:', err);
        dialog.showErrorBox('更新错误', err == null ? "unknown" : (err.stack || err).toString());
    });

    autoUpdater.on('download-progress', (progressObj) => {
        console.log("download-progress!!", progressObj);
        if (updateWindow) {
            updateWindow.webContents.send('download-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (updateWindow) {
            updateWindow.webContents.send('update-downloaded');
        }
    });
}

// 检查更新
function checkForUpdates() {
    setFeedURL();
    autoUpdater.checkForUpdates();
}

// 处理来自渲染进程的 IPC 消息
function handleIpcMain() {
    ipcMain.on('start-download', () => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('restart-app', () => {
        autoUpdater.quitAndInstall();
    });
}

// 导出初始化函数
function initialize() {
    initAutoUpdater();
    handleIpcMain();
}

module.exports = {
    initialize,
    checkForUpdates,
};