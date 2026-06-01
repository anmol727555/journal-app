import { useState, useEffect } from 'react';
import { 
  Save, X, Calendar, Smile, Sun, Tag, Image, Clock, BookOpen, 
  Type, Trash, ArrowLeft, Cloud, Bold, Italic, Underline, Link as LinkIcon
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

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

const VISUAL_PRESETS = [
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80'
];

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="editor-menubar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'is-active' : ''}
        title="Underline"
      >
        <Underline size={16} />
      </button>
      <button
        onClick={() => {
          const url = window.prompt('URL');
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }}
        className={editor.isActive('link') ? 'is-active' : ''}
        title="Link"
      >
        <LinkIcon size={16} />
      </button>
    </div>
  );
};

export default function ZenEditor({ entry, onSave, onCancel, onDelete, isGoogleConnected, syncStatus }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState('');
  const [weather, setWeather] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fontType, setFontType] = useState('sans');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: entry?.content || '',
    editorProps: {
      attributes: {
        class: `editor-content font-${fontType}`,
      },
    },
  });

  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      setDate(entry.date || new Date().toISOString().split('T')[0]);
      setMood(entry.mood || '');
      setWeather(entry.weather || '');
      setTags(entry.tags || []);
      setImageUrl(entry.imageUrl || '');
      setFontType(entry.fontType || 'sans');
      if (editor && entry.content !== editor.getHTML()) {
        editor.commands.setContent(entry.content || '');
      }
    }
  }, [entry, editor]);

  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `editor-content font-${fontType}`,
          },
        },
      });
    }
  }, [fontType, editor]);

  const wordCount = editor?.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

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
      content: editor.getHTML(),
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
      <div className="editor-toolbar">
        <button className="secondary-btn" onClick={onCancel}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div className="editor-toolbar-left">
          {entry?.id && (
            <button className="secondary-btn" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(0, 85%, 65%)' }} onClick={() => onDelete(entry.id)}>
              <Trash size={16} /> Delete
            </button>
          )}
          <button className="primary-btn" onClick={handleSave}>
            <Save size={16} /> Save
          </button>
        </div>
      </div>

      <div className="glass-panel editor-panel">
        <input type="text" placeholder="Untitled Reflection" className="editor-title-input" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="editor-meta-row">
          <div className="editor-meta-item"><Calendar size={14} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="editor-meta-item" onClick={() => setShowMoodModal(true)}><Smile size={14} /><span>{mood && MOODS[mood] ? `Mood: ${MOODS[mood].emoji} ${MOODS[mood].label}` : 'Select Mood'}</span></div>
          <div className="editor-meta-item" onClick={() => setShowWeatherModal(true)}><Sun size={14} /><span>{weather && WEATHER[weather] ? `Weather: ${WEATHER[weather].emoji} ${WEATHER[weather].label}` : 'Select Weather'}</span></div>
          <div className="editor-meta-item" onClick={() => setShowTagModal(true)}><Tag size={14} /><span>Tags ({tags.length})</span></div>
          <div className="editor-meta-item" onClick={() => setShowImageModal(true)}><Image size={14} /><span>{imageUrl ? 'Edit Visual' : 'Add Visual'}</span></div>
          <div className="editor-meta-item" style={{ cursor: 'default' }}>
            <Type size={14} /><span style={{ marginRight: '0.5rem' }}>Font:</span>
            {['sans', 'serif', 'mono'].map(f => (
              <span key={f} onClick={() => setFontType(f)} style={{ fontWeight: fontType === f ? 'bold' : 'normal', cursor: 'pointer', marginRight: '0.5rem', color: fontType === f ? 'var(--color-accent)' : 'inherit', textTransform: 'capitalize' }}>{f}</span>
            ))}
          </div>
          {isGoogleConnected ? (
            <div className="editor-meta-item" style={{ cursor: 'default', borderColor: entry?.googleFileId ? 'rgba(0, 229, 206, 0.3)' : 'rgba(255, 255, 255, 0.1)', color: entry?.googleFileId ? 'var(--color-accent)' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cloud size={14} style={{ animation: syncStatus === 'syncing' ? 'spin 1.5s linear infinite' : 'none', color: 'var(--color-accent)' }} />
              <span>{syncStatus === 'syncing' ? 'Syncing to Drive...' : entry?.googleFileId ? 'Synced with Google Docs' : 'Pending Sync on Save'}</span>
            </div>
          ) : (
            <div className="editor-meta-item" style={{ cursor: 'default', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.35rem' }} title="Connect your Google Drive in settings to back up reflections.">
              <Cloud size={14} style={{ opacity: 0.5 }} /><span>Offline (Local Mode)</span>
            </div>
          )}
        </div>

        {imageUrl && <div className="image-attachment-container"><img src={imageUrl} alt="Attached reflection mood" /><button className="remove-img-btn" onClick={() => setImageUrl('')}><X size={18} /></button></div>}

        <div className="tiptap-editor-container">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} />
        </div>

        <div className="editor-footer">
          <div className="footer-stats">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BookOpen size={12} />{wordCount} words</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} />{readingTime} min read</span>
          </div>
        </div>
      </div>

      {/* MODALS (Same as before, omitted for brevity in thought, but I will include them in write_file) */}
      {showMoodModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header"><h3 className="modal-title">How do you feel?</h3><button className="close-btn" onClick={() => setShowMoodModal(false)}><X size={20} /></button></div>
            <div className="mood-grid">
              {Object.entries(MOODS).map(([key, m]) => (
                <div key={key} className={`mood-selector-btn ${mood === key ? 'selected' : ''}`} onClick={() => { setMood(key); setShowMoodModal(false); }}>
                  <span className="mood-emoji">{m.emoji}</span><span className="mood-name">{m.label}</span>
                </div>
              ))}
              <div className={`mood-selector-btn ${!mood ? 'selected' : ''}`} onClick={() => { setMood(''); setShowMoodModal(false); }} style={{ gridColumn: 'span 3', borderStyle: 'dashed', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mood-emoji" style={{ margin: 0, fontSize: '1.2rem' }}>🔄</span><span className="mood-name">Clear Selection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWeatherModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header"><h3 className="modal-title">Active Weather Outside</h3><button className="close-btn" onClick={() => setShowWeatherModal(false)}><X size={20} /></button></div>
            <div className="mood-grid">
              {Object.entries(WEATHER).map(([key, w]) => (
                <div key={key} className={`mood-selector-btn ${weather === key ? 'selected' : ''}`} onClick={() => { setWeather(key); setShowWeatherModal(false); }}>
                  <span className="mood-emoji">{w.emoji}</span><span className="mood-name">{w.label}</span>
                </div>
              ))}
              <div className={`mood-selector-btn ${!weather ? 'selected' : ''}`} onClick={() => { setWeather(''); setShowWeatherModal(false); }} style={{ gridColumn: 'span 3', borderStyle: 'dashed', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mood-emoji" style={{ margin: 0, fontSize: '1.2rem' }}>🔄</span><span className="mood-name">Clear Selection</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div className="modal-header"><h3 className="modal-title">Associate Tags</h3><button className="close-btn" onClick={() => setShowTagModal(false)}><X size={20} /></button></div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><input type="text" placeholder="e.g. mindfulness, study, focus" className="search-input" style={{ paddingLeft: '1rem' }} value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={handleAddTag} /><button className="primary-btn" onClick={handleAddTag}>Add</button></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {tags.map((t, idx) => (<span key={idx} className="tag-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => handleRemoveTag(t)}>#{t} <X size={10} /></span>))}
              {tags.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags associated. Add tags above.</p>}
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">Add Visual Reflection</h3><button className="close-btn" onClick={() => setShowImageModal(false)}><X size={20} /></button></div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Upload an image or pick a gorgeous atmospheric nature preset:</p>
              <label className="secondary-btn" style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', padding: '1rem' }}>Choose Local Photo File...<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLocalImageUpload} /></label>
              <div className="picker-title" style={{ marginTop: '1.25rem' }}>Atmospheric Presets</div>
              <div className="mock-gallery-grid">
                {VISUAL_PRESETS.map((presetUrl, idx) => (<div key={idx} className={`gallery-photo-choice ${imageUrl === presetUrl ? 'selected' : ''}`} style={{ backgroundImage: `url(${presetUrl})` }} onClick={() => { setImageUrl(presetUrl); setShowImageModal(false); }} />))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
