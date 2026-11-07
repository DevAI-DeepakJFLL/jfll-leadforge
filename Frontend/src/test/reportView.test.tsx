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
    expect(html).toContain('Search company name');
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

  it('renders Section 5 sales executive feedback with structured fields and copy feedback button', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd');
    draft.section_5_feedback.meeting_takeaways = 'Needs refrigerated 2-8C air container';
    draft.section_5_feedback.preferred_carriers = 'Emirates SkyCargo';
    draft.section_5_feedback.target_pricing = '$3.20/kg';
    draft.section_5_feedback.next_action_followup = 'Proposal by Tuesday';

    const html = renderToString(<ReportView initialReport={draft} />);

    // Section 5 title and action
    expect(html).toContain('5 · Sales Executive Feedback &amp; Action Plan');
    expect(html).toContain('Copy Feedback');

    // Structured row labels
    expect(html).toContain('Meeting Takeaways &amp; Client Needs');
    expect(html).toContain('Preferred Carriers / Lines');
    expect(html).toContain('Target Rates / Pricing Notes');
    expect(html).toContain('Next Action &amp; Follow-up Date');

    // Values rendered in HTML inputs/textareas
    expect(html).toContain('Needs refrigerated 2-8C air container');
    expect(html).toContain('Emirates SkyCargo');
    expect(html).toContain('$3.20/kg');
    expect(html).toContain('Proposal by Tuesday');
  });
});
