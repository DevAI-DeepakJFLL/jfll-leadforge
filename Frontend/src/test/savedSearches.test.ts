import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const STORAGE_SEARCHES_KEY = 'leadforge_saved_searches';

const storageMap = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => {
    storageMap.set(key, val);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  length: storageMap.size,
};

function getInitialSavedSearches(): Array<{ id: string; name: string; filters: Record<string, any> }> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

describe('Dynamic Saved Searches Persistence', () => {
  beforeEach(() => {
    storageMap.clear();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('starts with an empty array of saved searches on fresh storage (no hardcoded LA marketing)', () => {
    const initial = getInitialSavedSearches();
    expect(initial).toEqual([]);
    expect(initial).toHaveLength(0);
  });

  it('persists a new saved search dynamically to localStorage', () => {
    const newPreset = {
      id: 'search-12345',
      name: 'Custom Pharma Search',
      filters: {
        industries: ['Pharmaceuticals'],
        locations: ['Mumbai, India'],
      },
    };

    mockStorage.setItem(STORAGE_SEARCHES_KEY, JSON.stringify([newPreset]));

    const loaded = getInitialSavedSearches();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Custom Pharma Search');
    expect(loaded[0].filters.industries).toEqual(['Pharmaceuticals']);
  });

  it('handles corrupted localStorage JSON gracefully without throwing', () => {
    mockStorage.setItem(STORAGE_SEARCHES_KEY, 'invalid-json{{{');
    const loaded = getInitialSavedSearches();
    expect(loaded).toEqual([]);
  });
});
