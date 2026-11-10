/**
 * Phase 2 Lead Status Tracker Service.
 * Provides full CRUD operations, high-performance O(1) in-memory caching,
 * single-pass client-side filtering, deterministic offline fallback, and
 * freight sales pipeline analytics.
 */

import { API_BASE_URL } from '@/config/api';
import { getStoredSession, isOfflineSession } from '@/services/authService';
import { getDeviceFingerprint } from '@/utils/antiBotGuard';
import { logger } from '@/utils/logger';
import {
  CLOSED_TRACKER_STATUSES,
  LeadTrackerCreatePayload,
  LeadTrackerFilterParams,
  LeadTrackerItem,
  LeadTrackerLogEntry,
  LeadTrackerUpdatePayload,
  RateValidityInfo,
  RateValidityStatus,
  TrackerActivityCreatePayload,
  TrackerFollowupStatus,
  TrackerKPIs,
} from '@/types/leadTracker';

export type { RateValidityInfo, RateValidityStatus };

export const TRACKER_API_BASE_URL = `${API_BASE_URL}/api/v1/lead-tracker`;
export const TRACKER_CACHE_STORAGE_KEY = 'jfll_lead_tracker_cache_v1';
export const TRACKER_UPDATED_EVENT = 'jfll-tracker-lead-updated';

/**
 * Standard sales rep email mappings for automatic rep notification and assignment.
 */
export const SALES_REP_EMAILS: Record<string, string> = {
  'edward': 'edward@jfll.com',
  'tasneem': 'tasneem@jfll.com',
  'priyanka sardesai': 'priyanka.sardesai@jfll.com',
  'priyanka': 'priyanka.sardesai@jfll.com',
  'utkarsha': 'utkarsha@jfll.com',
  'sanjay': 'sanjay@jfll.com',
  'sidhart ji': 'sidhart@jfll.com',
  'sidhart': 'sidhart@jfll.com',
  'jaya': 'jaya@jfll.com',
  'sheela': 'sheela@jfll.com',
};

/**
 * Deterministic starter fallback dataset mirroring the 14 real companies
 * from Lead_Tracker.xlsx. Guarantees that executive and sales reps have
 * functional data even if the backend service is offline.
 */
export const DEFAULT_TRACKER_STARTER_LEADS: LeadTrackerItem[] = [
  {
    id: 'trk_seed_001',
    company_name: 'Royal Arc',
    contact_person: 'Trith Amrania',
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-29',
    status: 'Quoted',
    transport_mode: 'Ocean FCL',
    routing_type: 'Freehand',
    feedback_notes: 'Met the person but they mainly do sea freight and the rates we are offering is not that competitive',
    next_followup_date: '2026-08-16',
    next_action: 'Ask if quotation shared with client; Next time I see him',
    quote_date: '2026-08-01',
    rate_validity_date: '2026-08-15',
    rate_validity_days: 14,
    target_shipment_date: '2026-08-25',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_001',
        timestamp: '2026-07-29T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Initial lead assignment to Edward. Sea freight rate gap feedback.',
      },
    ],
    created_at: '2026-07-29T10:00:00Z',
    updated_at: '2026-07-29T10:00:00Z',
  },
  {
    id: 'trk_seed_002',
    company_name: 'CLEARSYNTH LABS LIMITED',
    contact_person: 'Sunil Patil',
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-02-09',
    status: 'Feedback Received',
    transport_mode: 'Courier / Express',
    routing_type: 'Freehand',
    feedback_notes: 'Talked to Sunil Patil, they do purely courier and works with Fedex, need to include Rahul to talk to vendors',
    next_followup_date: '2026-09-18',
    next_action: 'Edward is personally gonna meet him and connect with him; flag this with dad',
    quote_date: '2026-09-10',
    rate_validity_date: '2026-09-24',
    rate_validity_days: 14,
    target_shipment_date: '2026-10-05',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_002',
        timestamp: '2026-02-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Courier and Fedex vendor negotiation needed.',
      },
    ],
    created_at: '2026-02-09T10:00:00Z',
    updated_at: '2026-02-09T10:00:00Z',
  },
  {
    id: 'trk_seed_003',
    company_name: 'SIMSON PHARMA LIMITED',
    contact_person: 'Kartike Sharma',
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Utkarsha',
    assigned_to_email: 'utkarsha@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-31',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Originally sent to Shruti but reassigned to Sweety / Utkarsha. Reached out on LinkedIn, in progress of meeting',
    next_followup_date: '2026-09-24',
    next_action: 'Needs to do a follow up; Got a meeting from him',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_003',
        timestamp: '2026-07-31T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Initial assignment to Utkarsha.',
      },
    ],
    created_at: '2026-07-31T10:00:00Z',
    updated_at: '2026-07-31T10:00:00Z',
  },
  {
    id: 'trk_seed_004',
    company_name: 'VEA IMPEX (I) PVT LTD',
    contact_person: 'Bhabika',
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Tasneem',
    assigned_to_email: 'tasneem@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-02-09',
    status: 'Feedback Received',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Got in touch with a person, will follow up with him in a few days',
    next_followup_date: '2026-09-09',
    next_action: 'Bhabika - everytime she calls shes busy, meeting her',
    quote_date: '2026-09-01',
    rate_validity_date: '2026-09-15',
    rate_validity_days: 14,
    target_shipment_date: '2026-09-22',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_004',
        timestamp: '2026-02-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Initial assignment to Tasneem.',
      },
    ],
    created_at: '2026-02-09T10:00:00Z',
    updated_at: '2026-02-09T10:00:00Z',
  },
  {
    id: 'trk_seed_005',
    company_name: 'GEMINI EXPORTS + NIVIRA EXPORTS',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Priyanka Sardesai',
    assigned_to_email: 'priyanka.sardesai@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-03-09',
    status: 'Contacted',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Sent two leads. Nivira has not answered; Gemini is already working with another company',
    next_followup_date: '2026-09-10',
    next_action: 'Follow up with Nivira and assess Gemini contract expiry',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_005',
        timestamp: '2026-03-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Assigned to Priyanka Sardesai.',
      },
    ],
    created_at: '2026-03-09T10:00:00Z',
    updated_at: '2026-03-09T10:00:00Z',
  },
  {
    id: 'trk_seed_006',
    company_name: 'Himedia labs',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Tasneem',
    assigned_to_email: 'tasneem@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-03-09',
    status: 'Contacted',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Existing client, could not match rates. She wants to step back, be prepared and go again. Need higher rates and credit. Work on volume rather than GP.',
    next_followup_date: '2026-09-18',
    next_action: 'Have meeting with pricing person; work on volume rather than GP',
    quote_date: '2026-09-12',
    rate_validity_date: '2026-09-19',
    rate_validity_days: 7,
    target_shipment_date: '2026-09-28',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_006',
        timestamp: '2026-03-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Rate matching and credit terms discussion.',
      },
    ],
    created_at: '2026-03-09T10:00:00Z',
    updated_at: '2026-03-09T10:00:00Z',
  },
  {
    id: 'trk_seed_007',
    company_name: 'GMSANJIVANI (General) + SUPRIYA LIFESCIENCE',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Priyanka Sardesai',
    assigned_to_email: 'priyanka.sardesai@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-08-09',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Did not get a lot of phone numbers, not the strongest lead',
    next_followup_date: '2026-09-15',
    next_action: 'Deep research for direct procurement contacts',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_007',
        timestamp: '2026-08-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Assigned to Priyanka Sardesai.',
      },
    ],
    created_at: '2026-08-09T10:00:00Z',
    updated_at: '2026-08-09T10:00:00Z',
  },
  {
    id: 'trk_seed_008',
    company_name: 'TITAN LABORATORIES PVT LTD',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Utkarsha',
    assigned_to_email: 'utkarsha@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-09-09',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Nominated',
    feedback_notes: "Most shipments are nominated, try to set a meeting but still hasn't gotten a time",
    next_followup_date: '2026-09-24',
    next_action: 'Explore CIF/DDP conversion or contact overseas consignee partner',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_008',
        timestamp: '2026-09-09T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Nominated routing analysis.',
      },
    ],
    created_at: '2026-09-09T10:00:00Z',
    updated_at: '2026-09-09T10:00:00Z',
  },
  {
    id: 'trk_seed_009',
    company_name: 'Invetia Healthcare',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Sheela',
    assigned_to_email: 'sheela@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-09-21',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Lead recently dispatched for sales discovery',
    next_followup_date: '2026-09-28',
    next_action: 'Initiate introductory outreach call',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_009',
        timestamp: '2026-09-21T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Initial assignment to Sheela.',
      },
    ],
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-09-21T10:00:00Z',
  },
  {
    id: 'trk_seed_010',
    company_name: 'MEGA FINE PHARMA PRIVATE LIMITED',
    contact_person: 'Dharamvi',
    contact_phone: null,
    contact_email: null,
    branch: 'Mumbai',
    assigned_to: 'Sanjay',
    assigned_to_email: 'sanjay@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-09-23',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Visited their office and talked to Dharamvi. Ready to quote but has request for temperature warehouse',
    next_followup_date: null,
    next_action: 'See if we can work with cold-chain agency; look at temperature controlled warehouse',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_010',
        timestamp: '2026-09-23T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Cold chain temperature warehouse request.',
      },
    ],
    created_at: '2026-09-23T10:00:00Z',
    updated_at: '2026-09-23T10:00:00Z',
  },
  {
    id: 'trk_seed_011',
    company_name: 'Sun Bio',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'South India',
    assigned_to: 'Jaya',
    assigned_to_email: 'jaya@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-28',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Meeting to get updates, sent contact person on LinkedIn',
    next_followup_date: '2026-08-10',
    next_action: 'Need to do more background research and follow up',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_011',
        timestamp: '2026-07-28T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'South India branch lead assignment to Jaya.',
      },
    ],
    created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-07-28T10:00:00Z',
  },
  {
    id: 'trk_seed_012',
    company_name: 'Veer Internatinal',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Gujarat',
    assigned_to: 'Sidhart Ji',
    assigned_to_email: 'sidhart@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-30',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Doing deep research to support Sidhart Ji',
    next_followup_date: '2026-08-10',
    next_action: 'Need to do deep research on export lanes',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_012',
        timestamp: '2026-07-30T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Gujarat branch lead assigned to Sidhart Ji.',
      },
    ],
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
  },
  {
    id: 'trk_seed_013',
    company_name: 'Pooja Foods',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Gujarat',
    assigned_to: 'Sidhart Ji',
    assigned_to_email: 'sidhart@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-30',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Doing deep research to support Sidhart Ji',
    next_followup_date: '2026-08-10',
    next_action: 'Need to do deep research on food cargo certifications',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_013',
        timestamp: '2026-07-30T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Gujarat branch lead assigned to Sidhart Ji.',
      },
    ],
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
  },
  {
    id: 'trk_seed_014',
    company_name: 'Kirti Foods',
    contact_person: null,
    contact_phone: null,
    contact_email: null,
    branch: 'Gujarat',
    assigned_to: 'Sidhart Ji',
    assigned_to_email: 'sidhart@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-30',
    status: 'Assigned',
    transport_mode: 'Air Freight',
    routing_type: 'Freehand',
    feedback_notes: 'Doing deep research to support Sidhart Ji',
    next_followup_date: '2026-08-10',
    next_action: 'Need to do deep research on Gulf and US food imports',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [
      {
        id: 'log_seed_014',
        timestamp: '2026-07-30T10:00:00Z',
        author_name: 'Tyra Theknath',
        author_email: 'tyra@jfll.com',
        action: 'Imported from Lead Tracker Excel',
        notes: 'Gujarat branch lead assigned to Sidhart Ji.',
      },
    ],
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
  },
];

/**
 * In-memory cache: Map<id, LeadTrackerItem> providing O(1) random access.
 */
const leadTrackerCache = new Map<string, LeadTrackerItem>();
let _cacheInitialized = false;

/**
 * Ensures the in-memory cache is populated from localStorage or starter seeds.
 */
function ensureCacheInitialized(): void {
  if (_cacheInitialized && leadTrackerCache.size > 0) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(TRACKER_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed: LeadTrackerItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          leadTrackerCache.clear();
          for (const item of parsed) {
            leadTrackerCache.set(item.id, item);
          }
          _cacheInitialized = true;
          return;
        }
      }
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to read localStorage cache, seeding defaults', {
      error: String(err),
    });
  }

  // Seed default dataset if cache is empty
  leadTrackerCache.clear();
  for (const item of DEFAULT_TRACKER_STARTER_LEADS) {
    leadTrackerCache.set(item.id, item);
  }
  _cacheInitialized = true;
}

/**
 * Persists current in-memory cache state into browser localStorage.
 */
function persistCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = Array.from(leadTrackerCache.values());
      localStorage.setItem(TRACKER_CACHE_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to persist cache to localStorage', {
      error: String(err),
    });
  }
}

/**
 * Resets local cache to the deterministic baseline. Useful for test isolation.
 */
export function resetTrackerLocalCache(): void {
  leadTrackerCache.clear();
  for (const item of DEFAULT_TRACKER_STARTER_LEADS) {
    leadTrackerCache.set(item.id, { ...item, history: [...item.history] });
  }
  _cacheInitialized = true;
  persistCache();
}

/**
 * Returns a cached tracked lead by ID in O(1) time.
 */
export function getTrackerCachedItem(id: string): LeadTrackerItem | undefined {
  ensureCacheInitialized();
  return leadTrackerCache.get(id);
}

/**
 * Returns all items in the in-memory cache.
 */
export function getAllTrackerCachedItems(): LeadTrackerItem[] {
  ensureCacheInitialized();
  return Array.from(leadTrackerCache.values());
}

/**
 * Replaces the in-memory cache with the provided items.
 */
export function setTrackerCachedItems(items: LeadTrackerItem[]): void {
  leadTrackerCache.clear();
  for (const item of items) {
    leadTrackerCache.set(item.id, item);
  }
  _cacheInitialized = true;
  persistCache();
}

/**
 * Builds HTTP headers including bearer auth token and device fingerprint.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  };

  try {
    const session = getStoredSession();
    if (session?.token && !isOfflineSession(session)) {
      headers['Authorization'] = `Bearer ${session.token}`;
    } else if (typeof window !== 'undefined') {
      const token =
        window.localStorage?.getItem('token') ||
        window.sessionStorage?.getItem('token') ||
        null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Graceful handling of storage exceptions
  }

  return headers;
}

/**
 * Evaluates the follow-up urgency status using O(1) ISO date string comparison.
 * Avoids expensive `new Date()` parsing on every table render.
 *
 * Rules:
 * - Returns 'none' if followupDate is missing or if status is 'Won' or 'Closed / Lost'.
 * - Returns 'overdue' if followupDate < todayStr.
 * - Returns 'due_today' if followupDate === todayStr.
 * - Returns 'upcoming' if followupDate > todayStr.
 */
export function getFollowupStatus(
  followupDate?: string | null,
  status?: string,
  todayStrOverride?: string
): TrackerFollowupStatus {
  if (!followupDate || !followupDate.trim()) {
    return 'none';
  }
  if (status === 'Won' || status === 'Closed / Lost') {
    return 'none';
  }

  const todayStr = todayStrOverride || new Date().toISOString().slice(0, 10);
  const cleanDate = followupDate.trim();

  if (cleanDate < todayStr) {
    return 'overdue';
  }
  if (cleanDate === todayStr) {
    return 'due_today';
  }
  return 'upcoming';
}

export const NO_QUOTE_INFO: RateValidityInfo = Object.freeze({
  status: 'none',
  daysRemaining: null,
  label: 'No Quote',
  badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
  borderClass: 'border-slate-200',
});

/**
 * Evaluates the freight quote rate validity horizon using pure UTC date arithmetic.
 * Ensures O(1) constant time evaluation and eliminates timezone drift across client environments.
 *
 * Rules:
 * - Returns 'none' with 'No Quote' label and slate styling if rate_validity_date is missing or invalid.
 * - If delta < 0: status is 'expired', label is `Expired (${Math.abs(delta)}d ago)`, rose styling.
 * - If delta === 0: status is 'expiring_soon', label is 'Expires Today', amber styling.
 * - If delta is 1 or 2: status is 'expiring_soon', label is `${delta}d left`, amber styling.
 * - If delta > 2: status is 'valid', label is `${delta}d valid`, emerald styling.
 */
export function getRateValidityInfo(
  lead?: Partial<LeadTrackerItem> | null,
  referenceDateStr?: string
): RateValidityInfo {
  const dateStr = lead?.rate_validity_date?.trim();
  if (!dateStr) {
    return NO_QUOTE_INFO;
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return NO_QUOTE_INFO;
  }

  const [vy, vm, vd] = parts.map(Number);
  if (Number.isNaN(vy) || Number.isNaN(vm) || Number.isNaN(vd)) {
    return NO_QUOTE_INFO;
  }

  const refStr = referenceDateStr?.trim() || new Date().toISOString().slice(0, 10);
  const refParts = refStr.split('-');
  if (refParts.length !== 3) {
    return NO_QUOTE_INFO;
  }

  const [ry, rm, rd] = refParts.map(Number);
  if (Number.isNaN(ry) || Number.isNaN(rm) || Number.isNaN(rd)) {
    return NO_QUOTE_INFO;
  }

  const targetUtc = Date.UTC(vy, vm - 1, vd);
  const refUtc = Date.UTC(ry, rm - 1, rd);
  const diffMs = targetUtc - refUtc;
  const delta = Math.round(diffMs / 86400000);

  if (delta < 0) {
    return {
      status: 'expired',
      daysRemaining: delta,
      label: `Expired (${Math.abs(delta)}d ago)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-rose-300',
    };
  }

  if (delta <= 2) {
    return {
      status: 'expiring_soon',
      daysRemaining: delta,
      label: delta === 0 ? 'Expires Today' : `${delta}d left`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      borderClass: 'border-amber-300',
    };
  }

  return {
    status: 'valid',
    daysRemaining: delta,
    label: `${delta}d valid`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-300',
  };
}

/**
 * High-performance single-pass in-memory filter and sort.
 * Executes in O(N log N) time without multi-pass array allocations.
 */
export function filterTrackedLeadsInMemory(
  items: LeadTrackerItem[],
  filters?: LeadTrackerFilterParams,
  todayStr?: string
): LeadTrackerItem[] {
  if (!items || items.length === 0) return [];
  const activeToday = todayStr || new Date().toISOString().slice(0, 10);

  const branchFilter = filters?.branch?.trim().toLowerCase();
  const repFilter = filters?.assigned_to?.trim().toLowerCase();
  const statusFilter = filters?.status?.trim().toLowerCase();
  const overdueOnly = !!filters?.overdue_only;
  const searchFilter = filters?.search?.trim().toLowerCase();

  const filtered: LeadTrackerItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (branchFilter && branchFilter !== 'all' && item.branch.trim().toLowerCase() !== branchFilter) {
      continue;
    }

    if (repFilter && repFilter !== 'all') {
      const repLower = item.assigned_to.trim().toLowerCase();
      if (!repLower.includes(repFilter)) {
        continue;
      }
    }

    if (statusFilter && statusFilter !== 'all' && item.status.trim().toLowerCase() !== statusFilter) {
      continue;
    }

    if (overdueOnly) {
      const fupStatus = getFollowupStatus(item.next_followup_date, item.status, activeToday);
      if (fupStatus !== 'overdue') {
        continue;
      }
    }

    if (searchFilter) {
      const match =
        item.company_name.toLowerCase().includes(searchFilter) ||
        (item.contact_person && item.contact_person.toLowerCase().includes(searchFilter)) ||
        (item.feedback_notes && item.feedback_notes.toLowerCase().includes(searchFilter)) ||
        (item.next_action && item.next_action.toLowerCase().includes(searchFilter)) ||
        item.branch.toLowerCase().includes(searchFilter) ||
        item.assigned_to.toLowerCase().includes(searchFilter);

      if (!match) {
        continue;
      }
    }

    filtered.push(item);
  }

  // Sorting: in-place on the filtered array
  const sortBy = filters?.sort_by || 'updated_at';
  const isAsc = filters?.order === 'asc';

  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'next_followup_date') {
      // Null follow-up dates sort to the bottom
      if (!a.next_followup_date && !b.next_followup_date) comparison = 0;
      else if (!a.next_followup_date) return 1;
      else if (!b.next_followup_date) return -1;
      else comparison = a.next_followup_date.localeCompare(b.next_followup_date);
    } else if (sortBy === 'company_name') {
      comparison = a.company_name.localeCompare(b.company_name);
    } else if (sortBy === 'assigned_date') {
      comparison = a.assigned_date.localeCompare(b.assigned_date);
    } else {
      comparison = (a.updated_at || '').localeCompare(b.updated_at || '');
    }
    return isAsc ? comparison : -comparison;
  });

  return filtered;
}

/**
 * Computes executive KPIs in a single O(N) pass across all tracked items.
 */
export function computeTrackerKPIsInMemory(
  items: LeadTrackerItem[],
  todayStr?: string
): TrackerKPIs {
  const activeToday = todayStr || new Date().toISOString().slice(0, 10);
  let active = 0;
  let quoted = 0;
  let won = 0;
  let overdue = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isClosed = CLOSED_TRACKER_STATUSES.includes(item.status);
    if (!isClosed) {
      active++;
      if (getFollowupStatus(item.next_followup_date, item.status, activeToday) === 'overdue') {
        overdue++;
      }
    }
    if (item.status === 'Quoted') {
      quoted++;
    } else if (item.status === 'Won') {
      won++;
    }
  }

  return {
    total_leads: items.length,
    active_leads: active,
    quoted_leads: quoted,
    won_leads: won,
    overdue_leads: overdue,
  };
}

/**
 * Fetches tracked leads from the backend API.
 * Falls back gracefully to in-memory/localStorage cache if backend is offline.
 */
export async function fetchTrackedLeads(
  filters?: LeadTrackerFilterParams
): Promise<LeadTrackerItem[]> {
  ensureCacheInitialized();

  const params = new URLSearchParams();
  if (filters?.branch && filters.branch !== 'all') params.set('branch', filters.branch);
  if (filters?.assigned_to && filters.assigned_to !== 'all') params.set('assigned_to', filters.assigned_to);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.overdue_only) params.set('overdue_only', 'true');
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  if (filters?.order) params.set('order', filters.order);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Lead Tracker API returned HTTP ${response.status}`);
    }

    const data: LeadTrackerItem[] = await response.json();

    // Refresh in-memory cache with fresh items
    for (const item of data) {
      leadTrackerCache.set(item.id, item);
    }
    persistCache();

    return data;
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to fetch live tracked leads, using local fallback', {
      error: String(err),
    });

    const cachedItems = Array.from(leadTrackerCache.values());
    return filterTrackedLeadsInMemory(cachedItems, filters);
  }
}

/**
 * Fetches aggregated executive KPIs from the API.
 * Falls back to O(N) client-side calculation if offline.
 */
export async function fetchTrackerKPIs(): Promise<TrackerKPIs> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/kpis`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Lead Tracker KPIs API returned HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to fetch tracker KPIs, calculating locally', {
      error: String(err),
    });

    const cachedItems = Array.from(leadTrackerCache.values());
    return computeTrackerKPIsInMemory(cachedItems);
  }
}

/**
 * Fetches a single tracked lead by ID.
 * Returns cached item if available, or pulls from backend.
 */
export async function fetchTrackedLeadById(id: string): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data: LeadTrackerItem = await response.json();
      leadTrackerCache.set(data.id, data);
      persistCache();
      return data;
    }
  } catch (err) {
    logger.debug('LEAD_TRACKER_SERVICE', `Fetch lead '${id}' failed, checking local cache`, {
      error: String(err),
    });
  }

  const cached = leadTrackerCache.get(id);
  if (cached) {
    return cached;
  }

  throw new Error(`Tracked lead with ID '${id}' not found`);
}

/**
 * Creates and assigns a new tracked lead.
 * Persists optimistically to local cache on network error.
 */
export async function createTrackedLead(
  payload: LeadTrackerCreatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(TRACKER_API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const created: LeadTrackerItem = await response.json();
      leadTrackerCache.set(created.id, created);
      persistCache();
      notifyTrackerLeadUpdated(created);
      return created;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Backend unavailable, creating tracked lead locally', {
      error: String(err),
    });
  }

  // Offline / fallback item creation
  const nowIso = new Date().toISOString();
  const id = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const repClean = payload.assigned_to.trim().toLowerCase();
  const repEmail = payload.assigned_to_email || SALES_REP_EMAILS[repClean] || null;

  const initialHistory: LeadTrackerLogEntry[] = [
    {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: payload.assigned_by || 'Tyra Theknath',
      author_email: 'tyra@jfll.com',
      action: 'Lead Created / Assigned',
      notes: payload.feedback_notes || `Assigned to ${payload.assigned_to} (${payload.branch || 'Mumbai'} branch)`,
    },
  ];

  const localItem: LeadTrackerItem = {
    id,
    company_name: payload.company_name,
    contact_person: payload.contact_person ?? null,
    contact_phone: payload.contact_phone ?? null,
    contact_email: payload.contact_email ?? null,
    branch: payload.branch || 'Mumbai',
    assigned_to: payload.assigned_to,
    assigned_to_email: repEmail,
    assigned_by: payload.assigned_by || 'Tyra Theknath',
    assigned_date: payload.assigned_date || nowIso.slice(0, 10),
    status: payload.status || 'Assigned',
    transport_mode: payload.transport_mode || 'Air Freight',
    routing_type: payload.routing_type || 'Freehand',
    feedback_notes: payload.feedback_notes ?? null,
    next_followup_date: payload.next_followup_date ?? null,
    next_action: payload.next_action ?? null,
    quote_date: payload.quote_date ?? null,
    rate_validity_date: payload.rate_validity_date ?? null,
    rate_validity_days: payload.rate_validity_days ?? null,
    target_shipment_date: payload.target_shipment_date ?? null,
    linked_entity_type: payload.linked_entity_type || 'custom',
    linked_entity_id: payload.linked_entity_id ?? null,
    history: initialHistory,
    created_at: nowIso,
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, localItem);
  persistCache();
  notifyTrackerLeadUpdated(localItem);
  return localItem;
}

/**
 * Updates a tracked lead's stage, feedback notes, follow-up date, or assignment.
 * Generates audit log entries for status transitions or reassignments.
 */
export async function updateTrackedLead(
  id: string,
  updates: LeadTrackerUpdatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const updated: LeadTrackerItem = await response.json();
      leadTrackerCache.set(updated.id, updated);
      persistCache();
      notifyTrackerLeadUpdated(updated);
      return updated;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, updating lead '${id}' locally`, {
      error: String(err),
    });
  }

  // Local fallback update
  const existing = leadTrackerCache.get(id);
  if (!existing) {
    throw new Error(`Tracked lead with ID '${id}' not found in local cache`);
  }

  const nowIso = new Date().toISOString();
  const session = getStoredSession();
  const authorName = session?.name || updates.assigned_by || 'Leadership';
  const authorEmail = session?.email || 'leadership@jfll.com';

  const newHistory = [...existing.history];

  // Detect and log changes
  if (updates.status && updates.status !== existing.status) {
    let note = `Status updated from '${existing.status}' to '${updates.status}'`;
    if (updates.feedback_notes) {
      note += `. Notes: ${updates.feedback_notes}`;
    }
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Status Change',
      notes: note,
    });
  } else if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Reassignment',
      notes: `Reassigned from ${existing.assigned_to} to ${updates.assigned_to}`,
    });
  } else if (updates.next_followup_date && updates.next_followup_date !== existing.next_followup_date) {
    let note = `Next follow-up date set to ${updates.next_followup_date}`;
    if (updates.next_action) {
      note += `: ${updates.next_action}`;
    }
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Follow-up Scheduled',
      notes: note,
    });
  } else if (updates.feedback_notes && updates.feedback_notes !== existing.feedback_notes) {
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Feedback Logged',
      notes: updates.feedback_notes,
    });
  }

  const updatedRep = updates.assigned_to || existing.assigned_to;
  const repClean = updatedRep.trim().toLowerCase();
  const repEmail = updates.assigned_to_email || SALES_REP_EMAILS[repClean] || existing.assigned_to_email;

  const mergedItem: LeadTrackerItem = {
    ...existing,
    ...updates,
    assigned_to: updatedRep,
    assigned_to_email: repEmail,
    history: newHistory,
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, mergedItem);
  persistCache();
  notifyTrackerLeadUpdated(mergedItem);
  return mergedItem;
}

/**
 * Records an activity/touchpoint log entry for a tracked lead.
 */
export async function logTrackerActivity(
  id: string,
  payload: TrackerActivityCreatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}/activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const updated: LeadTrackerItem = await response.json();
      leadTrackerCache.set(updated.id, updated);
      persistCache();
      notifyTrackerLeadUpdated(updated);
      return updated;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, logging activity for '${id}' locally`, {
      error: String(err),
    });
  }

  // Local fallback activity log
  const existing = leadTrackerCache.get(id);
  if (!existing) {
    throw new Error(`Tracked lead with ID '${id}' not found in local cache`);
  }

  const nowIso = new Date().toISOString();
  const session = getStoredSession();
  const authorName = payload.author_name || session?.name || 'Sales Coordinator';
  const authorEmail = payload.author_email || session?.email || 'sales@jfll.com';

  const entry: LeadTrackerLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    author_name: authorName,
    author_email: authorEmail,
    action: payload.action,
    notes: payload.notes ?? null,
  };

  const updatedItem: LeadTrackerItem = {
    ...existing,
    status: payload.status || existing.status,
    next_followup_date:
      payload.next_followup_date !== undefined ? payload.next_followup_date : existing.next_followup_date,
    history: [...existing.history, entry],
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, updatedItem);
  persistCache();
  notifyTrackerLeadUpdated(updatedItem);
  return updatedItem;
}

/**
 * Deletes or archives a tracked lead.
 */
export async function deleteTrackedLead(id: string): Promise<boolean> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      leadTrackerCache.delete(id);
      persistCache();
      return true;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, deleting lead '${id}' locally`, {
      error: String(err),
    });
  }

  // Local deletion
  const deleted = leadTrackerCache.delete(id);
  persistCache();
  return deleted;
}

/**
 * Dispatches a custom DOM event so reactive UI components can synchronize instantly.
 */
function notifyTrackerLeadUpdated(item: LeadTrackerItem): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent(TRACKER_UPDATED_EVENT, {
          detail: item,
        })
      );
    } catch {
      // Ignore in non-browser or test environments
    }
  }
}
