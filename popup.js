// Cross-browser compatibility
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
if (!browserAPI) {
    console.error('[Topic Manager] Browser API (chrome or browser) not available. Popup will not function.');
}

function updateStats() {
    browserAPI.runtime.sendMessage({ type: 'UPDATE_STATS' }, (response) => {
        if (response) {
            document.getElementById('total-topics').textContent = response.topics;
            document.getElementById('total-messages').textContent = response.messages;
        }
    });
}

function loadSettings() {
    browserAPI.runtime.sendMessage({ type: 'LOAD_SETTINGS' }, (response) => {
        if (response) {
            document.getElementById('auto-topic').value = response.autoTopic;
            document.getElementById('topic-position').value = response.topicPosition;
        }
    });
}

function saveSettings() {
    const settings = {
        autoTopic: document.getElementById('auto-topic').value,
        topicPosition: document.getElementById('topic-position').value
    };
    browserAPI.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, (response) => {
        if (response?.success) {
            console.log('[Topic Manager] Settings saved successfully');
        }
    });
}

function updateChatTitle() {
    browserAPI.runtime.sendMessage({ type: "GET_CURRENT_CHAT_TITLE" }, (response) => {
        const titleElement = document.getElementById('chat-title');
        if (titleElement) {
            titleElement.textContent = response?.title || 'No chat selected';
        }
    });
}

// Initialize Popup
document.addEventListener('DOMContentLoaded', () => {
    const titleElement = document.getElementById('chat-title');
    if (!titleElement) {
        console.error('[Topic Manager] Chat title element not found in popup');
        return;
    }

    updateStats();
    loadSettings();
    updateChatTitle();

    document.getElementById('auto-topic').addEventListener('change', saveSettings);
    document.getElementById('topic-position').addEventListener('change', saveSettings);

    browserAPI.runtime.onMessage.addListener((message) => {
        if (message.type === "CHAT_CHANGED") {
            updateChatTitle();
        }
    });

    // Fallback: Poll for title updates every 2 seconds to handle missed messages
    setInterval(updateChatTitle, 2000);
});