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
  it('computes accurate metrics matching the 60-account tax audit ledger with new taxonomy', () => {
    const metrics = computeHotLeadsMetrics(HOT_LEADS_DATA);
    expect(metrics.totalCount).toBe(60);
    expect(metrics.totalTurnover).toBe(476606748);

    // New labels & sub-splits
    expect(metrics.freshCount).toBe(38);
    expect(metrics.freshWithContactsCount).toBe(21);
    expect(metrics.freshWithoutContactsCount).toBe(17);

    expect(metrics.inactiveCount).toBe(8);
    expect(metrics.inactiveWithContactsCount).toBe(4);
    expect(metrics.inactiveWithoutContactsCount).toBe(4);

    expect(metrics.activeCount).toBe(14);
    expect(metrics.activeWithContactsCount).toBe(7);
    expect(metrics.activeWithoutContactsCount).toBe(7);

    expect(metrics.withContactsCount).toBe(32);
    expect(metrics.withoutContactsCount).toBe(28);

    // Backward compatibility aliases
    expect(metrics.prospectsCount).toBe(38);
    expect(metrics.reactivationsCount).toBe(8);
    expect(metrics.decisionMakersCount).toBe(32);
  });

  it('filters by new taxonomy segments and contact splits correctly', () => {
    // Fresh Data (38 total: 21 with contacts, 17 without)
    const fresh = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'fresh' });
    expect(fresh.totalRecords).toBe(38);

    const freshWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'fresh-with-contacts' });
    expect(freshWithContacts.totalRecords).toBe(21);
    expect(freshWithContacts.items.every((i) => i.apolloDecisionMaker && i.apolloDecisionMaker !== '-')).toBe(true);

    const freshWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'fresh-without-contacts' });
    expect(freshWithoutContacts.totalRecords).toBe(17);
    expect(freshWithoutContacts.items.every((i) => !i.apolloDecisionMaker || i.apolloDecisionMaker === '-')).toBe(true);

    // JFLL Inactive (8 total: 4 with contacts, 4 without)
    const inactive = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive' });
    expect(inactive.totalRecords).toBe(8);

    const inactiveWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive-with-contacts' });
    expect(inactiveWithContacts.totalRecords).toBe(4);

    const inactiveWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive-without-contacts' });
    expect(inactiveWithoutContacts.totalRecords).toBe(4);

    // JFLL Active (14 total: 7 with contacts, 7 without)
    const active = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active' });
    expect(active.totalRecords).toBe(14);

    const activeWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active-with-contacts' });
    expect(activeWithContacts.totalRecords).toBe(7);

    const activeWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active-without-contacts' });
    expect(activeWithoutContacts.totalRecords).toBe(7);

    // Overall With Contacts (32) and Without Contacts (28)
    const allWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'with-contacts' });
    expect(allWithContacts.totalRecords).toBe(32);

    const allWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'without-contacts' });
    expect(allWithoutContacts.totalRecords).toBe(28);

    // Legacy segment aliases
    const legacyProspects = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'prospects' });
    expect(legacyProspects.totalRecords).toBe(38);

    const legacyReactivations = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'reactivations' });
    expect(legacyReactivations.totalRecords).toBe(8);

    const legacyDms = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'with-decision-makers' });
    expect(legacyDms.totalRecords).toBe(32);
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
  it('renders HotLeadsView with updated labels: JFLL Active | JFLL Inactive | Fresh Data split by Contacts and JLL table format', () => {
    const html = renderToString(
      <HotLeadsView />
    );

    expect(html).toContain('Hot High-Turnover Leads');
    expect(html).toContain('60 Enterprise Accounts');
    expect(html).toContain('Verified Annual Turnover');

    // Updated Category Metrics
    expect(html).toContain('JFLL Active');
    expect(html).toContain('JFLL Inactive');
    expect(html).toContain('Fresh Data');
    expect(html).toContain('Contact Coverage');

    // Segment tabs & sub-splits
    expect(html).toContain('All Accounts (60)');
    expect(html).toContain('JFLL Active (14)');
    expect(html).toContain('JFLL Inactive (8)');
    expect(html).toContain('Fresh Data (38)');
    expect(html).toContain('With Contacts (32)');
    expect(html).toContain('Without Contacts (28)');

    // Table headers adopting JLL format (stripped non-salesperson tax clutter like GSTIN)
    expect(html).toContain('Company Name');
    expect(html).toContain('Annual Turnover');
    expect(html).toContain('Status');
    expect(html).toContain('Contact Person');
    expect(html).toContain('Phone Number');
    expect(html).toContain('Email');
    expect(html).toContain('Action');

    // Sample company rendered with decision maker and direct contact
    expect(html).toContain('EMO TRANS LOGISTICS INDIA PRIVATE LIMITED)');
    expect(html).toContain('₹6.12 Cr');
    expect(html).toContain('Sven Frigger');
    expect(html).toContain('Director - Export Compliance');
    expect(html).toContain('sven.frigger@emotrans.com');

    // Active customer with phone and email rendered
    expect(html).toContain('BROWN BULL LOGISTICS PRIVATE LIMITED');
    expect(html).toContain('8657554591');
    expect(html).toContain('kambroggio@brownintegratedlogistics.com');
  });

  it('renders HotLeadDetailDrawer with updated labels and contact badges when open', () => {
    const sampleLead = HOT_LEADS_DATA[0]; // EMO TRANS (Fresh Data with Contacts)
    const html = renderToString(
      <HotLeadDetailDrawer
        isOpen={true}
        lead={sampleLead}
        onClose={() => {}}
      />
    );

    expect(html).toContain(sampleLead.customerName);
    expect(html).toContain(sampleLead.gstin);
    expect(html).toContain('Fresh Data');
    expect(html).toContain('With Contacts');
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

  it('renders flexible layout controls with Maximize Table toggle and sticky headers', () => {
    const html = renderToString(<HotLeadsView />);

    // Maximize Table toggle button
    expect(html).toContain('aria-label="Maximize table vertical space"');
    expect(html).toContain('Maximize Table');

    // Flexible layout and sticky headers
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('overflow-auto flex-1 min-h-0');
    expect(html).toContain('sticky top-0 z-10');
  });
});
