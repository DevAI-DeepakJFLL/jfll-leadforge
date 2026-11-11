import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { DatamyneDetailDrawer } from '@/components/datamyne/DatamyneDetailDrawer';
import { DatamyneView } from '@/components/views/DatamyneView';
import { ToastProvider } from '@/components/ui/Toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  FREE_WEBMAIL_DOMAINS,
  extractDomainFromEmail,
  extractFirstDirectorName,
  cleanCustomsCompanyName,
} from '@/utils/apolloUtils';
import {
  fetchApolloPeopleLeads,
  queryApolloPeopleLeadsLocal,
  PeopleLeadsFilterOptions,
} from '@/services/apolloService';
import { DatamyneLead, DatamyneResponse } from '@/types/datamyneLead';

// Polyfill minimal localStorage to suppress approach store warning in Node environment
const memoryStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, val: string) => memoryStore.set(key, String(val)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() {
    return memoryStore.size;
  },
  key: (i: number) => Array.from(memoryStore.keys())[i] || null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe('DataMyne to Apollo Decision Makers Integration Suite', () => {
  const sampleValidLead: DatamyneLead = {
    id: 'dm-val-001',
    company_name: 'M/S SANOFI INDIA LIMITED',
    role: 'Exporter',
    category: 'Pharmaceuticals',
    subcategory: 'Finished Formulations',
    contact_type: 'Both Phone & Email',
    phone: '+91 22 28032000',
    email: 'contact@sanofi.com',
    tax_id: '0388001122',
    city: 'MUMBAI',
    address: 'Sanofi House, CTS No 117-B, L&T Business Park, Saki Vihar Road, Powai',
    pin_code: '400072',
    directors: 'DIR: RAJESH SHARMA DIN: 01234567',
    trade_lanes: 'BOM-FRA, BOM-JFK',
    top_hs_codes: '300490, 300410',
    total_shipments: 450,
    total_value_usd: 12500000,
    latest_activity_date: '2026-03-01',
    dataset_type: 'valid',
    transport_mode: 'Air',
  };

  const sampleMissingLead: DatamyneLead = {
    id: 'dm-mis-002',
    company_name: 'MESSRS. LARSEN & TOUBRO LTD',
    role: 'Both (Exporter & Importer)',
    category: 'Machinery & Heavy Engineering',
    subcategory: 'Pressure Vessels & Nuclear Equipment',
    contact_type: 'Address Only',
    phone: '',
    email: '',
    tax_id: '0388998877',
    city: 'HAZIRA',
    address: 'L&T Heavy Engineering Complex, Hazira Manufacturing Complex',
    pin_code: '394510',
    directors: 'ATTN: MR. AMIT GUPTA - MANAGING DIRECTOR',
    trade_lanes: 'HAZ-DXB, HAZ-ROT',
    top_hs_codes: '841989, 730900',
    total_shipments: 180,
    total_value_usd: 48900000,
    latest_activity_date: '2026-02-15',
    dataset_type: 'missing',
    transport_mode: 'Ocean',
  };

  const sampleMultiEmailLead: DatamyneLead = {
    id: 'dm-val-003',
    company_name: 'ADANI ENTERPRISES LIMITED',
    role: 'Importer',
    category: 'Energy & Commodities',
    subcategory: 'Coal & Minerals',
    contact_type: 'Both Phone & Email',
    phone: '9820011223',
    email: 'info@gmail.com, logistics@adani.in; ops@yahoo.co.in',
    tax_id: '0488112233',
    city: 'AHMEDABAD',
    address: 'Adani Corporate House, Shantigram, SG Highway',
    pin_code: '382421',
    directors: 'GAUTAM ADANI (CHAIRMAN)',
    trade_lanes: 'MUNDRA-SIN',
    top_hs_codes: '270112',
    total_shipments: 890,
    total_value_usd: 95000000,
    latest_activity_date: '2026-03-05',
    dataset_type: 'valid',
    transport_mode: 'Ocean',
  };

  // --------------------------------------------------------------------------
  // 1. Corporate Domain Extraction & Free Webmail Filtering
  // --------------------------------------------------------------------------
  describe('Domain Extraction Suite (extractDomainFromEmail)', () => {
    it('extracts standard commercial corporate domain', () => {
      expect(extractDomainFromEmail('contact@sanofi.com')).toBe('sanofi.com');
      expect(extractDomainFromEmail('procurement@schneider-electric.com')).toBe('schneider-electric.com');
      expect(extractDomainFromEmail('ops@adani.in')).toBe('adani.in');
    });

    it('strips leading and trailing punctuation, angles, and quotes', () => {
      expect(extractDomainFromEmail('<ops@larsentoubro.com>')).toBe('larsentoubro.com');
      expect(extractDomainFromEmail('"billing@reliance.com"')).toBe('reliance.com');
      expect(extractDomainFromEmail(' logistics@tata.com; ')).toBe('tata.com');
    });

    it('filters out public free webmail providers defined in FREE_WEBMAIL_DOMAINS', () => {
      expect(FREE_WEBMAIL_DOMAINS.has('gmail.com')).toBe(true);
      expect(FREE_WEBMAIL_DOMAINS.has('yahoo.co.in')).toBe(true);
      expect(FREE_WEBMAIL_DOMAINS.has('rediffmail.com')).toBe(true);
      expect(FREE_WEBMAIL_DOMAINS.has('outlook.com')).toBe(true);

      expect(extractDomainFromEmail('john.doe@gmail.com')).toBeNull();
      expect(extractDomainFromEmail('accounts@googlemail.com')).toBeNull();
      expect(extractDomainFromEmail('exports@yahoo.com')).toBeNull();
      expect(extractDomainFromEmail('exports@yahoo.co.in')).toBeNull();
      expect(extractDomainFromEmail('trader@hotmail.com')).toBeNull();
      expect(extractDomainFromEmail('support@outlook.com')).toBeNull();
      expect(extractDomainFromEmail('impex@rediffmail.com')).toBeNull();
      expect(extractDomainFromEmail('lead@rediff.com')).toBeNull();
      expect(extractDomainFromEmail('contact@zoho.com')).toBeNull();
      expect(extractDomainFromEmail('secure@protonmail.com')).toBeNull();
      expect(extractDomainFromEmail('user@sub.gmail.com')).toBeNull();
    });

    it('finds the first authentic commercial domain from multi-email manifest strings', () => {
      expect(extractDomainFromEmail(sampleMultiEmailLead.email)).toBe('adani.in');
      expect(
        extractDomainFromEmail('billing@gmail.com, logistics@schneider-electric.com, hr@yahoo.com')
      ).toBe('schneider-electric.com');
      expect(
        extractDomainFromEmail('office@rediffmail.com; exports@tatasteel.com')
      ).toBe('tatasteel.com');
    });

    it('handles empty, null, undefined, or invalid emails gracefully', () => {
      expect(extractDomainFromEmail(null)).toBeNull();
      expect(extractDomainFromEmail(undefined)).toBeNull();
      expect(extractDomainFromEmail('')).toBeNull();
      expect(extractDomainFromEmail('not an email')).toBeNull();
      expect(extractDomainFromEmail('@nodomain')).toBeNull();
      expect(extractDomainFromEmail('nouser@')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Customs Manifest Director & Executive Extraction
  // --------------------------------------------------------------------------
  describe('Customs Manifest Director Extraction Suite (extractFirstDirectorName)', () => {
    it('extracts director name prefixed with DIR:, DIRECTOR:, MD:, ATTN:, PROP:', () => {
      expect(extractFirstDirectorName('DIR: RAJESH SHARMA DIN: 01234567')).toBe('Rajesh Sharma');
      expect(extractFirstDirectorName('DIRECTOR: ANIL AMBANI')).toBe('Anil Ambani');
      expect(extractFirstDirectorName('MD: PRIYA PATEL')).toBe('Priya Patel');
      expect(extractFirstDirectorName('ATTN: MR. AMIT GUPTA - DIRECTOR')).toBe('Amit Gupta');
      expect(extractFirstDirectorName('PROPRIETOR: SUNIL KUMAR')).toBe('Sunil Kumar');
      expect(extractFirstDirectorName('CONTACT: DR. SNEHA DESHMUKH')).toBe('Sneha Deshmukh');
      expect(extractFirstDirectorName('NAME: SHRI VIKRAM MEHTA')).toBe('Vikram Mehta');
    });

    it('removes trailing designation suffixes and honorifics', () => {
      expect(extractFirstDirectorName('MR. RAJESH SHARMA - MANAGING DIRECTOR')).toBe('Rajesh Sharma');
      expect(extractFirstDirectorName('DR. SNEHA DESHMUKH, MD')).toBe('Sneha Deshmukh');
      expect(extractFirstDirectorName('SHREE RAMESH GUPTA (PROPRIETOR)')).toBe('Ramesh Gupta');
      expect(extractFirstDirectorName('SMT. KAVITA SHAH - PARTNER')).toBe('Kavita Shah');
    });

    it('truncates at DIN, Tel, Mobile, Email, S/O delimiters', () => {
      expect(extractFirstDirectorName('RAJESH SHARMA DIN 08923412 TEL 02228392100')).toBe('Rajesh Sharma');
      expect(extractFirstDirectorName('AMIT GUPTA S/O RAMESH GUPTA')).toBe('Amit Gupta');
      expect(extractFirstDirectorName('VIKRAM MEHTA MOBILE 9820011223')).toBe('Vikram Mehta');
    });

    it('rejects corporate legal entity names passed into director field', () => {
      expect(extractFirstDirectorName('ABC EXPORTS PVT LTD')).toBeNull();
      expect(extractFirstDirectorName('XYZ TRADING COMPANY LIMITED')).toBeNull();
      expect(extractFirstDirectorName('GLOBAL FREIGHT SERVICES LLC')).toBeNull();
      expect(extractFirstDirectorName('RELIANCE ENTERPRISES LLP')).toBeNull();
    });

    it('rejects manifest placeholder noise and invalid values', () => {
      expect(extractFirstDirectorName('No Direct Contact on File')).toBeNull();
      expect(extractFirstDirectorName('N/A')).toBeNull();
      expect(extractFirstDirectorName('NA')).toBeNull();
      expect(extractFirstDirectorName('NONE')).toBeNull();
      expect(extractFirstDirectorName('AS PER INVOICE')).toBeNull();
      expect(extractFirstDirectorName('TO ORDER')).toBeNull();
      expect(extractFirstDirectorName('SAME AS CONSIGNEE')).toBeNull();
      expect(extractFirstDirectorName('COMMERCIAL SHIPPER')).toBeNull();
      expect(extractFirstDirectorName('DIRECTOR')).toBeNull();
      expect(extractFirstDirectorName('1234567')).toBeNull();
      expect(extractFirstDirectorName(null)).toBeNull();
      expect(extractFirstDirectorName('')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Corporate Name Normalization
  // --------------------------------------------------------------------------
  describe('Corporate Name Normalization Suite (cleanCustomsCompanyName)', () => {
    it('strips shipping and customs prefixes (M/S, MESSRS, SHREE, THE)', () => {
      expect(cleanCustomsCompanyName('M/S SANOFI INDIA LIMITED')).toBe('sanofi');
      expect(cleanCustomsCompanyName('MESSRS. LARSEN & TOUBRO LTD')).toBe('larsen & toubro');
      expect(cleanCustomsCompanyName('THE TATA MOTORS LIMITED')).toBe('tata motors');
      expect(cleanCustomsCompanyName('M / S BHARAT HEAVY ELECTRICALS')).toBe('bharat heavy electricals');
    });

    it('strips corporate legal entity suffixes (INC, CORP, LLC, LLP, LTD, PVT, CO)', () => {
      expect(cleanCustomsCompanyName('SCHNEIDER ELECTRIC INDIA PRIVATE LIMITED')).toBe('schneider electric');
      expect(cleanCustomsCompanyName('SIEMENS HEALTHCARE PRIVATE LIMITED')).toBe('siemens healthcare');
      expect(cleanCustomsCompanyName('CIPLA PHARMACEUTICALS CORP')).toBe('cipla pharmaceuticals');
    });

    it('preserves clean search terms when names are already concise', () => {
      expect(cleanCustomsCompanyName('BHEL')).toBe('bhel');
      expect(cleanCustomsCompanyName('ITC')).toBe('itc');
      expect(cleanCustomsCompanyName('L&T')).toBe('l&t');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Apollo Service & Entity-Scoped Domain Query
  // --------------------------------------------------------------------------
  describe('Apollo Service Domain & Filter Options Suite', () => {
    it('serializes domain parameter into fetchApolloPeopleLeads API request', async () => {
      const origFetch = globalThis.fetch;
      let requestedUrl = '';

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [],
              total_records: 0,
              total_formatted: '0',
              page: 1,
              page_size: 250,
              total_pages: 0,
              audience_counts: { all: 0, new: 0, saved: 0 },
            }),
        });
      });

      try {
        const filterOpts: PeopleLeadsFilterOptions = {
          company: 'Schneider Electric',
          domain: 'se.com',
          limit: 10,
        };

        await fetchApolloPeopleLeads(filterOpts);

        expect(requestedUrl).toContain('domain=se.com');
        expect(requestedUrl).toContain('company=Schneider+Electric');
        // Since company/domain is entity scoped, limit defaults to 250
        expect(requestedUrl).toContain('page_size=250');
      } finally {
        globalThis.fetch = origFetch;
      }
    });

    it('resolves contacts in local query engine using domain fallback', () => {
      const res = queryApolloPeopleLeadsLocal({
        domain: 'sanofi.com',
      });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.items.some((c) => (c.email || '').includes('sanofi'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. DatamyneTable Streamlined Actions & Decision Makers via Drawer
  // --------------------------------------------------------------------------
  describe('DatamyneTable Streamlined Action Column Suite', () => {
    it('renders View, Logs, and Convert while omitting Decision Makers button from table row', () => {
      const onFindSpy = vi.fn();
      const onLogSpy = vi.fn();
      const onConvertSpy = vi.fn();
      const html = renderToString(
        <ToastProvider>
          <DatamyneTable
            leads={[sampleValidLead, sampleMissingLead]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onLeadClick={() => {}}
            onFindDecisionMakers={onFindSpy}
            onLogApproach={onLogSpy}
            onConvertToActive={onConvertSpy}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={2}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      expect(html).toContain('View');
      expect(html).toContain('Logs');
      expect(html).toContain('Convert');
      // Decision Makers button kept exclusively in Drawer to avoid cluttered table rows
      expect(html).not.toContain('<span>Decision Makers</span>');
    });

    it('omits Logs and Convert when handlers are not provided (e.g. Viewer role)', () => {
      const html = renderToString(
        <ToastProvider>
          <DatamyneTable
            leads={[sampleValidLead]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onLeadClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={1}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      expect(html).toContain('View');
      expect(html).not.toContain('<span>Logs</span>');
      expect(html).not.toContain('<span>Convert</span>');
      expect(html).not.toContain('<span>Decision Makers</span>');
    });
  });

  // --------------------------------------------------------------------------
  // 6. DatamyneDetailDrawer Header & Inline Decision Makers
  // --------------------------------------------------------------------------
  describe('DatamyneDetailDrawer Decision Makers Integration Suite', () => {
    it('renders "Decision Maker" header button and on-demand "Get Apollo Verified Decision Maker" CTA', () => {
      const onFindSpy = vi.fn();
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={sampleValidLead}
            onClose={() => {}}
            onFindDecisionMakers={onFindSpy}
          />
        </ToastProvider>
      );

      // Header button
      expect(html).toContain('Decision Maker');
      // Assign & Track is omitted (activity logging in timeline)
      expect(html).not.toContain('Assign &amp; Track');
      // On-demand search CTA
      expect(html).toContain('Get Apollo Verified Decision Maker');
      expect(html).toContain('Apollo Verified Decision Makers');
      expect(html).toContain('@sanofi.com');
    });

    it('omits "Decision Maker" header button when onFindDecisionMakers is undefined and omits "Assign & Track"', () => {
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={sampleValidLead}
            onClose={() => {}}
          />
        </ToastProvider>
      );

      expect(html).not.toContain('<span>Decision Maker</span>');
      expect(html).not.toContain('Assign &amp; Track');
    });

    it('renders on-demand CTA card with recognized attributes instead of auto-fetching on open', () => {
      const onFindSpy = vi.fn();
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={sampleValidLead}
            onClose={() => {}}
            onFindDecisionMakers={onFindSpy}
          />
        </ToastProvider>
      );

      // On-demand button
      expect(html).toContain('Get Apollo Verified Decision Maker');
      // Recognized domain
      expect(html).toContain('@sanofi.com');
      // Recognized director
      expect(html).toContain('Rajesh Sharma');
    });

    it('enhances missing contact notice banner with on-demand Apollo verified CTA when lead dataset_type is missing', () => {
      const onFindSpy = vi.fn();
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={sampleMissingLead}
            onClose={() => {}}
            onFindDecisionMakers={onFindSpy}
          />
        </ToastProvider>
      );

      expect(html).toContain('No Direct Contact on File');
      expect(html).not.toContain('Get Apollo Verified Decision Maker →');
      expect(html).toContain('Get Apollo Verified Decision Maker');
      expect(html).toContain('Amit Gupta');
    });

    it('omits missing contact notice banner for valid leads with contact on file', () => {
      const html = renderToString(
        <ToastProvider>
          <DatamyneDetailDrawer
            isOpen={true}
            lead={sampleValidLead}
            onClose={() => {}}
            onFindDecisionMakers={() => {}}
          />
        </ToastProvider>
      );

      expect(html).not.toContain('No Direct Contact on File');
      expect(html).not.toContain('Cross-reference Apollo verified database');
    });
  });

  // --------------------------------------------------------------------------
  // 7. DatamyneView & Table Wiring
  // --------------------------------------------------------------------------
  describe('DatamyneView Wiring Suite', () => {
    it('forwards onFindDecisionMakers to DatamyneTable inside DatamyneView', () => {
      const onFindSpy = vi.fn();
      const mockQuery: DatamyneResponse = {
        items: [sampleValidLead],
        totalEstimate: 1,
        totalFormatted: '1',
        page: 1,
        limit: 25,
        totalPages: 1,
        audienceCounts: {
          all: 1,
          pharma: 1,
          perishables: 0,
          textiles: 0,
          engineering: 0,
          chemicals: 0,
          electronics: 0,
          automotive: 0,
          general: 0,
          validTotal: 1,
          missingTotal: 0,
        },
        datasetCounts: {
          valid: 1,
          missing: 0,
          all: 1,
        },
      };

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <DatamyneView
              filters={{ page: 1, limit: 25, dataset: 'valid' }}
              query={mockQuery}
              rowSelection={{}}
              onRowSelectionChange={() => {}}
              selectedCount={0}
              isAllOnPageSelected={false}
              isSomeOnPageSelected={false}
              onToggleSelectAllPage={() => {}}
              onDeselectAll={() => {}}
              onExport={() => {}}
              isExporting={false}
              onSearchChange={() => {}}
              onDatasetChange={() => {}}
              onTabChange={() => {}}
              onPageChange={() => {}}
              toggleTransportMode={() => {}}
              toggleCategory={() => {}}
              toggleSubcategory={() => {}}
              toggleRole={() => {}}
              toggleCity={() => {}}
              toggleTradeLane={() => {}}
              toggleContactStatus={() => {}}
              toggleHasDirectors={() => {}}
              setMinShipments={() => {}}
              setMinTradedValueUsd={() => {}}
              clearAllFilters={() => {}}
              activeFilterCount={0}
              onLeadClick={() => {}}
              onFindDecisionMakers={onFindSpy}
              isMobileOpen={false}
              onCloseMobile={() => {}}
            />
          </ToastProvider>
        </QueryClientProvider>
      );

      expect(html).toContain('View');
      expect(html).not.toContain('<span>Decision Makers</span>');
    });
  });
});
