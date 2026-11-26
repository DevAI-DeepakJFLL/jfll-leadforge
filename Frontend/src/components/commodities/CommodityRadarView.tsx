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
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  ArrowRight,
  Thermometer,
  Calendar,
  Globe,
  GitFork,
} from 'lucide-react';
import {
  MonthlyRecord,
  GatewayHubId,
} from '@/types/freightCommodities';
import {
  MONTHLY_COMMODITY_RECORDS,
  filterCommodityRecords,
  getColdChainSpecsByHub,
  getPrimaryCommodity,
} from '@/data/freightCommoditiesData';
import { CommodityDetailDrawer } from './CommodityDetailDrawer';
import { CommoditySwimlaneTimeline } from './CommoditySwimlaneTimeline';
import { CommodityCorridorSankey } from './CommodityCorridorSankey';

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
  { value: 1, label: 'M01 · January', short: 'Jan' },
  { value: 2, label: 'M02 · February', short: 'Feb' },
  { value: 3, label: 'M03 · March', short: 'Mar' },
  { value: 4, label: 'M04 · April', short: 'Apr' },
  { value: 5, label: 'M05 · May', short: 'May' },
  { value: 6, label: 'M06 · June', short: 'Jun' },
  { value: 7, label: 'M07 · July', short: 'Jul' },
  { value: 8, label: 'M08 · August', short: 'Aug' },
  { value: 9, label: 'M09 · September', short: 'Sep' },
  { value: 10, label: 'M10 · October', short: 'Oct' },
  { value: 11, label: 'M11 · November (Active Peak)', short: 'Nov' },
  { value: 12, label: 'M12 · December', short: 'Dec' },
];

const HUBS: { id: GatewayHubId; label: string; code: string; region: 'North' | 'West' | 'South' | 'East' | 'All' }[] = [
  { id: 'ALL', label: 'All 8 Hubs', code: 'ALL', region: 'All' },
  { id: 'DEL', label: 'Delhi NCR', code: 'DEL', region: 'North' },
  { id: 'BOM', label: 'Mumbai', code: 'BOM', region: 'West' },
  { id: 'BLR', label: 'Bengaluru', code: 'BLR', region: 'South' },
  { id: 'MAA', label: 'Chennai', code: 'MAA', region: 'South' },
  { id: 'HYD', label: 'Hyderabad', code: 'HYD', region: 'South' },
  { id: 'CCU', label: 'Kolkata', code: 'CCU', region: 'East' },
  { id: 'AMD', label: 'Ahmedabad', code: 'AMD', region: 'West' },
  { id: 'COK', label: 'Kerala', code: 'COK', region: 'South' },
];

const MODES = [
  'All Modes',
  'Air Export',
  'Sea Export',
  'Air Import',
  'Sea Import',
];

/** Helper to cleanly split comma-separated items into readable badges */
function parseCommodityChips(text: string): string[] {
  if (!text) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Detects temperature and cold-chain indicators from equipment or description */
function extractTempBadge(text: string): string | null {
  const match = text.match(/([+-]?\d+°?C(?:\s*to\s*[+-]?\d+°?C)?)/i);
  return match ? match[1] : null;
}

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
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'active' | 'upcoming'>('all');

  // Interactive visual presentation: 'timeline' (Seasonal Swimlane) or 'sankey' (Trade Flow)
  const [visualMode, setVisualMode] = useState<'timeline' | 'sankey'>('timeline');

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

  // In-memory filtered dataset: when searching, searches across all 12 months & gateways!
  const isSearchActive = searchQuery.trim().length > 0;
  const filteredRecords = useMemo(() => {
    let records = filterCommodityRecords(
      selectedMonth,
      selectedHub,
      selectedMode,
      searchQuery,
      true // allMonthsIfQuery: true!
    );
    if (priorityFilter === 'HIGH') {
      records = records.filter((r) => r.priority === 'HIGH');
    }
    if (urgencyFilter === 'active') {
      records = records.filter((r) => r.bookingStatus === 'active');
    } else if (urgencyFilter === 'upcoming') {
      records = records.filter((r) => r.bookingStatus === 'upcoming');
    }
    return records;
  }, [selectedMonth, selectedHub, selectedMode, searchQuery, priorityFilter, urgencyFilter]);

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

  // All 8 records for the active month (unfiltered by hub) to drive the charts
  const allMonthRecords = useMemo(() => {
    return MONTHLY_COMMODITY_RECORDS.filter((r) => r.month === selectedMonth);
  }, [selectedMonth]);

  // Regional breakdown chart data
  const regionalBreakdown = useMemo(() => {
    const regions = [
      {
        name: 'North Region',
        hubs: ['DEL' as GatewayHubId],
        color: 'sky',
        accentBg: 'bg-sky-50 border-sky-200 text-sky-800',
        barColor: 'bg-sky-500',
        focus: 'Basmati Rice, Kinnow Citrus, Chilled Meat, Winter Apparel',
        equipment: "20' Heavy FCL, 40' HC Reefer, Air LD3/LD7",
        gatewayLabel: 'DEL (IGI / Tughlakabad)',
        intensity: 88,
      },
      {
        name: 'West Region',
        hubs: ['BOM' as GatewayHubId, 'AMD' as GatewayHubId],
        color: 'blue',
        accentBg: 'bg-blue-50 border-blue-200 text-blue-800',
        barColor: 'bg-blue-600',
        focus: 'Table Grapes, Pomegranates, Bulk Chemicals, Castor Oil',
        equipment: "40' CA Reefer (0°C to +1°C), 20' ISO Tanks",
        gatewayLabel: 'BOM & AMD (JNPA / CSMIA)',
        intensity: 94,
      },
      {
        name: 'South Region',
        hubs: ['BLR' as GatewayHubId, 'MAA' as GatewayHubId, 'HYD' as GatewayHubId, 'COK' as GatewayHubId],
        color: 'emerald',
        accentBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        barColor: 'bg-emerald-500',
        focus: 'Vannamei Shrimp, Floriculture/Roses, Vaccines, Spices',
        equipment: "Super-Freezers (-25°C), Active ULDs (+2°C to +8°C)",
        gatewayLabel: 'BLR, MAA, HYD, COK',
        intensity: 92,
      },
      {
        name: 'East Region',
        hubs: ['CCU' as GatewayHubId],
        color: 'amber',
        accentBg: 'bg-amber-50 border-amber-200 text-amber-800',
        barColor: 'bg-amber-500',
        focus: 'Black Tiger Shrimp, Jute Hessian, Tea, Iron Castings',
        equipment: "40' Reefer, 20'/40' Dry FCL",
        gatewayLabel: 'CCU (Syama Prasad / NSCBIA)',
        intensity: 76,
      },
    ];

    return regions;
  }, []);

  // Top Trending Flagship Commodities This Month for Inside Sales Leaderboard
  const topTrendingCommodities = useMemo(() => {
    const list: {
      name: string;
      hubId: GatewayHubId;
      hubName: string;
      mode: 'Air' | 'Ocean' | 'Multi-Modal';
      equipment: string;
      temp?: string;
      corridor: string;
      urgency: 'Lock Booking Now' | 'Lead Window Active';
      cluster: string;
    }[] = [];

    allMonthRecords.forEach((r) => {
      const airChips = parseCommodityChips(r.airExport);
      const seaChips = parseCommodityChips(r.seaExport);
      const topCluster = (r.clusters || '').split(',')[0] || r.hubName;

      if (r.hubId === 'DEL') {
        list.push({
          name: seaChips[0] || 'Basmati Rice',
          hubId: 'DEL',
          hubName: 'Delhi NCR',
          mode: 'Ocean',
          equipment: "20' Heavy FCL",
          temp: undefined,
          corridor: 'GCC, UK, EU',
          urgency: r.bookingStatus === 'active' ? 'Lock Booking Now' : 'Lead Window Active',
          cluster: topCluster,
        });
        if (airChips[0]) {
          list.push({
            name: airChips[0],
            hubId: 'DEL',
            hubName: 'Delhi NCR',
            mode: 'Air',
            equipment: 'Air LD3/LD7 Perishable',
            temp: extractTempBadge(airChips[0]) || '-18°C / +2°C',
            corridor: 'Middle East, EU, CIS',
            urgency: 'Lead Window Active',
            cluster: 'Aligarh / Sahibabad',
          });
        }
      } else if (r.hubId === 'BOM') {
        list.push({
          name: seaChips[0] || 'Nashik Table Grapes & Pomegranates',
          hubId: 'BOM',
          hubName: 'Mumbai',
          mode: 'Ocean',
          equipment: "40' CA Reefer",
          temp: '0°C to +1°C',
          corridor: 'Rotterdam, UK, GCC',
          urgency: 'Lock Booking Now',
          cluster: 'Nashik / Sangli',
        });
      } else if (r.hubId === 'MAA') {
        list.push({
          name: seaChips[0] || 'Vannamei Shrimp & Seafood',
          hubId: 'MAA',
          hubName: 'Chennai',
          mode: 'Ocean',
          equipment: "40' Super-Freezer",
          temp: '-25°C Frozen',
          corridor: 'USA, Japan, EU',
          urgency: 'Lock Booking Now',
          cluster: 'Nellore / Cuddalore',
        });
      } else if (r.hubId === 'HYD') {
        list.push({
          name: airChips[0] || 'Pharma Vaccines & APIs',
          hubId: 'HYD',
          hubName: 'Hyderabad',
          mode: 'Air',
          equipment: 'Active Envirotainer / CSafe',
          temp: '+2°C to +8°C',
          corridor: 'USA, EU, Dubai Corridor',
          urgency: 'Lock Booking Now',
          cluster: 'Genome Valley / Pashamylaram',
        });
      } else if (r.hubId === 'BLR') {
        list.push({
          name: airChips[0] || 'Cut Roses & Floriculture',
          hubId: 'BLR',
          hubName: 'Bengaluru',
          mode: 'Air',
          equipment: 'Air Cool Dolly & Vacuum Boxes',
          temp: '+2°C to +4°C',
          corridor: 'Amsterdam, UK, Middle East',
          urgency: 'Lead Window Active',
          cluster: 'Doddaballapur / Hosur',
        });
      }
    });

    return list.slice(0, 6);
  }, [allMonthRecords]);

  // Major Global Freight Corridors for Multi-Modal Flow Map
  const globalCorridors = useMemo(() => {
    return [
      {
        id: 'corridor-eu',
        name: 'Europe & UK Gateway',
        hubs: 'BOM, DEL, BLR',
        topCommodities: 'Table Grapes, Basmati Rice, Cut Roses, Pharma APIs',
        equipment: "40' CA Reefer (0°C to +1°C), Air LD3/LD7",
        volumeShare: 34,
        color: 'blue',
      },
      {
        id: 'corridor-gcc',
        name: 'GCC & Middle East',
        hubs: 'DEL, BOM, COK, MAA',
        topCommodities: 'Basmati Rice, Buffalo Meat, Fresh Vegetables, Spices',
        equipment: "20' Heavy FCL, 40' Reefer (-18°C), Air LD3",
        volumeShare: 31,
        color: 'emerald',
      },
      {
        id: 'corridor-usa',
        name: 'North America (Transatlantic/Pacific)',
        hubs: 'HYD, MAA, BLR, BOM',
        topCommodities: 'Pharma Vaccines, Vannamei Shrimp, Precision Auto Parts',
        equipment: 'Active Pharma ULDs (+2°C to +8°C), Super-Freezers (-25°C)',
        volumeShare: 23,
        color: 'purple',
      },
      {
        id: 'corridor-apac',
        name: 'Far East & Asia-Pacific',
        hubs: 'MAA, CCU, BOM',
        topCommodities: 'Frozen Marine Shrimp, Mud Crabs, Castor Oil, Cotton Yarn',
        equipment: "40' Marine Reefers, 20' ISO Tank Containers",
        volumeShare: 12,
        color: 'amber',
      },
    ];
  }, []);

  const handleResetFilters = () => {
    const defaultMonth = initialMonth || 11;
    const defaultHub = initialHub || 'ALL';
    setSelectedMonth(defaultMonth);
    setSelectedHub(defaultHub);
    setSelectedMode('All Modes');
    setPriorityFilter('ALL');
    setUrgencyFilter('all');
    setSearchQuery('');
    onFilterChange?.(defaultMonth, defaultHub);
  };

  const isFiltered =
    selectedMonth !== (initialMonth || 11) ||
    selectedHub !== (initialHub || 'ALL') ||
    selectedMode !== 'All Modes' ||
    priorityFilter !== 'ALL' ||
    urgencyFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className={`flex-1 overflow-y-auto min-h-0 bg-slate-50 text-slate-900 flex flex-col overscroll-y-contain ${className}`}>
      {/* 1. View Header & Quick Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                  <Compass className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Commodity Targeting Radar
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    National Seasonal Intelligence
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Real-time multi-modal commodity target playbooks across India&apos;s top 8 commercial gateways. Lock Block Space Agreements (BSAs) and reefer allocations 4–8 weeks ahead of seasonal harvest surges.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 hidden md:inline-block">
                3.96M MT Air · $8.46B Marine · $4.43B Spices
              </span>
            </div>
          </div>

          {/* Streamlined Visual Filter Strip */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Month Dropdown */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  aria-label="Select Target Month"
                  className="appearance-none bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
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

            {/* Search Input, View Mode & Reset */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search commodity (e.g., Grapes, Pharma, Mango)..."
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

              {/* View Switcher: Cards vs Sales Matrix */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'matrix'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Quick Sales Matrix (Table View)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
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
      </div>

      {/* 2. Executive Metric Strip */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Tile 1: Seasonal Driver */}
            <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100/80 flex items-center justify-between">
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
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
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
            <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
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
            <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
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
      </div>

      {/* 3. HERO VISUALISATION SUITE */}
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Instant Search Results Banner when search query is active */}
        {isSearchActive && (
          <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-300">
                    {filteredRecords.length} Match{filteredRecords.length === 1 ? '' : 'es'} Across All 12 Months
                  </span>
                </h3>
                <p className="text-[11px] text-blue-800/80">
                  Showing all seasonal freight cycles matching your search across India&apos;s 8 commercial gateways. Clear search or press Escape to return to {currentMonthName} view.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Search (Esc)</span>
            </button>
          </div>
        )}

        {/* HYBRID VISUAL RADAR: Interactive Seasonal Swimlane Timeline & Trade Flow Sankey */}
        <div className="space-y-2">
          {/* View Switcher Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setVisualMode('timeline')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  visualMode === 'timeline'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Seasonal Timeline (Swimlane)</span>
              </button>
              <button
                type="button"
                onClick={() => setVisualMode('sankey')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  visualMode === 'sankey'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GitFork className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trade Flow (Sankey)</span>
              </button>
            </div>

            <div className="text-[11px] font-medium text-slate-500 px-2 hidden md:inline">
              {visualMode === 'timeline'
                ? 'Chronological 12-month harvest surges, booking lead windows & cold-chain regimes'
                : 'End-to-end multi-tier logistics pathways from Indian Gateways to Global Corridors'}
            </div>
          </div>

          {/* Active Visualization Mode */}
          {visualMode === 'timeline' ? (
            <CommoditySwimlaneTimeline
              selectedMonth={selectedMonth}
              selectedHub={selectedHub}
              onMonthChange={handleMonthChange}
              onHubChange={handleHubChange}
              onSelectRecord={(rec) => setDrawerRecord(rec)}
              urgencyFilter={urgencyFilter}
              searchQuery={searchQuery}
            />
          ) : (
            <CommodityCorridorSankey
              selectedMonth={selectedMonth}
              selectedHub={selectedHub}
              onMonthChange={handleMonthChange}
              onHubChange={handleHubChange}
              onSelectCommodity={(comm) => setSearchQuery(comm.split(' ')[0])}
            />
          )}
        </div>

        {/* VISUALISATION 2 & 3: Regional Demand Matrix + Global Trade Corridor Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Regional Export Demand Matrix (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Regional Export Demand Matrix ({currentMonthName})
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Surge intensity and key outbound commodities across India&apos;s commercial freight zones
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                National Radar
              </span>
            </div>

            {/* Regional Progress & Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {regionalBreakdown.map((reg) => (
                <div
                  key={reg.name}
                  className={`p-3 rounded-lg border transition-all hover:shadow-xs cursor-pointer ${
                    reg.hubs.includes(selectedHub)
                      ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => {
                    if (reg.hubs.length === 1) {
                      handleHubChange(reg.hubs[0]);
                    } else if (reg.hubs.includes(selectedHub)) {
                      handleHubChange('ALL');
                    } else {
                      handleHubChange(reg.hubs[0]);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{reg.name}</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-500">
                      {reg.gatewayLabel}
                    </span>
                  </div>

                  {/* Progress Bar Gauge */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                      className={`${reg.barColor} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${reg.intensity}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-700 font-medium line-clamp-1">
                    {reg.focus}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Equip: {reg.equipment.split(',')[0]}</span>
                    <span className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                      Filter Hub →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Multi-Modal & Equipment Split Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                Seasonal Capacity Mix:
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ocean Reefers: 42%
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Air Perishables: 38%
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Dry Heavy FCL: 20%
                </span>
              </div>
            </div>
          </div>

          {/* Top Trending Commodities Leaderboard (Inside Sales Quick-Picks) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-50 text-amber-600">
                  <Flame className="w-4 h-4 fill-amber-500/20" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Top Trending Commodities
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Highest sales conversion targets this month
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {topTrendingCommodities.length} Targets
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1">
              {topTrendingCommodities.map((item, idx) => (
                <div
                  key={`${item.hubId}-${item.name}-${idx}`}
                  onClick={() => setSearchQuery(item.name.split(' ')[0])}
                  className="p-2.5 rounded-lg border border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/80 transition-all cursor-pointer group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                        {item.hubId}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                        {item.name}
                      </h4>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-medium text-slate-700">{item.equipment}</span>
                      {item.temp && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">{item.temp}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="truncate">{item.corridor}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                      {item.urgency}
                    </span>
                    <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Filter <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 shrink-0 text-center">
              <span className="text-[11px] text-slate-500">
                Click any trending commodity to filter active leads
              </span>
            </div>
          </div>
        </div>

        {/* VISUALISATION 4: Global Trade Corridors & Temperature Cold-Chain Flow Radar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                <Globe className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Global Trade Corridors &amp; Multi-Modal Flow Radar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Outbound flow distribution from Indian gateways to key overseas consumption hubs
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Corridor Flow
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {globalCorridors.map((c) => (
              <div
                key={c.id}
                onClick={() => setSearchQuery(c.topCommodities.split(',')[0].trim())}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    {c.name}
                  </h4>
                  <span className="font-mono text-xs font-extrabold text-blue-700">
                    {c.volumeShare}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1 mb-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${c.volumeShare * 2.5}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-700 font-medium line-clamp-1 mb-1">
                  {c.topCommodities}
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span className="font-mono">{c.hubs}</span>
                  <span className="text-blue-600 group-hover:underline">Explore →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Operational Commodity Targets (Visual Playbook Cards vs Quick Sales Matrix) */}
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
        ) : viewMode === 'matrix' ? (
          /* QUICK SALES MATRIX TABLE VIEW: Fast, dense, highly scannable */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Quick Sales Matrix — {currentMonthName} National Gateways
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredRecords.length} gateway targets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 select-none">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-16">Hub</th>
                    <th className="py-3 px-4 font-semibold">Gateway &amp; Cycle</th>
                    <th className="py-3 px-4 font-semibold">Outbound Air &amp; Ocean Targets</th>
                    <th className="py-3 px-4 font-semibold">Equipment &amp; Temperature</th>
                    <th className="py-3 px-4 font-semibold">Target Clusters</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((record) => {
                    const temp = extractTempBadge(record.equipment) || extractTempBadge(record.seaExport);
                    const isBookingActive = record.bookingStatus === 'active';

                    return (
                      <tr
                        key={record.id}
                        onClick={() => setDrawerRecord(record)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs tracking-wider">
                            {record.hubId}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-700">
                            {record.hubName}
                          </div>
                          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                            {record.season}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {isBookingActive ? (
                              <span className="text-emerald-700 font-semibold">Lock Booking Now</span>
                            ) : (
                              <span>Window: {record.bookingWindow}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-slate-800">
                              <Plane className="w-3 h-3 text-sky-600 shrink-0" />
                              <span className="truncate">{record.airExport || 'General air cargo'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-800">
                              <Ship className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">{record.seaExport || 'Dry containerized'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] text-slate-700">
                            {record.equipment.split(';')[0]}
                          </div>
                          {temp && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                              <Thermometer className="w-2.5 h-2.5 text-emerald-600" />
                              {temp}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {record.clusters}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDrawerRecord(record)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
                              title="View Playbook & Pitch Script"
                            >
                              Playbook
                            </button>
                            {onFindInDatamyne && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetTerm = getPrimaryCommodity(record) || (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                                  onFindInDatamyne(targetTerm);
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                                title="Find in DataMyne"
                              >
                                <Ship className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                            {onFindInApollo && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetTerm = getPrimaryCommodity(record) || (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                                  onFindInApollo(targetTerm);
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                                title="Find in Apollo"
                              >
                                <Users className="w-3.5 h-3.5 text-purple-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* PLAYBOOK CARDS VIEW: High-density visual micro-dashboards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecords.map((record) => {
              const isBookingActive = record.bookingStatus === 'active';
              const isBookingUpcoming = record.bookingStatus === 'upcoming';
              const airChips = parseCommodityChips(record.airExport);
              const seaChips = parseCommodityChips(record.seaExport);
              const tempBadge = extractTempBadge(record.equipment) || extractTempBadge(record.seaExport);

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs p-4 flex flex-col justify-between space-y-3"
                >
                  {/* Card Header Row */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs tracking-wider">
                        {record.hubId}
                      </span>
                      {isSearchActive && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono font-bold text-[11px] whitespace-nowrap">
                          M{String(record.month).padStart(2, '0')} · {record.monthName}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {record.hubName}
                          </h3>
                          <span className="text-xs text-slate-400">
                            • {record.monthName}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 mt-0.5 truncate max-w-xs">
                          {record.season}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isBookingActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Lock Booking Now
                        </span>
                      )}
                      {isBookingUpcoming && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {record.bookingWindow.split(' ')[0]}
                        </span>
                      )}
                      {tempBadge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Thermometer className="w-3 h-3 text-emerald-600" />
                          {tempBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Modal Quadrant Flow Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Air Export */}
                    <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 space-y-1.5">
                      <div className="flex items-center justify-between text-sky-950 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Plane className="w-3 h-3 text-sky-600" />
                          Air Export Lots
                        </span>
                        <span className="text-[10px] text-sky-700 font-mono">Air Perishables</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {airChips.slice(0, 2).map((chip, i) => (
                          <span
                            key={i}
                            onClick={() => setSearchQuery(chip.split(' ')[0])}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-sky-200 text-sky-800 font-medium cursor-pointer hover:bg-sky-100/60 transition-colors"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                      <p className="text-slate-600 text-[10px] line-clamp-1">
                        {record.airExport || 'Air consolidation shipments.'}
                      </p>
                    </div>

                    {/* Sea Export */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                      <div className="flex items-center justify-between text-emerald-950 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Ship className="w-3 h-3 text-emerald-600" />
                          Sea Export Reefers/FCL
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">Ocean Freight</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {seaChips.slice(0, 2).map((chip, i) => (
                          <span
                            key={i}
                            onClick={() => setSearchQuery(chip.split(' ')[0])}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-emerald-200 text-emerald-800 font-medium cursor-pointer hover:bg-emerald-100/60 transition-colors"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                      <p className="text-slate-600 text-[10px] line-clamp-1">
                        {record.seaExport || 'Dry containerized ocean freight.'}
                      </p>
                    </div>

                    {/* Air Import */}
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-1 text-slate-800 font-bold text-[10px]">
                        <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                        Air Inbound Inputs
                      </div>
                      <p className="text-slate-600 text-[10px] line-clamp-1">
                        {record.airImport || 'High-value inputs & spares.'}
                      </p>
                    </div>

                    {/* Sea Import */}
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center gap-1 text-slate-800 font-bold text-[10px]">
                        <Boxes className="w-3 h-3 text-indigo-600" />
                        Sea Raw Materials
                      </div>
                      <p className="text-slate-600 text-[10px] line-clamp-1">
                        {record.seaImport || 'Raw materials & capital goods.'}
                      </p>
                    </div>
                  </div>

                  {/* Corridor Route & Equipment Strip */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="truncate max-w-[220px]">
                      <span className="font-semibold text-slate-800">Lanes:</span> {record.tradeLanes}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {record.equipment.split(';')[0]}
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDrawerRecord(record)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Playbook &amp; Pitch Script</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {onFindInDatamyne && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetTerm = getPrimaryCommodity(record) || (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                            onFindInDatamyne(targetTerm);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          title="Find in DataMyne"
                        >
                          <Ship className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Find in DataMyne</span>
                        </button>
                      )}

                      {onFindInApollo && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetTerm = getPrimaryCommodity(record) || (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                            onFindInApollo(targetTerm);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          title="Find in Apollo"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          <span className="hidden sm:inline">Find in Apollo</span>
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
