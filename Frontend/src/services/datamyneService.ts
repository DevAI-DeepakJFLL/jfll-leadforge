import { DATAMYNE_STARTER_DATA } from '@/data/datamyneLeadsData';
import {
  DatamyneLead,
  DatamyneFilterParams,
  DatamyneResponse,
  DatamyneAudienceCounts,
  TAB_TO_CATEGORY_MAP,
} from '@/types/datamyneLead';
import { logger } from '@/utils/logger';
import { createCsvBlob } from '@/utils/csv';
import { setLoadedTierDataset } from '@/services/tierService';
import { TieredLead } from '@/types/tierSegmentation';
import { getCachedApproachStatus, getCachedApproachLatestNote } from '@/services/approachLogService';

// In-memory leads storage, starts with the bundled starter set and upgrades if full JSON is loaded
let cachedFullDataset: DatamyneLead[] | null = null;
let isLoadingFullData = false;

type DatasetListener = () => void;
const datasetListeners: Set<DatasetListener> = new Set();

export function subscribeToDatamyneDataset(listener: DatasetListener): () => void {
  datasetListeners.add(listener);
  return () => {
    datasetListeners.delete(listener);
  };
}

export function isDatamyneDatasetLoading(): boolean {
  return isLoadingFullData;
}

function notifyDatasetListeners(): void {
  datasetListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function setLoadedDatamyneDataset(data: DatamyneLead[]): void {
  cachedFullDataset = data;
  notifyDatasetListeners();
}

const cityNormCache = new Map<string, string>();

/**
 * Normalizes city names by stripping diacritics/accents and converting to uppercase
 * for robust cross-geographic matching (e.g. SÃO PAULO <-> SAO PAULO).
 * Results are cached in a Map to avoid repeated Unicode decomposition.
 */
export function normalizeCityString(str: string): string {
  if (!str) return '';
  const cached = cityNormCache.get(str);
  if (cached !== undefined) return cached;
  const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  cityNormCache.set(str, normalized);
  return normalized;
}

/**
 * Lazily load full 37,273 records from public JSON in the background
 */
export async function loadFullDatamyneDataset(): Promise<DatamyneLead[]> {
  if (cachedFullDataset) return cachedFullDataset;
  if (isLoadingFullData) return DATAMYNE_STARTER_DATA;

  isLoadingFullData = true;
  notifyDatasetListeners();
  try {
    const res = await fetch('/data/datamyne_tier_segments.json');
    if (res.ok) {
      const rawData: any[] = await res.json();
      const data: DatamyneLead[] = rawData.map((d) => ({
        ...d,
        country: d.country || 'India',
        _normCity: d.city ? normalizeCityString(d.city) : '',
      }));
      cachedFullDataset = data;
      setLoadedTierDataset(data as unknown as TieredLead[]);
      logger.info('DATAMYNE', `Loaded full dataset with ${data.length} records into memory.`);
      return data;
    }
  } catch (err) {
    logger.warn('DATAMYNE', 'Failed to fetch /data/datamyne_tier_segments.json, continuing with starter dataset', { err });
  } finally {
    isLoadingFullData = false;
    notifyDatasetListeners();
  }
  return DATAMYNE_STARTER_DATA;
}

export function getLoadedDatamyneDataset(): DatamyneLead[] {
  return cachedFullDataset || DATAMYNE_STARTER_DATA;
}

/**
 * Filter and query DataMyne Leads synchronously
 */
export function queryDatamyneLeads(params: DatamyneFilterParams = {}): DatamyneResponse {
  const dataset = getLoadedDatamyneDataset();
  const {
    q,
    hsCode,
    dataset: datasetType = 'valid',
    tab = 'all',
    countries = [],
    transportModes = [],
    categories = [],
    subcategories = [],
    roles = [],
    cities = [],
    tradeLanes = [],
    contactStatus = [],
    approachStatuses = [],
    minShipments,
    minTradedValueUsd,
    hasDirectors,
    page = 1,
    limit = 25,
  } = params;

  // Pre-compile filter lookup structures for O(1) membership and single-pass iteration
  const countrySet = countries && countries.length > 0 ? new Set(countries) : null;
  const transportModeSet = transportModes && transportModes.length > 0 ? new Set(transportModes) : null;
  const categorySet = categories && categories.length > 0 ? new Set(categories) : null;
  const subcategorySet = subcategories && subcategories.length > 0 ? new Set(subcategories) : null;
  const approachStatusSet = approachStatuses && approachStatuses.length > 0 ? new Set(approachStatuses) : null;

  const filterRoles = Boolean(roles && roles.length > 0);
  const hasExp = filterRoles && roles.includes('Exporter');
  const hasImp = filterRoles && roles.includes('Importer');
  const hasBoth = filterRoles && (roles.includes('Both') || roles.includes('Both (Exporter & Importer)'));

  const normalizedFilterCities = cities && cities.length > 0 ? cities.map(normalizeCityString) : null;
  const cityExactSet = normalizedFilterCities ? new Set(normalizedFilterCities) : null;
  const query = q && q.trim() ? q.trim().toLowerCase() : null;
  const cleanHs = hsCode ? hsCode.replace(/[^0-9a-zA-Z]/g, '').trim().toLowerCase() : null;

  const contactStatusSet = contactStatus && contactStatus.length > 0 ? new Set(contactStatus) : null;
  const hasContactBoth = contactStatusSet?.has('both') ?? false;
  const hasContactPhoneOnly = contactStatusSet?.has('phone_only') ?? false;
  const hasContactEmailOnly = contactStatusSet?.has('email_only') ?? false;
  const hasContactMissing = contactStatusSet?.has('missing') ?? false;

  const tabCategory = TAB_TO_CATEGORY_MAP[tab];
  // If explicit categories multi-select is active and doesn't include tabCategory,
  // honor the explicit categories filter to prevent empty impossible intersections.
  const filterByTab = Boolean(tabCategory && (!categorySet || categorySet.has(tabCategory)));

  let validTotal = 0;
  let missingTotal = 0;
  let baseTotal = 0;

  const audienceCounts: DatamyneAudienceCounts = {
    all: 0,
    perishables: 0,
    pharma: 0,
    textiles: 0,
    engineering: 0,
    chemicals: 0,
    electronics: 0,
    automotive: 0,
    general: 0,
    validTotal: 0,
    missingTotal: 0,
  };

  const filtered: DatamyneLead[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const d = dataset[i];

    // 1a. Country Filter
    if (countrySet && !countrySet.has(d.country || 'India')) continue;

    // 1b. Transport Mode Filter
    if (transportModeSet && !transportModeSet.has(d.transport_mode as any)) continue;

    // 1b-2. HS Code Filter
    if (cleanHs) {
      if (!d.top_hs_codes) continue;
      const hsCodesList = d.top_hs_codes
        .split(',')
        .map((code) => code.replace(/[^0-9a-zA-Z]/g, '').toLowerCase())
        .filter(Boolean);
      const matchesHs = hsCodesList.some(
        (code) => code.startsWith(cleanHs) || cleanHs.startsWith(code)
      );
      if (!matchesHs) continue;
    }

    // 1c. Search Query
    if (query) {
      const match =
        d.company_name.toLowerCase().includes(query) ||
        (d.country && d.country.toLowerCase().includes(query)) ||
        d.city.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.subcategory.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        d.tax_id.toLowerCase().includes(query) ||
        d.directors.toLowerCase().includes(query) ||
        d.top_hs_codes.toLowerCase().includes(query);
      if (!match) continue;
    }

    // 1d. Category Filter
    if (categorySet && !categorySet.has(d.category)) continue;

    // 1e. Subcategory Filter
    if (subcategorySet && !subcategorySet.has(d.subcategory)) continue;

    // 1f. Trading Role Filter
    if (filterRoles) {
      const isDualLead = d.role === 'Both' || d.role === 'Both (Exporter & Importer)';
      const isExpLead = d.role === 'Exporter';
      const isImpLead = d.role === 'Importer';

      const roleMatches =
        (hasBoth && isDualLead) ||
        (hasExp && isExpLead) ||
        (hasImp && isImpLead) ||
        (hasExp && hasImp && isDualLead);
      if (!roleMatches) continue;
    }

    // 1g. City Filter (O(1) exact match check with fallback substring scan for composite addresses)
    if (normalizedFilterCities && cityExactSet) {
      if (!d.city || !d.city.trim()) continue;
      const dCityNorm = d._normCity || (d._normCity = normalizeCityString(d.city));
      if (!cityExactSet.has(dCityNorm)) {
        const cityMatches = normalizedFilterCities.some(
          (cNorm) => dCityNorm.includes(cNorm) || cNorm.includes(dCityNorm)
        );
        if (!cityMatches) continue;
      }
    }

    // 1h. Trade Corridor Filter
    if (tradeLanes && tradeLanes.length > 0) {
      if (!tradeLanes.some((tl) => d.trade_lanes.includes(tl))) continue;
    }

    // 1i. Contact Status Filter
    if (contactStatusSet) {
      const hasPhone = Boolean(d.phone);
      const hasEmail = Boolean(d.email);
      const csMatches =
        (hasContactBoth && hasPhone && hasEmail) ||
        (hasContactPhoneOnly && hasPhone && !hasEmail) ||
        (hasContactEmailOnly && !hasPhone && hasEmail) ||
        (hasContactMissing && !hasPhone && !hasEmail);
      if (!csMatches) continue;
    }

    // 1j. Volume & Value Thresholds
    if (minShipments && minShipments > 0 && d.total_shipments < minShipments) continue;
    if (minTradedValueUsd && minTradedValueUsd > 0 && d.total_value_usd < minTradedValueUsd) continue;

    // 1k. Has Directors Filter
    if (hasDirectors && (!d.directors || d.directors.trim().length === 0)) continue;

    // 1l. Sales Approach Status Multi-select
    if (approachStatusSet) {
      const st = getCachedApproachStatus('datamyne', d.id);
      if (!approachStatusSet.has(st)) continue;
    }

    // --- Base Filter Passed ---
    baseTotal++;
    const itemType = d.dataset_type;
    if (itemType === 'valid') validTotal++;
    else if (itemType === 'missing') missingTotal++;

    // 2. Scope dataset check: 'valid' | 'missing' | 'all'
    if (datasetType === 'valid' && itemType !== 'valid') continue;
    if (datasetType === 'missing' && itemType !== 'missing') continue;

    // --- Scope Dataset Passed ---
    audienceCounts.all++;
    const cat = d.category;
    if (cat === 'Perishables') audienceCounts.perishables++;
    else if (cat === 'Pharma & Healthcare') audienceCounts.pharma++;
    else if (cat === 'Textiles & Apparel') audienceCounts.textiles++;
    else if (cat === 'Engineering & Machinery') audienceCounts.engineering++;
    else if (cat === 'Chemicals & Materials') audienceCounts.chemicals++;
    else if (cat === 'Electronics & Electrical') audienceCounts.electronics++;
    else if (cat === 'Automotive & EV') audienceCounts.automotive++;
    else if (cat === 'General Cargo') audienceCounts.general++;

    // 3. Tab Filter
    if (!filterByTab || cat === tabCategory) {
      filtered.push(d);
    }
  }

  audienceCounts.validTotal = validTotal;
  audienceCounts.missingTotal = missingTotal;

  const datasetCounts = {
    valid: validTotal,
    missing: missingTotal,
    all: baseTotal,
  };

  const totalEstimate = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEstimate / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return {
    items,
    totalEstimate,
    totalFormatted: totalEstimate.toLocaleString('en-US'),
    page: safePage,
    limit,
    totalPages,
    audienceCounts,
    datasetCounts,
  };
}

/**
 * Export selected DataMyne leads to sanitized CSV Blob
 */
export function exportDatamyneLeadsCsv(leads: DatamyneLead[]): Blob {
  const headers = [
    'Company Name',
    'Country',
    'Trading Role',
    'Transport Mode',
    'Logistics Category',
    'Cargo Subcategory',
    'Contact Status',
    'Phone',
    'Email',
    'Tax ID (IEC/PAN)',
    'City',
    'Address',
    'PIN Code',
    'Trade Corridors',
    'Top HS Codes',
    'Total Shipments',
    'Total FOB/CIF (USD)',
    'Latest Activity Date',
    'Dataset Type',
  ];

  const rows = leads.map((l) => [
    l.company_name,
    l.country || 'India',
    l.role,
    l.transport_mode,
    l.category,
    l.subcategory,
    l.contact_type,
    l.phone,
    l.email,
    l.tax_id,
    l.city,
    l.address,
    l.pin_code,
    l.trade_lanes,
    l.top_hs_codes,
    l.total_shipments,
    l.total_value_usd,
    l.latest_activity_date,
    l.dataset_type,
  ]);

  return createCsvBlob(headers, rows);
}

/**
 * Formats company name and trading role / transport mode / tax ID for senior management summary.
 * e.g. "EUROFARMA LABORATORIOS (Both • Air • IEC: 03928172)"
 */
export function formatDatamyneCompanyRole(lead: DatamyneLead): string {
  const parts: string[] = [];
  if (lead.role) {
    parts.push(
      lead.role === 'Both (Exporter & Importer)' || lead.role === 'Both'
        ? 'Both'
        : lead.role
    );
  }
  if (lead.transport_mode) {
    parts.push(lead.transport_mode);
  }
  if (lead.tax_id) {
    parts.push(`IEC: ${lead.tax_id}`);
  }
  return parts.length > 0 ? `${lead.company_name} (${parts.join(' • ')})` : lead.company_name;
}

/**
 * Formats category and subcategory into a single clean hierarchy string.
 * e.g. "Chemicals & Materials — Organic Chemicals & APIs"
 */
export function formatDatamyneCategorySubcategory(lead: DatamyneLead): string {
  if (lead.category && lead.subcategory) {
    return `${lead.category} — ${lead.subcategory}`;
  }
  return lead.category || lead.subcategory || '—';
}

/**
 * Formats city and trade corridor for executive summary.
 * e.g. "São Paulo, Brazil (Brazil-India/Air)"
 */
export function formatDatamyneCityCorridor(lead: DatamyneLead): string {
  const city = lead.city?.trim() || '—';
  const corridor = lead.trade_lanes?.trim();
  if (corridor && city !== '—') {
    return `${city} (${corridor})`;
  } else if (corridor) {
    return corridor;
  }
  return city;
}

export interface DatamyneSummaryExportOptions {
  notesMap?: Record<string, string>;
  statusMap?: Record<string, string>;
}

/**
 * Export selected DataMyne leads into a 5-column Senior Management Executive Summary CSV.
 * Columns:
 * 1. Company & Role
 * 2. Category & Subcategory
 * 3. City & Corridor
 * 4. Sales Status
 * 5. Additional Note
 */
export function exportDatamyneSummaryReportCsv(
  leads: DatamyneLead[],
  options?: DatamyneSummaryExportOptions
): Blob {
  const headers = [
    'Company & Role',
    'Category & Subcategory',
    'City & Corridor',
    'Sales Status',
    'Additional Note',
  ];

  const rows = leads.map((l) => {
    const companyRole = formatDatamyneCompanyRole(l);
    const catSubcat = formatDatamyneCategorySubcategory(l);
    const cityCorridor = formatDatamyneCityCorridor(l);
    const status = options?.statusMap?.[l.id] || getCachedApproachStatus('datamyne', l.id) || 'Not Contacted';
    const note = options?.notesMap?.[l.id] || getCachedApproachLatestNote('datamyne', l.id) || '—';

    return [companyRole, catSubcat, cityCorridor, status, note];
  });

  return createCsvBlob(headers, rows);
}

/**
 * Get Category facet counts
 */
export function getDatamyneCategoryFacets(currentDatasetType: 'valid' | 'missing' | 'all' = 'valid'): { label: string; count: number }[] {
  const dataset = getLoadedDatamyneDataset();
  const counts: Record<string, number> = {};
  for (let i = 0; i < dataset.length; i++) {
    const d = dataset[i];
    if (currentDatasetType !== 'all' && d.dataset_type !== currentDatasetType) continue;
    if (d.category) {
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get Subcategory facet counts
 */
export function getDatamyneSubcategoryFacets(category?: string, currentDatasetType: 'valid' | 'missing' | 'all' = 'valid'): { label: string; count: number }[] {
  const dataset = getLoadedDatamyneDataset();
  const counts: Record<string, number> = {};
  for (let i = 0; i < dataset.length; i++) {
    const d = dataset[i];
    if (currentDatasetType !== 'all' && d.dataset_type !== currentDatasetType) continue;
    if (category && d.category !== category) continue;
    if (d.subcategory) {
      counts[d.subcategory] = (counts[d.subcategory] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
