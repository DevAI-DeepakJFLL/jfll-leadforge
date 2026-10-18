import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  DatamyneAudienceTabs,
  DatamyneFilterSidebar,
  DatamyneActionBar,
  DatamyneActiveFilterChips,
  DatamyneTable,
} from '@/components/datamyne';
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
  onSearchApollo: (companyName: string) => void;
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
  onSearchApollo,
  isMobileOpen,
  onCloseMobile,
}) => {
  const items = query.items;

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <DatamyneFilterSidebar
        filters={filters}
        setSearch={onSearchChange}
        setDataset={onDatasetChange}
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
        <DatamyneAudienceTabs
          activeTab={filters.tab}
          onTabChange={onTabChange}
          activeDataset={filters.dataset || 'valid'}
          onChangeDataset={onDatasetChange}
          counts={query.audienceCounts}
          totalFormatted={query.totalFormatted}
        />

        <DatamyneActionBar
          selectedCount={selectedCount}
          totalOnPage={items.length}
          totalCount={query.totalEstimate}
          isAllOnPageSelected={isAllOnPageSelected}
          isIndeterminate={isSomeOnPageSelected}
          onToggleSelectAllPage={onToggleSelectAllPage}
          onDeselectAll={onDeselectAll}
          onExport={onExport}
          isExporting={isExporting}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search DataMyne by company, description, country..."
        />

        {/* Active Filter Chips Bar */}
        <DatamyneActiveFilterChips
          filters={filters}
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
            leads={items}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            onSearchApollo={onSearchApollo}
            currentPage={query.page}
            totalPages={query.totalPages}
            pageSize={query.limit}
            totalItems={query.totalEstimate}
            totalFormatted={query.totalFormatted}
            onPageChange={onPageChange}
            onClearFilters={clearAllFilters}
          />
        </div>
      </div>
    </div>
  );
};
