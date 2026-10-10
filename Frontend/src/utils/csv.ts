import { Lead } from '@/types/lead';

/**
 * Escapes a cell value conforming to RFC-4180 standard.
 * Additionally protects against CSV Formula Injection (CWE-1236)
 * by prefixing cells that begin with formula trigger characters (=, +, -, @, \t, \r)
 * with a single quote.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // CSV Formula Injection mitigation: neutralize spreadsheet formulas
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC-4180: Double quote escaping
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an RFC-4180 compliant CSV string from an array of leads.
 */
export function generateLeadsCsv(leads: Lead[]): string {
  const headers = [
    'ID',
    'Name',
    'Title',
    'Company',
    'Industry',
    'Department',
    'Status',
    'Location',
    'Email',
    'Phone',
    'Employees',
    'Revenue',
    'Funding',
    'Saved',
  ];

  const rows = leads.map((l) => [
    escapeCsvField(l.id),
    escapeCsvField(l.name),
    escapeCsvField(l.title),
    escapeCsvField(l.company),
    escapeCsvField(l.industry),
    escapeCsvField(l.department || ''),
    escapeCsvField(l.status),
    escapeCsvField(l.location),
    escapeCsvField(l.email),
    escapeCsvField(l.phone),
    escapeCsvField(l.employees),
    escapeCsvField(l.revenue),
    escapeCsvField(l.funding),
    escapeCsvField(l.saved ? 'Yes' : 'No'),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}
