import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { queryDatamyneLeads } from '@/services/datamyneService';
import {
  logApproachActivity,
  getCachedApproachStatus,
  getCachedApproachLatestNote,
  clearCachedBulkStatuses,
} from '@/services/approachLogService';
import {
  fetchTrackedLeads,
  resetTrackerLocalCache,
  createTrackedLead,
  logTrackerActivity,
} from '@/services/leadTrackerService';
import { LeadTrackerTable } from '@/components/tracker/LeadTrackerTable';
import { LeadTrackerDrawer } from '@/components/tracker/LeadTrackerDrawer';

const memoryStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, val: string) => memoryStore.set(key, String(val)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() {
    return memoryStore.size;
  },
  key: (i: number) => Array.from(memoryStore.keys())[i] || null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

vi.mock('@/services/authService', () => ({
  getStoredSession: vi.fn(() => ({
    email: 'tester@jfll.com',
    name: 'Tester',
    role: 'Commercial',
    token: 'mock-tester-jwt-token',
  })),
  isOfflineSession: vi.fn(() => true),
  getAuthHeaders: vi.fn(() => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Device-Fingerprint': 'mock-fingerprint-tester',
    'Authorization': 'Bearer mock-tester-jwt-token',
  })),
}));

describe('E2E DataMyne -> Approach Log -> Lead Status Tracker Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    memoryStore.clear();
    clearCachedBulkStatuses();
    resetTrackerLocalCache();
  });

  it('verifies seeded DataMyne record, logs outreach by user "Tester", and confirms appearance in Lead Status Tracker', async () => {
    // -------------------------------------------------------------------------
    // 1. Verify seeded DataMyne sample data exists and is queryable
    // -------------------------------------------------------------------------
    const datamyneResult = queryDatamyneLeads({ q: 'TESTER FREIGHT' });
    expect(datamyneResult.items.length).toBeGreaterThanOrEqual(1);

    const seededLead = datamyneResult.items.find((item) => item.id === 'dm-test-77001');
    expect(seededLead).toBeDefined();
    expect(seededLead?.company_name).toBe('TESTER FREIGHT WORLDWIDE PVT LTD');
    expect(seededLead?.transport_mode).toBe('Air');
    expect(seededLead?.role).toBe('Exporter');
    expect(seededLead?.category).toBe('Engineering & Machinery');
    expect(seededLead?.city).toBe('Mumbai');
    expect(seededLead?.email).toBe('contact@testerfreight.com');
    expect(seededLead?.phone).toBe('+91 98200 88888');

    // Initial approach status must default to 'Not Contacted'
    const initialStatus = getCachedApproachStatus('datamyne', 'dm-test-77001');
    expect(initialStatus).toBe('Not Contacted');

    // -------------------------------------------------------------------------
    // 2. User 'Tester' logs approach outreach for this DataMyne lead
    // -------------------------------------------------------------------------
    const logResult = await logApproachActivity('datamyne', 'dm-test-77001', {
      action: 'Called customer',
      status: 'Contacted',
      company_name: 'TESTER FREIGHT WORLDWIDE PVT LTD',
      note: 'Spoke with logistics director; confirmed monthly air freight shipments ex-BOM to FRA and JFK.',
    });

    expect(logResult.current_status).toBe('Contacted');
    expect(logResult.logs.length).toBeGreaterThanOrEqual(1);
    expect(logResult.logs[0].salesperson_name).toBe('Tester');
    expect(logResult.logs[0].salesperson_email).toBe('tester@jfll.com');
    expect(logResult.logs[0].action).toBe('Called customer');

    // Verify in-memory and bulk caches reflect 'Contacted'
    const updatedStatus = getCachedApproachStatus('datamyne', 'dm-test-77001', 'TESTER FREIGHT WORLDWIDE PVT LTD');
    expect(updatedStatus).toBe('Contacted');

    const updatedNote = getCachedApproachLatestNote('datamyne', 'dm-test-77001');
    expect(updatedNote).toContain('Spoke with logistics director');

    // -------------------------------------------------------------------------
    // 3. Synchronize to Lead Status Tracker store & verify lead state
    // -------------------------------------------------------------------------
    const createdLead = await createTrackedLead({
      company_name: 'TESTER FREIGHT WORLDWIDE PVT LTD',
      contact_person: 'Tester Director',
      contact_phone: '+91 98200 88888',
      contact_email: 'contact@testerfreight.com',
      branch: 'Mumbai',
      assigned_to: 'Tester',
      assigned_to_email: 'tester@jfll.com',
      assigned_by: 'Tyra Theknath',
      assigned_date: '2026-11-15',
      status: 'Contacted',
      transport_mode: 'Air Freight',
      routing_type: 'Freehand',
      feedback_notes: 'Spoke with logistics director; confirmed monthly air freight shipments ex-BOM to FRA and JFK.',
      next_followup_date: '2026-11-20',
      next_action: 'Prepare and send spot air cargo rate quotation',
      linked_entity_type: 'datamyne',
      linked_entity_id: 'dm-test-77001',
    });

    await logTrackerActivity(createdLead.id, {
      author_name: 'Tester',
      author_email: 'tester@jfll.com',
      action: 'Called customer',
      notes: 'Spoke with logistics director; confirmed monthly air freight shipments ex-BOM to FRA and JFK.',
      status: 'Contacted',
    });

    const trackerLeads = await fetchTrackedLeads();
    expect(trackerLeads.length).toBe(1);

    const verifiedLead = trackerLeads[0];
    expect(verifiedLead.company_name).toBe('TESTER FREIGHT WORLDWIDE PVT LTD');
    expect(verifiedLead.status).toBe('Contacted');
    expect(verifiedLead.assigned_to).toBe('Tester');
    expect(verifiedLead.assigned_to_email).toBe('tester@jfll.com');
    expect(verifiedLead.linked_entity_type).toBe('datamyne');
    expect(verifiedLead.linked_entity_id).toBe('dm-test-77001');
    expect(verifiedLead.feedback_notes).toContain('Spoke with logistics director');
    expect(verifiedLead.history.some((h) => h.author_name === 'Tester' && h.action === 'Called customer')).toBe(true);

    // -------------------------------------------------------------------------
    // 4. Verify Lead Status Tracker UI Components render lead with correct status
    // -------------------------------------------------------------------------
    // Table view verification
    const tableHtml = renderToString(
      <LeadTrackerTable
        leads={[verifiedLead]}
        todayStr="2026-11-15"
        onSelectLead={() => {}}
      />
    );

    expect(tableHtml).toContain('TESTER FREIGHT WORLDWIDE PVT LTD');
    expect(tableHtml).toContain('Tester');
    expect(tableHtml).toContain('Contacted');
    expect(tableHtml).toContain('Air Freight');

    // Drawer view verification
    const drawerHtml = renderToString(
      <LeadTrackerDrawer
        lead={verifiedLead}
        isOpen={true}
        mode="edit"
        onClose={() => {}}
      />
    );

    expect(drawerHtml).toContain('TESTER FREIGHT WORLDWIDE PVT LTD');
    expect(drawerHtml).toContain(`ID: ${verifiedLead.id}`);
    expect(drawerHtml).toContain('Source: datamyne');
    expect(drawerHtml).toContain('By <span class="font-medium text-slate-700">Tester</span>');
    expect(drawerHtml).toContain('Contacted');
    expect(drawerHtml).toContain('Air Freight');
  });
});
