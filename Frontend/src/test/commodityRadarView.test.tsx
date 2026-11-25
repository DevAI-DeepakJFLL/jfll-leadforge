import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CommodityRadarView } from '@/components/commodities/CommodityRadarView';
import { CommodityDetailDrawer } from '@/components/commodities/CommodityDetailDrawer';
import { MONTHLY_COMMODITY_RECORDS } from '@/data/freightCommoditiesData';
import { MonthlyRecord } from '@/types/freightCommodities';

/**
 * Lightweight React component execution runner for testing hooks and interaction handlers
 * without JSDOM.
 */
function renderRunner<P>(Component: React.FC<P>, initialProps: P) {
  let cleanups: (((() => void) | void)[]) = [];
  let hookIndex = 0;
  const hooks: any[] = [];
  let currentProps = initialProps;
  let latestVNode: any = null;

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
  };

  function render(props: P) {
    currentProps = props;
    hookIndex = 0;
    const reactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = reactInternals.ReactCurrentDispatcher.current;
    reactInternals.ReactCurrentDispatcher.current = dispatcher;
    try {
      latestVNode = Component(props);
    } finally {
      reactInternals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  }

  render(initialProps);

  return {
    getVNode: () => latestVNode,
    rerender: (newProps: P) => render(newProps),
    unmount: () => {
      cleanups.forEach((c) => typeof c === 'function' && c());
      cleanups = [];
    },
  };
}

describe('CommodityRadarView Component Suite', () => {
  it('renders the header, default November controls, and all 8 gateway hubs', () => {
    const html = renderToString(<CommodityRadarView />);

    expect(html).toContain('Commodity Targeting Radar');
    expect(html).toContain('National Seasonal Intelligence');
    expect(html).toContain('3.96M MT Air · $8.46B Marine · $4.43B Spices');

    // Verify all 8 hub filter buttons are rendered
    expect(html).toContain('>ALL<');
    expect(html).toContain('>DEL<');
    expect(html).toContain('>BOM<');
    expect(html).toContain('>BLR<');
    expect(html).toContain('>MAA<');
    expect(html).toContain('>HYD<');
    expect(html).toContain('>CCU<');
    expect(html).toContain('>AMD<');
    expect(html).toContain('>COK<');

    // Verify metric strip
    expect(html).toContain('Active Season');
    expect(html).toContain('Active Gateways');
    expect(html).toContain('Booking Lead Windows');
    expect(html).toContain('Cold-Chain Regimes');

    // Default lands on November (M11)
    expect(html).toContain('M11 · November (Active Peak)');
  });

  it('renders modal quadrants (Air Export, Sea Export, Air Import, Sea Import) for hub cards', () => {
    const html = renderToString(
      <CommodityRadarView
        onFindInDatamyne={() => {}}
        onFindInApollo={() => {}}
      />
    );

    expect(html).toContain('Air Export Lots');
    expect(html).toContain('Sea Export Reefers/FCL');
    expect(html).toContain('Air Inbound Inputs');
    expect(html).toContain('Sea Raw Materials');

    // Action buttons rendered on each card
    expect(html).toContain('View Playbook &amp; Pitch Script');
    expect(html).toContain('Find in DataMyne');
    expect(html).toContain('Find in Apollo');
  });

  it('renders 1-click action triggers when callbacks are provided', () => {
    const html = renderToString(
      <CommodityRadarView
        onFindInDatamyne={() => {}}
        onFindInApollo={() => {}}
        onNavigateToReport={() => {}}
      />
    );

    expect(html).toContain('Find in DataMyne');
    expect(html).toContain('Find in Apollo');
  });

  it('honors initialMonth and initialHub props and defaults correctly', () => {
    const onFilterChange = vi.fn();
    const html = renderToString(
      <CommodityRadarView
        initialMonth={3}
        initialHub="BOM"
        onFilterChange={onFilterChange}
      />
    );

    // Month 3 selected
    expect(html).toContain('M03 · March');
    // BOM Hub selected
    expect(html).toContain('>BOM<');
    expect(html).toContain('bg-white text-blue-700 shadow-2xs">BOM<');
    // Hub segmented controls have mobile overflow scrolling affordance
    expect(html).toContain('overflow-x-auto scrollbar-none');
  });

  it('renders interactive empty state with suggested query chips when no records match', () => {
    const html = renderToString(
      <CommodityRadarView
        initialSearchQuery="NonExistentCommodityQueryXYZ"
      />
    );

    expect(html).toContain('No seasonal targets match your filter');
    expect(html).toContain('Suggested searches:');
    expect(html).toContain('Table Grapes');
    expect(html).toContain('Basmati Rice');
    expect(html).toContain('Shrimp');
    expect(html).toContain('Vaccines');
    expect(html).toContain('Spices');
    expect(html).toContain('Reset Filters to Default');
  });

  it('clears search input when Escape key is pressed (Apple HIG)', () => {
    const runner = renderRunner(CommodityRadarView, { initialSearchQuery: 'Table Grapes' });
    const vnode = runner.getVNode();

    function findInput(node: any): any {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'input' && node.props?.onKeyDown) return node;
      if (Array.isArray(node.props?.children)) {
        for (const child of node.props.children) {
          const res = findInput(child);
          if (res) return res;
        }
      } else if (node.props?.children) {
        return findInput(node.props.children);
      }
      return null;
    }

    const inputNode = findInput(vnode);
    expect(inputNode).toBeDefined();
    expect(inputNode.props.value).toBe('Table Grapes');

    // Trigger onKeyDown with Escape
    inputNode.props.onKeyDown({ key: 'Escape' });

    // Check updated tree
    const updatedVNode = runner.getVNode();
    const updatedInput = findInput(updatedVNode);
    expect(updatedInput.props.value).toBe('');
  });

  it('clicking suggested query chips updates search query to selected term', () => {
    const runner = renderRunner(CommodityRadarView, { initialSearchQuery: 'NoMatchXYZ' });
    const vnode = runner.getVNode();

    function findChipButtons(node: any): any[] {
      const results: any[] = [];
      function traverse(n: any) {
        if (!n) return;
        if (Array.isArray(n)) {
          n.forEach(traverse);
          return;
        }
        if (typeof n !== 'object') return;
        if (n.type === 'button' && ['Table Grapes', 'Basmati Rice', 'Shrimp', 'Vaccines', 'Spices'].includes(n.props?.children)) {
          results.push(n);
        }
        if (n.props?.children) {
          traverse(n.props.children);
        }
      }
      traverse(node);
      return results;
    }

    const chips = findChipButtons(vnode);
    expect(chips.length).toBe(5);

    // Click 'Basmati Rice' chip
    const basmatiChip = chips.find((c) => c.props.children === 'Basmati Rice');
    expect(basmatiChip).toBeDefined();
    basmatiChip.props.onClick();

    // Search query should now be 'Basmati Rice'
    function findInput(node: any): any {
      if (!node) return null;
      if (Array.isArray(node)) {
        for (const child of node) {
          const res = findInput(child);
          if (res) return res;
        }
        return null;
      }
      if (typeof node !== 'object') return null;
      if (node.type === 'input' && node.props?.onKeyDown) return node;
      if (node.props?.children) {
        return findInput(node.props.children);
      }
      return null;
    }

    const updatedVNode = runner.getVNode();
    const inputNode = findInput(updatedVNode);
    expect(inputNode.props.value).toBe('Basmati Rice');
  });

  it('triggers onFilterChange callback when month or hub is selected', () => {
    const onFilterChange = vi.fn();
    const runner = renderRunner(CommodityRadarView, { onFilterChange });
    const vnode = runner.getVNode();

    function findSelect(node: any): any {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'select') return node;
      if (Array.isArray(node.props?.children)) {
        for (const child of node.props.children) {
          const res = findSelect(child);
          if (res) return res;
        }
      } else if (node.props?.children) {
        return findSelect(node.props.children);
      }
      return null;
    }

    const selectNode = findSelect(vnode);
    expect(selectNode).toBeDefined();

    // Change month to 5 (May)
    selectNode.props.onChange({ target: { value: '5' } });
    expect(onFilterChange).toHaveBeenCalledWith(5, 'ALL');

    // Find BOM hub button
    function findHubButton(node: any, code: string): any {
      if (!node || typeof node !== 'object') return null;
      if (node.type === 'button' && node.props?.children === code) return node;
      if (Array.isArray(node.props?.children)) {
        for (const child of node.props.children) {
          const res = findHubButton(child, code);
          if (res) return res;
        }
      } else if (node.props?.children) {
        return findHubButton(node.props.children, code);
      }
      return null;
    }

    const updatedVNode = runner.getVNode();
    const bomButton = findHubButton(updatedVNode, 'BOM');
    expect(bomButton).toBeDefined();

    bomButton.props.onClick();
    expect(onFilterChange).toHaveBeenCalledWith(5, 'BOM');
  });

  it('renders inside sales visualisations including Regional Demand Matrix and Top Trending Commodities', () => {
    const html = renderToString(<CommodityRadarView />);

    // Regional Demand Matrix
    expect(html).toContain('Regional Export Demand Matrix');
    expect(html).toContain('North Region');
    expect(html).toContain('West Region');
    expect(html).toContain('South Region');
    expect(html).toContain('East Region');
    expect(html).toContain('Seasonal Capacity Mix:');
    expect(html).toContain('Ocean Reefers: 42%');
    expect(html).toContain('Air Perishables: 38%');

    // Top Trending Commodities Leaderboard
    expect(html).toContain('Top Trending Commodities');
    expect(html).toContain('Highest sales conversion targets this month');
    expect(html).toContain('Basmati Rice');
  });

  it('renders Annual Gateway Surge Heatmap Matrix and Global Trade Corridors visualisations', () => {
    const html = renderToString(<CommodityRadarView />);

    // Annual Gateway Surge Heatmap Matrix
    expect(html).toContain('Annual Gateway Surge Heatmap Matrix');
    expect(html).toContain('Active Peak Surge');
    expect(html).toContain('Upcoming Lead Window');
    expect(html).toContain('High Volume Flow');

    // Global Trade Corridors & Multi-Modal Flow Radar
    expect(html).toContain('Global Trade Corridors &amp; Multi-Modal Flow Radar');
    expect(html).toContain('Europe &amp; UK Gateway');
    expect(html).toContain('GCC &amp; Middle East');
    expect(html).toContain('North America');
    expect(html).toContain('Far East &amp; Asia-Pacific');
  });

  it('clicking a heatmap cell invokes onFilterChange with cell month and hub', () => {
    const onFilterChange = vi.fn();
    const runner = renderRunner(CommodityRadarView, { onFilterChange });

    // Find heatmap button for BOM in March (M03)
    let bomMarchBtn: any = null;
    function traverse(n: any) {
      if (!n || bomMarchBtn) return;
      if (Array.isArray(n)) {
        n.forEach(traverse);
        return;
      }
      if (typeof n !== 'object') return;
      if (n.type === 'button' && typeof n.props?.title === 'string' && n.props.title.includes('BOM · M03 · March')) {
        bomMarchBtn = n;
        return;
      }
      if (n.props?.children) {
        traverse(n.props.children);
      }
    }

    traverse(runner.getVNode());
    expect(bomMarchBtn).toBeDefined();
    expect(bomMarchBtn).not.toBeNull();

    bomMarchBtn.props.onClick();
    expect(onFilterChange).toHaveBeenCalledWith(3, 'BOM');
  });

  it('scroll container uses flex-1 overflow-y-auto min-h-0 overscroll-y-contain to fix scroll issue', () => {
    const html = renderToString(<CommodityRadarView />);

    expect(html).toContain('flex-1 overflow-y-auto min-h-0');
    expect(html).toContain('overscroll-y-contain');
  });

  it('searching a commodity across months returns results and instant search banner', () => {
    const html = renderToString(<CommodityRadarView initialSearchQuery="Grapes" />);

    // Search Results Banner appears at top with match count across all 12 months
    expect(html).toContain('Search Results for');
    expect(html).toContain('Grapes');
    expect(html).toContain('Across All 12 Months');
    expect(html).toContain('Clear Search (Esc)');

    // Returns matching grape records from February/March even though default month is November
    expect(html).toContain('Nashik Table Grape Export Start');
    expect(html).toContain('Peak Europe Grape &amp; Onion Reefer');
    expect(html).toContain('BOM');
  });

  it('renders clean freight surge indicator badges in heatmap without repetitive text clutter', () => {
    const html = renderToString(<CommodityRadarView />);

    // Renders clean indicators
    expect(html).toContain('PEAK');
    expect(html).toContain('LEAD');
    expect(html).toContain('FLOW');
  });

  it('triggers onFindInDatamyne and onFindInApollo with clean primary commodity keywords', () => {
    let datamyneTarget = '';
    let apolloTarget = '';

    const runner = renderRunner(CommodityRadarView, {
      initialMonth: 1,
      initialHub: 'BOM',
      onFindInDatamyne: (term: string) => { datamyneTarget = term; },
      onFindInApollo: (term: string) => { apolloTarget = term; },
    });

    // Find and click the DataMyne button on the BOM card
    function findButtons(node: any): any[] {
      const results: any[] = [];
      function traverse(n: any) {
        if (!n) return;
        if (Array.isArray(n)) {
          n.forEach(traverse);
          return;
        }
        if (typeof n !== 'object') return;
        if (n.type === 'button' && typeof n.props?.onClick === 'function') {
          results.push(n);
        }
        if (n.props?.children) {
          traverse(n.props.children);
        }
      }
      traverse(node);
      return results;
    }

    const buttons = findButtons(runner.getVNode());
    const dmBtn = buttons.find((b) => b.props.title?.includes('Find in DataMyne'));
    const apBtn = buttons.find((b) => b.props.title?.includes('Find in Apollo'));

    expect(dmBtn).toBeDefined();
    expect(apBtn).toBeDefined();

    dmBtn.props.onClick();
    expect(datamyneTarget).toContain('Table Grapes');

    apBtn.props.onClick();
    expect(apolloTarget).toContain('Table Grapes');
  });
});

describe('CommodityDetailDrawer Component Suite', () => {
  it('renders complete tabs, cold-chain regimes, and pre-composed pitch script when open', () => {
    const record = MONTHLY_COMMODITY_RECORDS[0]; // Delhi NCR M01
    const html = renderToString(
      <CommodityDetailDrawer
        isOpen={true}
        record={record}
        onClose={() => {}}
        onFindInDatamyne={() => {}}
        onFindInApollo={() => {}}
      />
    );

    expect(html).toContain('Delhi NCR');
    expect(html).toContain('Operational Playbook');
    expect(html).toContain('Cold-Chain Regimes');
    expect(html).toContain('Sales Pitch Script');

    // Verify equipment and gateways in drawer
    expect(html).toContain('Air LD3/LD7');
    expect(html).toContain('Commercial Booking Lead Window:');
    expect(html).toContain('Dec – Jan Booking');

    // Verify action buttons in sticky drawer footer
    expect(html).toContain('Copy Sales Pitch');
    expect(html).toContain('Find Shippers in DataMyne');
    expect(html).toContain('Find in Apollo');
  });

  it('implements MWG-1, MWG-2, MWG-3, and IMP-1 enhancements (overscroll-contain, 100svh, live status, clean title)', () => {
    const record = MONTHLY_COMMODITY_RECORDS[0];
    const html = renderToString(
      <CommodityDetailDrawer
        isOpen={true}
        record={record}
        onClose={() => {}}
      />
    );

    // MWG-1: overscroll-contain on backdrop and aside
    expect(html).toContain('overscroll-contain');

    // MWG-2: h-[100svh] max-h-[100svh] on aside
    expect(html).toContain('h-[100svh] max-h-[100svh]');

    // MWG-3: Screen reader live announcement element outside copy buttons
    expect(html).toContain('role="status" aria-live="polite" class="sr-only"');

    // IMP-1: Clean title without decorative uppercase kicker
    expect(html).not.toContain('Seasonal Cycle &amp; Trade Driver');
    expect(html).toContain(record.season);
  });

  it('defensively parses clusters with commas, parens, or empty strings in footer actions', () => {
    const mockRecord: MonthlyRecord = {
      ...MONTHLY_COMMODITY_RECORDS[0],
      clusters: 'Nashik (Grapes), Sangli (Turmeric)',
    };

    let reportedTarget = '';
    let datamyneTarget = '';
    let apolloTarget = '';

    const runner = renderRunner(CommodityDetailDrawer, {
      isOpen: true,
      record: mockRecord,
      onClose: () => {},
      onNavigateToReport: (q: string) => { reportedTarget = q; },
      onFindInDatamyne: (q: string) => { datamyneTarget = q; },
      onFindInApollo: (q: string) => { apolloTarget = q; },
    });

    function findActionButtons(node: any): any[] {
      const results: any[] = [];
      function traverse(n: any) {
        if (!n) return;
        if (Array.isArray(n)) {
          n.forEach(traverse);
          return;
        }
        if (typeof n !== 'object') return;
        if (n.type === 'button' && typeof n.props?.onClick === 'function') {
          results.push(n);
        }
        if (n.props?.children) {
          traverse(n.props.children);
        }
      }
      traverse(node);
      return results;
    }

    const buttons = findActionButtons(runner.getVNode());
    buttons.forEach((b) => b.props.onClick());

    expect(reportedTarget).toBe('Nashik');
    expect(datamyneTarget).toBe('Nashik');
    expect(apolloTarget).toBe('Nashik');

    // Test with empty cluster string falling back to hubName
    const emptyClusterRecord: MonthlyRecord = {
      ...MONTHLY_COMMODITY_RECORDS[0],
      clusters: '',
    };
    const emptyRunner = renderRunner(CommodityDetailDrawer, {
      isOpen: true,
      record: emptyClusterRecord,
      onClose: () => {},
      onNavigateToReport: (q: string) => { reportedTarget = q; },
      onFindInDatamyne: (q: string) => { datamyneTarget = q; },
      onFindInApollo: (q: string) => { apolloTarget = q; },
    });

    const emptyButtons = findActionButtons(emptyRunner.getVNode());
    emptyButtons.forEach((b) => b.props.onClick());

    expect(reportedTarget).toBe(emptyClusterRecord.hubName);
    expect(datamyneTarget).toBe(emptyClusterRecord.hubName);
    expect(apolloTarget).toBe(emptyClusterRecord.hubName);
  });

  it('renders nothing when isOpen is false or record is null', () => {
    const htmlClosed = renderToString(
      <CommodityDetailDrawer
        isOpen={false}
        record={MONTHLY_COMMODITY_RECORDS[0]}
        onClose={() => {}}
      />
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToString(
      <CommodityDetailDrawer
        isOpen={true}
        record={null}
        onClose={() => {}}
      />
    );
    expect(htmlNull).toBe('');
  });
});
