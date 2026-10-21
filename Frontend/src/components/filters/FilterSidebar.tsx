import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  RotateCw,
  Search,
  Building2,
  Users,
  Award,
  MapPin,
  Mail,
  Linkedin,
  List,
  SlidersHorizontal,
  ShieldCheck,
  Truck,
  Briefcase,
  Tag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { FilterAccordion } from './FilterAccordion';
import { SearchableCheckboxList } from './SearchableCheckboxList';
import { FilterParams, LeadStatus } from '@/types/lead';

export interface FilterSidebarProps {
  filters: FilterParams;
  onToggleArrayFilter: (
    key: 'jobTitles' | 'departments' | 'seniority' | 'locations' | 'industries' | 'companySize',
    item: string
  ) => void;
  onToggleBooleanFilter?: (
    key: 'logisticsOnly' | 'decisionMakersOnly' | 'hasEmailOnly' | 'hasLinkedinOnly'
  ) => void;
  onToggleStatusFilter?: (status: LeadStatus) => void;
  onClearCategory?: (key: keyof FilterParams) => void;
  savedLists?: string[];
  selectedSavedLists?: string[];
  onToggleSavedList?: (listName: string) => void;
  onClearSavedLists?: () => void;
  onSaveSearch?: () => void;
  onLoadSearch?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

// Tailored logistics job titles with high search intent
export const LOGISTICS_JOB_TITLES = [
  'Head of Supply Chain',
  'Director of Logistics',
  'Supply Chain Manager',
  'Logistics Manager',
  'Import / Export Manager',
  'Procurement Manager',
  'Transportation & Traffic Director',
  'Warehouse & Distribution Manager',
  'Freight Sourcing Specialist',
  'Global Logistics Coordinator',
  'VP Supply Chain',
  'Shipping Operations Lead',
];

// Mapped directly to DuckDB c.seniority
export const LOGISTICS_SENIORITY_LEVELS = [
  { id: 'c_suite', label: 'C-Suite / Executives', badge: '136k' },
  { id: 'vp', label: 'Vice President (VP)', badge: '260k' },
  { id: 'director', label: 'Director / Head', badge: '638k' },
  { id: 'manager', label: 'Manager / Lead', badge: '3.5m' },
  { id: 'senior', label: 'Senior Specialist', badge: '661k' },
  { id: 'owner', label: 'Owner / Partner', badge: '197k' },
];

// Mapped directly to DuckDB c.department
export const LOGISTICS_DEPARTMENTS = [
  { id: 'operations', label: 'Operations & Logistics', badge: '279k' },
  { id: 'supply_chain', label: 'Supply Chain & Procurement', badge: '350k' },
  { id: 'sales', label: 'Sales & Commercial', badge: '1.2m' },
  { id: 'finance', label: 'Finance & Accounts', badge: '255k' },
  { id: 'support', label: 'Dispatch & Customer Support', badge: '248k' },
];

// High-value cargo shipper verticals
export const FREIGHT_CARGO_VERTICALS = [
  'Automotive & Transportation',
  'Pharmaceuticals & Healthcare',
  'Perishables, Food & Beverage',
  'Chemicals & Hazardous Goods',
  'Industrial Machinery & Engineering',
  'Textiles, Apparel & Retail',
  'Electronics & High Tech',
  'Construction & Building Materials',
  'Oil, Gas & Energy',
];

// Key international freight trade corridor countries
export const FREIGHT_TRADE_COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳', count: '606k' },
  { code: 'US', name: 'United States', flag: '🇺🇸', count: '6.6m' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', count: '940k' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', count: '528k' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', count: '818k' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', count: '120k' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', count: '290k' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', count: '380k' },
  { code: 'FR', name: 'France', flag: '🇫🇷', count: '498k' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', count: '368k' },
];

// Company headcount size tiers
export const COMPANY_SIZE_TIERS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onToggleArrayFilter,
  onToggleBooleanFilter,
  onClearCategory,
  savedLists,
  selectedSavedLists: propSelectedSavedLists,
  onToggleSavedList,
  onClearSavedLists,
  onSaveSearch,
  onLoadSearch,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  // Accordion open states tailored for high-speed prospecting
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    primaryFocus: true,
    seniority: true,
    jobTitles: true,
    departments: true,
    locations: true,
    industries: true,
    outreach: true,
    companySize: false,
    savedLists: false,
  });

  const [jobTitleSearch, setJobTitleSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Local state for UI-only facet selections
  const [localSelectedSavedLists, setLocalSelectedSavedLists] = useState<string[]>([]);
  const selectedSavedLists =
    propSelectedSavedLists !== undefined ? propSelectedSavedLists : localSelectedSavedLists;
  const availableSavedLists = savedLists || [];

  const handleToggleList = (item: string) => {
    if (onToggleSavedList) {
      onToggleSavedList(item);
    } else {
      setLocalSelectedSavedLists((prev) =>
        prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
      );
    }
  };

  const handleClearSavedLists = () => {
    if (onClearSavedLists) {
      onClearSavedLists();
    } else {
      setLocalSelectedSavedLists([]);
    }
  };

  // Filtered job titles and countries based on search inputs
  const filteredTitles = LOGISTICS_JOB_TITLES.filter((title) =>
    title.toLowerCase().includes(jobTitleSearch.toLowerCase())
  );

  const filteredCountries = FREIGHT_TRADE_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Active filter count computation
  const activeCount =
    (filters.jobTitles?.length || 0) +
    (filters.departments?.length || 0) +
    (filters.seniority?.length || 0) +
    (filters.locations?.length || 0) +
    (filters.industries?.length || 0) +
    (filters.companySize?.length || 0) +
    (filters.hasEmailOnly ? 1 : 0) +
    (filters.hasLinkedinOnly ? 1 : 0) +
    (filters.decisionMakersOnly ? 1 : 0) +
    (filters.logisticsOnly === false ? 1 : 0);

  const filterContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Top Header */}
      <div className="h-12 px-3.5 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-apollo" />
          <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">
            People Filters
          </h2>
          {activeCount > 0 && (
            <span className="bg-apollo text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {activeCount > 0 && onClearCategory && (
            <button
              type="button"
              onClick={() => {
                onClearCategory('jobTitles');
                onClearCategory('departments');
                onClearCategory('seniority');
                onClearCategory('locations');
                onClearCategory('industries');
                onClearCategory('companySize');
              }}
              className="text-xs text-slate-500 hover:text-apollo flex items-center space-x-1 px-1.5 py-1 rounded transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          {onLoadSearch && (
            <button
              type="button"
              onClick={onLoadSearch}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded"
              title="Reload default presets"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Accordion List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/60">
        {/* 1. Primary Logistics Role Focus (Hero Banner) */}
        <div className="p-3 bg-blue-50/40 border-b border-blue-100/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-apollo flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-apollo" />
              <span>Freight Role Focus</span>
            </span>
          </div>

          <div className="space-y-2">
            {/* Logistics Specialist Toggle */}
            <label className="flex items-start justify-between cursor-pointer p-1.5 rounded-md hover:bg-blue-100/40 transition-colors">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={filters.logisticsOnly !== false}
                  onChange={() => onToggleBooleanFilter?.('logisticsOnly')}
                  className="w-3.5 h-3.5 mt-0.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Logistics Roles Only</div>
                  <div className="text-[10px] text-slate-500">Supply Chain, Freight, Shipping & Customs</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold text-apollo bg-blue-100/80 px-1.5 py-0.5 rounded shrink-0">
                684k
              </span>
            </label>

            {/* Decision Makers Only Toggle */}
            <label className="flex items-start justify-between cursor-pointer p-1.5 rounded-md hover:bg-blue-100/40 transition-colors">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.decisionMakersOnly)}
                  onChange={() => onToggleBooleanFilter?.('decisionMakersOnly')}
                  className="w-3.5 h-3.5 mt-0.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Decision Makers Only</div>
                  <div className="text-[10px] text-slate-500">C-Suite, VP, Director & Department Heads</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                345k
              </span>
            </label>
          </div>
        </div>

        {/* 2. Seniority Level (Replaces Mock Personas) */}
        <FilterAccordion
          icon={<ShieldCheck className="w-4 h-4 text-slate-500" />}
          label="Seniority Level"
          isOpen={openSections.seniority}
          onToggle={() => toggleSection('seniority')}
          activeCount={filters.seniority?.length || 0}
          onClear={() => onClearCategory?.('seniority')}
        >
          <div className="space-y-1 py-1">
            {LOGISTICS_SENIORITY_LEVELS.map((tier) => {
              const isChecked = filters.seniority?.includes(tier.id);
              return (
                <label
                  key={tier.id}
                  className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={Boolean(isChecked)}
                      onChange={() => onToggleArrayFilter('seniority', tier.id)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span>{tier.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{tier.badge}</span>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 3. Standardized Job Titles */}
        <FilterAccordion
          icon={<Award className="w-4 h-4 text-slate-500" />}
          label="Job Titles"
          isOpen={openSections.jobTitles}
          onToggle={() => toggleSection('jobTitles')}
          activeCount={filters.jobTitles?.length || 0}
          onClear={() => onClearCategory?.('jobTitles')}
        >
          <div className="space-y-2 py-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search freight titles..."
                value={jobTitleSearch}
                onChange={(e) => setJobTitleSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-apollo"
              />
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {filteredTitles.map((title) => {
                const isChecked = filters.jobTitles?.includes(title);
                return (
                  <label
                    key={title}
                    className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(isChecked)}
                      onChange={() => onToggleArrayFilter('jobTitles', title)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span className="truncate">{title}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 4. Department */}
        <FilterAccordion
          icon={<Briefcase className="w-4 h-4 text-slate-500" />}
          label="Department"
          isOpen={openSections.departments}
          onToggle={() => toggleSection('departments')}
          activeCount={filters.departments?.length || 0}
          onClear={() => onClearCategory?.('departments')}
        >
          <div className="space-y-1 py-1">
            {LOGISTICS_DEPARTMENTS.map((dept) => {
              const isChecked = filters.departments?.includes(dept.id);
              return (
                <label
                  key={dept.id}
                  className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={Boolean(isChecked)}
                      onChange={() => onToggleArrayFilter('departments', dept.id)}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                    />
                    <span>{dept.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{dept.badge}</span>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 5. Geographic Corridors / Country */}
        <FilterAccordion
          icon={<MapPin className="w-4 h-4 text-slate-500" />}
          label="Trade Corridor / Country"
          isOpen={openSections.locations}
          onToggle={() => toggleSection('locations')}
          activeCount={filters.locations?.length || 0}
          onClear={() => onClearCategory?.('locations')}
        >
          <div className="space-y-2 py-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-apollo"
              />
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              {filteredCountries.map((c) => {
                const isChecked = filters.locations?.includes(c.name);
                return (
                  <label
                    key={c.code}
                    className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={Boolean(isChecked)}
                        onChange={() => onToggleArrayFilter('locations', c.name)}
                        className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                      />
                      <span className="text-sm">{c.flag}</span>
                      <span>{c.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{c.count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 6. Cargo Vertical / Industry */}
        <FilterAccordion
          icon={<Building2 className="w-4 h-4 text-slate-500" />}
          label="Cargo Vertical / Industry"
          isOpen={openSections.industries}
          onToggle={() => toggleSection('industries')}
          activeCount={filters.industries?.length || 0}
          onClear={() => onClearCategory?.('industries')}
        >
          <div className="space-y-1 py-1 max-h-52 overflow-y-auto pr-1">
            {FREIGHT_CARGO_VERTICALS.map((ind) => {
              const isChecked = filters.industries?.includes(ind);
              return (
                <label
                  key={ind}
                  className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(isChecked)}
                    onChange={() => onToggleArrayFilter('industries', ind)}
                    className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                  />
                  <span className="truncate">{ind}</span>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 7. Outreach Readiness */}
        <FilterAccordion
          icon={<Mail className="w-4 h-4 text-slate-500" />}
          label="Outreach Readiness"
          isOpen={openSections.outreach}
          onToggle={() => toggleSection('outreach')}
          activeCount={(filters.hasEmailOnly ? 1 : 0) + (filters.hasLinkedinOnly ? 1 : 0)}
        >
          <div className="space-y-1.5 py-1">
            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasEmailOnly)}
                  onChange={() => onToggleBooleanFilter?.('hasEmailOnly')}
                  className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Direct Email</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                1.36m
              </span>
            </label>

            <label className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasLinkedinOnly)}
                  onChange={() => onToggleBooleanFilter?.('hasLinkedinOnly')}
                  className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                />
                <span className="flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                  <span>LinkedIn Profile Available</span>
                </span>
              </div>
            </label>
          </div>
        </FilterAccordion>

        {/* 8. Employer Size (Company Headcount) */}
        <FilterAccordion
          icon={<Users className="w-4 h-4 text-slate-500" />}
          label="Company Size"
          isOpen={openSections.companySize}
          onToggle={() => toggleSection('companySize')}
          activeCount={filters.companySize?.length || 0}
          onClear={() => onClearCategory?.('companySize')}
        >
          <div className="space-y-1 py-1">
            {COMPANY_SIZE_TIERS.map((tier) => {
              const isChecked = filters.companySize?.includes(tier);
              return (
                <label
                  key={tier}
                  className="flex items-center space-x-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(isChecked)}
                    onChange={() => onToggleArrayFilter('companySize', tier)}
                    className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300"
                  />
                  <span>{tier}</span>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 9. Saved Prospecting Lists */}
        <FilterAccordion
          icon={<List className="w-4 h-4 text-slate-500" />}
          label="Saved Lists"
          isOpen={openSections.savedLists}
          onToggle={() => toggleSection('savedLists')}
          activeCount={selectedSavedLists.length}
          onClear={handleClearSavedLists}
        >
          {availableSavedLists.length > 0 ? (
            <SearchableCheckboxList
              options={availableSavedLists}
              selectedValues={selectedSavedLists}
              onToggle={handleToggleList}
              searchPlaceholder="Search lists..."
            />
          ) : (
            <p className="text-xs text-slate-400 py-2 px-1 italic">
              No custom lists created yet. Select leads from the table to save them.
            </p>
          )}
        </FilterAccordion>
      </div>

      {/* Pinned Bottom CTA */}
      <div className="p-3 border-t border-surface-border bg-slate-50/80 shrink-0">
        <button
          type="button"
          onClick={onSaveSearch}
          className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-apollo border border-apollo/30 hover:border-apollo font-medium text-xs rounded-md shadow-2xs transition-all flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[44px]"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Save Filter View</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-64 lg:w-72 h-full bg-white border-r border-surface-border flex-col shrink-0 select-none z-10 ${className}`}
        aria-label="Lead Filters Sidebar"
      >
        {filterContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
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
                <h2 className="text-sm font-bold text-slate-900">People Filters</h2>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
};

export default FilterSidebar;
