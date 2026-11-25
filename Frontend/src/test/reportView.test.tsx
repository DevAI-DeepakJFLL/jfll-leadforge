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
    expect(html).toContain('Corporate / Registered Address');
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
    expect(html).toContain('Phone');
    expect(html).toContain('Email ID');
    expect(html).toContain('Notes / Provenance');
    expect(html).toContain('+ Add Contact');
    // Accessible table actions header
    expect(html).toContain('Actions</span>');
  });

  it('renders Section 4 with mb-8 bottom margin for vertical spacing above section 5', () => {
    const draft = createEmptyReportDraft('Titan Laboratories');
    const html = renderToString(<ReportView initialReport={draft} />);
    expect(html).toContain('4 · Decision-Makers / Logistics Contacts');
    expect(html).toMatch(/<section class="[^"]*mb-8[^"]*"[^>]*>[\s\S]*?4 · Decision-Makers/);
  });

  it('renders remove section buttons and keeps notes column visible in UI', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd');
    draft.section_4_contacts = [
      {
        name: 'John Doe',
        designation: 'VP Supply Chain',
        phone: '+91 98200 12345',
        email: 'john.doe@titanlab.com',
        notes: 'Apollo verified director',
      },
    ];

    const html = renderToString(<ReportView initialReport={draft} />);

    // Section removal trash buttons exist for sections
    expect(html).toContain('aria-label="Remove section 1 · Company Background"');
    expect(html).toContain('aria-label="Remove section 2 · Trade Lane &amp; Commodity"');
    expect(html).toContain('aria-label="Remove section 3 · JFLL Fit — Why Us"');
    expect(html).toContain('aria-label="Remove section 4 · Decision-Makers / Logistics Contacts"');
    expect(html).toContain('aria-label="Remove section 5 · Sales Executive Feedback &amp; Action Plan"');

    // UI maintains Notes / Provenance column and value
    expect(html).toContain('Notes / Provenance');
    expect(html).toContain('Apollo verified director');
    // Dedicated phone and email values rendered
    expect(html).toContain('+91 98200 12345');
    expect(html).toContain('john.doe@titanlab.com');
  });

  it('omits 0 shipments · $0.00 USD badge in Section 2 when trade metrics are zero or unlisted', () => {
    const draft = createEmptyReportDraft('Unpublished SME Target');
    draft.section_2_trade_lane.total_shipments = 0;
    draft.section_2_trade_lane.total_value_usd = 0.0;

    const html = renderToString(<ReportView initialReport={draft} />);
    expect(html).not.toContain('0 shipments · $0.00 USD');
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

  it('disables Word export and shows viewing mode badge for Viewer role users', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd');
    const viewerUser = { email: 'viewer@jfll.com', name: 'Viewer Person', role: 'Viewer', token: 'tok' };
    const html = renderToString(<ReportView initialReport={draft} currentUser={viewerUser} />);

    expect(html).toContain('Viewing Mode · Contact Admin for Export Privileges');
    expect(html).toContain('Export Word (.docx)');
    expect(html).toContain('cursor-not-allowed');
  });

  it('renders ReportView with initial company, lead id, and source correctly', () => {
    const html = renderToString(
      <ReportView
        initialCompany="Baumer s.r.l."
        initialLeadId="556997827369642521126300"
        initialSource="apollo"
      />
    );

    expect(html).toContain('Client Report Generator');
    expect(html).toContain('Baumer s.r.l.');
  });

  it('renders "Checking from Apollo…" loader in Section 4 while decision makers are fetching', () => {
    const html = renderToString(
      <ReportView
        initialCompany="Titan Laboratories Pvt Ltd"
        initialIsLoading={true}
      />
    );

    expect(html).toContain('Checking from Apollo…');
    expect(html).toContain('Cross-referencing verified CXOs, Directors, and Logistics Decision-Makers');
    expect(html).not.toContain('+ Add Contact');
  });

  it('renders Actionable Executive Outreach callout banner and flags sales-verified contacts', () => {
    const draft = createEmptyReportDraft('Titan Laboratories Pvt Ltd');
    draft.section_4_contacts = [
      {
        name: 'Sweety Theknath',
        designation: 'Logistics Manager',
        phone: '+91 98200 54321',
        email: 'sweety@titanlab.com',
        notes: 'Sales verified direct contact',
        is_manually_edited: true,
      },
      {
        name: 'Customs Filing Desk',
        designation: 'Corporate Agent',
        phone: '',
        email: 'info@titanlab.com',
        notes: 'Filing entry',
      },
    ];

    const html = renderToString(<ReportView initialReport={draft} />);

    // Top Actionable Executive Outreach Callout Banner renders above Section 1
    expect(html).toContain('Actionable Executive Outreach');
    expect(html).toContain('1 Verified Contact');
    expect(html).toContain('Direct contact details prioritized for immediate sales outreach');
    expect(html).toContain('Sweety Theknath');
    expect(html).toContain('Logistics Manager');
    expect(html).toContain('+91 98200 54321');
    expect(html).toContain('sweety@titanlab.com');
    expect(html).toContain('Sales Verified');

    // Section 4 header has Sales Verified count badge
    expect(html).toContain('1 Sales Verified');

    // Contact row has Verified badge and highlight class
    expect(html).toContain('title="Verified by sales team"');
    expect(html).toContain('border-l-emerald-500');
  });
});
