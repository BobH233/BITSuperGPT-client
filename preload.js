const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    login: async (username, password) => {
        return await ipcRenderer.invoke('login', username, password);
    },

    checkLogin: async () => {
        return await ipcRenderer.invoke('check-login');
    },

    filterConversation: async (user_id, conversation_ids) => {
        return await ipcRenderer.invoke('filter-conversation', user_id, conversation_ids);
    },

    recordUsage: async (model, conversation_id, is_new_conversation) => {
        return await ipcRenderer.invoke('record-usage', model, conversation_id, is_new_conversation);
    },

    debug: async (a, b) => {
        return await ipcRenderer.invoke('debug', a, b);
    },

    getProxyInfo: async () => {
        return await ipcRenderer.invoke('get-proxy-info')
    },

    getProgramInfo: async () => {
        return await ipcRenderer.invoke('get-exe-info')
    },

    getUserPreferences: async () => {
        return await ipcRenderer.invoke('get-user-preferences')
    },

    setUserPreferences: async (pref) => {
        return await ipcRenderer.invoke('set-user-preferences', pref)
    },

    changePassword: async (oldPassword, newPassword) => {
        return await ipcRenderer.invoke('change-password', oldPassword, newPassword)
    },

    revokeUserTokens: async (userId) => {
        return await ipcRenderer.invoke('revoke-user-tokens', userId)
    },

    relaunchApp: async () => {
        return await ipcRenderer.invoke('relaunch-app');
    },

    getUserUsage: async (userId, startTime, endTime) => {
        return await ipcRenderer.invoke('get-user-usage', userId, startTime, endTime);
    },

    getAllUsersUsage: async (startTime, endTime) => {
        return await ipcRenderer.invoke('get-all-users-usage', startTime, endTime);
    },

    getProxyConfig: async () => {
        return await ipcRenderer.invoke('get-proxy-config');
    },

    startDownload: () => {
        ipcRenderer.send('start-download');
    },

    restartApp: () => {
        ipcRenderer.send('restart-app');
    },

    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, version) => callback(version));
    },

    onUpdateNotAvailable: (callback) => {
        ipcRenderer.on('update-not-available', callback);
    },

    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progressObj) => callback(progressObj));
    },

    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', callback);
    },
});
