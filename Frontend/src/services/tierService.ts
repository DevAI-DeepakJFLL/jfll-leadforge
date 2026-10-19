import {
  TierCountsResponse,
  TierFilterParams,
  PaginatedTierResponse,
  TieredLead,
} from '@/types/tierSegmentation';
import { logger } from '@/utils/logger';

const API_BASE_URL = '/api/v1/tiers';

export const DEFAULT_STARTER_TIER_COUNTS: TierCountsResponse = {
  tier_a: 3869,
  tier_b: 18624,
  parked: 6400,
  excluded: 2,
  unscored: 8378,
  all: 37273,
  capacity: {
    tier_a_count: 3869,
    total_scored: 28893,
    tier_a_percentage: 13.4,
    monthly_capacity: 150,
    exceeds_guideline: false,
    exceeds_capacity: true,
    suggested_cutoff: 75,
  },
};

export async function fetchTierCounts(): Promise<TierCountsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/counts`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    logger.warn('[TIER SERVICE] Failed to fetch tier counts, using cached telemetry', { err });
    return DEFAULT_STARTER_TIER_COUNTS;
  }
}

export async function fetchTierLeads(params: TierFilterParams = {}): Promise<PaginatedTierResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.minScore !== undefined) {
    query.set('min_score', String(params.minScore));
  }
  if (params.maxScore !== undefined) {
    query.set('max_score', String(params.maxScore));
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('page_size', String(params.pageSize));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/leads?${query.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      items: data.items || [],
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.page_size || 25,
      totalPages: data.total_pages || 0,
      hasNext: Boolean(data.has_next),
    };
  } catch (err) {
    logger.warn('[TIER SERVICE] Failed to fetch live tiered leads from API', { err });
    return {
      items: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 25,
      totalPages: 0,
      hasNext: false,
    };
  }
}

export async function fetchTierLeadBreakdown(leadId: string): Promise<TieredLead | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/${encodeURIComponent(leadId)}/breakdown`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    logger.warn(`[TIER SERVICE] Failed to fetch breakdown for lead ${leadId}`, { err });
    return null;
  }
}
