import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import {
  queryApolloLeads,
  exportApolloLeadsCsv,
  queryCompanyContactsLocal,
  queryApolloPeopleLeadsLocal,
  fetchApolloPeopleLeads,
  filterLeadsInMemory,
} from '@/services/apolloService';
import {
  ApolloAudienceTabs,
  ApolloActionBar,
  ApolloActiveFilterChips,
  ApolloTable,
  ApolloDetailDrawer,
  ApolloContextBanner,
} from '@/components/apollo';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips';
import { ApolloLead } from '@/types/apolloLead';
import { Lead } from '@/types/lead';

const mockLeads: ApolloLead[] = [
  {
    organization_id: 'apollo-test-1',
    organization_name: 'Aerospace Technologies Inc',
    domain: 'aerotech.com',
    website_url: 'https://aerotech.com',
    phone: '+1-555-0199',
    employee_count: 1250,
    revenue_usd: 150000000,
    founded_year: 1995,
    industry: 'aviation & aerospace',
    specialties: 'Aviation electronics, avionics manufacturing',
    keywords: 'avionics, aerospace, aircraft parts, air cargo',
    technologies_raw: "['sap', 'salesforce', 'oracle']",
    job_functions_json: "{'engineering': 500, 'operations': 200}",
    linkedin_url: 'https://linkedin.com/company/aerotech',
    hq_city: 'Seattle',
    hq_state: 'Washington',
    hq_country: 'United States',
    hq_postal_code: '98101',
  },
  {
    organization_id: 'apollo-test-2',
    organization_name: 'Precision Automotive Systems',
    domain: 'precisionauto.com',
    website_url: 'https://precisionauto.com',
    phone: '+1-555-0288',
    employee_count: 85,
    revenue_usd: 8500000,
    founded_year: 2005,
    industry: 'automotive',
    specialties: 'OEM brake systems, automotive components',
    keywords: 'auto parts, brakes, ocean fcl, car manufacturing',
    technologies_raw: "['shopify', 'google_analytics']",
    job_functions_json: "{'operations': 30, 'sales': 15}",
    linkedin_url: 'https://linkedin.com/company/precisionauto',
    hq_city: 'Detroit',
    hq_state: 'Michigan',
    hq_country: 'United States',
    hq_postal_code: '48201',
  },
  {
    organization_id: 'apollo-test-3',
    organization_name: 'BioHealth Pharma Labs',
    domain: 'biohealthpharma.com',
    website_url: null,
    phone: '+44-20-7946-0912',
    employee_count: 45,
    revenue_usd: 4200000,
    founded_year: 2012,
    industry: 'pharmaceuticals',
    specialties: 'Active pharmaceutical ingredients, cold-chain biologics',
    keywords: 'pharma, biologics, cold chain, air freight',
    technologies_raw: null,
    job_functions_json: null,
    linkedin_url: null,
    hq_city: 'London',
    hq_state: null,
    hq_country: 'United Kingdom',
    hq_postal_code: 'EC1A 1BB',
  },
];

describe('Apollo Sourcing Tool Suite', () => {
  describe('apolloService local query engine', () => {
    it('returns paginated records and audience counts by default', () => {
      const res = queryApolloLeads({ page: 1, limit: 10 });
      expect(res.items.length).toBeLessThanOrEqual(10);
      expect(res.totalRecords).toBeGreaterThan(0);
      expect(res.audienceCounts.all).toBeGreaterThan(0);
      expect(res.audienceCounts.high_headcount).toBeGreaterThan(0);
    });

    it('filters by search term matching company name or keywords', () => {
      const res = queryApolloLeads({ q: 'Boeing' });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.items.some((i) => i.organization_name.toLowerCase().includes('boeing'))).toBe(true);
    });

    it('filters by audience quick tabs', () => {
      const headcountRes = queryApolloLeads({ tab: 'high_headcount', limit: 50 });
      headcountRes.items.forEach((item) => {
        if (item.employee_count !== null && item.employee_count !== undefined) {
          expect(item.employee_count).toBeGreaterThanOrEqual(100);
        }
      });

      const revenueRes = queryApolloLeads({ tab: 'high_revenue', limit: 50 });
      revenueRes.items.forEach((item) => {
        if (item.revenue_usd !== null && item.revenue_usd !== undefined) {
          expect(item.revenue_usd).toBeGreaterThanOrEqual(10000000);
        }
      });
    });

    it('filters by multi-select cargo verticals', () => {
      const res = queryApolloLeads({ industries: ['automotive'] });
      expect(res.items.length).toBeGreaterThan(0);
      res.items.forEach((item) => {
        expect(item.industry.toLowerCase()).toBe('automotive');
      });
    });

    it('exports CSV without throwing errors', () => {
      expect(() => exportApolloLeadsCsv(mockLeads, 'test_export.csv')).not.toThrow();
    });
  });

  describe('Apollo UI Components Render', () => {
    it('renders ApolloAudienceTabs with counts and quick tabs', () => {
      const html = renderToString(
        <ApolloAudienceTabs
          activeTab="all"
          counts={{
            all: 690881,
            high_headcount: 85000,
            high_revenue: 120000,
            top_cargo_verticals: 140000,
            with_website_linkedin: 400000,
          }}
          totalFormatted="690.9k"
        />
      );

      expect(html).toContain('All Commercial Shippers');
      expect(html).toContain('Large Scale (100+ Staff)');
      expect(html).toContain('High Revenue ($10M+)');
      expect(html).toContain('Top Cargo Verticals');
      expect(html).toContain('690.9k');
    });

    it('renders ApolloActionBar with search input placed next to Select option', () => {
      const html = renderToString(
        <ApolloActionBar
          selectedCount={2}
          isAllOnPageSelected={false}
          isIndeterminate={true}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          searchQuery="pharma"
          onSearchChange={() => {}}
        />
      );

      expect(html).toContain('Selected');
      expect(html).toContain('2');
      expect(html).toContain('value="pharma"');
      expect(html).toContain('Export CSV');
    });


    it('renders ApolloActiveFilterChips with active tags and dismiss controls', () => {
      const html = renderToString(
        <ApolloActiveFilterChips
          filters={{
            industries: ['automotive'],
            q: 'brakes',
            hasWebsite: true,
          }}
          onRemoveIndustry={() => {}}
          onRemoveCountry={() => {}}
          onRemoveEmployeeTier={() => {}}
          onRemoveRevenueRange={() => {}}
          onRemoveHasWebsite={() => {}}
          onRemoveHasLinkedin={() => {}}
          onClearSearch={() => {}}
          onClearAll={() => {}}
        />
      );

      expect(html).toContain('Automotive &amp; Parts');
      expect(html).toContain('Search: &quot;brakes&quot;');
      expect(html).toContain('Has Website');
      expect(html).toContain('Clear all');
    });

    it('renders ApolloTable with shipper rows, badges, and action buttons', () => {
      const html = renderToString(
        <ApolloTable
          leads={mockLeads}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          onFindDecisionMakers={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={25}
          totalItems={3}
          totalFormatted="3"
          onPageChange={() => {}}
        />
      );

      expect(html).toContain('Aerospace Technologies Inc');
      expect(html).toContain('Precision Automotive Systems');
      expect(html).toContain('BioHealth Pharma Labs');
      expect(html).toContain('aerotech.com');
      expect(html).toContain('+1-555-0199');
      expect(html).toContain('View');
      expect(html).toContain('Find decision-makers at Aerospace Technologies Inc');
    });

    it('renders ApolloDetailDrawer with complete corporate profile and decision-maker cross-navigation', () => {
      const html = renderToString(
        <ApolloDetailDrawer
          isOpen={true}
          lead={mockLeads[0]}
          onClose={() => {}}
          onFindDecisionMakers={() => {}}
        />
      );

      expect(html).toContain('Aerospace Technologies Inc');
      expect(html).toContain('aerotech.com');
      expect(html).toContain('$150.00 Million');
      expect(html).toContain('1,250 staff');
      expect(html).toContain('1995');
      expect(html).toContain('Aviation electronics, avionics manufacturing');
      expect(html).toContain('sap');
      expect(html).toContain('salesforce');
      expect(html).toContain('Jet Freight Logistics Alignment');
      expect(html).toContain('Find Decision-Makers');
      expect(html).toContain('Key Decision-Makers');
      expect(html).toContain('Contacts');
      expect(html).toContain('View in People directory');
    });

    it('renders ApolloContextBanner with corporate account directory notice', () => {
      const html = renderToString(
        <ApolloContextBanner onSwitchToPeople={() => {}} />
      );

      expect(html).toContain('Corporate Account Directory:');
      expect(html).toContain('verified in-drawer decision-makers');
      expect(html).toContain('Search Decision-Makers in People Tab');
    });

    it('renders LeadsTable contextual company empty state when activeCompany is provided and leads are empty', () => {
      const html = renderToString(
        <LeadsTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          activeCompany="TRENT LIMITED"
          onClearCompanyFilter={() => {}}
          onSearchCompanies={() => {}}
        />
      );

      expect(html).toContain('No decision-makers indexed for');
      expect(html).toContain('TRENT LIMITED');
      expect(html).toContain('Customs Entity Cataloged • 0 Indexed Contacts');
      expect(html).toContain('Clear Company Filter');
      expect(html).toContain('Search in Companies Directory');
      expect(html).toContain('Subsidiary vs Parent:');
    });

    it('renders LeadsTable standard empty state when activeCompany is not provided and leads are empty', () => {
      const html = renderToString(
        <LeadsTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          onClearFilters={() => {}}
        />
      );

      expect(html).toContain('No leads match your selected filters');
      expect(html).toContain('Clear All Filters');
    });

    it('renders ActiveFilterChips with company highlight badge when company filter is active', () => {
      const html = renderToString(
        <ActiveFilterChips
          filters={{
            company: 'TRENT LIMITED',
            tab: 'all',
            sortOrder: 'asc',
            page: 1,
            limit: 25,
            jobTitles: [],
            departments: [],
            locations: [],
            industries: [],
            status: [],
            companySize: [],
          }}
          onRemoveFilter={() => {}}
          onClearAll={() => {}}
        />
      );

      expect(html).toContain('Company:');
      expect(html).toContain('TRENT LIMITED');
      expect(html).toContain('Clear all');
    });

    it('returns empty list for queryCompanyContactsLocal since hardcoded contacts were removed', () => {
      const boeingOrgId = '54a1229169702d9a8b695403';
      const allContacts = queryCompanyContactsLocal(boeingOrgId);
      expect(allContacts.totalRecords).toBe(0);
      expect(allContacts.items).toEqual([]);
    });

    it('returns rich preloaded starter leads in queryApolloPeopleLeadsLocal with instant 0ms response', () => {
      const globalResult = queryApolloPeopleLeadsLocal({});
      expect(globalResult.items.length).toBeGreaterThan(0);
      expect(globalResult.totalEstimate).toBe(766803);
      expect(globalResult.totalFormatted).toBe('766.8k');

      // Test searching for Walmart decision-makers
      const walmartResult = queryApolloPeopleLeadsLocal({ q: 'Walmart' });
      expect(walmartResult.items.length).toBeGreaterThan(0);
      expect(walmartResult.items.some((i) => i.company === 'Walmart')).toBe(true);
      expect(walmartResult.items.some((i) => i.title.toLowerCase().includes('supply chain'))).toBe(true);

      // Test searching for Boeing decision-makers
      const boeingResult = queryApolloPeopleLeadsLocal({ q: 'Boeing' });
      expect(boeingResult.items.length).toBeGreaterThan(0);
      expect(boeingResult.items.some((i) => i.company.toLowerCase().includes('boeing'))).toBe(true);
    });

    it('falls back seamlessly to local starter decision-makers in fetchApolloPeopleLeads when backend is offline', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Backend offline'));
      try {
        const result = await fetchApolloPeopleLeads({ q: 'The Home Depot' });
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.some((i) => i.company.toLowerCase().includes('home depot'))).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('returns empty results when querying an unknown organizationId locally, never dumping unrelated companies', () => {
      const result = queryApolloPeopleLeadsLocal({ organizationId: 'unknown-org-id-12345' });
      expect(result.items.length).toBe(0);
      expect(result.totalEstimate).toBe(0);
      expect(result.totalFormatted).toBe('0');
    });

    it('filters strictly by company name for Larsen & Toubro in local data', () => {
      const result = queryApolloPeopleLeadsLocal({ company: 'Larsen & Toubro' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        const isLnt =
          item.company.toLowerCase().includes('larsen') ||
          item.company.toLowerCase().includes('toubro') ||
          item.company.toLowerCase().includes('l&t');
        expect(isLnt).toBe(true);
      });
    });

    it('respects an empty server response (200 OK with total_records: 0) without falling back to starter data', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          page: 1,
          page_size: 25,
          total_records: 0,
          total_pages: 0,
          has_next: false,
          data: [],
        }),
      } as unknown as Response);

      try {
        const result = await fetchApolloPeopleLeads({ organizationId: '54a1226269702da425d52903' });
        expect(result.items.length).toBe(0);
        expect(result.totalEstimate).toBe(0);
        expect(result.totalFormatted).toBe('0');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('defaults page_size to 250 when organizationId or company is provided to fetchApolloPeopleLeads', async () => {
      const originalFetch = global.fetch;
      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            page: 1,
            page_size: 250,
            total_records: 0,
            total_pages: 0,
            has_next: false,
            data: [],
          }),
        } as unknown as Response);
      });

      try {
        await fetchApolloPeopleLeads({ organizationId: 'org-test-123' });
        expect(requestedUrl).toContain('page_size=250');

        await fetchApolloPeopleLeads({ company: 'Boeing', limit: 500 });
        expect(requestedUrl).toContain('page_size=500');

        // Without company or orgId, standard limit (25) is used
        await fetchApolloPeopleLeads({ limit: 25 });
        expect(requestedUrl).toContain('page_size=25');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('gracefully handles 422 error on large page_size by retrying with page_size=100', async () => {
      const originalFetch = global.fetch;
      const requestedUrls: string[] = [];
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        if (url.includes('page_size=250')) {
          return Promise.resolve({
            ok: false,
            status: 422,
            json: async () => ({ detail: 'page_size must be <= 100' }),
          } as unknown as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            page_size: 100,
            total_records: 1,
            total_pages: 1,
            has_next: false,
            data: [
              {
                person_id: 'p-1',
                organization_id: 'org-test-123',
                person_name: 'Jane Doe',
                job_title: 'VP Logistics',
                employer_name: 'Test Corp',
              },
            ],
          }),
        } as unknown as Response);
      });

      try {
        const result = await fetchApolloPeopleLeads({ organizationId: 'org-test-123' });
        expect(requestedUrls.length).toBe(2);
        expect(requestedUrls[0]).toContain('page_size=250');
        expect(requestedUrls[1]).toContain('page_size=100');
        expect(result.items.length).toBe(1);
        expect(result.items[0].name).toBe('Jane Doe');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('filterLeadsInMemory client-side engine', () => {
    const sampleLeads: Lead[] = [
      {
        id: 'dm-1',
        name: 'Sarah Connor',
        title: 'Director of Global Supply Chain',
        company: 'Acme Freight Corp',
        companyLogo: '',
        industry: 'Freight & Logistics Services',
        department: 'Supply Chain & Logistics',
        status: 'NET NEW',
        decisionMaker: true,
        location: 'Chicago, Illinois, United States',
        city: 'Chicago',
        state: 'Illinois',
        country: 'United States',
        email: 'sconnor@acmefreight.com',
        phone: '+1 (555) 123-4567',
        employees: '500+ Enterprise',
        revenue: '$10M+ Enterprise',
        funding: 'Commercial Freight Shipper',
        saved: false,
      },
      {
        id: 'dm-2',
        name: 'John Miller',
        title: 'VP of Procurement & Operations',
        company: 'Acme Freight Corp',
        companyLogo: '',
        industry: 'Freight & Logistics Services',
        department: 'Procurement',
        status: 'COLD',
        decisionMaker: false,
        location: 'Dallas, Texas, United States',
        city: 'Dallas',
        state: 'Texas',
        country: 'United States',
        email: 'jmiller@acmefreight.com',
        phone: '+1 (555) 987-6543',
        employees: '500+ Enterprise',
        revenue: '$10M+ Enterprise',
        funding: 'Commercial Freight Shipper',
        saved: true,
      },
      {
        id: 'dm-3',
        name: 'Elena Rostova',
        title: 'Logistics Operations Lead',
        company: 'Acme Freight Corp',
        companyLogo: '',
        industry: 'Freight & Logistics Services',
        department: 'Logistics Operations',
        status: 'NET NEW',
        decisionMaker: true,
        location: 'Hamburg, Germany',
        city: 'Hamburg',
        country: 'Germany',
        email: 'erostova@acmefreight.de',
        phone: '+49 40 123456',
        employees: '500+ Enterprise',
        revenue: '$10M+ Enterprise',
        funding: 'Commercial Freight Shipper',
        saved: false,
      },
    ];

    it('returns all leads when filters are empty', () => {
      const result = filterLeadsInMemory(sampleLeads, {});
      expect(result.length).toBe(3);
    });

    it('filters by search term q across name, title, company, location, and email', () => {
      // By name
      expect(filterLeadsInMemory(sampleLeads, { q: 'Sarah' }).map((l) => l.id)).toEqual(['dm-1']);
      // By title
      expect(filterLeadsInMemory(sampleLeads, { q: 'Procurement' }).map((l) => l.id)).toEqual(['dm-2']);
      // By location
      expect(filterLeadsInMemory(sampleLeads, { q: 'Hamburg' }).map((l) => l.id)).toEqual(['dm-3']);
      // By email
      expect(filterLeadsInMemory(sampleLeads, { q: 'jmiller@' }).map((l) => l.id)).toEqual(['dm-2']);
      // By company
      expect(filterLeadsInMemory(sampleLeads, { q: 'Acme' }).length).toBe(3);
    });

    it('filters by departments', () => {
      const result = filterLeadsInMemory(sampleLeads, { departments: ['Supply Chain'] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dm-1');
    });

    it('filters by jobTitles', () => {
      const result = filterLeadsInMemory(sampleLeads, { jobTitles: ['VP'] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dm-2');
    });

    it('filters by locations', () => {
      const result = filterLeadsInMemory(sampleLeads, { locations: ['Germany'] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dm-3');
    });

    it('filters by status', () => {
      const result = filterLeadsInMemory(sampleLeads, { status: ['COLD'] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dm-2');
    });

    it('filters by tab "new" to select decisionMaker === true', () => {
      const result = filterLeadsInMemory(sampleLeads, { tab: 'new' });
      expect(result.length).toBe(2);
      expect(result.map((l) => l.id)).toEqual(['dm-1', 'dm-3']);
    });

    it('filters by combined sub-filters instantly in-memory', () => {
      const result = filterLeadsInMemory(sampleLeads, {
        tab: 'new',
        departments: ['Logistics'],
        locations: ['Hamburg'],
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dm-3');
    });
  });
});


