import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { GoogleDriveSync } from '../utils/googleDrive';
import { type JournalEntry, type LearningTopic } from '../utils/db';

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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

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
    localStorage.setItem('solace_google_client_secret', googleClientSecret);
  }, [googleClientSecret]);

  useEffect(() => {
    localStorage.setItem('solace_google_folder_id', googleFolderId);
  }, [googleFolderId]);

  const handleSyncFromGoogleDrive = async (token: string, folderId: string) => {
    if (!token || !folderId) return;
    setSyncStatus('syncing');
    try {
      const driveFiles = await GoogleDriveSync.listGoogleDocs(token, folderId);
      const driveFileIds = new Set(driveFiles.map((f: any) => f.id));
      const driveFilesMap = new Map(driveFiles.map((f: any) => [f.id, f]));

      let currentEntries = [...entriesRef.current];
      let hasChanges = false;

      const initialCount = currentEntries.length;
      currentEntries = currentEntries.filter(entry => {
        if (entry.googleFileId && !driveFileIds.has(entry.googleFileId)) {
          hasChanges = true;
          return false;
        }
        return true;
      });
      const deletedCount = initialCount - currentEntries.length;

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

      for (const file of newDriveFiles) {
        try {
          const parsed = await GoogleDriveSync.downloadAndParseGoogleDoc(token, file.id, file.name);
          const newEntry: JournalEntry = {
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
    const learningFolderId = '1_8_h0G4122Ls4Srrcf23z2ea9Y8WzXRQ';
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
    const learningFolderId = '1_8_h0G4122Ls4Srrcf23z2ea9Y8WzXRQ';
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
          uploadResult = await GoogleDriveSync.updateGoogleDoc(token, entry.googleFileId, entry.title, entry.content, entry.imageUrl);
          // Note: In a fully typed version, we'd need an updated setEntries or single entry update
          // This part might need adjustment depending on how setEntries is used in App.jsx
          setSyncStatus('synced');
          triggerToast(`"${entry.title}" updated on Google Drive!`, 'success');
        } catch (updateErr: any) {
          if (updateErr.status === 404) {
            uploadResult = await GoogleDriveSync.createGoogleDoc(token, folderId, entry.title, entry.content, entry.imageUrl);
            setSyncStatus('synced');
            triggerToast(`"${entry.title}" recreated on Google Drive!`, 'success');
          } else {
            throw updateErr;
          }
        }
      } else {
        uploadResult = await GoogleDriveSync.createGoogleDoc(token, folderId, entry.title, entry.content, entry.imageUrl);
        setSyncStatus('synced');
        triggerToast(`"${entry.title}" created on Google Drive!`, 'success');
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
    googleTokenExpiryRef
  };
}
