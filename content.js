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
    console.log('Initializing extension...');
    if (isInitialized) return;
    console.log('Initializing AI Chat Topic Manager...');
    
    // Wait for the main chat container to be available
    const checkContainer = setInterval(() => {
        const chatContainer = document.querySelector('main') || 
                            document.querySelector('.flex.flex-col.items-center.text-sm') ||
                            document.querySelector('.overflow-hidden.w-full.h-full.relative.flex.z-0');
        
        if (chatContainer) {
            clearInterval(checkContainer);
            console.log('Found chat container:', chatContainer);
            createTopicManagerUI(chatContainer);
            setupEventListeners();
            loadSavedTopics();
            isInitialized = true;
        }
    }, 1000); // Check every second

    // Set a timeout to stop checking after 10 seconds
    setTimeout(() => {
        if (!isInitialized) {
            clearInterval(checkContainer);
            console.error('Could not find chat container after 10 seconds');
        }
    }, 10000);
}

// Create the topic manager UI
function createTopicManagerUI(container) {
    console.log('Creating topic manager UI...');
    
    // Remove existing container if it exists
    const existingContainer = document.getElementById('topic-manager-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create container
    topicManagerContainer = document.createElement('div');
    topicManagerContainer.id = 'topic-manager-container';
    topicManagerContainer.className = 'topic-manager';
    topicManagerContainer.style.position = 'fixed';
    topicManagerContainer.style.right = '20px';
    topicManagerContainer.style.top = '20px';
    topicManagerContainer.style.left = 'auto';
    topicManagerContainer.style.width = '320px';
    topicManagerContainer.style.background = '#23272f';
    topicManagerContainer.style.border = '1.5px solid #444';
    topicManagerContainer.style.borderRadius = '10px';
    topicManagerContainer.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
    topicManagerContainer.style.zIndex = '10000';
    topicManagerContainer.style.color = '#f3f3f3';
    topicManagerContainer.style.fontFamily = 'Inter, Arial, sans-serif';
    topicManagerContainer.style.transition = 'box-shadow 0.2s';

    // Header with drag handle and collapse button
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
    collapseBtn.style.background = 'none';
    collapseBtn.style.border = 'none';
    collapseBtn.style.color = '#fff';
    collapseBtn.style.fontSize = '18px';
    collapseBtn.style.cursor = 'pointer';
    collapseBtn.style.marginLeft = '10px';
    header.appendChild(collapseBtn);

    // Content area (everything except header)
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
    inputContainer.style.borderTop = '1px solid #333';
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
    topicInput.style.border = '1px solid #444';
    topicInput.style.borderRadius = '4px';
    topicInput.style.background = '#23272f';
    topicInput.style.color = '#f3f3f3';

    // Add topic button
    const addTopicButton = document.createElement('button');
    addTopicButton.id = 'add-topic';
    addTopicButton.textContent = '+ Add Topic';
    addTopicButton.className = 'add-topic-button';
    addTopicButton.style.width = '100%';
    addTopicButton.style.padding = '8px';
    addTopicButton.style.background = '#007bff';
    addTopicButton.style.color = 'white';
    addTopicButton.style.border = 'none';
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
    // Start expanded
    isCollapsed = false;
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Wait for the elements to be available
    const checkElements = setInterval(() => {
        const addTopicButton = document.getElementById('add-topic');
        const topicInput = document.getElementById('topic-input');
        
        if (addTopicButton && topicInput) {
            clearInterval(checkElements);
            console.log('Found add topic button and input');
            
            addTopicButton.addEventListener('click', () => {
                const topicName = topicInput.value.trim();
                if (topicName) {
                    console.log('Adding new topic:', topicName);
                    addTopic(topicName);
                    topicInput.value = '';
                }
            });
            
            // Listen for new messages
            setupMessageObserver();
        } else {
            console.log('Waiting for add topic button and input...');
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
                        console.log('New message detected, handling...');
                        handleNewMessage(node);
                    }
                });
            });
        });

        observer.observe(chatContainer, { 
            childList: true, 
            subtree: true 
        });
        console.log('Message observer set up');
    }
}

// Handle new messages
function handleNewMessage(node) {
    // Check if topic selector already exists
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

    // Restore saved topic for this message
    const messageId = getMessageId(node);
    const map = getMessageTopicMap();
    if (map[messageId]) {
        topicSelect.value = map[messageId];
    }

    topicSelect.addEventListener('change', () => {
        setMessageTopic(messageId, topicSelect.value);
    });

    node.appendChild(topicSelect);
    console.log('Topic selector added to message');
}

// Topic management functions
function addTopic(topicName) {
    console.log('Adding topic:', topicName);
    const topics = getTopics();
    if (!topics.includes(topicName)) {
        topics.push(topicName);
        saveTopics(topics);
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
    console.log('Updating topic list...');
    if (!topicList) return;
    topicList.innerHTML = '';
    const topics = getTopics();
    topics.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-item';
        topicElement.textContent = topic;
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.title = 'Delete topic';
        deleteBtn.onclick = () => {
            // Remove topic from topics and from all message associations
            const topicsArr = getTopics().filter(t => t !== topic);
            saveTopics(topicsArr);
            removeTopicFromMessages(topic);
            updateTopicList();
            // Optionally, update all topic selects in messages
            document.querySelectorAll('.topic-select').forEach(select => {
                const optionToRemove = Array.from(select.options).find(opt => opt.value === topic);
                if (optionToRemove) select.removeChild(optionToRemove);
                // If the removed topic was selected, clear selection
                if (select.value === topic) select.value = '';
            });
        };
        topicElement.appendChild(deleteBtn);
        topicList.appendChild(topicElement);
    });
}

function loadSavedTopics() {
    // Retrieve topics from localStorage
    const topics = getTopics();
    // Update the topic list UI
    updateTopicList();
    console.log('Loaded saved topics:', topics);
}

// Initialize when the page is loaded
console.log('AI Chat Topic Manager script loaded');
document.addEventListener('DOMContentLoaded', initializeExtension);

// Also initialize when the page is dynamically updated
const observer = new MutationObserver((mutations) => {
    if (!isInitialized) {
        initializeExtension();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Content script for AI Chat Topic Manager
console.log('AI Chat Topic Manager content script loaded');

// Function to safely get extension URL
function getExtensionUrl(path) {
  try {
    return chrome.runtime.getURL(path);
  } catch (error) {
    console.warn('Error getting extension URL:', error);
    return null;
  }
}

// Function to safely load React refresh
function loadReactRefresh() {
  try {
    const refreshUrl = getExtensionUrl('vendor/react-refresh.js');
    if (!refreshUrl) {
      console.warn('Could not get React refresh URL, skipping load');
      return;
    }

    const script = document.createElement('script');
    script.src = refreshUrl;
    script.onerror = (error) => {
      console.warn('React refresh script failed to load:', error);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.warn('Error loading React refresh:', error);
  }
}

// Function to create and inject the topic manager UI
function createTopicManager() {
  console.log('Creating topic manager UI...');
  
  // Create the main container
  const container = document.createElement('div');
  container.id = 'topic-manager-container';
  container.style.cssText = `
    position: fixed;
    right: 20px;
    top: 20px;
    width: 300px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
    color: #333;
  `;
  header.textContent = 'Topic Manager';
  container.appendChild(header);

  // Create topic list
  const topicList = document.createElement('div');
  topicList.id = 'topic-list';
  topicList.style.cssText = `
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 15px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 4px;
  `;
  container.appendChild(topicList);

  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    display: flex;
    gap: 10px;
  `;

  // Create topic input
  const topicInput = document.createElement('input');
  topicInput.type = 'text';
  topicInput.placeholder = 'Enter topic name';
  topicInput.style.cssText = `
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  `;
  inputContainer.appendChild(topicInput);

  // Create add button
  const addButton = document.createElement('button');
  addButton.textContent = 'Add Topic';
  addButton.style.cssText = `
    padding: 8px 15px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  inputContainer.appendChild(addButton);

  container.appendChild(inputContainer);

  // Add event listeners
  addButton.addEventListener('click', () => {
    const topicName = topicInput.value.trim();
    if (topicName) {
      console.log('Adding topic:', topicName);
      // Add topic logic here
      topicInput.value = '';
    }
  });

  return container;
}

// Function to initialize the topic manager
function initializeTopicManager() {
  console.log('Initializing topic manager...');
  
  // Find the chat container
  const chatContainer = document.querySelector('main');
  if (!chatContainer) {
    console.log('Chat container not found, retrying in 1 second...');
    setTimeout(initializeTopicManager, 1000);
    return;
  }

  console.log('Chat container found, injecting topic manager...');
  
  // Create and inject the topic manager
  const topicManager = createTopicManager();
  document.body.appendChild(topicManager);

  // Log UI elements for debugging
  console.log('Topic manager UI elements:', {
    container: document.getElementById('topic-manager-container'),
    input: document.querySelector('#topic-manager-container input'),
    button: document.querySelector('#topic-manager-container button'),
    list: document.getElementById('topic-list')
  });
}

// Start initialization
console.log('Starting topic manager initialization...');

// Check if we're in a valid extension context
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  console.log('Extension context valid, loading React refresh...');
  loadReactRefresh();
} else {
  console.warn('Not in a valid extension context, skipping React refresh');
}

// Initialize the topic manager
initializeTopicManager();

// Add error handling for module loading
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('chrome-extension://')) {
    console.warn('Extension resource loading error:', event.message);
    // Continue execution even if some resources fail to load
    return true;
  }
});

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
    // Use a unique identifier for each message node
    if (!node.dataset.topicMessageId) {
        node.dataset.topicMessageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    return node.dataset.topicMessageId;
}

// --- Draggable and Collapsible Panel ---
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