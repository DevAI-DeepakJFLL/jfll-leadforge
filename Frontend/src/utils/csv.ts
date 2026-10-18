import { Lead } from '@/types/lead';

/**
 * Sanitizes and escapes a cell value conforming to RFC-4180 standard.
 * Additionally protects against CSV Formula Injection (CWE-1236)
 * by prefixing cells that begin with formula trigger characters (=, +, -, @, \t, \r)
 * with a single quote (').
 */
export function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // CSV Formula Injection mitigation (CWE-1236): neutralize spreadsheet formula triggers
  if (/^[\s\t\r]*[=+\-@]/.test(str) || /^[\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC-4180: Double quote escaping
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Backward-compatible alias for existing imports
 */
export const escapeCsvField = sanitizeCsvValue;

/**
 * Builds an RFC-4180 compliant CSV string from an array of headers and rows.
 */
export function buildCsvString(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const sanitizedRows = rows.map((row) => row.map((cell) => sanitizeCsvValue(cell)).join(','));
  return [headers.join(','), ...sanitizedRows].join('\r\n');
}

/**
 * Creates an RFC-4180 compliant CSV Blob prepended with UTF-8 BOM (\uFEFF)
 * for optimal Microsoft Excel and Google Sheets compatibility.
 */
export function createCsvBlob(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Blob {
  const csvContent = buildCsvString(headers, rows);
  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Triggers a client-side download of a CSV Blob.
 */
export function triggerCsvDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    l.id,
    l.name,
    l.title,
    l.company,
    l.industry,
    l.department || '',
    l.status,
    l.location,
    l.email,
    l.phone,
    l.employees,
    l.revenue,
    l.funding,
    l.saved ? 'Yes' : 'No',
  ]);

  return buildCsvString(headers, rows);
}
