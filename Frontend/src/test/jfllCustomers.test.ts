import { describe, it, expect } from 'vitest';
import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import {
  queryJfllCustomers,
  exportJfllCustomersCsv,
  isValidPhoneNumber,
} from '@/services/jfllCustomerService';
import { formatPhoneNumber } from '@/components/jfll/JfllCustomerTable';

describe('JFLL Customers Dataset & Query Service', () => {
  it('loads 728 deduplicated active customer records with complete schemas and at least phone or email', () => {
    expect(JFLL_CUSTOMERS_DATA.length).toBe(728);
    JFLL_CUSTOMERS_DATA.forEach((c) => {
      expect(c.id).toBeDefined();
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(c.status).toBe('Active');
      expect(c.customerGroup.length).toBeGreaterThan(0);
      expect(c.type.length).toBeGreaterThan(0);
      expect(c.territory).toBe('All Territories');
      // Must have at least phone or email
      expect(!!c.mobileNumber || !!c.email).toBe(true);
    });
  });

  it('paginates correctly on default parameters', () => {
    const res = queryJfllCustomers({ page: 1, limit: 25 });
    expect(res.totalEstimate).toBe(728);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(25);
    expect(res.items.length).toBe(25);
    expect(res.totalPages).toBe(Math.ceil(728 / 25));
    expect(res.audienceCounts.all).toBe(728);
  });

  it('filters accurately by Customer Group (Subagent & Shipper)', () => {
    const subagentsRes = queryJfllCustomers({ customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(389);
    subagentsRes.items.forEach((c) => expect(c.customerGroup).toBe('Subagent'));

    const shippersRes = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersRes.totalEstimate).toBe(285);
    shippersRes.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));
  });

  it('filters accurately by Contact Readiness', () => {
    const phoneRes = queryJfllCustomers({ hasPhone: true });
    expect(phoneRes.totalEstimate).toBe(655);
    phoneRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
    });

    const emailRes = queryJfllCustomers({ hasEmail: true });
    expect(emailRes.totalEstimate).toBe(703);
    emailRes.items.forEach((c) => {
      expect(c.email).toBeTruthy();
    });

    const contactRes = queryJfllCustomers({ hasContactPerson: true });
    expect(contactRes.totalEstimate).toBe(728);
    contactRes.items.forEach((c) => {
      expect(c.contactPersonName).toBeTruthy();
    });
  });

  it('searches across Company Name, Contact Person, and Email', () => {
    const nameSearch = queryJfllCustomers({ q: '3S CORPORATION' });
    expect(nameSearch.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(nameSearch.items.some((c) => c.fullName.includes('3S CORPORATION'))).toBe(true);

    const contactSearch = queryJfllCustomers({ q: 'Priyanka' });
    expect(contactSearch.totalEstimate).toBeGreaterThanOrEqual(2);
    expect(contactSearch.items.some((c) => c.contactPersonName === 'Priyanka')).toBe(true);
  });

  it('supports Audience Quick Tabs', () => {
    const subagentsTab = queryJfllCustomers({ tab: 'subagents' });
    expect(subagentsTab.totalEstimate).toBe(389);

    const shippersTab = queryJfllCustomers({ tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(285);

    const overseasTab = queryJfllCustomers({ tab: 'overseas' });
    expect(overseasTab.totalEstimate).toBe(39);

    const contactsTab = queryJfllCustomers({ tab: 'with-contacts' });
    expect(contactsTab.totalEstimate).toBe(728);
  });

  it('exports sanitized CSV preventing formula injection', async () => {
    const sample = [
      {
        id: 'test-1',
        fullName: '=SUM(A1:A10)',
        territory: 'All Territories',
        contactPersonName: '+919999999999',
        mobileNumber: '-1000',
        email: '@malicious.com',
        status: 'Active' as const,
        customerGroup: 'Subagent',
        type: 'Company',
        saved: false,
      },
    ];

    const blob = exportJfllCustomersCsv(sample);
    const text = await blob.text();

    // Dangerous formula prefixes must be escaped with single quote inside quotes
    expect(text).toContain('"\'=SUM(A1:A10)"');
    expect(text).toContain('"\'=SUM(A1:A10)"');
    expect(text).toContain('"\'@malicious.com"');
  });

  it('formats phone numbers by stripping +91 prefix consistently', () => {
    expect(formatPhoneNumber('+91-9821230317')?.number).toBe('9821230317');
    expect(formatPhoneNumber('+91 9821230317')?.number).toBe('9821230317');
    expect(formatPhoneNumber('91-9821230317')?.number).toBe('9821230317');
    expect(formatPhoneNumber('-9810926644')?.number).toBe('9810926644');
    expect(formatPhoneNumber(null)).toBeNull();
    expect(formatPhoneNumber('-')).toBeNull();
    expect(formatPhoneNumber('--')).toBeNull();
    expect(formatPhoneNumber('---')).toBeNull();
    expect(formatPhoneNumber('+91-')).toBeNull();
    expect(formatPhoneNumber('+91')).toBeNull();
    expect(formatPhoneNumber('N/A')).toBeNull();
    expect(formatPhoneNumber('null')).toBeNull();
  });

  it('validates phone numbers rejecting placeholders and accepting valid numbers', () => {
    expect(isValidPhoneNumber('+91-9821230317')).toBe(true);
    expect(isValidPhoneNumber('9821230317')).toBe(true);
    expect(isValidPhoneNumber('+91-2242643060')).toBe(true);
    expect(isValidPhoneNumber('-')).toBe(false);
    expect(isValidPhoneNumber('--')).toBe(false);
    expect(isValidPhoneNumber('---')).toBe(false);
    expect(isValidPhoneNumber('+91-')).toBe(false);
    expect(isValidPhoneNumber('+91')).toBe(false);
    expect(isValidPhoneNumber('N/A')).toBe(false);
    expect(isValidPhoneNumber('NA')).toBe(false);
    expect(isValidPhoneNumber('null')).toBe(false);
    expect(isValidPhoneNumber('none')).toBe(false);
    expect(isValidPhoneNumber(null)).toBe(false);
    expect(isValidPhoneNumber(undefined)).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
  });

  it('computes exact dynamic facet counts matching dataset records', async () => {
    const { getCustomerGroupFacetCounts, getLegalTypeFacetCounts } = await import('@/services/jfllCustomerService');
    const groupFacets = getCustomerGroupFacetCounts('active');
    const typeFacets = getLegalTypeFacetCounts('active');

    // Verify Customer Groups
    const groupLabels = groupFacets.map((g) => g.label);
    expect(groupLabels).not.toContain('Custom Broker');
    expect(groupLabels).toContain('Subagent');
    expect(groupLabels).toContain('Shipper / Consignee');
    expect(groupLabels).toContain('Transporter');
    expect(groupLabels).toContain('Shipping Line');

    const subagent = groupFacets.find((g) => g.label === 'Subagent');
    expect(subagent?.count).toBe(389);

    // Sum of group facet counts should equal total dataset count
    const totalGroupCount = groupFacets.reduce((acc, g) => acc + g.count, 0);
    expect(totalGroupCount).toBe(728);

    // Verify Legal Types
    const totalTypeCount = typeFacets.reduce((acc, t) => acc + t.count, 0);
    expect(totalTypeCount).toBe(728);
  });

  it('loads 2,010 Inactive Customer records and supports Inactive sub-tabs and DataMyne matching', async () => {
    const { JFLL_INACTIVE_CUSTOMERS_DATA } = await import('@/data/jfllInactiveCustomersData');
    expect(JFLL_INACTIVE_CUSTOMERS_DATA.length).toBe(2010);

    JFLL_INACTIVE_CUSTOMERS_DATA.forEach((c) => {
      expect(c.status).toBe('Not Active');
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(!!c.mobileNumber || !!c.email).toBe(true);
    });

    const inactiveQuery = queryJfllCustomers({ customerStatus: 'inactive', page: 1, limit: 25 });
    expect(inactiveQuery.totalEstimate).toBe(2010);
    expect(inactiveQuery.audienceCounts.all).toBe(2010);
    expect(inactiveQuery.audienceCounts.datamyneLeads).toBe(415);
    expect(inactiveQuery.audienceCounts.archive).toBe(1595);

    // DataMyne leads sub-tab
    const dmTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'datamyne-leads' });
    expect(dmTab.totalEstimate).toBe(415);
    dmTab.items.forEach((c) => expect(c.inDataMyne).toBe(true));

    // Archive sub-tab
    const archiveTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'archive' });
    expect(archiveTab.totalEstimate).toBe(1595);
    archiveTab.items.forEach((c) => expect(c.inDataMyne).toBe(false));

    // Search within inactive customers
    const searchRes = queryJfllCustomers({ customerStatus: 'inactive', q: 'RAO CLEARING' });
    expect(searchRes.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(searchRes.items[0].fullName).toContain('RAO CLEARING');

    // Customer group filter for inactive
    const inactiveGroupRes = queryJfllCustomers({
      customerStatus: 'inactive',
      customerGroups: ['Inactive (DataMyne Match)'],
    });
    expect(inactiveGroupRes.totalEstimate).toBe(415);
    inactiveGroupRes.items.forEach((c) => expect(c.customerGroup).toBe('Inactive (DataMyne Match)'));

    // Contact readiness filter for inactive (1,883 records with valid phone, 127 without phone)
    const phoneFilterRes = queryJfllCustomers({ customerStatus: 'inactive', hasPhone: true });
    expect(phoneFilterRes.totalEstimate).toBe(1883);
    phoneFilterRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
      expect(c.mobileNumber).not.toBe('-');
      expect(c.mobileNumber).not.toBe('+91-');
    });
  });

  it('computes contact readiness facet counts accurately for both active and inactive datasets', async () => {
    const { getContactReadinessFacetCounts } = await import('@/services/jfllCustomerService');
    const activeCounts = getContactReadinessFacetCounts('active');
    expect(activeCounts.hasContactPerson).toBe(728);
    expect(activeCounts.hasPhone).toBe(655);
    expect(activeCounts.hasEmail).toBe(703);

    const inactiveCounts = getContactReadinessFacetCounts('inactive');
    expect(inactiveCounts.hasContactPerson).toBe(2010);
    expect(inactiveCounts.hasPhone).toBe(1883);
    expect(inactiveCounts.hasEmail).toBe(1908);
    expect(inactiveCounts.hasContactPerson + inactiveCounts.hasPhone + inactiveCounts.hasEmail).toBe(5801);
  });
});

