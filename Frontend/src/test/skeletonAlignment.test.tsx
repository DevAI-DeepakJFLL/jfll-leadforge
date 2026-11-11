import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { JfllCustomerTable } from '@/components/jfll/JfllCustomerTable';
import { ApolloTable } from '@/components/apollo/ApolloTable';
import { ToastProvider } from '@/components/ui/Toast';

describe('Table Skeleton Alignment & Column Count', () => {
  describe('DatamyneTable Skeleton', () => {
    it('renders exactly 8 <th> in <thead> and 8 <td> in each skeleton <tr> row when isLoading is true', () => {
      const pageSize = 5;
      const html = renderToString(
        <DatamyneTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={pageSize}
          totalItems={0}
          onPageChange={() => {}}
          isLoading={true}
        />
      );

      // Verify thead column count is 8
      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch).not.toBeNull();
      const thMatches = theadMatch![0].match(/<th\b/g) || [];
      expect(thMatches.length).toBe(8);

      // Verify Sales Status header is present in thead
      expect(theadMatch![0]).toContain('Sales Status');

      // Verify tbody row count and each row has exactly 8 td cells
      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      expect(trMatches.length).toBe(pageSize);

      trMatches.forEach((rowHtml, index) => {
        const tdMatches = rowHtml.match(/<td\b/g) || [];
        expect(
          tdMatches.length,
          `Skeleton row ${index + 1} should have exactly 8 <td> cells matching header count`
        ).toBe(8);
      });
    });

    it('renders active query status banner with customs trade manifests text when isLoading is true', () => {
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

      expect(html).toContain('Querying customs trade manifests...');
      expect(html).toContain('animate-spin');
    });
  });

  describe('JfllCustomerTable Skeleton', () => {
    it('renders exactly 11 <th> in <thead> and 11 <td> in each skeleton <tr> row when isLoading is true', () => {
      const pageSize = 5;
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={pageSize}
            totalItems={0}
            onPageChange={() => {}}
            isLoading={true}
          />
        </ToastProvider>
      );

      // Verify thead column count is 11
      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch).not.toBeNull();
      const thMatches = theadMatch![0].match(/<th\b/g) || [];
      expect(thMatches.length).toBe(11);

      // Verify Approach Status header is present in skeleton thead
      expect(theadMatch![0]).toContain('Approach Status');

      // Verify tbody row count and each row has exactly 11 td cells
      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      expect(trMatches.length).toBe(pageSize);

      trMatches.forEach((rowHtml, index) => {
        const tdMatches = rowHtml.match(/<td\b/g) || [];
        expect(
          tdMatches.length,
          `Skeleton row ${index + 1} should have exactly 11 <td> cells matching header count`
        ).toBe(11);
      });
    });

    it('renders active query status banner with Jet Freight customer accounts text when isLoading is true', () => {
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

      expect(html).toContain('Querying Jet Freight customer accounts...');
      expect(html).toContain('animate-spin');
    });
  });

  describe('ApolloTable Skeleton', () => {
    it('renders active query status banner with Apollo verified companies text when isLoading is true', () => {
      const html = renderToString(
        <ApolloTable
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

      expect(html).toContain('Querying verified Apollo companies...');
      expect(html).toContain('animate-spin');
    });

    it('renders exactly 7 <th> in sticky <thead> and 7 <td> in each skeleton <tr> row with shimmer pulses when isLoading is true', () => {
      const pageSize = 5;
      const html = renderToString(
        <ApolloTable
          leads={[]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={pageSize}
          totalItems={0}
          onPageChange={() => {}}
          isLoading={true}
        />
      );

      // Verify sticky thead column count is 7
      const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/);
      expect(theadMatch).not.toBeNull();
      expect(theadMatch![0]).toContain('sticky');
      expect(theadMatch![0]).toContain('top-0');
      const thMatches = theadMatch![0].match(/<th\b/g) || [];
      expect(thMatches.length).toBe(7);

      expect(theadMatch![0]).toContain('Company &amp; Domain');
      expect(theadMatch![0]).toContain('Cargo Vertical');
      expect(theadMatch![0]).toContain('Scale &amp; Revenue');
      expect(theadMatch![0]).toContain('Headquarters');
      expect(theadMatch![0]).toContain('Direct Phone');
      expect(theadMatch![0]).toContain('Details');

      // Verify tbody row count and each row has exactly 7 td cells with high-visibility shimmer pulses
      const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/);
      expect(tbodyMatch).not.toBeNull();
      const trMatches = tbodyMatch![0].match(/<tr[\s\S]*?<\/tr>/g) || [];
      expect(trMatches.length).toBe(pageSize);

      trMatches.forEach((rowHtml, index) => {
        const tdMatches = rowHtml.match(/<td\b/g) || [];
        expect(
          tdMatches.length,
          `Skeleton row ${index + 1} should have exactly 7 <td> cells matching header count`
        ).toBe(7);
        expect(rowHtml).toContain('animate-pulse');
        expect(rowHtml).toContain('bg-slate-200');
      });
    });
  });
});
