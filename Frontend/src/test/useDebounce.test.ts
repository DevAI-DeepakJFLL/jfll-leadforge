import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Lightweight hook test runner that executes React hooks using React's internal
 * dispatcher in headless / SSR / Node testing environments without requiring JSDOM.
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

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately on first render', () => {
    const { result } = renderHook(({ val }) => useDebounce(val), {
      initialProps: { val: 'initial-search' },
    });

    expect(result.current).toBe('initial-search');
  });

  it('does not update debounced value before 300ms delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }: { val: string; delay?: number }) => useDebounce(val, delay),
      { initialProps: { val: 'hello' } }
    );

    expect(result.current).toBe('hello');

    // Change input value
    rerender({ val: 'hello world' });
    expect(result.current).toBe('hello');

    // Advance 299ms - should still be previous value
    vi.advanceTimersByTime(299);
    expect(result.current).toBe('hello');

    // Advance 1ms more (reaching 300ms) - should update
    vi.advanceTimersByTime(1);
    expect(result.current).toBe('hello world');
  });

  it('buffers rapid keystrokes and only resolves the last value after 300ms of inactivity', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useDebounce(query, 300),
      { initialProps: { query: 'j' } }
    );

    expect(result.current).toBe('j');

    // Simulate typing "jet freight" character by character with 50ms gaps
    rerender({ query: 'je' });
    vi.advanceTimersByTime(50);
    expect(result.current).toBe('j');

    rerender({ query: 'jet' });
    vi.advanceTimersByTime(50);
    expect(result.current).toBe('j');

    rerender({ query: 'jet ' });
    vi.advanceTimersByTime(50);
    expect(result.current).toBe('j');

    rerender({ query: 'jet freight' });
    vi.advanceTimersByTime(100);
    expect(result.current).toBe('j');

    // Wait full 300ms after final keystroke
    vi.advanceTimersByTime(200);
    expect(result.current).toBe('jet freight');
  });

  it('respects a custom delay parameter', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }: { val: string; delay: number }) => useDebounce(val, delay),
      { initialProps: { val: 'start', delay: 500 } }
    );

    expect(result.current).toBe('start');

    rerender({ val: 'updated', delay: 500 });
    vi.advanceTimersByTime(300);
    expect(result.current).toBe('start');

    vi.advanceTimersByTime(200); // 500ms total
    expect(result.current).toBe('updated');
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ val }: { val: string }) => useDebounce(val, 300),
      { initialProps: { val: 'first' } }
    );

    rerender({ val: 'second' });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
