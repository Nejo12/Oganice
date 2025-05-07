// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
    // Initialize default settings
    chrome.storage.local.set({
        topics: [],
        messages: 0,
        autoTopic: 'enabled',
        topicPosition: 'right'
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'update-stats') {
        chrome.storage.local.get(['topics', 'messages'], function(result) {
            const updatedStats = {
                topics: result.topics || [],
                messages: (result.messages || 0) + 1
            };
            
            chrome.storage.local.set(updatedStats, function() {
                sendResponse({success: true});
            });
        });
        return true; // Required for async response
    }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(function(details) {
    console.log('Extension update available:', details);
    chrome.runtime.reload();
}); 