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

describe('Table Alignment and Badge Hierarchy', () => {
  describe('DatamyneTable Numeric Column Alignment', () => {
    it('renders Shipments & Value th with text-right in regular thead', () => {
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

      // Find Shipments header cell
      const thMatches = Array.from(html.matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g));
      const shipmentsTh = thMatches.find((m) => m[2].includes('Shipments'));
      expect(shipmentsTh, 'Shipments & Value th header must exist').toBeDefined();
      expect(shipmentsTh![1]).toContain('text-right');
    });

    it('renders Shipments & Value th with text-right in skeleton thead', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={5}
          totalItems={0}
          onPageChange={() => {}}
          isLoading={true}
        />
      );

      const thMatches = Array.from(html.matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g));
      const shipmentsTh = thMatches.find((m) => m[2].includes('Shipments'));
      expect(shipmentsTh, 'Skeleton Shipments & Value th header must exist').toBeDefined();
      expect(shipmentsTh![1]).toContain('text-right');
    });

    it('renders Shipments & Value td with text-right font-mono tabular-nums', () => {
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

      const tdMatches = Array.from(html.matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g));
      const shipmentsTd = tdMatches.find((m) => m[2].includes('shipments'));
      expect(shipmentsTd, 'Shipments & Value td must exist').toBeDefined();
      expect(shipmentsTd![1]).toContain('text-right');
      expect(shipmentsTd![1]).toContain('font-mono');
      expect(shipmentsTd![1]).toContain('tabular-nums');
    });

    it('renders skeleton Shipments & Value td with text-right font-mono tabular-nums', () => {
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

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const firstRow = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/);
      expect(firstRow).not.toBeNull();

      const tdMatches = Array.from(firstRow![0].matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>/g));
      // Column index 4 (0: checkbox, 1: company, 2: category, 3: city, 4: shipments)
      const shipmentsSkeletonTd = tdMatches[4];
      expect(shipmentsSkeletonTd, 'Skeleton shipments td at index 4 must exist').toBeDefined();
      expect(shipmentsSkeletonTd[1]).toContain('text-right');
      expect(shipmentsSkeletonTd[1]).toContain('font-mono');
      expect(shipmentsSkeletonTd[1]).toContain('tabular-nums');
    });
  });

  describe('JfllCustomerTable Numeric Column Alignment', () => {
    it('renders Recent Revenue th with text-right in regular thead', () => {
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

      const thMatches = Array.from(html.matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g));
      const revenueTh = thMatches.find((m) => m[2].includes('Revenue'));
      expect(revenueTh, 'Revenue th header must exist').toBeDefined();
      expect(revenueTh![1]).toContain('text-right');
    });

    it('renders Recent Revenue th with text-right in skeleton thead', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={5}
            totalItems={0}
            onPageChange={() => {}}
            isLoading={true}
          />
        </ToastProvider>
      );

      const thMatches = Array.from(html.matchAll(/<th\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g));
      const revenueTh = thMatches.find((m) => m[2].includes('Revenue'));
      expect(revenueTh, 'Skeleton revenue th header must exist').toBeDefined();
      expect(revenueTh![1]).toContain('text-right');
    });

    it('renders Revenue td with text-right font-mono tabular-nums', () => {
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

      const tdMatches = Array.from(html.matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g));
      // Revenue td contains formatted currency or 'Tot:'
      const revenueTd = tdMatches.find((m) => m[2].includes('Tot:') || m[2].includes('Cr') || m[2].includes('Lakh'));
      expect(revenueTd, 'Revenue td must exist').toBeDefined();
      expect(revenueTd![1]).toContain('text-right');
      expect(revenueTd![1]).toContain('font-mono');
      expect(revenueTd![1]).toContain('tabular-nums');
    });

    it('renders skeleton Revenue td with text-right font-mono tabular-nums', () => {
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

      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const firstRow = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/);
      expect(firstRow).not.toBeNull();

      const tdMatches = Array.from(firstRow![0].matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>/g));
      // Column index 6 is Recent Revenue
      const revenueSkeletonTd = tdMatches[6];
      expect(revenueSkeletonTd, 'Skeleton revenue td at index 6 must exist').toBeDefined();
      expect(revenueSkeletonTd[1]).toContain('text-right');
      expect(revenueSkeletonTd[1]).toContain('font-mono');
      expect(revenueSkeletonTd[1]).toContain('tabular-nums');
    });
  });

  describe('DatamyneTable Secondary Badge Demotion to Slate', () => {
    it('renders Role badge with subdued slate styling and no oversaturated colors', () => {
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

      // Role badge title is Trading Role: Exporter
      const roleBadgeMatch = html.match(/<span\b[^>]*title="Trading Role: Exporter"[^>]*>([\s\S]*?)<\/span>/);
      expect(roleBadgeMatch, 'Role badge must exist').not.toBeNull();
      const roleBadgeHtml = roleBadgeMatch![0];

      // Must have slate subdued classes
      expect(roleBadgeHtml).toContain('bg-slate-100/90');
      expect(roleBadgeHtml).toContain('text-slate-700');
      expect(roleBadgeHtml).toContain('border-slate-200');
      expect(roleBadgeHtml).toContain('text-[11px]');
      expect(roleBadgeHtml).toContain('font-medium');

      // Must NOT have saturated primary blue / rose / purple
      expect(roleBadgeHtml).not.toContain('bg-blue-50');
      expect(roleBadgeHtml).not.toContain('text-blue-700');
    });

    it('renders Transport Mode badge with subdued slate styling and no oversaturated colors', () => {
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

      const modeBadgeMatch = html.match(/<span\b[^>]*title="Transport Mode: Air"[^>]*>([\s\S]*?)<\/span>/);
      expect(modeBadgeMatch, 'Transport Mode badge must exist').not.toBeNull();
      const modeBadgeHtml = modeBadgeMatch![0];

      // Must have slate subdued classes
      expect(modeBadgeHtml).toContain('bg-slate-100/90');
      expect(modeBadgeHtml).toContain('text-slate-700');
      expect(modeBadgeHtml).toContain('border-slate-200');
      expect(modeBadgeHtml).toContain('text-[11px]');
      expect(modeBadgeHtml).toContain('font-medium');

      // Must NOT have oversaturated sky-50 / cyan-50 / indigo-50
      expect(modeBadgeHtml).not.toContain('bg-sky-50');
      expect(modeBadgeHtml).not.toContain('text-sky-700');
    });

    it('renders Cargo Category badge with subdued slate styling and no oversaturated colors', () => {
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

      // Find the Category cell td (column 2)
      const tdMatches = Array.from(html.matchAll(/<td\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g));
      const categoryTd = tdMatches.find((m) => m[2].includes('Perishables'));
      expect(categoryTd, 'Category td must exist').toBeDefined();

      const categorySpan = categoryTd![2].match(/<span\b[^>]*>[\s\S]*?Perishables[\s\S]*?<\/span>/);
      expect(categorySpan, 'Category badge span must exist').not.toBeNull();
      const categoryBadgeHtml = categorySpan![0];

      // Subdued slate styling
      expect(categoryBadgeHtml).toContain('bg-slate-100/90');
      expect(categoryBadgeHtml).toContain('text-slate-700');
      expect(categoryBadgeHtml).toContain('border-slate-200');
      expect(categoryBadgeHtml).toContain('text-[11px]');
      expect(categoryBadgeHtml).toContain('font-medium');

      // Must NOT have saturated category colors like bg-emerald-50
      expect(categoryBadgeHtml).not.toContain('bg-emerald-50');
      expect(categoryBadgeHtml).not.toContain('text-emerald-800');
    });
  });
});
