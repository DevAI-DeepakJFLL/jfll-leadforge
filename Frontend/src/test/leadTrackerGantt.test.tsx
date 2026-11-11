import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  LeadTrackerGantt,
  LeadTrackerGanttRowBase,
  parseUtcDate,
  getTransportModeVisual,
} from '@/components/tracker/LeadTrackerGantt';
import { LeadStatusTrackerView } from '@/components/tracker/LeadStatusTrackerView';
import { seedTrackerLocalCacheForTesting } from '@/services/leadTrackerService';
import { MOCK_TRACKER_STARTER_LEADS } from '@/test/fixtures/leadTrackerFixtures';
import { LeadTrackerItem } from '@/types/leadTracker';

const mockLeads: LeadTrackerItem[] = [
  {
    id: 'trk_gantt_001',
    company_name: 'Royal Arc Steels Ltd',
    contact_person: 'Trith Amrania',
    contact_phone: '+91 98200 11223',
    contact_email: 'trith@royalarc.com',
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-29',
    status: 'Quoted',
    transport_mode: 'Ocean FCL',
    routing_type: 'Freehand',
    feedback_notes: 'Met the person; sea freight rate gap',
    quote_date: '2026-08-01',
    rate_validity_date: '2026-08-15',
    rate_validity_days: 14,
    next_followup_date: '2026-08-16',
    next_action: 'Ask if quotation shared with client',
    target_shipment_date: '2026-08-25',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [],
    created_at: '2026-07-29T10:00:00Z',
    updated_at: '2026-07-29T10:00:00Z',
  },
  {
    id: 'trk_gantt_002',
    company_name: 'Clearsynth Labs Limited',
    contact_person: 'Sunil Patil',
    contact_phone: '+91 98200 44556',
    contact_email: 'sunil@clearsynth.com',
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-02-09',
    status: 'Feedback Received',
    transport_mode: 'Courier / Express',
    routing_type: 'Freehand',
    feedback_notes: 'Talked to Sunil Patil, they do purely courier and work with Fedex',
    quote_date: '2026-09-10',
    rate_validity_date: '2026-09-24',
    rate_validity_days: 14,
    next_followup_date: '2026-09-18',
    next_action: 'Edward will connect with vendor partner',
    target_shipment_date: '2026-10-05',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [],
    created_at: '2026-02-09T10:00:00Z',
    updated_at: '2026-02-09T10:00:00Z',
  },
  {
    id: 'trk_gantt_003',
    company_name: 'Titan Laboratories Pvt Ltd',
    contact_person: 'Sanjay Gupta',
    contact_phone: '+91 98333 44556',
    contact_email: 'sanjay@titanlab.com',
    branch: 'Mumbai',
    assigned_to: 'Tasneem',
    assigned_to_email: 'tasneem@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-03-09',
    status: 'Meeting Scheduled',
    transport_mode: 'Air Freight',
    routing_type: 'Nominated',
    feedback_notes: 'Most shipments are nominated by overseas consignee',
    quote_date: '2026-09-12',
    rate_validity_date: '2026-09-16',
    rate_validity_days: 4,
    next_followup_date: '2026-09-15',
    next_action: 'Joint meeting with overseas partner',
    target_shipment_date: null,
    linked_entity_type: 'datamyne',
    linked_entity_id: 'dm_titan_01',
    history: [],
    created_at: '2026-03-09T10:00:00Z',
    updated_at: '2026-03-09T10:00:00Z',
  },
  {
    id: 'trk_gantt_004',
    company_name: 'Aurobindo Pharma Gujarat',
    contact_person: 'Ketan Shah',
    contact_phone: '+91 98790 12345',
    contact_email: 'ketan@aurobindo.com',
    branch: 'Gujarat',
    assigned_to: 'Sidhart Ji',
    assigned_to_email: 'sidhart@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-04-10',
    status: 'Assigned',
    transport_mode: 'CHA Brokerage',
    routing_type: 'Freehand',
    feedback_notes: 'Customs clearance requirements at Hazira port',
    quote_date: null,
    rate_validity_date: null,
    rate_validity_days: null,
    next_followup_date: '2026-09-20',
    next_action: 'Initial discovery call',
    target_shipment_date: null,
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [],
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
  },
];

/**
 * Utility to search React VDOM tree by test ID.
 */
function findNodeByTestId(node: any, testId: string): any {
  if (!node || typeof node !== 'object') return null;
  if (node.props?.['data-testid'] === testId) return node;

  if (Array.isArray(node)) {
    for (const item of node) {
      const match = findNodeByTestId(item, testId);
      if (match) return match;
    }
  }

  if (node.props?.children) {
    const children = Array.isArray(node.props.children)
      ? node.props.children
      : [node.props.children];
    for (const child of children) {
      const match = findNodeByTestId(child, testId);
      if (match) return match;
    }
  }

  return null;
}

describe('LeadTrackerGantt Component Suite', () => {
  const FIXED_TODAY = '2026-09-15';

  beforeEach(() => {
    seedTrackerLocalCacheForTesting(MOCK_TRACKER_STARTER_LEADS);
  });

  describe('Pure UTC Date & Transport Mode Helpers', () => {
    it('parses YYYY-MM-DD into pure UTC midnight timestamp', () => {
      const ms = parseUtcDate('2026-09-15');
      expect(ms).toBe(Date.UTC(2026, 8, 15));
      expect(parseUtcDate(null)).toBeNull();
      expect(parseUtcDate('')).toBeNull();
      expect(parseUtcDate('invalid')).toBeNull();
    });

    it('provides distinctive freight color coding per transport mode', () => {
      const air = getTransportModeVisual('Air Freight');
      expect(air.barBg).toContain('bg-sky-500');

      const oceanFcl = getTransportModeVisual('Ocean FCL');
      expect(oceanFcl.barBg).toContain('bg-blue-600');

      const oceanLcl = getTransportModeVisual('Ocean LCL');
      expect(oceanLcl.barBg).toContain('bg-teal-600');

      const courier = getTransportModeVisual('Courier / Express');
      expect(courier.barBg).toContain('bg-purple-600');

      const cha = getTransportModeVisual('CHA Brokerage');
      expect(cha.barBg).toContain('bg-amber-600');
    });
  });

  describe('Gantt Header, Time Axis, and TODAY Marker', () => {
    it('renders Gantt header, time axis month bands, and "TODAY" marker', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      // Main container
      expect(html).toContain('data-testid="lead-tracker-gantt"');
      expect(html).toContain('Lead / Shipper');

      // Sticky TODAY pill
      expect(html).toContain('data-testid="gantt-today-marker"');
      expect(html).toContain('data-testid="gantt-today-pill"');
      expect(html).toContain('TODAY');

      // Month header text in axis
      expect(html).toContain('Sep 2026');

      // Day numbers in axis around fixed today (15)
      expect(html).toContain('>15<');
      expect(html).toContain('>16<');
    });

    it('renders horizon window switcher with 14, 30, and 60 days buttons', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      expect(html).toContain('data-testid="gantt-horizon-14"');
      expect(html).toContain('14 Days');
      expect(html).toContain('data-testid="gantt-horizon-30"');
      expect(html).toContain('30 Days');
      expect(html).toContain('data-testid="gantt-horizon-60"');
      expect(html).toContain('60 Days');
    });

    it('renders full freight logistics legend with modes and cadence markers', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      expect(html).toContain('Air Freight');
      expect(html).toContain('Ocean FCL');
      expect(html).toContain('Ocean LCL');
      expect(html).toContain('Courier');
      expect(html).toContain('CHA Brokerage');
      expect(html).toContain('Overdue Follow-up');
      expect(html).toContain('Due Today / Expiring');
      expect(html).toContain('Upcoming Cadence');
      expect(html).toContain('Target Shipment');
    });
  });

  describe('Lead Cards & Rate Validity Bars', () => {
    it('renders lead company cards with name, branch, status, and transport mode', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      expect(html).toContain('Royal Arc Steels Ltd');
      expect(html).toContain('Clearsynth Labs Limited');
      expect(html).toContain('Titan Laboratories Pvt Ltd');
      expect(html).toContain('Aurobindo Pharma Gujarat');

      // Transport mode labels
      expect(html).toContain('Ocean FCL');
      expect(html).toContain('Courier / Express');
      expect(html).toContain('Air Freight');
      expect(html).toContain('CHA Brokerage');
    });

    it('renders rate validity bars with transport mode styling and days remaining label', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      // Clearsynth has quote valid until 2026-09-24 -> 9d valid relative to 2026-09-15
      expect(html).toContain('data-testid="gantt-rate-bar-trk_gantt_002"');
      expect(html).toContain('9d valid');

      // Titan has quote valid until 2026-09-16 -> 1d left (expiring soon)
      expect(html).toContain('data-testid="gantt-rate-bar-trk_gantt_003"');
      expect(html).toContain('1d left');

      // Aurobindo has no quote
      expect(html).toContain('data-testid="gantt-rate-bar-none-trk_gantt_004"');
      expect(html).toContain('No active quotation');
    });

    it('renders cadence milestone pins for overdue, due today, and upcoming touchpoints', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      // Royal Arc followup is 2026-08-16 (< 2026-09-15 -> Overdue pin with rose color)
      expect(html).toContain('data-testid="gantt-cadence-pin-trk_gantt_001"');
      expect(html).toContain('bg-rose-500');

      // Titan followup is 2026-09-15 (=== 2026-09-15 -> Due Today pin with amber color)
      expect(html).toContain('data-testid="gantt-cadence-pin-trk_gantt_003"');
      expect(html).toContain('bg-amber-500');

      // Clearsynth followup is 2026-09-18 (> 2026-09-15 -> Upcoming pin with blue color)
      expect(html).toContain('data-testid="gantt-cadence-pin-trk_gantt_002"');
      expect(html).toContain('bg-blue-500');
    });

    it('renders target shipment milestone markers when present', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      // Clearsynth has target_shipment_date: 2026-10-05
      expect(html).toContain('data-testid="gantt-shipment-pin-trk_gantt_002"');
      expect(html).toContain('Target Shipment Date: 2026-10-05');
    });
  });

  describe('Grouping: Coordinator Groups vs Flat Urgency List', () => {
    it('groups leads by coordinator with section headers and lead counters by default', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      // Coordinator headers
      expect(html).toContain('Edward');
      expect(html).toContain('Tasneem');
      expect(html).toContain('Sidhart Ji');

      // Group lead count pills
      expect(html).toContain('2 leads'); // Edward has 2 leads
      expect(html).toContain('1 lead');  // Tasneem has 1 lead
    });

    it('supports flat urgency list layout switch', () => {
      // In default render, grouping controls exist
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr={FIXED_TODAY}
        />
      );

      expect(html).toContain('data-testid="gantt-grouping-coordinator"');
      expect(html).toContain('data-testid="gantt-grouping-flat"');
      expect(html).toContain('Flat Urgency List');
    });
  });

  describe('Interaction Callbacks: onSelectLead', () => {
    it('triggers onSelectLead when company card or rate bar is clicked', () => {
      const onSelectSpy = vi.fn();

      const vdom = LeadTrackerGanttRowBase({
        lead: mockLeads[1],
        dayColumns: [],
        startUtc: parseUtcDate('2026-09-08')!,
        totalDays: 30,
        todayMarkerPercent: 25,
        activeTodayStr: FIXED_TODAY,
        minTimelineWidth: 'min-w-[960px]',
        grouping: 'coordinator',
        onSelectLead: onSelectSpy,
      });

      // Find company card for Clearsynth
      const companyCard = findNodeByTestId(vdom, 'gantt-lead-card-trk_gantt_002');
      expect(companyCard).not.toBeNull();
      expect(companyCard.props.onClick).toBeDefined();

      companyCard.props.onClick();
      expect(onSelectSpy).toHaveBeenCalledWith(mockLeads[1]);

      // Click on rate bar also triggers onSelectLead
      const rateBar = findNodeByTestId(vdom, 'gantt-rate-bar-trk_gantt_002');
      expect(rateBar).not.toBeNull();
      expect(rateBar.props.onClick).toBeDefined();

      rateBar.props.onClick();
      expect(onSelectSpy).toHaveBeenCalledWith(mockLeads[1]);
    });

    it('triggers onSelectLead when cadence milestone pin is clicked', () => {
      const onSelectSpy = vi.fn();

      const vdom = LeadTrackerGanttRowBase({
        lead: mockLeads[0],
        dayColumns: [],
        startUtc: parseUtcDate('2026-08-01')!,
        totalDays: 30,
        todayMarkerPercent: 25,
        activeTodayStr: FIXED_TODAY,
        minTimelineWidth: 'min-w-[960px]',
        grouping: 'coordinator',
        onSelectLead: onSelectSpy,
      });

      const pin = findNodeByTestId(vdom, 'gantt-cadence-pin-trk_gantt_001');
      expect(pin).not.toBeNull();
      expect(pin.props.onClick).toBeDefined();

      pin.props.onClick();
      expect(onSelectSpy).toHaveBeenCalledWith(mockLeads[0]);
    });
  });

  describe('Empty and Loading States', () => {
    it('renders loading skeleton when isLoading is true', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={mockLeads}
          isLoading={true}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('data-testid="gantt-loading-skeleton"');
      expect(html).toContain('animate-pulse');
    });

    it('renders empty state when leads list is empty with action button', () => {
      const html = renderToString(
        <LeadTrackerGantt
          leads={[]}
          onSelectLead={vi.fn()}
          emptyStateAction={<button type="button">Reset Filters</button>}
        />
      );

      expect(html).toContain('data-testid="gantt-empty-state"');
      expect(html).toContain('No Freight Leads Found');
      expect(html).toContain('Reset Filters');
    });
  });

  describe('Integration with LeadStatusTrackerView', () => {
    it('renders segmented switcher for Table View vs Freight Horizon in LeadStatusTrackerView', () => {
      const html = renderToString(
        <LeadStatusTrackerView
          todayStr={FIXED_TODAY}
        />
      );

      expect(html).toContain('data-testid="view-toggle-table"');
      expect(html).toContain('Table View');
      expect(html).toContain('data-testid="view-toggle-gantt"');
      expect(html).toContain('Freight Horizon');
    });
  });
});
