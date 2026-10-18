export interface ApolloLead {
  organization_id: string;
  organization_name: string;
  domain: string;
  website_url?: string | null;
  phone: string;
  employee_count?: number | null;
  revenue_usd?: number | null;
  founded_year?: number | null;
  industry: string;
  specialties?: string | null;
  keywords?: string | null;
  technologies_raw?: string | null;
  job_functions_json?: string | null;
  linkedin_url?: string | null;
  hq_city?: string | null;
  hq_state?: string | null;
  hq_country?: string | null;
  hq_postal_code?: string | null;
}

export interface ApolloAudienceCounts {
  all: number;
  high_headcount: number;
  high_revenue: number;
  top_cargo_verticals: number;
  with_website_linkedin: number;
}

export type ApolloAudienceTab =
  | 'all'
  | 'high_headcount'
  | 'high_revenue'
  | 'top_cargo_verticals'
  | 'with_website_linkedin';

export interface ApolloFilterParams {
  q?: string;
  tab?: ApolloAudienceTab;
  industries?: string[];
  countries?: string[];
  states?: string[];
  employeeTiers?: string[];
  revenueRanges?: string[];
  hasWebsite?: boolean;
  hasLinkedin?: boolean;
  minEmployees?: number;
  maxEmployees?: number;
  minRevenue?: number;
  page?: number;
  limit?: number;
}

export interface ApolloResponse {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  items: ApolloLead[];
  audienceCounts: ApolloAudienceCounts;
  totalFormatted: string;
}

export interface ApolloCargoVertical {
  id: string;
  label: string;
  leadCount: number;
  cargoMode: string;
}

export const TOP_APOLLO_CARGO_VERTICALS: ApolloCargoVertical[] = [
  { id: 'construction', label: 'Construction', leadCount: 91910, cargoMode: 'Ocean / Breakbulk' },
  { id: 'automotive', label: 'Automotive & Parts', leadCount: 40036, cargoMode: 'Air AOG / Ocean FCL' },
  { id: 'retail', label: 'Retail & Consumer Goods', leadCount: 35925, cargoMode: 'Ocean FCL / Air' },
  { id: 'environmental services & clean energy', label: 'Clean Energy & Solar', leadCount: 33105, cargoMode: 'Project Cargo' },
  { id: 'food & beverages', label: 'Food & Beverages', leadCount: 28392, cargoMode: 'Reefer Ocean / Air' },
  { id: 'mechanical or industrial engineering', label: 'Industrial Machinery', leadCount: 26361, cargoMode: 'Ocean Flat Rack' },
  { id: 'telecommunications', label: 'Telecommunications', leadCount: 24290, cargoMode: 'Secure Air Freight' },
  { id: 'electrical/electronic manufacturing', label: 'Electronics & Components', leadCount: 23541, cargoMode: 'Air Freight' },
  { id: 'oil & energy', label: 'Oil & Energy', leadCount: 22660, cargoMode: 'Dangerous Goods (DG)' },
  { id: 'events services', label: 'Events & Exhibitions', leadCount: 22030, cargoMode: 'ATA Carnet / Air' },
  { id: 'machinery', label: 'Machinery & Tools', leadCount: 20410, cargoMode: 'Ocean Open Top' },
  { id: 'consumer goods', label: 'Consumer Goods', leadCount: 19305, cargoMode: 'Ocean FCL / LCL' },
  { id: 'building materials', label: 'Building Materials', leadCount: 18333, cargoMode: 'Heavy Ocean FCL' },
  { id: 'furniture', label: 'Furniture & Fixtures', leadCount: 17998, cargoMode: 'High-Cube FCL' },
  { id: 'wholesale', label: 'Wholesale & Distribution', leadCount: 16846, cargoMode: 'Multi-Modal Forwarding' },
  { id: 'apparel & fashion', label: 'Apparel & Fashion', leadCount: 16569, cargoMode: 'Air GOH / Ocean' },
  { id: 'food production', label: 'Food Production', leadCount: 13837, cargoMode: 'Cold-Chain Reefer' },
  { id: 'chemicals', label: 'Chemicals & Resins', leadCount: 13745, cargoMode: 'Class 3/8/9 DG' },
  { id: 'medical devices', label: 'Medical Devices', leadCount: 11544, cargoMode: 'Temp-Controlled Air' },
  { id: 'pharmaceuticals', label: 'Pharmaceuticals & APIs', leadCount: 10724, cargoMode: 'GDP Validated Air' },
  { id: 'industrial automation', label: 'Industrial Automation', leadCount: 10314, cargoMode: 'High-Tech Air / Ocean' },
  { id: 'cosmetics', label: 'Cosmetics & Beauty', leadCount: 9890, cargoMode: 'Air Cargo / DG Class 3' },
  { id: 'import & export', label: 'Import & Export Houses', leadCount: 8995, cargoMode: 'Customs Clearance CHA' },
  { id: 'consumer electronics', label: 'Consumer Electronics', leadCount: 8767, cargoMode: 'High-Value Air Cargo' },
  { id: 'aviation & aerospace', label: 'Aviation & Aerospace', leadCount: 4772, cargoMode: 'Urgent AOG Spares' },
  { id: 'biotechnology', label: 'Biotechnology & Reagents', leadCount: 4204, cargoMode: 'Cryogenic Air Freight' },
  { id: 'semiconductors', label: 'Semiconductors', leadCount: 1489, cargoMode: 'Shock-Monitored Air' },
];

export interface ApolloEmployeeTier {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const APOLLO_EMPLOYEE_TIERS: ApolloEmployeeTier[] = [
  { id: '1-10', label: '1 - 10 employees', min: 1, max: 10 },
  { id: '11-50', label: '11 - 50 employees', min: 11, max: 50 },
  { id: '51-200', label: '51 - 200 employees (Sweet Spot)', min: 51, max: 200 },
  { id: '201-500', label: '201 - 500 employees', min: 201, max: 500 },
  { id: '501-1000', label: '501 - 1,000 employees', min: 501, max: 1000 },
  { id: '1000+', label: '1,000+ Enterprise', min: 1001 },
];

export interface ApolloRevenueRange {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const APOLLO_REVENUE_RANGES: ApolloRevenueRange[] = [
  { id: 'under-1m', label: 'Under $1 Million', max: 1000000 },
  { id: '1m-10m', label: '$1M - $10 Million', min: 1000000, max: 10000000 },
  { id: '10m-50m', label: '$10M - $50 Million', min: 10000000, max: 50000000 },
  { id: '50m-250m', label: '$50M - $250 Million', min: 50000000, max: 250000000 },
  { id: '250m+', label: '$250M+ Enterprise', min: 250000000 },
];

export interface ApolloCountryOption {
  code: string;
  name: string;
  flag: string;
}

export const APOLLO_TOP_COUNTRIES: ApolloCountryOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
];

/**
 * Safely sanitizes external URLs to prevent javascript: or data: pseudo-protocols.
 */
export function toSafeExternalUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

