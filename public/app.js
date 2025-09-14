/**
 * Hebrew Chat Widget - Frontend Application
 * Handles chat functionality, API communication, and UI interactions
 */

class HebrewChatWidget {
    constructor() {
        this.API_BASE = '';
        this.sessionId = this.generateSessionId();
        this.messages = [];
        this.isProcessing = false;
        
        // DOM elements
        this.elements = {
            startChatBtn: document.getElementById('startChatBtn'),
            chatContainer: document.getElementById('chatContainer'),
            chatMessages: document.getElementById('chatMessages'),
            chatForm: document.getElementById('chatForm'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorToast: document.getElementById('errorToast'),
            errorMessage: document.getElementById('errorMessage'),
            errorClose: document.getElementById('errorClose')
        };
        
        this.init();
    }
    
    /**
     * Initialize the chat widget
     */
    init() {
        this.bindEvents();
        this.loadMessagesFromStorage();
        this.updateUI();
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Start chat button
        this.elements.startChatBtn.addEventListener('click', () => {
            this.focusInput();
        });
        
        // Chat form submission
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });
        
        // Input field events
        this.elements.messageInput.addEventListener('input', () => {
            this.updateSendButton();
        });
        
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
            
            if (e.key === 'Escape') {
                this.elements.messageInput.blur();
            }
        });
        
        // Error toast close
        this.elements.errorClose.addEventListener('click', () => {
            this.hideError();
        });
        
        // Auto-hide error toast after 5 seconds
        let errorTimeout;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const errorToast = mutation.target;
                    if (errorToast.style.display !== 'none') {
                        clearTimeout(errorTimeout);
                        errorTimeout = setTimeout(() => {
                            this.hideError();
                        }, 5000);
                    }
                }
            });
        });
        observer.observe(this.elements.errorToast, { attributes: true });
    }
    
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Focus the input field and scroll to chat
     */
    focusInput() {
        this.elements.messageInput.focus();
        this.elements.chatContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
    
    /**
     * Handle sending a message
     */
    async handleSendMessage() {
        const text = this.elements.messageInput.value.trim();
        
        if (!text || this.isProcessing) {
            return;
        }
        
        // Clear input and disable form
        this.elements.messageInput.value = '';
        this.setProcessing(true);
        
        try {
            // Add user message
            this.addMessage('user', text);
            
            // Show loading indicator
            this.showLoading();
            
            // Send to API
            const response = await this.sendToAPI(text);
            
            // Hide loading and add assistant response
            this.hideLoading();
            this.addMessage('assistant', response.answer);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideLoading();
            this.showError(error.message || 'שגיאה בשליחת ההודעה. אנא נסו שוב.');
        } finally {
            this.setProcessing(false);
            this.elements.messageInput.focus();
        }
    }
    
    /**
     * Send message to API
     */
    async sendToAPI(query) {
        const response = await fetch(`${this.API_BASE}/api/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                sessionId: this.sessionId
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'שגיאה בשרת. אנא נסו שוב מאוחר יותר.';
            
            if (response.status === 429) {
                errorMessage = 'יותר מדי בקשות. אנא המתינו רגע ונסו שוב.';
            } else if (response.status === 503) {
                errorMessage = 'השירות אינו זמין כרגע. אנא נסו שוב מאוחר יותר.';
            } else if (response.status === 408) {
                errorMessage = 'הבקשה לקחה יותר מדי זמן. אנא נסו שוב.';
            } else if (errorData.error) {
                errorMessage = errorData.error;
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data.answer) {
            throw new Error('לא התקבלה תשובה מהשרת');
        }
        
        return data;
    }
    
    /**
     * Add a message to the chat
     */
    addMessage(role, text) {
        const message = { role, text, timestamp: Date.now() };
        this.messages.push(message);
        
        // Keep only last 20 messages in memory
        if (this.messages.length > 20) {
            this.messages = this.messages.slice(-20);
        }
        
        this.renderMessage(message);
        this.saveMessagesToStorage();
        this.scrollToBottom();
    }
    
    /**
     * Render a single message
     */
    renderMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}-message`;
        messageEl.setAttribute('data-timestamp', message.timestamp);
        
        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'message-bubble';
        bubbleEl.textContent = message.text;
        bubbleEl.setAttribute('dir', 'rtl');
        
        messageEl.appendChild(bubbleEl);
        this.elements.chatMessages.appendChild(messageEl);
    }
    
    /**
     * Show loading indicator
     */
    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }
    
    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        setTimeout(() => {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }, 100);
    }
    
    /**
     * Set processing state
     */
    setProcessing(processing) {
        this.isProcessing = processing;
        this.elements.sendButton.disabled = processing;
        this.elements.messageInput.disabled = processing;
        
        if (processing) {
            this.elements.sendButton.textContent = 'שולח...';
        } else {
            this.elements.sendButton.textContent = 'שליחה';
        }
        
        this.updateSendButton();
    }
    
    /**
     * Update send button state
     */
    updateSendButton() {
        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendButton.disabled = this.isProcessing || !hasText;
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorToast.style.display = 'block';
    }
    
    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorToast.style.display = 'none';
    }
    
    /**
     * Save messages to session storage
     */
    saveMessagesToStorage() {
        try {
            const storageData = {
                sessionId: this.sessionId,
                messages: this.messages.slice(-10), // Keep last 10 messages only
                timestamp: Date.now()
            };
            sessionStorage.setItem('hebrewChatWidget', JSON.stringify(storageData));
        } catch (error) {
            console.warn('Failed to save messages to storage:', error);
        }
    }
    
    /**
     * Load messages from session storage
     */
    loadMessagesFromStorage() {
        try {
            const stored = sessionStorage.getItem('hebrewChatWidget');
            if (!stored) return;
            
            const data = JSON.parse(stored);
            
            // Only load if session is less than 1 hour old
            if (Date.now() - data.timestamp > 3600000) {
                sessionStorage.removeItem('hebrewChatWidget');
                return;
            }
            
            if (data.sessionId) {
                this.sessionId = data.sessionId;
            }
            
            if (data.messages && Array.isArray(data.messages)) {
                // Clear example messages first
                this.clearExampleMessages();
                
                // Render stored messages
                data.messages.forEach(message => {
                    this.renderMessage(message);
                });
                
                this.messages = data.messages;
                this.scrollToBottom();
            }
            
        } catch (error) {
            console.warn('Failed to load messages from storage:', error);
            sessionStorage.removeItem('hebrewChatWidget');
        }
    }
    
    /**
     * Clear example messages from DOM
     */
    clearExampleMessages() {
        const exampleMessages = this.elements.chatMessages.querySelectorAll('.message');
        exampleMessages.forEach(msg => {
            if (!msg.hasAttribute('data-timestamp')) {
                msg.remove();
            }
        });
    }
    
    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateSendButton();
        
        // Add keyboard navigation hints for screen readers
        this.elements.messageInput.setAttribute('aria-describedby', 'input-hint');
        
        // Add screen reader support
        this.elements.chatMessages.setAttribute('role', 'log');
        this.elements.chatMessages.setAttribute('aria-live', 'polite');
        this.elements.chatMessages.setAttribute('aria-label', 'הודעות צ׳אט');
    }
}

// Initialize the chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hebrewChat = new HebrewChatWidget();
});

// Handle visibility change to pause/resume functionality
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - could pause timers if needed
        console.log('Chat widget paused');
    } else {
        // Page is visible - resume functionality
        console.log('Chat widget resumed');
    }
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.hebrewChat) {
        window.hebrewChat.showError('שגיאה לא צפויה. אנא רעננו את הדף ונסו שוב.');
    }
    event.preventDefault();
});

// Export for potential iframe parent communication
if (typeof window !== 'undefined') {
    window.HebrewChatWidget = HebrewChatWidget;
}