const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
const http = require('http');
const mockDB = require('./mock_db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;



// Always use local mock DB for this POC
console.log('📚 Using local mock database (no external API calls)');

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

    // Use local mock database
    console.log(`🔍 Querying mock DB for: "${query}"`);
    
    // Simulate realistic processing delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    const data = mockDB.query(query.trim());

    // Normalize response format
    const normalizedResponse = {
      answer: data.answer || 'מצטער, לא מצאתי תשובה מתאימה.',
      voiceUrl: data.voiceUrl || null,
      meta: {
        id: data.id || null,
        confidence: data.confidence || null,
        tags: data.tags || [],
        matchedKeyword: data.matchedKeyword || null
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
server.listen(PORT, () => {
  console.log(`Hebrew Chat Widget server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mock DB loaded with ${mockDB.getStats().totalEntries} Q&A entries`);
});