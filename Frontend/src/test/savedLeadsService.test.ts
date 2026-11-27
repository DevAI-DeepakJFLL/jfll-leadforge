import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSavedLists,
  createSavedList,
  addLeadsToList,
  removeLeadFromList,
  deleteSavedList,
  resetSavedLeadsStorage,
  sanitizeListName,
  MAX_LIST_NAME_LENGTH,
} from '@/services/savedLeadsService';
import { Lead } from '@/types/lead';

const mockLead1: Lead = {
  id: 'lead-test-1',
  name: 'Sarah Connor',
  title: 'VP of Global Logistics',
  company: 'Cyberdyne Systems',
  companyLogo: '',
  industry: 'Aviation & Aerospace',
  location: 'Los Angeles, California, United States',
  email: 's.connor@cyberdyne.com',
  phone: '+1 310-555-0199',
  employees: '1000+',
  revenue: '$50M-$100M',
  funding: 'Series B',
  status: 'NET NEW',
};

const mockLead2: Lead = {
  id: 'lead-test-2',
  name: 'John Miller',
  title: 'Director of Supply Chain',
  company: 'Titan Freight Corp',
  companyLogo: '',
  industry: 'Freight Forwarding',
  location: 'Chicago, Illinois, United States',
  email: 'j.miller@titanfreight.com',
  phone: '+1 312-555-0144',
  employees: '501-1000',
  revenue: '$10M-$50M',
  funding: 'Profitable',
  status: 'COLD',
};

const storageStore = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (key: string) => storageStore.get(key) ?? null,
  setItem: (key: string, val: string) => {
    storageStore.set(key, val);
  },
  removeItem: (key: string) => {
    storageStore.delete(key);
  },
  clear: () => {
    storageStore.clear();
  },
  key: (index: number) => Array.from(storageStore.keys())[index] ?? null,
  length: storageStore.size,
};

describe('Saved Lists Service', () => {
  beforeEach(() => {
    storageStore.clear();
    (globalThis as any).window = {
      localStorage: mockStorage,
    };
    resetSavedLeadsStorage();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe('Saved Lists Management', () => {
    it('initializes with an empty list array when no lists created yet', () => {
      const lists = getSavedLists();
      expect(lists).toEqual([]);
    });

    it('creates a new custom list', () => {
      const newList = createSavedList('Austin Logistics Execs');
      expect(newList.name).toBe('Austin Logistics Execs');
      expect(newList.id).toBeDefined();

      const lists = getSavedLists();
      expect(lists.some((l) => l.name === 'Austin Logistics Execs')).toBe(true);
    });

    it('adds leads to a named list', () => {
      const result = addLeadsToList('West Coast VIPs', [mockLead1, mockLead2]);
      expect(result.addedCount).toBe(2);
      expect(result.list.leadIds).toContain(mockLead1.id);
      expect(result.list.leadIds).toContain(mockLead2.id);

      const lists = getSavedLists();
      const westCoast = lists.find((l) => l.name === 'West Coast VIPs');
      expect(westCoast?.leadIds).toEqual([mockLead1.id, mockLead2.id]);
    });

    it('removes a lead from a list', () => {
      addLeadsToList('West Coast VIPs', [mockLead1, mockLead2]);
      removeLeadFromList('West Coast VIPs', mockLead1.id);

      const lists = getSavedLists();
      const westCoast = lists.find((l) => l.name === 'West Coast VIPs');
      expect(westCoast?.leadIds).toHaveLength(1);
      expect(westCoast?.leadIds).toContain(mockLead2.id);
      expect(westCoast?.leadIds).not.toContain(mockLead1.id);
    });

    it('deletes a saved list', () => {
      createSavedList('Temporary List');
      expect(getSavedLists().some((l) => l.name === 'Temporary List')).toBe(true);

      deleteSavedList('Temporary List');
      expect(getSavedLists().some((l) => l.name === 'Temporary List')).toBe(false);
    });
  });

  describe('Security & Defensive Hardening', () => {
    it('sanitizes list names by stripping HTML/script tags and trimming whitespace', () => {
      const sanitized = sanitizeListName('  <b>Special Accounts</b>  ');
      expect(sanitized).toBe('bSpecial Accounts/b');

      const list = createSavedList('  <script>alert("XSS")</script>VIP Accounts  ');
      expect(list.name).toBe('scriptalert("XSS")/scriptVIP Accounts');
      expect(list.name).not.toContain('<');
      expect(list.name).not.toContain('>');
    });

    it('enforces maximum length of 50 characters for list names', () => {
      const longName = 'A'.repeat(80);
      const list = createSavedList(longName);
      expect(list.name).toHaveLength(MAX_LIST_NAME_LENGTH);
      expect(list.name).toBe('A'.repeat(MAX_LIST_NAME_LENGTH));
    });

    it('rejects reserved prototype pollution names for list names', () => {
      expect(() => createSavedList('__proto__')).toThrow(/reserved/i);
      expect(() => createSavedList('constructor')).toThrow(/reserved/i);
      expect(() => createSavedList('prototype')).toThrow(/reserved/i);
    });

    it('handles corrupted localStorage JSON gracefully without throwing', () => {
      mockStorage.setItem('leadforge_saved_lists', '{"not": "an array"}');

      // Should return safe fallbacks instead of crashing with TypeError
      expect(getSavedLists()).toBeInstanceOf(Array);
    });
  });
});
