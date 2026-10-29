import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import { JFLL_INACTIVE_CUSTOMERS_DATA } from '@/data/jfllInactiveCustomersData';
import {
  JfllCustomer,
  JfllCustomerFilterParams,
  JfllCustomersResponse,
  JfllAudienceCounts,
  JFLL_REVENUE_RANGES,
} from '@/types/jfllCustomer';
import { logger } from '@/utils/logger';
import { createCsvBlob } from '@/utils/csv';
import { API_BASE_URL } from '@/config/api';
import { isValidPhoneNumber } from '@/utils/phoneUtils';
import { isOfflineSession } from '@/services/authService';

export { isValidPhoneNumber };

interface ApiLeadRecord {
  full_name?: string;
  territory?: string;
  contact_person_name?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  status?: string;
  customer_group?: string;
  type?: string;
  credit_status?: string | null;
  sales_person?: string | null;
  business_last_3m?: number | null;
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
    creditStatuses = [],
    salesPersons = [],
    revenueRanges = [],
    minRevenue,
    hasPhone,
    hasEmail,
    hasContactPerson,
    tab = 'all',
    sortBy,
    sortOrder,
    page = 1,
    limit = 25,
  } = params;

  // Inactive customers and combined all customers are loaded from the enriched datasets directly
  if (customerStatus === 'inactive' || customerStatus === 'all') {
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
  creditStatuses.forEach((cs) => urlParams.append('credit_statuses', cs));
  salesPersons.forEach((sp) => urlParams.append('sales_persons', sp));
  revenueRanges.forEach((rr) => urlParams.append('revenue_ranges', rr));
  if (minRevenue !== undefined) urlParams.set('min_revenue', String(minRevenue));
  if (sortBy) urlParams.set('sort_by', sortBy);
  if (sortOrder) urlParams.set('sort_order', sortOrder);

  const endpoint = `${API_BASE_URL}/api/v1/leads?${urlParams.toString()}`;
  logger.info('API', 'Querying JFLL customer leads', { page, limit, tab, q, customerGroups, creditStatuses, salesPersons, revenueRanges, sortBy, sortOrder });

  let authHeader: Record<string, string> = {};
  try {
    const rawSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apollo_leads_session') : null;
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session?.token && !isOfflineSession(session)) {
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
      creditStatus: row.credit_status || undefined,
      salesPerson: row.sales_person || null,
      businessLast3m: row.business_last_3m !== null && row.business_last_3m !== undefined ? row.business_last_3m : undefined,
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
        shippers: audience.shippers ?? 229,
        subagents: audience.subagents ?? 315,
        overseas: audience.overseas ?? 25,
        withContacts: audience.with_contacts ?? JFLL_CUSTOMERS_DATA.length,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
        allTotal: JFLL_CUSTOMERS_DATA.length + JFLL_INACTIVE_CUSTOMERS_DATA.length,
      },
    };
  } catch (err) {
    logger.warn('API', 'Backend query failed, activating offline dataset fallback', { error: String(err) });
    return queryJfllCustomers(params);
  }
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
    creditStatuses = [],
    salesPersons = [],
    revenueRanges = [],
    minRevenue,
    hasPhone,
    hasEmail,
    hasContactPerson,
    tab = 'all',
    sortBy,
    sortOrder,
    page = 1,
    limit = 25,
  } = params;

  const isAll = customerStatus === 'all';
  const isInactive = customerStatus === 'inactive';
  const baseData = isAll
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : isInactive
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
  let baseFiltered = [...baseData];

  // 1. Text Search Query (Full Name, Contact Person, Email, Mobile, Sales Person)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    baseFiltered = baseFiltered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(query) ||
        (c.contactPersonName && c.contactPersonName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.salesPerson && c.salesPerson.toLowerCase().includes(query)) ||
        (isValidPhoneNumber(c.mobileNumber) && c.mobileNumber!.toLowerCase().includes(query))
    );
  }

  // 2. Customer Groups Multi-select Filter
  if (customerGroups.length > 0) {
    const groupSet = new Set(customerGroups);
    baseFiltered = baseFiltered.filter((c) => groupSet.has(c.customerGroup));
  }

  // 3. Entity Type Multi-select Filter
  if (types.length > 0) {
    const typeSet = new Set(types);
    baseFiltered = baseFiltered.filter((c) => typeSet.has(c.type));
  }

  // 4. Credit Status Multi-select Filter
  if (creditStatuses.length > 0) {
    const creditSet = new Set(creditStatuses);
    baseFiltered = baseFiltered.filter((c) => !!c.creditStatus && creditSet.has(c.creditStatus));
  }

  // 5. Sales Person Multi-select Filter
  if (salesPersons.length > 0) {
    const salesSet = new Set(salesPersons);
    baseFiltered = baseFiltered.filter((c) => !!c.salesPerson && salesSet.has(c.salesPerson));
  }

  // 6. Revenue Range Multi-select Filter
  if (revenueRanges.length > 0) {
    const activeRangeDefs = revenueRanges
      .map((rangeId) => JFLL_REVENUE_RANGES.find((r) => r.id === rangeId))
      .filter((def): def is (typeof JFLL_REVENUE_RANGES)[number] => Boolean(def));

    baseFiltered = baseFiltered.filter((c) => {
      const rev = c.businessLast3m ?? 0;
      return activeRangeDefs.some((def) => {
        if (def.min !== undefined && def.max !== undefined) {
          return rev >= def.min && rev < def.max;
        }
        if (def.min !== undefined) {
          return rev >= def.min;
        }
        if (def.max !== undefined) {
          return rev < def.max;
        }
        return true;
      });
    });
  }

  if (minRevenue !== undefined) {
    baseFiltered = baseFiltered.filter((c) => (c.businessLast3m ?? 0) >= minRevenue);
  }

  // 7. Contact Readiness Filters
  if (hasPhone) {
    baseFiltered = baseFiltered.filter((c) => isValidPhoneNumber(c.mobileNumber));
  }
  if (hasEmail) {
    baseFiltered = baseFiltered.filter((c) => !!c.email && c.email.trim().length > 0);
  }
  if (hasContactPerson) {
    baseFiltered = baseFiltered.filter(
      (c) => !!c.contactPersonName && c.contactPersonName.trim().length > 0
    );
  }

  // 5. Audience counts computed from filtered base data in a single loop
  let shippersCount = 0;
  let subagentsCount = 0;
  let overseasCount = 0;
  let withContactsCount = 0;
  let datamyneLeadsCount = 0;
  let archiveCount = 0;

  for (const c of baseFiltered) {
    if (c.customerGroup === 'Shipper / Consignee') shippersCount++;
    else if (c.customerGroup === 'Subagent') subagentsCount++;
    else if (c.customerGroup === 'Overseas Agent') overseasCount++;

    if (c.contactPersonName || c.email || isValidPhoneNumber(c.mobileNumber)) {
      withContactsCount++;
    }
    if (c.inDataMyne) {
      datamyneLeadsCount++;
    } else if (c.status === 'Not Active') {
      archiveCount++;
    }
  }

  const totalAllCount = JFLL_CUSTOMERS_DATA.length + JFLL_INACTIVE_CUSTOMERS_DATA.length;
  const audienceCounts: JfllAudienceCounts = isAll
    ? {
        all: baseFiltered.length,
        shippers: shippersCount,
        subagents: subagentsCount,
        overseas: overseasCount,
        withContacts: withContactsCount,
        datamyneLeads: datamyneLeadsCount,
        archive: archiveCount,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
        allTotal: totalAllCount,
      }
    : isInactive
    ? {
        all: baseFiltered.length,
        shippers: 0,
        subagents: 0,
        overseas: 0,
        withContacts: withContactsCount,
        datamyneLeads: datamyneLeadsCount,
        archive: archiveCount,
        activeTotal: JFLL_CUSTOMERS_DATA.length,
        inactiveTotal: baseFiltered.length,
        allTotal: totalAllCount,
      }
    : {
        all: baseFiltered.length,
        shippers: shippersCount,
        subagents: subagentsCount,
        overseas: overseasCount,
        withContacts: withContactsCount,
        datamyneLeads: 0,
        archive: 0,
        activeTotal: baseFiltered.length,
        inactiveTotal: JFLL_INACTIVE_CUSTOMERS_DATA.length,
        allTotal: totalAllCount,
      };

  // 6. Tab Quick Filters (Applied to baseFiltered for table items and pagination)
  let filtered = baseFiltered;
  if (isAll) {
    if (tab === 'shippers') {
      filtered = filtered.filter((c) => c.customerGroup === 'Shipper / Consignee');
    } else if (tab === 'subagents') {
      filtered = filtered.filter((c) => c.customerGroup === 'Subagent');
    } else if (tab === 'overseas') {
      filtered = filtered.filter((c) => c.customerGroup === 'Overseas Agent');
    } else if (tab === 'datamyne-leads') {
      filtered = filtered.filter((c) => !!c.inDataMyne);
    } else if (tab === 'archive') {
      filtered = filtered.filter((c) => c.status === 'Not Active' && !c.inDataMyne);
    } else if (tab === 'with-contacts') {
      filtered = filtered.filter(
        (c) => !!c.contactPersonName || !!c.email || isValidPhoneNumber(c.mobileNumber)
      );
    }
  } else if (isInactive) {
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

  // 7. Column-header sorting
  if (sortBy) {
    filtered.sort((a, b) => {
      if (sortBy === 'businessLast3m') {
        const hasA = a.businessLast3m !== undefined && a.businessLast3m !== null;
        const hasB = b.businessLast3m !== undefined && b.businessLast3m !== null;
        if (!hasA && !hasB) return a.fullName.localeCompare(b.fullName);
        if (!hasA) return 1; // NULLS LAST
        if (!hasB) return -1; // NULLS LAST
        const revA = a.businessLast3m!;
        const revB = b.businessLast3m!;
        if (revA !== revB) {
          return sortOrder === 'desc' ? revB - revA : revA - revB;
        }
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'fullName') {
        return sortOrder === 'desc'
          ? b.fullName.localeCompare(a.fullName)
          : a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'customerGroup') {
        return sortOrder === 'desc'
          ? b.customerGroup.localeCompare(a.customerGroup)
          : a.customerGroup.localeCompare(b.customerGroup);
      }
      if (sortBy === 'creditStatus') {
        const valA = a.creditStatus || '';
        const valB = b.creditStatus || '';
        return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      if (sortBy === 'contactPersonName') {
        const valA = a.contactPersonName || '';
        const valB = b.contactPersonName || '';
        if (valA && !valB) return -1;
        if (!valA && valB) return 1;
        return sortOrder === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      if (sortBy === 'status') {
        return sortOrder === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status);
      }
      return 0;
    });
  } else {
    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
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
  };
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
    'Credit Status',
    'Recent Business (INR)',
    'Sales Representative',
    'Contact Person Name',
    'Mobile Number',
    'Email',
    'Territory',
  ];

  const rows = customers.map((c) => [
    c.fullName,
    c.customerGroup,
    c.type,
    c.status,
    c.creditStatus ? c.creditStatus.replace(/_/g, ' ').toUpperCase() : 'N/A',
    c.businessLast3m !== undefined && c.businessLast3m !== null ? c.businessLast3m : 'N/A',
    c.salesPerson || 'N/A',
    c.contactPersonName,
    c.mobileNumber,
    c.email,
    c.territory,
  ]);

  return createCsvBlob(headers, rows);
}

/**
 * Dynamically compute actual Customer Group facet counts from dataset
 */
export function getCustomerGroupFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): { label: string; count: number }[] {
  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : status === 'inactive'
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
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
export function getLegalTypeFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): { label: string; count: number }[] {
  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : status === 'inactive'
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
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
export function getContactReadinessFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): {
  hasContactPerson: number;
  hasPhone: number;
  hasEmail: number;
} {
  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : status === 'inactive'
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
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

/**
 * Dynamically compute actual Credit Status facet counts from dataset
 */
export function getCreditStatusFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): {
  label: string;
  value: string;
  count: number;
}[] {
  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : status === 'inactive'
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
  const counts: Record<string, number> = {};
  for (const c of data) {
    if (c.creditStatus) {
      counts[c.creditStatus] = (counts[c.creditStatus] || 0) + 1;
    }
  }

  const order = ['approved', 'moderate_risk', 'high_risk', 'blocked', 'no_credit'];
  return Object.entries(counts)
    .map(([value, count]) => {
      const label = value
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { label, value, count };
    })
    .sort((a, b) => {
      const idxA = order.indexOf(a.value);
      const idxB = order.indexOf(b.value);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return b.count - a.count;
    });
}

/**
 * Dynamically compute actual Sales Person facet counts from dataset
 */
export function getSalesPersonFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): { label: string; count: number }[] {
  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : status === 'inactive'
    ? JFLL_INACTIVE_CUSTOMERS_DATA
    : JFLL_CUSTOMERS_DATA;
  const counts: Record<string, number> = {};
  for (const c of data) {
    if (c.salesPerson && c.salesPerson.trim().length > 0) {
      counts[c.salesPerson.trim()] = (counts[c.salesPerson.trim()] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Dynamically compute actual Revenue Range facet counts from dataset
 */
export function getRevenueRangeFacetCounts(status: 'active' | 'inactive' | 'all' = 'active'): {
  id: string;
  label: string;
  sublabel?: string;
  count: number;
}[] {
  if (status === 'inactive') {
    return JFLL_REVENUE_RANGES.map((r) => ({
      id: r.id,
      label: r.label,
      sublabel: r.sublabel,
      count: 0,
    }));
  }

  const data = status === 'all'
    ? [...JFLL_CUSTOMERS_DATA, ...JFLL_INACTIVE_CUSTOMERS_DATA]
    : JFLL_CUSTOMERS_DATA;

  return JFLL_REVENUE_RANGES.map((range) => {
    const count = data.filter((c) => {
      if (c.status !== 'Active') return false;
      const rev = c.businessLast3m ?? 0;
      if (range.min !== undefined && range.max !== undefined) {
        return rev >= range.min && rev < range.max;
      }
      if (range.min !== undefined) {
        return rev >= range.min;
      }
      if (range.max !== undefined) {
        return rev < range.max;
      }
      return true;
    }).length;

    return {
      id: range.id,
      label: range.label,
      sublabel: range.sublabel,
      count,
    };
  });
}

/**
 * Format Indian Rupee currency concisely: ₹1.86 Cr, ₹53.44 L, ₹95,200
 */
export function formatIndianCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '—';
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

