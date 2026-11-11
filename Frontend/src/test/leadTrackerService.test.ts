import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_TRACKER_STARTER_LEADS,
  computeTrackerKPIsInMemory,
  createTrackedLead,
  deleteTrackedLead,
  fetchTrackedLeadById,
  fetchTrackedLeads,
  fetchTrackerKPIs,
  filterTrackedLeadsInMemory,
  getAllTrackerCachedItems,
  getAuthHeaders,
  getFollowupStatus,
  getRateValidityInfo,
  getTrackerCachedItem,
  logTrackerActivity,
  resetTrackerLocalCache,
  seedTrackerLocalCacheForTesting,
  setTrackerCachedItems,
  updateTrackedLead,
} from '@/services/leadTrackerService';
import { MOCK_TRACKER_STARTER_LEADS } from '@/test/fixtures/leadTrackerFixtures';
import { API_BASE_URL } from '@/config/api';
import { LeadTrackerItem } from '@/types/leadTracker';

describe('Lead Tracker Service Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetTrackerLocalCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getFollowupStatus (DSA O(1) ISO Date Evaluation)', () => {
    const fixedToday = '2026-09-15';

    it('returns "none" when followup date is missing, empty, or whitespace', () => {
      expect(getFollowupStatus(null, 'Assigned', fixedToday)).toBe('none');
      expect(getFollowupStatus(undefined, 'Assigned', fixedToday)).toBe('none');
      expect(getFollowupStatus('', 'Assigned', fixedToday)).toBe('none');
      expect(getFollowupStatus('   ', 'Assigned', fixedToday)).toBe('none');
    });

    it('returns "none" for Won or Closed / Lost leads regardless of date', () => {
      expect(getFollowupStatus('2026-08-01', 'Won', fixedToday)).toBe('none');
      expect(getFollowupStatus('2026-08-01', 'Closed / Lost', fixedToday)).toBe('none');
      expect(getFollowupStatus('2026-10-01', 'Won', fixedToday)).toBe('none');
    });

    it('returns "overdue" when followup date is strictly earlier than today', () => {
      expect(getFollowupStatus('2026-09-14', 'Assigned', fixedToday)).toBe('overdue');
      expect(getFollowupStatus('2026-08-16', 'Quoted', fixedToday)).toBe('overdue');
    });

    it('returns "due_today" when followup date exactly equals today', () => {
      expect(getFollowupStatus('2026-09-15', 'Assigned', fixedToday)).toBe('due_today');
      expect(getFollowupStatus('2026-09-15', 'Feedback Received', fixedToday)).toBe('due_today');
    });

    it('returns "upcoming" when followup date is after today', () => {
      expect(getFollowupStatus('2026-09-16', 'Assigned', fixedToday)).toBe('upcoming');
      expect(getFollowupStatus('2026-09-24', 'Contacted', fixedToday)).toBe('upcoming');
      expect(getFollowupStatus('2026-12-31', 'Trial Shipment', fixedToday)).toBe('upcoming');
    });
  });

  describe('getRateValidityInfo (Freight Horizon Validity Calculation)', () => {
    const refDate = '2026-09-15';

    describe('none status when rate_validity_date is missing / empty', () => {
      it('returns "none" with "No Quote" label for empty lead or undefined/null/empty date', () => {
        expect(getRateValidityInfo({}, refDate)).toEqual({
          status: 'none',
          daysRemaining: null,
          label: 'No Quote',
          badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
          borderClass: 'border-slate-200',
        });
        expect(getRateValidityInfo(null, refDate)).toEqual({
          status: 'none',
          daysRemaining: null,
          label: 'No Quote',
          badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
          borderClass: 'border-slate-200',
        });
        expect(getRateValidityInfo({ rate_validity_date: null }, refDate)).toEqual({
          status: 'none',
          daysRemaining: null,
          label: 'No Quote',
          badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
          borderClass: 'border-slate-200',
        });
        expect(getRateValidityInfo({ rate_validity_date: '' }, refDate).status).toBe('none');
        expect(getRateValidityInfo({ rate_validity_date: '   ' }, refDate).status).toBe('none');
        expect(getRateValidityInfo({ rate_validity_date: 'invalid-date' }, refDate).status).toBe('none');
      });
    });

    describe('expired status when rate_validity_date is in the past', () => {
      it('returns "expired" with elapsed days and rose styling for dates before reference date', () => {
        const info1 = getRateValidityInfo({ rate_validity_date: '2026-09-14' }, refDate);
        expect(info1.status).toBe('expired');
        expect(info1.daysRemaining).toBe(-1);
        expect(info1.label).toBe('Expired (1d ago)');
        expect(info1.badgeClass).toContain('rose');
        expect(info1.borderClass).toContain('rose');

        const info15 = getRateValidityInfo({ rate_validity_date: '2026-08-31' }, refDate);
        expect(info15.status).toBe('expired');
        expect(info15.daysRemaining).toBe(-15);
        expect(info15.label).toBe('Expired (15d ago)');

        // Test on mock starter lead Royal Arc
        const royalArc = MOCK_TRACKER_STARTER_LEADS.find((l) => l.company_name === 'Royal Arc')!;
        const royalArcInfo = getRateValidityInfo(royalArc, refDate);
        expect(royalArcInfo.status).toBe('expired');
        expect(royalArcInfo.daysRemaining).toBe(-31);
        expect(royalArcInfo.label).toBe('Expired (31d ago)');
      });
    });

    describe('expiring_soon status when 0, 1, or 2 days left', () => {
      it('returns "Expires Today" when date exactly equals reference date (0 days left)', () => {
        const info = getRateValidityInfo({ rate_validity_date: '2026-09-15' }, refDate);
        expect(info.status).toBe('expiring_soon');
        expect(info.daysRemaining).toBe(0);
        expect(info.label).toBe('Expires Today');
        expect(info.badgeClass).toContain('amber');
        expect(info.borderClass).toContain('amber');
      });

      it('returns "1d left" when date is tomorrow (1 day left)', () => {
        const info = getRateValidityInfo({ rate_validity_date: '2026-09-16' }, refDate);
        expect(info.status).toBe('expiring_soon');
        expect(info.daysRemaining).toBe(1);
        expect(info.label).toBe('1d left');
        expect(info.badgeClass).toContain('amber');
      });

      it('returns "2d left" when date is in 2 days', () => {
        const info = getRateValidityInfo({ rate_validity_date: '2026-09-17' }, refDate);
        expect(info.status).toBe('expiring_soon');
        expect(info.daysRemaining).toBe(2);
        expect(info.label).toBe('2d left');
        expect(info.badgeClass).toContain('amber');
      });
    });

    describe('valid status when > 2 days left', () => {
      it('returns "valid" with emerald styling when 3 or more days left', () => {
        const info3 = getRateValidityInfo({ rate_validity_date: '2026-09-18' }, refDate);
        expect(info3.status).toBe('valid');
        expect(info3.daysRemaining).toBe(3);
        expect(info3.label).toBe('3d valid');
        expect(info3.badgeClass).toContain('emerald');
        expect(info3.borderClass).toContain('emerald');

        const info9 = getRateValidityInfo({ rate_validity_date: '2026-09-24' }, refDate);
        expect(info9.status).toBe('valid');
        expect(info9.daysRemaining).toBe(9);
        expect(info9.label).toBe('9d valid');

        // Test on mock starter lead CLEARSYNTH LABS
        const clearsynth = MOCK_TRACKER_STARTER_LEADS.find((l) => l.company_name === 'CLEARSYNTH LABS LIMITED')!;
        const clearsynthInfo = getRateValidityInfo(clearsynth, refDate);
        expect(clearsynthInfo.status).toBe('valid');
        expect(clearsynthInfo.daysRemaining).toBe(9);
        expect(clearsynthInfo.label).toBe('9d valid');
      });
    });

    describe('edge cases (exact today, month boundary, leap year)', () => {
      it('handles default reference date when referenceDateStr is omitted', () => {
        const todayUtc = new Date().toISOString().slice(0, 10);
        const infoToday = getRateValidityInfo({ rate_validity_date: todayUtc });
        expect(infoToday.status).toBe('expiring_soon');
        expect(infoToday.daysRemaining).toBe(0);
        expect(infoToday.label).toBe('Expires Today');
      });

      it('handles month boundaries in standard years', () => {
        // August 31 to September 1
        const infoAugToSep = getRateValidityInfo({ rate_validity_date: '2026-09-01' }, '2026-08-31');
        expect(infoAugToSep.daysRemaining).toBe(1);
        expect(infoAugToSep.label).toBe('1d left');
        expect(infoAugToSep.status).toBe('expiring_soon');

        // September 30 to October 1
        const infoSepToOct = getRateValidityInfo({ rate_validity_date: '2026-10-01' }, '2026-09-30');
        expect(infoSepToOct.daysRemaining).toBe(1);
        expect(infoSepToOct.label).toBe('1d left');

        // Year boundary: Dec 31 to Jan 1
        const infoYearBoundary = getRateValidityInfo({ rate_validity_date: '2027-01-01' }, '2026-12-31');
        expect(infoYearBoundary.daysRemaining).toBe(1);
        expect(infoYearBoundary.label).toBe('1d left');
      });

      it('handles February leap year vs non-leap year transitions', () => {
        // Non-leap year 2026: Feb 28 to March 1 is 1 day
        const nonLeap = getRateValidityInfo({ rate_validity_date: '2026-03-01' }, '2026-02-28');
        expect(nonLeap.daysRemaining).toBe(1);
        expect(nonLeap.label).toBe('1d left');

        // Leap year 2028: Feb 28 to March 1 is 2 days (Feb 29 exists)
        const leap28 = getRateValidityInfo({ rate_validity_date: '2028-03-01' }, '2028-02-28');
        expect(leap28.daysRemaining).toBe(2);
        expect(leap28.label).toBe('2d left');
        expect(leap28.status).toBe('expiring_soon');

        // Leap year 2028: Feb 29 to March 1 is 1 day
        const leap29 = getRateValidityInfo({ rate_validity_date: '2028-03-01' }, '2028-02-29');
        expect(leap29.daysRemaining).toBe(1);
        expect(leap29.label).toBe('1d left');

        // Leap year 2028: March 1 looking back at Feb 29 (expired 1 day ago)
        const leapBack = getRateValidityInfo({ rate_validity_date: '2028-02-29' }, '2028-03-01');
        expect(leapBack.daysRemaining).toBe(-1);
        expect(leapBack.label).toBe('Expired (1d ago)');
        expect(leapBack.status).toBe('expired');
      });
    });
  });

  describe('filterTrackedLeadsInMemory (Single-Pass Multi-Faceted Filtering & Sorting)', () => {
    const today = '2026-09-15';

    it('filters by branch accurately (case-insensitive)', () => {
      const gujaratLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { branch: 'Gujarat' },
        today
      );
      expect(gujaratLeads.length).toBe(3);
      expect(gujaratLeads.every((l) => l.branch === 'Gujarat')).toBe(true);

      const southLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { branch: 'south india' },
        today
      );
      expect(southLeads.length).toBe(1);
      expect(southLeads[0].company_name).toBe('Sun Bio');
    });

    it('filters by assigned sales rep (substring matching)', () => {
      const edwardLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { assigned_to: 'edward' },
        today
      );
      expect(edwardLeads.length).toBe(2);
      expect(edwardLeads.map((l) => l.company_name)).toEqual(
        expect.arrayContaining(['Royal Arc', 'CLEARSYNTH LABS LIMITED'])
      );

      const priyankaLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { assigned_to: 'priyanka' },
        today
      );
      expect(priyankaLeads.length).toBe(2);
    });

    it('filters by status stage', () => {
      const quotedLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { status: 'Quoted' },
        today
      );
      expect(quotedLeads.length).toBe(1);
      expect(quotedLeads[0].company_name).toBe('Royal Arc');

      const feedbackLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { status: 'Feedback Received' },
        today
      );
      expect(feedbackLeads.length).toBe(2);
    });

    it('filters overdue_only leads (strictly active with followup < today)', () => {
      const overdue = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { overdue_only: true },
        today
      );
      // Leads with followup < 2026-09-15:
      // Royal Arc (2026-08-16), VEA IMPEX (2026-09-09), GEMINI (2026-09-10), Sun Bio (2026-08-10),
      // Veer Internatinal (2026-08-10), Pooja Foods (2026-08-10), Kirti Foods (2026-08-10)
      expect(overdue.length).toBe(7);
      expect(overdue.every((l) => l.next_followup_date && l.next_followup_date < today)).toBe(true);
    });

    it('searches across company, contact, notes, and actions', () => {
      const pharmaMatches = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { search: 'pharma' },
        today
      );
      expect(pharmaMatches.length).toBe(2);
      expect(pharmaMatches.map((l) => l.company_name)).toEqual(
        expect.arrayContaining(['SIMSON PHARMA LIMITED', 'MEGA FINE PHARMA PRIVATE LIMITED'])
      );

      const fedexMatches = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { search: 'fedex' },
        today
      );
      expect(fedexMatches.length).toBe(1);
      expect(fedexMatches[0].company_name).toBe('CLEARSYNTH LABS LIMITED');
    });

    it('sorts by company_name ascending and descending', () => {
      const asc = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { sort_by: 'company_name', order: 'asc' },
        today
      );
      expect(asc[0].company_name).toBe('CLEARSYNTH LABS LIMITED');

      const desc = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { sort_by: 'company_name', order: 'desc' },
        today
      );
      expect(desc[0].company_name).toBe('Veer Internatinal');
    });

    it('sorts by next_followup_date with nulls placed at the bottom', () => {
      const sorted = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { sort_by: 'next_followup_date', order: 'asc' },
        today
      );
      // Items with null follow-up dates (e.g. MEGA FINE PHARMA) must be at the very end
      const lastItem = sorted[sorted.length - 1];
      expect(lastItem.next_followup_date).toBeNull();
      expect(lastItem.company_name).toBe('MEGA FINE PHARMA PRIVATE LIMITED');
      // Earliest date first (2026-08-10)
      expect(sorted[0].next_followup_date).toBe('2026-08-10');
    });
  });

  describe('computeTrackerKPIsInMemory (Aggregated Executive Telemetry)', () => {
    it('accurately computes KPIs on starter dataset', () => {
      const kpis = computeTrackerKPIsInMemory(MOCK_TRACKER_STARTER_LEADS, '2026-09-15');
      expect(kpis.total_leads).toBe(14);
      expect(kpis.active_leads).toBe(14); // none in starter dataset are Won or Closed
      expect(kpis.quoted_leads).toBe(1); // Royal Arc
      expect(kpis.won_leads).toBe(0);
      expect(kpis.overdue_leads).toBe(7);
    });

    it('accurately accounts for Won and Closed / Lost items', () => {
      const customItems: LeadTrackerItem[] = [
        {
          ...MOCK_TRACKER_STARTER_LEADS[0],
          id: 'test_1',
          status: 'Won',
          next_followup_date: '2026-08-01', // Should NOT count as overdue because Won
        },
        {
          ...MOCK_TRACKER_STARTER_LEADS[1],
          id: 'test_2',
          status: 'Closed / Lost',
          next_followup_date: '2026-08-01', // Should NOT count as overdue because Closed
        },
        {
          ...MOCK_TRACKER_STARTER_LEADS[2],
          id: 'test_3',
          status: 'Quoted',
          next_followup_date: '2026-08-01', // Overdue
        },
      ];

      const kpis = computeTrackerKPIsInMemory(customItems, '2026-09-15');
      expect(kpis.total_leads).toBe(3);
      expect(kpis.active_leads).toBe(1);
      expect(kpis.won_leads).toBe(1);
      expect(kpis.quoted_leads).toBe(1);
      expect(kpis.overdue_leads).toBe(1);
    });
  });

  describe('API Operations & Fallback Resilience', () => {
    beforeEach(() => {
      seedTrackerLocalCacheForTesting(MOCK_TRACKER_STARTER_LEADS);
    });

    it('fetchTrackedLeads fetches live leads when API is online and caches them', async () => {
      const mockApiData: LeadTrackerItem[] = [
        {
          ...MOCK_TRACKER_STARTER_LEADS[0],
          id: 'trk_live_001',
          company_name: 'Live Air Shipper Ltd',
        },
      ];

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        expect(url).toContain(`${API_BASE_URL}/api/v1/lead-tracker`);
        expect((init?.headers as Record<string, string>)?.Accept).toBe('application/json');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockApiData,
        });
      });

      const res = await fetchTrackedLeads({ branch: 'Mumbai' });
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('trk_live_001');

      // Verify cached in memory
      expect(getTrackerCachedItem('trk_live_001')?.company_name).toBe('Live Air Shipper Ltd');
    });

    it('fetchTrackedLeads falls back gracefully to in-memory starter leads on API failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or backend down'));

      const res = await fetchTrackedLeads({ branch: 'Gujarat' });
      expect(res.length).toBe(3);
      expect(res.every((l) => l.branch === 'Gujarat')).toBe(true);
    });

    it('fetchTrackerKPIs returns API response when online and falls back to calculation when offline', async () => {
      // 1. Online
      const mockKPIs = {
        total_leads: 50,
        active_leads: 45,
        quoted_leads: 12,
        won_leads: 5,
        overdue_leads: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockKPIs,
      });

      const resOnline = await fetchTrackerKPIs();
      expect(resOnline.total_leads).toBe(50);
      expect(resOnline.quoted_leads).toBe(12);

      // 2. Offline fallback
      global.fetch = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));
      const resOffline = await fetchTrackerKPIs();
      expect(resOffline.total_leads).toBe(14);
      expect(resOffline.quoted_leads).toBe(1);
    });

    it('fetchTrackedLeadById returns lead from API or memory cache', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Backend offline'));

      const lead = await fetchTrackedLeadById('trk_seed_001');
      expect(lead).toBeDefined();
      expect(lead.company_name).toBe('Royal Arc');
      expect(lead.assigned_to).toBe('Edward');

      await expect(fetchTrackedLeadById('trk_non_existent')).rejects.toThrow(
        "Tracked lead with ID 'trk_non_existent' not found"
      );
    });

    it('createTrackedLead creates lead online and caches it', async () => {
      const createdItem: LeadTrackerItem = {
        ...MOCK_TRACKER_STARTER_LEADS[0],
        id: 'trk_new_101',
        company_name: 'Cadila Pharma Export',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createdItem,
      });

      const result = await createTrackedLead({
        company_name: 'Cadila Pharma Export',
        assigned_to: 'Priyanka Sardesai',
        branch: 'Mumbai',
      });

      expect(result.id).toBe('trk_new_101');
      expect(result.company_name).toBe('Cadila Pharma Export');
      expect(getTrackerCachedItem('trk_new_101')).toBeDefined();
    });

    it('createTrackedLead creates lead locally with ID and history when offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await createTrackedLead({
        company_name: 'Sun Pharma Special Cargo',
        assigned_to: 'Edward',
        branch: 'Mumbai',
        status: 'Assigned',
        transport_mode: 'Air Freight',
        feedback_notes: 'Urgent temp-controlled samples shipment',
      });

      expect(result.id).toMatch(/^trk_/);
      expect(result.company_name).toBe('Sun Pharma Special Cargo');
      expect(result.assigned_to_email).toBe('edward@jfll.com');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].action).toBe('Lead Created / Assigned');
      expect(getTrackerCachedItem(result.id)).toBeDefined();
    });

    it('updateTrackedLead updates cache optimistically and appends history', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const initial = getTrackerCachedItem('trk_seed_001');
      expect(initial?.status).toBe('Quoted');
      const initialHistoryLen = initial?.history.length || 0;

      const updated = await updateTrackedLead('trk_seed_001', {
        status: 'Trial Shipment',
        feedback_notes: 'Client agreed to test trial shipment on FRA lane',
      });

      expect(updated.status).toBe('Trial Shipment');
      expect(updated.history.length).toBe(initialHistoryLen + 1);
      const latestHistory = updated.history[updated.history.length - 1];
      expect(latestHistory.action).toBe('Status Change');
      expect(latestHistory.notes).toContain("Status updated from 'Quoted' to 'Trial Shipment'");

      // Verify in-memory cache reflects update immediately
      expect(getTrackerCachedItem('trk_seed_001')?.status).toBe('Trial Shipment');
    });

    it('logTrackerActivity appends touchpoint to history and updates followup date', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await logTrackerActivity('trk_seed_002', {
        action: 'Held meeting',
        notes: 'Met Sunil Patil and FedEx account manager at Bombay Kurla Complex',
        status: 'Meeting Scheduled',
        next_followup_date: '2026-10-05',
      });

      expect(result.status).toBe('Meeting Scheduled');
      expect(result.next_followup_date).toBe('2026-10-05');
      const lastEntry = result.history[result.history.length - 1];
      expect(lastEntry.action).toBe('Held meeting');
      expect(lastEntry.notes).toContain('Met Sunil Patil');
    });

    it('deleteTrackedLead removes lead from in-memory cache and storage', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      expect(getTrackerCachedItem('trk_seed_003')).toBeDefined();
      const success = await deleteTrackedLead('trk_seed_003');
      expect(success).toBe(true);
      expect(getTrackerCachedItem('trk_seed_003')).toBeUndefined();
    });

    it('getAllTrackerCachedItems returns empty array by default when unseeded', () => {
      resetTrackerLocalCache();
      const all = getAllTrackerCachedItems();
      expect(all).toEqual([]);
      expect(DEFAULT_TRACKER_STARTER_LEADS).toEqual([]);
    });

    it('getAllTrackerCachedItems and setTrackerCachedItems manipulate cache correctly', () => {
      resetTrackerLocalCache();
      expect(getAllTrackerCachedItems()).toHaveLength(0);

      const customList: LeadTrackerItem[] = [MOCK_TRACKER_STARTER_LEADS[0]];
      setTrackerCachedItems(customList);
      expect(getAllTrackerCachedItems()).toHaveLength(1);
      expect(getTrackerCachedItem('trk_seed_001')).toBeDefined();
    });

    it('getAuthHeaders includes Content-Type, Accept, and anti-bot fingerprint', () => {
      const headers = getAuthHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['X-Device-Fingerprint']).toBeDefined();
    });
  });
});
