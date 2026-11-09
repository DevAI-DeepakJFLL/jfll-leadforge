import React, { useState, useCallback } from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  JfllCustomerAudienceTabs,
  JfllCustomerFilterSidebar,
  JfllCustomerActionBar,
  JfllCustomerTable,
  JfllCustomerGroupBadge,
} from '@/components/jfll';
import {
  JfllCustomerFilterParams,
  JfllCustomersResponse,
  JfllCustomer,
  JfllCustomerTabType,
  JfllCustomerSortField,
} from '@/types/jfllCustomer';
import { useToast } from '@/components/ui';
import {
  exportJfllCustomerSummaryReportCsv,
  formatIndianCurrency,
} from '@/services/jfllCustomerService';
import {
  getLatestApproachNotesForEntities,
  getCachedApproachStatus,
  APPROACH_STATUS_CHANGED_EVENT,
} from '@/services/approachLogService';
import { triggerCsvDownload } from '@/utils/csv';
import { JFLL_ALL_CUSTOMERS_DATA } from '@/data/jfllAllCustomersData';
import { logger } from '@/utils/logger';
import { UserSession } from '@/types/auth';
import { SplitPeekDossier } from '@/components/common';
import { useTableQueueNavigation } from '@/hooks/useTableQueueNavigation';
import { QuickTouchpointLogger, SalesStatusBadge } from '@/components/approach';
import {
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  TrendingUp,
  Maximize2,
  PhoneOff,
  Sparkles,
} from 'lucide-react';

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
  currentUser?: UserSession | null;
  isFilterExpanded?: boolean;
  onToggleFilterExpand?: () => void;
  activeFilterCount?: number;
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
  currentUser,
  isFilterExpanded: propIsFilterExpanded,
  onToggleFilterExpand: propOnToggleFilterExpand,
  activeFilterCount,
}) => {
  const isViewer = currentUser?.role === 'Viewer';
  const [internalFilterExpanded, setInternalFilterExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('jfll_desktop_filter_expanded');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  const isFilterExpanded = propIsFilterExpanded !== undefined ? propIsFilterExpanded : internalFilterExpanded;

  const handleToggleFilterExpand = useCallback(() => {
    if (propOnToggleFilterExpand) {
      propOnToggleFilterExpand();
      return;
    }
    setInternalFilterExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('jfll_desktop_filter_expanded', String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [propOnToggleFilterExpand]);

  const activeCount = React.useMemo(() => {
    if (activeFilterCount !== undefined) return activeFilterCount;
    let count = 0;
    if (filters.customerGroups?.length) count += filters.customerGroups.length;
    if (filters.types?.length) count += filters.types.length;
    if (filters.creditStatuses?.length) count += filters.creditStatuses.length;
    if (filters.salesPersons?.length) count += filters.salesPersons.length;
    if (filters.revenueRanges?.length) count += filters.revenueRanges.length;
    if (filters.approachStatuses?.length) count += filters.approachStatuses.length;
    if (filters.hasPhone) count += 1;
    if (filters.hasEmail) count += 1;
    if (filters.hasContactPerson) count += 1;
    return count;
  }, [activeFilterCount, filters]);

  const items = query.items;

  const [peekCustomer, setPeekCustomer] = useState<JfllCustomer | null>(null);

  // Clear peekCustomer if filters or page switch excludes current customer from items
  React.useEffect(() => {
    if (peekCustomer && !items.some((c) => c.id === peekCustomer.id)) {
      setPeekCustomer(null);
    }
  }, [items, peekCustomer]);

  const [, setUpdateTrigger] = useState(0);
  React.useEffect(() => {
    const handler = () => setUpdateTrigger((v) => v + 1);
    window.addEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
  }, []);

  const peekIndex = React.useMemo(() => {
    if (!peekCustomer) return -1;
    return items.findIndex((c) => c.id === peekCustomer.id);
  }, [items, peekCustomer]);

  const { goToNext, goToPrev } = useTableQueueNavigation<JfllCustomer>({
    items,
    selectedIndex: peekIndex >= 0 ? peekIndex : undefined,
    onNavigate: (_idx, customer) => {
      if (customer) setPeekCustomer(customer);
    },
    onClose: () => setPeekCustomer(null),
    enabled: !!peekCustomer,
  });

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
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
        isExpanded={isFilterExpanded}
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
          isFilterExpanded={isFilterExpanded}
          onToggleFilterExpand={handleToggleFilterExpand}
          activeFilterCount={activeCount}
        />

        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          <div
            className={`flex flex-col p-3 sm:p-4 min-h-0 overflow-hidden transition-all duration-200 ${
              peekCustomer ? 'w-full lg:w-[60%] shrink-0' : 'flex-1 w-full'
            }`}
          >
            <JfllCustomerTable
              customers={items}
              isLoading={isLoading}
              isError={isError}
              error={error as Error}
              onRetry={refetch}
              rowSelection={rowSelection}
              onRowSelectionChange={onRowSelectionChange}
              onCustomerClick={(c) => setPeekCustomer(c)}
              onViewFullCustomer={(c) => onCustomerClick?.(c)}
              peekCustomerId={peekCustomer?.id}
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

          {peekCustomer && (
            <SplitPeekDossier
              isOpen={!!peekCustomer}
              onClose={() => setPeekCustomer(null)}
              title={peekCustomer.fullName}
              subtitle={`${peekCustomer.customerGroup} · ${peekCustomer.territory || 'India'} · ${peekCustomer.type}`}
              currentIndex={peekIndex >= 0 ? peekIndex : 0}
              totalCount={items.length}
              onNext={goToNext}
              onPrev={goToPrev}
              onExpandFull={() => onCustomerClick?.(peekCustomer)}
              queueLabel="Customer"
              className="w-full lg:w-[40%] xl:w-[40%] flex-1"
            >
              <div className="flex flex-col divide-y divide-slate-100">
                {/* 1-Click Micro-touchpoint Logger */}
                <div className="p-4 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Quick Touchpoint
                    </span>
                    <SalesStatusBadge
                      status={getCachedApproachStatus('jfll_customer', peekCustomer.id)}
                      size="sm"
                    />
                  </div>
                  <QuickTouchpointLogger
                    entityType="jfll"
                    entityId={peekCustomer.id}
                    companyName={peekCustomer.fullName}
                    contactPerson={peekCustomer.contactPersonName || undefined}
                    phone={peekCustomer.mobileNumber || undefined}
                    email={peekCustomer.email || undefined}
                    currentUser={currentUser}
                    className="w-full justify-between"
                  />
                </div>

                {/* Customer Summary Card */}
                <div className="p-4 space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <JfllCustomerGroupBadge group={peekCustomer.customerGroup} />
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        peekCustomer.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {peekCustomer.status}
                    </span>
                    {peekCustomer.creditStatus && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Credit: {peekCustomer.creditStatus}
                      </span>
                    )}
                    {peekCustomer.type && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {peekCustomer.type}
                      </span>
                    )}
                  </div>

                  {/* Revenue Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        <span>Recent (3M)</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {formatIndianCurrency(peekCustomer.businessLast3m)}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Total Revenue</span>
                      </div>
                      <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                        {formatIndianCurrency(peekCustomer.totalBusinessTillDate)}
                      </div>
                    </div>
                  </div>

                  {/* Contact & Territory Details */}
                  <div className="space-y-2 text-xs">
                    {peekCustomer.territory && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-800">{peekCustomer.territory}</span>
                        </div>
                      </div>
                    )}

                    {/* Contact Details Card */}
                    <div className="border border-slate-200/70 rounded-lg p-3 bg-white space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Contact Information
                      </div>
                      {peekCustomer.contactPersonName && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-800">{peekCustomer.contactPersonName}</span>
                        </div>
                      )}
                      {peekCustomer.mobileNumber ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800 select-all">{peekCustomer.mobileNumber}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                          <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                          <span>No phone number on file</span>
                        </div>
                      )}
                      {peekCustomer.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800 select-all truncate">{peekCustomer.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>No email on file</span>
                        </div>
                      )}
                      {peekCustomer.salesPerson && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          Assigned Rep: <span className="font-medium text-slate-700">{peekCustomer.salesPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Full Dossier Button */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onCustomerClick?.(peekCustomer)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Open Full Dossier</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {peekCustomer.status !== 'Active' && onLogApproach && !isViewer && (
                        <button
                          type="button"
                          onClick={() => onLogApproach(peekCustomer)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo hover:text-white border border-apollo/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Detailed Log</span>
                        </button>
                      )}
                      {peekCustomer.status !== 'Active' && onConvertToActive && !isViewer && (
                        <button
                          type="button"
                          onClick={() => onConvertToActive(peekCustomer)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 hover:text-white" />
                          <span>Convert</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SplitPeekDossier>
          )}
        </div>
      </div>
    </div>
  );
};
