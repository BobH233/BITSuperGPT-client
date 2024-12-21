(function () {
    'use strict';

    if (window.auth0injection == true) return;
    window.auth0injection = true;

    function checkAndExecute() {
        const titleElement = document.getElementsByTagName("h1")[0];

        if (titleElement) {
            titleElement.innerHTML = "BIT超级共享GPT<br/>自动登录";

        }

        var ps = document.querySelectorAll('p');
        var targetps = Array.from(ps).filter(span => (span.innerText.indexOf("忘记密码") != -1))[0];
        if (targetps) {
            targetps.style.display = "none";
        }

        ps = document.querySelectorAll('p');
        targetps = Array.from(ps).filter(span => (span.innerText.indexOf("没有帐户") != -1))[0];
        if (targetps) {
            targetps.parentNode.style.display = "none";
        }

        ps = document.querySelectorAll('span');
        targetps = Array.from(ps).filter(span => (span.innerText.indexOf("或") != -1))[0];
        if (targetps) {
            targetps.parentNode.style.display = "none";
        }

        const allSubmitButtons = document.querySelectorAll('button[type="submit"]');
        const buttonsWithProvider = [];
        const buttonsWithoutProvider = [];

        allSubmitButtons.forEach(button => {
            if (button.hasAttribute('data-provider')) {
                buttonsWithProvider.push(button);
            } else {
                buttonsWithoutProvider.push(button);
            }
        });

        if (buttonsWithProvider[0]) {
            buttonsWithProvider[0].parentNode.parentNode.style.display = 'none';
        }

        const passwordLabels = document.querySelectorAll('[data-dynamic-label-for="password"]')[0];
        if (passwordLabels) {
            passwordLabels.innerHTML = "密码无需填写，点击继续自动填写"
        }
        document.getElementById("password").parentNode.parentNode.parentNode.style.display = "none";
        if (buttonsWithoutProvider[0]) {
            setTimeout(() => {
                buttonsWithoutProvider[0].removeAttribute("disabled");
                buttonsWithoutProvider[0].addEventListener('click', (event) => {
                    document.getElementById("password").value = "<__password_share__>";
                    event.stopImmediatePropagation();
                });
            }, 1000);
        }
        clearInterval(auth_page_timer);
    }

    const auth_page_timer = setInterval(checkAndExecute, 50);

})();