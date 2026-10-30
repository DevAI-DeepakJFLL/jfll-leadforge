import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RowSelectionState } from '@tanstack/react-table';
import { AppLayout } from '@/components/layout/AppLayout';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { AdminPortalModal } from '@/components/admin';
import { fetchAdminStats } from '@/services/adminService';
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
import { SessionSupersededModal } from '@/components/auth/SessionSupersededModal';
import { UserSession } from '@/types/auth';
import {
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  checkSessionHeartbeat,
  SESSION_SUPERSEDED_EVENT,
  isOfflineSession,
} from '@/services/authService';
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
import { JFLL_INACTIVE_CUSTOMERS_DATA } from '@/data/jfllInactiveCustomersData';
import { DatamyneDetailDrawer } from '@/components/datamyne';
import { useDatamyneFilter } from '@/hooks/useDatamyneFilter';
import {
  queryDatamyneLeads,
  exportDatamyneLeadsCsv,
  getLoadedDatamyneDataset,
  loadFullDatamyneDataset,
  subscribeToDatamyneDataset,
} from '@/services/datamyneService';
import { getLoadedTierDataset } from '@/services/tierService';
import { DatamyneLead } from '@/types/datamyneLead';
import { ApolloDetailDrawer, ApolloSubTabSwitcher } from '@/components/apollo';
import { useApolloFilter } from '@/hooks/useApolloFilter';
import {
  fetchApolloLeadsFromApi,
  fetchApolloPeopleLeads,
  exportApolloLeadsCsv,
  filterLeadsInMemory,
} from '@/services/apolloService';
import { ApolloLead } from '@/types/apolloLead';
import {
  getSavedLeads,
  getSavedLeadIds,
  toggleSaveLead,
  batchSaveLeads,
  getSavedLists,
  addLeadsToList,
  subscribeToSavedChanges,
} from '@/services/savedLeadsService';
import { createCsvBlob, triggerCsvDownload } from '@/utils/csv';
import { LogApproachModal, ConvertToActiveModal } from '@/components/approach';
import { SalesStatus } from '@/types/approachLog';
import { getCachedApproachStatus, fetchBulkStatuses } from '@/services/approachLogService';


interface SavedSearchPreset {
  id: string;
  name: string;
  filters: Partial<FilterParams>;
}

const DEFAULT_TOP_TAB = 'jfll-customers';
const STORAGE_TAB_KEY = 'leadforge_active_top_tab';
const STORAGE_SEARCHES_KEY = 'leadforge_saved_searches';

function getInitialSavedSearches(): SavedSearchPreset[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function getInitialTopTab(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_TAB_KEY);
      if (
        saved &&
        ['jfll-customers', 'apollo', 'companies', 'people', 'datamyne', 'saved-searches', 'saved-lists'].includes(saved)
      ) {
        if (saved === 'companies' || saved === 'people') return 'apollo';
        return saved;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_TOP_TAB;
}

function getInitialActiveNav(tab: string): string {
  if (tab === 'datamyne') return 'datamyne';
  if (tab === 'jfll-customers') return 'jfll-customers';
  if (tab === 'apollo' || tab === 'companies') return 'companies';
  if (tab === 'saved-searches' || tab === 'saved-lists') return 'saved-searches';
  return 'search'; // for 'people'
}

interface AppContentProps {
  onLogout: () => void;
  currentUser?: UserSession | null;
}

const AppContent: React.FC<AppContentProps> = ({ onLogout, currentUser }) => {
  const [topTab, setTopTab] = useState<string>(getInitialTopTab);
  const [apolloSubTab, setApolloSubTab] = useState<'companies' | 'people'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_TAB_KEY);
        if (saved === 'people') return 'people';
      }
    } catch {
      // Ignore
    }
    return 'companies';
  });
  const [activeNav, setActiveNav] = useState<string>(() => getInitialActiveNav(getInitialTopTab()));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const { showToast } = useToast();

  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  // Saved searches dynamically persisted in localStorage
  const [savedSearches, setSavedSearches] = useState<SavedSearchPreset[]>(getInitialSavedSearches);

  // Saved leads & custom lists managed reactively with localStorage persistence
  const [savedLeadIds, setSavedLeadIds] = useState<Set<string>>(() => getSavedLeadIds());
  const [savedListsData, setSavedListsData] = useState(() => getSavedLists());
  const [selectedSavedLists, setSelectedSavedLists] = useState<string[]>([]);

  React.useEffect(() => {
    return subscribeToSavedChanges(() => {
      setSavedLeadIds(getSavedLeadIds());
      setSavedListsData(getSavedLists());
    });
  }, []);

  const savedLists = useMemo(() => savedListsData.map((l) => l.name), [savedListsData]);

  const handleToggleSavedList = (listName: string) => {
    setSelectedSavedLists((prev) =>
      prev.includes(listName) ? prev.filter((n) => n !== listName) : [...prev, listName]
    );
  };

  const handleClearSavedLists = () => {
    setSelectedSavedLists([]);
  };

  // Row selection initialized to clean empty state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [isExporting, setIsExporting] = useState(false);
  const [selectedDrawerLead, setSelectedDrawerLead] = useState<Lead | null>(null);
  const [selectedEmailLead, setSelectedEmailLead] = useState<Lead | null>(null);

  const {
    filters,
    applyFilters,
    setSearch,
    setTab,
    setPage,
    toggleArrayFilter,
    toggleBooleanFilter,
    toggleStatusFilter,
    removeFilterItem,
    clearFilterCategory,
    clearAllFilters,
  } = useLeadsFilter();

  // Distinguish between Entity-Scoped Mode (company selected) and Global Browsing Mode
  const isEntityScoped = Boolean(
    (filters.organizationId && filters.organizationId.trim()) ||
    (filters.company && filters.company.trim())
  );

  // In Entity-Scoped Mode, sub-filters (q, departments, locations, status, jobTitles, tab)
  // are decoupled from queryKey so changing them NEVER triggers a network refetch!
  const leadsQueryKey = isEntityScoped
    ? ['leads', 'entity', filters.organizationId, filters.company]
    : ['leads', 'global', filters];

  const fetchLeadsFn = () => {
    if (isEntityScoped) {
      return fetchApolloPeopleLeads({
        organizationId: filters.organizationId,
        company: filters.company,
        page: 1,
        limit: 250,
      });
    }
    return fetchApolloPeopleLeads(filters);
  };

  // Fetch live Apollo logistics decision-makers synchronized with URL filters
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<LeadsResponse>({
    queryKey: leadsQueryKey,
    queryFn: fetchLeadsFn,
    gcTime: isEntityScoped ? 1000 * 60 * 3 : 1000 * 60 * 5, // Prunes inactive company batches from browser memory after 3 mins
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev, prevQuery) => {
      if (isEntityScoped) {
        const prevKey = prevQuery?.queryKey;
        if (
          prevKey &&
          prevKey[0] === 'leads' &&
          prevKey[1] === 'entity' &&
          prevKey[2] === filters.organizationId &&
          prevKey[3] === filters.company
        ) {
          return prev;
        }
        return undefined;
      }
      const prevFilters = prevQuery?.queryKey?.[2] as FilterParams | undefined;
      if (
        prevFilters &&
        prevFilters.organizationId === filters.organizationId &&
        prevFilters.company === filters.company &&
        prevFilters.q === filters.q &&
        prevFilters.tab === filters.tab
      ) {
        return prev;
      }
      return undefined;
    },
  });

  // Persistent Saved Leads & Custom Lists handlers
  const handleToggleSaveLead = (lead: Lead) => {
    const isSavedNow = toggleSaveLead(lead);
    showToast(
      isSavedNow
        ? `Saved ${lead.name} to your pipeline`
        : `Removed ${lead.name} from saved leads`
    );
  };

  // Dynamic load preset search: loads target preset or latest saved search
  const handleLoadPresetSearch = (preset?: SavedSearchPreset) => {
    const target = preset || (savedSearches.length > 0 ? savedSearches[savedSearches.length - 1] : null);
    if (!target) {
      showToast("No saved searches yet. Click 'Save Search' on any query to save your criteria.");
      return;
    }
    applyFilters({
      ...filters,
      ...target.filters,
      page: 1,
    });
    showToast(`Loaded saved search: "${target.name}"`);
  };

  // Save current search to localStorage
  const handleSaveSearch = () => {
    // Exclude pagination counters so saved preset applies from page 1
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page: _p, limit: _l, ...activeFilters } = filters;

    const newPreset: SavedSearchPreset = {
      id: `search-${Date.now()}`,
      name: `Search (${new Date().toLocaleDateString()})`,
      filters: activeFilters,
    };
    setSavedSearches((prev) => {
      const updated = [...prev, newPreset];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_SEARCHES_KEY, JSON.stringify(updated));
        }
      } catch {
        // Ignore storage write errors
      }
      return updated;
    });
    showToast('Search criteria saved to your presets');
  };

  const isSavedTab = filters.tab === 'saved';

  // In-memory filtered leads for active company entity or saved tab or server items in global mode
  const filteredLeads = useMemo(() => {
    if (isSavedTab) {
      let saved = getSavedLeads();
      if (selectedSavedLists.length > 0) {
        const activeLists = savedListsData.filter((l) => selectedSavedLists.includes(l.name));
        const matchingLeadIds = new Set(activeLists.flatMap((l) => l.leadIds));
        saved = saved.filter((lead) => matchingLeadIds.has(lead.id));
      }
      return filterLeadsInMemory(saved, filters);
    }
    if (isEntityScoped) {
      let result = filterLeadsInMemory(data?.items || [], filters);
      if (selectedSavedLists.length > 0) {
        const activeLists = savedListsData.filter((l) => selectedSavedLists.includes(l.name));
        const matchingLeadIds = new Set(activeLists.flatMap((l) => l.leadIds));
        result = result.filter((lead) => matchingLeadIds.has(lead.id));
      }
      return result;
    }
    let result = data?.items || [];
    if (selectedSavedLists.length > 0) {
      const activeLists = savedListsData.filter((l) => selectedSavedLists.includes(l.name));
      const matchingLeadIds = new Set(activeLists.flatMap((l) => l.leadIds));
      result = result.filter((lead) => matchingLeadIds.has(lead.id));
    }
    return result;
  }, [isSavedTab, isEntityScoped, data?.items, filters, selectedSavedLists, savedListsData, savedLeadIds]);

  // Client-side pagination for Entity-Scoped Mode or Saved Tab
  const page = filters.page || 1;
  const limit = filters.limit || 25;

  const items = useMemo(() => {
    const rawItems = isEntityScoped || isSavedTab
      ? filteredLeads.slice((page - 1) * limit, page * limit)
      : (data?.items || []);

    return rawItems.map((lead) => ({
      ...lead,
      saved: savedLeadIds.has(lead.id),
    }));
  }, [isEntityScoped, isSavedTab, filteredLeads, page, limit, data?.items, savedLeadIds]);

  // Responsive LeadsResponse passed to PeopleView
  const effectiveData = useMemo<LeadsResponse | undefined>(() => {
    if (isSavedTab) {
      const total = filteredLeads.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const totalFormatted = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);

      return {
        items,
        totalEstimate: total,
        totalFormatted,
        page,
        limit,
        totalPages,
        audienceCounts: {
          all: data?.audienceCounts?.all || total,
          new: data?.audienceCounts?.new || 0,
          saved: savedLeadIds.size,
        },
      };
    }
    if (!data) return undefined;
    if (isEntityScoped) {
      const total = filteredLeads.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const totalFormatted = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);

      const baseItems = data.items || [];
      const newCount = baseItems.filter((l) => (l.decisionMaker ?? (l.status === 'NET NEW')) === true).length;

      return {
        items,
        totalEstimate: total,
        totalFormatted,
        page,
        limit,
        totalPages,
        audienceCounts: {
          all: baseItems.length,
          new: newCount,
          saved: savedLeadIds.size,
        },
      };
    }
    return {
      ...data,
      items,
      audienceCounts: {
        ...data.audienceCounts,
        saved: savedLeadIds.size,
      },
    };
  }, [data, isSavedTab, isEntityScoped, filteredLeads.length, limit, page, items, savedLeadIds.size]);

  // Selection calculations
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
    const allToSelect = isEntityScoped || isSavedTab ? filteredLeads : items;
    allToSelect.forEach((l) => {
      next[l.id] = true;
    });
    setRowSelection(next);
  };

  const handleDeselectAll = () => {
    setRowSelection({});
  };

  // Indexed unified map of leads in memory for O(1) lookups during batch operations
  const getUnifiedLeadMap = () => {
    const map = new Map<string, Lead>();
    getSavedLeads().forEach((l) => map.set(l.id, l));
    (data?.items || []).forEach((l) => map.set(l.id, l));
    filteredLeads.forEach((l) => map.set(l.id, l));
    items.forEach((l) => map.set(l.id, l));
    return map;
  };

  const handleBatchSave = () => {
    if (selectedLeadIds.length === 0) return;
    const leadMap = getUnifiedLeadMap();
    const leadsToSave = selectedLeadIds.map((id) => {
      const found = leadMap.get(id);
      if (found) return found;
      return { id, name: 'Lead', company: 'Company', saved: true } as Lead;
    });
    const count = batchSaveLeads(leadsToSave, true);
    setRowSelection({});
    showToast(`Saved ${count} lead${count === 1 ? '' : 's'} to your pipeline`);
  };

  const handleAddToList = (listName: string) => {
    if (selectedLeadIds.length === 0) return;
    const leadMap = getUnifiedLeadMap();
    const leadsToAdd = selectedLeadIds
      .map((id) => leadMap.get(id))
      .filter((l): l is Lead => Boolean(l));

    addLeadsToList(listName, leadsToAdd);
    setRowSelection({});
    showToast(
      `Added ${leadsToAdd.length} lead${leadsToAdd.length === 1 ? '' : 's'} to "${listName}"`
    );
  };

  const handleAddDrawerLeadToList = (lead: Lead, listName?: string) => {
    const targetList = listName || savedLists[0];
    if (!targetList) {
      showToast('Please create or select a list first');
      return;
    }
    addLeadsToList(targetList, [lead]);
    showToast(`Added ${lead.name} to "${targetList}"`);
  };

  // Functional CSV Export download handler with direct client-side generation & server fallback
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);

      // If user selected specific rows, export directly from memory with 100% data fidelity
      if (selectedLeadIds.length > 0) {
        const leadMap = getUnifiedLeadMap();
        const leadsToExport = selectedLeadIds
          .map((id) => leadMap.get(id))
          .filter((l): l is Lead => Boolean(l));

        if (leadsToExport.length > 0) {
          const blob = createCsvBlob(
            ['ID', 'Name', 'Title', 'Company', 'Industry', 'Department', 'Status', 'Location', 'Email', 'Phone', 'Employees', 'Revenue', 'Funding', 'Saved'],
            leadsToExport.map((l) => [
              l.id, l.name, l.title, l.company, l.industry, l.department || '', l.status, l.location, l.email, l.phone, l.employees, l.revenue, l.funding, l.saved ? 'Yes' : 'No'
            ])
          );
          triggerCsvDownload(blob, `apollo_leads_export.csv`);
          showToast(`Exported ${leadsToExport.length} leads to apollo_leads_export.csv`);
          return;
        }
      }

      // If no specific rows are selected, try server export or export all currently displayed items
      const res = await fetch('/api/leads/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined,
          filters: selectedLeadIds.length === 0 ? filters : undefined,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        triggerCsvDownload(blob, 'apollo_leads_export.csv');
        const exportedCount = effectiveData?.totalEstimate || items.length;
        showToast(`Exported ${exportedCount} leads to apollo_leads_export.csv`);
        return;
      }

      // Fallback: export currently loaded filtered/table leads
      const fallbackLeads = isEntityScoped || isSavedTab ? filteredLeads : (data?.items || items);
      if (fallbackLeads.length > 0) {
        const blob = createCsvBlob(
          ['ID', 'Name', 'Title', 'Company', 'Industry', 'Department', 'Status', 'Location', 'Email', 'Phone', 'Employees', 'Revenue', 'Funding', 'Saved'],
          fallbackLeads.map((l) => [
            l.id, l.name, l.title, l.company, l.industry, l.department || '', l.status, l.location, l.email, l.phone, l.employees, l.revenue, l.funding, l.saved ? 'Yes' : 'No'
          ])
        );
        triggerCsvDownload(blob, 'apollo_leads_export.csv');
        showToast(`Exported ${fallbackLeads.length} leads to apollo_leads_export.csv`);
      }
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
    return (data?.items || items).find((l) => l.id === selectedDrawerLead.id) || selectedDrawerLead;
  }, [data?.items, items, selectedDrawerLead]);

  // JFLL Customers filter and state management
  const {
    filters: jfllFilters,
    setSearch: setJfllSearch,
    setTab: setJfllTab,
    setCustomerStatus: setJfllCustomerStatus,
    setPage: setJfllPage,
    toggleCustomerGroup: toggleJfllCustomerGroup,
    toggleType: toggleJfllType,
    toggleCreditStatus: toggleJfllCreditStatus,
    toggleSalesPerson: toggleJfllSalesPerson,
    toggleRevenueRange: toggleJfllRevenueRange,
    toggleApproachStatus: toggleJfllApproachStatus,
    toggleContactOption: toggleJfllContactOption,
    handleSortChange: handleJfllSortChange,
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
        .map(
          (id) =>
            jfllItems.find((c) => c.id === id) ||
            JFLL_CUSTOMERS_DATA.find((c) => c.id === id) ||
            JFLL_INACTIVE_CUSTOMERS_DATA.find((c) => c.id === id)
        )
        .filter(Boolean) as JfllCustomer[];
      const exportList = selected.length > 0 ? selected : jfllItems;
      const blob = exportJfllCustomersCsv(exportList);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const statusSuffix = jfllFilters.customerStatus || 'all';
      link.setAttribute('download', `jfll_${statusSuffix}_customers_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(
        `Exported ${exportList.length} JFLL ${
          statusSuffix === 'all' ? 'total' : statusSuffix
        } customers to CSV`
      );
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
    toggleCountry: toggleDatamyneCountry,
    toggleTransportMode: toggleDatamyneTransportMode,
    toggleCategory: toggleDatamyneCategory,
    toggleSubcategory: toggleDatamyneSubcategory,
    toggleRole: toggleDatamyneRole,
    toggleCity: toggleDatamyneCity,
    toggleTradeLane: toggleDatamyneTradeLane,
    toggleContactStatus: toggleDatamyneContactStatus,
    toggleApproachStatus: toggleDatamyneApproachStatus,
    toggleHasDirectors: toggleDatamyneHasDirectors,
    setMinShipments: setDatamyneMinShipments,
    setMinTradedValueUsd: setDatamyneMinTradedValueUsd,
    clearAllFilters: clearAllDatamyneFilters,
    activeFilterCount: datamyneActiveFilterCount,
  } = useDatamyneFilter();

  const [datamyneDatasetVersion, setDatamyneDatasetVersion] = useState(0);

  useEffect(() => {
    loadFullDatamyneDataset().catch(() => {});
    return subscribeToDatamyneDataset(() => {
      setDatamyneDatasetVersion((v) => v + 1);
    });
  }, []);

  const datamyneQuery = useMemo(() => {
    return queryDatamyneLeads(datamyneFilters);
  }, [datamyneFilters, datamyneDatasetVersion]);

  const [datamyneRowSelection, setDatamyneRowSelection] = useState<RowSelectionState>({});
  const [selectedDatamyneLead, setSelectedDatamyneLead] = useState<DatamyneLead | null>(null);
  const [isExportingDatamyne, setIsExportingDatamyne] = useState(false);

  // Sales Approach & Active Conversion Modal States
  const [approachModalTarget, setApproachModalTarget] = useState<{
    entityType: 'datamyne' | 'jfll_customer';
    entityId: string;
    companyName: string;
    currentStatus: SalesStatus;
  } | null>(null);

  const [convertModalTarget, setConvertModalTarget] = useState<{
    entityType: 'datamyne' | 'jfll_customer';
    entityId: string;
    companyName: string;
  } | null>(null);

  // Fetch initial bulk statuses for both entity types
  useEffect(() => {
    fetchBulkStatuses('datamyne').catch(() => {});
    fetchBulkStatuses('jfll_customer').catch(() => {});
  }, []);

  const handleOpenDatamyneApproach = useCallback((lead: DatamyneLead) => {
    setApproachModalTarget({
      entityType: 'datamyne',
      entityId: lead.id,
      companyName: lead.company_name,
      currentStatus: getCachedApproachStatus('datamyne', lead.id),
    });
  }, []);

  const handleOpenJfllApproach = useCallback((customer: JfllCustomer) => {
    setApproachModalTarget({
      entityType: 'jfll_customer',
      entityId: customer.id,
      companyName: customer.fullName,
      currentStatus: getCachedApproachStatus('jfll_customer', customer.id),
    });
  }, []);

  const handleOpenJfllConvert = useCallback((customer: JfllCustomer) => {
    setConvertModalTarget({
      entityType: 'jfll_customer',
      entityId: customer.id,
      companyName: customer.fullName,
    });
  }, []);

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
      const allTierLeads = getLoadedTierDataset();
      const selected = selectedDatamyneIds
        .map(
          (id) =>
            datamyneItems.find((d) => d.id === id) ||
            allLeads.find((d) => d.id === id) ||
            (allTierLeads as unknown as DatamyneLead[]).find((d) => d.id === id)
        )
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

  // Cross-Navigation: Search inside People directory for decision-makers at this company
  const handleFindDecisionMakersInPeople = (companyName: string, organizationId?: string) => {
    setSelectedApolloDbLead(null);
    setTopTab('people');
    setActiveNav('search');
    applyFilters({
      ...filters,
      q: undefined,
      company: companyName,
      organizationId: organizationId || undefined,
      page: 1,
      departments: [],
      locations: [],
    });
    showToast(`Showing verified decision-makers for "${companyName}"`);
  };

  const handleSwitchToPeople = () => {
    setApolloSubTab('people');
    setTopTab('people');
    setActiveNav('search');
  };

  const handleSwitchToCompanies = (companySearchTerm?: string) => {
    setApolloSubTab('companies');
    setTopTab('companies');
    setActiveNav('companies');
    if (companySearchTerm && companySearchTerm !== 'Selected Organization') {
      setApolloDbSearch(companySearchTerm);
    }
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
  const isApolloCategory = topTab === 'apollo' || topTab === 'companies' || topTab === 'people';

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
    : isApolloCategory && apolloSubTab === 'companies'
    ? apolloDbActiveFilterCount
    : apolloActiveFilterCount;

  // Cleanly handles switching between top-level global directory tabs
  const handleAudienceTabChange = (tabId: string) => {
    let normalizedTab = tabId;
    if (tabId === 'companies') {
      normalizedTab = 'apollo';
      setApolloSubTab('companies');
    } else if (tabId === 'people') {
      normalizedTab = 'apollo';
      setApolloSubTab('people');
    }
    setTopTab(normalizedTab);
    setIsMobileFilterOpen(false);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_TAB_KEY, normalizedTab);
      }
    } catch {
      // Ignore storage errors
    }

    const wasEntityScoped = Boolean(filters.company || filters.organizationId || filters.q);

    if (normalizedTab === 'datamyne') {
      setActiveNav('datamyne');
    } else if (normalizedTab === 'jfll-customers') {
      setActiveNav('jfll-customers');
    } else if (normalizedTab === 'apollo') {
      setActiveNav(apolloSubTab === 'people' ? 'search' : 'companies');
    } else if (normalizedTab === 'saved-searches' || normalizedTab === 'saved-lists') {
      setActiveNav('saved-searches');
      if (normalizedTab === 'saved-searches') {
        handleLoadPresetSearch();
      } else {
        setTab('saved');
      }
    } else {
      setActiveNav('search');
    }

    // Clean entity-scoped filters and browser query parameters when switching directories or resetting People
    if (wasEntityScoped) {
      applyFilters(
        (prev) => ({
          ...prev,
          company: undefined,
          organizationId: undefined,
          q: undefined,
          page: 1,
        }),
        true
      );
    } else if (typeof window !== 'undefined' && window.location.search && normalizedTab !== 'people' && normalizedTab !== 'apollo') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <AppLayout
      activeNav={activeNav}
      savedCount={savedLeadIds.size}
      onNavChange={(navId) => {
        if (navId === 'datamyne') {
          handleAudienceTabChange('datamyne');
        } else if (navId === 'jfll-customers') {
          handleAudienceTabChange('jfll-customers');
        } else if (navId === 'home' || navId === 'companies') {
          setTopTab('apollo');
          setApolloSubTab('companies');
          setActiveNav('companies');
        } else if (navId === 'search') {
          setTopTab('apollo');
          setApolloSubTab('people');
          setActiveNav('search');
        } else if (navId === 'saved-searches') {
          handleAudienceTabChange('saved-searches');
        } else {
          setActiveNav(navId);
        }
      }}
      activeTab={isApolloCategory ? 'apollo' : topTab}
      onTabChange={handleAudienceTabChange}
      searchQuery={
        isDatamyneCategory
          ? datamyneFilters.q || ''
          : isJfllCategory
          ? jfllFilters.q || ''
          : isApolloCategory && apolloSubTab === 'companies'
          ? apolloDbFilters.q || ''
          : filters.q || ''
      }
      onSearchChange={(q) => {
        if (isDatamyneCategory) {
          setDatamyneSearch(q);
        } else if (isJfllCategory) {
          setJfllSearch(q);
        } else if (isApolloCategory && apolloSubTab === 'companies') {
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
        } else if (isApolloCategory && apolloSubTab === 'companies') {
          setApolloDbSearch(q);
        } else {
          setSearch(q);
        }
      }}
      savedSearchesCount={savedSearches.length}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
      pendingRequestsCount={adminStats?.pending_requests_count}
      onLogout={onLogout}
      currentUser={currentUser}
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
          toggleCountry={toggleDatamyneCountry}
          toggleTransportMode={toggleDatamyneTransportMode}
          toggleCategory={toggleDatamyneCategory}
          toggleSubcategory={toggleDatamyneSubcategory}
          toggleRole={toggleDatamyneRole}
          toggleCity={toggleDatamyneCity}
          toggleTradeLane={toggleDatamyneTradeLane}
          toggleContactStatus={toggleDatamyneContactStatus}
          toggleApproachStatus={toggleDatamyneApproachStatus}
          toggleHasDirectors={toggleDatamyneHasDirectors}
          setMinShipments={setDatamyneMinShipments}
          setMinTradedValueUsd={setDatamyneMinTradedValueUsd}
          clearAllFilters={clearAllDatamyneFilters}
          activeFilterCount={datamyneActiveFilterCount}
          onLeadClick={(lead) => setSelectedDatamyneLead(lead)}
          onLogApproach={handleOpenDatamyneApproach}
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
          onSortChange={handleJfllSortChange}
          toggleCustomerGroup={toggleJfllCustomerGroup}
          toggleType={toggleJfllType}
          toggleCreditStatus={toggleJfllCreditStatus}
          toggleSalesPerson={toggleJfllSalesPerson}
          toggleRevenueRange={toggleJfllRevenueRange}
          toggleApproachStatus={toggleJfllApproachStatus}
          toggleContactOption={toggleJfllContactOption}
          clearAllFilters={clearAllJfllFilters}
          onCustomerClick={(c) => setSelectedJfllCustomer(c)}
          onLogApproach={handleOpenJfllApproach}
          onConvertToActive={handleOpenJfllConvert}
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      ) : isApolloCategory && apolloSubTab === 'companies' ? (
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
          onFindDecisionMakers={(companyName, organizationId) => {
            setApolloSubTab('people');
            handleFindDecisionMakersInPeople(companyName, organizationId);
          }}
          onSwitchToPeople={handleSwitchToPeople}
          subTabHeader={
            <ApolloSubTabSwitcher
              activeSubTab="companies"
              onSubTabChange={(tab) => {
                setApolloSubTab(tab);
                setActiveNav(tab === 'people' ? 'search' : 'companies');
              }}
              companiesCount={apolloDbData?.totalFormatted || '690k'}
              peopleCount={effectiveData?.totalFormatted || '766k'}
            />
          }
          isMobileOpen={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />
      ) : (
        <PeopleView
          filters={filters}
          data={effectiveData}
          isLoading={isLoading || isFetching}
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
          selectedSavedLists={selectedSavedLists}
          onToggleSavedList={handleToggleSavedList}
          onClearSavedLists={handleClearSavedLists}
          onToggleSave={handleToggleSaveLead}
          onSearchChange={setSearch}
          onToggleArrayFilter={toggleArrayFilter}
          onToggleBooleanFilter={toggleBooleanFilter}
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
          onSwitchToCompanies={(companyName) => {
            handleSwitchToCompanies(companyName);
          }}
          subTabHeader={
            isApolloCategory ? (
              <ApolloSubTabSwitcher
                activeSubTab="people"
                onSubTabChange={(tab) => {
                  setApolloSubTab(tab);
                  setActiveNav(tab === 'people' ? 'search' : 'companies');
                }}
                companiesCount={apolloDbData?.totalFormatted || '690k'}
                peopleCount={effectiveData?.totalFormatted || '766k'}
              />
            ) : null
          }
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
        onAddToList={handleAddDrawerLeadToList}
        savedLists={savedLists}
        onComposeEmail={(_l) => {}}
      />

      {/* Slide-over JFLL Customer Details Drawer */}
      <ErrorBoundary
        fallbackTitle="Unable to display JFLL customer profile"
        onReset={() => setSelectedJfllCustomer(null)}
      >
        <JfllCustomerDetailDrawer
          isOpen={!!selectedJfllCustomer}
          customer={selectedJfllCustomer}
          onClose={() => setSelectedJfllCustomer(null)}
          onLogApproach={handleOpenJfllApproach}
          onConvertToActive={handleOpenJfllConvert}
        />
      </ErrorBoundary>

      {/* Slide-over DataMyne Lead Details Drawer */}
      <ErrorBoundary
        fallbackTitle="Unable to display DataMyne lead details"
        onReset={() => setSelectedDatamyneLead(null)}
      >
        <DatamyneDetailDrawer
          isOpen={!!selectedDatamyneLead}
          lead={selectedDatamyneLead}
          onClose={() => setSelectedDatamyneLead(null)}
          onLogApproach={handleOpenDatamyneApproach}
        />
      </ErrorBoundary>

      {/* Slide-over Apollo Commercial Shipper Details Drawer */}
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

      {/* Root Administration Access Portal */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        currentUserEmail={currentUser?.email}
      />

      {/* Sales Coordinator Approach Logging Modal */}
      {approachModalTarget && (
        <LogApproachModal
          isOpen={!!approachModalTarget}
          onClose={() => setApproachModalTarget(null)}
          entityType={approachModalTarget.entityType}
          entityId={approachModalTarget.entityId}
          companyName={approachModalTarget.companyName}
          currentStatus={approachModalTarget.currentStatus}
          onSuccess={() => {
            if (approachModalTarget.entityType === 'jfll_customer') {
              refetchJfll();
            }
          }}
        />
      )}

      {/* Convert Inactive Client to Active Modal */}
      {convertModalTarget && (
        <ConvertToActiveModal
          isOpen={!!convertModalTarget}
          onClose={() => setConvertModalTarget(null)}
          entityType={convertModalTarget.entityType}
          entityId={convertModalTarget.entityId}
          companyName={convertModalTarget.companyName}
          onSuccess={() => {
            refetchJfll();
          }}
        />
      )}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(getStoredSession);
  const [isSessionSuperseded, setIsSessionSuperseded] = useState(false);

  // Listen for session superseded events (e.g. from background heartbeats or API 401s)
  useEffect(() => {
    const handleSuperseded = () => {
      clearStoredSession();
      setSession(null);
      setIsSessionSuperseded(true);
    };

    window.addEventListener(SESSION_SUPERSEDED_EVENT, handleSuperseded);
    return () => {
      window.removeEventListener(SESSION_SUPERSEDED_EVENT, handleSuperseded);
    };
  }, []);

  // Periodic heartbeat every 20 seconds to guarantee single-device session integrity
  useEffect(() => {
    if (!session?.token || isOfflineSession(session)) return;

    const interval = setInterval(async () => {
      const res = await checkSessionHeartbeat(session.token);
      if (res.superseded) {
        clearStoredSession();
        setSession(null);
        setIsSessionSuperseded(true);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [session]);

  const handleLoginSuccess = (newSession: UserSession) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_TAB_KEY, DEFAULT_TOP_TAB);
      }
    } catch {
      // Ignore
    }
    setStoredSession(newSession);
    setSession(newSession);
    setIsSessionSuperseded(false);
  };

  const handleLogout = () => {
    clearStoredSession();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_TAB_KEY);
      }
    } catch {
      // Ignore
    }
    setSession(null);
  };

  if (!session) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <SessionSupersededModal
          isOpen={isSessionSuperseded}
          onAcknowledge={() => setIsSessionSuperseded(false)}
        />
      </>
    );
  }

  return (
    <ToastProvider>
      <AppContent onLogout={handleLogout} currentUser={session} />
      <SessionSupersededModal
        isOpen={isSessionSuperseded}
        onAcknowledge={() => setIsSessionSuperseded(false)}
      />
    </ToastProvider>
  );
};

export default App;
