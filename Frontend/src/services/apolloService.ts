import { APOLLO_STARTER_DATA } from '@/data/apolloStarterData';
import { APOLLO_CONTACTS_STARTER_DATA } from '@/data/apolloContactsStarterData';
import {
  ApolloLead,
  ApolloFilterParams,
  ApolloResponse,
  ApolloAudienceCounts,
  APOLLO_EMPLOYEE_TIERS,
  APOLLO_REVENUE_RANGES,
  ApolloContactsResponse,
} from '@/types/apolloLead';
import { logger } from '@/utils/logger';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws'
    : 'http://localhost:8000');

function getAuthHeader(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem('apollo_leads_session');
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) {
        return { Authorization: `Bearer ${session.token}` };
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return {};
}

/**
 * Filter and query Apollo leads from local in-memory starter data.
 * Used for offline resilience, testing, and instant feedback.
 */
export function queryApolloLeads(params: ApolloFilterParams = {}): ApolloResponse {
  const {
    q,
    tab = 'all',
    industries = [],
    countries = [],
    employeeTiers = [],
    revenueRanges = [],
    hasWebsite,
    hasLinkedin,
    minEmployees,
    maxEmployees,
    minRevenue,
    page = 1,
    limit = 25,
  } = params;

  let filtered = [...APOLLO_STARTER_DATA];

  // 1. Text search
  if (q && q.trim()) {
    const searchLower = q.trim().toLowerCase();
    filtered = filtered.filter((lead) => {
      return (
        lead.organization_name.toLowerCase().includes(searchLower) ||
        lead.domain.toLowerCase().includes(searchLower) ||
        (lead.industry && lead.industry.toLowerCase().includes(searchLower)) ||
        (lead.keywords && lead.keywords.toLowerCase().includes(searchLower)) ||
        (lead.specialties && lead.specialties.toLowerCase().includes(searchLower)) ||
        (lead.hq_city && lead.hq_city.toLowerCase().includes(searchLower)) ||
        (lead.hq_country && lead.hq_country.toLowerCase().includes(searchLower))
      );
    });
  }

  // 2. Audience Tab quick filtering
  if (tab === 'high_headcount') {
    filtered = filtered.filter((l) => (l.employee_count ?? 0) >= 100);
  } else if (tab === 'high_revenue') {
    filtered = filtered.filter((l) => (l.revenue_usd ?? 0) >= 10000000);
  } else if (tab === 'top_cargo_verticals') {
    const topSet = new Set([
      'automotive',
      'food & beverages',
      'pharmaceuticals',
      'electrical/electronic manufacturing',
      'chemicals',
      'medical devices',
      'aviation & aerospace',
    ]);
    filtered = filtered.filter((l) => topSet.has(l.industry.toLowerCase()));
  } else if (tab === 'with_website_linkedin') {
    filtered = filtered.filter(
      (l) => l.website_url && l.website_url.trim() !== '' && l.linkedin_url && l.linkedin_url.trim() !== ''
    );
  }

  // 3. Multi-select cargo verticals
  if (industries.length > 0) {
    const indSet = new Set(industries.map((i) => i.toLowerCase()));
    filtered = filtered.filter((l) => indSet.has(l.industry.toLowerCase()));
  }

  // 4. Multi-select countries
  if (countries.length > 0) {
    const cSet = new Set(countries.map((c) => c.toLowerCase()));
    filtered = filtered.filter((l) => l.hq_country && cSet.has(l.hq_country.toLowerCase()));
  }

  // 5. Employee Tiers
  if (employeeTiers.length > 0) {
    const activeTiers = APOLLO_EMPLOYEE_TIERS.filter((t) => employeeTiers.includes(t.id));
    filtered = filtered.filter((l) => {
      const count = l.employee_count ?? 0;
      return activeTiers.some((tier) => {
        const meetsMin = tier.min === undefined || count >= tier.min;
        const meetsMax = tier.max === undefined || count <= tier.max;
        return meetsMin && meetsMax;
      });
    });
  }

  // 6. Explicit min/max employees
  if (minEmployees !== undefined) {
    filtered = filtered.filter((l) => (l.employee_count ?? 0) >= minEmployees);
  }
  if (maxEmployees !== undefined) {
    filtered = filtered.filter((l) => (l.employee_count ?? 0) <= maxEmployees);
  }

  // 7. Revenue Ranges
  if (revenueRanges.length > 0) {
    const activeRanges = APOLLO_REVENUE_RANGES.filter((r) => revenueRanges.includes(r.id));
    filtered = filtered.filter((l) => {
      const rev = l.revenue_usd ?? 0;
      return activeRanges.some((range) => {
        const meetsMin = range.min === undefined || rev >= range.min;
        const meetsMax = range.max === undefined || rev <= range.max;
        return meetsMin && meetsMax;
      });
    });
  }
  if (minRevenue !== undefined) {
    filtered = filtered.filter((l) => (l.revenue_usd ?? 0) >= minRevenue);
  }

  // 8. Contact channels
  if (hasWebsite) {
    filtered = filtered.filter((l) => Boolean(l.website_url && l.website_url.trim() !== ''));
  }
  if (hasLinkedin) {
    filtered = filtered.filter((l) => Boolean(l.linkedin_url && l.linkedin_url.trim() !== ''));
  }

  // Calculate Audience Counts across the base starter dataset
  const audienceCounts: ApolloAudienceCounts = {
    all: APOLLO_STARTER_DATA.length,
    high_headcount: APOLLO_STARTER_DATA.filter((l) => (l.employee_count ?? 0) >= 100).length,
    high_revenue: APOLLO_STARTER_DATA.filter((l) => (l.revenue_usd ?? 0) >= 10000000).length,
    top_cargo_verticals: APOLLO_STARTER_DATA.filter((l) =>
      [
        'automotive',
        'food & beverages',
        'pharmaceuticals',
        'electrical/electronic manufacturing',
        'chemicals',
        'medical devices',
        'aviation & aerospace',
      ].includes(l.industry.toLowerCase())
    ).length,
    with_website_linkedin: APOLLO_STARTER_DATA.filter(
      (l) => l.website_url && l.website_url.trim() !== '' && l.linkedin_url && l.linkedin_url.trim() !== ''
    ).length,
  };

  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const offset = (safePage - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return {
    page: safePage,
    limit,
    totalRecords,
    totalPages,
    hasNext: safePage < totalPages,
    items,
    audienceCounts,
    totalFormatted: totalRecords >= 1000 ? `${(totalRecords / 1000).toFixed(1)}k` : String(totalRecords),
  };
}

/**
 * Asynchronously query the Apollo Leads backend REST API (DuckDB over S3 Parquet / Lambda)
 * with automatic fallback to local starter dataset.
 */
export async function fetchApolloLeadsFromApi(
  params: ApolloFilterParams = {}
): Promise<ApolloResponse> {
  const {
    q,
    tab = 'all',
    industries = [],
    countries = [],
    hasWebsite,
    hasLinkedin,
    minEmployees,
    maxEmployees,
    minRevenue,
    page = 1,
    limit = 25,
  } = params;

  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('page_size', String(limit));

  if (q && q.trim()) urlParams.set('search', q.trim());
  if (tab && tab !== 'all') urlParams.set('tab', tab);
  if (minEmployees !== undefined) urlParams.set('min_employees', String(minEmployees));
  if (maxEmployees !== undefined) urlParams.set('max_employees', String(maxEmployees));
  if (minRevenue !== undefined) urlParams.set('min_revenue', String(minRevenue));
  if (hasWebsite) urlParams.set('has_website', 'true');
  if (hasLinkedin) urlParams.set('has_linkedin', 'true');

  industries.forEach((ind) => urlParams.append('industries', ind));
  countries.forEach((country) => urlParams.append('countries', country));

  const targetUrl = `${API_BASE_URL}/api/v1/apollo/leads?${urlParams.toString()}`;

  try {
    const authHeaders = getAuthHeader();
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    });

    if (response.ok) {
      const result = await response.json();
      const totalRecords = result.total_records || 0;
      const totalFormatted =
        totalRecords >= 1000000
          ? `${(totalRecords / 1000000).toFixed(2)}m`
          : totalRecords >= 1000
          ? `${(totalRecords / 1000).toFixed(1)}k`
          : String(totalRecords);

      return {
        page: result.page || page,
        limit: result.page_size || limit,
        totalRecords,
        totalPages: result.total_pages || 1,
        hasNext: result.has_next || false,
        items: result.data || [],
        audienceCounts: result.audience_counts || {
          all: totalRecords,
          high_headcount: 0,
          high_revenue: 0,
          top_cargo_verticals: 0,
          with_website_linkedin: 0,
        },
        totalFormatted,
      };
    } else {
      logger.warn('APOLLO', `API returned ${response.status}. Falling back to starter dataset.`);
    }
  } catch (err) {
    logger.warn('APOLLO', 'Failed to reach Apollo API endpoint. Falling back to starter data.', { err });
  }

  // Seamless fallback to starter data
  return queryApolloLeads(params);
}

/**
 * Client-side CSV export with sanitization
 */
export function exportApolloLeadsCsv(leads: ApolloLead[], filename = 'apollo_freight_leads.csv'): void {
  if (!leads || leads.length === 0) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const headers = [

    'Organization Name',
    'Domain',
    'Website',
    'Phone',
    'Industry / Vertical',
    'Employee Headcount',
    'Revenue (USD)',
    'Founded Year',
    'Headquarters City',
    'Headquarters State',
    'Headquarters Country',
    'Specialties',
    'Keywords',
    'LinkedIn URL',
  ];

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Neutralize formula injection in Excel/Sheets (CWE-1236)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    const cleanStr = str.replace(/"/g, '""');
    return `"${cleanStr}"`;
  };

  const rows = leads.map((lead) => [
    escapeCell(lead.organization_name),
    escapeCell(lead.domain),
    escapeCell(lead.website_url),
    escapeCell(lead.phone),
    escapeCell(lead.industry),
    escapeCell(lead.employee_count),
    escapeCell(lead.revenue_usd),
    escapeCell(lead.founded_year),
    escapeCell(lead.hq_city),
    escapeCell(lead.hq_state),
    escapeCell(lead.hq_country),
    escapeCell(lead.specialties),
    escapeCell(lead.keywords),
    escapeCell(lead.linkedin_url),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CompanyContactsOptions {
  page?: number;
  limit?: number;
  logisticsOnly?: boolean;
  decisionMakersOnly?: boolean;
  hasEmailOnly?: boolean;
  search?: string;
}

/**
 * Filter company contacts from local starter data.
 */
export function queryCompanyContactsLocal(
  organizationId: string,
  options: CompanyContactsOptions = {}
): ApolloContactsResponse {
  const {
    page = 1,
    limit = 20,
    logisticsOnly,
    decisionMakersOnly,
    hasEmailOnly,
    search,
  } = options;

  let contacts = APOLLO_CONTACTS_STARTER_DATA.filter(
    (c) => c.organization_id === organizationId
  );

  if (logisticsOnly) {
    contacts = contacts.filter((c) => c.is_logistics_role);
  }
  if (decisionMakersOnly) {
    contacts = contacts.filter((c) => c.is_decision_maker);
  }
  if (hasEmailOnly) {
    contacts = contacts.filter((c) => c.has_email);
  }
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    contacts = contacts.filter(
      (c) =>
        c.person_name.toLowerCase().includes(s) ||
        c.job_title.toLowerCase().includes(s) ||
        (c.email && c.email.toLowerCase().includes(s))
    );
  }

  // Sort by logistics role DESC, decision maker DESC, has email DESC, person name ASC
  contacts.sort((a, b) => {
    if (a.is_logistics_role !== b.is_logistics_role) {
      return a.is_logistics_role ? -1 : 1;
    }
    if (a.is_decision_maker !== b.is_decision_maker) {
      return a.is_decision_maker ? -1 : 1;
    }
    if (a.has_email !== b.has_email) {
      return a.has_email ? -1 : 1;
    }
    return a.person_name.localeCompare(b.person_name);
  });

  const totalRecords = contacts.length;
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const offset = (safePage - 1) * limit;
  const items = contacts.slice(offset, offset + limit);

  return {
    page: safePage,
    limit,
    totalRecords,
    totalPages,
    hasNext: safePage < totalPages,
    items,
  };
}

/**
 * Fetch contacts for an organization from the Apollo API with automatic fallback to starter dataset.
 */
export async function fetchCompanyContacts(
  organizationId: string,
  options: CompanyContactsOptions = {}
): Promise<ApolloContactsResponse> {
  const {
    page = 1,
    limit = 20,
    logisticsOnly,
    decisionMakersOnly,
    hasEmailOnly,
    search,
  } = options;

  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('page_size', String(limit));
  if (logisticsOnly) urlParams.set('logistics_only', 'true');
  if (decisionMakersOnly) urlParams.set('decision_makers_only', 'true');
  if (hasEmailOnly) urlParams.set('has_email_only', 'true');
  if (search && search.trim()) urlParams.set('search', search.trim());

  const targetUrl = `${API_BASE_URL}/api/v1/apollo/companies/${encodeURIComponent(
    organizationId
  )}/contacts?${urlParams.toString()}`;

  try {
    const authHeaders = getAuthHeader();
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...authHeaders,
      },
    });

    if (response.ok) {
      const result = await response.json();
      return {
        page: result.page || page,
        limit: result.page_size || limit,
        totalRecords: result.total_records || 0,
        totalPages: result.total_pages || 1,
        hasNext: result.has_next || false,
        items: result.data || [],
      };
    } else {
      logger.warn('APOLLO', `Contacts API returned ${response.status}. Falling back to starter contacts.`);
    }
  } catch (err) {
    logger.warn('APOLLO', 'Failed to reach contacts API endpoint. Falling back to starter contacts.', { err });
  }

  return queryCompanyContactsLocal(organizationId, options);
}

