import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ReportView } from '../components/views/ReportView';
import { createEmptyReportDraft } from '../services/reportService';

describe('ReportView Component Suite', () => {
  it('renders company selector, search input, and generate button in empty initial state', () => {
    const html = renderToString(
      <ReportView initialCompany="" />
    );

    expect(html).toContain('Client Report Generator');
    expect(html).toContain('Search company in DataMyne or enter name');
    expect(html).toContain('Generate Report');
  });

  it('renders full 4-section executive briefing canvas when report data is provided', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd', 'Sweety / Mumbai', 'Tyra Theknath');
    draft.section_2_trade_lane.total_shipments = 130;
    draft.section_2_trade_lane.total_value_usd = 8341160.3;

    const html = renderToString(
      <ReportView initialReport={draft} />
    );

    // Document header
    expect(html).toContain('CLIENT REPORT');
    expect(html).toContain('Titan Laboratories Pvt Ltd');
    expect(html).toContain('Sweety / Mumbai');
    expect(html).toContain('Tyra Theknath');

    // 4 sections
    expect(html).toContain('1 · Company Background');
    expect(html).toContain('2 · Trade Lane');
    expect(html).toContain('Commodity');
    expect(html).toContain('3 · JFLL Fit');
    expect(html).toContain('4 · Decision-Makers / Logistics Contacts');

    // Export actions
    expect(html).toContain('Export Word (.docx)');
    expect(html).toContain('Print / Save PDF');
    // Gemini web search enrichment affordance
    expect(html).toContain('Enrich with Gemini (Web)');
  });

  it('renders contacts table with interactive add button affordance', () => {
    const draft = createEmptyReportDraft('Megafine Pharma');
    const html = renderToString(
      <ReportView initialReport={draft} />
    );

    expect(html).toContain('Name');
    expect(html).toContain('Designation / Role');
    expect(html).toContain('Contact Information');
    expect(html).toContain('Notes / Context');
    expect(html).toContain('+ Add Contact');
    // Accessible table actions header
    expect(html).toContain('Actions</span>');
  });

  it('renders official Jet Freight branding, accessible form linkages, and excludes internal sprint labels', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd');
    const html = renderToString(<ReportView initialReport={draft} />);

    // Official JFLL branding
    expect(html).toContain('src="/assets/jfll-logo.jpeg"');
    expect(html).toContain('Jet Freight Logistics Ltd · BSE/NSE: JETFREIGHT · ISO 9001:2015');

    // No internal sprint tags
    expect(html).not.toContain('Phase 2 Feature');

    // Accessible htmlFor and id linkages
    expect(html).toContain('for="sec1-what-they-do"');
    expect(html).toContain('id="sec1-what-they-do"');
    expect(html).toContain('for="sec2-origin-dest"');
    expect(html).toContain('id="sec2-origin-dest"');
    expect(html).toContain('for="sec3-cargo-strength"');
    expect(html).toContain('id="sec3-cargo-strength"');
    expect(html).toContain('for="company-search-input"');
    expect(html).toContain('id="company-search-input"');
  });

  it('renders Web Grounded Gemini 3.8 Flash badge when report data is web grounded', () => {
    const draft = createEmptyReportDraft('Sunrise Global Exports');
    draft.header.web_grounded = true;

    const html = renderToString(<ReportView initialReport={draft} />);
    expect(html).toContain('Web Grounded · Gemini 3.8 Flash');
  });
});
