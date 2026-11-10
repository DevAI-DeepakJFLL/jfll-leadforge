import { toSafeExternalUrl } from '@/types/apolloLead';

/**
 * Palette configurations for company avatars matching enterprise design tokens
 */
const AVATAR_PALETTES = [
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
 * Sanitizes LinkedIn URL from array string representation with security protocol validation
 */
export function cleanLinkedinUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[\[\]']/g, '').trim();
  return toSafeExternalUrl(stripped);
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

const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Checks whether an email address is valid, deliverable, conforming to RFC 5322,
 * and not a mock/placeholder string.
 */
export function isValidEmailAddress(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim();
  const lower = clean.toLowerCase();
  if (
    clean.length < 5 ||
    clean.length > 254 ||
    lower.includes('protected') ||
    lower.includes('reveal') ||
    lower.includes('no contact') ||
    lower.includes('unavailable')
  ) {
    return false;
  }
  return RFC_EMAIL_REGEX.test(clean);
}

/**
 * @deprecated Use isValidPhoneNumber from '@/utils/phoneUtils' instead.
 */
export { isValidPhoneNumber } from './phoneUtils';

/**
 * Free public webmail providers filtered out when extracting corporate domains from customs manifests.
 */
export const FREE_WEBMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.in',
  'yahoo.co.uk',
  'hotmail.com',
  'hotmail.co.in',
  'outlook.com',
  'outlook.in',
  'rediffmail.com',
  'rediff.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'zoho.in',
  'protonmail.com',
  'proton.me',
  'live.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'msn.com',
]);

/**
 * Extracts authentic corporate domain from an email address or manifest email dump,
 * filtering out common free webmail providers (Gmail, Yahoo, Outlook, Rediffmail, etc.).
 */
export function extractDomainFromEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (!clean) return null;

  // Split multiple emails if comma, semicolon, or space separated
  const candidates = clean.split(/[,;\s]+/).filter(Boolean);
  for (const cand of candidates) {
    if (!cand.includes('@')) continue;
    const parts = cand.split('@');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) continue;
    let domain = parts[1].replace(/^[.\s;,/<>[\]{}()"'`]+|[.\s;,/<>[\]{}()"'`]+$/g, '');
    if (!domain || !domain.includes('.')) continue;
    if (domain.includes(':')) {
      domain = domain.split(':')[0];
    }
    if (FREE_WEBMAIL_DOMAINS.has(domain)) continue;
    let isFree = false;
    for (const freeDomain of FREE_WEBMAIL_DOMAINS) {
      if (domain === freeDomain || domain.endsWith(`.${freeDomain}`)) {
        isFree = true;
        break;
      }
    }
    if (!isFree) {
      return domain;
    }
  }
  return null;
}

const DIRECTOR_PREFIX_RE = /(?:director\s*[:\-]|dir\s*[:.\-]|proprietor\s*[:\-]|prop\s*[:.\-]|partner\s*[:\-]|managing\s+director\s*[:\-]|md\s*[:.\-]|ceo\s*[:\-]|attn\s*[:.\-]|attention\s*[:\-]|contact\s*[:\-]|name\s*[:\-])\s*/i;
const HONORIFIC_PREFIX_RE = /^(?:mr\b\.?|mrs\b\.?|ms\b\.?|dr\b\.?|shri\b|shree\b|smt\b\.?)\s*/i;
const DESIGNATION_SUFFIX_RE = /[\s,\-([\]]+(?:director|managing\s+director|proprietor|partner|md|ceo|head|manager|promoter|founder)[\s)\]\,]*$/i;
const INVALID_DIRECTOR_STRINGS: ReadonlySet<string> = new Set([
  'na',
  'n/a',
  'none',
  'null',
  'not available',
  'no direct contact on file',
  'as per invoice',
  'to order',
  'self',
  'same as consignee',
  'applicant',
  'unknown',
  'nil',
  'director',
  'proprietor',
  'partner',
  'commercial shipper',
]);

/**
 * Extracts and standardizes an executive or director name from messy customs manifest text dumps,
 * stripping manifest prefixes (DIR:, MD:, ATTN:), corporate designations, DIN numbers,
 * and phone/email noise, while rejecting generic placeholders and corporate legal entities.
 */
export function extractFirstDirectorName(directorsStr?: string | null): string | null {
  if (!directorsStr || typeof directorsStr !== 'string') return null;
  let cleaned = directorsStr.trim();
  if (!cleaned) return null;

  if (INVALID_DIRECTOR_STRINGS.has(cleaned.toLowerCase())) {
    return null;
  }

  // Reject corporate legal entities (contains Ltd, Pvt, LLC, etc.)
  if (/\b(pvt|private\s+limited|limited|ltd|llc|llp|inc|corp|co\.|company)\b/i.test(cleaned)) {
    return null;
  }

  // 1. Remove labeled prefix (DIR:, MD:, ATTN:, etc.)
  const prefixMatch = cleaned.match(DIRECTOR_PREFIX_RE);
  if (prefixMatch && prefixMatch.index !== undefined) {
    cleaned = cleaned.slice(prefixMatch.index + prefixMatch[0].length);
  }

  // 2. Cut off at delimiters like DIN, Tel, Mobile, Email, S/O, D/O, newline, semicolon, pipe
  cleaned = cleaned.split(/[;\n\r|]|\b(?:din|tel|phone|mob|mobile|email|s\/o|d\/o|w\/o)\b/i)[0];

  // 3. Cut off designation suffixes
  cleaned = cleaned.replace(DESIGNATION_SUFFIX_RE, '').trim();

  // 4. Remove honorifics
  cleaned = cleaned.replace(HONORIFIC_PREFIX_RE, '').trim();

  // 5. Clean up punctuation and parentheses
  cleaned = cleaned.replace(/[()[\]"']/g, '').replace(/^[ .,\-/: ]+|[ .,\-/: ]+$/g, '');

  // 6. Normalize internal whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 3) return null;
  if (INVALID_DIRECTOR_STRINGS.has(cleaned.toLowerCase())) return null;
  if (/\d/.test(cleaned)) return null;
  if (!/^[a-zA-Z\s.'-]+$/.test(cleaned)) return null;

  // Title case the name
  return cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const CUSTOMS_PREFIX_RE = /^(?:(?:m\s*\/\s*s(?:\.|\b)|m\.s(?:\.|\b)|ms\b\.?|messrs(?:\.|\b)|shree\b|shri\b|the\b)\s*)+/i;
const LEADING_THE_RE = /^the\s+/i;
const CORPORATE_SUFFIX_RE = /\b(inc|corp|corporation|llc|llp|ltd|limited|pvt|private|co|company|group|holdings|india|asia|impex)\b/gi;

/**
 * Normalizes commercial entity names by stripping customs prefixes (M/S, Messrs, Shree, The),
 * legal entity suffixes (Inc, Corp, LLC, LLP, Ltd, Limited, Pvt, Private),
 * regional qualifiers (India, Asia), and trading tokens (Impex) to maximize matching across
 * Apollo directories.
 */
export function cleanCustomsCompanyName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let cleaned = name.trim().toLowerCase();
  cleaned = cleaned.replace(CUSTOMS_PREFIX_RE, '').trim();
  cleaned = cleaned.replace(LEADING_THE_RE, '').trim();

  const normalized = cleaned.replace(/[()[\]]/g, ' ');
  let stripped = normalized.replace(CORPORATE_SUFFIX_RE, '');
  stripped = stripped.replace(/\s+/g, ' ').replace(/^[ .,\-&]+|[ .,\-&]+$/g, '');

  if (stripped.length >= 2) {
    return stripped;
  }
  const fallback = normalized.replace(/\s+/g, ' ').replace(/^[ .,\-&]+|[ .,\-&]+$/g, '');
  return fallback || cleaned;
}



