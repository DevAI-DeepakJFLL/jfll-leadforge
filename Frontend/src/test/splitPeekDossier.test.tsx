import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SplitPeekDossier, SplitPeekDossierProps } from '@/components/common/SplitPeekDossier';

/**
 * EventTarget mock with standard W3C capture & bubble phase execution semantics
 * for testing Escape key behavior in Node environment.
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
    preventDefault?: () => void;
  }): boolean {
    const list = Array.from(this.bubbleListeners.get(event.type) || []);
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
    useContext<T>(context: any): T {
      return (context?._currentValue as T) || ({} as T);
    },
  };

  function render(props: P) {
    currentProps = props;
    hookIndex = 0;
    const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
    reactInternals.ReactCurrentDispatcher.current = dispatcher;
    try {
      currentTree = Component(props);
      return currentTree;
    } finally {
      reactInternals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  }

  function rerender(newProps: P) {
    return render(newProps);
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
    get tree() {
      return currentTree;
    },
    rerender,
    unmount,
  };
}

/**
 * Traverses React element tree to find all elements matching a predicate or node type.
 */
function findNodes(node: any, predicate: (n: any) => boolean): any[] {
  const result: any[] = [];
  function traverse(n: any) {
    if (!n) return;
    if (predicate(n)) {
      result.push(n);
    }
    if (Array.isArray(n)) {
      n.forEach(traverse);
    } else if (n.props?.children) {
      if (Array.isArray(n.props.children)) {
        n.props.children.forEach(traverse);
      } else {
        traverse(n.props.children);
      }
    }
  }
  traverse(node);
  return result;
}

function findButtons(node: any): any[] {
  return findNodes(node, (n) => n?.type === 'button');
}

describe('SplitPeekDossier Component Suite', () => {
  let mockWindow: MockWindow;
  let originalWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWindow = (globalThis as any).window;
    mockWindow = new MockWindow();
    (globalThis as any).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  describe('1. Rendering Visibility & Null State', () => {
    it('returns null and does not render when isOpen === false', () => {
      const onClose = vi.fn();
      const props: SplitPeekDossierProps = {
        isOpen: false,
        onClose,
        title: 'TRENT LIMITED',
        children: <div data-testid="lead-details">Trent Ltd Details</div>,
      };

      const { tree } = renderComponent(SplitPeekDossier, props);
      expect(tree).toBeNull();

      const html = renderToString(<SplitPeekDossier {...props} />);
      expect(html).toBe('');
      expect(html).not.toContain('TRENT LIMITED');
      expect(html).not.toContain('lead-details');
    });

    it('renders docked right panel and children when isOpen === true', () => {
      const onClose = vi.fn();
      const props: SplitPeekDossierProps = {
        isOpen: true,
        onClose,
        title: 'TRENT LIMITED',
        subtitle: 'Apparel Exporter • Mumbai',
        children: <div data-testid="lead-details">Active Lead Dossier Content</div>,
      };

      const html = renderToString(<SplitPeekDossier {...props} />);
      expect(html).toContain('TRENT LIMITED');
      expect(html).toContain('Apparel Exporter • Mumbai');
      expect(html).toContain('Active Lead Dossier Content');
      expect(html).toContain('data-testid="lead-details"');
    });
  });

  describe('2. Title & Subtitle Display', () => {
    it('renders the provided title and subtitle text cleanly', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="RELIANCE RETAIL LIMITED"
          subtitle="Tier 1 • High Priority Consignee"
        >
          <div>Details</div>
        </SplitPeekDossier>
      );

      expect(html).toContain('RELIANCE RETAIL LIMITED');
      expect(html).toContain('Tier 1 • High Priority Consignee');
    });

    it('renders cleanly without subtitle when subtitle prop is omitted', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="TATA MOTORS LIMITED"
        >
          <div>Details</div>
        </SplitPeekDossier>
      );

      expect(html).toContain('TATA MOTORS LIMITED');
      expect(html).not.toContain('<p class="text-xs text-slate-500');
    });
  });

  describe('3. Queue Counter Indicator ("Lead 3 of 25")', () => {
    it('renders queue counter "Lead 3 of 25" when currentIndex={2} and totalCount={25}', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="KALYAN JEWELLERS"
          currentIndex={2}
          totalCount={25}
        >
          <div>Details</div>
        </SplitPeekDossier>
      );

      expect(html).toContain('Lead 3 of 25');
      expect(html).toContain('data-testid="queue-counter"');
    });

    it('renders queue counter "Lead 1 of 10" for the first lead (currentIndex={0})', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="ADANI ENTERPRISES"
          currentIndex={0}
          totalCount={10}
        >
          <div>Details</div>
        </SplitPeekDossier>
      );

      expect(html).toContain('Lead 1 of 10');
    });

    it('supports custom queueLabel e.g. "Record 3 of 25"', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="HINDALCO INDUSTRIES"
          currentIndex={2}
          totalCount={25}
          queueLabel="Record"
        >
          <div>Details</div>
        </SplitPeekDossier>
      );

      expect(html).toContain('Record 3 of 25');
    });

    it('does not render queue counter badge if currentIndex or totalCount is undefined', () => {
      const htmlNoIndex = renderToString(
        <SplitPeekDossier isOpen={true} onClose={vi.fn()} title="Test Lead" totalCount={25}>
          <div>Details</div>
        </SplitPeekDossier>
      );
      expect(htmlNoIndex).not.toContain('data-testid="queue-counter"');

      const htmlNoTotal = renderToString(
        <SplitPeekDossier isOpen={true} onClose={vi.fn()} title="Test Lead" currentIndex={2}>
          <div>Details</div>
        </SplitPeekDossier>
      );
      expect(htmlNoTotal).not.toContain('data-testid="queue-counter"');
    });
  });

  describe('4. Next and Prev Navigation Buttons', () => {
    it('invokes onNext and onPrev callbacks when clicking Next and Prev buttons', () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Lead in middle of queue',
        currentIndex: 5,
        totalCount: 20,
        onPrev,
        onNext,
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const prevBtn = buttons.find((b) => b.props['aria-label'] === 'Previous record');
      const nextBtn = buttons.find((b) => b.props['aria-label'] === 'Next record');

      expect(prevBtn).toBeDefined();
      expect(nextBtn).toBeDefined();
      expect(prevBtn.props.disabled).toBe(false);
      expect(nextBtn.props.disabled).toBe(false);

      prevBtn.props.onClick();
      expect(onPrev).toHaveBeenCalledTimes(1);

      nextBtn.props.onClick();
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables Prev button when currentIndex is 0 (first record)', () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'First lead',
        currentIndex: 0,
        totalCount: 15,
        onPrev,
        onNext,
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const prevBtn = buttons.find((b) => b.props['aria-label'] === 'Previous record');
      const nextBtn = buttons.find((b) => b.props['aria-label'] === 'Next record');

      expect(prevBtn.props.disabled).toBe(true);
      expect(nextBtn.props.disabled).toBe(false);
    });

    it('disables Next button when currentIndex is totalCount - 1 (last record)', () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Last lead',
        currentIndex: 14,
        totalCount: 15,
        onPrev,
        onNext,
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const prevBtn = buttons.find((b) => b.props['aria-label'] === 'Previous record');
      const nextBtn = buttons.find((b) => b.props['aria-label'] === 'Next record');

      expect(prevBtn.props.disabled).toBe(false);
      expect(nextBtn.props.disabled).toBe(true);
    });
  });

  describe('5. Expand Full Action Button', () => {
    it('invokes onExpandFull callback when clicking the Expand button', () => {
      const onExpandFull = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'TRENT LIMITED',
        onExpandFull,
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const expandBtn = buttons.find((b) => b.props['aria-label'] === 'Expand full');
      expect(expandBtn).toBeDefined();

      expandBtn.props.onClick();
      expect(onExpandFull).toHaveBeenCalledTimes(1);
    });

    it('does not render expand button when onExpandFull is omitted', () => {
      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'TRENT LIMITED',
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const expandBtn = buttons.find((b) => b.props['aria-label'] === 'Expand full');
      expect(expandBtn).toBeUndefined();
    });
  });

  describe('6. Close Button & Mobile Backdrop Dismissal', () => {
    it('invokes onClose when clicking the header Close button', () => {
      const onClose = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose,
        title: 'Close Me',
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      const closeBtn = buttons.find((b) => b.props['aria-label'] === 'Close dossier');
      expect(closeBtn).toBeDefined();

      closeBtn.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('invokes onClose when clicking the mobile backdrop overlay', () => {
      const onClose = vi.fn();

      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose,
        title: 'Backdrop dismissal test',
        children: <div>Content</div>,
      });

      const backdropNodes = findNodes(tree, (n) => n?.props?.['data-testid'] === 'split-peek-backdrop');
      expect(backdropNodes.length).toBe(1);

      backdropNodes[0].props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('7. Keyboard Accessibility (Escape Key)', () => {
    it('calls onClose when Escape key is pressed while dossier is open', () => {
      const onClose = vi.fn();

      const { unmount } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose,
        title: 'Escape Key Test',
        children: <div>Content</div>,
      });

      const event = {
        type: 'keydown',
        key: 'Escape',
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      };

      mockWindow.dispatchEvent(event);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('does not trigger onClose if non-Escape key is pressed', () => {
      const onClose = vi.fn();

      const { unmount } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose,
        title: 'Other Key Test',
        children: <div>Content</div>,
      });

      mockWindow.dispatchEvent({
        type: 'keydown',
        key: 'Enter',
      });

      expect(onClose).not.toHaveBeenCalled();

      unmount();
    });

    it('removes the keydown listener from window when unmounted', () => {
      const onClose = vi.fn();

      const { unmount } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose,
        title: 'Unmount test',
        children: <div>Content</div>,
      });

      unmount();

      mockWindow.dispatchEvent({
        type: 'keydown',
        key: 'Escape',
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('8. Touch Targets (>= 44x44px) & Accessibility Attributes', () => {
    it('guarantees touch targets >= 44x44px and accessible labels on all interactive buttons', () => {
      const { tree } = renderComponent(SplitPeekDossier, {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Touch Target Audit',
        currentIndex: 3,
        totalCount: 10,
        onPrev: vi.fn(),
        onNext: vi.fn(),
        onExpandFull: vi.fn(),
        children: <div>Content</div>,
      });

      const buttons = findButtons(tree);
      expect(buttons.length).toBe(4); // Prev, Next, Expand, Close

      buttons.forEach((btn) => {
        const className = btn.props.className || '';
        const ariaLabel = btn.props['aria-label'];

        // Touch target check
        expect(className).toContain('min-h-[44px]');
        expect(className).toContain('min-w-[44px]');

        // Accessibility label check
        expect(typeof ariaLabel).toBe('string');
        expect(ariaLabel.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('9. 60/40 Split Docked Desktop Panel & Mobile Slide-Over Layout', () => {
    it('applies the required docked panel styling on desktop without dark backdrop', () => {
      const html = renderToString(
        <SplitPeekDossier
          isOpen={true}
          onClose={vi.fn()}
          title="Layout Test"
          className="custom-panel-class"
        >
          <div>Content</div>
        </SplitPeekDossier>
      );

      // Docked panel classes
      expect(html).toContain('w-full lg:w-[440px] xl:w-[480px]');
      expect(html).toContain('shrink-0 border-l border-slate-200/90 bg-white h-full flex flex-col z-20 shadow-sm relative');
      expect(html).toContain('custom-panel-class');

      // Mobile backdrop overlay has lg:hidden (NO dark backdrop on desktop)
      expect(html).toContain('fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-xs');

      // Scrollable content body
      expect(html).toContain('flex-1 overflow-y-auto');
    });
  });
});
