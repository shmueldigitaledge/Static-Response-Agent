const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const { createDeepgram } = require('@deepgram/sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Deepgram (if API key provided)
let deepgram = null;
if (process.env.DEEPGRAM_API_KEY) {
    deepgram = createDeepgram(process.env.DEEPGRAM_API_KEY);
    console.log('✅ Deepgram STT initialized');
} else {
    console.log('⚠️  Deepgram API key not provided - using mock STT');
}

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    },
});

// Check if DB_API_BASE is configured
const USE_FAKE_API = !process.env.DB_API_BASE || process.env.DB_API_BASE === 'fake';

if (USE_FAKE_API) {
  console.log('⚠️  Using fake API responses for testing');
} else {
  console.log(`✅ Using external DB API: ${process.env.DB_API_BASE}`);
}

// Rate limiting: 3 requests per second per IP
const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 3,
  message: { error: 'Rate limit exceeded. Please try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 
    function (origin, callback) {
      // Allow same origin or no origin (for mobile apps)
      if (!origin || origin === process.env.ORIGIN_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } : true, // Allow all origins in development
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate fake response for testing
function generateFakeResponse(query) {
  const responses = [
    "שלום! אני כאן לעזור לך. מה שאלתך?",
    "זה נשמע מעניין! אני יכול לעזור לך עם זה.",
    "בהחלט, יש לי כמה רעיונות לגבי השאלה שלך.",
    "מעולה! זה נושא שאני מכיר טוב.",
    "תודה על השאלה. הנה מה שאני יכול לומר לך:",
    "אני שמח לעזור! זה מה שאני יודע על הנושא הזה:",
    "שאלה נהדרת! בואו נחשוב על זה יחד.",
    "זה באמת נושא חשוב. הנה התשובה שלי:",
  ];
  
  const topics = [
    "ארוחת בוקר",
    "טיולים בישראל", 
    "מתכונים",
    "טכנולוגיה",
    "ספורט",
    "מוסיקה",
    "קולנוע",
    "ספרים"
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  return {
    answerId: `FAKE_${Date.now()}`,
    answerText: `${randomResponse} השאלה שלך על "${query}" מעניינת מאוד. זה קשור ל${randomTopic} ויש הרבה מה לומר על זה!`,
    confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
    tags: [randomTopic, "בדיקה", "demo"],
    audioUrl: `/audio/fake_${Math.floor(Math.random() * 5) + 1}.mp3` // Fake audio URLs
  };
}

// Chat API proxy endpoint
app.post('/api/ask', limiter, async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
    }

    if (query.length > 500) {
      return res.status(400).json({ error: 'Query is too long (max 500 characters)' });
    }

    let data;

    if (USE_FAKE_API) {
      // Use fake response for testing
      console.log(`🤖 Generating fake response for: "${query}"`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      data = generateFakeResponse(query.trim());
    } else {
      // Call real external DB API
      const apiUrl = `${process.env.DB_API_BASE}/answers/search`;
      const payload = { q: query.trim() };
      
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (process.env.DB_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.DB_API_KEY}`;
      }

      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: 10000, // 10 second timeout
      });
      
      data = response.data;
    }

    // Normalize response format
    const normalizedResponse = {
      answer: data.answerText || data.answer || 'מצטער, לא מצאתי תשובה מתאימה.',
      audioUrl: data.audioUrl || null,
      meta: {
        id: data.answerId || data.id || null,
        confidence: data.confidence || null,
        tags: data.tags || []
      }
    };

    res.json(normalizedResponse);

  } catch (error) {
    console.error('API Error:', error.message);

    // Handle different types of errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
    } else if (error.response) {
      // API returned an error response
      const status = error.response.status;
      if (status === 401) {
        res.status(503).json({ error: 'Authentication error with external service.' });
      } else if (status === 429) {
        res.status(429).json({ error: 'External service rate limit exceeded. Please try again later.' });
      } else {
        res.status(503).json({ error: 'External service error. Please try again later.' });
      }
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'Request timeout. Please try again.' });
    } else {
      res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
  }
});

// Audio upload endpoint for fallback STT
app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const lang = req.query.lang || 'he';
    let transcript = '';

    if (deepgram) {
      // Use Deepgram for real STT
      try {
        const response = await deepgram.listen.prerecorded.transcribeFile(
          req.file.buffer,
          {
            model: 'nova-2',
            language: lang,
            smart_format: true,
            punctuate: true,
          }
        );

        transcript = response.results.channels[0].alternatives[0].transcript || '';
      } catch (error) {
        console.error('Deepgram transcription error:', error);
        throw error;
      }
    } else {
      // Mock STT response
      transcript = `תמלול מדומה של קובץ השמע (${req.file.size} bytes)`;
    }

    res.json({ 
      transcript,
      language: lang,
      confidence: 0.95
    });

  } catch (error) {
    console.error('Upload transcription error:', error);
    res.status(500).json({ 
      error: 'שגיאה בתמלול הקובץ. אנא נסו שוב.' 
    });
  }
});

// Serve fake audio files (for demo purposes)
app.get('/audio/fake_:id.mp3', (req, res) => {
  // Return 404 for now - in real implementation, serve actual audio files
  res.status(404).json({ error: 'Audio file not found' });
});

// Serve the main chat widget
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket Server for Live Conversation
const wss = new WebSocket.Server({ 
  server,
  path: '/realtime'
});

// Active connections map
const activeConnections = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const lang = url.searchParams.get('lang') || 'he';
  const sessionId = url.searchParams.get('session') || 'anonymous';
  
  console.log(`🔗 WebSocket connected: ${sessionId}, lang: ${lang}`);
  
  // Store connection info
  const connectionInfo = {
    ws,
    sessionId,
    lang,
    isTranscribing: false,
    deepgramConnection: null
  };
  
  activeConnections.set(ws, connectionInfo);

  // Initialize Deepgram live transcription if available
  if (deepgram) {
    try {
      const deepgramLive = deepgram.listen.live({
        model: 'nova-2',
        language: lang,
        smart_format: true,
        punctuate: true,
        interim_results: true,
        utterance_end_ms: 2000,
        vad_events: true,
        endpointing: 300,
        no_delay: false,
        keywords: ['שלום', 'הי', 'אהלן', 'מה', 'איך', 'למה', 'מתי', 'איפה'],
      });

      connectionInfo.deepgramConnection = deepgramLive;

      // Handle Deepgram transcription results
      deepgramLive.addListener('Results', (data) => {
        const result = data.channel.alternatives[0];
        if (result && result.transcript) {
          const message = {
            type: result.is_final ? 'transcript_final' : 'transcript_partial',
            text: result.transcript,
            confidence: result.confidence || 0.9,
            language: lang
          };
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }

          // If final transcript, get response from DB
          if (result.is_final && result.transcript.trim()) {
            handleFinalTranscript(ws, result.transcript, sessionId);
          }
        }
      });

      deepgramLive.addListener('Error', (error) => {
        console.error('Deepgram error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'שגיאה בשירות זיהוי הקול'
          }));
        }
      });

      deepgramLive.addListener('Close', () => {
        console.log('🔌 Deepgram connection closed');
      });

    } catch (error) {
      console.error('Failed to initialize Deepgram live:', error);
    }
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      // Check if it's JSON message (text) or binary data (audio)
      if (Buffer.isBuffer(data)) {
        // Audio data received
        if (connectionInfo.deepgramConnection && connectionInfo.deepgramConnection.getReadyState() === 1) {
          connectionInfo.deepgramConnection.send(data);
          connectionInfo.isTranscribing = true;
        } else {
          // Fallback: mock transcription for audio data
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'transcript_partial',
                text: 'תמלול מדומה...',
                confidence: 0.8,
                language: lang
              }));
              
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'transcript_final',
                    text: 'שאלה מדומה מקובץ השמע',
                    confidence: 0.85,
                    language: lang
                  }));
                  handleFinalTranscript(ws, 'שאלה מדומה מקובץ השמע', sessionId);
                }
              }, 1500);
            }
          }, 500);
        }
      } else {
        // Text message (JSON)
        const message = JSON.parse(data.toString());
        
        if (message.type === 'final_transcript' && message.text) {
          console.log(`📝 Final transcript from client: "${message.text}" (session: ${sessionId})`);
          
          // Validate transcript quality
          const transcript = message.text.trim();
          if (transcript.length >= 3) {
            handleFinalTranscript(ws, transcript, sessionId);
          } else {
            console.log('⚠️  Transcript too short, ignoring:', transcript);
          }
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${sessionId}`);
    
    // Close Deepgram connection
    if (connectionInfo.deepgramConnection) {
      connectionInfo.deepgramConnection.finish();
    }
    
    // Remove from active connections
    activeConnections.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'מחובר לשיחה קולית',
    language: lang,
    sessionId
  }));
});

// Handle final transcript and get response from DB
async function handleFinalTranscript(ws, transcript, sessionId) {
  try {
    console.log(`📝 Final transcript: "${transcript}" (session: ${sessionId})`);
    
    // Get response from fake API
    let data;
    if (USE_FAKE_API) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      data = generateFakeResponse(transcript);
    } else {
      // Call real external DB API
      const apiUrl = `${process.env.DB_API_BASE}/answers/search`;
      const response = await axios.post(apiUrl, 
        { q: transcript },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.DB_API_KEY && { 'Authorization': `Bearer ${process.env.DB_API_KEY}` })
          },
          timeout: 10000
        }
      );
      data = response.data;
    }

    // Send response back to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'response',
        text: data.answerText || data.answer || 'מצטער, לא מצאתי תשובה מתאימה.',
        audioUrl: data.audioUrl || null,
        meta: {
          id: data.answerId || data.id || null,
          confidence: data.confidence || null,
          tags: data.tags || []
        }
      }));
    }

  } catch (error) {
    console.error('Error handling final transcript:', error);
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'שגיאה בקבלת תשובה מהמערכת'
      }));
    }
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Hebrew Chat Widget server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DB API Base: ${process.env.DB_API_BASE}`);
  console.log(`WebSocket server ready for live conversations`);
});