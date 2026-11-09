import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { JfllCustomerTable } from '@/components/jfll/JfllCustomerTable';
import { ToastProvider } from '@/components/ui/Toast';
import { DatamyneLead } from '@/types/datamyneLead';
import { JfllCustomer } from '@/types/jfllCustomer';

const mockLead: DatamyneLead = {
  id: 'dm-test-1',
  company_name: 'ACME LOGISTICS PVT LTD',
  role: 'Exporter',
  category: 'Perishables',
  subcategory: 'Fresh Produce',
  contact_type: 'Both Phone & Email',
  phone: '9876543210',
  email: 'ops@acme.com',
  tax_id: '0512345678',
  city: 'MUMBAI',
  address: 'Sahar Cargo Complex, Andheri East',
  pin_code: '400099',
  directors: 'JOHN DOE, JANE DOE',
  trade_lanes: 'BOM-DXB',
  top_hs_codes: '070999',
  total_shipments: 84,
  total_value_usd: 450000,
  latest_activity_date: '2025-01-10',
  dataset_type: 'valid',
  transport_mode: 'Air',
};

const mockCustomer: JfllCustomer = {
  id: 'cust-test-1',
  fullName: 'RELIANCE LOGISTICS LTD',
  customerGroup: 'Platinum Partner',
  status: 'Active',
  type: 'Direct Shipper',
  territory: 'All Territories',
  contactPersonName: 'RAHUL SHARMA',
  mobileNumber: '9820011223',
  email: 'cargo@reliance.com',
  creditStatus: 'Approved',
  businessLast3m: 1250000,
  totalBusinessTillDate: 4500000,
  saved: false,
};

describe('Table Column & Header Pinning (Sticky Headers & Frozen Columns)', () => {
  describe('DatamyneTable Header and Column Pinning', () => {
    it('renders thead with sticky top-0', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      const theadMatch = html.match(/<thead[^>]*class="([^"]*)"/);
      expect(theadMatch).not.toBeNull();
      const theadClass = theadMatch![1];
      expect(theadClass).toContain('sticky');
      expect(theadClass).toContain('top-0');
      expect(theadClass).toContain('z-20');
    });

    it('renders clean unpinned th headers with sticky top-0 thead matching Apollo layout', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch).not.toBeNull();
      const thMatches = Array.from(theadMatch![0].matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>/g));
      expect(thMatches.length).toBe(8);

      // Verify no vertical column border lines (border-r/border-l) cutting through the table
      thMatches.forEach((th) => {
        expect(th[1]).not.toContain('border-r');
        expect(th[1]).not.toContain('border-l');
      });
    });

    it('renders clean tbody td cells without vertical column divider lines matching ApolloTable', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const firstRowMatch = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/);
      expect(firstRowMatch).not.toBeNull();

      const tdMatches = Array.from(firstRowMatch![0].matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      expect(tdMatches.length).toBe(8);

      // Verify uniform seamless cells without vertical border lines
      tdMatches.forEach((td) => {
        expect(td[1]).not.toContain('border-r');
        expect(td[1]).not.toContain('border-l');
      });
    });

    it('renders tbody tr with seamless row selection highlight matching ApolloTable', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{ [mockLead.id]: true }}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const firstRowMatch = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/);
      expect(firstRowMatch).not.toBeNull();
      expect(firstRowMatch![0]).toContain('bg-blue-50/35');
    });

    it('renders skeleton rows without vertical column divider lines matching ApolloTable layout', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={2}
          totalItems={0}
          onPageChange={() => {}}
          isLoading={true}
        />
      );

      // thead pinning in skeleton
      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch).not.toBeNull();
      expect(theadMatch![0]).toContain('sticky');
      expect(theadMatch![0]).toContain('top-0');

      const thMatches = Array.from(theadMatch![0].matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>/g));
      thMatches.forEach((th) => {
        expect(th[1]).not.toContain('border-r');
        expect(th[1]).not.toContain('border-l');
      });

      // tbody skeleton td without vertical divider lines
      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      expect(trMatches.length).toBe(2);

      const tdMatches = Array.from(trMatches[0]!.matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      tdMatches.forEach((td) => {
        expect(td[1]).not.toContain('border-r');
        expect(td[1]).not.toContain('border-l');
      });
    });
  });

  describe('JfllCustomerTable Header and Column Pinning', () => {
    it('renders thead with sticky top-0 and pinned th cells', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[mockCustomer]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={1}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      const theadMatch = html.match(/<thead[^>]*class="([^"]*)"/);
      expect(theadMatch).not.toBeNull();
      expect(theadMatch![1]).toContain('sticky top-0');

      const fullTheadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(fullTheadMatch).not.toBeNull();
      const thMatches = Array.from(fullTheadMatch![0].matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>/g));
      expect(thMatches.length).toBe(11);

      // Verify no column pinning or vertical border dividers
      thMatches.forEach((th) => {
        expect(th[1]).not.toContain('border-r');
        expect(th[1]).not.toContain('border-l');
        expect(th[1]).not.toContain('sticky left');
        expect(th[1]).not.toContain('sticky right');
      });
    });

    it('renders tbody td cells cleanly without column pinning or vertical divider lines', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[mockCustomer]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={1}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const firstRowMatch = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/);
      expect(firstRowMatch).not.toBeNull();

      const tdMatches = Array.from(firstRowMatch![0].matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      expect(tdMatches.length).toBe(11);

      // Verify no td pinning
      tdMatches.forEach((td) => {
        expect(td[1]).not.toContain('sticky left');
        expect(td[1]).not.toContain('sticky right');
        expect(td[1]).not.toContain('border-r');
        expect(td[1]).not.toContain('border-l');
      });
    });

    it('renders JfllCustomerTable skeleton with clean unpinned rows', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={2}
            totalItems={0}
            onPageChange={() => {}}
            isLoading={true}
          />
        </ToastProvider>
      );

      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch![0]).toContain('sticky top-0');

      const thMatches = Array.from(theadMatch![0].matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>/g));
      thMatches.forEach((th) => {
        expect(th[1]).not.toContain('sticky left');
        expect(th[1]).not.toContain('sticky right');
      });

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      const tdMatches = Array.from(trMatches[0]!.matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      tdMatches.forEach((td) => {
        expect(td[1]).not.toContain('sticky left');
        expect(td[1]).not.toContain('sticky right');
      });
    });
  });
});
