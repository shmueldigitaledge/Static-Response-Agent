# Hebrew Voice Chat Widget - Local POC

A production-ready Hebrew chat widget with voice-to-text capabilities, running completely locally with no external dependencies.

## Current Status

### ✅ Completed Features

- 🎤 **Voice Input Recording:** Microphone button toggle for text input
- 🗣️ **Voice Chat Loop:** Full conversation mode with call status indicators
- 🔊 **Voice Response Playback:** Audio files + TTS fallback system
- 🇮🇱 **Full RTL Hebrew support** with proper text direction
- 💾 **Local Mock Database:** 21 Hebrew Q&A pairs with voice URLs
- 🎯 **Smart Keyword Matching:** Advanced Hebrew text processing with confidence scoring
- 📱 **Responsive design** optimized for mobile and desktop
- 🎨 **Beautiful gradient UI** with enhanced speaker buttons
- ⚡ **Lightweight:** Vanilla JavaScript, no frameworks
- ♿ **Accessibility features** (ARIA labels, keyboard navigation)
- 🔍 **Comprehensive Debugging:** Detailed voice system logging and error handling

### 🚧 Recently Enhanced

- **Voice Input:** Browser-based speech recognition with improved error handling
- **Speaker Buttons:** Blue gradient design, dynamic voice querying from database
- **Audio Playback:** Enhanced with loading states and comprehensive fallback system
- **UI/UX:** Removed clickable messages, streamlined to button-only voice interactions
- **Error Handling:** Fixed microphone button false error messages

## 📋 TODO / Future Roadmap

### 🎯 High Priority

- **🤖 GPT Integration:** Connect to GPT API to judge/validate/enhance answers from database
  - Implement GPT-4 integration for answer quality assessment
  - Add context-aware response improvement
  - Smart fallback to GPT when database confidence is low

- **🗄️ Real Database Connection:** Replace mock database with production database
  - PostgreSQL/MySQL integration with connection pooling
  - Database schema design for Q&A pairs with multilingual support
  - Migration scripts from mock_db to real database
  - Database optimization for Hebrew text search

- **💾 IndexedDB Integration:** Add client-side caching and offline capability
  - Cache frequently asked questions locally
  - Offline mode support with IndexedDB storage
  - Smart cache invalidation and synchronization
  - Progressive Web App (PWA) capabilities

### 🔧 Technical Enhancements

- **Authentication & User Management:** User sessions and personalization
- **Analytics Integration:** Track user interactions and optimize responses
- **Multi-language Support:** Extend beyond Hebrew to Arabic, English
- **Voice Synthesis:** Custom Hebrew TTS voices instead of browser default
- **Real-time Updates:** WebSocket integration for live database updates

### 🎨 UI/UX Improvements

- **Chat History:** Persistent conversation history across sessions
- **Message Actions:** Copy, share, favorite messages
- **Typing Indicators:** Show when bot is "thinking"
- **Rich Media Support:** Images, links, formatted text in responses
- **Customizable Themes:** Light/dark mode, brand customization

## Quick Start (Local Development)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the application:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Navigate to `http://localhost:3000`
   - Click the blue circle button to start voice conversation
   - Speak in Hebrew - your speech will be converted to text and answered automatically
   - Click the orange phone button to end the conversation

## Local Mock Database

The application uses a completely local Q&A system (`mock_db.js`) with no external API calls. It includes:

- **21 Hebrew Q&A pairs** covering greetings, Bezeq products (Be Fiber, gaming, security, streaming)
- **Voice URL support** for audio responses with .wav file references
- **Smart keyword matching** with advanced Hebrew text processing and confidence scoring
- **Easy customization** - edit the `QA_DATABASE` object in `mock_db.js`
- **Lead generation support** for contact information collection
- **Fallback responses** for unmatched queries with intelligent defaults

**Current Q&A Categories:**
- Greetings (שלום, היי, בוקר טוב)
- Bezeq Products (Be Fiber, פייבר, Mesh)
- Technical Features (גיימינג, אבטחה, סטרימינג, עבודה מהבית)
- Lead Generation (פניה, contact collection)

**To add new Q&A entries:**
```javascript
// In mock_db.js, add to QA_DATABASE:
'your keyword': {
  answer: 'Your Hebrew answer here',
  voiceUrl: '/voice/your_audio_file.wav', // Optional
  confidence: 0.9,
  tags: ['category', 'tag']
}
```

## API Integration

The widget expects your external DB API to have an endpoint:

**POST** `${DB_API_BASE}/answers/search`

**Request:**
```json
{
  "q": "user question text"
}
```

**Response:**
```json
{
  "answerId": "A123",
  "answerText": "הטקסט המוכן לתשובה",
  "voiceUrl": "/voice/answer_audio.wav",
  "confidence": 0.95,
  "tags": ["category1", "category2"]
}
```

The backend normalizes responses to:
```json
{
  "answer": "הטקסט המוכן לתשובה",
  "voiceUrl": "/voice/answer_audio.wav",
  "meta": {
    "id": "A123",
    "confidence": 0.95,
    "tags": ["category1", "category2"]
  }
}
```

## File Structure

```
hebrew-chat-widget/
├── package.json          # Dependencies and scripts
├── server.js             # Express backend with mock database integration
├── mock_db.js           # Local Hebrew Q&A database with voice URL support
├── .env.example          # Environment configuration template
├── .env                  # Your environment variables (create from .env.example)
├── README.md             # This file (updated with current status)
└── public/               # Frontend assets
    ├── index.html        # Main HTML with RTL Hebrew layout (v15)
    ├── styles.css        # Responsive CSS with enhanced speaker buttons
    ├── app.js            # Chat functionality with voice system (v15)
    ├── voice/            # Voice audio files directory
    │   ├── hi_greeting.wav           # Hebrew greeting responses
    │   ├── fiber_internet.wav        # Bezeq product explanations
    │   ├── gaming_response.wav       # Technical feature responses
    │   └── lead_confirmation.wav     # Lead generation confirmations
    └── assets/           # Static assets (logo, icons, etc.)
        └── logo.svg      # Placeholder logo
```

## Embedding in Websites

### Basic Iframe Embed

```html
<iframe src="https://your-domain.com/" 
        width="420" 
        height="680" 
        frameborder="0"
        style="border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
</iframe>
```

### Responsive Embed

```html
<div style="position: relative; width: 100%; max-width: 420px; height: 680px;">
  <iframe src="https://your-domain.com/" 
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 16px;">
  </iframe>
</div>
```

### Floating Chat Button (Optional)

```html
<div id="chat-widget" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
  <button onclick="toggleChat()" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; color: white; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
    💬
  </button>
  <iframe id="chat-iframe" 
          src="https://your-domain.com/" 
          style="display: none; position: absolute; bottom: 70px; right: 0; width: 380px; height: 600px; border: none; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
  </iframe>
</div>

<script>
function toggleChat() {
  const iframe = document.getElementById('chat-iframe');
  iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
}
</script>
```

## Deployment

### Azure App Service

1. **Create App Service:**
   ```bash
   az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name hebrew-chat-widget --runtime "NODE|18-lts"
   ```

2. **Configure Environment Variables:**
   ```bash
   az webapp config appsettings set --name hebrew-chat-widget --resource-group myResourceGroup --settings DB_API_BASE="https://your-db-api.com" DB_API_KEY="your_key" NODE_ENV="production"
   ```

3. **Deploy from GitHub:**
   - Connect your GitHub repository in Azure Portal
   - Enable continuous deployment
   - Push changes to trigger automatic deployment

4. **Manual Deployment:**
   ```bash
   # Create deployment package
   npm run build
   zip -r deploy.zip . -x "node_modules/*" ".git/*" ".env"
   
   # Deploy via Azure CLI
   az webapp deployment source config-zip --resource-group myResourceGroup --name hebrew-chat-widget --src deploy.zip
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Heroku Deployment

```bash
# Install Heroku CLI and login
heroku create hebrew-chat-widget
heroku config:set DB_API_BASE=https://your-db-api.com
heroku config:set DB_API_KEY=your_key
git push heroku main
```

## Security Features

- **Rate Limiting:** 3 requests per second per IP address
- **CORS Protection:** Configurable origin restrictions for production
- **Input Validation:** Query length limits and sanitization
- **Error Handling:** Graceful error messages without exposing internals
- **Timeout Protection:** 10-second API timeout to prevent hanging requests

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile Safari (iOS 13+)
- ✅ Chrome Mobile (Android 8+)

## Customization

### Styling
Edit `public/styles.css` to customize:
- Color scheme and gradients
- Typography and fonts
- Component sizes and spacing
- Animation timing and effects

### Content
Edit `public/index.html` to customize:
- Hebrew text and labels
- Meta tags and title
- Example chat messages

### Functionality
Edit `public/app.js` to customize:
- API integration logic
- Message handling and formatting
- Session storage behavior
- Error handling messages

## Troubleshooting

### Common Issues

**1. "DB_API_BASE environment variable is required" error:**
- Ensure `.env` file exists with `DB_API_BASE=your_api_url`
- Check environment variables are properly set in production

**2. CORS errors in production:**
- Set `ORIGIN_URL` in environment variables
- Ensure your domain is properly configured

**3. API timeout errors:**
- Check external DB API is running and accessible
- Verify API_KEY is correct if required
- Consider increasing timeout in `server.js` if needed

**4. Chat messages not displaying properly:**
- Verify browser supports CSS Grid and Flexbox
- Check for JavaScript console errors
- Ensure proper RTL text direction in CSS

### Logging

Enable debug logging by setting:
```env
NODE_ENV=development
```

Check browser console and server logs for detailed error information.

## License

MIT License - feel free to customize and use in your projects.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console for client-side errors  
3. Check server logs for backend issues
4. Ensure your external DB API matches the expected format