import {
  Lead,
  FilterParams,
  LeadsResponse,
  FilterOption,
  FilterOptionsResponse,
} from '@/types/lead';
import { mockLeads } from './leadsData';

// Mutable in-memory store initialized from synthetic data
let leadsDatabase: Lead[] = [...mockLeads];

/**
 * Resets the in-memory database to its initial synthetic dataset
 */
export function resetLeadsDatabase(): void {
  leadsDatabase = [...mockLeads];
}

/**
 * Retrieves the current leads database
 */
export function getLeadsDatabase(): Lead[] {
  return leadsDatabase;
}

/**
 * Query and filter leads with pagination and sorting
 */
export function queryLeads(params: Partial<FilterParams> = {}): LeadsResponse {
  const {
    q,
    jobTitles = [],
    departments = [],
    locations = [],
    industries = [],
    status = [],
    companySize = [],
    page = 1,
    limit = 25,
    sortBy,
    sortOrder = 'asc',
    tab = 'all',
  } = params;

  const hasSearchOrFilters = Boolean(
    (q && q.trim().length > 0) ||
    jobTitles.length > 0 ||
    departments.length > 0 ||
    locations.length > 0 ||
    industries.length > 0 ||
    status.length > 0 ||
    companySize.length > 0
  );

  // 1. Filter by search & criteria (excluding tab) to compute base for audience counts
  let baseMatching = leadsDatabase.filter((lead) => {
    // Search query 'q'
    if (q && q.trim().length > 0) {
      const term = q.trim().toLowerCase();
      const match =
        lead.name.toLowerCase().includes(term) ||
        lead.company.toLowerCase().includes(term) ||
        lead.title.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.location.toLowerCase().includes(term) ||
        lead.industry.toLowerCase().includes(term);

      if (!match) return false;
    }

    // Job Titles filter
    if (jobTitles.length > 0) {
      const titleLower = lead.title.toLowerCase();
      const match = jobTitles.some((jt) =>
        titleLower.includes(jt.toLowerCase())
      );
      if (!match) return false;
    }

    // Departments filter
    if (departments.length > 0) {
      const deptLower = (lead.department || '').toLowerCase();
      const match = departments.some((d) =>
        deptLower.includes(d.toLowerCase())
      );
      if (!match) return false;
    }

    // Locations filter
    if (locations.length > 0) {
      const locLower = lead.location.toLowerCase();
      const cityLower = (lead.city || '').toLowerCase();
      const stateLower = (lead.state || '').toLowerCase();
      const match = locations.some((l) => {
        const lLower = l.toLowerCase();
        return (
          locLower.includes(lLower) ||
          cityLower.includes(lLower) ||
          stateLower.includes(lLower)
        );
      });
      if (!match) return false;
    }

    // Industries filter
    if (industries.length > 0) {
      const indLower = lead.industry.toLowerCase();
      const match = industries.some((ind) =>
        indLower.includes(ind.toLowerCase())
      );
      if (!match) return false;
    }

    // Status filter
    if (status.length > 0) {
      if (!status.includes(lead.status)) return false;
    }

    // Company Size filter
    if (companySize.length > 0) {
      if (!companySize.includes(lead.employees)) return false;
    }

    return true;
  });

  // Calculate audience counts
  const allAudienceCount = hasSearchOrFilters ? baseMatching.length : 2500000;
  const newAudienceCount = hasSearchOrFilters
    ? baseMatching.filter((l) => l.status === 'NET NEW').length
    : 1480000;
  const savedAudienceCount = hasSearchOrFilters
    ? baseMatching.filter((l) => l.saved).length
    : 48400;

  // 2. Apply tab filter
  let finalMatching = baseMatching;
  if (tab === 'new') {
    finalMatching = baseMatching.filter((l) => l.status === 'NET NEW');
  } else if (tab === 'saved') {
    finalMatching = baseMatching.filter((l) => l.saved);
  }

  // 3. Sorting
  if (sortBy) {
    finalMatching = [...finalMatching].sort((a, b) => {
      const field = sortBy as keyof Lead;
      const valA = a[field] ?? '';
      const valB = b[field] ?? '';

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortOrder === 'desc' ? 1 : -1;
      if (strA > strB) return sortOrder === 'desc' ? -1 : 1;
      return 0;
    });
  }

  // 4. Pagination
  const totalMatches = finalMatching.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * limit;
  const items = finalMatching.slice(startIndex, startIndex + limit);

  // Determine total estimate & formatted count
  let totalEstimate = totalMatches;
  let totalFormatted = totalMatches.toLocaleString();

  if (!hasSearchOrFilters) {
    if (tab === 'all') {
      totalEstimate = 2500000;
      totalFormatted = '2.5m';
    } else if (tab === 'new') {
      totalEstimate = 1480000;
      totalFormatted = '1.48m';
    } else if (tab === 'saved') {
      totalEstimate = 48400;
      totalFormatted = '48.4k';
    }
  }

  return {
    items,
    totalEstimate,
    totalFormatted,
    page: safePage,
    limit,
    totalPages,
    audienceCounts: {
      all: allAudienceCount,
      new: newAudienceCount,
      saved: savedAudienceCount,
    },
  };
}

/**
 * Fetch a single lead by its ID
 */
export function getLeadById(id: string): Lead | undefined {
  return leadsDatabase.find((lead) => lead.id === id);
}

/**
 * Toggle the saved status of a lead
 */
export function toggleLeadSaved(id: string): Lead | undefined {
  const lead = leadsDatabase.find((l) => l.id === id);
  if (lead) {
    lead.saved = !lead.saved;
  }
  return lead;
}

/**
 * Batch update saved status for multiple leads
 */
export function batchSaveLeads(leadIds: string[], saved: boolean): Lead[] {
  const updated: Lead[] = [];
  for (const id of leadIds) {
    const lead = leadsDatabase.find((l) => l.id === id);
    if (lead) {
      lead.saved = saved;
      updated.push(lead);
    }
  }
  return updated;
}

/**
 * Computes facet filter options with counts
 */
export function getFilterOptions(): FilterOptionsResponse {
  const jobTitleCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  const industryCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const companySizeCounts = new Map<string, number>();

  for (const lead of leadsDatabase) {
    // Job title groups
    const title = lead.title;
    jobTitleCounts.set(title, (jobTitleCounts.get(title) || 0) + 1);

    // Department
    if (lead.department) {
      departmentCounts.set(lead.department, (departmentCounts.get(lead.department) || 0) + 1);
    }

    // Location
    locationCounts.set(lead.location, (locationCounts.get(lead.location) || 0) + 1);

    // Industry
    industryCounts.set(lead.industry, (industryCounts.get(lead.industry) || 0) + 1);

    // Status
    statusCounts.set(lead.status, (statusCounts.get(lead.status) || 0) + 1);

    // Company Size
    companySizeCounts.set(lead.employees, (companySizeCounts.get(lead.employees) || 0) + 1);
  }

  const mapToOptions = (map: Map<string, number>): FilterOption[] =>
    Array.from(map.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

  return {
    jobTitles: mapToOptions(jobTitleCounts),
    departments: mapToOptions(departmentCounts),
    locations: mapToOptions(locationCounts),
    industries: mapToOptions(industryCounts),
    status: mapToOptions(statusCounts),
    companySize: mapToOptions(companySizeCounts),
  };
}

import { generateLeadsCsv } from '@/utils/csv';

/**
 * Generates RFC-4180 compliant and formula-injection-safe CSV string for leads export
 */
export const generateExportCsv = generateLeadsCsv;
