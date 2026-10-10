import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { FilterSidebar, ActiveFilterChips } from '@/components/filters';
import { useLeadsFilter, serializeFiltersToUrl } from '@/hooks/useLeadsFilter';
import { LeadsResponse } from '@/types/lead';
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from 'lucide-react';

function formatAudienceCount(count?: number, fallback = '0'): string {
  if (count === undefined || count === null) return fallback;
  if (count >= 1000000) {
    const val = count / 1000000;
    return val % 1 === 0 ? `${val}m` : `${val.toFixed(2).replace(/\.?0+$/, '')}m`;
  }
  if (count >= 10000) {
    const val = count / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1).replace(/\.?0+$/, '')}k`;
  }
  return count.toLocaleString();
}

export const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState('search');
  const [topTab, setTopTab] = useState('people');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const {
    filters,
    applyFilters,
    setSearch,
    setTab,
    setPage,
    toggleArrayFilter,
    toggleStatusFilter,
    removeFilterItem,
    clearFilterCategory,
    clearAllFilters,
    activeFilterCount,
  } = useLeadsFilter();

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  // Fetch leads synchronized with current filters via TanStack Query
  const { data, isLoading, isError, error, refetch } = useQuery<LeadsResponse>({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const queryString = serializeFiltersToUrl(filters);
      const res = await fetch(`/api/leads${queryString}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch leads: ${res.statusText}`);
      }
      return res.json();
    },
  });

  const handleLoadPresetSearch = () => {
    applyFilters({
      ...filters,
      locations: ['Los Angeles, California'],
      industries: ['Marketing & Advertising'],
      page: 1,
    });
    showToast('Loaded preset search: "LA Marketing & Advertising" matching Ref.jpg');
  };

  const handleSaveSearch = () => {
    showToast(`Search saved! (${activeFilterCount} active filter criteria)`);
  };

  const allCountFormatted = data?.audienceCounts?.all
    ? formatAudienceCount(data.audienceCounts.all, '2.5m')
    : '2.5m';
  const newCountFormatted = data?.audienceCounts?.new
    ? formatAudienceCount(data.audienceCounts.new, '1.48m')
    : '1.48m';
  const savedCountFormatted = data?.audienceCounts?.saved
    ? formatAudienceCount(data.audienceCounts.saved, '48.4k')
    : '48.4k';

  return (
    <AppLayout
      activeNav={activeNav}
      onNavChange={(navId) => {
        setActiveNav(navId);
        showToast(`Navigated to: ${navId}`);
      }}
      activeTab={topTab}
      onTabChange={(tabId) => {
        setTopTab(tabId);
        showToast(`Switched view to tab: ${tabId}`);
      }}
      searchQuery={filters.q || ''}
      onSearchChange={(q) => setSearch(q)}
      onSearchSubmit={(q) => {
        setSearch(q);
        showToast(`Searching leads matching: "${q}"`);
      }}
      jobChangesCount={237}
      onJobChangesClick={() => showToast('Viewing 237 New Job Changes')}
      onImportClick={() => {}}
    >
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Container: Left FilterSidebar + Right Leads Content Viewport */}
      <div className="flex-1 flex w-full h-full min-h-0 overflow-hidden bg-white">
        {/* Left Filter Sidebar matching Ref.jpg */}
        <FilterSidebar
          filters={filters}
          onToggleArrayFilter={toggleArrayFilter}
          onToggleStatusFilter={toggleStatusFilter}
          onClearCategory={clearFilterCategory}
          onSaveSearch={handleSaveSearch}
          onLoadSearch={handleLoadPresetSearch}
        />

        {/* Right Leads Prospecting Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
          {/* Subheader: Audience Tabs matching Ref.jpg (All People, New People, Saved People) */}
          <div className="h-11 px-4 bg-white border-b border-surface-border flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center space-x-2 sm:space-x-4 h-full">
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`relative h-full px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
                  filters.tab === 'all'
                    ? 'text-apollo font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>All People</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({allCountFormatted})
                </span>
                {filters.tab === 'all' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('new')}
                className={`relative h-full px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
                  filters.tab === 'new'
                    ? 'text-apollo font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>New People</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({newCountFormatted})
                </span>
                {filters.tab === 'new' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('saved')}
                className={`relative h-full px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
                  filters.tab === 'saved'
                    ? 'text-apollo font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Saved People</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({savedCountFormatted})
                </span>
                {filters.tab === 'saved' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
                )}
              </button>
            </div>

            {/* Total Results Summary */}
            <div className="text-xs text-slate-500 font-medium">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-apollo" />
                  Updating...
                </span>
              ) : (
                <span>
                  Showing <strong className="text-slate-800">{data?.items.length || 0}</strong> of{' '}
                  <strong className="text-slate-800">{data?.totalFormatted || '0'}</strong> leads
                </span>
              )}
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          <ActiveFilterChips
            filters={filters}
            onRemoveFilter={removeFilterItem}
            onClearAll={clearAllFilters}
          />

          {/* Leads Content Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-white rounded-lg border border-surface-border p-4 flex items-center justify-between animate-pulse"
                  >
                    <div className="flex items-center space-x-3 w-1/3">
                      <div className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 bg-slate-200 rounded w-2/3" />
                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-100 rounded w-20" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-8 text-center bg-white rounded-xl border border-red-200 max-w-md mx-auto my-12 shadow-sm">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-900">Failed to load leads</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  {(error as Error)?.message || 'An unexpected error occurred while querying leads.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-md shadow-sm transition-colors"
                >
                  Retry Request
                </button>
              </div>
            ) : data && data.items.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-surface-border max-w-md mx-auto my-12 shadow-sm">
                <FilterX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900">No leads match your criteria</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Try adjusting or clearing your filters in the sidebar to discover more prospects.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold text-apollo bg-apollo-50 hover:bg-apollo-100 border border-apollo-200 rounded-md transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
                {/* Leads Header Banner */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-surface-border flex items-center justify-between text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">
                    Lead Prospecting Results ({data?.totalFormatted || data?.items.length})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Task 4: Filter Sidebar & URL Synchronization Active
                  </div>
                </div>

                {/* Leads List Items matching Ref.jpg */}
                <div className="divide-y divide-surface-border">
                  {data?.items.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4 group"
                    >
                      {/* Name & Title */}
                      <div className="flex items-center space-x-3 min-w-[240px] flex-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: lead.logoBgColor || '#0066F5',
                            color: lead.logoTextColor || '#FFFFFF',
                          }}
                        >
                          {lead.logoInitials || lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 group-hover:text-apollo transition-colors truncate">
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {lead.title}
                          </div>
                        </div>
                      </div>

                      {/* Company & Industry */}
                      <div className="min-w-[180px] hidden md:block">
                        <div className="text-xs font-medium text-slate-800 truncate">
                          {lead.company}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {lead.industry}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                            lead.status === 'NET NEW'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : lead.status === 'COLD'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="text-xs text-slate-600 min-w-[150px] hidden lg:block truncate">
                        {lead.location}
                      </div>

                      {/* View Email CTA Button */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => showToast(`Revealing verified email for: ${lead.name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-apollo hover:text-white bg-white hover:bg-apollo border border-apollo/30 hover:border-apollo rounded-md shadow-2xs transition-colors"
                        >
                          <Mail className="w-3 h-3" />
                          <span>View Email</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Footer */}
                {data && data.totalPages > 1 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-surface-border flex items-center justify-between text-xs text-slate-600">
                    <div>
                      Page <strong className="text-slate-900">{data.page}</strong> of{' '}
                      <strong className="text-slate-900">{data.totalPages}</strong>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        disabled={data.page <= 1}
                        onClick={() => setPage(data.page - 1)}
                        className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        type="button"
                        disabled={data.page >= data.totalPages}
                        onClick={() => setPage(data.page + 1)}
                        className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default App;
