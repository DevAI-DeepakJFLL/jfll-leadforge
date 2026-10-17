import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import { JFLL_INACTIVE_CUSTOMERS_DATA } from '@/data/jfllInactiveCustomersData';
import {
  JfllCustomer,
  JfllCustomerFilterParams,
  JfllCustomersResponse,
} from '@/types/jfllCustomer';
import { logger } from '@/utils/logger';

interface ApiLeadRecord {
  full_name?: string;
  territory?: string;
  contact_person_name?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  status?: string;
  customer_group?: string;
  type?: string;
}

/**
 * Asynchronously query the Backend REST API (DuckDB over S3 Parquet / Lambda)
 * with graceful fallback to local data if offline.
 */
export async function fetchJfllCustomersFromApi(
  params: JfllCustomerFilterParams = {}
): Promise<JfllCustomersResponse> {
  const {
    q,
    customerStatus = 'active',
    customerGroups = [],
    types = [],
    hasPhone,
    hasEmail,
    hasContactPerson,
    tab = 'all',
    page = 1,
    limit = 25,
  } = params;

  // Inactive customers are loaded from the enriched Inactive Customers dataset
  if (customerStatus === 'inactive') {
    return queryJfllCustomers(params);
  }

  const startTime = performance.now();
  const urlParams = new URLSearchParams();
  urlParams.set('page', String(page));
  urlParams.set('page_size', String(limit));
  urlParams.set('status', 'Active');

  if (q && q.trim()) urlParams.set('search', q.trim());
  if (tab && tab !== 'all') urlParams.set('tab', tab);
  if (hasPhone) urlParams.set('has_phone', 'true');
  if (hasEmail) urlParams.set('has_email', 'true');
  if (hasContactPerson) urlParams.set('has_contact_person', 'true');

  customerGroups.forEach((g) => urlParams.append('customer_groups', g));
  types.forEach((t) => urlParams.append('types', t));

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const endpoint = `${apiBase}/api/v1/leads?${urlParams.toString()}`;
  logger.info('API', 'Querying JFLL customer leads', { page, limit, tab, q, customerGroups });

  let authHeader: Record<string, string> = {};
  try {
    const rawSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apollo_leads_session') : null;
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.token) {
        authHeader = { Authorization: `Bearer ${session.token}` };
      }
    }
  } catch {
    // Session read error
  }

  try {
    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        ...authHeader,
      },
    });
    const durationMs = performance.now() - startTime;
    logger.apiCall('GET', '/api/v1/leads', durationMs, res.status, { page, limit, tab });

    if (!res.ok) {
      throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();
    const items: JfllCustomer[] = (payload.data || []).map((row: ApiLeadRecord, idx: number) => ({
      id: `jfll-${(page - 1) * limit + idx + 1}`,
      fullName: row.full_name || '',
      territory: row.territory || 'All Territories',
      contactPersonName: row.contact_person_name || null,
      mobileNumber: row.mobile_number || null,
      email: row.email || null,
      status: (row.status as 'Active' | 'Not Active') || 'Active',
      customerGroup: row.customer_group || '',
      type: row.type || '',
      saved: false,
      inDataMyne: false,
    }));

    const totalEstimate = payload.total_records ?? items.length;
    const audience = payload.audience_counts || {};

    return {
      items,
      totalEstimate,
      totalFormatted: totalEstimate.toLocaleString('en-US'),
      page: payload.page ?? page,
      limit: payload.page_size ?? limit,
      totalPages: payload.total_pages ?? Math.max(1, Math.ceil(totalEstimate / limit)),
      audienceCounts: {
        all: audience.all ?? JFLL_CUSTOMERS_DATA.length,
        shippers: audience.shippers ?? 285,
        subagents: audience.subagents ?? 389,
        overseas: audience.overseas ?? 39,
        withContacts: audience.with_contacts ?? JFLL_CUSTOMERS_DATA.length,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
      },
    };
  } catch (err) {
    logger.warn('API', 'Backend query failed, activating offline dataset fallback', { error: String(err) });
    return queryJfllCustomers(params);
  }
}

/**
 * Accurately determines if a phone string represents a valid, dialable phone number
 * and not a missing/placeholder indicator like "-", "--", "+91-", "N/A", "null", etc.
 */
export function isValidPhoneNumber(phone?: string | null): boolean {
  if (!phone || !phone.trim()) return false;
  const raw = phone.trim();
  // Reject known placeholder symbols
  if (['-', '--', '---', '+91-', '+91', 'N/A', 'NA', 'null', 'none'].includes(raw)) {
    return false;
  }
  // Extract digit characters
  const digits = raw.replace(/\D/g, '');
  // Must have at least 5 subscriber digits and not simply be the country code '91'
  return digits.length >= 5 && digits !== '91';
}

/**
 * Filter and query JFLL Customers dataset synchronously (used as reliable offline fallback)
 */
export function queryJfllCustomers(params: JfllCustomerFilterParams = {}): JfllCustomersResponse {
  const {
    q,
    customerStatus = 'active',
    customerGroups = [],
    types = [],
    hasPhone,
    hasEmail,
    hasContactPerson,
    tab = 'all',
    page = 1,
    limit = 25,
  } = params;

  const isInactive = customerStatus === 'inactive';
  const baseData = isInactive ? JFLL_INACTIVE_CUSTOMERS_DATA : JFLL_CUSTOMERS_DATA;
  let filtered = [...baseData];

  // 1. Tab Quick Filters
  if (isInactive) {
    if (tab === 'datamyne-leads') {
      filtered = filtered.filter((c) => !!c.inDataMyne);
    } else if (tab === 'archive') {
      filtered = filtered.filter((c) => !c.inDataMyne);
    } else if (tab === 'with-contacts') {
      filtered = filtered.filter(
        (c) => !!c.contactPersonName || !!c.email || isValidPhoneNumber(c.mobileNumber)
      );
    }
  } else {
    if (tab === 'shippers') {
      filtered = filtered.filter((c) => c.customerGroup === 'Shipper / Consignee');
    } else if (tab === 'subagents') {
      filtered = filtered.filter((c) => c.customerGroup === 'Subagent');
    } else if (tab === 'overseas') {
      filtered = filtered.filter((c) => c.customerGroup === 'Overseas Agent');
    } else if (tab === 'with-contacts') {
      filtered = filtered.filter(
        (c) => !!c.contactPersonName || !!c.email || isValidPhoneNumber(c.mobileNumber)
      );
    }
  }

  // 2. Text Search Query (Full Name, Contact Person, Email, Mobile)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(query) ||
        (c.contactPersonName && c.contactPersonName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (isValidPhoneNumber(c.mobileNumber) && c.mobileNumber!.toLowerCase().includes(query))
    );
  }

  // 3. Customer Groups Multi-select Filter
  if (customerGroups.length > 0) {
    filtered = filtered.filter((c) => customerGroups.includes(c.customerGroup));
  }

  // 4. Entity Type Multi-select Filter
  if (types.length > 0) {
    filtered = filtered.filter((c) => types.includes(c.type));
  }

  // 5. Contact Readiness Filters
  if (hasPhone) {
    filtered = filtered.filter((c) => isValidPhoneNumber(c.mobileNumber));
  }
  if (hasEmail) {
    filtered = filtered.filter((c) => !!c.email && c.email.trim().length > 0);
  }
  if (hasContactPerson) {
    filtered = filtered.filter(
      (c) => !!c.contactPersonName && c.contactPersonName.trim().length > 0
    );
  }

  // Audience counts
  const audienceCounts = isInactive
    ? {
        all: JFLL_INACTIVE_CUSTOMERS_DATA.length,
        shippers: 0,
        subagents: 0,
        overseas: 0,
        withContacts: JFLL_INACTIVE_CUSTOMERS_DATA.filter(
          (c) => !!c.contactPersonName || !!c.email || isValidPhoneNumber(c.mobileNumber)
        ).length,
        datamyneLeads: JFLL_INACTIVE_CUSTOMERS_DATA.filter((c) => !!c.inDataMyne).length,
        archive: JFLL_INACTIVE_CUSTOMERS_DATA.filter((c) => !c.inDataMyne).length,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
      }
    : {
        all: JFLL_CUSTOMERS_DATA.length,
        shippers: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Shipper / Consignee').length,
        subagents: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Subagent').length,
        overseas: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Overseas Agent').length,
        withContacts: JFLL_CUSTOMERS_DATA.filter(
          (c) => !!c.contactPersonName || !!c.email || isValidPhoneNumber(c.mobileNumber)
        ).length,
        datamyneLeads: 0,
        archive: 0,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
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
  };
}

/**
 * Sanitize cell content against CSV Formula Injection (CWE-1236)
 */
function sanitizeCsvValue(val: string | null | undefined): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // If value begins with dangerous formula triggers (=, +, -, @), prefix with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate sanitized CSV blob for JFLL Customers
 */
export function exportJfllCustomersCsv(customers: JfllCustomer[]): Blob {
  const headers = [
    'Company Name',
    'Customer Group',
    'Legal Type',
    'Status',
    'Contact Person Name',
    'Mobile Number',
    'Email',
    'Territory',
  ];

  const rows = customers.map((c) => [
    sanitizeCsvValue(c.fullName),
    sanitizeCsvValue(c.customerGroup),
    sanitizeCsvValue(c.type),
    sanitizeCsvValue(c.status),
    sanitizeCsvValue(c.contactPersonName),
    sanitizeCsvValue(c.mobileNumber),
    sanitizeCsvValue(c.email),
    sanitizeCsvValue(c.territory),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Dynamically compute actual Customer Group facet counts from dataset
 */
export function getCustomerGroupFacetCounts(status: 'active' | 'inactive' = 'active'): { label: string; count: number }[] {
  const data = status === 'inactive' ? JFLL_INACTIVE_CUSTOMERS_DATA : JFLL_CUSTOMERS_DATA;
  const counts: Record<string, number> = {};
  for (const c of data) {
    if (c.customerGroup) {
      counts[c.customerGroup] = (counts[c.customerGroup] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Dynamically compute actual Legal Type facet counts from dataset
 */
export function getLegalTypeFacetCounts(status: 'active' | 'inactive' = 'active'): { label: string; count: number }[] {
  const data = status === 'inactive' ? JFLL_INACTIVE_CUSTOMERS_DATA : JFLL_CUSTOMERS_DATA;
  const counts: Record<string, number> = {};
  for (const c of data) {
    if (c.type) {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Dynamically compute actual Contact Readiness facet counts from dataset
 */
export function getContactReadinessFacetCounts(status: 'active' | 'inactive' = 'active'): {
  hasContactPerson: number;
  hasPhone: number;
  hasEmail: number;
} {
  const data = status === 'inactive' ? JFLL_INACTIVE_CUSTOMERS_DATA : JFLL_CUSTOMERS_DATA;
  let hasContactPerson = 0;
  let hasPhone = 0;
  let hasEmail = 0;
  for (const c of data) {
    if (c.contactPersonName && c.contactPersonName.trim().length > 0) hasContactPerson++;
    if (isValidPhoneNumber(c.mobileNumber)) hasPhone++;
    if (c.email && c.email.trim().length > 0) hasEmail++;
  }
  return { hasContactPerson, hasPhone, hasEmail };
}

