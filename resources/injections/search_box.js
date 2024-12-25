(function() {
    // 创建并插入CSS样式
    const style = document.createElement('style');
    style.innerHTML = `
        /* 自定义搜索框样式 */
        #custom-search-box {
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -20%);
            background-color: #fff;
            border: 1px solid #ccc;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            display: none; /* 初始隐藏 */
            border-radius: 5px;
            font-family: Arial, sans-serif;
            display: flex;
            flex-wrap: wrap; /* 允许换行 */
            align-items: center;
            justify-content: center; /* 水平居中 */
            max-width: 90%; /* 使搜索框在极窄的页面下自适应 */
            box-sizing: border-box;
        }
        #custom-search-box input {
            flex: 1 1 300px; /* 输入框可伸缩，初始宽度300px */
            padding: 8px;
            font-size: 16px;
            border: 1px solid #ccc;
            border-radius: 3px;
            color: black;
            min-width: 150px; /* 最小宽度，防止过窄时变形 */
        }
        /* 按钮容器 */
        #buttons-container {
            display: flex;
            flex-wrap: nowrap; /* 按钮不换行，整体换行 */
            justify-content: center; /* 居中对齐 */
            margin-left: 10px;
            margin-top: 0; /* 初始无上边距 */
            margin-top: 20px;
        }
        #buttons-container button {
            padding: 8px 12px;
            font-size: 16px;
            margin-left: 5px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            flex: 0 0 auto; /* 按钮不伸缩 */
        }
        #buttons-container button:first-child {
            margin-left: 0; /* 第一个按钮不需要左边距 */
        }
        #search-button {
            background-color: #28a745;
            color: #fff;
        }
        #prev-button, #next-button {
            background-color: #007bff;
            color: #fff;
        }
        #close-button {
            background-color: #dc3545;
            color: #fff;
        }
        /* 高亮样式 */
        .highlight {
            background-color: yellow;
        }
        .current-highlight {
            background-color: orange;
        }

        /* 响应式调整 */
        @media (max-width: 600px) {
            #custom-search-box {
                flex-direction: column; /* 纵向排列 */
                align-items: stretch; /* 子元素拉伸以适应宽度 */
            }
            #buttons-container {
                width: 100%;
                justify-content: center;
                margin-left: 0;
                margin-top: 10px; /* 当换行时，按钮容器有上边距 */
            }
            #buttons-container button {
                flex: 1 1 auto; /* 按钮可以伸缩 */
                margin-left: 5px;
                margin-right: 5px;
            }
        }
    `;
    document.head.appendChild(style);

    // 创建搜索框容器
    const searchBox = document.createElement('div');
    searchBox.id = 'custom-search-box';
    searchBox.style.display = "none";

    // 创建输入框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search-input';
    searchInput.placeholder = '输入搜索内容...';

    // 创建按钮容器
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'buttons-container';

    // 创建按钮
    const searchButton = document.createElement('button');
    searchButton.id = 'search-button';
    searchButton.textContent = '搜索';

    const prevButton = document.createElement('button');
    prevButton.id = 'prev-button';
    prevButton.textContent = '上一个';

    const nextButton = document.createElement('button');
    nextButton.id = 'next-button';
    nextButton.textContent = '下一个';

    const closeButton = document.createElement('button');
    closeButton.id = 'close-button';
    closeButton.textContent = '关闭';

    // 将按钮添加到按钮容器
    buttonsContainer.appendChild(searchButton);
    buttonsContainer.appendChild(prevButton);
    buttonsContainer.appendChild(nextButton);
    buttonsContainer.appendChild(closeButton);

    // 将输入框和按钮容器添加到搜索框容器
    searchBox.appendChild(searchInput);
    searchBox.appendChild(buttonsContainer);

    // 将搜索框添加到body
    document.body.appendChild(searchBox);

    // 功能变量
    let matches = [];
    let currentIndex = -1;

    // 功能函数

    // 显示搜索框
    function showSearchBox() {
        searchBox.style.display = 'flex';
        searchInput.focus();
    }

    // 隐藏搜索框
    function hideSearchBox() {
        searchBox.style.display = 'none';
        clearHighlights();
        searchInput.value = '';
        matches = [];
        currentIndex = -1;
    }

    // 清除所有高亮
    function clearHighlights() {
        const highlights = document.querySelectorAll('.highlight, .current-highlight');
        highlights.forEach(elem => {
            const parent = elem.parentNode;
            parent.replaceChild(document.createTextNode(elem.textContent), elem);
            parent.normalize(); // 合并相邻的文本节点
        });
    }

    // 转义正则表达式特殊字符
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 遍历所有文本节点的函数
    function walk(node, callback) {
        let child = node.firstChild;
        while (child) {
            switch (child.nodeType) {
                case 1: // Element
                case 9: // Document
                case 11: // Document fragment
                    walk(child, callback);
                    break;
                case 3: // Text node
                    callback(child);
                    break;
            }
            child = child.nextSibling;
        }
    }

    // 执行搜索并高亮显示
    function performSearch() {
        clearHighlights();
        matches = [];
        currentIndex = -1;
        const query = searchInput.value.trim();
        if (query === '') return;

        // 创建一个正则表达式，忽略大小写，全局匹配
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');

        // 遍历所有文本节点并高亮匹配
        walk(document.body, function(node) {
            if (node.parentNode.nodeName !== 'SCRIPT' && node.parentNode.nodeName !== 'STYLE' && node.parentNode.id !== 'custom-search-box') {
                const matchesInNode = node.textContent.match(regex);
                if (matchesInNode) {
                    const newHTML = node.textContent.replace(regex, '<span class="highlight">$1</span>');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newHTML;
                    while (tempDiv.firstChild) {
                        node.parentNode.insertBefore(tempDiv.firstChild, node);
                    }
                    node.parentNode.removeChild(node);
                }
            }
        });

        // 收集所有高亮元素
        matches = Array.from(document.querySelectorAll('.highlight'));
        if (matches.length > 0) {
            currentIndex = 0;
            highlightCurrent();
        } else {
            alert('未找到匹配项');
        }
    }

    // 高亮当前选中项
    function highlightCurrent() {
        // 清除之前的当前高亮
        const currentHighlights = document.querySelectorAll('.current-highlight');
        currentHighlights.forEach(elem => elem.classList.remove('current-highlight'));

        if (currentIndex >= 0 && currentIndex < matches.length) {
            const currentElem = matches[currentIndex];
            currentElem.classList.add('current-highlight');
            currentElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 选择下一个匹配项
    function nextMatch() {
        if (matches.length === 0) return;
        currentIndex = (currentIndex + 1) % matches.length;
        highlightCurrent();
    }

    // 选择上一个匹配项
    function prevMatch() {
        if (matches.length === 0) return;
        currentIndex = (currentIndex - 1 + matches.length) % matches.length;
        highlightCurrent();
    }

    // 事件监听

    // 监听键盘事件，检测 Ctrl+F 或 Cmd+F
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
            event.preventDefault(); // 阻止默认的浏览器搜索框
            showSearchBox();
        }
    });

    // 监听搜索按钮点击
    searchButton.addEventListener('click', function(event) {
        event.stopPropagation(); // 防止事件冒泡导致隐藏搜索框
        performSearch();
    });

    // 监听关闭按钮点击
    closeButton.addEventListener('click', function(event) {
        event.stopPropagation();
        hideSearchBox();
    });

    // 监听输入框的回车键
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // 监听下一个按钮点击
    nextButton.addEventListener('click', function(event) {
        event.stopPropagation();
        nextMatch();
    });

    // 监听上一个按钮点击
    prevButton.addEventListener('click', function(event) {
        event.stopPropagation();
        prevMatch();
    });

    // 点击页面其他地方关闭搜索框
    document.addEventListener('click', function(event) {
        if (!searchBox.contains(event.target)) {
            hideSearchBox();
        }
    });

})();
