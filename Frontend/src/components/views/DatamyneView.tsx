import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  DatamyneAudienceTabs,
  DatamyneFilterSidebar,
  DatamyneActionBar,
  DatamyneActiveFilterChips,
  DatamyneTable,
} from '@/components/datamyne';
import { Sparkles, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';
import { useToast } from '@/components/ui';
import { TierAudienceTabs } from '@/components/tiers';
import { useTierFilter } from '@/hooks/useTierFilter';
import {
  fetchTierCounts,
  fetchTierLeads,
  queryTierLeadsLocal,
  queryTierCountsLocal,
  getLoadedTierDataset,
} from '@/services/tierService';
import { exportDatamyneLeadsCsv } from '@/services/datamyneService';
import { TierFilterParams } from '@/types/tierSegmentation';
import {
  DatamyneFilterParams,
  DatamyneResponse,
  DatamyneLead,
  TransportMode,
  DatamyneDatasetType,
  DatamyneAudienceTab,
  TAB_TO_CATEGORY_MAP,
} from '@/types/datamyneLead';

export interface DatamyneViewProps {
  filters: DatamyneFilterParams;
  query: DatamyneResponse;
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  selectedCount: number;
  isAllOnPageSelected: boolean;
  isSomeOnPageSelected: boolean;
  onToggleSelectAllPage: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
  isExporting: boolean;
  onSearchChange: (query: string) => void;
  onDatasetChange: (dataset: DatamyneDatasetType) => void;
  onTabChange: (tab: DatamyneAudienceTab) => void;
  onPageChange: (page: number) => void;
  toggleCountry?: (country: string) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  toggleCategory: (category: string) => void;
  toggleSubcategory: (subcategory: string) => void;
  toggleRole: (role: string) => void;
  toggleCity: (city: string) => void;
  toggleTradeLane: (lane: string) => void;
  toggleContactStatus: (status: string) => void;
  toggleHasDirectors: () => void;
  setMinShipments: (min: number) => void;
  setMinTradedValueUsd: (min: number) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
  onLeadClick: (lead: DatamyneLead) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const DatamyneView: React.FC<DatamyneViewProps> = ({
  filters,
  query,
  rowSelection,
  onRowSelectionChange,
  selectedCount,
  isAllOnPageSelected,
  isSomeOnPageSelected,
  onToggleSelectAllPage,
  onDeselectAll,
  onExport,
  isExporting,
  onSearchChange,
  onDatasetChange,
  onTabChange,
  onPageChange,
  toggleCountry,
  toggleTransportMode,
  toggleCategory,
  toggleSubcategory,
  toggleRole,
  toggleCity,
  toggleTradeLane,
  toggleContactStatus,
  toggleHasDirectors,
  setMinShipments,
  setMinTradedValueUsd,
  clearAllFilters,
  activeFilterCount,
  onLeadClick,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [perspective, setPerspective] = React.useState<'verticals' | 'tiers'>('verticals');
  const {
    tab: tierTab,
    setTab: setTierTab,
    page: tierPage,
    setPage: setTierPage,
  } = useTierFilter({ status: 'tier-a' });

  // Effective categories: prioritize explicit sidebar categories, fallback to active vertical tab category if selected
  const effectiveCategories = React.useMemo(() => {
    if (filters.categories && filters.categories.length > 0) {
      return filters.categories;
    }
    if (filters.tab && filters.tab !== 'all' && TAB_TO_CATEGORY_MAP[filters.tab]) {
      return [TAB_TO_CATEGORY_MAP[filters.tab]!];
    }
    return [];
  }, [filters.categories, filters.tab]);

  const tierFilterParams: TierFilterParams = React.useMemo(() => {
    const statusMap: Record<string, string | undefined> = {
      'tier-a': 'Tier A',
      'tier-b': 'Tier B',
      'parked': 'Parked',
      'excluded': 'Excluded',
      'unscored': 'Unscored',
      'all': undefined,
    };
    return {
      status: statusMap[tierTab],
      page: tierPage,
      pageSize: query.limit || 25,
      search: filters.q,
      countries: filters.countries,
      transportModes: filters.transportModes,
      categories: effectiveCategories,
      subcategories: filters.subcategories,
      roles: filters.roles,
      cities: filters.cities,
      tradeLanes: filters.tradeLanes,
      contactStatus: filters.contactStatus,
      minShipments: filters.minShipments,
      minTradedValueUsd: filters.minTradedValueUsd,
      hasDirectors: filters.hasDirectors,
      dataset: filters.dataset,
    };
  }, [tierTab, tierPage, query.limit, filters, effectiveCategories]);

  // Reset tierPage to 1 whenever sidebar filters change
  React.useEffect(() => {
    setTierPage(1);
  }, [
    filters.countries,
    filters.transportModes,
    effectiveCategories,
    filters.subcategories,
    filters.roles,
    filters.cities,
    filters.tradeLanes,
    filters.contactStatus,
    filters.minShipments,
    filters.minTradedValueUsd,
    filters.hasDirectors,
    filters.dataset,
    filters.q,
    setTierPage,
  ]);

  const { data: tierCounts } = useQuery({
    queryKey: [
      'tierCounts',
      filters.q,
      filters.countries,
      filters.transportModes,
      effectiveCategories,
      filters.subcategories,
      filters.roles,
      filters.cities,
      filters.tradeLanes,
      filters.contactStatus,
      filters.minShipments,
      filters.minTradedValueUsd,
      filters.hasDirectors,
      filters.dataset,
    ],
    queryFn: () => fetchTierCounts(tierFilterParams),
    placeholderData: (prev) => prev ?? queryTierCountsLocal(tierFilterParams),
    staleTime: 60000,
  });

  const { data: tierData, isLoading: isTierLoading } = useQuery({
    queryKey: [
      'tierLeads',
      tierTab,
      tierPage,
      query.limit || 25,
      filters.q,
      filters.countries,
      filters.transportModes,
      effectiveCategories,
      filters.subcategories,
      filters.roles,
      filters.cities,
      filters.tradeLanes,
      filters.contactStatus,
      filters.minShipments,
      filters.minTradedValueUsd,
      filters.hasDirectors,
      filters.dataset,
    ],
    queryFn: () => fetchTierLeads(tierFilterParams),
    placeholderData: (prev) => prev ?? queryTierLeadsLocal(tierFilterParams),
    enabled: perspective === 'tiers',
    staleTime: 30000,
  });

  const displayItems = perspective === 'tiers' ? (tierData?.items || []) : query.items;
  const displayTotal = perspective === 'tiers' ? (tierData?.total || 0) : query.totalEstimate;
  const displayTotalFormatted = perspective === 'tiers' ? displayTotal.toLocaleString() : query.totalFormatted;
  const displayPage = perspective === 'tiers' ? tierPage : query.page;
  const displayTotalPages = perspective === 'tiers' ? (tierData?.totalPages || 0) : query.totalPages;
  const handleDisplayPageChange = perspective === 'tiers' ? setTierPage : onPageChange;

  const { showToast } = useToast();
  const [isExportingTiers, setIsExportingTiers] = React.useState(false);

  const isAllTierOnPageSelected =
    displayItems.length > 0 && displayItems.every((d) => !!rowSelection[d.id]);
  const isSomeTierOnPageSelected =
    displayItems.some((d) => !!rowSelection[d.id]) && !isAllTierOnPageSelected;

  const handleToggleSelectAllTierPage = React.useCallback(() => {
    if (isAllTierOnPageSelected) {
      onRowSelectionChange((prev) => {
        const next = { ...prev };
        displayItems.forEach((d) => {
          delete next[d.id];
        });
        return next;
      });
    } else {
      onRowSelectionChange((prev) => {
        const next = { ...prev };
        displayItems.forEach((d) => {
          next[d.id] = true;
        });
        return next;
      });
    }
  }, [displayItems, isAllTierOnPageSelected, onRowSelectionChange]);

  const handleExportTiersCsv = React.useCallback(() => {
    try {
      setIsExportingTiers(true);
      const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
      const selected = selectedIds
        .map((id) => displayItems.find((d) => d.id === id) || (getLoadedTierDataset() as any[]).find((d) => d.id === id))
        .filter(Boolean) as DatamyneLead[];
      const exportList = selected.length > 0 ? selected : displayItems;
      const blob = exportDatamyneLeadsCsv(exportList);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `datamyne_sop_${tierTab || 'all'}_tier_leads_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${exportList.length} SOP tiered leads to CSV`);
    } catch {
      showToast('Export failed. Please check network connection.', 'error');
    } finally {
      setIsExportingTiers(false);
    }
  }, [displayItems, rowSelection, showToast, tierTab]);

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <DatamyneFilterSidebar
        filters={filters}
        setSearch={onSearchChange}
        setDataset={onDatasetChange}
        toggleCountry={toggleCountry}
        toggleTransportMode={toggleTransportMode}
        toggleCategory={toggleCategory}
        toggleSubcategory={toggleSubcategory}
        toggleRole={toggleRole}
        toggleCity={toggleCity}
        toggleTradeLane={toggleTradeLane}
        toggleContactStatus={toggleContactStatus}
        toggleHasDirectors={toggleHasDirectors}
        setMinShipments={setMinShipments}
        setMinTradedValueUsd={setMinTradedValueUsd}
        clearAllFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Subcategory Mode Toggle */}
        <div className="bg-white border-b border-slate-200/90 px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Subcategory Mode:
            </span>
            <div
              role="tablist"
              aria-label="Subcategory View Mode"
              className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <button
                type="button"
                role="tab"
                aria-selected={perspective === 'verticals'}
                onClick={() => setPerspective('verticals')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  perspective === 'verticals'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Logistics Verticals (9)</span>
                <CategoryInfoTooltip
                  title="Logistics Verticals (9 Sectors)"
                  description="Complete dataset of 37,273 Indian international customs shippers categorized across 9 core industrial cargo sectors."
                  badge={{ text: '9 Industry Verticals', variant: 'blue' }}
                  criteria={[
                    'HS Code Chapter classification (Chapters 01–90)',
                    'Specialized handling: Cold Chain, Pharma GDP, DGR Chemicals, OOG Cargo',
                    'Active bills of lading & customs shipping bills',
                  ]}
                  actionTip="Select industry verticals to pinpoint high-yield freight opportunities aligned with Jet Freight branch specializations."
                  align="left"
                  iconClassName={perspective === 'verticals' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-600'}
                />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={perspective === 'tiers'}
                onClick={() => setPerspective('tiers')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  perspective === 'tiers'
                    ? 'bg-apollo text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>SOP Tiers (A / B / Parked)</span>
                <CategoryInfoTooltip
                  title="JFLL SOP Stage 2 Lead Scoring"
                  description="Algorithmic qualification ranking 37,273 customs shippers from Tier A (immediate inside sales priority) down to Parked/Excluded."
                  badge={{ text: 'SOP Stage 2', variant: 'emerald' }}
                  criteria={[
                    'High shipment frequency: 24+ shipments / year (20 pts)',
                    'Air freight conversion suitability & customs recency (15 pts)',
                    'Core priority lanes: US, UAE, Europe, LATAM (15 pts)',
                    'Tier A: Score 70–100 · Tier B: Score 40–69 · Parked: <40',
                  ]}
                  actionTip="Focus outbound calling on Tier A priority accounts for immediate 24–48 hour discovery meetings."
                  align="left"
                  iconClassName={perspective === 'tiers' ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
                />
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {perspective === 'tiers' ? null : (
              <span>Customs Trade Intelligence</span>
            )}
          </div>
        </div>

        {/* Audience Subcategory Tabs */}
        {perspective === 'tiers' ? (
          <TierAudienceTabs
            activeTab={tierTab}
            onTabChange={setTierTab}
            counts={tierCounts}
          />
        ) : (
          <DatamyneAudienceTabs
            activeTab={filters.tab}
            onTabChange={onTabChange}
            activeDataset={filters.dataset || 'valid'}
            onChangeDataset={onDatasetChange}
            counts={query.audienceCounts}
            totalFormatted={query.totalFormatted}
          />
        )}

        <DatamyneActionBar
          selectedCount={selectedCount}
          totalOnPage={displayItems.length}
          totalCount={displayTotal}
          isAllOnPageSelected={perspective === 'tiers' ? isAllTierOnPageSelected : isAllOnPageSelected}
          isIndeterminate={perspective === 'tiers' ? isSomeTierOnPageSelected : isSomeOnPageSelected}
          onToggleSelectAllPage={perspective === 'tiers' ? handleToggleSelectAllTierPage : onToggleSelectAllPage}
          onDeselectAll={onDeselectAll}
          onExport={perspective === 'tiers' ? handleExportTiersCsv : onExport}
          isExporting={perspective === 'tiers' ? isExportingTiers : isExporting}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder={
            perspective === 'tiers'
              ? 'Search tiered leads by company, city, category...'
              : 'Search DataMyne by company, description, country...'
          }
        />

        {/* Active Filter Chips Bar */}
        <DatamyneActiveFilterChips
          filters={filters}
          onRemoveCountry={toggleCountry}
          onRemoveTransportMode={toggleTransportMode}
          onRemoveRole={toggleRole}
          onRemoveCategory={toggleCategory}
          onRemoveSubcategory={toggleSubcategory}
          onRemoveCity={toggleCity}
          onRemoveTradeLane={toggleTradeLane}
          onRemoveContactStatus={toggleContactStatus}
          onToggleHasDirectors={toggleHasDirectors}
          onClearSearch={() => onSearchChange('')}
          onClearAll={clearAllFilters}
        />

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <DatamyneTable
            leads={displayItems}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            currentPage={displayPage}
            totalPages={displayTotalPages}
            pageSize={query.limit || 25}
            totalItems={displayTotal}
            totalFormatted={displayTotalFormatted}
            onPageChange={handleDisplayPageChange}
            onClearFilters={clearAllFilters}
            onResetToAllVerticals={() => onTabChange('all')}
            isLoading={perspective === 'tiers' ? isTierLoading : false}
          />
        </div>
      </div>
    </div>
  );
};
