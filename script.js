// --- Message Toggle Plugin JavaScript (v1.6 - Dynamic Collapse on AI Msg, No Hotkeys, Chinese UI) ---
(function() {
    console.log("你好，带设置面板的消息折叠插件脚本开始运行了！(v1.6 - AI消息触发动态折叠, 无快捷键, 中文界面)");

    // --- 配置区域 ---
    const messageContainerSelector = '#chat';
    const messageSelector = '.mes';
    const messageContentSelector = '.mes_text';
    const messageIdAttribute = 'mesid';
    const characterNameAttribute = 'ch_name';
    const isUserAttribute = 'is_user'; // 需要这个属性来判断是否为 AI 消息
    const storagePrefix = 'sillytavern_msg_toggle_';
    const settingsStorageKey = 'sillytavern_msg_toggle_settings';

    // --- 默认设置 ---
    const defaultSettings = {
        autoCollapseEnabled: false,
        autoCollapseKeepNewest: 10
    };
    let currentSettings = { ...defaultSettings };

    // ===============================================
    // == 核心消息折叠逻辑 (基本不变) ==
    // ===============================================

    function getStorageKey(messageElement) {
        const messageId = messageElement.getAttribute(messageIdAttribute);
        if (!messageId) { return null; }
        let chatIdentifier = messageElement.getAttribute(characterNameAttribute);
        if (!chatIdentifier) {
            const isUser = messageElement.getAttribute(isUserAttribute) === 'true';
            chatIdentifier = isUser ? 'user_fallback' : 'unknown_character_fallback';
            console.warn(`消息 ${messageId} 缺少 'ch_name' 属性，使用备用 ID: ${chatIdentifier}`);
        }
        chatIdentifier = chatIdentifier.replace(/[^\p{L}\p{N}_\-]/gu, '_');
        return `${storagePrefix}${chatIdentifier}_${messageId}`;
    }

    function setMessageCollapsedState(messageElement, collapse, saveToStorage = true) {
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) return false;
        const buttons = messageElement.querySelectorAll('.message-toggle-button');
        const storageKey = getStorageKey(messageElement);

        const wasCollapsed = contentElement.classList.contains('collapsed');
        const stateChanged = (collapse && !wasCollapsed) || (!collapse && wasCollapsed);

        if (collapse) {
            contentElement.classList.add('collapsed');
            buttons.forEach(btn => btn.classList.add('collapsed'));
            if (saveToStorage && storageKey) {
                localStorage.setItem(storageKey, 'true');
            }
        } else {
            contentElement.classList.remove('collapsed');
            buttons.forEach(btn => btn.classList.remove('collapsed'));
            if (saveToStorage && storageKey) {
                localStorage.removeItem(storageKey);
            }
        }
        // 返回状态是否真的发生了变化
        return stateChanged;
    }


    function addToggleButtons(messageElement) {
        if (messageElement.querySelector('.message-toggle-button')) return;
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) return;
        const storageKey = getStorageKey(messageElement);
        if (!storageKey) {
             console.warn("无法为此消息生成存储键，跳过添加折叠按钮:", messageElement);
             return;
        }

        const buttonStart = document.createElement('button');
        buttonStart.className = 'message-toggle-button message-toggle-button-start';
        buttonStart.title = "折叠/展开";
        const buttonEnd = document.createElement('button');
        buttonEnd.className = 'message-toggle-button message-toggle-button-end';
        buttonEnd.title = "折叠/展开";

        let isInitiallyCollapsed = localStorage.getItem(storageKey) === 'true';
        setMessageCollapsedState(messageElement, isInitiallyCollapsed, false);

        const handleClick = function() {
            const isCurrentlyCollapsed = contentElement.classList.contains('collapsed');
            setMessageCollapsedState(messageElement, !isCurrentlyCollapsed, true);
            // 重要：手动折叠/展开后，*不* 应该立即触发动态检查，否则可能刚展开就又被折叠了
        };

        buttonStart.addEventListener('click', handleClick);
        buttonEnd.addEventListener('click', handleClick);

        messageElement.appendChild(buttonStart);
        messageElement.appendChild(buttonEnd);
    }

    // ===============================================
    // == 设置面板逻辑 (汉化, 无快捷键 - 基本不变) ==
    // ===============================================

    function createSettingsPanel() {
        // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        const panel = document.createElement('div');
        panel.id = 'message-toggle-settings-panel';
        panel.innerHTML = `
            <button class="close-button" title="关闭">×</button>
            <h2>消息折叠设置</h2>

            <div class="settings-section">
                <label>
                    <input type="checkbox" id="auto-collapse-enabled"> 启用动态自动折叠旧消息
                </label>
                <label for="auto-collapse-keep">保留最新的展开条数:</label>
                <input type="number" id="auto-collapse-keep" min="0" step="1">
                <span class="settings-note">当 AI 发送新消息后，如果展开的消息总数超过此数值，将自动折叠最旧的展开消息。</span>
                <button id="apply-bulk-collapse-now">立即按此规则整理</button>
                <span class="settings-note">“立即整理”会折叠所有早于保留数量的消息，用于初始设置。</span>
            </div>

             <div class="settings-section">
                 <label>按消息 ID 折叠/展开范围:</label>
                 <div class="input-group">
                     <input type="number" id="range-start" placeholder="起始 ID" min="0">
                     <span>到</span>
                     <input type="number" id="range-end" placeholder="结束 ID" min="0">
                     <button id="collapse-range">折叠范围</button>
                     <button id="uncollapse-range">展开范围</button>
                 </div>
            </div>

            <div class="settings-section">
                <label for="specific-ids">按特定 ID 折叠/展开:</label>
                <input type="text" id="specific-ids" placeholder="例如: 5, 8, 12-15">
                 <span class="settings-note">输入逗号分隔的 ID 或范围 (如 12-15)。</span>
                 <button id="collapse-specific">折叠指定</button>
                 <button id="uncollapse-specific">展开指定</button>
            </div>

             <div style="text-align: center; margin-top: 20px;">
                <button id="save-settings">保存并关闭</button>
                <button id="close-settings" style="background-color: #aaa;">取消</button>
            </div>
        `;
        document.body.appendChild(panel);

        // --- 事件监听器 ---
        panel.querySelector('.close-button').addEventListener('click', hideSettingsPanel);
        panel.querySelector('#close-settings').addEventListener('click', hideSettingsPanel);
        panel.querySelector('#save-settings').addEventListener('click', saveAndCloseSettings);

        // 动作按钮 (注意修改了 apply 按钮的 ID 和文本)
        panel.querySelector('#apply-bulk-collapse-now').addEventListener('click', applyBulkCollapse); // 改为调用 bulk 函数
        panel.querySelector('#collapse-range').addEventListener('click', () => processRangeOrSpecific(true, true));
        panel.querySelector('#uncollapse-range').addEventListener('click', () => processRangeOrSpecific(false, true));
        panel.querySelector('#collapse-specific').addEventListener('click', () => processRangeOrSpecific(true, false));
        panel.querySelector('#uncollapse-specific').addEventListener('click', () => processRangeOrSpecific(false, false));

        panel.addEventListener('click', (e) => e.stopPropagation());
    }

     function createPermanentSettingsButton() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        const button = document.createElement('button');
        button.id = 'permanent-settings-button';
        button.textContent = '设置';
        button.addEventListener('click', toggleSettingsPanel);
        document.body.appendChild(button);
        console.log("常驻设置按钮已添加。");
     }

     function toggleSettingsPanel() {
          // ... (这部分代码与 v1.5 完全相同，保持不变) ...
         const panel = document.getElementById('message-toggle-settings-panel');
         if (!panel) return;
         if (panel.style.display === 'none' || !panel.style.display) {
             showSettingsPanel();
         } else {
             hideSettingsPanel();
         }
     }

    function showSettingsPanel() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        const panel = document.getElementById('message-toggle-settings-panel');
        if (!panel) return;
        loadSettings();
        populateSettingsForm();
        panel.style.display = 'block';
    }

    function hideSettingsPanel() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        const panel = document.getElementById('message-toggle-settings-panel');
        if (panel) panel.style.display = 'none';
    }

    function populateSettingsForm() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        document.getElementById('auto-collapse-enabled').checked = currentSettings.autoCollapseEnabled;
        document.getElementById('auto-collapse-keep').value = currentSettings.autoCollapseKeep;
        document.getElementById('range-start').value = '';
        document.getElementById('range-end').value = '';
        document.getElementById('specific-ids').value = '';
    }

    function saveSettings() {
          // ... (这部分代码与 v1.5 完全相同，保持不变) ...
         try {
            currentSettings.autoCollapseEnabled = document.getElementById('auto-collapse-enabled').checked;
            currentSettings.autoCollapseKeep = parseInt(document.getElementById('auto-collapse-keep').value, 10) || defaultSettings.autoCollapseKeep;
            localStorage.setItem(settingsStorageKey, JSON.stringify(currentSettings));
            console.log("设置已保存:", currentSettings);
            return true;
        } catch (error) {
            console.error("保存设置时出错:", error);
            alert("保存设置失败，请检查浏览器控制台获取详细信息。");
            return false;
        }
    }
     function saveAndCloseSettings() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        if (saveSettings()) {
            hideSettingsPanel();
        }
    }

    function loadSettings() {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        try {
            const storedSettings = localStorage.getItem(settingsStorageKey);
            if (storedSettings) {
                currentSettings = { ...defaultSettings, ...JSON.parse(storedSettings) };
                delete currentSettings.settingsPanelHotkey;
                delete currentSettings.collapseLatestHotkey;
            } else {
                currentSettings = { ...defaultSettings };
            }
        } catch (error) {
            console.error("加载设置时出错，使用默认设置:", error);
            currentSettings = { ...defaultSettings };
        }
        console.log("设置已加载:", currentSettings);
    }

    // ===============================================
    // == 功能逻辑 (包含新的动态折叠) ==
    // ===============================================

    // --- 新增：动态折叠检查函数 ---
    function checkAndApplyDynamicCollapse() {
        // 检查设置是否启用，以及保留数是否有效
        if (!currentSettings.autoCollapseEnabled || currentSettings.autoCollapseKeep < 0) {
            return;
        }

        const messages = Array.from(document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`));
        // 过滤出当前展开的消息
        const visibleMessages = messages.filter(msg => {
            const content = msg.querySelector(messageContentSelector);
            return content && !content.classList.contains('collapsed');
        });

        const visibleCount = visibleMessages.length;
        const maxVisible = currentSettings.autoCollapseKeep;

        // 如果展开的数量超过了限制
        if (visibleCount > maxVisible) {
            // 计算需要折叠多少条最旧的展开消息
            const collapseCount = visibleCount - maxVisible;
            console.log(`动态折叠：当前展开 ${visibleCount} 条，超过限制 ${maxVisible} 条，需要折叠 ${collapseCount} 条。`);

            // 对可见消息按 mesid 升序排序（找到最旧的）
            visibleMessages.sort((a, b) => {
                const idA = parseInt(a.getAttribute(messageIdAttribute), 10);
                const idB = parseInt(b.getAttribute(messageIdAttribute), 10);
                return idA - idB;
            });

            // 折叠最旧的 N 条可见消息
            for (let i = 0; i < collapseCount; i++) {
                if (visibleMessages[i]) {
                    console.log(`动态折叠：正在折叠消息 ID ${visibleMessages[i].getAttribute(messageIdAttribute)}`);
                    setMessageCollapsedState(visibleMessages[i], true, true);
                }
            }
        }
    }

    // --- 修改：这个函数现在只用于“立即整理”按钮和可能的初始加载整理 ---
    // --- （可选）可以在 initialize 中调用它一次，但动态逻辑更符合需求 ---
    function applyBulkCollapse() {
        if (!currentSettings.autoCollapseEnabled || currentSettings.autoCollapseKeep < 0) {
            alert("请先启用自动折叠并设置有效的保留数量。");
            return;
        }
        const messages = Array.from(document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`));
        if (messages.length <= currentSettings.autoCollapseKeep) {
            alert("消息总数未超过保留数量，无需整理。");
            return;
        }
        messages.sort((a, b) => parseInt(a.getAttribute(messageIdAttribute), 10) - parseInt(b.getAttribute(messageIdAttribute), 10));
        const messagesToCollapse = messages.slice(0, -currentSettings.autoCollapseKeep);
        let changedCount = 0;
        console.log(`批量整理：正在折叠 ${messagesToCollapse.length} 条旧消息。`);
        messagesToCollapse.forEach(msg => {
           if(setMessageCollapsedState(msg, true, true)) {
               changedCount++;
           }
        });
        alert(`批量整理完成，共折叠了 ${changedCount} 条消息。`);
    }


    function processRangeOrSpecific(collapse, isRange) {
         // ... (这部分代码与 v1.5 完全相同，保持不变) ...
        let messageIds = [];
        if (isRange) {
            const startId = parseInt(document.getElementById('range-start').value, 10);
            const endId = parseInt(document.getElementById('range-end').value, 10);
            if (isNaN(startId) || isNaN(endId) || startId < 0 || endId < startId) {
                alert("范围输入无效。请输入有效的起始和结束消息 ID。"); return;
            }
            for (let i = startId; i <= endId; i++) messageIds.push(i);
        } else {
            const idsString = document.getElementById('specific-ids').value;
            if (!idsString.trim()) { alert("请输入要操作的特定消息 ID 或范围。"); return; }
            const parts = idsString.split(',');
            parts.forEach(part => {
                 part = part.trim();
                 if (part.includes('-')) {
                     const rangeParts = part.split('-');
                     const start = parseInt(rangeParts[0], 10); const end = parseInt(rangeParts[1], 10);
                     if (!isNaN(start) && !isNaN(end) && start >= 0 && end >= start) {
                         for (let i = start; i <= end; i++) messageIds.push(i);
                     }
                 } else {
                     const id = parseInt(part, 10);
                     if (!isNaN(id) && id >= 0) messageIds.push(id);
                 }
            });
             messageIds = [...new Set(messageIds)];
        }
        if (messageIds.length === 0) { alert("在输入中未找到有效的消息 ID。"); return; }
        console.log(`正在对 ID: [${messageIds.join(', ')}] 执行 ${collapse ? '折叠' : '展开'} 操作。`);
        let changedCount = 0;
        messageIds.forEach(id => {
            const msgElement = document.querySelector(`${messageSelector}[${messageIdAttribute}="${id}"]`);
            if (msgElement) { if (setMessageCollapsedState(msgElement, collapse, true)) changedCount++; }
        });
        alert(`操作已应用于 ${changedCount} 条消息。`);
    }


    // ===============================================
    // == 初始化和监听 (修改 handleNewMessages) ==
    // ===============================================

    function handleNewMessages(mutationsList) {
        let aiMessageAdded = false; // 标记是否有 AI 消息被添加
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                         // 处理直接添加的消息节点
                         if (node.matches(messageSelector)) {
                             addToggleButtons(node);
                             // 检查是否是 AI 消息
                             if (node.getAttribute(isUserAttribute) !== 'true') {
                                 aiMessageAdded = true;
                             }
                         }
                         // 处理嵌套的消息节点
                         else {
                             node.querySelectorAll(messageSelector).forEach(msgNode => {
                                 addToggleButtons(msgNode);
                                 // 检查是否是 AI 消息
                                 if (msgNode.getAttribute(isUserAttribute) !== 'true') {
                                     aiMessageAdded = true;
                                 }
                             });
                         }
                    }
                });
            }
        }

        // --- 关键改动：在处理完所有新增节点后，如果检测到 AI 消息，则执行动态折叠检查 ---
        if (aiMessageAdded) {
            console.log("检测到 AI 新消息，执行动态折叠检查...");
            // 使用 setTimeout 稍微延迟执行，确保 DOM 更新和渲染完成
            setTimeout(checkAndApplyDynamicCollapse, 100); // 延迟 100 毫秒
        }
    }

    function initialize() {
        loadSettings();
        createSettingsPanel();
        createPermanentSettingsButton();

        const observerTarget = document.querySelector(messageContainerSelector);
        if (observerTarget) {
            console.log("消息折叠插件(v1.6): 找到聊天容器:", messageContainerSelector);
            // 为已存在的消息添加按钮
            observerTarget.querySelectorAll(messageSelector).forEach(addToggleButtons);

            // 可选：在初始加载时也执行一次 bulk 整理（如果需要加载时整理）
            // 注意：这可能与动态逻辑的目标略有不同
            /*
            if (currentSettings.autoCollapseEnabled) {
                 console.log("初始加载时尝试应用批量整理...");
                 // 同样建议延迟执行
                 setTimeout(applyBulkCollapse, 500);
            }
            */

            const observer = new MutationObserver(handleNewMessages);
            const config = { childList: true, subtree: true };
            observer.observe(observerTarget, config);
            console.log("消息折叠插件 MutationObserver 已启动。");
        } else {
            console.error("消息折叠插件: 未找到聊天容器:", messageContainerSelector, ". 正在重试...");
            setTimeout(initialize, 1000);
        }
    }

    // 页面加载完成后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();