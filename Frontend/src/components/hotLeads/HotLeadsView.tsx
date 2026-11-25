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
                60 verified enterprise freight accounts cross-referenced from audited client tax invoices (₹47.66 Cr taxable billing). Matched across the JFLL CRM, Apollo executive intelligence, and Datamyne customs trade records.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Net-New Prospects
              </span>
              <span className="text-lg font-extrabold text-blue-700 mt-1 tracking-tight">
                {metrics.prospectsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">Not registered in JFLL CRM</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                Reactivation Targets
              </span>
              <span className="text-lg font-extrabold text-amber-700 mt-1 tracking-tight">
                {metrics.reactivationsCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">Inactive dormant customers</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Accounts
              </span>
              <span className="text-lg font-extrabold text-slate-900 mt-1 tracking-tight">
                {metrics.activeCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">With assigned sales reps</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col col-span-2 sm:col-span-1 hover:border-slate-300 transition-colors shadow-2xs">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Decision Makers
              </span>
              <span className="text-lg font-extrabold text-purple-700 mt-1 tracking-tight">
                {metrics.decisionMakersCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">Apollo verified contacts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col min-h-0 space-y-4">
        {/* Controls Bar: Segment Tabs + Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segment Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setSegment('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                segment === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {`All Accounts (${metrics.totalCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('prospects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                segment === 'prospects'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {`Net Prospects (${metrics.prospectsCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('reactivations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                segment === 'reactivations'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {`Reactivations (${metrics.reactivationsCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                segment === 'active'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {`Active (${metrics.activeCount})`}
            </button>
            <button
              type="button"
              onClick={() => setSegment('with-decision-makers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                segment === 'with-decision-makers'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {`Decision Makers (${metrics.decisionMakersCount})`}
            </button>
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
                      <span>CRM Status</span>
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
                  records.map((lead) => (
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
                        {lead.crmStatus === 'Active Customer' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active Account
                          </span>
                        )}
                        {lead.crmStatus === 'Not Active Customer' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Reactivation Target
                          </span>
                        )}
                        {lead.crmStatus === 'Prospect (Not in JFLL)' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Net-New Prospect
                          </span>
                        )}
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
                  ))
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
