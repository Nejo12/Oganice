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
    // Only log and update if the message IDs have changed
    if (ids.join(',') !== lastMessageIds.join(',')) {
        lastMessageIds = ids;
        domMessages = messages;
        console.log('[AI Chat Topic Manager] DOM messages updated:', domMessages);
    }
}

function debouncedExtractMessages() {
    if (extractTimeout) clearTimeout(extractTimeout);
    extractTimeout = setTimeout(() => {
        extractMessagesFromDOM();
    }, 300); // 300ms debounce
}

// Initial extraction after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        extractMessagesFromDOM();
    }, 2000); // Wait for chat to render
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        extractMessagesFromDOM();
    }, 2000);
});

// Observe DOM for new messages
function observeChatContainer() {
    const chatContainer = document.querySelector('main') || 
        document.querySelector('.flex.flex-col.items-center.text.sm') ||
        document.querySelector('.overflow-hidden.w-full.h-full.relative.flex.z-0');
    if (chatContainer) {
        const observer = new MutationObserver(() => {
            debouncedExtractMessages();
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
    }
}

observeChatContainer();

// --- Sidebar Injection and Chat Title Management (Glassmorphism) ---

function getChatTitleFromDOM() {
    // Get the current conversation ID from the URL
    const conversationId = getConversationIdFromUrl();
    if (!conversationId) return 'Untitled Chat';
    // Find the sidebar link whose href contains the conversation ID
    const sidebarLink = document.querySelector(`a[href*='${conversationId}']`);
    if (sidebarLink) {
        // Find the closest history item <li> ancestor
        const historyItem = sidebarLink.closest("li[data-testid^='history-item']");
        if (historyItem) {
            // Find the .grow div inside the history item
            const growDiv = historyItem.querySelector('div.grow');
            if (growDiv && growDiv.textContent.trim().length > 0) {
                return growDiv.textContent.trim();
            }
        }
    }
    // Fallback: try previous selectors (main h1/h2, etc.)
    let titleNode = document.querySelector('.text-token-title');
    if (!titleNode) {
        titleNode = document.querySelector('nav h1, nav h2, nav span, nav div');
    }
    if (!titleNode) {
        titleNode = document.querySelector('main h1, main h2, main span, main div');
    }
    if (titleNode && titleNode.textContent.trim().length > 0) {
        return titleNode.textContent.trim();
    }
    return 'Untitled Chat';
}

function ensureSidebar() {
    let sidebar = document.querySelector('.topic-manager');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.className = 'topic-manager';
        sidebar.innerHTML = `
            <div class="chat-title-section">
                <span id="ai-chat-topic-title" title="Click to rename"></span>
                <span id="ai-chat-title-edit"><input id="ai-chat-title-input" type="text" /></span>
            </div>
            <hr class="sidebar-divider">
            <div class="topic-list"></div>
        `;
        document.body.appendChild(sidebar);
    }
    return sidebar;
}

// --- Chat Title Renaming and Topic Isolation ---

// Utility to get/set custom chat title in chrome.storage.local
function getCustomChatTitle(conversationId, callback) {
    chrome.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        callback(titles[conversationId] || null);
    });
}

function setCustomChatTitle(conversationId, title, callback) {
    chrome.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        titles[conversationId] = title;
        chrome.storage.local.set({ customChatTitles: titles }, callback);
    });
}

function hasCustomChatTitle(conversationId, callback) {
    chrome.storage.local.get(['customChatTitles'], (result) => {
        const titles = result.customChatTitles || {};
        callback(!!titles[conversationId]);
    });
}

// --- SPA URL Change Detection ---
let lastConversationId = getConversationIdFromUrl();
function checkConversationChange() {
    const currentId = getConversationIdFromUrl();
    if (currentId !== lastConversationId) {
        lastConversationId = currentId;
        updateSidebar(); // update title, topic list, etc.
    }
}
setInterval(checkConversationChange, 500); // Check every 500ms

// Update all functions to use getConversationIdFromUrl() instead of conversationId
function updateSidebarTitle() {
    const conversationId = getConversationIdFromUrl();
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
            if (e.key === 'Enter') {
                saveTitleEdit();
            } else if (e.key === 'Escape') {
                cancelTitleEdit();
            }
        };
    }
}

function saveTitleEdit() {
    const conversationId = getConversationIdFromUrl();
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

// Add click event for renaming
function setupTitleRenameHandler() {
    const sidebar = ensureSidebar();
    const titleSpan = sidebar.querySelector('#ai-chat-topic-title');
    if (titleSpan) {
        titleSpan.onclick = showTitleEditInput;
    }
}

// Observe chat title changes and update sidebar
function observeChatTitle() {
    const main = document.querySelector('main');
    if (!main) return;
    const titleNode = main.querySelector('h1, h2');
    if (!titleNode) return;
    const observer = new MutationObserver(() => {
        updateSidebarTitle();
    });
    observer.observe(titleNode, { childList: true, subtree: true, characterData: true });
}

// --- Topic Isolation Preparation ---
// Utility to get/set topics per conversation (future-proofed)
function getTopicsForConversation(conversationId, callback) {
    chrome.storage.local.get(['topicsByConversation'], (result) => {
        const allTopics = result.topicsByConversation || {};
        callback(allTopics[conversationId] || []);
    });
}

function setTopicsForConversation(conversationId, topics, callback) {
    chrome.storage.local.get(['topicsByConversation'], (result) => {
        const allTopics = result.topicsByConversation || {};
        allTopics[conversationId] = topics;
        chrome.storage.local.set({ topicsByConversation: allTopics }, callback);
    });
}

// --- Topic List Rendering and Current Topic Highlight ---

function renderTopicList() {
    const conversationId = getConversationIdFromUrl();
    const sidebar = ensureSidebar();
    const topicListDiv = sidebar.querySelector('.topic-list');
    if (!topicListDiv) return;
    getTopicsForConversation(conversationId, (topics) => {
        chrome.storage.local.get(['currentTopicByConversation'], (result) => {
            const currentTopicByConversation = result.currentTopicByConversation || {};
            const currentTopicId = currentTopicByConversation[conversationId] || null;
            topicListDiv.innerHTML = '';
            topics.forEach(topic => {
                const topicDiv = document.createElement('div');
                topicDiv.className = 'topic-item' + (topic.id === currentTopicId ? ' current' : '');
                topicDiv.textContent = topic.name;
                topicDiv.title = topic.name;
                topicDiv.onclick = () => setCurrentTopic(topic.id);
                topicListDiv.appendChild(topicDiv);
            });
        });
    });
}

function setCurrentTopic(topicId) {
    const conversationId = getConversationIdFromUrl();
    chrome.storage.local.get(['currentTopicByConversation'], (result) => {
        const currentTopicByConversation = result.currentTopicByConversation || {};
        currentTopicByConversation[conversationId] = topicId;
        chrome.storage.local.set({ currentTopicByConversation }, () => {
            renderTopicList();
        });
    });
}

// --- Add/Edit Icon for Chat Title ---
function ensureEditIcon() {
    const sidebar = ensureSidebar();
    let editIcon = sidebar.querySelector('.edit-icon');
    if (!editIcon) {
        editIcon = document.createElement('span');
        editIcon.className = 'edit-icon';
        editIcon.title = 'Edit title';
        editIcon.innerHTML = '&#9998;'; // Unicode pencil
        const titleSection = sidebar.querySelector('.chat-title-section');
        if (titleSection) {
            titleSection.appendChild(editIcon);
        }
    }
    editIcon.onclick = showTitleEditInput;
}

// Update sidebar rendering hooks
function updateSidebar() {
    updateSidebarTitle();
    renderTopicList();
    ensureEditIcon();
}

// Initial sidebar injection and update
window.addEventListener('load', () => {
    setTimeout(() => {
        ensureSidebar();
        updateSidebar();
        setupTitleRenameHandler();
        observeChatTitle();
    }, 2000);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        ensureSidebar();
        updateSidebar();
        setupTitleRenameHandler();
        observeChatTitle();
    }, 2000);
});

// --- All legacy mapping, polling, and injection logic has been removed. ---