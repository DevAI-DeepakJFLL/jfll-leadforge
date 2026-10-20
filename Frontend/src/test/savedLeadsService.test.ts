import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveLead,
  unsaveLead,
  toggleSaveLead,
  batchSaveLeads,
  getSavedLeads,
  getSavedLeadIds,
  isLeadSaved,
  getSavedLists,
  createSavedList,
  addLeadsToList,
  removeLeadFromList,
  deleteSavedList,
  getLeadsForList,
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
  saved: false,
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
  saved: false,
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

describe('Saved Leads & Lists Service', () => {
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

  describe('Single Lead Save & Unsave', () => {
    it('saves a lead and preserves full lead data', () => {
      expect(isLeadSaved(mockLead1.id)).toBe(false);
      const savedItem = saveLead(mockLead1);

      expect(savedItem.id).toBe(mockLead1.id);
      expect(savedItem.saved).toBe(true);
      expect(savedItem.savedAt).toBeDefined();
      expect(isLeadSaved(mockLead1.id)).toBe(true);

      const allSaved = getSavedLeads();
      expect(allSaved).toHaveLength(1);
      expect(allSaved[0].name).toBe('Sarah Connor');
    });

    it('unsaves an existing lead cleanly', () => {
      saveLead(mockLead1);
      expect(isLeadSaved(mockLead1.id)).toBe(true);

      unsaveLead(mockLead1.id);
      expect(isLeadSaved(mockLead1.id)).toBe(false);
      expect(getSavedLeads()).toHaveLength(0);
    });

    it('toggles saved status back and forth', () => {
      const nowSaved = toggleSaveLead(mockLead1);
      expect(nowSaved).toBe(true);
      expect(isLeadSaved(mockLead1.id)).toBe(true);

      const nowUnsaved = toggleSaveLead(mockLead1);
      expect(nowUnsaved).toBe(false);
      expect(isLeadSaved(mockLead1.id)).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('batch saves multiple leads and returns count', () => {
      const count = batchSaveLeads([mockLead1, mockLead2], true);
      expect(count).toBe(2);

      const ids = getSavedLeadIds();
      expect(ids.has(mockLead1.id)).toBe(true);
      expect(ids.has(mockLead2.id)).toBe(true);
      expect(getSavedLeads()).toHaveLength(2);
    });

    it('batch unsaves multiple leads', () => {
      batchSaveLeads([mockLead1, mockLead2], true);
      expect(getSavedLeads()).toHaveLength(2);

      const unsavedCount = batchSaveLeads([mockLead1, mockLead2], false);
      expect(unsavedCount).toBe(2);
      expect(getSavedLeads()).toHaveLength(0);
    });
  });

  describe('Saved Lists Management', () => {
    it('initializes with default starter lists', () => {
      const lists = getSavedLists();
      expect(lists.length).toBeGreaterThanOrEqual(3);
      const names = lists.map((l) => l.name);
      expect(names).toContain('West Coast VIPs');
      expect(names).toContain('High Growth Accounts');
      expect(names).toContain('Q4 Prospects');
    });

    it('creates a new custom list', () => {
      const newList = createSavedList('Austin Logistics Execs');
      expect(newList.name).toBe('Austin Logistics Execs');
      expect(newList.id).toBeDefined();

      const lists = getSavedLists();
      expect(lists.some((l) => l.name === 'Austin Logistics Execs')).toBe(true);
    });

    it('adds leads to a named list and automatically saves the lead records', () => {
      const result = addLeadsToList('West Coast VIPs', [mockLead1, mockLead2]);
      expect(result.addedCount).toBe(2);
      expect(result.list.leadIds).toContain(mockLead1.id);
      expect(result.list.leadIds).toContain(mockLead2.id);

      // Verify leads are also stored in saved leads map
      expect(isLeadSaved(mockLead1.id)).toBe(true);
      expect(isLeadSaved(mockLead2.id)).toBe(true);

      const listLeads = getLeadsForList('West Coast VIPs');
      expect(listLeads).toHaveLength(2);
      expect(listLeads.map((l) => l.name)).toContain('Sarah Connor');
      expect(listLeads.map((l) => l.name)).toContain('John Miller');
    });

    it('removes a lead from a list', () => {
      addLeadsToList('West Coast VIPs', [mockLead1, mockLead2]);
      removeLeadFromList('West Coast VIPs', mockLead1.id);

      const listLeads = getLeadsForList('West Coast VIPs');
      expect(listLeads).toHaveLength(1);
      expect(listLeads[0].id).toBe(mockLead2.id);
    });

    it('deletes a saved list', () => {
      createSavedList('Temporary List');
      expect(getSavedLists().some((l) => l.name === 'Temporary List')).toBe(true);

      deleteSavedList('Temporary List');
      expect(getSavedLists().some((l) => l.name === 'Temporary List')).toBe(false);
    });

    it('cleans up listNames on saved leads when a list is deleted', () => {
      addLeadsToList('Temp Project', [mockLead1]);
      const savedLead = getSavedLeads().find((l) => l.id === mockLead1.id);
      expect(savedLead?.listNames).toContain('Temp Project');

      deleteSavedList('Temp Project');
      const updatedLead = getSavedLeads().find((l) => l.id === mockLead1.id);
      expect(updatedLead?.listNames).not.toContain('Temp Project');
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
      mockStorage.setItem('leadforge_saved_leads', 'null');
      mockStorage.setItem('leadforge_saved_lists', '{"not": "an array"}');

      // Should return safe fallbacks instead of crashing with TypeError
      expect(getSavedLeads()).toBeInstanceOf(Array);
      expect(getSavedLists()).toBeInstanceOf(Array);
      expect(getSavedLeadIds()).toBeInstanceOf(Set);
    });

    it('prunes dangerous prototype keys from raw storage', () => {
      mockStorage.setItem(
        'leadforge_saved_leads',
        JSON.stringify({
          __proto__: { injected: true },
          'lead-test-1': { ...mockLead1, saved: true, savedAt: new Date().toISOString() },
        })
      );

      const leads = getSavedLeads();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'injected')).toBe(false);
      expect(leads.length).toBeGreaterThanOrEqual(1);
    });
  });
});
