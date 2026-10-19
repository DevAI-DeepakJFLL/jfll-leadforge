import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RowSelectionState } from '@tanstack/react-table';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettingsModal } from '@/components/layout/SettingsModal';
import {
  PeopleView,
  ApolloCompaniesView,
  DatamyneView,
  JfllCustomersView,
} from '@/components/views';
import {
  LeadDetailDrawer,
  EmailRevealDialog,
} from '@/components/leads';
import { ToastProvider, useToast, ErrorBoundary } from '@/components/ui';
import { LoginPage } from '@/components/auth/LoginPage';
import { UserSession } from '@/types/auth';
import { useLeadsFilter } from '@/hooks/useLeadsFilter';
import { LeadsResponse, Lead, FilterParams } from '@/types/lead';
import { JfllCustomerDetailDrawer } from '@/components/jfll';
import { useJfllCustomersFilter } from '@/hooks/useJfllCustomersFilter';
import {
  queryJfllCustomers,
  fetchJfllCustomersFromApi,
  exportJfllCustomersCsv,
} from '@/services/jfllCustomerService';
import { JfllCustomer } from '@/types/jfllCustomer';
import { JFLL_CUSTOMERS_DATA } from '@/data/jfllCustomersData';
import { DatamyneDetailDrawer } from '@/components/datamyne';
import { useDatamyneFilter } from '@/hooks/useDatamyneFilter';
import {
  queryDatamyneLeads,
  loadFullDatamyneDataset,
  exportDatamyneLeadsCsv,
  getLoadedDatamyneDataset,
} from '@/services/datamyneService';
import { loadFullTierDataset } from '@/services/tierService';
import { DatamyneLead } from '@/types/datamyneLead';
import { ApolloDetailDrawer } from '@/components/apollo';
import { useApolloFilter } from '@/hooks/useApolloFilter';
import {
  fetchApolloLeadsFromApi,
  fetchApolloPeopleLeads,
  queryApolloPeopleLeadsLocal,
  exportApolloLeadsCsv,
} from '@/services/apolloService';
import { ApolloLead } from '@/types/apolloLead';


interface SavedSearchPreset {
  id: string;
  name: string;
  filters: Partial<FilterParams>;
}

interface AppContentProps {
  onLogout: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ onLogout }) => {
  const [activeNav, setActiveNav] = useState('companies');
  const [topTab, setTopTab] = useState('companies');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
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

  // Fetch live Apollo logistics decision-makers synchronized with URL filters
  const { data, isLoading, isError, error, refetch } = useQuery<LeadsResponse>({
    queryKey: ['leads', filters],
    queryFn: () => fetchApolloPeopleLeads(filters),
    placeholderData: (prev) => prev ?? queryApolloPeopleLeadsLocal(filters),
    staleTime: 60000,
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

  // JFLL Customers filter and state management
  const {
    filters: jfllFilters,
    setSearch: setJfllSearch,
    setTab: setJfllTab,
    setCustomerStatus: setJfllCustomerStatus,
    setPage: setJfllPage,
    toggleCustomerGroup: toggleJfllCustomerGroup,
    toggleType: toggleJfllType,
    toggleContactOption: toggleJfllContactOption,
    clearAllFilters: clearAllJfllFilters,
  } = useJfllCustomersFilter();

  const {
    data: jfllData,
    isLoading: isJfllLoading,
    isError: isJfllError,
    error: jfllError,
    refetch: refetchJfll,
  } = useQuery({
    queryKey: ['jfll-customers', jfllFilters],
    queryFn: () => fetchJfllCustomersFromApi(jfllFilters),
    placeholderData: (prev) => prev,
  });

  const jfllQuery = useMemo(() => jfllData || queryJfllCustomers(jfllFilters), [jfllData, jfllFilters]);
  const [jfllRowSelection, setJfllRowSelection] = useState<RowSelectionState>({});
  const [selectedJfllCustomer, setSelectedJfllCustomer] = useState<JfllCustomer | null>(null);
  const [isExportingJfll, setIsExportingJfll] = useState(false);

  // JFLL Selection calculations
  const jfllItems = jfllQuery.items;
  const selectedJfllIds = useMemo(
    () => Object.keys(jfllRowSelection).filter((id) => jfllRowSelection[id]),
    [jfllRowSelection]
  );
  const selectedJfllCount = selectedJfllIds.length;
  const isAllJfllOnPageSelected =
    jfllItems.length > 0 && jfllItems.every((c) => jfllRowSelection[c.id]);
  const isSomeJfllOnPageSelected =
    jfllItems.some((c) => jfllRowSelection[c.id]) && !isAllJfllOnPageSelected;

  const handleToggleSelectAllJfllPage = () => {
    if (isAllJfllOnPageSelected) {
      setJfllRowSelection({});
    } else {
      const next: RowSelectionState = {};
      jfllItems.forEach((c) => {
        next[c.id] = true;
      });
      setJfllRowSelection(next);
    }
  };

  const handleDeselectAllJfll = () => {
    setJfllRowSelection({});
  };

  const handleExportJfllCsv = () => {
    try {
      setIsExportingJfll(true);
      const selected = selectedJfllIds
        .map((id) => jfllItems.find((c) => c.id === id) || JFLL_CUSTOMERS_DATA.find((c) => c.id === id))
        .filter(Boolean) as JfllCustomer[];
      const exportList = selected.length > 0 ? selected : jfllItems;
      const blob = exportJfllCustomersCsv(exportList);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'jfll_active_customers_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${exportList.length} JFLL active customers to CSV`);
    } catch {
      showToast('Export failed. Please check network connection.', 'error');
    } finally {
      setIsExportingJfll(false);
    }
  };

  // DataMyne Leads filter and state management
  const {
    filters: datamyneFilters,
    setDataset: setDatamyneDataset,
    setTab: setDatamyneTab,
    setSearch: setDatamyneSearch,
    setPage: setDatamynePage,
    setLimit: _setDatamyneLimit,
    toggleTransportMode: toggleDatamyneTransportMode,
    toggleCategory: toggleDatamyneCategory,
    toggleSubcategory: toggleDatamyneSubcategory,
    toggleRole: toggleDatamyneRole,
    toggleCity: toggleDatamyneCity,
    toggleTradeLane: toggleDatamyneTradeLane,
    toggleContactStatus: toggleDatamyneContactStatus,
    toggleHasDirectors: toggleDatamyneHasDirectors,
    setMinShipments: setDatamyneMinShipments,
    setMinTradedValueUsd: setDatamyneMinTradedValueUsd,
    clearAllFilters: clearAllDatamyneFilters,
    activeFilterCount: datamyneActiveFilterCount,
  } = useDatamyneFilter();

  // Lazy-load full 34,690 records in background
  const { data: datamyneFullLoaded } = useQuery({
    queryKey: ['datamyne-full-dataset'],
    queryFn: () => loadFullDatamyneDataset(),
    staleTime: Infinity,
  });

  // Lazy-load full 37,273 tiered records in background for offline / static mode
  useQuery({
    queryKey: ['tier-full-dataset'],
    queryFn: () => loadFullTierDataset(),
    staleTime: Infinity,
  });

  const datamyneQuery = useMemo(() => {
    return queryDatamyneLeads(datamyneFilters);
  }, [datamyneFilters, datamyneFullLoaded]);

  const [datamyneRowSelection, setDatamyneRowSelection] = useState<RowSelectionState>({});
  const [selectedDatamyneLead, setSelectedDatamyneLead] = useState<DatamyneLead | null>(null);
  const [isExportingDatamyne, setIsExportingDatamyne] = useState(false);

  // DataMyne Selection calculations
  const datamyneItems = datamyneQuery.items;
  const selectedDatamyneIds = useMemo(
    () => Object.keys(datamyneRowSelection).filter((id) => datamyneRowSelection[id]),
    [datamyneRowSelection]
  );
  const selectedDatamyneCount = selectedDatamyneIds.length;
  const isAllDatamyneOnPageSelected =
    datamyneItems.length > 0 && datamyneItems.every((d) => datamyneRowSelection[d.id]);
  const isSomeDatamyneOnPageSelected =
    datamyneItems.some((d) => datamyneRowSelection[d.id]) && !isAllDatamyneOnPageSelected;

  const handleToggleSelectAllDatamynePage = () => {
    if (isAllDatamyneOnPageSelected) {
      setDatamyneRowSelection({});
    } else {
      const next: RowSelectionState = {};
      datamyneItems.forEach((d) => {
        next[d.id] = true;
      });
      setDatamyneRowSelection(next);
    }
  };

  const handleDeselectAllDatamyne = () => {
    setDatamyneRowSelection({});
  };

  const handleExportDatamyneCsv = () => {
    try {
      setIsExportingDatamyne(true);
      const allLeads = getLoadedDatamyneDataset();
      const selected = selectedDatamyneIds
        .map((id) => datamyneItems.find((d) => d.id === id) || allLeads.find((d) => d.id === id))
        .filter(Boolean) as DatamyneLead[];
      const exportList = selected.length > 0 ? selected : datamyneItems;
      const blob = exportDatamyneLeadsCsv(exportList);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `datamyne_${datamyneFilters.dataset || 'valid'}_leads_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${exportList.length} DataMyne leads to CSV`);
    } catch {
      showToast('Export failed. Please check network connection.', 'error');
    } finally {
      setIsExportingDatamyne(false);
    }
  };

  // Cross-Navigation: Search inside Apollo Leads for this company
  const handleSearchInApollo = (companyName: string) => {
    setSelectedDatamyneLead(null);
    setTopTab('people');
    setActiveNav('search');
    setSearch(companyName);
    showToast(`Searching Apollo Leads for "${companyName}"`);
  };

  // Cross-Navigation: Search inside People directory for decision-makers at this company
  const handleFindDecisionMakersInPeople = (companyName: string, organizationId?: string) => {
    setSelectedApolloDbLead(null);
    setTopTab('people');
    setActiveNav('search');
    applyFilters({
      ...filters,
      q: companyName,
      organizationId: organizationId || undefined,
      page: 1,
      departments: [],
      locations: [],
    });
    showToast(`Searching People Directory for decision-makers at "${companyName}"`);
  };

  const handleSwitchToPeople = () => {
    setTopTab('people');
    setActiveNav('search');
  };

  // Apollo Commercial Shippers Leads filter and state management
  const {
    filters: apolloDbFilters,
    setTab: setApolloDbTab,
    setSearch: setApolloDbSearch,
    setPage: setApolloDbPage,
    setLimit: _setApolloDbLimit,
    toggleIndustry: toggleApolloDbIndustry,
    toggleCountry: toggleApolloDbCountry,
    toggleEmployeeTier: toggleApolloDbEmployeeTier,
    toggleRevenueRange: toggleApolloDbRevenueRange,
    toggleHasWebsite: toggleApolloDbHasWebsite,
    toggleHasLinkedin: toggleApolloDbHasLinkedin,
    clearAllFilters: clearAllApolloDbFilters,
    clearCategory: clearApolloDbCategory,
    activeFilterCount: apolloDbActiveFilterCount,
  } = useApolloFilter();

  const {
    data: apolloDbData,
    isLoading: isApolloDbLoading,
    isError: isApolloDbError,
    error: apolloDbError,
    refetch: refetchApolloDb,
  } = useQuery({
    queryKey: ['apollo-db-leads', apolloDbFilters],
    queryFn: () => fetchApolloLeadsFromApi(apolloDbFilters),
    staleTime: 60000,
  });

  const [apolloDbRowSelection, setApolloDbRowSelection] = useState<RowSelectionState>({});
  const [selectedApolloDbLead, setSelectedApolloDbLead] = useState<ApolloLead | null>(null);
  const [isExportingApolloDb, setIsExportingApolloDb] = useState(false);

  // Apollo Selection calculations
  const apolloDbItems = apolloDbData?.items || [];
  const selectedApolloDbIds = useMemo(
    () => Object.keys(apolloDbRowSelection).filter((id) => apolloDbRowSelection[id]),
    [apolloDbRowSelection]
  );
  const selectedApolloDbCount = selectedApolloDbIds.length;
  const isAllApolloDbOnPageSelected =
    apolloDbItems.length > 0 && apolloDbItems.every((d) => apolloDbRowSelection[d.organization_id]);
  const isSomeApolloDbOnPageSelected =
    apolloDbItems.some((d) => apolloDbRowSelection[d.organization_id]) && !isAllApolloDbOnPageSelected;

  const handleToggleSelectAllApolloDbPage = () => {
    if (isAllApolloDbOnPageSelected) {
      setApolloDbRowSelection({});
    } else {
      const next: RowSelectionState = {};
      apolloDbItems.forEach((d) => {
        next[d.organization_id] = true;
      });
      setApolloDbRowSelection(next);
    }
  };

  const handleDeselectAllApolloDb = () => {
    setApolloDbRowSelection({});
  };

  const handleExportApolloDbCsv = () => {
    try {
      setIsExportingApolloDb(true);
      const selected = selectedApolloDbIds
        .map((id) => apolloDbItems.find((d) => d.organization_id === id))
        .filter(Boolean) as ApolloLead[];
      const exportList = selected.length > 0 ? selected : apolloDbItems;
      exportApolloLeadsCsv(exportList, 'apollo_freight_leads_export.csv');
      showToast(`Exported ${exportList.length} Apollo freight leads to CSV`);
    } catch {
      showToast('Export failed. Please check network connection.', 'error');
    } finally {
      setIsExportingApolloDb(false);
    }
  };

  const isJfllCategory = topTab === 'jfll-customers';
  const isDatamyneCategory = topTab === 'datamyne';
  const isApolloCategory = topTab === 'apollo' || topTab === 'companies';

  const apolloActiveFilterCount = useMemo(() => {
    let count = 0;
    if (filters.jobTitles?.length) count += filters.jobTitles.length;
    if (filters.departments?.length) count += filters.departments.length;
    if (filters.locations?.length) count += filters.locations.length;
    if (filters.industries?.length) count += filters.industries.length;
    if (filters.companySize?.length) count += filters.companySize.length;
    if (filters.status) count += 1;
    return count;
  }, [filters]);

  const jfllActiveFilterCount = useMemo(() => {
    let count = 0;
    if (jfllFilters.customerGroups?.length) count += jfllFilters.customerGroups.length;
    if (jfllFilters.types?.length) count += jfllFilters.types.length;
    if (jfllFilters.hasPhone) count += 1;
    if (jfllFilters.hasEmail) count += 1;
    if (jfllFilters.hasContactPerson) count += 1;
    return count;
  }, [jfllFilters]);

  const currentActiveFilterCount = isDatamyneCategory
    ? datamyneActiveFilterCount
    : isJfllCategory
    ? jfllActiveFilterCount
    : isApolloCategory
    ? apolloDbActiveFilterCount
    : apolloActiveFilterCount;


  return (
    <AppLayout
      activeNav={activeNav}
      onNavChange={(navId) => {
        setActiveNav(navId);
        setIsMobileFilterOpen(false);
        if (navId === 'datamyne') {
          setTopTab('datamyne');
        } else if (navId === 'jfll-customers') {
          setTopTab('jfll-customers');
        } else if (navId === 'home' || navId === 'companies') {
          setTopTab('companies');
        } else if (navId === 'search') {
          setTopTab('people');
        } else if (navId === 'saved-searches') {
          setTopTab('saved-searches');
          handleLoadPresetSearch();
        }
      }}
      activeTab={topTab === 'apollo' ? 'companies' : topTab}
      onTabChange={(tabId) => {
        setTopTab(tabId);
        setIsMobileFilterOpen(false);
        if (tabId === 'datamyne') {
          setActiveNav('datamyne');
        } else if (tabId === 'jfll-customers') {
          setActiveNav('jfll-customers');
        } else if (tabId === 'companies' || tabId === 'apollo') {
          setActiveNav('companies');
        } else if (tabId === 'saved-searches' || tabId === 'saved-lists') {
          setActiveNav('saved-searches');
          if (tabId === 'saved-searches') {
            handleLoadPresetSearch();
          } else {
            setTab('saved');
          }
        } else {
          setActiveNav('search');
        }
      }}
      searchQuery={
        isDatamyneCategory
          ? datamyneFilters.q || ''
          : isJfllCategory
          ? jfllFilters.q || ''
          : isApolloCategory
          ? apolloDbFilters.q || ''
          : filters.q || ''
      }
      onSearchChange={(q) => {
        if (isDatamyneCategory) {
          setDatamyneSearch(q);
        } else if (isJfllCategory) {
          setJfllSearch(q);
        } else if (isApolloCategory) {
          setApolloDbSearch(q);
        } else {
          setSearch(q);
        }
      }}
      onSearchSubmit={(q) => {
        if (isDatamyneCategory) {
          setDatamyneSearch(q);
        } else if (isJfllCategory) {
          setJfllSearch(q);
        } else if (isApolloCategory) {
          setApolloDbSearch(q);
        } else {
          setSearch(q);
        }
      }}
      savedSearchesCount={savedSearches.length}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onLogout={onLogout}
      onToggleMobileFilter={() => setIsMobileFilterOpen((prev) => !prev)}
      activeFilterCount={currentActiveFilterCount}
    >
      {isDatamyneCategory ? (
        <DatamyneView
          filters={datamyneFilters}
          query={datamyneQuery}
          rowSelection={datamyneRowSelection}
          onRowSelectionChange={setDatamyneRowSelection}
          selectedCount={selectedDatamyneCount}
          isAllOnPageSelected={isAllDatamyneOnPageSelected}
          isSomeOnPageSelected={isSomeDatamyneOnPageSelected}
          onToggleSelectAllPage={handleToggleSelectAllDatamynePage}
          onDeselectAll={handleDeselectAllDatamyne}
          onExport={handleExportDatamyneCsv}
          isExporting={isExportingDatamyne}
          onSearchChange={setDatamyneSearch}
          onDatasetChange={setDatamyneDataset}
          onTabChange={setDatamyneTab}
          onPageChange={setDatamynePage}
          toggleTransportMode={toggleDatamyneTransportMode}
          toggleCategory={toggleDatamyneCategory}
          toggleSubcategory={toggleDatamyneSubcategory}
          toggleRole={toggleDatamyneRole}
          toggleCity={toggleDatamyneCity}
          toggleTradeLane={toggleDatamyneTradeLane}
          toggleContactStatus={toggleDatamyneContactStatus}
          toggleHasDirectors={toggleDatamyneHasDirectors}
          setMinShipments={setDatamyneMinShipments}
          setMinTradedValueUsd={setDatamyneMinTradedValueUsd}
          clearAllFilters={clearAllDatamyneFilters}
          activeFilterCount={datamyneActiveFilterCount}
          onLeadClick={(lead) => setSelectedDatamyneLead(lead)}
          onSearchApollo={handleSearchInApollo}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      ) : isJfllCategory ? (
        <JfllCustomersView
          filters={jfllFilters}
          query={jfllQuery}
          isLoading={isJfllLoading}
          isError={isJfllError}
          error={jfllError}
          refetch={refetchJfll}
          rowSelection={jfllRowSelection}
          onRowSelectionChange={setJfllRowSelection}
          selectedCount={selectedJfllCount}
          isAllOnPageSelected={isAllJfllOnPageSelected}
          isSomeOnPageSelected={isSomeJfllOnPageSelected}
          onToggleSelectAllPage={handleToggleSelectAllJfllPage}
          onDeselectAll={handleDeselectAllJfll}
          onExport={handleExportJfllCsv}
          isExporting={isExportingJfll}
          onSearchChange={setJfllSearch}
          onCustomerStatusChange={setJfllCustomerStatus}
          onTabChange={setJfllTab}
          onPageChange={setJfllPage}
          toggleCustomerGroup={toggleJfllCustomerGroup}
          toggleType={toggleJfllType}
          toggleContactOption={toggleJfllContactOption}
          clearAllFilters={clearAllJfllFilters}
          onCustomerClick={(c) => setSelectedJfllCustomer(c)}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      ) : isApolloCategory ? (
        <ApolloCompaniesView
          filters={apolloDbFilters}
          data={apolloDbData}
          isLoading={isApolloDbLoading}
          isError={isApolloDbError}
          error={apolloDbError}
          refetch={refetchApolloDb}
          rowSelection={apolloDbRowSelection}
          onRowSelectionChange={setApolloDbRowSelection}
          selectedCount={selectedApolloDbCount}
          isAllOnPageSelected={isAllApolloDbOnPageSelected}
          isSomeOnPageSelected={isSomeApolloDbOnPageSelected}
          onToggleSelectAllPage={handleToggleSelectAllApolloDbPage}
          onDeselectAll={handleDeselectAllApolloDb}
          onExport={handleExportApolloDbCsv}
          isExporting={isExportingApolloDb}
          onSearchChange={setApolloDbSearch}
          onToggleIndustry={toggleApolloDbIndustry}
          onToggleCountry={toggleApolloDbCountry}
          onToggleEmployeeTier={toggleApolloDbEmployeeTier}
          onToggleRevenueRange={toggleApolloDbRevenueRange}
          onToggleHasWebsite={toggleApolloDbHasWebsite}
          onToggleHasLinkedin={toggleApolloDbHasLinkedin}
          onClearCategory={clearApolloDbCategory}
          onClearAllFilters={clearAllApolloDbFilters}
          onTabChange={setApolloDbTab}
          onPageChange={setApolloDbPage}
          onLeadClick={(lead) => setSelectedApolloDbLead(lead)}
          onFindDecisionMakers={handleFindDecisionMakersInPeople}
          onSwitchToPeople={handleSwitchToPeople}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      ) : (
        <PeopleView
          filters={filters}
          data={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          refetch={refetch}
          items={items}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          selectedCount={selectedCount}
          isAllOnPageSelected={isAllOnPageSelected}
          isSomeOnPageSelected={isSomeOnPageSelected}
          onToggleSelectAllPage={handleToggleSelectAllPage}
          onSelectAllPage={handleSelectAllPage}
          onSelectAllTotal={handleSelectAllTotal}
          onDeselectAll={handleDeselectAll}
          onSave={handleBatchSave}
          onAddToList={handleAddToList}
          onExport={handleExportCsv}
          isExporting={isExporting}
          savedLists={savedLists}
          onSearchChange={setSearch}
          onToggleArrayFilter={toggleArrayFilter}
          onToggleStatusFilter={toggleStatusFilter}
          onClearCategory={clearFilterCategory}
          onRemoveFilter={removeFilterItem}
          onClearAllFilters={clearAllFilters}
          onSaveSearch={handleSaveSearch}
          onLoadSearch={handleLoadPresetSearch}
          onTabChange={setTab}
          onPageChange={setPage}
          onLeadClick={handleLeadClick}
          onViewEmail={handleViewEmail}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      )}

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

      {/* Slide-over JFLL Customer Dossier Drawer */}
      <ErrorBoundary
        fallbackTitle="Unable to display JFLL customer profile"
        onReset={() => setSelectedJfllCustomer(null)}
      >
        <JfllCustomerDetailDrawer
          isOpen={!!selectedJfllCustomer}
          customer={selectedJfllCustomer}
          onClose={() => setSelectedJfllCustomer(null)}
        />
      </ErrorBoundary>

      {/* Slide-over DataMyne Lead Dossier Drawer */}
      <ErrorBoundary
        fallbackTitle="Unable to display DataMyne lead dossier"
        onReset={() => setSelectedDatamyneLead(null)}
      >
        <DatamyneDetailDrawer
          isOpen={!!selectedDatamyneLead}
          lead={selectedDatamyneLead}
          onClose={() => setSelectedDatamyneLead(null)}
          onSearchApollo={handleSearchInApollo}
        />
      </ErrorBoundary>

      {/* Slide-over Apollo Commercial Shipper Dossier Drawer */}
      <ErrorBoundary
        fallbackTitle="Unable to display Apollo shipper profile"
        onReset={() => setSelectedApolloDbLead(null)}
      >
        <ApolloDetailDrawer
          isOpen={!!selectedApolloDbLead}
          lead={selectedApolloDbLead}
          onClose={() => setSelectedApolloDbLead(null)}
          onFindDecisionMakers={handleFindDecisionMakersInPeople}
        />
      </ErrorBoundary>


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
