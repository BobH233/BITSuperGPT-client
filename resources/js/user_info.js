
const currentUser = {
    username: '用户名',
    avatarUrl: '../image/logo.png',
    modelUsage: {
        'GPT-4': 10,
        'GPT-4o': 5
    }
};

const now = new Date();
const lastWeek = new Date(now);
lastWeek.setDate(now.getDate() - 7);

const startTime = lastWeek.toISOString();
const endTime = now.toISOString();

const currentUserPreference = {
    chatIsolation: true
}

function processAndShowAllUserUsage(allUsage, selfId) {
    let nickNameMap = {};
    let totalCountMap = {};
    for (let usage of allUsage) {
        nickNameMap[usage.user_id] = usage.nickname;
        if (totalCountMap[usage.user_id] == undefined) {
            totalCountMap[usage.user_id] = 0;
        }
        totalCountMap[usage.user_id] += usage.usage_count;
    }
    let allUserUsage = [];
    for (let key in totalCountMap) {
        allUserUsage.push({
            username: nickNameMap[key],
            usage_count: totalCountMap[key]
        });
    }
    let currentUsername = (nickNameMap[selfId] == undefined ? "placeholder" : nickNameMap[selfId]);
    generateUsageChart(allUserUsage, currentUsername);
}

// 页面加载后初始化数据
document.addEventListener('DOMContentLoaded', async () => {
    const userInfo = await window.electronAPI.checkLogin();
    const userPref = await window.electronAPI.getUserPreferences();
    const userUsage = await window.electronAPI.getUserUsage(userInfo.user.id, startTime, endTime);
    const allUserUsage = await window.electronAPI.getAllUsersUsage(startTime, endTime);
    console.log("allUserUsage", allUserUsage);
    if (userUsage.success) {
        if (userUsage.usage.length == 0) {
            document.getElementById("usage-list").style.display = "none";
        } else {
            for (let usage of userUsage.usage) {
                console.log(usage);
                document.getElementById("usage-list").innerHTML += `
                <div class="usage-item">
                <strong>${usage.model}:</strong>
                <span>${usage.usage_count} 条</span>
                </div>
            `;
            }
        }
    }
    if (allUserUsage.success) {
        processAndShowAllUserUsage(allUserUsage.usage, userInfo.user.id);
    }
    console.log("usage:", userUsage);
    for (let key in userPref) {
        if (currentUserPreference.hasOwnProperty(key)) {
            currentUserPreference[key] = userPref[key];
        }
    }
    await window.electronAPI.setUserPreferences(currentUserPreference);

    const user = userInfo.user;
    currentUser.username = user.nickname;

    // 设置用户名
    document.getElementById('username').innerText = currentUser.username;

    // 设置用户头像
    document.getElementById('user-avatar').style.backgroundImage = `url('${currentUser.avatarUrl}')`;

    // 设置聊天会话隔离状态
    document.getElementById('chat-isolation').checked = currentUserPreference.chatIsolation;
});

// 处理聊天会话隔离开关
const chatIsolationToggle = document.getElementById('chat-isolation');
chatIsolationToggle.addEventListener('change', async () => {
    currentUser.chatIsolation = chatIsolationToggle.checked;
    console.log(`聊天会话隔离已${currentUser.chatIsolation ? '开启' : '关闭'}`);
    currentUserPreference.chatIsolation = chatIsolationToggle.checked;
    await window.electronAPI.setUserPreferences(currentUserPreference);
});

// 处理修改密码按钮
const changePasswordBtn = document.getElementById('change-password-btn');
const passwordModal = document.getElementById('password-modal');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const passwordMessage = document.getElementById('password-message');

changePasswordBtn.addEventListener('click', () => {
    passwordModal.style.display = 'block';
    passwordMessage.style.display = 'none';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
});

cancelBtn.addEventListener('click', () => {
    passwordModal.style.display = 'none';
});

// 点击模态窗口外部关闭模态
window.addEventListener('click', (event) => {
    if (event.target == passwordModal) {
        passwordModal.style.display = 'none';
    }
});

confirmBtn.addEventListener('click', async () => {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 简单的验证
    if (newPassword === '' || confirmPassword === '' || oldPassword === '') {
        showMessage('密码不能为空', false);
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('两次密码输入不一致', false);
        return;
    }

    const result = await window.electronAPI.changePassword(oldPassword, newPassword);

    if (result.success) {
        window.electronAPI.relaunchApp();
    } else {
        showMessage(result.message, false);
    }
});

function showMessage(message, isSuccess) {
    passwordMessage.innerText = message;
    passwordMessage.style.color = isSuccess ? 'green' : 'red';
    passwordMessage.style.display = 'block';
}


function generateUsageChart(allUsersUsage, currentUsername) {
    console.log("generateUsageChart", allUsersUsage, currentUsername);
    if (allUsersUsage.length == 0) {
        document.getElementById("usage-pie").style.display = "none";
        return;
    }
    const ctx = document.getElementById('usageChart').getContext('2d');

    // 计算总用量
    const totalUsage = allUsersUsage.reduce((acc, user) => acc + user.usage_count, 0);

    // 准备数据
    const labels = allUsersUsage.map(user => user.username === currentUsername ? `${user.username}（你）` : user.username);
    const data = allUsersUsage.map(user => user.usage_count);
    const backgroundColors = allUsersUsage.map(user => user.username === currentUsername ? 'rgba(255, 99, 132, 0.7)' : 'rgba(54, 162, 235, 0.7)');
    const borderColors = allUsersUsage.map(user => user.username === currentUsername ? 'rgba(255, 99, 132, 1)' : 'rgba(54, 162, 235, 1)');

    // 销毁之前的图表实例（如果存在），以避免重复绘制
    if (window.usageChartInstance) {
        window.usageChartInstance.destroy();
    }

    // 创建饼状图
    window.usageChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, // 确保图表响应式
            maintainAspectRatio: true, // 保持纵横比
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percentage = ((value / totalUsage) * 100).toFixed(2);
                            return `${label}: ${value} 次 (${percentage}%)`;
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 20,
                        padding: 15
                    }
                },
                title: {
                    display: false,
                    text: '用户调用次数占比',
                    font: {
                        size: 18
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        }
    });
}