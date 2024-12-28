const {
    app,
    BrowserWindow,
    dialog,
    Menu,
    session,
    shell,
    screen,
    ipcMain,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const Store = require("electron-store").default;
const g_store = new Store();


const dotenvPath = path.join(__dirname, '.env');
require('dotenv').config({ path: dotenvPath });

const update = require('./update.js');
update.initialize();

app.commandLine.appendSwitch("lang", "zh-CN");

if (process.argv.includes("--remote-debugging-port")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--remote-debugging-pipe")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--inspect")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--inspect-port")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--inspect-brk")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--inspect-brk-node")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--inspect-publish-uid")) {
    app.quit();
    throw new Error("");
}

if (process.argv.includes("--js-flags")) {
    app.quit();
    throw new Error("");
}

const {
    registerIpcForApp: registerWebAPIIpcForApp,
    getGptAccount,
    logout,
    checkLogin,
    getConfig: getProxyConfig,
} = require("./web_api");

app.commandLine.appendSwitch("ignore-certificate-errors", "true");

let mainWindow = null;
let proxyInfoWindow = null;
let aboutWindow = null;
let userInfoWindow = null;
let singBoxProcess = null;

let sharedPassword = "";

const GLOBAL_DEBUG = !app.isPackaged;

const enable_update_server = process.env.ENABLE_UPDATE_SERVER || "false";


function getSingBoxPath() {
    let basePath;
    basePath = path.join(path.dirname(app.getPath("exe")), "..", "sing-box");
    if (app.isPackaged) {
        if (process.platform === "darwin") {
            basePath = path.join(path.dirname(app.getPath("exe")), "..", "sing-box");
        } else {
            // Windows 或其他平台的生产环境
            basePath = path.join(path.dirname(app.getPath("exe")), "sing-box");
        }
    } else {
        // 开发环境
        basePath = path.join(__dirname, "sing-box");
    }
    const configPath = path.join(basePath, "config.json");
    let singBoxPath;
    if (process.platform === "win32") {
        singBoxPath = path.join(basePath, "sing-box.exe");
    } else if (process.platform === "darwin") {
        singBoxPath = path.join(basePath, "sing-box-macos");
    }
    return {
        configPath,
        singBoxPath,
    };
}

function startSingBox() {
    let { configPath, singBoxPath } = getSingBoxPath();
    let args = ["run", "-c", configPath, "--disable-color"];
    console.log("singbox start param: ", args);

    if (process.platform === "win32") {
        // 直接运行 sing-box.exe
        singBoxProcess = spawn(singBoxPath, args, { shell: false });

        singBoxProcess.stdout.on("data", (data) => {
            console.log(`sing-box stdout: ${data}`);
        });

        singBoxProcess.stderr.on("data", (data) => {
            console.error(`sing-box stderr: ${data}`);
        });

        singBoxProcess.on("close", (code) => {
            console.log(`sing-box process exited with code ${code}`);
        });
    } else if (process.platform === "darwin") {
        // macOS 平台
        console.log("singBoxPath (macOS)", singBoxPath);
        console.log("configPath", configPath);

        singBoxProcess = spawn(singBoxPath, args, { shell: false });

        singBoxProcess.stdout.on("data", (data) => {
            console.log(`sing-box stdout: ${data}`);
        });

        singBoxProcess.stderr.on("data", (data) => {
            console.error(`sing-box stderr: ${data}`);
        });

        singBoxProcess.on("close", (code) => {
            console.log(`sing-box process exited with code ${code}`);
        });
    } else {
        console.error("不支持的操作系统平台");
    }
}

function isSingBoxRunning() {
    if (singBoxProcess && singBoxProcess.pid) {
        try {
            process.kill(singBoxProcess.pid, 0); // 不发送信号，只检查进程是否存在
            return true; // 如果没有错误，说明进程仍然存在
        } catch (error) {
            return false; // 如果抛出错误，说明进程已退出
        }
    }
    return false;
}

function killSingBox() {
    if (process.platform === "win32") { // 检测是否是 Windows 系统
        if (singBoxProcess && singBoxProcess.pid) {
            // 使用 taskkill 命令杀死进程
            const { exec } = require("child_process");
            exec(`taskkill /PID ${singBoxProcess.pid} /T /F`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Failed to kill process: ${error.message}`);
                } else {
                    console.log("Process killed successfully");
                }
            });
        } else {
            console.warn("singBoxProcess is not running or already killed.");
        }
    } else {
        // 非 Windows 系统，使用标准的 process.kill 方法
        if (singBoxProcess && singBoxProcess.pid) {
            try {
                singBoxProcess.kill();
                console.log("Process killed successfully on non-Windows platform.");
            } catch (err) {
                console.error(`Failed to kill process: ${err.message}`);
            }
        } else {
            console.warn("singBoxProcess is not running or already killed.");
        }
    }
}

function restartSingBox() {
    if (singBoxProcess) {
        killSingBox();
        console.log("sing-box process killed, restarting...");
    }
    startSingBox(); // 重新启动 sing-box 进程
}
const menu_options = [
    {
        label: "BIT超级共享GPT",
        submenu: [
            {
                label: "关于程序",
                click() {
                    createAboutWindow();
                },
            },
        ],
    },
    // 编辑菜单
    {
        label: "主程序",
        submenu: [
            {
                label: "用户信息",
                click: async function () {
                    const isLogin = await checkLogin();
                    if (isLogin.loggedIn) {
                        createUserInfoWindow();
                    } else {
                        await dialog.showMessageBox(mainWindow, {
                            type: "info",
                            title: "你还没有登陆",
                            message: "请登陆后再查看用户信息",
                            buttons: ["确认"],
                        });
                    }
                },
            },
            {
                label: "后台管理",
                click: async function () {
                    const isLogin = await checkLogin();
                    if (isLogin.user.is_admin == 1) {
                        createAdminWindow();
                    } else {
                        await dialog.showMessageBox(mainWindow, {
                            type: "warning",
                            title: "你不是管理员",
                            message: "非管理员无法使用后台管理功能",
                            buttons: ["确认"],
                        });
                    }
                },
            },
            {
                label: "自动更新",
                click: function () {
                    if (process.platform === 'win32') {
                        update.checkForUpdates();
                    } else{
                        dialog.showMessageBox({
                            type: 'info',
                            title: '暂不支持自动更新',
                            message: '当前系统请手动更新程序',
                            buttons: ['确认'],
                        });
                    }
                },
                visible: enable_update_server == "true",
            },
            { type: "separator" },
            {
                label: "回到ChatGPT主页",
                click: async function () {
                    const isLogin = await checkLogin();
                    if (isLogin.loggedIn) {
                        mainWindow.loadURL("https://chatgpt.com/");
                    } else {
                        await dialog.showMessageBox(mainWindow, {
                            type: "info",
                            title: "你还没有登陆",
                            message: "请登陆后再查看用户信息",
                            buttons: ["确认"],
                        });
                    }
                },
            },
            {
                label: "退出登陆BIT超级共享GPT",
                click: async function () {
                    const test = await logout();
                    console.log(test);
                    const store = g_store;
                    store.delete("jwt_token");
                    relaunchAPP();
                },
            },
            {
                label: "重置浏览器缓存并重新登录",
                click() {
                    const store = g_store;
                    store.clear();
                    clearCookiesAndData(mainWindow);
                },
            },
            { type: "separator" },
            {
                label: '窗口置顶',
                type: 'checkbox',
                checked: false,
                click: (menuItem) => {
                    const isAlwaysOnTop = menuItem.checked;
                    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
                },
            },
            {
                label: "退出程序",
                click() {
                    killSingBox();
                    app.quit();
                },
            },
        ],
    },
    {
        label: "代理服务器",
        submenu: [
            {
                label: "更新代理服务器配置",
                click: async function () {
                    let result = await getProxyConfig();
                    if (result.success != true) {
                        dialog.showMessageBox(mainWindow, {
                            type: "error",
                            title: "更新代理服务器配置失败",
                            message: "错误信息: " + result.message,
                            buttons: ["确认"],
                        });
                    } else {
                        let { configPath, singBoxPath } = getSingBoxPath();
                        fs.writeFileSync(configPath, JSON.stringify(result.config));
                        await dialog.showMessageBox(mainWindow, {
                            type: "info",
                            title: "更新代理服务器配置完成",
                            message: "即将重启应用程序",
                            buttons: ["重启应用"],
                        });
                        relaunchAPP();
                    }
                },
            },
            {
                label: "重启代理服务器",
                click() {
                    restartSingBox();
                    dialog.showMessageBox(mainWindow, {
                        type: "info",
                        title: "重启代理服务器完成",
                        message: "尝试刷新网页重试",
                        buttons: ["确认"],
                    });
                },
            },
            {
                label: "代理服务器信息",
                click() {
                    createProxyInformationWindow();
                },
            },
        ],
    },
    {
        label: "编辑",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" }, // Command+C
            { role: "paste" }, // Command+V
            { role: "delete" },
            { type: "separator" },
            { role: "selectAll" },
        ],
    },
];

async function injectJSCode(win, jscode_name, replacement = []) {
    const injectFilePath = path.join(
        __dirname,
        "resources",
        "injections",
        jscode_name
    );

    try {
        // 读取文件时指定编码
        let data = fs.readFileSync(injectFilePath, "utf8");

        // 替换模板中的内容
        replacement.forEach((replace) => {
            const regex = new RegExp(replace.template, "g");
            data = data.replace(regex, replace.value);
        });

        // 注入 JS 代码
        await win.webContents.executeJavaScript(data);
        console.log("JS injected successfully");
    } catch (err) {
        console.error("Failed to read inject.js file or inject JS code", err);
    }
}

async function clearCookiesAndData(window) {
    const ses = window.webContents.session;

    try {
        // 清空缓存
        await ses.clearCache();
        console.log("Cache cleared successfully");

        // 清空存储数据（localStorage, sessionStorage, IndexedDB等）
        await ses.clearStorageData();
        console.log("Storage data cleared successfully");

        // 弹出信息框，提示用户操作完成
        await dialog.showMessageBox(window, {
            type: "info",
            title: "重置成功",
            message: "重置成功, 请重新打开应用程序!",
            buttons: ["重启程序"],
        });

        relaunchAPP();
    } catch (error) {
        console.error("Error clearing data:", error);

        // 弹出错误信息框
        dialog.showMessageBox(window, {
            type: "error",
            title: "重置失败",
            message: `There was an error clearing the data. ${error}`,
            buttons: ["OK"],
        });
    }
}

async function isCloudFlareVerifyPage() {
    const result = await mainWindow.webContents.executeJavaScript(
        `function checkCloudFlare() {const noscriptElements = document.getElementsByTagName('noscript');const noscriptLength = noscriptElements.length;const noscriptHTML = Array.from(noscriptElements).map(element => element.innerHTML).join(' ');return { noscriptLength, noscriptHTML };}checkCloudFlare();`
    );
    // console.log("return value:", result);
    // console.log('NoScriptLength:', result.noscriptLength);
    // console.log('NoScriptHTML:', result.noscriptHTML);
    return (
        result.noscriptLength > 0 &&
        result.noscriptHTML.includes("Enable JavaScript and cookies to continue")
    );
}

function createProxyInformationWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const actualWidth = Math.round(Math.min(800, width * 0.8));
    if (proxyInfoWindow && !proxyInfoWindow.isDestroyed()) {
        proxyInfoWindow.focus();
        return;
    }
    proxyInfoWindow = new BrowserWindow({
        width: actualWidth,
        height: Math.round(actualWidth * (600.0 / 800.0)),
        resizable: false,
        autoHideMenuBar: true,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    proxyInfoWindow.loadFile(
        path.join(__dirname, "resources/html/proxy_info.html")
    );
    if (GLOBAL_DEBUG) proxyInfoWindow.webContents.openDevTools();
    proxyInfoWindow.on("closed", () => {
        proxyInfoWindow = null;
    });
}

ipcMain.handle("get-proxy-info", () => {
    let { configPath, singBoxPath } = getSingBoxPath();
    const proxy_config = JSON.parse(fs.readFileSync(configPath));

    const singBoxRunning = isSingBoxRunning();

    return {
        method: proxy_config["outbounds"][0]["method"],
        server_port: proxy_config["outbounds"][0]["server_port"],
        server: proxy_config["outbounds"][0]["server"],
        local_port: proxy_config["inbounds"][0]["listen_port"],
        singBoxRunning,
        singBoxPid: singBoxProcess.pid,
    };
});

function getUserPreferences() {
    const store = g_store;
    const preferences = store.get("user_preferences");
    if (!preferences) {
        return {
            chatIsolation: true,
        };
    } else {
        return preferences;
    }
}

function relaunchAPP() {
    app.relaunch();
    killSingBox();
    app.quit();
}

ipcMain.handle("get-user-preferences", getUserPreferences);

ipcMain.handle("set-user-preferences", (event, pref) => {
    const store = g_store;
    store.set("user_preferences", pref);
});

ipcMain.handle("relaunch-app", () => {
    relaunchAPP();
});

function createAboutWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const actualWidth = Math.round(Math.min(800, width * 0.8));
    if (aboutWindow && !aboutWindow.isDestroyed()) {
        aboutWindow.focus();
        return;
    }
    aboutWindow = new BrowserWindow({
        width: actualWidth,
        height: Math.round(actualWidth * (600.0 / 800.0)),
        resizable: false,
        autoHideMenuBar: true,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    aboutWindow.loadFile(path.join(__dirname, "resources/html/about.html"));
    if (GLOBAL_DEBUG) aboutWindow.webContents.openDevTools();
    aboutWindow.on("closed", () => {
        aboutWindow = null;
    });
}

ipcMain.handle("get-exe-info", () => {
    return {
        version: app.getVersion(),
    };
});

function createUserInfoWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const actualHeight = Math.round(Math.min(900, height * 0.8));
    console.log("actualHeight", actualHeight);
    console.log(actualHeight * (600.0 / 900.0));
    if (userInfoWindow && !userInfoWindow.isDestroyed()) {
        userInfoWindow.focus();
        return;
    }
    userInfoWindow = new BrowserWindow({
        width: Math.round(actualHeight * (600.0 / 900.0)),
        height: actualHeight,
        resizable: false,
        autoHideMenuBar: true,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    userInfoWindow.loadFile(
        path.join(__dirname, "resources/html/user_info.html")
    );
    if (GLOBAL_DEBUG) userInfoWindow.webContents.openDevTools();
    userInfoWindow.on("closed", () => {
        userInfoWindow = null;
    });
}

function createAdminWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const actualWidth = Math.round(Math.min(1400, width * 0.8));
    if (proxyInfoWindow && !proxyInfoWindow.isDestroyed()) {
        proxyInfoWindow.focus();
        return;
    }
    proxyInfoWindow = new BrowserWindow({
        width: actualWidth,
        height: Math.round(actualWidth * (600.0 / 800.0)),
        autoHideMenuBar: true,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    proxyInfoWindow.loadFile(
        path.join(__dirname, "resources/html/admin.html")
    );
    if (GLOBAL_DEBUG) proxyInfoWindow.webContents.openDevTools();
    proxyInfoWindow.on("closed", () => {
        proxyInfoWindow = null;
    });
}

registerWebAPIIpcForApp(ipcMain);

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const win = new BrowserWindow({
        width: width * 0.8,
        height: height * 0.8,
        minHeight: 600,
        minWidth: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
        },
    });
    win.webContents.session.setProxy({
        proxyRules: "socks5://127.0.0.1:19872",
    });
    // win.loadURL('https://chatgpt.com/');
    win.loadFile(path.join(__dirname, "resources/html/login.html"));

    if (GLOBAL_DEBUG) win.webContents.openDevTools();
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    win.webContents.on("context-menu", (event, params) => {
        const right_click_menu_options = [
            {
                label: "复制",
                role: "copy", // 内置角色，自动处理复制功能
                enabled: params.editFlags.canCopy, // 根据是否可以复制决定是否启用
            },
            {
                label: "粘贴",
                role: "paste", // 内置角色，自动处理粘贴功能
                enabled: params.editFlags.canPaste, // 根据是否可以粘贴决定是否启用
            },
            { type: "separator" }, // 分隔符
            {
                label: "刷新",
                click: () => {
                    mainWindow.webContents.reload(); // 刷新页面
                },
            },
        ];
        const menu = Menu.buildFromTemplate(right_click_menu_options);
        menu.popup(mainWindow);
    });

    win.webContents.on(
        "did-fail-load",
        (event, errorCode, errorDescription, validatedURL) => {
            console.error(
                `Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`
            );
            if (validatedURL == "about:srcdoc") return;
            win.loadFile(
                path.join(__dirname, "resources/html/load_error.html"),
                { query: { url: validatedURL, errorDescription } }
            );
        }
    );

    win.webContents.on("crashed", () => {
        console.error("The renderer process crashed.");
    });

    win.webContents.on("unresponsive", () => {
        console.error("The renderer process is unresponsive.");
    });

    win.webContents.on("did-finish-load", async () => {
        const currentURL = win.webContents.getURL();

        console.log("currentURL", currentURL);

        is_cf = await isCloudFlareVerifyPage();
        if (is_cf) {
            console.warn("CloudFlare detected, skip js injection");
            return;
        }

        if (currentURL.startsWith("https://chatgpt.com/")) {
            await injectJSCode(win, "chatgpt_detection.js");
        }
    });

    async function injectIsolationHookIfEnabled() {
        let pref = getUserPreferences();
        if (pref.chatIsolation) {
            console.log("Enable isolation, inject...");
            await injectJSCode(win, "chatgpt_isolation_hook.js");
        } else {
            console.log("Disable isolation, give up.");
        }
    }

    win.webContents.on("did-start-loading", async () => {
        const currentURL = win.webContents.getURL();

        is_cf = await isCloudFlareVerifyPage();
        if (is_cf) {
            console.warn("CloudFlare detected, skip js injection");
            return;
        }

        if (currentURL.startsWith("https://chatgpt.com/")) {
            await injectIsolationHookIfEnabled();
        }
    });

    win.webContents.on("did-frame-finish-load", async () => {
        const currentURL = win.webContents.getURL();

        is_cf = await isCloudFlareVerifyPage();
        if (is_cf) {
            console.warn("CloudFlare detected, skip js injection");
            return;
        }

        console.log("currentURL", currentURL);

        if (currentURL.startsWith("https://chatgpt.com/")) {
            await injectJSCode(win, "hijack_chatgpt_web_content.js");
            await injectJSCode(win, "chatgpt_usage_hook.js");
            await injectJSCode(win, "search_box.js");
            await injectJSCode(win, "saveAsPDF.js");
            // 防止没注入进去
            await injectIsolationHookIfEnabled();
        } else if (currentURL.startsWith("https://auth.openai.com/authorize?")) {
            console.log("start inject auth page");
            let account = await getGptAccount();
            if (account.success && account.accounts.length > 0) {
                sharedPassword = account.accounts[0].password;
                await injectJSCode(win, "auth_page_injection.js", [
                    {
                        template: "<__email_share__>",
                        value: account.accounts[0].account,
                    },
                ]);
            } else {
                dialog.showMessageBox(mainWindow, {
                    type: "error",
                    title: "获取共享账号错误",
                    message: "无法获取共享账号, 请反馈或者检查你的网络",
                    buttons: ["确认"],
                });
            }
        } else if (
            currentURL.startsWith("https://auth0.openai.com/u/login/password")
        ) {
            console.log("start inject auth0 page");
            await injectJSCode(win, "auth0_page_injection.js", [
                {
                    template: "<__password_share__>",
                    value: sharedPassword,
                },
            ]);
        }
    });

    return win;
}

ipcMain.handle('save-pdf', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
        return { success: false, message: '未找到窗口' };
    }

    // 打开保存文件对话框
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: '保存 PDF',
        defaultPath: 'output.pdf',
        filters: [
            { name: 'PDF 文件', extensions: ['pdf'] }
        ]
    });

    if (canceled) {
        return { success: false };
    }

    const pdfOptions = {
        marginsType: 0,
        pageSize: 'A4',
        printBackground: true,
        printSelectionOnly: false,
        landscape: false
    };

    try {
        const pdfData = await win.webContents.printToPDF(pdfOptions);
        fs.writeFileSync(filePath, pdfData);
        return { success: true, filePath };
    } catch (error) {
        console.error('生成 PDF 时出错:', error);
        return { success: false, message: '生成 PDF 时出错' };
    }
});
const menu = Menu.buildFromTemplate(menu_options);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
    startSingBox();

    mainWindow = createWindow();
    app.mainWindow = mainWindow;

    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    app.on("window-all-closed", function () {
        if (process.platform !== "darwin") {
            killSingBox();
            app.quit();
        }
    });

    app.on("before-quit", () => {
        if (singBoxProcess) {
            killSingBox();
        }
    });

    app.on("will-quit", () => {
        if (singBoxProcess) {
            killSingBox();
        }
    });
});
