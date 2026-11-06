import { describe, it, expect } from 'vitest';
import {
  queryDatamyneLeads,
  getLoadedDatamyneDataset,
  setLoadedDatamyneDataset,
  subscribeToDatamyneDataset,
  exportDatamyneLeadsCsv,
  exportDatamyneSummaryReportCsv,
  formatDatamyneCompanyRole,
  formatDatamyneCategorySubcategory,
  formatDatamyneCityCorridor,
  getDatamyneCategoryFacets,
  getDatamyneSubcategoryFacets,
} from '@/services/datamyneService';
import {
  DatamyneLeadSchema,
  DatamyneLead,
  CATEGORY_TO_TAB_MAP,
  TAB_TO_CATEGORY_MAP,
} from '@/types/datamyneLead';

describe('DataMyne Leads Service & Schemas', () => {
  it('validates a complete DatamyneLead record using DatamyneLeadSchema', () => {
    const rawRecord = {
      id: 'dm-val-00001',
      company_name: 'TEST EXPORTS PRIVATE LIMITED',
      role: 'Exporter',
      category: 'Perishables',
      subcategory: 'Fresh Vegetables & Produce',
      contact_type: 'Both Phone & Email',
      phone: '9820012345',
      email: 'contact@testexports.com',
      tax_id: '0303030303',
      city: 'MUMBAI',
      address: 'Plot 45, APMC Market, Vashi',
      pin_code: '400703',
      directors: 'RAMESH SHARMA, SURESH PATEL',
      trade_lanes: 'PER/AIR',
      top_hs_codes: '0709, 0810',
      total_shipments: 45,
      total_value_usd: 125000,
      latest_activity_date: '2024-03-15',
      dataset_type: 'valid',
    };

    const parsed = DatamyneLeadSchema.parse(rawRecord);
    expect(parsed.id).toBe('dm-val-00001');
    expect(parsed.category).toBe('Perishables');
    expect(parsed.subcategory).toBe('Fresh Vegetables & Produce');
    expect(parsed.dataset_type).toBe('valid');
    expect(parsed.total_shipments).toBe(45);
  });

  it('validates a Missing Contact record with defaults', () => {
    const rawMissing = {
      id: 'dm-mis-00001',
      company_name: 'GLOBAL IMPORTERS LTD',
      role: 'Importer',
      category: 'Engineering & Machinery',
      subcategory: 'Industrial Machinery & Boilers',
      contact_type: 'Missing Phone & Email',
      city: 'NEW DELHI',
      dataset_type: 'missing',
    };

    const parsed = DatamyneLeadSchema.parse(rawMissing);
    expect(parsed.id).toBe('dm-mis-00001');
    expect(parsed.phone).toBe('');
    expect(parsed.email).toBe('');
    expect(parsed.total_shipments).toBe(0);
    expect(parsed.dataset_type).toBe('missing');
  });

  it('retrieves the loaded starter dataset with at least 600 records', () => {
    const dataset = getLoadedDatamyneDataset();
    expect(dataset.length).toBeGreaterThanOrEqual(600);
  });

  it('queries valid contacts dataset by default', () => {
    const response = queryDatamyneLeads({ dataset: 'valid' });
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items.every((item) => item.dataset_type === 'valid')).toBe(true);
    expect(response.datasetCounts.valid).toBeGreaterThan(0);
  });

  it('queries missing contacts dataset when requested', () => {
    const response = queryDatamyneLeads({ dataset: 'missing' });
    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items.every((item) => item.dataset_type === 'missing')).toBe(true);
    expect(response.datasetCounts.missing).toBeGreaterThan(0);
  });

  it('queries all unified leads when dataset is "all"', () => {
    const response = queryDatamyneLeads({ dataset: 'all', limit: 100 });
    const hasValid = response.items.some((i) => i.dataset_type === 'valid');
    const hasMissing = response.items.some((i) => i.dataset_type === 'missing');
    expect(hasValid || hasMissing).toBe(true);
  });

  it('filters by category tabs correctly', () => {
    const perishablesRes = queryDatamyneLeads({ dataset: 'all', tab: 'perishables' });
    expect(perishablesRes.items.every((i) => i.category === 'Perishables')).toBe(true);

    const pharmaRes = queryDatamyneLeads({ dataset: 'all', tab: 'pharma' });
    expect(pharmaRes.items.every((i) => i.category === 'Pharma & Healthcare')).toBe(true);

    const textilesRes = queryDatamyneLeads({ dataset: 'all', tab: 'textiles' });
    expect(textilesRes.items.every((i) => i.category === 'Textiles & Apparel')).toBe(true);

    const engineeringRes = queryDatamyneLeads({ dataset: 'all', tab: 'engineering' });
    expect(engineeringRes.items.every((i) => i.category === 'Engineering & Machinery')).toBe(true);
  });

  it('searches across company name, city, and subcategory', () => {
    const searchRes = queryDatamyneLeads({ dataset: 'all', q: 'mumbai' });
    expect(searchRes.items.length).toBeGreaterThan(0);
    expect(
      searchRes.items.every((i) =>
        i.city.toLowerCase().includes('mumbai') ||
        i.company_name.toLowerCase().includes('mumbai') ||
        i.address.toLowerCase().includes('mumbai') ||
        i.directors.toLowerCase().includes('mumbai') ||
        i.subcategory.toLowerCase().includes('mumbai')
      )
    ).toBe(true);
  });

  it('filters by minimum shipments and minimum traded value', () => {
    const highVolRes = queryDatamyneLeads({ dataset: 'all', minShipments: 10 });
    expect(highVolRes.items.every((i) => i.total_shipments >= 10)).toBe(true);

    const highValRes = queryDatamyneLeads({ dataset: 'all', minTradedValueUsd: 50000 });
    expect(highValRes.items.every((i) => i.total_value_usd >= 50000)).toBe(true);
  });

  it('filters by hasDirectors boolean flag', () => {
    const directorsRes = queryDatamyneLeads({ dataset: 'all', hasDirectors: true });
    expect(directorsRes.items.every((i) => Boolean(i.directors && i.directors.trim()))).toBe(true);
  });

  it('correctly handles pagination', () => {
    const page1 = queryDatamyneLeads({ dataset: 'all', page: 1, limit: 10 });
    const page2 = queryDatamyneLeads({ dataset: 'all', page: 2, limit: 10 });

    expect(page1.items.length).toBe(10);
    expect(page2.items.length).toBe(10);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
    expect(page1.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('provides category and subcategory facets', () => {
    const categoryFacets = getDatamyneCategoryFacets('all');
    expect(categoryFacets.length).toBeGreaterThan(0);
    expect(categoryFacets.some((f) => f.label === 'Perishables')).toBe(true);

    const subcategoryFacets = getDatamyneSubcategoryFacets('Perishables', 'all');
    expect(subcategoryFacets.length).toBeGreaterThan(0);
  });

  describe('Dynamic Audience Tab Counts Filter Responsiveness', () => {
    it('updates All Verticals and Perishables counts when filtering by Country (Brazil)', () => {
      const allRes = queryDatamyneLeads({ dataset: 'all' });
      const brazilRes = queryDatamyneLeads({ dataset: 'all', countries: ['Brazil'] });

      // Brazil count should be strictly smaller than total universe
      expect(brazilRes.audienceCounts.all).toBeLessThan(allRes.audienceCounts.all);
      expect(brazilRes.audienceCounts.all).toBeGreaterThan(0);
      expect(brazilRes.audienceCounts.perishables).toBeLessThanOrEqual(allRes.audienceCounts.perishables);
      // All verticals count equals the sum of the matching records
      expect(brazilRes.datasetCounts.all).toBe(brazilRes.audienceCounts.all);
    });

    it('updates All Verticals and category counts when filtering by Operational Hub / City', () => {
      const allRes = queryDatamyneLeads({ dataset: 'all' });
      const mumbaiRes = queryDatamyneLeads({ dataset: 'all', cities: ['MUMBAI'] });

      expect(mumbaiRes.audienceCounts.all).toBeLessThan(allRes.audienceCounts.all);
      expect(mumbaiRes.audienceCounts.all).toBeGreaterThan(0);
      expect(mumbaiRes.audienceCounts.perishables).toBeLessThanOrEqual(allRes.audienceCounts.perishables);
    });

    it('updates counts when filtering by Transport Mode (Air)', () => {
      const allRes = queryDatamyneLeads({ dataset: 'all' });
      const airRes = queryDatamyneLeads({ dataset: 'all', transportModes: ['Air'] });

      expect(airRes.audienceCounts.all).toBeLessThan(allRes.audienceCounts.all);
      expect(airRes.audienceCounts.all).toBeGreaterThan(0);
    });

    it('preserves sibling vertical category counts when switching active tab to Perishables', () => {
      const brazilAllTab = queryDatamyneLeads({ dataset: 'all', countries: ['Brazil'], tab: 'all' });
      const brazilPerishablesTab = queryDatamyneLeads({ dataset: 'all', countries: ['Brazil'], tab: 'perishables' });

      // Total scope and category counts should match regardless of active tab
      expect(brazilPerishablesTab.audienceCounts.all).toBe(brazilAllTab.audienceCounts.all);
      expect(brazilPerishablesTab.audienceCounts.perishables).toBe(brazilAllTab.audienceCounts.perishables);
      expect(brazilPerishablesTab.audienceCounts.pharma).toBe(brazilAllTab.audienceCounts.pharma);

      // But items and totalEstimate must reflect the active tab
      expect(brazilPerishablesTab.totalEstimate).toBe(brazilPerishablesTab.audienceCounts.perishables);
      expect(brazilPerishablesTab.items.every((d) => d.category === 'Perishables')).toBe(true);
    });
  });

  describe('CWE-1236 CSV Injection Defense', () => {
    it('sanitizes formula injection prefixes (=, +, -, @, tab) in exported CSV', async () => {
      const maliciousLeads: DatamyneLead[] = [
        {
          id: 'test-cwe-1',
          company_name: '=cmd|/c calc!A0',
          role: '+Exporter',
          transport_mode: 'Air',
          category: '-Pharma',
          subcategory: '@Subcat',
          contact_type: 'Both Phone & Email',
          phone: '\t9999999999',
          email: 'safe@test.com',
          tax_id: 'PAN123',
          city: 'MUMBAI',
          address: 'Safe Street',
          pin_code: '400001',
          directors: '=SUM(A1:A10)',
          trade_lanes: 'PER/AIR',
          top_hs_codes: '0810',
          total_shipments: 10,
          total_value_usd: 50000,
          latest_activity_date: '2024-01-01',
          dataset_type: 'valid',
        },
      ];

      const blob = exportDatamyneLeadsCsv(maliciousLeads);
      const text = await blob.text();

      // Ensure formulas were neutralized with a leading single quote (')
      expect(text).toContain('"\'=cmd|/c calc!A0"');
      expect(text).toContain('"\'+Exporter"');
      expect(text).toContain('"\'-Pharma"');
      expect(text).toContain('"\'@Subcat"');
      expect(text).toContain('"\'\t9999999999"');

      // Ensure header contains Logistics Category, Cargo Subcategory, and Transport Mode
      expect(text).toContain('Logistics Category');
      expect(text).toContain('Cargo Subcategory');
      expect(text).toContain('Transport Mode');
    });

    it('filters leads by transport modes (Air, Ocean, Air & Ocean)', () => {
      const airRes = queryDatamyneLeads({ dataset: 'all', transportModes: ['Air'] });
      expect(airRes.items.length).toBeGreaterThan(0);
      expect(airRes.items.every((i) => i.transport_mode === 'Air')).toBe(true);

      const oceanRes = queryDatamyneLeads({ dataset: 'all', transportModes: ['Ocean'] });
      if (oceanRes.items.length > 0) {
        expect(oceanRes.items.every((i) => i.transport_mode === 'Ocean')).toBe(true);
      }

      const multiModalRes = queryDatamyneLeads({ dataset: 'all', transportModes: ['Air & Ocean'] });
      if (multiModalRes.items.length > 0) {
        expect(multiModalRes.items.every((i) => i.transport_mode === 'Air & Ocean')).toBe(true);
      }

      const combinedRes = queryDatamyneLeads({ dataset: 'all', transportModes: ['Air', 'Ocean'] });
      expect(combinedRes.items.every((i) => i.transport_mode === 'Air' || i.transport_mode === 'Ocean')).toBe(true);
    });

    it('filters accurately when multimodal and both export and import filters are applied', () => {
      const res = queryDatamyneLeads({
        dataset: 'all',
        transportModes: ['Air & Ocean'],
        roles: ['Exporter', 'Importer'],
      });
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items.every((i) => i.transport_mode === 'Air & Ocean')).toBe(true);
      // All matched leads must be either Exporter, Importer, or Dual (Both)
      expect(
        res.items.every(
          (i) =>
            i.role === 'Exporter' ||
            i.role === 'Importer' ||
            i.role === 'Both' ||
            i.role === 'Both (Exporter & Importer)'
        )
      ).toBe(true);
    });

    it('matches dual-trade records when Both filter is selected', () => {
      const res = queryDatamyneLeads({
        dataset: 'all',
        roles: ['Both'],
      });
      expect(res.items.length).toBeGreaterThan(0);
      expect(
        res.items.every(
          (i) => i.role === 'Both' || i.role === 'Both (Exporter & Importer)'
        )
      ).toBe(true);
    });

    it('gracefully resolves category and tab conflict to prevent false 0-lead empty states', () => {
      // User is on 'perishables' tab but selects 'Engineering & Machinery' in sidebar
      const res = queryDatamyneLeads({
        dataset: 'all',
        tab: 'perishables',
        categories: ['Engineering & Machinery'],
      });
      expect(res.totalEstimate).toBeGreaterThan(0);
      expect(res.items.every((i) => i.category === 'Engineering & Machinery')).toBe(true);
    });

    it('exports correct mapping between categories and tabs', () => {
      expect(CATEGORY_TO_TAB_MAP['Engineering & Machinery']).toBe('engineering');
      expect(CATEGORY_TO_TAB_MAP['Perishables']).toBe('perishables');
      expect(TAB_TO_CATEGORY_MAP['engineering']).toBe('Engineering & Machinery');
      expect(TAB_TO_CATEGORY_MAP['perishables']).toBe('Perishables');
    });

    it('notifies subscribers when datamyne dataset is hydrated', () => {
      let notified = false;
      const unsubscribe = subscribeToDatamyneDataset(() => {
        notified = true;
      });

      // Update loaded dataset
      setLoadedDatamyneDataset(getLoadedDatamyneDataset());
      expect(notified).toBe(true);
      unsubscribe();
    });
  });

  describe('DataMyne Senior Management Executive Summary Report', () => {
    const mockLead1: DatamyneLead = DatamyneLeadSchema.parse({
      id: 'dm-val-00001',
      company_name: 'EUROFARMA LABORATORIOS SA',
      role: 'Both (Exporter & Importer)',
      transport_mode: 'Air',
      category: 'Pharma & Healthcare',
      subcategory: 'Finished Formulations & Generics',
      contact_type: 'Both Phone & Email',
      phone: '+55 11 98765-4321',
      email: 'logistica@eurofarma.com.br',
      tax_id: '039281720001',
      city: 'São Paulo',
      country: 'Brazil',
      trade_lanes: 'Brazil-India/Air',
      total_shipments: 84,
      total_value_usd: 1250000,
      dataset_type: 'valid',
    });

    const mockLead2: DatamyneLead = DatamyneLeadSchema.parse({
      id: 'dm-val-00002',
      company_name: '=CMD() INJECTION TEST LTD',
      role: 'Exporter',
      transport_mode: 'Ocean',
      category: 'Chemicals & Materials',
      subcategory: 'Organic Chemicals & APIs',
      contact_type: 'Phone Only',
      phone: '9820011223',
      city: 'Mumbai',
      country: 'India',
      trade_lanes: 'India-US/Ocean',
      total_shipments: 12,
      total_value_usd: 450000,
      dataset_type: 'valid',
    });

    it('formats company & role cleanly with role, transport mode and tax ID', () => {
      const formatted = formatDatamyneCompanyRole(mockLead1);
      expect(formatted).toBe('EUROFARMA LABORATORIOS SA (Both • Air • IEC: 039281720001)');

      const simpleLead: DatamyneLead = DatamyneLeadSchema.parse({
        id: 'dm-val-00003',
        company_name: 'EUROFARMA LABORATORIOS SA',
        role: 'Exporter',
        transport_mode: undefined,
        tax_id: '',
        category: 'Pharma',
        subcategory: 'Generics',
      });
      // Transport mode defaults to 'Air' in DatamyneLeadSchema, so role is Exporter • Air
      expect(formatDatamyneCompanyRole(simpleLead)).toBe('EUROFARMA LABORATORIOS SA (Exporter • Air)');
    });

    it('formats category & subcategory into a single hierarchy string', () => {
      const formatted = formatDatamyneCategorySubcategory(mockLead1);
      expect(formatted).toBe('Pharma & Healthcare — Finished Formulations & Generics');
    });

    it('formats city & corridor cleanly', () => {
      const formatted = formatDatamyneCityCorridor(mockLead1);
      expect(formatted).toBe('São Paulo (Brazil-India/Air)');

      const noCorridorLead: DatamyneLead = DatamyneLeadSchema.parse({
        ...mockLead1,
        trade_lanes: '',
      });
      expect(formatDatamyneCityCorridor(noCorridorLead)).toBe('São Paulo');
    });

    it('generates a 5-column CSV Blob with UTF-8 BOM and sanitized RFC-4180 cells', async () => {
      const notesMap = {
        'dm-val-00001': 'Discovery meeting held with procurement director; requested GRU-BOM charter quote.',
        'dm-val-00002': '=HYPERLINK("http://attacker.com","click")',
      };
      const statusMap = {
        'dm-val-00001': 'Meeting Scheduled',
        'dm-val-00002': 'Contacted',
      };

      const blob = exportDatamyneSummaryReportCsv([mockLead1, mockLead2], { notesMap, statusMap });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');

      // Verify Excel UTF-8 BOM byte sequence (0xEF, 0xBB, 0xBF)
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);

      const text = await blob.text();
      const lines = text.split('\r\n');
      expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 rows

      // Verify exact 5-column header
      expect(lines[0]).toBe(
        'Company & Role,Category & Subcategory,City & Corridor,Sales Status,Additional Note'
      );

      // Verify mockLead1 row values
      expect(lines[1]).toContain('"EUROFARMA LABORATORIOS SA (Both • Air • IEC: 039281720001)"');
      expect(lines[1]).toContain('"Pharma & Healthcare — Finished Formulations & Generics"');
      expect(lines[1]).toContain('"São Paulo (Brazil-India/Air)"');
      expect(lines[1]).toContain('"Meeting Scheduled"');
      expect(lines[1]).toContain('"Discovery meeting held with procurement director; requested GRU-BOM charter quote."');

      // Verify spreadsheet formula injection prevention on mockLead2
      // Company starting with = must be escaped to '=
      expect(lines[2]).toContain('\'=CMD() INJECTION TEST LTD');
      // Note starting with = must be escaped to '=
      expect(lines[2]).toContain('\'=HYPERLINK');
    });
  });
});


