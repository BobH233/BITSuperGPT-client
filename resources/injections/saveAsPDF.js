(function () {
    "use strict";
    if (window.saveAsPDFLoaded == true) return;
    window.saveAsPDFLoaded = true;

    /**
 * 隐藏除了指定元素之外的所有元素，并确保目标元素的布局不受限制
 * @param {HTMLElement} targetElement - 需要保留显示的目标元素
 * @returns {Object} - 包含原始样式的对象，用于后续恢复
 */
    function hideEverythingExcept(targetElement) {
        const allElements = document.body.getElementsByTagName("*");
        const elementsToHide = [];

        // 收集目标元素的所有祖先元素
        const ancestors = new Set();
        let current = targetElement;
        while (current) {
            ancestors.add(current);
            current = current.parentElement;
        }

        // 收集需要隐藏的元素（不在祖先集合中且不在目标元素的子集内）
        for (let el of allElements) {
            if (!ancestors.has(el) && !targetElement.contains(el)) {
                elementsToHide.push(el);
            }
        }

        // 保存原始 display 样式，并隐藏元素
        const originalDisplay = new Map();
        for (let el of elementsToHide) {
            originalDisplay.set(el, el.style.display);
            el.style.display = 'none';
        }

        // 确保目标元素及其祖先的高度为 auto，避免受限
        const originalStyles = new Map();
        current = targetElement;
        while (current) {
            originalStyles.set(current, {
                height: current.style.height,
                overflow: current.style.overflow,
            });
            current.style.height = 'auto';
            current.style.overflow = 'visible';
            current = current.parentElement;
        }

        // 移除页面的滚动条
        const originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'visible';

        return { originalDisplay, originalStyles, originalBodyOverflow };
    }

    /**
     * 恢复被隐藏元素和样式的原始状态
     * @param {Object} originalStylesObj - 包含原始 display 和其他样式的对象
     */
    function restoreElements({ originalDisplay, originalStyles, originalBodyOverflow }) {
        // 恢复被隐藏元素的 display 样式
        for (let [el, display] of originalDisplay) {
            el.style.display = display;
        }

        // 恢复目标元素及其祖先的原始样式
        for (let [el, styles] of originalStyles) {
            el.style.height = styles.height;
            el.style.overflow = styles.overflow;
        }

        // 恢复 body 的 overflow 样式
        document.body.style.overflow = originalBodyOverflow;
    }

    /**
     * 主函数，执行隐藏、保存 PDF 和恢复
     * @param {string} elementId - 需要保留显示的元素的 ID
     */
    async function saveElementAsPDF(targetElement) {

        // 隐藏其他元素并调整样式
        const originalStylesObj = hideEverythingExcept(targetElement);

        try {
            // 调用主进程的保存 PDF 功能
            document.body.style.cursor = 'wait';
            const result = await window.electronAPI.savePDFAs();
            document.body.style.cursor = 'default';
            
            if (result.success) {
                console.log('PDF 保存成功，路径:', result.filePath);
                alert(`PDF 已保存到: ${result.filePath}`);
            } else {
                console.log('PDF 保存已取消或出错');
                if (result.message) {
                    alert(`保存 PDF 失败: ${result.message}`);
                } else {
                    alert('保存 PDF 操作已取消');
                }
            }
        } catch (error) {
            console.error('保存 PDF 时出错:', error);
            alert('保存 PDF 时出错，请检查控制台日志。');
        } finally {
            // 恢复被隐藏的元素和原始样式
            restoreElements(originalStylesObj);
        }
    }

    document.addEventListener('keydown', async function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            let articles = document.getElementsByTagName("article");
            if (articles.length == 0) {
                alert("保存会话需要至少有一个对话记录！");
                return;
            }
            const targetElement = articles[0].parentNode;
            saveElementAsPDF(targetElement);
        }
    });
})();
