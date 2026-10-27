import {
  TierCountsResponse,
  TierFilterParams,
  PaginatedTierResponse,
  TieredLead,
} from '@/types/tierSegmentation';
import { TIER_STARTER_DATA } from '@/data/tierStarterData';
import { logger } from '@/utils/logger';
import { API_BASE_URL } from '@/config/api';
import { getStoredSession, isOfflineSession } from '@/services/authService';

const TIER_API_URL = `${API_BASE_URL}/api/v1/tiers`;

function getAuthHeader(): Record<string, string> {
  try {
    const session = getStoredSession();
    if (session?.token && !isOfflineSession(session)) {
      return { Authorization: `Bearer ${session.token}` };
    }
  } catch {
    // Graceful handling of storage access exceptions
  }
  return {};
}

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

// In-memory tiered leads storage: starts with bundled starter set and upgrades if full JSON is loaded
let cachedFullTierDataset: TieredLead[] | null = null;
let isLoadingFullTierData = false;

/**
 * Lazily load full 37,273 scored records from public JSON in the background
 */
export async function loadFullTierDataset(): Promise<TieredLead[]> {
  if (cachedFullTierDataset) return cachedFullTierDataset;
  if (isLoadingFullTierData) return TIER_STARTER_DATA;

  isLoadingFullTierData = true;
  try {
    const res = await fetch('/data/datamyne_tier_segments.json');
    if (res.ok) {
      const data: TieredLead[] = await res.json();
      cachedFullTierDataset = data;
      logger.info('TIER SERVICE', `Loaded full tier dataset with ${data.length} records into memory.`);
      return data;
    }
  } catch (err) {
    logger.warn('TIER SERVICE', 'Failed to fetch /data/datamyne_tier_segments.json, continuing with starter dataset', { error: String(err) });
  } finally {
    isLoadingFullTierData = false;
  }
  return TIER_STARTER_DATA;
}

export function getLoadedTierDataset(): TieredLead[] {
  return cachedFullTierDataset || TIER_STARTER_DATA;
}

/**
 * Synchronously filter and paginate local tiered leads.
 * Provides offline resilience and instant placeholder rendering.
 */
export function queryTierLeadsLocal(params: TierFilterParams = {}): PaginatedTierResponse {
  const allLeads = getLoadedTierDataset();
  const {
    status,
    search,
    minScore,
    maxScore,
    page = 1,
    pageSize = 25,
  } = params;

  let filtered = [...allLeads];

  // 1. Status Filter
  if (status && status !== 'all') {
    const sNorm = status.toLowerCase().replace(/[-_]/g, ' ').trim();
    filtered = filtered.filter((lead) => {
      const leadStatusNorm = (lead.segment_status || '').toLowerCase().replace(/[-_]/g, ' ').trim();
      return leadStatusNorm === sNorm;
    });
  }

  // 2. Search Filter (Company, City, Category, Subcategory, HS codes)
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    filtered = filtered.filter((lead) => {
      return (
        lead.company_name.toLowerCase().includes(term) ||
        (lead.city && lead.city.toLowerCase().includes(term)) ||
        (lead.category && lead.category.toLowerCase().includes(term)) ||
        (lead.subcategory && lead.subcategory.toLowerCase().includes(term)) ||
        (lead.top_hs_codes && lead.top_hs_codes.toLowerCase().includes(term))
      );
    });
  }

  // 3. Score Bounds
  if (minScore !== undefined) {
    filtered = filtered.filter((lead) => lead.total_score >= minScore);
  }
  if (maxScore !== undefined) {
    filtered = filtered.filter((lead) => lead.total_score <= maxScore);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const items = filtered.slice(startIndex, startIndex + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNext: safePage < totalPages,
  };
}

export async function fetchTierCounts(): Promise<TierCountsResponse> {
  try {
    const res = await fetch(`${TIER_API_URL}/counts`, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    logger.warn('TIER SERVICE', 'Failed to fetch tier counts, using cached telemetry', { error: String(err) });
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
    const res = await fetch(`${TIER_API_URL}/leads?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeader(),
      },
    });
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
    logger.warn('TIER SERVICE', 'Failed to fetch live tiered leads from API, falling back to local dataset', { error: String(err) });
    return queryTierLeadsLocal(params);
  }
}

export async function fetchTierLeadBreakdown(leadId: string): Promise<TieredLead | null> {
  try {
    const res = await fetch(`${TIER_API_URL}/${encodeURIComponent(leadId)}/breakdown`, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    logger.warn('TIER SERVICE', `Failed to fetch breakdown for lead ${leadId}, using local dataset`, { error: String(err) });
    const local = getLoadedTierDataset().find((l) => l.id === leadId);
    return local || null;
  }
}

