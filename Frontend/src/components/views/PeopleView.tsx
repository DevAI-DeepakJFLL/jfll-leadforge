import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import { FilterSidebar, ActiveFilterChips } from '@/components/filters';
import {
  AudienceTabs,
  TableActionBar,
  LeadsTable,
} from '@/components/leads';
import { LeadsResponse, Lead, FilterParams, LeadStatus, AudienceTab } from '@/types/lead';

export interface PeopleViewProps {
  filters: FilterParams;
  data?: LeadsResponse;
  isLoading: boolean;
  isError: boolean;
  error?: Error | unknown;
  refetch: () => void;
  items: Lead[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  selectedCount: number;
  isAllOnPageSelected: boolean;
  isSomeOnPageSelected: boolean;
  onToggleSelectAllPage: () => void;
  onSelectAllPage: () => void;
  onSelectAllTotal: () => void;
  onDeselectAll: () => void;
  onSave: () => void;
  onAddToList: (listName: string) => void;
  onExport: () => void;
  isExporting: boolean;
  savedLists: string[];
  onSearchChange: (query: string) => void;
  onToggleArrayFilter: (category: 'departments' | 'jobTitles' | 'locations' | 'industries' | 'companySize', value: string) => void;
  onToggleStatusFilter: (status: LeadStatus) => void;
  onClearCategory: (category: keyof FilterParams) => void;
  onRemoveFilter: (category: keyof FilterParams, value: string) => void;
  onClearAllFilters: () => void;
  onSaveSearch: () => void;
  onLoadSearch: () => void;
  onTabChange: (tab: AudienceTab) => void;
  onPageChange: (page: number) => void;
  onLeadClick: (lead: Lead) => void;
  onViewEmail: (lead: Lead) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  filters,
  data,
  isLoading,
  isError,
  error,
  refetch,
  items,
  rowSelection,
  onRowSelectionChange,
  selectedCount,
  isAllOnPageSelected,
  isSomeOnPageSelected,
  onToggleSelectAllPage,
  onSelectAllPage,
  onSelectAllTotal,
  onDeselectAll,
  onSave,
  onAddToList,
  onExport,
  isExporting,
  savedLists,
  onSearchChange,
  onToggleArrayFilter,
  onToggleStatusFilter,
  onClearCategory,
  onRemoveFilter,
  onClearAllFilters,
  onSaveSearch,
  onLoadSearch,
  onTabChange,
  onPageChange,
  onLeadClick,
  onViewEmail,
  isMobileOpen,
  onCloseMobile,
}) => {
  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      {/* Left Filter Sidebar matching Ref.jpg */}
      <FilterSidebar
        filters={filters}
        onToggleArrayFilter={onToggleArrayFilter}
        onToggleStatusFilter={onToggleStatusFilter}
        onClearCategory={onClearCategory}
        onSaveSearch={onSaveSearch}
        onLoadSearch={onLoadSearch}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      {/* Right Leads Prospecting Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Subheader: Audience Tabs matching Ref.jpg */}
        <AudienceTabs
          activeTab={filters.tab}
          onTabChange={onTabChange}
          counts={data?.audienceCounts}
          rightContent={
            <span>
              Total Prospects:{' '}
              <strong className="text-slate-800">{data?.totalFormatted || '2.5m'}</strong>
            </span>
          }
        />

        {/* Table Bulk Action Bar */}
        <TableActionBar
          selectedCount={selectedCount}
          totalOnPage={items.length}
          totalCount={data?.totalEstimate}
          isAllOnPageSelected={isAllOnPageSelected}
          isIndeterminate={isSomeOnPageSelected}
          onToggleSelectAllPage={onToggleSelectAllPage}
          onSelectAllPage={onSelectAllPage}
          onSelectAllTotal={onSelectAllTotal}
          onDeselectAll={onDeselectAll}
          onSave={onSave}
          onAddToList={onAddToList}
          onExport={onExport}
          isExporting={isExporting}
          savedLists={savedLists}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search leads by name, title, location..."
        />

        {/* Active Filter Chips Bar */}
        <ActiveFilterChips
          filters={filters}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAllFilters}
        />

        {/* Central Leads Table Viewport */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <LeadsTable
            leads={items}
            isLoading={isLoading}
            isError={isError}
            error={error as Error}
            onRetry={refetch}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            onViewEmail={onViewEmail}
            currentPage={data?.page || 1}
            totalPages={data?.totalPages || 1}
            pageSize={data?.limit || 25}
            totalItems={data?.totalEstimate || 0}
            totalFormatted={data?.totalFormatted}
            onPageChange={onPageChange}
            onClearFilters={onClearAllFilters}
          />
        </div>
      </div>
    </div>
  );
};
