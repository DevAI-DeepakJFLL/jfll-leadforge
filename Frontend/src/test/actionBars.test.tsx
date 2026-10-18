import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { JfllCustomerActionBar } from '@/components/jfll/JfllCustomerActionBar';
import { DatamyneActionBar } from '@/components/datamyne/DatamyneActionBar';
import { TableActionBar } from '@/components/leads/TableActionBar';

describe('Table Action Bars with Inline Search Bar', () => {
  it('renders JfllCustomerActionBar with search bar placed next to Select option', () => {
    const html = renderToString(
      <JfllCustomerActionBar
        selectedCount={0}
        totalOnPage={25}
        totalCount={2010}
        isAllOnPageSelected={false}
        isIndeterminate={false}
        onToggleSelectAllPage={() => {}}
        onDeselectAll={() => {}}
        onExport={() => {}}
        searchQuery="RAO CLEARING"
        onSearchChange={() => {}}
        searchPlaceholder="Search customers by company, contact, phone, email..."
      />
    );

    // Verify Select option is present
    expect(html).toContain('Select');
    expect(html).toContain('Toggle select all on page');

    // Verify Search input is present in the same action bar
    expect(html).toContain('Search customers by company, contact, phone, email...');
    expect(html).toContain('value="RAO CLEARING"');
    expect(html).toContain('Clear search');
    expect(html).toContain('Export CSV');
  });

  it('renders DatamyneActionBar with search bar placed next to Select option', () => {
    const html = renderToString(
      <DatamyneActionBar
        selectedCount={3}
        totalOnPage={25}
        totalCount={37269}
        isAllOnPageSelected={false}
        isIndeterminate={true}
        onToggleSelectAllPage={() => {}}
        onDeselectAll={() => {}}
        onExport={() => {}}
        searchQuery="Pharma"
        onSearchChange={() => {}}
        searchPlaceholder="Search DataMyne by company, description, country..."
      />
    );

    // Verify Select counter and clear selection
    expect(html).toContain('Selected');
    expect(html).toContain('3');
    expect(html).toContain('Clear selection');

    // Verify Search bar
    expect(html).toContain('Search DataMyne by company, description, country...');
    expect(html).toContain('value="Pharma"');
    expect(html).toContain('Export CSV');
  });

  it('renders TableActionBar with search bar placed next to Select option', () => {
    const html = renderToString(
      <TableActionBar
        selectedCount={0}
        totalOnPage={25}
        totalCount={2500000}
        isAllOnPageSelected={false}
        isIndeterminate={false}
        onToggleSelectAllPage={() => {}}
        onSelectAllPage={() => {}}
        onSelectAllTotal={() => {}}
        onDeselectAll={() => {}}
        onSave={() => {}}
        onAddToList={() => {}}
        onExport={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
        searchPlaceholder="Search leads by name, title, location..."
      />
    );

    // Verify Select dropdown
    expect(html).toContain('Select');
    expect(html).toContain('Select all visible leads');

    // Verify Search bar and keyboard shortcut indicator
    expect(html).toContain('Search leads by name, title, location...');
    expect(html).toContain('⌘K');

    // Verify action buttons
    expect(html).toContain('Save Leads');
    expect(html).toContain('Add to List');
    expect(html).toContain('Export All');
  });
});
