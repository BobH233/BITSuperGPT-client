(function () {
    'use strict';
    if(window.hookedUsage == true) return;
    window.hookedUsage = true;
    console.log("Hooking usage...");
    function process_conversation_json_result(request_body, json_result) {
        try {
            const request_body_json = JSON.parse(request_body);
            let model = request_body_json['model'];
            if(json_result["type"] == "message_stream_complete" && request_body_json["conversation_id"] != undefined) {
                report_conversation_usage(json_result["conversation_id"], model, false);
            }
            if(json_result["type"] == "title_generation") {
                report_conversation_usage(json_result["conversation_id"], model, true);
            }
            // 专门给自己新建会话的时候用的,防止自己的会话被误隐藏掉
            if(json_result["v"] && json_result["v"]["conversation_id"]) {
                console.log("!!!!!!!!!!!", json_result["v"]["conversation_id"]);
                if(window.isolationIdCache) {
                    window.isolationIdCache.add(json_result["v"]["conversation_id"]);
                    window.isolationIdCacheSave();
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    function extractDeltaJsons(inputStr) {
        const jsonTexts = [];
        const lines = inputStr.split(/\r?\n/);
        let collecting = false;
        let currentJson = '';
        let braceStack = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('data:')) {
                // 重置状态
                collecting = false;
                currentJson = '';
                braceStack = [];

                // 提取 `data:` 后的内容
                const dataContent = line.slice(5).trim();

                // 判断是否以 { 或 [ 开头，表示 JSON 对象或数组
                if (dataContent.startsWith('{') || dataContent.startsWith('[')) {
                    collecting = true;
                    currentJson += dataContent;

                    // 初始化括号栈
                    for (const char of dataContent) {
                        if (char === '{' || char === '[') {
                            braceStack.push(char);
                        } else if (char === '}' || char === ']') {
                            const last = braceStack.pop();
                            if (
                                (char === '}' && last !== '{') ||
                                (char === ']' && last !== '[')
                            ) {
                                // 括号不匹配，可能有语法错误
                                collecting = false;
                                break;
                            }
                        }
                    }

                    // 如果括号已经匹配，添加到结果
                    if (braceStack.length === 0) {
                        jsonTexts.push(currentJson);
                        collecting = false;
                    }
                }
            } else if (collecting) {
                // 继续收集多行 JSON
                currentJson += '\n' + line;

                // 更新括号栈
                for (const char of line) {
                    if (char === '{' || char === '[') {
                        braceStack.push(char);
                    } else if (char === '}' || char === ']') {
                        const last = braceStack.pop();
                        if (
                            (char === '}' && last !== '{') ||
                            (char === ']' && last !== '[')
                        ) {
                            // 括号不匹配，停止收集
                            collecting = false;
                            break;
                        }
                    }
                }

                // 如果括号匹配完成，添加到结果
                if (braceStack.length === 0) {
                    jsonTexts.push(currentJson);
                    collecting = false;
                }
            }
        }

        return jsonTexts;
    }

    function process_conversation_result(request_body, delta_value) {
        const json_texts = extractDeltaJsons(delta_value);
        // console.log("length!!:", json_texts.length);
        json_texts.forEach((json, index) => {
            try {
                const parsed = JSON.parse(json);
                process_conversation_json_result(request_body, parsed);
            } catch (error) {
                console.error(`JSON ${index + 1} 解析错误:`, error);
            }
        });
    }

    function report_conversation_usage(conversation_id, model, is_new) {
        console.log("report: ", conversation_id, model, is_new);
        window.electronAPI.recordUsage(model, conversation_id, is_new);
    }

    const originalFetch = window.fetch;
    window.fetch = async function (resource, options) {
        const response = await originalFetch(resource, options);
        if (resource === "https://chatgpt.com/backend-api/conversation") {

            const request_body = options.body;
            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let done, value;
                let chunks = [];

                // 创建一个新的可读流，将原始流包装在里面
                const stream = new ReadableStream({
                    start(controller) {
                        // 处理原始流并解码
                        async function push() {
                            // 读取原始流数据
                            const { done, value } = await reader.read();

                            if (done) {
                                controller.close();  // 关闭流
                                return;
                            }

                            // 将读取的二进制数据解码并打印到控制台
                            const decoded = decoder.decode(value, { stream: true });
                            process_conversation_result(request_body, decoded);

                            // 继续将数据传递给调用方
                            controller.enqueue(value);
                            push();
                        }

                        push(); // 启动数据读取
                    }
                });

                // 创建新的响应并返回，使用包装后的流
                const newResponse = new Response(stream, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                });

                return newResponse; // 返回新响应，保持流式传输
            }
        }

        return response; // 如果不是目标 URL，直接返回原始响应
    };
})();