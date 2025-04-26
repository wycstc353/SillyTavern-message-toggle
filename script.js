// --- Message Toggle Plugin JavaScript (with localStorage Persistence - v1.1 User ch_name) ---
(function() {
    console.log("你好，带 localStorage 持久化存储的消息折叠插件脚本开始运行了！(v1.1 使用用户 ch_name)");

    // --- 配置区域 ---
    const messageContainerSelector = '#chat';
    const messageSelector = '.mes';
    const messageContentSelector = '.mes_text';
    const messageIdAttribute = 'mesid';
    const characterNameAttribute = 'ch_name'; // 对用户和角色都用这个属性获取名字
    const isUserAttribute = 'is_user';
    // const userIdentifier = 'user'; // 不再需要固定的 userIdentifier 了
    const storagePrefix = 'sillytavern_msg_toggle_';
    // --- 配置区域结束 ---

    // 函数：获取用于 localStorage 的唯一存储键 (现在对用户也用 ch_name)
    function getStorageKey(messageElement) {
        const messageId = messageElement.getAttribute(messageIdAttribute);
        if (!messageId) {
            return null; // 必须有消息ID
        }

        let chatIdentifier = '';
        // 统一尝试获取 ch_name 属性
        chatIdentifier = messageElement.getAttribute(characterNameAttribute);

        if (!chatIdentifier) {
            // 如果该消息（无论是用户还是角色）竟然没有 ch_name 属性
            const isUser = messageElement.getAttribute(isUserAttribute) === 'true';
            if (isUser) {
                console.warn("User message lacks 'ch_name' attribute, falling back to 'user_fallback'.", messageElement);
                chatIdentifier = 'user_fallback'; // 提供一个备用标识
            } else {
                console.warn("Character message lacks 'ch_name' attribute, falling back to 'unknown_character'.", messageElement);
                chatIdentifier = 'unknown_character'; // 角色备用标识
            }
        }

        // 对获取到的标识符（用户名或角色名）进行清理，移除可能影响存储键的特殊字符
        // 允许字母(包括中文等Unicode字符 \p{L})、数字、下划线、连字符
        chatIdentifier = chatIdentifier.replace(/[^\p{L}\p{N}_\-]/gu, '_');

        // 最终的存储键: 前缀 + 聊天标识(角色名或用户名) + 消息ID
        return `${storagePrefix}${chatIdentifier}_${messageId}`;
    }

    // 函数：为单个消息元素添加切换按钮，并处理持久化状态 (这部分代码和上一版一样)
    function addToggleButton(messageElement) {
        if (messageElement.querySelector('.message-toggle-button')) {
            return;
        }
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) {
            return;
        }

        const storageKey = getStorageKey(messageElement);
        // 为了简单起见，如果无法为某条消息生成存储键（比如缺少必要属性），
        // 我们就不给它添加折叠按钮，因为它无法被持久化。
        if (!storageKey) {
             console.warn("Could not generate storage key for message, toggle button skipped:", messageElement);
             return;
        }

        const button = document.createElement('button');
        button.className = 'message-toggle-button';

        let isInitiallyCollapsed = false;
        if (localStorage.getItem(storageKey) === 'true') {
             isInitiallyCollapsed = true;
             contentElement.classList.add('collapsed');
             button.classList.add('collapsed');
        }

        button.addEventListener('click', function() {
            const isNowCollapsed = contentElement.classList.toggle('collapsed');
            button.classList.toggle('collapsed');

            if (isNowCollapsed) {
                localStorage.setItem(storageKey, 'true');
            } else {
                localStorage.removeItem(storageKey);
            }
        });

        messageElement.appendChild(button);
    }

    // 函数：处理聊天区域的新增消息 (和之前一样)
    function handleNewMessages(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                         if (node.matches(messageSelector)) {
                            addToggleButton(node);
                        } else {
                            node.querySelectorAll(messageSelector).forEach(addToggleButton);
                        }
                    }
                });
            }
        }
    }

    // 插件初始化函数 (和之前一样)
    function initialize() {
        const observerTarget = document.querySelector(messageContainerSelector);
        if (observerTarget) {
            console.log("Message Toggle: Found chat container:", messageContainerSelector);
            observerTarget.querySelectorAll(messageSelector).forEach(addToggleButton);
            const observer = new MutationObserver(handleNewMessages);
            const config = { childList: true, subtree: true };
            observer.observe(observerTarget, config);
            console.log("Message Toggle Observer Started.");
        } else {
            console.error("Message Toggle Plugin: Could not find chat container:", messageContainerSelector, ". Retrying in 1 second...");
            setTimeout(initialize, 1000);
        }
    }

    // DOM 加载完成后初始化 (和之前一样)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();