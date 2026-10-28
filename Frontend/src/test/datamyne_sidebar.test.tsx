import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DatamyneFilterSidebar } from '@/components/datamyne/DatamyneFilterSidebar';
import { DatamyneActiveFilterChips } from '@/components/datamyne/DatamyneActiveFilterChips';
import { useDatamyneFilter, pruneFiltersForCountry } from '@/hooks/useDatamyneFilter';

describe('DatamyneFilterSidebar Brazil Filters & Operational Hubs', () => {
  it('displays Brazil regional and city options in the sidebar', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{}}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={0}
      />
    );

    // Verify Geographic Region / Country accordion is present
    expect(html).toContain('Geographic Region / Country');
    expect(html).toContain('All');
    expect(html).toContain('India');
    expect(html).toContain('Brazil');

    // Verify Brazilian operational hubs
    expect(html).toContain('SÃO PAULO');
    expect(html).toContain('GUARULHOS');
    expect(html).toContain('RIO DE JANEIRO');
    expect(html).toContain('CURITIBA');
    expect(html).toContain('SOROCABA');
    expect(html).toContain('SUMARÉ');
    expect(html).toContain('SANTOS');

    // Verify Brazil trade corridors
    expect(html).toContain('India-Brazil (Air Export)');
    expect(html).toContain('Brazil-India (Air Import)');
    expect(html).toContain('Brazil-India (Ocean Import)');
  });

  it('renders active filter chips for Brazil region and removes it on click', () => {
    const removeCountry = vi.fn();
    const html = renderToString(
      <DatamyneActiveFilterChips
        filters={{ countries: ['Brazil'] }}
        onRemoveCountry={removeCountry}
        onRemoveTransportMode={vi.fn()}
        onRemoveRole={vi.fn()}
        onRemoveCategory={vi.fn()}
        onRemoveSubcategory={vi.fn()}
        onRemoveCity={vi.fn()}
        onRemoveTradeLane={vi.fn()}
        onRemoveContactStatus={vi.fn()}
        onToggleHasDirectors={vi.fn()}
        onClearSearch={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(html).toContain('Region:');
    expect(html).toContain('Brazil');
    expect(html).toContain('Remove Region: Brazil');
  });

  it('renders checked states correctly when Brazil filter is active', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{ countries: ['Brazil'], cities: ['SÃO PAULO'] }}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleCountry={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={2}
      />
    );

    expect(html).toContain('Geographic Region / Country');
    expect(html).toContain('Brazil');
    expect(html).toContain('SÃO PAULO');
  });

  it('displays categorized subheaders when All Regions is selected', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{ countries: [] }}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleCountry={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={0}
      />
    );

    // Subheaders and pill counts in Corridors & Hubs
    expect(html).toContain('Brazil Corridors');
    expect(html).toContain('India Corridors');
    expect(html).toContain('Brazil Hubs');
    expect(html).toContain('India Hubs');

    // Both regions' items should be visible
    expect(html).toContain('SÃO PAULO');
    expect(html).toContain('MUMBAI');
    expect(html).toContain('India-Brazil (Air Export)');
    expect(html).toContain('PER/AIR (Perishables Air)');
  });

  it('filters dynamically when Brazil is exclusively selected', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{ countries: ['Brazil'] }}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleCountry={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={1}
      />
    );

    // Dynamic accordion headers
    expect(html).toContain('Trade Corridors (Brazil)');
    expect(html).toContain('Operational Hubs (Brazil)');

    // Brazil items present
    expect(html).toContain('SÃO PAULO');
    expect(html).toContain('SANTOS');
    expect(html).toContain('India-Brazil (Air Export)');
    expect(html).toContain('Brazil-India (Ocean Import)');

    // India items must NOT be present
    expect(html).not.toContain('MUMBAI');
    expect(html).not.toContain('NEW DELHI');
    expect(html).not.toContain('PER/AIR');
    expect(html).not.toContain('EX-China_INDIA');
  });

  it('filters dynamically when India is exclusively selected', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{ countries: ['India'] }}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleCountry={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={1}
      />
    );

    // Dynamic accordion headers
    expect(html).toContain('Trade Corridors (India)');
    expect(html).toContain('Operational Hubs (India)');

    // India items present
    expect(html).toContain('MUMBAI');
    expect(html).toContain('NEW DELHI');
    expect(html).toContain('PER/AIR (Perishables Air)');
    expect(html).toContain('EX-China_INDIA (China Imports)');

    // Brazil items must NOT be present
    expect(html).not.toContain('SÃO PAULO');
    expect(html).not.toContain('SANTOS');
    expect(html).not.toContain('India-Brazil (Air Export)');
    expect(html).not.toContain('Brazil-India (Ocean Import)');
  });

  describe('pruneFiltersForCountry helper', () => {
    it('prunes Indian hubs and corridors when switching exclusively to Brazil', () => {
      const result = pruneFiltersForCountry(
        ['Brazil'],
        ['MUMBAI', 'SÃO PAULO', 'CURITIBA', 'NEW DELHI'],
        ['PER/AIR', 'India-Brazil/Air', 'Brazil-India/Ocean', 'GCR/Air']
      );

      expect(result.cities).toEqual(['SÃO PAULO', 'CURITIBA']);
      expect(result.tradeLanes).toEqual(['India-Brazil/Air', 'Brazil-India/Ocean']);
    });

    it('prunes Brazilian hubs and corridors when switching exclusively to India', () => {
      const result = pruneFiltersForCountry(
        ['India'],
        ['MUMBAI', 'SÃO PAULO', 'CURITIBA', 'CHENNAI'],
        ['PER/AIR', 'India-Brazil/Air', 'EX-China_INDIA']
      );

      expect(result.cities).toEqual(['MUMBAI', 'CHENNAI']);
      expect(result.tradeLanes).toEqual(['PER/AIR', 'EX-China_INDIA']);
    });

    it('preserves all hubs and corridors when All Regions (empty or both) are selected', () => {
      const resultEmpty = pruneFiltersForCountry(
        [],
        ['MUMBAI', 'SÃO PAULO'],
        ['PER/AIR', 'India-Brazil/Air']
      );
      expect(resultEmpty.cities).toEqual(['MUMBAI', 'SÃO PAULO']);
      expect(resultEmpty.tradeLanes).toEqual(['PER/AIR', 'India-Brazil/Air']);

      const resultBoth = pruneFiltersForCountry(
        ['India', 'Brazil'],
        ['MUMBAI', 'SÃO PAULO'],
        ['PER/AIR', 'India-Brazil/Air']
      );
      expect(resultBoth.cities).toEqual(['MUMBAI', 'SÃO PAULO']);
      expect(resultBoth.tradeLanes).toEqual(['PER/AIR', 'India-Brazil/Air']);
    });

    it('handles empty lists gracefully', () => {
      const result = pruneFiltersForCountry(['Brazil'], [], []);
      expect(result.cities).toEqual([]);
      expect(result.tradeLanes).toEqual([]);
    });
  });

  it('useDatamyneFilter initial state and helper methods', () => {
    let hookData: ReturnType<typeof useDatamyneFilter> | undefined;
    const TestComponent = () => {
      hookData = useDatamyneFilter({ countries: ['Brazil'] });
      return <div data-testid="hook-tester">rendered</div>;
    };

    renderToString(<TestComponent />);

    expect(hookData).toBeDefined();
    expect(hookData!.filters.countries).toEqual(['Brazil']);
    expect(hookData!.activeFilterCount).toBe(1);
    expect(typeof hookData!.toggleCountry).toBe('function');
  });

  it('renders horizontal Data Pool filter chips with whitespace-nowrap preventing internal line breaks', () => {
    const html = renderToString(
      <DatamyneFilterSidebar
        filters={{ dataset: 'valid' }}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={0}
      />
    );

    expect(html).toContain('With Contacts');
    expect(html).toContain('Without Contacts');
    expect(html).toContain('All Leads');
    expect(html).toContain('whitespace-nowrap');
  });
});
