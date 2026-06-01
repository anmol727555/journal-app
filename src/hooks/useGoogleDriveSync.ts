import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { GoogleDriveSync } from '../utils/googleDrive';
import { db, type JournalEntry, type LearningTopic } from '../utils/db';
import { analyzeContentForTags } from '../utils/emotionLexicon';

export function useGoogleDriveSync(
  entries: JournalEntry[], 
  setEntries: (entries: JournalEntry[]) => Promise<void>, 
  entriesRef: MutableRefObject<JournalEntry[]>,
  learningTopics: LearningTopic[], 
  setLearningTopics: (topics: LearningTopic[]) => Promise<void>, 
  learningTopicsRef: MutableRefObject<LearningTopic[]>,
  triggerToast: (message: string, type?: 'info' | 'success' | 'error') => void
) {
  const [googleClientId, setGoogleClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('solace_google_client_id') || '587407107906-ds1jnb791rrtu8n7u4fde1e6i0kpgqj3.apps.googleusercontent.com';
  });
  
  // Kept as dummy for backward compatibility during refactoring
  const [googleClientSecret, setGoogleClientSecret] = useState('');

  const [googleUserProfile, setGoogleUserProfile] = useState<{ name: string; picture: string } | null>(() => {
    const saved = localStorage.getItem('solace_google_profile');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (googleUserProfile) {
      localStorage.setItem('solace_google_profile', JSON.stringify(googleUserProfile));
    } else {
      localStorage.removeItem('solace_google_profile');
    }
  }, [googleUserProfile]);

  const [googleFolderId, setGoogleFolderId] = useState(() => {
    return localStorage.getItem('solace_google_folder_id') || '';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState(() => {
    return sessionStorage.getItem('solace_google_access_token') || '';
  });
  const [googleTokenExpiry, setGoogleTokenExpiry] = useState(() => {
    const saved = sessionStorage.getItem('solace_google_token_expiry');
    return saved ? parseInt(saved) : 0;
  });

  const isGoogleConnected = !!googleAccessToken && googleTokenExpiry > 0;
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const tokenClientRef = useRef<any>(null);
  const googleAccessTokenRef = useRef(googleAccessToken);
  
  useEffect(() => {
    googleAccessTokenRef.current = googleAccessToken;
    sessionStorage.setItem('solace_google_access_token', googleAccessToken);
  }, [googleAccessToken]);

  const googleTokenExpiryRef = useRef(googleTokenExpiry);
  useEffect(() => {
    googleTokenExpiryRef.current = googleTokenExpiry;
    sessionStorage.setItem('solace_google_token_expiry', googleTokenExpiry.toString());
  }, [googleTokenExpiry]);

  useEffect(() => {
    localStorage.setItem('solace_google_client_id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('solace_google_folder_id', googleFolderId);
  }, [googleFolderId]);

  const initializeTokenClient = () => {
    if (tokenClientRef.current) return;

    // @ts-ignore
    if (googleClientId && typeof window !== 'undefined' && window.google) {
      try {
        console.log('Initializing Google Identity Services Token Client...');
        // @ts-ignore
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth error:', tokenResponse);
              triggerToast(`Authentication failed: ${tokenResponse.error}`, 'error');
              setSyncStatus('error');
              return;
            }

            const token = tokenResponse.access_token;
            const expiryTime = Date.now() + parseInt(tokenResponse.expires_in) * 1000;

            setGoogleAccessToken(token);
            setGoogleTokenExpiry(expiryTime);
            localStorage.setItem('solace_google_connected', 'true');

            setSyncStatus('syncing');
            try {
              console.log('Fetching Google user profile details...');
              const userInfo = await GoogleDriveSync.getUserInfo(token);
              const profile = { name: userInfo.name || 'Google User', picture: userInfo.picture || '' };
              setGoogleUserProfile(profile);

              const resolvedFolderId = await GoogleDriveSync.findOrCreateFolder(token, 'Solace Journal');
              setGoogleFolderId(resolvedFolderId);

              triggerToast('Google Drive connected successfully!', 'success');

              await handleSyncFromGoogleDrive(token, resolvedFolderId);
              await downloadLearningTopicsFromDrive(token);
            } catch (syncErr: any) {
              console.error('Failed folder resolution or initial sync:', syncErr);
              triggerToast(`Sync failed: ${syncErr.message}`, 'error');
              setSyncStatus('error');
            }
          }
        });
      } catch (err) {
        console.error('Error initializing Google token client:', err);
      }
    }
  };

  // Initialize the Google Identity Services Token Client on load / ID change
  useEffect(() => {
    initializeTokenClient();
  }, [googleClientId]);

  // Session check and automatic silent refresh on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = sessionStorage.getItem('solace_google_access_token');
      const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');

      if (savedToken && savedExpiry && Date.now() < parseInt(savedExpiry)) {
        setGoogleAccessToken(savedToken);
        setGoogleTokenExpiry(parseInt(savedExpiry));
        const savedFolderId = localStorage.getItem('solace_google_folder_id') || googleFolderId;
        if (savedFolderId) {
          handleSyncFromGoogleDrive(savedToken, savedFolderId);
        }
        downloadLearningTopicsFromDrive(savedToken);
      } else {
        const wasConnected = localStorage.getItem('solace_google_connected') === 'true';
        // @ts-ignore
        if (wasConnected && googleClientId && typeof window !== 'undefined' && window.google) {
          if (!tokenClientRef.current) {
            initializeTokenClient();
          }
          setTimeout(() => {
            if (tokenClientRef.current) {
              console.log('Attempting automatic silent Google sign-in on mount...');
              tokenClientRef.current.requestAccessToken({ prompt: 'none' });
            }
          }, 1000);
        }
      }
    };

    // @ts-ignore
    if (typeof window !== 'undefined') {
      // @ts-ignore
      if (window.google) {
        checkSession();
      } else {
        window.addEventListener('load', checkSession);
        return () => window.removeEventListener('load', checkSession);
      }
    }
  }, [googleClientId]);

  // Background Silent Token Refresher (Interval runs every 60 seconds)
  useEffect(() => {
    if (!googleClientId) return;

    const checkAndRefresh = async () => {
      const savedExpiry = sessionStorage.getItem('solace_google_token_expiry');
      if (!savedExpiry) return;

      const timeRemaining = parseInt(savedExpiry) - Date.now();
      const tenMinutes = 10 * 60 * 1000;

      if (timeRemaining < tenMinutes && tokenClientRef.current) {
        try {
          console.log('Silently renewing Google access token...');
          tokenClientRef.current.requestAccessToken({ prompt: 'none' });
        } catch (err) {
          console.error('Failed to background renew Google access token:', err);
        }
      }
    };

    const interval = setInterval(checkAndRefresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [googleClientId]);

  const handleSyncFromGoogleDrive = async (token: string, folderId: string) => {
    if (!token || !folderId) return;
    setSyncStatus('syncing');
    try {
      const driveFiles = await GoogleDriveSync.listGoogleDocs(token, folderId);
      const driveFileIds = new Set(driveFiles.map((f: any) => f.id));
      const driveFilesMap = new Map(driveFiles.map((f: any) => [f.id, f]));

      let currentEntries = [...entriesRef.current];
      let hasChanges = false;

      // 1. Process deletions
      const initialCount = currentEntries.length;
      currentEntries = currentEntries.filter(entry => {
        if (entry.googleFileId && !driveFileIds.has(entry.googleFileId)) {
          hasChanges = true;
          return false;
        }
        return true;
      });
      const deletedCount = initialCount - currentEntries.length;

      // 2. Identify new and updated files
      const localFileIds = new Set(currentEntries.map(e => e.googleFileId).filter(Boolean));
      const newDriveFiles = driveFiles.filter((f: any) => !localFileIds.has(f.id));
      const updatedDriveFiles: { entry: JournalEntry; driveFile: any }[] = [];

      for (const entry of currentEntries) {
        if (entry.googleFileId) {
          const driveFile = driveFilesMap.get(entry.googleFileId);
          if (driveFile && driveFile.modifiedTime !== entry.googleLastSynced) {
            updatedDriveFiles.push({ entry, driveFile });
          }
        }
      }

      // 3. Download updated notes
      for (const item of updatedDriveFiles) {
        try {
          const parsed = await GoogleDriveSync.downloadAndParseGoogleDoc(token, item.driveFile.id, item.driveFile.name);
          currentEntries = currentEntries.map(e => {
            if (e.googleFileId === item.driveFile.id) {
              hasChanges = true;

              // Lexicon Auto-Tagging on Sync Update:
              // If the downloaded entry does not specify a mood, and current tags are empty/fallback 'synced',
              // re-evaluate content to infer better tags.
              let updatedTags = e.tags || [];
              if ((!parsed.mood || parsed.mood.trim() === '') && (updatedTags.length === 0 || (updatedTags.length === 1 && updatedTags[0] === 'synced'))) {
                const inferred = analyzeContentForTags(parsed.content);
                if (inferred.length > 0) {
                  updatedTags = inferred;
                }
              }

              return {
                ...e,
                title: item.driveFile.name,
                content: parsed.content,
                imageUrl: parsed.imageUrl || e.imageUrl,
                mood: parsed.mood || '',
                weather: parsed.weather || '',
                tags: updatedTags,
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

      // 4. Download new notes from Drive
      for (const file of newDriveFiles) {
        try {
          const parsed = await GoogleDriveSync.downloadAndParseGoogleDoc(token, file.id, file.name);
          
          // Lexicon Auto-Tagging on Sync Download:
          // If the entry has no mood, run lexicon scanner to infer relevant tags.
          // Fallback to ['synced'] if no matching keywords are found.
          let inferredTags = ['synced'];
          if (!parsed.mood || parsed.mood.trim() === '') {
            const inferred = analyzeContentForTags(parsed.content);
            if (inferred.length > 0) {
              inferredTags = inferred;
            }
          }

          const newEntry: JournalEntry = {
            id: 'journal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            title: file.name,
            content: parsed.content,
            date: new Date(file.modifiedTime || Date.now()).toISOString().split('T')[0],
            mood: parsed.mood || '',
            weather: parsed.weather || '',
            tags: inferredTags,
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

      // 5. Perform automatic first-time upload for local files that don't have a googleFileId
      for (let i = 0; i < currentEntries.length; i++) {
        const entry = currentEntries[i];
        if (!entry.googleFileId) {
          try {
            console.log(`Uploading local-only note "${entry.title}" to Google Drive...`);
            const uploadResult = await GoogleDriveSync.createGoogleDoc(token, folderId, entry.title, entry.content, entry.imageUrl, entry.mood, entry.weather);
            currentEntries[i] = {
              ...entry,
              googleFileId: uploadResult.id,
              googleLastSynced: uploadResult.modifiedTime
            };
            hasChanges = true;
          } catch (uploadErr) {
            console.error(`Failed to upload local note ${entry.id} during sync:`, uploadErr);
          }
        }
      }

      if (hasChanges) {
        await setEntries(currentEntries);
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
    } catch (err: any) {
      console.error('Failed to sync from Google Drive:', err);
      setSyncStatus('error');
      triggerToast(`Sync failed: ${err.message}`, 'error');
    }
  };

  const uploadLearningTopicsToDrive = async (topicsList: LearningTopic[]) => {
    const currentToken = googleAccessTokenRef.current;
    const currentExpiry = googleTokenExpiryRef.current;
    if (!currentToken || Date.now() >= currentExpiry) return;
    const learningFolderId = 'appdata'; // Hidden application data sandbox
    const filename = 'learning_data.db';
    try {
      setSyncStatus('syncing');
      const files = await GoogleDriveSync.findFileByName(currentToken, learningFolderId, filename);
      const fileContent = JSON.stringify(topicsList);
      if (files.length > 0) {
        const sortedFiles = [...files].sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        const fileId = sortedFiles[0].id;
        await GoogleDriveSync.updateCustomFileContent(currentToken, fileId, 'application/json', fileContent);
        if (sortedFiles.length > 1) {
          for (let i = 1; i < sortedFiles.length; i++) {
            GoogleDriveSync.deleteGoogleDoc(currentToken, sortedFiles[i].id).catch(err => console.error('Failed to purge duplicate file:', err));
          }
        }
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

  const downloadLearningTopicsFromDrive = async (token: string) => {
    if (!token) return;
    const learningFolderId = 'appdata'; // Hidden application data sandbox
    const filename = 'learning_data.db';
    try {
      setSyncStatus('syncing');
      const files = await GoogleDriveSync.findFileByName(token, learningFolderId, filename);
      if (files.length > 0) {
        const sortedFiles = [...files].sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
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
        if (remoteTopics && Array.isArray(remoteTopics)) {
          await setLearningTopics(remoteTopics);
        }
        if (sortedFiles.length > 1) {
          for (let i = 1; i < sortedFiles.length; i++) {
            GoogleDriveSync.deleteGoogleDoc(token, sortedFiles[i].id).catch(err => console.error('Failed to purge duplicate file:', err));
          }
        }
        triggerToast('Learning Hub DB synchronized with Google Drive.', 'success');
      }
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to download & sync Learning Hub DB:', err);
      setSyncStatus('error');
    }
  };

  const syncToGoogleDrive = async (entry: JournalEntry, token: string, folderId: string) => {
    try {
      setSyncStatus('syncing');
      let uploadResult;
      if (entry.googleFileId) {
        try {
          uploadResult = await GoogleDriveSync.updateGoogleDoc(token, entry.googleFileId, entry.title, entry.content, entry.imageUrl, entry.mood, entry.weather);
          setSyncStatus('synced');
          triggerToast(`"${entry.title}" updated on Google Drive!`, 'success');
        } catch (updateErr: any) {
          if (updateErr.status === 404) {
            uploadResult = await GoogleDriveSync.createGoogleDoc(token, folderId, entry.title, entry.content, entry.imageUrl, entry.mood, entry.weather);
            setSyncStatus('synced');
            triggerToast(`"${entry.title}" recreated on Google Drive!`, 'success');
          } else {
            throw updateErr;
          }
        }
      } else {
        uploadResult = await GoogleDriveSync.createGoogleDoc(token, folderId, entry.title, entry.content, entry.imageUrl, entry.mood, entry.weather);
        setSyncStatus('synced');
        triggerToast(`"${entry.title}" created on Google Drive!`, 'success');
      }

      if (uploadResult && uploadResult.id) {
        await db.entries.update(entry.id, {
          googleFileId: uploadResult.id,
          googleLastSynced: uploadResult.modifiedTime
        });
      }
    } catch (err: any) {
      console.error('Google Sync Error:', err);
      setSyncStatus('error');
      triggerToast(`Google Sync Failed: ${err.message}`, 'error');
    }
  };

  const deleteFromGoogleDrive = async (entry: JournalEntry, token: string) => {
    if (entry.googleFileId && token) {
      try {
        setSyncStatus('syncing');
        await GoogleDriveSync.deleteGoogleDoc(token, entry.googleFileId);
        setSyncStatus('synced');
        triggerToast(`"${entry.title}" deleted from Google Drive!`, 'success');
      } catch (err) {
        console.error('Failed to delete Google Doc:', err);
        setSyncStatus('error');
        triggerToast(`Failed to delete from Google Drive: ${err.message}`, 'error');
      }
    }
  };

  const handleConnectGoogle = () => {
    if (!googleClientId) {
      triggerToast('Google Client ID is not configured. Please add it to your environment variables or settings.', 'error');
      return;
    }
    // On-demand initialization if the library loaded after mount
    if (!tokenClientRef.current && typeof window !== 'undefined' && window.google) {
      initializeTokenClient();
    }
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken(); // Opens the beautiful pop-up!
    } else {
      triggerToast('Google Identity library is still loading. Please try again in a moment.', 'info');
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleAccessToken('');
    setGoogleTokenExpiry(0);
    setGoogleFolderId('');
    setGoogleUserProfile(null);
    sessionStorage.removeItem('solace_google_access_token');
    sessionStorage.removeItem('solace_google_token_expiry');
    localStorage.removeItem('solace_google_folder_id');
    localStorage.removeItem('solace_google_connected');
    localStorage.removeItem('solace_google_profile');
    triggerToast('Google Drive disconnected.', 'info');
  };

  return {
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
    googleTokenExpiryRef,
    handleConnectGoogle,
    handleDisconnectGoogle,
    googleUserProfile
  };
}
