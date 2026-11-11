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
import { useToast, SegmentContextBanner } from '@/components/ui';
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
  onFindDecisionMakers?: (companyName: string, domain?: string, director?: string) => void;
  onLogApproach?: (lead: DatamyneLead) => void;
  onConvertToActive?: (lead: DatamyneLead) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  currentUser?: UserSession | null;
  isLoading?: boolean;
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
  onFindDecisionMakers,
  onLogApproach,
  onConvertToActive,
  isMobileOpen,
  onCloseMobile,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  currentUser,
  isLoading,
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

  const bannerConfig = React.useMemo(() => {
    if (perspective === 'tiers') {
      const tierConfigs: Record<
        string,
        {
          title: string;
          description: string;
          criteria: string;
          actionTip: string;
          variant: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
        }
      > = {
        'tier-a': {
          title: 'Tier A Priority Prospects',
          description:
            'High-intent freight shippers qualifying for direct inside sales engagement and customized freight analysis.',
          criteria:
            'Score 70–100 • 24+ shipments/year, active air cargo or high-value goods, priority lanes (US, UAE, LATAM)',
          actionTip:
            'Immediate Inside Sales discovery call within 24h. Deliver custom freight intelligence client report within 48h.',
          variant: 'emerald',
        },
        'tier-b': {
          title: 'Tier B Nurture Prospects',
          description:
            'Established international shippers targeted for automated multi-touch sequence nurturing.',
          criteria:
            'Score 40–69 • 4–23 shipments/year, ocean shipper with air suitability, customs recency 61–180 days',
          actionTip:
            'Automated 4-stage value email sequence. Trigger inside sales outreach upon engagement.',
          variant: 'blue',
        },
        parked: {
          title: 'Parked Accounts',
          description:
            'Low-fit or dormant cargo shippers requiring zero immediate outbound sales bandwidth.',
          criteria:
            'Score <40 • Under 4 shipments/year, bulk/low-value commodities, inactive >180 days',
          actionTip:
            'No active sales bandwidth expended. Accounts are automatically re-evaluated before annual export seasons.',
          variant: 'amber',
        },
        excluded: {
          title: 'Excluded Accounts',
          description:
            'Companies suppressed from prospecting pipelines due to existing customer status or forwarder competition.',
          criteria:
            'Matched with existing JFLL customer database or identified competitor freight forwarder / NVOCC',
          actionTip:
            'Strictly suppressed from cold sales prospecting. Forward to existing account manager or CRM team.',
          variant: 'slate',
        },
        unscored: {
          title: 'Unscored (Data Remediation Queue)',
          description:
            'Customs records with incomplete required parameters requiring analyst research and enrichment.',
          criteria:
            'Missing mandatory SOP fields: transport mode, commodity, trade lane, or activity date',
          actionTip:
            'Assigned to research analyst for domain, lane, and HS code enrichment before sales assignment.',
          variant: 'slate',
        },
        all: {
          title: 'All Scored Customs Leads',
          description:
            'Complete universe of 37,273 DataMyne shipping leads evaluated under JFLL SOP Stage 2.',
          criteria:
            'Full dataset evaluated against JFLL Lead Generation SOP Stage 2 across all scoring tiers',
          actionTip:
            'Select a specific tier tab above or filter by score thresholds to drive focused freight prospecting.',
          variant: 'blue',
        },
      };

      const cfg = tierConfigs[tierTab] || tierConfigs.all;
      return {
        ...cfg,
        count: displayTotal,
      };
    }

    const verticalConfigs: Record<
      string,
      {
        title: string;
        description: string;
        criteria: string;
        actionTip: string;
        variant: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
      }
    > = {
      all: {
        title: 'Customs Trade Manifests — All Verticals',
        description:
          'Unified customs trade directory across all classified industrial cargo sectors.',
        criteria:
          'Verified cross-border customs shipping bills • Air and ocean freight consignments documented',
        actionTip:
          'Use secondary filters (transport mode, trade lanes, shipments count) to refine target list.',
        variant: 'blue',
      },
      perishables: {
        title: 'Perishables & Cold Chain Shippers',
        description:
          'Time-critical cold-chain cargo: fresh fruits, vegetables, seafood, meat, and floriculture.',
        criteria:
          'HS Codes: Chapters 01–24 • Requires temperature-controlled reefer containers or fast-transit cold room air freight',
        actionTip:
          'Highlight Jet Freight specialized perishable handling, airport cool-chain hubs, and rapid customs clearance.',
        variant: 'emerald',
      },
      pharma: {
        title: 'Pharma & Healthcare Logistics',
        description:
          'High-yield life sciences cargo: finished formulations, active pharmaceutical ingredients (APIs), and medical instruments.',
        criteria:
          'HS Codes: Chapters 30 & 90 • GDP compliance, continuous temperature data logging (+15°C to +25°C, +2°C to +8°C)',
        actionTip:
          'Pitch certified cold-chain packaging, Envirotainer partnerships, and specialized pharma corridors.',
        variant: 'emerald',
      },
      textiles: {
        title: 'Textiles & Apparel Exporters',
        description:
          'High-volume fashion goods: readymade garments (RMG), cotton fabrics, yarns, home textiles, and accessories.',
        criteria:
          'HS Codes: Chapters 50–63 • High ocean FCL container volume with seasonal urgent airfreight surges',
        actionTip:
          'Propose blended sea-air logistics solutions and priority peak-season air freight allocations.',
        variant: 'purple',
      },
      engineering: {
        title: 'Engineering & Heavy Machinery',
        description:
          'Industrial machinery, boilers, electrical equipment, machine tools, and fabricated industrial components.',
        criteria:
          'HS Codes: Chapters 84 & 85 • Heavy-lift, out-of-gauge (OOG), and breakbulk ocean freight requirements',
        actionTip:
          'Showcase Jet Freight project cargo capabilities, flat-rack/open-top container handling, and port-side operations.',
        variant: 'blue',
      },
      chemicals: {
        title: 'Chemicals & Dangerous Goods (DGR)',
        description:
          'Specialty chemicals, organic compounds, dyes, polymers, and raw bulk pharmaceutical chemicals.',
        criteria:
          'HS Codes: Chapters 28 & 29 • Requires Dangerous Goods (DGR / IMO) compliance and certified packing',
        actionTip:
          'Emphasize certified IATA DGR personnel and dangerous goods documentation expertise.',
        variant: 'amber',
      },
      electronics: {
        title: 'Electronics & High-Tech Hardware',
        description:
          'High-value tech freight: consumer electronics, telecom gear, printed circuit boards (PCBs), and semiconductors.',
        criteria:
          'HS Codes: Chapter 85 • High susceptibility to damage/pilferage; time-sensitive air transit from Asian tech hubs',
        actionTip:
          'Highlight secured bonded trucking, high-value cargo escorts, and real-time GPS tracking.',
        variant: 'purple',
      },
      automotive: {
        title: 'Automotive & EV Components',
        description:
          'Automotive components, electric vehicle powertrains, two-wheeler assemblies, and replacement parts.',
        criteria:
          'HS Codes: Chapter 87 • Just-In-Time (JIT) production delivery schedules with strict penalty clauses',
        actionTip:
          'Offer dedicated JIT emergency air charters and consolidated sea-freight schedules for Tier-1 suppliers.',
        variant: 'blue',
      },
      general: {
        title: 'General Cargo & Dry Freight',
        description:
          'Diversified trade commodities: plastics, packaging materials, paper, hardware, and assorted manufactured dry goods.',
        criteria:
          'Assorted consumer and commercial dry goods • Standard ocean FCL/LCL container shipping',
        actionTip:
          'Compete on ocean freight forwarding rates, free time at destination, and multi-carrier booking options.',
        variant: 'slate',
      },
    };

    const activeTab = filters.tab || 'all';
    const cfg = verticalConfigs[activeTab] || verticalConfigs.all;
    return {
      ...cfg,
      count: displayTotal,
    };
  }, [perspective, tierTab, filters.tab, displayTotal]);

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
          <SegmentContextBanner
            title={bannerConfig.title}
            count={bannerConfig.count}
            description={bannerConfig.description}
            criteria={bannerConfig.criteria}
            actionTip={bannerConfig.actionTip}
            variant={bannerConfig.variant}
            className="mb-2 shrink-0"
          />
          <DatamyneTable
            leads={displayItems}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onLeadClick={onLeadClick}
            onFindDecisionMakers={onFindDecisionMakers}
            onLogApproach={currentUser?.role === 'Viewer' ? undefined : onLogApproach}
            onConvertToActive={currentUser?.role === 'Viewer' ? undefined : onConvertToActive}
            currentPage={displayPage}
            totalPages={displayTotalPages}
            pageSize={query.limit || 25}
            totalItems={displayTotal}
            totalFormatted={displayTotalFormatted}
            onPageChange={handleDisplayPageChange}
            onClearFilters={clearAllFilters}
            onResetToAllVerticals={() => onTabChange('all')}
            isLoading={perspective === 'tiers' ? isTierLoading : (isLoading ?? false)}
          />
        </div>
      </div>
    </div>
  );
};
