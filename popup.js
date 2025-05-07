// Update statistics
function updateStats() {
    chrome.storage.local.get(['topics', 'messages'], function(result) {
        document.getElementById('total-topics').textContent = result.topics ? result.topics.length : 0;
        document.getElementById('total-messages').textContent = result.messages || 0;
    });
}

// Load settings
function loadSettings() {
    chrome.storage.local.get(['autoTopic', 'topicPosition'], function(result) {
        document.getElementById('auto-topic').value = result.autoTopic || 'enabled';
        document.getElementById('topic-position').value = result.topicPosition || 'right';
    });
}

// Save settings
function saveSettings() {
    const settings = {
        autoTopic: document.getElementById('auto-topic').value,
        topicPosition: document.getElementById('topic-position').value
    };
    
    chrome.storage.local.set(settings, function() {
        // Notify content script of settings change
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'settings-updated',
                settings: settings
            });
        });
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
    loadSettings();
    
    // Add event listeners for settings changes
    document.getElementById('auto-topic').addEventListener('change', saveSettings);
    document.getElementById('topic-position').addEventListener('change', saveSettings);
}); 