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
        this.isListening = false;
        
        // Speech Recognition
        this.recognition = null;
        this.initSpeechRecognition();
        
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
            errorClose: document.getElementById('errorClose'),
            circleHint: document.getElementById('circleHint')
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
     * Initialize Speech Recognition
     */
    initSpeechRecognition() {
        // Check for Speech Recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'he-IL'; // Hebrew language
        this.recognition.maxAlternatives = 1;
        
        // Event handlers
        this.recognition.onstart = () => {
            console.log('🎤 Voice recognition started');
            this.setListeningState(true);
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('🗣️ Voice input:', transcript);
            this.handleVoiceInput(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.setListeningState(false);
            
            let errorMessage = 'שגיאה בזיהוי קול. אנא נסו שוב.';
            
            if (event.error === 'not-allowed') {
                errorMessage = 'נדרשת הרשאה למיקרופון. אנא אפשרו גישה למיקרופון ונסו שוב.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'לא זוהה קול. אנא נסו שוב.';
            } else if (event.error === 'network') {
                errorMessage = 'שגיאת רשת. בדקו את החיבור לאינטרנט.';
            }
            
            this.showError(errorMessage);
        };
        
        this.recognition.onend = () => {
            console.log('🔇 Voice recognition ended');
            this.setListeningState(false);
        };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Start chat button - now starts voice recording
        this.elements.startChatBtn.addEventListener('click', () => {
            this.startVoiceRecording();
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
     * Start voice recording
     */
    startVoiceRecording() {
        if (!this.recognition) {
            this.showError('זיהוי קול אינו נתמך בדפדפן זה. אנא השתמשו בכתיבה.');
            this.focusInput();
            return;
        }
        
        if (this.isListening) {
            this.stopVoiceRecording();
            return;
        }
        
        if (this.isProcessing) {
            this.showError('מעבדים בקשה קודמת. אנא המתינו.');
            return;
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            this.showError('שגיאה בהתחלת זיהוי קול. אנא נסו שוב.');
        }
    }
    
    /**
     * Stop voice recording
     */
    stopVoiceRecording() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    /**
     * Handle voice input
     */
    async handleVoiceInput(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            this.showError('לא זוהה טקסט. אנא נסו שוב.');
            return;
        }
        
        console.log('📝 Processing voice transcript:', transcript);
        
        // Add user message and send to API
        await this.sendMessage(transcript.trim());
    }
    
    /**
     * Set listening state and update UI
     */
    setListeningState(listening) {
        this.isListening = listening;
        this.updateVoiceButtonUI();
    }
    
    /**
     * Update voice button UI based on state
     */
    updateVoiceButtonUI() {
        const button = this.elements.startChatBtn;
        const icon = button.querySelector('.chat-icon');
        const hint = this.elements.circleHint;
        
        if (this.isListening) {
            button.classList.add('listening');
            button.setAttribute('aria-label', 'הקלטה פעילה - לחצו לעצירה');
            
            // Update hint text
            if (hint) {
                hint.textContent = 'מקשיב... דברו עכשיו';
            }
            
            // Change to microphone icon while listening
            if (icon) {
                icon.innerHTML = `
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" fill="none"/>
                `;
            }
        } else {
            button.classList.remove('listening');
            button.setAttribute('aria-label', 'התחל צ׳אט קולי');
            
            // Update hint text
            if (hint) {
                hint.textContent = 'לחצו כדי לדבר איתי';
            }
            
            // Change back to chat icon
            if (icon) {
                icon.innerHTML = `
                    <path d="M8.5 19H8C4.13401 19 1 15.866 1 12C1 8.13401 4.13401 5 8 5H16C19.866 5 23 8.13401 23 12C23 15.866 19.866 19 16 19H15.5M8.5 19L12 22.5L15.5 19M8.5 19H15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="9" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="15" cy="12" r="1" fill="currentColor"/>
                `;
            }
        }
    }
    
    /**
     * Send message (unified method for text and voice input)
     */
    async sendMessage(text) {
        if (!text || this.isProcessing) {
            return;
        }
        
        // Set processing state
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
        }
    }
    
    /**
     * Handle sending a message from text input
     */
    async handleSendMessage() {
        const text = this.elements.messageInput.value.trim();
        
        if (!text) {
            return;
        }
        
        // Clear input
        this.elements.messageInput.value = '';
        
        // Send message using unified method
        await this.sendMessage(text);
        
        // Focus input for next message
        this.elements.messageInput.focus();
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