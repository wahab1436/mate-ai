class MateAI {
    constructor() {
        this.currentSession = this.generateSessionId();
        this.sessions = {};
        this.isProcessing = false;
        this.currentMenuSessionId = null;
        this.initializeElements();
        this.attachEventListeners();
        this.loadSessions();
        this.updateCharCount();
    }

    initializeElements() {
        this.elements = {
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            messagesContainer: document.getElementById('messagesContainer'),
            newChatBtn: document.getElementById('newChatBtn'),
            chatList: document.getElementById('chatList'),
            statusIndicator: document.getElementById('statusIndicator'),
            charCount: document.getElementById('charCount'),
            errorModal: document.getElementById('errorModal'),
            errorMessage: document.getElementById('errorMessage'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            sidebar: document.getElementById('sidebar'),
            openSidebarBtn: document.getElementById('openSidebarBtn'),
            closeSidebarBtn: document.getElementById('closeSidebarBtn'),
            chatOptionsMenu: document.getElementById('chatOptionsMenu'),
            deleteChatBtn: document.getElementById('deleteChatBtn')
        };
    }

    attachEventListeners() {
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // New chat
        this.elements.newChatBtn.addEventListener('click', () => this.newChat());

        // Character count
        this.elements.messageInput.addEventListener('input', () => this.updateCharCount());

        // Modal
        this.elements.closeModalBtn.addEventListener('click', () => this.hideErrorModal());
        this.elements.errorModal.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) {
                this.hideErrorModal();
            }
        });

        // Sidebar toggle
        this.elements.openSidebarBtn?.addEventListener('click', () => this.openSidebar());
        this.elements.closeSidebarBtn?.addEventListener('click', () => this.closeSidebar());

        // Delete chat
        this.elements.deleteChatBtn.addEventListener('click', () => this.deleteChat());

        // Close context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.chat-menu-btn')) {
                this.hideContextMenu();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.elements.errorModal.classList.contains('active')) {
                    this.hideErrorModal();
                }
                this.hideContextMenu();
            }
        });
    }

    openSidebar() {
        this.elements.sidebar.classList.add('open');
    }

    closeSidebar() {
        this.elements.sidebar.classList.remove('open');
    }

    showContextMenu(event, sessionId) {
        event.preventDefault();
        event.stopPropagation();
        
        this.currentMenuSessionId = sessionId;
        const menu = this.elements.chatOptionsMenu;
        
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;
        menu.classList.add('active');
    }

    hideContextMenu() {
        this.elements.chatOptionsMenu.classList.remove('active');
        this.currentMenuSessionId = null;
    }

    deleteChat() {
        if (!this.currentMenuSessionId) return;
        
        if (confirm('Delete this conversation?')) {
            delete this.sessions[this.currentMenuSessionId];
            
            if (this.currentMenuSessionId === this.currentSession) {
                this.newChat();
            }
            
            this.saveSessions();
            this.updateChatList();
        }
        
        this.hideContextMenu();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    newChat() {
        if (this.isProcessing) {
            this.showError('Please wait for the current response to complete.');
            return;
        }

        this.currentSession = this.generateSessionId();
        this.sessions[this.currentSession] = [];
        this.clearChatArea();
        this.saveSessions();
        this.updateChatList();
        this.updateStatus('Ready');
    }

    clearChatArea() {
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>Hey there! ??</h3>
                <p>I'm Mate, your AI companion. Think of me as a helpful friend who's always here for you.</p>
                <p>What's on your mind today?</p>
            </div>
        `;
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();

        if (!message) {
            this.showError('Please enter a message.');
            return;
        }

        if (this.isProcessing) {
            this.showError('Please wait for the current response to complete.');
            return;
        }

        if (message.length > 1000) {
            this.showError('Message exceeds maximum length of 1000 characters.');
            return;
        }

        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.updateCharCount();

        this.showLoadingIndicator();
        this.isProcessing = true;
        this.updateStatus('Responding...');
        this.elements.sendBtn.disabled = true;
        this.elements.messageInput.disabled = true;

        try {
            const response = await this.callAPI(message);

            if (response.status === 'success') {
                this.addMessage(response.response, 'ai');
                this.saveMessageToSession(message, response.response);
                this.updateStatus('Ready');
            } else {
                throw new Error(response.error || 'Unknown error');
            }
        } catch (error) {
            console.error('API Error:', error);
            this.addErrorMessage();
            this.updateStatus('Error');
            this.showError('Failed to get response. Please try again.');
        } finally {
            this.removeLoadingIndicator();
            this.isProcessing = false;
            this.elements.sendBtn.disabled = false;
            this.elements.messageInput.disabled = false;
            this.elements.messageInput.focus();
        }
    }

    async callAPI(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message, 
                history: this.getConversationHistory() 
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a minute.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    getConversationHistory() {
        if (!this.sessions[this.currentSession]) {
            return [];
        }
        return this.sessions[this.currentSession].slice(-10);
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="sender">${sender === 'user' ? 'You' : 'Mate'}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;

        const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addErrorMessage() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message ai error';
        errorDiv.innerHTML = `
            <div class="message-header">
                <span class="sender">Mate</span>
            </div>
            <div class="message-content">
                I'm experiencing technical difficulties. Please try again shortly.
            </div>
        `;
        this.elements.messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai loading';
        loadingDiv.id = 'loadingMessage';
        loadingDiv.innerHTML = `
            <div class="message-header">
                <span class="sender">Mate</span>
            </div>
            <div class="message-content">
                <div class="loading-indicator">
                    <div class="dot-flashing"></div>
                    Thinking...
                </div>
            </div>
        `;
        this.elements.messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    removeLoadingIndicator() {
        const loadingDiv = document.getElementById('loadingMessage');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    updateStatus(status) {
        this.elements.statusIndicator.textContent = status;
        this.elements.statusIndicator.className = 'status-indicator';

        if (status === 'Responding...') {
            this.elements.statusIndicator.classList.add('responding');
        } else if (status === 'Error') {
            this.elements.statusIndicator.classList.add('error');
        }
    }

    updateCharCount() {
        const count = this.elements.messageInput.value.length;
        this.elements.charCount.textContent = count;
    }

    saveMessageToSession(userMessage, aiResponse) {
        if (!this.sessions[this.currentSession]) {
            this.sessions[this.currentSession] = [];
        }

        this.sessions[this.currentSession].push({
            user: userMessage,
            ai: aiResponse,
            timestamp: Date.now()
        });

        this.saveSessions();
        this.updateChatList();
    }

    saveSessions() {
        try {
            const sessionsToSave = {};
            for (const [sessionId, messages] of Object.entries(this.sessions)) {
                if (messages.length > 0) {
                    sessionsToSave[sessionId] = messages.slice(-50);
                }
            }
            localStorage.setItem('mateai_sessions', JSON.stringify(sessionsToSave));
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    }

    loadSessions() {
        try {
            const saved = localStorage.getItem('mateai_sessions');
            if (saved) {
                this.sessions = JSON.parse(saved);
                this.updateChatList();
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.sessions = {};
        }
    }

    updateChatList() {
        this.elements.chatList.innerHTML = '';

        const sessionIds = Object.keys(this.sessions).reverse();

        if (sessionIds.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'chat-session empty';
            emptyItem.textContent = 'No conversations yet';
            this.elements.chatList.appendChild(emptyItem);
            return;
        }

        sessionIds.forEach(sessionId => {
            const messages = this.sessions[sessionId];
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];

                const sessionItem = document.createElement('li');
                sessionItem.className = `chat-session ${sessionId === this.currentSession ? 'active' : ''}`;

                const preview = lastMessage.user.substring(0, 30) + (lastMessage.user.length > 30 ? '...' : '');

                sessionItem.innerHTML = `
                    <div class="chat-session-content">
                        <div class="chat-preview">${this.escapeHtml(preview)}</div>
                    </div>
                    <button class="chat-menu-btn" title="Options">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                        </svg>
                    </button>
                `;

                const content = sessionItem.querySelector('.chat-session-content');
                const menuBtn = sessionItem.querySelector('.chat-menu-btn');

                content.addEventListener('click', () => this.loadSession(sessionId));
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showContextMenu(e, sessionId);
                });

                this.elements.chatList.appendChild(sessionItem);
            }
        });
    }

    loadSession(sessionId) {
        if (this.isProcessing) {
            this.showError('Please wait for the current response to complete.');
            return;
        }

        if (!this.sessions[sessionId]) {
            this.showError('Session not found.');
            return;
        }

        this.currentSession = sessionId;
        this.clearChatArea();

        const messages = this.sessions[sessionId];
        messages.forEach(msg => {
            this.addMessage(msg.user, 'user');
            this.addMessage(msg.ai, 'ai');
        });

        this.updateChatList();
        this.updateStatus('Ready');
        this.scrollToBottom();
        
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.add('active');
    }

    hideErrorModal() {
        this.elements.errorModal.classList.remove('active');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MateAI();
});
