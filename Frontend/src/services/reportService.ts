/**
 * Client service layer for automated Client Report generation and Word (.docx) export.
 */
import {
  ClientReportData,
  GenerateReportRequest,
  ReportCompanySuggestion,
} from '../types/report';

/**
 * Format current date in DD-MM-YYYY format
 */
export function getFormattedToday(): string {
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
  };
}

/**
 * Autocomplete search for companies in DataMyne
 */
export async function fetchReportCompanySuggestions(
  query: string,
  limit: number = 10
): Promise<ReportCompanySuggestion[]> {
  if (!query || !query.strip?.() && !query.trim()) return [];
  try {
    const res = await fetch(`/api/reports/companies?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
      headers: { 'Accept': 'application/json' },
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
  try {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        company_name_or_id: company,
        prepared_for: request.prepared_for || 'Mumbai Sales Branch',
        prepared_by: request.prepared_by || 'Tyra Theknath',
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('[REPORT SERVICE] Backend unavailable, generating local client report draft:', err);
    return createEmptyReportDraft(company, request.prepared_for, request.prepared_by);
  }
}

/**
 * Download client report as formatted Word (.docx) file
 */
export async function downloadClientReportDocx(report: ClientReportData): Promise<void> {
  try {
    const res = await fetch('/api/reports/export-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate Word document (Status ${res.status})`);
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
