import { useState, useCallback } from 'react';
import { TierAudienceTab, TierFilterParams } from '@/types/tierSegmentation';

export function useTierFilter(initialParams: Partial<TierFilterParams> = {}) {
  const [tab, setTab] = useState<TierAudienceTab>((initialParams.status as TierAudienceTab) || 'all');
  const [search, setSearch] = useState(initialParams.search || '');
  const [page, setPage] = useState(initialParams.page || 1);
  const [pageSize, setPageSize] = useState(initialParams.pageSize || 25);
  const [minScore, setMinScore] = useState<number | undefined>(initialParams.minScore);
  const [maxScore, setMaxScore] = useState<number | undefined>(initialParams.maxScore);

  const handleTabChange = useCallback((newTab: TierAudienceTab) => {
    setTab(newTab);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  const handleScoreRangeChange = useCallback((min?: number, max?: number) => {
    setMinScore(min);
    setMaxScore(max);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setTab('all');
    setSearch('');
    setPage(1);
    setMinScore(undefined);
    setMaxScore(undefined);
  }, []);

  const filterParams: TierFilterParams = {
    status: tab === 'all' ? undefined : tab,
    search: search.trim() || undefined,
    minScore,
    maxScore,
    page,
    pageSize,
  };

  return {
    tab,
    search,
    page,
    pageSize,
    minScore,
    maxScore,
    filterParams,
    setTab: handleTabChange,
    setSearch: handleSearchChange,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    setScoreRange: handleScoreRangeChange,
    resetFilters,
  };
}
