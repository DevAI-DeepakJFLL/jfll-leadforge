import { describe, it, expect, vi } from 'vitest';
import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import { JFLL_INACTIVE_CUSTOMERS_DATA } from '@/data/jfllInactiveCustomersData';
import { JFLL_ALL_CUSTOMERS_DATA } from '@/data/jfllAllCustomersData';
import {
  queryJfllCustomers,
  exportJfllCustomersCsv,
  isValidPhoneNumber,
  getCustomerGroupFacetCounts,
  getLegalTypeFacetCounts,
  getContactReadinessFacetCounts,
  getCreditStatusFacetCounts,
  getSalesPersonFacetCounts,
  getRevenueRangeFacetCounts,
  formatIndianCurrency,
  fetchJfllCustomersFromApi,
} from '@/services/jfllCustomerService';
import { formatPhoneNumber } from '@/components/jfll/JfllCustomerTable';

describe('JFLL Customers Dataset & Query Service', () => {
  it('loads 574 active customer records with complete schemas and validated activity attributes', () => {
    expect(JFLL_CUSTOMERS_DATA.length).toBe(574);
    JFLL_CUSTOMERS_DATA.forEach((c) => {
      expect(c.id).toBeDefined();
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(c.status).toBe('Active');
      expect(c.customerGroup.length).toBeGreaterThan(0);
      expect(c.type.length).toBeGreaterThan(0);
      expect(c.territory).toBe('All Territories');
      expect(!!c.mobileNumber || !!c.email || !!c.contactPersonName || !!c.creditStatus).toBe(true);
      expect(c.totalBusinessTillDate).toBeDefined();
    });
  });

  it('paginates correctly on default parameters', () => {
    const res = queryJfllCustomers({ page: 1, limit: 25 });
    expect(res.totalEstimate).toBe(574);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(25);
    expect(res.items.length).toBe(25);
    expect(res.totalPages).toBe(Math.ceil(574 / 25));
    expect(res.audienceCounts.all).toBe(574);
  });

  it('filters accurately by Customer Group (Subagent & Shipper)', () => {
    const subagentsRes = queryJfllCustomers({ customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(314);
    subagentsRes.items.forEach((c) => expect(c.customerGroup).toBe('Subagent'));

    const shippersRes = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersRes.totalEstimate).toBe(227);
    shippersRes.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));
  });

  it('filters accurately by Contact Readiness', () => {
    const phoneRes = queryJfllCustomers({ hasPhone: true });
    expect(phoneRes.totalEstimate).toBe(443);
    phoneRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
    });

    const emailRes = queryJfllCustomers({ hasEmail: true });
    expect(emailRes.totalEstimate).toBe(483);
    emailRes.items.forEach((c) => {
      expect(c.email).toBeTruthy();
    });

    const contactRes = queryJfllCustomers({ hasContactPerson: true });
    expect(contactRes.totalEstimate).toBe(490);
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
    expect(subagentsTab.totalEstimate).toBe(314);

    const shippersTab = queryJfllCustomers({ tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(227);

    const overseasTab = queryJfllCustomers({ tab: 'overseas' });
    expect(overseasTab.totalEstimate).toBe(24);

    const contactsTab = queryJfllCustomers({ tab: 'with-contacts' });
    expect(contactsTab.totalEstimate).toBe(502);
  });

  it('updates audienceCounts dynamically based on active filters and search queries', () => {
    // When filtered by customer group
    const shippersFilter = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersFilter.audienceCounts.all).toBe(227);
    expect(shippersFilter.audienceCounts.shippers).toBe(227);
    expect(shippersFilter.audienceCounts.subagents).toBe(0);
    expect(shippersFilter.audienceCounts.overseas).toBe(0);

    // When filtered by phone readiness
    const phoneFilter = queryJfllCustomers({ hasPhone: true });
    expect(phoneFilter.audienceCounts.all).toBe(443);
    expect(phoneFilter.audienceCounts.all).toBeLessThan(574);

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
        mergedCount: 1,
      },
    ];

    const blob = exportJfllCustomersCsv(sample);
    const text = await blob.text();

    // Dangerous formula prefixes must be escaped with single quote inside quotes
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

  it('computes exact dynamic facet counts matching dataset records', () => {
    const groupFacets = getCustomerGroupFacetCounts('active');
    const typeFacets = getLegalTypeFacetCounts('active');

    // Verify Customer Groups
    const groupLabels = groupFacets.map((g) => g.label);
    expect(groupLabels).not.toContain('Custom Broker');
    expect(groupLabels).toContain('Subagent');
    expect(groupLabels).toContain('Shipper / Consignee');
    expect(groupLabels).toContain('Overseas Agent');

    const subagent = groupFacets.find((g) => g.label === 'Subagent');
    expect(subagent?.count).toBe(314);

    // Sum of group facet counts should equal total dataset count
    const totalGroupCount = groupFacets.reduce((acc, g) => acc + g.count, 0);
    expect(totalGroupCount).toBe(574);

    // Verify Legal Types
    const totalTypeCount = typeFacets.reduce((acc, t) => acc + t.count, 0);
    expect(totalTypeCount).toBe(574);
  });

  it('loads 1,611 Inactive Customer records and supports Inactive sub-tabs and DataMyne matching', () => {
    expect(JFLL_INACTIVE_CUSTOMERS_DATA.length).toBe(1611);

    JFLL_INACTIVE_CUSTOMERS_DATA.forEach((c) => {
      expect(c.status).toBe('Not Active');
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(!!c.mobileNumber || !!c.email || !!c.contactPersonName || !!c.creditStatus).toBe(true);
      expect(c.totalBusinessTillDate).toBeDefined();
    });

    const inactiveQuery = queryJfllCustomers({ customerStatus: 'inactive', page: 1, limit: 25 });
    expect(inactiveQuery.totalEstimate).toBe(1611);
    expect(inactiveQuery.audienceCounts.all).toBe(1611);
    expect(inactiveQuery.audienceCounts.datamyneLeads).toBe(2);
    expect(inactiveQuery.audienceCounts.archive).toBe(1609);

    // DataMyne leads sub-tab
    const dmTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'datamyne-leads' });
    expect(dmTab.totalEstimate).toBe(2);
    dmTab.items.forEach((c) => expect(c.inDataMyne).toBe(true));

    // Archive sub-tab
    const archiveTab = queryJfllCustomers({ customerStatus: 'inactive', tab: 'archive' });
    expect(archiveTab.totalEstimate).toBe(1609);
    archiveTab.items.forEach((c) => expect(c.inDataMyne).toBe(false));

    // Search within inactive customers
    const searchRes = queryJfllCustomers({ customerStatus: 'inactive', q: 'BLISSON MEDICA' });
    expect(searchRes.totalEstimate).toBeGreaterThanOrEqual(1);
    expect(searchRes.items[0].fullName).toContain('BLISSON MEDICA');

    // Contact readiness filter for inactive
    const phoneFilterRes = queryJfllCustomers({ customerStatus: 'inactive', hasPhone: true });
    expect(phoneFilterRes.totalEstimate).toBe(1180);
    phoneFilterRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
      expect(isValidPhoneNumber(c.mobileNumber)).toBe(true);
      expect(c.mobileNumber).not.toBe('-');
      expect(c.mobileNumber).not.toBe('+91-');
    });
  });

  it('computes contact readiness facet counts accurately for active, inactive, and all datasets', () => {
    const activeCounts = getContactReadinessFacetCounts('active');
    expect(activeCounts.hasContactPerson).toBe(490);
    expect(activeCounts.hasPhone).toBe(443);
    expect(activeCounts.hasEmail).toBe(483);

    const inactiveCounts = getContactReadinessFacetCounts('inactive');
    expect(inactiveCounts.hasContactPerson).toBe(1265);
    expect(inactiveCounts.hasPhone).toBe(1180);
    expect(inactiveCounts.hasEmail).toBe(1193);

    const allCounts = getContactReadinessFacetCounts('all');
    expect(allCounts.hasContactPerson).toBe(1755);
    expect(allCounts.hasPhone).toBe(1623);
    expect(allCounts.hasEmail).toBe(1676);

    const allGroups = getCustomerGroupFacetCounts('all');
    expect(allGroups.length).toBeGreaterThanOrEqual(4);
    const totalGroupCount = allGroups.reduce((acc, g) => acc + g.count, 0);
    expect(totalGroupCount).toBe(2185);

    const allTypes = getLegalTypeFacetCounts('all');
    const totalTypeCount = allTypes.reduce((acc, t) => acc + t.count, 0);
    expect(totalTypeCount).toBe(2185);
  });

  it('filters accurately by Credit Status and computes facet counts', () => {
    const creditFacets = getCreditStatusFacetCounts('active');
    expect(creditFacets.length).toBe(5);

    const approvedFacet = creditFacets.find((f) => f.value === 'approved');
    expect(approvedFacet?.count).toBe(396);
    expect(approvedFacet?.label).toBe('Approved');

    const blockedFacet = creditFacets.find((f) => f.value === 'blocked');
    expect(blockedFacet?.count).toBe(57);
    expect(blockedFacet?.label).toBe('Blocked');

    const totalCreditCount = creditFacets.reduce((acc, f) => acc + f.count, 0);
    expect(totalCreditCount).toBe(574);

    // Filter single credit status
    const approvedRes = queryJfllCustomers({ creditStatuses: ['approved'] });
    expect(approvedRes.totalEstimate).toBe(396);
    approvedRes.items.forEach((c) => expect(c.creditStatus).toBe('approved'));

    // Filter multi credit status
    const riskRes = queryJfllCustomers({ creditStatuses: ['high_risk', 'blocked'] });
    expect(riskRes.totalEstimate).toBe(57 + 24);
    riskRes.items.forEach((c) => expect(['high_risk', 'blocked']).toContain(c.creditStatus));
  });

  it('supports unified "all" customer status combining active and inactive accounts (2,223 total)', () => {
    expect(JFLL_ALL_CUSTOMERS_DATA.length).toBe(2185);
    const allQuery = queryJfllCustomers({ customerStatus: 'all', page: 1, limit: 25 });
    expect(allQuery.totalEstimate).toBe(2185);
    expect(allQuery.page).toBe(1);
    expect(allQuery.limit).toBe(25);
    expect(allQuery.items.length).toBe(25);
    expect(allQuery.totalPages).toBe(Math.ceil(2185 / 25));

    // Audience counts in "all" mode
    expect(allQuery.audienceCounts.all).toBe(2185);
    expect(allQuery.audienceCounts.shippers).toBe(1049);
    expect(allQuery.audienceCounts.subagents).toBe(950);
    expect(allQuery.audienceCounts.overseas).toBe(177);
    expect(allQuery.audienceCounts.datamyneLeads).toBe(2);
    expect(allQuery.audienceCounts.archive).toBe(1609);
    expect(allQuery.audienceCounts.activeTotal).toBe(574);
    expect(allQuery.audienceCounts.inactiveTotal).toBe(1611);
    expect(allQuery.audienceCounts.allTotal).toBe(2185);

    // Quick sub-tabs in "all" mode
    const shippersTab = queryJfllCustomers({ customerStatus: 'all', tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(1049);
    shippersTab.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));

    const dmTab = queryJfllCustomers({ customerStatus: 'all', tab: 'datamyne-leads' });
    expect(dmTab.totalEstimate).toBe(2);
    dmTab.items.forEach((c) => expect(c.inDataMyne).toBe(true));

    const archiveTab = queryJfllCustomers({ customerStatus: 'all', tab: 'archive' });
    expect(archiveTab.totalEstimate).toBe(1609);
    archiveTab.items.forEach((c) => {
      expect(c.status).toBe('Not Active');
      expect(c.inDataMyne).toBeFalsy();
    });

    // Contains both Active and Inactive items
    const hasActive = allQuery.items.some((c) => c.status === 'Active');
    const hasInactive = allQuery.items.some((c) => c.status === 'Not Active');
    expect(hasActive).toBe(true);
    expect(hasInactive).toBe(true);

    // Filter by customer group across combined dataset
    const subagentsRes = queryJfllCustomers({ customerStatus: 'all', customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(950);

    // Search query across combined dataset
    const searchActive = queryJfllCustomers({ customerStatus: 'all', q: '3S PHARMACEUTICALS' });
    expect(searchActive.totalEstimate).toBeGreaterThanOrEqual(1);

    const searchInactive = queryJfllCustomers({ customerStatus: 'all', q: 'BLISSON MEDICA' });
    expect(searchInactive.totalEstimate).toBeGreaterThanOrEqual(1);
  });

  it('computes exact sales person facet counts and filters by sales person', () => {
    const facets = getSalesPersonFacetCounts('active');

    expect(facets.length).toBeGreaterThanOrEqual(50);
    // Verified top representatives
    const top = facets[0];
    expect(top.label).toBe('Narendra Gupta');
    expect(top.count).toBe(55);

    const irfan = facets.find((f) => f.label === 'Irfan Shaikh');
    expect(irfan?.count).toBe(47);

    const samuel = facets.find((f) => f.label === 'Samuel Prabhu');
    expect(samuel?.count).toBe(35);

    // Single sales person filter
    const singleRes = queryJfllCustomers({
      customerStatus: 'active',
      salesPersons: ['Narendra Gupta'],
    });
    expect(singleRes.totalEstimate).toBe(55);
    singleRes.items.forEach((c) => {
      expect(c.salesPerson).toBe('Narendra Gupta');
    });

    // Multi-select sales persons filter
    const multiRes = queryJfllCustomers({
      customerStatus: 'active',
      salesPersons: ['Irfan Shaikh', 'Samuel Prabhu'],
    });
    expect(multiRes.totalEstimate).toBe(82);
    multiRes.items.forEach((c) => {
      expect(['Irfan Shaikh', 'Samuel Prabhu']).toContain(c.salesPerson);
    });

    // Substring / search query matches sales person
    const searchRes = queryJfllCustomers({
      customerStatus: 'active',
      q: 'Narendra Gupta',
    });
    expect(searchRes.totalEstimate).toBeGreaterThanOrEqual(55);
  });

  it('computes exact revenue range facet counts and filters by revenue', () => {
    const facets = getRevenueRangeFacetCounts('active');

    // Verify exact distribution across 574 active accounts
    const enterprise = facets.find((f) => f.id === '1cr_plus');
    expect(enterprise?.count).toBe(25);

    const keyAccounts = facets.find((f) => f.id === '25l_1cr');
    expect(keyAccounts?.count).toBe(62);

    const midMarket = facets.find((f) => f.id === '5l_25l');
    expect(midMarket?.count).toBe(165);

    const growth = facets.find((f) => f.id === '1l_5l');
    expect(growth?.count).toBe(178);

    const starter = facets.find((f) => f.id === 'under_1l');
    expect(starter?.count).toBe(144);

    const totalFromFacets = facets.reduce((acc, f) => acc + f.count, 0);
    expect(totalFromFacets).toBe(574);

    // Inactive mode computes actual distribution for historical business (1,611 accounts)
    const inactiveFacets = getRevenueRangeFacetCounts('inactive');
    expect(inactiveFacets.length).toBe(5);
    const inactiveTotalInFacets = inactiveFacets.reduce((acc, f) => acc + f.count, 0);
    expect(inactiveTotalInFacets).toBe(1611);

    // Single range filter: 1cr_plus
    const resEnterprise = queryJfllCustomers({
      customerStatus: 'active',
      revenueRanges: ['1cr_plus'],
    });
    expect(resEnterprise.totalEstimate).toBe(25);
    resEnterprise.items.forEach((c) => {
      expect(c.businessLast3m).toBeGreaterThanOrEqual(10000000);
    });

    // Single range filter: under_1l
    const resStarter = queryJfllCustomers({
      customerStatus: 'active',
      revenueRanges: ['under_1l'],
    });
    expect(resStarter.totalEstimate).toBe(144);
    resStarter.items.forEach((c) => {
      expect(c.businessLast3m).toBeLessThan(100000);
    });

    // Multi-range filter: 1cr_plus + 25l_1cr
    const resMulti = queryJfllCustomers({
      customerStatus: 'active',
      revenueRanges: ['1cr_plus', '25l_1cr'],
    });
    expect(resMulti.totalEstimate).toBe(87);

    // Minimum revenue threshold
    const resMin = queryJfllCustomers({
      customerStatus: 'active',
      minRevenue: 5000000,
    });
    expect(resMin.totalEstimate).toBeGreaterThanOrEqual(25);
    resMin.items.forEach((c) => {
      expect(c.businessLast3m).toBeGreaterThanOrEqual(5000000);
    });

    // Format currency helper
    expect(formatIndianCurrency(186325931.19)).toBe('₹18.63 Cr');
    expect(formatIndianCurrency(828367.51)).toBe('₹8.28 L');
    expect(formatIndianCurrency(97769)).toBe('₹97,769');
    expect(formatIndianCurrency(null)).toBe('—');
    expect(formatIndianCurrency(undefined)).toBe('—');

    // Inactive Revenue Filtering
    const inactive1cr = queryJfllCustomers({
      customerStatus: 'inactive',
      revenueRanges: ['1cr_plus'],
    });
    expect(inactive1cr.totalEstimate).toBeGreaterThan(0);
    inactive1cr.items.forEach((c) => {
      expect(c.totalBusinessTillDate).toBeGreaterThanOrEqual(10000000);
    });
  });

  it('supports column-header sorting across logical fields for salespeople', () => {
    // 1. Sort by Recent Revenue descending (Top revenue accounts first)
    const revDesc = queryJfllCustomers({
      customerStatus: 'active',
      sortBy: 'businessLast3m',
      sortOrder: 'desc',
    });
    expect(revDesc.items.length).toBeGreaterThan(0);
    expect(revDesc.items[0].fullName).toBe('A ENTERPRISES HOLDING INC.');
    expect(revDesc.items[0].businessLast3m).toBeGreaterThan(180000000);
    for (let i = 0; i < revDesc.items.length - 1; i++) {
      const a = revDesc.items[i].businessLast3m ?? -1;
      const b = revDesc.items[i + 1].businessLast3m ?? -1;
      expect(a).toBeGreaterThanOrEqual(b);
    }

    // 2. Sort by Recent Revenue ascending (Smallest revenue accounts first, NULLS LAST)
    const revAsc = queryJfllCustomers({
      customerStatus: 'active',
      sortBy: 'businessLast3m',
      sortOrder: 'asc',
    });
    expect(revAsc.items.length).toBeGreaterThan(0);
    expect(revAsc.items[0].businessLast3m).toBeLessThan(1000);

    // Verify NULLS LAST when sorting combined active + inactive accounts
    const revAscAll = queryJfllCustomers({
      customerStatus: 'all',
      sortBy: 'businessLast3m',
      sortOrder: 'asc',
      limit: 50,
    });
    expect(revAscAll.items[0].businessLast3m).toBeDefined();
    expect(revAscAll.items[0].businessLast3m).not.toBeNull();

    // 3. Sort by Total Business Till Date descending
    const totDesc = queryJfllCustomers({
      customerStatus: 'all',
      sortBy: 'totalBusinessTillDate',
      sortOrder: 'desc',
      limit: 25,
    });
    expect(totDesc.items.length).toBe(25);
    expect(totDesc.items[0].totalBusinessTillDate).toBeGreaterThan(500000000);

    // 4. Sort by Company Name descending (Z-A)
    const nameDesc = queryJfllCustomers({
      customerStatus: 'active',
      sortBy: 'fullName',
      sortOrder: 'desc',
    });
    expect(nameDesc.items.length).toBeGreaterThan(0);
    expect(nameDesc.items[0].fullName.localeCompare(nameDesc.items[1].fullName)).toBeGreaterThanOrEqual(0);

    // 5. Sort by Customer Group ascending
    const groupAsc = queryJfllCustomers({
      customerStatus: 'active',
      sortBy: 'customerGroup',
      sortOrder: 'asc',
    });
    expect(groupAsc.items.length).toBeGreaterThan(0);
    expect(groupAsc.items[0].customerGroup).toBe('GSA');

    // 6. Sort Inactive Customers by Total Business Till Date descending
    const inactiveSort = queryJfllCustomers({
      customerStatus: 'inactive',
      sortBy: 'totalBusinessTillDate',
      sortOrder: 'desc',
      limit: 10,
    });
    expect(inactiveSort.items.length).toBe(10);
    for (let i = 0; i < inactiveSort.items.length - 1; i++) {
      expect(inactiveSort.items[i].totalBusinessTillDate!).toBeGreaterThanOrEqual(
        inactiveSort.items[i + 1].totalBusinessTillDate!
      );
    }

    // 7. Sort Inactive Customers fallback when sortBy is businessLast3m
    const inactiveSortFallback = queryJfllCustomers({
      customerStatus: 'inactive',
      sortBy: 'businessLast3m',
      sortOrder: 'desc',
      limit: 10,
    });
    expect(inactiveSortFallback.items.length).toBe(10);
    for (let i = 0; i < inactiveSortFallback.items.length - 1; i++) {
      expect(inactiveSortFallback.items[i].totalBusinessTillDate!).toBeGreaterThanOrEqual(
        inactiveSortFallback.items[i + 1].totalBusinessTillDate!
      );
    }
  });

  describe('Sales Approach Query Service Rules for Active Customers', () => {
    it('ignores approachStatuses filter when customerStatus is active', () => {
      // Inactive approach status shouldn't filter out active customers
      const res = queryJfllCustomers({
        customerStatus: 'active',
        approachStatuses: ['Contacted', 'In Progress'],
      });
      // All 574 active customers are preserved
      expect(res.totalEstimate).toBe(574);
    });
  });

  describe('Unified Golden Master Consolidation (0 Duplicates Mandate)', () => {
    it('achieves strictly 0 duplicate branch alias rows and consolidates Golden Master accounts', () => {
      // Zero duplicate branch alias rows in master directory (all 2,185 are unique Golden Masters)
      expect(JFLL_ALL_CUSTOMERS_DATA.length).toBe(2185);
      expect(JFLL_ALL_CUSTOMERS_DATA.every((c: any) => !c.isBranchAlias && !c.parentId)).toBe(true);

      // Exactly 38 Golden Master accounts consolidated from multiple aliases
      const merged = JFLL_ALL_CUSTOMERS_DATA.filter((c) => (c.mergedCount ?? 1) > 1);
      expect(merged.length).toBe(38);

      // Verify each consolidated master has merged audit details
      merged.forEach((m) => {
        expect(m.mergedCount).toBeGreaterThanOrEqual(2);
        expect(m.mergedAliases).toBeDefined();
        expect(m.mergedAliases?.length).toBe(m.mergedCount! - 1);
        expect(m.totalBusinessTillDate).toBeGreaterThan(0);
      });

      // Check specific canonical Golden Master: Cargosol
      const cargosolAccounts = JFLL_ALL_CUSTOMERS_DATA.filter((c) =>
        c.fullName.toUpperCase().includes('CARGOSOL')
      );
      // Strictly 1 unified account for Cargosol
      expect(cargosolAccounts.length).toBe(1);
      const cargosolMaster = cargosolAccounts[0];
      expect(cargosolMaster.id).toBe('jfll-2212');
      expect(cargosolMaster.mergedCount).toBe(2);
      expect(cargosolMaster.totalBusinessTillDate).toBeGreaterThan(190000000); // ₹19.3 Cr combined
      expect(cargosolMaster.mergedAliases?.[0].id).toBe('jfll-1679');

      // Check Fair Exports
      const fairExportsAccounts = JFLL_ALL_CUSTOMERS_DATA.filter((c) =>
        c.fullName.toUpperCase().includes('FAIR EXPORTS')
      );
      expect(fairExportsAccounts.length).toBe(1);
      expect(fairExportsAccounts[0].status).toBe('Active');
      expect(fairExportsAccounts[0].mergedCount).toBe(2);
    });
  });

  describe('fetchJfllCustomersFromApi Golden Record Mapping', () => {
    it('correctly extracts coReps, mergedCount, and parses JSON mergedAliases when API returns them', async () => {
      const mockApiResponse = {
        data: [
          {
            id: 'lead-golden-1',
            full_name: 'CARGOSOL LOGISTICS LIMITED',
            territory: 'Mumbai',
            status: 'Active',
            customer_group: 'Shipper / Consignee',
            type: 'Public Limited',
            sales_person: 'John Doe',
            co_reps: 'Jane Smith, Bob Wilson',
            merged_count: 3,
            merged_aliases: JSON.stringify([
              { id: 'lead-alias-1', full_name: 'CARGOSOL LOGISTICS (BRANCH)', sales_person: 'Jane Smith' },
              { id: 'lead-alias-2', full_name: 'CARGOSOL INTL', sales_person: 'Bob Wilson' },
            ]),
          },
          {
            id: 'lead-standard-2',
            full_name: 'STANDARD FREIGHT LTD',
            territory: 'Delhi',
            status: 'Active',
            customer_group: 'Subagent',
            type: 'Private Limited',
            sales_person: 'Alice Brown',
            co_reps: null,
            merged_count: undefined,
            merged_aliases: null,
          },
          {
            id: 'lead-parsed-3',
            full_name: 'PREPARSED ALIASES CORP',
            territory: 'Bangalore',
            status: 'Active',
            customer_group: 'Shipper / Consignee',
            type: 'Private Limited',
            co_reps: 'Support Rep',
            merged_count: 2,
            merged_aliases: [
              { id: 'lead-alias-3', full_name: 'PREPARSED BRANCH' },
            ],
          },
          {
            id: 'lead-corrupt-json-4',
            full_name: 'MALFORMED JSON CORP',
            territory: 'Chennai',
            status: 'Active',
            customer_group: 'Subagent',
            type: 'Private Limited',
            co_reps: 'Corrupt Rep',
            merged_count: 2,
            merged_aliases: '{invalid json string...',
          },
        ],
        total_records: 4,
        page: 1,
        page_size: 25,
        total_pages: 1,
        audience_counts: {
          all: 4,
          shippers: 2,
          subagents: 2,
          overseas: 0,
          with_contacts: 4,
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockApiResponse,
      } as Response);

      const res = await fetchJfllCustomersFromApi({ page: 1, limit: 25 });

      expect(fetchSpy).toHaveBeenCalled();
      expect(res.items.length).toBe(4);

      // Verify Golden Record 1: coReps string, mergedCount 3, JSON string mergedAliases parsed to array
      const item1 = res.items[0];
      expect(item1.id).toBe('lead-golden-1');
      expect(item1.coReps).toBe('Jane Smith, Bob Wilson');
      expect(item1.mergedCount).toBe(3);
      expect(Array.isArray(item1.mergedAliases)).toBe(true);
      expect(item1.mergedAliases?.length).toBe(2);
      expect(item1.mergedAliases?.[0].full_name).toBe('CARGOSOL LOGISTICS (BRANCH)');
      expect(item1.mergedAliases?.[1].full_name).toBe('CARGOSOL INTL');

      // Verify Standard Record 2: defaults coReps to undefined, mergedCount to 1, mergedAliases to undefined
      const item2 = res.items[1];
      expect(item2.id).toBe('lead-standard-2');
      expect(item2.coReps).toBeUndefined();
      expect(item2.mergedCount).toBe(1);
      expect(item2.mergedAliases).toBeUndefined();

      // Verify Pre-parsed Record 3: coReps preserved, mergedCount 2, array mergedAliases preserved
      const item3 = res.items[2];
      expect(item3.id).toBe('lead-parsed-3');
      expect(item3.coReps).toBe('Support Rep');
      expect(item3.mergedCount).toBe(2);
      expect(item3.mergedAliases).toEqual([{ id: 'lead-alias-3', full_name: 'PREPARSED BRANCH' }]);

      // Verify Corrupt JSON Record 4: invalid JSON gracefully returns undefined without throwing
      const item4 = res.items[3];
      expect(item4.id).toBe('lead-corrupt-json-4');
      expect(item4.coReps).toBe('Corrupt Rep');
      expect(item4.mergedCount).toBe(2);
      expect(item4.mergedAliases).toBeUndefined();

      fetchSpy.mockRestore();
    });
  });
});
