# Hebrew Voice Chat Widget - Local POC

A production-ready Hebrew chat widget with voice-to-text capabilities, running completely locally with no external dependencies.

## Features

- 🎤 **Voice Input:** Browser-based speech recognition (Hebrew)
- 🗣️ **Voice Chat Loop:** Click button → speak → get text response → repeat
- 🇮🇱 **Full RTL Hebrew support** with proper text direction
- 💾 **Local Mock Database:** 50+ Hebrew Q&A pairs, no external API calls
- 🎯 **Smart Keyword Matching:** Finds relevant answers with confidence scoring
- 📱 **Responsive design** optimized for mobile and desktop
- 🎨 **Beautiful gradient UI** with call status indicators
- ⚡ **Lightweight:** Vanilla JavaScript, no frameworks
- ♿ **Accessibility features** (ARIA labels, keyboard navigation)

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

- **50+ Hebrew Q&A pairs** covering greetings, technology, food, travel, health, and sports
- **Smart keyword matching** that finds relevant answers based on user questions  
- **Easy customization** - edit the `QA_DATABASE` object in `mock_db.js`
- **Confidence scoring** and tagging system for answer quality
- **Fallback responses** for unmatched queries

**To add new Q&A entries:**
```javascript
// In mock_db.js, add to QA_DATABASE:
'your keyword': {
  answer: 'Your Hebrew answer here',
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
  "confidence": 0.95,
  "tags": ["category1", "category2"]
}
```

The backend normalizes responses to:
```json
{
  "answer": "הטקסט המוכן לתשובה",
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
├── server.js             # Express backend with proxy
├── .env.example          # Environment configuration template
├── .env                  # Your environment variables (create from .env.example)
├── README.md             # This file
└── public/               # Frontend assets
    ├── index.html        # Main HTML with RTL Hebrew layout
    ├── styles.css        # Responsive CSS with gradient design
    ├── app.js            # Chat functionality and API integration
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