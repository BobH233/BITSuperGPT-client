document.addEventListener('DOMContentLoaded', async() => {
    // 模拟用户数据
    let users = await window.electronAPI.getUsers();
    console.log(users);
    if(users.success) {
        users = users.users;
    } else {
        alert("加载用户失败...");
        return;
    }

    // 填充用户表格
    function populateUserTable() {
        const tableBody = document.getElementById('user-table-body');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.nickname}</td>
                <td>${user.userGroup}</td>
                <td>${user.is_admin ? '是' : '否'}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    populateUserTable();

    // 处理添加用户表单
    const addUserForm = document.getElementById('add-user-form');
    addUserForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const username = document.getElementById('new-username').value.trim();
        const password = document.getElementById('new-password').value.trim();
        const nickname = document.getElementById('new-nickname').value.trim();
        const usergroup = parseInt(document.getElementById('new-usergroup').value.trim());
        const isAdmin = document.getElementById('new-is-admin').checked;

        if (username && password && nickname && !isNaN(usergroup)) {
            let userData = {
                username,
                password,
                nickname,
                is_admin: isAdmin,
                userGroup: usergroup
            }
            let addResult = await window.electronAPI.addUser(userData);
            if(addResult.success) {
                users = await window.electronAPI.getUsers();
                if(users.success) {
                    users = users.users;
                } else {
                    alert("加载用户失败...");
                    return;
                }
                populateUserTable();
                document.getElementById('add-user-success').classList.remove('d-none');
                document.getElementById('add-user-error').classList.add('d-none');
                addUserForm.reset();
                setTimeout(() => {
                    const addUserModal = bootstrap.Modal.getInstance(document.getElementById    ('addUserModal'));
                    addUserModal.hide();
                    document.getElementById('add-user-success').classList.add('d-none');
                }, 1000);
            }
        } else {
            // 显示错误消息
            document.getElementById('add-user-error').classList.remove('d-none');
            document.getElementById('add-user-success').classList.add('d-none');
        }
    });

    // 辅助函数：格式化日期为 YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = (`0${date.getMonth() + 1}`).slice(-2);
        const day = (`0${date.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
    }

    // 辅助函数：格式化时间为 HH:MM
    function formatTime(date) {
        const hours = (`0${date.getHours()}`).slice(-2);
        const minutes = (`0${date.getMinutes()}`).slice(-2);
        return `${hours}:${minutes}`;
    }

    // 设置默认日期范围为最近7天
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // 包含今天，共7天

    document.getElementById('start-date').value = formatDate(sevenDaysAgo);
    document.getElementById('end-date').value = formatDate(today);

    // 模拟使用量数据（默认7天）
    let usageData = {
        labels: generateDateLabels(today, 7, 'daily'),
        total: generateRandomData(7, 500, 1000),
        submodels: {
            'GPT-4': generateRandomData(7, 200, 500),
            'GPT-3.5': generateRandomData(7, 300, 600),
            'GPT-4o': generateRandomData(7, 100, 300)
        }
    };

    // 生成日期标签，根据granularity（'hourly' 或 'daily'）
    function generateDateLabels(endDate, numPoints, granularity) {
        const labels = [];
        if (granularity === 'hourly') {
            for (let i = 0; i < numPoints; i++) {
                const d = new Date(endDate);
                d.setHours(endDate.getHours() - (numPoints - 1 - i));
                labels.push(`${formatTime(d)}`);
            }
        } else { // 'daily'
            for (let i = numPoints - 1; i >= 0; i--) {
                const d = new Date(endDate);
                d.setDate(endDate.getDate() - i);
                labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
            }
        }
        return labels;
    }

    // 生成随机数据
    function generateRandomData(numPoints, min, max) {
        const data = [];
        for (let i = 0; i < numPoints; i++) {
            data.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return data;
    }

    // 初始化使用量曲线图
    const ctx = document.getElementById('usageLineChart').getContext('2d');
    let usageLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: usageData.labels,
            datasets: [
                {
                    label: '总用量',
                    data: usageData.total,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'GPT-4',
                    data: usageData.submodels['GPT-4'],
                    borderColor: '#ff6c70',
                    backgroundColor: 'rgba(255, 108, 112, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'GPT-3.5',
                    data: usageData.submodels['GPT-3.5'],
                    borderColor: '#4fd4ff',
                    backgroundColor: 'rgba(79, 212, 255, 0.1)',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'GPT-4o',
                    data: usageData.submodels['GPT-4o'],
                    borderColor: '#d0a6f0',
                    backgroundColor: 'rgba(208, 166, 240, 0.1)',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#555'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#555'
                    }
                },
                y: {
                    ticks: {
                        color: '#555'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // 更新图表数据
    document.getElementById('update-chart').addEventListener('click', () => {
        const startDateInput = document.getElementById('start-date').value;
        const endDateInput = document.getElementById('end-date').value;
        const startDate = new Date(startDateInput);
        const endDate = new Date(endDateInput);

        if (startDate > endDate) {
            alert('开始日期不能晚于结束日期');
            return;
        }

        // 计算日期差异
        const timeDiff = endDate - startDate;
        const dayInMs = 1000 * 60 * 60 * 24;
        const dayDiff = Math.ceil(timeDiff / dayInMs) + 1;

        let granularity = 'daily';
        let numPoints = dayDiff;
        if (dayDiff <= 1) {
            granularity = 'hourly';
            numPoints = 24; // 每小时一个点
        } else if (dayDiff <= 7) {
            granularity = 'daily';
            numPoints = dayDiff;
        } else {
            granularity = 'daily'; // 你可以根据需要添加更多的粒度选项
            numPoints = dayDiff;
        }

        // 生成新的标签和数据
        const newLabels = generateDateLabels(endDate, numPoints, granularity);
        const newTotalData = generateRandomData(numPoints, 500, 1000);
        const newGPT4Data = generateRandomData(numPoints, 200, 500);
        const newGPT35Data = generateRandomData(numPoints, 300, 600);
        const newGPT4oData = generateRandomData(numPoints, 100, 300);

        // 更新图表数据
        usageLineChart.data.labels = newLabels;
        usageLineChart.data.datasets[0].data = newTotalData;
        usageLineChart.data.datasets[1].data = newGPT4Data;
        usageLineChart.data.datasets[2].data = newGPT35Data;
        usageLineChart.data.datasets[3].data = newGPT4oData;
        usageLineChart.update();
    });

    // 初始化近7日子模型调用次数柱状图
    const submodelData = {
        labels: ['GPT-4', 'GPT-3.5', 'GPT-4o'],
        datasets: [
            {
                label: '调用次数',
                data: [350, 500, 150],
                backgroundColor: ['#ff6c70', '#4fd4ff', '#d0a6f0']
            }
        ]
    };

    const ctxBar = document.getElementById('submodelBarChart').getContext('2d');
    const submodelBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: submodelData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#555'
                    }
                },
                y: {
                    ticks: {
                        color: '#555'
                    },
                    beginAtZero: true
                }
            }
        }
    });

    // 生成近7日子模型调用次数（模拟数据）
    function updateSubmodelBarChart() {
        submodelBarChart.data.datasets[0].data = [
            Math.floor(Math.random() * 500),
            Math.floor(Math.random() * 600),
            Math.floor(Math.random() * 300)
        ];
        submodelBarChart.update();
    }

    // 每天刷新一次调用次数
    setInterval(updateSubmodelBarChart, 86400000); // 24小时
});
