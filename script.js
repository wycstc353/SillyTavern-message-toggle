// --- Message Toggle Plugin JavaScript (v1.3 - Dual Buttons, localStorage, No Animation) ---
(function() {
    console.log("你好，带 localStorage 持久化存储和双按钮的消息折叠插件脚本开始运行了！(v1.3)");

    // --- 配置区域 ---
    const messageContainerSelector = '#chat';
    const messageSelector = '.mes';
    const messageContentSelector = '.mes_text';
    const messageIdAttribute = 'mesid';
    const characterNameAttribute = 'ch_name';
    // const isUserAttribute = 'is_user'; // 不再直接需要is_user判断，统一用ch_name
    const storagePrefix = 'sillytavern_msg_toggle_';
    // --- 配置区域结束 ---

    // 函数：获取用于 localStorage 的唯一存储键 (和 v1.1 一样)
    function getStorageKey(messageElement) {
        const messageId = messageElement.getAttribute(messageIdAttribute);
        if (!messageId) { return null; }

        let chatIdentifier = messageElement.getAttribute(characterNameAttribute);
        if (!chatIdentifier) {
            // 备用逻辑：如果ch_name丢失，尝试用is_user区分
            const isUser = messageElement.getAttribute('is_user') === 'true';
            chatIdentifier = isUser ? 'user_fallback' : 'unknown_character_fallback';
            console.warn(`Message ${messageId} lacks 'ch_name', using fallback ID: ${chatIdentifier}`);
        }
        // 清理标识符
        chatIdentifier = chatIdentifier.replace(/[^\p{L}\p{N}_\-]/gu, '_');
        return `${storagePrefix}${chatIdentifier}_${messageId}`;
    }

    // 函数：为单个消息元素添加 *两个* 切换按钮
    function addToggleButtons(messageElement) {
        // 检查是否已存在按钮（检查任意一个即可）
        if (messageElement.querySelector('.message-toggle-button')) {
            return;
        }
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) {
            return;
        }

        const storageKey = getStorageKey(messageElement);
        if (!storageKey) {
            console.warn("Could not generate storage key for message, toggle buttons skipped:", messageElement);
            return; // 没有存储键，不添加按钮
        }

        // --- 创建两个按钮 ---
        const buttonStart = document.createElement('button');
        buttonStart.className = 'message-toggle-button message-toggle-button-start'; // 基础类 + 定位类

        const buttonEnd = document.createElement('button');
        buttonEnd.className = 'message-toggle-button message-toggle-button-end'; // 基础类 + 定位类

        // --- 加载持久化状态 ---
        let isInitiallyCollapsed = false;
        if (localStorage.getItem(storageKey) === 'true') {
            isInitiallyCollapsed = true;
            contentElement.classList.add('collapsed');
            // 同步两个按钮的初始状态
            buttonStart.classList.add('collapsed');
            buttonEnd.classList.add('collapsed');
        }

        // --- 定义通用的点击处理函数 ---
        const handleClick = function() {
            // 切换内容元素的 collapsed 类，并获取当前是否折叠
            const isNowCollapsed = contentElement.classList.toggle('collapsed');

            // 同步两个按钮的 collapsed 类
            // classList.toggle(className, force) 可以强制添加或移除
            buttonStart.classList.toggle('collapsed', isNowCollapsed);
            buttonEnd.classList.toggle('collapsed', isNowCollapsed);

            // --- 保存持久化状态 ---
            if (isNowCollapsed) {
                localStorage.setItem(storageKey, 'true');
            } else {
                localStorage.removeItem(storageKey);
            }
        };

        // --- 为两个按钮绑定同一个点击事件处理器 ---
        buttonStart.addEventListener('click', handleClick);
        buttonEnd.addEventListener('click', handleClick);

        // --- 将两个按钮添加到消息元素中 ---
        messageElement.appendChild(buttonStart);
        messageElement.appendChild(buttonEnd);
    }

    // 函数：处理聊天区域的新增消息 (MutationObserver回调)
    // (这里调用 addToggleButtons 而不是 addToggleButton)
    function handleNewMessages(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                         if (node.matches(messageSelector)) {
                            addToggleButtons(node); // 调用新函数
                        } else {
                            // 检查子元素
                            node.querySelectorAll(messageSelector).forEach(addToggleButtons); // 调用新函数
                        }
                    }
                });
            }
        }
    }

    // 插件初始化函数
    // (这里调用 addToggleButtons 而不是 addToggleButton)
    function initialize() {
        const observerTarget = document.querySelector(messageContainerSelector);
        if (observerTarget) {
            console.log("Message Toggle (Dual Buttons): Found chat container:", messageContainerSelector);
            // 初始化时为已存在的消息添加按钮
            observerTarget.querySelectorAll(messageSelector).forEach(addToggleButtons); // 调用新函数

            const observer = new MutationObserver(handleNewMessages);
            const config = { childList: true, subtree: true };
            observer.observe(observerTarget, config);
            console.log("Message Toggle (Dual Buttons) Observer Started.");
        } else {
            console.error("Message Toggle Plugin: Could not find chat container:", messageContainerSelector, ". Retrying in 1 second...");
            setTimeout(initialize, 1000);
        }
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();