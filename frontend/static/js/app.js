class MateAI {
    constructor() {
        this.currentSession = this.generateSessionId();
        this.sessions = {};
        this.isProcessing = false;
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
            closeModalBtn: document.getElementById('closeModalBtn')
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

        // Modal close
        this.elements.closeModalBtn.addEventListener('click', () => this.hideErrorModal());

        // Click outside modal to close
        this.elements.errorModal.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) {
                this.hideErrorModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.errorModal.classList.contains('active')) {
                this.hideErrorModal();
            }
        });
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
                <h3>Welcome to Mate.AI</h3>
                <p>I'm here to assist with general conversation and information.</p>
                <p class="limitation-notice">
                    <strong>Note:</strong> I cannot assist with coding, technical problems, or provide specialized advice.
                </p>
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

        // Add user message to UI
        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.updateCharCount();

        // Show AI is responding
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
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a minute.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
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
                <span class="sender">${sender === 'user' ? 'You' : 'Mate.AI'}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;

        // Remove welcome message if present
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
                <span class="sender">Mate.AI</span>
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
                <span class="sender">Mate.AI</span>
            </div>
            <div class="message-content">
                <div class="loading-indicator">
                    <div class="dot-flashing"></div>
                    Processing your request...
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
        
        if (count > 900) {
            this.elements.charCount.style.color = 'var(--error-color)';
        } else if (count > 750) {
            this.elements.charCount.style.color = 'var(--warning-color)';
        } else {
            this.elements.charCount.style.color = '';
        }
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
                    sessionsToSave[sessionId] = messages.slice(-10); // Keep last 10 messages
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
        
        const sessionIds = Object.keys(this.sessions).reverse(); // Most recent first
        
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
                const date = new Date(lastMessage.timestamp);
                
                const sessionItem = document.createElement('li');
                sessionItem.className = `chat-session ${sessionId === this.currentSession ? 'active' : ''}`;
                sessionItem.dataset.sessionId = sessionId;
                
                const preview = lastMessage.user.substring(0, 30) + (lastMessage.user.length > 30 ? '...' : '');
                
                sessionItem.innerHTML = `
                    <div class="chat-preview">${this.escapeHtml(preview)}</div>
                    <div class="chat-date">${date.toLocaleDateString()}</div>
                `;
                
                sessionItem.addEventListener('click', () => this.loadSession(sessionId));
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
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideErrorModal() {
        this.elements.errorModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const mateAI = new MateAI();
    
    // Global error handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        mateAI.showError('An unexpected error occurred. Please refresh the page.');
    });
    
    // Focus input on load
    mateAI.elements.messageInput.focus();
});
