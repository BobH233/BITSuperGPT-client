
document.addEventListener('DOMContentLoaded', async() => {
    let login_state = await window.electronAPI.checkLogin();
    console.log("login_state", login_state);
    if(login_state.loggedIn) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("title").innerText = "已登录,跳转中...";
        window.location.href = "https://chatgpt.com/";
    }
});

document.getElementById('login-btn').addEventListener('click', async() => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    errorMessage.style.display = 'none';
    if (!username || !password) {
        errorMessage.textContent = '账号和密码不能为空！';
        errorMessage.style.display = 'block';
    } else {
        let result = await window.electronAPI.login(username, password);
        if(result.success) {
            document.getElementById("loginBox").style.display = "none";
            document.getElementById("title").innerText = "登陆成功,跳转中...";
            window.location.href = "https://chatgpt.com/";
        } else {
            errorMessage.textContent = '登录失败, 检查账号或者密码!';
            errorMessage.style.display = 'block';
        }
    }
});

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        document.getElementById('login-btn').click();
    }
}

document.getElementById('username').addEventListener('keypress', handleKeyPress);
document.getElementById('password').addEventListener('keypress', handleKeyPress);
