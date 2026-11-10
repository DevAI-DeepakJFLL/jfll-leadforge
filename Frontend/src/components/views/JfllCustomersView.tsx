import React, { useState, useCallback } from 'react';
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
import { useToast } from '@/components/ui';
import { exportJfllCustomerSummaryReportCsv } from '@/services/jfllCustomerService';
import { getLatestApproachNotesForEntities } from '@/services/approachLogService';
import { triggerCsvDownload } from '@/utils/csv';
import { JFLL_ALL_CUSTOMERS_DATA } from '@/data/jfllAllCustomersData';
import { logger } from '@/utils/logger';
import { UserSession } from '@/types/auth';

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
  toggleApproachStatus?: (status: string) => void;
  setApproachStatuses?: (statuses: string[]) => void;
  toggleContactOption: (option: 'hasPhone' | 'hasEmail' | 'hasContactPerson') => void;
  clearAllFilters: () => void;
  onCustomerClick: (customer: JfllCustomer) => void;
  onLogApproach?: (customer: JfllCustomer) => void;
  onConvertToActive?: (customer: JfllCustomer) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentUser?: UserSession | null;
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
  toggleApproachStatus,
  setApproachStatuses,
  toggleContactOption,
  clearAllFilters,
  onCustomerClick,
  onLogApproach,
  onConvertToActive,
  isMobileOpen,
  onCloseMobile,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentUser,
}) => {
  const isViewer = currentUser?.role === 'Viewer';
  const items = query.items;
  const { showToast } = useToast();
  const [isExportingSummary, setIsExportingSummary] = useState(false);

  const handleDownloadSummaryReport = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

    try {
      setIsExportingSummary(true);
      const allCustomers = JFLL_ALL_CUSTOMERS_DATA;

      let targetCustomers: JfllCustomer[] = [];
      if (selectedIds.length > 0) {
        targetCustomers = selectedIds
          .map((id) => items.find((c) => c.id === id) || allCustomers.find((c) => c.id === id))
          .filter(Boolean) as JfllCustomer[];
      } else {
        targetCustomers = items.slice(0, 25);
        if (targetCustomers.length === 0) {
          showToast('No customers available in current view to export.', 'info');
          return;
        }
        showToast(`Exporting executive summary report for current page (${targetCustomers.length} accounts)...`, 'info');
      }

      if (targetCustomers.length === 0) {
        showToast('Selected customer records could not be found.', 'error');
        return;
      }

      const notesMap = await getLatestApproachNotesForEntities(
        'jfll_customer',
        targetCustomers.map((c) => c.id)
      );

      const blob = exportJfllCustomerSummaryReportCsv(targetCustomers, { notesMap });
      const today = new Date().toISOString().split('T')[0];
      const filename = `JFLL_Customer_Executive_Summary_${today}.csv`;

      triggerCsvDownload(blob, filename);
      showToast(`Downloaded executive summary report for ${targetCustomers.length} account${targetCustomers.length > 1 ? 's' : ''}`);
    } catch (err) {
      logger.error('JFLL_SUMMARY', 'Failed to generate executive summary report', { error: String(err) });
      showToast('Failed to generate summary report. Please try again.', 'error');
    } finally {
      setIsExportingSummary(false);
    }
  }, [items, rowSelection, showToast]);

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <JfllCustomerFilterSidebar
        filters={filters}
        onToggleCustomerGroup={toggleCustomerGroup}
        onToggleType={toggleType}
        onToggleCreditStatus={toggleCreditStatus}
        onToggleSalesPerson={toggleSalesPerson}
        onToggleRevenueRange={toggleRevenueRange}
        onToggleApproachStatus={toggleApproachStatus}
        setApproachStatuses={setApproachStatuses}
        onToggleContactOption={toggleContactOption}
        onClearAll={clearAllFilters}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleSidebarCollapse}
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
          onDownloadSummaryReport={handleDownloadSummaryReport}
          isExportingSummary={isExportingSummary}
          currentUser={currentUser}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search customers by company, contact, phone, email..."
        />

        <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0 overflow-hidden">
          <JfllCustomerTable
            customers={items}
            isLoading={isLoading}
            isError={isError}
            error={error as Error}
            onRetry={refetch}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onCustomerClick={onCustomerClick}
            onLogApproach={isViewer ? undefined : onLogApproach}
            onConvertToActive={isViewer ? undefined : onConvertToActive}
            currentPage={query.page}
            totalPages={query.totalPages}
            pageSize={query.limit}
            totalItems={query.totalEstimate}
            totalFormatted={query.totalFormatted}
            customerStatus={filters.customerStatus || 'all'}
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
