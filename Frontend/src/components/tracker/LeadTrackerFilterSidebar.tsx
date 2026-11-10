import React, { useState } from 'react';
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Users,
  Clock,
  Plane,
  Ship,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  X,
  Compass,
  Layers,
} from 'lucide-react';
import { FilterAccordion } from '@/components/filters/FilterAccordion';
import {
  ALL_TRACKER_STATUSES,
  ALL_TRANSPORT_MODES,
  ALL_ROUTING_TYPES,
  LeadTrackerItem,
  TrackerKPIs,
} from '@/types/leadTracker';
import { STANDARD_BRANCHES, STANDARD_SALES_REPS } from './LeadTrackerDrawer';

export interface LeadTrackerFilterSidebarProps {
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
  selectedRep: string;
  onSelectRep: (rep: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  isOverdueOnly: boolean;
  onToggleOverdueOnly: () => void;
  selectedTransportMode?: string;
  onSelectTransportMode: (mode: string) => void;
  selectedRoutingType?: string;
  onSelectRoutingType: (routing: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
  activeFilterCount: number;
  kpis: TrackerKPIs;
  leads?: LeadTrackerItem[];
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const LeadTrackerFilterSidebar: React.FC<LeadTrackerFilterSidebarProps> = ({
  selectedBranch,
  onSelectBranch,
  selectedRep,
  onSelectRep,
  selectedStatus,
  onSelectStatus,
  isOverdueOnly,
  onToggleOverdueOnly,
  selectedTransportMode = 'All',
  onSelectTransportMode,
  selectedRoutingType = 'All',
  onSelectRoutingType,
  searchQuery,
  onSearchChange,
  onResetFilters,
  activeFilterCount,
  kpis,
  leads = [],
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  const [repSearch, setRepSearch] = useState('');

  // Compute live counts per branch
  const branchCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.branch] = (map[l.branch] || 0) + 1;
    });
    return map;
  }, [leads]);

  // Compute live counts per rep
  const repCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.assigned_to] = (map[l.assigned_to] || 0) + 1;
    });
    return map;
  }, [leads]);

  // Filtered reps for quick filter search
  const filteredReps = STANDARD_SALES_REPS.filter((rep) =>
    rep.name.toLowerCase().includes(repSearch.toLowerCase()) ||
    rep.branch.toLowerCase().includes(repSearch.toLowerCase())
  );

  const filterContent = (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Top Sidebar Header with Title & Reset */}
      <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Lead Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Instant Filter Search Input */}
      <div className="p-3 border-b border-slate-100 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Lead / Shipper..."
            aria-label="Search Lead / Shipper"
            className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filter Accordions */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100 scrollbar-thin">
        {/* Urgency SLA Quick Filter */}
        <div className="pb-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Urgency Filter</span>
          </div>
          <button
            type="button"
            onClick={onToggleOverdueOnly}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              isOverdueOnly
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs ring-2 ring-rose-500/20'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${isOverdueOnly ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>Overdue Only</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                isOverdueOnly ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {kpis.overdue_leads}
            </span>
          </button>
        </div>

        {/* Section 1: Branch Office */}
        <FilterAccordion
          icon={<Building2 className="w-4 h-4 text-blue-600" />}
          label="Branch Office"
          defaultOpen={true}
          activeCount={selectedBranch !== 'All' ? 1 : 0}
        >
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => onSelectBranch('All')}
              className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                selectedBranch === 'All'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>All Branches</span>
              <span className="text-[10px] text-slate-400">{leads.length}</span>
            </button>
            {STANDARD_BRANCHES.map((b) => {
              const active = selectedBranch.toLowerCase() === b.toLowerCase();
              const count = branchCounts[b] || 0;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => onSelectBranch(active ? 'All' : b)}
                  className={`w-full px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{b}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${active ? 'bg-blue-100 text-blue-800' : 'text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterAccordion>

        {/* Section 2: Pipeline Stage */}
        <FilterAccordion
          icon={<Layers className="w-4 h-4 text-emerald-600" />}
          label="Pipeline Stage"
          defaultOpen={true}
          activeCount={selectedStatus !== 'All' ? 1 : 0}
        >
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => onSelectStatus('All')}
              className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                selectedStatus === 'All'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>All Stages</span>
            </button>
            {ALL_TRACKER_STATUSES.map((st) => {
              const active = selectedStatus === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onSelectStatus(active ? 'All' : st)}
                  className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{st}</span>
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </FilterAccordion>

        {/* Section 3: Sales Coordinator */}
        <FilterAccordion
          icon={<Users className="w-4 h-4 text-purple-600" />}
          label="Sales Coordinator"
          defaultOpen={true}
          activeCount={selectedRep !== 'All' ? 1 : 0}
        >
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={repSearch}
              onChange={(e) => setRepSearch(e.target.value)}
              placeholder="Find coordinator..."
              className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:bg-white outline-hidden"
            />
            <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-thin">
              <button
                type="button"
                onClick={() => onSelectRep('All')}
                className={`w-full px-2 py-1 rounded text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  selectedRep === 'All'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Coordinators</span>
              </button>
              {filteredReps.map((r) => {
                const active = selectedRep.toLowerCase() === r.name.toLowerCase();
                const count = repCounts[r.name] || 0;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => onSelectRep(active ? 'All' : r.name)}
                    className={`w-full px-2 py-1 rounded text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-left truncate">
                      <span className="truncate font-medium">{`${r.name} (${r.branch})`}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] text-slate-400 px-1">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* Section 4: Transport Mode */}
        <FilterAccordion
          icon={<Plane className="w-4 h-4 text-sky-600" />}
          label="Transport Mode"
          defaultOpen={selectedTransportMode !== 'All'}
          activeCount={selectedTransportMode !== 'All' ? 1 : 0}
        >
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => onSelectTransportMode('All')}
              className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                selectedTransportMode === 'All'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>All Transport Modes</span>
            </button>
            {ALL_TRANSPORT_MODES.map((mode) => {
              const active = selectedTransportMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectTransportMode(active ? 'All' : mode)}
                  className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {mode.includes('Air') && <Plane className="w-3.5 h-3.5 text-sky-500" />}
                    {mode.includes('FCL') && <Ship className="w-3.5 h-3.5 text-blue-600" />}
                    {mode.includes('LCL') && <Ship className="w-3.5 h-3.5 text-teal-600" />}
                    {mode.includes('Courier') && <Package className="w-3.5 h-3.5 text-purple-600" />}
                    {mode.includes('CHA') && <FileText className="w-3.5 h-3.5 text-amber-600" />}
                    {mode.includes('Multimodal') && <Truck className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{mode}</span>
                  </span>
                  {active && <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </FilterAccordion>

        {/* Section 5: Routing Control */}
        <FilterAccordion
          icon={<Compass className="w-4 h-4 text-indigo-600" />}
          label="Routing Control"
          defaultOpen={selectedRoutingType !== 'All'}
          activeCount={selectedRoutingType !== 'All' ? 1 : 0}
        >
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => onSelectRoutingType('All')}
              className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                selectedRoutingType === 'All'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>All Routing Types</span>
            </button>
            {ALL_ROUTING_TYPES.map((rt) => {
              const active = selectedRoutingType === rt;
              return (
                <button
                  key={rt}
                  type="button"
                  onClick={() => onSelectRoutingType(active ? 'All' : rt)}
                  className={`w-full px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{rt}</span>
                  {active && <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </FilterAccordion>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-64 xl:w-72 h-full border-r border-slate-200/90 bg-white flex-col shrink-0 overflow-hidden select-none ${className}`}
        aria-label="Lead Status Tracker Filters Sidebar"
      >
        {filterContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Slide-over panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with close button */}
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Lead Filters</h2>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
};
