import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import {
  useTableQueueNavigation,
  UseTableQueueNavigationOptions,
} from '@/hooks/useTableQueueNavigation';

/**
 * Lightweight mock window implementing EventTarget semantics for vitest in Node.
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

  getListenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

/**
 * Lightweight React hook test runner using React's internal dispatcher
 * without requiring JSDOM.
 */
function renderHook<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  options: { initialProps: TProps }
) {
  const hooks: any[] = [];
  let hookIndex = 0;
  let cleanups: (((() => void) | void)[]) = [];
  const result = { current: undefined as unknown as TResult };
  let currentProps = options.initialProps;

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
  };

  function render(props: TProps) {
    currentProps = props;
    hookIndex = 0;
    const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
    reactInternals.ReactCurrentDispatcher.current = dispatcher;
    try {
      result.current = hookFn(props);
    } finally {
      reactInternals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  }

  function rerender(newProps: TProps) {
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

  return {
    result,
    rerender,
    unmount,
  };
}

describe('useTableQueueNavigation Hook Suite', () => {
  let mockWindow: MockWindow;
  let originalWindow: any;
  const mockItems = [
    { id: '1', title: 'Lead Alpha' },
    { id: '2', title: 'Lead Beta' },
    { id: '3', title: 'Lead Gamma' },
    { id: '4', title: 'Lead Delta' },
  ];

  beforeEach(() => {
    originalWindow = (globalThis as any).window;
    mockWindow = new MockWindow();
    (globalThis as any).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('Keyboard Navigation', () => {
    it('advances selectedIndex by +1 on "j" key', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.selectedItem).toEqual(mockItems[0]);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'j' });

      expect(result.current.selectedIndex).toBe(1);
      expect(result.current.selectedItem).toEqual(mockItems[1]);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(1, mockItems[1]);
    });

    it('advances selectedIndex by +1 on "ArrowDown" key', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(0);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });

      expect(result.current.selectedIndex).toBe(1);
      expect(result.current.selectedItem).toEqual(mockItems[1]);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith(1, mockItems[1]);
    });

    it('decrements selectedIndex by -1 on "k" key', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, initialIndex: 2, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(2);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'k' });

      expect(result.current.selectedIndex).toBe(1);
      expect(result.current.selectedItem).toEqual(mockItems[1]);
      expect(onNavigate).toHaveBeenCalledWith(1, mockItems[1]);
    });

    it('decrements selectedIndex by -1 on "ArrowUp" key', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, initialIndex: 2, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(2);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });

      expect(result.current.selectedIndex).toBe(1);
      expect(result.current.selectedItem).toEqual(mockItems[1]);
      expect(onNavigate).toHaveBeenCalledWith(1, mockItems[1]);
    });
  });

  describe('Boundary Protection', () => {
    it('does not decrement below 0', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, initialIndex: 0, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(0);

      // Press 'k' when already at top
      mockWindow.dispatchEvent({ type: 'keydown', key: 'k' });
      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();

      // Press 'ArrowUp' when already at top
      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('does not increment past items.length - 1', () => {
      const onNavigate = vi.fn();
      const lastIndex = mockItems.length - 1;
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, initialIndex: lastIndex, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(lastIndex);

      // Press 'j' when already at bottom
      mockWindow.dispatchEvent({ type: 'keydown', key: 'j' });
      expect(result.current.selectedIndex).toBe(lastIndex);
      expect(onNavigate).not.toHaveBeenCalled();

      // Press 'ArrowDown' when already at bottom
      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
      expect(result.current.selectedIndex).toBe(lastIndex);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('handles empty items safely without errors', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: [], onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(0);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'j' });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'k' });
      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Form Element Suppression', () => {
    it('does NOT trigger navigation when key originates inside an input', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate } }
      );

      const inputTarget = { tagName: 'INPUT' };
      mockWindow.dispatchEvent({ type: 'keydown', key: 'j', target: inputTarget });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target: inputTarget });

      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('does NOT trigger navigation when key originates inside a textarea', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, initialIndex: 1, onNavigate } }
      );

      const textareaTarget = { tagName: 'TEXTAREA' };
      mockWindow.dispatchEvent({ type: 'keydown', key: 'k', target: textareaTarget });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowUp', target: textareaTarget });

      expect(result.current.selectedIndex).toBe(1);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('does NOT trigger navigation when key originates inside a select or contenteditable element', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate } }
      );

      mockWindow.dispatchEvent({ type: 'keydown', key: 'j', target: { tagName: 'SELECT' } });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'j', target: { isContentEditable: true } });
      mockWindow.dispatchEvent({
        type: 'keydown',
        key: 'j',
        target: { getAttribute: (attr: string) => (attr === 'contenteditable' ? 'true' : null) },
      });

      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Escape and Lifecycle', () => {
    it('triggers onClose() when Escape is pressed', () => {
      const onClose = vi.fn();
      renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onClose } }
      );

      mockWindow.dispatchEvent({ type: 'keydown', key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles uppercase J and K when CapsLock is engaged', () => {
      const onNavigate = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate } }
      );

      expect(result.current.selectedIndex).toBe(0);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'J' });
      expect(result.current.selectedIndex).toBe(1);
      expect(onNavigate).toHaveBeenCalledWith(1, mockItems[1]);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'K' });
      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).toHaveBeenCalledWith(0, mockItems[0]);
    });

    it('ignores keydown when event.defaultPrevented is true', () => {
      const onNavigate = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, onNavigate, onClose } }
      );

      mockWindow.dispatchEvent({ type: 'keydown', key: 'j', defaultPrevented: true });
      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();

      mockWindow.dispatchEvent({ type: 'keydown', key: 'Escape', defaultPrevented: true });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('suppresses all listeners when enabled: false', () => {
      const onNavigate = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems, enabled: false, onNavigate, onClose } }
      );

      expect(mockWindow.getListenerCount('keydown')).toBe(0);

      mockWindow.dispatchEvent({ type: 'keydown', key: 'j' });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
      mockWindow.dispatchEvent({ type: 'keydown', key: 'Escape' });

      expect(result.current.selectedIndex).toBe(0);
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('unregisters keydown listener upon unmount', () => {
      const { unmount } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems } }
      );

      expect(mockWindow.getListenerCount('keydown')).toBe(1);

      unmount();

      expect(mockWindow.getListenerCount('keydown')).toBe(0);
    });
  });

  describe('Programmatic Controls', () => {
    it('supports goToNext and goToPrev programmatic functions', () => {
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems } }
      );

      expect(result.current.selectedIndex).toBe(0);

      result.current.goToNext();
      expect(result.current.selectedIndex).toBe(1);

      result.current.goToPrev();
      expect(result.current.selectedIndex).toBe(0);
    });

    it('supports setSelectedIndex with clamp protection', () => {
      const { result } = renderHook(
        (props: UseTableQueueNavigationOptions) => useTableQueueNavigation(props),
        { initialProps: { items: mockItems } }
      );

      result.current.setSelectedIndex(3);
      expect(result.current.selectedIndex).toBe(3);

      result.current.setSelectedIndex(999);
      expect(result.current.selectedIndex).toBe(3);
    });
  });
});
