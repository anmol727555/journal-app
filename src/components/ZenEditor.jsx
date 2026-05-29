import { useState, useEffect } from 'react';
import { 
  Save, X, Calendar, Smile, Sun, Tag, Image, Clock, BookOpen, 
  Type, Trash, ArrowLeft, Sparkles 
} from 'lucide-react';

const MOODS = {
  happy: { emoji: '😊', label: 'Happy', color: 'rgba(16, 185, 129, 0.15)', text: 'hsl(148, 85%, 46%)' },
  calm: { emoji: '🧘', label: 'Calm', color: 'rgba(14, 165, 233, 0.15)', text: 'hsl(186, 90%, 45%)' },
  energetic: { emoji: '⚡', label: 'Energetic', color: 'rgba(234, 179, 8, 0.15)', text: 'hsl(45, 95%, 50%)' },
  pensive: { emoji: '💭', label: 'Pensive', color: 'rgba(139, 92, 246, 0.15)', text: 'hsl(263, 90%, 65%)' },
  anxious: { emoji: '😰', label: 'Anxious', color: 'rgba(249, 115, 22, 0.15)', text: 'hsl(28, 95%, 55%)' },
  sad: { emoji: '🌧️', label: 'Sad', color: 'rgba(239, 68, 68, 0.15)', text: 'hsl(0, 85%, 60%)' }
};

const WEATHER = {
  sunny: { emoji: '☀️', label: 'Sunny' },
  cloudy: { emoji: '☁️', label: 'Cloudy' },
  rainy: { emoji: '🌧️', label: 'Rainy' },
  snowy: { emoji: '❄️', label: 'Snowy' },
  windy: { emoji: '💨', label: 'Windy' }
};

// Curated gorgeous visual presets (high-quality royalty free nature backgrounds)
const VISUAL_PRESETS = [
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80', // Misty lake/pines
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80', // Cozy forest path
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80', // Sunlight through trees
  'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80', // Mountain sunset meadow
  'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=800&q=80', // Foggy hills
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'  // Epic peaks
];

export default function ZenEditor({ entry, onSave, onCancel, onDelete, isGoogleConnected, syncStatus }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Customization
  const [fontType, setFontType] = useState('sans'); // 'sans', 'serif', 'mono'

  // Derived state to avoid cascading effect updates
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed of 200 WPM

  // Modals
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      setContent(entry.content || '');
      setDate(entry.date || new Date().toISOString().split('T')[0]);
      setMood(entry.mood || '');
      setWeather(entry.weather || '');
      setTags(entry.tags || []);
      setImageUrl(entry.imageUrl || '');
      setFontType(entry.fontType || 'sans');
    } else {
      setTitle('');
      setContent('');
      setDate(new Date().toISOString().split('T')[0]);
      setMood('');
      setWeather('');
      setTags([]);
      setImageUrl('');
      setFontType('sans');
    }
  }, [entry]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const formatted = newTag.trim().toLowerCase().replace(/#/g, '');
      if (formatted && !tags.includes(formatted)) {
        setTags([...tags, formatted]);
        setNewTag('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Convert uploaded image file to Base64
  const handleLocalImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        setShowImageModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      ...entry,
      id: entry?.id,
      title: title || 'Untitled Reflection',
      content,
      date,
      mood,
      weather,
      tags,
      imageUrl,
      fontType,
      wordCount
    });
  };

  return (
    <div className="editor-layout">
      {/* Top Toolbar */}
      <div className="editor-toolbar">
        <button className="secondary-btn" onClick={onCancel}>
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <div className="editor-toolbar-left">
          {entry?.id && (
            <button 
              className="secondary-btn" 
              style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(0, 85%, 65%)' }}
              onClick={() => onDelete(entry.id)}
            >
              <Trash size={16} />
              Delete
            </button>
          )}

          <button className="primary-btn" onClick={handleSave}>
            <Save size={16} />
            Save Reflection
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="glass-panel editor-panel">
        
        {/* Title */}
        <input 
          type="text" 
          placeholder="Untitled Reflection" 
          className="editor-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Entry Metadata Drawer */}
        <div className="editor-meta-row">
          <div className="editor-meta-item">
            <Calendar size={14} />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="editor-meta-item" onClick={() => setShowMoodModal(true)}>
            <Smile size={14} />
            <span>{mood && MOODS[mood] ? `Mood: ${MOODS[mood].emoji} ${MOODS[mood].label}` : 'Select Mood'}</span>
          </div>

          <div className="editor-meta-item" onClick={() => setShowWeatherModal(true)}>
            <Sun size={14} />
            <span>{weather && WEATHER[weather] ? `Weather: ${WEATHER[weather].emoji} ${WEATHER[weather].label}` : 'Select Weather'}</span>
          </div>

          <div className="editor-meta-item" onClick={() => setShowTagModal(true)}>
            <Tag size={14} />
            <span>Tags ({tags.length})</span>
          </div>

          <div className="editor-meta-item" onClick={() => setShowImageModal(true)}>
            <Image size={14} />
            <span>{imageUrl ? 'Edit Visual' : 'Add Visual'}</span>
          </div>

          {/* Font Selector */}
          <div className="editor-meta-item" style={{ cursor: 'default' }}>
            <Type size={14} />
            <span style={{ marginRight: '0.5rem' }}>Font:</span>
            <span 
              onClick={() => setFontType('sans')}
              style={{ fontWeight: fontType === 'sans' ? 'bold' : 'normal', cursor: 'pointer', marginRight: '0.5rem', color: fontType === 'sans' ? 'var(--color-accent)' : 'inherit' }}
            >
              Sans
            </span>
            <span 
              onClick={() => setFontType('serif')}
              style={{ fontWeight: fontType === 'serif' ? 'bold' : 'normal', cursor: 'pointer', marginRight: '0.5rem', color: fontType === 'serif' ? 'var(--color-accent)' : 'inherit' }}
            >
              Serif
            </span>
            <span 
              onClick={() => setFontType('mono')}
              style={{ fontWeight: fontType === 'mono' ? 'bold' : 'normal', cursor: 'pointer', color: fontType === 'mono' ? 'var(--color-accent)' : 'inherit' }}
            >
              Mono
            </span>
          </div>

          {/* Google Sync Badge */}
          {isGoogleConnected ? (
            <div 
              className="editor-meta-item" 
              style={{ 
                cursor: 'default', 
                borderColor: entry?.googleFileId ? 'rgba(0, 229, 206, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                color: entry?.googleFileId ? 'var(--color-accent)' : 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sparkles 
                size={14} 
                style={{ 
                  animation: syncStatus === 'syncing' ? 'spin 1.5s linear infinite' : 'none',
                  color: 'var(--color-accent)'
                }} 
              />
              <span>
                {syncStatus === 'syncing' 
                  ? 'Syncing to Drive...' 
                  : entry?.googleFileId 
                    ? 'Synced with Google Docs' 
                    : 'Pending Sync on Save'}
              </span>
            </div>
          ) : (
            <div 
              className="editor-meta-item" 
              style={{ cursor: 'default', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Connect your Google Drive in settings to back up reflections."
            >
              <Sparkles size={14} style={{ opacity: 0.5 }} />
              <span>Offline (Local Mode)</span>
            </div>
          )}
        </div>

        {/* Visual Attachment Area */}
        {imageUrl && (
          <div className="image-attachment-container">
            <img src={imageUrl} alt="Attached reflection mood" />
            <button className="remove-img-btn" onClick={() => setImageUrl('')}>
              <X size={18} />
            </button>
          </div>
        )}



        {/* Textarea */}
        <textarea 
          className={`editor-textarea font-${fontType}`}
          placeholder="Start writing down your inner thoughts, dreams, and reflections..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* Word Counts */}
        <div className="editor-footer">
          <div className="footer-stats">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <BookOpen size={12} />
              {wordCount} words
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={12} />
              {readingTime} min read
            </span>
          </div>
          <span>Draft saved locally in browser cache</span>
        </div>
      </div>

      {/* MOOD SELECTION MODAL */}
      {showMoodModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">How do you feel?</h3>
              <button className="close-btn" onClick={() => setShowMoodModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mood-grid">
              {Object.entries(MOODS).map(([key, m]) => (
                <div 
                  key={key} 
                  className={`mood-selector-btn ${mood === key ? 'selected' : ''}`}
                  onClick={() => { setMood(key); setShowMoodModal(false); }}
                >
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-name">{m.label}</span>
                </div>
              ))}
              <div 
                className={`mood-selector-btn ${!mood ? 'selected' : ''}`}
                onClick={() => { setMood(''); setShowMoodModal(false); }}
                style={{ gridColumn: 'span 3', borderStyle: 'dashed', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="mood-emoji" style={{ margin: 0, fontSize: '1.2rem' }}>🔄</span>
                <span className="mood-name">Clear Selection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEATHER SELECTION MODAL */}
      {showWeatherModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Active Weather Outside</h3>
              <button className="close-btn" onClick={() => setShowWeatherModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="mood-grid">
              {Object.entries(WEATHER).map(([key, w]) => (
                <div 
                  key={key} 
                  className={`mood-selector-btn ${weather === key ? 'selected' : ''}`}
                  onClick={() => { setWeather(key); setShowWeatherModal(false); }}
                >
                  <span className="mood-emoji">{w.emoji}</span>
                  <span className="mood-name">{w.label}</span>
                </div>
              ))}
              <div 
                className={`mood-selector-btn ${!weather ? 'selected' : ''}`}
                onClick={() => { setWeather(''); setShowWeatherModal(false); }}
                style={{ gridColumn: 'span 3', borderStyle: 'dashed', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="mood-emoji" style={{ margin: 0, fontSize: '1.2rem' }}>🔄</span>
                <span className="mood-name">Clear Selection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAGS MODAL */}
      {showTagModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Associate Tags</h3>
              <button className="close-btn" onClick={() => setShowTagModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="e.g. mindfulness, study, focus" 
                className="search-input" 
                style={{ paddingLeft: '1rem' }}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
              />
              <button className="primary-btn" onClick={handleAddTag}>
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {tags.map((t, idx) => (
                <span 
                  key={idx} 
                  className="tag-pill" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}
                  onClick={() => handleRemoveTag(t)}
                >
                  #{t} <X size={10} />
                </span>
              ))}
              {tags.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags associated. Add tags above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISUAL ATTACHMENT MODAL */}
      {showImageModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Visual Reflection</h3>
              <button className="close-btn" onClick={() => setShowImageModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Upload an image or pick a gorgeous atmospheric nature preset:
              </p>
              
              <label 
                className="secondary-btn" 
                style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', padding: '1rem' }}
              >
                Choose Local Photo File...
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleLocalImageUpload}
                />
              </label>

              <div className="picker-title" style={{ marginTop: '1.25rem' }}>Atmospheric Presets</div>
              
              <div className="mock-gallery-grid">
                {VISUAL_PRESETS.map((presetUrl, idx) => (
                  <div 
                    key={idx} 
                    className={`gallery-photo-choice ${imageUrl === presetUrl ? 'selected' : ''}`}
                    style={{ backgroundImage: `url(${presetUrl})` }}
                    onClick={() => { setImageUrl(presetUrl); setShowImageModal(false); }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
