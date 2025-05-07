// Topic Manager UI Elements
let topicManagerContainer = null;
let topicList = null;
let isInitialized = false;

// --- Draggable and Collapsible Panel ---
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isCollapsed = false;

// Initialize the extension
function initializeExtension() {
    if (isInitialized) return;
    const checkContainer = setInterval(() => {
        const chatContainer = document.querySelector('main') || 
            document.querySelector('.flex.flex-col.items-center.text-sm') ||
            document.querySelector('.overflow-hidden.w-full.h-full.relative.flex.z-0');
        if (chatContainer) {
            clearInterval(checkContainer);
            createTopicManagerUI(chatContainer);
            setupEventListeners();
            loadSavedTopics();
            isInitialized = true;
        }
    }, 1000);
    setTimeout(() => {
        if (!isInitialized) {
            clearInterval(checkContainer);
        }
    }, 10000);
}

function createTopicManagerUI(container) {
    const existingContainer = document.getElementById('topic-manager-container');
    if (existingContainer) existingContainer.remove();
    topicManagerContainer = document.createElement('div');
    topicManagerContainer.id = 'topic-manager-container';
    topicManagerContainer.className = 'topic-manager';
    topicManagerContainer.style.position = 'fixed';
    topicManagerContainer.style.right = '20px';
    topicManagerContainer.style.top = '20px';
    topicManagerContainer.style.left = 'auto';
    topicManagerContainer.style.width = '320px';
    topicManagerContainer.style.borderRadius = '10px';
    topicManagerContainer.style.fontFamily = 'Inter, Arial, sans-serif';
    topicManagerContainer.style.transition = 'box-shadow 0.2s';
    topicManagerContainer.style.zIndex = '10000';
    // Header
    const header = document.createElement('div');
    header.className = 'topic-manager-header';
    header.textContent = 'Topic Manager';
    header.style.padding = '12px 16px';
    header.style.background = '#343541';
    header.style.color = '#fff';
    header.style.borderRadius = '10px 10px 0 0';
    header.style.fontWeight = 'bold';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.userSelect = 'none';
    // Collapse/expand button
    const collapseBtn = document.createElement('button');
    collapseBtn.textContent = '▲';
    collapseBtn.style.background = 'transparent !important';
    collapseBtn.style.border = 'none !important';
    collapseBtn.style.outline = 'none';
    collapseBtn.style.boxShadow = 'none';
    collapseBtn.style.fontSize = '18px';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.style.marginLeft = '10px';
    collapseBtn.onfocus = collapseBtn.onmousedown = () => { collapseBtn.style.outline = 'none'; collapseBtn.style.boxShadow = 'none'; };
    header.appendChild(collapseBtn);
    // Theme toggle button
    const themeBtn = document.createElement('button');
    themeBtn.textContent = getGlassTheme() === 'dark' ? '🌙' : '☀️';
    themeBtn.title = 'Toggle light/dark glass theme';
    themeBtn.style.background = 'transparent !important';
    themeBtn.style.border = 'none !important';
    themeBtn.style.outline = 'none';
    themeBtn.style.boxShadow = 'none';
    themeBtn.style.fontSize = '18px';
    themeBtn.style.cursor = 'pointer';
    themeBtn.style.marginLeft = '10px';
    themeBtn.onfocus = themeBtn.onmousedown = () => { themeBtn.style.outline = 'none'; themeBtn.style.boxShadow = 'none'; };
    header.appendChild(themeBtn);
    // Content area
    const contentArea = document.createElement('div');
    contentArea.id = 'topic-manager-content';
    // Topic list
    topicList = document.createElement('div');
    topicList.id = 'topic-list';
    topicList.className = 'topic-list';
    topicList.style.padding = '10px';
    topicList.style.maxHeight = '200px';
    topicList.style.overflowY = 'auto';
    topicList.style.background = 'transparent';
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.style.padding = '10px';
    inputContainer.style.borderTop = '1px solid rgba(255,255,255,0.18)';
    inputContainer.style.border = '1px solid rgba(170, 163, 149, 0.18)';
    inputContainer.style.background = 'transparent';
    // Topic input
    const topicInput = document.createElement('input');
    topicInput.id = 'topic-input';
    topicInput.type = 'text';
    topicInput.placeholder = 'Enter topic name';
    topicInput.className = 'topic-input';
    topicInput.style.width = '100%';
    topicInput.style.marginBottom = '10px';
    topicInput.style.padding = '8px';
    topicInput.style.border = '1px solid #f3f3f3';
    topicInput.style.borderRadius = '4px';
    topicInput.style.background = '#ced5e3';
    topicInput.style.color = '#303030';
    // Add topic button
    const addTopicButton = document.createElement('button');
    addTopicButton.id = 'add-topic';
    addTopicButton.textContent = '+ Add Topic';
    addTopicButton.className = 'add-topic-button';
    addTopicButton.style.width = '100%';
    addTopicButton.style.padding = '8px';
    addTopicButton.style.background = '#007bff';
    addTopicButton.style.color = 'white';
    addTopicButton.style.border = '1px solid #ced5e3';
    addTopicButton.style.borderRadius = '4px';
    addTopicButton.style.cursor = 'pointer';
    addTopicButton.style.fontWeight = 'bold';
    addTopicButton.style.fontSize = '15px';
    addTopicButton.style.marginTop = '2px';
    // Assemble content area
    contentArea.appendChild(topicList);
    contentArea.appendChild(inputContainer);
    inputContainer.appendChild(topicInput);
    inputContainer.appendChild(addTopicButton);
    // Add header and content to panel
    topicManagerContainer.appendChild(header);
    topicManagerContainer.appendChild(contentArea);
    container.appendChild(topicManagerContainer);
    // Make draggable
    makePanelDraggable(topicManagerContainer, header);
    // Collapse/expand
    collapseBtn.onclick = () => togglePanelCollapse(topicManagerContainer, contentArea, collapseBtn);
    // Theme toggle
    themeBtn.onclick = () => {
        const newTheme = getGlassTheme() === 'dark' ? 'light' : 'dark';
        setGlassTheme(newTheme);
        themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    };
    isCollapsed = false;
    applyGlassTheme(getGlassTheme());
}

function setupEventListeners() {
    const checkElements = setInterval(() => {
        const addTopicButton = document.getElementById('add-topic');
        const topicInput = document.getElementById('topic-input');
        if (addTopicButton && topicInput) {
            clearInterval(checkElements);
            addTopicButton.addEventListener('click', () => {
                const topicName = topicInput.value.trim();
                if (topicName) {
                    addTopic(topicName);
                    topicInput.value = '';
                }
            });
            setupMessageObserver();
        }
    }, 1000);
}

function setupMessageObserver() {
    const chatContainer = document.querySelector('main') || 
        document.querySelector('.flex.flex-col.items-center.text-sm') ||
        document.querySelector('.overflow-hidden.w-full.h-full.relative.flex.z-0');
    if (chatContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && 
                        (node.classList.contains('message') || 
                        node.classList.contains('group') || 
                        node.classList.contains('w-full'))) {
                        handleNewMessage(node);
                    }
                });
            });
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
    }
}

function handleNewMessage(node) {
    if (node.querySelector('.topic-select')) return;
    const topicSelect = document.createElement('select');
    topicSelect.className = 'topic-select';
    const topics = getTopics();
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicSelect.appendChild(option);
    });
    const messageId = getMessageId(node);
    const map = getMessageTopicMap();
    if (map[messageId]) {
        topicSelect.value = map[messageId];
    }
    topicSelect.addEventListener('change', () => {
        setMessageTopic(messageId, topicSelect.value);
    });
    node.appendChild(topicSelect);
}

function addTopic(topicName) {
    const topics = getTopics();
    if (!topics.includes(topicName)) {
        topics.push(topicName);
        saveTopics(topics);
        addTopicObject(topicName);
        updateTopicList();
    }
}

function getTopics() {
    const topics = localStorage.getItem('ai-chat-topics');
    return topics ? JSON.parse(topics) : [];
}

function saveTopics(topics) {
    localStorage.setItem('ai-chat-topics', JSON.stringify(topics));
}

function updateTopicList() {
    if (!topicList) return;
    topicList.innerHTML = '';
    const topics = getTopics();
    topics.forEach(topic => {
        const topicObj = getTopicObjects().find(t => t.name === topic);
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-item';
        topicElement.style.cursor = 'pointer';
        topicElement.style.display = 'flex';
        topicElement.style.alignItems = 'center';
        topicElement.style.justifyContent = 'space-between';
        topicElement.style.gap = '6px';
        // Topic name (clickable to open chat)
        const nameSpan = document.createElement('span');
        nameSpan.textContent = topic;
        nameSpan.title = '';
        nameSpan.style.flex = '1';
        nameSpan.style.display = '-webkit-box';
        nameSpan.style.webkitBoxOrient = 'vertical';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.webkitLineClamp = '2';
        nameSpan.style.lineClamp = '2';
        nameSpan.style.maxHeight = '2.6em';
        nameSpan.style.whiteSpace = 'normal';
        nameSpan.style.overflowWrap = 'normal';
        nameSpan.style.wordBreak = 'normal';
        nameSpan.style.wordWrap = 'normal';
        nameSpan.style.lineBreak = 'auto';
        nameSpan.style.userSelect = 'text';
        nameSpan.style.cursor = 'pointer';
        // Custom glassmorphism tooltip
        let tooltip;
        nameSpan.addEventListener('mouseenter', (e) => {
            tooltip = document.createElement('div');
            tooltip.textContent = topic;
            tooltip.style.position = 'fixed';
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY + 10) + 'px';
            tooltip.style.zIndex = '99999';
            tooltip.style.padding = '10px 18px';
            tooltip.style.background = 'rgba(255,255,255,0.18)';
            tooltip.style.backdropFilter = 'blur(8px)';
            tooltip.style.borderRadius = '14px';
            tooltip.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
            tooltip.style.color = '#23272f';
            tooltip.style.fontSize = '15px';
            tooltip.style.fontWeight = '500';
            tooltip.style.border = 'none';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.transition = 'opacity 0.2s';
            tooltip.style.opacity = '0';
            document.body.appendChild(tooltip);
            setTimeout(() => { if (tooltip) tooltip.style.opacity = '1'; }, 10);
        });
        nameSpan.addEventListener('mousemove', (e) => {
            if (tooltip) {
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
            }
        });
        nameSpan.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
        nameSpan.onclick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            if (topicObj && topicObj.url) window.location.href = topicObj.url;
        };
        topicElement.appendChild(nameSpan);
        // Rename button
        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✏️';
        renameBtn.title = 'Rename topic';
        renameBtn.style.background = 'transparent';
        renameBtn.style.border = 'none';
        renameBtn.style.cursor = 'pointer';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            const newName = prompt('Rename topic:', topic);
            if (newName && newName !== topic) {
                const topicsArr = getTopics().map(t => t === topic ? newName : t);
                saveTopics(topicsArr);
                const topicObjs = getTopicObjects().map(t => t.name === topic ? { ...t, name: newName } : t);
                saveTopicObjects(topicObjs);
                const map = getMessageTopicMap();
                Object.keys(map).forEach(msgId => {
                    if (map[msgId] === topic) map[msgId] = newName;
                });
                saveMessageTopicMap(map);
                updateTopicList();
                document.querySelectorAll('.topic-select').forEach(select => {
                    Array.from(select.options).forEach(opt => {
                        if (opt.value === topic) opt.value = opt.textContent = newName;
                    });
                    if (select.value === topic) select.value = newName;
                });
            }
        };
        topicElement.appendChild(renameBtn);
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete topic';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            const topicsArr = getTopics().filter(t => t !== topic);
            saveTopics(topicsArr);
            removeTopicFromMessages(topic);
            removeTopicObject(topic);
            updateTopicList();
            document.querySelectorAll('.topic-select').forEach(select => {
                const optionToRemove = Array.from(select.options).find(opt => opt.value === topic);
                if (optionToRemove) select.removeChild(optionToRemove);
                if (select.value === topic) select.value = '';
            });
        };
        topicElement.appendChild(deleteBtn);
        topicList.appendChild(topicElement);
    });
}

function loadSavedTopics() {
    updateTopicList();
}

// --- Message-Topic Association ---
function getMessageTopicMap() {
    const map = localStorage.getItem('ai-chat-message-topics');
    return map ? JSON.parse(map) : {};
}
function saveMessageTopicMap(map) {
    localStorage.setItem('ai-chat-message-topics', JSON.stringify(map));
}
function setMessageTopic(messageId, topic) {
    const map = getMessageTopicMap();
    map[messageId] = topic;
    saveMessageTopicMap(map);
}
function removeTopicFromMessages(topic) {
    const map = getMessageTopicMap();
    for (const key in map) {
        if (map[key] === topic) {
            delete map[key];
        }
    }
    saveMessageTopicMap(map);
}
function getMessageId(node) {
    if (!node.dataset.topicMessageId) {
        node.dataset.topicMessageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    return node.dataset.topicMessageId;
}

function makePanelDraggable(panel, header) {
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragOffsetX = e.clientX - panel.offsetLeft;
        dragOffsetY = e.clientY - panel.offsetTop;
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
            panel.style.right = 'auto';
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
}

function togglePanelCollapse(panel, content, collapseBtn) {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
        content.style.display = 'none';
        collapseBtn.textContent = '▼';
    } else {
        content.style.display = '';
        collapseBtn.textContent = '▲';
    }
}

// --- Topic-to-Chat Linking ---
function getTopicObjects() {
    const raw = localStorage.getItem('ai-chat-topics-objects');
    return raw ? JSON.parse(raw) : [];
}
function saveTopicObjects(topics) {
    localStorage.setItem('ai-chat-topics-objects', JSON.stringify(topics));
}
function addTopicObject(name) {
    const url = window.location.href;
    const topics = getTopicObjects();
    if (!topics.some(t => t.name === name)) {
        topics.push({ name, url });
        saveTopicObjects(topics);
    }
}
function removeTopicObject(name) {
    const topics = getTopicObjects().filter(t => t.name !== name);
    saveTopicObjects(topics);
}
function getTopicUrlByName(name) {
    const topics = getTopicObjects();
    const found = topics.find(t => t.name === name);
    return found ? found.url : null;
}

// --- Glassmorphism Theming ---
function getGlassTheme() {
    return localStorage.getItem('ai-chat-topic-glass-theme') || 'dark';
}
function setGlassTheme(theme) {
    localStorage.setItem('ai-chat-topic-glass-theme', theme);
    applyGlassTheme(theme);
}
function applyGlassTheme(theme) {
    const panel = document.getElementById('topic-manager-container');
    if (!panel) return;
    const header = panel.querySelector('.topic-manager-header');
    const inputs = panel.querySelectorAll('input');
    const buttons = panel.querySelectorAll('button');
    if (theme === 'light') {
        panel.style.background = 'rgba(255,255,255,0.18)';
        panel.style.backdropFilter = 'blur(16px)';
        panel.style.border = '1.5px solid rgba(255,255,255,0.3)';
        panel.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10)';
        panel.style.color = '#23272f';
        if (header) {
            header.style.background = 'rgba(255,255,255,0.28)';
            header.style.backdropFilter = 'blur(12px)';
            header.style.color = '#23272f';
            header.style.borderRadius = '10px 10px 0 0';
        }
        inputs.forEach(i => {
            i.style.background = 'transparent';
            i.style.color = '#23272f';
            i.style.border = '1px solid #f3f3f3';
        });
        buttons.forEach(b => {
            b.style.background = 'transparent';
            b.style.color = '#23272f';
            b.style.border = '1px solid #f3f3f3';
        });
    } else {
        panel.style.background = 'rgba(36,37,46,0.38)';
        panel.style.backdropFilter = 'blur(16px)';
        panel.style.border = '1.5px solid rgba(44,44,60,0.5)';
        panel.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
        panel.style.color = '#f3f3f3';
        if (header) {
            header.style.background = 'rgba(44,44,60,0.48)';
            header.style.backdropFilter = 'blur(12px)';
            header.style.color = '#f3f3f3';
            header.style.borderRadius = '10px 10px 0 0';
        }
        inputs.forEach(i => {
            i.style.background = 'transparent';
            i.style.color = '#f3f3f3';
            i.style.border = '1px solid #f3f3f3';
        });
        buttons.forEach(b => {
            b.style.background = 'transparent';
            b.style.color = '#f3f3f3';
            b.style.border = '1px solid #f3f3f3';
        });
    }
}

// Initialize when the page is loaded
document.addEventListener('DOMContentLoaded', initializeExtension);
const observer = new MutationObserver(() => {
    if (!isInitialized) {
        initializeExtension();
    }
});
observer.observe(document.body, { childList: true, subtree: true });