import { useState, useCallback, useMemo } from 'react';
import {
  DatamyneFilterParams,
  DatamyneDatasetType,
  DatamyneAudienceTab,
  TransportMode,
} from '@/types/datamyneLead';

export function useDatamyneFilter(initialParams: DatamyneFilterParams = {}) {
  const [filters, setFilters] = useState<DatamyneFilterParams>({
    dataset: 'valid',
    tab: 'all',
    page: 1,
    limit: 25,
    transportModes: [],
    categories: [],
    subcategories: [],
    roles: [],
    cities: [],
    tradeLanes: [],
    contactStatus: [],
    minShipments: 0,
    minTradedValueUsd: 0,
    hasDirectors: false,
    ...initialParams,
  });

  const setDataset = useCallback((dataset: DatamyneDatasetType) => {
    setFilters((prev) => ({ ...prev, dataset, page: 1 }));
  }, []);

  const setTab = useCallback((tab: DatamyneAudienceTab) => {
    setFilters((prev) => ({ ...prev, tab, page: 1 }));
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

  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const current = prev.categories || [];
      const updated = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...prev, categories: updated, page: 1 };
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
      transportModes: [],
      categories: [],
      subcategories: [],
      roles: [],
      cities: [],
      tradeLanes: [],
      contactStatus: [],
      minShipments: 0,
      minTradedValueUsd: 0,
      hasDirectors: false,
      q: undefined,
    }));
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.transportModes && filters.transportModes.length > 0) count += filters.transportModes.length;
    if (filters.categories && filters.categories.length > 0) count += filters.categories.length;
    if (filters.subcategories && filters.subcategories.length > 0) count += filters.subcategories.length;
    if (filters.roles && filters.roles.length > 0) count += filters.roles.length;
    if (filters.cities && filters.cities.length > 0) count += filters.cities.length;
    if (filters.tradeLanes && filters.tradeLanes.length > 0) count += filters.tradeLanes.length;
    if (filters.contactStatus && filters.contactStatus.length > 0) count += filters.contactStatus.length;
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
    toggleTransportMode,
    toggleCategory,
    toggleSubcategory,
    toggleRole,
    toggleCity,
    toggleTradeLane,
    toggleContactStatus,
    toggleHasDirectors,
    setMinShipments,
    setMinTradedValueUsd,
    clearAllFilters,
    activeFilterCount,
  };
}
