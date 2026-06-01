import { useState, useEffect, lazy, Suspense } from 'react';
import { 
  BookOpen, Compass, Award, Settings as SettingsIcon, 
  Menu, X, Sparkles, LogOut,
  ChevronLeft, ChevronRight, Calendar, Feather
} from 'lucide-react';

// Import Custom Utilities & Components
import { AmbientAudio } from './utils/audio';
import { GoogleDriveSync } from './utils/googleDrive';
import LockScreen from './components/LockScreen';
import Dashboard from './components/Dashboard';
import ZenEditor from './components/ZenEditor';

// Lazy loaded components
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const Learning = lazy(() => import('./components/Learning'));

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
    googleClientSecret, setGoogleClientSecret,
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
    googleTokenExpiryRef
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Parse URL query params for Google Auth or silent refresh
  useEffect(() => {
    const parseAuthAndRefresh = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const returnedState = urlParams.get('state');
      const savedClientId = localStorage.getItem('solace_google_client_id') || '';
      const savedClientSecret = localStorage.getItem('solace_google_client_secret') || '';
      const redirectUri = window.location.origin + window.location.pathname;

      if (code && savedClientId) {
        try {
          setSyncStatus('syncing');
          const tokens = await GoogleDriveSync.exchangeCodeForTokens(savedClientId, savedClientSecret, redirectUri, code);
          const expiryTime = Date.now() + parseInt(tokens.expires_in) * 1000;
          setGoogleAccessToken(tokens.access_token);
          setGoogleTokenExpiry(expiryTime);
          if (tokens.refresh_token) localStorage.setItem('solace_google_refresh_token', tokens.refresh_token);
          const currentFolderId = returnedState || googleFolderId;
          if (returnedState) {
            setGoogleFolderId(returnedState);
            localStorage.setItem('solace_google_folder_id', returnedState);
          }
          window.history.replaceState(null, null, window.location.pathname);
          setSyncStatus('synced');
          triggerToast('Google Drive permanently connected!', 'success');
          handleSyncFromGoogleDrive(tokens.access_token, currentFolderId);
          downloadLearningTopicsFromDrive(tokens.access_token);
        } catch (err) {
          console.error('Failed to exchange auth code:', err);
          setSyncStatus('error');
          triggerToast(`Failed to connect Google Drive: ${err.message}`, 'error');
        }
      } else {
        const savedToken = sessionStorage.getItem('solace_google_access_token');
        const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');
        const savedRefreshToken = localStorage.getItem('solace_google_refresh_token');
        if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
          setGoogleAccessToken(savedToken);
          setGoogleTokenExpiry(parseInt(savedExpiry));
          handleSyncFromGoogleDrive(savedToken, googleFolderId);
          downloadLearningTopicsFromDrive(savedToken);
        } else if (savedRefreshToken && savedClientId) {
          try {
            const freshTokens = await GoogleDriveSync.refreshAccessToken(savedClientId, savedClientSecret, savedRefreshToken);
            const expiryTime = Date.now() + parseInt(freshTokens.expires_in) * 1000;
            setGoogleAccessToken(freshTokens.access_token);
            setGoogleTokenExpiry(expiryTime);
            triggerToast('Background Google Drive sync resumed.', 'success');
            handleSyncFromGoogleDrive(freshTokens.access_token, googleFolderId);
            downloadLearningTopicsFromDrive(freshTokens.access_token);
          } catch (err) {
            console.error('Failed to silently refresh access token:', err);
          }
        }
      }
    };
    parseAuthAndRefresh();
  }, []);

  // 1.5 Background Silent Token Refresher
  useEffect(() => {
    const savedRefreshToken = localStorage.getItem('solace_google_refresh_token');
    if (!savedRefreshToken || !googleClientId) return;
    const checkAndRefresh = async () => {
      const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');
      if (!savedExpiry) return;
      const timeRemaining = parseInt(savedExpiry) - Date.now();
      const tenMinutes = 10 * 60 * 1000;
      if (timeRemaining < tenMinutes) {
        try {
          const freshTokens = await GoogleDriveSync.refreshAccessToken(googleClientId, googleClientSecret, savedRefreshToken);
          const expiryTime = Date.now() + parseInt(freshTokens.expires_in) * 1000;
          setGoogleAccessToken(freshTokens.access_token);
          setGoogleTokenExpiry(expiryTime);
        } catch (err) {
          console.error('Failed to background refresh Google access token:', err);
        }
      }
    };
    const interval = setInterval(checkAndRefresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [googleClientId, googleClientSecret]);

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
    const targetEntry = await saveEntry(savedData);
    
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

  const handleConnectGoogle = () => {
    if (!googleClientId) {
      alert('Please configure your Google Client ID inside settings before connecting.');
      setCurrentView('settings');
      return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = GoogleDriveSync.getAuthUrl(googleClientId, redirectUri, googleFolderId);
  };

  const handleDisconnectGoogle = () => {
    setGoogleAccessToken('');
    setGoogleTokenExpiry(0);
    sessionStorage.removeItem('solace_google_access_token');
    sessionStorage.removeItem('solace_google_token_expiry');
    localStorage.removeItem('solace_google_refresh_token');
    triggerToast('Google Drive disconnected.', 'info');
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
    { id: 'analytics', label: 'Insights', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div className="brand-logo" style={{ margin: 0 }}>
          <Feather size={20} style={{ color: '#FCD34D' }} />
          <span>Reflections</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {isMobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />}

      <aside className={`sidebar-nav ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          <div className="brand-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2.5rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Feather size={22} style={{ color: '#FCD34D' }} />
              {!isSidebarCollapsed && <span>Reflections</span>}
            </div>
            <button className="sidebar-collapse-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
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
          {currentView === 'learning' && <Learning topics={learningTopics} setTopics={updateAndSyncLearningTopics} />}
          {currentView === 'analytics' && <Analytics entries={entries} />}
          {currentView === 'settings' && (
            <Settings 
              userName={userName} setUserName={setUserName} pin={pin} setPin={setPin} isPinEnabled={isPinEnabled} setIsPinEnabled={setIsPinEnabled}
              entries={entries} onImportBackup={handleImportBackup} onClearAllData={handleClearAllData}
              googleClientId={googleClientId} setGoogleClientId={setGoogleClientId} googleClientSecret={googleClientSecret} setGoogleClientSecret={setGoogleClientSecret}
              googleFolderId={googleFolderId} setGoogleFolderId={setGoogleFolderId} isGoogleConnected={isGoogleConnected}
              onConnectGoogle={handleConnectGoogle} onDisconnectGoogle={handleDisconnectGoogle}
              onSyncFromGoogleDrive={() => { handleSyncFromGoogleDrive(googleAccessToken, googleFolderId); downloadLearningTopicsFromDrive(googleAccessToken); }}
              syncStatus={syncStatus}
            />
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
