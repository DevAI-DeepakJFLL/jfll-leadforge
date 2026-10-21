/**
 * Jet Freight Logistics - Contact Number Parser & Normalizer
 * 
 * Accurately classifies Indian phone numbers into Mobile Numbers (+91)
 * vs Landline/Telephone Numbers (with STD codes, defaulting to 022 for Mumbai/General).
 */

export type ContactType = 'mobile' | 'landline';

export interface FormattedContactNumber {
  type: ContactType;
  label: string; // 'Mobile Number' | 'Landline / Telephone Number'
  display: string; // e.g. '+91 98662 25483' or '022-56657391'
  dialValue: string; // e.g. '+919866225483' or '02256657391'
  prefix: string; // '+91' or '022' / STD code
  raw: string; // original segment
}

// Major Indian City STD Codes
const CITY_STD_CODES: Record<string, string> = {
  MUMBAI: '022',
  BOMBAY: '022',
  'NAVI MUMBAI': '022',
  THANE: '022',
  KHAR: '022',
  BANDRA: '022',
  ANDHERI: '022',
  WORLI: '022',
  FORT: '022',
  DELHI: '011',
  'NEW DELHI': '011',
  GURGAON: '0124',
  GURUGRAM: '0124',
  NOIDA: '0120',
  FARIDABAD: '0129',
  PUNE: '020',
  BENGALURU: '080',
  BANGALORE: '080',
  HYDERABAD: '040',
  SECUNDERABAD: '040',
  CHENNAI: '044',
  MADRAS: '044',
  KOLKATA: '033',
  CALCUTTA: '033',
  AHMEDABAD: '079',
  VADODARA: '0265',
  BARODA: '0265',
  SURAT: '0261',
  VAPI: '0260',
  JAIPUR: '0141',
  LUCKNOW: '0522',
  KANPUR: '0512',
  NAGPUR: '0712',
  INDORE: '0731',
  COIMBATORE: '0422',
  KOCHI: '0484',
  COCHIN: '0484',
  ERNAKULAM: '0484',
  CHANDIGARH: '0172',
  AURANGABAD: '0240',
  NASHIK: '0253',
  VISAKHAPATNAM: '0891',
  VIZAG: '0891',
  BHOPAL: '0755',
  LUDHIANA: '0161',
  AMRITSAR: '0183',
  RAJKOT: '0281',
};

// Recognized standard 3-digit STD codes (starts with 0)
const MAJOR_3DIGIT_STD = new Set(['022', '020', '011', '040', '080', '044', '033', '079']);

/**
 * Returns the relevant STD code for a given city name, defaulting to '022'
 */
export function getStdCodeForCity(city?: string): string {
  if (!city || !city.trim()) return '022';
  const upper = city.toUpperCase();
  for (const [key, code] of Object.entries(CITY_STD_CODES)) {
    if (upper.includes(key)) {
      return code;
    }
  }
  return '022'; // Default to 022 (Mumbai / general hub) as per specification
}

/**
 * Parses, categorizes and normalizes contact numbers from raw manifest/directory strings.
 * Supports multiple numbers delimited by '/', ',', ';', or ' - '.
 * 
 * @param rawPhone Raw phone string (e.g. "56657391 / 66657391", "9866225483", "040-66281368")
 * @param city City of the business entity (used to derive STD prefix for landlines)
 * @returns Array of FormattedContactNumber objects with labels and prefixes
 */
export function parseAndFormatContactNumbers(
  rawPhone?: string | null,
  city?: string
): FormattedContactNumber[] {
  if (!rawPhone || !rawPhone.trim()) {
    return [];
  }

  const defaultStd = getStdCodeForCity(city);
  // Split on multiple number delimiters: / , ; or multi-space hyphens
  const segments = rawPhone.split(/[/,;]|\s+-\s+/);
  const results: FormattedContactNumber[] = [];
  let contextStd = defaultStd;

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // Remove all non-digits
    let digits = trimmed.replace(/\D/g, '');
    if (!digits || digits.length < 5) continue;

    // 0. International / Direct E.164 Number Check (e.g. Brazil +55)
    if (trimmed.startsWith('+')) {
      const isBrazil = trimmed.startsWith('+55');
      results.push({
        type: 'landline',
        label: isBrazil ? 'Brazil Line' : 'International Line',
        display: trimmed,
        dialValue: trimmed.replace(/[^\d+]/g, ''),
        prefix: isBrazil ? '+55' : trimmed.slice(0, 4).trim(),
        raw: trimmed,
      });
      continue;
    }

    // 1. Mobile Number Check:
    // In India, mobile numbers are 10 digits starting with 6, 7, 8, or 9
    let isMobile = false;
    let mobileCore = '';

    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      isMobile = true;
      mobileCore = digits;
    } else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
      isMobile = true;
      mobileCore = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
      isMobile = true;
      mobileCore = digits.slice(1);
    }

    if (isMobile) {
      const display = `+91 ${mobileCore.slice(0, 5)} ${mobileCore.slice(5)}`;
      const dialValue = `+91${mobileCore}`;
      results.push({
        type: 'mobile',
        label: 'Mobile Number',
        display,
        dialValue,
        prefix: '+91',
        raw: trimmed,
      });
      continue;
    }

    // 2. Landline / Telephone Number:
    // If starts with '91' and length > 10, strip 91 and treat as STD
    if (digits.startsWith('91') && digits.length > 10) {
      digits = '0' + digits.slice(2);
    }

    let stdCode = contextStd;
    let localDigits = digits;

    if (digits.startsWith('0')) {
      // Already has STD code
      const candidate3 = digits.slice(0, 3);
      if (MAJOR_3DIGIT_STD.has(candidate3) && digits.length >= 8) {
        stdCode = candidate3;
        localDigits = digits.slice(3);
      } else if (digits.length >= 9) {
        // Standard 4-digit STD code (e.g. 0124, 0260, 0141, etc.)
        stdCode = digits.slice(0, 4);
        localDigits = digits.slice(4);
      } else {
        stdCode = digits.slice(0, 3);
        localDigits = digits.slice(3);
      }
      contextStd = stdCode; // Keep for subsequent sibling numbers in the same string
    } else {
      // Local number without STD prefix (e.g. 6 to 8 digits)
      stdCode = contextStd;
      localDigits = digits;
    }

    // Clean display format: e.g. "022-56657391" or "040-66281368"
    const display = `${stdCode}-${localDigits}`;
    const dialValue = `${stdCode}${localDigits}`;

    results.push({
      type: 'landline',
      label: 'Landline / Telephone Number',
      display,
      dialValue,
      prefix: stdCode,
      raw: trimmed,
    });
  }

  return results;
}
