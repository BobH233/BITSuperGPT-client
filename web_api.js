// web_api.js

const path = require('path');
const dotenvPath = path.join(__dirname, '.env');
require('dotenv').config({ path: dotenvPath });
console.log("process.env.API_BASE_URL:", process.env.API_BASE_URL);
const axios = require('axios');
const crypto = require('crypto');
const Store = require('electron-store').default;

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '11451411451411451411451411451411';
const IV_LENGTH = 16;

const g_store = new Store();

/**
 * 解密函数
 * 假设加密的数据格式为 'iv:encryptedData'，其中 iv 和 encryptedData 都是十六进制字符串
 * @param {string} text - 加密后的文本
 * @returns {string} - 解密后的文本
 */
function decrypt(text) {
    try {
        const [ivHex, encryptedDataHex] = text.split(':');
        if (!ivHex || !encryptedDataHex) {
            throw new Error('Invalid encrypted text format.');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encryptedData = Buffer.from(encryptedDataHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        console.error('Decryption error:', error.message);
        return null;
    }
}

/**
 * 登录函数
 * @param {string} username
 * @param {string} password
 * @returns {object} - { success: boolean, token?: string, message?: string }
 */
async function login(username, password) {
    console.log(`username: ${username}, passwd: ${password}`);
    try {
        let data = JSON.stringify({
            "username": username,
            "password": password
        });
        let response = await axios.post(`${API_BASE_URL}/auth/login`, data, {
            headers: {
                'Content-Type': 'application/json'
            },
            validateStatus: function (status) {
                return status >= 100 && status < 600; // 接受所有的状态码
            }
        })
        const { token } = response.data;
        if (token) {
            const store = g_store;
            store.set('jwt_token', token);
            console.log('Token saved successfully.');
            return { success: true, token };
        } else {
            console.warn('No token received.');
            return { success: false, message: '未收到令牌。' };
        }
    } catch (error) {
        console.error("Error occurred in handler for 'login':", error);
        throw error; // 根据需要处理错误
    }
}

/**
 * 检查用户是否已登录
 * @returns {object} - { loggedIn: boolean, user?: object, message?: string }
 */
async function checkLogin() {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { loggedIn: false, message: '未登录。' };
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/auth/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { loggedIn, user } = response.data;
        return { loggedIn, user };
    } catch (error) {
        console.error('检查登录状态错误:', error.response ? error.response.data : error.message);
        // 如果令牌无效或过期，删除本地存储的令牌
        const store = new Store();
        store.delete('jwt_token');
        return { loggedIn: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 获取游戏账号（附带解密）
 * @returns {object} - { success: boolean, accounts?: array, message?: string }
 */
async function getGptAccount() {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/gpt-credentials`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { accounts } = response.data;
        if (!accounts) {
            return { success: false, message: '未收到游戏账号数据。' };
        }
        // 解密账号和密码
        const decryptedAccounts = accounts.map(acc => ({
            account: decrypt(acc.account),
            password: decrypt(acc.password)
        })).filter(acc => acc.account && acc.password); // 过滤解密失败的记录

        return { success: true, accounts: decryptedAccounts };
    } catch (error) {
        console.error('获取游戏账号错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 获取配置
 * @returns {object} - { success: boolean, config?: object, message?: string }
 */
async function getConfig() {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { config } = response.data;
        return { success: true, config };
    } catch (error) {
        console.error('获取配置错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 筛选会话
 * @param {number} user_id
 * @param {array} conversation_ids
 * @returns {object} - { success: boolean, conversation_ids?: array, message?: string }
 */
async function filterConversation(user_id, conversation_ids) {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/usage/filter-conversations`, {
            user_id,
            conversation_ids
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const { conversation_ids: filtered_ids } = response.data;
        return { success: true, conversation_ids: filtered_ids };
    } catch (error) {
        console.error('筛选会话错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 记录使用情况
 * @param {string} model
 * @param {string} conversation_id
 * @param {boolean} is_new_conversation
 * @returns {object} - { success: boolean, message?: string }
 */
async function recordUsage(model, conversation_id, is_new_conversation) {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/usage/record`, {
            model,
            conversation_id,
            is_new_conversation
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return { success: true, message: response.data.message };
    } catch (error) {
        console.error('记录使用情况错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 修改密码函数
 * @param {string} oldPassword - 旧密码
 * @param {string} newPassword - 新密码
 * @returns {object} - { success: boolean, message?: string }
 */
async function changePassword(oldPassword, newPassword) {
    const store = g_store;
    const token = store.get('jwt_token');

    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const data = JSON.stringify({
            oldPassword: oldPassword,
            newPassword: newPassword
        });

        const response = await axios.post(`${API_BASE_URL}/auth/change-password`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            validateStatus: function (status) {
                return status >= 100 && status < 600; // 接受所有状态码
            }
        });

        if (response.status === 200) {
            // 密码修改成功，删除本地存储的令牌
            store.delete('jwt_token');
            return { success: true, message: '密码修改成功，请重新登录。' };
        } else {
            let { message } = response.data;
            if(message == "oldPassword wrong!") {
                message = "旧密码错误!";
            }
            return { success: false, message: message || '密码修改失败。' };
        }
    } catch (error) {
        console.error("Error occurred in handler for 'changePassword':", error);
        return { success: false, message: '请求失败，请稍后再试。' };
    }
}

/**
 * 注销函数
 * @returns {object} - { success: boolean, message?: string }
 */
async function logout() {
    const store = g_store;
    const token = store.get('jwt_token');

    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            validateStatus: function (status) {
                return status >= 100 && status < 600; // 接受所有状态码
            }
        });

        if (response.status === 200) {
            // 注销成功，删除本地存储的令牌
            store.delete('jwt_token');
            return { success: true, message: '注销成功。' };
        } else {
            const { message } = response.data;
            return { success: false, message: message || '注销失败。' };
        }
    } catch (error) {
        console.error("Error occurred in handler for 'logout':", error);
        return { success: false, message: '请求失败，请稍后再试。' };
    }
}

/**
 * 吊销所有令牌函数（仅管理员）
 * @param {number} userId - 要吊销令牌的用户ID
 * @returns {object} - { success: boolean, message?: string }
 */
async function revokeAllTokens(userId) {
    const store = g_store;
    const token = store.get('jwt_token');

    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const data = JSON.stringify({
            userId: userId
        });

        const response = await axios.post(`${API_BASE_URL}/auth/revoke-user-tokens`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            validateStatus: function (status) {
                return status >= 100 && status < 600; // 接受所有状态码
            }
        });

        if (response.status === 200) {
            return { success: true, message: `用户 ${userId} 的所有令牌已被吊销。` };
        } else {
            const { message } = response.data;
            return { success: false, message: message || '吊销令牌失败。' };
        }
    } catch (error) {
        console.error("Error occurred in handler for 'revokeAllTokens':", error);
        return { success: false, message: '请求失败，请稍后再试。' };
    }
}

/**
 * 查询用户在某个时间段内对各个模型的用量情况
 * @param {number} user_id - 用户ID
 * @param {string} start_time - 查询开始时间 (ISO 8601 格式)
 * @param {string} end_time - 查询结束时间 (ISO 8601 格式)
 * @returns {object} - 返回查询结果 { success: boolean, usage?: object, message?: string }
 */
async function getUserUsage(user_id, start_time, end_time) {
    const store = g_store;
    const token = store.get('jwt_token'); // 获取存储中的JWT token
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        // 拼接查询参数
        const response = await axios.get(`${API_BASE_URL}/usage/user-usage`, {
            params: {
                user_id,
                start_time,
                end_time
            },
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
        const { usage } = response.data;
        return { success: true, usage };
    } catch (error) {
        console.error('查询用户用量情况错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 获取所有用户在某个时间段内对各个模型的用量情况
 * @param {string} start_time - 查询开始时间 (ISO 8601 格式)
 * @param {string} end_time - 查询结束时间 (ISO 8601 格式)
 * @returns {object} - 返回查询结果 { success: boolean, usage?: array, message?: string }
 */
async function getAllUsersUsage(start_time, end_time) {
    const store = g_store;
    const token = store.get('jwt_token'); // 获取存储中的JWT token
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        // 发送 GET 请求到 /all-users-usage 端点
        const response = await axios.get(`${API_BASE_URL}/usage/all-users-usage`, {
            params: {
                start_time,
                end_time
            },
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        const { usage } = response.data;
        return { success: true, usage };
    } catch (error) {
        console.error('查询所有用户用量情况错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 获取所有用户信息（仅管理员可调用）
 * @returns {object} - { success: boolean, users?: array, message?: string }
 */
async function getUsers() {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const { users } = response.data;
        if (!users) {
            return { success: false, message: '未收到用户数据。' };
        }

        return { success: true, users };
    } catch (error) {
        console.error('获取所有用户信息错误:', error.response ? error.response.data : error.message);
        return { success: false, message: error.response ? error.response.data.message : error.message };
    }
}

/**
 * 添加新用户（仅管理员可调用）
 * @param {object} userData - 包含新用户信息的对象
 * @param {string} userData.username - 用户名
 * @param {string} userData.password - 密码
 * @param {string} userData.nickname - 昵称
 * @param {boolean} userData.is_admin - 是否为管理员
 * @param {number} userData.userGroup - 用户组
 * @returns {object} - { success: boolean, user_id?: number, message?: string }
 */
async function addUser({ username, password, nickname, is_admin, userGroup }) {
    const store = g_store;
    const token = store.get('jwt_token');
    if (!token) {
        return { success: false, message: '未登录。' };
    }

    // 验证必填字段
    if (!username || !password || !nickname || userGroup === undefined) {
        return { success: false, message: '用户名、密码、昵称和用户组为必填项。' };
    }

    try {
        const data = JSON.stringify({
            username,
            password,
            nickname,
            is_admin,
            userGroup
        });

        const response = await axios.post(`${API_BASE_URL}/auth/add-user`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            validateStatus: function (status) {
                return status >= 100 && status < 600; // 接受所有状态码
            }
        });

        if (response.status === 201) {
            const { user_id } = response.data;
            return { success: true, user_id, message: '用户添加成功。' };
        } else {
            const { message } = response.data;
            return { success: false, message: message || '添加用户失败。' };
        }
    } catch (error) {
        console.error("调用 'addUser' 接口时出错:", error);
        return { success: false, message: '请求失败，请稍后再试。' };
    }
}

async function registerIpcForApp(ipcMain) {
    ipcMain.handle('login', async (event, username, password) => {
        return await login(username, password);
    });

    ipcMain.handle('check-login', async () => {
        return await checkLogin();
    });

    ipcMain.handle('filter-conversation', async (event, user_id, conversation_ids) => {
        return await filterConversation(user_id, conversation_ids);
    });

    ipcMain.handle('record-usage', async (event, model, conversation_id, is_new_conversation) => {
        return await recordUsage(model, conversation_id, is_new_conversation);
    });

    ipcMain.handle('change-password', async (event, oldPassword, newPassword) => {
        return await changePassword(oldPassword, newPassword);
    });

    ipcMain.handle('logout', async (event) => {
        return await logout();
    });

    ipcMain.handle('revoke-user-tokens', async (event, userId) => {
        return await revokeAllTokens(userId);
    });

    ipcMain.handle('get-user-usage', async (event, userId, startTime, endTime) => {
        return await getUserUsage(userId, startTime, endTime);
    });

    ipcMain.handle('get-all-users-usage', async (event, startTime, endTime) => {
        return await getAllUsersUsage(startTime, endTime);
    });

    ipcMain.handle('get-proxy-config', async () => {
        return await getConfig();
    });

    ipcMain.handle('get-users', async (event) => {
        return await getUsers();
    });

    ipcMain.handle('add-user', async (event, userData) => {
        return await addUser(userData);
    });

    ipcMain.handle('debug', async (event, a, b) => {
        return { t: await getGptAccount(), a, b };
    });
    

}

module.exports = {
    login,
    checkLogin,
    getGptAccount,
    getConfig,
    filterConversation,
    recordUsage,
    changePassword,
    logout,
    revokeAllTokens,
    getUserUsage,
    registerIpcForApp
};
