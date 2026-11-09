import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SlimHeader, getBreadcrumbInfo } from '@/components/layout/SlimHeader';
import { UserSession } from '@/types/auth';

/**
 * Lightweight React component execution runner to extract JSX tree and test hooks
 * in Node/Vitest test environment.
 */
function renderComponent<P>(Component: React.FC<P>, props: P) {
  let hookIndex = 0;
  const hooks: any[] = [];
  const dispatcher = {
    useState<S>(initialState: S | (() => S)): [S, (action: S | ((prevState: S) => S)) => void] {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initialState === 'function' ? (initialState as () => S)() : initialState;
      }
      return [hooks[idx], () => {}];
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
    useContext<T>(context: any): T {
      return (context?._currentValue as T) || ({ showToast: () => {} } as unknown as T);
    },
  };

  const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
  reactInternals.ReactCurrentDispatcher.current = dispatcher;
  try {
    return Component(props);
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

describe('SlimHeader Component Suite', () => {
  const mockUser: UserSession = {
    name: 'Deepak Naidu',
    email: 'deepak@jfll.com',
    role: 'Tech Lead',
    token: 'mock-jwt-token',
  };

  describe('1. Breadcrumbs Dynamic Rendering', () => {
    it('renders breadcrumb for jfll-customers with Data Pools, JFLL Customers, badge 2.7k and chevron', () => {
      const html = renderToString(
        <SlimHeader activeTab="jfll-customers" />
      );

      expect(html).toContain('Data Pools');
      expect(html).toContain('/');
      expect(html).toContain('JFLL Customers');
      expect(html).toContain('2.7k');
      expect(html).toContain('aria-current="page"');
    });

    it('renders breadcrumb for datamyne with Data Pools, DataMyne Leads, and badge 37.3k', () => {
      const html = renderToString(
        <SlimHeader activeTab="datamyne" />
      );

      expect(html).toContain('Data Pools');
      expect(html).toContain('/');
      expect(html).toContain('DataMyne Leads');
      expect(html).toContain('37.3k');
      expect(html).toContain('aria-current="page"');
    });

    it('renders breadcrumb for apollo with Data Pools, Apollo Leads, and badge 1.45M', () => {
      const html = renderToString(
        <SlimHeader activeTab="apollo" />
      );

      expect(html).toContain('Data Pools');
      expect(html).toContain('/');
      expect(html).toContain('Apollo Leads');
      expect(html).toContain('1.45M');
      expect(html).toContain('aria-current="page"');
    });

    it('renders breadcrumb for sub-tabs companies and people mapped to Apollo Leads', () => {
      const htmlCompanies = renderToString(
        <SlimHeader activeTab="companies" />
      );
      expect(htmlCompanies).toContain('Apollo Leads');
      expect(htmlCompanies).toContain('1.45M');

      const htmlPeople = renderToString(
        <SlimHeader activeTab="people" />
      );
      expect(htmlPeople).toContain('Apollo Leads');
      expect(htmlPeople).toContain('1.45M');
    });

    it('renders breadcrumb for report under Outreach & Views without record badge', () => {
      const html = renderToString(
        <SlimHeader activeTab="report" />
      );

      expect(html).toContain('Outreach &amp; Views');
      expect(html).toContain('/');
      expect(html).toContain('Client Reports');
      expect(html).toContain('aria-current="page"');
      // No badge for report
      expect(html).not.toContain('37.3k');
      expect(html).not.toContain('2.7k');
    });

    it('renders breadcrumb for saved-searches and saved-lists', () => {
      const htmlSearches = renderToString(
        <SlimHeader activeTab="saved-searches" />
      );
      expect(htmlSearches).toContain('Outreach &amp; Views');
      expect(htmlSearches).toContain('Saved Searches');

      const htmlLists = renderToString(
        <SlimHeader activeTab="saved-lists" />
      );
      expect(htmlLists).toContain('Outreach &amp; Views');
      expect(htmlLists).toContain('Saved Lists');
    });

    it('renders breadcrumb for accounts under Accounts & Master', () => {
      const html = renderToString(
        <SlimHeader activeTab="accounts" />
      );
      expect(html).toContain('Accounts &amp; Master');
      expect(html).toContain('Accounts');
    });

    it('gracefully formats unmapped/fallback tabs', () => {
      const info = getBreadcrumbInfo('custom-analytics-view');
      expect(info.section).toBe('Data Pools');
      expect(info.title).toBe('Custom Analytics View');

      const html = renderToString(
        <SlimHeader activeTab="custom-analytics-view" />
      );
      expect(html).toContain('Custom Analytics View');
    });
  });

  describe('2. Filter Toggle Button & Active Filter Count', () => {
    it('displays active filter count badge when activeFilterCount > 0', () => {
      const html = renderToString(
        <SlimHeader activeFilterCount={4} isFilterOpen={false} />
      );

      expect(html).toContain('Filters');
      expect(html).toContain('4');
      expect(html).toContain('aria-label="Toggle filters (4 active)"');
    });

    it('does not display filter count badge when activeFilterCount is 0 or undefined', () => {
      const htmlZero = renderToString(
        <SlimHeader activeFilterCount={0} />
      );
      expect(htmlZero).toContain('Filters');
      expect(htmlZero).not.toContain('active filters');

      const htmlUndefined = renderToString(
        <SlimHeader />
      );
      expect(htmlUndefined).toContain('Filters');
      expect(htmlUndefined).not.toContain('active filters');
    });

    it('applies active highlight styling and aria-pressed when isFilterOpen is true', () => {
      const htmlOpen = renderToString(
        <SlimHeader isFilterOpen={true} />
      );
      expect(htmlOpen).toContain('aria-pressed="true"');
      expect(htmlOpen).toContain('bg-apollo/10');
      expect(htmlOpen).toContain('text-apollo');

      const htmlClosed = renderToString(
        <SlimHeader isFilterOpen={false} />
      );
      expect(htmlClosed).toContain('aria-pressed="false"');
      expect(htmlClosed).toContain('bg-white');
    });

    it('triggers onToggleFilter callback when filter button is clicked', () => {
      const onToggleFilter = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        onToggleFilter,
        isFilterOpen: false,
        activeFilterCount: 2,
      });

      const filterBtn = findElement(vdom, (el) =>
        Boolean(el.props['aria-label']?.includes('Toggle filters'))
      );
      expect(filterBtn).toBeTruthy();
      filterBtn!.props.onClick();
      expect(onToggleFilter).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Search Input & Enter Submission', () => {
    it('renders search input with placeholder, initial query, and aria-label', () => {
      const html = renderToString(
        <SlimHeader searchQuery="Pharma Exports" />
      );

      expect(html).toContain('placeholder="Quick search leads... (⌘K)"');
      expect(html).toContain('aria-label="Quick search leads"');
      expect(html).toContain('value="Pharma Exports"');
      expect(html).toContain('aria-label="Clear search"');
    });

    it('triggers onSearchChange callback when user types in search input', () => {
      const onSearchChange = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        searchQuery: '',
        onSearchChange,
      });

      const input = findElement(vdom, (el) => el.type === 'input');
      expect(input).toBeTruthy();
      input!.props.onChange({ target: { value: 'Mumbai Cargo' } });
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith('Mumbai Cargo');
    });

    it('triggers onSearchSubmit callback on Enter key with current search query', () => {
      const onSearchSubmit = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        searchQuery: 'Perishables',
        onSearchSubmit,
      });

      const input = findElement(vdom, (el) => el.type === 'input');
      expect(input).toBeTruthy();

      const preventDefault = vi.fn();
      input!.props.onKeyDown({ key: 'Enter', preventDefault });
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onSearchSubmit).toHaveBeenCalledTimes(1);
      expect(onSearchSubmit).toHaveBeenCalledWith('Perishables');
    });

    it('does not trigger onSearchSubmit on other keys', () => {
      const onSearchSubmit = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        searchQuery: 'Electronics',
        onSearchSubmit,
      });

      const input = findElement(vdom, (el) => el.type === 'input');
      expect(input).toBeTruthy();

      const preventDefault = vi.fn();
      input!.props.onKeyDown({ key: 'ArrowDown', preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
      expect(onSearchSubmit).not.toHaveBeenCalled();
    });

    it('clears search when clear button is clicked', () => {
      const onSearchChange = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        searchQuery: 'Auto Parts',
        onSearchChange,
      });

      const clearBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Clear search'
      );
      expect(clearBtn).toBeTruthy();
      clearBtn!.props.onClick();
      expect(onSearchChange).toHaveBeenCalledWith('');
    });

    it('clears search on Escape key inside input', () => {
      const onSearchChange = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        searchQuery: 'Textiles',
        onSearchChange,
      });

      const input = findElement(vdom, (el) => el.type === 'input');
      expect(input).toBeTruthy();

      const preventDefault = vi.fn();
      input!.props.onKeyDown({ key: 'Escape', preventDefault });
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('4. Mobile Sidebar Toggle Button', () => {
    it('renders mobile hamburger toggle button with md:hidden and aria-label', () => {
      const html = renderToString(
        <SlimHeader />
      );

      expect(html).toContain('md:hidden');
      expect(html).toContain('aria-label="Toggle navigation menu"');
      expect(html).toContain('title="Toggle navigation menu"');
    });

    it('triggers onToggleSidebar when mobile hamburger button is clicked', () => {
      const onToggleSidebar = vi.fn();
      const vdom = renderComponent(SlimHeader, {
        onToggleSidebar,
        isSidebarCollapsed: false,
      });

      const toggleBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Toggle navigation menu'
      );
      expect(toggleBtn).toBeTruthy();
      toggleBtn!.props.onClick();
      expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('reflects isSidebarCollapsed status in aria-expanded attribute', () => {
      const vdomCollapsed = renderComponent(SlimHeader, {
        isSidebarCollapsed: true,
      });
      const btnCollapsed = findElement(
        vdomCollapsed,
        (el) => el.props['aria-label'] === 'Toggle navigation menu'
      );
      expect(btnCollapsed!.props['aria-expanded']).toBe(false);

      const vdomExpanded = renderComponent(SlimHeader, {
        isSidebarCollapsed: false,
      });
      const btnExpanded = findElement(
        vdomExpanded,
        (el) => el.props['aria-label'] === 'Toggle navigation menu'
      );
      expect(btnExpanded!.props['aria-expanded']).toBe(true);
    });
  });

  describe('5. Keyboard Navigation, ARIA Attributes & Touch Targets', () => {
    it('conforms to WAI-ARIA breadcrumb structure with nav and ol', () => {
      const html = renderToString(
        <SlimHeader activeTab="datamyne" />
      );

      expect(html).toContain('<nav aria-label="Breadcrumb"');
      expect(html).toContain('<ol');
      expect(html).toContain('aria-current="page"');
    });

    it('enforces touch targets >= 44x44px on interactive controls', () => {
      const vdom = renderComponent(SlimHeader, {
        searchQuery: 'Test',
        activeFilterCount: 1,
      });

      // 1. Mobile hamburger toggle button
      const menuBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Toggle navigation menu'
      );
      expect(menuBtn).toBeTruthy();
      expect(menuBtn!.props.className).toContain('min-h-[44px]');
      expect(menuBtn!.props.className).toContain('min-w-[44px]');

      // 2. Filter toggle button
      const filterBtn = findElement(
        vdom,
        (el) => Boolean(el.props['aria-label']?.includes('Toggle filters'))
      );
      expect(filterBtn).toBeTruthy();
      expect(filterBtn!.props.className).toContain('min-h-[44px]');
      expect(filterBtn!.props.className).toContain('min-w-[44px]');

      // 3. Clear search button
      const clearBtn = findElement(
        vdom,
        (el) => el.props['aria-label'] === 'Clear search'
      );
      expect(clearBtn).toBeTruthy();
      expect(clearBtn!.props.className).toContain('min-h-[44px]');
      expect(clearBtn!.props.className).toContain('min-w-[44px]');
    });

    it('maintains sleek 48px header styling (h-12) with white background and border', () => {
      const html = renderToString(
        <SlimHeader className="custom-test-class" currentUser={mockUser} />
      );

      expect(html).toContain('h-12');
      expect(html).toContain('bg-white');
      expect(html).toContain('border-b border-slate-200/90');
      expect(html).toContain('custom-test-class');
    });
  });
});
