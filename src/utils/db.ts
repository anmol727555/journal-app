import Dexie, { type Table } from 'dexie';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  mood: string;
  weather: string;
  tags: string[];
  imageUrl?: string;
  fontType?: 'sans' | 'serif' | 'mono';
  wordCount?: number;
  googleFileId?: string;
  googleLastSynced?: string;
}

export interface LearningTopic {
  id: string;
  title: string;
  // add other fields as needed
}

export class SolaceJournalDB extends Dexie {
  entries!: Table<JournalEntry>;
  learningTopics!: Table<LearningTopic>;

  constructor() {
    super('SolaceJournalDB');
    this.version(1).stores({
      entries: 'id, date, title, mood, weather, *tags',
      learningTopics: 'id, title'
    });
  }
}

export const db = new SolaceJournalDB();

export async function migrateFromLocalStorage(): Promise<void> {
  const localEntries = localStorage.getItem('solace_journal_entries');
  const localTopics = localStorage.getItem('solace_learning_topics');

  if (localEntries) {
    try {
      const entries = JSON.parse(localEntries) as JournalEntry[];
      if (Array.isArray(entries) && entries.length > 0) {
        const count = await db.entries.count();
        if (count === 0) {
          await db.entries.bulkAdd(entries);
        }
      }
    } catch (err) {
      console.error('Failed to migrate local entries:', err);
    }
  }

  if (localTopics) {
    try {
      const topics = JSON.parse(localTopics) as LearningTopic[];
      if (Array.isArray(topics) && topics.length > 0) {
        const count = await db.learningTopics.count();
        if (count === 0) {
          await db.learningTopics.bulkAdd(topics);
        }
      }
    } catch (err) {
      console.error('Failed to migrate local topics:', err);
    }
  }
}
