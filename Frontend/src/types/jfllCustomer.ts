import { z } from 'zod';

export const JfllCustomerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  territory: z.string().default('All Territories'),
  contactPersonName: z.string().nullable().default(null),
  mobileNumber: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  status: z.enum(['Active', 'Not Active']).default('Active'),
  customerGroup: z.string(),
  type: z.string(),
  saved: z.boolean().default(false),
  inDataMyne: z.boolean().optional(),
  creditStatus: z.string().optional(),
  salesPerson: z.string().nullable().optional(),
  businessLast3m: z.number().optional(),
});

export type JfllCustomer = z.infer<typeof JfllCustomerSchema>;

export type JfllCustomerTabType =
  | 'all'
  | 'shippers'
  | 'subagents'
  | 'overseas'
  | 'with-contacts'
  | 'datamyne-leads'
  | 'archive';

export type JfllCustomerSortField =
  | 'fullName'
  | 'customerGroup'
  | 'status'
  | 'creditStatus'
  | 'businessLast3m'
  | 'contactPersonName';

export interface JfllCustomerFilterParams {
  q?: string;
  customerStatus?: 'active' | 'inactive' | 'all';
  customerGroups?: string[];
  types?: string[];
  creditStatuses?: string[];
  salesPersons?: string[];
  revenueRanges?: string[];
  approachStatuses?: string[];
  minRevenue?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasContactPerson?: boolean;
  tab?: JfllCustomerTabType;
  sortBy?: JfllCustomerSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface JfllAudienceCounts {
  all: number;
  shippers: number;
  subagents: number;
  overseas: number;
  withContacts: number;
  datamyneLeads?: number;
  archive?: number;
  activeTotal?: number;
  inactiveTotal?: number;
  allTotal?: number;
}

export type JfllCustomerAudienceCounts = JfllAudienceCounts;

export interface JfllCustomersResponse {
  items: JfllCustomer[];
  totalEstimate: number;
  totalFormatted: string;
  page: number;
  limit: number;
  totalPages: number;
  audienceCounts: JfllAudienceCounts;
}

export interface JfllRevenueRange {
  id: string;
  label: string;
  sublabel?: string;
  min?: number;
  max?: number;
}

export const JFLL_REVENUE_RANGES: JfllRevenueRange[] = [
  { id: '1cr_plus', label: '₹1 Crore+', sublabel: 'Enterprise (₹10M+)', min: 10000000 },
  { id: '25l_1cr', label: '₹25L - ₹1 Cr', sublabel: 'Key Accounts (₹2.5M - ₹10M)', min: 2500000, max: 10000000 },
  { id: '5l_25l', label: '₹5L - ₹25L', sublabel: 'Mid-Market (₹500k - ₹2.5M)', min: 500000, max: 2500000 },
  { id: '1l_5l', label: '₹1L - ₹5L', sublabel: 'Growth (₹100k - ₹500k)', min: 100000, max: 500000 },
  { id: 'under_1l', label: 'Under ₹1 Lakh', sublabel: 'Starter (< ₹100k)', max: 100000 },
];
