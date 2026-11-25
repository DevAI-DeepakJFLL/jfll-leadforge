/**
 * Hot Leads / Tax Invoice Cross-Reference Intelligence Types
 * Source: Phase2/Client_Tax_Invoice_Data.xlsx (Database Cross-Reference Audit)
 */

export type HotLeadCrmStatus = 'Prospect (Not in JFLL)' | 'Active Customer' | 'Not Active Customer';

export type HotLeadSegment = 'all' | 'prospects' | 'reactivations' | 'active' | 'with-decision-makers';

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
  prospectsCount: number;
  reactivationsCount: number;
  activeCount: number;
  decisionMakersCount: number;
}

export interface HotLeadsFilterParams {
  q?: string;
  segment?: HotLeadSegment;
  sortBy?: 'turnover' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface HotLeadsResponse {
  items: HotLead[];
  totalRecords: number;
  metrics: HotLeadsMetrics;
}
