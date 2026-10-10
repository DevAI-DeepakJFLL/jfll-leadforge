import { describe, it, expect } from 'vitest';
import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import { queryJfllCustomers, exportJfllCustomersCsv } from '@/services/jfllCustomerService';

describe('JFLL Customers Dataset & Query Service', () => {
  it('loads 881 deduplicated active customer records with complete schemas', () => {
    expect(JFLL_CUSTOMERS_DATA.length).toBe(881);
    JFLL_CUSTOMERS_DATA.forEach((c) => {
      expect(c.id).toBeDefined();
      expect(c.fullName.length).toBeGreaterThan(0);
      expect(c.status).toBe('Active');
      expect(c.customerGroup.length).toBeGreaterThan(0);
      expect(c.type.length).toBeGreaterThan(0);
      expect(c.territory).toBe('All Territories');
    });
  });

  it('paginates correctly on default parameters', () => {
    const res = queryJfllCustomers({ page: 1, limit: 25 });
    expect(res.totalEstimate).toBe(881);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(25);
    expect(res.items.length).toBe(25);
    expect(res.totalPages).toBe(Math.ceil(881 / 25));
    expect(res.audienceCounts.all).toBe(881);
  });

  it('filters accurately by Customer Group (Subagent & Shipper)', () => {
    const subagentsRes = queryJfllCustomers({ customerGroups: ['Subagent'] });
    expect(subagentsRes.totalEstimate).toBe(474);
    subagentsRes.items.forEach((c) => expect(c.customerGroup).toBe('Subagent'));

    const shippersRes = queryJfllCustomers({ customerGroups: ['Shipper / Consignee'] });
    expect(shippersRes.totalEstimate).toBe(339);
    shippersRes.items.forEach((c) => expect(c.customerGroup).toBe('Shipper / Consignee'));
  });

  it('filters accurately by Contact Readiness', () => {
    const phoneRes = queryJfllCustomers({ hasPhone: true });
    expect(phoneRes.totalEstimate).toBe(657);
    phoneRes.items.forEach((c) => {
      expect(c.mobileNumber).toBeTruthy();
    });

    const emailRes = queryJfllCustomers({ hasEmail: true });
    expect(emailRes.totalEstimate).toBe(703);
    emailRes.items.forEach((c) => {
      expect(c.email).toBeTruthy();
    });

    const contactRes = queryJfllCustomers({ hasContactPerson: true });
    expect(contactRes.totalEstimate).toBe(729);
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
    expect(subagentsTab.totalEstimate).toBe(474);

    const shippersTab = queryJfllCustomers({ tab: 'shippers' });
    expect(shippersTab.totalEstimate).toBe(339);

    const overseasTab = queryJfllCustomers({ tab: 'overseas' });
    expect(overseasTab.totalEstimate).toBe(49);

    const contactsTab = queryJfllCustomers({ tab: 'with-contacts' });
    expect(contactsTab.totalEstimate).toBe(729);
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
});
