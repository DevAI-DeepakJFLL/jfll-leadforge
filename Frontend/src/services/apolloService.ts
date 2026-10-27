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
  ApolloContact,
} from '@/types/apolloLead';
import { Lead, FilterParams, LeadsResponse } from '@/types/lead';
import { logger } from '@/utils/logger';
import { createCsvBlob, triggerCsvDownload } from '@/utils/csv';
import { API_BASE_URL } from '@/config/api';
import { isValidEmailAddress } from '@/utils/apolloUtils';
import { isOfflineSession } from '@/services/authService';

function getAuthHeader(): Record<string, string> {
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apollo_leads_session') : null;
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token && !isOfflineSession(session)) {
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

  let baseFiltered = [...APOLLO_STARTER_DATA];

  // 1. Text search
  if (q && q.trim()) {
    const searchLower = q.trim().toLowerCase();
    baseFiltered = baseFiltered.filter((lead) => {
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

  // 2. Multi-select cargo verticals
  if (industries.length > 0) {
    const indSet = new Set(industries.map((i) => i.toLowerCase()));
    baseFiltered = baseFiltered.filter((l) => indSet.has(l.industry.toLowerCase()));
  }

  // 3. Multi-select countries
  if (countries.length > 0) {
    const cSet = new Set(countries.map((c) => c.toLowerCase()));
    baseFiltered = baseFiltered.filter((l) => l.hq_country && cSet.has(l.hq_country.toLowerCase()));
  }

  // 4. Employee Tiers
  if (employeeTiers.length > 0) {
    const activeTiers = APOLLO_EMPLOYEE_TIERS.filter((t) => employeeTiers.includes(t.id));
    baseFiltered = baseFiltered.filter((l) => {
      const count = l.employee_count ?? 0;
      return activeTiers.some((tier) => {
        const meetsMin = tier.min === undefined || count >= tier.min;
        const meetsMax = tier.max === undefined || count <= tier.max;
        return meetsMin && meetsMax;
      });
    });
  }

  // 5. Explicit min/max employees
  if (minEmployees !== undefined) {
    baseFiltered = baseFiltered.filter((l) => (l.employee_count ?? 0) >= minEmployees);
  }
  if (maxEmployees !== undefined) {
    baseFiltered = baseFiltered.filter((l) => (l.employee_count ?? 0) <= maxEmployees);
  }

  // 6. Revenue Ranges
  if (revenueRanges.length > 0) {
    const activeRanges = APOLLO_REVENUE_RANGES.filter((r) => revenueRanges.includes(r.id));
    baseFiltered = baseFiltered.filter((l) => {
      const rev = l.revenue_usd ?? 0;
      return activeRanges.some((range) => {
        const meetsMin = range.min === undefined || rev >= range.min;
        const meetsMax = range.max === undefined || rev <= range.max;
        return meetsMin && meetsMax;
      });
    });
  }
  if (minRevenue !== undefined) {
    baseFiltered = baseFiltered.filter((l) => (l.revenue_usd ?? 0) >= minRevenue);
  }

  // 7. Contact channels
  if (hasWebsite) {
    baseFiltered = baseFiltered.filter((l) => Boolean(l.website_url && l.website_url.trim() !== ''));
  }
  if (hasLinkedin) {
    baseFiltered = baseFiltered.filter((l) => Boolean(l.linkedin_url && l.linkedin_url.trim() !== ''));
  }

  // 8. Calculate Audience Counts across the filtered base dataset
  const topSet = new Set([
    'automotive',
    'food & beverages',
    'pharmaceuticals',
    'electrical/electronic manufacturing',
    'chemicals',
    'medical devices',
    'aviation & aerospace',
  ]);

  const audienceCounts: ApolloAudienceCounts = {
    all: baseFiltered.length,
    high_headcount: baseFiltered.filter((l) => (l.employee_count ?? 0) >= 100).length,
    high_revenue: baseFiltered.filter((l) => (l.revenue_usd ?? 0) >= 10000000).length,
    top_cargo_verticals: baseFiltered.filter((l) =>
      topSet.has(l.industry.toLowerCase())
    ).length,
    with_website_linkedin: baseFiltered.filter(
      (l) => l.website_url && l.website_url.trim() !== '' && l.linkedin_url && l.linkedin_url.trim() !== ''
    ).length,
  };

  // 9. Audience Tab quick filtering (applied to baseFiltered for table items and pagination)
  let filtered = baseFiltered;
  if (tab === 'high_headcount') {
    filtered = filtered.filter((l) => (l.employee_count ?? 0) >= 100);
  } else if (tab === 'high_revenue') {
    filtered = filtered.filter((l) => (l.revenue_usd ?? 0) >= 10000000);
  } else if (tab === 'top_cargo_verticals') {
    filtered = filtered.filter((l) => topSet.has(l.industry.toLowerCase()));
  } else if (tab === 'with_website_linkedin') {
    filtered = filtered.filter(
      (l) => l.website_url && l.website_url.trim() !== '' && l.linkedin_url && l.linkedin_url.trim() !== ''
    );
  }

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

  const rows = leads.map((lead) => [
    lead.organization_name,
    lead.domain,
    lead.website_url,
    lead.phone,
    lead.industry,
    lead.employee_count,
    lead.revenue_usd,
    lead.founded_year,
    lead.hq_city,
    lead.hq_state,
    lead.hq_country,
    lead.specialties,
    lead.keywords,
    lead.linkedin_url,
  ]);

  const blob = createCsvBlob(headers, rows);
  triggerCsvDownload(blob, filename);
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
 * Filter company contacts from local cache if available (no hardcoded data).
 */
export function queryCompanyContactsLocal(
  _organizationId: string,
  options: CompanyContactsOptions = {}
): ApolloContactsResponse {
  const { page = 1, limit = 20 } = options;
  return {
    page,
    limit,
    totalRecords: 0,
    totalPages: 1,
    hasNext: false,
    items: [],
  };
}

/**
 * Fetch contacts for an organization directly from the Apollo API.
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
      logger.warn('APOLLO', `Contacts API returned ${response.status}.`);
    }
  } catch (err) {
    logger.warn('APOLLO', 'Failed to reach contacts API endpoint.', { err });
  }

  return {
    page,
    limit,
    totalRecords: 0,
    totalPages: 1,
    hasNext: false,
    items: [],
  };
}

const BRAND_COLORS = ['#0066F5', '#FF7A00', '#00C2CB', '#7C3AED', '#059669', '#DC2626'];

export function mapApolloContactToLead(contact: ApolloContact): Lead {
  const emailDomain = contact.email?.includes('@') ? contact.email.split('@')[1] : null;
  const companyClean = emailDomain
    ? emailDomain.replace(/\.(com|org|net|co|io|in|edu|gov).*$/i, '').toUpperCase()
    : 'Freight Forwarding Co';
  const companyName = contact.employer_name || companyClean;

  const locParts = [contact.contact_city, contact.contact_state, contact.contact_country].filter(Boolean);
  const location = locParts.length > 0 ? locParts.join(', ') : 'Global / Cross-Border';

  const hash = (contact.person_name || 'U').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const logoColor = BRAND_COLORS[hash % BRAND_COLORS.length];
  const initials = (companyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'JF').toUpperCase();

  const emailValue = isValidEmailAddress(contact.email)
    ? contact.email!.trim()
    : 'No contact information available';
  const phoneValue = 'No contact information available';

  return {
    id: contact.person_id,
    name: contact.person_name,
    title: contact.job_title || 'Logistics & Supply Chain Professional',
    company: companyName,
    companyLogo: '',
    logoBgColor: logoColor,
    logoTextColor: '#FFFFFF',
    logoInitials: initials,
    industry: contact.department ? `${contact.department} / Freight` : 'Freight & Logistics Services',
    department: contact.department || (contact.is_logistics_role ? 'Supply Chain & Logistics' : 'Operations'),
    status: contact.is_decision_maker ? 'NET NEW' : 'COLD',
    decisionMaker: contact.is_decision_maker,
    location: location,
    city: contact.contact_city || undefined,
    state: contact.contact_state || undefined,
    country: contact.contact_country || undefined,
    email: emailValue,
    phone: phoneValue,
    workPhone: undefined,
    linkedin: contact.linkedin_url || undefined,
    employees: '500+ Enterprise',
    revenue: '$10M+ Enterprise',
    funding: 'Commercial Freight Shipper',
    technologies: ['CargoWise', 'EDI', 'TMS', 'WMS', 'Supply Chain ERP'],
    saved: false,
    jobChange: false,
  };
}

/**
 * Query preloaded local starter decision-makers.
 * Provides instant 0ms rendering and offline fallback so the Person tab is never blank.
 */
export function queryApolloPeopleLeadsLocal(params: Partial<FilterParams> = {}): LeadsResponse {
  const {
    q,
    organizationId,
    company,
    page = 1,
    limit = 25,
    tab = 'all',
    departments = [],
    locations = [],
  } = params;

  let filtered = [...APOLLO_CONTACTS_STARTER_DATA];

  // 1. Organization ID match (instant 0ms resolution for Find Decision Makers cross-navigation)
  if (organizationId && organizationId.trim()) {
    const orgId = organizationId.trim();
    const orgMatches = filtered.filter((c) => c.organization_id === orgId);
    // If exact match found in starter data, or if no company name was provided, apply org filter
    if (orgMatches.length > 0 || !company || !company.trim()) {
      filtered = orgMatches;
    }
  }

  // 2. Company name matching
  if (company && company.trim()) {
    const rawComp = company.trim().toLowerCase();
    const cleanComp = rawComp
      .replace(/^(the\s+)/i, '')
      .replace(/\b(inc|corp|corporation|llc|ltd|co|company|group|holdings|limited|pvt|private|india|and)\b/gi, '')
      .trim();

    const isLnt =
      cleanComp.includes('larsen') ||
      cleanComp.includes('toubro') ||
      cleanComp === 'l&t' ||
      cleanComp.includes('l&t');
    const isSanofi = cleanComp.includes('sanofi');

    filtered = filtered.filter((c) => {
      const empName = (c.employer_name || '').toLowerCase();
      const mail = (c.email || '').toLowerCase();
      if (isLnt && (empName.includes('larsen') || empName.includes('toubro') || empName.includes('l&t') || mail.includes('lnt') || mail.includes('larsentoubro'))) {
        return true;
      }
      if (isSanofi && (empName.includes('sanofi') || mail.includes('sanofi'))) {
        return true;
      }
      return empName.includes(rawComp) || rawComp.includes(empName) || (cleanComp.length >= 2 && empName.includes(cleanComp)) || mail.includes(cleanComp);
    });
  }

  // 3. Text Search across name, title, employer company, or email with corporate suffix normalization
  if (q && q.trim()) {
    const rawTerm = q.trim().toLowerCase();
    const cleanTerm = rawTerm
      .replace(/^(the\s+)/i, '')
      .replace(/\b(inc|corp|corporation|llc|ltd|co|company|group|holdings|limited|pvt|private|india|and)\b/gi, '')
      .trim();

    const isLntQuery =
      cleanTerm.includes('larsen') ||
      cleanTerm.includes('toubro') ||
      cleanTerm === 'l&t' ||
      cleanTerm.includes('l&t');
    const isSanofiQuery = cleanTerm.includes('sanofi');

    filtered = filtered.filter((c) => {
      const pName = c.person_name.toLowerCase();
      const jTitle = c.job_title.toLowerCase();
      const empName = (c.employer_name || '').toLowerCase();
      const mail = (c.email || '').toLowerCase();

      // Alias matching for major enterprise shippers
      if (
        isLntQuery &&
        (empName.includes('larsen') || empName.includes('toubro') || empName.includes('l&t') || mail.includes('lnt'))
      ) {
        return true;
      }
      if (isSanofiQuery && (empName.includes('sanofi') || mail.includes('sanofi'))) {
        return true;
      }

      // Check standard containment
      if (pName.includes(rawTerm) || jTitle.includes(rawTerm) || empName.includes(rawTerm) || mail.includes(rawTerm)) {
        return true;
      }
      // Check clean term containment (e.g. "The Boeing Company" -> "boeing" matching "Boeing")
      if (cleanTerm.length >= 2 && (empName.includes(cleanTerm) || mail.includes(cleanTerm) || pName.includes(cleanTerm))) {
        return true;
      }
      // Check inverse containment (e.g. searching "The Boeing Company" when employer_name is "Boeing")
      if (empName.length >= 3 && rawTerm.includes(empName)) {
        return true;
      }
      return false;
    });
  }

  // 4. Audience Tab
  if (tab === 'new') {
    filtered = filtered.filter((c) => c.is_decision_maker);
  }

  // 5. Departments
  if (departments.length > 0) {
    filtered = filtered.filter(
      (c) => c.department && departments.some((d) => c.department!.toLowerCase().includes(d.toLowerCase()))
    );
  }

  // 6. Locations
  if (locations.length > 0) {
    filtered = filtered.filter((c) => {
      const locStr = [c.contact_city, c.contact_state, c.contact_country].filter(Boolean).join(', ').toLowerCase();
      return locations.some((l) => locStr.includes(l.toLowerCase()));
    });
  }

  // 7. Outreach Readiness (Verified Email & LinkedIn Only)
  if (params.hasEmailOnly) {
    filtered = filtered.filter((c) => Boolean(c.email && isValidEmailAddress(c.email)));
  }
  if (params.hasLinkedinOnly) {
    filtered = filtered.filter((c) => Boolean(c.linkedin_url && c.linkedin_url.trim().length > 5));
  }

  // Total estimate (scaled to 766.8k if global search, or matching filtered count if filtered)
  const isGlobal = !q && !organizationId && !company && departments.length === 0 && locations.length === 0;
  const totalRecords = isGlobal ? 766803 : filtered.length;
  const totalFormatted = isGlobal ? '766.8k' : String(filtered.length);

  // Pagination
  const startIdx = (page - 1) * limit;
  const pageItems = filtered.slice(startIdx, startIdx + limit);
  const items: Lead[] = pageItems.map(mapApolloContactToLead);

  return {
    items,
    totalEstimate: totalRecords,
    totalFormatted,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    audienceCounts: {
      all: isGlobal ? 766803 : filtered.length,
      new: isGlobal ? 345061 : filtered.filter((c) => c.is_decision_maker).length,
      saved: 0,
    },
  };
}

/**
 * Filter leads in-memory based on client-side filter parameters.
 * Provides instant 0ms filtering when exploring contacts within an active company.
 */
export function filterLeadsInMemory(
  leads: Lead[],
  filters: Partial<FilterParams> = {}
): Lead[] {
  let result = leads;

  // 1. Text search q across name, title, company, location, email (case-insensitive)
  if (filters.q && filters.q.trim()) {
    const term = filters.q.trim().toLowerCase();
    result = result.filter((lead) => {
      const name = (lead.name || '').toLowerCase();
      const title = (lead.title || '').toLowerCase();
      const company = (lead.company || '').toLowerCase();
      const location = (lead.location || '').toLowerCase();
      const email = (lead.email || '').toLowerCase();
      return (
        name.includes(term) ||
        title.includes(term) ||
        company.includes(term) ||
        location.includes(term) ||
        email.includes(term)
      );
    });
  }

  // 2. Audience tab
  if (filters.tab === 'new') {
    result = result.filter((lead) => {
      if (lead.decisionMaker !== undefined) {
        return lead.decisionMaker === true;
      }
      return lead.status === 'NET NEW';
    });
  } else if (filters.tab === 'saved') {
    result = result.filter((lead) => lead.saved === true);
  }

  // 3. Departments
  if (filters.departments && filters.departments.length > 0) {
    result = result.filter((lead) => {
      if (!lead.department) return false;
      const deptLower = lead.department.toLowerCase();
      return filters.departments!.some((d) => deptLower.includes(d.toLowerCase()));
    });
  }

  // 4. Job Titles
  if (filters.jobTitles && filters.jobTitles.length > 0) {
    result = result.filter((lead) => {
      if (!lead.title) return false;
      const titleLower = lead.title.toLowerCase();
      return filters.jobTitles!.some((jt) => titleLower.includes(jt.toLowerCase()));
    });
  }

  // 5. Locations
  if (filters.locations && filters.locations.length > 0) {
    result = result.filter((lead) => {
      const locLower = (lead.location || '').toLowerCase();
      const cityLower = (lead.city || '').toLowerCase();
      const stateLower = (lead.state || '').toLowerCase();
      const countryLower = (lead.country || '').toLowerCase();
      return filters.locations!.some((l) => {
        const target = l.toLowerCase();
        return (
          locLower.includes(target) ||
          cityLower.includes(target) ||
          stateLower.includes(target) ||
          countryLower.includes(target)
        );
      });
    });
  }

  // 6. Status
  if (filters.status && filters.status.length > 0) {
    result = result.filter((lead) => filters.status!.includes(lead.status));
  }

  // 7. Outreach Readiness
  if (filters.hasEmailOnly) {
    result = result.filter((lead) => isValidEmailAddress(lead.email));
  }
  if (filters.hasLinkedinOnly) {
    result = result.filter((lead) => Boolean(lead.linkedin && lead.linkedin.trim().length > 5));
  }

  return result;
}

/**
 * Fetch Apollo freight decision-makers and contacts from the live backend API.
 * Seamlessly falls back to local preloaded starter data if offline, warming up, or error.
 */
export async function fetchApolloPeopleLeads(params: Partial<FilterParams> = {}): Promise<LeadsResponse> {
  const {
    q,
    organizationId,
    company,
    page = 1,
    limit = 25,
    tab = 'all',
    departments = [],
    seniority = [],
    jobTitles = [],
    locations = [],
    industries = [],
    logisticsOnly,
    decisionMakersOnly,
    hasEmailOnly,
    hasLinkedinOnly,
  } = params;

  // When organizationId or company is present, default request page_size to 250 (unless explicitly specified higher)
  // so a rich working set for the company is fetched in one fast request.
  const isEntityScoped = Boolean((organizationId && organizationId.trim()) || (company && company.trim()));
  const effectiveLimit = isEntityScoped ? Math.max(limit, 250) : limit;

  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('page_size', String(effectiveLimit));

  // Determine logistics_only: default true for global browsing, or follow explicit user toggle
  if (logisticsOnly !== undefined) {
    if (logisticsOnly) {
      urlParams.set('logistics_only', 'true');
    }
  } else if (!organizationId && !company) {
    urlParams.set('logistics_only', 'true');
  }

  if (decisionMakersOnly || tab === 'new') {
    urlParams.set('decision_makers_only', 'true');
  }

  if (hasEmailOnly) {
    urlParams.set('has_email_only', 'true');
  }

  if (hasLinkedinOnly) {
    urlParams.set('has_linkedin_only', 'true');
  }

  if (seniority && seniority.length > 0) {
    urlParams.set('seniority', seniority.join(','));
  }

  if (jobTitles && jobTitles.length > 0) {
    urlParams.set('job_title', jobTitles.join(','));
  }

  if (industries && industries.length > 0) {
    urlParams.set('industry', industries[0]);
  }

  if (organizationId && organizationId.trim()) {
    urlParams.set('organization_id', organizationId.trim());
  }

  if (company && company.trim()) {
    urlParams.set('company', company.trim());
  }

  if (q && q.trim()) {
    urlParams.set('search', q.trim());
  }

  if (departments && departments.length > 0) {
    urlParams.set('department', departments.join(','));
  }

  if (locations && locations.length > 0) {
    const loc = locations[0];
    const country = loc.includes(',') ? loc.split(',').pop()?.trim() : loc.trim();
    if (country) {
      urlParams.set('country', country);
    }
  }

  const targetUrl = `${API_BASE_URL}/api/v1/apollo/contacts?${urlParams.toString()}`;

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
      const rawContacts: ApolloContact[] = result.data || [];
      const totalRecords: number = result.total_records || 0;

      const totalFormatted =
        totalRecords >= 1000000
          ? `${(totalRecords / 1000000).toFixed(2)}m`
          : totalRecords >= 1000
          ? `${(totalRecords / 1000).toFixed(1)}k`
          : String(totalRecords);

      const items: Lead[] = rawContacts.map(mapApolloContactToLead);

      return {
        items,
        totalEstimate: totalRecords,
        totalFormatted,
        page: result.page || page,
        limit: result.page_size || effectiveLimit,
        totalPages: result.total_pages || (totalRecords > 0 ? Math.ceil(totalRecords / effectiveLimit) : 1),
        audienceCounts: {
          all: totalRecords,
          new: result.audience_counts?.new ?? (result.decision_makers_count ?? rawContacts.filter((c) => c.is_decision_maker).length),
          saved: 0,
        },
      };
    } else if (response.status === 422 && effectiveLimit > 100) {
      // Defensive fallback: if backend server enforces a smaller max page_size, retry with 100
      logger.warn('APOLLO', 'Server rejected large page_size with 422. Retrying with page_size=100.');
      urlParams.set('page_size', '100');
      const retryUrl = `${API_BASE_URL}/api/v1/apollo/contacts?${urlParams.toString()}`;
      const retryResponse = await fetch(retryUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...authHeaders,
        },
      });
      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        const rawContacts: ApolloContact[] = retryResult.data || [];
        const totalRecords: number = retryResult.total_records || 0;
        const totalFormatted =
          totalRecords >= 1000000
            ? `${(totalRecords / 1000000).toFixed(2)}m`
            : totalRecords >= 1000
            ? `${(totalRecords / 1000).toFixed(1)}k`
            : String(totalRecords);
        const items: Lead[] = rawContacts.map(mapApolloContactToLead);
        return {
          items,
          totalEstimate: totalRecords,
          totalFormatted,
          page: retryResult.page || page,
          limit: retryResult.page_size || 100,
          totalPages: retryResult.total_pages || (totalRecords > 0 ? Math.ceil(totalRecords / 100) : 1),
          audienceCounts: {
            all: totalRecords,
            new: retryResult.audience_counts?.new ?? (retryResult.decision_makers_count ?? rawContacts.filter((c) => c.is_decision_maker).length),
            saved: 0,
          },
        };
      }
      logger.warn('APOLLO', `Apollo contacts retry returned ${retryResponse.status}. Falling back to preloaded data.`);
    } else {
      logger.warn('APOLLO', `Apollo contacts API returned ${response.status}. Falling back to preloaded data.`);
    }
  } catch (err) {
    logger.warn('APOLLO', 'Failed to reach Apollo contacts API endpoint. Falling back to preloaded data.', { err });
  }

  // Fallback to preloaded starter data if offline or network error
  return queryApolloPeopleLeadsLocal({
    ...params,
    limit: effectiveLimit,
  });
}

