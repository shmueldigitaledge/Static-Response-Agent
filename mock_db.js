/**
 * Mock Database for Hebrew Chat Widget
 * Simulates a Q&A database with keyword matching
 */

// Sample Q&A database - easily editable
const QA_DATABASE = {
  // Greetings
  'שלום': {
    answer: 'שלום וברכה! איך אוכל לעזור לך היום?',
    voiceUrl: '/voice/shalom_greeting.wav',
    confidence: 0.95,
    tags: ['greeting', 'hello']
  },
  'הי': {
    answer: 'היי! שמח לראות אותך. מה השאלה שלך?',
    voiceUrl: '/voice/hi_greeting.wav',
    confidence: 0.95,
    tags: ['greeting', 'casual']
  },
  'בוקר טוב': {
    answer: 'בוקר טוב! איזה יום יפה היום. במה אוכל לעזור?',
    voiceUrl: '/voice/good_morning.wav',
    confidence: 0.95,
    tags: ['greeting', 'morning']
  },

  // Technology questions
  'סיבים': {
    answer: 'אינטרנט סיבים מבטיח מהירות גלישה גבוהה במיוחד, יציבות ושימוש חלק לשיחות וידאו, סטרימינג וגיימינג.',
    voiceUrl: '/voice/fiber_internet.wav',
    confidence: 0.95,
    tags: ['internet', 'fiber', 'speed']
  },

  'Be Fiber': {
    answer: 'נתב Be Fiber הוא הראוטר המתקדם של בזק לסיבים אופטיים, בתקן WiFi6, ומאפשר חיבור של עד 128 מכשירים במקביל.',
    voiceUrl: '/voice/be_fiber_router.wav',
    confidence: 0.95,
    tags: ['router', 'wifi6', 'bezeq']
  },

  'פייבר': {
    answer: 'נתב Be Fiber הוא הראוטר המתקדם של בזק לסיבים אופטיים, בתקן WiFi6, ומאפשר חיבור של עד 128 מכשירים במקביל.',
    voiceUrl: '/voice/be_fiber_router.wav',
    confidence: 0.95,
    tags: ['router', 'wifi6', 'bezeq']
  },

'גיימינג': {
  answer: 'נתב Be Fiber מותאם לגיימינג עם חיבור יציב וללא לאגים, כדי שתוכלו ליהנות ממשחקי רשת חלקים ומהירים.',
  voiceUrl: '/voice/gaming_response.wav',
  confidence: 0.9,
  tags: ['gaming', 'low-latency', 'performance']
},

'Mesh': {
  answer: 'עם נתב Be Fiber ומשפר הגלישה Mesh Fiber תוכלו ליהנות מרשת WiFi רציפה בכל הבית, בלי לעבור בין רשתות שונות.',
  voiceUrl: '/voice/mesh_response.wav',
  confidence: 0.9,
  tags: ['mesh', 'wifi', 'coverage']
},

'אבטחה': {
  answer: 'הראוטר כולל הגנת סייבר מתקדמת, שחוסמת איומים ופריצות בזמן אמת ושומרת על הגולשים בבית.',
  voiceUrl: '/voice/security_response.wav',
  confidence: 0.9,
  tags: ['security', 'cyber', 'protection']
},

'עבודה מהבית': {
  answer: 'עם אינטרנט סיבים ונתב Be Fiber ניתן לעבוד מהבית בנוחות, לנהל שיחות זום באיכות גבוהה וללא הפרעות.',
  voiceUrl: '/voice/work_from_home.wav',
  confidence: 0.9,
  tags: ['remote-work', 'zoom', 'stability']
},

'סטרימינג': {
  answer: 'Be Fiber מאפשר צפייה ישירה בנטפליקס ויוטיוב באיכות 8K, ללא Buffering או הפרעות.',
  voiceUrl: '/voice/streaming_response.wav',
  confidence: 0.9,
  tags: ['streaming', 'video', 'entertainment']
},

'Full Fiber': {
  answer: 'חבילת Full Fiber כוללת את הראוטר Be Fiber ומשפר הגלישה Mesh Fiber, לחוויית אינטרנט עוצמתית בכל הבית.',
  voiceUrl: '/voice/full_fiber_bundle.wav',
  confidence: 0.9,
  tags: ['bundle', 'full-fiber', 'offer']
},

  //lead

  'פנייה': {
    answer: 'אוקיי תוכל להגיד לי בבקשה את שמך ומספר הטלפון שלך ואעביר את הפרטים?',
    voiceUrl: '/voice/lead_contact_request.wav',
    confidence: 0.9,
    tags: ['lead', 'contact', 'phone']
  },
  'פניה': {
    answer: 'אוקיי תוכל להגיד לי בבקשה את שמך ומספר הטלפון שלך ואעביר את הפרטים?',
    voiceUrl: '/voice/lead_contact_request.wav',
    confidence: 0.9,
    tags: ['lead', 'contact', 'phone']
  },
  '05': {
    answer: 'תודה אדאג שיחזרו אלייך',
    voiceUrl: '/voice/lead_confirmation.wav',
    confidence: 0.8,
    tags: ['lead', 'confirmation', 'phone']
  },
  

  // Additional common words for better matching
  'על': {
    answer: 'על מה תרצה לשמוע? אני יכול לעזור עם מידע על טכנולוגיה, אוכל, טיולים ועוד.',
    confidence: 0.5,
    tags: ['preposition', 'general']
  },
  'רוצה': {
    answer: 'מה תרצה לדעת? אני כאן לעזור!',
    confidence: 0.6,
    tags: ['want', 'general']
  },
  'לדעת': {
    answer: 'אני אשמח לעזור לך לדעת יותר! על מה אתה סקרן?',
    confidence: 0.6,
    tags: ['know', 'general']
  },

  // Default fallbacks for common question words
  'מה': {
    answer: 'זו שאלה מעניינת! אני כאן לעזור עם מידע על טכנולוגיה, אוכל, טיולים, בריאות ועוד. תוכל לשאול יותר ספציפית?',
    confidence: 0.6,
    tags: ['question', 'general']
  },
  'איך': {
    answer: 'אני אשמח להסביר איך לעשות דברים שונים! תוכל לשאול איך לבשל משהו, איך ללמוד דבר חדש, או איך לתכנן טיול?',
    confidence: 0.65,
    tags: ['how-to', 'general']
  },
  'למה': {
    answer: 'זו שאלה פילוסופית! אני אוהב לחקור את ה"למה" של דברים. על מה אתה סקרן?',
    confidence: 0.6,
    tags: ['why', 'philosophical']
  }
};

/**
 * Query the mock database for an answer
 * @param {string} text - The user's question/query
 * @returns {Object} - Response object with answer, confidence, and metadata
 */
function query(text) {
  if (!text || typeof text !== 'string') {
    return {
      answer: 'לא הבנתי את השאלה. אנא נסה שוב.',
      confidence: 0.1,
      tags: ['error'],
      id: `ERROR_${Date.now()}`
    };
  }

  // Clean and normalize the input text
  const normalizedQuery = text.trim().toLowerCase();
  console.log(`🔍 Mock DB Query: "${normalizedQuery}"`);

  // Find the best matching keyword
  let bestMatch = null;
  let bestScore = 0;

  // Define function words that should have lower priority
  const functionWords = ['על', 'רוצה', 'לדעת', 'מה', 'איך', 'למה'];

  for (const [keyword, data] of Object.entries(QA_DATABASE)) {
    // Calculate match score based on keyword presence and position
    const keywordLower = keyword.toLowerCase();
    
    // Remove RTL marks and other special characters for matching
    const cleanQuery = normalizedQuery.replace(/[\u200E\u200F\u061C]/g, '');
    const cleanKeyword = keywordLower.replace(/[\u200E\u200F\u061C]/g, '');
    
    if (cleanQuery.includes(cleanKeyword)) {
      // Higher score for exact matches and earlier positions
      const position = cleanQuery.indexOf(cleanKeyword);
      const exactMatch = cleanQuery === cleanKeyword;
      
      let score = exactMatch ? 1.0 : 0.8;
      score -= (position * 0.02); // Minimal position penalty
      score *= data.confidence; // Factor in the confidence of this answer
      
      // Give lower priority to function words
      if (functionWords.includes(keywordLower)) {
        score *= 0.5;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { keyword, ...data };
      }
    }
  }

  // If no exact match, try partial matching with individual words
  if (!bestMatch) {
    for (const [keyword, data] of Object.entries(QA_DATABASE)) {
      const keywordLower = keyword.toLowerCase();
      const keywordWords = keywordLower.split(' ');
      const queryWords = normalizedQuery.split(' ');
      
      // Check if any keyword words appear in the query
      let matchingWords = 0;
      for (const keywordWord of keywordWords) {
        for (const queryWord of queryWords) {
          // Look for the keyword word within the query word (handles Hebrew)
          if (queryWord.includes(keywordWord) && keywordWord.length > 1) {
            matchingWords++;
            break;
          }
        }
      }
      
      // Also check if the full keyword appears anywhere in the query
      if (normalizedQuery.includes(keywordLower)) {
        matchingWords = Math.max(matchingWords, keywordWords.length);
      }
      
      if (matchingWords > 0) {
        const matchRatio = matchingWords / keywordWords.length;
        const score = matchRatio * data.confidence * 0.8; // Increased weight for partial matches
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { keyword, ...data };
        }
      }
    }
  }

  // Return the best match or a default response
  if (bestMatch && bestScore > 0.3) {
    console.log(`✅ Found match: "${bestMatch.keyword}" (score: ${bestScore.toFixed(2)})`);
    return {
      answer: bestMatch.answer,
      voiceUrl: bestMatch.voiceUrl || null,
      confidence: Math.min(bestScore, 0.95), // Cap confidence at 95%
      tags: bestMatch.tags,
      matchedKeyword: bestMatch.keyword,
      id: `MOCK_${Date.now()}`
    };
  }

  // Default response when no good match is found
  console.log(`❓ No match found for: "${normalizedQuery}"`);
  return {
    answer: 'זו שאלה מעניינת! אני עדיין לומד ואוסף מידע. תוכל לשאול על כל מוצרי האינטרנט של בזק או על איך לדבר איתנו?',
    confidence: 0.4,
    tags: ['default', 'no-match'],
    id: `DEFAULT_${Date.now()}`
  };
}

/**
 * Add a new Q&A pair to the database
 * @param {string} keyword - The keyword to match
 * @param {string} answer - The answer to return
 * @param {Array} tags - Optional tags for categorization
 * @param {number} confidence - Confidence level (0-1)
 */
function addEntry(keyword, answer, tags = [], confidence = 0.9) {
  QA_DATABASE[keyword] = {
    answer,
    confidence,
    tags: tags.length > 0 ? tags : ['custom']
  };
  console.log(`➕ Added new entry: "${keyword}"`);
}

/**
 * Get all available keywords (for debugging/admin)
 */
function getKeywords() {
  return Object.keys(QA_DATABASE);
}

/**
 * Get database statistics
 */
function getStats() {
  const totalEntries = Object.keys(QA_DATABASE).length;
  const tagCounts = {};
  
  Object.values(QA_DATABASE).forEach(entry => {
    entry.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return {
    totalEntries,
    tagCounts,
    availableKeywords: getKeywords()
  };
}

module.exports = {
  query,
  addEntry,
  getKeywords,
  getStats
};