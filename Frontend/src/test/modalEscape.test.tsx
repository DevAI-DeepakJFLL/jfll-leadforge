import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { TierScoreBreakdownModal } from '@/components/tiers/TierScoreBreakdownModal';
import { DatamyneDetailDrawer } from '@/components/datamyne/DatamyneDetailDrawer';
import { DatamyneLeadDetailDrawer } from '@/components/datamyne/DatamyneLeadDetailDrawer';
import { JfllCustomerDetailDrawer } from '@/components/jfll/JfllCustomerDetailDrawer';
import { TieredLead } from '@/types/tierSegmentation';
import { DatamyneLead } from '@/types/datamyneLead';
import { JfllCustomer } from '@/types/jfllCustomer';

/**
 * EventTarget mock with standard W3C capture & bubble phase execution semantics.
 */
class MockWindow {
  private captureListeners: Map<string, Set<(e: any) => void>> = new Map();
  private bubbleListeners: Map<string, Set<(e: any) => void>> = new Map();

  addEventListener(type: string, listener: (e: any) => void, options?: boolean | { capture?: boolean }) {
    const isCapture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const map = isCapture ? this.captureListeners : this.bubbleListeners;
    if (!map.has(type)) {
      map.set(type, new Set());
    }
    map.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void, options?: boolean | { capture?: boolean }) {
    const isCapture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const map = isCapture ? this.captureListeners : this.bubbleListeners;
    map.get(type)?.delete(listener);
  }

  dispatchEvent(event: {
    type: string;
    key?: string;
    stopPropagation?: () => void;
    stopImmediatePropagation?: () => void;
  }): boolean {
    let propagationStopped = false;
    let immediatePropagationStopped = false;

    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediate = event.stopImmediatePropagation;

    event.stopPropagation = () => {
      propagationStopped = true;
      originalStopPropagation?.call(event);
    };

    event.stopImmediatePropagation = () => {
      propagationStopped = true;
      immediatePropagationStopped = true;
      originalStopImmediate?.call(event);
    };

    // Phase 1: Capture Phase
    const captureList = Array.from(this.captureListeners.get(event.type) || []);
    for (const listener of captureList) {
      if (immediatePropagationStopped) break;
      listener(event);
    }

    // Phase 2: Bubble Phase (skipped if stopPropagation or stopImmediatePropagation was called)
    if (!propagationStopped) {
      const bubbleList = Array.from(this.bubbleListeners.get(event.type) || []);
      for (const listener of bubbleList) {
        if (immediatePropagationStopped) break;
        listener(event);
      }
    }

    return !propagationStopped;
  }
}

/**
 * Lightweight React component execution runner for testing hooks (useEffect, useState)
 * in headless/Node test environments without JSDOM.
 */
function renderComponent<P>(Component: React.FC<P>, initialProps: P) {
  let cleanups: (((() => void) | void)[]) = [];
  let hookIndex = 0;
  const hooks: any[] = [];
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
    useEffect(effect: () => (() => void) | void, deps?: readonly any[]) {
      const idx = hookIndex++;
      const prev = hooks[idx];
      const hasChanged = !prev || !deps || !deps.every((dep, i) => Object.is(dep, prev.deps[i]));

      if (hasChanged) {
        if (cleanups[idx]) {
          try {
            cleanups[idx]!();
          } catch (e) {
            console.error(e);
          }
        }
        hooks[idx] = { deps };
        cleanups[idx] = effect();
      }
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
    useContext<T>(context: any): T {
      return (context?._currentValue as T) || ({ showToast: () => {} } as unknown as T);
    },
  };

  function render(props: P) {
    currentProps = props;
    hookIndex = 0;
    const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
    reactInternals.ReactCurrentDispatcher.current = dispatcher;
    try {
      Component(props);
    } finally {
      reactInternals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  }

  function rerender(newProps: P) {
    render(newProps);
  }

  function unmount() {
    cleanups.forEach((cleanup) => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
    cleanups = [];
  }

  render(currentProps);

  return { rerender, unmount };
}

const mockLead: TieredLead = {
  id: 'dm-val-00001',
  company_name: 'TRENT LIMITED',
  role: 'Exporter',
  transport_mode: 'Air',
  category: 'Textiles & Apparel',
  subcategory: 'Apparel',
  contact_type: 'Both Phone & Email',
  phone: '123456',
  email: 'trent@test.com',
  tax_id: '795011351',
  city: 'Mumbai',
  address: 'Bombay House',
  pin_code: '400001',
  directors: 'B.S. Bhesania',
  trade_lanes: 'GCR/Air',
  top_hs_codes: '61099090',
  total_shipments: 37548,
  total_value_usd: 1194845,
  latest_activity_date: '2026-02-27',
  dataset_type: 'valid',
  segment_status: 'Tier A',
  tier_reason: 'score',
  total_score: 76,
  base_score: 71,
  bonus_points: 5,
  score_breakdown: {
    frequency_score: 20,
    freight_control_score: 8,
    lane_score: 15,
    commodity_score: 8,
    mode_score: 15,
    volume_trend_score: 5,
    recency_score: 10,
    regulated_plant_bonus: 5,
    cluster_bonus: 0,
  },
};

const mockDatamyneLead: DatamyneLead = {
  id: 'dm-test-1',
  company_name: 'JET FREIGHT CUSTOMER LTD',
  role: 'Exporter',
  category: 'Pharma',
  subcategory: 'Formulations',
  contact_type: 'Both Phone & Email',
  phone: '+91 9820011223',
  email: 'export@jfll.com',
  tax_id: '12345678',
  city: 'Mumbai',
  address: 'Andheri East',
  pin_code: '400069',
  directors: 'Test Director',
  total_shipments: 120,
  total_value_usd: 500000,
  latest_activity_date: '2026-01-10',
  dataset_type: 'valid',
  transport_mode: 'Air',
  trade_lanes: 'USA/Air',
  top_hs_codes: '30049099',
};

const mockJfllCustomer: JfllCustomer = {
  id: 'jfll-001',
  fullName: 'TATA MOTORS LIMITED',
  territory: 'West',
  contactPersonName: 'Mr. R. Sharma',
  mobileNumber: '9820012345',
  email: 'contact@tatamotors.com',
  status: 'Active',
  customerGroup: 'Enterprise Key Accounts',
  type: 'Shipper',
  saved: false,
};

describe('Modal Escape Key & Event Propagation Control Suite', () => {
  let mockWindow: MockWindow;
  let originalWindow: any;
  let originalDocument: any;
  let originalLocalStorage: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalLocalStorage = (globalThis as any).localStorage;

    mockWindow = new MockWindow();
    (globalThis as any).window = mockWindow;
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    (globalThis as any).document = {
      body: {
        style: {
          overflow: '',
        },
      },
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  it('calls onClose and stops propagation when Escape is pressed while TierScoreBreakdownModal is open', () => {
    const onClose = vi.fn();
    const parentWindowListener = vi.fn();

    // Parent/window listener attached before modal opens
    mockWindow.addEventListener('keydown', parentWindowListener, false);

    const { unmount } = renderComponent(TierScoreBreakdownModal, {
      isOpen: true,
      lead: mockLead,
      onClose,
    });

    const stopPropagationSpy = vi.fn();
    const stopImmediatePropagationSpy = vi.fn();

    const escapeEvent = {
      type: 'keydown',
      key: 'Escape',
      stopPropagation: stopPropagationSpy,
      stopImmediatePropagation: stopImmediatePropagationSpy,
    };

    const propagated = mockWindow.dispatchEvent(escapeEvent);

    // Verify onClose was called
    expect(onClose).toHaveBeenCalledTimes(1);

    // Verify propagation was halted
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(stopImmediatePropagationSpy).toHaveBeenCalled();
    expect(propagated).toBe(false);

    // Verify parent/window listener was prevented from firing
    expect(parentWindowListener).not.toHaveBeenCalled();

    unmount();
  });

  it('does NOT call onClose or stop propagation when non-Escape keys are pressed', () => {
    const onClose = vi.fn();
    const parentWindowListener = vi.fn();

    mockWindow.addEventListener('keydown', parentWindowListener, false);

    const { unmount } = renderComponent(TierScoreBreakdownModal, {
      isOpen: true,
      lead: mockLead,
      onClose,
    });

    const stopPropagationSpy = vi.fn();
    const stopImmediatePropagationSpy = vi.fn();

    const enterEvent = {
      type: 'keydown',
      key: 'Enter',
      stopPropagation: stopPropagationSpy,
      stopImmediatePropagation: stopImmediatePropagationSpy,
    };

    const propagated = mockWindow.dispatchEvent(enterEvent);

    expect(onClose).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
    expect(stopImmediatePropagationSpy).not.toHaveBeenCalled();
    expect(propagated).toBe(true);
    expect(parentWindowListener).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does NOT call onClose or stop propagation when TierScoreBreakdownModal is NOT open (isOpen: false)', () => {
    const onClose = vi.fn();
    const parentWindowListener = vi.fn();

    mockWindow.addEventListener('keydown', parentWindowListener, false);

    const { unmount } = renderComponent(TierScoreBreakdownModal, {
      isOpen: false,
      lead: mockLead,
      onClose,
    });

    const stopPropagationSpy = vi.fn();
    const stopImmediatePropagationSpy = vi.fn();

    const escapeEvent = {
      type: 'keydown',
      key: 'Escape',
      stopPropagation: stopPropagationSpy,
      stopImmediatePropagation: stopImmediatePropagationSpy,
    };

    const propagated = mockWindow.dispatchEvent(escapeEvent);

    expect(onClose).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
    expect(stopImmediatePropagationSpy).not.toHaveBeenCalled();
    expect(propagated).toBe(true);
    expect(parentWindowListener).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('removes window keydown capture listener on unmount', () => {
    const onClose = vi.fn();
    const parentWindowListener = vi.fn();

    mockWindow.addEventListener('keydown', parentWindowListener, false);

    const { unmount } = renderComponent(TierScoreBreakdownModal, {
      isOpen: true,
      lead: mockLead,
      onClose,
    });

    // Unmount the modal
    unmount();

    const escapeEvent = {
      type: 'keydown',
      key: 'Escape',
    };

    mockWindow.dispatchEvent(escapeEvent);

    // Modal listener should not fire after unmount
    expect(onClose).not.toHaveBeenCalled();
    // Parent listener should now fire since modal no longer intercepts
    expect(parentWindowListener).toHaveBeenCalledTimes(1);
  });

  it('prevents parent drawer from closing when nested TierScoreBreakdownModal is dismissed with Escape', () => {
    const onDrawerClose = vi.fn();
    const onModalClose = vi.fn();

    // Drawer is open and listening for Escape on window (bubble phase)
    mockWindow.addEventListener('keydown', (e: any) => {
      if (e.key === 'Escape') onDrawerClose();
    });

    // Modal is opened inside/on top of drawer
    const { unmount } = renderComponent(TierScoreBreakdownModal, {
      isOpen: true,
      lead: mockLead,
      onClose: onModalClose,
    });

    // User hits Escape to close modal
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
    });

    // Modal closes
    expect(onModalClose).toHaveBeenCalledTimes(1);
    // Drawer does NOT close!
    expect(onDrawerClose).not.toHaveBeenCalled();

    unmount();

    // After modal is closed, pressing Escape again now triggers drawer close
    mockWindow.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
    });
    expect(onDrawerClose).toHaveBeenCalledTimes(1);
  });
});

describe('Drawer Body Scroll Lock Suite', () => {
  let originalWindow: any;
  let originalDocument: any;
  let originalLocalStorage: any;

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
    originalDocument = (globalThis as any).document;
    originalLocalStorage = (globalThis as any).localStorage;

    (globalThis as any).window = new MockWindow();
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };
    (globalThis as any).document = {
      body: {
        style: {
          overflow: 'auto',
        },
      },
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDocument;
    (globalThis as any).localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  it('locks body scroll in DatamyneDetailDrawer when open and restores original overflow on unmount', () => {
    expect(document.body.style.overflow).toBe('auto');

    const { rerender, unmount } = renderComponent(DatamyneDetailDrawer, {
      isOpen: true,
      lead: mockDatamyneLead,
      onClose: () => {},
    });

    // Body should be locked
    expect(document.body.style.overflow).toBe('hidden');

    // Closing the drawer
    rerender({
      isOpen: false,
      lead: mockDatamyneLead,
      onClose: () => {},
    });

    // Restores original overflow
    expect(document.body.style.overflow).toBe('auto');

    unmount();
  });

  it('locks body scroll in DatamyneLeadDetailDrawer alias export', () => {
    const { unmount } = renderComponent(DatamyneLeadDetailDrawer, {
      isOpen: true,
      lead: mockDatamyneLead,
      onClose: () => {},
    });

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('locks body scroll in JfllCustomerDetailDrawer when open and restores original overflow on unmount', () => {
    expect(document.body.style.overflow).toBe('auto');

    const { rerender, unmount } = renderComponent(JfllCustomerDetailDrawer, {
      isOpen: true,
      customer: mockJfllCustomer,
      onClose: () => {},
    });

    // Body should be locked
    expect(document.body.style.overflow).toBe('hidden');

    // Closing drawer
    rerender({
      isOpen: false,
      customer: mockJfllCustomer,
      onClose: () => {},
    });

    // Restores original overflow
    expect(document.body.style.overflow).toBe('auto');

    unmount();
  });
});
