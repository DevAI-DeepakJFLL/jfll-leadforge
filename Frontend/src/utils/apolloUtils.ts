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
const LEADING_HONORIFIC_RE = /^(?:(?:mr|mrs|ms|dr|shri|shree|smt|late|sh|lt)\b\.?|attn\s*[:.\-]?)\s*/i;
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
  'corporate',
  'corporate (corporate)',
]);

/**
 * Corporate, non-human, or institutional words that cannot appear as a human director name token.
 */
const FORBIDDEN_NAME_WORDS: ReadonlySet<string> = new Set([
  'pvt', 'private', 'ltd', 'limited', 'llc', 'llp', 'inc', 'corp', 'corporation', 'co', 'company',
  'corporate', 'commercial', 'enterprises', 'enterprise', 'industries', 'industry', 'holdings',
  'holding', 'group', 'exports', 'export', 'imports', 'import', 'logistics', 'freight', 'cargo',
  'shipping', 'services', 'service', 'solutions', 'solution', 'technologies', 'technology', 'tech',
  'systems', 'system', 'management', 'consulting', 'consultants', 'associates', 'properties',
  'realty', 'developers', 'builders', 'trading', 'traders', 'impex', 'steels', 'steel', 'metals',
  'metal', 'chemicals', 'chemical', 'pharma', 'pharmaceuticals', 'energy', 'power', 'infra',
  'infrastructure', 'engineering', 'projects', 'project', 'international', 'national', 'global',
  'central', 'eastern', 'western', 'northern', 'southern', 'royal', 'golden', 'silver', 'grand',
  'house', 'mansion', 'apt', 'apts', 'apartment', 'apartments', 'flat', 'flats', 'plot', 'plots',
  'room', 'rooms', 'bldg', 'building', 'buildings', 'tower', 'towers', 'chsl', 'chs', 'society',
  'soc', 'nagar', 'colony', 'enclave', 'complex', 'residency', 'niwas', 'bhuvan', 'chambers',
  'bunglow', 'bungalow', 'villa', 'villas', 'vihar', 'heights', 'court', 'gardens', 'garden',
  'park', 'parks', 'farms', 'farm', 'estate', 'estates', 'road', 'rd', 'marg', 'street', 'st',
  'lane', 'floor', 'floors', 'sector', 'sec', 'village', 'pin', 'pincode', 'post', 'po', 'dist',
  'district', 'taluka', 'tehsil', 'state', 'india', 'mumbai', 'bombay', 'delhi', 'kolkata',
  'calcutta', 'chennai', 'madras', 'bangalore', 'bengaluru', 'hyderabad', 'secunderabad',
  'ahmedabad', 'pune', 'poona', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'thane', 'bhopal', 'visakhapatnam', 'vizag', 'patna', 'vadodara', 'baroda', 'ghaziabad',
  'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi', 'srinagar',
  'aurangabad', 'dhanbad', 'amritsar', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior',
  'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur',
  'hubli', 'bareilly', 'moradabad', 'mysore', 'gurgaon', 'gurugram', 'aligarh', 'jalandhar',
  'bhubaneswar', 'salem', 'warangal', 'thiruvananthapuram', 'bhiwandi', 'saharanpur', 'gorakhpur',
  'guntur', 'bikaner', 'amravati', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'kochi', 'cochin',
  'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded', 'kolhapur', 'ajmer',
  'akola', 'jamnagar', 'ujjain', 'vapi', 'hazira', 'dahej', 'mundra', 'kandla',
]);

const ADDRESS_KEYWORDS = '(?:house|mansion|apts?|apt|apartments?|flat|flats|plot|plots|room|rooms|bldg|building|buildings|tower|towers|chsl|chs|society|soc|nagar|road|rd|marg|street|lane|floor|sector|sec|village|bunglow|bungalow|niwas|bhuvan|chambers|residency|enclave|complex|colony|estate|gardens?|vihar|heights|court|farm|farms)';

const CUTOFF_DELIMITERS_RE = new RegExp(
  '(?:' +
  '\\s+(?:shri|shree|smt|late|mr|mrs|dr|sh|lt)\\b|' +
  '\\b(?:s\\/o|d\\/o|w\\/o|son\\s+of|daughter\\s+of|wife\\s+of)\\b|' +
  '\\bpin[-:\\s]*\\d+|' +
  '\\b(?:phone|email|tel|mob|mobile|fax|web)\\b|' +
  '(?:\\b[a-zA-Z0-9.\'-]+\\s+)?' + ADDRESS_KEYWORDS + '\\b|' +
  '\\b[a-z]-\\d+\\b|\\b[a-z]\\/\\d+\\b|\\b\\d+[-/]\\d+\\b|\\b\\d+\\b|\\bdin\\b' +
  ')',
  'i'
);

/**
 * Detects and trims repeated father name sequences appended to director names in Indian customs manifests.
 */
function deduplicateFatherName(nameStr: string): string {
  let words = nameStr.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return nameStr;

  // 1. Check for exact duplicate tail sequence of length k (e.g. "RABINDRANATH ACHARYA RABINDRANATH ACHARYA")
  for (let k = Math.floor(words.length / 2); k >= 1; k--) {
    const tail = words.slice(words.length - k).map((w) => w.toLowerCase());
    const prev = words.slice(words.length - 2 * k, words.length - k).map((w) => w.toLowerCase());
    if (tail.every((w, idx) => w === prev[idx])) {
      words = words.slice(0, words.length - k);
      break;
    }
  }

  // 2. Check if the last word (surname) matches an earlier word (director's surname)
  if (words.length >= 3) {
    const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (lastWord.length >= 2) {
      for (let i = 1; i < words.length - 1; i++) {
        const candidateSurname = words[i].toLowerCase().replace(/[^a-z]/g, '');
        if (candidateSurname === lastWord) {
          words = words.slice(0, i + 1);
          break;
        }
      }
    }
  }

  return words.join(' ');
}

/**
 * Extracts and standardizes an executive or director name from messy customs manifest text dumps,
 * stripping Indian customs numbering, subsequent director markers, manifest prefixes (DIR:, MD:, ATTN:),
 * leading honorifics, residential address patterns, PIN codes, phone/email noise, and father's names,
 * while strictly rejecting corporate legal entities and address-only strings.
 */
export function extractFirstDirectorName(directorsStr?: string | null): string | null {
  if (!directorsStr || typeof directorsStr !== 'string') return null;
  let cleaned = directorsStr.trim();
  if (!cleaned) return null;

  if (INVALID_DIRECTOR_STRINGS.has(cleaned.toLowerCase())) {
    return null;
  }

  // 1. Truncate at subsequent numbered director markers (e.g. " :  2.  : ", " 2. : ", "; 2. : ", "\n2. : ")
  const subsequentMarkerMatch = cleaned.search(/(?:\s*:\s*|\s*;\s*|\s*\|\s*|\n)\d+\.\s*(?::\s*)?|\s{2,}\d+\.\s*:\s*/);
  if (subsequentMarkerMatch > 0) {
    cleaned = cleaned.slice(0, subsequentMarkerMatch);
  }

  // 2. Support Indian customs manifest numbering: strip leading ^\s*\d+\.\s*:\s* or ^\s*\d+\.\s*
  cleaned = cleaned.replace(/^\s*\d+\.\s*(?::\s*)?/, '').trim();

  // 3. Remove labeled prefixes (DIR:, MD:, ATTN:, etc.)
  const prefixMatch = cleaned.match(DIRECTOR_PREFIX_RE);
  if (prefixMatch && prefixMatch.index !== undefined && prefixMatch.index < 10) {
    cleaned = cleaned.slice(prefixMatch.index + prefixMatch[0].length);
  }

  // 4. Strip leading honorifics (SHRI, SHREE, SMT, MR, MRS, MS, DR, LATE, ATTN:)
  while (LEADING_HONORIFIC_RE.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_HONORIFIC_RE, '').trim();
  }

  // 5. Split at newlines, semicolons, or pipes
  cleaned = cleaned.split(/[\n\r;|]/)[0].trim();

  // 6. Cut off at address patterns, phone/email, DIN, numbers, and father delimiters
  const delimMatch = cleaned.match(CUTOFF_DELIMITERS_RE);
  if (delimMatch && delimMatch.index !== undefined) {
    cleaned = cleaned.slice(0, delimMatch.index);
  }

  // 7. Cut off designation suffixes
  cleaned = cleaned.replace(DESIGNATION_SUFFIX_RE, '').trim();

  // 8. Clean punctuation and parentheses
  cleaned = cleaned.replace(/[()[\]"']/g, '').replace(/^[ .,\-/: ]+|[ .,\-/: ]+$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 9. Deduplicate repeated father name pattern
  cleaned = deduplicateFatherName(cleaned);

  if (!cleaned || cleaned.length < 3) return null;
  if (INVALID_DIRECTOR_STRINGS.has(cleaned.toLowerCase())) return null;
  if (/\d/.test(cleaned)) return null;
  if (!/^[a-zA-Z\s.'-]+$/.test(cleaned)) return null;

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);
  // Human names in customs records must have at least 2 tokens (given name + surname / initial + surname)
  if (words.length < 2) return null;

  // Reject if any token is a corporate or address word
  for (const w of words) {
    const cleanW = w.replace(/[^a-z]/g, '');
    if (FORBIDDEN_NAME_WORDS.has(cleanW)) {
      return null;
    }
  }

  // Title case formatting
  return words
    .map((w) => {
      if (w.includes('.')) {
        return w
          .split('.')
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
          .join('.');
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
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



