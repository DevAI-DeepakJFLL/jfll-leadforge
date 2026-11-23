import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Plane,
  Ship,
  ArrowDownLeft,
  Boxes,
  Clock,
  MapPin,
  Compass,
  FileText,
  ChevronDown,
  Users,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  MonthlyRecord,
  GatewayHubId,
} from '@/types/freightCommodities';
import {
  MONTHLY_COMMODITY_RECORDS,
  filterCommodityRecords,
  getColdChainSpecsByHub,
} from '@/data/freightCommoditiesData';
import { CommodityDetailDrawer } from './CommodityDetailDrawer';

export interface CommodityRadarViewProps {
  initialMonth?: number;
  initialHub?: GatewayHubId;
  initialSearchQuery?: string;
  onFilterChange?: (month: number, hub: GatewayHubId) => void;
  onFindInDatamyne?: (query: string, port?: string) => void;
  onFindInApollo?: (query: string) => void;
  onNavigateToReport?: (companyName: string) => void;
  className?: string;
}

const MONTHS = [
  { value: 1, label: 'M01 · January' },
  { value: 2, label: 'M02 · February' },
  { value: 3, label: 'M03 · March' },
  { value: 4, label: 'M04 · April' },
  { value: 5, label: 'M05 · May' },
  { value: 6, label: 'M06 · June' },
  { value: 7, label: 'M07 · July' },
  { value: 8, label: 'M08 · August' },
  { value: 9, label: 'M09 · September' },
  { value: 10, label: 'M10 · October' },
  { value: 11, label: 'M11 · November (Active Peak)' },
  { value: 12, label: 'M12 · December' },
];

const HUBS: { id: GatewayHubId; label: string; code: string }[] = [
  { id: 'ALL', label: 'All 8 Hubs', code: 'ALL' },
  { id: 'DEL', label: 'Delhi NCR', code: 'DEL' },
  { id: 'BOM', label: 'Mumbai', code: 'BOM' },
  { id: 'BLR', label: 'Bengaluru', code: 'BLR' },
  { id: 'MAA', label: 'Chennai', code: 'MAA' },
  { id: 'HYD', label: 'Hyderabad', code: 'HYD' },
  { id: 'CCU', label: 'Kolkata', code: 'CCU' },
  { id: 'AMD', label: 'Ahmedabad', code: 'AMD' },
  { id: 'COK', label: 'Kerala', code: 'COK' },
];

const MODES = [
  'All Modes',
  'Air Export',
  'Sea Export',
  'Air Import',
  'Sea Import',
];

export const CommodityRadarView: React.FC<CommodityRadarViewProps> = ({
  initialMonth,
  initialHub,
  initialSearchQuery,
  onFilterChange,
  onFindInDatamyne,
  onFindInApollo,
  onNavigateToReport,
  className = '',
}) => {
  // State: Defaulting to initialMonth || 11 and initialHub || 'ALL'
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || 11);
  const [selectedHub, setSelectedHub] = useState<GatewayHubId>(initialHub || 'ALL');
  const [selectedMode, setSelectedMode] = useState<string>('All Modes');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');

  // Selected record for the right-side detail drawer
  const [drawerRecord, setDrawerRecord] = useState<MonthlyRecord | null>(null);

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    onFilterChange?.(month, selectedHub);
  };

  const handleHubChange = (hub: GatewayHubId) => {
    setSelectedHub(hub);
    onFilterChange?.(selectedMonth, hub);
  };

  // In-memory filtered dataset
  const filteredRecords = useMemo(() => {
    let records = filterCommodityRecords(
      selectedMonth,
      selectedHub,
      selectedMode,
      searchQuery
    );
    if (priorityFilter === 'HIGH') {
      records = records.filter((r) => r.priority === 'HIGH');
    }
    return records;
  }, [selectedMonth, selectedHub, selectedMode, searchQuery, priorityFilter]);

  // Executive Metric Strip computations
  const currentMonthName = useMemo(() => {
    return MONTHS.find((m) => m.value === selectedMonth)?.label.split(' · ')[1] || 'Current Month';
  }, [selectedMonth]);

  // Loop fusion: single-pass tuple accumulator for active and upcoming booking windows
  const [activeBookingWindowsCount, approachingWindowsCount] = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    for (const r of filteredRecords) {
      if (r.bookingStatus === 'active') active++;
      else if (r.bookingStatus === 'upcoming') upcoming++;
    }
    return [active, upcoming] as const;
  }, [filteredRecords]);

  const activeColdChainCount = useMemo(() => {
    return getColdChainSpecsByHub(selectedHub).length;
  }, [selectedHub]);

  // Seasonal driver headline for selected month
  const monthlyDriverHeadline = useMemo(() => {
    const activeMonthRecord = MONTHLY_COMMODITY_RECORDS.find(
      (r) => r.month === selectedMonth && (selectedHub === 'ALL' ? r.hubId === 'BOM' || r.hubId === 'DEL' : r.hubId === selectedHub)
    );
    return activeMonthRecord ? activeMonthRecord.season : 'Seasonal Commodity Cycles';
  }, [selectedMonth, selectedHub]);

  const handleResetFilters = () => {
    const defaultMonth = initialMonth || 11;
    const defaultHub = initialHub || 'ALL';
    setSelectedMonth(defaultMonth);
    setSelectedHub(defaultHub);
    setSelectedMode('All Modes');
    setPriorityFilter('ALL');
    setSearchQuery('');
    onFilterChange?.(defaultMonth, defaultHub);
  };

  const isFiltered =
    selectedMonth !== (initialMonth || 11) ||
    selectedHub !== (initialHub || 'ALL') ||
    selectedMode !== 'All Modes' ||
    priorityFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  return (
    <div className={`flex flex-col min-h-screen bg-slate-50/70 text-slate-900 ${className}`}>
      {/* View Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-600" />
                Commodity Targeting Radar
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                National Seasonal Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Real-time multi-modal commodity target playbooks across India's top 8 commercial gateways. Lock Block Space Agreements (BSAs) and reefer allocations 4–8 weeks ahead of seasonal harvest surges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 hidden md:inline-block">
              3.96M MT Air · $8.46B Marine · $4.43B Spices
            </span>
          </div>
        </div>

        {/* Quick Control Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                aria-label="Select Target Month"
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Hub Segmented Buttons */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto scrollbar-none max-w-full">
              {HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => handleHubChange(hub.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                    selectedHub === hub.id
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {hub.code}
                </button>
              ))}
            </div>

            {/* Mode Segmented Buttons */}
            <div className="hidden sm:flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    selectedMode === mode
                      ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Priority Toggle */}
            <button
              type="button"
              onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                priorityFilter === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              High Priority Only
            </button>
          </div>

          {/* Search Input & Reset */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search commodity, cluster, HS..."
                maxLength={100}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchQuery) {
                    setSearchQuery('');
                  }
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="Reset filters to default (November / All Hubs)"
                aria-label="Reset filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Executive Metrics Strip (Compact single row) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Tile 1: Seasonal Driver */}
          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100/80 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide block truncate">
                Active Season ({currentMonthName})
              </span>
              <p className="font-bold text-slate-900 truncate mt-0.5">
                {monthlyDriverHeadline}
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          </div>

          {/* Tile 2: Active Targets */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">
                Active Gateways
              </span>
              <p className="font-bold text-slate-900 tabular-nums mt-0.5">
                {filteredRecords.length} Hub Records
              </p>
            </div>
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Tile 3: Booking Radar */}
          <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block">
                Booking Lead Windows
              </span>
              <p className="font-bold text-emerald-900 tabular-nums mt-0.5">
                {activeBookingWindowsCount} Active · {approachingWindowsCount} Upcoming
              </p>
            </div>
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>

          {/* Tile 4: Cold-Chain Profiles */}
          <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wide block">
                Cold-Chain Regimes
              </span>
              <p className="font-bold text-indigo-900 tabular-nums mt-0.5">
                {activeColdChainCount} Verified Regimes
              </p>
            </div>
            <Boxes className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
        </div>
      </div>

      {/* Main Content Area - Operational Commodity Grid */}
      <div className="flex-1 p-6 space-y-4 max-w-7xl w-full mx-auto">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <Compass className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">
              No seasonal targets match your filter
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try selecting a different gateway hub, resetting the month, or clearing the search query.
            </p>

            {/* Suggested query chips (IMP-4) */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Suggested searches:</span>
              {['Table Grapes', 'Basmati Rice', 'Shrimp', 'Vaccines', 'Spices'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-full transition-colors border border-slate-200"
                >
                  {term}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters to Default
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => {
              const isBookingActive = record.bookingStatus === 'active';
              const isBookingUpcoming = record.bookingStatus === 'upcoming';

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs p-5 space-y-4"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs tracking-wider">
                        {record.hubId}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {record.hubName}
                          </h3>
                          <span className="text-xs font-medium text-slate-400">
                            • {record.monthName} ({record.quarter})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-blue-700 mt-0.5">
                          {record.season}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isBookingActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Lock Booking Now
                        </span>
                      )}
                      {isBookingUpcoming && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Lead Window: {record.bookingWindow}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                          record.priority === 'HIGH'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        Priority: {record.priority}
                      </span>
                    </div>
                  </div>

                  {/* Four Modal Flow Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Air Export */}
                    <div className="p-3 rounded-lg bg-sky-50/50 border border-sky-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                        <Plane className="w-3.5 h-3.5 text-sky-600" />
                        <span>Air Export Lots</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-3">
                        {record.airExport || 'Standard air consolidation.'}
                      </p>
                    </div>

                    {/* Sea Export */}
                    <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                        <Ship className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sea Export Reefers/FCL</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-3">
                        {record.seaExport || 'Dry containerized ocean freight.'}
                      </p>
                    </div>

                    {/* Air Import */}
                    <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
                        <span>Air Inbound Inputs</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-3">
                        {record.airImport || 'High-value tech inputs.'}
                      </p>
                    </div>

                    {/* Sea Import */}
                    <div className="p-3 rounded-lg bg-indigo-50/40 border border-indigo-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
                        <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sea Raw Materials</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed line-clamp-3">
                        {record.seaImport || 'Industrial capital inputs.'}
                      </p>
                    </div>
                  </div>

                  {/* Operational Context Specs Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800">Target Clusters:</span>{' '}
                      <span className="text-slate-600">{record.clusters}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Recommended Equipment:</span>{' '}
                      <span className="text-slate-600 font-mono text-[11px]">{record.equipment}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Primary Trade Corridors:</span>{' '}
                      <span className="text-slate-600">{record.tradeLanes}</span>
                    </div>
                  </div>

                  {/* 1-Click Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerRecord(record)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Playbook & Pitch Script</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {onFindInDatamyne && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstCluster = (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                            onFindInDatamyne(firstCluster);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Ship className="w-3.5 h-3.5 text-slate-500" />
                          <span>Find in DataMyne</span>
                        </button>
                      )}

                      {onFindInApollo && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstCluster = (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                            onFindInApollo(firstCluster);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span>Find in Apollo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over Inspection Drawer */}
      <CommodityDetailDrawer
        isOpen={!!drawerRecord}
        record={drawerRecord}
        onClose={() => setDrawerRecord(null)}
        onFindInDatamyne={onFindInDatamyne}
        onFindInApollo={onFindInApollo}
        onNavigateToReport={onNavigateToReport}
      />
    </div>
  );
};
