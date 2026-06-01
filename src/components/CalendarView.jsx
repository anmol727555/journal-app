import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, X, Edit, Trash2, Calendar, 
  Plus, Sparkles, BookOpen, Tag, Smile, Sun 
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

export default function CalendarView({ 
  entries, 
  onNewEntry, 
  onEditEntry, 
  onDeleteEntry 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  
  // Popup modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEntries, setModalEntries] = useState([]);
  const [activeModalEntryIndex, setActiveModalEntryIndex] = useState(0);
  const [modalView, setModalView] = useState('list'); // 'list' or 'detail'

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get local date string YYYY-MM-DD safely
  const getLocalDateString = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Group entries by date for fast lookup
  const entriesByDate = useMemo(() => {
    const mapping = {};
    entries.forEach(e => {
      if (e.date) {
        if (!mapping[e.date]) {
          mapping[e.date] = [];
        }
        mapping[e.date].push(e);
      }
    });
    return mapping;
  }, [entries]);

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = useMemo(() => {
    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: month === 0 
          ? getLocalDateString(year - 1, 11, daysInPrevMonth - i)
          : getLocalDateString(year, month - 1, daysInPrevMonth - i)
      });
    }
    return days;
  }, [year, month, firstDayIndex, daysInPrevMonth]);

  const currentMonthDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        dateStr: getLocalDateString(year, month, i)
      });
    }
    return days;
  }, [year, month, daysInMonth]);

  const nextMonthDays = useMemo(() => {
    const totalSlots = 42; // 6 rows of 7 days
    const remainingSlots = totalSlots - (prevMonthDays.length + currentMonthDays.length);
    const days = [];
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: month === 11
          ? getLocalDateString(year + 1, 0, i)
          : getLocalDateString(year, month + 1, i)
      });
    }
    return days;
  }, [prevMonthDays, currentMonthDays, year, month]);

  const allCalendarDays = useMemo(() => {
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [prevMonthDays, currentMonthDays, nextMonthDays]);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Generate year choices: past 10 years, future 5 years
  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 8; y <= currentYear + 4; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleMonthSelect = (e) => {
    setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearSelect = (e) => {
    setCurrentDate(new Date(parseInt(e.target.value), month, 1));
  };

  const handleDayClick = (day) => {
    const dayEntries = entriesByDate[day.dateStr] || [];
    setSelectedDateStr(day.dateStr);
    setModalView('list');
    
    if (dayEntries.length > 0) {
      setModalEntries(dayEntries);
      setActiveModalEntryIndex(0);
      setIsModalOpen(true);
    } else {
      // Allow user to write entry for this date if it's empty
      setModalEntries([]);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleEditFromModal = (entryId) => {
    setIsModalOpen(false);
    onEditEntry(entryId);
  };

  const handleDeleteFromModal = async (entryId) => {
    if (confirm('Are you sure you want to permanently erase this reflection?')) {
      setIsModalOpen(false);
      await onDeleteEntry(entryId);
    }
  };

  const handleNewEntryForDate = () => {
    setIsModalOpen(false);
    // Call onNewEntry but pass the selected date so editor can initialize with this date!
    onNewEntry({ initialDate: selectedDateStr });
  };

  const formatLongDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Determine active/highlighted entry in the popup modal
  const activeModalEntry = modalEntries[activeModalEntryIndex];

  // Helper to check if a date is "Today"
  const isToday = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  return (
    <div className="calendar-view-layout animate-fade-in">
      
      {/* Calendar Header Card */}
      <div className="calendar-header-card glass-panel">
        <div className="calendar-header-left">
          <div className="calendar-title-wrapper">
            <Calendar className="calendar-icon" size={24} />
            <h2 className="calendar-view-title">Reflections Calendar</h2>
          </div>
          <p className="calendar-view-subtitle">
            A chronological canvas of your mindfulness journey. Highlighted days contain reflections.
          </p>
        </div>
        
        {/* Navigation & Jump Dropdowns */}
        <div className="calendar-controls">
          <button className="secondary-btn icon-only-btn" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={18} />
          </button>
          
          <div className="select-dropdown-container">
            <select 
              value={month} 
              onChange={handleMonthSelect}
              className="filter-select calendar-select"
            >
              {monthsList.map((mName, index) => (
                <option key={index} value={index}>{mName}</option>
              ))}
            </select>

            <select 
              value={year} 
              onChange={handleYearSelect}
              className="filter-select calendar-select"
            >
              {yearsList.map((yNum) => (
                <option key={yNum} value={yNum}>{yNum}</option>
              ))}
            </select>
          </div>

          <button className="secondary-btn icon-only-btn" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={18} />
          </button>
          
          <button 
            className="secondary-btn today-btn" 
            onClick={() => setCurrentDate(new Date())}
            title="Go to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Grid Calendar Container */}
      <div className="calendar-grid-card glass-panel">
        {/* Days of Week Headers */}
        <div className="calendar-week-header">
          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(dName => (
            <div key={dName} className="week-day-label">
              <span className="full-name">{dName}</span>
              <span className="abbr-name">{dName.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="calendar-days-grid">
          {allCalendarDays.map((day, idx) => {
            const dayEntries = entriesByDate[day.dateStr] || [];
            const hasNotes = dayEntries.length > 0;
            const isDayToday = isToday(day.dateStr);
            const isDaySelected = selectedDateStr === day.dateStr;

            // Compute classnames dynamically
            let dayClassName = "calendar-day-cell";
            if (!day.isCurrentMonth) dayClassName += " other-month";
            if (hasNotes) dayClassName += " has-notes";
            else dayClassName += " no-notes";
            if (isDayToday) dayClassName += " today";
            if (isDaySelected) dayClassName += " selected";

            // If has notes, we want a special style. We can display mood mini emojis or note count
            const primaryMood = hasNotes ? dayEntries[0].mood : null;
            const moodEmoji = primaryMood && MOODS[primaryMood] ? MOODS[primaryMood].emoji : null;

            return (
              <div 
                key={idx}
                className={dayClassName}
                onClick={() => handleDayClick(day)}
                style={hasNotes ? {
                  '--day-theme-color': 'var(--color-accent)',
                  '--day-theme-color-rgb': 'var(--color-accent-rgb)'
                } : null}
              >
                {/* 1. DESKTOP VIEW: Detailed Card Content */}
                <div className="day-cell-desktop-content">
                  <div className="day-cell-header">
                    <span className="day-number">{day.dayNum}</span>
                    {isDayToday && <span className="today-badge">TODAY</span>}
                  </div>

                  {hasNotes && (
                    <div className="day-cell-content">
                      {/* Visual note indicator pills */}
                      <div className="notes-indicator-pill">
                        <span className="indicator-emoji">{moodEmoji || '✍️'}</span>
                        <span className="indicator-count">
                          {dayEntries.length === 1 ? '1 Reflection' : `${dayEntries.length} Logs`}
                        </span>
                      </div>

                      {/* Miniature title previews */}
                      <div className="day-mini-previews">
                        {dayEntries.map((e) => (
                          <div key={e.id} className="mini-title-line">
                            • {e.title || 'Untitled'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!hasNotes && day.isCurrentMonth && (
                    <div className="day-cell-empty-hover">
                      <Plus size={14} className="empty-add-icon" />
                      <span>Reflect</span>
                    </div>
                  )}
                </div>

                {/* 2. MOBILE VIEW: Minimal Centered Square Content */}
                <div className="day-cell-mobile-content">
                  <span className="day-number">{day.dayNum}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POPUP MODAL: Interactive reflection previewer */}
      {isModalOpen && (
        <div className="calendar-modal-backdrop" onClick={handleCloseModal}>
          <div className="calendar-modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-nav">
              <div className="modal-header-title-box">
                <Calendar size={18} className="modal-calendar-icon" />
                <span className="modal-header-date">{formatLongDate(selectedDateStr)}</span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal} title="Close popup">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-container">
              {modalEntries.length > 0 ? (
                modalView === 'list' ? (
                  <div className="modal-reflection-list">
                    {modalEntries.map((e, index) => {
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = e.content || '';
                      const plainText = tempDiv.textContent || tempDiv.innerText || '';
                      const truncatedExcerpt = plainText 
                        ? plainText.substring(0, 85) + (plainText.length > 85 ? '...' : '')
                        : 'No additional thoughts written...';
                      return (
                        <div 
                          key={e.id}
                          className="modal-reflection-list-item"
                          onClick={() => {
                            setActiveModalEntryIndex(index);
                            setModalView('detail');
                          }}
                        >
                          <div className="list-item-left">
                            <div className="list-item-emoji">{MOODS[e.mood]?.emoji || '✍️'}</div>
                          </div>
                          <div className="list-item-main">
                            <h4 className="list-item-title">{e.title || 'Untitled Reflection'}</h4>
                            <p className="list-item-excerpt">{truncatedExcerpt}</p>
                            <div className="list-item-footer">
                              {e.mood && <span className="badge">{MOODS[e.mood]?.label}</span>}
                              {e.weather && WEATHER[e.weather] && <span className="badge">{WEATHER[e.weather]?.emoji} {WEATHER[e.weather]?.label}</span>}
                              {e.wordCount > 0 && <span className="badge">{e.wordCount} words</span>}
                            </div>
                          </div>
                          <div className="list-item-arrow">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      className="secondary-btn create-reflection-inline-btn" 
                      onClick={handleNewEntryForDate}
                      style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
                    >
                      <Plus size={16} /> Write another reflection
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Active Note Content details */}
                    <div className="modal-note-card animate-fade-in">
                      {/* Back to List Button */}
                      <button 
                        className="secondary-btn modal-back-btn" 
                        onClick={() => setModalView('list')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginBottom: '1rem',
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          width: 'fit-content'
                        }}
                      >
                        <ChevronLeft size={14} /> Back to reflections list
                      </button>

                      <div className="modal-note-top-row">
                        <h3 className="modal-note-title">{activeModalEntry.title || 'Untitled Reflection'}</h3>
                        
                        <div className="modal-note-badges">
                          {MOODS[activeModalEntry.mood] && (
                            <span className="card-mood-badge">
                              {MOODS[activeModalEntry.mood].emoji} {MOODS[activeModalEntry.mood].label}
                            </span>
                          )}
                          {activeModalEntry.weather && WEATHER[activeModalEntry.weather] && (
                            <span className="card-mood-badge">
                              {WEATHER[activeModalEntry.weather].emoji} {WEATHER[activeModalEntry.weather].label}
                            </span>
                          )}
                          {activeModalEntry.wordCount > 0 && (
                            <span className="card-mood-badge" style={{ opacity: 0.8 }}>
                              <BookOpen size={10} /> {activeModalEntry.wordCount} words
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Attachment inside Modal if exists */}
                      {activeModalEntry.imageUrl && (
                        <div className="modal-note-image">
                          <img src={activeModalEntry.imageUrl} alt={activeModalEntry.title} />
                        </div>
                      )}

                      {/* Content Scroll Area */}
                      <div 
                        className={`modal-note-content font-${activeModalEntry.fontType || 'sans'}`}
                        dangerouslySetInnerHTML={{ __html: activeModalEntry.content || '<p style="color: var(--text-muted); font-style: italic;">No body text written.</p>' }}
                      />

                      {/* Action Bar inside Note */}
                      <div className="modal-note-footer">
                        <div className="modal-tags-row">
                          {activeModalEntry.tags?.map((t, idx) => (
                            <span key={idx} className="tag-pill">#{t}</span>
                          ))}
                        </div>

                        <div className="modal-actions-buttons">
                          <button 
                            className="secondary-btn danger-hover-btn"
                            onClick={() => handleDeleteFromModal(activeModalEntry.id)}
                            title="Erase reflection"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                          <button 
                            className="primary-btn"
                            onClick={() => handleEditFromModal(activeModalEntry.id)}
                            title="Open in Zen Editor"
                          >
                            <Edit size={14} />
                            Edit Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )
              ) : (
                /* Empty day placeholder inside Modal */
                <div className="modal-empty-day">
                  <div className="empty-day-icon">🍃</div>
                  <h3 className="empty-day-title">A Blank Slate</h3>
                  <p className="empty-day-desc">
                    No reflections were recorded on this day. Would you like to pause, take a deep breath, and write one now?
                  </p>
                  
                  <button className="primary-btn" onClick={handleNewEntryForDate}>
                    <Plus size={16} />
                    Write a Reflection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
