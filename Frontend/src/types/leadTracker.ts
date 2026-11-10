/**
 * Phase 2 Lead Status Tracker TypeScript Types and Domain Enums.
 * Aligns with freight forwarding operational concepts: Transport Mode, Routing Control,
 * Rate Negotiation, and Follow-up Cadence.
 */

export type TrackerStatus =
  | 'Assigned'
  | 'Contacted'
  | 'Meeting Scheduled'
  | 'Quoted'
  | 'Feedback Received'
  | 'Trial Shipment'
  | 'Won'
  | 'On Hold'
  | 'Closed / Lost';

export const ALL_TRACKER_STATUSES: TrackerStatus[] = [
  'Assigned',
  'Contacted',
  'Meeting Scheduled',
  'Quoted',
  'Feedback Received',
  'Trial Shipment',
  'Won',
  'On Hold',
  'Closed / Lost',
];

export const CLOSED_TRACKER_STATUSES: readonly TrackerStatus[] = [
  'Won',
  'Closed / Lost',
];

export const ACTIVE_TRACKER_STATUSES: readonly TrackerStatus[] = [
  'Assigned',
  'Contacted',
  'Meeting Scheduled',
  'Quoted',
  'Feedback Received',
  'Trial Shipment',
  'On Hold',
];

export type TransportMode =
  | 'Air Freight'
  | 'Ocean FCL'
  | 'Ocean LCL'
  | 'Courier / Express'
  | 'CHA Brokerage'
  | 'Multimodal';

export const ALL_TRANSPORT_MODES: TransportMode[] = [
  'Air Freight',
  'Ocean FCL',
  'Ocean LCL',
  'Courier / Express',
  'CHA Brokerage',
  'Multimodal',
];

export type RoutingType = 'Freehand' | 'Nominated' | 'Not Specified';

export const ALL_ROUTING_TYPES: RoutingType[] = [
  'Freehand',
  'Nominated',
  'Not Specified',
];

export type TrackerFollowupStatus = 'overdue' | 'due_today' | 'upcoming' | 'none';

export interface LeadTrackerLogEntry {
  id: string;
  timestamp: string;
  author_name: string;
  author_email: string;
  action: string;
  notes?: string | null;
}

export type LinkedEntityType = 'datamyne' | 'apollo' | 'jfll_customer' | 'custom';

export interface LeadTrackerItem {
  id: string; // trk_...
  company_name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  branch: string; // 'Mumbai' | 'Gujarat' | 'South India' | etc.
  assigned_to: string; // Rep name
  assigned_to_email: string | null;
  assigned_by: string; // e.g. 'Tyra Theknath' | 'Deepak Naidu'
  assigned_date: string; // YYYY-MM-DD
  status: TrackerStatus;
  transport_mode: TransportMode;
  routing_type: RoutingType;
  feedback_notes: string | null;
  next_followup_date: string | null; // YYYY-MM-DD
  next_action: string | null;
  linked_entity_type: LinkedEntityType;
  linked_entity_id: string | null;
  history: LeadTrackerLogEntry[];
  created_at: string;
  updated_at: string;
}

export interface LeadTrackerFilterParams {
  branch?: string;
  assigned_to?: string;
  status?: string;
  overdue_only?: boolean;
  search?: string;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface TrackerKPIs {
  total_leads: number;
  active_leads: number;
  quoted_leads: number;
  won_leads: number;
  overdue_leads: number;
}

export interface LeadTrackerCreatePayload {
  company_name: string;
  assigned_to: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  branch?: string;
  assigned_to_email?: string | null;
  assigned_by?: string;
  assigned_date?: string;
  status?: TrackerStatus;
  transport_mode?: TransportMode;
  routing_type?: RoutingType;
  feedback_notes?: string | null;
  next_followup_date?: string | null;
  next_action?: string | null;
  linked_entity_type?: LinkedEntityType;
  linked_entity_id?: string | null;
}

export interface LeadTrackerUpdatePayload {
  company_name?: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  branch?: string;
  assigned_to?: string;
  assigned_to_email?: string | null;
  assigned_by?: string;
  assigned_date?: string;
  status?: TrackerStatus;
  transport_mode?: TransportMode;
  routing_type?: RoutingType;
  feedback_notes?: string | null;
  next_followup_date?: string | null;
  next_action?: string | null;
  linked_entity_type?: LinkedEntityType;
  linked_entity_id?: string | null;
}

export interface TrackerActivityCreatePayload {
  action: string;
  notes?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  status?: TrackerStatus | null;
  next_followup_date?: string | null;
}
