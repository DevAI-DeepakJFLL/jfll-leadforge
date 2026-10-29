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
    creditStatuses: [],
    salesPersons: [],
    revenueRanges: [],
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
      creditStatuses: [],
      salesPersons: [],
      revenueRanges: [],
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

  const toggleCreditStatus = useCallback((creditStatus: string) => {
    setFilters((prev) => {
      const current = prev.creditStatuses || [];
      const updated = current.includes(creditStatus)
        ? current.filter((c) => c !== creditStatus)
        : [...current, creditStatus];
      return { ...prev, creditStatuses: updated, page: 1 };
    });
  }, []);

  const toggleSalesPerson = useCallback((salesPerson: string) => {
    setFilters((prev) => {
      const current = prev.salesPersons || [];
      const updated = current.includes(salesPerson)
        ? current.filter((s) => s !== salesPerson)
        : [...current, salesPerson];
      return { ...prev, salesPersons: updated, page: 1 };
    });
  }, []);

  const toggleRevenueRange = useCallback((rangeId: string) => {
    setFilters((prev) => {
      const current = prev.revenueRanges || [];
      const updated = current.includes(rangeId)
        ? current.filter((r) => r !== rangeId)
        : [...current, rangeId];
      return { ...prev, revenueRanges: updated, page: 1 };
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
      creditStatuses: [],
      salesPersons: [],
      revenueRanges: [],
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
    if (filters.creditStatuses && filters.creditStatuses.length > 0) {
      count += filters.creditStatuses.length;
    }
    if (filters.salesPersons && filters.salesPersons.length > 0) {
      count += filters.salesPersons.length;
    }
    if (filters.revenueRanges && filters.revenueRanges.length > 0) {
      count += filters.revenueRanges.length;
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
    toggleCreditStatus,
    toggleSalesPerson,
    toggleRevenueRange,
    toggleContactOption,
    clearAllFilters,
    activeFilterCount,
  };
}
