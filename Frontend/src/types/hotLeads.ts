/**
 * Hot Leads / Tax Invoice Cross-Reference Intelligence Types
 * Source: Phase2/Client_Tax_Invoice_Data.xlsx (Database Cross-Reference Audit)
 */

export type HotLeadCrmStatus =
  | 'Prospect (Not in JFLL)'
  | 'Active Customer'
  | 'Not Active Customer'
  | 'Fresh Data'
  | 'JFLL Active'
  | 'JFLL Inactive';

export type HotLeadCategory = 'all' | 'active' | 'inactive' | 'fresh';
export type HotLeadContactFilter = 'all' | 'with-contacts' | 'without-contacts';
export type HotLeadRegionId = 'all' | 'delhi' | 'mumbai' | 'gujarat' | 'south' | 'east';

export interface HotLeadRegionMeta {
  id: HotLeadRegionId;
  name: string;
  shortName: string;
  code: string;
  coverage: string;
  status: 'live' | 'upcoming';
  badge: string;
  totalAccounts: number;
  totalTurnover: number;
  description: string;
  gateways: string[];
  upcomingQuarter?: string;
}

export type HotLeadSegment =
  | 'all'
  | 'active'
  | 'active-with-contacts'
  | 'active-without-contacts'
  | 'inactive'
  | 'inactive-with-contacts'
  | 'inactive-without-contacts'
  | 'fresh'
  | 'fresh-with-contacts'
  | 'fresh-without-contacts'
  | 'with-contacts'
  | 'without-contacts'
  // Legacy aliases for backward compatibility
  | 'prospects'
  | 'reactivations'
  | 'with-decision-makers';

export interface HotLead {
  srNo: number;
  gstin: string;
  customerName: string;
  taxableTurnover: number;
  crmStatus: HotLeadCrmStatus | string;
  salesRep: string;
  contactPerson: string;
  phone: string;
  email: string;
  datamyneTradeActivity: string;
  apolloMatchedEntity: string;
  apolloDomain: string;
  apolloEmployees: string;
  apolloDecisionMaker: string;
  decisionMakerTitle: string;
  decisionMakerEmail: string;
  emailStatus: string;
  linkedinProfile: string;
  region?: string;
  regionId?: HotLeadRegionId;
  isCustomContact?: boolean;
  contactUpdatedAt?: string;
  contactUpdatedBy?: string;
  notes?: string;
}

export interface HotLeadContactUpdatePayload {
  phone?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface HotLeadContactUpdateResponse {
  success: boolean;
  srNo: number;
  phone: string | null;
  contactPerson: string | null;
  email: string | null;
  notes: string | null;
  updatedAt: string;
  updatedBy: string | null;
  message: string;
}

export interface HotLeadsMetrics {
  totalTurnover: number;
  totalCount: number;
  // New taxonomy labels
  activeCount: number;
  activeWithContactsCount: number;
  activeWithoutContactsCount: number;
  inactiveCount: number;
  inactiveWithContactsCount: number;
  inactiveWithoutContactsCount: number;
  freshCount: number;
  freshWithContactsCount: number;
  freshWithoutContactsCount: number;
  withContactsCount: number;
  withoutContactsCount: number;
  // Backward compatibility aliases
  prospectsCount: number;
  reactivationsCount: number;
  decisionMakersCount: number;
  // Multi-region breakdown
  region?: HotLeadRegionId | string;
  regionBreakdown?: Partial<Record<HotLeadRegionId, { count: number; turnover: number }>>;
}

export interface HotLeadsFilterParams {
  q?: string;
  region?: HotLeadRegionId;
  segment?: HotLeadSegment;
  category?: HotLeadCategory;
  contactFilter?: HotLeadContactFilter;
  sortBy?: 'turnover' | 'name' | 'status' | 'region';
  sortOrder?: 'asc' | 'desc';
}

export interface HotLeadsResponse {
  items: HotLead[];
  totalRecords: number;
  metrics: HotLeadsMetrics;
}
