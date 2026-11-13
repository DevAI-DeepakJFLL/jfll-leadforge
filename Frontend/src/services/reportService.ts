/**
 * Client service layer for automated Client Report generation and Word (.docx) export.
 */
import {
  ClientReportData,
  GenerateReportRequest,
  ReportCompanySuggestion,
} from '../types/report';
import { getStoredSession, isOfflineSession, notifySessionSuperseded, getAuthHeaders } from '@/services/authService';
import { API_BASE_URL } from '@/config/api';

/**
 * Assemble security headers (Bearer token & device fingerprint) for report API calls
 */
const getReportAuthHeaders = () => getAuthHeaders({ json: false });

/**
 * Format current date in DD-MM-YYYY format
 */
function getFormattedToday(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Create a clean default report draft when offline or unlisted
 */
export function createEmptyReportDraft(
  companyName: string,
  preparedFor: string = 'Mumbai Sales Branch',
  preparedBy: string = 'Tyra Theknath'
): ClientReportData {
  return {
    lead_id: null,
    header: {
      title: 'CLIENT REPORT · PROSPECT BRIEF',
      company_name: companyName,
      subtitle: 'Commercial Merchant Exporter (Unpublished SME)',
      prepared_for: preparedFor,
      prepared_by: preparedBy,
      date: getFormattedToday(),
    },
    section_1_background: {
      what_they_do: 'Commercial exporter / merchant trader of general commodities and industrial goods',
      address: 'Mumbai Metropolitan Region, Maharashtra, India',
      hq_facilities: 'Mumbai Metropolitan Region → Gateways: BOM Air / JNPT Sea',
      export_markets: 'Global emerging and regulated markets',
      scale_credibility: 'SME Exporter (Customs records unlisted in local primary sample)',
    },
    section_2_trade_lane: {
      origin_destination: 'Mumbai (BOM/JNPT) → Global Destination Hubs',
      commodity: 'Commercial Goods & Industrial Supplies',
      primary_mode: 'AIR / OCEAN (LCL/FCL)',
      special_handling: 'Standard Cargo Handling & Export Customs Clearance',
      total_shipments: 0,
      total_value_usd: 0.0,
      lading_port: 'INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)',
    },
    section_3_jfll_fit: {
      cargo_strength: 'Multimodal air + ocean network covers their global trade lanes; licensed CHA for fast Mumbai customs clearance; 150+ country partner network.',
      pitch_angle: 'Multimodal sea + express air · Licensed CHA customs broker · ISO 9001:2015 · Listed since 1986 (NSE/BSE: JETFREIGHT) · Mumbai-local dedicated account team',
    },
    section_4_contacts: [
      {
        name: 'General / Switchboard',
        designation: 'Corporate Inquiries',
        contact_info: 'info@company.com',
        notes: 'Primary Corporate Contact',
      },
      {
        name: 'Logistics Head',
        designation: 'Supply Chain / Logistics Manager',
        contact_info: 'logistics@company.com',
        notes: 'Key Freight Decision-Maker',
      },
    ],
    section_5_feedback: {
      meeting_takeaways: '',
      preferred_carriers: '',
      target_pricing: '',
      next_action_followup: '',
    },
  };
}

/**
 * Normalizes incoming report payloads ensuring backward compatibility for Section 5
 */
export function normalizeReportResponse(report: any): ClientReportData {
  return {
    ...report,
    section_1_background: {
      ...report.section_1_background,
      address: report.section_1_background?.address || '',
    },
    section_5_feedback: report.section_5_feedback || {
      meeting_takeaways: '',
      preferred_carriers: '',
      target_pricing: '',
      next_action_followup: '',
    },
  };
}

const DRAFT_STORAGE_PREFIX = 'jfll_report_draft_';

/**
 * Persists the current report draft to browser sessionStorage
 */
export function saveDraftToSession(report: ClientReportData): void {
  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage || !report?.header?.company_name) return;
    const key = `${DRAFT_STORAGE_PREFIX}${report.header.company_name.toLowerCase().trim()}`;
    storage.setItem(key, JSON.stringify(report));
  } catch {
    // Ignore quota or private browsing exceptions
  }
}

/**
 * Loads a cached report draft from browser sessionStorage if available
 */
export function loadDraftFromSession(companyName: string): ClientReportData | null {
  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage || !companyName) return null;
    const key = `${DRAFT_STORAGE_PREFIX}${companyName.toLowerCase().trim()}`;
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeReportResponse(parsed);
  } catch {
    return null;
  }
}

/**
 * Autocomplete search for companies in DataMyne
 */
export async function fetchReportCompanySuggestions(
  query: string,
  limit: number = 10
): Promise<ReportCompanySuggestion[]> {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/companies?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
        ...getReportAuthHeaders(),
      },
    });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.warn('[REPORT SERVICE] Failed to fetch suggestions:', err);
    return [];
  }
}

/**
 * Generate complete 4-section client briefing data
 */
export async function generateClientReport(
  request: GenerateReportRequest
): Promise<ClientReportData> {
  const company = request.company_name_or_id?.trim() || 'New Prospect';

  const session = getStoredSession();
  if (isOfflineSession(session)) {
    throw new Error('You are currently running in an offline session. Please log out and sign in with an authorized work email to generate live reports.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...getReportAuthHeaders(),
      },
      body: JSON.stringify({
        company_name_or_id: company,
        prepared_for: request.prepared_for || 'Mumbai Sales Branch',
        prepared_by: request.prepared_by || 'Tyra Theknath',
      }),
    });

    if (!res.ok) {
      let errorDetail = `Server returned status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        // Non-JSON error body
      }

      if (res.status === 401) {
        if (errorDetail.includes('SESSION_SUPERSEDED')) {
          notifySessionSuperseded();
          throw new Error('Your session was opened in another window or device. Please sign in again.');
        }
        if (errorDetail.includes('Authentication required') || errorDetail.includes('Invalid or expired')) {
          throw new Error('Your session has expired. Please sign in again to connect to the live customs server.');
        }
      }

      throw new Error(errorDetail);
    }

    return normalizeReportResponse(await res.json());
  } catch (err) {
    console.error('[REPORT SERVICE] Failed to generate report from backend:', err);
    throw err;
  }
}

/**
 * Enrich client report with live web research via Gemini 3.8 Flash Google Search grounding
 */
export async function enrichClientReportWithWeb(
  report: ClientReportData
): Promise<ClientReportData> {
  const session = getStoredSession();
  if (isOfflineSession(session)) {
    throw new Error('You are currently running in an offline session. Please log out and sign in with an authorized work email to run web research.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/enrich-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...getReportAuthHeaders(),
      },
      body: JSON.stringify(report),
    });

    if (!res.ok) {
      let errorDetail = `Web enrichment returned status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        // Non-JSON error body
      }

      if (res.status === 401) {
        if (errorDetail.includes('SESSION_SUPERSEDED')) {
          notifySessionSuperseded();
          throw new Error('Your session was opened in another window or device. Please sign in again.');
        }
        throw new Error('Your session has expired. Please sign in again.');
      }

      throw new Error(errorDetail);
    }

    return normalizeReportResponse(await res.json());
  } catch (err) {
    console.error('[REPORT SERVICE] Failed to enrich report with web search:', err);
    throw err;
  }
}

/**
 * Download client report as formatted Word (.docx) file
 */
export async function downloadClientReportDocx(report: ClientReportData): Promise<void> {
  const session = getStoredSession();
  if (isOfflineSession(session)) {
    throw new Error('You are currently running in an offline session. Please log out and sign in with an authorized work email to export Word documents.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/export-docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getReportAuthHeaders(),
      },
      body: JSON.stringify(report),
    });

    if (!res.ok) {
      let errorDetail = `Failed to generate Word document (Status ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        // Non-JSON error body
      }

      if (res.status === 401) {
        if (errorDetail.includes('SESSION_SUPERSEDED')) {
          notifySessionSuperseded();
          throw new Error('Your session was opened in another window or device. Please sign in again.');
        }
        throw new Error('Your session has expired. Please sign in again.');
      }

      throw new Error(errorDetail);
    }

    const blob = await res.blob();
    const cleanCompany = (report.header?.company_name || 'Client')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const filename = `${cleanCompany}_Client_Report_${report.header?.date || getFormattedToday()}.docx`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 150);
    }
  } catch (err) {
    console.error('[REPORT SERVICE] Failed to download Word report:', err);
    throw err;
  }
}
