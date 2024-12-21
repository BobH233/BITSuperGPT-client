(function () {
    'use strict';

    if (window.authinjection == true) return;
    window.authinjection = true;

    function checkAndExecute() {
        const titleElement = document.getElementsByClassName("title")[0];

        if (titleElement) {
            titleElement.innerHTML = "欢迎使用<br/>BIT超级共享GPT";

            const continueBtn = document.getElementsByClassName("continue-btn")[0];
            if (continueBtn) {
                continueBtn.innerText = "一键登录";
                continueBtn.style = "font-weight:     bold;background: linear-gradient(45deg, #ff9a8b, #ff6a88,#d0a6f0, #4fd4ff,     #ff6c70);";
            }

            const otherPage = document.getElementsByClassName("other-page")[0];
            if (otherPage) otherPage.style.display = "none";

            const dividerWrapper = document.getElementsByClassName("divider-wrapper")[0];
            if (dividerWrapper) dividerWrapper.style.display = "none";

            const socialSection = document.getElementsByClassName("social-section")[0];
            if (socialSection) socialSection.style.display = "none";

            const oaiFooter = document.getElementsByClassName("oai-footer")[0];
            if (oaiFooter) oaiFooter.style.display = "none";

            const inputEmail = document.getElementsByClassName("input-wrapper")[0];
            if (inputEmail) inputEmail.style.display = "none";

            if (continueBtn) {
                setTimeout(() => {
                    continueBtn.removeAttribute("disabled");
                    continueBtn.addEventListener('click', (event) => {
                        window.location.href = window.location.href + "&login_hint=" + encodeURIComponent("<__email_share__>")
                        event.stopImmediatePropagation();
                    });
                }, 1000);
            }

            clearInterval(auth_page_timer);
        }
    }

    const auth_page_timer = setInterval(checkAndExecute, 50);

})();