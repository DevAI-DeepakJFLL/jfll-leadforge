import { useState, useCallback, useMemo } from 'react';
import { JfllCustomerFilterParams, JfllCustomerSortField } from '@/types/jfllCustomer';
import { toggleArrayItem } from '@/utils/formatters';

export function useJfllCustomersFilter(initialParams: JfllCustomerFilterParams = {}) {
  const [filters, setFilters] = useState<JfllCustomerFilterParams>({
    customerStatus: 'all',
    tab: 'all',
    page: 1,
    limit: 25,
    sortBy: 'fullName',
    sortOrder: 'asc',
    customerGroups: [],
    types: [],
    creditStatuses: [],
    salesPersons: [],
    revenueRanges: [],
    approachStatuses: [],
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
      approachStatuses: customerStatus === 'active' ? [] : prev.approachStatuses,
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
    setFilters((prev) => ({
      ...prev,
      customerGroups: toggleArrayItem(prev.customerGroups, group),
      page: 1,
    }));
  }, []);

  const toggleType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: toggleArrayItem(prev.types, type),
      page: 1,
    }));
  }, []);

  const toggleCreditStatus = useCallback((creditStatus: string) => {
    setFilters((prev) => ({
      ...prev,
      creditStatuses: toggleArrayItem(prev.creditStatuses, creditStatus),
      page: 1,
    }));
  }, []);

  const toggleSalesPerson = useCallback((salesPerson: string) => {
    setFilters((prev) => ({
      ...prev,
      salesPersons: toggleArrayItem(prev.salesPersons, salesPerson),
      page: 1,
    }));
  }, []);

  const toggleRevenueRange = useCallback((rangeId: string) => {
    setFilters((prev) => ({
      ...prev,
      revenueRanges: toggleArrayItem(prev.revenueRanges, rangeId),
      page: 1,
    }));
  }, []);

  const handleSortChange = useCallback((field: JfllCustomerSortField) => {
    setFilters((prev) => {
      const isSameField = prev.sortBy === field;
      let newOrder: 'asc' | 'desc';
      if (isSameField) {
        newOrder = prev.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        // Salesperson optimization: revenue defaults to descending (highest business first)
        newOrder = (field === 'businessLast3m' || field === 'totalBusinessTillDate') ? 'desc' : 'asc';
      }
      return {
        ...prev,
        sortBy: field,
        sortOrder: newOrder,
        page: 1,
      };
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

  const toggleApproachStatus = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      approachStatuses: toggleArrayItem(prev.approachStatuses, status),
      page: 1,
    }));
  }, []);

  const setApproachStatuses = useCallback((statuses: string[]) => {
    setFilters((prev) => ({
      ...prev,
      approachStatuses: statuses,
      page: 1,
    }));
  }, []);

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
      approachStatuses: [],
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
    if (
      filters.customerStatus !== 'active' &&
      filters.approachStatuses &&
      filters.approachStatuses.length > 0
    ) {
      count += filters.approachStatuses.length;
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
    toggleApproachStatus,
    setApproachStatuses,
    toggleContactOption,
    handleSortChange,
    clearAllFilters,
    activeFilterCount,
  };
}
