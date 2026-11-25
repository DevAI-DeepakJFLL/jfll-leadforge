import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { HotLead, HotLeadSegment } from '@/types/hotLeads';
import { HOT_LEADS_DATA } from '@/data/hotLeadsData';
import { fetchHotLeads, formatInrCurrency, computeHotLeadsMetrics } from '@/services/hotLeadsService';
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
  const [segment, setSegment] = useState<HotLeadSegment>(initialSegment);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [sortBy, setSortBy] = useState<'turnover' | 'name' | 'status'>('turnover');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [records, setRecords] = useState<HotLead[]>(() => HOT_LEADS_DATA);
  const [metrics, setMetrics] = useState(() => computeHotLeadsMetrics(HOT_LEADS_DATA));

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchHotLeads({
        q: searchQuery,
        segment,
        sortBy,
        sortOrder,
      });
      setRecords(res.items);
      setMetrics(res.metrics);
    } catch {
      // Handled in service fallback
    }
  }, [searchQuery, segment, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
    onFilterChange?.(segment, searchQuery);
  }, [loadData, segment, searchQuery, onFilterChange]);

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 flex flex-col min-h-0">
      {/* Top Banner / Hero */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Flame className="w-5 h-5 fill-amber-400/20" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Hot Leads &amp; Tax Invoice Intelligence
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    60 Audited Accounts
                  </span>
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
                60 verified enterprise freight accounts cross-referenced from audited client tax invoices (₹47.66 Cr taxable billing). Matched across the JFLL CRM, Apollo executive intelligence, and Datamyne customs trade records.
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Verified Tax Billing
              </span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1">
                {formatInrCurrency(metrics.totalTurnover)}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">Across 60 enterprise accounts</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Net-New Prospects
              </span>
              <span className="text-xl font-extrabold text-blue-400 mt-1">
                {metrics.prospectsCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">Not registered in JFLL CRM</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Reactivation Targets
              </span>
              <span className="text-xl font-extrabold text-amber-400 mt-1">
                {metrics.reactivationsCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">Inactive dormant customers</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Active Accounts
              </span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1">
                {metrics.activeCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">With assigned sales reps</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                Decision Makers
              </span>
              <span className="text-xl font-extrabold text-purple-400 mt-1">
                {metrics.decisionMakersCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">Apollo verified contacts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col min-h-0 space-y-4">
        {/* Controls Bar: Segment Tabs + Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segment Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSegment('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                segment === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {`All Accounts (${metrics.totalCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('prospects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                segment === 'prospects'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {`Net Prospects (${metrics.prospectsCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('reactivations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                segment === 'reactivations'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {`Reactivations (${metrics.reactivationsCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                segment === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {`Active (${metrics.activeCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('with-decision-makers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                segment === 'with-decision-makers'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {`Decision Makers (${metrics.decisionMakersCount})`}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDownSearch}
              placeholder="Search company, GSTIN, rep, or DM..."
              maxLength={100}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSortToggle('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company Name &amp; GSTIN</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors text-right"
                    onClick={() => handleSortToggle('turnover')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Taxable Turnover</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSortToggle('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>CRM Status</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Apollo Decision Maker</th>
                  <th className="py-3 px-4 font-semibold">JFLL Sales Rep</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.length > 0 ? (
                  records.map((lead) => (
                    <tr
                      key={lead.srNo}
                      onClick={() => handleRowClick(lead)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {lead.srNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {lead.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {lead.gstin}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-emerald-400 text-sm">
                          {formatInrCurrency(lead.taxableTurnover)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ₹{lead.taxableTurnover.toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {lead.crmStatus === 'Active Customer' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Active Account
                          </span>
                        )}
                        {lead.crmStatus === 'Not Active Customer' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Reactivation Target
                          </span>
                        )}
                        {lead.crmStatus === 'Prospect (Not in JFLL)' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            Net-New Prospect
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-' ? (
                          <div>
                            <span className="font-medium text-slate-200 block">
                              {lead.apolloDecisionMaker}
                            </span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">
                              {lead.decisionMakerTitle}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {lead.salesRep !== '-' ? lead.salesRep : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigateToReport?.(lead.customerName)}
                            className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                            title="Generate Client Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onFindInApollo?.(lead.customerName)}
                            className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                            title="Search in Apollo"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                          {lead.datamyneTradeActivity !== '-' && (
                            <button
                              type="button"
                              onClick={() => onFindInDatamyne?.(lead.customerName)}
                              className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                              title="DataMyne Shipments"
                            >
                              <Ship className="w-3.5 h-3.5 text-cyan-400" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRowClick(lead)}
                            className="p-1.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors"
                            title="View Full Audit"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">
                          No matching accounts found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-xs text-slate-400">
                          Try searching by company name, GSTIN, sales rep, or clear the search filter.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
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
