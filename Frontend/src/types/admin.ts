export type FunctionalRole =
  | 'Leadership'
  | 'Tech Lead'
  | 'Commercial'
  | 'Operations'
  | 'Admin'
  | 'Sales Representative';

export type AllowlistStatus = 'active' | 'revoked';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AllowlistEntry {
  email: string;
  name: string;
  role: FunctionalRole | string;
  status: AllowlistStatus;
  added_at: string;
  added_by: string;
  updated_at?: string | null;
  updated_by?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
}

export interface AccessRequest {
  id: string;
  email: string;
  name: string;
  reason: string;
  status: AccessRequestStatus;
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
}

export interface AdminStats {
  pending_requests_count: number;
  active_allowlist_count: number;
  total_requests_count: number;
}

export interface CreateAccessRequestPayload {
  email: string;
  name?: string;
  reason: string;
}

export interface CreateAccessRequestResponse {
  success: boolean;
  message: string;
  already_authorized?: boolean;
  already_pending?: boolean;
  request?: AccessRequest;
}

export interface ApproveAccessRequestPayload {
  role: FunctionalRole | string;
  notes?: string;
}

export interface RejectAccessRequestPayload {
  notes?: string;
}

export interface CreateAllowlistEntryPayload {
  email: string;
  name: string;
  role: FunctionalRole | string;
}

export interface BlockedEntity {
  id: string;
  ip?: string;
  fingerprint?: string;
  user_agent?: string;
  reason: string;
  artifacts?: string[];
  blocked_at: string;
  blocked_by: string;
  status: 'active' | 'unblocked';
  unblocked_at?: string | null;
  unblocked_by?: string | null;
}

