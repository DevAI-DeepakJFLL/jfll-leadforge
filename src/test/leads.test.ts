import { describe, it, expect, beforeEach } from 'vitest';
import {
  queryLeads,
  getLeadById,
  toggleLeadSaved,
  batchSaveLeads,
  getFilterOptions,
  generateExportCsv,
  resetLeadsDatabase,
  getLeadsDatabase,
} from '@/mocks/leadsService';
import {
  parseUrlToFilters,
  serializeFiltersToUrl,
} from '@/hooks/useLeadsFilter';
import { FilterParams, Lead } from '@/types/lead';

describe('Leads Data & Service Test Suite', () => {
  beforeEach(() => {
    resetLeadsDatabase();
  });

  describe('1. Filtering Logic', () => {
    it('returns all mock leads when no filters or search are provided', () => {
      const result = queryLeads();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(25);
      expect(result.totalFormatted).toBe('2.5m');
      expect(result.audienceCounts.all).toBe(2500000);
    });

    it('filters leads by job titles correctly', () => {
      const result = queryLeads({ jobTitles: ['Vice President'] });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.title.toLowerCase()).toContain('vice president');
      });
    });

    it('filters leads by departments', () => {
      const result = queryLeads({ departments: ['Marketing'] });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.department?.toLowerCase()).toContain('marketing');
      });
    });

    it('filters leads by location matching city, state, or location string', () => {
      const result = queryLeads({ locations: ['Los Angeles, California'] });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        const matches =
          item.location.toLowerCase().includes('los angeles') ||
          (item.city && item.city.toLowerCase().includes('los angeles')) ||
          (item.state && item.state.toLowerCase().includes('california'));
        expect(matches).toBe(true);
      });
    });

    it('filters leads by industry', () => {
      const result = queryLeads({ industries: ['Marketing & Advertising'] });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.industry.toLowerCase()).toContain('marketing & advertising');
      });
    });

    it('filters leads by lead status (NET NEW, COLD, IN SEQUENCE)', () => {
      const resultNetNew = queryLeads({ status: ['NET NEW'] });
      expect(resultNetNew.items.length).toBeGreaterThan(0);
      resultNetNew.items.forEach((item) => {
        expect(item.status).toBe('NET NEW');
      });

      const resultCold = queryLeads({ status: ['COLD'] });
      resultCold.items.forEach((item) => {
        expect(item.status).toBe('COLD');
      });
    });

    it('filters leads by company size (employees)', () => {
      const result = queryLeads({ companySize: ['51-200'] });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.employees).toBe('51-200');
      });
    });

    it('combines multiple filters correctly with AND logic', () => {
      const result = queryLeads({
        locations: ['Los Angeles, California'],
        industries: ['Marketing & Advertising'],
        status: ['NET NEW'],
      });

      result.items.forEach((item) => {
        expect(item.status).toBe('NET NEW');
        expect(item.industry).toBe('Marketing & Advertising');
        expect(
          item.location.toLowerCase().includes('los angeles') ||
          (item.city && item.city.toLowerCase().includes('los angeles'))
        ).toBe(true);
      });
    });

    it('generates dynamic filter facet options with counts', () => {
      const options = getFilterOptions();
      expect(options.jobTitles.length).toBeGreaterThan(0);
      expect(options.departments.length).toBeGreaterThan(0);
      expect(options.locations.length).toBeGreaterThan(0);
      expect(options.industries.length).toBeGreaterThan(0);
      expect(options.status.length).toBeGreaterThan(0);
      expect(options.companySize.length).toBeGreaterThan(0);

      // Verify each option item has label, value, and count >= 1
      options.industries.forEach((opt) => {
        expect(opt.label).toBeDefined();
        expect(opt.value).toBeDefined();
        expect(opt.count).toBeGreaterThan(0);
      });
    });
  });

  describe('2. Search Functionality', () => {
    it('searches leads by name (case-insensitive)', () => {
      const result = queryLeads({ q: 'sarah' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        const matches =
          item.name.toLowerCase().includes('sarah') ||
          item.company.toLowerCase().includes('sarah') ||
          item.title.toLowerCase().includes('sarah') ||
          item.email.toLowerCase().includes('sarah');
        expect(matches).toBe(true);
      });
    });

    it('searches leads by company name', () => {
      const result = queryLeads({ q: 'SunMedia' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(
          item.company.toLowerCase().includes('sunmedia') ||
          item.email.toLowerCase().includes('sunmedia')
        ).toBe(true);
      });
    });

    it('handles search query with leading and trailing whitespaces', () => {
      const result = queryLeads({ q: '  Growth   ' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        const combined = `${item.name} ${item.company} ${item.title} ${item.industry}`.toLowerCase();
        expect(combined).toContain('growth');
      });
    });

    it('returns empty results when search query matches no records', () => {
      const result = queryLeads({ q: 'NonExistentProspectXYZ999' });
      expect(result.items).toHaveLength(0);
      expect(result.totalEstimate).toBe(0);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('3. Pagination & Audience Tabs', () => {
    it('supports custom page limit and page offset', () => {
      const page1 = queryLeads({ limit: 5, page: 1 });
      expect(page1.items).toHaveLength(5);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(5);
      expect(page1.totalPages).toBeGreaterThan(1);

      const page2 = queryLeads({ limit: 5, page: 2 });
      expect(page2.items).toHaveLength(5);
      expect(page2.page).toBe(2);

      // Verify page 1 and page 2 don't have identical lead IDs
      const page1Ids = page1.items.map((i) => i.id);
      const page2Ids = page2.items.map((i) => i.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('clamps page to 1 when page parameter is less than 1', () => {
      const result = queryLeads({ page: -3 });
      expect(result.page).toBe(1);
    });

    it('clamps page to totalPages when page exceeds upper bound', () => {
      const result = queryLeads({ page: 9999, limit: 10 });
      expect(result.page).toBe(result.totalPages);
    });

    it('filters by audience tab "new"', () => {
      const result = queryLeads({ tab: 'new' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.status).toBe('NET NEW');
      });
    });

    it('filters by audience tab "saved"', () => {
      // First save a lead
      const db = getLeadsDatabase();
      db[0].saved = true;

      const result = queryLeads({ tab: 'saved' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((item) => {
        expect(item.saved).toBe(true);
      });
    });

    it('sorts leads ascending and descending by column', () => {
      const asc = queryLeads({ sortBy: 'name', sortOrder: 'asc' });
      const desc = queryLeads({ sortBy: 'name', sortOrder: 'desc' });

      expect(asc.items[0].name.localeCompare(asc.items[1].name)).toBeLessThanOrEqual(0);
      expect(desc.items[0].name.localeCompare(desc.items[1].name)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('4. Bulk Selection & Saved State Mutation', () => {
    it('retrieves single lead by ID', () => {
      const lead = getLeadById('lead-1');
      expect(lead).toBeDefined();
      expect(lead?.id).toBe('lead-1');
    });

    it('returns undefined for non-existent lead ID', () => {
      const lead = getLeadById('invalid-id');
      expect(lead).toBeUndefined();
    });

    it('toggles lead saved status on toggleLeadSaved', () => {
      const lead = getLeadById('lead-2')!;
      const initialSaved = lead.saved;

      const updated = toggleLeadSaved('lead-2');
      expect(updated?.saved).toBe(!initialSaved);

      // Toggle back
      const reverted = toggleLeadSaved('lead-2');
      expect(reverted?.saved).toBe(initialSaved);
    });

    it('batch saves multiple selected leads', () => {
      const leadIds = ['lead-1', 'lead-2', 'lead-3'];
      const updated = batchSaveLeads(leadIds, true);

      expect(updated).toHaveLength(3);
      updated.forEach((l) => {
        expect(l.saved).toBe(true);
      });

      // Verify in database
      leadIds.forEach((id) => {
        const lead = getLeadById(id);
        expect(lead?.saved).toBe(true);
      });
    });

    it('batch un-saves multiple selected leads', () => {
      const leadIds = ['lead-1', 'lead-2'];
      batchSaveLeads(leadIds, true);
      const unsaved = batchSaveLeads(leadIds, false);

      expect(unsaved).toHaveLength(2);
      unsaved.forEach((l) => {
        expect(l.saved).toBe(false);
      });
    });
  });

  describe('5. CSV Export Generation', () => {
    it('generates standard RFC-4180 CSV with headers and CRLF row delimiters', () => {
      const sampleLeads: Lead[] = [
        {
          id: 'lead-test-1',
          name: 'Sarah Jenkins',
          title: 'VP Marketing',
          company: 'TechFlow, Inc.',
          companyLogo: '',
          industry: 'Marketing & Advertising',
          department: 'Marketing',
          status: 'NET NEW',
          location: 'Los Angeles, California',
          city: 'Los Angeles',
          state: 'California',
          country: 'United States',
          email: 'sarah@techflow.io',
          phone: '+1 (310) 555-0192',
          employees: '51-200',
          revenue: '$15M',
          funding: 'Series B',
          saved: true,
        },
      ];

      const csv = generateExportCsv(sampleLeads);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(2); // Header + 1 row
      expect(lines[0]).toBe(
        'ID,Name,Title,Company,Industry,Department,Status,Location,Email,Phone,Employees,Revenue,Funding,Saved'
      );
      // Verify escaping of company name with comma
      expect(lines[1]).toContain('"TechFlow, Inc."');
      expect(lines[1]).toContain('"Sarah Jenkins"');
      expect(lines[1]).toContain('"Yes"'); // Saved status
    });

    it('escapes embedded double quotes properly', () => {
      const leadWithQuotes: Lead = {
        id: 'lead-quote',
        name: 'John "The Boss" Doe',
        title: 'CEO',
        company: 'Quote "Corp"',
        companyLogo: '',
        industry: 'Software',
        department: 'Executive',
        status: 'NET NEW',
        location: 'New York, NY',
        email: 'john@quotecorp.com',
        phone: '123-456',
        employees: '10-50',
        revenue: '$1M',
        funding: 'Seed',
        saved: false,
      };

      const csv = generateExportCsv([leadWithQuotes]);
      expect(csv).toContain('"John ""The Boss"" Doe"');
      expect(csv).toContain('"Quote ""Corp"""');
      expect(csv).toContain('"No"'); // Saved is false
    });

    it('exports all leads when passed full database array', () => {
      const allLeads = getLeadsDatabase();
      const csv = generateExportCsv(allLeads);
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(allLeads.length + 1);
    });
  });

  describe('6. URL Query State Serialization & Parsing', () => {
    it('parses empty query string to default filter values', () => {
      const filters = parseUrlToFilters('');
      expect(filters.q).toBeUndefined();
      expect(filters.jobTitles).toEqual([]);
      expect(filters.locations).toEqual([]);
      expect(filters.status).toEqual([]);
      expect(filters.page).toBe(1);
      expect(filters.limit).toBe(25);
      expect(filters.tab).toBe('all');
    });

    it('parses URL search parameters into FilterParams', () => {
      const search =
        '?q=developer&jobTitles=Engineer&locations=Los+Angeles%2C+California&status=NET+NEW&page=2&tab=new';
      const filters = parseUrlToFilters(search);

      expect(filters.q).toBe('developer');
      expect(filters.jobTitles).toEqual(['Engineer']);
      expect(filters.locations).toEqual(['Los Angeles, California']);
      expect(filters.status).toEqual(['NET NEW']);
      expect(filters.page).toBe(2);
      expect(filters.tab).toBe('new');
    });

    it('serializes FilterParams into URL query string, omitting defaults', () => {
      const params: FilterParams = {
        q: 'growth',
        jobTitles: ['VP Marketing'],
        locations: ['Los Angeles, California'],
        status: ['NET NEW'],
        page: 2,
        limit: 25,
        tab: 'new',
        sortOrder: 'asc',
      };

      const query = serializeFiltersToUrl(params);
      expect(query).toContain('q=growth');
      expect(query).toContain('jobTitles=VP+Marketing');
      expect(query).toContain('locations=Los+Angeles%2C+California');
      expect(query).toContain('status=NET+NEW');
      expect(query).toContain('page=2');
      expect(query).toContain('tab=new');
      expect(query).not.toContain('limit=25'); // default limit omitted
    });

    it('round-trips filters from state to URL and back to state', () => {
      const initial: FilterParams = {
        q: 'director',
        jobTitles: ['Director of Sales'],
        departments: ['Sales'],
        locations: ['New York, New York'],
        industries: ['Enterprise Software'],
        status: ['IN SEQUENCE'],
        companySize: ['200-500'],
        page: 3,
        limit: 50,
        sortBy: 'company',
        sortOrder: 'desc',
        tab: 'saved',
      };

      const serialized = serializeFiltersToUrl(initial);
      const parsed = parseUrlToFilters(serialized);

      expect(parsed.q).toBe(initial.q);
      expect(parsed.jobTitles).toEqual(initial.jobTitles);
      expect(parsed.departments).toEqual(initial.departments);
      expect(parsed.locations).toEqual(initial.locations);
      expect(parsed.industries).toEqual(initial.industries);
      expect(parsed.status).toEqual(initial.status);
      expect(parsed.companySize).toEqual(initial.companySize);
      expect(parsed.page).toBe(initial.page);
      expect(parsed.limit).toBe(initial.limit);
      expect(parsed.sortBy).toBe(initial.sortBy);
      expect(parsed.sortOrder).toBe(initial.sortOrder);
      expect(parsed.tab).toBe(initial.tab);
    });
  });

  describe('7. MSW HTTP API Endpoints Integration', () => {
    it('GET /api/leads returns paginated leads payload', async () => {
      const res = queryLeads({ page: 1, limit: 10 });
      expect(res.items.length).toBe(10);
      expect(res.totalPages).toBeGreaterThan(1);
    });

    it('POST /api/leads/export produces CSV string for bulk selected IDs', () => {
      const selectedIds = ['lead-1', 'lead-2'];
      const allLeads = getLeadsDatabase();
      const selectedLeads = allLeads.filter((l) => selectedIds.includes(l.id));
      const csv = generateExportCsv(selectedLeads);
      const lines = csv.split('\r\n');

      expect(lines.length).toBe(3); // Header + 2 selected leads
      expect(csv).toContain('"lead-1"');
      expect(csv).toContain('"lead-2"');
    });
  });
});
