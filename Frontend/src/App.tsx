import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RowSelectionState } from '@tanstack/react-table';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { FilterSidebar, ActiveFilterChips } from '@/components/filters';
import {
  AudienceTabs,
  TableActionBar,
  LeadsTable,
  LeadDetailDrawer,
  EmailRevealDialog,
} from '@/components/leads';
import { ToastProvider, useToast } from '@/components/ui';
import { LoginPage } from '@/components/auth/LoginPage';
import { UserSession } from '@/types/auth';
import { useLeadsFilter, serializeFiltersToUrl } from '@/hooks/useLeadsFilter';
import { LeadsResponse, Lead, FilterParams } from '@/types/lead';

interface SavedSearchPreset {
  id: string;
  name: string;
  filters: Partial<FilterParams>;
}

interface AppContentProps {
  onLogout: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ onLogout }) => {
  const [activeNav, setActiveNav] = useState('search');
  const [topTab, setTopTab] = useState('people');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJobChangesActive, setIsJobChangesActive] = useState(false);
  const { showToast } = useToast();

  // Saved searches in state/storage
  const [savedSearches, setSavedSearches] = useState<SavedSearchPreset[]>([
    {
      id: 'la-marketing',
      name: 'LA Marketing Executives',
      filters: {
        locations: ['Los Angeles, California'],
        industries: ['Marketing & Advertising'],
        jobTitles: ['Executive', 'VP', 'Director'],
      },
    },
  ]);

  // Saved custom lists
  const [savedLists, setSavedLists] = useState<string[]>([
    'West Coast VIPs',
    'High Growth Accounts',
    'Q4 Logistics Prospects',
  ]);

  // Default row selection for the first 6 leads matching Ref.jpg
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({
    'lead-1': true,
    'lead-2': true,
    'lead-3': true,
    'lead-4': true,
    'lead-5': true,
    'lead-6': true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [selectedDrawerLead, setSelectedDrawerLead] = useState<Lead | null>(null);
  const [selectedEmailLead, setSelectedEmailLead] = useState<Lead | null>(null);

  const queryClient = useQueryClient();

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
  } = useLeadsFilter();

  // Fetch leads synchronized with current URL filters via TanStack Query
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

  // Batch save mutation
  const batchSaveMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const res = await fetch('/api/leads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, saved: true }),
      });
      if (!res.ok) throw new Error('Failed to save selected leads');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`Saved ${data.updatedCount} leads to your pipeline`);
    },
    onError: () => {
      showToast('Failed to save selected leads', 'error');
    },
  });

  // Toggle single lead saved status
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ leadId, saved }: { leadId: string; saved: boolean }) => {
      const res = await fetch(`/api/leads/${leadId}/save`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved }),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const handleToggleSaveLead = (lead: Lead) => {
    toggleSaveMutation.mutate({ leadId: lead.id, saved: !lead.saved });
  };

  // Job Changes Trigger
  const handleToggleJobChanges = () => {
    if (isJobChangesActive) {
      setIsJobChangesActive(false);
      removeFilterItem('status', 'NET NEW');
    } else {
      setIsJobChangesActive(true);
      applyFilters({
        ...filters,
        status: ['NET NEW'],
        page: 1,
      });
    }
  };

  // Load preset search
  const handleLoadPresetSearch = () => {
    applyFilters({
      ...filters,
      locations: ['Los Angeles, California'],
      industries: ['Marketing & Advertising'],
      page: 1,
    });
  };

  // Save current search
  const handleSaveSearch = () => {
    const newPreset: SavedSearchPreset = {
      id: `search-${Date.now()}`,
      name: `Search (${new Date().toLocaleDateString()})`,
      filters: { ...filters },
    };
    setSavedSearches((prev) => [...prev, newPreset]);
    showToast('Search criteria saved to your presets');
  };

  // Selection calculations
  const items = useMemo(() => data?.items || [], [data?.items]);
  const selectedLeadIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  );
  const selectedCount = selectedLeadIds.length;
  const isAllOnPageSelected =
    items.length > 0 && items.every((lead) => rowSelection[lead.id]);
  const isSomeOnPageSelected =
    items.some((lead) => rowSelection[lead.id]) && !isAllOnPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllOnPageSelected) {
      setRowSelection({});
    } else {
      const next: RowSelectionState = {};
      items.forEach((lead) => {
        next[lead.id] = true;
      });
      setRowSelection(next);
    }
  };

  const handleSelectAllPage = () => {
    const next: RowSelectionState = {};
    items.forEach((lead) => {
      next[lead.id] = true;
    });
    setRowSelection(next);
  };

  const handleSelectAllTotal = () => {
    const next: RowSelectionState = {};
    items.forEach((l) => {
      next[l.id] = true;
    });
    setRowSelection(next);
  };

  const handleDeselectAll = () => {
    setRowSelection({});
  };

  const handleBatchSave = () => {
    if (selectedLeadIds.length === 0) return;
    batchSaveMutation.mutate(selectedLeadIds);
  };

  const handleAddToList = (listName: string) => {
    if (!savedLists.includes(listName)) {
      setSavedLists((prev) => [...prev, listName]);
    }
    showToast(`Added ${selectedLeadIds.length} leads to "${listName}"`);
  };

  // Functional CSV Export download handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/leads/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined,
          filters: selectedLeadIds.length === 0 ? filters : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'apollo_leads_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const exportedCount =
        selectedLeadIds.length > 0 ? selectedLeadIds.length : data?.totalEstimate || items.length;
      showToast(`Exported ${exportedCount} leads to apollo_leads_export.csv`);
    } catch (err: unknown) {
      showToast(
        (err as Error)?.message || 'Export failed. Please check network connection.',
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Open Email Reveal Modal
  const handleViewEmail = (lead: Lead) => {
    setSelectedEmailLead(lead);
  };

  // Open Lead Detail Slide-Over Drawer
  const handleLeadClick = (lead: Lead) => {
    setSelectedDrawerLead(lead);
  };

  // Sync drawer lead with latest query data if present
  const activeDrawerLead = useMemo(() => {
    if (!selectedDrawerLead) return null;
    return items.find((l) => l.id === selectedDrawerLead.id) || selectedDrawerLead;
  }, [items, selectedDrawerLead]);

  return (
    <AppLayout
      activeNav={activeNav}
      onNavChange={(navId) => {
        setActiveNav(navId);
        if (navId === 'home') {
          clearAllFilters();
        } else if (navId === 'saved-searches') {
          handleLoadPresetSearch();
        }
      }}
      activeTab={topTab}
      onTabChange={(tabId) => {
        setTopTab(tabId);
        if (tabId === 'saved-searches') {
          handleLoadPresetSearch();
        } else if (tabId === 'saved-lists') {
          setTab('saved');
        }
      }}
      searchQuery={filters.q || ''}
      onSearchChange={(q) => setSearch(q)}
      onSearchSubmit={(q) => setSearch(q)}
      jobChangesCount={237}
      onJobChangesClick={handleToggleJobChanges}
      isJobChangesActive={isJobChangesActive}
      savedSearchesCount={savedSearches.length}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onLogout={onLogout}
    >
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
          {/* Subheader: Audience Tabs matching Ref.jpg */}
          <AudienceTabs
            activeTab={filters.tab}
            onTabChange={setTab}
            counts={data?.audienceCounts}
            rightContent={
              <span>
                Total Prospects:{' '}
                <strong className="text-slate-800">{data?.totalFormatted || '2.5m'}</strong>
              </span>
            }
          />

          {/* Table Bulk Action Bar */}
          <TableActionBar
            selectedCount={selectedCount}
            totalOnPage={items.length}
            totalCount={data?.totalEstimate}
            isAllOnPageSelected={isAllOnPageSelected}
            isIndeterminate={isSomeOnPageSelected}
            onToggleSelectAllPage={handleToggleSelectAllPage}
            onSelectAllPage={handleSelectAllPage}
            onSelectAllTotal={handleSelectAllTotal}
            onDeselectAll={handleDeselectAll}
            onSave={handleBatchSave}
            onAddToList={handleAddToList}
            onExport={handleExportCsv}
            isExporting={isExporting}
            savedLists={savedLists}
          />

          {/* Active Filter Chips Bar */}
          <ActiveFilterChips
            filters={filters}
            onRemoveFilter={removeFilterItem}
            onClearAll={clearAllFilters}
          />

          {/* Central Leads Table Viewport */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            <LeadsTable
              leads={items}
              isLoading={isLoading}
              isError={isError}
              error={error as Error}
              onRetry={() => refetch()}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onLeadClick={handleLeadClick}
              onViewEmail={handleViewEmail}
              currentPage={data?.page || 1}
              totalPages={data?.totalPages || 1}
              pageSize={data?.limit || 25}
              totalItems={data?.totalEstimate || 0}
              totalFormatted={data?.totalFormatted}
              onPageChange={setPage}
              onClearFilters={clearAllFilters}
            />
          </div>
        </div>
      </div>

      {/* Slide-over Lead Detail Drawer */}
      <LeadDetailDrawer
        isOpen={!!selectedDrawerLead}
        lead={activeDrawerLead}
        onClose={() => setSelectedDrawerLead(null)}
        onSaveToggle={handleToggleSaveLead}
        onCopy={(_text, _type) => {}}
        onAddToSequence={(_l) => {}}
        onAddToList={(_l) => {}}
        onComposeEmail={(_l) => {}}
      />

      {/* Quick Email Reveal Dialog */}
      <EmailRevealDialog
        isOpen={!!selectedEmailLead}
        lead={selectedEmailLead}
        onClose={() => setSelectedEmailLead(null)}
        onCopy={(_text, _type) => {}}
        onComposeEmail={(_l) => {}}
        onAddToSequence={(_l) => {}}
        onViewProfile={(l) => {
          setSelectedEmailLead(null);
          setSelectedDrawerLead(l);
        }}
      />

      {/* Prospecting Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        pageSize={filters.limit || 25}
        onPageSizeChange={(size) => {
          applyFilters({ ...filters, limit: size, page: 1 });
        }}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = sessionStorage.getItem('apollo_leads_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('apollo_leads_session');
    } catch {
      // Ignored
    }
    setSession(null);
  };

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ToastProvider>
      <AppContent onLogout={handleLogout} />
    </ToastProvider>
  );
};

export default App;
