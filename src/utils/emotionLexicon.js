/**
 * Predefined static Lexicon dictionary for auto-tagging.
 * Maps emotional and situational tag names to synonyms, keyword roots, and stems.
 */
export const EMOTION_LEXICON = {
  joy: [
    'joy', 'joyful', 'joyfully', 'happy', 'happiness', 'cheerful', 'cheerfully', 
    'excited', 'excitement', 'delighted', 'glad', 'gratitude', 'grateful', 'blessed',
    'thrilled', 'elated', 'sunshine', 'celebrate', 'celebrating'
  ],
  peace: [
    'peace', 'peaceful', 'peacefully', 'calm', 'calmness', 'calmly', 'serene', 
    'serenity', 'tranquil', 'relaxed', 'relaxing', 'quiet', 'stillness', 'meditative',
    'zen', 'soothing', 'cosy', 'comfort'
  ],
  energy: [
    'energy', 'energetic', 'active', 'actively', 'motivated', 'vibrant', 'vitality', 
    'productive', 'productivity', 'inspired', 'inspiration', 'focus', 'focused',
    'passionate', 'eager', 'exercise', 'workout', 'jog', 'running'
  ],
  reflection: [
    'reflect', 'reflection', 'reflections', 'thoughtful', 'pensive', 'wonder', 
    'contemplate', 'contemplating', 'ponder', 'pondering', 'mindful', 'mindfulness',
    'meditate', 'meditator', 'journaling', 'insight', 'insights'
  ],
  anxiety: [
    'anxiety', 'anxious', 'anxiously', 'stress', 'stressed', 'stressful', 'worry', 
    'worried', 'worrying', 'panic', 'panicked', 'nervous', 'nervousness', 'scared', 
    'fear', 'tense', 'apprehensive', 'overwhelmed'
  ],
  sadness: [
    'sad', 'sadness', 'gloomy', 'gloom', 'depressed', 'depression', 'heavy', 
    'unhappy', 'lonely', 'loneliness', 'sorrow', 'sorrowful', 'grief', 'hurting',
    'crying', 'weeping', 'melancholy'
  ],
  anger: [
    'hate', 'hateful', 'angry', 'angrily', 'anger', 'mad', 'furious', 'rage', 
    'frustrated', 'frustration', 'annoyed', 'irritated', 'resentful', 'bitter', 
    'dislike', 'hostile'
  ],
  work: [
    'work', 'working', 'office', 'job', 'jobs', 'career', 'project', 'projects', 
    'meeting', 'meetings', 'boss', 'colleague', 'colleagues', 'professional', 
    'tasks', 'client', 'clients', 'corporate', 'desk'
  ],
  family: [
    'family', 'families', 'kids', 'kid', 'children', 'child', 'parent', 'parents', 
    'mom', 'dad', 'wife', 'husband', 'spouse', 'siblings', 'brother', 'sister',
    'relative', 'relatives', 'nephew', 'niece', 'grandparent', 'grandparents'
  ],
  school: [
    'school', 'college', 'university', 'class', 'classes', 'homework', 'exam', 
    'exams', 'study', 'studying', 'learn', 'learning', 'student', 'students',
    'teacher', 'professor', 'lecture', 'lectures', 'assignment', 'assignments'
  ],
  home: [
    'home', 'house', 'apartment', 'room', 'rooms', 'household', 'domestic', 
    'neighborhood', 'bedroom', 'cozy', 'backyard', 'garden', 'kitchen'
  ]
};

/**
 * Strips HTML tags, tokenizes content, matches against the EMOTION_LEXICON dictionary,
 * counts hits, and returns the top 3 highest-frequency tag names.
 * 
 * @param {string} htmlContent - The raw HTML content from the editor
 * @returns {string[]} Inferred tag names (max 3)
 */
export function analyzeContentForTags(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  
  // 1. Strip HTML tags to extract raw text content
  const rawText = htmlContent.replace(/<[^>]*>/g, ' ').toLowerCase();
  
  // 2. Replace punctuation with spaces to guarantee clean word boundary matching
  const cleanText = rawText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ');
  
  const tagScores = [];
  
  // 3. Scan the content for matching keywords in each lexicon category
  for (const [tag, keywords] of Object.entries(EMOTION_LEXICON)) {
    let hits = 0;
    
    for (const keyword of keywords) {
      // Escape regex special chars in keywords
      const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedKeyword + '\\b', 'g');
      
      const matches = cleanText.match(regex);
      if (matches) {
        hits += matches.length;
      }
    }
    
    if (hits > 0) {
      tagScores.push({ tag, hits });
    }
  }
  
  // 4. Rank by keyword frequency descending
  const sortedTags = tagScores.sort((a, b) => b.hits - a.hits);
  
  // 5. Select the top 3 tags
  const topTags = sortedTags.slice(0, 3).map(item => item.tag);
  
  return topTags;
}
