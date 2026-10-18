import React, { useState } from 'react';
import {
  ApolloFilterParams,
  TOP_APOLLO_CARGO_VERTICALS,
  APOLLO_EMPLOYEE_TIERS,
  APOLLO_REVENUE_RANGES,
  APOLLO_TOP_COUNTRIES,
} from '@/types/apolloLead';
import {
  Filter,
  RotateCcw,
  ChevronDown,
  Building2,
  Users,
  DollarSign,
  Globe2,
  PhoneCall,
  Search,
  X,
} from 'lucide-react';

export interface ApolloFilterSidebarProps {
  filters: ApolloFilterParams;
  onToggleIndustry: (industry: string) => void;
  onToggleCountry: (country: string) => void;
  onToggleEmployeeTier: (tierId: string) => void;
  onToggleRevenueRange: (rangeId: string) => void;
  onToggleHasWebsite: () => void;
  onToggleHasLinkedin: () => void;
  onClearCategory: (category: string) => void;
  onClearAll: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const ApolloFilterSidebar: React.FC<ApolloFilterSidebarProps> = ({
  filters,
  onToggleIndustry,
  onToggleCountry,
  onToggleEmployeeTier,
  onToggleRevenueRange,
  onToggleHasWebsite,
  onToggleHasLinkedin,
  onClearCategory: _onClearCategory,
  onClearAll,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    industries: true,
    employees: true,
    revenue: true,
    geography: false,
    channels: true,
  });

  const [industrySearch, setIndustrySearch] = useState('');
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredIndustries = TOP_APOLLO_CARGO_VERTICALS.filter((v) =>
    v.label.toLowerCase().includes(industrySearch.toLowerCase()) ||
    v.cargoMode.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const displayedIndustries = showAllIndustries
    ? filteredIndustries
    : filteredIndustries.slice(0, 8);

  const activeFilterCount =
    (filters.industries?.length || 0) +
    (filters.countries?.length || 0) +
    (filters.employeeTiers?.length || 0) +
    (filters.revenueRanges?.length || 0) +
    (filters.hasWebsite ? 1 : 0) +
    (filters.hasLinkedin ? 1 : 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Sidebar Header */}
      <div className="p-3.5 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-apollo" />
          <span className="font-semibold text-xs tracking-wider text-slate-800 uppercase">
            Shipper Filters
          </span>
          {activeFilterCount > 0 && (
            <span className="bg-apollo text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-slate-500 hover:text-apollo flex items-center space-x-1 px-1.5 py-1 rounded transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              aria-label="Close filters drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion Categories Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
        {/* 1. Cargo Verticals / Industries */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('industries')}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Cargo Verticals</span>
              {(filters.industries?.length || 0) > 0 && (
                <span className="bg-blue-50 text-apollo text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                  {filters.industries?.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openSections.industries ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.industries && (
            <div className="mt-2 px-2 space-y-1.5">
              {/* Category Search Input */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter 50 verticals..."
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-apollo focus:border-apollo"
                />
              </div>

              {/* Vertical Checkboxes */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {displayedIndustries.map((v) => {
                  const isChecked = filters.industries?.includes(v.id);
                  return (
                    <label
                      key={v.id}
                      className="flex items-start justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleIndustry(v.id)}
                          className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                        />
                        <span className="truncate">{v.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-1">
                        {v.leadCount >= 1000 ? `${(v.leadCount / 1000).toFixed(0)}k` : v.leadCount}
                      </span>
                    </label>
                  );
                })}
              </div>

              {filteredIndustries.length > 8 && (
                <button
                  onClick={() => setShowAllIndustries(!showAllIndustries)}
                  className="text-[11px] text-apollo hover:underline font-medium pt-1"
                >
                  {showAllIndustries ? 'Show less' : `+ Show ${filteredIndustries.length - 8} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Employee Headcount */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('employees')}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Company Size</span>
              {(filters.employeeTiers?.length || 0) > 0 && (
                <span className="bg-blue-50 text-apollo text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                  {filters.employeeTiers?.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openSections.employees ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.employees && (
            <div className="mt-2 px-2 space-y-1">
              {APOLLO_EMPLOYEE_TIERS.map((tier) => {
                const isChecked = filters.employeeTiers?.includes(tier.id);
                return (
                  <label
                    key={tier.id}
                    className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleEmployeeTier(tier.id)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span>{tier.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Annual Gross Revenue */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('revenue')}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>Annual Revenue</span>
              {(filters.revenueRanges?.length || 0) > 0 && (
                <span className="bg-blue-50 text-apollo text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                  {filters.revenueRanges?.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openSections.revenue ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.revenue && (
            <div className="mt-2 px-2 space-y-1">
              {APOLLO_REVENUE_RANGES.map((range) => {
                const isChecked = filters.revenueRanges?.includes(range.id);
                return (
                  <label
                    key={range.id}
                    className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleRevenueRange(range.id)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span>{range.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Geography / Country */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('geography')}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <Globe2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Headquarters Country</span>
              {(filters.countries?.length || 0) > 0 && (
                <span className="bg-blue-50 text-apollo text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                  {filters.countries?.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openSections.geography ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.geography && (
            <div className="mt-2 px-2 space-y-1">
              {APOLLO_TOP_COUNTRIES.map((country) => {
                const isChecked = filters.countries?.includes(country.name);
                return (
                  <label
                    key={country.code}
                    className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleCountry(country.name)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span className="text-sm">{country.flag}</span>
                    <span>{country.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Verified Outreach Channels */}
        <div className="py-2">
          <button
            onClick={() => toggleSection('channels')}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 py-1.5 px-2 hover:bg-slate-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
              <span>Outreach Readiness</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openSections.channels ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.channels && (
            <div className="mt-2 px-2 space-y-1">
              <label className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasWebsite)}
                  onChange={onToggleHasWebsite}
                  className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <span>Corporate Website Available</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1 rounded hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasLinkedin)}
                  onChange={onToggleHasLinkedin}
                  className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <span>Verified LinkedIn Profile</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-64 lg:w-72 shrink-0 border-r border-surface-border bg-white flex-col h-full z-10 ${className}`}
        aria-label="Apollo Shipper Filter Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-14 px-4 border-b border-surface-border flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-apollo" />
                <h2 className="text-sm font-bold text-slate-900">Apollo Filters</h2>
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
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
