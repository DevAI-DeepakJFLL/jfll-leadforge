import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  QuickTouchpointLogger,
  TOUCHPOINT_ACTIONS,
  QuickTouchpointLoggerProps,
} from '@/components/approach/QuickTouchpointLogger';
import { logApproach } from '@/services/approachLogService';
import { showToast } from '@/components/ui';
import { UserSession } from '@/types/auth';

vi.mock('@/services/approachLogService', () => ({
  logApproach: vi.fn(),
}));

vi.mock('@/components/ui', () => ({
  showToast: vi.fn(),
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/services/authService', () => ({
  getStoredSession: vi.fn(() => ({
    email: 'snehal.birje@jfll.com',
    name: 'Snehal Birje',
    role: 'Commercial',
    token: 'test-session-tok',
  })),
}));

/**
 * Lightweight React component dispatcher to execute hooks in Node/Vitest test environment.
 */
function renderComponent<P>(Component: React.FC<P>, props: P) {
  let hookIndex = 0;
  const hooks: any[] = [];
  let currentTree: any = null;

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
          render();
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
    useCallback<T extends Function>(callback: T): T {
      return callback;
    },
    useMemo<T>(factory: () => T): T {
      return factory();
    },
    useEffect() {},
    useContext<T>(context: any): T {
      return (context?._currentValue as T) || ({ showToast: vi.fn() } as unknown as T);
    },
  };

  function render() {
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

  render();
  return {
    get tree() {
      return currentTree;
    },
    rerender: render,
  };
}

function findButtons(node: any): any[] {
  const buttons: any[] = [];
  function traverse(n: any) {
    if (!n) return;
    if (n.type === 'button') {
      buttons.push(n);
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
  return buttons;
}

describe('QuickTouchpointLogger Component Suite', () => {
  const defaultProps: QuickTouchpointLoggerProps = {
    entityType: 'datamyne',
    entityId: 'lead-test-001',
    companyName: 'APEX LOGISTICS INC',
    contactPerson: 'John Doe',
    phone: '+1 555-0199',
    email: 'johndoe@apex.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (logApproach as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      entity_type: 'datamyne',
      entity_id: 'lead-test-001',
      current_status: 'Contacted',
      is_active_converted: false,
      logs: [],
    });
  });

  describe('Micro-Action Logging Behaviors', () => {
    it('logs a call with status "unreachable" when clicking "No Answer" / "Voicemail"', async () => {
      const onLogged = vi.fn();
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        onLogged,
      });

      const buttons = findButtons(tree);
      const noAnswerBtn = buttons.find((b) => b.props['aria-label'] === 'No Answer / Voicemail');
      expect(noAnswerBtn).toBeDefined();

      await noAnswerBtn.props.onClick();

      expect(logApproach).toHaveBeenCalledTimes(1);
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'datamyne',
          entityId: 'lead-test-001',
          companyName: 'APEX LOGISTICS INC',
          action: 'call',
          status: 'unreachable',
          salespersonName: 'Snehal Birje',
          salespersonEmail: 'snehal.birje@jfll.com',
        })
      );

      expect(showToast).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Logged call: No Answer / Unreachable'),
        'info'
      );
      expect(onLogged).toHaveBeenCalledWith('unreachable');
    });

    it('logs a call with status "connected" when clicking "Connected"', async () => {
      const onLogged = vi.fn();
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        onLogged,
      });

      const buttons = findButtons(tree);
      const connectedBtn = buttons.find((b) => b.props['aria-label'] === 'Connected');
      expect(connectedBtn).toBeDefined();

      await connectedBtn.props.onClick();

      expect(logApproach).toHaveBeenCalledTimes(1);
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'datamyne',
          entityId: 'lead-test-001',
          action: 'call',
          status: 'connected',
        })
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Logged call: Connected'),
        'success'
      );
      expect(onLogged).toHaveBeenCalledWith('connected');
    });

    it('logs an email with status "sent" when clicking "Email Sent"', async () => {
      const onLogged = vi.fn();
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        onLogged,
      });

      const buttons = findButtons(tree);
      const emailBtn = buttons.find((b) => b.props['aria-label'] === 'Email Sent');
      expect(emailBtn).toBeDefined();

      await emailBtn.props.onClick();

      expect(logApproach).toHaveBeenCalledTimes(1);
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'datamyne',
          entityId: 'lead-test-001',
          action: 'email',
          status: 'sent',
        })
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Logged intro email sent'),
        'success'
      );
      expect(onLogged).toHaveBeenCalledWith('sent');
    });

    it('logs a meeting with status "scheduled" when clicking "Meeting Booked"', async () => {
      const onLogged = vi.fn();
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        onLogged,
      });

      const buttons = findButtons(tree);
      const meetingBtn = buttons.find((b) => b.props['aria-label'] === 'Meeting Booked');
      expect(meetingBtn).toBeDefined();

      await meetingBtn.props.onClick();

      expect(logApproach).toHaveBeenCalledTimes(1);
      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'datamyne',
          entityId: 'lead-test-001',
          action: 'meeting',
          status: 'scheduled',
        })
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Logged discovery meeting booked'),
        'success'
      );
      expect(onLogged).toHaveBeenCalledWith('scheduled');
    });

    it('normalizes "jfll" entityType to "jfll_customer"', async () => {
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        entityType: 'jfll' as const,
      });

      const buttons = findButtons(tree);
      await buttons[0].props.onClick();

      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'jfll_customer',
        })
      );
    });

    it('uses explicit currentUser props when provided over stored session', async () => {
      const mockCustomUser: UserSession = {
        name: 'Deepak Naidu',
        email: 'deepak.naidu@jfll.com',
        role: 'Tech Lead',
        token: 'custom-token',
      };

      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        currentUser: mockCustomUser,
      });

      const buttons = findButtons(tree);
      await buttons[1].props.onClick();

      expect(logApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          salespersonName: 'Deepak Naidu',
          salespersonEmail: 'deepak.naidu@jfll.com',
        })
      );
    });

    it('handles logApproach service errors gracefully with error toast', async () => {
      (logApproach as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network offline or backend unreachable')
      );

      const onLogged = vi.fn();
      const { tree } = renderComponent(QuickTouchpointLogger, {
        ...defaultProps,
        onLogged,
      });

      const buttons = findButtons(tree);
      await buttons[0].props.onClick();

      expect(showToast).toHaveBeenCalledWith(
        'Network offline or backend unreachable',
        'error'
      );
      expect(onLogged).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility & Touch Target Standards', () => {
    it('renders all 4 action buttons with touch targets >= 44x44px and accessible attributes', () => {
      const html = renderToString(<QuickTouchpointLogger {...defaultProps} />);

      // Container has role="group" and aria-label
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label="Quick touchpoint actions"');

      // Verify every button guarantees min-h-[44px] and min-w-[44px]
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');

      // Verify accessible labels for all micro-actions
      for (const item of TOUCHPOINT_ACTIONS) {
        expect(html).toContain(`aria-label="${item.ariaLabel}"`);
        expect(html).toContain(`title="${item.tooltip}"`);
        expect(html).toContain(item.label);
      }
    });

    it('renders clean icons for PhoneOff, PhoneCall, Mail, and CalendarCheck2', () => {
      const html = renderToString(<QuickTouchpointLogger {...defaultProps} />);

      // Lucide icons render SVG elements
      const svgCount = (html.match(/<svg/g) || []).length;
      expect(svgCount).toBe(4);
    });
  });
});
