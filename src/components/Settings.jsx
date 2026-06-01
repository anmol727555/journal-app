import React, { useState, useRef } from 'react';
import { 
  Lock, Unlock, Download, Upload, Trash2, User, Check, 
  AlertTriangle, Cloud, CloudOff, HelpCircle, ChevronDown, ChevronUp, ExternalLink 
} from 'lucide-react';

export default function Settings({ 
  userName, 
  setUserName, 
  pin, 
  setPin, 
  isPinEnabled, 
  setIsPinEnabled, 
  entries, 
  onImportBackup, 
  onClearAllData,
  
  // Google Drive states & actions
  googleClientId,
  setGoogleClientId,
  isGoogleConnected,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncFromGoogleDrive,
  syncStatus
}) {
  const [nameVal, setNameVal] = useState(userName);
  const [pinVal, setPinVal] = useState(pin);
  const [clientIdVal, setClientIdVal] = useState(googleClientId);
  const [pinError, setPinError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showDevSettings, setShowDevSettings] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleSaveName = () => {
    setUserName(nameVal.trim() || 'reflective mind');
    triggerFeedback('Name settings saved successfully.');
  };

  const handleSavePin = () => {
    if (pinVal.length !== 4 || isNaN(Number(pinVal))) {
      setPinError('PIN must be exactly 4 numeric digits.');
      return;
    }
    setPinError('');
    setPin(pinVal);
    triggerFeedback('Passcode PIN security updated successfully.');
  };

  const handleTogglePin = (e) => {
    const checked = e.target.checked;
    if (checked && !pin) {
      setPinError('Please enter a 4-digit PIN first.');
      return;
    }
    setIsPinEnabled(checked);
    triggerFeedback(checked ? 'PIN Protection Enabled.' : 'PIN Protection Disabled.');
  };

  const handleSaveGoogleConfig = () => {
    setGoogleClientId(clientIdVal.trim());
    triggerFeedback('Google Sync Client ID override updated.');
  };

  const triggerFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg('');
    }, 3000);
  };

  // Export entries as JSON download
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `solace_journal_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerFeedback('Journal backup exported successfully.');
  };

  // Import JSON file
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          onImportBackup(importedData);
          triggerFeedback(`Successfully imported ${importedData.length} reflections!`);
        } else {
          alert('Invalid file format. Backup must be a valid JSON array of reflections.');
        }
      } catch (err) {
        alert('Error parsing JSON backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-layout">
      <div>
        <h1 className="greeting-text">App Settings</h1>
        <p className="greeting-subtext">Manage your personal journaling preferences and security.</p>
      </div>

      {feedbackMsg && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1rem', 
            borderColor: 'var(--color-accent)', 
            backgroundColor: 'rgba(var(--color-accent-rgb), 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <Check size={16} style={{ color: 'var(--color-accent)' }} />
          {feedbackMsg}
        </div>
      )}

      {/* Profile/Greeting Customization */}
      <div className="glass-panel settings-panel">
        <h3 className="analytics-panel-title">
          <User size={18} />
          Personalization
        </h3>
        
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem', borderBottom: 'none' }}>
          <div className="settings-meta">
            <div className="settings-title">Journaling Mind Name</div>
            <div className="settings-desc">Your name, used in the home greeting message.</div>
          </div>
          <div className="settings-control" style={{ width: '100%', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="search-input" 
              style={{ paddingLeft: '1rem', flexGrow: 1 }}
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="reflective mind"
            />
            <button className="primary-btn" onClick={handleSaveName}>
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Google Cloud Integration */}
      <div className="glass-panel settings-panel">
        <h3 className="analytics-panel-title">
          <Cloud size={18} />
          Google Drive Sync Connection
        </h3>

        {/* Active Sync Interface */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="settings-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="settings-meta">
              <div className="settings-title">Connection Status</div>
              <div className="settings-desc" style={{ marginTop: '0.4rem' }}>
                {isGoogleConnected ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Check size={14} />
                    Active & Synchronizing
                  </span>
                ) : (
                  'Securely back up your reflections and study logs to your personal Google Drive.'
                )}
              </div>
            </div>
            <div className="settings-control">
              {isGoogleConnected ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    className="primary-btn" 
                    style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                    onClick={onSyncFromGoogleDrive}
                    disabled={syncStatus === 'syncing'}
                  >
                    <Cloud 
                      size={16} 
                      style={{ animation: syncStatus === 'syncing' ? 'spin 1.5s linear infinite' : 'none' }}
                    />
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button 
                    className="secondary-btn" 
                    style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(0, 85%, 65%)' }}
                    onClick={onDisconnectGoogle}
                  >
                    <CloudOff size={16} />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button className="primary-btn" onClick={onConnectGoogle}>
                  <Cloud size={16} />
                  Connect Google Drive
                </button>
              )}
            </div>
          </div>

          {isGoogleConnected && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '1rem', 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary)', 
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                lineHeight: '1.45',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div>• Journals are saved as native editable Google Docs inside a visible folder named <strong style={{ color: 'var(--text-primary)' }}>"Solace Journal"</strong>.</div>
              <div>• Study habit records and topics are securely stored as a hidden database file inside the <strong style={{ color: 'var(--text-primary)' }}>hidden application sandbox</strong>.</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
            <button 
              className="secondary-btn" 
              style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
              onClick={() => setShowGuide(!showGuide)}
            >
              <HelpCircle size={14} />
              {showGuide ? 'Hide Setup Guide' : 'OAuth Credentials Guide'}
              {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* 4. Collapsible dynamic setup guide panel */}
        {showGuide && (
          <div 
            className="glass-panel" 
            style={{ 
              marginTop: '1rem', 
              padding: '1.25rem', 
              borderRadius: 'var(--radius-md)', 
              background: 'var(--bg-secondary)',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <h4 style={{ fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Setup Google API Credentials in 2 Minutes:
            </h4>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                Open the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>Google Cloud Console <ExternalLink size={10} /></a>. Create or select a project.
              </li>
              <li>
                Search for <strong>"Google Drive API"</strong> in the top search bar and click <strong>Enable</strong>.
              </li>
              <li>
                Go to the <strong>OAuth Consent Screen</strong>:
                <ul style={{ paddingLeft: '1rem', listStyleType: 'circle', marginTop: '0.25rem' }}>
                  <li>Choose User Type: <strong>External</strong>.</li>
                  <li>Fill in basic App Information (e.g. App Name: <em>Solace Journal</em>) and developer email, then save.</li>
                  <li>Under Test Users, click <strong>Add Users</strong> and enter your Google account email (and your friends' emails) to authorize them.</li>
                </ul>
              </li>
              <li>
                Go to <strong>Credentials</strong> on the left menu:
                <ul style={{ paddingLeft: '1rem', listStyleType: 'circle', marginTop: '0.25rem' }}>
                  <li>Click <strong>+ Create Credentials</strong> and select <strong>OAuth Client ID</strong>.</li>
                  <li>Select Application Type: <strong>Web Application</strong>.</li>
                  <li>Authorized JavaScript Origins: Add <code>{window.location.origin}</code>.</li>
                  <li>Authorized Redirect URIs: Add the exact Redirect URI: <code style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px dashed var(--color-accent)', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{window.location.origin + window.location.pathname}</code></li>
                  <li>Click Create, copy the generated <strong>Client ID</strong>, and paste it into the manual override input below, or add it to your deployed Vercel settings as <code>VITE_GOOGLE_CLIENT_ID</code>.</li>
                </ul>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Security Protection Settings */}
      <div className="glass-panel settings-panel">
        <h3 className="analytics-panel-title">
          <Lock size={18} />
          PIN Lock Protection
        </h3>

        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-title">Enable Passcode PIN Lock</div>
            <div className="settings-desc">Prompt for your PIN whenever opening the app to secure your thoughts.</div>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isPinEnabled} 
                onChange={handleTogglePin}
              />
              <span className="slider-round"></span>
            </label>
          </div>
        </div>

        <div className="settings-row" style={{ borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
          <div className="settings-meta">
            <div className="settings-title">Configure Lock PIN</div>
            <div className="settings-desc">Enter a 4-digit PIN. Keep this safe, as it cannot be recovered.</div>
          </div>
          <div className="settings-control" style={{ width: '100%', gap: '1rem' }}>
            <input 
              type="text" 
              maxLength={4}
              placeholder="e.g. 1997"
              className="text-input-pin"
              value={pinVal}
              onChange={(e) => setPinVal(e.target.value.replace(/\D/g, ''))} // numbers only
            />
            <button className="secondary-btn" onClick={handleSavePin}>
              Update PIN
            </button>
          </div>
          {pinError && <p style={{ color: 'var(--color-accent-secondary)', fontSize: '0.8rem', marginTop: '-0.5rem' }}>{pinError}</p>}
        </div>
      </div>

      {/* Data Management Options */}
      <div className="glass-panel settings-panel">
        <h3 className="analytics-panel-title">
          <Download size={18} />
          Backup & Data Utility
        </h3>

        {/* Export backups */}
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-title">Export Backups</div>
            <div className="settings-desc">Download a local JSON backup containing all your visual reflections and tags.</div>
          </div>
          <div className="settings-control">
            <button className="secondary-btn" onClick={handleExportJSON}>
              <Download size={16} />
              Export JSON
            </button>
          </div>
        </div>

        {/* Import backups */}
        <div className="settings-row">
          <div className="settings-meta">
            <div className="settings-title">Import Backups</div>
            <div className="settings-desc">Restore or merge previous reflections from an exported JSON backup file.</div>
          </div>
          <div className="settings-control">
            <input 
              type="file" 
              accept=".json"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleImportJSON}
            />
            <button className="secondary-btn" onClick={() => fileInputRef.current.click()}>
              <Upload size={16} />
              Import JSON
            </button>
          </div>
        </div>

        {/* Clear everything */}
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <div className="settings-meta">
            <div className="settings-title" style={{ color: 'hsl(0, 85%, 60%)' }}>Clear All Data</div>
            <div className="settings-desc">Permanently erase all journal records, configurations, settings, and passcodes. This action is irreversible.</div>
          </div>
          <div className="settings-control">
            {!showClearConfirm ? (
              <button 
                className="secondary-btn" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'hsl(0, 85%, 60%)' }}
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 size={16} />
                Clear All
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'hsl(0, 85%, 60%)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={14} /> Confirm?
                </span>
                <button 
                  className="primary-btn" 
                  style={{ background: 'hsl(0, 85%, 55%)', color: 'white', padding: '0.5rem 1rem' }}
                  onClick={() => { onClearAllData(); setShowClearConfirm(false); triggerFeedback('All data wiped successfully.'); }}
                >
                  Yes, Wipe
                </button>
                <button 
                  className="secondary-btn" 
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
