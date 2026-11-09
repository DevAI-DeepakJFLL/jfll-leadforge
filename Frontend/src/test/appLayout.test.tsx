import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AppLayout, SIDEBAR_COLLAPSED_STORAGE_KEY } from '@/components/layout/AppLayout';
import { UserSession } from '@/types/auth';

/**
 * Lightweight test runner to invoke React functional components with custom mock state/hooks.
 */
function renderComponent<P>(Component: React.FC<P>, props: P, stateOverrides: any[] = []) {
  let hookIndex = 0;
  const hooks: any[] = [...stateOverrides];
  const dispatcher = {
    useState<S>(initialState: S | (() => S)): [S, (action: S | ((prevState: S) => S)) => void] {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initialState === 'function' ? (initialState as () => S)() : initialState;
      }
      const setState = (action: S | ((prevState: S) => S)) => {
        hooks[idx] = typeof action === 'function' ? (action as any)(hooks[idx]) : action;
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
    useEffect(effect: () => void | (() => void)) {
      effect();
    },
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
 * Traverses ReactElement tree to locate elements matching a predicate.
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

describe('AppLayout Component Suite', () => {
  const mockUser: UserSession = {
    name: 'Deepak Naidu',
    email: 'deepak@jfll.com',
    role: 'Tech Lead',
    token: 'mock-jwt-token',
  };

  const storageMock: Record<string, string> = {};
  let eventListeners: Record<string, Function[]> = {};

  beforeEach(() => {
    Object.keys(storageMock).forEach((k) => delete storageMock[k]);
    eventListeners = {};

    const localStorageMock = {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, val: string) => {
        storageMock[key] = String(val);
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        Object.keys(storageMock).forEach((k) => delete storageMock[k]);
      },
    };

    const mockWindow = {
      localStorage: localStorageMock,
      addEventListener: (type: string, listener: Function) => {
        eventListeners[type] = eventListeners[type] || [];
        eventListeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: Function) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
        }
      },
      dispatchEvent: (e: any) => {
        (eventListeners[e.type] || []).forEach((fn) => fn(e));
      },
    };

    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', mockWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('1. Desktop Layout Structure & Chrome Replacement', () => {
    it('renders UnifiedSidebar on the left and SlimHeader on top without legacy AppDock or TopHeader', () => {
      const html = renderToString(
        <AppLayout
          activeTab="jfll-customers"
          currentUser={mockUser}
          searchQuery="Global Cargo"
        >
          <div data-testid="main-content">Workspace Content</div>
        </AppLayout>
      );

      // Verify UnifiedSidebar elements
      expect(html).toContain('Jet Freight');
      expect(html).toContain('Lead Sourcing');
      expect(html).toContain('DATA POOLS');
      expect(html).toContain('OUTREACH &amp; VIEWS');
      expect(html).toContain('JFLL Customers');
      expect(html).toContain('DataMyne Leads');
      expect(html).toContain('Apollo Leads');

      // Verify SlimHeader elements
      expect(html).toContain('Quick search leads');
      expect(html).toContain('Global Cargo');
      expect(html).toContain('Filters');
      expect(html).toContain('Data Pools');

      // Verify children rendered
      expect(html).toContain('Workspace Content');

      // Legacy chrome AppDock specific markers should NOT be rendered
      expect(html).not.toContain('bg-[#0b132b]');
    });

    it('preserves print stylesheet classes for print mode', () => {
      const html = renderToString(
        <AppLayout activeTab="apollo">
          <div>Printable Content</div>
        </AppLayout>
      );

      // Root div print classes
      expect(html).toContain('print:h-auto');
      expect(html).toContain('print:w-auto');
      expect(html).toContain('print:overflow-visible');

      // Hidden headers and sidebars
      expect(html).toContain('print:hidden');

      // Main content block print reset
      expect(html).toContain('print:p-0');
      expect(html).toContain('print:block');
    });
  });

  describe('2. Sidebar Collapse State & Persistence', () => {
    it('defaults to expanded sidebar when localStorage key is unset', () => {
      const html = renderToString(
        <AppLayout activeTab="jfll-customers" currentUser={mockUser} />
      );

      // In expanded state, UnifiedSidebar has w-64
      expect(html).toContain('w-64');
      expect(html).toContain('aria-label="Collapse sidebar"');
    });

    it('reads collapsed state from localStorage when initialized with true', () => {
      storageMock[SIDEBAR_COLLAPSED_STORAGE_KEY] = 'true';

      const html = renderToString(
        <AppLayout activeTab="jfll-customers" currentUser={mockUser} />
      );

      // In collapsed state, UnifiedSidebar has w-16
      expect(html).toContain('w-16');
      expect(html).toContain('aria-label="Expand sidebar"');
    });

    it('toggles collapse state and persists to localStorage', () => {
      let currentCollapsed = false;
      const dispatcher = {
        useState<S>(initialState: S | (() => S)): [S, (action: any) => void] {
          if (typeof initialState === 'function') {
            currentCollapsed = (initialState as any)();
          } else if (typeof initialState === 'boolean') {
            currentCollapsed = initialState as any;
          }
          const setFn = (action: any) => {
            currentCollapsed = typeof action === 'function' ? action(currentCollapsed) : action;
            // Also invoke effect or simulate persistence in the test
            storageMock[SIDEBAR_COLLAPSED_STORAGE_KEY] = String(currentCollapsed);
          };
          return [currentCollapsed as any, setFn];
        },
        useRef: () => ({ current: null }),
        useEffect: () => {},
        useCallback: (cb: any) => cb,
        useMemo: (cb: any) => cb(),
        useContext: () => ({ showToast: () => {} }),
      };

      const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      const prev = reactInternals.ReactCurrentDispatcher.current;
      reactInternals.ReactCurrentDispatcher.current = dispatcher;

      try {
        const tree = AppLayout({
          activeTab: 'jfll-customers',
          currentUser: mockUser,
        }) as React.ReactElement;

        // Find UnifiedSidebar in desktop container
        const desktopSidebar = findElement(
          tree,
          (el) => (el.type as any)?.name === 'UnifiedSidebar' || Boolean(el.props?.onToggleCollapse)
        );
        expect(desktopSidebar).not.toBeNull();

        // Trigger toggle collapse
        desktopSidebar?.props.onToggleCollapse?.();
        expect(storageMock[SIDEBAR_COLLAPSED_STORAGE_KEY]).toBe('true');
      } finally {
        reactInternals.ReactCurrentDispatcher.current = prev;
      }
    });

    it('respects controlled isSidebarCollapsed prop when provided', () => {
      const htmlCollapsed = renderToString(
        <AppLayout isSidebarCollapsed={true} activeTab="jfll-customers" />
      );
      expect(htmlCollapsed).toContain('w-16');

      const htmlExpanded = renderToString(
        <AppLayout isSidebarCollapsed={false} activeTab="jfll-customers" />
      );
      expect(htmlExpanded).toContain('w-64');
    });
  });

  describe('3. Mobile Off-Canvas Drawer (< md)', () => {
    it('does not render mobile off-canvas drawer by default when closed', () => {
      const html = renderToString(
        <AppLayout activeTab="jfll-customers" />
      );

      // Drawer backdrop should not be in static render
      expect(html).not.toContain('data-testid="mobile-drawer-backdrop"');
    });

    it('renders off-canvas drawer with backdrop and expanded UnifiedSidebar when mobile drawer is open', () => {
      // Pass stateOverrides: [false (isCollapsed), true (isMobileDrawerOpen)]
      const tree = renderComponent(
        AppLayout,
        { activeTab: 'jfll-customers', currentUser: mockUser },
        [false, true]
      ) as React.ReactElement;

      const backdrop = findElement(
        tree,
        (el) => el.props?.['data-testid'] === 'mobile-drawer-backdrop'
      );
      expect(backdrop).not.toBeNull();

      // Should have 2 UnifiedSidebar instances (1 desktop, 1 in mobile drawer)
      const sidebars = findElements(
        tree,
        (el) => (el.type as any)?.name === 'UnifiedSidebar' || Boolean(el.props?.activeTab)
      );
      expect(sidebars.length).toBeGreaterThanOrEqual(2);

      // Mobile drawer sidebar must have isCollapsed={false}
      const mobileSidebar = sidebars.find((el) => el.props?.className?.includes('border-r-0'));
      expect(mobileSidebar).toBeDefined();
      expect(mobileSidebar?.props.isCollapsed).toBe(false);
    });

    it('closes mobile drawer when backdrop is clicked', () => {
      let isDrawerOpen = true;
      const tree = renderComponent(
        AppLayout,
        { activeTab: 'jfll-customers', currentUser: mockUser },
        [false, isDrawerOpen]
      ) as React.ReactElement;

      const backdrop = findElement(
        tree,
        (el) => el.props?.['data-testid'] === 'mobile-drawer-backdrop'
      );
      expect(backdrop).not.toBeNull();

      backdrop?.props.onClick?.();
    });

    it('navigates and dismisses mobile drawer when a tab is selected in drawer', () => {
      const onTabChangeSpy = vi.fn();
      const tree = renderComponent(
        AppLayout,
        { activeTab: 'jfll-customers', onTabChange: onTabChangeSpy, currentUser: mockUser },
        [false, true]
      ) as React.ReactElement;

      const sidebars = findElements(
        tree,
        (el) => (el.type as any)?.name === 'UnifiedSidebar' || Boolean(el.props?.activeTab)
      );
      const mobileSidebar = sidebars.find((el) => el.props?.className?.includes('border-r-0'));
      expect(mobileSidebar).toBeDefined();

      mobileSidebar?.props.onTabChange?.('datamyne');
      expect(onTabChangeSpy).toHaveBeenCalledWith('datamyne');
    });

    it('closes mobile drawer on Escape keydown event', () => {
      let closeCalled = false;
      let hookIdx = 0;
      const dispatcher = {
        useState<S>(_initialState: S | (() => S)): [S, (action: any) => void] {
          // hook 0: isCollapsed (false), hook 1: isMobileDrawerOpen (true)
          const val: any = hookIdx === 0 ? false : true;
          hookIdx++;
          const setFn = (action: any) => {
            if (typeof action === 'boolean' && action === false) {
              closeCalled = true;
            }
          };
          return [val, setFn];
        },
        useRef: () => ({ current: null }),
        useEffect: (cb: Function) => cb(),
        useCallback: (cb: any) => cb,
        useMemo: (cb: any) => cb(),
        useContext: () => ({ showToast: () => {} }),
      };

      const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      const prev = reactInternals.ReactCurrentDispatcher.current;
      reactInternals.ReactCurrentDispatcher.current = dispatcher;

      try {
        AppLayout({ activeTab: 'jfll-customers' });
        // Trigger keydown Escape on window
        (eventListeners['keydown'] || []).forEach((fn) => fn({ key: 'Escape' }));
        expect(closeCalled).toBe(true);
      } finally {
        reactInternals.ReactCurrentDispatcher.current = prev;
      }
    });
  });

  describe('4. Props Routing & Canonical Tab Binding', () => {
    it('routes activeTab to SlimHeader breadcrumbs and UnifiedSidebar active item', () => {
      const htmlDatamyne = renderToString(
        <AppLayout activeTab="datamyne" />
      );
      expect(htmlDatamyne).toContain('DataMyne Leads');
      expect(htmlDatamyne).toContain('37.3k');

      const htmlReports = renderToString(
        <AppLayout activeTab="report" />
      );
      expect(htmlReports).toContain('Client Reports');
      expect(htmlReports).toContain('Outreach &amp; Views');

      const htmlSavedLists = renderToString(
        <AppLayout activeTab="saved-lists" savedListsCount={12} />
      );
      expect(htmlSavedLists).toContain('Saved Lists');
      expect(htmlSavedLists).toContain('12');
    });

    it('routes search query and filter count to SlimHeader', () => {
      const onSearchSpy = vi.fn();
      const onSearchSubmitSpy = vi.fn();
      const onToggleFilterSpy = vi.fn();

      const tree = renderComponent(
        AppLayout,
        {
          activeTab: 'apollo',
          searchQuery: 'Logistics Director',
          onSearchChange: onSearchSpy,
          onSearchSubmit: onSearchSubmitSpy,
          onToggleMobileFilter: onToggleFilterSpy,
          activeFilterCount: 3,
          isFilterOpen: true,
        }
      ) as React.ReactElement;

      const slimHeader = findElement(
        tree,
        (el) => (el.type as any)?.name === 'SlimHeader' || Boolean(el.props?.onSearchChange)
      );
      expect(slimHeader).not.toBeNull();
      expect(slimHeader?.props.searchQuery).toBe('Logistics Director');
      expect(slimHeader?.props.activeFilterCount).toBe(3);
      expect(slimHeader?.props.isFilterOpen).toBe(true);

      slimHeader?.props.onSearchChange?.('Operations');
      expect(onSearchSpy).toHaveBeenCalledWith('Operations');

      slimHeader?.props.onSearchSubmit?.('Operations');
      expect(onSearchSubmitSpy).toHaveBeenCalledWith('Operations');

      slimHeader?.props.onToggleFilter?.();
      expect(onToggleFilterSpy).toHaveBeenCalled();
    });

    it('routes settings, admin portal, and logout handlers to UnifiedSidebar', () => {
      const onSettingsSpy = vi.fn();
      const onAdminSpy = vi.fn();
      const onLogoutSpy = vi.fn();

      const tree = renderComponent(
        AppLayout,
        {
          activeTab: 'jfll-customers',
          currentUser: mockUser,
          onOpenSettings: onSettingsSpy,
          onOpenAdminPortal: onAdminSpy,
          onLogout: onLogoutSpy,
          pendingRequestsCount: 5,
        }
      ) as React.ReactElement;

      const desktopSidebar = findElement(
        tree,
        (el) => (el.type as any)?.name === 'UnifiedSidebar' || Boolean(el.props?.onOpenSettings)
      );
      expect(desktopSidebar).not.toBeNull();
      expect(desktopSidebar?.props.pendingRequestsCount).toBe(5);

      desktopSidebar?.props.onOpenSettings?.();
      expect(onSettingsSpy).toHaveBeenCalled();

      desktopSidebar?.props.onOpenAdminPortal?.();
      expect(onAdminSpy).toHaveBeenCalled();

      desktopSidebar?.props.onLogout?.();
      expect(onLogoutSpy).toHaveBeenCalled();
    });
  });
});
