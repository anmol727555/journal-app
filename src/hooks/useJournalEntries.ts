import { useState, useEffect, useRef } from 'react';
import { db, migrateFromLocalStorage, type JournalEntry, type LearningTopic } from '../utils/db';
import { useLiveQuery } from 'dexie-react-hooks';

const DEFAULT_JOURNALS: JournalEntry[] = [
  {
    id: 'mock-1',
    title: 'Echoes of the Rain',
    content: "<p>There's a gentle rhythm to the rainfall today that feels like an invitation to slow down. I sat by the window for thirty minutes with a cup of warm chamomile tea, listening to the drops collide with the glass. I realized how rarely I just... listen. I am so caught up in planning and execution that the present slipstream flows right past. Today, I choose silence. I choose to be present in this gray, atmospheric warmth.</p>",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0],
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
    content: '<p>Woke up today with an unusual surge of vital energy! The weather outside is pristine—crisp morning air with gorgeous honey-colored sunlight flooding the street. I went for a brief 20-minute jog in the park and noticed wild honeysuckles blooming. It felt like a chemical reset. I want to bottle this pensive gratitude and keep it close for days when the fog rolls in.</p>',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mood: 'energetic',
    weather: 'sunny',
    tags: ['fitness', 'morning', 'joy'],
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    fontType: 'sans',
    wordCount: 79,
    googleFileId: ''
  }
];

export function useJournalEntries() {
  const entries = useLiveQuery(() => db.entries.toArray(), []) || [];
  const learningTopics = useLiveQuery(() => db.learningTopics.toArray(), []) || [];
  const [isMigrated, setIsMigrated] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await migrateFromLocalStorage();
        const count = await db.entries.count();
        if (count === 0) {
          await db.entries.bulkAdd(DEFAULT_JOURNALS);
        }
        setIsMigrated(true);
      } catch (err) {
        console.error('Failed to initialize journal database:', err);
      }
    };
    init();
  }, []);

  const entriesRef = useRef<JournalEntry[]>(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const learningTopicsRef = useRef<LearningTopic[]>(learningTopics);
  useEffect(() => {
    learningTopicsRef.current = learningTopics;
  }, [learningTopics]);

  const setEntries = async (newEntries: JournalEntry[]) => {
    await db.entries.clear();
    await db.entries.bulkAdd(newEntries);
  };

  const saveEntry = async (entry: JournalEntry) => {
    if (!entry.id) {
      entry.id = 'journal-' + Date.now();
    }
    await db.entries.put(entry);
    return entry;
  };

  const deleteEntry = async (id: string) => {
    await db.entries.delete(id);
  };

  const setLearningTopics = async (newTopics: LearningTopic[]) => {
    await db.learningTopics.clear();
    await db.learningTopics.bulkAdd(newTopics);
  };

  const saveLearningTopic = async (topic: LearningTopic) => {
    await db.learningTopics.put(topic);
  };

  return {
    entries, setEntries, saveEntry, deleteEntry, entriesRef,
    learningTopics, setLearningTopics, saveLearningTopic, learningTopicsRef,
    isMigrated
  };
}
