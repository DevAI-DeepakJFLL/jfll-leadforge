import { useState, useCallback, useMemo } from 'react';
import { JfllCustomerFilterParams } from '@/types/jfllCustomer';

export function useJfllCustomersFilter(initialParams: JfllCustomerFilterParams = {}) {
  const [filters, setFilters] = useState<JfllCustomerFilterParams>({
    customerStatus: 'all',
    tab: 'all',
    page: 1,
    limit: 25,
    customerGroups: [],
    types: [],
    hasPhone: false,
    hasEmail: false,
    hasContactPerson: false,
    ...initialParams,
  });

  const setCustomerStatus = useCallback((customerStatus: 'active' | 'inactive' | 'all') => {
    setFilters((prev) => ({
      ...prev,
      customerStatus,
      tab: 'all',
      page: 1,
      customerGroups: [],
      types: [],
    }));
  }, []);

  const setSearch = useCallback((q: string) => {
    setFilters((prev) => ({ ...prev, q: q || undefined, page: 1 }));
  }, []);

  const setTab = useCallback((tab: JfllCustomerFilterParams['tab']) => {
    setFilters((prev) => ({ ...prev, tab, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const toggleCustomerGroup = useCallback((group: string) => {
    setFilters((prev) => {
      const current = prev.customerGroups || [];
      const updated = current.includes(group)
        ? current.filter((g) => g !== group)
        : [...current, group];
      return { ...prev, customerGroups: updated, page: 1 };
    });
  }, []);

  const toggleType = useCallback((type: string) => {
    setFilters((prev) => {
      const current = prev.types || [];
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, types: updated, page: 1 };
    });
  }, []);

  const toggleContactOption = useCallback(
    (key: 'hasPhone' | 'hasEmail' | 'hasContactPerson') => {
      setFilters((prev) => ({
        ...prev,
        [key]: !prev[key],
        page: 1,
      }));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setFilters({
      tab: 'all',
      page: 1,
      limit: 25,
      customerGroups: [],
      types: [],
      hasPhone: false,
      hasEmail: false,
      hasContactPerson: false,
      q: undefined,
    });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.customerGroups && filters.customerGroups.length > 0) {
      count += filters.customerGroups.length;
    }
    if (filters.types && filters.types.length > 0) {
      count += filters.types.length;
    }
    if (filters.hasPhone) count += 1;
    if (filters.hasEmail) count += 1;
    if (filters.hasContactPerson) count += 1;
    if (filters.q) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    setSearch,
    setTab,
    setCustomerStatus,
    setPage,
    setLimit,
    toggleCustomerGroup,
    toggleType,
    toggleContactOption,
    clearAllFilters,
    activeFilterCount,
  };
}
