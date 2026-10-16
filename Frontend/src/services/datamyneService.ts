import { DATAMYNE_STARTER_DATA } from '@/data/datamyneLeadsData';
import {
  DatamyneLead,
  DatamyneFilterParams,
  DatamyneResponse,
  DatamyneAudienceCounts,
} from '@/types/datamyneLead';
import { logger } from '@/utils/logger';

// In-memory leads storage, starts with the bundled starter set and upgrades if full JSON is loaded
let cachedFullDataset: DatamyneLead[] | null = null;
let isLoadingFullData = false;

/**
 * Lazily load full 34,690 records from public JSON in the background
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

  let filtered = [...dataset];

  // 1. Primary Dataset Filter: 'valid' | 'missing' | 'all'
  if (datasetType === 'valid') {
    filtered = filtered.filter((d) => d.dataset_type === 'valid');
  } else if (datasetType === 'missing') {
    filtered = filtered.filter((d) => d.dataset_type === 'missing');
  }

  // 2. Audience Tab Filter
  if (tab === 'perishables') {
    filtered = filtered.filter((d) => d.category === 'Perishables');
  } else if (tab === 'pharma') {
    filtered = filtered.filter((d) => d.category === 'Pharma & Healthcare');
  } else if (tab === 'textiles') {
    filtered = filtered.filter((d) => d.category === 'Textiles & Apparel');
  } else if (tab === 'engineering') {
    filtered = filtered.filter((d) => d.category === 'Engineering & Machinery');
  } else if (tab === 'chemicals') {
    filtered = filtered.filter((d) => d.category === 'Chemicals & Materials');
  } else if (tab === 'electronics') {
    filtered = filtered.filter((d) => d.category === 'Electronics & Electrical');
  } else if (tab === 'automotive') {
    filtered = filtered.filter((d) => d.category === 'Automotive & EV');
  } else if (tab === 'general') {
    filtered = filtered.filter((d) => d.category === 'General Cargo');
  }

  // 3. Search Query
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.company_name.toLowerCase().includes(query) ||
        d.city.toLowerCase().includes(query) ||
        d.address.toLowerCase().includes(query) ||
        d.subcategory.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        d.tax_id.toLowerCase().includes(query) ||
        d.directors.toLowerCase().includes(query) ||
        d.top_hs_codes.toLowerCase().includes(query)
    );
  }

  // 4. Categories Multi-select
  if (categories.length > 0) {
    filtered = filtered.filter((d) => categories.includes(d.category));
  }

  // 5. Subcategories Multi-select
  if (subcategories.length > 0) {
    filtered = filtered.filter((d) => subcategories.includes(d.subcategory));
  }

  // 6. Trading Role Multi-select
  if (roles.length > 0) {
    filtered = filtered.filter((d) => roles.includes(d.role));
  }

  // 7. City Multi-select
  if (cities.length > 0) {
    filtered = filtered.filter((d) => cities.some((c) => d.city.toUpperCase().includes(c.toUpperCase())));
  }

  // 8. Trade Corridor Multi-select
  if (tradeLanes.length > 0) {
    filtered = filtered.filter((d) => tradeLanes.some((tl) => d.trade_lanes.includes(tl)));
  }

  // 9. Contact Status Multi-select
  if (contactStatus.length > 0) {
    filtered = filtered.filter((d) => {
      if (contactStatus.includes('both') && d.phone && d.email) return true;
      if (contactStatus.includes('phone_only') && d.phone && !d.email) return true;
      if (contactStatus.includes('email_only') && !d.phone && d.email) return true;
      if (contactStatus.includes('missing') && !d.phone && !d.email) return true;
      return false;
    });
  }

  // 10. Volume & Value Thresholds
  if (minShipments && minShipments > 0) {
    filtered = filtered.filter((d) => d.total_shipments >= minShipments);
  }
  if (minTradedValueUsd && minTradedValueUsd > 0) {
    filtered = filtered.filter((d) => d.total_value_usd >= minTradedValueUsd);
  }

  // 11. Has Directors Filter
  if (hasDirectors) {
    filtered = filtered.filter((d) => d.directors && d.directors.trim().length > 0);
  }

  // Calculate Audience counts based on current dataset mode
  const scopeDataset =
    datasetType === 'valid'
      ? dataset.filter((d) => d.dataset_type === 'valid')
      : datasetType === 'missing'
      ? dataset.filter((d) => d.dataset_type === 'missing')
      : dataset;

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
    validTotal: dataset.filter((d) => d.dataset_type === 'valid').length,
    missingTotal: dataset.filter((d) => d.dataset_type === 'missing').length,
  };

  const datasetCounts = {
    valid: dataset.filter((d) => d.dataset_type === 'valid').length,
    missing: dataset.filter((d) => d.dataset_type === 'missing').length,
    all: dataset.length,
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
 * Sanitize cell content against CSV Formula Injection (CWE-1236)
 */
function sanitizeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Prefix dangerous formula operators with single quote (including leading whitespace/tab tricks)
  if (/^[\s\t\r]*[=+\-@]/.test(str) || /^[\t\r]/.test(str)) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export selected DataMyne leads to sanitized CSV Blob
 */
export function exportDatamyneLeadsCsv(leads: DatamyneLead[]): Blob {
  const headers = [
    'Company Name',
    'Trading Role',
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
    sanitizeCsvValue(l.company_name),
    sanitizeCsvValue(l.role),
    sanitizeCsvValue(l.category),
    sanitizeCsvValue(l.subcategory),
    sanitizeCsvValue(l.contact_type),
    sanitizeCsvValue(l.phone),
    sanitizeCsvValue(l.email),
    sanitizeCsvValue(l.tax_id),
    sanitizeCsvValue(l.city),
    sanitizeCsvValue(l.address),
    sanitizeCsvValue(l.pin_code),
    sanitizeCsvValue(l.trade_lanes),
    sanitizeCsvValue(l.top_hs_codes),
    sanitizeCsvValue(l.total_shipments),
    sanitizeCsvValue(l.total_value_usd),
    sanitizeCsvValue(l.latest_activity_date),
    sanitizeCsvValue(l.dataset_type),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
