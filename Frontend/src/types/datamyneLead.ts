import { z } from 'zod';

export const DatamyneLeadSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  country: z.string().default('India'),
  role: z.string(), // "Exporter" | "Importer" | "Both"
  transport_mode: z.enum(['Air', 'Ocean', 'Air & Ocean']).default('Air'),
  category: z.string(), // "Perishables" | "Pharma & Healthcare" | "Textiles & Apparel" | ...
  subcategory: z.string(), // e.g. "Fresh Produce", "Fabrics & Technical Textiles"
  contact_type: z.string(), // "Both Phone & Email" | "Phone only" | "Email only" | "Missing Phone & Email"
  phone: z.string().default(''),
  email: z.string().default(''),
  tax_id: z.string().default(''),
  city: z.string().default(''),
  address: z.string().default(''),
  pin_code: z.string().default(''),
  directors: z.string().default(''),
  trade_lanes: z.string().default(''),
  top_hs_codes: z.string().default(''),
  total_shipments: z.number().default(0),
  total_value_usd: z.number().default(0),
  latest_activity_date: z.string().default(''),
  dataset_type: z.enum(['valid', 'missing']).default('valid'),
  saved: z.boolean().optional(),
});

export type DatamyneLead = Omit<z.infer<typeof DatamyneLeadSchema>, 'country'> & {
  country?: string;
};

export type TransportMode = 'Air' | 'Ocean' | 'Air & Ocean';

export type DatamyneDatasetType = 'valid' | 'missing' | 'all';

export type DatamyneAudienceTab =
  | 'all'
  | 'perishables'
  | 'pharma'
  | 'textiles'
  | 'engineering'
  | 'chemicals'
  | 'electronics'
  | 'automotive'
  | 'general';

export const TAB_TO_CATEGORY_MAP: Record<DatamyneAudienceTab, string | null> = {
  all: null,
  perishables: 'Perishables',
  pharma: 'Pharma & Healthcare',
  textiles: 'Textiles & Apparel',
  engineering: 'Engineering & Machinery',
  chemicals: 'Chemicals & Materials',
  electronics: 'Electronics & Electrical',
  automotive: 'Automotive & EV',
  general: 'General Cargo',
};

export const CATEGORY_TO_TAB_MAP: Record<string, DatamyneAudienceTab> = {
  'Perishables': 'perishables',
  'Pharma & Healthcare': 'pharma',
  'Textiles & Apparel': 'textiles',
  'Engineering & Machinery': 'engineering',
  'Chemicals & Materials': 'chemicals',
  'Electronics & Electrical': 'electronics',
  'Automotive & EV': 'automotive',
  'General Cargo': 'general',
};

export interface DatamyneFilterParams {
  q?: string;
  dataset?: DatamyneDatasetType;
  tab?: DatamyneAudienceTab;
  countries?: string[];
  transportModes?: TransportMode[];
  categories?: string[];
  subcategories?: string[];
  roles?: string[];
  cities?: string[];
  tradeLanes?: string[];
  contactStatus?: string[]; // "both" | "phone_only" | "email_only" | "missing"
  approachStatuses?: string[];
  minShipments?: number;
  minTradedValueUsd?: number;
  hasDirectors?: boolean;
  page?: number;
  limit?: number;
}

export interface DatamyneAudienceCounts {
  all: number;
  perishables: number;
  pharma: number;
  textiles: number;
  engineering: number;
  chemicals: number;
  electronics: number;
  automotive: number;
  general: number;
  validTotal: number;
  missingTotal: number;
}

export interface DatamyneResponse {
  items: DatamyneLead[];
  totalEstimate: number;
  totalFormatted: string;
  page: number;
  limit: number;
  totalPages: number;
  audienceCounts: DatamyneAudienceCounts;
  datasetCounts: {
    valid: number;
    missing: number;
    all: number;
  };
}

export const INDIA_CITIES = [
  'MUMBAI',
  'NEW DELHI',
  'BENGALURU',
  'CHENNAI',
  'PUNE',
  'AHMEDABAD',
  'KOLKATA',
  'HYDERABAD',
  'SURAT',
  'JAIPUR',
] as const;

export const BRAZIL_CITIES = [
  'SÃO PAULO',
  'GUARULHOS',
  'RIO DE JANEIRO',
  'CURITIBA',
  'SOROCABA',
  'SUMARÉ',
  'SANTOS',
] as const;

export const INDIA_CORRIDORS = [
  { id: 'PER/AIR', label: 'PER/AIR (Perishables Air)' },
  { id: 'GCR/Air', label: 'GCR/Air (General Cargo Air)' },
  { id: 'EX-China_INDIA', label: 'EX-China_INDIA (China Imports)' },
] as const;

export const BRAZIL_CORRIDORS = [
  { id: 'India-Brazil/Air', label: 'India-Brazil (Air Export)' },
  { id: 'Brazil-India/Air', label: 'Brazil-India (Air Import)' },
  { id: 'Brazil-India/Ocean', label: 'Brazil-India (Ocean Import)' },
] as const;

