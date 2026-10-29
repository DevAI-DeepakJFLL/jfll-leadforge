import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  JfllCustomerAudienceTabs,
  JfllCustomerFilterSidebar,
  JfllCustomerActionBar,
  JfllCustomerTable,
} from '@/components/jfll';
import {
  JfllCustomerFilterParams,
  JfllCustomersResponse,
  JfllCustomer,
  JfllCustomerTabType,
  JfllCustomerSortField,
} from '@/types/jfllCustomer';

export interface JfllCustomersViewProps {
  filters: JfllCustomerFilterParams;
  query: JfllCustomersResponse;
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
  onCustomerStatusChange: (status: 'active' | 'inactive' | 'all') => void;
  onTabChange: (tab: JfllCustomerTabType) => void;
  onPageChange: (page: number) => void;
  onSortChange?: (field: JfllCustomerSortField) => void;
  toggleCustomerGroup: (group: string) => void;
  toggleType: (type: string) => void;
  toggleCreditStatus: (status: string) => void;
  toggleSalesPerson: (salesPerson: string) => void;
  toggleRevenueRange: (rangeId: string) => void;
  toggleContactOption: (option: 'hasPhone' | 'hasEmail' | 'hasContactPerson') => void;
  clearAllFilters: () => void;
  onCustomerClick: (customer: JfllCustomer) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const JfllCustomersView: React.FC<JfllCustomersViewProps> = ({
  filters,
  query,
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
  onCustomerStatusChange,
  onTabChange,
  onPageChange,
  onSortChange,
  toggleCustomerGroup,
  toggleType,
  toggleCreditStatus,
  toggleSalesPerson,
  toggleRevenueRange,
  toggleContactOption,
  clearAllFilters,
  onCustomerClick,
  isMobileOpen,
  onCloseMobile,
}) => {
  const items = query.items;

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <JfllCustomerFilterSidebar
        filters={filters}
        onToggleCustomerGroup={toggleCustomerGroup}
        onToggleType={toggleType}
        onToggleCreditStatus={toggleCreditStatus}
        onToggleSalesPerson={toggleSalesPerson}
        onToggleRevenueRange={toggleRevenueRange}
        onToggleContactOption={toggleContactOption}
        onClearAll={clearAllFilters}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        <JfllCustomerAudienceTabs
          customerStatus={filters.customerStatus || 'all'}
          onChangeCustomerStatus={onCustomerStatusChange}
          activeTab={filters.tab}
          onTabChange={onTabChange}
          counts={query.audienceCounts}
          totalFormatted={query.totalFormatted}
        />

        <JfllCustomerActionBar
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
          searchPlaceholder="Search customers by company, contact, phone, email..."
        />

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          <JfllCustomerTable
            customers={items}
            isLoading={isLoading}
            isError={isError}
            error={error as Error}
            onRetry={refetch}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onCustomerClick={onCustomerClick}
            currentPage={query.page}
            totalPages={query.totalPages}
            pageSize={query.limit}
            totalItems={query.totalEstimate}
            totalFormatted={query.totalFormatted}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={onSortChange}
            onPageChange={onPageChange}
            onClearFilters={clearAllFilters}
          />
        </div>
      </div>
    </div>
  );
};
