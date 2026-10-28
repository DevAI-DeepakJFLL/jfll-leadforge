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

// In-memory leads storage, starts with the bundled starter set and upgrades if full JSON is loaded
let cachedFullDataset: DatamyneLead[] | null = null;
let isLoadingFullData = false;

/**
 * Normalizes city names by stripping diacritics/accents and converting to uppercase
 * for robust cross-geographic matching (e.g. SÃO PAULO <-> SAO PAULO).
 */
export function normalizeCityString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

/**
 * Lazily load full 40,081 records from public JSON in the background
 */
export async function loadFullDatamyneDataset(): Promise<DatamyneLead[]> {
  if (cachedFullDataset) return cachedFullDataset;
  if (isLoadingFullData) return DATAMYNE_STARTER_DATA;

  isLoadingFullData = true;
  try {
    const res = await fetch('/data/datamyne_leads.json');
    if (res.ok) {
      const data: DatamyneLead[] = await res.json();
      cachedFullDataset = data;
      logger.info('DATAMYNE', `Loaded full dataset with ${data.length} records into memory.`);
      return data;
    }
  } catch (err) {
    logger.warn('DATAMYNE', 'Failed to fetch /data/datamyne_leads.json, continuing with starter dataset', { err });
  } finally {
    isLoadingFullData = false;
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
    minShipments,
    minTradedValueUsd,
    hasDirectors,
    page = 1,
    limit = 25,
  } = params;

  // 1. Filter by all sidebar filters (excluding datasetType and audience tab)
  let baseFiltered = [...dataset];

  // 1a. Country Multi-select Filter
  if (countries && countries.length > 0) {
    baseFiltered = baseFiltered.filter((d) => countries.includes(d.country || 'India'));
  }

  // 1b. Transport Mode Multi-select Filter
  if (transportModes.length > 0) {
    baseFiltered = baseFiltered.filter((d) => transportModes.includes(d.transport_mode as any));
  }

  // 1c. Search Query
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    baseFiltered = baseFiltered.filter(
      (d) =>
        d.company_name.toLowerCase().includes(query) ||
        (d.country && d.country.toLowerCase().includes(query)) ||
        d.city.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.subcategory.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        d.tax_id.toLowerCase().includes(query) ||
        d.directors.toLowerCase().includes(query) ||
        d.top_hs_codes.toLowerCase().includes(query)
    );
  }

  // 1d. Categories Multi-select (from sidebar)
  if (categories.length > 0) {
    baseFiltered = baseFiltered.filter((d) => categories.includes(d.category));
  }

  // 1e. Subcategories Multi-select
  if (subcategories.length > 0) {
    baseFiltered = baseFiltered.filter((d) => subcategories.includes(d.subcategory));
  }

  // 1f. Trading Role Multi-select
  if (roles.length > 0) {
    const hasExp = roles.includes('Exporter');
    const hasImp = roles.includes('Importer');
    const hasBoth = roles.includes('Both') || roles.includes('Both (Exporter & Importer)');

    baseFiltered = baseFiltered.filter((d) => {
      const isDualLead = d.role === 'Both' || d.role === 'Both (Exporter & Importer)';
      const isExpLead = d.role === 'Exporter';
      const isImpLead = d.role === 'Importer';

      if (hasBoth && isDualLead) return true;
      if (hasExp && isExpLead) return true;
      if (hasImp && isImpLead) return true;
      // If user checks both Exporter and Importer, companies performing dual trade match
      if (hasExp && hasImp && isDualLead) return true;

      return false;
    });
  }

  // 1g. City Multi-select (Pre-normalized to eliminate redundant inner-loop normalizations)
  if (cities.length > 0) {
    const normalizedFilterCities = cities.map(normalizeCityString);
    baseFiltered = baseFiltered.filter((d) => {
      if (!d.city || !d.city.trim()) return false;
      const dCityNorm = normalizeCityString(d.city);
      return normalizedFilterCities.some(
        (cNorm) => dCityNorm.includes(cNorm) || cNorm.includes(dCityNorm)
      );
    });
  }

  // 1h. Trade Corridor Multi-select
  if (tradeLanes.length > 0) {
    baseFiltered = baseFiltered.filter((d) => tradeLanes.some((tl) => d.trade_lanes.includes(tl)));
  }

  // 1i. Contact Status Multi-select
  if (contactStatus.length > 0) {
    baseFiltered = baseFiltered.filter((d) => {
      if (contactStatus.includes('both') && d.phone && d.email) return true;
      if (contactStatus.includes('phone_only') && d.phone && !d.email) return true;
      if (contactStatus.includes('email_only') && !d.phone && d.email) return true;
      if (contactStatus.includes('missing') && !d.phone && !d.email) return true;
      return false;
    });
  }

  // 1j. Volume & Value Thresholds
  if (minShipments && minShipments > 0) {
    baseFiltered = baseFiltered.filter((d) => d.total_shipments >= minShipments);
  }
  if (minTradedValueUsd && minTradedValueUsd > 0) {
    baseFiltered = baseFiltered.filter((d) => d.total_value_usd >= minTradedValueUsd);
  }

  // 1k. Has Directors Filter
  if (hasDirectors) {
    baseFiltered = baseFiltered.filter((d) => d.directors && d.directors.trim().length > 0);
  }

  // 2. Data pool counts matching the current active filters
  const validTotal = baseFiltered.filter((d) => d.dataset_type === 'valid').length;
  const missingTotal = baseFiltered.filter((d) => d.dataset_type === 'missing').length;
  const allTotal = baseFiltered.length;

  const datasetCounts = {
    valid: validTotal,
    missing: missingTotal,
    all: allTotal,
  };

  // 3. Primary Dataset Scope Filter: 'valid' | 'missing' | 'all'
  const scopeDataset =
    datasetType === 'valid'
      ? baseFiltered.filter((d) => d.dataset_type === 'valid')
      : datasetType === 'missing'
      ? baseFiltered.filter((d) => d.dataset_type === 'missing')
      : baseFiltered;

  // 4. Calculate Audience counts based on filtered scope dataset
  const audienceCounts: DatamyneAudienceCounts = {
    all: scopeDataset.length,
    perishables: scopeDataset.filter((d) => d.category === 'Perishables').length,
    pharma: scopeDataset.filter((d) => d.category === 'Pharma & Healthcare').length,
    textiles: scopeDataset.filter((d) => d.category === 'Textiles & Apparel').length,
    engineering: scopeDataset.filter((d) => d.category === 'Engineering & Machinery').length,
    chemicals: scopeDataset.filter((d) => d.category === 'Chemicals & Materials').length,
    electronics: scopeDataset.filter((d) => d.category === 'Electronics & Electrical').length,
    automotive: scopeDataset.filter((d) => d.category === 'Automotive & EV').length,
    general: scopeDataset.filter((d) => d.category === 'General Cargo').length,
    validTotal,
    missingTotal,
  };

  // 5. Apply Audience Tab Filter
  let filtered = scopeDataset;
  const tabCategory = TAB_TO_CATEGORY_MAP[tab];
  if (tabCategory) {
    // If explicit categories multi-select is active and doesn't include tabCategory,
    // honor the explicit categories filter to prevent empty impossible intersections.
    if (categories.length === 0 || categories.includes(tabCategory)) {
      filtered = filtered.filter((d) => d.category === tabCategory);
    }
  }

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
 * Get Category facet counts
 */
export function getDatamyneCategoryFacets(currentDatasetType: 'valid' | 'missing' | 'all' = 'valid'): { label: string; count: number }[] {
  const dataset = getLoadedDatamyneDataset();
  const scoped =
    currentDatasetType === 'valid'
      ? dataset.filter((d) => d.dataset_type === 'valid')
      : currentDatasetType === 'missing'
      ? dataset.filter((d) => d.dataset_type === 'missing')
      : dataset;

  const counts: Record<string, number> = {};
  for (const d of scoped) {
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
  let scoped =
    currentDatasetType === 'valid'
      ? dataset.filter((d) => d.dataset_type === 'valid')
      : currentDatasetType === 'missing'
      ? dataset.filter((d) => d.dataset_type === 'missing')
      : dataset;

  if (category) {
    scoped = scoped.filter((d) => d.category === category);
  }

  const counts: Record<string, number> = {};
  for (const d of scoped) {
    if (d.subcategory) {
      counts[d.subcategory] = (counts[d.subcategory] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
