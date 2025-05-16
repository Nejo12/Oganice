// Ensure cross-browser compatibility
if (typeof browser === "undefined") {
    var browser = chrome;
}

// --- Utility to get conversation_id from URL ---
function getConversationIdFromUrl() {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9\-]+)/);
    return match ? match[1] : null;
}

// --- DOM-based Message Extraction (CSP-safe) ---
let domMessages = [];
let lastMessageIds = [];
let extractTimeout = null;

function extractMessagesFromDOM() {
    const messageNodes = document.querySelectorAll('[data-message-id]');
    const messages = [];
    const ids = [];
    messageNodes.forEach(node => {
        const id = node.getAttribute('data-message-id');
        ids.push(id);
        const author = node.getAttribute('data-message-author-role') || '';
        const contentNode = node.querySelector('.whitespace-pre-wrap');
        const content = contentNode ? contentNode.textContent : '';
        messages.push({ id, author, content, node, conversationId: getConversationIdFromUrl() });
    });
    if (ids.join(',') !== lastMessageIds.join(',')) {
        lastMessageIds = ids;
        domMessages = messages;
        console.log('[AI Chat Topic Manager] DOM messages updated:', domMessages);
    }
}

function debouncedExtractMessages() {
    clearTimeout(extractTimeout);
    extractTimeout = setTimeout(extractMessagesFromDOM, 300);
}

// --- Observe DOM for new messages ---
function observeChatContainer() {
    const chatContainer = document.querySelector('main') || 
        document.querySelector('[role="main"]') ||
        document.body;
    if (chatContainer) {
        const observer = new MutationObserver(debouncedExtractMessages);
        observer.observe(chatContainer, { childList: true, subtree: true });
    }
}

// --- Sidebar Injection and Theme Management ---
function getChatTitleFromDOM() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return 'Untitled Chat';
    const sidebarLink = document.querySelector(`a[href*='c/${conversationId}']`);
    if (sidebarLink) {
        const historyItem = sidebarLink.closest('li[data-testid^="history-item"]');
        if (historyItem) {
            const growDiv = historyItem.querySelector('div.grow');
            if (growDiv && growDiv.textContent.trim()) {
                return growDiv.textContent.trim();
            }
        }
    }
    const titleNode = document.querySelector('.text-token-title') ||
        document.querySelector('main h1, main h2') ||
        document.querySelector('nav h1, nav h2');
    return titleNode && titleNode.textContent.trim() ? titleNode.textContent.trim() : 'Untitled Chat';
}

function ensureSidebar() {
    let sidebar = document.querySelector('.topic-manager');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.className = 'topic-manager ball';
        sidebar.innerHTML = `
            <div class="ball-icon">💬</div>
            <div class="sidebar-content">
                <div class="chat-title-section">
                    <span id="ai-chat-topic-title"></span>
                    <span id="ai-chat-title-edit"><input id="ai-chat-title-input" type="text" /></span>
                    <span class="edit-icon" title="Edit title">✎</span>
                    <div class="theme-toggle">
                    <button id="theme-switch">🌙</button>
                    </div>
                    <span class="close-icon" title="Minimize">✕</span>
                </div>
                <div class="custom-title-list"></div>
                <hr class="sidebar-divider">
                <div class="topic-input-div">
                    <input class="topic-input" type="text" placeholder="Add new topic..." />
                    <button class="add-topic-button">Add</button>
                </div>
                <div class="topic-list"></div>
            </div>
        `;
        document.body.appendChild(sidebar);
        // Set up edit icon handler
        const editIcon = sidebar.querySelector('.edit-icon');
        if (editIcon) {
            editIcon.onclick = showTitleEditInput;
        }
        // Set up close icon handler
        const closeIcon = sidebar.querySelector('.close-icon');
        if (closeIcon) {
            closeIcon.onclick = () => {
                sidebar.className = 'topic-manager ball';
                browser.storage.local.set({ sidebarState: 'collapsed' }, () => {
                    console.log('Sidebar collapsed');
                });
            };
        }
        // Set up theme toggle
        const themeSwitch = sidebar.querySelector('#theme-switch');
        if (themeSwitch) {
            browser.storage.local.get(['theme'], (result) => {
                const theme = result.theme || 'dark';
                document.body.setAttribute('data-theme', theme);
                themeSwitch.textContent = theme === 'dark' ? '☀️' : '🌙';
                themeSwitch.onclick = () => {
                    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                    document.body.setAttribute('data-theme', newTheme);
                    themeSwitch.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                    browser.storage.local.set({ theme: newTheme }, () => {
                        console.log(`Theme switched to ${newTheme}`);
                    });
                };
            });
        }
        // Set up topic input handler
        const input = sidebar.querySelector('.topic-input');
        const button = sidebar.querySelector('.add-topic-button');
        if (input && button) {
            const saveTopic = () => {
                const name = input.value.trim();
                if (!name) return;
                const conversationId = getConversationIdFromUrl();
                if (!conversationId) return;
                getTopicsForConversation(conversationId, (topics) => {
                    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
                    topics.push({ id, name });
                    setTopicsForConversation(conversationId, topics, () => {
                        input.value = '';
                        renderTopicList();
                        console.log(`Topic "${name}" saved for conversation ${conversationId}`);
                    });
                });
            };
            button.onclick = saveTopic;
            input.onblur = saveTopic;
            input.onkeydown = (e) => {
                if (e.key === 'Enter') saveTopic();
            };
        }
        // Set up ball toggle
        sidebar.onclick = (e) => {
            if (sidebar.classList.contains('ball') && e.target.closest('.ball-icon')) {
                sidebar.className = 'topic-manager'; // Remove 'ball' to expand
                browser.storage.local.set({ sidebarState: 'expanded' }, () => {
                    console.log('Sidebar expanded');
                });
            }
        };
        // Load saved state and position
        browser.storage.local.get(['sidebarState', 'sidebarPosition'], (result) => {
            if (result.sidebarState === 'expanded') {
                sidebar.className = 'topic-manager';
            }
            if (result.sidebarPosition) {
                sidebar.style.top = result.sidebarPosition.top || '4rem';
                sidebar.style.left = result.sidebarPosition.left || 'auto';
                sidebar.style.right = result.sidebarPosition.right || '4rem';
            } else {
                sidebar.style.top = '4rem';
                sidebar.style.right = '4rem';
            }
        });
        // Make draggable
        makeDraggable(sidebar);
    }
    return sidebar;
}

// --- Draggable Functionality ---
function makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    element.addEventListener('mousedown', (e) => {
        if (e.target.closest('.topic-input, .add-topic-button, .edit-icon, .topic-bookmark, .topic-select, #ai-chat-title-input, .delete-topic, #theme-switch, .close-icon')) return;
        initialX = e.clientX - (parseFloat(element.style.left) || (window.innerWidth - parseFloat(element.style.right) - element.offsetWidth));
        initialY = e.clientY - parseFloat(element.style.top) || 64; // 64px = 4rem
        isDragging = true;
        element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            // Constrain to viewport
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            // Update both left and right based on position
            if (currentX <= window.innerWidth / 2) {
                element.style.left = currentX + 'px';
                element.style.right = 'auto';
            } else {
                element.style.right = (window.innerWidth - (currentX + rect.width)) + 'px';
                element.style.left = 'auto';
            }
            element.style.top = currentY + 'px';

            browser.storage.local.set({ sidebarPosition: { top: element.style.top, left: element.style.left, right: element.style.right } }, () => {
                console.log('Sidebar position updated');
            });
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.cursor = 'grab';
    });
}

// --- Chat Title Renaming ---
function getCustomChatTitle(conversationId, callback) {
    browser.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        callback(titles[conversationId] || null);
    });
}

function setCustomChatTitle(conversationId, title, callback) {
    browser.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        titles[conversationId] = title;
        browser.storage.local.set({ customChatTitles: titles }, callback || (() => {
            console.log(`Custom title "${title}" saved for conversation ${conversationId}`);
        }));
    });
}

function updateSidebarTitle() {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    if (titleSpan) {
        getCustomChatTitle(conversationId, (customTitle) => {
            titleSpan.textContent = customTitle || getChatTitleFromDOM();
        });
    }
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

// --- SPA URL Change Detection ---
function observeUrlChanges() {
    let lastUrl = window.location.href;
    const checkUrl = () => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            debouncedUpdateSidebar();
        }
    };
    // Observe title changes
    const title = document.querySelector('title');
    if (title) {
        const observer = new MutationObserver(checkUrl);
        observer.observe(title, { childList: true, characterData: true, subtree: true });
    }
    // Listen for popstate
    window.addEventListener('popstate', checkUrl);
    // Fallback: periodic check
    setInterval(checkUrl, 1000);
}

// --- Debounced Sidebar Update ---
let updateTimeout = null;
function debouncedUpdateSidebar() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        extractMessagesFromDOM(); // Ensure messages are updated
        updateSidebar();
    }, 500); // Wait for DOM to settle
}

// --- Topic Management ---
function getTopicsForConversation(conversationId, callback) {
    browser.storage.local.get(['topicsByConversation'], (result) => {
        const allTopics = result.topicsByConversation || {};
        callback(allTopics[conversationId] || []);
    });
}

function setTopicsForConversation(conversationId, topics, callback) {
    browser.storage.local.get(['topicsByConversation'], (result) => {
        const allTopics = result.topicsByConversation || {};
        allTopics[conversationId] = topics;
        browser.storage.local.set({ topicsByConversation: allTopics }, callback || (() => {
            console.log(`Topics updated for conversation ${conversationId}`);
        }));
    });
}

function deleteTopic(conversationId, topicId, callback) {
    getTopicsForConversation(conversationId, (topics) => {
        const updatedTopics = topics.filter(t => t.id !== topicId);
        // Remove topicId from bookmarks
        browser.storage.local.get(['messageBookmarksByConversation'], (result) => {
            const allBookmarks = result.messageBookmarksByConversation || {};
            const bookmarks = allBookmarks[conversationId] || {};
            Object.keys(bookmarks).forEach(msgId => {
                if (bookmarks[msgId].topicId === topicId) {
                    delete bookmarks[msgId].topicId;
                }
            });
            allBookmarks[conversationId] = bookmarks;
            browser.storage.local.set({ messageBookmarksByConversation: allBookmarks }, () => {
                setTopicsForConversation(conversationId, updatedTopics, callback || (() => {
                    console.log(`Topic ${topicId} deleted from conversation ${conversationId}`);
                }));
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
    getTopicsForConversation(conversationId, (topics) => {
        browser.storage.local.get(['currentTopicByConversation'], (result) => {
            const currentTopicByConversation = result.currentTopicByConversation || {};
            const currentTopicId = currentTopicByConversation[conversationId] || null;
            topicListDiv.innerHTML = '';
            
            // Create a "No Topic" section for unassigned bookmarks
            const noTopicBookmarks = [];
            const topicBookmarks = {};

            // Organize bookmarks by topic
            browser.storage.local.get(['messageBookmarksByConversation'], (result) => {
                const allBookmarks = result.messageBookmarksByConversation || {};
                const bookmarks = allBookmarks[conversationId] || {};
                Object.entries(bookmarks).forEach(([msgId, bm]) => {
                    if (!bm.topicId) {
                        noTopicBookmarks.push({ msgId, ...bm });
                    } else {
                        if (!topicBookmarks[bm.topicId]) topicBookmarks[bm.topicId] = [];
                        topicBookmarks[bm.topicId].push({ msgId, ...bm });
                    }
                });

                // Render "No Topic" section if there are unassigned bookmarks
                if (noTopicBookmarks.length) {
                    const noTopicDiv = document.createElement('div');
                    noTopicDiv.className = 'topic-item no-topic' + (currentTopicId === null ? ' current' : '');
                    noTopicDiv.textContent = 'untitled';
                    noTopicDiv.onclick = () => setCurrentTopic(null);
                    topicListDiv.appendChild(noTopicDiv);

                    noTopicBookmarks.forEach(bm => {
                        const bmDiv = document.createElement('div');
                        bmDiv.className = 'bookmark-list-item';
                        bmDiv.textContent = bm.name;
                        bmDiv.onclick = () => {
                            const msgNode = document.querySelector(`[data-message-id="${bm.msgId}"]`);
                            if (msgNode) msgNode.scrollIntoView({ behavior: 'smooth' });
                        };
                        topicListDiv.appendChild(bmDiv);
                    });
                }

                // Render each topic and its bookmarks
                topics.forEach(topic => {
                    const topicWrapper = document.createElement('div');
                    topicWrapper.className = 'topic-wrapper';

                    const topicDiv = document.createElement('div');
                    topicDiv.className = 'topic-item' + (topic.id === currentTopicId ? ' current' : '');
                    const topicName = document.createElement('span');
                    topicName.textContent = topic.name;
                    topicName.title = topic.name;
                    topicDiv.appendChild(topicName);

                    const deleteBtn = document.createElement('span');
                    deleteBtn.className = 'delete-topic';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.title = 'Delete topic';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteTopic(conversationId, topic.id, () => {
                            renderTopicList();
                            renderUserMessageBookmarks();
                        });
                    };
                    topicDiv.appendChild(deleteBtn);

                    topicDiv.onclick = () => setCurrentTopic(topic.id);
                    topicWrapper.appendChild(topicDiv);

                    // Render bookmarks for this topic
                    const bookmarksForTopic = topicBookmarks[topic.id] || [];
                    bookmarksForTopic.forEach(bm => {
                        const bmDiv = document.createElement('div');
                        bmDiv.className = 'bookmark-list-item';
                        bmDiv.textContent = bm.name;
                        bmDiv.onclick = () => {
                            const msgNode = document.querySelector(`[data-message-id="${bm.msgId}"]`);
                            if (msgNode) msgNode.scrollIntoView({ behavior: 'smooth' });
                        };
                        topicWrapper.appendChild(bmDiv);
                    });

                    topicListDiv.appendChild(topicWrapper);
                });
            });
        });
    });
}

function setCurrentTopic(topicId) {
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    browser.storage.local.get(['currentTopicByConversation'], (result) => {
        const currentTopicByConversation = result.currentTopicByConversation || {};
        currentTopicByConversation[conversationId] = topicId;
        browser.storage.local.set({ currentTopicByConversation }, () => {
            renderTopicList();
            console.log(`Current topic set to ${topicId} for conversation ${conversationId}`);
        });
    });
}

// --- Bookmark Management ---
function renderUserMessageBookmarks() {
    document.querySelectorAll('.bookmark-bar').forEach(bar => bar.remove());
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return;
    let retries = 0;
    const maxRetries = 3;
    function tryRender() {
        getTopicsForConversation(conversationId, (topics) => {
            browser.storage.local.get(['messageBookmarksByConversation'], (result) => {
                const allBookmarks = result.messageBookmarksByConversation || {};
                const bookmarks = allBookmarks[conversationId] || {};
                const messageNodes = document.querySelectorAll('[data-message-id][data-message-author-role="user"]');
                if (!messageNodes.length && retries < maxRetries) {
                    retries++;
                    setTimeout(tryRender, 500);
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
                        icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path><line x1="12" y1="7" x2="12" y2="13"></line></svg>`;
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
                            browser.storage.local.get(['messageBookmarksByConversation'], (result) => {
                                const allBookmarks = result.messageBookmarksByConversation || {};
                                if (!allBookmarks[conversationId]) allBookmarks[conversationId] = {};
                                allBookmarks[conversationId][messageId].topicId = topicId || undefined;
                                browser.storage.local.set({ messageBookmarksByConversation: allBookmarks }, () => {
                                    renderTopicList();
                                    console.log(`Bookmark ${messageId} updated for conversation ${conversationId}`);
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
        browser.storage.local.get(['messageBookmarksByConversation'], (result) => {
            const allBookmarks = result.messageBookmarksByConversation || {};
            if (!allBookmarks[conversationId]) allBookmarks[conversationId] = {};
            if (name) {
                allBookmarks[conversationId][messageId] = { name, topicId: topicId || undefined };
            } else {
                delete allBookmarks[conversationId][messageId];
            }
            browser.storage.local.set({ messageBookmarksByConversation: allBookmarks }, () => {
                renderUserMessageBookmarks();
                renderTopicList();
                console.log(`Bookmark ${messageId} saved for conversation ${conversationId}`);
            });
        });
    }
    input.onkeydown = (e) => {
        if (e.key === 'Enter') save();
        else if (e.key === 'Escape') renderUserMessageBookmarks();
    };
    input.onblur = save;
}

// --- Custom Title List ---
function renderCustomTitleList() {
    const sidebar = ensureSidebar();
    const customTitleListDiv = sidebar.querySelector('.custom-title-list');
    if (!customTitleListDiv) return;
    const currentId = getConversationIdFromUrl();
    browser.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        customTitleListDiv.innerHTML = '';
        Object.entries(titles).forEach(([convId, title]) => {
            const item = document.createElement('div');
            item.className = 'custom-title-item' + (convId === currentId ? ' current' : '');
            item.textContent = title;
            item.title = title;
            item.onclick = () => {
                if (convId !== currentId) {
                    window.location.href = `/c/${convId}`;
                }
            };
            customTitleListDiv.appendChild(item);
        });
        customTitleListDiv.style.display = Object.keys(titles).length ? '' : 'none';
    });
}

// --- Update Sidebar ---
function updateSidebar() {
    updateSidebarTitle();
    renderCustomTitleList();
    renderTopicList();
    renderUserMessageBookmarks();
}

// --- Initialize Extension ---
function init() {
    let retries = 0;
    const maxRetries = 5;
    function tryInit() {
        const chatContainer = document.querySelector('main') || document.querySelector('[role="main"]');
        if (chatContainer || retries >= maxRetries) {
            ensureSidebar();
            updateSidebar();
            observeChatContainer();
            observeUrlChanges();
        } else {
            retries++;
            setTimeout(tryInit, 1000);
        }
    }
    setTimeout(tryInit, 1000);
}

window.addEventListener('load', init);