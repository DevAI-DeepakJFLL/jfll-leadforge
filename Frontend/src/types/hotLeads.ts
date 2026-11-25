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
}

export interface HotLeadsFilterParams {
  q?: string;
  segment?: HotLeadSegment;
  category?: HotLeadCategory;
  contactFilter?: HotLeadContactFilter;
  sortBy?: 'turnover' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface HotLeadsResponse {
  items: HotLead[];
  totalRecords: number;
  metrics: HotLeadsMetrics;
}
