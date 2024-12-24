// js/error.js

// 解析查询参数
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split("&");
    for (const pair of pairs) {
        const [key, value] = pair.split("=");
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }
    return params;
}

// 显示失败的 URL
window.onload = () => {
    const params = getQueryParams();
    const failedUrl = params.url || '未知 URL';
    const errorDescription = params.errorDescription || "未知原因";
    document.getElementById("failed-url").innerText = failedUrl;
    document.getElementById("failed-des").innerText = `加载页面失败，请检查软件代理服务器设置，或者刷新重试。(${errorDescription})`;
};

// 刷新重试的函数
function retryLoad() {
    const params = getQueryParams();
    const failedUrl = params.url;
    if (failedUrl) {
        // 设置窗口位置为失败的 URL，尝试重新加载
        window.location.href = failedUrl;
    } else {
        // 如果没有失败的 URL，则重新加载当前页面
        window.location.reload();
    }
}
