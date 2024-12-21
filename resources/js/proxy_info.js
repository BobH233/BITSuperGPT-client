window.onload = async() => {
    let result = await window.electronAPI.getProxyInfo();
    document.getElementById("server-ip").innerText = `${result.server}`;
    document.getElementById("remote-port").innerText = `${result.server_port}`;
    document.getElementById("local-port").innerText = `${result.local_port}`;
    document.getElementById("encryption-method").innerText = `${result.method}`;

    if(result.singBoxRunning) {
        document.getElementById("proxy-state").innerText = `运行中(${result.singBoxPid})`;
        document.getElementById("proxy-state").style.color = "#28e200";
    } else {
        document.getElementById("proxy-state").innerText = `已终止`;
        document.getElementById("proxy-state").style.color = "red";
    }

    console.log(result);
}