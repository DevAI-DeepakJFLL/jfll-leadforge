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
import { normalizeCityString } from '@/services/datamyneService';

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

export function setLoadedTierDataset(data: TieredLead[]): void {
  cachedFullTierDataset = data;
}

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
      const raw: any[] = await res.json();
      const data: TieredLead[] = raw.map((d) => ({
        ...d,
        country: d.country || 'India',
      }));
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
 * Provides offline resilience, instant placeholder rendering, and full multi-faceted filtering.
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
    countries = [],
    transportModes = [],
    categories = [],
    subcategories = [],
    roles = [],
    cities = [],
    tradeLanes = [],
    contactStatus = [],
    minShipments,
    minTradedValueUsd,
    hasDirectors,
    dataset,
  } = params;

  // Pre-compile filter lookup structures for O(1) membership tests and single-pass iteration
  const countrySet = countries.length > 0 ? new Set(countries) : null;
  const transportModeSet = transportModes.length > 0 ? new Set(transportModes) : null;
  const categorySet = categories.length > 0 ? new Set(categories) : null;
  const subcategorySet = subcategories.length > 0 ? new Set(subcategories) : null;
  const contactStatusSet = contactStatus.length > 0 ? new Set(contactStatus) : null;

  const hasExp = roles.includes('Exporter');
  const hasImp = roles.includes('Importer');
  const hasBoth = roles.includes('Both') || roles.includes('Both (Exporter & Importer)');
  const filterRoles = roles.length > 0;

  const normalizedFilterCities = cities.length > 0 ? cities.map(normalizeCityString) : null;
  const searchTerm = search?.trim().toLowerCase() || null;
  const statusNorm = status && status !== 'all' ? status.toLowerCase().replace(/[-_]/g, ' ').trim() : null;

  const filtered: TieredLead[] = [];

  for (let i = 0; i < allLeads.length; i++) {
    const lead = allLeads[i];

    // 1. Status Filter
    if (statusNorm) {
      const leadStatusNorm = (lead.segment_status || '').toLowerCase().replace(/[-_]/g, ' ').trim();
      if (leadStatusNorm !== statusNorm) continue;
    }

    // 2. Score Bounds
    if (minScore !== undefined && lead.total_score < minScore) continue;
    if (maxScore !== undefined && lead.total_score > maxScore) continue;

    // 3. Search Filter
    if (searchTerm) {
      const matched =
        lead.company_name.toLowerCase().includes(searchTerm) ||
        (lead.city && lead.city.toLowerCase().includes(searchTerm)) ||
        (lead.category && lead.category.toLowerCase().includes(searchTerm)) ||
        (lead.subcategory && lead.subcategory.toLowerCase().includes(searchTerm)) ||
        (lead.top_hs_codes && lead.top_hs_codes.toLowerCase().includes(searchTerm)) ||
        (lead.address && lead.address.toLowerCase().includes(searchTerm)) ||
        (lead.directors && lead.directors.toLowerCase().includes(searchTerm)) ||
        (lead.tax_id && lead.tax_id.toLowerCase().includes(searchTerm));
      if (!matched) continue;
    }

    // 4. Country Filter
    if (countrySet && !countrySet.has(lead.country || 'India')) continue;

    // 5. Transport Mode Filter
    if (transportModeSet && !transportModeSet.has(lead.transport_mode as any)) continue;

    // 6. Category Filter
    if (categorySet && !categorySet.has(lead.category)) continue;

    // 7. Subcategory Filter
    if (subcategorySet && !subcategorySet.has(lead.subcategory)) continue;

    // 8. Role Filter
    if (filterRoles) {
      const isDual = lead.role === 'Both' || lead.role === 'Both (Exporter & Importer)';
      const roleMatches =
        (hasBoth && isDual) ||
        (hasExp && lead.role === 'Exporter') ||
        (hasImp && lead.role === 'Importer') ||
        (hasExp && hasImp && isDual);
      if (!roleMatches) continue;
    }

    // 9. Cities Filter
    if (normalizedFilterCities) {
      if (!lead.city || !lead.city.trim()) continue;
      const dCityNorm = normalizeCityString(lead.city);
      const cityMatches = normalizedFilterCities.some(
        (cNorm) => dCityNorm.includes(cNorm) || cNorm.includes(dCityNorm)
      );
      if (!cityMatches) continue;
    }

    // 10. Trade Lanes Filter
    if (tradeLanes.length > 0) {
      const tlMatches = tradeLanes.some((tl) => lead.trade_lanes.includes(tl));
      if (!tlMatches) continue;
    }

    // 11. Contact Status Filter
    if (contactStatusSet) {
      const hasPhone = Boolean(lead.phone);
      const hasEmail = Boolean(lead.email);
      const csMatches =
        (contactStatusSet.has('both') && hasPhone && hasEmail) ||
        (contactStatusSet.has('phone_only') && hasPhone && !hasEmail) ||
        (contactStatusSet.has('email_only') && !hasPhone && hasEmail) ||
        (contactStatusSet.has('missing') && !hasPhone && !hasEmail);
      if (!csMatches) continue;
    }

    // 12. Shipments & Value Thresholds
    if (minShipments !== undefined && minShipments > 0 && lead.total_shipments < minShipments) continue;
    if (minTradedValueUsd !== undefined && minTradedValueUsd > 0 && lead.total_value_usd < minTradedValueUsd) continue;

    // 13. Has Directors Filter
    if (hasDirectors && (!lead.directors || lead.directors.trim().length === 0)) continue;

    // 14. Dataset Type Filter
    if (dataset && dataset !== 'all' && lead.dataset_type !== dataset) continue;

    filtered.push(lead);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
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

/**
 * Computes live tier distribution counts matching active non-status filters.
 */
export function queryTierCountsLocal(params: Partial<TierFilterParams> = {}): TierCountsResponse {
  const allLeads = getLoadedTierDataset();
  const paramsWithoutStatus: TierFilterParams = {
    ...params,
    status: undefined,
    page: 1,
    pageSize: allLeads.length || 50000,
  };
  const res = queryTierLeadsLocal(paramsWithoutStatus);
  const matched = res.items;

  const counts: Record<string, number> = {};
  matched.forEach((l) => {
    const s = l.segment_status || 'Unscored';
    counts[s] = (counts[s] || 0) + 1;
  });

  const tier_a = counts['Tier A'] || 0;
  const tier_b = counts['Tier B'] || 0;
  const parked = counts['Parked'] || 0;
  const excluded = counts['Excluded'] || 0;
  const unscored = counts['Unscored'] || 0;
  const all = matched.length;

  return {
    tier_a,
    tier_b,
    parked,
    excluded,
    unscored,
    all,
    capacity: {
      tier_a_count: tier_a,
      total_scored: tier_a + tier_b + parked,
      tier_a_percentage:
        tier_a + tier_b + parked > 0
          ? Number(((tier_a / (tier_a + tier_b + parked)) * 100).toFixed(1))
          : 0,
      monthly_capacity: 150,
      exceeds_guideline: false,
      exceeds_capacity: tier_a > 150,
      suggested_cutoff: 75,
    },
  };
}

/**
 * Helper to serialize all tier and sidebar faceted filter params into URLSearchParams.
 */
export function appendTierFilterParams(query: URLSearchParams, params: TierFilterParams): void {
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
  if (params.countries && params.countries.length > 0) {
    params.countries.forEach((c) => query.append('countries', c));
  }
  if (params.transportModes && params.transportModes.length > 0) {
    params.transportModes.forEach((m) => query.append('transport_modes', m));
  }
  if (params.categories && params.categories.length > 0) {
    params.categories.forEach((c) => query.append('categories', c));
  }
  if (params.subcategories && params.subcategories.length > 0) {
    params.subcategories.forEach((s) => query.append('subcategories', s));
  }
  if (params.roles && params.roles.length > 0) {
    params.roles.forEach((r) => query.append('roles', r));
  }
  if (params.cities && params.cities.length > 0) {
    params.cities.forEach((c) => query.append('cities', c));
  }
  if (params.tradeLanes && params.tradeLanes.length > 0) {
    params.tradeLanes.forEach((tl) => query.append('trade_lanes', tl));
  }
  if (params.contactStatus && params.contactStatus.length > 0) {
    params.contactStatus.forEach((cs) => query.append('contact_status', cs));
  }
  if (params.minShipments !== undefined && params.minShipments > 0) {
    query.set('min_shipments', String(params.minShipments));
  }
  if (params.minTradedValueUsd !== undefined && params.minTradedValueUsd > 0) {
    query.set('min_value', String(params.minTradedValueUsd));
  }
  if (params.hasDirectors) {
    query.set('has_directors', 'true');
  }
  if (params.dataset && params.dataset !== 'all') {
    query.set('dataset', params.dataset);
  }
}

export async function fetchTierCounts(params?: Partial<TierFilterParams>): Promise<TierCountsResponse> {
  const query = new URLSearchParams();
  if (params) {
    appendTierFilterParams(query, params as TierFilterParams);
  }
  const queryString = query.toString();
  const url = queryString ? `${TIER_API_URL}/counts?${queryString}` : `${TIER_API_URL}/counts`;

  try {
    const res = await fetch(url, {
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
    if (params && Object.keys(params).length > 0) {
      return queryTierCountsLocal(params);
    }
    return DEFAULT_STARTER_TIER_COUNTS;
  }
}

export async function fetchTierLeads(params: TierFilterParams = {}): Promise<PaginatedTierResponse> {
  const query = new URLSearchParams();
  appendTierFilterParams(query, params);

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

