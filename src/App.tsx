import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RowSelectionState } from '@tanstack/react-table';
import { AppLayout } from '@/components/layout';
import { FilterSidebar, ActiveFilterChips } from '@/components/filters';
import {
  AudienceTabs,
  TableActionBar,
  LeadsTable,
  LeadDetailDrawer,
  EmailRevealDialog,
} from '@/components/leads';
import { ToastProvider, useToast } from '@/components/ui';
import { useLeadsFilter, serializeFiltersToUrl } from '@/hooks/useLeadsFilter';
import { LeadsResponse, Lead } from '@/types/lead';

const AppContent: React.FC = () => {
  const [activeNav, setActiveNav] = useState('search');
  const [topTab, setTopTab] = useState('people');
  const { showToast } = useToast();

  // Initialize initial row selection for the first 6 leads matching Ref.jpg
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
    activeFilterCount,
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
      if (!res.ok) throw new Error('Failed to save leads');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showToast(`Successfully saved ${data.updatedCount} leads to your pipeline`);
    },
    onError: () => {
      showToast('Failed to save selected leads', 'error');
    },
  });

  // Single lead toggle save handler for drawer & dialog
  const handleToggleSaveLead = async (lead: Lead) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}/save`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to toggle saved status');
      const updatedLead: Lead = await res.json();

      // Invalidate queries so table updates
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // Update local drawer state if current lead is active
      if (selectedDrawerLead?.id === updatedLead.id) {
        setSelectedDrawerLead(updatedLead);
      }
      if (selectedEmailLead?.id === updatedLead.id) {
        setSelectedEmailLead(updatedLead);
      }

      showToast(
        updatedLead.saved
          ? `Saved ${updatedLead.name} to your pipeline`
          : `Removed ${updatedLead.name} from your pipeline`
      );
    } catch {
      showToast(`Failed to update ${lead.name}`, 'error');
    }
  };

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
    showToast(`Search saved! (${activeFilterCount} active criteria)`);
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
      // Unselect all items on current page
      setRowSelection((prev) => {
        const next = { ...prev };
        items.forEach((l) => delete next[l.id]);
        return next;
      });
    } else {
      // Select all items on current page
      setRowSelection((prev) => {
        const next = { ...prev };
        items.forEach((l) => {
          next[l.id] = true;
        });
        return next;
      });
    }
  };

  const handleSelectAllPage = () => {
    setRowSelection((prev) => {
      const next = { ...prev };
      items.forEach((l) => {
        next[l.id] = true;
      });
      return next;
    });
  };

  const handleSelectAllTotal = () => {
    // Select all available leads on this view
    const allKnownIds = items.map((l) => l.id);
    const next: RowSelectionState = {};
    allKnownIds.forEach((id) => {
      next[id] = true;
    });
    setRowSelection(next);
    showToast(`Selected all ${items.length} leads on this view`);
  };

  const handleDeselectAll = () => {
    setRowSelection({});
  };

  const handleBatchSave = () => {
    if (selectedLeadIds.length === 0) {
      showToast('Select one or more leads to save', 'info');
      return;
    }
    batchSaveMutation.mutate(selectedLeadIds);
  };

  const handleBatchEmail = () => {
    if (selectedLeadIds.length === 0) {
      showToast('Select leads to compose outreach email', 'info');
      return;
    }
    showToast(`Opening outbound email composer for ${selectedLeadIds.length} recipients`);
  };

  const handleAddToSequence = (sequenceName: string) => {
    if (selectedLeadIds.length === 0) {
      showToast('Select leads before enrolling in sequence', 'info');
      return;
    }
    if (sequenceName === '__new__') {
      showToast(`Creating new outbound sequence for ${selectedLeadIds.length} prospects`);
    } else {
      showToast(`Added ${selectedLeadIds.length} prospects to "${sequenceName}"`);
    }
  };

  const handleAddToList = (listName: string) => {
    if (selectedLeadIds.length === 0) {
      showToast('Select leads before adding to list', 'info');
      return;
    }
    if (listName === '__new__') {
      showToast(`Creating new list with ${selectedLeadIds.length} leads`);
    } else {
      showToast(`Added ${selectedLeadIds.length} leads to "${listName}"`);
    }
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
          format: 'csv',
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`);
      }

      const csvBlob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(csvBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'apollo_leads_export.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      const exportedCount =
        selectedLeadIds.length > 0 ? selectedLeadIds.length : (data?.items.length || 0);
      showToast(`Exported ${exportedCount} leads to apollo_leads_export.csv`);
    } catch (err) {
      showToast(
        (err as Error)?.message || 'Export failed. Please check network connection.',
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditAction = (action: string) => {
    if (selectedLeadIds.length === 0) {
      showToast('Select leads to apply bulk edits', 'info');
      return;
    }
    showToast(`Bulk edit "${action}" applied to ${selectedLeadIds.length} selected leads`);
  };

  const handleSalesforceAction = (action: string) => {
    if (selectedLeadIds.length === 0) {
      showToast('Select leads to sync with Salesforce', 'info');
      return;
    }
    showToast(`Salesforce action "${action}" initiated for ${selectedLeadIds.length} records`);
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
          {/* Subheader: Audience Tabs matching Ref.jpg (All People 2.5m, New People 1.48m, Saved People 48.4k) */}
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

          {/* Table Bulk Action Bar matching Ref.jpg */}
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
            onEmail={handleBatchEmail}
            onAddToSequence={handleAddToSequence}
            onAddToList={handleAddToList}
            onExport={handleExportCsv}
            onEdit={handleEditAction}
            onSalesforce={handleSalesforceAction}
            isExporting={isExporting}
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
        onCopy={(text, type) =>
          showToast(`Copied ${type === 'email' ? 'email' : 'phone'} to clipboard: ${text}`)
        }
        onAddToSequence={(l) => {
          showToast(`Enrolled ${l.name} in Outbound Sequence`);
        }}
        onAddToList={(l) => {
          showToast(`Added ${l.name} to Target Prospect List`);
        }}
        onComposeEmail={(l) => {
          showToast(`Opening outreach composer for ${l.name} (${l.email})`);
        }}
      />

      {/* Quick Email Reveal Dialog */}
      <EmailRevealDialog
        isOpen={!!selectedEmailLead}
        lead={selectedEmailLead}
        onClose={() => setSelectedEmailLead(null)}
        onCopy={(text, type) =>
          showToast(`Copied ${type === 'email' ? 'email' : 'phone'} to clipboard: ${text}`)
        }
        onComposeEmail={(l) => {
          showToast(`Opening outreach composer for ${l.name} (${l.email})`);
        }}
        onAddToSequence={(l) => {
          showToast(`Enrolled ${l.name} in Outbound Sequence`);
        }}
        onViewProfile={(l) => {
          setSelectedEmailLead(null);
          setSelectedDrawerLead(l);
        }}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
