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

export interface JfllCustomerFilterParams {
  q?: string;
  customerStatus?: 'active' | 'inactive' | 'all';
  customerGroups?: string[];
  types?: string[];
  creditStatuses?: string[];
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasContactPerson?: boolean;
  tab?: JfllCustomerTabType;
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
