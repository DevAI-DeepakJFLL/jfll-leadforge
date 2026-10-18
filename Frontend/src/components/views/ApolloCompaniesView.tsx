import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  ApolloAudienceTabs,
  ApolloFilterSidebar,
  ApolloActiveFilterChips,
  ApolloActionBar,
  ApolloTable,
  ApolloContextBanner,
} from '@/components/apollo';
import { ApolloLead, ApolloFilterParams, ApolloResponse } from '@/types/apolloLead';

export interface ApolloCompaniesViewProps {
  filters: ApolloFilterParams;
  data?: ApolloResponse;
  isLoading: boolean;
  isError: boolean;
  error?: Error | unknown;
  refetch: () => void;
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
  onToggleIndustry: (industry: string) => void;
  onToggleCountry: (country: string) => void;
  onToggleEmployeeTier: (tier: string) => void;
  onToggleRevenueRange: (range: string) => void;
  onToggleHasWebsite: () => void;
  onToggleHasLinkedin: () => void;
  onClearCategory: (category: string) => void;
  onClearAllFilters: () => void;
  onTabChange: (tab: any) => void;
  onPageChange: (page: number) => void;
  onLeadClick: (lead: ApolloLead) => void;
  onFindDecisionMakers: (companyName: string, organizationId?: string) => void;
  onSwitchToPeople: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ApolloCompaniesView: React.FC<ApolloCompaniesViewProps> = ({
  filters,
  data,
  isLoading,
  isError,
  error,
  refetch,
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
  onToggleIndustry,
  onToggleCountry,
  onToggleEmployeeTier,
  onToggleRevenueRange,
  onToggleHasWebsite,
  onToggleHasLinkedin,
  onClearCategory,
  onClearAllFilters,
  onTabChange,
  onPageChange,
  onLeadClick,
  onFindDecisionMakers,
  onSwitchToPeople,
  isMobileOpen,
  onCloseMobile,
}) => {
  const items = data?.items || [];

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <ApolloFilterSidebar
        filters={filters}
        onToggleIndustry={onToggleIndustry}
        onToggleCountry={onToggleCountry}
        onToggleEmployeeTier={onToggleEmployeeTier}
        onToggleRevenueRange={onToggleRevenueRange}
        onToggleHasWebsite={onToggleHasWebsite}
        onToggleHasLinkedin={onToggleHasLinkedin}
        onClearCategory={onClearCategory}
        onClearAll={onClearAllFilters}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Account Directory Scope Notification */}
        <ApolloContextBanner onSwitchToPeople={onSwitchToPeople} />

        <ApolloAudienceTabs
          activeTab={filters.tab}
          onTabChange={onTabChange}
          counts={data?.audienceCounts}
          totalFormatted={data?.totalFormatted}
        />

        <ApolloActionBar
          selectedCount={selectedCount}
          totalOnPage={items.length}
          totalCount={data?.totalRecords}
          isAllOnPageSelected={isAllOnPageSelected}
          isIndeterminate={isSomeOnPageSelected}
          onToggleSelectAllPage={onToggleSelectAllPage}
          onDeselectAll={onDeselectAll}
          onExport={onExport}
          isExporting={isExporting}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search 690k corporate shipper accounts by company, domain, keywords..."
        />

        <ApolloActiveFilterChips
          filters={filters}
          onRemoveIndustry={onToggleIndustry}
          onRemoveCountry={onToggleCountry}
          onRemoveEmployeeTier={onToggleEmployeeTier}
          onRemoveRevenueRange={onToggleRevenueRange}
          onRemoveHasWebsite={onToggleHasWebsite}
          onRemoveHasLinkedin={onToggleHasLinkedin}
          onClearSearch={() => onSearchChange('')}
          onClearAll={onClearAllFilters}
        />

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <ApolloTable
            leads={items}
            isLoading={isLoading}
            isError={isError}
            error={error as Error}
            onRetry={refetch}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            onFindDecisionMakers={onFindDecisionMakers}
            currentPage={data?.page || 1}
            totalPages={data?.totalPages || 1}
            pageSize={data?.limit || 25}
            totalItems={data?.totalRecords || 0}
            totalFormatted={data?.totalFormatted}
            onPageChange={onPageChange}
            onClearFilters={onClearAllFilters}
          />
        </div>
      </div>
    </div>
  );
};
