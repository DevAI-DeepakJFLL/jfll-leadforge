/**
 * Palette configurations for company avatars matching enterprise design tokens
 */
export const AVATAR_PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/80' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/80' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200/80' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/80' },
];

/**
 * Extracts 2-character uppercase initials from an organization name
 */
export function getCompanyInitials(name?: string | null): string {
  if (!name) return 'CO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generates deterministic avatar styling based on string hash
 */
export function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

/**
 * Formats annual revenue numbers into human-readable currency amounts
 */
export function formatRevenue(rev?: number | null): string {
  if (!rev || rev === 0) return 'Not disclosed';
  if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)} Billion`;
  if (rev >= 1000000) return `$${(rev / 1000000).toFixed(2)} Million`;
  if (rev >= 1000) return `$${(rev / 1000).toFixed(0)} Thousand`;
  return `$${rev.toLocaleString()}`;
}

/**
 * Extracts uppercase initials from an individual person's name
 */
export function getContactInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns badge label and color styling for contact seniority levels
 */
export function getSeniorityBadge(seniority?: string | null): { label: string; bg: string } | null {
  if (!seniority) return null;
  const s = seniority.toLowerCase();
  if (s.includes('c_suite') || s.includes('cxo') || s.includes('founder') || s.includes('owner') || s.includes('executive')) {
    return { label: 'C-Suite', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (s.includes('vp') || s.includes('vice_president')) {
    return { label: 'VP / Exec', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (s.includes('director') || s.includes('head')) {
    return { label: 'Director', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (s.includes('manager') || s.includes('lead')) {
    return { label: 'Manager', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (s.includes('senior')) {
    return { label: 'Senior', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
  return { label: seniority, bg: 'bg-slate-50 text-slate-600 border-slate-200' };
}

/**
 * Parses technologies array from string like "['salesforce', 'sap']" or comma separated
 */
export function parseTechnologies(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const cleaned = raw.replace(/'/g, '"');
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) {
      return arr.slice(0, 20).map((t) => String(t).replace(/_/g, ' '));
    }
  } catch {
    return raw
      .replace(/[\[\]']/g, '')
      .split(',')
      .map((t) => t.trim().replace(/_/g, ' '))
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

/**
 * Parses job functions from string like "{'engineering': 21515, 'operations': 1929}"
 */
export function parseJobFunctions(raw?: string | null): { name: string; count: number }[] {
  if (!raw) return [];
  try {
    const cleaned = raw.replace(/'/g, '"');
    const obj = JSON.parse(cleaned);
    return Object.entries(obj)
      .map(([k, v]) => ({ name: k.replace(/_/g, ' '), count: Number(v) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Sanitizes LinkedIn URL from array string representation
 */
export function cleanLinkedinUrl(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/[\[\]']/g, '').trim() || null;
}

/**
 * Formats revenue into compact table representation (e.g. $1.5B, $20M)
 */
export function formatCompactRevenue(rev?: number | null): string {
  if (!rev || rev === 0) return '—';
  if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(1)}B`;
  if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
  if (rev >= 1000) return `$${(rev / 1000).toFixed(0)}k`;
  return `$${rev}`;
}

/**
 * Formats employee headcount into compact table representation
 */
export function formatCompactEmployees(count?: number | null): string {
  if (!count || count === 0) return '—';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k staff`;
  return `${count} staff`;
}

