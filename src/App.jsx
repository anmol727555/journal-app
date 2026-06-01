import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  BookOpen, Compass, Award, Settings as SettingsIcon, 
  Menu, X, Sparkles, LogOut, User,
  ChevronLeft, ChevronRight, Calendar, Feather, Cloud,
  GitFork
} from 'lucide-react';

// Import Custom Utilities & Components
import { AmbientAudio } from './utils/audio';
import { GoogleDriveSync } from './utils/googleDrive';
import { analyzeContentForTags } from './utils/emotionLexicon';
import LockScreen from './components/LockScreen';
import Dashboard from './components/Dashboard';
import ZenEditor from './components/ZenEditor';

// Lazy loaded components
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Learning = lazy(() => import('./components/Learning'));
const SecondBrain = lazy(() => import('./components/SecondBrain'));

// Import Contexts & Hooks
import { useSettings } from './context/SettingsContext';
import { useJournalEntries } from './hooks/useJournalEntries';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';

export default function App() {
  const { 
    userName, setUserName,
    theme, setTheme,
    pin, setPin,
    isPinEnabled, setIsPinEnabled,
    isLocked, setIsLocked,
    isSidebarCollapsed, setIsSidebarCollapsed
  } = useSettings();

  const {
    entries, setEntries, saveEntry, deleteEntry, entriesRef,
    learningTopics, setLearningTopics, learningTopicsRef
  } = useJournalEntries();

  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const triggerToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  const {
    googleClientId, setGoogleClientId,
    googleFolderId, setGoogleFolderId,
    googleAccessToken, setGoogleAccessToken,
    googleTokenExpiry, setGoogleTokenExpiry,
    isGoogleConnected,
    syncStatus, setSyncStatus,
    handleSyncFromGoogleDrive,
    uploadLearningTopicsToDrive,
    downloadLearningTopicsFromDrive,
    syncToGoogleDrive,
    deleteFromGoogleDrive,
    googleAccessTokenRef,
    googleTokenExpiryRef,
    handleConnectGoogle,
    handleDisconnectGoogle,
    googleUserProfile
  } = useGoogleDriveSync(
    entries, setEntries, entriesRef,
    learningTopics, setLearningTopics, learningTopicsRef,
    triggerToast
  );

  // View States
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [newlySavedId, setNewlySavedId] = useState(null);

  // Sound States
  const [activeSounds, setActiveSounds] = useState({
    rain: false, fire: false, lofi: false, forest: false
  });
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    AmbientAudio.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (isGoogleConnected && currentView === 'login') {
      setCurrentView('dashboard');
    }
  }, [isGoogleConnected, currentView]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Google OAuth connection, mount-checks, and background silent refreshes are fully handled by the useGoogleDriveSync hook

  // Wrapper for updating topics locally and triggering background auto-sync to cloud
  const updateAndSyncLearningTopics = (newTopicsOrUpdater) => {
    let updated;
    if (typeof newTopicsOrUpdater === 'function') {
      updated = newTopicsOrUpdater(learningTopicsRef.current);
    } else {
      updated = newTopicsOrUpdater;
    }
    setLearningTopics(updated);
    if (googleAccessTokenRef.current && Date.now() < googleTokenExpiryRef.current) {
      uploadLearningTopicsToDrive(updated);
    }
  };

  // Editor Actions
  const handleSaveEntry = async (savedData) => {
    // Map of moods to corresponding tags to enrich graph interlinking automatically
    const moodTagMap = {
      happy: 'joy',
      calm: 'peace',
      energetic: 'energy',
      pensive: 'reflection',
      anxious: 'anxiety',
      sad: 'sadness'
    };

    let updatedTags = savedData.tags ? [...savedData.tags] : [];
    if (savedData.mood && moodTagMap[savedData.mood]) {
      const targetTag = moodTagMap[savedData.mood];
      if (!updatedTags.includes(targetTag)) {
        updatedTags.push(targetTag);
      }
    }

    // Auto-tagging engine: If the user didn't specify a mood AND did not add any tags
    // (or the only tag is the default 'synced' tag), run the lexicon-based scanner over the text content.
    if ((!savedData.mood || savedData.mood.trim() === '') && 
        (updatedTags.length === 0 || (updatedTags.length === 1 && updatedTags[0] === 'synced'))) {
      const inferredTags = analyzeContentForTags(savedData.content);
      if (inferredTags.length > 0) {
        updatedTags = inferredTags;
      }
    }

    const finalData = {
      ...savedData,
      tags: updatedTags
    };

    const targetEntry = await saveEntry(finalData);
    
    setEditingEntry(null);
    setCurrentView('dashboard');
    setSelectedEntryId(targetEntry.id);
    setNewlySavedId(targetEntry.id);
    setTimeout(() => setNewlySavedId(null), 2000);

    if (googleAccessToken && Date.now() < googleTokenExpiry) {
      syncToGoogleDrive(targetEntry, googleAccessToken, googleFolderId);
    }
  };

  const handleEditEntry = (entryId) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setEditingEntry(entry);
      setCurrentView('editor');
    }
  };

  const handleNewEntry = (options) => {
    setEditingEntry(options && options.initialDate ? { date: options.initialDate } : null);
    setCurrentView('editor');
  };

  const handleDeleteEntry = async (entryId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return false;
    if (confirm('Are you sure you want to permanently erase this reflection?')) {
      await deleteEntry(entryId);
      setEditingEntry(null);
      setCurrentView('dashboard');
      if (googleAccessToken && Date.now() < googleTokenExpiry) {
        deleteFromGoogleDrive(entry, googleAccessToken);
      }
      return true;
    }
    return false;
  };



  const handleImportBackup = (importedEntries) => {
    const merged = [...entries];
    importedEntries.forEach(imp => {
      if (!merged.some(m => m.date === imp.date && m.title === imp.title)) {
        merged.push({
          ...imp,
          id: imp.id || 'journal-' + Date.now() + Math.random().toString(36).substr(2, 5),
          googleFileId: imp.googleFileId || ''
        });
      }
    });
    setEntries(merged);
  };

  const handleClearAllData = () => {
    setEntries([]);
    setLearningTopics([]);
    setUserName('reflective mind');
    setTheme('theme-midnight');
    setPin('');
    setIsPinEnabled(false);
    setIsLocked(false);
    AmbientAudio.stopAll();
    handleDisconnectGoogle();
    setGoogleClientId('');
    setGoogleFolderId('1g4ATsJ7T3ri1aPzyvzHmeP1P7L5d5DVQ');
    setActiveSounds({ rain: false, fire: false, lofi: false, forest: false });
    localStorage.clear();
  };

  if (isLocked) {
    return <LockScreen correctPin={pin} onUnlock={() => setIsLocked(false)} />;
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Journal Logs', icon: BookOpen },
    { id: 'learning', label: 'Learning Hub', icon: Compass },
    { id: 'calendar', label: 'Calendar Grid', icon: Calendar },
    { id: 'brain', label: 'Second Brain', icon: GitFork },
    { id: 'analytics', label: 'Insights', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  const renderGoogleSyncButton = (isMobile = false) => {
    if (!googleClientId) return null;

    if (isGoogleConnected && googleUserProfile) {
      return (
        <button 
          onClick={() => {
            setCurrentView('profile');
            setIsMobileMenuOpen(false);
          }}
          className="google-profile-header-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)',
            padding: '0.45rem 0.8rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            marginRight: isMobile ? '0.5rem' : '0',
            width: isSidebarCollapsed && !isMobile ? '38px' : 'auto',
            height: '38px',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
          title={`Logged in as ${googleUserProfile.name}. Click to view Profile.`}
        >
          {googleUserProfile.picture ? (
            <img 
              src={googleUserProfile.picture} 
              alt={googleUserProfile.name} 
              style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <User size={14} style={{ color: 'var(--text-primary)' }} />
          )}
          {(!isSidebarCollapsed || isMobile) && (
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>
              {googleUserProfile.name}
            </span>
          )}
        </button>
      );
    }

    return (
      <button 
        onClick={() => {
          setCurrentView('login');
          setIsMobileMenuOpen(false);
        }}
        className="google-login-header-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-primary)',
          padding: '0.45rem 1rem',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          marginRight: isMobile ? '0.5rem' : '0',
          justifyContent: 'center',
          width: isSidebarCollapsed && !isMobile ? '38px' : 'auto',
          height: '38px'
        }}
        title="Log in to your Google Account"
      >
        <User size={14} style={{ color: 'var(--text-muted)' }} />
        {(!isSidebarCollapsed || isMobile) && 'Login'}
      </button>
    );
  };

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div className="brand-logo" style={{ margin: 0 }}>
          <Feather size={20} style={{ color: '#FCD34D' }} />
          <span>Reflections</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {renderGoogleSyncButton(true)}
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`sidebar-nav ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          <div className="brand-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.25rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Feather size={22} style={{ color: '#FCD34D' }} />
              {!isSidebarCollapsed && <span>Reflections</span>}
            </div>
            <button className="sidebar-collapse-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <div style={{ padding: isSidebarCollapsed ? '0' : '0 0.5rem', marginBottom: '1.75rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
            {renderGoogleSyncButton(false)}
          </div>

          <nav>
            <ul className="nav-links">
              {navigationItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <li key={item.id}>
                    <button 
                      className={`nav-button ${currentView === item.id ? 'active' : ''}`}
                      onClick={() => { setCurrentView(item.id); setIsMobileMenuOpen(false); }}
                      style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
                    >
                      <IconComponent size={18} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div>
          {pin && isPinEnabled && (
            <button 
              className="nav-button" 
              style={{ marginBottom: '1.25rem', border: '1px solid var(--border-glass)', borderRadius: '12px', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}
              onClick={() => setIsLocked(true)}
            >
              <LogOut size={16} />
              {!isSidebarCollapsed && <span>Lock Journal</span>}
            </button>
          )}
          <div className="theme-picker-container">
            {!isSidebarCollapsed && <div className="picker-title">Reflective Mood Themes</div>}
            <div className="theme-options">
              {[
                { id: 'theme-midnight', label: 'Midnight Glass', val: 'circle-midnight' },
                { id: 'theme-amber', label: 'Cozy Amber', val: 'circle-amber' },
                { id: 'theme-aurora', label: 'Aurora Emerald', val: 'circle-aurora' },
                { id: 'theme-solar', label: 'Solarized Light', val: 'circle-solar' }
              ].map(opt => (
                <div key={opt.id} className={`theme-circle ${opt.val} ${theme === opt.id ? 'active' : ''}`} onClick={() => setTheme(opt.id)}>
                  <span className="theme-tooltip">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Suspense fallback={<div className="loading-state">Loading reflection...</div>}>
          {currentView === 'dashboard' && (
            <Dashboard 
              entries={entries} onNewEntry={handleNewEntry} onEditEntry={handleEditEntry} onDelete={handleDeleteEntry}
              selectedId={selectedEntryId} setSelectedId={setSelectedEntryId} newlySavedId={newlySavedId}
            />
          )}
          {currentView === 'editor' && (
            <ZenEditor 
              entry={editingEntry} onSave={handleSaveEntry} onCancel={() => { setEditingEntry(null); setCurrentView('dashboard'); }}
              onDelete={handleDeleteEntry} isGoogleConnected={isGoogleConnected} syncStatus={syncStatus}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView entries={entries} onNewEntry={handleNewEntry} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} />
          )}
          {currentView === 'brain' && (
            <SecondBrain entries={entries} onNewEntry={handleNewEntry} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} />
          )}
          {currentView === 'learning' && <Learning topics={learningTopics} setTopics={updateAndSyncLearningTopics} />}
          {currentView === 'analytics' && <Analytics entries={entries} />}
          {currentView === 'settings' && (
            <Settings 
              userName={userName} setUserName={setUserName} pin={pin} setPin={setPin} isPinEnabled={isPinEnabled} setIsPinEnabled={setIsPinEnabled}
              entries={entries} onImportBackup={handleImportBackup} onClearAllData={handleClearAllData}
              googleClientId={googleClientId} setGoogleClientId={setGoogleClientId}
              isGoogleConnected={isGoogleConnected}
              onConnectGoogle={handleConnectGoogle} onDisconnectGoogle={handleDisconnectGoogle}
              onSyncFromGoogleDrive={() => { handleSyncFromGoogleDrive(googleAccessToken, googleFolderId); downloadLearningTopicsFromDrive(googleAccessToken); }}
              syncStatus={syncStatus}
            />
          )}
          {currentView === 'login' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', maxWidth: '440px', margin: '4rem auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center', borderColor: 'var(--border-glass-active)' }}>
              <div style={{ fontSize: '3rem', animation: 'float 4s ease-in-out infinite', marginBottom: '0.5rem' }}>☁️</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Access Your Reflections</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0.25rem 0 0.75rem 0' }}>
                Log in with your Google account to secure your reflections, sync study habits, and enable automatic cloud backups across all of your devices.
              </p>
              <button 
                className="primary-btn" 
                onClick={handleConnectGoogle}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.65rem', 
                  padding: '0.75rem 1.5rem', 
                  fontSize: '0.9rem', 
                  fontWeight: 700,
                  background: 'var(--text-primary)',
                  color: 'var(--bg-secondary)',
                  boxShadow: '0 4px 20px rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Login with Google Account
              </button>
              <button 
                className="secondary-btn" 
                onClick={() => setCurrentView('dashboard')}
                style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}
              >
                Cancel
              </button>
            </div>
          )}
          {currentView === 'profile' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem 2.5rem', maxWidth: '460px', margin: '4rem auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', borderColor: 'var(--border-glass-active)', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                {isGoogleConnected && googleUserProfile?.picture ? (
                  <img 
                    src={googleUserProfile.picture} 
                    alt={googleUserProfile.name} 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass-active)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                  />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', border: '1px solid var(--border-glass)' }}>👤</div>
                )}
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                    {isGoogleConnected && googleUserProfile ? googleUserProfile.name : 'My Profile'}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Google Connected Account
                  </p>
                </div>
              </div>

              {/* Minimalist Profile Section - Kept blank as requested */}
              <div style={{ width: '100%', height: '1px', background: 'var(--border-glass)', margin: '0.5rem 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                <button 
                  className="primary-btn" 
                  onClick={() => setCurrentView('dashboard')}
                  style={{ justifyContent: 'center', width: '100%', padding: '0.75rem' }}
                >
                  Back to Dashboard
                </button>
                
                {isGoogleConnected && (
                  <button 
                    className="secondary-btn" 
                    onClick={() => { handleDisconnectGoogle(); setCurrentView('dashboard'); }}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(0, 85%, 65%)', justifyContent: 'center', width: '100%', padding: '0.75rem' }}
                  >
                    Disconnect Google Account
                  </button>
                )}
              </div>
            </div>
          )}
        </Suspense>
      </main>

      {toast.show && (
        <div className="glass-panel" style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.5rem', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '0.75rem', borderColor: toast.type === 'success' ? 'var(--color-accent)' : toast.type === 'error' ? 'hsl(0, 85%, 60%)' : 'var(--border-glass-active)', backgroundColor: toast.type === 'success' ? 'rgba(var(--color-accent-rgb), 0.12)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-glass)', boxShadow: '0 8px 32px var(--shadow-color)', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <Sparkles size={16} style={{ color: toast.type === 'success' ? 'var(--color-accent)' : toast.type === 'error' ? 'hsl(0, 85%, 60%)' : 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
