// Cross-browser compatibility
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
if (!browserAPI) {
    console.error('[Topic Manager] Browser API (chrome or browser) not available. Background script will not function.');
}

// Listen for messages from content script or popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
if (message.type === 'UPDATE_STATS') {
    browserAPI.storage.local.get(['topicsByConversation', 'messageBookmarksByConversation'], (result) => {
        const topicsByConversation = result.topicsByConversation || {};
        const bookmarksByConversation = result.messageBookmarksByConversation || {};
        const totalTopics = Object.values(topicsByConversation).reduce((sum, topics) => sum + (Array.isArray(topics) ? topics.length : 0), 0);
        const totalMessages = Object.values(bookmarksByConversation).reduce((sum, bookmarks) => sum + Object.keys(bookmarks || {}).length, 0);
        sendResponse({ topics: totalTopics, messages: totalMessages });
    });
    return true;
}
    if (message.type === 'SAVE_SETTINGS') {
        browserAPI.storage.local.set(message.settings, () => {
            browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    browserAPI.tabs.sendMessage(tabs[0].id, {
                        type: 'settings-updated',
                        settings: message.settings
                    });
                }
            });
            sendResponse({ success: true });
        });
        return true;
    }
    if (message.type === 'LOAD_SETTINGS') {
        browserAPI.storage.local.get(['autoTopic', 'topicPosition'], (result) => {
            sendResponse({
                autoTopic: result.autoTopic || 'enabled',
                topicPosition: result.topicPosition || 'right'
            });
        });
        return true;
    }
});