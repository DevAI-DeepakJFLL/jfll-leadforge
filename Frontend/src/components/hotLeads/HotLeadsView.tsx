import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Flame,
  Search,
  X,
  Building2,
  UserCheck,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  FileText,
  Ship,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
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

  // Top accounts by audited taxable turnover for the visual leaderboard
  const topAccounts = useMemo(() => {
    return [...HOT_LEADS_DATA]
      .sort((a, b) => b.taxableTurnover - a.taxableTurnover)
      .slice(0, 4);
  }, []);

  // Category revenue split for the visual stacked proportion bar
  const segmentTurnover = useMemo(() => {
    let fresh = 0;
    let active = 0;
    let inactive = 0;
    for (const lead of HOT_LEADS_DATA) {
      const cat = getHotLeadCategory(lead.crmStatus);
      if (cat === 'fresh') fresh += lead.taxableTurnover;
      else if (cat === 'active') active += lead.taxableTurnover;
      else if (cat === 'inactive') inactive += lead.taxableTurnover;
    }
    const total = fresh + active + inactive;
    return {
      fresh,
      active,
      inactive,
      total,
      freshPct: total ? Math.round((fresh / total) * 100) : 0,
      activePct: total ? Math.round((active / total) * 100) : 0,
      inactivePct: total ? Math.round((inactive / total) * 100) : 0,
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900 flex flex-col min-h-0">
      {/* Top Banner / Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                  <Flame className="w-5 h-5 fill-amber-500/20" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Hot Leads &amp; Tax Invoice Intelligence
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    60 Audited Accounts
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
                60 verified enterprise freight accounts cross-referenced from audited client tax invoices (₹47.66 Cr taxable billing). Segmented into JFLL Active, JFLL Inactive, and Fresh Data with direct contact coverage.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Metric 1: Total Turnover */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Verified Tax Billing
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

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col min-h-0 space-y-4">
        {/* Enterprise Revenue & Contact Coverage Visualisation Suite */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Audited Billing Distribution by Category (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Tax Billing &amp; Account Distribution by Category
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Verified revenue share across {metrics.totalCount} audited enterprise freight accounts ({formatInrCurrency(metrics.totalTurnover)})
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ₹47.66 Cr Audited
              </span>
            </div>

            {/* Visual Stacked Proportion Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-slate-100 rounded-lg h-3 flex overflow-hidden border border-slate-200">
                <div
                  style={{ width: `${segmentTurnover.freshPct}%` }}
                  className="bg-blue-600 h-full transition-all"
                  title={`Fresh Data: ${formatInrCurrency(segmentTurnover.fresh)} (${segmentTurnover.freshPct}%)`}
                />
                <div
                  style={{ width: `${segmentTurnover.activePct}%` }}
                  className="bg-emerald-600 h-full transition-all"
                  title={`JFLL Active: ${formatInrCurrency(segmentTurnover.active)} (${segmentTurnover.activePct}%)`}
                />
                <div
                  style={{ width: `${segmentTurnover.inactivePct}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`JFLL Inactive: ${formatInrCurrency(segmentTurnover.inactive)} (${segmentTurnover.inactivePct}%)`}
                />
              </div>

              {/* Legend & Stats */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div
                  onClick={() => { setCategory('fresh'); setContactFilter('all'); }}
                  className="p-2 rounded-lg bg-blue-50/50 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Fresh Data ({segmentTurnover.freshPct}%)
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {formatInrCurrency(segmentTurnover.fresh)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {metrics.freshCount} Accounts · {metrics.freshWithContactsCount} with Contacts
                  </div>
                </div>

                <div
                  onClick={() => { setCategory('active'); setContactFilter('all'); }}
                  className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-emerald-900 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    JFLL Active ({segmentTurnover.activePct}%)
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {formatInrCurrency(segmentTurnover.active)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {metrics.activeCount} Accounts · {metrics.activeWithContactsCount} with Contacts
                  </div>
                </div>

                <div
                  onClick={() => { setCategory('inactive'); setContactFilter('all'); }}
                  className="p-2 rounded-lg bg-amber-50/50 border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    JFLL Inactive ({segmentTurnover.inactivePct}%)
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {formatInrCurrency(segmentTurnover.inactive)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {metrics.inactiveCount} Accounts · {metrics.inactiveWithContactsCount} with Contacts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Top Revenue Accounts Leaderboard (1 col) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-purple-50 text-purple-600">
                  <Flame className="w-4 h-4 fill-purple-500/20 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Top Audited Accounts
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Highest taxable billing targets
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Top Billing
              </span>
            </div>

            <div className="space-y-2 flex-1 pt-1">
              {topAccounts.map((lead, idx) => {
                const maxTurnover = topAccounts[0].taxableTurnover || 1;
                const barWidth = Math.round((lead.taxableTurnover / maxTurnover) * 100);
                const hasContact = hasHotLeadContact(lead);

                return (
                  <div
                    key={`${lead.gstin || lead.srNo}-${idx}`}
                    onClick={() => handleRowClick(lead)}
                    className="p-2 rounded-lg border border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/80 transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-900 group-hover:text-blue-700 truncate max-w-[170px]">
                        {lead.customerName.replace(/\s*\(INDIA\)\s*PRIVATE\s*LIMITED/i, '').replace(/\s*PRIVATE\s*LIMITED/i, ' Pvt Ltd')}
                      </span>
                      <span className="font-mono font-extrabold text-emerald-700 shrink-0 text-xs">
                        {formatInrCurrency(lead.taxableTurnover)}
                      </span>
                    </div>

                    {/* Mini Visual Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{hasContact ? lead.apolloDecisionMaker : 'No direct contact'}</span>
                      <span className="text-blue-600 font-semibold group-hover:underline">Drawer →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Controls Bar: 2-Tier Segment Tabs (Category + With/Without Contacts) + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
              placeholder="Search company, GSTIN, rep, or DM..."
              maxLength={100}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4 font-semibold w-12 text-center text-slate-500">#</th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company Name &amp; GSTIN</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-blue-700 transition-colors text-right"
                    onClick={() => handleSortToggle('turnover')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Taxable Turnover</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status &amp; Contacts</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Apollo Decision Maker</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">JFLL Sales Rep</th>
                  <th className="py-3 px-4 font-semibold text-right text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.length > 0 ? (
                  records.map((lead) => {
                    const cat = getHotLeadCategory(lead.crmStatus);
                    const hasContact = hasHotLeadContact(lead);

                    return (
                      <tr
                        key={lead.srNo}
                        onClick={() => handleRowClick(lead)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                          {lead.srNo}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                            {lead.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {lead.gstin}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-emerald-700 text-sm font-mono">
                            {formatInrCurrency(lead.taxableTurnover)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ₹{lead.taxableTurnover.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {cat === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                JFLL Active
                              </span>
                            )}
                            {cat === 'inactive' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                JFLL Inactive
                              </span>
                            )}
                            {cat === 'fresh' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Fresh Data
                              </span>
                            )}

                            {hasContact ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                With Contacts
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Without Contacts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-' ? (
                            <div>
                              <span className="font-medium text-slate-900 block">
                                {lead.apolloDecisionMaker}
                              </span>
                              <span className="text-[11px] text-slate-500 line-clamp-1">
                                {lead.decisionMakerTitle}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {lead.salesRep !== '-' ? lead.salesRep : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateToReport?.(lead.customerName)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors"
                              title="Generate Client Report"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFindInApollo?.(lead.customerName)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 shadow-2xs transition-colors"
                              title="Search in Apollo"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            {lead.datamyneTradeActivity !== '-' && (
                              <button
                                type="button"
                                onClick={() => onFindInDatamyne?.(lead.customerName)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 shadow-2xs transition-colors"
                                title="DataMyne Shipments"
                              >
                                <Ship className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRowClick(lead)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
                              title="View Full Audit"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          No matching accounts found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-xs text-slate-500">
                          Try searching by company name, GSTIN, sales rep, or clear the search filter.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
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
