// --- Utility to get conversation_id from URL ---
function getConversationIdFromUrl() {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9\-]+)/);
    return match ? match[1] : null;
}

const conversationId = getConversationIdFromUrl();
console.log('[AI Chat Topic Manager] Current conversation_id:', conversationId);

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
        messages.push({ id, author, content, node, conversationId });
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

// --- All legacy mapping, polling, and injection logic has been removed. ---