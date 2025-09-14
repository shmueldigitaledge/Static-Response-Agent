const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    tags: [randomTopic, "בדיקה", "demo"]
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

// Start server
app.listen(PORT, () => {
  console.log(`Hebrew Chat Widget server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`DB API Base: ${process.env.DB_API_BASE}`);
});