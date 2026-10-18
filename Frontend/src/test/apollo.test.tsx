import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import {
  queryApolloLeads,
  exportApolloLeadsCsv,
  queryCompanyContactsLocal,
  queryApolloPeopleLeadsLocal,
  fetchApolloPeopleLeads,
} from '@/services/apolloService';
import {
  ApolloAudienceTabs,
  ApolloActionBar,
  ApolloActiveFilterChips,
  ApolloTable,
  ApolloDetailDrawer,
  ApolloContextBanner,
} from '@/components/apollo';
import { ApolloLead } from '@/types/apolloLead';

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

    it('renders ApolloDetailDrawer with complete corporate dossier and decision-maker cross-navigation', () => {
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
      const result = await fetchApolloPeopleLeads({ q: 'The Home Depot' });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some((i) => i.company.toLowerCase().includes('home depot'))).toBe(true);
    });
  });
});


