export type SalesAction =
  | 'Called customer'
  | 'Left voicemail'
  | 'Sent email'
  | 'Sent WhatsApp'
  | 'Sent report'
  | 'Sent quote'
  | 'Held meeting'
  | 'Follow-up scheduled'
  | 'Internal work (no customer contact)'
  | 'Other';

export const ALL_SALES_ACTIONS: SalesAction[] = [
  'Called customer',
  'Left voicemail',
  'Sent email',
  'Sent WhatsApp',
  'Sent report',
  'Sent quote',
  'Held meeting',
  'Follow-up scheduled',
  'Internal work (no customer contact)',
  'Other',
];

export type SalesStatus =
  | 'Not Contacted'
  | 'Contacted'
  | 'Report Sent'
  | 'Working on It'
  | 'In Progress'
  | 'On Hold'
  | 'No Response'
  | 'Not Interested'
  | 'Converted to Active';

export const ALL_SALES_STATUSES: SalesStatus[] = [
  'Not Contacted',
  'Contacted',
  'Report Sent',
  'Working on It',
  'In Progress',
  'On Hold',
  'No Response',
  'Not Interested',
  'Converted to Active',
];

/**
 * Standard selectable statuses for the approach log dropdown.
 * Excludes 'Converted to Active' as it must be triggered via the dedicated button.
 */
export const STANDARD_SELECTABLE_STATUSES: SalesStatus[] = [
  'Not Contacted',
  'Contacted',
  'Report Sent',
  'Working on It',
  'In Progress',
  'On Hold',
  'No Response',
  'Not Interested',
];

export const FUNNEL_RANKS: Record<SalesStatus, number> = {
  'Not Contacted': 0,
  'Contacted': 1,
  'Report Sent': 2,
  'Working on It': 3,
  'In Progress': 4,
  'On Hold': 5,
  'No Response': 6,
  'Not Interested': 7,
  'Converted to Active': 8,
};

export const MANDATORY_NOTE_STATUSES = new Set<SalesStatus>([
  'On Hold',
  'No Response',
  'Not Interested',
]);

export interface ApproachLogEntry {
  id: string;
  action: SalesAction;
  previous_status: SalesStatus;
  status: SalesStatus;
  note?: string | null;
  salesperson_name: string;
  salesperson_email: string;
  created_at: string;
}

export interface EntityApproachHistory {
  entity_type: 'datamyne' | 'jfll_customer';
  entity_id: string;
  current_status: SalesStatus;
  is_active_converted: boolean;
  converted_at?: string | null;
  conversion_start_date?: string | null;
  logs: ApproachLogEntry[];
}

export interface ApproachLogCreatePayload {
  action: SalesAction;
  status: SalesStatus;
  note?: string | null;
}

export interface ConvertToActivePayload {
  start_date: string; // YYYY-MM-DD
  note?: string | null;
}

export interface BulkStatusesResponse {
  entity_type: 'datamyne' | 'jfll_customer';
  total_tracked: number;
  statuses: Record<string, SalesStatus>;
}
