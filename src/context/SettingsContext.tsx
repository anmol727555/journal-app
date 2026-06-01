import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SettingsContextType {
  userName: string;
  setUserName: (name: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  pin: string;
  setPin: (pin: string) => void;
  isPinEnabled: boolean;
  setIsPinEnabled: (enabled: boolean) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('solace_userName') || 'reflective mind';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('solace_theme') || 'theme-midnight';
  });

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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('solace_sidebar_collapsed') === 'true';
  });

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
    localStorage.setItem('solace_sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  const value = {
    userName, setUserName,
    theme, setTheme,
    pin, setPin,
    isPinEnabled, setIsPinEnabled,
    isLocked, setIsLocked,
    isSidebarCollapsed, setIsSidebarCollapsed
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
