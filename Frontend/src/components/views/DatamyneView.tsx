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
import { TierAudienceTabs } from '@/components/tiers';
import { useTierFilter } from '@/hooks/useTierFilter';
import { fetchTierCounts, fetchTierLeads, queryTierLeadsLocal } from '@/services/tierService';
import {
  DatamyneFilterParams,
  DatamyneResponse,
  DatamyneLead,
  TransportMode,
  DatamyneDatasetType,
  DatamyneAudienceTab,
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

  const { data: tierCounts } = useQuery({
    queryKey: ['tierCounts'],
    queryFn: fetchTierCounts,
    staleTime: 60000,
  });

  const { data: tierData, isLoading: isTierLoading } = useQuery({
    queryKey: ['tierLeads', tierTab, tierPage, filters.q],
    queryFn: () => {
      const statusMap: Record<string, string | undefined> = {
        'tier-a': 'Tier A',
        'tier-b': 'Tier B',
        'parked': 'Parked',
        'excluded': 'Excluded',
        'unscored': 'Unscored',
        'all': undefined,
      };
      return fetchTierLeads({
        status: statusMap[tierTab],
        page: tierPage,
        pageSize: query.limit || 25,
        search: filters.q,
      });
    },
    placeholderData: (prev) =>
      prev ??
      queryTierLeadsLocal({
        status: {
          'tier-a': 'Tier A',
          'tier-b': 'Tier B',
          'parked': 'Parked',
          'excluded': 'Excluded',
          'unscored': 'Unscored',
          'all': undefined,
        }[tierTab],
        page: tierPage,
        pageSize: query.limit || 25,
        search: filters.q,
      }),
    enabled: perspective === 'tiers',
    staleTime: 30000,
  });

  const displayItems = perspective === 'tiers' ? (tierData?.items || []) : query.items;
  const displayTotal = perspective === 'tiers' ? (tierData?.total || 0) : query.totalEstimate;
  const displayTotalFormatted = perspective === 'tiers' ? displayTotal.toLocaleString() : query.totalFormatted;
  const displayPage = perspective === 'tiers' ? tierPage : query.page;
  const displayTotalPages = perspective === 'tiers' ? (tierData?.totalPages || 0) : query.totalPages;
  const handleDisplayPageChange = perspective === 'tiers' ? setTierPage : onPageChange;

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
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  perspective === 'verticals'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Logistics Verticals (9)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={perspective === 'tiers'}
                onClick={() => setPerspective('tiers')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                  perspective === 'tiers'
                    ? 'bg-apollo text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>SOP Tiers (A / B / Parked)</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            {perspective === 'tiers' ? (
              <span className="font-medium text-apollo">
                JFLL SOP Stage 2 Lead Scoring
              </span>
            ) : (
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
          isAllOnPageSelected={isAllOnPageSelected}
          isIndeterminate={isSomeOnPageSelected}
          onToggleSelectAllPage={onToggleSelectAllPage}
          onDeselectAll={onDeselectAll}
          onExport={onExport}
          isExporting={isExporting}
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
            isLoading={perspective === 'tiers' ? isTierLoading : false}
          />
        </div>
      </div>
    </div>
  );
};
