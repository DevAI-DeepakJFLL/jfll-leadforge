import { useState, useCallback, useMemo } from 'react';
import {
  DatamyneFilterParams,
  DatamyneDatasetType,
  DatamyneAudienceTab,
  TransportMode,
  INDIA_CITIES,
  BRAZIL_CITIES,
  INDIA_CORRIDORS,
  BRAZIL_CORRIDORS,
  CATEGORY_TO_TAB_MAP,
} from '@/types/datamyneLead';

export function pruneFiltersForCountry(
  countries: string[],
  cities: string[] = [],
  tradeLanes: string[] = []
): { cities: string[]; tradeLanes: string[] } {
  const isBrazilOnly = countries.length === 1 && countries[0] === 'Brazil';
  const isIndiaOnly = countries.length === 1 && countries[0] === 'India';

  let prunedCities = [...cities];
  let prunedTradeLanes = [...tradeLanes];

  if (isBrazilOnly) {
    prunedCities = prunedCities.filter((city) =>
      (BRAZIL_CITIES as readonly string[]).includes(city)
    );
    prunedTradeLanes = prunedTradeLanes.filter((lane) =>
      BRAZIL_CORRIDORS.some((c) => c.id === lane)
    );
  } else if (isIndiaOnly) {
    prunedCities = prunedCities.filter((city) =>
      (INDIA_CITIES as readonly string[]).includes(city)
    );
    prunedTradeLanes = prunedTradeLanes.filter((lane) =>
      INDIA_CORRIDORS.some((c) => c.id === lane)
    );
  }

  return { cities: prunedCities, tradeLanes: prunedTradeLanes };
}

export function useDatamyneFilter(initialParams: DatamyneFilterParams = {}) {
  const [filters, setFilters] = useState<DatamyneFilterParams>({
    dataset: 'valid',
    tab: 'all',
    page: 1,
    limit: 25,
    countries: initialParams.countries || [],
    transportModes: [],
    categories: [],
    subcategories: [],
    roles: [],
    cities: [],
    tradeLanes: [],
    contactStatus: [],
    approachStatuses: [],
    minShipments: 0,
    minTradedValueUsd: 0,
    hasDirectors: false,
    ...initialParams,
  });

  const setDataset = useCallback((dataset: DatamyneDatasetType) => {
    setFilters((prev) => ({ ...prev, dataset, page: 1 }));
  }, []);

  const setTab = useCallback((tab: DatamyneAudienceTab) => {
    setFilters((prev) => ({
      ...prev,
      tab,
      categories: [],
      page: 1,
    }));
  }, []);

  const setSearch = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, q: q || undefined, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setFilters((prev) => {
      let updated: string[];
      if (country === 'All' || country === 'all') {
        updated = [];
      } else {
        const current = prev.countries || [];
        updated = current.includes(country)
          ? current.filter((c) => c !== country)
          : [...current, country];
      }

      // Smart Context-Aware Filter Pruning:
      // When exclusively filtered by Brazil, prune Indian cities & Indian trade corridors.
      // When exclusively filtered by India, prune Brazilian cities & Brazilian trade corridors.
      const { cities, tradeLanes } = pruneFiltersForCountry(
        updated,
        prev.cities,
        prev.tradeLanes
      );

      return {
        ...prev,
        countries: updated,
        cities,
        tradeLanes,
        page: 1,
      };
    });
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const current = prev.categories || [];
      const updated = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];

      // Auto-Sync with top vertical tabs:
      let nextTab: DatamyneAudienceTab = prev.tab || 'all';

      if (updated.length === 1) {
        // Single category selected: switch top tab to match this category
        const matchingTab = CATEGORY_TO_TAB_MAP[updated[0]];
        if (matchingTab) {
          nextTab = matchingTab;
        }
      } else if (updated.length > 1) {
        // Multiple categories selected: switch tab to 'all' so query searches across all selected
        nextTab = 'all';
      } else if (updated.length === 0) {
        // All categories unchecked: revert tab to 'all'
        nextTab = 'all';
      }

      return {
        ...prev,
        categories: updated,
        tab: nextTab,
        page: 1,
      };
    });
  }, []);

  const toggleSubcategory = useCallback((subcategory: string) => {
    setFilters((prev) => {
      const current = prev.subcategories || [];
      const updated = current.includes(subcategory)
        ? current.filter((s) => s !== subcategory)
        : [...current, subcategory];
      return { ...prev, subcategories: updated, page: 1 };
    });
  }, []);

  const toggleRole = useCallback((role: string) => {
    setFilters((prev) => {
      const current = prev.roles || [];
      const updated = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, roles: updated, page: 1 };
    });
  }, []);

  const toggleCity = useCallback((city: string) => {
    setFilters((prev) => {
      const current = prev.cities || [];
      const updated = current.includes(city)
        ? current.filter((c) => c !== city)
        : [...current, city];
      return { ...prev, cities: updated, page: 1 };
    });
  }, []);

  const toggleTradeLane = useCallback((lane: string) => {
    setFilters((prev) => {
      const current = prev.tradeLanes || [];
      const updated = current.includes(lane)
        ? current.filter((l) => l !== lane)
        : [...current, lane];
      return { ...prev, tradeLanes: updated, page: 1 };
    });
  }, []);

  const toggleTransportMode = useCallback((mode: TransportMode) => {
    setFilters((prev) => {
      const current = prev.transportModes || [];
      const updated = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { ...prev, transportModes: updated, page: 1 };
    });
  }, []);

  const toggleContactStatus = useCallback((status: string) => {
    setFilters((prev) => {
      const current = prev.contactStatus || [];
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, contactStatus: updated, page: 1 };
    });
  }, []);

  const toggleApproachStatus = useCallback((status: string) => {
    setFilters((prev) => {
      const current = prev.approachStatuses || [];
      const updated = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return { ...prev, approachStatuses: updated, page: 1 };
    });
  }, []);

  const setApproachStatuses = useCallback((statuses: string[]) => {
    setFilters((prev) => ({
      ...prev,
      approachStatuses: statuses,
      page: 1,
    }));
  }, []);

  const toggleHasDirectors = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      hasDirectors: !prev.hasDirectors,
      page: 1,
    }));
  }, []);

  const setMinShipments = useCallback((minShipments: number) => {
    setFilters((prev) => ({ ...prev, minShipments, page: 1 }));
  }, []);

  const setMinTradedValueUsd = useCallback((minTradedValueUsd: number) => {
    setFilters((prev) => ({ ...prev, minTradedValueUsd, page: 1 }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters((prev) => ({
      dataset: prev.dataset || 'valid',
      tab: 'all',
      page: 1,
      limit: 25,
      countries: [],
      transportModes: [],
      categories: [],
      subcategories: [],
      roles: [],
      cities: [],
      tradeLanes: [],
      contactStatus: [],
      approachStatuses: [],
      minShipments: 0,
      minTradedValueUsd: 0,
      hasDirectors: false,
      q: undefined,
    }));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.countries && filters.countries.length > 0) count += filters.countries.length;
    if (filters.transportModes && filters.transportModes.length > 0) count += filters.transportModes.length;
    if (filters.categories && filters.categories.length > 0) count += filters.categories.length;
    if (filters.subcategories && filters.subcategories.length > 0) count += filters.subcategories.length;
    if (filters.roles && filters.roles.length > 0) count += filters.roles.length;
    if (filters.cities && filters.cities.length > 0) count += filters.cities.length;
    if (filters.tradeLanes && filters.tradeLanes.length > 0) count += filters.tradeLanes.length;
    if (filters.contactStatus && filters.contactStatus.length > 0) count += filters.contactStatus.length;
    if (filters.approachStatuses && filters.approachStatuses.length > 0) count += filters.approachStatuses.length;
    if (filters.hasDirectors) count += 1;
    if (filters.minShipments && filters.minShipments > 0) count += 1;
    if (filters.minTradedValueUsd && filters.minTradedValueUsd > 0) count += 1;
    if (filters.q) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    setDataset,
    setTab,
    setSearch,
    setPage,
    setLimit,
    toggleCountry,
    onRemoveCountry: toggleCountry,
    toggleTransportMode,
    toggleCategory,
    toggleSubcategory,
    toggleRole,
    toggleCity,
    toggleTradeLane,
    toggleContactStatus,
    toggleApproachStatus,
    setApproachStatuses,
    toggleHasDirectors,
    setMinShipments,
    setMinTradedValueUsd,
    clearAllFilters,
    activeFilterCount,
  };
}
