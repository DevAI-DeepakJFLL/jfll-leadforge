import { describe, it, expect } from 'vitest';
import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import {
  queryJfllCustomers,
  exportJfllCustomersCsv,
  isValidPhoneNumber,
} from '@/services/jfllCustomerService';
import { formatPhoneNumber } from '@/components/jfll/JfllCustomerTable';

describe('JFLL Customers Dataset & Query Service', () => {
  it('loads 578 active customer records with complete schemas and validated activity attributes', () => {
    expect(JFLL_CUSTOMERS_DATA.length).toBe(578);
    JFLL_CUSTOMERS_DATA.forEach((c) => {
      expect(c.id).toBeDefined();
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(c.status).toBe('Active');
      expect(c.customerGroup.length).toBeGreaterThan(0);
      expect(c.type.length).toBeGreaterThan(0);
      expect(c.territory).toBe('All Territories');
      expect(!!c.mobileNumber || !!c.email || !!c.contactPersonName || !!c.creditStatus).toBe(true);
    });
  });

  it('paginates correctly on default parameters', () => {
    const res = queryJfllCustomers({ page: 1, limit: 25 });
    expect(res.totalEstimate).toBe(578);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(25);
    expect(res.items.length).toBe(25);
    expect(res.totalPages).toBe(Math.ceil(578 / 25));
    expect(res.audienceCounts.all).toBe(578);
  });

  it('filters accurately by Customer Group (Subagent & Shipper)', () => {
    const subagentsRes = queryJfllCustomers({ customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(315);
    subagentsRes.items.forEach((c) => expect(c.customerGroup).toBe('Subagent'));

    const shippersRes = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersRes.totalEstimate).toBe(229);
    shippersRes.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));
  });

  it('filters accurately by Contact Readiness', () => {
    const phoneRes = queryJfllCustomers({ hasPhone: true });
    expect(phoneRes.totalEstimate).toBe(447);
    phoneRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
    });

    const emailRes = queryJfllCustomers({ hasEmail: true });
    expect(emailRes.totalEstimate).toBe(486);
    emailRes.items.forEach((c) => {
      expect(c.email).toBeTruthy();
    });

    const contactRes = queryJfllCustomers({ hasContactPerson: true });
    expect(contactRes.totalEstimate).toBe(493);
    contactRes.items.forEach((c) => {
      expect(c.contactPersonName).toBeTruthy();
    });
  });

  it('searches across Company Name, Contact Person, and Email', () => {
    const nameSearch = queryJfllCustomers({ q: '3S PHARMACEUTICALS' });
    expect(nameSearch.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(nameSearch.items.some((c) => c.fullName.includes('3S PHARMACEUTICALS'))).toBe(true);

    const contactSearch = queryJfllCustomers({ q: 'Priyanka' });
    expect(contactSearch.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(contactSearch.items.some((c) => c.contactPersonName === 'Priyanka')).toBe(true);
  });

  it('supports Audience Quick Tabs', () => {
    const subagentsTab = queryJfllCustomers({ tab: 'subagents' });
    expect(subagentsTab.totalEstimate).toBe(315);

    const shippersTab = queryJfllCustomers({ tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(229);

    const overseasTab = queryJfllCustomers({ tab: 'overseas' });
    expect(overseasTab.totalEstimate).toBe(25);

    const contactsTab = queryJfllCustomers({ tab: 'with-contacts' });
    expect(contactsTab.totalEstimate).toBe(505);
  });

  it('updates audienceCounts dynamically based on active filters and search queries', () => {
    // When filtered by customer group
    const shippersFilter = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersFilter.audienceCounts.all).toBe(229);
    expect(shippersFilter.audienceCounts.shippers).toBe(229);
    expect(shippersFilter.audienceCounts.subagents).toBe(0);
    expect(shippersFilter.audienceCounts.overseas).toBe(0);

    // When filtered by phone readiness
    const phoneFilter = queryJfllCustomers({ hasPhone: true });
    expect(phoneFilter.audienceCounts.all).toBe(447);
    expect(phoneFilter.audienceCounts.all).toBeLessThan(578);

    // When search query is entered
    const searchFilter = queryJfllCustomers({ q: '3S PHARMACEUTICALS' });
    expect(searchFilter.audienceCounts.all).toBe(searchFilter.totalEstimate);
    expect(searchFilter.audienceCounts.all).toBeLessThan(10);
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
    expect(groupLabels).toContain('Overseas Agent');

    const subagent = groupFacets.find((g) => g.label === 'Subagent');
    expect(subagent?.count).toBe(315);

    // Sum of group facet counts should equal total dataset count
    const totalGroupCount = groupFacets.reduce((acc, g) => acc + g.count, 0);
    expect(totalGroupCount).toBe(578);

    // Verify Legal Types
    const totalTypeCount = typeFacets.reduce((acc, t) => acc + t.count, 0);
    expect(totalTypeCount).toBe(578);
  });

  it('loads 2,279 Inactive Customer records and supports Inactive sub-tabs and DataMyne matching', async () => {
    const { JFLL_INACTIVE_CUSTOMERS_DATA } = await import('@/data/jfllInactiveCustomersData');
    expect(JFLL_INACTIVE_CUSTOMERS_DATA.length).toBe(2279);

    JFLL_INACTIVE_CUSTOMERS_DATA.forEach((c) => {
      expect(c.status).toBe('Not Active');
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(!!c.mobileNumber || !!c.email || !!c.contactPersonName).toBe(true);
    });

    const inactiveQuery = queryJfllCustomers({ customerStatus: 'inactive', page: 1, limit: 25 });
    expect(inactiveQuery.totalEstimate).toBe(2279);
    expect(inactiveQuery.audienceCounts.all).toBe(2279);
    expect(inactiveQuery.audienceCounts.datamyneLeads).toBe(391);
    expect(inactiveQuery.audienceCounts.archive).toBe(1888);

    // DataMyne leads sub-tab
    const dmTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'datamyne-leads' });
    expect(dmTab.totalEstimate).toBe(391);
    dmTab.items.forEach((c) => expect(c.inDataMyne).toBe(true));

    // Archive sub-tab
    const archiveTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'archive' });
    expect(archiveTab.totalEstimate).toBe(1888);
    archiveTab.items.forEach((c) => expect(c.inDataMyne).toBe(false));

    // Search within inactive customers
    const searchRes = queryJfllCustomers({ customerStatus: 'inactive', q: 'SG GLOBAL LOGISTICS' });
    expect(searchRes.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(searchRes.items[0].fullName).toContain('SG GLOBAL LOGISTICS');

    // Customer group filter for inactive
    const inactiveGroupRes = queryJfllCustomers({
      customerStatus: 'inactive',
      customerGroups: ['Inactive (DataMyne Match)'],
    });
    expect(inactiveGroupRes.totalEstimate).toBe(391);
    inactiveGroupRes.items.forEach((c) => expect(c.customerGroup).toBe('Inactive (DataMyne Match)'));

    // Contact readiness filter for inactive
    const phoneFilterRes = queryJfllCustomers({ customerStatus: 'inactive', hasPhone: true });
    expect(phoneFilterRes.totalEstimate).toBe(2132);
    phoneFilterRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
      expect(c.mobileNumber).not.toBe('-');
      expect(c.mobileNumber).not.toBe('+91-');
    });
  });

  it('computes contact readiness facet counts accurately for active, inactive, and all datasets', async () => {
    const {
      getContactReadinessFacetCounts,
      getCustomerGroupFacetCounts,
      getLegalTypeFacetCounts,
    } = await import('@/services/jfllCustomerService');
    const activeCounts = getContactReadinessFacetCounts('active');
    expect(activeCounts.hasContactPerson).toBe(493);
    expect(activeCounts.hasPhone).toBe(447);
    expect(activeCounts.hasEmail).toBe(486);

    const inactiveCounts = getContactReadinessFacetCounts('inactive');
    expect(inactiveCounts.hasContactPerson).toBe(2279);
    expect(inactiveCounts.hasPhone).toBe(2132);
    expect(inactiveCounts.hasEmail).toBe(2162);

    const allCounts = getContactReadinessFacetCounts('all');
    expect(allCounts.hasContactPerson).toBe(493 + 2279);
    expect(allCounts.hasPhone).toBe(447 + 2132);
    expect(allCounts.hasEmail).toBe(486 + 2162);

    const allGroups = getCustomerGroupFacetCounts('all');
    expect(allGroups.length).toBeGreaterThanOrEqual(4);
    const totalGroupCount = allGroups.reduce((acc, g) => acc + g.count, 0);
    expect(totalGroupCount).toBe(2857);

    const allTypes = getLegalTypeFacetCounts('all');
    const totalTypeCount = allTypes.reduce((acc, t) => acc + t.count, 0);
    expect(totalTypeCount).toBe(2857);
  });

  it('filters accurately by Credit Status and computes facet counts', async () => {
    const { getCreditStatusFacetCounts } = await import('@/services/jfllCustomerService');
    const creditFacets = getCreditStatusFacetCounts('active');
    expect(creditFacets.length).toBe(5);

    const approvedFacet = creditFacets.find((f) => f.value === 'approved');
    expect(approvedFacet?.count).toBe(400);
    expect(approvedFacet?.label).toBe('Approved');

    const blockedFacet = creditFacets.find((f) => f.value === 'blocked');
    expect(blockedFacet?.count).toBe(58);
    expect(blockedFacet?.label).toBe('Blocked');

    const totalCreditCount = creditFacets.reduce((acc, f) => acc + f.count, 0);
    expect(totalCreditCount).toBe(578);

    // Filter single credit status
    const approvedRes = queryJfllCustomers({ creditStatuses: ['approved'] });
    expect(approvedRes.totalEstimate).toBe(400);
    approvedRes.items.forEach((c) => expect(c.creditStatus).toBe('approved'));

    // Filter multi credit status
    const riskRes = queryJfllCustomers({ creditStatuses: ['high_risk', 'blocked'] });
    expect(riskRes.totalEstimate).toBe(58 + 25);
    riskRes.items.forEach((c) => expect(['high_risk', 'blocked']).toContain(c.creditStatus));
  });

  it('supports unified "all" customer status combining active and inactive accounts (2,857 total)', () => {
    const allQuery = queryJfllCustomers({ customerStatus: 'all', page: 1, limit: 25 });
    expect(allQuery.totalEstimate).toBe(2857);
    expect(allQuery.page).toBe(1);
    expect(allQuery.limit).toBe(25);
    expect(allQuery.items.length).toBe(25);
    expect(allQuery.totalPages).toBe(Math.ceil(2857 / 25));

    // Audience counts in "all" mode
    expect(allQuery.audienceCounts.all).toBe(2857);
    expect(allQuery.audienceCounts.shippers).toBe(229);
    expect(allQuery.audienceCounts.subagents).toBe(315);
    expect(allQuery.audienceCounts.overseas).toBe(25);
    expect(allQuery.audienceCounts.datamyneLeads).toBe(391);
    expect(allQuery.audienceCounts.archive).toBe(1888);
    expect(allQuery.audienceCounts.withContacts).toBe(2784);
    expect(allQuery.audienceCounts.activeTotal).toBe(578);
    expect(allQuery.audienceCounts.inactiveTotal).toBe(2279);
    expect(allQuery.audienceCounts.allTotal).toBe(2857);

    // Quick sub-tabs in "all" mode
    const shippersTab = queryJfllCustomers({ customerStatus: 'all', tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(229);
    shippersTab.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));

    const dmTab = queryJfllCustomers({ customerStatus: 'all', tab: 'datamyne-leads' });
    expect(dmTab.totalEstimate).toBe(391);
    dmTab.items.forEach((c) => expect(c.inDataMyne).toBe(true));

    const archiveTab = queryJfllCustomers({ customerStatus: 'all', tab: 'archive' });
    expect(archiveTab.totalEstimate).toBe(1888);
    archiveTab.items.forEach((c) => {
      expect(c.status).toBe('Not Active');
      expect(c.inDataMyne).toBeFalsy();
    });

    // Contains both Active and Inactive items
    const hasActive = allQuery.items.some((c) => c.status === 'Active');
    expect(hasActive).toBe(true);

    // Filter by customer group across combined dataset
    const subagentsRes = queryJfllCustomers({ customerStatus: 'all', customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(315);

    // Search query across combined dataset
    const searchActive = queryJfllCustomers({ customerStatus: 'all', q: '3S PHARMACEUTICALS' });
    expect(searchActive.totalEstimate).toBeGreaterThanOrEqual(1);

    const searchInactive = queryJfllCustomers({ customerStatus: 'all', q: 'SG GLOBAL LOGISTICS' });
    expect(searchInactive.totalEstimate).toBeGreaterThanOrEqual(1);
  });

  it('computes exact sales person facet counts and filters by sales person', async () => {
    const { getSalesPersonFacetCounts } = await import('@/services/jfllCustomerService');
    const facets = getSalesPersonFacetCounts('active');

    expect(facets.length).toBeGreaterThanOrEqual(60);
    // Verified top representatives
    const top = facets[0];
    expect(top.label).toBe('Narendra Gupta');
    expect(top.count).toBe(56);

    const irfan = facets.find((f) => f.label === 'Irfan Shaikh');
    expect(irfan?.count).toBe(48);

    const samuel = facets.find((f) => f.label === 'Samuel Prabhu');
    expect(samuel?.count).toBe(35);

    // Single sales person filter
    const singleRes = queryJfllCustomers({
      customerStatus: 'active',
      salesPersons: ['Narendra Gupta'],
    });
    expect(singleRes.totalEstimate).toBe(56);
    singleRes.items.forEach((c) => {
      expect(c.salesPerson).toBe('Narendra Gupta');
    });

    // Multi-select sales persons filter
    const multiRes = queryJfllCustomers({
      customerStatus: 'active',
      salesPersons: ['Irfan Shaikh', 'Samuel Prabhu'],
    });
    expect(multiRes.totalEstimate).toBe(83);
    multiRes.items.forEach((c) => {
      expect(['Irfan Shaikh', 'Samuel Prabhu']).toContain(c.salesPerson);
    });

    // Substring / search query matches sales person
    const searchRes = queryJfllCustomers({
      customerStatus: 'active',
      q: 'Narendra Gupta',
    });
    expect(searchRes.totalEstimate).toBeGreaterThanOrEqual(56);
  });
});

