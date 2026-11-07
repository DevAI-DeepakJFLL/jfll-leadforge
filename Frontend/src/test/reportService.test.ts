import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchReportCompanySuggestions,
  generateClientReport,
  downloadClientReportDocx,
  createEmptyReportDraft,
} from '../services/reportService';
import { ClientReportData } from '../types/report';

describe('Report Service Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createEmptyReportDraft creates a valid blank briefing structure', () => {
    const draft = createEmptyReportDraft('Acme Corp', 'Utkarsha / Mumbai', 'Tyra Theknath');
    expect(draft.header.company_name).toBe('Acme Corp');
    expect(draft.header.prepared_for).toBe('Utkarsha / Mumbai');
    expect(draft.header.prepared_by).toBe('Tyra Theknath');
    expect(draft.section_1_background.what_they_do).toBeDefined();
    expect(draft.section_2_trade_lane.total_shipments).toBe(0);
    expect(draft.section_3_jfll_fit.cargo_strength).toBeDefined();
    expect(draft.section_4_contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('fetchReportCompanySuggestions queries API successfully', async () => {
    const mockSuggestions = [
      { id: 'dm-val-01410', company_name: 'TITAN LABORATORIES PVT LTD', city: 'MUMBAI', country: 'India', total_shipments: 130, total_value_usd: 8341160.3, category: 'Chemicals & Materials' }
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    } as Response);

    const results = await fetchReportCompanySuggestions('Titan');
    expect(results).toEqual(mockSuggestions);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/reports/companies?q=Titan&limit=10', expect.any(Object));
  });

  it('generateClientReport calls backend API and returns structured report data', async () => {
    const mockReport: ClientReportData = {
      lead_id: 'dm-val-00845',
      header: {
        title: 'CLIENT REPORT · PROSPECT BRIEF',
        company_name: 'MEGA FINE PHARMA PVT LTD',
        subtitle: 'API & advanced-intermediate manufacturer–exporter',
        prepared_for: 'Mumbai Sales Branch',
        prepared_by: 'Tyra Theknath',
        date: '07-11-2026',
      },
      section_1_background: {
        what_they_do: 'Manufacturer of APIs',
        hq_facilities: 'Mumbai',
        export_markets: 'Global',
        scale_credibility: 'USFDA Approved',
      },
      section_2_trade_lane: {
        origin_destination: 'Mumbai -> Global',
        commodity: 'APIs',
        primary_mode: 'AIR',
        special_handling: 'IATA DG',
        total_shipments: 237,
        total_value_usd: 7859897.1,
        lading_port: 'INBOM4',
      },
      section_3_jfll_fit: {
        cargo_strength: 'Multimodal air fit',
        pitch_angle: 'IATA DG handling',
      },
      section_4_contacts: [
        { name: 'General', designation: 'HQ', contact_info: 'info@megafine.in', notes: 'Primary' }
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockReport,
    } as Response);

    const report = await generateClientReport({
      company_name_or_id: 'Megafine',
      prepared_for: 'Mumbai Sales Branch',
      prepared_by: 'Tyra Theknath',
    });

    expect(report.header.company_name).toBe('MEGA FINE PHARMA PVT LTD');
    expect(report.section_2_trade_lane.total_shipments).toBe(237);
  });

  it('generateClientReport falls back gracefully to local draft when backend offline', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const report = await generateClientReport({
      company_name_or_id: 'Titan Laboratories',
    });

    expect(report).toBeDefined();
    expect(report.header.company_name).toBe('Titan Laboratories');
    expect(report.section_4_contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('downloadClientReportDocx triggers file download from API safely', async () => {
    const mockBlob = new Blob(['mock-docx-binary'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    } as Response);

    const mockReport = createEmptyReportDraft('Titan Laboratories');
    await downloadClientReportDocx(mockReport);

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/reports/export-docx', expect.any(Object));
  });
});
