/**
 * Hebrew Chat Widget - Frontend Application (Text-Only)
 * Handles chat functionality, API communication, and UI interactions
 */

class HebrewChatWidget {
    constructor() {
        this.API_BASE = '';
        this.sessionId = this.generateSessionId();
        this.messages = [];
        this.isProcessing = false;
        this.isListening = false;
        this.isInConversation = false; // Track if we're in active conversation mode
        this.isVoiceInputRecording = false; // Track voice recording for text input
        this.currentVoiceTranscript = ''; // Store current voice transcript
        
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
            voiceInputButton: document.getElementById('voiceInputButton'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorToast: document.getElementById('errorToast'),
            errorMessage: document.getElementById('errorMessage'),
            errorClose: document.getElementById('errorClose'),
            circleHint: document.getElementById('circleHint')
        };
        
        this.init();
    }
    
    /**
     * Initialize Speech Recognition
     */
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;  // Keep listening until stopped
        this.recognition.interimResults = false;
        this.recognition.lang = 'he-IL';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            console.log('🎤 Voice recording started');
            if (this.isVoiceInputRecording) {
                console.log('🎯 Voice input mode: Listening for text input...');
            } else {
                console.log('💬 Conversation mode: Listening for voice chat...');
            }
            this.setListeningState(true);
        };
        
        this.recognition.onresult = (event) => {
            // Get the latest result
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript;
            console.log('🗣️ Voice transcript:', transcript);
            
            // For voice input mode, accumulate the text but don't send yet
            if (this.isVoiceInputRecording) {
                // Store the current transcript for when user stops recording
                this.currentVoiceTranscript = transcript;
                console.log('📝 Current transcript stored:', transcript);
            } else {
                // For conversation mode, handle immediately
                this.handleVoiceInput(transcript);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.setListeningState(false);
            
            // Don't show error for 'aborted' - this happens when user manually stops
            if (event.error === 'aborted') {
                console.log('Speech recognition was manually stopped');
                // Handle context-specific cleanup for aborted without showing error
                if (this.isVoiceInputRecording) {
                    this.isVoiceInputRecording = false;
                    this.updateVoiceInputButtonUI();
                }
                return;
            }
            
            // Handle context-specific cleanup for real errors
            if (this.isVoiceInputRecording) {
                this.isVoiceInputRecording = false;
                this.updateVoiceInputButtonUI();
            }
            
            let errorMessage = 'שגיאה בזיהוי קול. אנא נסו שוב.';
            if (event.error === 'not-allowed') {
                errorMessage = 'נדרשת הרשאה למיקרופון. אנא אפשרו גישה למיקרופון ונסו שוב.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'לא זוהה קול. אנא נסו שוב.';
            }
            
            this.showError(errorMessage);
        };
        
        this.recognition.onend = () => {
            console.log('🔇 Voice recording ended');
            this.setListeningState(false);
            
            // Handle context-specific cleanup
            if (this.isVoiceInputRecording) {
                this.stopVoiceInputRecording();
            }
        };
    }

    /**
     * Initialize the chat widget
     */
    init() {
        console.log('Hebrew Chat Widget initializing...');
        console.log('Elements found:', {
            startChatBtn: !!this.elements.startChatBtn,
            chatContainer: !!this.elements.chatContainer,
            messageInput: !!this.elements.messageInput
        });
        this.bindEvents();
        this.loadMessagesFromStorage();
        this.updateUI();
        this.initializeVoices();
        console.log('Hebrew Chat Widget initialized successfully');
    }
    
    /**
     * Initialize and load available voices for Hebrew TTS
     */
    initializeVoices() {
        if (!window.speechSynthesis) return;
        
        // Load voices and wait for them to be available
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log('🎤 Available voices:', voices.length);
            
            const hebrewVoices = voices.filter(voice => 
                voice.lang.startsWith('he') || 
                voice.lang.includes('IL') || 
                voice.name.toLowerCase().includes('hebrew')
            );
            
            console.log('🇮🇱 Hebrew voices found:', hebrewVoices.map(v => `${v.name} (${v.lang})`));
            
            if (hebrewVoices.length === 0) {
                console.warn('⚠️ No Hebrew voices available - will use default voice with Hebrew language setting');
            }
        };
        
        // Load voices immediately if available
        loadVoices();
        
        // Also listen for voice loading event (some browsers need this)
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Start chat button - toggle voice recording
        this.elements.startChatBtn.addEventListener('click', () => {
            console.log('Circle button clicked - toggling voice recording');
            this.toggleVoiceRecording();
        });
        
        // Chat form submission
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendMessage();
        });
        
        // Voice input button - record to text input
        this.elements.voiceInputButton.addEventListener('click', () => {
            console.log('Voice input button clicked');
            this.toggleVoiceInputRecording();
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
     * Toggle voice recording on/off
     */
    toggleVoiceRecording() {
        if (this.isInConversation) {
            // In call status - click to exit
            this.endConversationMode();
        } else {
            // Normal status - click to start call
            this.startConversationMode();
        }
    }
    
    /**
     * Start conversation mode (persistent call status)
     */
    startConversationMode() {
        console.log('🎯 Starting conversation mode');
        this.isInConversation = true;
        this.startVoiceRecording();
    }
    
    /**
     * End conversation mode (return to normal)
     */
    endConversationMode() {
        console.log('🔚 Ending conversation mode');
        this.isInConversation = false;
        
        // Properly stop voice recording without errors
        if (this.recognition && this.isListening) {
            try {
                this.recognition.abort(); // Use abort() instead of stop() for immediate termination
            } catch (error) {
                console.log('Recognition already stopped');
            }
        }
        
        this.setListeningState(false);
        this.updateButtonUI();
    }
    
    /**
     * Start voice recording
     */
    startVoiceRecording() {
        if (!this.recognition) {
            this.showError('זיהוי קול אינו נתמך בדפדפן זה. אנא השתמשו בכתיבה.');
            return;
        }
        
        if (this.isProcessing) {
            this.showError('מעבדים בקשה קודמת. אנא המתינו.');
            return;
        }
        
        try {
            console.log('🎤 Starting voice recording...');
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recording:', error);
            this.showError('שגיאה בהתחלת זיהוי קול. אנא נסו שוב.');
        }
    }
    
    /**
     * Stop voice recording
     */
    stopVoiceRecording() {
        if (this.recognition && this.isListening) {
            console.log('🔴 Stopping voice recording...');
            this.recognition.stop();
        }
    }
    
    /**
     * Handle voice input result
     */
    async handleVoiceInput(transcript) {
        if (!transcript || transcript.trim().length === 0) {
            this.showError('לא זוהה טקסט. אנא נסו שוב.');
            // Stay in conversation mode, ready for next attempt
            if (this.isInConversation) {
                setTimeout(() => this.startVoiceRecording(), 1000);
            }
            return;
        }
        
        console.log('📝 Processing voice transcript:', transcript);
        
        // Add the transcribed text as user message and send to API
        await this.sendMessage(transcript.trim());
        
        // After processing response, automatically start listening for next question
        if (this.isInConversation && !this.isProcessing) {
            console.log('🔄 Ready for next question - starting voice recording');
            setTimeout(() => {
                if (this.isInConversation && !this.isListening) {
                    this.startVoiceRecording();
                }
            }, 1500); // Brief pause after response
        }
    }
    
    /**
     * Handle voice input result for text field - send message directly
     */
    async handleVoiceInputForTextField(transcript) {
        console.log('🎯 handleVoiceInputForTextField called with:', transcript);
        
        if (!transcript || transcript.trim().length === 0) {
            console.log('❌ Empty transcript received');
            this.showError('לא זוהה טקסט. אנא נסו שוב.');
            return;
        }
        
        console.log('📝 Sending voice message directly:', transcript);
        
        // Stop voice input recording first
        this.stopVoiceInputRecording();
        
        // Send the message directly to the API (like conversation mode)
        await this.sendMessage(transcript.trim());
    }
    
    /**
     * Set listening state and update button UI
     */
    setListeningState(listening) {
        this.isListening = listening;
        this.updateButtonUI();
    }
    
    /**
     * Toggle voice input recording for the text input field
     */
    toggleVoiceInputRecording() {
        if (this.isVoiceInputRecording) {
            this.stopVoiceInputRecording();
        } else {
            this.startVoiceInputRecording();
        }
    }
    
    /**
     * Start voice input recording to fill the text input
     */
    startVoiceInputRecording() {
        if (!this.recognition) {
            this.showError('זיהוי קול אינו נתמך בדפדפן זה. אנא השתמשו בכתיבה.');
            return;
        }
        
        if (this.isProcessing) {
            this.showError('מעבדים בקשה קודמת. אנא המתינו.');
            return;
        }
        
        // Stop any existing recognition
        if (this.isListening || this.isInConversation) {
            this.endConversationMode();
        }
        
        try {
            console.log('🎤 Starting voice input recording...');
            console.log('🔧 Recognition state:', {
                lang: this.recognition.lang,
                continuous: this.recognition.continuous,
                interimResults: this.recognition.interimResults
            });
            
            // Clear any previous transcript
            this.currentVoiceTranscript = '';
            
            this.isVoiceInputRecording = true;
            this.updateVoiceInputButtonUI();
            
            // Start recognition - it will use the context-aware global handlers
            this.recognition.start();
            console.log('✅ Recognition.start() called successfully');
        } catch (error) {
            console.error('Error starting voice input recording:', error);
            this.showError('שגיאה בהתחלת זיהוי קול. אנא נסו שוב.');
            this.stopVoiceInputRecording();
        }
    }
    
    /**
     * Stop voice input recording
     */
    async stopVoiceInputRecording() {
        if (this.recognition && this.isVoiceInputRecording) {
            console.log('🔴 Stopping voice input recording...');
            
            // Set state first to prevent error handler from calling this again
            this.isVoiceInputRecording = false;
            this.updateVoiceInputButtonUI();
            
            try {
                this.recognition.stop(); // Use stop() instead of abort() to get final results
            } catch (error) {
                console.log('Recognition already stopped');
            }
            
            // Send the accumulated transcript if we have one
            if (this.currentVoiceTranscript && this.currentVoiceTranscript.trim().length > 0) {
                console.log('📤 Sending accumulated transcript:', this.currentVoiceTranscript);
                await this.sendMessage(this.currentVoiceTranscript.trim());
                this.currentVoiceTranscript = ''; // Clear the transcript
            } else {
                console.log('🔇 No speech detected during recording - this is normal');
                // Don't show error message for voice input recording - user might just want to stop without speaking
            }
        } else {
            // Just update state if recognition is not running
            this.isVoiceInputRecording = false;
            this.updateVoiceInputButtonUI();
        }
    }
    
    /**
     * Update voice input button UI based on recording state
     */
    updateVoiceInputButtonUI() {
        const button = this.elements.voiceInputButton;
        
        if (this.isVoiceInputRecording) {
            button.classList.add('recording');
            button.setAttribute('aria-label', 'הפסקת הקלטה');
            button.setAttribute('title', 'לחצו להפסיק הקלטה');
        } else {
            button.classList.remove('recording');
            button.setAttribute('aria-label', 'הקלטה קולית');
            button.setAttribute('title', 'לחצו להקלטת שאלה קולית');
        }
    }
    
    /**
     * Update button appearance based on state
     */
    updateButtonUI() {
        const button = this.elements.startChatBtn;
        const icon = button.querySelector('.chat-icon');
        const hint = this.elements.circleHint;
        
        if (this.isInConversation) {
            // Show call status (red/orange - in conversation mode)
            button.classList.add('in-conversation');
            button.classList.remove('listening');
            button.setAttribute('aria-label', 'במצב שיחה - לחצו לסיום');
            
            if (hint) {
                hint.textContent = 'במצב שיחה - לחצו לסיום';
            }
            
            // Show phone icon for call status
            if (icon) {
                icon.innerHTML = `
                    <path d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z" fill="currentColor"/>
                `;
            }
        } else {
            // Show normal status (blue)
            button.classList.remove('listening', 'in-conversation');
            button.setAttribute('aria-label', 'התחל שיחה קולית');
            
            if (hint) {
                hint.textContent = 'לחצו כדי לדבר איתי';
            }
            
            // Show chat icon for normal status
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
     * Handle sending a message from text input
     */
    async handleSendMessage() {
        const text = this.elements.messageInput.value.trim();
        
        if (!text) {
            return;
        }
        
        if (text.length > 500) {
            this.showError('ההודעה ארוכה מדי (מקסימום 500 תווים)');
            return;
        }
        
        // Clear input
        this.elements.messageInput.value = '';
        this.updateSendButton();
        
        // Send message
        await this.sendMessage(text);
        
        // Focus input for next message
        this.elements.messageInput.focus();
    }
    
    /**
     * Send message to API and handle response
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
            console.log('📨 Full API Response:', response);
            console.log('🎵 VoiceUrl from API:', response.voiceUrl);
            
            // Hide loading and add assistant response
            this.hideLoading();
            this.addMessage('assistant', response.answer, response.voiceUrl);
            
            // Play voice response (tries voiceUrl first, falls back to text-to-speech)
            console.log('🎵 Conversation mode status:', this.isInConversation);
            console.log('🎵 Voice URL from API:', response.voiceUrl);
            console.log('🎵 Attempting to play voice...');
            this.playVoiceResponse(response.voiceUrl, response.answer);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideLoading();
            this.showError(error.message || 'שגיאה בשליחת ההודעה. אנא נסו שוב.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    /**
     * Send message to API
     */
    async sendToAPI(query, retryCount = 0) {
        try {
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
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('🔍 API Response:', result);
            return result;
        } catch (error) {
            // Retry on network errors (server restart, etc.)
            if (retryCount < 2 && (error.name === 'TypeError' || error.message.includes('Load failed'))) {
                console.log(`🔄 Network error, retrying... (${retryCount + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                return this.sendToAPI(query, retryCount + 1);
            }
            throw error;
        }
    }
    
    
    /**
     * Add a message to the chat
     */
    addMessage(role, text, voiceUrl = null) {
        console.log(`📝 Adding ${role} message:`, { text: text?.substring(0, 50), voiceUrl });
        const message = { role, text, voiceUrl, timestamp: Date.now() };
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
        bubbleEl.setAttribute('dir', 'rtl');
        
        // Create text content
        const textEl = document.createElement('span');
        textEl.textContent = message.text;
        bubbleEl.appendChild(textEl);
        
        // Add speaker button for assistant messages
        if (message.role === 'assistant') {
            console.log('🔘 Adding speaker button for message:', message.text.substring(0, 50));
            
            const speakerBtn = document.createElement('button');
            speakerBtn.className = 'speaker-button';
            speakerBtn.setAttribute('aria-label', 'השמע הודעה');
            speakerBtn.setAttribute('title', 'לחצו להשמעת ההודעה');
            speakerBtn.style.cssText = 'background: white !important; width: 32px !important; height: 32px !important; border-radius: 50% !important; border: 2px solid #333 !important; flex-shrink: 0 !important; color: #333 !important; cursor: pointer !important;';
            speakerBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- Speaker base -->
                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
                    <!-- Sound waves -->
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M18.36 5.64a9 9 0 0 1 0 12.73" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            `;
            
            // Add click handler using the same approach as the working example
            const text = message.text;
            speakerBtn.onclick = function(e) {
                e.stopPropagation();
                console.log('🔊 Speaker button clicked:', text.substring(0, 50));

                // Use the same simple approach as the working example message
                if (window.hebrewChat) {
                    // Use voiceUrl if available, otherwise pass null for TTS fallback
                    window.hebrewChat.playVoiceResponse(message.voiceUrl || null, text);
                }
            };
            
            bubbleEl.appendChild(speakerBtn);
            console.log('✅ Speaker button and click handler added to bubble');
        }
        
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
     * Play voice response from URL or fallback to text-to-speech
     * Simplified version based on working example
     */
    playVoiceResponse(voiceUrl, text) {
        console.log('🔊 playVoiceResponse called with:', { voiceUrl, text: text?.substring(0, 50) });

        if (voiceUrl) {
            // Simple audio playback like the working example
            try {
                console.log(`🎵 Playing audio file: ${voiceUrl}`);
                const audio = new Audio(voiceUrl);
                audio.volume = 1.0;

                audio.play().catch(error => {
                    console.warn('🎵 Audio play failed, using TTS:', error);
                    this.speakText(text);
                });

            } catch (error) {
                console.warn('🎵 Error with audio, using TTS:', error);
                this.speakText(text);
            }
        } else {
            // No voice URL, use text-to-speech
            console.log('🎵 No voiceUrl, using TTS');
            this.speakText(text);
        }
    }

    /**
     * Use browser text-to-speech to speak text in Hebrew
     */
    speakText(text) {
        console.log('🎤 speakText called with:', text?.substring(0, 50));
        if (!text || !window.speechSynthesis) {
            console.log('🎤 No text or speechSynthesis not available');
            return;
        }

        try {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Add error handling for speech synthesis
            utterance.onerror = (event) => {
                console.warn('🎤 Text-to-speech error:', event.error);
                if (event.error === 'not-allowed') {
                    this.showError('נדרש אישור להשמעת קול. אנא אפשרו השמעת קול בדפדפן ונסו שוב.');
                }
            };
            
            // Try to find and use a Hebrew voice
            const voices = window.speechSynthesis.getVoices();
            console.log(`🎤 Total voices available: ${voices.length}`);
            
            const hebrewVoice = voices.find(voice => 
                voice.lang.startsWith('he') || 
                voice.lang.includes('IL') || 
                voice.name.toLowerCase().includes('hebrew')
            );
            
            // If no Hebrew voice, try to find any RTL or middle-eastern voice
            const alternativeVoice = !hebrewVoice ? voices.find(voice => 
                voice.lang.includes('ar') || // Arabic voices sometimes work better for Hebrew
                voice.lang.includes('TR') || // Turkish
                voice.name.toLowerCase().includes('middle') ||
                voice.name.toLowerCase().includes('east')
            ) : null;
            
            if (hebrewVoice) {
                utterance.voice = hebrewVoice;
                console.log(`🗣️ Using Hebrew voice: ${hebrewVoice.name} (${hebrewVoice.lang})`);
            } else if (alternativeVoice) {
                utterance.voice = alternativeVoice;
                console.log(`🗣️ Using alternative RTL voice: ${alternativeVoice.name} (${alternativeVoice.lang})`);
            } else {
                console.log(`⚠️ No Hebrew or RTL voice found, using default with he-IL lang`);
                console.log(`Available voices: ${voices.slice(0, 3).map(v => `${v.name}(${v.lang})`).join(', ')}...`);
            }
            
            utterance.lang = 'he-IL'; // Hebrew language
            utterance.rate = 0.8; // Slower for Hebrew clarity
            utterance.pitch = 1;
            utterance.volume = 1;
            
            console.log(`🗣️ Speaking text: ${text.substring(0, 50)}...`);
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('Text-to-speech failed:', error);
        }
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
    console.log('DOM Content Loaded - initializing Hebrew Chat Widget');
    try {
        window.hebrewChat = new HebrewChatWidget();
        console.log('Hebrew Chat Widget created successfully');
    } catch (error) {
        console.error('Error creating Hebrew Chat Widget:', error);
    }
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