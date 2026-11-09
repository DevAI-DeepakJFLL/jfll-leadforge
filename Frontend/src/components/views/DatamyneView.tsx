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
  Sparkles,
  Layers,
  MapPin,
  Phone,
  Mail,
  PackageCheck,
  DollarSign,
  Maximize2,
  PhoneOff,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';
import { useToast } from '@/components/ui';
import { TierAudienceTabs, TierScoreBadge } from '@/components/tiers';
import { useTierFilter } from '@/hooks/useTierFilter';
import { SplitPeekDossier } from '@/components/common';
import { useTableQueueNavigation } from '@/hooks/useTableQueueNavigation';
import { QuickTouchpointLogger, SalesStatusBadge } from '@/components/approach';
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
import {
  getLatestApproachNotesForEntities,
  getCachedApproachStatus,
  APPROACH_STATUS_CHANGED_EVENT,
} from '@/services/approachLogService';
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
  currentUser?: UserSession | null;
  isFilterExpanded?: boolean;
  onToggleFilterExpand?: () => void;
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
  currentUser,
  isFilterExpanded: propIsFilterExpanded,
  onToggleFilterExpand: propOnToggleFilterExpand,
}) => {
  const isViewer = currentUser?.role === 'Viewer';
  const [internalFilterExpanded, setInternalFilterExpanded] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('datamyne_desktop_filter_expanded');
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

  const handleToggleFilterExpand = React.useCallback(() => {
    if (propOnToggleFilterExpand) {
      propOnToggleFilterExpand();
      return;
    }
    setInternalFilterExpanded((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('datamyne_desktop_filter_expanded', String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [propOnToggleFilterExpand]);

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

  const [peekLead, setPeekLead] = React.useState<DatamyneLead | null>(null);

  // Clear peekLead if filters or page switch excludes current lead from displayItems
  React.useEffect(() => {
    if (peekLead && !displayItems.some((l) => l.id === peekLead.id)) {
      setPeekLead(null);
    }
  }, [displayItems, peekLead]);

  const [, setUpdateTrigger] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setUpdateTrigger((v) => v + 1);
    window.addEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
  }, []);

  const peekIndex = React.useMemo(() => {
    if (!peekLead) return -1;
    return displayItems.findIndex((l) => l.id === peekLead.id);
  }, [displayItems, peekLead]);

  const { goToNext, goToPrev } = useTableQueueNavigation<DatamyneLead>({
    items: displayItems,
    selectedIndex: peekIndex >= 0 ? peekIndex : undefined,
    onNavigate: (_idx, lead) => {
      if (lead) setPeekLead(lead);
    },
    onClose: () => setPeekLead(null),
    enabled: !!peekLead,
  });

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
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
        isExpanded={isFilterExpanded}
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
          onDownloadSummaryReport={onDownloadSummaryReport || handleDownloadSummaryReport}
          isExportingSummary={isExportingSummary}
          currentUser={currentUser}
          searchQuery={filters.q || ''}
          onSearchChange={onSearchChange}
          searchPlaceholder={
            perspective === 'tiers'
              ? 'Search tiered leads by company, city, category...'
              : 'Search DataMyne by company, description, country...'
          }
          isFilterExpanded={isFilterExpanded}
          onToggleFilterExpand={handleToggleFilterExpand}
          activeFilterCount={activeFilterCount}
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
          onToggleHasDirectors={toggleHasDirectors}
          onClearSearch={() => onSearchChange('')}
          onClearAll={clearAllFilters}
        />

        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          <div
            className={`flex flex-col p-3 sm:p-4 min-h-0 overflow-hidden transition-all duration-200 ${
              peekLead ? 'w-full lg:w-[60%] shrink-0' : 'flex-1 w-full'
            }`}
          >
            <DatamyneTable
              leads={displayItems}
              rowSelection={rowSelection}
              onRowSelectionChange={onRowSelectionChange}
              onLeadClick={(lead) => setPeekLead(lead)}
              onViewFullLead={(lead) => onLeadClick?.(lead)}
              peekLeadId={peekLead?.id}
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

          {peekLead && (
            <SplitPeekDossier
              isOpen={!!peekLead}
              onClose={() => setPeekLead(null)}
              title={peekLead.company_name}
              subtitle={`${peekLead.role} · ${peekLead.city || 'India'} · ${peekLead.category}`}
              currentIndex={peekIndex >= 0 ? peekIndex : 0}
              totalCount={displayItems.length}
              onNext={goToNext}
              onPrev={goToPrev}
              onExpandFull={() => onLeadClick?.(peekLead)}
              queueLabel="Lead"
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
                      status={getCachedApproachStatus('datamyne', peekLead.id)}
                      size="sm"
                    />
                  </div>
                  <QuickTouchpointLogger
                    entityType="datamyne"
                    entityId={peekLead.id}
                    companyName={peekLead.company_name}
                    phone={peekLead.phone}
                    email={peekLead.email}
                    currentUser={currentUser}
                    className="w-full justify-between"
                  />
                </div>

                {/* Lead Summary Card */}
                <div className="p-4 space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(peekLead as any).segment_status && (
                      <TierScoreBadge
                        status={(peekLead as any).segment_status}
                        score={(peekLead as any).total_score || 0}
                        breakdown={(peekLead as any).score_breakdown}
                      />
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        peekLead.role === 'Exporter'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : peekLead.role === 'Importer'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {peekLead.role === 'Both (Exporter & Importer)' || peekLead.role === 'Both'
                        ? 'Both (Exp & Imp)'
                        : peekLead.role}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {peekLead.category}
                    </span>
                    {peekLead.subcategory && (
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                        {peekLead.subcategory}
                      </span>
                    )}
                  </div>

                  {/* Volume & Value Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                        <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Total Shipments</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {peekLead.total_shipments.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Traded Value</span>
                      </div>
                      <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                        {peekLead.total_value_usd > 0
                          ? `$${
                              peekLead.total_value_usd >= 1_000_000
                                ? (peekLead.total_value_usd / 1_000_000).toFixed(2) + 'M'
                                : peekLead.total_value_usd >= 1_000
                                ? (peekLead.total_value_usd / 1_000).toFixed(1) + 'K'
                                : peekLead.total_value_usd.toFixed(0)
                            }`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Key Details */}
                  <div className="space-y-2 text-xs">
                    {peekLead.city && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-800">{peekLead.city}</span>
                          {peekLead.trade_lanes && (
                            <span className="text-slate-500 ml-1.5">({peekLead.trade_lanes})</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Details */}
                    <div className="border border-slate-200/70 rounded-lg p-3 bg-white space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Contact Information
                      </div>
                      {peekLead.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800 select-all">{peekLead.phone}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                          <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                          <span>No phone number on file</span>
                        </div>
                      )}
                      {peekLead.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800 select-all truncate">{peekLead.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 italic text-[11px]">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span>No email on file</span>
                        </div>
                      )}
                      {peekLead.tax_id && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          IEC: <span className="text-slate-700 font-semibold">{peekLead.tax_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Full Dossier Button */}
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onLeadClick?.(peekLead)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Open Full Dossier</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {onLogApproach && !isViewer && (
                        <button
                          type="button"
                          onClick={() => onLogApproach(peekLead)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo hover:text-white border border-apollo/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>Detailed Log</span>
                        </button>
                      )}
                      {onConvertToActive && !isViewer && (
                        <button
                          type="button"
                          onClick={() => onConvertToActive(peekLead)}
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
