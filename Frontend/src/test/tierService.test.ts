import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchTierCounts,
  fetchTierLeads,
  fetchTierLeadBreakdown,
  queryTierLeadsLocal,
  DEFAULT_STARTER_TIER_COUNTS,
} from '@/services/tierService';
import { API_BASE_URL } from '@/config/api';
import { AUTH_STORAGE_KEY } from '@/services/authService';

describe('Tier Service Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('fetchTierCounts returns API counts when backend is online and includes API_BASE_URL and Accept header', async () => {
    const mockCounts = {
      tier_a: 3869,
      tier_b: 18624,
      parked: 6400,
      excluded: 2,
      unscored: 8378,
      all: 37273,
    };

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      expect(url).toBe(`${API_BASE_URL}/api/v1/tiers/counts`);
      expect((init?.headers as Record<string, string>)?.Accept).toBe('application/json');
      return Promise.resolve({
        ok: true,
        json: async () => mockCounts,
      });
    });

    const res = await fetchTierCounts();
    expect(res.tier_a).toBe(3869);
    expect(res.all).toBe(37273);
  });

  it('attaches Authorization Bearer token header when active session exists', async () => {
    const mockStorage: Record<string, string> = {
      [AUTH_STORAGE_KEY]: JSON.stringify({
        name: 'Deepak Naidu',
        email: 'deepak.naidu@jfll.com',
        role: 'Tech Lead',
        token: 'mock-auth-token-12345',
      }),
    };
    (globalThis as unknown as { window?: { sessionStorage: unknown } }).window = {
      sessionStorage: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {},
      },
    };

    let capturedHeaders: Record<string, string> | undefined;
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      expect(url).toBe(`${API_BASE_URL}/api/v1/tiers/counts`);
      capturedHeaders = init?.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          tier_a: 10,
          tier_b: 20,
          parked: 5,
          excluded: 0,
          unscored: 0,
          all: 35,
        }),
      });
    });

    await fetchTierCounts();
    expect(capturedHeaders?.Authorization).toBe('Bearer mock-auth-token-12345');
    expect(capturedHeaders?.Accept).toBe('application/json');
  });

  it('fetchTierCounts falls back gracefully to default telemetry when backend is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const res = await fetchTierCounts();
    expect(res).toEqual(DEFAULT_STARTER_TIER_COUNTS);
    expect(res.tier_a).toBe(3869);
  });

  it('fetchTierLeads formats query parameters, passes headers and parses paginated response', async () => {
    const mockData = {
      page: 1,
      page_size: 25,
      total: 3869,
      total_pages: 155,
      has_next: true,
      items: [
        {
          id: 'dm-val-00001',
          company_name: 'TRENT LIMITED',
          segment_status: 'Tier A',
          total_score: 76,
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      expect(url).toContain(`${API_BASE_URL}/api/v1/tiers/leads`);
      expect(url).toContain('status=Tier+A');
      expect((init?.headers as Record<string, string>)?.Accept).toBe('application/json');
      return Promise.resolve({
        ok: true,
        json: async () => mockData,
      });
    });

    const res = await fetchTierLeads({ status: 'Tier A', page: 1, pageSize: 25 });
    expect(res.total).toBe(3869);
    expect(res.items.length).toBe(1);
    expect(res.items[0].segment_status).toBe('Tier A');
  });

  it('fetchTierLeadBreakdown returns single lead audit breakdown with proper endpoint and headers', async () => {
    const mockBreakdown = {
      id: 'dm-val-00001',
      company_name: 'TRENT LIMITED',
      segment_status: 'Tier A',
      total_score: 76,
      score_breakdown: {
        frequency_score: 20,
        mode_score: 15,
        lane_score: 15,
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      expect(url).toBe(`${API_BASE_URL}/api/v1/tiers/dm-val-00001/breakdown`);
      expect((init?.headers as Record<string, string>)?.Accept).toBe('application/json');
      return Promise.resolve({
        ok: true,
        json: async () => mockBreakdown,
      });
    });

    const res = await fetchTierLeadBreakdown('dm-val-00001');
    expect(res?.id).toBe('dm-val-00001');
    expect(res?.score_breakdown.frequency_score).toBe(20);
  });

  it('fetchTierLeads falls back gracefully to starter dataset when backend is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline or backend down'));

    const res = await fetchTierLeads({ status: 'Tier A', page: 1, pageSize: 25 });
    expect(res.total).toBeGreaterThan(0);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].segment_status).toBe('Tier A');
  });

  it('queryTierLeadsLocal filters properly across Tier A, Tier B, and Parked', () => {
    const tierARes = queryTierLeadsLocal({ status: 'Tier A' });
    expect(tierARes.items.length).toBeGreaterThan(0);
    expect(tierARes.items.every((l) => l.segment_status === 'Tier A')).toBe(true);

    const tierBRes = queryTierLeadsLocal({ status: 'tier-b' });
    expect(tierBRes.items.length).toBeGreaterThan(0);
    expect(tierBRes.items.every((l) => l.segment_status === 'Tier B')).toBe(true);

    const parkedRes = queryTierLeadsLocal({ status: 'parked' });
    expect(parkedRes.items.length).toBeGreaterThan(0);
    expect(parkedRes.items.every((l) => l.segment_status === 'Parked')).toBe(true);
  });

  it('fetchTierLeadBreakdown falls back to starter dataset lead when API fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const sampleLeadId = 'dm-val-00004';
    const res = await fetchTierLeadBreakdown(sampleLeadId);
    expect(res).not.toBeNull();
    expect(res?.id).toBe(sampleLeadId);
    expect(res?.segment_status).toBe('Tier A');
    expect(res?.score_breakdown).toBeDefined();
  });
});

