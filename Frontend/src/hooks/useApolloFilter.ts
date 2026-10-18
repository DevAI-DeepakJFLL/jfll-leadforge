import { useState, useCallback, useMemo } from 'react';
import { ApolloFilterParams, ApolloAudienceTab } from '@/types/apolloLead';

export function useApolloFilter(initialParams: ApolloFilterParams = {}) {
  const [filters, setFilters] = useState<ApolloFilterParams>({
    tab: 'all',
    page: 1,
    limit: 25,
    industries: [],
    countries: [],
    employeeTiers: [],
    revenueRanges: [],
    hasWebsite: false,
    hasLinkedin: false,
    ...initialParams,
  });

  const setTab = useCallback((tab: ApolloAudienceTab) => {
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

  const toggleIndustry = useCallback((industry: string) => {
    setFilters((prev) => {
      const current = prev.industries || [];
      const updated = current.includes(industry)
        ? current.filter((i) => i !== industry)
        : [...current, industry];
      return { ...prev, industries: updated, page: 1 };
    });
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setFilters((prev) => {
      const current = prev.countries || [];
      const updated = current.includes(country)
        ? current.filter((c) => c !== country)
        : [...current, country];
      return { ...prev, countries: updated, page: 1 };
    });
  }, []);

  const toggleEmployeeTier = useCallback((tierId: string) => {
    setFilters((prev) => {
      const current = prev.employeeTiers || [];
      const updated = current.includes(tierId)
        ? current.filter((t) => t !== tierId)
        : [...current, tierId];
      return { ...prev, employeeTiers: updated, page: 1 };
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

  const toggleHasWebsite = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      hasWebsite: !prev.hasWebsite,
      page: 1,
    }));
  }, []);

  const toggleHasLinkedin = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      hasLinkedin: !prev.hasLinkedin,
      page: 1,
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters((prev) => ({
      tab: prev.tab || 'all',
      page: 1,
      limit: prev.limit || 25,
      industries: [],
      countries: [],
      employeeTiers: [],
      revenueRanges: [],
      hasWebsite: false,
      hasLinkedin: false,
      q: undefined,
    }));
  }, []);

  const clearCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const next = { ...prev, page: 1 };
      if (category === 'industries') next.industries = [];
      if (category === 'countries') next.countries = [];
      if (category === 'employeeTiers') next.employeeTiers = [];
      if (category === 'revenueRanges') next.revenueRanges = [];
      if (category === 'channels') {
        next.hasWebsite = false;
        next.hasLinkedin = false;
      }
      return next;
    });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.industries && filters.industries.length > 0) count += filters.industries.length;
    if (filters.countries && filters.countries.length > 0) count += filters.countries.length;
    if (filters.employeeTiers && filters.employeeTiers.length > 0) count += filters.employeeTiers.length;
    if (filters.revenueRanges && filters.revenueRanges.length > 0) count += filters.revenueRanges.length;
    if (filters.hasWebsite) count += 1;
    if (filters.hasLinkedin) count += 1;
    if (filters.q && filters.q.trim()) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    setTab,
    setSearch,
    setPage,
    setLimit,
    toggleIndustry,
    toggleCountry,
    toggleEmployeeTier,
    toggleRevenueRange,
    toggleHasWebsite,
    toggleHasLinkedin,
    clearAllFilters,
    clearCategory,
    activeFilterCount,
  };
}
