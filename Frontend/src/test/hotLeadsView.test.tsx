import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HOT_LEADS_DATA } from '@/data/hotLeadsData';
import {
  computeHotLeadsMetrics,
  filterHotLeadsInMemory,
  formatInrCurrency,
} from '@/services/hotLeadsService';
import { HotLeadsView } from '@/components/hotLeads/HotLeadsView';
import { HotLeadDetailDrawer } from '@/components/hotLeads/HotLeadDetailDrawer';

describe('HotLeads Data & Service Suite', () => {
  it('computes accurate metrics matching the 60-account tax audit ledger', () => {
    const metrics = computeHotLeadsMetrics(HOT_LEADS_DATA);
    expect(metrics.totalCount).toBe(60);
    expect(metrics.totalTurnover).toBe(476606748);
    expect(metrics.prospectsCount).toBe(38);
    expect(metrics.reactivationsCount).toBe(8);
    expect(metrics.activeCount).toBe(14);
    expect(metrics.decisionMakersCount).toBe(32);
  });

  it('filters by segment correctly', () => {
    // Prospects
    const prospects = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'prospects' });
    expect(prospects.totalRecords).toBe(38);
    expect(prospects.items.every((i) => i.crmStatus === 'Prospect (Not in JFLL)')).toBe(true);

    // Reactivations
    const reactivations = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'reactivations' });
    expect(reactivations.totalRecords).toBe(8);
    expect(reactivations.items.every((i) => i.crmStatus === 'Not Active Customer')).toBe(true);

    // Active
    const active = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active' });
    expect(active.totalRecords).toBe(14);
    expect(active.items.every((i) => i.crmStatus === 'Active Customer')).toBe(true);

    // Decision Makers
    const dms = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'with-decision-makers' });
    expect(dms.totalRecords).toBe(32);
    expect(dms.items.every((i) => i.apolloDecisionMaker && i.apolloDecisionMaker !== '-')).toBe(true);
  });

  it('searches by company name, GSTIN, and sales rep', () => {
    // Search by name
    const emoSearch = filterHotLeadsInMemory(HOT_LEADS_DATA, { q: 'EMO TRANS' });
    expect(emoSearch.totalRecords).toBe(1);
    expect(emoSearch.items[0].customerName).toContain('EMO TRANS');

    // Search by GSTIN
    const gstinSearch = filterHotLeadsInMemory(HOT_LEADS_DATA, { q: '06AAACR8724R2ZQ' });
    expect(gstinSearch.totalRecords).toBe(1);
    expect(gstinSearch.items[0].customerName).toBe('RICO AUTO INDUSTRIES LIMITED');

    // Search by sales rep
    const repSearch = filterHotLeadsInMemory(HOT_LEADS_DATA, { q: 'Narendra Gupta' });
    expect(repSearch.totalRecords).toBe(2);
  });

  it('formats INR turnover currency accurately', () => {
    expect(formatInrCurrency(61177562)).toBe('₹6.12 Cr');
    expect(formatInrCurrency(25898329)).toBe('₹2.59 Cr');
    expect(formatInrCurrency(2264791)).toBe('₹22.65 L');
    expect(formatInrCurrency(50000)).toBe('₹50,000');
    expect(formatInrCurrency(0)).toBe('₹0');
  });
});

describe('HotLeadsView & HotLeadDetailDrawer UI Components', () => {
  it('renders HotLeadsView with metrics banner, segment tabs, and table', () => {
    const html = renderToString(
      <HotLeadsView />
    );

    expect(html).toContain('Hot Leads &amp; Tax Invoice Intelligence');
    expect(html).toContain('60 Audited Accounts');
    expect(html).toContain('Verified Tax Billing');
    expect(html).toContain('Net-New Prospects');
    expect(html).toContain('Reactivation Targets');
    expect(html).toContain('Decision Makers');

    // Segment tabs
    expect(html).toContain('All Accounts (60)');
    expect(html).toContain('Net Prospects (38)');
    expect(html).toContain('Reactivations (8)');
    expect(html).toContain('Active (14)');
    expect(html).toContain('Decision Makers (32)');

    // Table headers
    expect(html).toContain('Company Name &amp; GSTIN');
    expect(html).toContain('Taxable Turnover');
    expect(html).toContain('CRM Status');
    expect(html).toContain('Apollo Decision Maker');
    expect(html).toContain('JFLL Sales Rep');

    // Sample company rendered
    expect(html).toContain('EMO TRANS LOGISTICS INDIA PRIVATE LIMITED)');
    expect(html).toContain('07AAHCE5990P1ZT');
    expect(html).toContain('₹6.12 Cr');
  });

  it('renders HotLeadDetailDrawer with audit cards and actions when open', () => {
    const sampleLead = HOT_LEADS_DATA[0];
    const html = renderToString(
      <HotLeadDetailDrawer
        isOpen={true}
        lead={sampleLead}
        onClose={() => {}}
      />
    );

    expect(html).toContain(sampleLead.customerName);
    expect(html).toContain(sampleLead.gstin);
    expect(html).toContain('Audited Tax Invoice Turnover');
    expect(html).toContain('₹6.12 Cr');
    expect(html).toContain('JFLL CRM Relationship');
    expect(html).toContain('Apollo Freight Intelligence');
    expect(html).toContain(sampleLead.apolloDecisionMaker);
    expect(html).toContain(sampleLead.decisionMakerTitle);
    expect(html).toContain('Generate Client Report');
    expect(html).toContain('Find in Apollo');

    // Modern Web / Accessibility standards
    expect(html).toContain('overscroll-contain');
    expect(html).toContain('h-[100svh] max-h-[100svh]');
    expect(html).toContain('role="status" aria-live="polite" class="sr-only"');
  });

  it('renders nothing when HotLeadDetailDrawer is closed or lead is null', () => {
    const htmlClosed = renderToString(
      <HotLeadDetailDrawer
        isOpen={false}
        lead={HOT_LEADS_DATA[0]}
        onClose={() => {}}
      />
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToString(
      <HotLeadDetailDrawer
        isOpen={true}
        lead={null}
        onClose={() => {}}
      />
    );
    expect(htmlNull).toBe('');
  });
});
