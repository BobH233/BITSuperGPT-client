(function () {
    "use strict";
    if (window.hijackWebContent == true) return;
    window.hijackWebContent = true;
    function onTimerHijackLogo() {
        var spans = document.querySelectorAll('span');
        var targetSpans = Array.from(spans).filter(span => span.innerText.trim() === '查看套餐')[0];
        if (targetSpans) {
            targetSpans.innerText = "BIT超级共享GPT";
            targetSpans.style = "font-weight:     bold;background: linear-gradient(45deg, #ff9a8b, #ff6a88,#d0a6f0, #4fd4ff,     #ff6c70); -webkit-background-clip: text;color:transparent;";
            targetSpans.parentNode.childNodes[1].innerText = "由RBH开发,感谢合购";
        }
    }
    let scaleFactor = 1;
    window.addEventListener('wheel', (event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault(); // 阻止默认的滚动行为

            // 判断滚动方向
            if (event.deltaY < 0) {
                scaleFactor *= 1.1; // 向上滚动，放大
            } else {
                scaleFactor /= 1.1; // 向下滚动，缩小
            }

            // 限制缩放范围，防止无限放大或缩小
            scaleFactor = Math.min(Math.max(scaleFactor, 0.5), 3);

            // 设置网页的缩放级别
            document.body.style.transform = `scale(${scaleFactor})`;
            document.body.style.transformOrigin = '0 0'; // 缩放的起点
        }
    });
    setInterval(onTimerHijackLogo, 1000);
})();
