# AI Chat Topic Manager Extension

## Overview
AI Chat Topic Manager is a browser extension that enhances your ChatGPT experience by allowing you to manage, bookmark, and organize your conversations with custom topics and titles.

---

## Installation

1. **Clone or Download the Repository**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-directory>
   ```
2. **Load the Extension in Your Browser**
   - **Chrome/Edge:**
     1. Go to `chrome://extensions/` (or `edge://extensions/`).
     2. Enable "Developer mode" (top right).
     3. Click "Load unpacked" and select the extension directory.
   - **Firefox:**
     1. Go to `about:debugging#/runtime/this-firefox`.
     2. Click "Load Temporary Add-on" and select the `manifest.json` file from the extension directory.

---

## Usage Guidelines

- **Sidebar:**
  - Click the floating chat icon to open the sidebar.
  - The sidebar displays the current chat title (auto-detected or custom).
  - Add, edit, or delete topics to organize your conversations.
  - Bookmark important messages and assign them to topics.
  - Use the theme toggle to switch between light and dark modes.

- **Custom Titles:**
  - Double-click the chat title to edit and save a custom title for any conversation.
  - Custom titles always take precedence over auto-detected titles.

- **Bookmarks:**
  - Click the bookmark icon next to any user message to save it.
  - Assign bookmarks to topics for better organization.

- **Persistence:**
  - All topics, custom titles, and bookmarks are stored locally in your browser.

---

## Privacy

We respect your privacy. No data is sent to any server; all information is stored locally in your browser.

For more details, see our [Privacy Policy](privacy.html).

---

## Changelog

### v1.1.0
- Added support for multiple AI chat platforms (ChatGPT, Grok, x.ai)
- Improved sidebar observer for SPA navigation reliability
- Enhanced cross-browser compatibility
- Added persistent storage for better data retention
- Improved error handling and retry mechanisms
- Added settings management for auto-topic and sidebar position
- Enhanced bookmark management system
- Added statistics tracking for topics and messages

### v1.0.0
- Initial release: Sidebar with topic management, custom titles, and bookmarks.
- Robust chat change detection and title synchronization.
- Theme toggle and improved UI/UX.

---

## Support
For questions or issues, please open an issue on the repository or contact the maintainer. 