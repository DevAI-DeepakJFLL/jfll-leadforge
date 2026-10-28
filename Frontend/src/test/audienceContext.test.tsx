import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';
import { SegmentContextBanner } from '@/components/ui/SegmentContextBanner';
import { JfllCustomerAudienceTabs } from '@/components/jfll/JfllCustomerAudienceTabs';
import { ApolloAudienceTabs } from '@/components/apollo/ApolloAudienceTabs';
import { DatamyneAudienceTabs } from '@/components/datamyne/DatamyneAudienceTabs';
import { DatamyneSegmentSwitcher } from '@/components/datamyne/DatamyneSegmentSwitcher';

describe('Audience Context & Subcategory Explanations Suite', () => {
  it('renders CategoryInfoTooltip with accessibility attributes and info icon', () => {
    const html = renderToString(
      <CategoryInfoTooltip
        title="Archived Accounts"
        description="Legacy inactive accounts that do NOT appear in current customs trade databases."
        criteria={['in_datamyne = false', 'Account is dormant or ceased shipping']}
        actionTip="Do not run cold outreach campaigns here; focus on DataMyne Verified Leads."
        badge={{ text: 'Historical Record', variant: 'amber' }}
      />
    );

    expect(html).toContain('aria-label="More information about Archived Accounts"');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('renders CategoryInfoTooltip wrapping custom children like an icon', () => {
    const html = renderToString(
      <CategoryInfoTooltip
        title="Logistics Verticals (9 Sectors)"
        description="Complete dataset of 37,273 Indian international customs shippers."
        badge={{ text: '9 Verticals', variant: 'blue' }}
      >
        <span data-testid="custom-icon">ICON</span>
      </CategoryInfoTooltip>
    );

    expect(html).toContain('data-testid="custom-icon"');
    expect(html).toContain('aria-label="More information about Logistics Verticals (9 Sectors)"');
  });

  it('renders SegmentContextBanner with title, count, criteria, and sales tips', () => {
    const html = renderToString(
      <SegmentContextBanner
        title="Archived Accounts"
        count={1595}
        description="Legacy inactive accounts that do NOT appear in current customs shipment databases."
        criteria="in_datamyne = false • Account is dormant or ceased shipping"
        actionTip="Preserved for historical lookups. Focus active sales on DataMyne Verified Leads."
        variant="amber"
      />
    );

    expect(html).toContain('Archived Accounts');
    expect(html).toContain('1,595');
    expect(html).toContain('Legacy inactive accounts that do NOT appear');
    expect(html).toContain('Details &amp; Guidance');
    expect(html).toContain('Dismiss banner');
  });

  it('renders JfllCustomerAudienceTabs in Inactive mode with Archived Accounts, DataMyne Leads, and Info tooltips', () => {
    const html = renderToString(
      <JfllCustomerAudienceTabs
        customerStatus="inactive"
        activeTab="archive"
        counts={{
          all: 2010,
          shippers: 0,
          subagents: 0,
          overseas: 0,
          withContacts: 2010,
          datamyneLeads: 415,
          archive: 1595,
          activeTotal: 728,
          inactiveTotal: 2010,
        }}
      />
    );

    // Verify sub-tabs and context badge
    expect(html).toContain('Archived Accounts');
    expect(html).toContain('1,595');
    expect(html).toContain('DataMyne Verified Leads');
    expect(html).toContain('415');
    expect(html).toContain('All Inactive Customers');
    expect(html).toContain('2,010');
    expect(html).toContain('Reactivation Prospects (Active Customers Purged)');
    // Verify info row banner is removed
    expect(html).not.toContain('Legacy inactive accounts that do NOT appear in current customs shipment databases');
  });

  it('renders JfllCustomerAudienceTabs in Active mode with verified internal master context', () => {
    const html = renderToString(
      <JfllCustomerAudienceTabs
        customerStatus="active"
        activeTab="shippers"
        counts={{
          all: 728,
          shippers: 285,
          subagents: 397,
          overseas: 39,
          withContacts: 728,
          activeTotal: 728,
          inactiveTotal: 2010,
        }}
      />
    );

    expect(html).toContain('Shippers &amp; Consignees');
    expect(html).toContain('285');
    expect(html).toContain('Subagents');
    expect(html).toContain('397');
    expect(html).toContain('Verified Internal Master');
    // Verify info row banner is removed
    expect(html).not.toContain('Direct cargo owners, commercial manufacturers');
  });

  it('renders JfllCustomerAudienceTabs in All mode with Unified Master Directory context', () => {
    const html = renderToString(
      <JfllCustomerAudienceTabs
        customerStatus="all"
        activeTab="all"
        counts={{
          all: 2738,
          shippers: 285,
          subagents: 389,
          overseas: 39,
          withContacts: 2738,
          datamyneLeads: 415,
          archive: 1595,
          activeTotal: 728,
          inactiveTotal: 2010,
          allTotal: 2738,
        }}
        totalFormatted="2,738"
      />
    );

    expect(html).toContain('All Customers');
    expect(html).toContain('2,738');
    expect(html).toContain('Active Customers');
    expect(html).toContain('728');
    expect(html).toContain('Inactive Customers');
    expect(html).toContain('2,010');
    expect(html).toContain('Unified Master Directory (All 2,738 Accounts)');
    expect(html).not.toContain('Unified master directory combining all 2,738 active and inactive accounts');
  });

  it('renders ApolloAudienceTabs with updated deduplicated counts and contextual info triggers', () => {
    const html = renderToString(
      <ApolloAudienceTabs
        activeTab="all"
        counts={{
          all: 686700,
          high_headcount: 23540,
          high_revenue: 82451,
          top_cargo_verticals: 123208,
          with_website_linkedin: 656045,
        }}
        totalFormatted="686.7k"
      />
    );

    expect(html).toContain('All Commercial Shippers');
    expect(html).toContain('686.7k');
    expect(html).toContain('Large Scale (100+ Staff)');
    expect(html).toContain('High Revenue ($10M+)');
    expect(html).toContain('Top Cargo Verticals');
    expect(html).toContain('Executive Ready');
    expect(html).toContain('Global commercial organizations database, 100% sanitized');
  });

  it('renders DatamyneSegmentSwitcher and DatamyneAudienceTabs with vertical descriptions and criteria', () => {
    const switcherHtml = renderToString(
      <DatamyneSegmentSwitcher
        activeDataset="valid"
        onChangeDataset={() => {}}
        validCount={19760}
        missingCount={17513}
        allCount={37273}
      />
    );

    expect(switcherHtml).toContain('With Contacts');
    expect(switcherHtml).toContain('19,760');
    expect(switcherHtml).toContain('Without Contacts');
    expect(switcherHtml).toContain('17,513');
    expect(switcherHtml).toContain('All Leads');
    expect(switcherHtml).toContain('37,273');

    const tabsHtml = renderToString(
      <DatamyneAudienceTabs
        activeTab="perishables"
        activeDataset="valid"
        onChangeDataset={() => {}}
        totalFormatted="19,760"
      />
    );

    expect(tabsHtml).toContain('Perishables');
    expect(tabsHtml).toContain('Pharma &amp; Health');
    expect(tabsHtml).toContain('Textiles &amp; Apparel');
    expect(tabsHtml).toContain('Engineering &amp; Mach');
    expect(tabsHtml).toContain('Time-critical cold-chain cargo');
  });
});
