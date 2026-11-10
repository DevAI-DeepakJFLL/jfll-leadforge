import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  Trophy,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingUp,
  Table as TableIcon,
  CalendarRange,
} from 'lucide-react';
import {
  LeadTrackerFilterParams,
  LeadTrackerItem,
  TrackerKPIs,
  TrackerStatus,
} from '@/types/leadTracker';
import { UserSession } from '@/types/auth';
import {
  fetchTrackedLeads,
  fetchTrackerKPIs,
  updateTrackedLead,
  TRACKER_UPDATED_EVENT,
} from '@/services/leadTrackerService';
import { LeadTrackerTable } from './LeadTrackerTable';
import { LeadTrackerGantt } from './LeadTrackerGantt';
import { LeadTrackerDrawer } from './LeadTrackerDrawer';
import { LeadTrackerFilterSidebar } from './LeadTrackerFilterSidebar';

export interface LeadStatusTrackerViewProps {
  initialBranch?: string;
  initialRep?: string;
  todayStr?: string;
  currentUser?: UserSession | null;
  onLeadClick?: (lead: LeadTrackerItem) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const LeadStatusTrackerView: React.FC<LeadStatusTrackerViewProps> = ({
  initialBranch = 'All',
  initialRep = 'All',
  todayStr,
  currentUser,
  onLeadClick,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  // Leads & KPIs state
  const [leads, setLeads] = useState<LeadTrackerItem[]>([]);
  const [kpis, setKpis] = useState<TrackerKPIs>({
    total_leads: 0,
    active_leads: 0,
    quoted_leads: 0,
    won_leads: 0,
    overdue_leads: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedRep, setSelectedRep] = useState<string>(initialRep);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedTransportMode, setSelectedTransportMode] = useState<string>('All');
  const [selectedRoutingType, setSelectedRoutingType] = useState<string>('All');
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View mode switcher: Table View vs Freight Horizon (Gantt)
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drawer state
  const [selectedLead, setSelectedLead] = useState<LeadTrackerItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');

  /**
   * Loads both tracked leads and KPI telemetry.
   */
  const loadTrackerData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const filters: LeadTrackerFilterParams = {
        branch: selectedBranch,
        assigned_to: selectedRep,
        status: selectedStatus,
        overdue_only: isOverdueOnly,
        search: searchQuery.trim() || undefined,
        sort_by: sortBy,
        order: sortOrder,
      };

      const [loadedLeads, loadedKpis] = await Promise.all([
        fetchTrackedLeads(filters),
        fetchTrackerKPIs(),
      ]);

      let resultLeads = loadedLeads;
      if (selectedTransportMode && selectedTransportMode !== 'All') {
        resultLeads = resultLeads.filter((l) => l.transport_mode === selectedTransportMode);
      }
      if (selectedRoutingType && selectedRoutingType !== 'All') {
        resultLeads = resultLeads.filter((l) => l.routing_type === selectedRoutingType);
      }

      setLeads(resultLeads);
      setKpis(loadedKpis);
    } catch {
      // Error logging handled by leadTrackerService
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedBranch,
    selectedRep,
    selectedStatus,
    selectedTransportMode,
    selectedRoutingType,
    isOverdueOnly,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Initial fetch and reload on filter changes
  useEffect(() => {
    loadTrackerData();
  }, [loadTrackerData]);

  // Listen for global custom event when another tab adds a lead
  useEffect(() => {
    const handleRemoteUpdate = () => {
      loadTrackerData(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(TRACKER_UPDATED_EVENT, handleRemoteUpdate);
      return () => {
        window.removeEventListener(TRACKER_UPDATED_EVENT, handleRemoteUpdate);
      };
    }
  }, [loadTrackerData]);

  // Handlers for drawer actions
  const handleOpenAddLead = () => {
    setSelectedLead(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleSelectLead = (lead: LeadTrackerItem) => {
    setSelectedLead(lead);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
    onLeadClick?.(lead);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLead(null);
  };

  const handleLeadSaved = (updated: LeadTrackerItem) => {
    setSelectedLead(updated);
    loadTrackerData(true);
  };

  const handleLeadCreated = () => {
    loadTrackerData(true);
  };

  const handleLeadDeleted = () => {
    setSelectedLead(null);
    setIsDrawerOpen(false);
    loadTrackerData(true);
  };

  // Quick inline status change handler
  const handleInlineStatusChange = async (leadId: string, newStatus: TrackerStatus) => {
    try {
      await updateTrackedLead(leadId, { status: newStatus });
      loadTrackerData(true);
    } catch {
      // Error handled by service
    }
  };

  // Sort change handler
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Quick KPI filter handlers
  const handleKpiTotalClick = () => {
    setSelectedBranch('All');
    setSelectedRep('All');
    setSelectedStatus('All');
    setSelectedTransportMode('All');
    setSelectedRoutingType('All');
    setIsOverdueOnly(false);
    setSearchQuery('');
  };

  const handleKpiActiveClick = () => {
    setSelectedStatus('Assigned');
    setIsOverdueOnly(false);
  };

  const handleKpiQuotedClick = () => {
    setSelectedStatus((prev) => (prev === 'Quoted' ? 'All' : 'Quoted'));
  };

  const handleKpiWonClick = () => {
    setSelectedStatus((prev) => (prev === 'Won' ? 'All' : 'Won'));
  };

  const handleKpiOverdueClick = () => {
    setIsOverdueOnly((prev) => !prev);
  };

  const handleResetFilters = () => {
    setSelectedBranch('All');
    setSelectedRep('All');
    setSelectedStatus('All');
    setSelectedTransportMode('All');
    setSelectedRoutingType('All');
    setIsOverdueOnly(false);
    setSearchQuery('');
  };

  const activeFilterCount =
    (selectedBranch !== 'All' ? 1 : 0) +
    (selectedRep !== 'All' ? 1 : 0) +
    (selectedStatus !== 'All' ? 1 : 0) +
    (selectedTransportMode !== 'All' ? 1 : 0) +
    (selectedRoutingType !== 'All' ? 1 : 0) +
    (isOverdueOnly ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className={`flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white ${className}`}>
      {/* 1. Dedicated Left Filter Sidebar (Desktop Persistent + Mobile Drawer) */}
      <LeadTrackerFilterSidebar
        selectedBranch={selectedBranch}
        onSelectBranch={setSelectedBranch}
        selectedRep={selectedRep}
        onSelectRep={setSelectedRep}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        isOverdueOnly={isOverdueOnly}
        onToggleOverdueOnly={() => setIsOverdueOnly((prev) => !prev)}
        selectedTransportMode={selectedTransportMode}
        onSelectTransportMode={setSelectedTransportMode}
        selectedRoutingType={selectedRoutingType}
        onSelectRoutingType={setSelectedRoutingType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        kpis={kpis}
        leads={leads}
        isMobileOpen={isMobileOpen}
        onCloseMobile={onCloseMobile}
      />

      {/* 2. Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Top Header Toolbar */}
        <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Lead Status Tracker</span>
                  {isRefreshing && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  <TrendingUp className="w-3 h-3 text-blue-600" />
                  <span>Executive Sales Command</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                Tyra &amp; Deepak Master View
              </p>
            </div>

            {/* Segmented View Mode Switcher */}
            <div
              role="tablist"
              aria-label="Tracker View Mode"
              className="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <button
                type="button"
                role="tab"
                data-testid="view-toggle-table"
                aria-selected={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                role="tab"
                data-testid="view-toggle-gantt"
                aria-selected={viewMode === 'gantt'}
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Freight Horizon (Gantt)</span>
              </button>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadTrackerData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Refresh lead tracker data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddLead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Compact Telemetry Ribbon (Takes only 38px!) */}
        <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-1.5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-none text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleKpiTotalClick}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-slate-300 font-medium transition-colors cursor-pointer shrink-0"
            >
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>Total Tracked:</span>
              <strong className="text-slate-900">{kpis.total_leads}</strong>
            </button>

            <button
              type="button"
              onClick={handleKpiActiveClick}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50/50 font-medium transition-colors cursor-pointer shrink-0"
            >
              <Users className="w-3 h-3 text-blue-600" />
              <span>Active Pipeline:</span>
              <strong className="text-blue-900">{kpis.active_leads}</strong>
            </button>

            <button
              type="button"
              onClick={handleKpiQuotedClick}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'Quoted'
                  ? 'bg-amber-100/60 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                  : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50/50'
              }`}
            >
              <DollarSign className="w-3 h-3 text-amber-600" />
              <span>Rates Quoted:</span>
              <strong className="text-amber-950">{kpis.quoted_leads}</strong>
            </button>

            <button
              type="button"
              onClick={handleKpiWonClick}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer shrink-0 ${
                selectedStatus === 'Won'
                  ? 'bg-emerald-100/60 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400'
                  : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50/50'
              }`}
            >
              <Trophy className="w-3 h-3 text-emerald-600" />
              <span>Won Deals:</span>
              <strong className="text-emerald-950">{kpis.won_leads}</strong>
            </button>

            <button
              type="button"
              onClick={handleKpiOverdueClick}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer shrink-0 ${
                isOverdueOnly
                  ? 'bg-rose-100 border-rose-400 text-rose-900 ring-1 ring-rose-400'
                  : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50/50'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Overdue Follow-ups:</span>
              <strong className="text-rose-950">{kpis.overdue_leads}</strong>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 shrink-0 hidden md:inline">
            Showing <strong className="text-slate-800">{leads.length}</strong> leads
            {selectedBranch !== 'All' && ` in ${selectedBranch}`}
            {selectedRep !== 'All' && ` (${selectedRep})`}
          </div>
        </div>

        {/* 3. Main Data Content Area (Scrollable flex container) */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-4">
          {viewMode === 'table' ? (
            <LeadTrackerTable
              leads={leads}
              isLoading={isLoading}
              onSelectLead={handleSelectLead}
              onStatusChange={handleInlineStatusChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              todayStr={todayStr}
              emptyStateAction={
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              }
            />
          ) : (
            <LeadTrackerGantt
              leads={leads}
              isLoading={isLoading}
              onSelectLead={handleSelectLead}
              todayStr={todayStr}
              emptyStateAction={
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* 4. Slide-Over Detail / Touchpoint Drawer */}
      <LeadTrackerDrawer
        isOpen={isDrawerOpen}
        lead={selectedLead}
        mode={drawerMode}
        onClose={handleCloseDrawer}
        onLeadUpdated={handleLeadSaved}
        onLeadCreated={handleLeadCreated}
        onLeadDeleted={handleLeadDeleted}
        currentUser={
          currentUser
            ? { name: currentUser.name || currentUser.email, email: currentUser.email }
            : undefined
        }
      />
    </div>
  );
};
