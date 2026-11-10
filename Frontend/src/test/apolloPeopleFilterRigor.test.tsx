import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  filterLeadsInMemory,
  fetchApolloPeopleLeads,
  queryApolloPeopleLeadsLocal,
} from '@/services/apolloService';
import { Lead } from '@/types/lead';

describe('Apollo People Filter Rigor Suite', () => {
  const sampleLeads: Lead[] = [
    {
      id: 'dm-1',
      name: 'Sarah Connor',
      title: 'VP of Global Logistics',
      company: 'Cyberdyne Systems',
      companyLogo: '',
      industry: 'automotive & transportation',
      department: 'Operations',
      status: 'NET NEW',
      location: 'Detroit, Michigan, United States',
      city: 'Detroit',
      state: 'Michigan',
      country: 'United States',
      email: 'sconnor@cyberdyne.com',
      phone: '+1 313-555-0199',
      employees: '1000+',
      employeeCount: 2500,
      revenue: '$500M',
      funding: 'Public',
      decisionMaker: true,
      seniority: 'vp',
      saved: false,
    },
    {
      id: 'dm-2',
      name: 'John Miller',
      title: 'Director of Procurement',
      company: 'Novartis Healthcare',
      companyLogo: '',
      industry: 'pharmaceuticals',
      department: 'Supply Chain & Procurement',
      status: 'NET NEW',
      location: 'Basel, Switzerland',
      city: 'Basel',
      country: 'Switzerland',
      email: 'jmiller@novartis.com',
      phone: '+41 61-555-0144',
      employees: '501-1000',
      employeeCount: 850,
      revenue: '$200M',
      funding: 'Public',
      decisionMaker: true,
      seniority: 'director',
      saved: false,
    },
    {
      id: 'dm-3',
      name: 'Hans Gruber',
      title: 'Warehouse & Shipping Coordinator',
      company: 'Nakatomi Trading',
      companyLogo: '',
      industry: 'building materials',
      department: 'Operations',
      status: 'COLD',
      location: 'Hamburg, Germany',
      city: 'Hamburg',
      country: 'Germany',
      email: 'hgruber@nakatomi.de',
      phone: '+49 40-555-0188',
      employees: '11-50',
      employeeCount: 35,
      revenue: '$15M',
      funding: 'Private',
      decisionMaker: false,
      seniority: 'entry',
      saved: true,
    },
    {
      id: 'dm-4',
      name: 'Priya Sharma',
      title: 'Chief Executive Officer',
      company: 'Spice Route Logistics',
      companyLogo: '',
      industry: 'food & beverages',
      department: 'Executive',
      status: 'NET NEW',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      email: 'psharma@spiceroute.in',
      phone: '+91 22-555-0122',
      employees: '1-10',
      employeeCount: 8,
      revenue: '$5M',
      funding: 'Private',
      decisionMaker: true,
      seniority: 'c_suite',
      saved: false,
    },
    {
      id: 'dm-5',
      name: 'Carlos Silva',
      title: 'Freight Forwarding Partner',
      company: 'Santos Maritime Hub',
      companyLogo: '',
      industry: 'transportation',
      department: 'Commercial',
      status: 'NET NEW',
      location: 'Santos, Sao Paulo, Brazil',
      city: 'Santos',
      country: 'Brazil',
      email: 'csilva@santosmaritime.br',
      phone: '+55 13-555-0177',
      employees: '51-200',
      employeeCount: 120,
      revenue: '$25M',
      funding: 'Private',
      decisionMaker: true,
      seniority: 'owner',
      saved: false,
    },
  ];

  describe('filterLeadsInMemory Rigor', () => {
    it('filters strictly by seniority tier (c_suite, vp, director, owner)', () => {
      const cSuite = filterLeadsInMemory(sampleLeads, { seniority: ['c_suite'] });
      expect(cSuite.map((l) => l.id)).toEqual(['dm-4']);

      const vpDirector = filterLeadsInMemory(sampleLeads, { seniority: ['vp', 'director'] });
      expect(vpDirector.map((l) => l.id)).toEqual(['dm-1', 'dm-2']);

      const owner = filterLeadsInMemory(sampleLeads, { seniority: ['owner'] });
      expect(owner.map((l) => l.id)).toEqual(['dm-5']);
    });

    it('filters by Cargo Verticals using semantic expansion', () => {
      const automotive = filterLeadsInMemory(sampleLeads, {
        industries: ['Automotive & Transportation'],
      });
      // Matches Sarah Connor (automotive & transportation) and Carlos Silva (transportation)
      expect(automotive.map((l) => l.id)).toEqual(['dm-1', 'dm-5']);

      const pharma = filterLeadsInMemory(sampleLeads, {
        industries: ['Pharmaceuticals & Healthcare'],
      });
      expect(pharma.map((l) => l.id)).toEqual(['dm-2']);

      const perishables = filterLeadsInMemory(sampleLeads, {
        industries: ['Perishables, Food & Beverage'],
      });
      expect(perishables.map((l) => l.id)).toEqual(['dm-4']);
    });

    it('filters by Company Size tiers using exact headcount ranges', () => {
      const small = filterLeadsInMemory(sampleLeads, { companySize: ['1-10'] });
      expect(small.map((l) => l.id)).toEqual(['dm-4']);

      const midSmall = filterLeadsInMemory(sampleLeads, { companySize: ['11-50'] });
      expect(midSmall.map((l) => l.id)).toEqual(['dm-3']);

      const enterprise = filterLeadsInMemory(sampleLeads, { companySize: ['1000+'] });
      expect(enterprise.map((l) => l.id)).toEqual(['dm-1']);
    });

    it('filters by Decision Makers Only toggle', () => {
      const dms = filterLeadsInMemory(sampleLeads, { decisionMakersOnly: true });
      expect(dms.map((l) => l.id)).toEqual(['dm-1', 'dm-2', 'dm-4', 'dm-5']);
    });

    it('filters by Logistics Only toggle', () => {
      const logOnly = filterLeadsInMemory(sampleLeads, { logisticsOnly: true });
      // Hans Gruber (warehouse/shipping) and Priya Sharma (Spice Route Logistics) and Carlos Silva (freight) and Sarah Connor (logistics)
      expect(logOnly.some((l) => l.id === 'dm-1')).toBe(true);
      expect(logOnly.some((l) => l.id === 'dm-3')).toBe(true);
      expect(logOnly.some((l) => l.id === 'dm-5')).toBe(true);
    });

    it('filters by Trade Corridor / Country locations', () => {
      const india = filterLeadsInMemory(sampleLeads, { locations: ['India'] });
      expect(india.map((l) => l.id)).toEqual(['dm-4']);

      const multi = filterLeadsInMemory(sampleLeads, { locations: ['India', 'Brazil'] });
      expect(multi.map((l) => l.id)).toEqual(['dm-4', 'dm-5']);
    });
  });

  describe('fetchApolloPeopleLeads Parameter Serialization', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('serializes multi-select locations to countries URL parameters', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          page: 1,
          page_size: 25,
          total_records: 120,
          total_pages: 5,
          has_next: true,
          data: [],
        }),
      } as unknown as Response);

      await fetchApolloPeopleLeads({
        locations: ['India', 'Brazil', 'Germany'],
      });

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('countries=India');
      expect(calledUrl).toContain('countries=Brazil');
      expect(calledUrl).toContain('countries=Germany');
      expect(calledUrl).toContain('country=India');
    });

    it('explicitly serializes logistics_only=false when unchecking logisticsOnly', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          page: 1,
          page_size: 25,
          total_records: 15526269,
          total_pages: 621051,
          has_next: true,
          data: [],
        }),
      } as unknown as Response);

      await fetchApolloPeopleLeads({
        logisticsOnly: false,
      });

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('logistics_only=false');
    });
  });
});
