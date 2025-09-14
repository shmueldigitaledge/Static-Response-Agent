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
        this.isInCall = false;
        this.callState = 'idle'; // idle, connecting, live, ended
        
        // Speech Recognition for live calls
        this.recognition = null;
        this.initSpeechRecognition();
        
        // WebSocket for live conversation
        this.ws = null;
        this.mediaRecorder = null;
        this.audioContext = null;
        
        // Audio playback
        this.audioPlayer = new Audio();
        this.audioPlayer.preload = 'auto';
        
        // Speech processing
        this.silenceTimer = null;
        this.lastSpeechTime = 0;
        this.currentTranscript = '';
        this.lastProcessedTranscript = '';
        this.isCurrentlySpeaking = false;
        
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
            circleHint: document.getElementById('circleHint'),
            voiceControls: document.getElementById('voiceControls'),
            pushToTalkBtn: document.getElementById('pushToTalkBtn')
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
        // Start chat button - now starts live voice call
        this.elements.startChatBtn.addEventListener('click', () => {
            if (this.isInCall) {
                this.endLiveCall();
            } else {
                this.startLiveCall();
            }
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
        
        // Push-to-talk button events
        if (this.elements.pushToTalkBtn) {
            this.elements.pushToTalkBtn.addEventListener('mousedown', () => {
                this.startPushToTalk();
            });
            
            this.elements.pushToTalkBtn.addEventListener('mouseup', () => {
                this.stopPushToTalk();
            });
            
            this.elements.pushToTalkBtn.addEventListener('mouseleave', () => {
                this.stopPushToTalk();
            });
            
            // Touch events for mobile
            this.elements.pushToTalkBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startPushToTalk();
            });
            
            this.elements.pushToTalkBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopPushToTalk();
            });
        }
        
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
     * Start live voice call
     */
    async startLiveCall() {
        if (this.isInCall || this.isProcessing) {
            return;
        }
        
        try {
            console.log('🔵 Starting live voice call...');
            this.setCallState('connecting');
            
            // Request microphone permissions with enhanced audio processing
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true
                } 
            });
            
            // Initialize WebSocket connection
            await this.initWebSocket();
            
            // Start continuous speech recognition
            this.startContinuousRecognition();
            
            // Setup media recorder for audio streaming
            this.setupMediaRecorder(stream);
            
            this.setCallState('live');
            this.addSystemMessage('שיחה החלה - דברו בחופשיות');
            
            // Show voice controls
            if (this.elements.voiceControls) {
                this.elements.voiceControls.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error starting live call:', error);
            this.setCallState('idle');
            
            if (error.name === 'NotAllowedError') {
                this.showError('נדרשת הרשאה למיקרופון לביצוע שיחה קולית');
            } else if (error.name === 'NotFoundError') {
                this.showError('לא נמצא מיקרופון. אנא בדקו את ההתקן');
            } else {
                this.showError('שגיאה בהתחלת השיחה. אנא נסו שוב');
            }
        }
    }
    
    /**
     * End live voice call
     */
    endLiveCall() {
        console.log('🔴 Ending live voice call...');
        
        this.setCallState('ended');
        
        // Clean up speech processing
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        this.currentTranscript = '';
        this.lastProcessedTranscript = '';
        this.isCurrentlySpeaking = false;
        
        // Stop speech recognition
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Close WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        
        // Stop audio playback
        if (!this.audioPlayer.paused) {
            this.audioPlayer.pause();
        }
        
        // Hide voice controls
        if (this.elements.voiceControls) {
            this.elements.voiceControls.style.display = 'none';
        }
        
        this.setCallState('idle');
        this.addSystemMessage('השיחה הסתיימה');
    }
    
    /**
     * Initialize WebSocket connection for live conversation
     */
    async initWebSocket() {
        return new Promise((resolve, reject) => {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/realtime?lang=he&session=${this.sessionId}`;
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔗 WebSocket connected for live call');
                resolve();
            };
            
            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                if (this.isInCall) {
                    this.showError('חיבור הרשת נותק. אנא התחלו שיחה חדשה');
                    this.endLiveCall();
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(new Error('שגיאה בחיבור לשירות השיחה'));
            };
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('חיבור לשירות השיחה נכשל'));
                }
            }, 5000);
        });
    }
    
    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'transcript_partial':
                // Only show partial transcripts if they're substantial
                if (data.text && data.text.length > 2 && data.confidence > 0.5) {
                    this.updateLiveTranscript(data.text, false);
                }
                break;
                
            case 'transcript_final':
                // Only process final transcripts if they're substantial
                if (data.text && data.text.length > 2 && data.confidence > 0.4) {
                    this.updateLiveTranscript(data.text, true);
                }
                break;
                
            case 'response':
                this.handleLiveResponse(data);
                break;
                
            case 'connected':
                console.log('✅ WebSocket connected:', data.message);
                break;
                
            case 'error':
                console.error('WebSocket error:', data.message);
                this.showError(data.message || 'שגיאה בשירות השיחה');
                break;
        }
    }
    
    /**
     * Setup media recorder for audio streaming
     */
    setupMediaRecorder(stream) {
        const options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000
        };
        
        this.mediaRecorder = new MediaRecorder(stream, options);
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Send audio data to server
                this.ws.send(event.data);
            }
        };
        
        // Send audio chunks every 250ms for real-time processing
        this.mediaRecorder.start(250);
    }
    
    /**
     * Start continuous speech recognition for live transcription
     */
    startContinuousRecognition() {
        if (!this.recognition) return;
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        // Add silence detection
        this.silenceTimer = null;
        this.lastSpeechTime = 0;
        this.currentTranscript = '';
        this.isCurrentlySpeaking = false;
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript.trim();
                const confidence = result[0].confidence || 0.7;
                
                // Filter out very low confidence or very short transcripts (likely noise)
                if (transcript.length < 2 || confidence < 0.4) {
                    continue;
                }
                
                if (result.isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update last speech time
            if (interimTranscript || finalTranscript) {
                this.lastSpeechTime = Date.now();
                this.isCurrentlySpeaking = true;
                
                // Clear any existing silence timer
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
                
                // Set silence detection timer (2 seconds of silence)
                this.silenceTimer = setTimeout(() => {
                    this.handleSilenceDetected();
                }, 2000);
            }
            
            // Only show transcripts that are substantial enough
            if (interimTranscript && interimTranscript.length > 2) {
                this.currentTranscript = interimTranscript;
                this.updateLiveTranscript(interimTranscript, false);
            }
            
            if (finalTranscript && finalTranscript.length > 2) {
                this.currentTranscript = finalTranscript;
                this.updateLiveTranscript(finalTranscript, true);
                this.processFinalTranscript(finalTranscript);
            }
        };
        
        this.recognition.start();
    }
    
    /**
     * Handle silence detection - user stopped speaking
     */
    handleSilenceDetected() {
        console.log('🔇 Silence detected');
        this.isCurrentlySpeaking = false;
        
        // If we have a current transcript that hasn't been processed, process it now
        if (this.currentTranscript && this.currentTranscript.length > 3) {
            console.log('📝 Processing transcript after silence:', this.currentTranscript);
            this.processFinalTranscript(this.currentTranscript);
            this.currentTranscript = '';
        }
        
        // Clear silence timer
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    /**
     * Process final transcript and send to WebSocket
     */
    processFinalTranscript(transcript) {
        if (!transcript || transcript.length < 3) {
            return;
        }
        
        // Avoid processing the same transcript multiple times
        if (this.lastProcessedTranscript === transcript) {
            return;
        }
        
        this.lastProcessedTranscript = transcript;
        console.log('🎯 Processing final transcript:', transcript);
        
        // Send via WebSocket if available
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'final_transcript',
                text: transcript,
                sessionId: this.sessionId,
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * Start push-to-talk recording
     */
    startPushToTalk() {
        if (!this.isInCall || this.isCurrentlySpeaking) {
            return;
        }
        
        console.log('🎤 Push-to-talk started');
        this.isCurrentlySpeaking = true;
        
        // Visual feedback
        if (this.elements.pushToTalkBtn) {
            this.elements.pushToTalkBtn.classList.add('active');
        }
        
        // Clear any existing transcript
        this.currentTranscript = '';
        
        // Start recording if we have a media recorder
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }
        
        // Start speech recognition fresh
        if (this.recognition) {
            try {
                this.recognition.stop();
                setTimeout(() => {
                    if (this.isCurrentlySpeaking) {
                        this.recognition.start();
                    }
                }, 100);
            } catch (error) {
                console.error('Error restarting recognition:', error);
            }
        }
    }
    
    /**
     * Stop push-to-talk recording
     */
    stopPushToTalk() {
        if (!this.isCurrentlySpeaking) {
            return;
        }
        
        console.log('🔇 Push-to-talk stopped');
        
        // Visual feedback
        if (this.elements.pushToTalkBtn) {
            this.elements.pushToTalkBtn.classList.remove('active');
        }
        
        // Process any current transcript
        setTimeout(() => {
            if (this.currentTranscript && this.currentTranscript.length > 3) {
                this.processFinalTranscript(this.currentTranscript);
                this.currentTranscript = '';
            }
            this.isCurrentlySpeaking = false;
        }, 500);
    }
    
    /**
     * Update live transcript display
     */
    updateLiveTranscript(text, isFinal) {
        if (!text.trim()) return;
        
        // Find or create live transcript element
        let liveElement = document.getElementById('liveTranscript');
        
        if (!liveElement && !isFinal) {
            // Create live transcript element
            liveElement = document.createElement('div');
            liveElement.id = 'liveTranscript';
            liveElement.className = 'message user-message live-transcript';
            liveElement.innerHTML = `
                <div class="message-bubble live-bubble">
                    <span class="live-text">${text}</span>
                    <span class="live-indicator">🎤</span>
                </div>
            `;
            this.elements.chatMessages.appendChild(liveElement);
            this.scrollToBottom();
        } else if (liveElement && !isFinal) {
            // Update live transcript
            const liveText = liveElement.querySelector('.live-text');
            if (liveText) {
                liveText.textContent = text;
            }
        } else if (isFinal) {
            // Convert to final message
            if (liveElement) {
                liveElement.remove();
            }
            this.addMessage('user', text);
        }
    }
    
    /**
     * Handle live response from server
     */
    async handleLiveResponse(data) {
        try {
            // Add assistant text message
            this.addMessage('assistant', data.text);
            
            // Play pre-recorded audio if available
            if (data.audioUrl) {
                await this.playResponseAudio(data.audioUrl);
            }
            
        } catch (error) {
            console.error('Error handling live response:', error);
            this.showError('שגיאה בהשמעת התשובה');
        }
    }
    
    /**
     * Play pre-recorded response audio
     */
    async playResponseAudio(audioUrl) {
        try {
            this.audioPlayer.src = audioUrl;
            
            // Show audio playing indicator
            this.addSystemMessage('🔊 משמיע תשובה...');
            
            await new Promise((resolve, reject) => {
                this.audioPlayer.onloadeddata = resolve;
                this.audioPlayer.onerror = reject;
                this.audioPlayer.load();
            });
            
            await this.audioPlayer.play();
            
            this.audioPlayer.onended = () => {
                console.log('🔇 Audio playback finished');
                // Remove audio indicator
                this.removeLastSystemMessage();
            };
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showError('שגיאה בהשמעת התשובה הקולית');
        }
    }
    
    /**
     * Set call state and update UI
     */
    setCallState(state) {
        this.callState = state;
        this.isInCall = (state === 'connecting' || state === 'live');
        this.updateCallUI();
    }
    
    /**
     * Update UI based on call state
     */
    updateCallUI() {
        const button = this.elements.startChatBtn;
        const icon = button.querySelector('.chat-icon');
        const hint = this.elements.circleHint;
        
        button.classList.remove('listening', 'connecting', 'in-call');
        
        switch (this.callState) {
            case 'connecting':
                button.classList.add('connecting');
                button.setAttribute('aria-label', 'מתחבר לשיחה...');
                if (hint) hint.textContent = 'מתחבר...';
                if (icon) icon.innerHTML = `<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="25.13" stroke-dashoffset="25.13" class="connecting-spinner"/>`;
                break;
                
            case 'live':
                button.classList.add('in-call');
                button.setAttribute('aria-label', 'שיחה פעילה - לחצו לסיום');
                if (hint) hint.textContent = 'שיחה פעילה - לחצו לסיום';
                if (icon) icon.innerHTML = `<path d="M6 2L3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6l-3-4H6zm0 2h12l2 2v12H4V6l2-2z" fill="currentColor"/><path d="M8 10h8v2H8v-2zm0 4h8v2H8v-2z" fill="currentColor"/>`;
                break;
                
            case 'ended':
                if (hint) hint.textContent = 'השיחה הסתיימה';
                setTimeout(() => this.setCallState('idle'), 2000);
                break;
                
            default: // idle
                button.setAttribute('aria-label', 'התחל שיחה קולית');
                if (hint) hint.textContent = 'לחצו כדי לדבר איתי';
                if (icon) icon.innerHTML = `
                    <path d="M8.5 19H8C4.13401 19 1 15.866 1 12C1 8.13401 4.13401 5 8 5H16C19.866 5 23 8.13401 23 12C23 15.866 19.866 19 16 19H15.5M8.5 19L12 22.5L15.5 19M8.5 19H15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="9" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="15" cy="12" r="1" fill="currentColor"/>
                `;
        }
    }
    
    /**
     * Add system message to chat
     */
    addSystemMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message system-message';
        messageEl.innerHTML = `<div class="system-bubble">${text}</div>`;
        this.elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }
    
    /**
     * Remove last system message
     */
    removeLastSystemMessage() {
        const systemMessages = this.elements.chatMessages.querySelectorAll('.system-message');
        if (systemMessages.length > 0) {
            systemMessages[systemMessages.length - 1].remove();
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
            
            // If we have audio URL, play it
            if (response.audioUrl) {
                await this.playResponseAudio(response.audioUrl);
            }
            
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