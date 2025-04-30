// --- Message Toggle Plugin JavaScript (v1.7 - Unique Keys, Data Clearing) ---
(function() {
    console.log("你好，带设置面板和数据清理的消息折叠插件脚本开始运行了！(v1.7 - 唯一键, 数据清理)");

    // --- 配置区域 ---
    const messageContainerSelector = '#chat';
    const messageSelector = '.mes';
    const messageContentSelector = '.mes_text';
    const messageIdAttribute = 'mesid';
    const characterNameAttribute = 'ch_name';
    const isUserAttribute = 'is_user'; // 需要这个属性来判断是否为 AI 消息
    const timestampAttribute = 'timestamp'; // 新增：时间戳属性名
    const swipeIdAttribute = 'swipeid';     // 新增：滑动ID属性名
    const storagePrefix = 'sillytavern_msg_toggle_';
    const settingsStorageKey = 'sillytavern_msg_toggle_settings';

    // --- 默认设置 ---
    const defaultSettings = {
        autoCollapseEnabled: false,
        autoCollapseKeepNewest: 10
    };
    let currentSettings = { ...defaultSettings };

    // ===============================================
    // == 核心消息折叠逻辑 ==
    // ===============================================

    /**
     * 修改：生成更唯一的存储键，包含时间戳和滑动ID
     * 新格式: prefix_charName_sanitizedTimestamp_sanitizedSwipeId_mesId
     */
    function getStorageKey(messageElement) {
        const messageId = messageElement.getAttribute(messageIdAttribute);
        const timestamp = messageElement.getAttribute(timestampAttribute);
        const swipeId = messageElement.getAttribute(swipeIdAttribute);

        // 必须要有 messageId
        if (!messageId) { return null; }

        // 最好有 timestamp 和 swipeid，但处理缺失情况
        if (!timestamp) {
             console.warn(`消息 ${messageId} 缺少 '${timestampAttribute}' 属性，存储键可能不够唯一！`);
        }
        if (swipeId === null || swipeId === undefined) { // swipeid 可能为 "0"
             console.warn(`消息 ${messageId} (时间戳: ${timestamp || 'N/A'}) 缺少 '${swipeIdAttribute}' 属性，存储键可能不够唯一！`);
        }

        let chatIdentifier = messageElement.getAttribute(characterNameAttribute);
        if (!chatIdentifier) {
            const isUser = messageElement.getAttribute(isUserAttribute) === 'true';
            chatIdentifier = isUser ? 'user_fallback' : 'unknown_character_fallback';
            // 可以在警告中加入更多信息
            console.warn(`消息 ${messageId} (时间戳: ${timestamp || 'N/A'}, 滑动ID: ${swipeId ?? 'N/A'}) 缺少 '${characterNameAttribute}'，使用备用 ID: ${chatIdentifier}`);
        }

        // 清理角色名
        const sanitizedCharName = chatIdentifier.replace(/[^\p{L}\p{N}_\-]/gu, '_');
        // 清理时间戳：替换常见分隔符为空格，再将所有空格换成下划线
        const sanitizedTimestamp = timestamp ? timestamp.replace(/[:年月日]/g, ' ').replace(/\s+/g, '_') : 'no_timestamp';
        // swipeId 通常是数字，但也转为字符串并确保安全
        const sanitizedSwipeId = String(swipeId ?? 'no_swipeid'); // 使用 ?? 处理 null/undefined

        // 新的密钥格式： 前缀_角色名_时间戳_滑动ID_消息ID
        // 示例: sillytavern_msg_toggle_角色名_2025_4_27_20_38_0_1
        return `${storagePrefix}${sanitizedCharName}_${sanitizedTimestamp}_${sanitizedSwipeId}_${messageId}`;
    }

    function setMessageCollapsedState(messageElement, collapse, saveToStorage = true) {
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) return false;
        const buttons = messageElement.querySelectorAll('.message-toggle-button');
        const storageKey = getStorageKey(messageElement); // 使用新的 key 生成函数

        const wasCollapsed = contentElement.classList.contains('collapsed');
        const stateChanged = (collapse && !wasCollapsed) || (!collapse && wasCollapsed);

        if (collapse) {
            contentElement.classList.add('collapsed');
            buttons.forEach(btn => btn.classList.add('collapsed'));
            if (saveToStorage && storageKey) {
                try {
                    localStorage.setItem(storageKey, 'true');
                } catch (error) {
                     if (error.name === 'QuotaExceededError') {
                         console.error("LocalStorage 已满，无法保存折叠状态。请在设置中清理旧数据。", error);
                         // 可以在这里给用户一个更明显的提示，比如 alert
                         alert("存储空间已满！无法保存这条消息的折叠状态。\n请尝试在插件设置中清理旧的折叠记录。");
                     } else {
                         console.error(`保存 localStorage 失败 (Key: ${storageKey}):`, error);
                     }
                     // 即使保存失败，也要保持视觉状态一致，所以不回滚类更改
                }
            }
        } else {
            contentElement.classList.remove('collapsed');
            buttons.forEach(btn => btn.classList.remove('collapsed'));
            if (saveToStorage && storageKey) {
                try {
                    localStorage.removeItem(storageKey);
                } catch (error) {
                     console.error(`移除 localStorage 条目失败 (Key: ${storageKey}):`, error);
                }
            }
        }
        // 返回状态是否真的发生了变化
        return stateChanged;
    }


    function addToggleButtons(messageElement) {
        if (messageElement.querySelector('.message-toggle-button')) return;
        const contentElement = messageElement.querySelector(messageContentSelector);
        if (!contentElement) return;
        const storageKey = getStorageKey(messageElement); // 使用新的 key 生成函数
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

        let isInitiallyCollapsed = false;
        try {
            isInitiallyCollapsed = localStorage.getItem(storageKey) === 'true';
        } catch(error) {
            console.error(`读取 localStorage 失败 (Key: ${storageKey}):`, error);
        }
        setMessageCollapsedState(messageElement, isInitiallyCollapsed, false); // 初始加载时不保存到 storage

        const handleClick = function() {
            const isCurrentlyCollapsed = contentElement.classList.contains('collapsed');
            setMessageCollapsedState(messageElement, !isCurrentlyCollapsed, true); // 点击时保存到 storage
        };

        buttonStart.addEventListener('click', handleClick);
        buttonEnd.addEventListener('click', handleClick);

        messageElement.appendChild(buttonStart);
        messageElement.appendChild(buttonEnd);
    }

    // ===============================================
    // == 设置面板逻辑 (添加数据清理部分) ==
    // ===============================================

    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'message-toggle-settings-panel';
        // 修改：添加了“存储数据清理”部分
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

             <div class="settings-section">
                <h3>存储数据清理</h3>
                <p class="settings-note">管理插件保存在浏览器本地存储中的消息折叠状态。这对于清理旧的、不再需要的记录或解决潜在问题很有用。</p>
                <div>
                    <label for="clear-start-date">按消息时间戳清理:</label>
                    <div class="input-group">
                        <input type="date" id="clear-start-date" title="起始日期">
                        <span>到</span>
                        <input type="date" id="clear-end-date" title="结束日期">
                        <button id="clear-date-range-folding-data">清除范围记录</button>
                    </div>
                    <span class="settings-note">选择日期范围，将清除该时间段内（包含起止日期）所有消息的折叠记录。基于消息自身的 <code>timestamp</code> 属性。</span>
                </div>
                <div style="margin-top: 15px;">
                     <button id="clear-all-folding-data" style="background-color: #dc3545; color: white;">清除所有折叠记录</button>
                     <span class="settings-note">警告：此操作将删除本插件存储的<b>所有</b>消息折叠状态，无法恢复！</span>
                </div>
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

        // 动作按钮
        panel.querySelector('#apply-bulk-collapse-now').addEventListener('click', applyBulkCollapse);
        panel.querySelector('#collapse-range').addEventListener('click', () => processRangeOrSpecific(true, true));
        panel.querySelector('#uncollapse-range').addEventListener('click', () => processRangeOrSpecific(false, true));
        panel.querySelector('#collapse-specific').addEventListener('click', () => processRangeOrSpecific(true, false));
        panel.querySelector('#uncollapse-specific').addEventListener('click', () => processRangeOrSpecific(false, false));

        // 新增：数据清理按钮监听器
        panel.querySelector('#clear-all-folding-data').addEventListener('click', clearAllFoldingData);
        panel.querySelector('#clear-date-range-folding-data').addEventListener('click', clearDateRangeFoldingData);

        panel.addEventListener('click', (e) => e.stopPropagation()); // 防止点击面板内部关闭面板
    }

     function createPermanentSettingsButton() {
        const button = document.createElement('button');
        button.id = 'permanent-settings-button';
        button.textContent = '设置';
        button.addEventListener('click', toggleSettingsPanel);
        document.body.appendChild(button);
        console.log("常驻设置按钮已添加。");
     }

     function toggleSettingsPanel() {
         const panel = document.getElementById('message-toggle-settings-panel');
         if (!panel) return;
         if (panel.style.display === 'none' || !panel.style.display) {
             showSettingsPanel();
         } else {
             hideSettingsPanel();
         }
     }

    function showSettingsPanel() {
        const panel = document.getElementById('message-toggle-settings-panel');
        if (!panel) return;
        loadSettings(); // 加载当前设置以确保面板显示最新配置
        populateSettingsForm(); // 填充表单
        panel.style.display = 'block';
    }

    function hideSettingsPanel() {
        const panel = document.getElementById('message-toggle-settings-panel');
        if (panel) panel.style.display = 'none';
    }

    function populateSettingsForm() {
        document.getElementById('auto-collapse-enabled').checked = currentSettings.autoCollapseEnabled;
        document.getElementById('auto-collapse-keep').value = currentSettings.autoCollapseKeep;
        // 清空操作相关的输入框
        document.getElementById('range-start').value = '';
        document.getElementById('range-end').value = '';
        document.getElementById('specific-ids').value = '';
        document.getElementById('clear-start-date').value = '';
        document.getElementById('clear-end-date').value = '';
    }

    function saveSettings() {
         try {
            currentSettings.autoCollapseEnabled = document.getElementById('auto-collapse-enabled').checked;
            // 确保 autoCollapseKeep 是一个非负整数
            const keepValue = parseInt(document.getElementById('auto-collapse-keep').value, 10);
            currentSettings.autoCollapseKeep = !isNaN(keepValue) && keepValue >= 0 ? keepValue : defaultSettings.autoCollapseKeep;

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
        if (saveSettings()) {
            hideSettingsPanel();
        }
    }

    function loadSettings() {
        try {
            const storedSettings = localStorage.getItem(settingsStorageKey);
            if (storedSettings) {
                // 合并存储的设置和默认设置，以防未来添加新设置项
                currentSettings = { ...defaultSettings, ...JSON.parse(storedSettings) };
                 // 确保类型正确，特别是数字
                currentSettings.autoCollapseKeep = parseInt(currentSettings.autoCollapseKeep, 10);
                if (isNaN(currentSettings.autoCollapseKeep) || currentSettings.autoCollapseKeep < 0) {
                    currentSettings.autoCollapseKeep = defaultSettings.autoCollapseKeep;
                }
                // 移除旧版本可能存在的无效键（例如热键）
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
    // == 功能逻辑 (动态折叠, 批量操作, 数据清理) ==
    // ===============================================

    function checkAndApplyDynamicCollapse() {
        if (!currentSettings.autoCollapseEnabled || currentSettings.autoCollapseKeep < 0) {
            return;
        }

        const messages = Array.from(document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`));
        const visibleMessages = messages.filter(msg => {
            const content = msg.querySelector(messageContentSelector);
            return content && !content.classList.contains('collapsed');
        });

        const visibleCount = visibleMessages.length;
        const maxVisible = currentSettings.autoCollapseKeep;

        if (visibleCount > maxVisible) {
            const collapseCount = visibleCount - maxVisible;
            console.log(`动态折叠：当前展开 ${visibleCount} 条，超过限制 ${maxVisible} 条，需要折叠 ${collapseCount} 条。`);

            visibleMessages.sort((a, b) => {
                const idA = parseInt(a.getAttribute(messageIdAttribute), 10);
                const idB = parseInt(b.getAttribute(messageIdAttribute), 10);
                return idA - idB; // 按消息 ID 升序排序（旧的在前）
            });

            for (let i = 0; i < collapseCount; i++) {
                if (visibleMessages[i]) {
                    console.log(`动态折叠：正在折叠消息 ID ${visibleMessages[i].getAttribute(messageIdAttribute)}`);
                    setMessageCollapsedState(visibleMessages[i], true, true); // 折叠并保存状态
                }
            }
        }
    }

    function applyBulkCollapse() {
        if (!currentSettings.autoCollapseEnabled || currentSettings.autoCollapseKeep < 0) {
            alert("请先启用自动折叠并设置有效的保留数量。");
            return;
        }
        const messages = Array.from(document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`));
        if (messages.length === 0) {
             alert("当前没有消息可供整理。");
             return;
        }
        // 按 mesid 降序排序，这样最新的在前面
        messages.sort((a, b) => parseInt(b.getAttribute(messageIdAttribute), 10) - parseInt(a.getAttribute(messageIdAttribute), 10));

        let changedCount = 0;
        const keepCount = currentSettings.autoCollapseKeep;

        console.log(`批量整理：保留最新的 ${keepCount} 条消息，尝试折叠其余 ${Math.max(0, messages.length - keepCount)} 条。`);

        messages.forEach((msg, index) => {
            // 只折叠那些超出保留数量的消息
            if (index >= keepCount) {
                 // 尝试折叠，并记录状态是否真的改变了
                 if (setMessageCollapsedState(msg, true, true)) {
                    changedCount++;
                 }
            } else {
                // （可选）对于需要保留的消息，可以确保它们是展开的
                // if (setMessageCollapsedState(msg, false, true)) {
                //    changedCount++; // 如果需要统计展开操作，也计数
                // }
            }
        });

        if (changedCount > 0) {
            alert(`批量整理完成，共折叠了 ${changedCount} 条消息。`);
        } else {
             alert("无需整理，所有旧消息已处于折叠状态或消息总数未超过保留数量。");
        }
    }


    function processRangeOrSpecific(collapse, isRange) {
        let messageIds = [];
        let inputElementId;
        let inputString;

        if (isRange) {
            const startIdInput = document.getElementById('range-start');
            const endIdInput = document.getElementById('range-end');
            const startId = parseInt(startIdInput.value, 10);
            const endId = parseInt(endIdInput.value, 10);
            if (isNaN(startId) || isNaN(endId) || startId < 0 || endId < startId) {
                alert("范围输入无效。请输入有效的起始和结束消息 ID。"); return;
            }
            for (let i = startId; i <= endId; i++) messageIds.push(i);
            // 清空输入框
            startIdInput.value = '';
            endIdInput.value = '';
        } else {
            inputElementId = 'specific-ids';
            const specificIdsInput = document.getElementById(inputElementId);
            inputString = specificIdsInput.value;
            if (!inputString.trim()) { alert("请输入要操作的特定消息 ID 或范围。"); return; }
            const parts = inputString.split(',');
            parts.forEach(part => {
                 part = part.trim();
                 if (part.includes('-')) {
                     const rangeParts = part.split('-');
                     const start = parseInt(rangeParts[0], 10); const end = parseInt(rangeParts[1], 10);
                     if (!isNaN(start) && !isNaN(end) && start >= 0 && end >= start) {
                         for (let i = start; i <= end; i++) messageIds.push(i);
                     } else {
                         console.warn(`忽略无效范围: ${part}`);
                     }
                 } else {
                     const id = parseInt(part, 10);
                     if (!isNaN(id) && id >= 0) messageIds.push(id);
                      else {
                         console.warn(`忽略无效 ID: ${part}`);
                     }
                 }
            });
            messageIds = [...new Set(messageIds)].sort((a, b) => a - b); // 去重并排序
             // 清空输入框
             specificIdsInput.value = '';
        }

        if (messageIds.length === 0) { alert("在输入中未找到有效的消息 ID。"); return; }

        console.log(`正在对 ID: [${messageIds.join(', ')}] 执行 ${collapse ? '折叠' : '展开'} 操作。`);
        let changedCount = 0;
        messageIds.forEach(id => {
            // 需要查找所有具有该 mesid 的消息（可能因 swipe 而有多个）
            const msgElements = document.querySelectorAll(`${messageSelector}[${messageIdAttribute}="${id}"]`);
            msgElements.forEach(msgElement => {
                 if (setMessageCollapsedState(msgElement, collapse, true)) changedCount++;
            });
        });
        alert(`操作已应用于 ${changedCount} 条消息元素。`);
    }

    // --- 新增：清除所有折叠数据 ---
    function clearAllFoldingData() {
        if (!confirm("确定要清除所有消息的折叠状态记录吗？\n此操作将删除所有相关 localStorage 条目，且无法恢复！")) {
            return;
        }

        let removedCount = 0;
        try {
            const keysToRemove = [];
            // 1. 收集所有要删除的 key
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(storagePrefix)) {
                    keysToRemove.push(key);
                }
            }
            // 2. 实际删除
            keysToRemove.forEach(key => {
                 localStorage.removeItem(key);
                 removedCount++;
            });

            alert(`已成功清除 ${removedCount} 条折叠记录。`);
            // 3. 强制页面上的所有消息视觉上恢复展开状态
            resetAllVisibleMessagesAppearance();
        } catch (error) {
            console.error("清除所有折叠数据时出错:", error);
            alert("清除数据时发生错误，请查看控制台获取详情。");
        }
    }

    // --- 新增：清除指定日期范围的折叠数据 ---
    function clearDateRangeFoldingData() {
        const startDateInput = document.getElementById('clear-start-date');
        const endDateInput = document.getElementById('clear-end-date');
        const startDateStr = startDateInput.value;
        const endDateStr = endDateInput.value;

        if (!startDateStr || !endDateStr) {
            alert("请输入有效的起始日期和结束日期。");
            return;
        }

        // 将 YYYY-MM-DD 转换为 Date 对象
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // 验证日期有效性
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             alert("日期格式无效，请使用 YYYY-MM-DD 格式。");
             return;
        }

        // 将时间设置为当天开始和结束，以确保范围包含性
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        if (startDate > endDate) {
            alert("起始日期不能晚于结束日期。");
            return;
        }

        if (!confirm(`确定要清除从 ${startDateStr} 到 ${endDateStr} (包含这两天) 的消息折叠记录吗？\n此操作无法恢复！`)) {
            return;
        }

        let removedCount = 0;
        const keysToRemove = [];

        try {
            console.log(`开始扫描 localStorage 以清除 ${startDate.toISOString().slice(0,10)} 到 ${endDate.toISOString().slice(0,10)} 的记录...`);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(storagePrefix)) {
                    // *** 关键：从 key 中解析时间戳 ***
                    // 依赖于 getStorageKey 中 sanitizedTimestamp 的格式
                    // 假设格式为: prefix_charName_YYYY_MM_DD_HH_MM_swipeId_mesId
                    // 或者: prefix_charName_YYYY_MM_DD_HH_MM_SS_swipeId_mesId (如果时间戳更精确)
                    // 需要找到时间戳部分。这通常在 swipeId 和 mesId 之前。

                    const parts = key.split('_');
                    // 粗略估计时间戳部分的位置。需要根据实际 key 格式调整！
                    // 假设 mesId 在最后，swipeId 在倒数第二
                    const mesIdIndex = parts.length - 1;
                    const swipeIdIndex = parts.length - 2;

                    // 时间戳应该在 swipeId 之前。但 charName 也可能包含下划线。
                    // 更健壮的方式是找到 mesId 和 swipeId，然后从它们向前找时间戳。
                    // 或者，假设时间戳总是有固定的部分数量（例如，年_月_日_时_分_秒 -> 6 部分）。
                    // **为简化和演示，我们假设时间戳的年月日部分总是在特定位置**
                    // 这需要你根据实际生成的 key 格式进行精确调整！
                    // 示例假设: YYYY 在倒数第 7 位, MM 在倒数第 6 位, DD 在倒数第 5 位
                    // (基于 prefix_char_YYYY_MM_DD_HH_MM_swipeId_mesId)
                    if (parts.length >= 8) { // 至少要有这么多部分
                         const yearIndex = parts.length - 7;
                         const monthIndex = parts.length - 6;
                         const dayIndex = parts.length - 5;

                         const yearStr = parts[yearIndex];
                         const monthStr = parts[monthIndex];
                         const dayStr = parts[dayIndex];

                         // 尝试解析年月日
                         const year = parseInt(yearStr, 10);
                         const month = parseInt(monthStr, 10); // 月份是 1-12
                         const day = parseInt(dayStr, 10);

                         // 检查是否成功解析为数字
                         if (!isNaN(year) && !isNaN(month) && !isNaN(day) &&
                              year > 1970 && month >= 1 && month <= 12 && day >= 1 && day <= 31)
                         {
                             // 创建 Date 对象（月份需要 -1）
                             // 为了只比较日期，忽略时分秒
                             const messageDate = new Date(year, month - 1, day);
                             messageDate.setHours(0, 0, 0, 0); // 标准化为当天零点

                             // 检查日期是否在用户选择的范围内
                             if (messageDate >= startDate && messageDate <= endDate) {
                                 keysToRemove.push(key);
                                 // console.log(`计划移除: ${key} (日期: ${messageDate.toISOString().slice(0,10)})`);
                             }
                         } else {
                              console.warn("无法从密钥充分解析日期信息:", key, ` 解析部分: Y=${yearStr}, M=${monthStr}, D=${dayStr}`);
                         }
                    } else {
                         console.warn("密钥格式不符合日期解析预期:", key);
                    }
                }
            }

            // 实际删除
            if (keysToRemove.length > 0) {
                console.log(`准备移除 ${keysToRemove.length} 条记录...`);
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    removedCount++;
                });
            }

            alert(`已成功清除 ${removedCount} 条在指定日期范围内的折叠记录。`);
            // 重置受影响的消息的视觉状态
            if (removedCount > 0) {
                resetMessagesAppearanceByKey(keysToRemove);
            }

        } catch (error) {
            console.error("清除日期范围数据时出错:", error);
            alert("清除数据时发生错误，请查看控制台获取详情。");
        } finally {
             // 清空日期输入框
             startDateInput.value = '';
             endDateInput.value = '';
        }
    }

    // --- 新增：辅助函数 - 重置所有可见消息的视觉状态 ---
    function resetAllVisibleMessagesAppearance() {
        console.log("正在重置页面上所有消息的折叠外观...");
        const messages = document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`);
        messages.forEach(msgElement => {
            const contentElement = msgElement.querySelector(messageContentSelector);
            const buttons = msgElement.querySelectorAll('.message-toggle-button');
            if (contentElement && contentElement.classList.contains('collapsed')) {
                 contentElement.classList.remove('collapsed');
            }
            buttons.forEach(btn => {
                if (btn.classList.contains('collapsed')) {
                     btn.classList.remove('collapsed');
                }
            });
        });
        console.log("页面消息外观重置完成。");
    }

    // --- 新增：辅助函数 - 根据 key 列表重置消息的视觉状态 ---
    function resetMessagesAppearanceByKey(removedKeys) {
        if (!removedKeys || removedKeys.length === 0) return;
        console.log(`正在根据 ${removedKeys.length} 个已移除的 key 重置页面消息外观...`);
        const removedKeysSet = new Set(removedKeys); // 使用 Set 以提高查找效率
        const messages = document.querySelectorAll(`${messageContainerSelector} ${messageSelector}`);
        let resetCount = 0;
        messages.forEach(msgElement => {
            const currentKey = getStorageKey(msgElement); // 重新计算当前消息的 key
            if (currentKey && removedKeysSet.has(currentKey)) {
                 const contentElement = msgElement.querySelector(messageContentSelector);
                 const buttons = msgElement.querySelectorAll('.message-toggle-button');
                 let wasReset = false;
                 if (contentElement && contentElement.classList.contains('collapsed')) {
                     contentElement.classList.remove('collapsed');
                     wasReset = true;
                 }
                 buttons.forEach(btn => {
                     if (btn.classList.contains('collapsed')) {
                         btn.classList.remove('collapsed');
                         wasReset = true;
                     }
                 });
                 if (wasReset) {
                     resetCount++;
                 }
            }
        });
         console.log(`已重置 ${resetCount} 条受影响消息的折叠外观。`);
    }


    // ===============================================
    // == 初始化和监听 ==
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
                         // 处理嵌套的消息节点 (以防万一)
                         else if (node.querySelector(messageSelector)) {
                             node.querySelectorAll(messageSelector).forEach(msgNode => {
                                 if (!msgNode.querySelector('.message-toggle-button')) { // 避免重复添加
                                      addToggleButtons(msgNode);
                                      // 检查是否是 AI 消息
                                      if (msgNode.getAttribute(isUserAttribute) !== 'true') {
                                          aiMessageAdded = true;
                                      }
                                 }
                             });
                         }
                    }
                });
            }
        }

        // 在处理完所有新增节点后，如果检测到 AI 消息，则执行动态折叠检查
        if (aiMessageAdded) {
            console.log("检测到 AI 新消息，延迟执行动态折叠检查...");
            // 使用 setTimeout 稍微延迟执行，确保 DOM 更新和渲染完成
            setTimeout(checkAndApplyDynamicCollapse, 200); // 稍微增加延迟以防竞争条件
        }
    }

    function initialize() {
        loadSettings(); // 先加载设置
        createSettingsPanel(); // 创建面板（此时内部会用到加载的设置）
        createPermanentSettingsButton(); // 创建常驻按钮

        const observerTarget = document.querySelector(messageContainerSelector);
        if (observerTarget) {
            console.log("消息折叠插件(v1.7): 找到聊天容器:", messageContainerSelector);
            // 为已存在的消息添加按钮 (需要在 observer 启动前完成)
            observerTarget.querySelectorAll(messageSelector).forEach(msgNode => {
                 if (!msgNode.querySelector('.message-toggle-button')) { // 避免重复添加
                     addToggleButtons(msgNode);
                 }
            });

            const observer = new MutationObserver(handleNewMessages);
            const config = { childList: true, subtree: true };
            observer.observe(observerTarget, config);
            console.log("消息折叠插件 MutationObserver 已启动。");
        } else {
            console.error("消息折叠插件: 未找到聊天容器:", messageContainerSelector, ". 正在重试...");
            // 使用退避策略重试，避免无限快速重试
            let retries = 0;
            const retryInterval = 1000; // 1秒
            const maxRetries = 10;
            const retryInit = () => {
                if (retries >= maxRetries) {
                    console.error("消息折叠插件: 达到最大重试次数，初始化失败。");
                    return;
                }
                retries++;
                console.log(`重试初始化 #${retries}...`);
                const target = document.querySelector(messageContainerSelector);
                if (target) {
                    initialize(); // 重新调用初始化函数
                } else {
                    setTimeout(retryInit, retryInterval * Math.pow(1.5, retries)); // 指数退避
                }
            };
            setTimeout(retryInit, retryInterval);
        }
    }

    // 确保在 DOM 完全加载后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOMContentLoaded 已经发生
        initialize();
    }

})();