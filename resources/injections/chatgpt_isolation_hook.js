(function () {
  "use strict";
  if (window.hookedIsolation == true) return;
  window.hookedIsolation = true;
  window.isolationIdCache = new Set();
  window.isolationIdCacheSave = () => {
    localStorage.setItem(
      "isolationIdCacheSave",
      JSON.stringify(Array.from(window.isolationIdCache))
    );
  };
  window.isolationIdCacheLoad = () => {
    const storedData = localStorage.getItem("isolationIdCacheSave");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      parsedData.forEach((item) => window.isolationIdCache.add(item));
    }
  };
  window.isolationIdCacheLoad();
  window.cacheUserInfo = null;
  console.log("Doing isolation hook");

  const originalFetch = window.fetch;
  window.fetch = async function (resource, options) {
    const response = await originalFetch(resource, options);

    if (resource.startsWith("https://chatgpt.com/backend-api/conversations?")) {
      console.log("Request URL:", resource);

      // 解析响应的 JSON 数据
      const responseJson = await response.json();
      console.log("Original JSON Response:", responseJson);

      await updateIsolcationCache(responseJson);
      // 创建新的 Response 对象，修改后的 JSON 数据
      const modifiedResponse = new Response(JSON.stringify(responseJson), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // 返回修改后的响应
      return modifiedResponse;
    }

    return response; // 如果不是目标 URL，直接返回原始响应
  };

  function findParentLi(element) {
    while (element) {
      if (element.tagName === "LI") {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  function findChatIdOfLi(liElem) {
    const firstAnchor = liElem.querySelector("a");
    return firstAnchor ? firstAnchor.getAttribute("href") : null;
  }

  function hideLi(elemLi) {
    elemLi.style.opacity = "0.1";
  }
  function onTimerCheckLiElementsAndHide() {
    const liElements = document.getElementsByTagName("li");
    Array.from(liElements).forEach((node) => {
      let parentLi = findParentLi(node);
      if (parentLi) {
        let chatId = findChatIdOfLi(parentLi);
        if (chatId) {
          // chatId = chatId.replace("/c/", "");
          const parts = chatId.split('/');
          chatId = parts[parts.length - 1];

          if (!window.isolationIdCache.has(chatId)) {
            hideLi(parentLi);
          }
        }
      }
    });
  }

  setInterval(onTimerCheckLiElementsAndHide, 1000);

  async function updateIsolcationCache(responseJson) {
    try {
      if (window.cacheUserInfo == null) {
        window.cacheUserInfo = await window.electronAPI.checkLogin();
      }
      // console.log("[UserInfo]", window.cacheUserInfo);
      let allIds = [];
      for (let i = 0; i < responseJson.items.length; i++) {
        allIds.push(responseJson.items[i].id);
      }
      const isolationIds = await window.electronAPI.filterConversation(
        window.cacheUserInfo.user.id,
        allIds
      );
      // console.log("[isolationIds]", isolationIds);
      for (let i = 0; i < isolationIds.conversation_ids.length; i++) {
        window.isolationIdCache.add(isolationIds.conversation_ids[i]);
        window.isolationIdCacheSave();
      }
    } catch (err) {
      console.error("isolationCacheError:", err);
    }
  }
})();
