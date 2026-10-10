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
  Search,
} from 'lucide-react';
import { FilterAccordion } from './FilterAccordion';
import { FilterParams, FilterOptionsResponse, LeadStatus } from '@/types/lead';

export interface FilterSidebarProps {
  filters: FilterParams;
  onToggleArrayFilter: (
    key: 'jobTitles' | 'departments' | 'locations' | 'industries' | 'companySize',
    item: string
  ) => void;
  onToggleStatusFilter?: (status: LeadStatus) => void;
  onClearCategory?: (key: keyof FilterParams) => void;
  onSaveSearch?: () => void;
  onLoadSearch?: () => void;
  className?: string;
}

// Fallback presets and categories matching Ref.jpg synthetic mock
const DEFAULT_PRESET_JOB_TITLES = [
  'Executive Vice President',
  'President',
  'Vice President',
  'Director',
  'Manager',
  'Founder',
];

const DEFAULT_PRESET_DEPARTMENTS = [
  'Marketing',
  'Sales',
  'Engineering',
  'Finance',
  'Operations',
  'Human Resources',
];

const DEFAULT_PRESET_LOCATIONS = [
  'Los Angeles, California',
  'New York, New York',
  'San Francisco, California',
  'Chicago, Illinois',
  'London, United Kingdom',
  'Austin, Texas',
];

const DEFAULT_PRESET_INDUSTRIES = [
  'Marketing & Advertising',
  'Technology',
  'Logistics',
  'Retail',
  'Financial Services',
  'Healthcare',
];

const DEFAULT_PRESET_EMPLOYEES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

const DEFAULT_PRESET_SAVED_LISTS = [
  'Target Enterprise Accounts',
  'Q4 Outbound Leads',
  'SaaS Decision Makers',
  'High Priority Follow-ups',
];

const DEFAULT_PRESET_PERSONAS = [
  'C-Level Executives',
  'VPs & Directors',
  'Sales Leaders',
  'Engineering Leaders',
];

const DEFAULT_PRESET_BUYING_INTENT = [
  'High Intent (Bombora 80+)',
  'Surging Intent (50-79)',
  'Active Job Openings',
];

const DEFAULT_PRESET_TECHNOLOGIES = [
  'Salesforce',
  'HubSpot',
  'Google Analytics',
  'AWS',
  'Stripe',
  'Segment',
];

const DEFAULT_PRESET_REVENUES = [
  '< $1M',
  '$1M - $10M',
  '$10M - $50M',
  '$50M - $100M',
  '$100M+',
];

const DEFAULT_PRESET_FUNDING = [
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Bootstrapped',
  'Public',
];

const DEFAULT_PRESET_OWNERS = [
  'Assigned to Me',
  'Unassigned',
  'Team Pipeline',
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onToggleArrayFilter,
  onToggleStatusFilter,
  onClearCategory,
  onSaveSearch,
  onLoadSearch,
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

  // Local search inputs for long facet lists
  const [jobTitleSearch, setJobTitleSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');
  const [techSearch, setTechSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Selected state for other mock facets
  const [selectedSavedLists, setSelectedSavedLists] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string[]>([]);
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [selectedRevenue, setSelectedRevenue] = useState<string[]>([]);
  const [selectedFunding, setSelectedFunding] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  // Count maps from facet options
  const countMaps = useMemo(() => {
    const jobMap = new Map<string, number>();
    const deptMap = new Map<string, number>();
    const locMap = new Map<string, number>();
    const indMap = new Map<string, number>();
    const empMap = new Map<string, number>();

    facetOptions?.jobTitles.forEach((opt) => jobMap.set(opt.value, opt.count));
    facetOptions?.departments.forEach((opt) => deptMap.set(opt.value, opt.count));
    facetOptions?.locations.forEach((opt) => locMap.set(opt.value, opt.count));
    facetOptions?.industries.forEach((opt) => indMap.set(opt.value, opt.count));
    facetOptions?.companySize.forEach((opt) => empMap.set(opt.value, opt.count));

    return { jobMap, deptMap, locMap, indMap, empMap };
  }, [facetOptions]);

  // Filtered lists
  const filteredJobTitles = useMemo(() => {
    const baseList = facetOptions?.jobTitles?.map((o) => o.value) || DEFAULT_PRESET_JOB_TITLES;
    const unique = Array.from(new Set([...DEFAULT_PRESET_JOB_TITLES, ...baseList]));
    if (!jobTitleSearch.trim()) return unique.slice(0, 8);
    return unique
      .filter((t) => t.toLowerCase().includes(jobTitleSearch.toLowerCase()))
      .slice(0, 15);
  }, [facetOptions, jobTitleSearch]);

  const filteredLocations = useMemo(() => {
    const baseList = facetOptions?.locations?.map((o) => o.value) || DEFAULT_PRESET_LOCATIONS;
    const unique = Array.from(new Set([...DEFAULT_PRESET_LOCATIONS, ...baseList]));
    if (!locationSearch.trim()) return unique.slice(0, 8);
    return unique
      .filter((l) => l.toLowerCase().includes(locationSearch.toLowerCase()))
      .slice(0, 15);
  }, [facetOptions, locationSearch]);

  const filteredIndustries = useMemo(() => {
    const baseList = facetOptions?.industries?.map((o) => o.value) || DEFAULT_PRESET_INDUSTRIES;
    const unique = Array.from(new Set([...DEFAULT_PRESET_INDUSTRIES, ...baseList]));
    if (!industrySearch.trim()) return unique.slice(0, 8);
    return unique
      .filter((i) => i.toLowerCase().includes(industrySearch.toLowerCase()))
      .slice(0, 15);
  }, [facetOptions, industrySearch]);

  const filteredTechnologies = useMemo(() => {
    if (!techSearch.trim()) return DEFAULT_PRESET_TECHNOLOGIES;
    return DEFAULT_PRESET_TECHNOLOGIES.filter((t) =>
      t.toLowerCase().includes(techSearch.toLowerCase())
    );
  }, [techSearch]);

  const presetCompanies = ['896 Medi', 'SunMedia', 'The Scratch Collective', 'Mood Media'];
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return presetCompanies;
    return presetCompanies.filter((c) =>
      c.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companySearch]);

  return (
    <aside
      className={`w-64 shrink-0 bg-white border-r border-surface-border flex flex-col h-full select-none ${className}`}
      aria-label="Filter Panel"
    >
      {/* Sidebar Header: "Filters" + "↻ Load Search" matching Ref.jpg */}
      <div className="h-11 px-3.5 border-b border-surface-border flex items-center justify-between shrink-0 bg-white">
        <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
          Filters
        </h2>
        <button
          type="button"
          onClick={onLoadSearch}
          className="inline-flex items-center gap-1 text-xs font-medium text-apollo hover:text-apollo-700 hover:underline transition-colors focus:outline-none"
          title="Load pre-configured or saved search filters"
        >
          <RotateCw className="w-3 h-3 text-apollo" />
          <span>Load Search</span>
        </button>
      </div>

      {/* Accordions Scrollable Area: 13 categories strictly matching Ref.jpg */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border/50 text-slate-700">
        {/* 1. Saved Lists */}
        <FilterAccordion
          icon={<List className="w-3.5 h-3.5" />}
          label="Saved Lists"
          activeCount={selectedSavedLists.length}
          isOpen={openSections.savedLists}
          onToggle={() => toggleSection('savedLists')}
          onClear={() => setSelectedSavedLists([])}
        >
          <div className="space-y-1.5 pt-1">
            {DEFAULT_PRESET_SAVED_LISTS.map((listName) => {
              const isChecked = selectedSavedLists.includes(listName);
              return (
                <label
                  key={listName}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedSavedLists((prev) =>
                          isChecked ? prev.filter((x) => x !== listName) : [...prev, listName]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{listName}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 2. Personas */}
        <FilterAccordion
          icon={<UserCheck className="w-3.5 h-3.5" />}
          label="Personas"
          activeCount={selectedPersonas.length + (filters.status?.length || 0)}
          isOpen={openSections.personas}
          onToggle={() => toggleSection('personas')}
          onClear={() => {
            setSelectedPersonas([]);
            onClearCategory?.('status');
          }}
        >
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Role Presets
            </div>
            {DEFAULT_PRESET_PERSONAS.map((persona) => {
              const isChecked = selectedPersonas.includes(persona);
              return (
                <label
                  key={persona}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedPersonas((prev) =>
                          isChecked ? prev.filter((x) => x !== persona) : [...prev, persona]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{persona}</span>
                  </div>
                </label>
              );
            })}

            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2 mb-0.5 border-t border-slate-100">
              Lead Prospecting Status
            </div>
            {(['NET NEW', 'COLD', 'IN SEQUENCE'] as LeadStatus[]).map((st) => {
              const isChecked = (filters.status || []).includes(st);
              return (
                <label
                  key={st}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleStatusFilter?.(st)}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{st}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 3. Job Titles (Interactive with URL Sync) */}
        <FilterAccordion
          icon={<Award className="w-3.5 h-3.5" />}
          label="Job Titles"
          activeCount={filters.jobTitles?.length || 0}
          isOpen={openSections.jobTitles}
          onToggle={() => toggleSection('jobTitles')}
          onClear={() => onClearCategory?.('jobTitles')}
        >
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search job titles..."
                value={jobTitleSearch}
                onChange={(e) => setJobTitleSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-apollo"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredJobTitles.map((title) => {
                const isChecked = (filters.jobTitles || []).includes(title);
                const count = countMaps.jobMap.get(title);
                return (
                  <label
                    key={title}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleArrayFilter('jobTitles', title)}
                        className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                      />
                      <span className="text-slate-700 truncate">{title}</span>
                    </div>
                    {count !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 4. Department (Interactive with URL Sync) */}
        <FilterAccordion
          icon={<Building2 className="w-3.5 h-3.5" />}
          label="Department"
          activeCount={filters.departments?.length || 0}
          isOpen={openSections.departments}
          onToggle={() => toggleSection('departments')}
          onClear={() => onClearCategory?.('departments')}
        >
          <div className="space-y-1 pt-1">
            {DEFAULT_PRESET_DEPARTMENTS.map((dept) => {
              const isChecked = (filters.departments || []).includes(dept);
              const count = countMaps.deptMap.get(dept);
              return (
                <label
                  key={dept}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleArrayFilter('departments', dept)}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{dept}</span>
                  </div>
                  {count !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 5. Location (Interactive with URL Sync) */}
        <FilterAccordion
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Location"
          activeCount={filters.locations?.length || 0}
          isOpen={openSections.locations}
          onToggle={() => toggleSection('locations')}
          onClear={() => onClearCategory?.('locations')}
        >
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search location..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-apollo"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredLocations.map((loc) => {
                const isChecked = (filters.locations || []).includes(loc);
                const count = countMaps.locMap.get(loc);
                return (
                  <label
                    key={loc}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleArrayFilter('locations', loc)}
                        className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                      />
                      <span className="text-slate-700 truncate">{loc}</span>
                    </div>
                    {count !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 6. Company */}
        <FilterAccordion
          icon={<Building className="w-3.5 h-3.5" />}
          label="Company"
          activeCount={selectedCompanies.length}
          isOpen={openSections.company}
          onToggle={() => toggleSection('company')}
          onClear={() => setSelectedCompanies([])}
        >
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search company name..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-apollo"
              />
            </div>
            <div className="space-y-1">
              {filteredCompanies.map((c) => {
                const isChecked = selectedCompanies.includes(c);
                return (
                  <label
                    key={c}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCompanies((prev) =>
                            isChecked ? prev.filter((x) => x !== c) : [...prev, c]
                          );
                        }}
                        className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                      />
                      <span className="text-slate-700 truncate">{c}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 7. # Employees (Interactive with URL Sync) */}
        <FilterAccordion
          icon={<Users className="w-3.5 h-3.5" />}
          label="# Employees"
          activeCount={filters.companySize?.length || 0}
          isOpen={openSections.employees}
          onToggle={() => toggleSection('employees')}
          onClear={() => onClearCategory?.('companySize')}
        >
          <div className="space-y-1 pt-1">
            {DEFAULT_PRESET_EMPLOYEES.map((size) => {
              const isChecked = (filters.companySize || []).includes(size);
              const count = countMaps.empMap.get(size);
              return (
                <label
                  key={size}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleArrayFilter('companySize', size)}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{size}</span>
                  </div>
                  {count !== undefined && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {count}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 8. Industry & Keywords (Interactive with URL Sync) */}
        <FilterAccordion
          icon={<Tag className="w-3.5 h-3.5" />}
          label="Industry & Keywords"
          activeCount={filters.industries?.length || 0}
          isOpen={openSections.industries}
          onToggle={() => toggleSection('industries')}
          onClear={() => onClearCategory?.('industries')}
        >
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search industries..."
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-apollo"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredIndustries.map((ind) => {
                const isChecked = (filters.industries || []).includes(ind);
                const count = countMaps.indMap.get(ind);
                return (
                  <label
                    key={ind}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleArrayFilter('industries', ind)}
                        className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                      />
                      <span className="text-slate-700 truncate">{ind}</span>
                    </div>
                    {count !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 9. Owner */}
        <FilterAccordion
          icon={<User className="w-3.5 h-3.5" />}
          label="Owner"
          activeCount={selectedOwners.length}
          isOpen={openSections.owner}
          onToggle={() => toggleSection('owner')}
          onClear={() => setSelectedOwners([])}
        >
          <div className="space-y-1.5 pt-1">
            {DEFAULT_PRESET_OWNERS.map((owner) => {
              const isChecked = selectedOwners.includes(owner);
              return (
                <label
                  key={owner}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedOwners((prev) =>
                          isChecked ? prev.filter((x) => x !== owner) : [...prev, owner]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{owner}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 10. Buying Intent */}
        <FilterAccordion
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Buying Intent"
          activeCount={selectedIntent.length}
          isOpen={openSections.intent}
          onToggle={() => toggleSection('intent')}
          onClear={() => setSelectedIntent([])}
        >
          <div className="space-y-1.5 pt-1">
            {DEFAULT_PRESET_BUYING_INTENT.map((intent) => {
              const isChecked = selectedIntent.includes(intent);
              return (
                <label
                  key={intent}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedIntent((prev) =>
                          isChecked ? prev.filter((x) => x !== intent) : [...prev, intent]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{intent}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 11. Technologies */}
        <FilterAccordion
          icon={<Cpu className="w-3.5 h-3.5" />}
          label="Technologies"
          activeCount={selectedTech.length}
          isOpen={openSections.technologies}
          onToggle={() => toggleSection('technologies')}
          onClear={() => setSelectedTech([])}
        >
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search technologies..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-apollo"
              />
            </div>
            <div className="space-y-1">
              {filteredTechnologies.map((tech) => {
                const isChecked = selectedTech.includes(tech);
                return (
                  <label
                    key={tech}
                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedTech((prev) =>
                            isChecked ? prev.filter((x) => x !== tech) : [...prev, tech]
                          );
                        }}
                        className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                      />
                      <span className="text-slate-700 truncate">{tech}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </FilterAccordion>

        {/* 12. Revenues */}
        <FilterAccordion
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Revenues"
          activeCount={selectedRevenue.length}
          isOpen={openSections.revenues}
          onToggle={() => toggleSection('revenues')}
          onClear={() => setSelectedRevenue([])}
        >
          <div className="space-y-1.5 pt-1">
            {DEFAULT_PRESET_REVENUES.map((rev) => {
              const isChecked = selectedRevenue.includes(rev);
              return (
                <label
                  key={rev}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedRevenue((prev) =>
                          isChecked ? prev.filter((x) => x !== rev) : [...prev, rev]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{rev}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>

        {/* 13. Funding */}
        <FilterAccordion
          icon={<CreditCard className="w-3.5 h-3.5" />}
          label="Funding"
          activeCount={selectedFunding.length}
          isOpen={openSections.funding}
          onToggle={() => toggleSection('funding')}
          onClear={() => setSelectedFunding([])}
        >
          <div className="space-y-1.5 pt-1">
            {DEFAULT_PRESET_FUNDING.map((fund) => {
              const isChecked = selectedFunding.includes(fund);
              return (
                <label
                  key={fund}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedFunding((prev) =>
                          isChecked ? prev.filter((x) => x !== fund) : [...prev, fund]
                        );
                      }}
                      className="w-3.5 h-3.5 text-apollo rounded border-slate-300 focus:ring-apollo/20"
                    />
                    <span className="text-slate-700 truncate">{fund}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </FilterAccordion>
      </div>

      {/* Pinned Bottom "+ Save Search" Action matching Ref.jpg */}
      <div className="p-3 border-t border-surface-border bg-white shrink-0">
        <button
          type="button"
          onClick={onSaveSearch}
          className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-300 shadow-2xs flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Save Search</span>
        </button>
      </div>
    </aside>
  );
};

export default FilterSidebar;
