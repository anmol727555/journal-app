import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJournalEntries } from './useJournalEntries';
import { db } from '../utils/db';

// Mock Dexie
vi.mock('../utils/db', async () => {
  const actual = await vi.importActual('../utils/db');
  return {
    ...actual,
    migrateFromLocalStorage: vi.fn().mockResolvedValue(undefined),
  };
});

describe('useJournalEntries', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('should seed default journals if DB is empty', async () => {
    const { result } = renderHook(() => useJournalEntries());
    
    await waitFor(() => expect(result.current.isMigrated).toBe(true));
    expect(result.current.entries.length).toBeGreaterThan(0);
  });

  it('should save a new entry', async () => {
    const { result } = renderHook(() => useJournalEntries());
    await waitFor(() => expect(result.current.isMigrated).toBe(true));

    const newEntry = {
      title: 'Test Entry',
      content: 'Test Content',
      date: '2023-01-01',
      mood: 'happy',
      weather: 'sunny',
      tags: ['test']
    };

    let saved;
    await result.current.saveEntry(newEntry).then(e => saved = e);
    
    // useLiveQuery is async, so we wait for entries to update
    await waitFor(() => expect(result.current.entries.some(e => e.title === 'Test Entry')).toBe(true));
  });
});
