// Cross-browser compatibility
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
if (!browserAPI) {
    console.error('[Topic Manager] Browser API (chrome or browser) not available. Extension will not function.');
}

// Configuration constants
const CONFIG = {
    RETRY_LIMIT: 5,
    RETRY_DELAY_MS: 1000,
    DEBOUNCE_DELAY_MS: 300,
    UPDATE_SIDEBAR_DEBOUNCE_MS: 500,
    DRAG_DEBOUNCE_MS: 200,
    DEFAULT_SIDEBAR_POSITION: { top: '4rem', right: '4rem', left: 'auto' },
    SELECTORS: {
        CHAT_CONTAINER: ['main', '[role="main"]', 'body'],
        MESSAGE: '[data-message-id]',
        CONTENT: '.whitespace-pre-wrap',
        TITLE: ['h1', 'title', '[data-testid="conversation-turn-2"]', '.text-2xl', '.text-3xl', '.text-4xl'],
    },
    CLASS_NAMES: {
        SIDEBAR: 'topic-manager',
        BALL: 'ball',
        BALL_ICON: 'ball-icon',
        SIDEBAR_CONTENT: 'sidebar-content',
        CHAT_TITLE_SECTION: 'chat-title-section',
        THEME_TOGGLE: 'theme-toggle',
        TOPIC_INPUT: 'topic-input',
        ADD_TOPIC_BUTTON: 'add-topic-button',
    },
};

// Storage utility
const StorageUtils = {
    getCustomChatTitles(callback) {
        browserAPI.storage.local.get(['customChatTitles'], (result) => {
            callback(result.customChatTitles || {});
        });
    },
    setCustomChatTitle(conversationId, title, callback) {
        this.getCustomChatTitles((titles) => {
            titles[conversationId] = title;
            browserAPI.storage.local.set({ customChatTitles: titles }, () => {
                console.log(`Custom title "${title}" saved for conversation ${conversationId}`);
                if (callback) callback();
            });
        });
    },
    getTopicsByConversation(callback) {
        browserAPI.storage.local.get(['topicsByConversation'], (result) => {
            callback(result.topicsByConversation || {});
        });
    },
    setTopicsByConversation(conversationId, topics, callback) {
        this.getTopicsByConversation((allTopics) => {
            allTopics[conversationId] = topics;
            browserAPI.storage.local.set({ topicsByConversation: allTopics }, () => {
                console.log(`Topics updated for conversation ${conversationId}`);
                if (callback) callback();
            });
        });
    },
    getBookmarksByConversation(callback) {
        browserAPI.storage.local.get(['messageBookmarksByConversation'], (result) => {
            callback(result.messageBookmarksByConversation || {});
        });
    },
    setBookmarksByConversation(conversationId, bookmarks, callback) {
        this.getBookmarksByConversation((allBookmarks) => {
            allBookmarks[conversationId] = bookmarks;
            browserAPI.storage.local.set({ messageBookmarksByConversation: allBookmarks }, () => {
                console.log(`Bookmarks updated for conversation ${conversationId}`);
                if (callback) callback();
            });
        });
    },
    getCurrentTopicByConversation(callback) {
        browserAPI.storage.local.get(['currentTopicByConversation'], (result) => {
            callback(result.currentTopicByConversation || {});
        });
    },
    setCurrentTopicByConversation(conversationId, topicId, callback) {
        this.getCurrentTopicByConversation((currentTopicByConversation) => {
            currentTopicByConversation[conversationId] = topicId;
            browserAPI.storage.local.set({ currentTopicByConversation }, () => {
                console.log(`Current topic set to ${topicId} for conversation ${conversationId}`);
                if (callback) callback();
            });
        });
    },
    getSettings(callback) {
        browserAPI.storage.local.get(['autoTopic', 'topicPosition'], (result) => {
            callback({
                autoTopic: result.autoTopic || 'enabled',
                topicPosition: result.topicPosition || 'right'
            });
        });
    },
};

let currentConversationId = null;
let domMessages = [];
let lastMessageIds = [];
let extractTimeout = null;
let updateTimeout = null;
let lastCustomTitleConversationId = null;
let lastCustomTitleValue = null;

// Utility to get conversation_id from URL
function getConversationIdFromUrl() {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
}

// DOM-based Message Extraction
function extractMessagesFromDOM() {
    const messageNodes = document.querySelectorAll(CONFIG.SELECTORS.MESSAGE);
    const messages = [];
    const ids = [];
    messageNodes.forEach(node => {
        const id = node?.getAttribute('data-message-id');
        if (!id) return;
        ids.push(id);
        const author = node.getAttribute('data-message-author-role') || '';
        const contentNode = node.querySelector(CONFIG.SELECTORS.CONTENT);
        const content = contentNode?.textContent || '';
        const conversationId = getConversationIdFromUrl();
        if (!conversationId) return;
        messages.push({ id, author, content, node, conversationId });
    });
    if (ids.join(',') !== lastMessageIds.join(',')) {
        lastMessageIds = ids;
        domMessages = messages;
        console.log('[Topic Manager] DOM messages updated:', domMessages);
    }
}

function debouncedExtractMessages() {
    clearTimeout(extractTimeout);
    extractTimeout = setTimeout(extractMessagesFromDOM, CONFIG.DEBOUNCE_DELAY_MS);
}

// Observe DOM for new messages
function observeChatContainer() {
    const chatContainer = CONFIG.SELECTORS.CHAT_CONTAINER
        .map(selector => document.querySelector(selector))
        .find(element => element) || document.body;
    if (chatContainer) {
        const observer = new MutationObserver(debouncedExtractMessages);
        observer.observe(chatContainer, { childList: true, subtree: true });
    }
}

// Chat Title Management
function getChatTitleFromDOM() {
    // Try to get the title from the left sidebar (ChatGPT conversation list)
    const activeSidebarItem = document.querySelector('[aria-label="Chat history"] [data-testid="conversation-list"] [aria-current="page"], [aria-label="Chat history"] [data-testid="conversation-list"] .bg-token-sidebar-surface-primary');
    if (activeSidebarItem) {
        // Try to find the title text node inside the active item
        const titleNode = activeSidebarItem.querySelector('div, span, p');
        if (titleNode && titleNode.textContent.trim()) {
            return titleNode.textContent.trim();
        }
    }

    // Fallback to previous logic
    const titleElement = CONFIG.SELECTORS.TITLE
        .map(selector => document.querySelector(selector))
        .find(element => element) || null;
    
    // If no title found, try to find the first user message as it often contains the title
    if (!titleElement) {
        const firstUserMessage = document.querySelector('[data-message-author-role="user"]');
        if (firstUserMessage) {
            const content = firstUserMessage.querySelector(CONFIG.SELECTORS.CONTENT);
            if (content) {
                return content.textContent.trim().split('\n')[0] || 'Untitled Chat';
            }
        }
    }
    
    return titleElement?.textContent?.trim() || 'Untitled Chat';
}

function updateCurrentChat() {
    const newConversationId = getConversationIdFromUrl();
    if (newConversationId && newConversationId !== currentConversationId) {
        currentConversationId = newConversationId;
        console.log('[Topic Manager] Chat changed:', currentConversationId);
        browserAPI.runtime.sendMessage({
            type: "CHAT_CHANGED",
            conversationId: currentConversationId
        });
        // Ensure sidebar updates immediately after conversation change
        updateSidebar();
    }
}

function getCustomChatTitle(conversationId, callback) {
    StorageUtils.getCustomChatTitles((titles) => {
        callback(titles[conversationId] || null);
    });
}

function setCustomChatTitle(conversationId, title, callback) {
    StorageUtils.setCustomChatTitle(conversationId, title, callback);
}

function updateSidebarTitle() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) {
        // Silently return if no conversation is open
        return;
    }
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    if (!titleSpan) {
        console.error('[Topic Manager] Chat title element not found in sidebar');
        return;
    }
    getCustomChatTitle(conversationId, (customTitle) => {
        titleSpan.textContent = customTitle || getChatTitleFromDOM();
    });
}

function showTitleEditInput() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    const editSpan = sidebar.querySelector('#ai-chat-title-edit');
    const input = sidebar.querySelector('#ai-chat-title-input');
    if (titleSpan && editSpan && input) {
        input.value = titleSpan.textContent;
        titleSpan.style.display = 'none';
        editSpan.style.display = 'inline';
        input.focus();
        input.select();
        input.onblur = saveTitleEdit;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveTitleEdit();
            else if (e.key === 'Escape') cancelTitleEdit();
        };
    }
}

function saveTitleEdit() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    const editSpan = sidebar.querySelector('#ai-chat-title-edit');
    const input = sidebar.querySelector('#ai-chat-title-input');
    if (titleSpan && editSpan && input) {
        const newTitle = input.value.trim() || getChatTitleFromDOM();
        setCustomChatTitle(conversationId, newTitle, () => {
            titleSpan.textContent = newTitle;
            lastCustomTitleConversationId = conversationId;
            lastCustomTitleValue = newTitle;
            titleSpan.style.display = '';
            editSpan.style.display = 'none';
            renderCustomTitleList();
        });
    }
}

function cancelTitleEdit() {
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    const editSpan = sidebar.querySelector('#ai-chat-title-edit');
    if (titleSpan && editSpan) {
        titleSpan.style.display = '';
        editSpan.style.display = 'none';
    }
}

// Sidebar Injection and Event Listeners
function setupSidebarEventListeners(sidebar) {
    const doubleTapDelay = CONFIG.DEBOUNCE_DELAY_MS;
    let lastTap = 0;

    const expandSidebar = () => {
        sidebar.className = CONFIG.CLASS_NAMES.SIDEBAR;
        browserAPI.storage.local.set({ sidebarState: 'expanded' }, () => {
            console.log('Sidebar expanded via click/tap');
        });
    };

    const ballIcon = sidebar.querySelector(`.${CONFIG.CLASS_NAMES.BALL_ICON}`);
    if (ballIcon) {
        sidebar.addEventListener('click', (e) => {
            if (sidebar.classList.contains(CONFIG.CLASS_NAMES.BALL) && e.target.closest(`.${CONFIG.CLASS_NAMES.BALL_ICON}`)) {
                expandSidebar();
            }
        });

        sidebar.addEventListener('touchstart', (e) => {
            if (sidebar.classList.contains(CONFIG.CLASS_NAMES.BALL) && e.target.closest(`.${CONFIG.CLASS_NAMES.BALL_ICON}`)) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < doubleTapDelay && tapLength > 0) {
                    e.preventDefault();
                } else {
                    expandSidebar();
                }
                lastTap = currentTime;
            }
        });
    }

    const collapseSidebar = () => {
        if (!sidebar.classList.contains(CONFIG.CLASS_NAMES.BALL)) {
            sidebar.className = `${CONFIG.CLASS_NAMES.SIDEBAR} ${CONFIG.CLASS_NAMES.BALL}`;
            browserAPI.storage.local.set({ sidebarState: 'collapsed' }, () => {
                console.log('Sidebar collapsed via double-click/tap');
            });
        }
    };

    const chatTitleSection = sidebar.querySelector(`.${CONFIG.CLASS_NAMES.CHAT_TITLE_SECTION}`);
    if (chatTitleSection) {
        chatTitleSection.addEventListener('dblclick', collapseSidebar);
        chatTitleSection.addEventListener('touchstart', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < doubleTapDelay && tapLength > 0) {
                collapseSidebar();
            }
            lastTap = currentTime;
        });
    }

    const closeIcon = sidebar.querySelector('.close-icon');
    if (closeIcon) {
        closeIcon.addEventListener('click', () => {
            sidebar.className = `${CONFIG.CLASS_NAMES.SIDEBAR} ${CONFIG.CLASS_NAMES.BALL}`;
            browserAPI.storage.local.set({ sidebarState: 'collapsed' }, () => {
                console.log('Sidebar collapsed via close icon');
            });
        });
    }

    const themeSwitch = sidebar.querySelector('#theme-switch');
    if (themeSwitch) {
        const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5"/><line x1="8" y1="1" x2="8" y2="3"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="3.22" y1="3.22" x2="4.64" y2="4.64"/><line x1="11.36" y1="11.36" x2="12.78" y2="12.78"/><line x1="1" y1="8" x2="3" y2="8"/><line x1="13" y1="8" x2="15" y2="8"/><line x1="3.22" y1="12.78" x2="4.64" y2="11.36"/><line x1="11.36" y1="4.64" x2="12.78" y2="3.22"/></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 13A6 6 0 1 1 9 3a5 5 0 0 0 6 10z"/></svg>`;
        function setThemeIcon(theme) {
            themeSwitch.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
        }
        browserAPI.storage.local.get(['theme'], (result) => {
            const theme = result.theme || 'dark';
            document.body.setAttribute('data-theme', theme);
            setThemeIcon(theme);
            themeSwitch.onclick = () => {
                const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                browserAPI.storage.local.set({ theme: newTheme }, () => {
                    setThemeIcon(newTheme);
                });
            };
        });
    }

    const input = sidebar.querySelector(`.${CONFIG.CLASS_NAMES.TOPIC_INPUT}`);
    const button = sidebar.querySelector(`.${CONFIG.CLASS_NAMES.ADD_TOPIC_BUTTON}`);
    if (input && button) {
        const saveTopic = () => {
            const name = input.value.trim();
            if (!name) return;
            const conversationId = getConversationIdFromUrl();
            if (!conversationId) return;
            StorageUtils.getTopicsByConversation((allTopics) => {
                const topics = allTopics[conversationId] || [];
                const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                topics.push({ id, name });
                StorageUtils.setTopicsByConversation(conversationId, topics, () => {
                    input.value = '';
                    renderTopicList();
                    renderUserMessageBookmarks();
                    console.log(`Topic "${name}" saved for conversation ${conversationId}`);
                });
            });
        };
        button.addEventListener('click', saveTopic);
        input.addEventListener('blur', saveTopic);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveTopic();
        });
    }
}

function ensureSidebar() {
    let sidebar = document.querySelector(`.${CONFIG.CLASS_NAMES.SIDEBAR}`);
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.className = `${CONFIG.CLASS_NAMES.SIDEBAR} ${CONFIG.CLASS_NAMES.BALL}`;
        sidebar.innerHTML = `
            <div class="${CONFIG.CLASS_NAMES.BALL_ICON}">💬</div>
            <div class="${CONFIG.CLASS_NAMES.SIDEBAR_CONTENT}">
                <div class="${CONFIG.CLASS_NAMES.CHAT_TITLE_SECTION}">
                    <span id="ai-chat-topic-title"></span>
                    <span id="ai-chat-title-edit"><input id="ai-chat-title-input" type="text" /></span>
                      <span class="edit-icon" title="Edit title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </span>
                    <div class="${CONFIG.CLASS_NAMES.THEME_TOGGLE}">
                        <span id="theme-switch"></span>
                    </div>
                    <span class="close-icon" title="Minimize">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-minimize"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
                    </span>
                </div>
                <hr class="sidebar-divider">
                <div class="topic-input-div">
                    <input id="ai-topic-input" name="ai-topic-input" class="${CONFIG.CLASS_NAMES.TOPIC_INPUT}" type="text" placeholder="Add new topic..." />
                    <button class="${CONFIG.CLASS_NAMES.ADD_TOPIC_BUTTON}">Add</button>
                </div>
                <div class="topic-list"></div>
            </div>
        `;
        document.body.appendChild(sidebar);

        const editIcon = sidebar.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.addEventListener('click', showTitleEditInput);
        }

        setupSidebarEventListeners(sidebar);

        StorageUtils.getSettings((settings) => {
            const position = CONFIG.DEFAULT_SIDEBAR_POSITION;
            if (settings.topicPosition === 'left') {
                position.left = '4rem';
                position.right = 'auto';
            } else {
                position.right = '4rem';
                position.left = 'auto';
            }
            browserAPI.storage.local.get(['sidebarState', 'sidebarPosition'], (result) => {
                if (result.sidebarState === 'expanded') {
                    sidebar.className = CONFIG.CLASS_NAMES.SIDEBAR;
                }
                const savedPosition = result.sidebarPosition || position;
                sidebar.style.top = savedPosition.top || position.top;
                sidebar.style.left = savedPosition.left || position.left;
                sidebar.style.right = savedPosition.right || position.right;
            });
        });

        makeDraggable(sidebar);
    }
    return sidebar;
}

// Draggable Functionality
function makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let savePositionTimeout;

    element.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);
    element.addEventListener('touchstart', startDragging);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDragging);

    function startDragging(e) {
        if (e.target.closest('.topic-input, .add-topic-button, .edit-icon, .topic-bookmark, .topic-select, #ai-chat-title-input, .delete-topic, #theme-switch, .close-icon')) return;
        e.preventDefault();
        const rect = element.getBoundingClientRect();
        if (e.type === 'mousedown') {
            initialX = e.clientX - (parseFloat(element.style.left) || (window.innerWidth - parseFloat(element.style.right) - rect.width));
            initialY = e.clientY - (parseFloat(element.style.top) || 32);
        } else {
            const touch = e.touches[0];
            initialX = touch.clientX - (parseFloat(element.style.left) || (window.innerWidth - parseFloat(element.style.right) - rect.width));
            initialY = touch.clientY - (parseFloat(element.style.top) || 32);
        }
        isDragging = true;
        element.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const rect = element.getBoundingClientRect();
        if (e.type === 'mousemove') {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        } else {
            const touch = e.touches[0];
            currentX = touch.clientX - initialX;
            currentY = touch.clientY - initialY;
        }
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        if (currentX <= window.innerWidth / 2) {
            element.style.left = currentX + 'px';
            element.style.right = 'auto';
        } else {
            element.style.right = (window.innerWidth - (currentX + rect.width)) + 'px';
            element.style.left = 'auto';
        }
        element.style.top = currentY + 'px';

        clearTimeout(savePositionTimeout);
        savePositionTimeout = setTimeout(() => {
            browserAPI.storage.local.set({ sidebarPosition: { top: element.style.top, left: element.style.left, right: element.style.right } }, () => {
                console.log('Sidebar position updated');
            });
        }, CONFIG.DRAG_DEBOUNCE_MS);
    }

    function stopDragging() {
        isDragging = false;
        element.style.cursor = 'grab';
    }
}

// SPA URL Change Detection
function observeUrlChanges() {
    let lastUrl = window.location.href;
    let lastConversationId = getConversationIdFromUrl();

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        checkUrlChange();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        checkUrlChange();
    };

    window.addEventListener('popstate', checkUrlChange);

    function checkUrlChange() {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            const newConversationId = getConversationIdFromUrl();
            
            // Only update if the conversation ID has actually changed
            if (newConversationId && newConversationId !== lastConversationId) {
                console.log('[Topic Manager] Chat changed:', newConversationId);
                lastConversationId = newConversationId;
                currentConversationId = newConversationId;
                
                // Update the sidebar and title
                updateSidebarTitle();
                updateSidebar();
                updateCurrentChat();
            }
        }
    }
}

// Debounced Sidebar Update
function debouncedUpdateSidebar() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        extractMessagesFromDOM();
        updateSidebar();
    }, CONFIG.UPDATE_SIDEBAR_DEBOUNCE_MS);
}

// Topic Management
function deleteTopic(conversationId, topicId, callback) {
    StorageUtils.getTopicsByConversation((allTopics) => {
        const topics = allTopics[conversationId] || [];
        const updatedTopics = topics.filter(t => t.id !== topicId);
        StorageUtils.getBookmarksByConversation((allBookmarks) => {
            const bookmarks = allBookmarks[conversationId] || {};
            Object.keys(bookmarks).forEach(msgId => {
                if (bookmarks[msgId].topicId === topicId) {
                    delete bookmarks[msgId].topicId;
                }
            });
            StorageUtils.setBookmarksByConversation(conversationId, bookmarks, () => {
                StorageUtils.setTopicsByConversation(conversationId, updatedTopics, callback);
            });
        });
    });
}

function renderTopicList() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    const sidebar = ensureSidebar();
    const topicListDiv = sidebar.querySelector('.topic-list');
    if (!topicListDiv) return;

    StorageUtils.getTopicsByConversation((allTopics) => {
        const topics = allTopics[conversationId] || [];
        StorageUtils.getCurrentTopicByConversation((currentTopicByConversation) => {
            const currentTopicId = currentTopicByConversation[conversationId] || null;
            StorageUtils.getBookmarksByConversation((allBookmarks) => {
                const bookmarks = allBookmarks[conversationId] || {};
                const noTopicBookmarks = [];
                const topicBookmarks = {};

                Object.entries(bookmarks).forEach(([msgId, bm]) => {
                    if (!bm.topicId) {
                        noTopicBookmarks.push({ msgId, ...bm });
                    } else {
                        if (!topicBookmarks[bm.topicId]) topicBookmarks[bm.topicId] = [];
                        topicBookmarks[bm.topicId].push({ msgId, ...bm });
                    }
                });

                let html = '';
                if (noTopicBookmarks.length) {
                    html += `
                        <div class="topic-item no-topic${currentTopicId === null ? ' current' : ''}" data-topic-id="none">
                            Unassigned
                        </div>
                    `;
                    noTopicBookmarks.forEach(bm => {
                        html += `
                            <div class="bookmark-list-item" data-msg-id="${bm.msgId}">
                                ${bm.name}
                            </div>
                        `;
                    });
                }

                topics.forEach(topic => {
                    html += `
                        <div class="topic-wrapper">
                            <div class="topic-item${topic.id === currentTopicId ? ' current' : ''}" data-topic-id="${topic.id}">
                                <span title="${topic.name}">${topic.name}</span>
                                <span class="delete-topic" title="Delete topic"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></span>
                            </div>
                            ${(topicBookmarks[topic.id] || []).map(bm => `
                                <div class="bookmark-list-item" data-msg-id="${bm.msgId}">
                                    ${bm.name}
                                </div>
                            `).join('')}
                        </div>
                    `;
                });

                topicListDiv.innerHTML = html;

                topicListDiv.addEventListener('click', (e) => {
                    const topicItem = e.target.closest('.topic-item');
                    const deleteBtn = e.target.closest('.delete-topic');
                    const bookmarkItem = e.target.closest('.bookmark-list-item');

                    if (deleteBtn) {
                        e.stopPropagation();
                        const topicId = topicItem?.dataset.topicId;
                        if (topicId && topicId !== 'none') {
                            deleteTopic(conversationId, topicId, () => {
                                renderTopicList();
                                renderUserMessageBookmarks();
                            });
                        }
                    } else if (topicItem) {
                        const topicId = topicItem.dataset.topicId === 'none' ? null : topicItem.dataset.topicId;
                        setCurrentTopic(topicId);
                    } else if (bookmarkItem) {
                        const msgId = bookmarkItem.dataset.msgId;
                        const msgNode = document.querySelector(`[data-message-id="${msgId}"]`);
                        if (msgNode) msgNode.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        });
    });
}

function setCurrentTopic(topicId) {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    StorageUtils.setCurrentTopicByConversation(conversationId, topicId, () => {
        renderTopicList();
    });
}

// Bookmark Management
function renderUserMessageBookmarks() {
    document.querySelectorAll('.bookmark-bar').forEach(bar => bar.remove());
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    let retries = 0;
    const maxRetries = CONFIG.RETRY_LIMIT;
    function tryRender() {
        StorageUtils.getTopicsByConversation((allTopics) => {
            const topics = allTopics[conversationId] || [];
            StorageUtils.getBookmarksByConversation((allBookmarks) => {
                const bookmarks = allBookmarks[conversationId] || {};
                const messageNodes = document.querySelectorAll('[data-message-id][data-message-author-role="user"]');
                if (!messageNodes.length && retries < maxRetries) {
                    retries++;
                    setTimeout(tryRender, CONFIG.RETRY_DELAY_MS);
                    return;
                }
                messageNodes.forEach(msgNode => {
                    const messageId = msgNode.getAttribute('data-message-id');
                    msgNode.querySelectorAll('.bookmark-bar').forEach(bar => bar.remove());
                    let bar = document.createElement('div');
                    bar.className = 'bookmark-bar';
                    msgNode.insertBefore(bar, msgNode.firstChild);
                    if (bookmarks[messageId]) {
                        const icon = document.createElement('span');
                        icon.className = 'topic-bookmark assigned';
                        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-bookmark"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
                        icon.title = 'Edit bookmark';
                        bar.appendChild(icon);
                        const label = document.createElement('span');
                        label.className = 'bookmark-label';
                        label.textContent = bookmarks[messageId].name;
                        bar.appendChild(label);
                        const topicSelect = document.createElement('select');
                        topicSelect.className = 'topic-select';
                        topicSelect.innerHTML = '<option value="">No Topic</option>' + 
                            topics.map(t => `<option value="${t.id}" ${t.id === bookmarks[messageId].topicId ? 'selected' : ''}>${t.name}</option>`).join('');
                        bar.appendChild(topicSelect);
                        icon.onclick = () => showBookmarkInput(bar, messageId, bookmarks[messageId].name, topics, bookmarks[messageId].topicId);
                        topicSelect.onchange = () => {
                            const topicId = topicSelect.value;
                            StorageUtils.getBookmarksByConversation((allBookmarks) => {
                                if (!allBookmarks[conversationId]) allBookmarks[conversationId] = {};
                                allBookmarks[conversationId][messageId].topicId = topicId || undefined;
                                StorageUtils.setBookmarksByConversation(conversationId, allBookmarks[conversationId], () => {
                                    renderTopicList();
                                });
                            });
                        };
                    } else {
                        const icon = document.createElement('span');
                        icon.className = 'topic-bookmark';
                        icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="13"></line></svg>`;
                        icon.title = 'Add bookmark';
                        bar.appendChild(icon);
                        icon.onclick = () => showBookmarkInput(bar, messageId, '', topics);
                    }
                });
            });
        });
    }
    tryRender();
}

function showBookmarkInput(bar, messageId, currentName, topics, currentTopicId) {
    bar.innerHTML = '';
    const input = document.createElement('input');
    input.className = 'topic-input-inline';
    input.type = 'text';
    input.placeholder = 'Bookmark name...';
    input.value = currentName;
    bar.appendChild(input);
    const topicSelect = document.createElement('select');
    topicSelect.className = 'topic-select';
    topicSelect.innerHTML = '<option value="">No Topic</option>' + 
        topics.map(t => `<option value="${t.id}" ${t.id === currentTopicId ? 'selected' : ''}>${t.name}</option>`).join('');
    bar.appendChild(topicSelect);
    input.focus();
    function save() {
        const name = input.value.trim();
        const topicId = topicSelect.value;
        const conversationId = getConversationIdFromUrl();
        if (!conversationId) return;
        StorageUtils.getBookmarksByConversation((allBookmarks) => {
            if (!allBookmarks[conversationId]) allBookmarks[conversationId] = {};
            if (name) {
                allBookmarks[conversationId][messageId] = { name, topicId: topicId || undefined };
            } else {
                delete allBookmarks[conversationId][messageId];
            }
            StorageUtils.setBookmarksByConversation(conversationId, allBookmarks[conversationId], () => {
                renderUserMessageBookmarks();
                renderTopicList();
            });
        });
    }
    input.onkeydown = (e) => {
        if (e.key === 'Enter') save();
        else if (e.key === 'Escape') renderUserMessageBookmarks();
    };
    input.onblur = save;
}

// Custom Title List
function renderCustomTitleList() {
    const sidebar = ensureSidebar();
    const customTitleListDiv = sidebar.querySelector('.custom-title-list');
    if (!customTitleListDiv) return;
    const currentId = getConversationIdFromUrl();
    StorageUtils.getCustomChatTitles((titles) => {
        customTitleListDiv.innerHTML = '';
        Object.entries(titles).forEach(([convId, title]) => {
            const item = document.createElement('div');
            item.className = 'custom-title-item' + (convId === currentId ? ' current' : '');
            item.textContent = title;
            item.title = title;
            item.onclick = () => {
                if (convId !== currentId) {
                    // Navigate to the new conversation
                    window.location.href = `/c/${convId}`;
                    // Update currentConversationId immediately
                    currentConversationId = convId;
                    // Force update sidebar title and other components
                    setTimeout(() => {
                        updateCurrentChat();
                        updateSidebar();
                    }, 100); // Small delay to ensure navigation completes
                }
            };
            customTitleListDiv.appendChild(item);
        });
        customTitleListDiv.style.display = Object.keys(titles).length ? '' : 'none';
    });
}

// Update Sidebar
function updateSidebar(retries = 0) {
    ensureSidebar();
    updateSidebarTitle();
    renderTopicList();
    // Try to render bookmarks, retry if messages are not yet available
    const conversationId = getConversationIdFromUrl();
    const messageNodes = document.querySelectorAll('[data-message-id][data-message-author-role="user"]');
    const MAX_RETRIES = 20; // Increased retry limit
    if (conversationId && messageNodes.length === 0 && retries < MAX_RETRIES) {
        setTimeout(() => updateSidebar(retries + 1), 300);
    } else {
        renderUserMessageBookmarks();
    }
}

// Add a MutationObserver to the chat container to trigger topic/bookmark rendering
function observeUserMessages() {
    const chatContainer = CONFIG.SELECTORS.CHAT_CONTAINER
        .map(selector => document.querySelector(selector))
        .find(element => element) || document.body;
    if (!chatContainer) return;
    let lastConversationId = getConversationIdFromUrl();
    const observer = new MutationObserver(() => {
        const currentConversationId = getConversationIdFromUrl();
        // Only re-render if still in the same conversation
        if (currentConversationId === lastConversationId) {
            renderTopicList();
            renderUserMessageBookmarks();
        } else {
            lastConversationId = currentConversationId;
        }
    });
    observer.observe(chatContainer, { childList: true, subtree: true });
}

// Handle Messages
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_CURRENT_CHAT_TITLE") {
        const conversationId = getConversationIdFromUrl();
        if (!conversationId) {
            sendResponse({ title: 'No chat selected' });
            return;
        }
        StorageUtils.getCustomChatTitles((titles) => {
            const title = titles[conversationId] || getChatTitleFromDOM();
            sendResponse({ title });
        });
        return true;
    }
    if (message.type === 'settings-updated') {
        StorageUtils.getSettings((settings) => {
            const sidebar = ensureSidebar();
            const position = CONFIG.DEFAULT_SIDEBAR_POSITION;
            if (settings.topicPosition === 'left') {
                sidebar.style.left = '4rem';
                sidebar.style.right = 'auto';
            } else {
                sidebar.style.right = '4rem';
                sidebar.style.left = 'auto';
            }
            browserAPI.storage.local.set({ sidebarPosition: { top: sidebar.style.top, left: sidebar.style.left, right: sidebar.style.right } });
        });
    }
});

// Add title observer
function observeTitleChanges() {
    const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                updateSidebarTitle();
            }
        });
    });

    // Observe all potential title elements
    CONFIG.SELECTORS.TITLE.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            titleObserver.observe(element, { 
                childList: true, 
                characterData: true, 
                subtree: true 
            });
        }
    });

    // Also observe the first user message for title changes
    const firstUserMessage = document.querySelector('[data-message-author-role="user"]');
    if (firstUserMessage) {
        titleObserver.observe(firstUserMessage, { 
            childList: true, 
            characterData: true, 
            subtree: true 
        });
    }
}

// Add click observer for ChatGPT sidebar
function observeChatGPTSidebar() {
    const chatHistory = document.querySelector('[aria-label="Chat history"]');
    if (!chatHistory) {
        console.debug('[Topic Manager] Chat history not found, will retry');
        setTimeout(observeChatGPTSidebar, 1000);
        return;
    }

    console.debug('[Topic Manager] Setting up click observer for chat history');
    chatHistory.addEventListener('click', (e) => {
        const chatItem = e.target.closest('[data-testid="conversation-list"] > div');
        if (chatItem) {
            console.debug('[Topic Manager] Chat item clicked, updating title');
            // Small delay to ensure the URL has updated
            setTimeout(updateSidebarTitle, 100);
        }
    });
}

function observeSidebarSelection() {
    let lastConversationId = getConversationIdFromUrl();
    let sidebarObserver = null;
    let attached = false;

    function attachSidebarObserver() {
        const sidebar = document.querySelector('[aria-label="Chat history"] [data-testid="conversation-list"]');
        if (sidebar && !attached) {
            attached = true;
            sidebarObserver = new MutationObserver(() => {
                const newConversationId = getConversationIdFromUrl();
                if (newConversationId && newConversationId !== lastConversationId) {
                    console.log('[Topic Manager] Chat changed:', newConversationId);
                    lastConversationId = newConversationId;
                    currentConversationId = newConversationId;
                    updateSidebarTitle();
                    updateSidebar();
                }
            });
            sidebarObserver.observe(sidebar, { childList: true, subtree: true, attributes: true });
        }
    }

    // Keep trying to attach the observer until successful
    const intervalId = setInterval(() => {
        if (!attached) {
            attachSidebarObserver();
        } else {
            clearInterval(intervalId);
        }
    }, 500);

    // Also observe the body for sidebar being added (SPA navigation)
    const bodyObserver = new MutationObserver(() => {
        if (!attached) {
            attachSidebarObserver();
        }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}

function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
            if (granted) {
                console.log('[Topic Manager] Persistent storage granted');
            } else {
                console.log('[Topic Manager] Persistent storage not granted');
            }
        });
    }
}

function pollForConversationChange() {
    let lastConversationId = getConversationIdFromUrl();
    setInterval(() => {
        const currentId = getConversationIdFromUrl();
        if (currentId && currentId !== lastConversationId) {
            console.log('[Topic Manager] Chat changed (poll):', currentId);
            lastConversationId = currentId;
            currentConversationId = currentId;
            updateSidebarTitle();
            updateSidebar();
        }
    }, 500);
}

// Initialize Extension
function init() {
    requestPersistentStorage();
    console.log('[Topic Manager] Initializing...');
    updateCurrentChat();
    observeUrlChanges();
    observeTitleChanges();
    observeChatGPTSidebar();
    observeSidebarSelection();
    observeUserMessages();
    pollForConversationChange();
    let retries = 0;
    const maxRetries = CONFIG.RETRY_LIMIT;
    function tryInit() {
        const chatContainer = CONFIG.SELECTORS.CHAT_CONTAINER
            .map(selector => document.querySelector(selector))
            .find(element => element);
        if (chatContainer || retries >= maxRetries) {
            ensureSidebar();
            updateSidebar();
            observeChatContainer();
        } else {
            retries++;
            setTimeout(tryInit, CONFIG.RETRY_DELAY_MS);
        }
    }
    setTimeout(tryInit, CONFIG.RETRY_DELAY_MS);
}

init();