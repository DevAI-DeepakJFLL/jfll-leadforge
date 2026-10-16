import { z } from 'zod';

export const DatamyneLeadSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  role: z.string(), // "Exporter" | "Importer" | "Both"
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

export type DatamyneLead = z.infer<typeof DatamyneLeadSchema>;

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

export interface DatamyneFilterParams {
  q?: string;
  dataset?: DatamyneDatasetType;
  tab?: DatamyneAudienceTab;
  categories?: string[];
  subcategories?: string[];
  roles?: string[];
  cities?: string[];
  tradeLanes?: string[];
  contactStatus?: string[]; // "both" | "phone_only" | "email_only" | "missing"
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
