(function () {
    "use strict";
    if (window.hijackWebContent == true) return;
    window.hijackWebContent = true;
    function onTimerHijackLogo() {
        var spans = document.querySelectorAll('span');
        var targetSpans = Array.from(spans).filter(span => span.innerText.trim() === '查看套餐')[0];
        targetSpans.innerText = "BIT超级共享GPT";
        targetSpans.style = "font-weight:     bold;background: linear-gradient(45deg, #ff9a8b, #ff6a88,#d0a6f0, #4fd4ff,     #ff6c70); -webkit-background-clip: text;color:transparent;";
        targetSpans.parentNode.childNodes[1].innerText = "由RBH开发,感谢合购";
    }
    setInterval(onTimerHijackLogo, 1000);
})();
