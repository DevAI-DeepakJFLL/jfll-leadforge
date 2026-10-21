import { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterParams, LeadStatus, AudienceTab } from '@/types/lead';

export interface ActiveFilterItem {
  key: keyof FilterParams;
  categoryLabel: string;
  value: string;
  displayValue: string;
}

const DEFAULT_FILTERS: FilterParams = {
  q: undefined,
  organizationId: undefined,
  company: undefined,
  jobTitles: [],
  departments: [],
  seniority: [],
  locations: [],
  industries: [],
  status: [],
  companySize: [],
  logisticsOnly: true,
  decisionMakersOnly: false,
  hasEmailOnly: false,
  hasLinkedinOnly: false,
  page: 1,
  limit: 25,
  sortBy: undefined,
  sortOrder: 'asc',
  tab: 'all',
};

const VALID_STATUSES: LeadStatus[] = ['NET NEW', 'COLD', 'IN SEQUENCE'];
const VALID_TABS: AudienceTab[] = ['all', 'new', 'saved'];

/**
 * Parses query string into strongly typed FilterParams with safe defaults
 */
export function parseUrlToFilters(search: string): FilterParams {
  if (!search) return { ...DEFAULT_FILTERS };

  const params = new URLSearchParams(search);

  const parseArray = (key: string): string[] => {
    const all = params.getAll(key);
    if (all.length > 1) {
      return all.map((v) => v.trim()).filter(Boolean);
    }
    if (all.length === 1 && all[0].length > 0) {
      if (key === 'locations') {
        return [all[0].trim()];
      }
      return all[0]
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  };

  const rawStatus = parseArray('status');
  const validStatus = rawStatus.filter((s): s is LeadStatus =>
    VALID_STATUSES.includes(s as LeadStatus)
  );

  const rawTab = params.get('tab') as AudienceTab | null;
  const tab: AudienceTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'all';

  const rawPage = parseInt(params.get('page') || '1', 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const rawLimit = parseInt(params.get('limit') || '25', 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 25 : rawLimit;

  const q = params.get('q')?.trim() || undefined;
  const organizationId = params.get('organizationId')?.trim() || undefined;
  const company = params.get('company')?.trim() || undefined;
  const sortBy = params.get('sortBy')?.trim() || undefined;
  const rawSortOrder = params.get('sortOrder');
  const sortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc';

  const logisticsOnly = params.has('logisticsOnly') ? params.get('logisticsOnly') === 'true' : true;
  const decisionMakersOnly = params.get('decisionMakersOnly') === 'true';
  const hasEmailOnly = params.get('hasEmailOnly') === 'true';
  const hasLinkedinOnly = params.get('hasLinkedinOnly') === 'true';

  return {
    q,
    organizationId,
    company,
    jobTitles: parseArray('jobTitles'),
    departments: parseArray('departments'),
    seniority: parseArray('seniority'),
    locations: parseArray('locations'),
    industries: parseArray('industries'),
    status: validStatus,
    companySize: parseArray('companySize'),
    logisticsOnly,
    decisionMakersOnly,
    hasEmailOnly,
    hasLinkedinOnly,
    page,
    limit,
    sortBy,
    sortOrder,
    tab,
  };
}

/**
 * Serializes FilterParams into URL query string, omitting defaults
 */
export function serializeFiltersToUrl(filters: FilterParams): string {
  const params = new URLSearchParams();

  if (filters.q && filters.q.trim().length > 0) {
    params.set('q', filters.q.trim());
  }

  if (filters.organizationId && filters.organizationId.trim().length > 0) {
    params.set('organizationId', filters.organizationId.trim());
  }

  if (filters.company && filters.company.trim().length > 0) {
    params.set('company', filters.company.trim());
  }

  const appendArray = (key: string, arr?: string[]) => {
    if (arr && arr.length > 0) {
      arr.forEach((v) => {
        if (v && v.trim()) {
          params.append(key, v.trim());
        }
      });
    }
  };

  appendArray('jobTitles', filters.jobTitles);
  appendArray('departments', filters.departments);
  appendArray('seniority', filters.seniority);
  appendArray('locations', filters.locations);
  appendArray('industries', filters.industries);
  appendArray('status', filters.status);
  appendArray('companySize', filters.companySize);

  if (filters.logisticsOnly === false) {
    params.set('logisticsOnly', 'false');
  }
  if (filters.decisionMakersOnly === true) {
    params.set('decisionMakersOnly', 'true');
  }
  if (filters.hasEmailOnly === true) {
    params.set('hasEmailOnly', 'true');
  }
  if (filters.hasLinkedinOnly === true) {
    params.set('hasLinkedinOnly', 'true');
  }

  if (filters.tab && filters.tab !== 'all') {
    params.set('tab', filters.tab);
  }

  if (filters.page && filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  if (filters.limit && filters.limit !== 25) {
    params.set('limit', filters.limit.toString());
  }

  if (filters.sortBy) {
    params.set('sortBy', filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== 'asc') {
      params.set('sortOrder', filters.sortOrder);
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function useLeadsFilter() {
  const [filters, setFiltersState] = useState<FilterParams>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_FILTERS };
    return parseUrlToFilters(window.location.search);
  });

  // Sync internal state with browser history (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setFiltersState(parseUrlToFilters(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL whenever filters state changes
  const applyFilters = useCallback(
    (newFilters: FilterParams | ((prev: FilterParams) => FilterParams), replace = false) => {
      setFiltersState((prev) => {
        const next = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
        const newSearch = serializeFiltersToUrl(next);

        if (typeof window !== 'undefined' && currentSearch !== newSearch) {
          const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
          if (replace) {
            window.history.replaceState(null, '', newUrl);
          } else {
            window.history.pushState(null, '', newUrl);
          }
        }

        return next;
      });
    },
    []
  );

  const setSearch = useCallback(
    (q: string) => {
      applyFilters(
        (prev) => ({
          ...prev,
          q: q.trim().length > 0 ? q : undefined,
          page: 1,
        }),
        true // replaceState for typing in search input
      );
    },
    [applyFilters]
  );

  const setTab = useCallback(
    (tab: AudienceTab) => {
      applyFilters((prev) => ({
        ...prev,
        tab,
        page: 1,
      }));
    },
    [applyFilters]
  );

  const setPage = useCallback(
    (page: number) => {
      applyFilters((prev) => ({
        ...prev,
        page: Math.max(1, page),
      }));
    },
    [applyFilters]
  );

  const toggleArrayFilter = useCallback(
    (
      key: 'jobTitles' | 'departments' | 'seniority' | 'locations' | 'industries' | 'companySize',
      item: string
    ) => {
      applyFilters((prev) => {
        const currentList = prev[key] || [];
        const exists = currentList.includes(item);
        const updatedList = exists
          ? currentList.filter((x) => x !== item)
          : [...currentList, item];

        return {
          ...prev,
          [key]: updatedList,
          page: 1,
        };
      });
    },
    [applyFilters]
  );

  const toggleBooleanFilter = useCallback(
    (key: 'logisticsOnly' | 'decisionMakersOnly' | 'hasEmailOnly' | 'hasLinkedinOnly') => {
      applyFilters((prev) => {
        const current = Boolean(prev[key]);
        return {
          ...prev,
          [key]: !current,
          page: 1,
        };
      });
    },
    [applyFilters]
  );

  const toggleStatusFilter = useCallback(
    (statusItem: LeadStatus) => {
      applyFilters((prev) => {
        const current = prev.status || [];
        const exists = current.includes(statusItem);
        const updated = exists
          ? current.filter((s) => s !== statusItem)
          : [...current, statusItem];

        return {
          ...prev,
          status: updated,
          page: 1,
        };
      });
    },
    [applyFilters]
  );

  const removeFilterItem = useCallback(
    (key: keyof FilterParams, value: string) => {
      applyFilters((prev) => {
        if (key === 'q') {
          return { ...prev, q: undefined, page: 1 };
        }
        if (key === 'organizationId' || key === 'company') {
          return { ...prev, organizationId: undefined, company: undefined, page: 1 };
        }
        if (
          key === 'logisticsOnly' ||
          key === 'decisionMakersOnly' ||
          key === 'hasEmailOnly' ||
          key === 'hasLinkedinOnly'
        ) {
          return {
            ...prev,
            [key]: key === 'logisticsOnly' ? false : undefined,
            page: 1,
          };
        }
        if (key === 'status') {
          return {
            ...prev,
            status: (prev.status || []).filter((s) => s !== value),
            page: 1,
          };
        }
        if (
          key === 'jobTitles' ||
          key === 'departments' ||
          key === 'seniority' ||
          key === 'locations' ||
          key === 'industries' ||
          key === 'companySize'
        ) {
          return {
            ...prev,
            [key]: (prev[key] || []).filter((x) => x !== value),
            page: 1,
          };
        }
        return prev;
      });
    },
    [applyFilters]
  );

  const clearFilterCategory = useCallback(
    (key: keyof FilterParams) => {
      applyFilters((prev) => {
        if (key === 'q') {
          return { ...prev, q: undefined, page: 1 };
        }
        if (key === 'organizationId' || key === 'company') {
          return { ...prev, organizationId: undefined, company: undefined, page: 1 };
        }
        if (Array.isArray(prev[key])) {
          return { ...prev, [key]: [], page: 1 };
        }
        return prev;
      });
    },
    [applyFilters]
  );

  const clearAllFilters = useCallback(() => {
    applyFilters((prev) => ({
      ...DEFAULT_FILTERS,
      tab: prev.tab, // Preserve current audience tab
    }));
  }, [applyFilters]);

  // Derived calculations for active filter counts and chip list
  const activeFilters = useMemo<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    if (filters.company || filters.organizationId) {
      items.push({
        key: filters.company ? 'company' : 'organizationId',
        categoryLabel: 'Company',
        value: filters.company || filters.organizationId || '',
        displayValue: filters.company || 'Selected Organization',
      });
    }

    if (filters.q) {
      items.push({
        key: 'q',
        categoryLabel: 'Search',
        value: filters.q,
        displayValue: `"${filters.q}"`,
      });
    }

    (filters.jobTitles || []).forEach((val) => {
      items.push({
        key: 'jobTitles',
        categoryLabel: 'Title',
        value: val,
        displayValue: val,
      });
    });

    (filters.departments || []).forEach((val) => {
      items.push({
        key: 'departments',
        categoryLabel: 'Department',
        value: val,
        displayValue: val,
      });
    });

    (filters.locations || []).forEach((val) => {
      items.push({
        key: 'locations',
        categoryLabel: 'Location',
        value: val,
        displayValue: val,
      });
    });

    (filters.industries || []).forEach((val) => {
      items.push({
        key: 'industries',
        categoryLabel: 'Industry',
        value: val,
        displayValue: val,
      });
    });

    (filters.seniority || []).forEach((val) => {
      items.push({
        key: 'seniority',
        categoryLabel: 'Seniority',
        value: val,
        displayValue: val,
      });
    });

    if (filters.logisticsOnly) {
      items.push({
        key: 'logisticsOnly',
        categoryLabel: 'Role Focus',
        value: 'logisticsOnly',
        displayValue: 'Logistics Roles Only',
      });
    }

    if (filters.decisionMakersOnly) {
      items.push({
        key: 'decisionMakersOnly',
        categoryLabel: 'Seniority',
        value: 'decisionMakersOnly',
        displayValue: 'Decision Makers Only',
      });
    }

    if (filters.hasEmailOnly) {
      items.push({
        key: 'hasEmailOnly',
        categoryLabel: 'Outreach',
        value: 'hasEmailOnly',
        displayValue: 'Verified Email',
      });
    }

    if (filters.hasLinkedinOnly) {
      items.push({
        key: 'hasLinkedinOnly',
        categoryLabel: 'Outreach',
        value: 'hasLinkedinOnly',
        displayValue: 'LinkedIn Profile',
      });
    }

    (filters.status || []).forEach((val) => {
      items.push({
        key: 'status',
        categoryLabel: 'Status',
        value: val,
        displayValue: val,
      });
    });

    (filters.companySize || []).forEach((val) => {
      items.push({
        key: 'companySize',
        categoryLabel: 'Size',
        value: val,
        displayValue: val,
      });
    });

    return items;
  }, [filters]);

  const activeFilterCount = activeFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  return {
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
    activeFilters,
    activeFilterCount,
    hasActiveFilters,
  };
}

export default useLeadsFilter;
