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
import {
  exportDatamyneLeadsCsv,
  exportDatamyneSummaryReportCsv,
  getLoadedDatamyneDataset,
} from '@/services/datamyneService';
import { triggerCsvDownload } from '@/utils/csv';
import { getLatestApproachNotesForEntities } from '@/services/approachLogService';
import { logger } from '@/utils/logger';
import { TierFilterParams } from '@/types/tierSegmentation';
import { UserSession } from '@/types/auth';
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
  onDownloadSummaryReport?: () => void;
  onSearchChange: (query: string) => void;
  setHsCode?: (code: string) => void;
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
  toggleApproachStatus?: (status: string) => void;
  setApproachStatuses?: (statuses: string[]) => void;
  toggleHasDirectors: () => void;
  setMinShipments: (min: number) => void;
  setMinTradedValueUsd: (min: number) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
  onLeadClick: (lead: DatamyneLead) => void;
  onLogApproach?: (lead: DatamyneLead) => void;
  onConvertToActive?: (lead: DatamyneLead) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentUser?: UserSession | null;
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
  onDownloadSummaryReport,
  onSearchChange,
  setHsCode,
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
  toggleApproachStatus,
  setApproachStatuses,
  toggleHasDirectors,
  setMinShipments,
  setMinTradedValueUsd,
  clearAllFilters,
  activeFilterCount,
  onLeadClick,
  onLogApproach,
  onConvertToActive,
  isMobileOpen,
  onCloseMobile,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentUser,
}) => {
  const isViewer = currentUser?.role === 'Viewer';
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
  const [isExportingSummary, setIsExportingSummary] = React.useState(false);

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

  const handleDownloadSummaryReport = React.useCallback(async () => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

    try {
      setIsExportingSummary(true);
      const allLeads = getLoadedDatamyneDataset();
      const allTierLeads = getLoadedTierDataset();

      let targetLeads: DatamyneLead[] = [];
      if (selectedIds.length > 0) {
        targetLeads = selectedIds
          .map(
            (id) =>
              displayItems.find((d) => d.id === id) ||
              allLeads.find((d) => d.id === id) ||
              (allTierLeads as unknown as DatamyneLead[]).find((d) => d.id === id)
          )
          .filter(Boolean) as DatamyneLead[];
      } else {
        // Smart fallback: default to exporting the visible leads on the current page
        targetLeads = displayItems.slice(0, 25);
        if (targetLeads.length === 0) {
          showToast('No leads available in current view to export.', 'info');
          return;
        }
        showToast(`Exporting executive summary report for current page (${targetLeads.length} leads)...`, 'info');
      }

      if (targetLeads.length === 0) {
        showToast('Selected lead records could not be found.', 'error');
        return;
      }

      // Fetch approach notes in parallel for selected leads
      const notesMap = await getLatestApproachNotesForEntities(
        'datamyne',
        targetLeads.map((l) => l.id)
      );

      const blob = exportDatamyneSummaryReportCsv(targetLeads, { notesMap });
      const today = new Date().toISOString().split('T')[0];
      const filename = `JFLL_DataMyne_Executive_Summary_${today}.csv`;

      triggerCsvDownload(blob, filename);
      showToast(`Downloaded executive summary report for ${targetLeads.length} lead${targetLeads.length > 1 ? 's' : ''}`);
    } catch (err) {
      logger.error('DATAMYNE_SUMMARY', 'Failed to generate executive summary report', { error: String(err) });
      showToast('Failed to generate summary report. Please try again.', 'error');
    } finally {
      setIsExportingSummary(false);
    }
  }, [displayItems, rowSelection, showToast]);

  return (
    <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
      <DatamyneFilterSidebar
        filters={filters}
        setSearch={onSearchChange}
        setHsCode={setHsCode}
        setDataset={onDatasetChange}
        toggleCountry={toggleCountry}
        toggleTransportMode={toggleTransportMode}
        toggleCategory={toggleCategory}
        toggleSubcategory={toggleSubcategory}
        toggleRole={toggleRole}
        toggleCity={toggleCity}
        toggleTradeLane={toggleTradeLane}
        toggleContactStatus={toggleContactStatus}
        toggleApproachStatus={toggleApproachStatus}
        setApproachStatuses={setApproachStatuses}
        toggleHasDirectors={toggleHasDirectors}
        setMinShipments={setMinShipments}
        setMinTradedValueUsd={setMinTradedValueUsd}
        clearAllFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={onToggleSidebarCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Streamlined Unified Mode & Audience Tabs Strip */}
        <div className="bg-white border-b border-slate-200/90 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0">
            {/* View Mode Toggle */}
            <div
              role="tablist"
              aria-label="Subcategory View Mode"
              className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={perspective === 'verticals'}
                onClick={() => setPerspective('verticals')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  perspective === 'verticals'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View leads categorized across 9 logistics industry cargo sectors"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Logistics Verticals</span>
                <span className="sm:hidden">Verticals</span>
                <span className="text-[10px] text-slate-500 font-normal">9</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={perspective === 'tiers'}
                onClick={() => setPerspective('tiers')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  perspective === 'tiers'
                    ? 'bg-apollo text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View leads ranked by SOP qualification score (Tier A, Tier B, Parked)"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">SOP Tiers</span>
                <span className="sm:hidden">Tiers</span>
              </button>
            </div>

            {/* Vertical separator */}
            <div className="h-5 w-[1px] bg-slate-200 shrink-0" />

            {/* Active Audience Tabs (Verticals or SOP Tiers) */}
            <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
              {perspective === 'tiers' ? (
                <TierAudienceTabs
                  activeTab={tierTab}
                  onTabChange={setTierTab}
                  counts={tierCounts}
                  className="border-b-0 bg-transparent px-0"
                />
              ) : (
                <DatamyneAudienceTabs
                  activeTab={filters.tab}
                  onTabChange={onTabChange}
                  activeDataset={filters.dataset || 'valid'}
                  onChangeDataset={onDatasetChange}
                  counts={query.audienceCounts}
                  totalFormatted={query.totalFormatted}
                  showSegmentSwitcher={false}
                  className="border-b-0 bg-transparent px-0"
                />
              )}
            </div>
          </div>

          {/* Current Scope total count on the right */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 shrink-0 pl-2">
            <span className="text-slate-400">Scope:</span>
            <strong className="text-slate-800 font-semibold">{displayTotalFormatted}</strong>
            <span className="text-slate-500">Leads</span>
          </div>
        </div>

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
          onDownloadSummaryReport={onDownloadSummaryReport || handleDownloadSummaryReport}
          isExportingSummary={isExportingSummary}
          currentUser={currentUser}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          activeDataset={filters.dataset || 'valid'}
          onChangeDataset={onDatasetChange}
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
          onRemoveApproachStatus={toggleApproachStatus}
          onRemoveHsCode={setHsCode ? () => setHsCode('') : undefined}
          onToggleHasDirectors={toggleHasDirectors}
          onClearSearch={() => onSearchChange('')}
          onClearAll={clearAllFilters}
        />

        <div className="flex-1 flex flex-col px-3 sm:px-4 py-2 min-h-0 overflow-hidden">
          <DatamyneTable
            leads={displayItems}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            onLogApproach={isViewer ? undefined : onLogApproach}
            onConvertToActive={isViewer ? undefined : onConvertToActive}
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
