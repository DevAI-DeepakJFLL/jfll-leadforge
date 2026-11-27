import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Flame,
  Search,
  X,
  Building2,
  UserCheck,
  RotateCcw,
  TrendingUp,
  FileText,
  Ship,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Mail,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  HotLead,
  HotLeadSegment,
  HotLeadCategory,
  HotLeadContactFilter,
} from '@/types/hotLeads';
import { HOT_LEADS_DATA } from '@/data/hotLeadsData';
import {
  fetchHotLeads,
  formatInrCurrency,
  computeHotLeadsMetrics,
  hasHotLeadContact,
  getHotLeadCategory,
} from '@/services/hotLeadsService';
import { HotLeadDetailDrawer } from './HotLeadDetailDrawer';
import { IndiaFlagIcon, formatPhoneNumber } from '../jfll/JfllCustomerTable';

export interface HotLeadsViewProps {
  initialSearchQuery?: string;
  initialSegment?: HotLeadSegment;
  onFilterChange?: (segment: HotLeadSegment, query: string) => void;
  onFindInDatamyne?: (query: string) => void;
  onFindInApollo?: (query: string) => void;
  onNavigateToReport?: (companyName: string) => void;
}

export const HotLeadsView: React.FC<HotLeadsViewProps> = ({
  initialSearchQuery = '',
  initialSegment = 'all',
  onFilterChange,
  onFindInDatamyne,
  onFindInApollo,
  onNavigateToReport,
}) => {
  // Parse initial segment into category and contact filter
  const initialCat: HotLeadCategory = useMemo(() => {
    if (initialSegment === 'active' || initialSegment === 'active-with-contacts' || initialSegment === 'active-without-contacts') return 'active';
    if (initialSegment === 'inactive' || initialSegment === 'reactivations' || initialSegment === 'inactive-with-contacts' || initialSegment === 'inactive-without-contacts') return 'inactive';
    if (initialSegment === 'fresh' || initialSegment === 'prospects' || initialSegment === 'fresh-with-contacts' || initialSegment === 'fresh-without-contacts') return 'fresh';
    return 'all';
  }, [initialSegment]);

  const initialContact: HotLeadContactFilter = useMemo(() => {
    if (initialSegment.includes('with-contacts') || initialSegment === 'with-decision-makers') return 'with-contacts';
    if (initialSegment.includes('without-contacts')) return 'without-contacts';
    return 'all';
  }, [initialSegment]);

  const [category, setCategory] = useState<HotLeadCategory>(initialCat);
  const [contactFilter, setContactFilter] = useState<HotLeadContactFilter>(initialContact);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [sortBy, setSortBy] = useState<'turnover' | 'name' | 'status'>('turnover');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [records, setRecords] = useState<HotLead[]>(() => HOT_LEADS_DATA);
  const [metrics, setMetrics] = useState(() => computeHotLeadsMetrics(HOT_LEADS_DATA));
  const [, setCopiedKey] = useState<string | null>(null);
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('jfll_hotleads_overview_collapsed') === 'true';
      }
    } catch {
      // Ignored
    }
    return false;
  });

  const handleToggleOverviewCollapse = (collapsed: boolean) => {
    setIsOverviewCollapsed(collapsed);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('jfll_hotleads_overview_collapsed', String(collapsed));
      }
    } catch {
      // Ignored
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute composite segment string
  const currentSegment: HotLeadSegment = useMemo(() => {
    if (category === 'all') {
      if (contactFilter === 'with-contacts') return 'with-contacts';
      if (contactFilter === 'without-contacts') return 'without-contacts';
      return 'all';
    }
    if (contactFilter === 'with-contacts') return `${category}-with-contacts` as HotLeadSegment;
    if (contactFilter === 'without-contacts') return `${category}-without-contacts` as HotLeadSegment;
    return category;
  }, [category, contactFilter]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchHotLeads({
        q: searchQuery,
        category,
        contactFilter,
        segment: currentSegment,
        sortBy,
        sortOrder,
      });
      setRecords(res.items);
      setMetrics(res.metrics);
    } catch {
      // Handled in service fallback
    }
  }, [searchQuery, category, contactFilter, currentSegment, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
    onFilterChange?.(currentSegment, searchQuery);
  }, [loadData, currentSegment, searchQuery, onFilterChange]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleSortToggle = (field: 'turnover' | 'name' | 'status') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (lead: HotLead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  // Dynamic counts for contact sub-tabs based on current category
  const contactSubCounts = useMemo(() => {
    if (category === 'active') {
      return {
        all: metrics.activeCount,
        withContacts: metrics.activeWithContactsCount,
        withoutContacts: metrics.activeWithoutContactsCount,
      };
    }
    if (category === 'inactive') {
      return {
        all: metrics.inactiveCount,
        withContacts: metrics.inactiveWithContactsCount,
        withoutContacts: metrics.inactiveWithoutContactsCount,
      };
    }
    if (category === 'fresh') {
      return {
        all: metrics.freshCount,
        withContacts: metrics.freshWithContactsCount,
        withoutContacts: metrics.freshWithoutContactsCount,
      };
    }
    return {
      all: metrics.totalCount,
      withContacts: metrics.withContactsCount,
      withoutContacts: metrics.withoutContactsCount,
    };
  }, [category, metrics]);

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col min-h-0 overflow-hidden">
      {/* Top Banner / Header */}
      <div
        className={`bg-white border-b border-slate-200 px-4 sm:px-6 shrink-0 shadow-2xs transition-all ${
          isOverviewCollapsed ? 'py-2.5' : 'py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500/20" />
                </div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 shrink-0">
                  <span>Hot High-Turnover Leads</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    60 Enterprise Accounts
                  </span>
                </h1>

                {/* Compact inline summary shown when overview is collapsed */}
                {isOverviewCollapsed && (
                  <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-normal pl-1">
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatInrCurrency(metrics.totalTurnover)}
                    </span>
                    <span className="text-slate-400">turnover</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-emerald-700 font-medium">{metrics.activeCount} Active</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-700 font-medium">{metrics.inactiveCount} Inactive</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-blue-700 font-medium">{metrics.freshCount} Fresh</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-purple-700 font-medium">{metrics.withContactsCount} With Contacts</span>
                  </div>
                )}
              </div>

              {!isOverviewCollapsed && (
                <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
                  60 verified enterprise freight accounts with high commercial turnover (₹47.66 Cr billing). Segmented into JFLL Active, JFLL Inactive, and Fresh Data with direct decision-maker contact details.
                </p>
              )}
            </div>

            {/* Maximize Table / Show Overview Toggle Button */}
            <button
              type="button"
              onClick={() => handleToggleOverviewCollapse(!isOverviewCollapsed)}
              aria-expanded={!isOverviewCollapsed}
              aria-label={isOverviewCollapsed ? 'Show overview metrics and summary' : 'Maximize table vertical space'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
              title={isOverviewCollapsed ? 'Show overview metrics and summary' : 'Maximize table vertical space'}
            >
              {isOverviewCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Show Overview</span>
                  <span className="sm:hidden">Overview</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Maximize Table</span>
                  <span className="sm:hidden">Maximize</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      {!isOverviewCollapsed && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Metric 1: Total Turnover */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Annual Turnover
                </span>
                <span className="text-lg font-extrabold text-emerald-700 mt-1 font-mono tracking-tight">
                  {formatInrCurrency(metrics.totalTurnover)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">Across 60 enterprise accounts</span>
              </div>

              {/* Metric 2: JFLL Active */}
              <div
                onClick={() => {
                  setCategory('active');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'active'
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  JFLL Active
                </span>
                <span className="text-lg font-extrabold text-emerald-700 mt-1 tracking-tight">
                  {metrics.activeCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.activeWithContactsCount} With Contacts · {metrics.activeWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 3: JFLL Inactive */}
              <div
                onClick={() => {
                  setCategory('inactive');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'inactive'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-amber-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  JFLL Inactive
                </span>
                <span className="text-lg font-extrabold text-amber-700 mt-1 tracking-tight">
                  {metrics.inactiveCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.inactiveWithContactsCount} With Contacts · {metrics.inactiveWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 4: Fresh Data */}
              <div
                onClick={() => {
                  setCategory('fresh');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'fresh'
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Fresh Data
                </span>
                <span className="text-lg font-extrabold text-blue-700 mt-1 tracking-tight">
                  {metrics.freshCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.freshWithContactsCount} With Contacts · {metrics.freshWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 5: Contact Coverage */}
              <div
                onClick={() => {
                  setCategory('all');
                  setContactFilter('with-contacts');
                }}
                className={`p-3 rounded-xl border flex flex-col col-span-2 sm:col-span-1 transition-all cursor-pointer shadow-2xs ${
                  contactFilter === 'with-contacts' && category === 'all'
                    ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-purple-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  Contact Coverage
                </span>
                <span className="text-lg font-extrabold text-purple-700 mt-1 tracking-tight">
                  {metrics.withContactsCount} / {metrics.totalCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.withContactsCount} With Contacts · {metrics.withoutContactsCount} Without
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
        {/* Controls Bar: 2-Tier Segment Tabs (Category + With/Without Contacts) + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Tier 1 & Tier 2 Segment Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Category Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`All Accounts (${metrics.totalCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`JFLL Active (${metrics.activeCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'inactive'
                    ? 'bg-white text-amber-700 shadow-2xs border border-amber-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`JFLL Inactive (${metrics.inactiveCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('fresh')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'fresh'
                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`Fresh Data (${metrics.freshCount})`}
              </button>
            </div>

            {/* Sub-Split Pills: With Contacts / Without Contacts */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setContactFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  contactFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {`All (${contactSubCounts.all})`}
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('with-contacts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  contactFilter === 'with-contacts'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold border border-emerald-200'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{`With Contacts (${contactSubCounts.withContacts})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('without-contacts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  contactFilter === 'without-contacts'
                    ? 'bg-white text-slate-700 shadow-2xs font-semibold border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {`Without Contacts (${contactSubCounts.withoutContacts})`}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDownSearch}
              placeholder="Search company, sales rep, decision maker..."
              maxLength={100}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 sticky top-0 z-10 select-none">
                <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th scope="col" className="py-2.5 px-3 w-10 text-center font-semibold text-slate-500">#</th>
                  <th
                    scope="col"
                    className="py-2.5 px-4 min-w-[220px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 min-w-[125px] text-right font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('turnover')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Annual Turnover</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 min-w-[210px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[150px] font-semibold text-slate-600">Contact Person</th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[155px] font-semibold text-slate-600">Phone Number</th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[180px] font-semibold text-slate-600">Email</th>
                  <th scope="col" className="py-2.5 px-4 min-w-[150px] font-semibold text-center text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.length > 0 ? (
                  records.map((lead) => {
                    const cat = getHotLeadCategory(lead.crmStatus);
                    const hasContact = hasHotLeadContact(lead);
                    const initials = lead.customerName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase();
                    const phoneData = formatPhoneNumber(lead.phone);
                    const contactName =
                      lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-'
                        ? lead.apolloDecisionMaker
                        : lead.contactPerson && lead.contactPerson !== '-'
                        ? lead.contactPerson
                        : null;
                    const contactTitle =
                      lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-'
                        ? lead.decisionMakerTitle && lead.decisionMakerTitle !== '-'
                          ? lead.decisionMakerTitle
                          : 'Decision Maker'
                        : lead.contactPerson && lead.contactPerson !== '-'
                        ? 'JFLL Contact'
                        : null;
                    const leadEmail =
                      lead.decisionMakerEmail && lead.decisionMakerEmail !== '-'
                        ? lead.decisionMakerEmail
                        : lead.email && lead.email !== '-'
                        ? lead.email
                        : null;

                    return (
                      <tr
                        key={lead.srNo}
                        onClick={() => handleRowClick(lead)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-xs">
                          {lead.srNo}
                        </td>
                        <td className="min-w-[220px] py-3 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                              {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors truncate max-w-[220px] lg:max-w-[320px]">
                                {lead.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {lead.salesRep && lead.salesRep !== '-' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                    <UserCheck className="w-2.5 h-2.5 text-blue-600" />
                                    <span>Assigned: {lead.salesRep}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200/80">
                                    Unassigned
                                  </span>
                                )}
                                {lead.datamyneTradeActivity && lead.datamyneTradeActivity !== '-' && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 truncate max-w-[140px]" title={lead.datamyneTradeActivity}>
                                      {lead.datamyneTradeActivity}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap text-right font-mono tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatInrCurrency(lead.taxableTurnover)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 text-right">
                              ₹{lead.taxableTurnover.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {cat === 'active' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                JFLL Active
                              </span>
                            )}
                            {cat === 'inactive' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                JFLL Inactive
                              </span>
                            )}
                            {cat === 'fresh' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Fresh Data
                              </span>
                            )}

                            {hasContact ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                With Contacts
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap shrink-0">
                                Without Contacts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle">
                          {contactName ? (
                            <div>
                              <span className="text-xs text-slate-900 font-semibold truncate max-w-[150px] block leading-tight">
                                {contactName}
                              </span>
                              {contactTitle && (
                                <span className="text-[11px] text-slate-500 truncate max-w-[150px] block leading-tight mt-0.5" title={contactTitle}>
                                  {contactTitle}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                          {phoneData ? (
                            <div className="flex items-center gap-1.5 text-slate-800">
                              <IndiaFlagIcon className="w-4 h-3 shrink-0" />
                              <a
                                href={`tel:${phoneData.raw}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-xs text-slate-800 hover:text-blue-700 hover:underline font-medium leading-tight"
                              >
                                {phoneData.number}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(phoneData.raw, `phone-${lead.srNo}`, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Copy phone"
                                aria-label={`Copy phone number ${phoneData.number}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 align-middle">
                          {leadEmail ? (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a
                                href={`mailto:${leadEmail}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate max-w-[170px] text-xs text-slate-700 font-normal hover:text-blue-700 hover:underline leading-tight"
                                title={leadEmail}
                              >
                                {leadEmail}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(leadEmail, `email-${lead.srNo}`, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Copy email"
                                aria-label={`Copy email ${leadEmail}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="min-w-[150px] py-3 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRowClick(lead)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 rounded-md transition-all shadow-2xs group/btn cursor-pointer"
                              title={`View details for ${lead.customerName}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigateToReport?.(lead.customerName)}
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors cursor-pointer"
                              title="Generate Client Report"
                              aria-label={`Generate report for ${lead.customerName}`}
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFindInApollo?.(lead.customerName)}
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 shadow-2xs transition-colors cursor-pointer"
                              title="Search in Apollo"
                              aria-label={`Search ${lead.customerName} in Apollo`}
                            >
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            {lead.datamyneTradeActivity && lead.datamyneTradeActivity !== '-' && (
                              <button
                                type="button"
                                onClick={() => onFindInDatamyne?.(lead.customerName)}
                                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 shadow-2xs transition-colors cursor-pointer"
                                title="DataMyne Shipments"
                                aria-label={`View DataMyne shipments for ${lead.customerName}`}
                              >
                                <Ship className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          No matching accounts found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-xs text-slate-500">
                          Try searching by company name, sales rep, decision maker, or clear the search filter.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          Clear Search Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Slide-over Drawer */}
      <HotLeadDetailDrawer
        isOpen={isDrawerOpen}
        lead={selectedLead}
        onClose={() => setIsDrawerOpen(false)}
        onNavigateToReport={onNavigateToReport}
        onFindInApollo={onFindInApollo}
        onFindInDatamyne={onFindInDatamyne}
      />
    </div>
  );
};
