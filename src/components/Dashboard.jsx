import { useState, useMemo } from 'react';
import { 
  Search, Plus, Calendar, Smile, Sun, ChevronLeft, ChevronRight, BookOpen, 
  Compass, Edit, Trash2, Tag, Sparkles 
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

export default function Dashboard({ 
  entries, 
  onNewEntry, 
  onEditEntry, 
  onDelete,
  selectedId,
  setSelectedId,
  newlySavedId
}) {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [mobilePane, setMobilePane] = useState('list');

  // Extract all unique months from entries in descending chronological order
  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set();
    entries.forEach(e => {
      if (e.date) {
        const d = new Date(e.date);
        const monthName = d.toLocaleDateString('en-US', { month: 'long' });
        const yearYY = d.getFullYear().toString().slice(-2);
        monthsSet.add(`${monthName} ${yearYY}`);
      }
    });
    
    return Array.from(monthsSet).sort((a, b) => {
      const dateA = new Date(a.split(' ')[0] + ' 1, 20' + a.split(' ')[1]);
      const dateB = new Date(b.split(' ')[0] + ' 1, 20' + b.split(' ')[1]);
      return dateB - dateA;
    });
  }, [entries]);

  // 1. Calculate Throwback memory deterministically (daily stable)
  const throwback = useMemo(() => {
    if (entries.length === 0) return null;
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Look for same month & day in different years
    const sameDayMemory = entries.find(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === month && eDate.getDate() === day && eDate.getFullYear() !== today.getFullYear();
    });

    if (sameDayMemory) {
      return sameDayMemory;
    } else if (entries.length >= 3) {
      // Fallback to deterministic older past memory using date hashing
      const olderEntries = entries.filter(e => {
        const diffTime = Math.abs(today - new Date(e.date));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 3;
      });
      if (olderEntries.length > 0) {
        const hashIndex = (today.getFullYear() + today.getMonth() + today.getDate()) % olderEntries.length;
        return olderEntries[hashIndex];
      }
    }
    return null;
  }, [entries]);

  // 2. Calculate Streak & Stats
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return { streak: 0, total: 0, dominantMood: 'None' };
    }

    const moodCounts = {};
    let maxCount = 0;
    let dominant = 'None';
    
    entries.forEach(e => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        if (moodCounts[e.mood] > maxCount) {
          maxCount = moodCounts[e.mood];
          dominant = MOODS[e.mood] ? `${MOODS[e.mood].emoji} ${MOODS[e.mood].label}` : e.mood;
        }
      }
    });

    const sortedDates = [...entries]
      .map(e => new Date(e.date).toDateString())
      .filter((val, id, self) => self.indexOf(val) === id)
      .map(d => new Date(d))
      .sort((a, b) => b - a);

    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);

    let dateIndex = 0;
    if (sortedDates.length > 0) {
      const firstDate = new Date(sortedDates[0]);
      firstDate.setHours(0,0,0,0);
      
      const diffToday = (checkDate - firstDate) / (1000 * 60 * 60 * 24);
      if (diffToday === 1) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diffToday === 0) {
        currentStreak = 1;
      } else {
        currentStreak = 0;
      }

      if (currentStreak > 0) {
        for (let i = dateIndex; i < sortedDates.length; i++) {
          const entryDate = new Date(sortedDates[i]);
          entryDate.setHours(0,0,0,0);
          
          if (entryDate.getTime() === checkDate.getTime()) {
            if (i > dateIndex) currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (entryDate.getTime() < checkDate.getTime()) {
            break;
          }
        }
      }
    }

    return {
      streak: currentStreak,
      total: entries.length,
      dominantMood: dominant
    };
  }, [entries]);

  // 3. Filter and sort entries (Latest first)
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                            e.content.toLowerCase().includes(search.toLowerCase()) ||
                            e.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      
      let matchesMonth = true;
      if (selectedMonth !== 'all' && e.date) {
        const d = new Date(e.date);
        const monthName = d.toLocaleDateString('en-US', { month: 'long' });
        const yearYY = d.getFullYear().toString().slice(-2);
        matchesMonth = `${monthName} ${yearYY}` === selectedMonth;
      }
      
      return matchesSearch && matchesMonth;
    }).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [entries, search, selectedMonth]);

  // 4. Fallback Selection: Derive activeId at render time to bypass useEffect warnings
  const activeId = useMemo(() => {
    if (filteredEntries.length === 0) return null;
    if (selectedId && filteredEntries.some(e => e.id === selectedId)) {
      return selectedId;
    }
    return filteredEntries[0].id;
  }, [filteredEntries, selectedId]);

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Group entries by month/year (e.g. "August 2024")
  const groupEntriesByMonth = (entriesList) => {
    const groups = {};
    entriesList.forEach(entry => {
      const dateObj = new Date(entry.date);
      const groupName = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(entry);
    });
    return Object.entries(groups);
  };

  // Render Date block in the left sidebar item
  const renderDateBox = (dateStr) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = d.toLocaleDateString(undefined, { day: 'numeric' });
    return (
      <div className="date-box">
        <span className="date-box-dayname">{dayName}</span>
        <span className="date-box-daynum">{dayNum}</span>
      </div>
    );
  };

  // Renders a high quality gradient mood placeholder when no image is attached
  const getPlaceholderThumbnail = (moodKey) => {
    const moodGradients = {
      happy: 'linear-gradient(135deg, hsl(148, 70%, 55%) 0%, hsl(148, 85%, 40%) 100%)',
      calm: 'linear-gradient(135deg, hsl(186, 75%, 55%) 0%, hsl(186, 90%, 40%) 100%)',
      energetic: 'linear-gradient(135deg, hsl(45, 85%, 58%) 0%, hsl(45, 95%, 45%) 100%)',
      pensive: 'linear-gradient(135deg, hsl(263, 80%, 75%) 0%, hsl(263, 90%, 58%) 100%)',
      anxious: 'linear-gradient(135deg, hsl(28, 85%, 65%) 0%, hsl(28, 95%, 48%) 100%)',
      sad: 'linear-gradient(135deg, hsl(0, 75%, 70%) 0%, hsl(0, 85%, 52%) 100%)'
    };
    const gradient = moodGradients[moodKey] || 'linear-gradient(135deg, var(--border-glass-active) 0%, var(--text-muted) 100%)';
    const emoji = MOODS[moodKey]?.emoji || '✍️';
    
    return (
      <div 
        className="list-item-placeholder-thumbnail" 
        style={{ background: gradient, color: 'white' }}
      >
        {emoji}
      </div>
    );
  };

  const activeEntry = useMemo(() => {
    return entries.find(e => e.id === activeId);
  }, [entries, activeId]);

  // Grouped entries list
  const groupedEntries = useMemo(() => {
    return groupEntriesByMonth(filteredEntries);
  }, [filteredEntries]);

  return (
    <div className={`dashboard-split-layout show-${mobilePane}`}>
      
      {/* 1. LEFT PANEL: Notes Scrollable List */}
      <aside className="dashboard-left-pane">
        
        {/* Left header with Title & Streak & Add Button */}
        <div className="dashboard-left-header">
          <div className="left-pane-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Reflections</span>
            {stats.streak > 0 && (
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  background: 'rgba(249, 115, 22, 0.12)', 
                  color: 'var(--color-accent)', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.15rem'
                }}
                title={`${stats.streak} day journaling streak!`}
              >
                🔥 {stats.streak}d streak
              </span>
            )}
          </div>
          <button 
            className="primary-btn" 
            style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}
            onClick={onNewEntry}
            title="Create a new journal entry"
          >
            <Plus size={16} />
            Write
          </button>
        </div>

        {/* Compact Filters & Search inside Left Pane */}
        <div className="filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div className="search-input-container" style={{ width: '100%' }}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search reflections, tags..." 
              className="search-input"
              value={search}
              style={{ paddingLeft: '2.2rem', paddingRight: '0.5rem', height: '36px', fontSize: '0.85rem' }}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ width: '100%' }}>
            <select 
              className="filter-select"
              value={selectedMonth}
              style={{ height: '32px', padding: '0 0.5rem', fontSize: '0.78rem', width: '100%', cursor: 'pointer' }}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List Scroll Container */}
        <div className="entries-scroll-area">
          {filteredEntries.length > 0 ? (
            groupedEntries.map(([monthGroup, monthEntries]) => (
              <div key={monthGroup}>
                {/* Month header sticky */}
                <div className="month-group-header">{monthGroup}</div>
                
                {/* Entries listed within month */}
                {monthEntries.map((e) => {
                  const isActive = e.id === activeId;
                  const wordCountText = e.wordCount > 0 ? `${e.wordCount} words` : '';
                  const truncatedPreview = e.content ? e.content.replace(/>\s*Prompt:[^\n]*\n?/g, '') : '';
                  
                  return (
                    <div 
                      key={e.id}
                      className={`journal-list-item ${isActive ? 'active' : ''} ${e.id === newlySavedId ? 'newly-saved' : ''}`}
                      onClick={() => {
                        setSelectedId(e.id);
                        setMobilePane('detail');
                      }}
                    >
                      {/* Left: Stacked date block */}
                      {renderDateBox(e.date)}

                      {/* Middle: Title, Preview, and Tags Metadata */}
                      <div className="list-item-center">
                        <h4 className="list-item-title">{e.title || 'Untitled Reflection'}</h4>
                        <p className="list-item-preview">{truncatedPreview || 'Start typing...'}</p>
                        <div className="list-item-meta">
                          {MOODS[e.mood] && (
                            <span>{MOODS[e.mood].emoji} {MOODS[e.mood].label}</span>
                          )}
                          {e.weather && WEATHER[e.weather] && (
                            <span>• {WEATHER[e.weather].emoji}</span>
                          )}
                          {wordCountText && <span>• {wordCountText}</span>}
                        </div>
                      </div>

                      {/* Right: Round corner image thumbnail or custom gradient based on mood */}
                      {e.imageUrl ? (
                        <div 
                          className="list-item-thumbnail" 
                          style={{ backgroundImage: `url(${e.imageUrl})` }}
                        />
                      ) : (
                        getPlaceholderThumbnail(e.mood)
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="glass-panel" style={{ padding: '2rem 1rem', textAlign: 'center', marginTop: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍃</div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Silence of filters</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                No entries match your active filters.
              </p>
              <button 
                className="secondary-btn" 
                style={{ marginTop: '0.75rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                onClick={() => { setSearch(''); setSelectedMonth('all'); }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. RIGHT PANEL: Selected Journal Entry Detailed View */}
      <section className="dashboard-right-pane">
        {activeEntry ? (
          <div className="detail-scroll-area">
            <div className="detail-reading-card animate-fade-in">
              {/* Mobile Back Button */}
              <button 
                className="secondary-btn mobile-back-btn" 
                onClick={() => setMobilePane('list')}
                style={{
                  display: 'none', // Overridden in CSS media queries on mobile
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                  width: 'fit-content'
                }}
              >
                <ChevronLeft size={16} /> Back to reflections
              </button>
              
              {/* Optional Throwback Memory mini banner at top of reading panel */}
              {throwback && activeEntry.id !== throwback.id && (
                <div 
                  className="throwback-mini-banner animate-fade-in"
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass-active)',
                    background: 'rgba(var(--color-accent-rgb), 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem'
                  }}
                  onClick={() => setSelectedId(throwback.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    <Compass size={14} style={{ color: 'var(--color-accent)' }} />
                    <span>On this day memory: <strong>{throwback.title}</strong></span>
                  </span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    Read recollection <ChevronRight size={12} />
                  </span>
                </div>
              )}

              {/* Special badge if the selected entry itself IS the throwback */}
              {throwback && activeEntry.id === throwback.id && (
                <div 
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(var(--color-accent-rgb), 0.1)',
                    color: 'var(--color-accent)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <Compass size={12} />
                  Throwback memory recall
                </div>
              )}

              {/* Title */}
              <h2 className="detail-title">{activeEntry.title || 'Untitled Reflection'}</h2>

              {/* Meta information row */}
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <Calendar size={14} />
                  <span>{formatDate(activeEntry.date)}</span>
                </div>

                {MOODS[activeEntry.mood] && (
                  <div className="detail-meta-item">
                    <Smile size={14} />
                    <span>Mood: {MOODS[activeEntry.mood].emoji} {MOODS[activeEntry.mood].label}</span>
                  </div>
                )}

                {activeEntry.weather && WEATHER[activeEntry.weather] && (
                  <div className="detail-meta-item">
                    <Sun size={14} />
                    <span>Weather: {WEATHER[activeEntry.weather].emoji} {WEATHER[activeEntry.weather].label}</span>
                  </div>
                )}

                {activeEntry.wordCount > 0 && (
                  <div className="detail-meta-item">
                    <BookOpen size={14} />
                    <span>{activeEntry.wordCount} words ({Math.ceil(activeEntry.wordCount / 200)} min read)</span>
                  </div>
                )}

                {activeEntry.googleFileId && (
                  <div className="detail-meta-item" style={{ color: 'var(--color-accent)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
                    <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
                    <span>Backed up to Google Drive</span>
                  </div>
                )}
              </div>

              {/* Centered high-resolution image attachment */}
              {activeEntry.imageUrl && (
                <div className="detail-image-container animate-fade-in">
                  <img src={activeEntry.imageUrl} alt={activeEntry.title} />
                </div>
              )}

              {/* Body text content */}
              <article className={`detail-body-text font-${activeEntry.fontType || 'sans'}`}>
                {activeEntry.content ? (
                  activeEntry.content.split('\n').map((para, idx) => {
                    // Check if paragraph is an AI/writing prompt
                    if (para.trim().startsWith('> Prompt:')) {
                      return (
                        <blockquote 
                          key={idx} 
                          style={{
                            borderLeft: '3px solid var(--color-accent)',
                            paddingLeft: '1rem',
                            margin: '1.25rem 0',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                            fontSize: '0.98rem'
                          }}
                        >
                          {para.replace(/^>\s*/, '')}
                        </blockquote>
                      );
                    }
                    return para.trim() ? <p key={idx} style={{ marginBottom: '1.25rem' }}>{para}</p> : null;
                  })
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>This reflection has no body text yet. Click edit below to log your thoughts.</p>
                )}
              </article>

              {/* Tags & Action buttons footer */}
              <div className="detail-footer-actions">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxWidth: '70%' }}>
                  {activeEntry.tags?.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="tag-pill" 
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.55rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.15rem' 
                      }}
                    >
                      <Tag size={10} style={{ opacity: 0.6 }} />
                      #{t}
                    </span>
                  ))}
                  {(!activeEntry.tags || activeEntry.tags.length === 0) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No associated tags</span>
                  )}
                </div>

                {/* Edit & Delete Action Panel */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {onDelete && (
                    <button 
                      className="secondary-btn" 
                      style={{ 
                        borderColor: 'rgba(239, 68, 68, 0.2)', 
                        color: 'hsl(0, 85%, 60%)',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.8rem' 
                      }}
                      onClick={async () => {
                        const deleted = await onDelete(activeEntry.id);
                        if (deleted) {
                          setMobilePane('list');
                        }
                      }}
                      title="Permanently erase this journal log"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                  <button 
                    className="primary-btn" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    onClick={() => onEditEntry(activeEntry.id)}
                    title="Edit reflection content and settings"
                  >
                    <Edit size={14} />
                    Edit Entry
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Empty detail pane placeholder if entries exist but none selected */
          <div className="detail-empty-state">
            <div className="detail-empty-icon">📂</div>
            <h3 className="detail-empty-title">Select a reflection</h3>
            <p className="detail-empty-desc">Choose a journal log from the left notes list to review details.</p>
          </div>
        )}
      </section>

    </div>
  );
}
