import { useState, useMemo } from 'react';
import { 
  Plus, Trash2, Calendar, Clock, Award, Sparkles, Compass, 
  ChevronLeft, Check, Flame, History, Info
} from 'lucide-react';

const CATEGORIES = ['Programming', 'Design', 'Languages', 'Science', 'Business', 'Other'];
const COLOR_PRESETS = [
  { value: '#60A5FA', name: 'Sky Blue' },
  { value: '#34D399', name: 'Mint Green' },
  { value: '#FCD34D', name: 'Cozy Amber' },
  { value: '#F472B6', name: 'Blossom Pink' },
  { value: '#A78BFA', name: 'Lavender Purple' }
];

export default function Learning({ topics, setTopics }) {
  // Navigation & View states
  const [selectedTopicIdState, setSelectedTopicIdState] = useState(null);
  const [mobilePane, setMobilePane] = useState('list'); // 'list' or 'detail'
  
  // Topic creation states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState(CATEGORIES[0]);
  const [newTopicColor, setNewTopicColor] = useState(COLOR_PRESETS[0].value);

  // Session Logging states
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isCompleted, setIsCompleted] = useState(true);
  const [duration, setDuration] = useState(45); // default 45 mins
  const [reflection, setReflection] = useState('');

  // Derive the active topic
  const activeTopic = useMemo(() => {
    if (topics.length === 0) return null;
    const match = topics.find(t => t.id === selectedTopicIdState);
    return match || topics[0];
  }, [topics, selectedTopicIdState]);

  // Derive selectedTopicId
  const selectedTopicId = activeTopic ? activeTopic.id : null;

  // Generate last 30 days list (latest today)
  const last30Days = useMemo(() => {
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  }, []);

  // Streak Calculator
  const streakInfo = useMemo(() => {
    if (!activeTopic || !activeTopic.history || activeTopic.history.length === 0) {
      return { currentStreak: 0, completionRate30: 0 };
    }

    const completedDates = new Set(activeTopic.history.map(h => h.date));
    
    // Calculate streak
    let streak = 0;
    let checkDate = new Date();
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    let todayStr = formatDate(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
    let yesterdayStr = formatDate(checkDate);
    
    let currentCheckDate;
    if (completedDates.has(todayStr)) {
      currentCheckDate = new Date();
    } else if (completedDates.has(yesterdayStr)) {
      currentCheckDate = new Date();
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else {
      currentCheckDate = null;
    }
    
    if (currentCheckDate) {
      while (completedDates.has(formatDate(currentCheckDate))) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      }
    }

    // Completion rate in last 30 days
    let completedIn30Count = 0;
    last30Days.forEach(dateStr => {
      if (completedDates.has(dateStr)) {
        completedIn30Count++;
      }
    });

    const completionRate30 = Math.round((completedIn30Count / 30) * 100);

    return {
      currentStreak: streak,
      completionRate30
    };
  }, [activeTopic, last30Days]);

  // Handle creating a new topic
  const handleCreateTopic = (e) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    const newTopic = {
      id: 'topic-' + Date.now(),
      name: newTopicName.trim(),
      category: newTopicCategory,
      color: newTopicColor,
      createdAt: new Date().toISOString(),
      history: []
    };

    setTopics(prev => [...prev, newTopic]);
    setSelectedTopicIdState(newTopic.id);
    setNewTopicName('');
    setNewTopicCategory(CATEGORIES[0]);
    setNewTopicColor(COLOR_PRESETS[0].value);
    setShowAddForm(false);
    setMobilePane('detail');
  };

  // Handle deleting a topic
  const handleDeleteTopic = (topicId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this topic and all its logs? This cannot be undone.")) {
      const remaining = topics.filter(t => t.id !== topicId);
      setTopics(remaining);
      if (selectedTopicId === topicId) {
        setSelectedTopicIdState(remaining.length > 0 ? remaining[0].id : null);
        setMobilePane('list');
      }
    }
  };

  // Handle clicking a grid day to prepopulate logging
  const handleGridDayClick = (dateStr) => {
    setLogDate(dateStr);
    
    // Check if there is an existing session log for this day
    const existingLog = activeTopic?.history?.find(h => h.date === dateStr);
    if (existingLog) {
      setIsCompleted(true);
      setDuration(existingLog.duration);
      setReflection(existingLog.notes || '');
    } else {
      setIsCompleted(true);
      setDuration(45);
      setReflection('');
    }
  };

  // Save session log
  const handleSaveSession = (e) => {
    e.preventDefault();
    if (!activeTopic) return;

    let updatedHistory = [...activeTopic.history];
    const existingIndex = updatedHistory.findIndex(h => h.date === logDate);

    if (!isCompleted) {
      // If toggled off, remove session log if it exists
      if (existingIndex !== -1) {
        updatedHistory.splice(existingIndex, 1);
      }
    } else {
      const sessionData = {
        id: existingIndex !== -1 ? updatedHistory[existingIndex].id : 'session-' + Date.now(),
        date: logDate,
        duration: Number(duration),
        notes: reflection.trim()
      };

      if (existingIndex !== -1) {
        updatedHistory[existingIndex] = sessionData;
      } else {
        updatedHistory.push(sessionData);
      }

    }

    // Update global state
    setTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, history: updatedHistory } : t));
    
    // Reset form takeaway note field only
    setReflection('');
    // Notify
    alert("Session successfully logged!");
  };

  // Delete specific session log
  const handleDeleteSession = (sessionId) => {
    if (window.confirm("Delete this session entry?")) {
      const updatedHistory = activeTopic.history.filter(h => h.id !== sessionId);
      setTopics(prev => prev.map(t => t.id === activeTopic.id ? { ...t, history: updatedHistory } : t));
    }
  };

  // Render Date block in the list items
  const formatLocalDate = (dateStr) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, options);
  };

  // Sorted timeline history
  const sortedHistory = useMemo(() => {
    if (!activeTopic || !activeTopic.history) return [];
    return [...activeTopic.history].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [activeTopic]);

  return (
    <div className={`learning-split-layout show-${mobilePane}`}>
      
      {/* 1. LEFT PANE: Topics list & addition */}
      <aside className="dashboard-left-pane">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={20} className="glow-icon" style={{ color: '#FCD34D' }} />
              Learning Hub
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Track study habits & daily takeaways</p>
          </div>
          <button 
            className="action-button-circle"
            onClick={() => setShowAddForm(!showAddForm)}
            title="Create New Topic"
            style={{ 
              background: showAddForm ? 'var(--text-primary)' : 'var(--bg-glass-hover)', 
              color: showAddForm ? 'var(--bg-secondary)' : 'var(--text-primary)',
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass-active)', cursor: 'pointer' 
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="left-pane-scrollable" style={{ padding: '1rem' }}>
          {/* Add Topic Inline Panel */}
          {showAddForm && (
            <form onSubmit={handleCreateTopic} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderColor: 'var(--border-glass-active)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>New Topic Details</h3>
              
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Topic Name</label>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="e.g. React 19, Spanish, Physics" 
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.85rem', display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Category</label>
                  <select 
                    value={newTopicCategory}
                    onChange={e => setNewTopicCategory(e.target.value)}
                    className="search-input"
                    style={{ width: '100%', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Theme Color</label>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', height: '36px' }}>
                    {COLOR_PRESETS.map(preset => (
                      <div 
                        key={preset.value}
                        onClick={() => setNewTopicColor(preset.value)}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '50%', 
                          background: preset.value, 
                          cursor: 'pointer',
                          boxShadow: newTopicColor === preset.value ? '0 0 0 2px var(--text-primary)' : 'none',
                          transition: 'transform 0.15s ease',
                          transform: newTopicColor === preset.value ? 'scale(1.15)' : 'none'
                        }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.1rem' }}>
                <button 
                  type="submit" 
                  className="nav-button active"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                >
                  Create Topic
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="nav-button"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Topics List */}
          {topics.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
              <Compass size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} className="pulse-svg" />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No learning topics created yet.</p>
              <button 
                onClick={() => setShowAddForm(true)} 
                className="nav-button active"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem' }}
              >
                Create First Topic
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topics.map(topic => {
                const isActive = topic.id === selectedTopicId;
                const completedDates = new Set(topic.history?.map(h => h.date) || []);
                let topicStreak = 0;
                let checkDate = new Date();
                const formatDate = (d) => d.toISOString().split('T')[0];
                
                let todayStr = formatDate(checkDate);
                checkDate.setDate(checkDate.getDate() - 1);
                let yesterdayStr = formatDate(checkDate);
                
                let currentCheckDate;
                if (completedDates.has(todayStr)) {
                  currentCheckDate = new Date();
                } else if (completedDates.has(yesterdayStr)) {
                  currentCheckDate = new Date();
                  currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                } else {
                  currentCheckDate = null;
                }
                
                if (currentCheckDate) {
                  while (completedDates.has(formatDate(currentCheckDate))) {
                    topicStreak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                  }
                }

                // Completion percentage
                const completionPct = topic.history && topic.history.length > 0 
                  ? Math.min(100, Math.round((topic.history.length / 30) * 100))
                  : 0;

                return (
                  <div 
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicIdState(topic.id);
                      setMobilePane('detail');
                    }}
                    className={`glass-panel topics-list-item ${isActive ? 'active' : ''}`}
                    style={{ 
                      padding: '1rem', 
                      cursor: 'pointer',
                      borderStyle: 'solid',
                      borderWidth: '1px 1px 1px 4px',
                      borderTopColor: isActive ? topic.color : 'var(--border-glass)',
                      borderRightColor: isActive ? topic.color : 'var(--border-glass)',
                      borderBottomColor: isActive ? topic.color : 'var(--border-glass)',
                      borderLeftColor: topic.color,
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isActive ? `0 4px 20px rgba(0, 0, 0, 0.15), inset 0 0 10px rgba(0,0,0,0.2)` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div style={{ flex: 1, marginRight: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: `${topic.color}22`, color: topic.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {topic.category}
                        </span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.35rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                          {topic.name}
                        </h4>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteTopic(topic.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                        className="delete-topic-btn"
                        title="Delete Topic"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.65rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, color: topicStreak > 0 ? '#F97316' : 'var(--text-muted)' }}>
                        <Flame size={12} fill={topicStreak > 0 ? '#F97316' : 'none'} style={{ stroke: topicStreak > 0 ? 'none' : 'currentColor' }} />
                        {topicStreak} day{topicStreak !== 1 ? 's' : ''}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {completionPct}% complete
                      </span>
                    </div>

                    {/* Compact progress bar */}
                    <div style={{ width: '100%', height: '3px', background: 'var(--border-glass)', borderRadius: '2px', marginTop: '0.45rem', overflow: 'hidden' }}>
                      <div style={{ width: `${completionPct}%`, height: '100%', background: topic.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* 2. CENTER & RIGHT PANE: Grid, Logging Form, and timeline logs */}
      <main className="dashboard-right-pane">
        {!activeTopic ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Compass size={48} style={{ color: '#FCD34D', opacity: 0.8 }} className="glow-icon pulse-svg" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select or Create a Topic</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Build daily study habits, log takeaways, sync lessons with your journal logs, and view your 30-day consistency tracker!
              </p>
              {topics.length > 0 && (
                <button 
                  onClick={() => setMobilePane('list')} 
                  className="nav-button active"
                  style={{ display: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', marginTop: '0.5rem' }}
                >
                  Choose From List
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="learning-workspace-layout" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', height: '100%', overflow: 'hidden' }}>
            
            {/* Center Area (Logger & Grid) */}
            <div style={{ padding: '1.5rem', borderRight: '1px solid var(--border-glass)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Back to list button for mobile */}
              <button 
                className="mobile-back-btn"
                onClick={() => setMobilePane('list')}
                style={{ display: 'none' }}
              >
                <ChevronLeft size={16} /> Back to Topics
              </button>

              {/* Topic Header & Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeTopic.name}</h1>
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${activeTopic.color}22`, color: activeTopic.color, fontWeight: 600, textTransform: 'uppercase' }}>
                      {activeTopic.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Logging history & tracking since {new Date(activeTopic.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.85rem' }}>
                  <div className="glass-panel" style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--border-glass)' }}>
                    <Flame size={18} fill={streakInfo.currentStreak > 0 ? '#F97316' : 'none'} style={{ stroke: streakInfo.currentStreak > 0 ? 'none' : '#F97316' }} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1' }}>{streakInfo.currentStreak}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Streak</div>
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--border-glass)' }}>
                    <Award size={18} style={{ color: activeTopic.color }} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1' }}>{streakInfo.completionRate30}%</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>30D Activity</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 30-Day Grid */}
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} />
                  30-Day Consistency Grid
                </h3>
                
                <div className="consistency-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="consistency-circle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '0.5rem' }}>
                    {last30Days.map((dateStr) => {
                      const session = activeTopic.history?.find(h => h.date === dateStr);
                      const isLoggedDate = !!session;
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      
                      const formatTooltip = () => {
                        const localName = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        if (isLoggedDate) {
                          return `${localName}: Studied ${session.duration} mins${session.notes ? ` - "${session.notes.substring(0,25)}..."` : ''}`;
                        }
                        return `${localName}: No study logged`;
                      };

                      return (
                        <div 
                          key={dateStr}
                          onClick={() => handleGridDayClick(dateStr)}
                          className={`consistency-cell ${isLoggedDate ? 'active' : ''} ${isToday ? 'today' : ''} ${logDate === dateStr ? 'selected' : ''}`}
                          style={{ 
                            aspectRatio: '1',
                            borderRadius: '50%',
                            background: isLoggedDate ? activeTopic.color : 'rgba(255,255,255,0.03)',
                            border: isToday 
                              ? '1.5px solid var(--text-primary)' 
                              : logDate === dateStr 
                                ? '1.5px solid #FCD34D'
                                : '1px solid var(--border-glass)',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            boxShadow: isLoggedDate ? `0 0 10px ${activeTopic.color}66` : 'none',
                          }}
                          title={formatTooltip()}
                        >
                          <span style={{ 
                            position: 'absolute', 
                            fontSize: '0.55rem', 
                            color: isLoggedDate ? 'var(--bg-secondary)' : 'var(--text-muted)', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            fontWeight: 700
                          }}>
                            {new Date(dateStr + 'T00:00:00').getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    <span>29 days ago</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Info size={10} /> Click cells to log or view specific dates
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Today</span>
                  </div>
                </div>
              </div>

              {/* Logger Form */}
              <form onSubmit={handleSaveSession} className="glass-panel" style={{ padding: '1.25rem', borderColor: 'var(--border-glass-active)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} style={{ color: activeTopic.color }} />
                  Daily Session Logger & Reflection
                </h3>

                <div className="logger-form-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Row 1: Date & Completed Toggle */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>Study Date</label>
                      <input 
                        type="date" 
                        value={logDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => setLogDate(e.target.value)}
                        className="search-input"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                    
                    <div style={{ minWidth: '150px', display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setIsCompleted(!isCompleted)}
                        className="nav-button"
                        style={{ 
                          width: '100%', 
                          height: '38px',
                          borderColor: isCompleted ? activeTopic.color : 'var(--border-glass)',
                          background: isCompleted ? `${activeTopic.color}11` : 'transparent',
                          color: isCompleted ? activeTopic.color : 'var(--text-muted)',
                          fontSize: '0.85rem',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          fontWeight: 600
                        }}
                      >
                        <Check size={16} style={{ opacity: isCompleted ? 1 : 0.3 }} />
                        {isCompleted ? 'Day Studied / Done' : 'Mark as Studied'}
                      </button>
                    </div>
                  </div>

                  {isCompleted && (
                    <>
                      {/* Range Slider for study duration */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Study Duration
                          </label>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: activeTopic.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} />
                            {duration} Minutes
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>15m</span>
                          <input 
                            type="range" 
                            min="15" 
                            max="120" 
                            step="5"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            style={{ 
                              flex: 1, 
                              height: '4px', 
                              borderRadius: '2px', 
                              background: 'var(--border-glass)', 
                              accentColor: activeTopic.color,
                              cursor: 'pointer' 
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>120m</span>
                        </div>
                      </div>

                      {/* Excerpt reflections textarea */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 500 }}>
                          Key Takeaways & Lessons
                        </label>
                        <textarea
                          placeholder="What major concepts did you cover? Write down important code snippets, vocabulary, formulas, or takeaways..."
                          value={reflection}
                          onChange={e => setReflection(e.target.value)}
                          className="search-input"
                          style={{ 
                            width: '100%', 
                            height: '80px', 
                            fontSize: '0.85rem', 
                            resize: 'none', 
                            lineHeight: '1.4', 
                            padding: '0.65rem 0.85rem' 
                          }}
                        />
                      </div>

                    </>
                  )}

                  <button 
                    type="submit" 
                    className="nav-button active"
                    style={{ 
                      width: '100%', 
                      padding: '0.65rem', 
                      fontSize: '0.85rem', 
                      justifyContent: 'center', 
                      background: activeTopic.color, 
                      borderColor: activeTopic.color, 
                      color: 'var(--bg-secondary)',
                      fontWeight: 700,
                      marginTop: '0.5rem',
                      boxShadow: `0 4px 15px ${activeTopic.color}33`
                    }}
                  >
                    Save Session Log
                  </button>

                </div>
              </form>

            </div>

            {/* Right Area (Timeline feed of past sessions) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="timeline-pane">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={16} style={{ color: 'var(--text-secondary)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Study History</h3>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }} className="timeline-scrollable">
                {sortedHistory.length === 0 ? (
                  <div style={{ height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', opacity: 0.5 }}>
                    <History size={24} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No study sessions logged for this topic yet.</p>
                  </div>
                ) : (
                  <div className="learning-session-timeline" style={{ position: 'relative', paddingLeft: '1rem', borderLeft: `1.5px solid ${activeTopic.color}33`, display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '0.5rem 0' }}>
                    {sortedHistory.map(session => (
                      <div key={session.id} style={{ position: 'relative' }} className="timeline-session-item">
                        {/* Timeline Bullet Node */}
                        <div style={{ 
                          position: 'absolute', 
                          left: '-1.45rem', 
                          top: '0.2rem', 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: activeTopic.color, 
                          border: '2px solid var(--bg-secondary)',
                          boxShadow: `0 0 8px ${activeTopic.color}`
                        }} />

                        {/* Session Card */}
                        <div className="glass-panel" style={{ padding: '0.85rem', borderColor: 'var(--border-glass)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formatLocalDate(session.date)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                                <Clock size={10} /> {session.duration}m
                              </span>
                              <button 
                                onClick={() => handleDeleteSession(session.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', padding: '0.1rem' }}
                                title="Delete Entry"
                                className="delete-session-btn"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {session.notes && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.45', whiteSpace: 'pre-wrap', borderLeft: `2px solid ${activeTopic.color}66`, paddingLeft: '0.45rem', margin: '0.35rem 0 0 0', fontStyle: 'italic' }}>
                              {session.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
