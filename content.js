// Topic Manager UI Elements
let topicManagerContainer = null;
let topicList = null;
let isInitialized = false;

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
    topicManagerContainer.style.border = '2px solid #007bff'; // Make it more visible
    topicManagerContainer.style.backgroundColor = '#ffffff';

    // Create header
    const header = document.createElement('div');
    header.className = 'topic-manager-header';
    header.textContent = 'Topic Manager';
    header.style.padding = '10px';
    header.style.backgroundColor = '#007bff';
    header.style.color = 'white';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.fontWeight = 'bold';
    topicManagerContainer.appendChild(header);

    // Create topic list
    topicList = document.createElement('div');
    topicList.id = 'topic-list';
    topicList.className = 'topic-list';
    topicList.style.padding = '10px';
    topicList.style.maxHeight = '200px';
    topicList.style.overflowY = 'auto';

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.padding = '10px';
    inputContainer.style.borderTop = '1px solid #eee';

    // Create topic input
    const topicInput = document.createElement('input');
    topicInput.id = 'topic-input';
    topicInput.type = 'text';
    topicInput.placeholder = 'Enter topic name';
    topicInput.className = 'topic-input';
    topicInput.style.width = '100%';
    topicInput.style.marginBottom = '10px';
    topicInput.style.padding = '8px';
    topicInput.style.border = '1px solid #ddd';
    topicInput.style.borderRadius = '4px';

    // Create add topic button
    const addTopicButton = document.createElement('button');
    addTopicButton.id = 'add-topic';
    addTopicButton.textContent = '+ Add Topic';
    addTopicButton.className = 'add-topic-button';
    addTopicButton.style.width = '100%';
    addTopicButton.style.padding = '8px';
    addTopicButton.style.backgroundColor = '#007bff';
    addTopicButton.style.color = 'white';
    addTopicButton.style.border = 'none';
    addTopicButton.style.borderRadius = '4px';
    addTopicButton.style.cursor = 'pointer';

    // Append elements
    inputContainer.appendChild(topicInput);
    inputContainer.appendChild(addTopicButton);
    topicManagerContainer.appendChild(topicList);
    topicManagerContainer.appendChild(inputContainer);

    // Add to page
    container.appendChild(topicManagerContainer);
    console.log('Topic manager UI added to page');
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
    
    // Add current topics to select
    const topics = getTopics();
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic;
        option.textContent = topic;
        topicSelect.appendChild(option);
    });

    // Add to message
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