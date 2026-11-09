import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { JfllCustomerTable } from '@/components/jfll/JfllCustomerTable';
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
  });
});
