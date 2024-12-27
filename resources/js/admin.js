document.addEventListener('DOMContentLoaded', async () => {
    // 获取用户数据
    let users = await window.electronAPI.getUsers();
    console.log(users);
    if (users.success) {
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
                <td><button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}">删除</button></td>
            `;
            tableBody.appendChild(tr);
        });

        const deleteButtons = document.querySelectorAll('.delete-user-btn');

        deleteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const userId = button.getAttribute('data-user-id');
                const confirmed = confirm('确定要删除该用户吗？');
                if (confirmed) {
                    const result = await window.electronAPI.deleteUser(parseInt(userId));
                    console.log(result);
                    if (result.success) {
                        alert('用户已成功删除。');
                        // 重新获取用户列表
                        users = await window.electronAPI.getUsers();
                        if (users.success) {
                            users = users.users;
                            populateUserTable();
                        } else {
                            alert("重新加载用户列表失败...");
                        }
                    } else {
                        alert(`删除用户失败: ${result.message}`);
                    }
                }
            });
        });
    }

    populateUserTable();

    // 处理添加用户表单
    const addUserForm = document.getElementById('add-user-form');
    addUserForm.addEventListener('submit', async (e) => {
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
            if (addResult.success) {
                users = await window.electronAPI.getUsers();
                if (users.success) {
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
                    const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                    addUserModal.hide();
                    document.getElementById('add-user-success').classList.add('d-none');
                }, 1000);
            } else {
                // 显示后端返回的错误消息
                document.getElementById('add-user-error').textContent = addResult.message || '添加用户失败。';
                document.getElementById('add-user-error').classList.remove('d-none');
                document.getElementById('add-user-success').classList.add('d-none');
            }
        } else {
            // 显示错误消息
            document.getElementById('add-user-error').textContent = '用户名、密码、昵称和用户组为必填项。';
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

    // 初始化使用量折线图
    const ctx = document.getElementById('usageLineChart').getContext('2d');
    let usageLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // 将在 fetchAndPopulateUsageData 中填充
            datasets: []
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

    // 初始化子模型调用次数柱状图
    const submodelBarChart = new Chart(document.getElementById('submodelBarChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: [], // 将在 fetchAndPopulateUsageData 中填充
            datasets: [
                {
                    label: '调用次数',
                    data: [],
                    backgroundColor: [] // 将在 fetchAndPopulateUsageData 中填充
                }
            ]
        },
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

    // 定义颜色调色板
    const colorPalette = [
        '#ff6c70', '#4fd4ff', '#d0a6f0',
        '#34a853', '#fbbc05', '#ea4335', '#4285f4',
        '#db4437', '#0f9d58', '#ab47bc', '#00acc1',
        '#ff7043', '#9ccc65', '#5c6bc0', '#ffca28',
        '#8e24aa', '#00bcd4', '#ff5722', '#aed581'
    ];
    let colorIndex = 0;
    const modelColorMap = {}; // 用于存储模型与颜色的映射

    // 获取并填充用量数据
    await fetchAndPopulateUsageData(formatDate(sevenDaysAgo), formatDate(today));

    // 更新图表数据
    document.getElementById('update-chart').addEventListener('click', async () => {
        const startDateInput = document.getElementById('start-date').value;
        const endDateInput = document.getElementById('end-date').value;
        const startDate = new Date(startDateInput);
        const endDate = new Date(endDateInput);

        if (startDate > endDate) {
            alert('开始日期不能晚于结束日期');
            return;
        }

        await fetchAndPopulateUsageData(startDateInput, endDateInput);
    });

    /**
     * 获取并填充所有用户的用量数据
     * @param {string} startTime - 查询开始时间 (YYYY-MM-DD)
     * @param {string} endTime - 查询结束时间 (YYYY-MM-DD)
     */
    async function fetchAndPopulateUsageData(startTime, endTime) {
        try {
            const isoStartTime = new Date(startTime).toISOString();
            const isoEndTime = new Date(endTime).toISOString();

            const result = await window.electronAPI.getAllUsersUsageDetails(isoStartTime, isoEndTime);
            console.log("getAllUsersUsageDetails", result);
            if (result.success) {
                const usageDetails = result.usage;
                // 处理用量数据
                const aggregatedData = aggregateUsageData(usageDetails, startTime, endTime);
                // 更新图表
                updateUsageLineChart(aggregatedData.labels, aggregatedData.datasets);
                updateSubmodelBarChart(aggregatedData.submodelsTotal);
            } else {
                alert(`加载用量数据失败: ${result.message}`);
            }
        } catch (error) {
            console.error('获取用量数据时出错:', error);
            alert('获取用量数据时出错，请检查控制台日志。');
        }
    }

    /**
     * 聚合用量数据以适应图表显示
     * @param {array} usageDetails - 后端返回的用量详细数据
     * @param {string} startDate - 查询开始日期 (YYYY-MM-DD)
     * @param {string} endDate - 查询结束日期 (YYYY-MM-DD)
     * @returns {object} - 包含标签、数据集和子模型总用量
     */
    function aggregateUsageData(usageDetails, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dayDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const labels = [];
        const totalUsage = {};
        const submodelsUsage = {};
        const submodelsTotal = {};

        // 初始化标签和数据
        for (let i = 0; i < dayDiff; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const label = `${current.getMonth() + 1}/${current.getDate()}`;
            labels.push(label);
            totalUsage[label] = 0;
        }

        // 动态收集所有模型
        usageDetails.forEach(entry => {
            if (!submodelsUsage[entry.model]) {
                submodelsUsage[entry.model] = {};
                submodelsTotal[entry.model] = 0;
            }
            // Initialize usage count for each date if not present
            const usageDate = new Date(entry.usage_time);
            const label = `${usageDate.getMonth() + 1}/${usageDate.getDate()}`;
            if (!submodelsUsage[entry.model][label]) {
                submodelsUsage[entry.model][label] = 0;
            }
            // 聚合用量数据
            totalUsage[label] += 1;
            submodelsUsage[entry.model][label] += 1;
            submodelsTotal[entry.model] += 1;
        });

        // 准备图表数据集
        const datasets = [
            {
                label: '总用量',
                data: [],
                borderColor: '#1a73e8',
                backgroundColor: 'rgba(26, 115, 232, 0.1)',
                fill: true,
                tension: 0.4
            }
        ];

        // 动态添加每个模型的数据集
        Object.keys(submodelsUsage).forEach(model => {
            // 如果模型还没有分配颜色，分配一个
            if (!modelColorMap[model]) {
                modelColorMap[model] = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
            }
            const modelColor = modelColorMap[model];
            const dataset = {
                label: model,
                data: [],
                borderColor: modelColor,
                backgroundColor: `${modelColor}1A`, // 10%透明度
                fill: false,
                tension: 0.4
            };
            datasets.push(dataset);
        });

        // 填充总用量数据和每个模型的数据
        labels.forEach(label => {
            datasets[0].data.push(totalUsage[label] || 0);
            Object.keys(submodelsUsage).forEach(model => {
                datasets.find(ds => ds.label === model).data.push(submodelsUsage[model][label] || 0);
            });
        });

        return {
            labels,
            datasets,
            submodelsTotal
        };
    }

    /**
     * 更新使用量折线图
     * @param {array} labels - 图表标签
     * @param {array} datasets - 图表数据集
     */
    function updateUsageLineChart(labels, datasets) {
        usageLineChart.data.labels = labels;
        usageLineChart.data.datasets = datasets; // 直接替换整个数据集
        usageLineChart.update();
    }

    /**
     * 更新子模型调用次数柱状图
     * @param {object} submodelsTotal - 子模型总调用次数
     */
    function updateSubmodelBarChart(submodelsTotal) {
        const models = Object.keys(submodelsTotal);
        const usageCounts = models.map(model => submodelsTotal[model] || 0);
        const backgroundColors = models.map(model => modelColorMap[model] || '#cccccc');

        submodelBarChart.data.labels = models;
        submodelBarChart.data.datasets[0].data = usageCounts;
        submodelBarChart.data.datasets[0].backgroundColor = backgroundColors;
        submodelBarChart.update();
    }
});
