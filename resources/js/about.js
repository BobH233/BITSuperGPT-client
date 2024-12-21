window.onload = async() => {
    let result = await window.electronAPI.getProgramInfo();
    document.getElementById("version").innerText = result.version;
    console.log(result);
}