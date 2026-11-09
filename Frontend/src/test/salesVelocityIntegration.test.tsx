import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DatamyneView, DatamyneViewProps } from '@/components/views/DatamyneView';
import { JfllCustomersView, JfllCustomersViewProps } from '@/components/views/JfllCustomersView';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { JfllCustomerTable } from '@/components/jfll/JfllCustomerTable';
import { QuickTouchpointLogger } from '@/components/approach/QuickTouchpointLogger';
import { DatamyneLead } from '@/types/datamyneLead';
import { JfllCustomer } from '@/types/jfllCustomer';
import { logApproach } from '@/services/approachLogService';
import { showToast } from '@/components/ui';

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(({ queryKey }) => {
    if (queryKey?.[0] === 'tierCounts') {
      return { data: { total: 100, tierA: 50, tierB: 30, parked: 20 }, isLoading: false };
    }
    return { data: { items: [], total: 0, totalPages: 0 }, isLoading: false };
  }),
}));

// Mock backend & toast services
vi.mock('@/services/approachLogService', () => ({
  logApproach: vi.fn().mockResolvedValue({ id: 'mock-log-id' }),
  getCachedApproachStatus: vi.fn(() => 'Not Contacted'),
  getLatestApproachNotesForEntities: vi.fn().mockResolvedValue({}),
  APPROACH_STATUS_CHANGED_EVENT: 'app:approach_status_changed',
}));

vi.mock('@/components/ui', () => ({
  showToast: vi.fn(),
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/services/tierService', () => ({
  fetchTierCounts: vi.fn().mockResolvedValue({ total: 100, tierA: 50, tierB: 30, parked: 20 }),
  fetchTierLeads: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0 }),
  queryTierLeadsLocal: vi.fn().mockReturnValue({ items: [], total: 0, totalPages: 0 }),
  queryTierCountsLocal: vi.fn().mockReturnValue({ total: 100, tierA: 50, tierB: 30, parked: 20 }),
  getLoadedTierDataset: vi.fn().mockReturnValue([]),
}));

vi.mock('@/services/authService', () => ({
  getStoredSession: vi.fn(() => ({
    email: 'snehal.birje@jfll.com',
    name: 'Snehal Birje',
    role: 'Commercial',
    token: 'test-session-token',
  })),
}));

const mockLeads: DatamyneLead[] = [
  {
    id: 'dm-001',
    company_name: 'Apex Pharma Exports Pvt Ltd',
    country: 'India',
    role: 'Exporter',
    transport_mode: 'Air',
    category: 'Pharma & Healthcare',
    subcategory: 'Formulations & APIs',
    contact_type: 'Both Phone & Email',
    phone: '+91-9820011223',
    email: 'exports@apexpharma.com',
    tax_id: '0304050607',
    city: 'Mumbai',
    address: 'Andheri East',
    pin_code: '400069',
    directors: 'Rajesh Sharma',
    trade_lanes: 'BOM-FRA',
    top_hs_codes: '30049099',
    total_shipments: 84,
    total_value_usd: 1250000,
    latest_activity_date: '2026-03-15',
    dataset_type: 'valid',
  },
  {
    id: 'dm-002',
    company_name: 'Blue Star Agro Fresh Ltd',
    country: 'India',
    role: 'Exporter',
    transport_mode: 'Air',
    category: 'Perishables',
    subcategory: 'Fresh Fruits & Veg',
    contact_type: 'Both Phone & Email',
    phone: '+91-9820099887',
    email: 'agro@bluestar.com',
    tax_id: '0708091011',
    city: 'Nashik',
    address: 'MIDC Ambad',
    pin_code: '422010',
    directors: 'Sunil Patil',
    trade_lanes: 'BOM-DXB',
    top_hs_codes: '08061000',
    total_shipments: 42,
    total_value_usd: 680000,
    latest_activity_date: '2026-03-20',
    dataset_type: 'valid',
  },
  {
    id: 'dm-003',
    company_name: 'Century Textiles & Fabrics Ltd',
    country: 'India',
    role: 'Both',
    transport_mode: 'Air & Ocean',
    category: 'Textiles & Apparel',
    subcategory: 'Yarn & Fabrics',
    contact_type: 'Phone only',
    phone: '+91-22-24950000',
    email: '',
    tax_id: '0102030405',
    city: 'Mumbai',
    address: 'Worli',
    pin_code: '400030',
    directors: 'Kumar Birla',
    trade_lanes: 'BOM-JFK',
    top_hs_codes: '52081190',
    total_shipments: 120,
    total_value_usd: 2400000,
    latest_activity_date: '2026-03-25',
    dataset_type: 'valid',
  },
];

const mockCustomers: JfllCustomer[] = [
  {
    id: 'jfll-001',
    fullName: 'Cadila Pharmaceuticals Ltd',
    territory: 'Ahmedabad',
    contactPersonName: 'Amit Shah',
    mobileNumber: '+91-9876543210',
    email: 'amit.shah@cadila.com',
    status: 'Active',
    customerGroup: 'Shipper',
    type: 'Direct Client',
    saved: false,
    creditStatus: 'Approved - 30 Days',
    salesPerson: 'Snehal Birje',
    businessLast3m: 850000,
    totalBusinessTillDate: 4200000,
  },
  {
    id: 'jfll-002',
    fullName: 'Lupin Logistics Division',
    territory: 'Mumbai',
    contactPersonName: 'Vikram Joshi',
    mobileNumber: '+91-9820012345',
    email: 'vjoshi@lupin.com',
    status: 'Not Active',
    customerGroup: 'Shipper',
    type: 'Direct Client',
    saved: false,
    creditStatus: 'Standard',
    salesPerson: 'Snehal Birje',
    businessLast3m: 0,
    totalBusinessTillDate: 1200000,
  },
];

/**
 * EventTarget mock to simulate window keydown and global events in Node test environment.
 */
class MockWindow {
  listeners: Map<string, Set<(e: any) => void>> = new Map();

  addEventListener(type: string, listener: (e: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: any): boolean {
    const type = event.type || 'keydown';
    const list = Array.from(this.listeners.get(type) || []);
    for (const listener of list) {
      listener(event);
    }
    return true;
  }
}

/**
 * Lightweight React component dispatcher to execute hooks in Node/Vitest test environment.
 */
function renderComponent<P>(Component: React.FC<P>, initialProps: P) {
  let cleanups: (((() => void) | void)[]) = [];
  let hookIndex = 0;
  const hooks: any[] = [];
  let currentTree: any = null;
  let currentProps = initialProps;

  const dispatcher = {
    useState<S>(initialState: S | (() => S)): [S, (action: S | ((prevState: S) => S)) => void] {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initialState === 'function' ? (initialState as () => S)() : initialState;
      }
      const setState = (action: S | ((prevState: S) => S)) => {
        const next = typeof action === 'function' ? (action as (prev: S) => S)(hooks[idx]) : action;
        if (!Object.is(next, hooks[idx])) {
          hooks[idx] = next;
          render(currentProps);
        }
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
    useCallback<T extends Function>(callback: T, deps?: readonly any[]): T {
      const idx = hookIndex++;
      const prev = hooks[idx];
      const hasChanged = !prev || !deps || !deps.every((dep, i) => Object.is(dep, prev.deps[i]));
      if (hasChanged) {
        hooks[idx] = { callback, deps };
        return callback;
      }
      return prev.callback;
    },
    useMemo<T>(factory: () => T, deps?: readonly any[]): T {
      const idx = hookIndex++;
      const prev = hooks[idx];
      const hasChanged = !prev || !deps || !deps.every((dep, i) => Object.is(dep, prev.deps[i]));
      if (hasChanged) {
        const value = factory();
        hooks[idx] = { value, deps };
        return value;
      }
      return prev.value;
    },
    useEffect(effect: () => ((() => void) | void), deps?: readonly any[]): void {
      const idx = hookIndex++;
      const prev = hooks[idx];
      const hasChanged = !prev || !deps || !deps.every((dep, i) => Object.is(dep, prev.deps[i]));
      if (hasChanged) {
        if (cleanups[idx]) {
          try {
            cleanups[idx]!();
          } catch {
            // ignore
          }
          cleanups[idx] = undefined;
        }
        hooks[idx] = { deps };
        const cleanup = effect();
        cleanups[idx] = cleanup;
      }
    },
    useContext(context: any): any {
      return context?._currentValue ?? {};
    },
    useId(): string {
      return `id-${hookIndex++}`;
    },
  };

  function render(props: P) {
    hookIndex = 0;
    const ReactShared = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = ReactShared.ReactCurrentDispatcher.current;
    ReactShared.ReactCurrentDispatcher.current = dispatcher;

    try {
      currentTree = Component(props);
    } finally {
      ReactShared.ReactCurrentDispatcher.current = prevDispatcher;
    }
  }

  render(initialProps);

  return {
    getTree: () => currentTree,
    unmount: () => {
      for (const cleanup of cleanups) {
        if (cleanup) {
          try {
            cleanup();
          } catch {
            // ignore
          }
        }
      }
      cleanups = [];
    },
  };
}

/** Recursively searches the rendered vnode tree for a node matching a predicate */
function findNode(vnode: any, predicate: (node: any) => boolean): any {
  if (!vnode) return null;
  if (predicate(vnode)) return vnode;
  if (Array.isArray(vnode)) {
    for (const child of vnode) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
  } else if (vnode.props?.children) {
    return findNode(vnode.props.children, predicate);
  }
  return null;
}

/** Recursively searches the rendered vnode tree for all nodes matching a predicate */
function findAllNodes(vnode: any, predicate: (node: any) => boolean, results: any[] = []): any[] {
  if (!vnode) return results;
  if (predicate(vnode)) {
    results.push(vnode);
  }
  if (Array.isArray(vnode)) {
    for (const child of vnode) {
      findAllNodes(child, predicate, results);
    }
  } else if (vnode.props?.children) {
    findAllNodes(vnode.props.children, predicate, results);
  }
  return results;
}

describe('Sales Velocity & SplitPeek Integration Suite', () => {
  let mockWin: MockWindow;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWin = new MockWindow();
    (global as any).window = mockWin;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  describe('DatamyneView Sales Velocity Peek Integration', () => {
    const baseDatamyneProps: DatamyneViewProps = {
      filters: { dataset: 'valid' } as any,
      query: {
        items: mockLeads,
        totalEstimate: mockLeads.length,
        totalFormatted: `${mockLeads.length}`,
        page: 1,
        totalPages: 1,
        limit: 25,
        audienceCounts: {} as any,
        datasetCounts: { valid: mockLeads.length, missing: 0, all: mockLeads.length },
      },
      rowSelection: {},
      onRowSelectionChange: vi.fn(),
      selectedCount: 0,
      isAllOnPageSelected: false,
      isSomeOnPageSelected: false,
      onToggleSelectAllPage: vi.fn(),
      onDeselectAll: vi.fn(),
      onExport: vi.fn(),
      isExporting: false,
      onSearchChange: vi.fn(),
      onDatasetChange: vi.fn(),
      onTabChange: vi.fn(),
      onPageChange: vi.fn(),
      toggleTransportMode: vi.fn(),
      toggleCategory: vi.fn(),
      toggleSubcategory: vi.fn(),
      toggleRole: vi.fn(),
      toggleCity: vi.fn(),
      toggleTradeLane: vi.fn(),
      toggleContactStatus: vi.fn(),
      toggleHasDirectors: vi.fn(),
      setMinShipments: vi.fn(),
      setMinTradedValueUsd: vi.fn(),
      clearAllFilters: vi.fn(),
      activeFilterCount: 0,
      onLeadClick: vi.fn(),
      isMobileOpen: false,
      onCloseMobile: vi.fn(),
    };

    it('renders 60% table width and opens SplitPeekDossier when a lead row is clicked', () => {
      const onLeadClickModal = vi.fn();
      const component = renderComponent(DatamyneView, {
        ...baseDatamyneProps,
        onLeadClick: onLeadClickModal,
      });

      // Initially, no peek is active, table container takes full width
      const initialTableWrapper = findNode(component.getTree(), (node) =>
        node?.props?.className?.includes('flex-1 w-full')
      );
      expect(initialTableWrapper).not.toBeNull();

      // Find the DatamyneTable component
      const tableNode = findNode(component.getTree(), (node) =>
        node?.type?.name === 'DatamyneTable' || typeof node?.props?.onLeadClick === 'function'
      );
      expect(tableNode).not.toBeNull();

      // Simulate clicking row 0 (Apex Pharma Exports)
      tableNode.props.onLeadClick(mockLeads[0]);

      // Table container should now adapt to lg:w-[60%] shrink-0 for split layout
      const splitTableWrapper = findNode(component.getTree(), (node) =>
        node?.props?.className?.includes('lg:w-[60%] shrink-0')
      );
      expect(splitTableWrapper).not.toBeNull();

      // DatamyneTable should have peekLeadId set to dm-001
      const updatedTableNode = findNode(component.getTree(), (node) =>
        node?.props?.peekLeadId === 'dm-001'
      );
      expect(updatedTableNode).not.toBeNull();

      // SplitPeekDossier should now be mounted with the lead title
      const peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Apex Pharma Exports Pvt Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.isOpen).toBe(true);

      component.unmount();
    });

    it('navigates through leads with J and K keyboard shortcuts', () => {
      const component = renderComponent(DatamyneView, baseDatamyneProps);

      // Open peek on lead 0 (Apex Pharma)
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onLeadClick === 'function' && Array.isArray(node?.props?.leads)
      );
      tableNode.props.onLeadClick(mockLeads[0]);

      let peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Apex Pharma Exports Pvt Ltd'
      );
      expect(peekDossier).not.toBeNull();

      // Press 'j' to navigate to next lead (Blue Star Agro Fresh)
      const preventDefaultJ = vi.fn();
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'j',
        preventDefault: preventDefaultJ,
        target: { tagName: 'DIV' },
      });

      expect(preventDefaultJ).toHaveBeenCalled();
      peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Blue Star Agro Fresh Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.currentIndex).toBe(1);

      // Press 'j' again to navigate to lead 2 (Century Textiles)
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'j',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });
      peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Century Textiles & Fabrics Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.currentIndex).toBe(2);

      // Press 'k' to navigate back to lead 1 (Blue Star Agro Fresh)
      const preventDefaultK = vi.fn();
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'k',
        preventDefault: preventDefaultK,
        target: { tagName: 'DIV' },
      });

      expect(preventDefaultK).toHaveBeenCalled();
      peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Blue Star Agro Fresh Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.currentIndex).toBe(1);

      component.unmount();
    });

    it('closes the split peek dossier when Escape key is pressed', () => {
      const component = renderComponent(DatamyneView, baseDatamyneProps);

      // Open peek on lead 0
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onLeadClick === 'function' && Array.isArray(node?.props?.leads)
      );
      tableNode.props.onLeadClick(mockLeads[0]);

      expect(
        findNode(component.getTree(), (n) => n?.props?.title === 'Apex Pharma Exports Pvt Ltd')
      ).not.toBeNull();

      // Press Escape
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'Escape',
        target: { tagName: 'DIV' },
      });

      // SplitPeekDossier should now be unmounted
      expect(
        findNode(component.getTree(), (n) => n?.props?.title === 'Apex Pharma Exports Pvt Ltd')
      ).toBeNull();

      component.unmount();
    });

    it('renders QuickTouchpointLogger and logs a connected call micro-touchpoint', async () => {
      const component = renderComponent(DatamyneView, baseDatamyneProps);

      // Open peek on lead 0
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onLeadClick === 'function' && Array.isArray(node?.props?.leads)
      );
      tableNode.props.onLeadClick(mockLeads[0]);

      // Find QuickTouchpointLogger
      const loggerNode = findNode(component.getTree(), (node) =>
        node?.props?.entityType === 'datamyne' && node?.props?.entityId === 'dm-001'
      );
      expect(loggerNode).not.toBeNull();
      expect(loggerNode.props.companyName).toBe('Apex Pharma Exports Pvt Ltd');

      // Test QuickTouchpointLogger directly via renderComponent
      const loggerComp = renderComponent(QuickTouchpointLogger, loggerNode.props);
      const actionButtons = findAllNodes(
        loggerComp.getTree(),
        (n) => n?.type === 'button' && typeof n?.props?.onClick === 'function'
      );
      expect(actionButtons.length).toBe(4);

      // Button index 1 is "Connected"
      const connectedButton = actionButtons[1];
      expect(connectedButton.props['aria-label']).toBe('Connected');

      // Click "Connected"
      await connectedButton.props.onClick();

      // Verify logApproach was called with correct payload
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'datamyne',
          entityId: 'dm-001',
          companyName: 'Apex Pharma Exports Pvt Ltd',
          action: 'call',
          status: 'connected',
        })
      );
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Connected'),
        'success'
      );

      loggerComp.unmount();
      component.unmount();
    });

    it('triggers onLeadClick modal drawer when Open Full Dossier button is clicked', () => {
      const onLeadClickModal = vi.fn();
      const component = renderComponent(DatamyneView, {
        ...baseDatamyneProps,
        onLeadClick: onLeadClickModal,
      });

      // Open peek on lead 0
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onLeadClick === 'function' && Array.isArray(node?.props?.leads)
      );
      tableNode.props.onLeadClick(mockLeads[0]);

      // SplitPeekDossier has onExpandFull prop
      const peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Apex Pharma Exports Pvt Ltd'
      );
      expect(peekDossier).not.toBeNull();
      peekDossier.props.onExpandFull();

      expect(onLeadClickModal).toHaveBeenCalledTimes(1);
      expect(onLeadClickModal).toHaveBeenCalledWith(mockLeads[0]);

      component.unmount();
    });
  });

  describe('JfllCustomersView Sales Velocity Peek Integration', () => {
    const baseJfllProps: JfllCustomersViewProps = {
      filters: {} as any,
      query: {
        items: mockCustomers,
        totalEstimate: mockCustomers.length,
        totalFormatted: `${mockCustomers.length}`,
        page: 1,
        totalPages: 1,
        limit: 25,
        audienceCounts: {} as any,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      rowSelection: {},
      onRowSelectionChange: vi.fn(),
      selectedCount: 0,
      isAllOnPageSelected: false,
      isSomeOnPageSelected: false,
      onToggleSelectAllPage: vi.fn(),
      onDeselectAll: vi.fn(),
      onExport: vi.fn(),
      isExporting: false,
      onSearchChange: vi.fn(),
      onCustomerStatusChange: vi.fn(),
      onTabChange: vi.fn(),
      onPageChange: vi.fn(),
      toggleCustomerGroup: vi.fn(),
      toggleType: vi.fn(),
      toggleCreditStatus: vi.fn(),
      toggleSalesPerson: vi.fn(),
      toggleRevenueRange: vi.fn(),
      toggleContactOption: vi.fn(),
      clearAllFilters: vi.fn(),
      onCustomerClick: vi.fn(),
      isMobileOpen: false,
      onCloseMobile: vi.fn(),
    };

    it('renders 60% table width and opens SplitPeekDossier when a customer row is clicked', () => {
      const onCustomerClickModal = vi.fn();
      const component = renderComponent(JfllCustomersView, {
        ...baseJfllProps,
        onCustomerClick: onCustomerClickModal,
      });

      // Find the JfllCustomerTable component
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onCustomerClick === 'function' && Array.isArray(node?.props?.customers)
      );
      expect(tableNode).not.toBeNull();

      // Click customer 0 (Cadila Pharmaceuticals)
      tableNode.props.onCustomerClick(mockCustomers[0]);

      // Table container should adapt to lg:w-[60%] shrink-0
      const splitTableWrapper = findNode(component.getTree(), (node) =>
        node?.props?.className?.includes('lg:w-[60%] shrink-0')
      );
      expect(splitTableWrapper).not.toBeNull();

      // JfllCustomerTable should have peekCustomerId set
      const updatedTableNode = findNode(component.getTree(), (node) =>
        node?.props?.peekCustomerId === 'jfll-001'
      );
      expect(updatedTableNode).not.toBeNull();

      // SplitPeekDossier should now be mounted with customer name
      const peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Cadila Pharmaceuticals Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.isOpen).toBe(true);

      component.unmount();
    });

    it('navigates customers with J and K keyboard shortcuts in JfllCustomersView', () => {
      const component = renderComponent(JfllCustomersView, baseJfllProps);

      // Open peek on customer 0 (Cadila)
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onCustomerClick === 'function' && Array.isArray(node?.props?.customers)
      );
      tableNode.props.onCustomerClick(mockCustomers[0]);

      let peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Cadila Pharmaceuticals Ltd'
      );
      expect(peekDossier).not.toBeNull();

      // Press 'j' to advance to customer 1 (Lupin Logistics)
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'j',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });

      peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Lupin Logistics Division'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.currentIndex).toBe(1);

      // Press 'k' to go back to customer 0 (Cadila)
      mockWin.dispatchEvent({
        type: 'keydown',
        key: 'k',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' },
      });

      peekDossier = findNode(component.getTree(), (node) =>
        node?.props?.title === 'Cadila Pharmaceuticals Ltd'
      );
      expect(peekDossier).not.toBeNull();
      expect(peekDossier.props.currentIndex).toBe(0);

      component.unmount();
    });

    it('renders QuickTouchpointLogger and logs an email touchpoint for customer', async () => {
      const component = renderComponent(JfllCustomersView, baseJfllProps);

      // Open peek on customer 0
      const tableNode = findNode(component.getTree(), (node) =>
        typeof node?.props?.onCustomerClick === 'function' && Array.isArray(node?.props?.customers)
      );
      tableNode.props.onCustomerClick(mockCustomers[0]);

      // Find QuickTouchpointLogger
      const loggerNode = findNode(component.getTree(), (node) =>
        node?.props?.entityType === 'jfll' && node?.props?.entityId === 'jfll-001'
      );
      expect(loggerNode).not.toBeNull();
      expect(loggerNode.props.companyName).toBe('Cadila Pharmaceuticals Ltd');

      // Test QuickTouchpointLogger via renderComponent
      const loggerComp = renderComponent(QuickTouchpointLogger, loggerNode.props);
      const actionButtons = findAllNodes(
        loggerComp.getTree(),
        (n) => n?.type === 'button' && typeof n?.props?.onClick === 'function'
      );
      const emailButton = actionButtons[2];
      expect(emailButton.props['aria-label']).toBe('Email Sent');

      await emailButton.props.onClick();

      // QuickTouchpointLogger maps 'jfll' to 'jfll_customer' internally
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'jfll_customer',
          entityId: 'jfll-001',
          companyName: 'Cadila Pharmaceuticals Ltd',
          action: 'email',
          status: 'sent',
        })
      );
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('intro email sent'),
        'success'
      );

      loggerComp.unmount();
      component.unmount();
    });
  });

  describe('Active Row Highlighting in Tables', () => {
    it('applies bg-blue-50/70 border-l-4 border-l-apollo to active row in DatamyneTable', () => {
      const html = renderToString(
        <DatamyneTable
          leads={mockLeads}
          rowSelection={{}}
          onRowSelectionChange={vi.fn()}
          onLeadClick={vi.fn()}
          peekLeadId="dm-002"
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={mockLeads.length}
          onPageChange={vi.fn()}
        />
      );

      // Active peek row is marked with data-peek-active and has border-l-apollo highlight
      expect(html).toContain('data-peek-active="true"');
      expect(html).toContain('border-l-4 border-l-apollo');
      expect(html).toContain('bg-blue-50/70');
    });

    it('applies bg-blue-50/70 border-l-4 border-l-apollo to active row in JfllCustomerTable', () => {
      const html = renderToString(
        <JfllCustomerTable
          customers={mockCustomers}
          rowSelection={{}}
          onRowSelectionChange={vi.fn()}
          onCustomerClick={vi.fn()}
          peekCustomerId="jfll-001"
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={mockCustomers.length}
          onPageChange={vi.fn()}
        />
      );

      expect(html).toContain('data-peek-active="true"');
      expect(html).toContain('border-l-4 border-l-apollo');
      expect(html).toContain('bg-blue-50/70');
    });
  });
});
