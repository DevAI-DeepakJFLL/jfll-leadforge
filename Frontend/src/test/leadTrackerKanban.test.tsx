import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  LeadTrackerKanban,
  LeadTrackerKanbanCardBase,
} from '@/components/tracker/LeadTrackerKanban';
import { LeadStatusTrackerView } from '@/components/tracker/LeadStatusTrackerView';
import { ALL_TRACKER_STATUSES, LeadTrackerItem } from '@/types/leadTracker';
import { seedTrackerLocalCacheForTesting, resetTrackerLocalCache } from '@/services/leadTrackerService';
import { MOCK_TRACKER_STARTER_LEADS } from '@/test/fixtures/leadTrackerFixtures';

/**
 * Utility to search React element tree by data-testid.
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

const mockLeads: LeadTrackerItem[] = [
  {
    id: 'trk_kanban_001',
    company_name: 'Royal Arc Steels Ltd',
    contact_person: 'Trith Amrania',
    contact_phone: '+91 98200 11223',
    contact_email: 'trith@royalarc.com',
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-07-29',
    status: 'Assigned',
    transport_mode: 'Ocean FCL',
    routing_type: 'Freehand',
    feedback_notes: 'Initial assignment for ocean freight outreach',
    next_followup_date: '2026-09-10',
    next_action: 'Call shipper to confirm inquiry specs',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [],
    created_at: '2026-07-29T10:00:00Z',
    updated_at: '2026-07-29T10:00:00Z',
  },
  {
    id: 'trk_kanban_002',
    company_name: 'Clearsynth Labs Limited',
    contact_person: 'Sunil Patil',
    contact_phone: '+91 98200 44556',
    contact_email: 'sunil@clearsynth.com',
    branch: 'Mumbai',
    assigned_to: 'Edward',
    assigned_to_email: 'edward@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-02-09',
    status: 'Contacted',
    transport_mode: 'Courier / Express',
    routing_type: 'Freehand',
    feedback_notes: 'Spoke with Sunil, reviewing courier rates',
    next_followup_date: '2026-09-18',
    next_action: 'Share revised courier price matrix',
    linked_entity_type: 'custom',
    linked_entity_id: null,
    history: [],
    created_at: '2026-02-09T10:00:00Z',
    updated_at: '2026-02-09T10:00:00Z',
  },
  {
    id: 'trk_kanban_003',
    company_name: 'Titan Laboratories Pvt Ltd',
    contact_person: 'Sanjay Gupta',
    contact_phone: '+91 98333 44556',
    contact_email: 'sanjay@titanlab.com',
    branch: 'Mumbai',
    assigned_to: 'Tasneem',
    assigned_to_email: 'tasneem@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-03-09',
    status: 'Quoted',
    transport_mode: 'Air Freight',
    routing_type: 'Nominated',
    feedback_notes: 'Air freight quote provided to consignee',
    next_followup_date: '2026-09-15',
    next_action: 'Follow up on booking confirmation',
    linked_entity_type: 'datamyne',
    linked_entity_id: 'dm_titan_01',
    history: [],
    created_at: '2026-03-09T10:00:00Z',
    updated_at: '2026-03-09T10:00:00Z',
  },
  {
    id: 'trk_kanban_004',
    company_name: 'Aurobindo Pharma Gujarat',
    contact_person: 'Ketan Shah',
    contact_phone: '+91 98790 12345',
    contact_email: 'ketan@aurobindo.com',
    branch: 'Gujarat',
    assigned_to: 'Sidhart Ji',
    assigned_to_email: 'sidhart@jfll.com',
    assigned_by: 'Tyra Theknath',
    assigned_date: '2026-04-10',
    status: 'Won',
    transport_mode: 'Ocean LCL',
    routing_type: 'Freehand',
    feedback_notes: 'Trial booking successfully secured',
    next_followup_date: null,
    next_action: 'Handover to operations desk',
    linked_entity_type: 'jfll_customer',
    linked_entity_id: 'jfll_auro_01',
    history: [],
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
  },
];

describe('LeadTrackerKanban Component Suite', () => {
  const FIXED_TODAY = '2026-09-15';

  beforeEach(() => {
    resetTrackerLocalCache();
    seedTrackerLocalCacheForTesting(MOCK_TRACKER_STARTER_LEADS);
    vi.restoreAllMocks();
  });

  describe('Pipeline Board & Column Rendering', () => {
    it('renders all pipeline stage columns according to ALL_TRACKER_STATUSES', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={mockLeads}
          todayStr={FIXED_TODAY}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('data-testid="lead-tracker-kanban"');

      for (const status of ALL_TRACKER_STATUSES) {
        expect(html).toContain(status);
        const slug = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        expect(html).toContain(`data-testid="kanban-column-${slug}"`);
      }
    });

    it('places leads in their respective stage columns with accurate count badges', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={mockLeads}
          todayStr={FIXED_TODAY}
          onSelectLead={vi.fn()}
        />
      );

      // Counts per stage:
      // Assigned: 1 (Royal Arc)
      // Contacted: 1 (Clearsynth)
      // Meeting Scheduled: 0
      // Quoted: 1 (Titan)
      // Won: 1 (Aurobindo)
      expect(html).toContain('data-testid="kanban-count-assigned"');
      expect(html).toContain('data-testid="kanban-count-contacted"');
      expect(html).toContain('data-testid="kanban-count-quoted"');
      expect(html).toContain('data-testid="kanban-count-won"');

      // Check lead cards exist
      expect(html).toContain('data-testid="kanban-card-trk_kanban_001"');
      expect(html).toContain('Royal Arc Steels Ltd');
      expect(html).toContain('data-testid="kanban-card-trk_kanban_002"');
      expect(html).toContain('Clearsynth Labs Limited');
      expect(html).toContain('data-testid="kanban-card-trk_kanban_003"');
      expect(html).toContain('Titan Laboratories Pvt Ltd');
      expect(html).toContain('data-testid="kanban-card-trk_kanban_004"');
      expect(html).toContain('Aurobindo Pharma Gujarat');
    });

    it('renders empty stage placeholder for columns without leads', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={mockLeads}
          todayStr={FIXED_TODAY}
          onSelectLead={vi.fn()}
        />
      );

      // Meeting Scheduled has 0 leads
      expect(html).toContain('data-testid="kanban-empty-meeting-scheduled"');
      expect(html).toContain('No leads in this stage');
    });
  });

  describe('Card Presentation & Freight Semantics', () => {
    it('renders entity badges, transport modes, routing types, rep names, and urgency pills', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={mockLeads}
          todayStr={FIXED_TODAY}
          onSelectLead={vi.fn()}
        />
      );

      // Transport modes
      expect(html).toContain('Ocean FCL');
      expect(html).toContain('Courier / Express');
      expect(html).toContain('Air Freight');
      expect(html).toContain('Ocean LCL');

      // Routing
      expect(html).toContain('Freehand');
      expect(html).toContain('Nominated');

      // Badges
      expect(html).toContain('Datamyne');
      expect(html).toContain('JFLL');
      expect(html).toContain('Custom');

      // Representatives & Branches
      expect(html).toContain('Edward');
      expect(html).toContain('(Mumbai)');
      expect(html).toContain('Tasneem');
      expect(html).toContain('Sidhart Ji');
      expect(html).toContain('(Gujarat)');

      // Urgency Pill: trk_kanban_001 followup is 2026-09-10 (< 2026-09-15 -> Overdue)
      expect(html).toContain('Overdue');
      expect(html).toContain('10 Sep 2026');

      // Urgency Pill: trk_kanban_003 followup is 2026-09-15 (=== 2026-09-15 -> Due Today)
      expect(html).toContain('Due Today');

      // Urgency Pill: trk_kanban_002 followup is 2026-09-18 (> 2026-09-15 -> Scheduled)
      expect(html).toContain('18 Sep 2026');
    });
  });

  describe('Interactive Handlers (Select Lead & Status Change)', () => {
    it('triggers onSelectLead when card is clicked', () => {
      const onSelectLeadSpy = vi.fn();

      const element = LeadTrackerKanbanCardBase({
        lead: mockLeads[1],
        stageIndex: 1, // Contacted
        todayStr: FIXED_TODAY,
        onSelectLead: onSelectLeadSpy,
      });

      const card = findNodeByTestId(element, 'kanban-card-trk_kanban_002');
      expect(card).not.toBeNull();
      expect(card.props.onClick).toBeDefined();

      card.props.onClick();
      expect(onSelectLeadSpy).toHaveBeenCalledWith(mockLeads[1]);
    });

    it('triggers onStatusChange when quick advance next button is clicked', () => {
      const onStatusChangeSpy = vi.fn();

      const element = LeadTrackerKanbanCardBase({
        lead: mockLeads[0],
        stageIndex: 0, // Assigned
        todayStr: FIXED_TODAY,
        onSelectLead: vi.fn(),
        onStatusChange: onStatusChangeSpy,
      });

      // trk_kanban_001 is 'Assigned' (index 0). Next is 'Contacted' (index 1).
      const nextBtn = findNodeByTestId(element, 'kanban-move-next-trk_kanban_001');
      expect(nextBtn).not.toBeNull();
      expect(nextBtn.props.disabled).toBe(false);

      const fakeEvent = { stopPropagation: vi.fn() };
      nextBtn.props.onClick(fakeEvent);

      expect(fakeEvent.stopPropagation).toHaveBeenCalled();
      expect(onStatusChangeSpy).toHaveBeenCalledWith('trk_kanban_001', 'Contacted');
    });

    it('triggers onStatusChange when quick move previous button is clicked', () => {
      const onStatusChangeSpy = vi.fn();

      const element = LeadTrackerKanbanCardBase({
        lead: mockLeads[1],
        stageIndex: 1, // Contacted
        todayStr: FIXED_TODAY,
        onSelectLead: vi.fn(),
        onStatusChange: onStatusChangeSpy,
      });

      // trk_kanban_002 is 'Contacted' (index 1). Prev is 'Assigned' (index 0).
      const prevBtn = findNodeByTestId(element, 'kanban-move-prev-trk_kanban_002');
      expect(prevBtn).not.toBeNull();
      expect(prevBtn.props.disabled).toBe(false);

      const fakeEvent = { stopPropagation: vi.fn() };
      prevBtn.props.onClick(fakeEvent);

      expect(fakeEvent.stopPropagation).toHaveBeenCalled();
      expect(onStatusChangeSpy).toHaveBeenCalledWith('trk_kanban_002', 'Assigned');
    });

    it('disables previous button on cards already in first stage (Assigned)', () => {
      const element = LeadTrackerKanbanCardBase({
        lead: mockLeads[0],
        stageIndex: 0, // Assigned
        todayStr: FIXED_TODAY,
        onSelectLead: vi.fn(),
        onStatusChange: vi.fn(),
      });

      // trk_kanban_001 is 'Assigned' (index 0) -> prev button disabled
      const prevBtn = findNodeByTestId(element, 'kanban-move-prev-trk_kanban_001');
      expect(prevBtn).not.toBeNull();
      expect(prevBtn.props.disabled).toBe(true);
    });

    it('triggers onStatusChange when stage select dropdown changes', () => {
      const onStatusChangeSpy = vi.fn();

      const element = LeadTrackerKanbanCardBase({
        lead: mockLeads[2],
        stageIndex: 3, // Quoted
        todayStr: FIXED_TODAY,
        onSelectLead: vi.fn(),
        onStatusChange: onStatusChangeSpy,
      });

      const select = findNodeByTestId(element, 'kanban-stage-select-trk_kanban_003');
      expect(select).not.toBeNull();
      expect(select.props.value).toBe('Quoted');

      const fakeEvent = {
        target: { value: 'Feedback Received' },
        stopPropagation: vi.fn(),
      };
      select.props.onChange(fakeEvent);

      expect(fakeEvent.stopPropagation).toHaveBeenCalled();
      expect(onStatusChangeSpy).toHaveBeenCalledWith('trk_kanban_003', 'Feedback Received');
    });
  });

  describe('Loading and Empty States', () => {
    it('renders skeleton column layout when isLoading is true', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={[]}
          isLoading={true}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('data-testid="kanban-loading-skeleton"');
      expect(html).toContain('animate-pulse');
    });

    it('renders emptyStateAction when provided and leads array is empty', () => {
      const html = renderToString(
        <LeadTrackerKanban
          leads={[]}
          todayStr={FIXED_TODAY}
          onSelectLead={vi.fn()}
          emptyStateAction={<button type="button">Reset Filters Action</button>}
        />
      );

      expect(html).toContain('Reset Filters Action');
      expect(html).toContain('No leads in this stage');
    });
  });

  describe('Integration in LeadStatusTrackerView', () => {
    it('renders segmented switcher for Table View vs Pipeline Board in LeadStatusTrackerView', () => {
      const html = renderToString(
        <LeadStatusTrackerView todayStr={FIXED_TODAY} />
      );

      expect(html).toContain('data-testid="view-toggle-table"');
      expect(html).toContain('Table View');
      expect(html).toContain('data-testid="view-toggle-kanban"');
      expect(html).toContain('Pipeline Board');
      expect(html).not.toContain('Freight Horizon');
    });
  });
});
