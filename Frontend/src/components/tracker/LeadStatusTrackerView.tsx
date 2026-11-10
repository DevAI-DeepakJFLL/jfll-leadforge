import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  Trophy,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  X,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  ALL_TRACKER_STATUSES,
  LeadTrackerFilterParams,
  LeadTrackerItem,
  TrackerKPIs,
  TrackerStatus,
} from '@/types/leadTracker';
import {
  fetchTrackedLeads,
  fetchTrackerKPIs,
  updateTrackedLead,
  TRACKER_UPDATED_EVENT,
} from '@/services/leadTrackerService';
import { LeadTrackerTable } from './LeadTrackerTable';
import { LeadTrackerDrawer, STANDARD_BRANCHES, STANDARD_SALES_REPS } from './LeadTrackerDrawer';

export interface LeadStatusTrackerViewProps {
  initialBranch?: string;
  initialRep?: string;
  todayStr?: string;
  className?: string;
}

export const LeadStatusTrackerView: React.FC<LeadStatusTrackerViewProps> = ({
  initialBranch = 'All',
  initialRep = 'All',
  todayStr,
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
  const [isOverdueOnly, setIsOverdueOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

      setLeads(loadedLeads);
      setKpis(loadedKpis);
    } catch {
      // In-memory fallback handles errors internally
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedBranch, selectedRep, selectedStatus, isOverdueOnly, searchQuery, sortBy, sortOrder]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadTrackerData();
  }, [loadTrackerData]);

  // Synchronize on global tracker update events
  useEffect(() => {
    const handleUpdate = () => {
      loadTrackerData(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(TRACKER_UPDATED_EVENT, handleUpdate);
      return () => {
        window.removeEventListener(TRACKER_UPDATED_EVENT, handleUpdate);
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
    loadTrackerData(true);
  };

  // Inline status switcher from table
  const handleInlineStatusChange = async (leadId: string, newStatus: TrackerStatus) => {
    try {
      // Optimistic state update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
      await updateTrackedLead(leadId, { status: newStatus });
      loadTrackerData(true);
    } catch {
      loadTrackerData(true);
    }
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Branch tabs
  const branchTabs = ['All', ...STANDARD_BRANCHES];

  // Quick KPI click filters
  const handleKpiTotalClick = () => {
    setSelectedStatus('All');
    setIsOverdueOnly(false);
  };

  const handleKpiActiveClick = () => {
    setSelectedStatus('All');
    setIsOverdueOnly(false);
  };

  const handleKpiQuotedClick = () => {
    setSelectedStatus(selectedStatus === 'Quoted' ? 'All' : 'Quoted');
    setIsOverdueOnly(false);
  };

  const handleKpiWonClick = () => {
    setSelectedStatus(selectedStatus === 'Won' ? 'All' : 'Won');
    setIsOverdueOnly(false);
  };

  const handleKpiOverdueClick = () => {
    setIsOverdueOnly((prev) => !prev);
  };

  const hasActiveFilters =
    selectedBranch !== 'All' ||
    selectedRep !== 'All' ||
    selectedStatus !== 'All' ||
    isOverdueOnly ||
    Boolean(searchQuery.trim());

  const handleResetFilters = () => {
    setSelectedBranch('All');
    setSelectedRep('All');
    setSelectedStatus('All');
    setIsOverdueOnly(false);
    setSearchQuery('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <TrendingUp className="w-3 h-3" />
              Executive Sales Command
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Tyra &amp; Deepak Master View</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Lead Status Tracker
            {isRefreshing && (
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            )}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Monitor sales coordinator outreach, quote progress, follow-up cadence, and carrier rate competitiveness.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadTrackerData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            title="Refresh lead tracker data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddLead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Tracked */}
        <button
          type="button"
          onClick={handleKpiTotalClick}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tracked
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {kpis.total_leads}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across all branch offices
          </div>
        </button>

        {/* KPI 2: Active Pipeline */}
        <button
          type="button"
          onClick={handleKpiActiveClick}
          className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 hover:border-blue-300 hover:shadow-xs transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Active Pipeline
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            {kpis.active_leads}
          </div>
          <div className="text-[11px] text-blue-700 mt-0.5">
            In outreach or negotiation
          </div>
        </button>

        {/* KPI 3: Rates Quoted */}
        <button
          type="button"
          onClick={handleKpiQuotedClick}
          className={`p-4 rounded-xl border transition-all text-left group ${
            selectedStatus === 'Quoted'
              ? 'border-amber-400 bg-amber-50 shadow-xs ring-2 ring-amber-400/20'
              : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Rates Quoted
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-950 mt-2">
            {kpis.quoted_leads}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            Awaiting shipper approval
          </div>
        </button>

        {/* KPI 4: Won Deals */}
        <button
          type="button"
          onClick={handleKpiWonClick}
          className={`p-4 rounded-xl border transition-all text-left group ${
            selectedStatus === 'Won'
              ? 'border-emerald-400 bg-emerald-50 shadow-xs ring-2 ring-emerald-400/20'
              : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Won Deals
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950 mt-2">
            {kpis.won_leads}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Converted to active billing
          </div>
        </button>

        {/* KPI 5: Overdue Follow-ups */}
        <button
          type="button"
          onClick={handleKpiOverdueClick}
          className={`p-4 rounded-xl border transition-all text-left group col-span-2 md:col-span-1 ${
            isOverdueOnly
              ? 'border-rose-400 bg-rose-50 shadow-xs ring-2 ring-rose-400/20'
              : kpis.overdue_leads > 0
              ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 hover:border-rose-300'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Overdue Follow-ups
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-950 mt-2">
            {kpis.overdue_leads}
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5">
            {isOverdueOnly ? 'Filtering overdue' : 'Requires immediate touch'}
          </div>
        </button>
      </div>

      {/* 3. Filter Ribbon & Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        {/* Branch Tabs Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {branchTabs.map((branch) => {
              const active = selectedBranch === branch;
              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => setSelectedBranch(branch)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {branch === 'All' ? 'All Branches' : branch}
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Secondary Filters: Rep, Stage, Overdue, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          {/* Sales Rep Selector */}
          <div>
            <label htmlFor="filter-sales-rep" className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Sales Coordinator
            </label>
            <select
              id="filter-sales-rep"
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
            >
              <option value="All">All Coordinators</option>
              {STANDARD_SALES_REPS.map((r) => (
                <option key={r.name} value={r.name}>
                  {`${r.name} (${r.branch})`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Stage Selector */}
          <div>
            <label htmlFor="filter-tracker-status" className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Pipeline Stage
            </label>
            <select
              id="filter-tracker-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
            >
              <option value="All">All Stages</option>
              {ALL_TRACKER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Toggle Chip */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Urgency Filter
            </span>
            <button
              type="button"
              onClick={() => setIsOverdueOnly((prev) => !prev)}
              className={`w-full text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center justify-between transition-colors ${
                isOverdueOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Overdue Only</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                isOverdueOnly ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-600'
              }`}>
                {kpis.overdue_leads}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div>
            <label htmlFor="filter-search-box" className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Search Lead / Shipper
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                id="filter-search-box"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Company, rep, or notes..."
                className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Header Count & Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing <span className="font-semibold text-slate-800">{leads.length}</span> tracked leads
            {selectedBranch !== 'All' && ` in ${selectedBranch}`}
            {selectedRep !== 'All' && ` for ${selectedRep}`}
            {selectedStatus !== 'All' && ` (${selectedStatus})`}
            {isOverdueOnly && ` · Overdue only`}
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Click any row to open touchpoint drawer &amp; timeline
          </div>
        </div>

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
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors"
            >
              Reset Filters
            </button>
          }
        />
      </div>

      {/* 5. Slide-Over Detail / Touchpoint Drawer */}
      <LeadTrackerDrawer
        isOpen={isDrawerOpen}
        lead={selectedLead}
        mode={drawerMode}
        onClose={handleCloseDrawer}
        onLeadUpdated={handleLeadSaved}
        onLeadCreated={handleLeadCreated}
        onLeadDeleted={handleLeadDeleted}
      />
    </div>
  );
};
