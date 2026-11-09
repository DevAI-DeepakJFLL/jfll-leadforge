import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { DatamyneActionBar } from '@/components/datamyne/DatamyneActionBar';
import { JfllCustomerActionBar } from '@/components/jfll/JfllCustomerActionBar';
import { DatamyneView } from '@/components/views/DatamyneView';
import { JfllCustomersView } from '@/components/views/JfllCustomersView';
import { DatamyneResponse } from '@/types/datamyneLead';
import { JfllCustomersResponse } from '@/types/jfllCustomer';

/**
 * Lightweight React component runner for executing functional components with hooks in tests.
 */
function renderComponent<P>(Component: React.FC<P>, props: P): React.ReactElement {
  let hookIndex = 0;
  const hooks: any[] = [];
  const dispatcher = {
    useState<S>(initialState: S | (() => S)): [S, (action: S | ((prevState: S) => S)) => void] {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initialState === 'function' ? (initialState as () => S)() : initialState;
      }
      const setState = (action: S | ((prevState: S) => S)) => {
        hooks[idx] = typeof action === 'function' ? (action as (prev: S) => S)(hooks[idx]) : action;
      };
      return [hooks[idx], setState];
    },
    useRef<T>(initialValue: T): { current: T } {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = { current: initialValue };
      }
      return hooks[idx];
    },
    useEffect() {},
    useCallback<T extends Function>(callback: T): T {
      return callback;
    },
    useMemo<T>(factory: () => T): T {
      return factory();
    },
    useContext() {
      return {};
    },
  };

  hookIndex = 0;
  const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
  reactInternals.ReactCurrentDispatcher.current = dispatcher;
  try {
    return Component(props) as React.ReactElement;
  } finally {
    reactInternals.ReactCurrentDispatcher.current = prevDispatcher;
  }
}

/**
 * Traverses a ReactElement tree to locate elements matching a predicate.
 */
function findElements(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean,
  results: React.ReactElement[] = []
): React.ReactElement[] {
  if (!node) return results;
  if (React.isValidElement(node)) {
    if (predicate(node)) {
      results.push(node);
    }
    findElements(node.props.children, predicate, results);
  } else if (Array.isArray(node)) {
    for (const item of node) {
      findElements(item, predicate, results);
    }
  }
  return results;
}

function findElement(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean
): React.ReactElement | null {
  const matches = findElements(node, predicate);
  return matches.length > 0 ? matches[0] : null;
}

describe('Collapsible Desktop Filter Panel Suite', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockDatamyneQuery: DatamyneResponse = {
    items: [],
    totalEstimate: 0,
    totalFormatted: '0',
    page: 1,
    limit: 25,
    totalPages: 0,
    audienceCounts: {
      all: 0,
      perishables: 0,
      pharma: 0,
      textiles: 0,
      engineering: 0,
      chemicals: 0,
      electronics: 0,
      automotive: 0,
      general: 0,
      validTotal: 0,
      missingTotal: 0,
    },
    datasetCounts: {
      valid: 0,
      missing: 0,
      all: 0,
    },
  };

  const mockJfllQuery: JfllCustomersResponse = {
    items: [],
    totalEstimate: 0,
    totalFormatted: '0',
    page: 1,
    limit: 25,
    totalPages: 0,
    audienceCounts: {
      all: 0,
      shippers: 0,
      subagents: 0,
      overseas: 0,
      withContacts: 0,
      activeTotal: 0,
      inactiveTotal: 0,
      allTotal: 0,
    },
  };

  describe('1. DatamyneActionBar Filter Toggle Button', () => {
    it('calls onToggleFilterExpand when clicking filter toggle button', () => {
      const onToggle = vi.fn();
      const vdom = renderComponent(DatamyneActionBar, {
        selectedCount: 0,
        isAllOnPageSelected: false,
        isIndeterminate: false,
        onToggleSelectAllPage: () => {},
        onDeselectAll: () => {},
        onExport: () => {},
        isFilterExpanded: false,
        onToggleFilterExpand: onToggle,
      });

      const toggleBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Expand filters'
      );
      expect(toggleBtn).toBeTruthy();
      toggleBtn!.props.onClick();
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('renders with active highlight when isFilterExpanded is true', () => {
      const html = renderToString(
        <DatamyneActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          isFilterExpanded={true}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('Collapse filters');
      expect(html).toContain('bg-apollo/10');
      expect(html).toContain('border-apollo/30');
      expect(html).toContain('text-apollo');
    });

    it('has minimum touch target >= 44x44px for accessibility', () => {
      const html = renderToString(
        <DatamyneActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');
    });
  });

  describe('2. JfllCustomerActionBar Filter Toggle Button', () => {
    it('calls onToggleFilterExpand when clicking filter toggle button', () => {
      const onToggle = vi.fn();
      const vdom = renderComponent(JfllCustomerActionBar, {
        selectedCount: 0,
        isAllOnPageSelected: false,
        isIndeterminate: false,
        onToggleSelectAllPage: () => {},
        onDeselectAll: () => {},
        onExport: () => {},
        isFilterExpanded: false,
        onToggleFilterExpand: onToggle,
      });

      const toggleBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Expand filters'
      );
      expect(toggleBtn).toBeTruthy();
      toggleBtn!.props.onClick();
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('renders with active highlight when isFilterExpanded is true', () => {
      const html = renderToString(
        <JfllCustomerActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          isFilterExpanded={true}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('Collapse filters');
      expect(html).toContain('bg-apollo/10');
      expect(html).toContain('border-apollo/30');
    });

    it('has minimum touch target >= 44x44px for accessibility', () => {
      const html = renderToString(
        <JfllCustomerActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');
    });
  });

  describe('3. Active Filter Count Badge', () => {
    it('renders active filter count badge when activeFilterCount > 0 in DatamyneActionBar', () => {
      const html = renderToString(
        <DatamyneActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          activeFilterCount={3}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('3 active filters');
      expect(html).toContain('bg-apollo');
    });

    it('does not render filter count badge when activeFilterCount is 0 or undefined in DatamyneActionBar', () => {
      const html = renderToString(
        <DatamyneActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          activeFilterCount={0}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).not.toContain('active filters');
    });

    it('renders active filter count badge when activeFilterCount > 0 in JfllCustomerActionBar', () => {
      const html = renderToString(
        <JfllCustomerActionBar
          selectedCount={0}
          isAllOnPageSelected={false}
          isIndeterminate={false}
          onToggleSelectAllPage={() => {}}
          onDeselectAll={() => {}}
          onExport={() => {}}
          activeFilterCount={4}
          onToggleFilterExpand={() => {}}
        />
      );

      expect(html).toContain('4 active filters');
      expect(html).toContain('bg-apollo');
    });
  });

  describe('4. Desktop Filter Sidebar Visibility in DatamyneView and JfllCustomersView', () => {
    it('hides desktop filter sidebar in DatamyneView when isFilterExpanded is false', () => {
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <DatamyneView
              filters={{}}
              query={mockDatamyneQuery}
              rowSelection={{}}
              onRowSelectionChange={() => {}}
              selectedCount={0}
              isAllOnPageSelected={false}
              isSomeOnPageSelected={false}
              onToggleSelectAllPage={() => {}}
              onDeselectAll={() => {}}
              onExport={() => {}}
              isExporting={false}
              onSearchChange={() => {}}
              onDatasetChange={() => {}}
              onTabChange={() => {}}
              onPageChange={() => {}}
              toggleTransportMode={() => {}}
              toggleCategory={() => {}}
              toggleSubcategory={() => {}}
              toggleRole={() => {}}
              toggleCity={() => {}}
              toggleTradeLane={() => {}}
              toggleContactStatus={() => {}}
              toggleHasDirectors={() => {}}
              setMinShipments={() => {}}
              setMinTradedValueUsd={() => {}}
              clearAllFilters={() => {}}
              activeFilterCount={0}
              onLeadClick={() => {}}
              isMobileOpen={false}
              onCloseMobile={() => {}}
              isFilterExpanded={false}
            />
          </ToastProvider>
        </QueryClientProvider>
      );

      // Desktop sidebar aside should not be rendered
      expect(html).not.toContain('aria-label="DataMyne Filters Sidebar"');
    });

    it('shows desktop filter sidebar in DatamyneView when isFilterExpanded is true', () => {
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <DatamyneView
              filters={{}}
              query={mockDatamyneQuery}
              rowSelection={{}}
              onRowSelectionChange={() => {}}
              selectedCount={0}
              isAllOnPageSelected={false}
              isSomeOnPageSelected={false}
              onToggleSelectAllPage={() => {}}
              onDeselectAll={() => {}}
              onExport={() => {}}
              isExporting={false}
              onSearchChange={() => {}}
              onDatasetChange={() => {}}
              onTabChange={() => {}}
              onPageChange={() => {}}
              toggleTransportMode={() => {}}
              toggleCategory={() => {}}
              toggleSubcategory={() => {}}
              toggleRole={() => {}}
              toggleCity={() => {}}
              toggleTradeLane={() => {}}
              toggleContactStatus={() => {}}
              toggleHasDirectors={() => {}}
              setMinShipments={() => {}}
              setMinTradedValueUsd={() => {}}
              clearAllFilters={() => {}}
              activeFilterCount={0}
              onLeadClick={() => {}}
              isMobileOpen={false}
              onCloseMobile={() => {}}
              isFilterExpanded={true}
            />
          </ToastProvider>
        </QueryClientProvider>
      );

      // Desktop sidebar aside should be rendered with lg:flex class
      expect(html).toContain('aria-label="DataMyne Filters Sidebar"');
      expect(html).toContain('hidden lg:flex');
    });

    it('continues rendering mobile off-canvas drawer in DatamyneView when isMobileOpen is true even if isFilterExpanded is false', () => {
      const html = renderToString(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <DatamyneView
              filters={{}}
              query={mockDatamyneQuery}
              rowSelection={{}}
              onRowSelectionChange={() => {}}
              selectedCount={0}
              isAllOnPageSelected={false}
              isSomeOnPageSelected={false}
              onToggleSelectAllPage={() => {}}
              onDeselectAll={() => {}}
              onExport={() => {}}
              isExporting={false}
              onSearchChange={() => {}}
              onDatasetChange={() => {}}
              onTabChange={() => {}}
              onPageChange={() => {}}
              toggleTransportMode={() => {}}
              toggleCategory={() => {}}
              toggleSubcategory={() => {}}
              toggleRole={() => {}}
              toggleCity={() => {}}
              toggleTradeLane={() => {}}
              toggleContactStatus={() => {}}
              toggleHasDirectors={() => {}}
              setMinShipments={() => {}}
              setMinTradedValueUsd={() => {}}
              clearAllFilters={() => {}}
              activeFilterCount={0}
              onLeadClick={() => {}}
              isMobileOpen={true}
              onCloseMobile={() => {}}
              isFilterExpanded={false}
            />
          </ToastProvider>
        </QueryClientProvider>
      );

      // Desktop sidebar should not be rendered
      expect(html).not.toContain('aria-label="DataMyne Filters Sidebar"');
      // Mobile drawer should be rendered
      expect(html).toContain('DataMyne Filters');
      expect(html).toContain('Close filters');
    });

    it('hides desktop filter sidebar in JfllCustomersView when isFilterExpanded is false', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomersView
            filters={{}}
            query={mockJfllQuery}
            isLoading={false}
            isError={false}
            refetch={() => {}}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            selectedCount={0}
            isAllOnPageSelected={false}
            isSomeOnPageSelected={false}
            onToggleSelectAllPage={() => {}}
            onDeselectAll={() => {}}
            onExport={() => {}}
            isExporting={false}
            onSearchChange={() => {}}
            onCustomerStatusChange={() => {}}
            onTabChange={() => {}}
            onPageChange={() => {}}
            toggleCustomerGroup={() => {}}
            toggleType={() => {}}
            toggleCreditStatus={() => {}}
            toggleSalesPerson={() => {}}
            toggleRevenueRange={() => {}}
            toggleContactOption={() => {}}
            clearAllFilters={() => {}}
            onCustomerClick={() => {}}
            isMobileOpen={false}
            onCloseMobile={() => {}}
            isFilterExpanded={false}
          />
        </ToastProvider>
      );

      // Desktop sidebar aside should not be rendered
      expect(html).not.toContain('aria-label="JFLL Customer Filters Sidebar"');
    });

    it('shows desktop filter sidebar in JfllCustomersView when isFilterExpanded is true', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomersView
            filters={{}}
            query={mockJfllQuery}
            isLoading={false}
            isError={false}
            refetch={() => {}}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            selectedCount={0}
            isAllOnPageSelected={false}
            isSomeOnPageSelected={false}
            onToggleSelectAllPage={() => {}}
            onDeselectAll={() => {}}
            onExport={() => {}}
            isExporting={false}
            onSearchChange={() => {}}
            onCustomerStatusChange={() => {}}
            onTabChange={() => {}}
            onPageChange={() => {}}
            toggleCustomerGroup={() => {}}
            toggleType={() => {}}
            toggleCreditStatus={() => {}}
            toggleSalesPerson={() => {}}
            toggleRevenueRange={() => {}}
            toggleContactOption={() => {}}
            clearAllFilters={() => {}}
            onCustomerClick={() => {}}
            isMobileOpen={false}
            onCloseMobile={() => {}}
            isFilterExpanded={true}
          />
        </ToastProvider>
      );

      // Desktop sidebar aside should be rendered
      expect(html).toContain('aria-label="JFLL Customer Filters Sidebar"');
      expect(html).toContain('hidden lg:flex');
    });
  });
});
