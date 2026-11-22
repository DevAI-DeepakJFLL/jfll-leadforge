import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

/**
 * Lightweight hook test runner that executes React hooks in headless / Node testing environments.
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
    hookIndex = 0;
    const originalDispatcher = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      ?.ReactCurrentDispatcher?.current;
    if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    }
    try {
      result.current = hookFn(props);
    } finally {
      if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = originalDispatcher;
      }
    }
  }

  render(currentProps);

  return {
    result,
    rerender: (newProps: TProps) => {
      currentProps = newProps;
      render(newProps);
    },
    unmount: () => {
      cleanups.forEach((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
      cleanups = [];
    },
  };
}

describe('useClickOutside Hook Suite', () => {
  let originalDocument: any;
  let originalWindow: any;
  let docListeners: Map<string, Set<(e: any) => void>>;
  let winListeners: Map<string, Set<(e: any) => void>>;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
    originalWindow = (globalThis as any).window;

    docListeners = new Map();
    winListeners = new Map();

    (globalThis as any).document = {
      addEventListener: (type: string, listener: any) => {
        if (!docListeners.has(type)) docListeners.set(type, new Set());
        docListeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: any) => {
        docListeners.get(type)?.delete(listener);
      },
    };

    (globalThis as any).window = {
      addEventListener: (type: string, listener: any) => {
        if (!winListeners.has(type)) winListeners.set(type, new Set());
        winListeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: any) => {
        winListeners.get(type)?.delete(listener);
      },
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('does not attach listeners when enabled is false', () => {
    const handler = vi.fn();
    const ref = { current: { contains: () => false } as any };

    renderHook(
      (props: { enabled: boolean }) => useClickOutside(ref, handler, props.enabled),
      { initialProps: { enabled: false } }
    );

    expect(docListeners.get('mousedown')?.size || 0).toBe(0);
    expect(winListeners.get('keydown')?.size || 0).toBe(0);
  });

  it('attaches listeners when enabled is true and calls handler on outside click', () => {
    const handler = vi.fn();
    const targetElement = {};
    const ref = {
      current: {
        contains: (target: any) => target === targetElement,
      } as any,
    };

    const { unmount } = renderHook(
      (props: { enabled: boolean }) => useClickOutside(ref, handler, props.enabled),
      { initialProps: { enabled: true } }
    );

    expect(docListeners.get('mousedown')?.size).toBe(1);

    // Click inside ref element -> should NOT trigger handler
    const mousedownListener = Array.from(docListeners.get('mousedown')!)[0];
    mousedownListener({ target: targetElement });
    expect(handler).not.toHaveBeenCalled();

    // Click outside ref element -> SHOULD trigger handler
    mousedownListener({ target: {} });
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    expect(docListeners.get('mousedown')?.size).toBe(0);
  });

  it('handles Escape key by calling handler and stopping propagation', () => {
    const handler = vi.fn();
    const ref = { current: { contains: () => false } as any };

    const { unmount } = renderHook(
      () => useClickOutside(ref, handler, true),
      { initialProps: {} }
    );

    const keydownListener = Array.from(winListeners.get('keydown')!)[0];
    const stopPropagationSpy = vi.fn();

    // Non-Escape key does not trigger handler
    keydownListener({ key: 'Enter', stopPropagation: stopPropagationSpy });
    expect(handler).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();

    // Escape key triggers handler and stops propagation
    keydownListener({ key: 'Escape', stopPropagation: stopPropagationSpy });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(stopPropagationSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(winListeners.get('keydown')?.size).toBe(0);
  });
});
