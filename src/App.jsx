import { useState, useEffect, useRef } from 'react';
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
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import CalendarView from './components/CalendarView';
import Learning from './components/Learning';

// Default mock journals to populate the dashboard on first visit
const DEFAULT_JOURNALS = [
  {
    id: 'mock-1',
    title: 'Echoes of the Rain',
    content: "There's a gentle rhythm to the rainfall today that feels like an invitation to slow down. I sat by the window for thirty minutes with a cup of warm chamomile tea, listening to the drops collide with the glass. I realized how rarely I just... listen. I am so caught up in planning and execution that the present slipstream flows right past. Today, I choose silence. I choose to be present in this gray, atmospheric warmth.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0], // 3 days ago
    mood: 'calm',
    weather: 'rainy',
    tags: ['mindfulness', 'reflection', 'peace'],
    imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80',
    fontType: 'serif',
    wordCount: 88,
    googleFileId: ''
  },
  {
    id: 'mock-2',
    title: 'Stepping into the Sunlight',
    content: 'Woke up today with an unusual surge of vital energy! The weather outside is pristine—crisp morning air with gorgeous honey-colored sunlight flooding the street. I went for a brief 20-minute jog in the park and noticed wild honeysuckles blooming. It felt like a chemical reset. I want to bottle this pensive gratitude and keep it close for days when the fog rolls in.',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    mood: 'energetic',
    weather: 'sunny',
    tags: ['fitness', 'morning', 'joy'],
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    fontType: 'sans',
    wordCount: 79,
    googleFileId: ''
  }
];

export default function App() {
  // Global States
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('solace_journal_entries');
    return saved ? JSON.parse(saved) : DEFAULT_JOURNALS;
  });

  const [learningTopics, setLearningTopics] = useState(() => {
    const saved = localStorage.getItem('solace_learning_topics');
    return saved ? JSON.parse(saved) : [];
  });

  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const learningTopicsRef = useRef(learningTopics);
  useEffect(() => {
    learningTopicsRef.current = learningTopics;
  }, [learningTopics]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [newlySavedId, setNewlySavedId] = useState(null);
  
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('solace_userName') || 'reflective mind';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('solace_theme') || 'theme-midnight';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('solace_sidebar_collapsed') === 'true';
  });

  // Security States
  const [pin, setPin] = useState(() => {
    return localStorage.getItem('solace_pin') || '';
  });
  const [isPinEnabled, setIsPinEnabled] = useState(() => {
    return localStorage.getItem('solace_pin_enabled') === 'true';
  });
  const [isLocked, setIsLocked] = useState(() => {
    const enabled = localStorage.getItem('solace_pin_enabled') === 'true';
    const hasPin = !!localStorage.getItem('solace_pin');
    return enabled && hasPin;
  });

  // Google Drive Sync States
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('solace_google_client_id') || '';
  });
  const [googleClientSecret, setGoogleClientSecret] = useState(() => {
    return localStorage.getItem('solace_google_client_secret') || '';
  });
  const [googleFolderId, setGoogleFolderId] = useState(() => {
    return localStorage.getItem('solace_google_folder_id') || '1g4ATsJ7T3ri1aPzyvzHmeP1P7L5d5DVQ';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState(() => {
    return sessionStorage.getItem('solace_google_access_token') || '';
  });
  const [googleTokenExpiry, setGoogleTokenExpiry] = useState(() => {
    const saved = sessionStorage.getItem('solace_google_token_expiry');
    return saved ? parseInt(saved) : 0;
  });

  const isGoogleConnected = !!googleAccessToken && googleTokenExpiry > 0;

  const googleAccessTokenRef = useRef(googleAccessToken);
  useEffect(() => {
    googleAccessTokenRef.current = googleAccessToken;
  }, [googleAccessToken]);

  const googleTokenExpiryRef = useRef(googleTokenExpiry);
  useEffect(() => {
    googleTokenExpiryRef.current = googleTokenExpiry;
  }, [googleTokenExpiry]);

  // Sync statuses: 'idle', 'syncing', 'synced', 'error'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Sound States
  const [activeSounds, setActiveSounds] = useState({
    rain: false,
    fire: false,
    lofi: false,
    forest: false
  });
  // eslint-disable-next-line no-unused-vars
  const [volume, setVolume] = useState(0.5);

  // Trigger floating visual toasts
  const triggerToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Background Google Drive Pull Synchronizer (Two-way sync: Drive to App)
  const handleSyncFromGoogleDrive = async (token, folderId) => {
    if (!token || !folderId) return;

    setSyncStatus('syncing');
    try {
      // 1. List all docs in the Drive folder
      const driveFiles = await GoogleDriveSync.listGoogleDocs(token, folderId);
      const driveFileIds = new Set(driveFiles.map(f => f.id));
      const driveFilesMap = new Map(driveFiles.map(f => [f.id, f]));

      let currentEntries = [...entriesRef.current];
      let hasChanges = false;

      // 2. Process Deletions: if a local entry has googleFileId, but it's not on Drive, remove it!
      const initialCount = currentEntries.length;
      currentEntries = currentEntries.filter(entry => {
        if (entry.googleFileId && !driveFileIds.has(entry.googleFileId)) {
          hasChanges = true;
          return false;
        }
        return true;
      });
      const deletedCount = initialCount - currentEntries.length;

      // 3. Separate files into new vs updated
      const localFileIds = new Set(currentEntries.map(e => e.googleFileId).filter(Boolean));
      const newDriveFiles = driveFiles.filter(f => !localFileIds.has(f.id));
      const updatedDriveFiles = [];

      for (const entry of currentEntries) {
        if (entry.googleFileId) {
          const driveFile = driveFilesMap.get(entry.googleFileId);
          if (driveFile && driveFile.modifiedTime !== entry.googleLastSynced) {
            updatedDriveFiles.push({ entry, driveFile });
          }
        }
      }

      // 4. Download content for updated files
      for (const item of updatedDriveFiles) {
        try {
          const parsed = await GoogleDriveSync.downloadAndParseGoogleDoc(token, item.driveFile.id, item.driveFile.name);
          currentEntries = currentEntries.map(e => {
            if (e.googleFileId === item.driveFile.id) {
              hasChanges = true;
              return {
                ...e,
                title: item.driveFile.name,
                content: parsed.content,
                imageUrl: parsed.imageUrl || e.imageUrl,
                wordCount: parsed.content.split(/\s+/).filter(Boolean).length,
                googleLastSynced: item.driveFile.modifiedTime
              };
            }
            return e;
          });
        } catch (err) {
          console.error(`Failed to download updated file ${item.driveFile.id}:`, err);
        }
      }

      // 5. Download content for new files
      for (const file of newDriveFiles) {
        try {
          const parsed = await GoogleDriveSync.downloadAndParseGoogleDoc(token, file.id, file.name);
          const newEntry = {
            id: 'journal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            title: file.name,
            content: parsed.content,
            date: new Date(file.modifiedTime || Date.now()).toISOString().split('T')[0],
            mood: '',
            weather: '',
            tags: ['synced'],
            imageUrl: parsed.imageUrl || '',
            fontType: 'serif',
            wordCount: parsed.content.split(/\s+/).filter(Boolean).length,
            googleFileId: file.id,
            googleLastSynced: file.modifiedTime
          };
          currentEntries = [newEntry, ...currentEntries];
          hasChanges = true;
        } catch (err) {
          console.error(`Failed to download new file ${file.id}:`, err);
        }
      }

      if (hasChanges) {
        setEntries(currentEntries);
        setSyncStatus('synced');

        let message = 'Sync complete!';
        if (deletedCount > 0) message += ` Removed ${deletedCount} deleted notes.`;
        if (newDriveFiles.length > 0) message += ` Created ${newDriveFiles.length} new notes.`;
        if (updatedDriveFiles.length > 0) message += ` Updated ${updatedDriveFiles.length} notes.`;

        triggerToast(message, 'success');
      } else {
        setSyncStatus('synced');
        triggerToast('Journal is up to date with Google Drive.', 'success');
      }
    } catch (err) {
      console.error('Failed to sync from Google Drive:', err);
      setSyncStatus('error');
      triggerToast(`Sync failed: ${err.message}`, 'error');
    }
  };

  // Upload Learning Hub DB content to Google Drive in the background (auto-sync on save)
  const uploadLearningTopicsToDrive = async (topicsList) => {
    const currentToken = googleAccessTokenRef.current;
    const currentExpiry = googleTokenExpiryRef.current;

    if (!currentToken || Date.now() >= currentExpiry) return;

    const learningFolderId = '1_8_h0G4122Ls4Srrcf23z2ea9Y8WzXRQ';
    const filename = 'learning_data.db';

    try {
      setSyncStatus('syncing');
      const files = await GoogleDriveSync.findFileByName(currentToken, learningFolderId, filename);
      const fileContent = JSON.stringify(topicsList);

      if (files.length > 0) {
        // Sort newest modified first
        const sortedFiles = [...files].sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
        const fileId = sortedFiles[0].id;
        
        await GoogleDriveSync.updateCustomFileContent(currentToken, fileId, 'application/json', fileContent);
        
        // Auto de-duplicate: delete older files with the same name asynchronously in the background
        if (sortedFiles.length > 1) {
          console.warn(`Found ${sortedFiles.length} duplicate database files. Self-healing...`);
          for (let i = 1; i < sortedFiles.length; i++) {
            GoogleDriveSync.deleteGoogleDoc(currentToken, sortedFiles[i].id)
              .then(() => console.log(`Successfully purged duplicate database file: ${sortedFiles[i].id}`))
              .catch(err => console.error('Failed to purge duplicate file:', err));
          }
        }
        console.log('Learning Hub DB synchronized successfully.');
      } else {
        await GoogleDriveSync.createCustomFile(currentToken, learningFolderId, filename, 'application/json', fileContent);
        triggerToast('Learning Hub DB created on Google Drive!', 'success');
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to auto-sync Learning Hub DB to Drive:', err);
      setSyncStatus('error');
    }
  };

  // Download Learning Hub DB content from Google Drive and overwrite local state (Pull sync)
  const downloadLearningTopicsFromDrive = async (token) => {
    if (!token) return;

    const learningFolderId = '1_8_h0G4122Ls4Srrcf23z2ea9Y8WzXRQ';
    const filename = 'learning_data.db';

    try {
      setSyncStatus('syncing');
      const files = await GoogleDriveSync.findFileByName(token, learningFolderId, filename);

      if (files.length > 0) {
        // Sort newest modified first
        const sortedFiles = [...files].sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
        const fileId = sortedFiles[0].id;
        
        const rawContent = await GoogleDriveSync.downloadCustomFileContent(token, fileId);

        let remoteTopics = [];
        try {
          if (rawContent && rawContent.trim()) {
            remoteTopics = JSON.parse(rawContent);
          }
        } catch (parseErr) {
          console.error('Failed to parse remote Learning Hub DB:', parseErr);
        }

        // Overwrite local topics state with remote cloud database content
        if (remoteTopics && Array.isArray(remoteTopics)) {
          setLearningTopics(remoteTopics);
        }

        // Auto de-duplicate: delete older files with the same name asynchronously in the background
        if (sortedFiles.length > 1) {
          console.warn(`Found ${sortedFiles.length} duplicate database files. Self-healing...`);
          for (let i = 1; i < sortedFiles.length; i++) {
            GoogleDriveSync.deleteGoogleDoc(token, sortedFiles[i].id)
              .then(() => console.log(`Successfully purged duplicate database file: ${sortedFiles[i].id}`))
              .catch(err => console.error('Failed to purge duplicate file:', err));
          }
        }

        triggerToast('Learning Hub DB synchronized with Google Drive.', 'success');
      } else {
        // DO NOT upload or overwrite remote database on download/pull if it does not exist!
        console.log('No Learning Hub DB found on Google Drive.');
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to download & sync Learning Hub DB:', err);
      setSyncStatus('error');
    }
  };

  // Wrapper for updating topics locally and triggering background auto-sync to cloud
  const updateAndSyncLearningTopics = (newTopicsOrUpdater) => {
    let updated;
    if (typeof newTopicsOrUpdater === 'function') {
      updated = newTopicsOrUpdater(learningTopicsRef.current);
    } else {
      updated = newTopicsOrUpdater;
    }

    // Update ref immediately so any subsequent rapid calls get the fresh state!
    learningTopicsRef.current = updated;
    setLearningTopics(updated);

    const currentToken = googleAccessTokenRef.current;
    const currentExpiry = googleTokenExpiryRef.current;

    if (currentToken && Date.now() < currentExpiry) {
      uploadLearningTopicsToDrive(updated);
    }
  };

  // Handle ambient volume synchronization
  useEffect(() => {
    AmbientAudio.setVolume(volume);
  }, [volume]);

  // Mobile navigation drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Parse URL query params to capture Google Authorization Code or handle silent refresh on mount
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
          const tokens = await GoogleDriveSync.exchangeCodeForTokens(
            savedClientId,
            savedClientSecret,
            redirectUri,
            code
          );

          const expiryTime = Date.now() + parseInt(tokens.expires_in) * 1000;
          setGoogleAccessToken(tokens.access_token);
          setGoogleTokenExpiry(expiryTime);
          
          sessionStorage.setItem('solace_google_access_token', tokens.access_token);
          sessionStorage.setItem('solace_google_token_expiry', expiryTime.toString());

          // Save refresh token securely in localStorage for permanent login!
          if (tokens.refresh_token) {
            localStorage.setItem('solace_google_refresh_token', tokens.refresh_token);
          }

          const currentFolderId = returnedState || googleFolderId;
          if (returnedState) {
            setGoogleFolderId(returnedState);
            localStorage.setItem('solace_google_folder_id', returnedState);
          }

          // Clean URL query parameters from address bar
          window.history.replaceState(
            null,
            null,
            window.location.pathname
          );

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
        // No code, check if we already have an active access token
        const savedToken = sessionStorage.getItem('solace_google_access_token');
        const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');
        const savedRefreshToken = localStorage.getItem('solace_google_refresh_token');

        if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
          // Token is still valid! Load it.
          setGoogleAccessToken(savedToken);
          setGoogleTokenExpiry(parseInt(savedExpiry));
          handleSyncFromGoogleDrive(savedToken, googleFolderId);
          downloadLearningTopicsFromDrive(savedToken);
        } else if (savedRefreshToken && savedClientId) {
          // Token expired or missing, but we have a refresh token! Run silent refresh.
          try {
            const freshTokens = await GoogleDriveSync.refreshAccessToken(
              savedClientId,
              savedClientSecret,
              savedRefreshToken
            );

            const expiryTime = Date.now() + parseInt(freshTokens.expires_in) * 1000;
            setGoogleAccessToken(freshTokens.access_token);
            setGoogleTokenExpiry(expiryTime);
            
            sessionStorage.setItem('solace_google_access_token', freshTokens.access_token);
            sessionStorage.setItem('solace_google_token_expiry', expiryTime.toString());
            
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1.5 Background Silent Token Refresher (Interval runs every 60 seconds)
  useEffect(() => {
    const savedRefreshToken = localStorage.getItem('solace_google_refresh_token');
    if (!savedRefreshToken || !googleClientId) return;

    const checkAndRefresh = async () => {
      const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');
      if (!savedExpiry) return;

      const timeRemaining = parseInt(savedExpiry) - Date.now();
      const tenMinutes = 10 * 60 * 1000;

      // If less than 10 minutes remaining, refresh silently in the background!
      if (timeRemaining < tenMinutes) {
        try {
          const freshTokens = await GoogleDriveSync.refreshAccessToken(
            googleClientId,
            googleClientSecret,
            savedRefreshToken
          );

          const expiryTime = Date.now() + parseInt(freshTokens.expires_in) * 1000;
          setGoogleAccessToken(freshTokens.access_token);
          setGoogleTokenExpiry(expiryTime);
          
          sessionStorage.setItem('solace_google_access_token', freshTokens.access_token);
          sessionStorage.setItem('solace_google_token_expiry', expiryTime.toString());
        } catch (err) {
          console.error('Failed to background refresh Google access token:', err);
        }
      }
    };

    const interval = setInterval(checkAndRefresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [googleClientId, googleClientSecret]);

  // 2. Sync entries to localStorage
  useEffect(() => {
    localStorage.setItem('solace_journal_entries', JSON.stringify(entries));
  }, [entries]);

  // Sync learning topics to localStorage
  useEffect(() => {
    localStorage.setItem('solace_learning_topics', JSON.stringify(learningTopics));
  }, [learningTopics]);

  // 3. Sync configurations to localStorage
  useEffect(() => {
    localStorage.setItem('solace_userName', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('solace_theme', theme);
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('solace_pin', pin);
  }, [pin]);

  useEffect(() => {
    localStorage.setItem('solace_pin_enabled', isPinEnabled.toString());
  }, [isPinEnabled]);

  useEffect(() => {
    localStorage.setItem('solace_google_client_id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('solace_google_client_secret', googleClientSecret);
  }, [googleClientSecret]);

  useEffect(() => {
    localStorage.setItem('solace_google_folder_id', googleFolderId);
  }, [googleFolderId]);

  useEffect(() => {
    localStorage.setItem('solace_sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Toggle ambient sounds
  // eslint-disable-next-line no-unused-vars
  const handleToggleSound = (soundId) => {
    const updatedState = !activeSounds[soundId];
    setActiveSounds(prev => ({
      ...prev,
      [soundId]: updatedState
    }));
    AmbientAudio.toggleSound(soundId, updatedState);
  };

  // Background Google Drive Synchronizer
  const syncToGoogleDrive = async (entry, token, folderId) => {
    try {
      setSyncStatus('syncing');
      
      let uploadResult;
      if (entry.googleFileId) {
        try {
          // Entry has been synced previously -> PATCH updates
          uploadResult = await GoogleDriveSync.updateGoogleDoc(
            token,
            entry.googleFileId,
            entry.title,
            entry.content,
            entry.imageUrl
          );
          
          setEntries(prev => 
            prev.map(e => e.id === entry.id ? { ...e, googleLastSynced: uploadResult.modifiedTime } : e)
          );
          
          setSyncStatus('synced');
          triggerToast(`"${entry.title}" updated on Google Drive!`, 'success');
        } catch (updateErr) {
          // Check if error is 404 (File Deleted on Drive)
          if (updateErr.status === 404) {
            console.warn('Google Doc not found (possibly deleted). Recreating...');
            
            // Re-run creation flow!
            uploadResult = await GoogleDriveSync.createGoogleDoc(
              token,
              folderId,
              entry.title,
              entry.content,
              entry.imageUrl
            );
            
            const fileId = uploadResult.id;
            
            // Save the newly obtained googleFileId and googleLastSynced to local state
            setEntries(prev => 
              prev.map(e => e.id === entry.id ? { ...e, googleFileId: fileId, googleLastSynced: uploadResult.modifiedTime } : e)
            );
            
            setSyncStatus('synced');
            triggerToast(`"${entry.title}" recreated on Google Drive!`, 'success');
          } else {
            // Re-throw other update errors
            throw updateErr;
          }
        }
      } else {
        // New document -> POST creates Doc
        uploadResult = await GoogleDriveSync.createGoogleDoc(
          token,
          folderId,
          entry.title,
          entry.content,
          entry.imageUrl
        );
        
        const fileId = uploadResult.id;
        
        // Save the newly obtained googleFileId and googleLastSynced to local state
        setEntries(prev => 
          prev.map(e => e.id === entry.id ? { ...e, googleFileId: fileId, googleLastSynced: uploadResult.modifiedTime } : e)
        );
        
        setSyncStatus('synced');
        triggerToast(`"${entry.title}" created on Google Drive!`, 'success');
      }
    } catch (err) {
      console.error('Google Sync Error:', err);
      setSyncStatus('error');
      triggerToast(`Google Sync Failed: ${err.message}`, 'error');
    }
  };

  // Editor Actions
  const handleSaveEntry = (savedData) => {
    let updatedEntries;
    let targetEntry;
    
    if (savedData.id) {
      // Editing existing entry
      updatedEntries = entries.map(e => e.id === savedData.id ? savedData : e);
      targetEntry = savedData;
    } else {
      // Creating new entry
      const newEntry = {
        ...savedData,
        id: 'journal-' + Date.now(),
        googleFileId: ''
      };
      updatedEntries = [newEntry, ...entries];
      targetEntry = newEntry;
    }
    
    setEntries(updatedEntries);
    setEditingEntry(null);
    setCurrentView('dashboard');

    // Update global selected ID and set newlySavedId for a gentle visual highlight pulse
    setSelectedEntryId(targetEntry.id);
    setNewlySavedId(targetEntry.id);
    setTimeout(() => {
      setNewlySavedId(null);
    }, 2000);

    // Google Drive Synchronization Trigger (Non-blocking background sync)
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
      setEntries(entries.filter(e => e.id !== entryId));
      setEditingEntry(null);
      setCurrentView('dashboard');

      // If synced to Google Drive and connected, delete it from Drive too!
      if (entry.googleFileId && googleAccessToken && Date.now() < googleTokenExpiry) {
        try {
          setSyncStatus('syncing');
          await GoogleDriveSync.deleteGoogleDoc(googleAccessToken, entry.googleFileId);
          setSyncStatus('synced');
          triggerToast(`"${entry.title}" deleted from Google Drive!`, 'success');
        } catch (err) {
          console.error('Failed to delete Google Doc:', err);
          setSyncStatus('error');
          triggerToast(`Failed to delete from Google Drive: ${err.message}`, 'error');
        }
      }
      return true;
    }
    return false;
  };

  // Google OAuth triggers
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

  // Settings Actions
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
    
    // Silence audio & drive connection
    AmbientAudio.stopAll();
    handleDisconnectGoogle();
    setGoogleClientId('');
    setGoogleFolderId('1g4ATsJ7T3ri1aPzyvzHmeP1P7L5d5DVQ');
    setActiveSounds({ rain: false, fire: false, lofi: false, forest: false });

    localStorage.clear();
  };

  // Locking protection check
  if (isLocked) {
    return (
      <LockScreen 
        correctPin={pin} 
        onUnlock={() => setIsLocked(false)} 
      />
    );
  }

  // Sidebar Layout Navigation
  const navigationItems = [
    { id: 'dashboard', label: 'Journal Logs', icon: BookOpen },
    { id: 'learning', label: 'Learning Hub', icon: Compass },
    { id: 'calendar', label: 'Calendar Grid', icon: Calendar },
    { id: 'analytics', label: 'Insights', icon: Award },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="app-container">
      
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="brand-logo" style={{ margin: 0 }}>
          <Feather size={20} style={{ color: '#FCD34D' }} />
          <span>Reflections</span>
        </div>
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar-nav ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          {/* Logo with Collapse Trigger */}
          <div className="brand-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2.5rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Feather size={22} style={{ color: '#FCD34D' }} />
              {!isSidebarCollapsed && <span>Reflections</span>}
            </div>
            <button 
              className="sidebar-collapse-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Navigation links */}
          <nav>
            <ul className="nav-links">
              {navigationItems.map(item => {
                const IconComponent = item.icon;
                return (
                  <li key={item.id}>
                    <button 
                      className={`nav-button ${currentView === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentView(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      title={item.label}
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

          {/* Collapsed Mascot Placeholder */}
          {isSidebarCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0 0.5rem 0' }}>
              <Feather 
                size={18} 
                style={{ color: '#FCD34D', cursor: 'pointer' }}
                title="Reflections"
              />
            </div>
          )}
        </div>

        {/* Footer Area with Theme Selectors & Lock Option */}
        <div>
          {pin && isPinEnabled && (
            <button 
              className="nav-button" 
              style={{ 
                marginBottom: '1.25rem', 
                border: '1px solid var(--border-glass)', 
                borderRadius: '12px',
                justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
              }}
              onClick={() => setIsLocked(true)}
              title="Lock Journal"
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
                <div 
                  key={opt.id}
                  className={`theme-circle ${opt.val} ${theme === opt.id ? 'active' : ''}`}
                  onClick={() => setTheme(opt.id)}
                >
                  <span className="theme-tooltip">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            entries={entries}
            onNewEntry={handleNewEntry}
            onEditEntry={handleEditEntry}
            onDelete={handleDeleteEntry}
            selectedId={selectedEntryId}
            setSelectedId={setSelectedEntryId}
            newlySavedId={newlySavedId}
          />
        )}

        {currentView === 'editor' && (
          <ZenEditor 
            entry={editingEntry}
            onSave={handleSaveEntry}
            onCancel={() => { setEditingEntry(null); setCurrentView('dashboard'); }}
            onDelete={handleDeleteEntry}
            isGoogleConnected={isGoogleConnected}
            syncStatus={syncStatus}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView 
            entries={entries}
            onNewEntry={handleNewEntry}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        )}

        {currentView === 'learning' && (
          <Learning 
            topics={learningTopics}
            setTopics={updateAndSyncLearningTopics}
          />
        )}

        {currentView === 'analytics' && (
          <Analytics entries={entries} />
        )}

        {currentView === 'settings' && (
          <Settings 
            userName={userName}
            setUserName={setUserName}
            pin={pin}
            setPin={setPin}
            isPinEnabled={isPinEnabled}
            setIsPinEnabled={setIsPinEnabled}
            entries={entries}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAllData}
            
            // Google Drive Prop mappings
            googleClientId={googleClientId}
            setGoogleClientId={setGoogleClientId}
            googleClientSecret={googleClientSecret}
            setGoogleClientSecret={setGoogleClientSecret}
            googleFolderId={googleFolderId}
            setGoogleFolderId={setGoogleFolderId}
            isGoogleConnected={isGoogleConnected}
            onConnectGoogle={handleConnectGoogle}
            onDisconnectGoogle={handleDisconnectGoogle}
            onSyncFromGoogleDrive={() => {
              handleSyncFromGoogleDrive(googleAccessToken, googleFolderId);
              downloadLearningTopicsFromDrive(googleAccessToken);
            }}
            syncStatus={syncStatus}
          />
        )}
      </main>

      {/* Floating Glassmorphic Notifications Toast Deck */}
      {toast.show && (
        <div 
          className="glass-panel" 
          style={{ 
            position: 'fixed', 
            bottom: '2rem', 
            right: '2rem', 
            padding: '1rem 1.5rem', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            borderColor: toast.type === 'success' ? 'var(--color-accent)' : toast.type === 'error' ? 'hsl(0, 85%, 60%)' : 'var(--border-glass-active)',
            backgroundColor: toast.type === 'success' ? 'rgba(var(--color-accent-rgb), 0.12)' : toast.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-glass)',
            boxShadow: '0 8px 32px var(--shadow-color)',
            animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <Sparkles size={16} style={{ color: toast.type === 'success' ? 'var(--color-accent)' : toast.type === 'error' ? 'hsl(0, 85%, 60%)' : 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
