import { z } from 'zod';

export const LeadStatusSchema = z.enum(['NET NEW', 'COLD', 'IN SEQUENCE']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const AudienceTabSchema = z.enum(['all', 'new', 'saved']);
export type AudienceTab = z.infer<typeof AudienceTabSchema>;

export const LeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  company: z.string(),
  companyLogo: z.string().default(''),
  logoBgColor: z.string().optional(),
  logoTextColor: z.string().optional(),
  logoInitials: z.string().optional(),
  industry: z.string(),
  department: z.string().optional(),
  status: LeadStatusSchema,
  location: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  email: z.string(),
  phone: z.string(),
  workPhone: z.string().optional(),
  linkedin: z.string().optional(),
  employees: z.string(),
  revenue: z.string(),
  funding: z.string(),
  technologies: z.array(z.string()).optional(),
  saved: z.boolean().default(false),
  jobChange: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type Lead = z.infer<typeof LeadSchema>;

export const FilterParamsSchema = z.object({
  q: z.string().optional(),
  jobTitles: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  status: z.array(LeadStatusSchema).optional(),
  companySize: z.array(z.string()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  tab: AudienceTabSchema.default('all'),
});

export type FilterParams = z.infer<typeof FilterParamsSchema>;

export const AudienceCountsSchema = z.object({
  all: z.number(),
  new: z.number(),
  saved: z.number(),
});

export type AudienceCounts = z.infer<typeof AudienceCountsSchema>;

export const LeadsResponseSchema = z.object({
  items: z.array(LeadSchema),
  totalEstimate: z.number(),
  totalFormatted: z.string(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  audienceCounts: AudienceCountsSchema,
});

export type LeadsResponse = z.infer<typeof LeadsResponseSchema>;

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterOptionsResponse {
  jobTitles: FilterOption[];
  departments: FilterOption[];
  locations: FilterOption[];
  industries: FilterOption[];
  status: FilterOption[];
  companySize: FilterOption[];
}

export interface ExportRequest {
  leadIds?: string[];
  filters?: Partial<FilterParams>;
  format?: 'csv' | 'json';
}
