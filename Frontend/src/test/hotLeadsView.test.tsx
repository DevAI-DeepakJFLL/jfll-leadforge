import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { HOT_LEADS_DATA } from '@/data/hotLeadsData';
import {
  computeHotLeadsMetrics,
  filterHotLeadsInMemory,
  formatInrCurrency,
  hasHotLeadContact,
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
    expect(metrics.inactiveWithContactsCount).toBe(6);
    expect(metrics.inactiveWithoutContactsCount).toBe(2);

    expect(metrics.activeCount).toBe(14);
    expect(metrics.activeWithContactsCount).toBe(12);
    expect(metrics.activeWithoutContactsCount).toBe(2);

    expect(metrics.withContactsCount).toBe(39);
    expect(metrics.withoutContactsCount).toBe(21);

    // Backward compatibility aliases
    expect(metrics.prospectsCount).toBe(38);
    expect(metrics.reactivationsCount).toBe(8);
    expect(metrics.decisionMakersCount).toBe(39);
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

    // JFLL Inactive (8 total: 6 with contacts, 2 without)
    const inactive = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive' });
    expect(inactive.totalRecords).toBe(8);

    const inactiveWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive-with-contacts' });
    expect(inactiveWithContacts.totalRecords).toBe(6);

    const inactiveWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'inactive-without-contacts' });
    expect(inactiveWithoutContacts.totalRecords).toBe(2);

    // JFLL Active (14 total: 12 with contacts, 2 without)
    const active = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active' });
    expect(active.totalRecords).toBe(14);

    const activeWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active-with-contacts' });
    expect(activeWithContacts.totalRecords).toBe(12);

    const activeWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'active-without-contacts' });
    expect(activeWithoutContacts.totalRecords).toBe(2);

    // Overall With Contacts (39) and Without Contacts (21)
    const allWithContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'with-contacts' });
    expect(allWithContacts.totalRecords).toBe(39);

    const allWithoutContacts = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'without-contacts' });
    expect(allWithoutContacts.totalRecords).toBe(21);

    // Legacy segment aliases
    const legacyProspects = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'prospects' });
    expect(legacyProspects.totalRecords).toBe(38);

    const legacyReactivations = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'reactivations' });
    expect(legacyReactivations.totalRecords).toBe(8);

    const legacyDms = filterHotLeadsInMemory(HOT_LEADS_DATA, { segment: 'with-decision-makers' });
    expect(legacyDms.totalRecords).toBe(39);
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

  it('correctly classifies inactive records with phone or email as with-contacts (e.g. Linkers and Farthest)', () => {
    const linkers = HOT_LEADS_DATA.find((item) => item.srNo === 31);
    expect(linkers).toBeDefined();
    expect(linkers?.apolloDecisionMaker).toBe('-');
    expect(linkers?.phone).toBeTruthy();
    expect(linkers?.email).toBeTruthy();
    expect(hasHotLeadContact(linkers!)).toBe(true);

    const farthest = HOT_LEADS_DATA.find((item) => item.srNo === 34);
    expect(farthest).toBeDefined();
    expect(farthest?.apolloDecisionMaker).toBe('-');
    expect(farthest?.phone).toBeTruthy();
    expect(farthest?.email).toBeTruthy();
    expect(hasHotLeadContact(farthest!)).toBe(true);
  });

  it('supports multi-region filtering and scoped metrics across hubs', () => {
    // Delhi NCR returns 60 active enterprise records
    const delhiRes = filterHotLeadsInMemory(HOT_LEADS_DATA, { region: 'delhi' });
    expect(delhiRes.totalRecords).toBe(60);
    expect(delhiRes.items.every((i) => i.region === 'Delhi NCR')).toBe(true);

    const delhiMetrics = computeHotLeadsMetrics(HOT_LEADS_DATA, 'delhi');
    expect(delhiMetrics.totalCount).toBe(60);
    expect(delhiMetrics.totalTurnover).toBe(476606748);
    expect(delhiMetrics.regionBreakdown?.delhi?.count).toBe(60);
    expect(delhiMetrics.regionBreakdown?.delhi?.turnover).toBe(476606748);

    // Consolidated 'all' returns all accounts
    const allRes = filterHotLeadsInMemory(HOT_LEADS_DATA, { region: 'all' });
    expect(allRes.totalRecords).toBe(60);

    // Upcoming hubs return empty list and zeroed metrics cleanly
    const mumbaiRes = filterHotLeadsInMemory(HOT_LEADS_DATA, { region: 'mumbai' });
    expect(mumbaiRes.totalRecords).toBe(0);
    expect(mumbaiRes.items).toEqual([]);

    const mumbaiMetrics = computeHotLeadsMetrics(HOT_LEADS_DATA, 'mumbai');
    expect(mumbaiMetrics.totalCount).toBe(0);
    expect(mumbaiMetrics.totalTurnover).toBe(0);
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
    expect(html).toContain('With Contacts (39)');
    expect(html).toContain('Without Contacts (21)');

    // Table headers adopting JLL format with Region / Hub column
    expect(html).toContain('Company Name');
    expect(html).toContain('Region / Hub');
    expect(html).toContain('Annual Turnover');
    expect(html).toContain('Status');
    expect(html).toContain('Contact Person');
    expect(html).toContain('Phone Number');
    expect(html).toContain('Email');
    expect(html).toContain('Action');

    // Region pill in table row
    expect(html).toContain('Delhi NCR');

    // Multi-region sourcing hub selector rendered
    expect(html).toContain('Sourcing Hub:');
    expect(html).toContain('All Regions');
    expect(html).toContain('Mumbai &amp; Western');
    expect(html).toContain('Gujarat Corridor');
    expect(html).toContain('South India');
    expect(html).toContain('Kolkata &amp; Eastern');

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

  it('renders scheduled ingestion pipeline preview for upcoming regional hubs', () => {
    const html = renderToString(<HotLeadsView initialRegion="mumbai" />);

    expect(html).toContain('Mumbai &amp; Western Sourcing Hub');
    expect(html).toContain('Scheduled Ingestion: Q1 Ingestion');
    expect(html).toContain('Target Trade Gateways &amp; Logistics Hubs:');
    expect(html).toContain('JNPT (Nhava Sheva Ocean Port)');
    expect(html).toContain('BOM (Chhatrapati Shivaji Maharaj Air Cargo)');
    expect(html).toContain('View Delhi NCR Accounts (60 Active)');
    expect(html).toContain('View All Regions');
  });

  it('renders region badge in HotLeadDetailDrawer', () => {
    const sampleLead = HOT_LEADS_DATA[0];
    const html = renderToString(
      <HotLeadDetailDrawer
        isOpen={true}
        lead={sampleLead}
        onClose={() => {}}
      />
    );
    expect(html).toContain('Delhi NCR');
  });

  it('renders inline contact editing triggers: Add Phone button for missing contacts and Edit buttons in table and drawer', () => {
    const html = renderToString(<HotLeadsView />);

    // Add Phone button for accounts with missing phone numbers
    expect(html).toContain('Add Phone');
    expect(html).toContain('Add missing contact number (persists to DB)');

    // Add Contact button for missing contact persons
    expect(html).toContain('Add Contact');

    // Add Email button for missing emails
    expect(html).toContain('Add Email');

    // Drawer renders Edit Contacts button for coordinator database persistence
    const sampleLead = HOT_LEADS_DATA[0];
    const drawerHtml = renderToString(
      <HotLeadDetailDrawer
        isOpen={true}
        lead={sampleLead}
        onClose={() => {}}
      />
    );
    expect(drawerHtml).toContain('Edit Contacts');
    expect(drawerHtml).toContain('Edit contact details (persists directly to database)');
  });
});
