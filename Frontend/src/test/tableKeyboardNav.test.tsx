import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DatamyneTable } from '@/components/datamyne/DatamyneTable';
import { JfllCustomerTable } from '@/components/jfll/JfllCustomerTable';
import { ToastProvider } from '@/components/ui/Toast';
import { DatamyneLead } from '@/types/datamyneLead';
import { JfllCustomer } from '@/types/jfllCustomer';

const mockLead: DatamyneLead = {
  id: 'dm-test-101',
  company_name: 'GLOBAL LOGISTICS CORP',
  role: 'Exporter',
  category: 'Perishables',
  subcategory: 'Fresh Produce',
  contact_type: 'Both Phone & Email',
  phone: '9876543210',
  email: 'exports@globallogistics.com',
  tax_id: '0512345678',
  city: 'MUMBAI',
  address: 'Cargo Terminal 2',
  pin_code: '400099',
  directors: 'A SHARMA',
  trade_lanes: 'BOM-LHR',
  top_hs_codes: '070999',
  total_shipments: 120,
  total_value_usd: 850000,
  latest_activity_date: '2026-03-01',
  dataset_type: 'valid',
  transport_mode: 'Air',
};

const mockCustomer: JfllCustomer = {
  id: 'cust-test-202',
  fullName: 'TATA GLOBAL FREIGHT LTD',
  customerGroup: 'Diamond Partner',
  status: 'Active',
  type: 'Direct Shipper',
  territory: 'West',
  contactPersonName: 'VIKRAM MEHTA',
  mobileNumber: '9820099887',
  email: 'freight@tataglobal.com',
  creditStatus: 'Approved',
  businessLast3m: 2400000,
  totalBusinessTillDate: 8900000,
  saved: false,
};

// Polyfill minimal localStorage to suppress approach store warning in Node environment
const memoryStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, val: string) => memoryStore.set(key, String(val)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() {
    return memoryStore.size;
  },
  key: (i: number) => Array.from(memoryStore.keys())[i] || null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

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
 * Recursively find the table row element in the rendered JSX tree
 */
function findRowNode(node: any): any {
  if (!node) return null;
  if (node.type === 'tr' && node.props?.role === 'row') return node;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findRowNode(child);
      if (found) return found;
    }
  } else if (node.props?.children) {
    return findRowNode(node.props.children);
  }
  return null;
}

describe('Table Keyboard Navigation and Row Accessibility Suite', () => {
  describe('DatamyneTable Keyboard Navigation', () => {
    it('renders tbody tr with tabIndex=0, role="row", and aria-selected=false by default', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{}}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      expect(html).toContain('role="row"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-selected="false"');
      expect(html).toContain('focus:outline-none');
      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('focus-visible:ring-apollo');
      expect(html).toContain('focus-visible:ring-inset');
    });

    it('renders tbody tr with aria-selected=true when row is selected', () => {
      const html = renderToString(
        <DatamyneTable
          leads={[mockLead]}
          rowSelection={{ [mockLead.id]: true }}
          onRowSelectionChange={() => {}}
          onLeadClick={() => {}}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={1}
          onPageChange={() => {}}
        />
      );

      expect(html).toContain('role="row"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-selected="true"');
    });

    it('activates onLeadClick when pressing Enter key on row', () => {
      const onLeadClick = vi.fn();
      const vnode = renderComponent(DatamyneTable, {
        leads: [mockLead],
        rowSelection: {},
        onRowSelectionChange: () => {},
        onLeadClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      expect(row).not.toBeNull();
      expect(row.props.tabIndex).toBe(0);
      expect(row.props.role).toBe('row');
      expect(row.props['aria-selected']).toBe(false);

      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: 'Enter', preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onLeadClick).toHaveBeenCalledTimes(1);
      expect(onLeadClick).toHaveBeenCalledWith(mockLead);
    });

    it('activates onLeadClick when pressing Space key on row', () => {
      const onLeadClick = vi.fn();
      const vnode = renderComponent(DatamyneTable, {
        leads: [mockLead],
        rowSelection: { [mockLead.id]: true },
        onRowSelectionChange: () => {},
        onLeadClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      expect(row).not.toBeNull();
      expect(row.props['aria-selected']).toBe(true);

      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: ' ', preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onLeadClick).toHaveBeenCalledTimes(1);
      expect(onLeadClick).toHaveBeenCalledWith(mockLead);
    });

    it('does not activate onLeadClick on unrelated key presses', () => {
      const onLeadClick = vi.fn();
      const vnode = renderComponent(DatamyneTable, {
        leads: [mockLead],
        rowSelection: {},
        onRowSelectionChange: () => {},
        onLeadClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: 'ArrowDown', preventDefault });

      expect(preventDefault).not.toHaveBeenCalled();
      expect(onLeadClick).not.toHaveBeenCalled();
    });
  });

  describe('JfllCustomerTable Keyboard Navigation', () => {
    it('renders tbody tr with tabIndex=0, role="row", and aria-selected=false by default', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[mockCustomer]}
            rowSelection={{}}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={1}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      expect(html).toContain('role="row"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-selected="false"');
      expect(html).toContain('focus:outline-none');
      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('focus-visible:ring-apollo');
      expect(html).toContain('focus-visible:ring-inset');
    });

    it('renders tbody tr with aria-selected=true when row is selected', () => {
      const html = renderToString(
        <ToastProvider>
          <JfllCustomerTable
            customers={[mockCustomer]}
            rowSelection={{ [mockCustomer.id]: true }}
            onRowSelectionChange={() => {}}
            onCustomerClick={() => {}}
            currentPage={1}
            totalPages={1}
            pageSize={10}
            totalItems={1}
            onPageChange={() => {}}
          />
        </ToastProvider>
      );

      expect(html).toContain('role="row"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-selected="true"');
    });

    it('activates onCustomerClick when pressing Enter key on row', () => {
      const onCustomerClick = vi.fn();
      const vnode = renderComponent(JfllCustomerTable, {
        customers: [mockCustomer],
        rowSelection: {},
        onRowSelectionChange: () => {},
        onCustomerClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      expect(row).not.toBeNull();
      expect(row.props.tabIndex).toBe(0);
      expect(row.props.role).toBe('row');
      expect(row.props['aria-selected']).toBe(false);

      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: 'Enter', preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onCustomerClick).toHaveBeenCalledTimes(1);
      expect(onCustomerClick).toHaveBeenCalledWith(mockCustomer);
    });

    it('activates onCustomerClick when pressing Space key on row', () => {
      const onCustomerClick = vi.fn();
      const vnode = renderComponent(JfllCustomerTable, {
        customers: [mockCustomer],
        rowSelection: { [mockCustomer.id]: true },
        onRowSelectionChange: () => {},
        onCustomerClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      expect(row).not.toBeNull();
      expect(row.props['aria-selected']).toBe(true);

      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: ' ', preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(onCustomerClick).toHaveBeenCalledTimes(1);
      expect(onCustomerClick).toHaveBeenCalledWith(mockCustomer);
    });

    it('does not activate onCustomerClick on unrelated key presses', () => {
      const onCustomerClick = vi.fn();
      const vnode = renderComponent(JfllCustomerTable, {
        customers: [mockCustomer],
        rowSelection: {},
        onRowSelectionChange: () => {},
        onCustomerClick,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 1,
        onPageChange: () => {},
      });

      const row = findRowNode(vnode);
      const preventDefault = vi.fn();
      row.props.onKeyDown({ key: 'Tab', preventDefault });

      expect(preventDefault).not.toHaveBeenCalled();
      expect(onCustomerClick).not.toHaveBeenCalled();
    });
  });
});
