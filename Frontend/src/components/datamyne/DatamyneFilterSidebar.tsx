import React, { useState } from 'react';
import {
  DatamyneFilterParams,
  DatamyneDatasetType,
  TransportMode,
} from '@/types/datamyneLead';
import { FilterAccordion } from '@/components/filters/FilterAccordion';
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Plane,
  Ship,
  TrendingUp,
  Tags,
  Layers,
  UserCheck,
  X,
} from 'lucide-react';

export interface DatamyneFilterSidebarProps {
  filters: DatamyneFilterParams;
  setSearch: (q: string) => void;
  setDataset: (dataset: DatamyneDatasetType) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  toggleCategory: (category: string) => void;
  toggleSubcategory: (subcategory: string) => void;
  toggleRole: (role: string) => void;
  toggleCity: (city: string) => void;
  toggleTradeLane: (lane: string) => void;
  toggleContactStatus: (status: string) => void;
  toggleHasDirectors: () => void;
  setMinShipments: (min: number) => void;
  setMinTradedValueUsd: (min: number) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const DatamyneFilterSidebar: React.FC<DatamyneFilterSidebarProps> = ({
  filters,
  setSearch,
  setDataset,
  toggleTransportMode,
  toggleCategory,
  toggleSubcategory,
  toggleRole,
  toggleCity,
  toggleTradeLane,
  toggleContactStatus,
  toggleHasDirectors,
  setMinShipments,
  setMinTradedValueUsd,
  clearAllFilters,
  activeFilterCount,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  const [searchInput, setSearchInput] = useState(filters.q || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const transportModesList: {
    id: TransportMode;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'Air',
      label: 'Air Freight',
      icon: <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
    },
    {
      id: 'Ocean',
      label: 'Ocean Freight',
      icon: <Ship className="w-3.5 h-3.5 text-cyan-600 shrink-0" />,
    },
    {
      id: 'Air & Ocean',
      label: 'Multi-modal (Air & Ocean)',
      icon: (
        <span className="flex items-center -space-x-1 shrink-0">
          <Plane className="w-3 h-3 text-indigo-600" />
          <Ship className="w-3 h-3 text-indigo-500" />
        </span>
      ),
    },
  ];

  const categoriesList = [
    'Perishables',
    'Pharma & Healthcare',
    'Textiles & Apparel',
    'Engineering & Machinery',
    'Chemicals & Materials',
    'Electronics & Electrical',
    'Automotive & EV',
    'General Cargo',
  ];

  const subcategoriesList = [
    'Fresh Vegetables & Produce',
    'Fresh Fruits',
    'Seafood & Marine Products',
    'Floriculture & Cut Flowers',
    'Processed Foods & Edible Preparations',
    'Pharmaceutical Formulations',
    'Medical & Surgical Devices',
    'Fabrics & Technical Textiles',
    'Synthetic Filaments & Yarns',
    'Apparel & Ready-Made Garments (Woven)',
    'Industrial Machinery & Boilers',
    'Iron, Steel & Hardware',
    'Organic Chemicals & APIs',
    'Electrical Equipment & Switchgear',
    'Motor Vehicles, EV & Auto Parts',
    'Plastics & Polymers',
  ];

  const rolesList = ['Exporter', 'Importer', 'Both'];

  const corridorsList = [
    { id: 'PER/AIR', label: 'PER/AIR (Perishables Air)' },
    { id: 'GCR/Air', label: 'GCR/Air (General Cargo Air)' },
    { id: 'EX-China_INDIA', label: 'EX-China_INDIA (China Imports)' },
  ];

  const topCities = [
    'MUMBAI',
    'NEW DELHI',
    'BENGALURU',
    'CHENNAI',
    'PUNE',
    'AHMEDABAD',
    'KOLKATA',
    'HYDERABAD',
    'SURAT',
    'JAIPUR',
  ];

  const filterContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Header with Title & Clear All (Solid, Non-translucent, Non-scrolling) */}
      <div className="h-11 px-3.5 border-b border-surface-border flex items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-apollo" />
          <h2 className="text-xs font-semibold text-slate-900 tracking-wide uppercase">
            DataMyne Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-apollo text-white rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Reset all active filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Scrollable Container for Search and Accordions */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-100">
        {/* Search Input Box */}
        <div className="p-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search company, city, tax ID..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-apollo/20 focus:border-apollo transition-all"
          />
        </form>
      </div>

      {/* Accordion 1: Primary Dataset Switcher */}
      <FilterAccordion
        icon={<Layers className="w-4 h-4" />}
        label="Dataset & Contacts"
        defaultOpen={true}
        activeCount={filters.contactStatus?.length || 0}
      >
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-slate-500 block mb-1">
            Data Pool:
          </label>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setDataset('valid')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md border text-center transition-all cursor-pointer ${
                filters.dataset === 'valid'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>With Contacts</span>
            </button>
            <button
              type="button"
              onClick={() => setDataset('missing')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md border text-center transition-all cursor-pointer ${
                filters.dataset === 'missing'
                  ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Without Contacts</span>
            </button>
          </div>

          <label className="text-[11px] font-medium text-slate-500 block mb-1">
            Contact Readiness:
          </label>
          {[
            { id: 'both', label: 'Both Phone & Email' },
            { id: 'phone_only', label: 'Phone Only' },
            { id: 'email_only', label: 'Email Only' },
            { id: 'missing', label: 'No Contact on File' },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.contactStatus?.includes(item.id) || false}
                onChange={() => toggleContactStatus(item.id)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700">{item.label}</span>
            </label>
          ))}

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={filters.hasDirectors || false}
                onChange={toggleHasDirectors}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" />
                Has Registered Directors
              </span>
            </label>
          </div>
        </div>
      </FilterAccordion>

      {/* Accordion 2: Transport Mode (Air / Ocean) */}
      <FilterAccordion
        icon={<Ship className="w-4 h-4" />}
        label="Transport Mode"
        defaultOpen={true}
        activeCount={filters.transportModes?.length || 0}
      >
        <div className="space-y-1.5">
          {transportModesList.map((mode) => (
            <label
              key={mode.id}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.transportModes?.includes(mode.id) || false}
                onChange={() => toggleTransportMode(mode.id)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700 flex items-center gap-1.5">
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 3: Logistics Verticals (Category) */}
      <FilterAccordion
        icon={<Building2 className="w-4 h-4" />}
        label="Logistics Category"
        defaultOpen={true}
        activeCount={filters.categories?.length || 0}
      >
        <div className="space-y-1.5">
          {categoriesList.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.categories?.includes(cat) || false}
                onChange={() => toggleCategory(cat)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700">{cat}</span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 3: Cargo Subcategory */}
      <FilterAccordion
        icon={<Tags className="w-4 h-4" />}
        label="Cargo Subcategory"
        defaultOpen={false}
        activeCount={filters.subcategories?.length || 0}
      >
        <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
          {subcategoriesList.map((sub) => (
            <label
              key={sub}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.subcategories?.includes(sub) || false}
                onChange={() => toggleSubcategory(sub)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700 truncate" title={sub}>
                {sub}
              </span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 4: Trading Role */}
      <FilterAccordion
        icon={<CheckCircle2 className="w-4 h-4" />}
        label="Trading Role"
        defaultOpen={true}
        activeCount={filters.roles?.length || 0}
      >
        <div className="space-y-1.5">
          {rolesList.map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.roles?.includes(r) || false}
                onChange={() => toggleRole(r)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                {r === 'Both' ? 'Both (Exporter & Importer)' : `${r} Only`}
              </span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 5: Trade Corridors */}
      <FilterAccordion
        icon={<Plane className="w-4 h-4" />}
        label="Trade Corridors"
        defaultOpen={false}
        activeCount={filters.tradeLanes?.length || 0}
      >
        <div className="space-y-1.5">
          {corridorsList.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.tradeLanes?.includes(c.id) || false}
                onChange={() => toggleTradeLane(c.id)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700">{c.label}</span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 6: Location (City) */}
      <FilterAccordion
        icon={<MapPin className="w-4 h-4" />}
        label="Operational Hub / City"
        defaultOpen={false}
        activeCount={filters.cities?.length || 0}
      >
        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {topCities.map((city) => (
            <label
              key={city}
              className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.cities?.includes(city) || false}
                onChange={() => toggleCity(city)}
                className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20 cursor-pointer"
              />
              <span className="text-xs text-slate-700">{city}</span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      {/* Accordion 7: Volume & Value Tiers */}
      <FilterAccordion
        icon={<TrendingUp className="w-4 h-4" />}
        label="Volume & Traded Value"
        defaultOpen={false}
        activeCount={
          (filters.minShipments && filters.minShipments > 0 ? 1 : 0) +
          (filters.minTradedValueUsd && filters.minTradedValueUsd > 0 ? 1 : 0)
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Minimum Shipments:
            </label>
            <select
              value={filters.minShipments || 0}
              onChange={(e) => setMinShipments(Number(e.target.value))}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-apollo"
            >
              <option value="0">All Volumes</option>
              <option value="10">10+ Shipments</option>
              <option value="100">100+ Shipments</option>
              <option value="1000">1,000+ Shipments (Major Tier)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Minimum Traded Value (USD):
            </label>
            <select
              value={filters.minTradedValueUsd || 0}
              onChange={(e) => setMinTradedValueUsd(Number(e.target.value))}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-apollo"
            >
              <option value="0">All Values</option>
              <option value="100000">$100k+ Traded</option>
              <option value="1000000">$1M+ Traded (Enterprise)</option>
              <option value="10000000">$10M+ Traded (Mega Shipper)</option>
            </select>
          </div>
        </div>
      </FilterAccordion>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-72 lg:w-80 h-full border-r border-surface-border bg-white flex-col shrink-0 overflow-hidden select-none ${className}`}
        aria-label="DataMyne Filters Sidebar"
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
            <div className="h-14 px-4 border-b border-surface-border flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-apollo" />
                <h2 className="text-sm font-bold text-slate-900">DataMyne Filters</h2>
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

