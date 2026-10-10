import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import {
  JfllCustomer,
  JfllCustomerFilterParams,
  JfllCustomersResponse,
} from '@/types/jfllCustomer';

/**
 * Filter and query JFLL Customers dataset with client-side zero-latency processing
 * and optional backend integration.
 */
export function queryJfllCustomers(params: JfllCustomerFilterParams = {}): JfllCustomersResponse {
  const {
    q,
    customerGroups = [],
    types = [],
    hasPhone,
    hasEmail,
    hasContactPerson,
    tab = 'all',
    page = 1,
    limit = 25,
  } = params;

  let filtered = [...JFLL_CUSTOMERS_DATA];

  // 1. Tab Quick Filters
  if (tab === 'shippers') {
    filtered = filtered.filter((c) => c.customerGroup === 'Shipper / Consignee');
  } else if (tab === 'subagents') {
    filtered = filtered.filter((c) => c.customerGroup === 'Subagent');
  } else if (tab === 'overseas') {
    filtered = filtered.filter((c) => c.customerGroup === 'Overseas Agent');
  } else if (tab === 'with-contacts') {
    filtered = filtered.filter((c) => !!c.contactPersonName || !!c.email || !!c.mobileNumber);
  }

  // 2. Text Search Query (Full Name, Contact Person, Email)
  if (q && q.trim()) {
    const query = q.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(query) ||
        (c.contactPersonName && c.contactPersonName.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.mobileNumber && c.mobileNumber.toLowerCase().includes(query))
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
    filtered = filtered.filter((c) => !!c.mobileNumber && c.mobileNumber.trim().length > 0);
  }
  if (hasEmail) {
    filtered = filtered.filter((c) => !!c.email && c.email.trim().length > 0);
  }
  if (hasContactPerson) {
    filtered = filtered.filter(
      (c) => !!c.contactPersonName && c.contactPersonName.trim().length > 0
    );
  }

  // Audience counts across full dataset
  const audienceCounts = {
    all: JFLL_CUSTOMERS_DATA.length,
    shippers: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Shipper / Consignee').length,
    subagents: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Subagent').length,
    overseas: JFLL_CUSTOMERS_DATA.filter((c) => c.customerGroup === 'Overseas Agent').length,
    withContacts: JFLL_CUSTOMERS_DATA.filter(
      (c) => !!c.contactPersonName || !!c.email || !!c.mobileNumber
    ).length,
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
export function getCustomerGroupFacetCounts(): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of JFLL_CUSTOMERS_DATA) {
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
export function getLegalTypeFacetCounts(): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of JFLL_CUSTOMERS_DATA) {
    if (c.type) {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

