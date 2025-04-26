console.log("你好，消息折叠插件脚本开始运行了！");
// --- Message Toggle Plugin JavaScript ---
(function() {
    console.log("Message Toggle Plugin Loaded");

    // --- 配置区域 ---
    // !! 重要 !!: 下面的类名需要根据你SillyTavern的实际HTML结构修改
    const messageContainerSelector = '#chat';      // 包含所有消息的聊天区域容器的选择器 (通常是 #chat)
    const messageSelector = '.mes';               // 单条消息的容器的选择器 (需要检查确认)
    const messageContentSelector = '.mes_text';    // 消息内容的元素选择器 (需要检查确认)
    // --- 配置区域结束 ---

    // 函数：为单个消息元素添加切换按钮
    function addToggleButton(messageElement) {
        // 检查是否已经添加过按钮，避免重复添加
        if (messageElement.querySelector('.message-toggle-button')) {
            return;
        }

        // 找到消息内容元素
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) {
            // 如果找不到内容元素，就不添加按钮 (比如系统消息可能结构不同)
            // console.log("Content element not found in:", messageElement);
            return;
        }

        // 创建按钮
        const button = document.createElement('button');
        button.className = 'message-toggle-button';
        // button.textContent = '▼'; // 使用CSS伪元素来显示三角

        // 添加点击事件监听器
        button.addEventListener('click', function() {
            // 切换内容元素的 'collapsed' 类
            contentElement.classList.toggle('collapsed');
            // 切换按钮本身的 'collapsed' 类 (用于改变三角方向)
            button.classList.toggle('collapsed');
        });

        // 将按钮添加到消息元素的最前面
        // messageElement.insertBefore(button, messageElement.firstChild);
        // 或者直接添加到消息元素的特定位置（如果CSS是绝对定位，添加到哪里关系不大，只要在messageElement内）
        messageElement.appendChild(button); // 使用绝对定位后，放哪里不重要了
    }

    // 函数：处理聊天区域的新增消息
    function handleNewMessages(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    // 检查添加的节点是否是消息元素本身
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches(messageSelector)) {
                        addToggleButton(node);
                    }
                    // 有些情况下，消息是嵌套在其他元素里的，需要查找
                    else if (node.nodeType === Node.ELEMENT_NODE) {
                        node.querySelectorAll(messageSelector).forEach(addToggleButton);
                    }
                });
            }
        }
    }

    // 等待聊天容器加载完成
    const observerTarget = document.querySelector(messageContainerSelector);
    if (observerTarget) {
        // 初始处理已存在的消息
        observerTarget.querySelectorAll(messageSelector).forEach(addToggleButton);

        // 创建一个观察器实例来监听聊天容器的子节点变化
        const observer = new MutationObserver(handleNewMessages);

        // 配置观察器：监听子节点的添加
        const config = { childList: true, subtree: true }; // subtree: true 可能需要，如果消息不是直接子元素

        // 开始观察目标节点
        observer.observe(observerTarget, config);

        console.log("Message Toggle Observer Started on:", messageContainerSelector);
    } else {
        console.error("Message Toggle Plugin: Could not find chat container with selector:", messageContainerSelector);
        // 可以尝试延迟执行或监听DOM加载完成
        document.addEventListener('DOMContentLoaded', () => {
            const observerTargetRetry = document.querySelector(messageContainerSelector);
            if (observerTargetRetry) {
                 observerTargetRetry.querySelectorAll(messageSelector).forEach(addToggleButton);
                 const observerRetry = new MutationObserver(handleNewMessages);
                 const configRetry = { childList: true, subtree: true };
                 observerRetry.observe(observerTargetRetry, configRetry);
                 console.log("Message Toggle Observer Started after DOMContentLoaded on:", messageContainerSelector);
            } else {
                 console.error("Message Toggle Plugin: Still could not find chat container after DOMContentLoaded.");
            }
        });
    }

})(); // 立即执行函数，避免污染全局作用域