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

    it('renders th column 0 with sticky left-0, column 1 with sticky left-10, and column 7 with sticky right-0', () => {
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

      // Column 0: Checkbox
      const col0Class = thMatches[0][1];
      expect(col0Class).toContain('sticky');
      expect(col0Class).toContain('left-0');
      expect(col0Class).toContain('z-30');
      expect(col0Class).toContain('bg-slate-50');

      // Column 1: Company Name
      const col1Class = thMatches[1][1];
      expect(col1Class).toContain('sticky');
      expect(col1Class).toContain('left-10');
      expect(col1Class).toContain('z-30');
      expect(col1Class).toContain('bg-slate-50');
      expect(col1Class).toContain('min-w-[260px]');

      // Column 7: Action (last column)
      const col7Class = thMatches[7][1];
      expect(col7Class).toContain('sticky');
      expect(col7Class).toContain('right-0');
      expect(col7Class).toContain('z-30');
      expect(col7Class).toContain('bg-slate-50');
      expect(col7Class).toContain('min-w-[160px]');
    });

    it('renders tbody td cells in column 0, 1, and 7 with corresponding sticky classes when unselected', () => {
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

      // Column 0: Checkbox
      const col0Class = tdMatches[0][1];
      expect(col0Class).toContain('sticky');
      expect(col0Class).toContain('left-0');
      expect(col0Class).toContain('z-10');
      expect(col0Class).toContain('bg-white');

      // Column 1: Company Name
      const col1Class = tdMatches[1][1];
      expect(col1Class).toContain('sticky');
      expect(col1Class).toContain('left-10');
      expect(col1Class).toContain('z-10');
      expect(col1Class).toContain('bg-white');

      // Column 7: Action
      const col7Class = tdMatches[7][1];
      expect(col7Class).toContain('sticky');
      expect(col7Class).toContain('right-0');
      expect(col7Class).toContain('z-10');
      expect(col7Class).toContain('bg-white');
    });

    it('renders tbody td sticky cells with selected background (bg-blue-50/90) when row is selected', () => {
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

      const tdMatches = Array.from(firstRowMatch![0].matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      expect(tdMatches.length).toBe(8);

      // Selected sticky cells must have bg-blue-50/90 to match selection and conceal scrolled content
      expect(tdMatches[0][1]).toContain('bg-blue-50/90');
      expect(tdMatches[1][1]).toContain('bg-blue-50/90');
      expect(tdMatches[7][1]).toContain('bg-blue-50/90');
    });

    it('renders skeleton rows with sticky pinning on columns 0, 1, and 7 when isLoading is true', () => {
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
      expect(thMatches[0][1]).toContain('sticky left-0');
      expect(thMatches[1][1]).toContain('sticky left-10');
      expect(thMatches[7][1]).toContain('sticky right-0');

      // tbody skeleton td pinning
      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      expect(trMatches.length).toBe(2);

      const tdMatches = Array.from(trMatches[0]!.matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      expect(tdMatches[0][1]).toContain('sticky left-0');
      expect(tdMatches[1][1]).toContain('sticky left-10');
      expect(tdMatches[7][1]).toContain('sticky right-0');
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

      // Checkbox (col 0)
      expect(thMatches[0][1]).toContain('sticky left-0');
      // Company Name (col 1)
      expect(thMatches[1][1]).toContain('sticky left-10');
      // Action (col 10)
      expect(thMatches[10][1]).toContain('sticky right-0');
    });

    it('renders tbody td cells with sticky pinning for column 0, 1, and 10', () => {
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

      // Col 0
      expect(tdMatches[0][1]).toContain('sticky left-0');
      // Col 1
      expect(tdMatches[1][1]).toContain('sticky left-10');
      // Col 10 (Action)
      expect(tdMatches[10][1]).toContain('sticky right-0');
    });

    it('renders JfllCustomerTable skeleton with sticky columns', () => {
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
      expect(thMatches[0][1]).toContain('sticky left-0');
      expect(thMatches[1][1]).toContain('sticky left-10');
      expect(thMatches[10][1]).toContain('sticky right-0');

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      const tdMatches = Array.from(trMatches[0]!.matchAll(/<td[^>]*class="([^"]*)"[^>]*>/g));
      expect(tdMatches[0][1]).toContain('sticky left-0');
      expect(tdMatches[1][1]).toContain('sticky left-10');
      expect(tdMatches[10][1]).toContain('sticky right-0');
    });
  });
});
