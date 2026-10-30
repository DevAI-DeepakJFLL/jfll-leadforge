import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  SalesStatusBadge,
  LogApproachModal,
  ConvertToActiveModal,
  SalesApproachTimeline,
} from '@/components/approach';
import {
  ALL_SALES_ACTIONS,
  FUNNEL_RANKS,
  MANDATORY_NOTE_STATUSES,
  STANDARD_SELECTABLE_STATUSES,
} from '@/types/approachLog';
import {
  convertClientToActive,
  getCachedApproachStatus,
  logApproachActivity,
} from '@/services/approachLogService';

vi.mock('@/services/authService', () => ({
  getStoredSession: vi.fn(() => ({
    email: 'deepak@jfll.com',
    name: 'Deepak Naidu',
    role: 'Tech Lead',
    token: 'mock-token',
  })),
  isOfflineSession: vi.fn(() => true),
}));

vi.mock('@/components/ui', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

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

describe('Sales Approach & Active Conversion Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('SalesStatusBadge Component', () => {
    it('renders Not Contacted badge with neutral styling', () => {
      const html = renderToString(<SalesStatusBadge status="Not Contacted" />);
      expect(html).toContain('Not Contacted');
      expect(html).toContain('bg-slate-100');
    });

    it('renders Contacted badge with blue accent', () => {
      const html = renderToString(<SalesStatusBadge status="Contacted" />);
      expect(html).toContain('Contacted');
      expect(html).toContain('bg-blue-50');
    });

    it('renders In Progress badge with active pulse indicator', () => {
      const html = renderToString(<SalesStatusBadge status="In Progress" />);
      expect(html).toContain('In Progress');
      expect(html).toContain('bg-amber-50');
      expect(html).toContain('animate-ping');
    });

    it('renders Converted to Active badge with emerald styling', () => {
      const html = renderToString(<SalesStatusBadge status="Converted to Active" />);
      expect(html).toContain('Converted to Active');
      expect(html).toContain('bg-emerald-50');
    });

    it('renders On Hold, No Response, and Not Interested badges correctly', () => {
      expect(renderToString(<SalesStatusBadge status="On Hold" />)).toContain('On Hold');
      expect(renderToString(<SalesStatusBadge status="No Response" />)).toContain('No Response');
      expect(renderToString(<SalesStatusBadge status="Not Interested" />)).toContain('Not Interested');
    });
  });

  describe('LogApproachModal Component', () => {
    it('renders all 10 standard actions and 8 funnel statuses', () => {
      const html = renderToString(
        <LogApproachModal
          isOpen={true}
          onClose={() => {}}
          entityType="jfll_customer"
          entityId="cust_001"
          companyName="Acme Global Logistics"
          currentStatus="Not Contacted"
        />
      );

      expect(html).toContain('Log Sales Approach');
      expect(html).toContain('Acme Global Logistics');
      expect(html).toContain('Current Status:');

      // Verify all 10 actions exist as select options
      for (const action of ALL_SALES_ACTIONS) {
        expect(html).toContain(`value="${action}"`);
      }

      // Verify 8 standard selectable statuses exist
      for (const st of STANDARD_SELECTABLE_STATUSES) {
        expect(html).toContain(`value="${st}"`);
      }

      // Verify Converted to Active is EXCLUDED from standard status options
      expect(html).not.toContain('<option value="Converted to Active">');
    });
  });

  describe('ConvertToActiveModal Component', () => {
    it('renders activation title, start date field, and confirmation CTA', () => {
      const html = renderToString(
        <ConvertToActiveModal
          isOpen={true}
          onClose={() => {}}
          entityType="jfll_customer"
          entityId="cust_001"
          companyName="Acme Global Logistics"
        />
      );

      expect(html).toContain('Convert to Active Customer');
      expect(html).toContain('Acme Global Logistics');
      expect(html).toContain('Effective Active Start Date');
      expect(html).toContain('Activation Milestone');
      expect(html).toContain('Activation / Handover Notes');
      expect(html).toContain('Confirm &amp; Convert to Active');
    });
  });

  describe('SalesApproachTimeline Component', () => {
    it('renders top action bar with current funnel status and CTA buttons', () => {
      const html = renderToString(
        <SalesApproachTimeline
          entityType="jfll_customer"
          entityId="cust_001"
          companyName="Acme Global Logistics"
          onOpenLogModal={() => {}}
          onOpenConvertModal={() => {}}
          showConvertButton={true}
        />
      );

      expect(html).toContain('Funnel Status:');
      expect(html).toContain('Convert to Active');
      expect(html).toContain('Log Approach');
      expect(html).toContain('Activity Timeline');
    });
  });

  describe('Approach Service & State Machine Rules', () => {
    it('correctly ranks statuses in funnel progression', () => {
      expect(FUNNEL_RANKS['Not Contacted']).toBe(0);
      expect(FUNNEL_RANKS['Contacted']).toBe(1);
      expect(FUNNEL_RANKS['Report Sent']).toBe(2);
      expect(FUNNEL_RANKS['Working on It']).toBe(3);
      expect(FUNNEL_RANKS['In Progress']).toBe(4);
      expect(FUNNEL_RANKS['Converted to Active']).toBe(8);
    });

    it('allows forward progression and defaults to Not Contacted', async () => {
      expect(getCachedApproachStatus('jfll_customer', 'cust_test_1')).toBe('Not Contacted');

      // Forward step: Not Contacted -> Contacted without note
      const res = await logApproachActivity('jfll_customer', 'cust_test_1', {
        action: 'Called customer',
        status: 'Contacted',
        note: null,
      });

      expect(res.current_status).toBe('Contacted');
      expect(res.logs.length).toBe(1);
      expect(res.logs[0].action).toBe('Called customer');
      expect(res.logs[0].salesperson_name).toBe('Deepak Naidu');
      expect(res.logs[0].salesperson_email).toBe('deepak@jfll.com');
    });

    it('enforces mandatory notes for On Hold, No Response, and Not Interested', async () => {
      for (const st of MANDATORY_NOTE_STATUSES) {
        await expect(
          logApproachActivity('jfll_customer', 'cust_test_2', {
            action: 'Sent email',
            status: st,
            note: '   ',
          })
        ).rejects.toThrow(`Setting status to '${st}' requires an explanatory note.`);

        // Succeeds with valid note
        const ok = await logApproachActivity('jfll_customer', 'cust_test_2', {
          action: 'Sent email',
          status: st,
          note: `Detailed explanation for ${st}`,
        });
        expect(ok.current_status).toBe(st);
      }
    });

    it('enforces mandatory note when moving backward in the funnel', async () => {
      // Advance to In Progress (Rank 4)
      await logApproachActivity('jfll_customer', 'cust_test_3', {
        action: 'Held meeting',
        status: 'In Progress',
        note: 'Initial meeting done',
      });

      // Backward move to Contacted (Rank 1) without note must throw
      await expect(
        logApproachActivity('jfll_customer', 'cust_test_3', {
          action: 'Called customer',
          status: 'Contacted',
          note: '',
        })
      ).rejects.toThrow(/Moving status backward from 'In Progress' to 'Contacted' requires an explanatory note./);

      // Backward move with valid note succeeds
      const backOk = await logApproachActivity('jfll_customer', 'cust_test_3', {
        action: 'Called customer',
        status: 'Contacted',
        note: 'Client restructured procurement team; resetting outreach phase',
      });
      expect(backOk.current_status).toBe('Contacted');
    });

    it('converts customer to Active via dedicated workflow', async () => {
      const res = await convertClientToActive('jfll_customer', 'cust_test_4', {
        start_date: '2026-11-01',
        note: 'Contract executed for air cargo',
      });

      expect(res.current_status).toBe('Converted to Active');
      expect(res.is_active_converted).toBe(true);
      expect(res.conversion_start_date).toBe('2026-11-01');
      expect(res.logs.length).toBe(1);
      expect(res.logs[0].note).toContain('Effective start date: 2026-11-01');
      expect(res.logs[0].note).toContain('Contract executed for air cargo');
    });
  });
});
