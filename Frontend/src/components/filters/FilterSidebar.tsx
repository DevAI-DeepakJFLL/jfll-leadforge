import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCw,
  Plus,
  List,
  UserCheck,
  Award,
  Building2,
  MapPin,
  Building,
  Users,
  Tag,
  User,
  TrendingUp,
  Cpu,
  DollarSign,
  CreditCard,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { FilterAccordion } from './FilterAccordion';
import { SearchableCheckboxList, FilterItemOption } from './SearchableCheckboxList';
import { FilterParams, FilterOptionsResponse, LeadStatus } from '@/types/lead';

export interface FilterSidebarProps {
  filters: FilterParams;
  onToggleArrayFilter: (
    key: 'jobTitles' | 'departments' | 'locations' | 'industries' | 'companySize',
    item: string
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

// Default presets for mock facet categories
const PRESETS = {
  jobTitles: [
    'Executive Vice President',
    'President',
    'Vice President',
    'Director',
    'Manager',
    'Founder',
  ],
  departments: [
    'Marketing',
    'Sales',
    'Engineering',
    'Finance',
    'Operations',
    'Human Resources',
  ],
  locations: [
    'Los Angeles, California',
    'New York, New York',
    'San Francisco, California',
    'Chicago, Illinois',
    'London, United Kingdom',
    'Austin, Texas',
  ],
  industries: [
    'Marketing & Advertising',
    'Technology',
    'Logistics',
    'Retail',
    'Financial Services',
    'Healthcare',
  ],
  employees: [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+',
  ],
  personas: [
    'C-Level Executives',
    'VPs & Directors',
    'Sales Leaders',
    'Engineering Leaders',
  ],
  companies: [] as string[],
  buyingIntent: [
    'High Intent (Bombora 80+)',
    'Surging Intent (50-79)',
    'Active Job Openings',
  ],
  technologies: [
    'Salesforce',
    'HubSpot',
    'Google Analytics',
    'AWS',
    'Stripe',
    'Segment',
  ],
  revenues: [
    '< $1M',
    '$1M - $10M',
    '$10M - $50M',
    '$50M - $100M',
    '$100M+',
  ],
  funding: [
    'Seed',
    'Series A',
    'Series B',
    'Series C+',
    'Bootstrapped',
    'Public',
  ],
  owners: [
    'Assigned to Me',
    'Unassigned',
    'Team Pipeline',
  ],
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onToggleArrayFilter,
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
  // Query facet options from mock API
  const { data: facetOptions } = useQuery<FilterOptionsResponse>({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const res = await fetch('/api/filters/options');
      if (!res.ok) {
        throw new Error('Failed to fetch facet options');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Track accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    jobTitles: false,
    departments: false,
    locations: false,
    industries: false,
    employees: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Local state for UI-only facet selections
  const [localSelectedSavedLists, setLocalSelectedSavedLists] = useState<string[]>([]);
  const selectedSavedLists = propSelectedSavedLists !== undefined ? propSelectedSavedLists : localSelectedSavedLists;
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

  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string[]>([]);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  // Generic local toggle helper
  const makeLocalToggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => (item: string) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Build options with live counts from API
  const buildOptions = (
    defaults: string[],
    apiOptions?: { value: string; count: number }[]
  ): FilterItemOption[] => {
    const countMap = new Map<string, number>();
    apiOptions?.forEach((opt) => countMap.set(opt.value, opt.count));

    const allValues = Array.from(
      new Set([...defaults, ...(apiOptions?.map((o) => o.value) || [])])
    );

    return allValues.map((val) => ({
      value: val,
      label: val,
      count: countMap.get(val),
    }));
  };

  const jobTitleOptions = useMemo(
    () => buildOptions(PRESETS.jobTitles, facetOptions?.jobTitles),
    [facetOptions]
  );
  const departmentOptions = useMemo(
    () => buildOptions(PRESETS.departments, facetOptions?.departments),
    [facetOptions]
  );
  const locationOptions = useMemo(
    () => buildOptions(PRESETS.locations, facetOptions?.locations),
    [facetOptions]
  );
  const industryOptions = useMemo(
    () => buildOptions(PRESETS.industries, facetOptions?.industries),
    [facetOptions]
  );
  const employeeOptions = useMemo(
    () => buildOptions(PRESETS.employees, facetOptions?.companySize),
    [facetOptions]
  );

  const filterContent = (
    <>
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
        <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
        <button
          type="button"
          onClick={onLoadSearch}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1.5 transition-colors focus:outline-none min-h-[36px]"
          title="Reset or load saved search"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Load Search</span>
        </button>
      </div>

      {/* Accordion List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/60">
        {/* 1. Saved Lists */}
        <FilterAccordion
          icon={<List className="w-4 h-4" />}
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
              No custom lists created yet. Add leads to a list from the table or drawer.
            </p>
          )}
        </FilterAccordion>

        {/* 2. Personas */}
        <FilterAccordion
          icon={<UserCheck className="w-4 h-4" />}
          label="Personas"
          isOpen={openSections.personas}
          onToggle={() => toggleSection('personas')}
          activeCount={selectedPersonas.length}
          onClear={() => setSelectedPersonas([])}
        >
          <SearchableCheckboxList
            options={PRESETS.personas}
            selectedValues={selectedPersonas}
            onToggle={makeLocalToggle(setSelectedPersonas)}
            searchPlaceholder="Search personas..."
          />
        </FilterAccordion>

        {/* 3. Job Titles (Active Filter) */}
        <FilterAccordion
          icon={<Award className="w-4 h-4" />}
          label="Job Titles"
          isOpen={openSections.jobTitles}
          onToggle={() => toggleSection('jobTitles')}
          activeCount={filters.jobTitles?.length || 0}
          onClear={() => onClearCategory?.('jobTitles')}
        >
          <SearchableCheckboxList
            options={jobTitleOptions}
            selectedValues={filters.jobTitles || []}
            onToggle={(val) => onToggleArrayFilter('jobTitles', val)}
            searchPlaceholder="Search job titles..."
          />
        </FilterAccordion>

        {/* 4. Department (Active Filter) */}
        <FilterAccordion
          icon={<Building2 className="w-4 h-4" />}
          label="Department"
          isOpen={openSections.departments}
          onToggle={() => toggleSection('departments')}
          activeCount={filters.departments?.length || 0}
          onClear={() => onClearCategory?.('departments')}
        >
          <SearchableCheckboxList
            options={departmentOptions}
            selectedValues={filters.departments || []}
            onToggle={(val) => onToggleArrayFilter('departments', val)}
            searchPlaceholder="Search departments..."
          />
        </FilterAccordion>

        {/* 5. Location (Active Filter) */}
        <FilterAccordion
          icon={<MapPin className="w-4 h-4" />}
          label="Location"
          isOpen={openSections.locations}
          onToggle={() => toggleSection('locations')}
          activeCount={filters.locations?.length || 0}
          onClear={() => onClearCategory?.('locations')}
        >
          <SearchableCheckboxList
            options={locationOptions}
            selectedValues={filters.locations || []}
            onToggle={(val) => onToggleArrayFilter('locations', val)}
            searchPlaceholder="Search city, state, country..."
          />
        </FilterAccordion>

        {/* 6. Company */}
        <FilterAccordion
          icon={<Building className="w-4 h-4" />}
          label="Company"
          isOpen={openSections.company}
          onToggle={() => toggleSection('company')}
          activeCount={selectedCompanies.length}
          onClear={() => setSelectedCompanies([])}
        >
          {PRESETS.companies.length > 0 ? (
            <SearchableCheckboxList
              options={PRESETS.companies}
              selectedValues={selectedCompanies}
              onToggle={makeLocalToggle(setSelectedCompanies)}
              searchPlaceholder="Search companies..."
            />
          ) : (
            <p className="text-xs text-slate-400 py-2 px-1 italic">
              No company filters active. Use the top search bar or Apollo Companies tab to filter by company.
            </p>
          )}
        </FilterAccordion>

        {/* 7. # Employees (Active Filter) */}
        <FilterAccordion
          icon={<Users className="w-4 h-4" />}
          label="# Employees"
          isOpen={openSections.employees}
          onToggle={() => toggleSection('employees')}
          activeCount={filters.companySize?.length || 0}
          onClear={() => onClearCategory?.('companySize')}
        >
          <SearchableCheckboxList
            options={employeeOptions}
            selectedValues={filters.companySize || []}
            onToggle={(val) => onToggleArrayFilter('companySize', val)}
            searchPlaceholder="Search headcount tiers..."
            showSearch={false}
          />
        </FilterAccordion>

        {/* 8. Industry & Keywords (Active Filter) */}
        <FilterAccordion
          icon={<Tag className="w-4 h-4" />}
          label="Industry & Keywords"
          isOpen={openSections.industries}
          onToggle={() => toggleSection('industries')}
          activeCount={filters.industries?.length || 0}
          onClear={() => onClearCategory?.('industries')}
        >
          <SearchableCheckboxList
            options={industryOptions}
            selectedValues={filters.industries || []}
            onToggle={(val) => onToggleArrayFilter('industries', val)}
            searchPlaceholder="Search industries..."
          />
        </FilterAccordion>

        {/* 9. Owner */}
        <FilterAccordion
          icon={<User className="w-4 h-4" />}
          label="Owner"
          isOpen={openSections.owner}
          onToggle={() => toggleSection('owner')}
          activeCount={selectedOwners.length}
          onClear={() => setSelectedOwners([])}
        >
          <SearchableCheckboxList
            options={PRESETS.owners}
            selectedValues={selectedOwners}
            onToggle={makeLocalToggle(setSelectedOwners)}
            showSearch={false}
          />
        </FilterAccordion>

        {/* 10. Buying Intent */}
        <FilterAccordion
          icon={<TrendingUp className="w-4 h-4" />}
          label="Buying Intent"
          isOpen={openSections.intent}
          onToggle={() => toggleSection('intent')}
          activeCount={selectedIntent.length}
          onClear={() => setSelectedIntent([])}
        >
          <SearchableCheckboxList
            options={PRESETS.buyingIntent}
            selectedValues={selectedIntent}
            onToggle={makeLocalToggle(setSelectedIntent)}
            showSearch={false}
          />
        </FilterAccordion>

        {/* 11. Technologies */}
        <FilterAccordion
          icon={<Cpu className="w-4 h-4" />}
          label="Technologies"
          isOpen={openSections.technologies}
          onToggle={() => toggleSection('technologies')}
          activeCount={selectedTech.length}
          onClear={() => setSelectedTech([])}
        >
          <SearchableCheckboxList
            options={PRESETS.technologies}
            selectedValues={selectedTech}
            onToggle={makeLocalToggle(setSelectedTech)}
            searchPlaceholder="Search software & stack..."
          />
        </FilterAccordion>

        {/* 12. Revenues */}
        <FilterAccordion
          icon={<DollarSign className="w-4 h-4" />}
          label="Revenues"
          isOpen={openSections.revenue}
          onToggle={() => toggleSection('revenue')}
          activeCount={selectedRevenue.length}
          onClear={() => setSelectedRevenue([])}
        >
          <SearchableCheckboxList
            options={PRESETS.revenues}
            selectedValues={selectedRevenue}
            onToggle={makeLocalToggle(setSelectedRevenue)}
            showSearch={false}
          />
        </FilterAccordion>

        {/* 13. Funding */}
        <FilterAccordion
          icon={<CreditCard className="w-4 h-4" />}
          label="Funding"
          isOpen={openSections.funding}
          onToggle={() => toggleSection('funding')}
          activeCount={selectedFunding.length}
          onClear={() => setSelectedFunding([])}
        >
          <SearchableCheckboxList
            options={PRESETS.funding}
            selectedValues={selectedFunding}
            onToggle={makeLocalToggle(setSelectedFunding)}
            showSearch={false}
          />
        </FilterAccordion>
      </div>

      {/* Pinned Bottom CTA */}
      <div className="p-3 border-t border-surface-border bg-slate-50/80 shrink-0">
        <button
          type="button"
          onClick={onSaveSearch}
          className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-apollo border border-apollo/30 hover:border-apollo font-medium text-xs rounded-md shadow-2xs transition-all flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[44px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Search</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-64 h-full bg-white border-r border-surface-border flex-col shrink-0 select-none ${className}`}
        aria-label="Lead Filters Sidebar"
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
                <h2 className="text-sm font-bold text-slate-900">Lead Filters</h2>
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
