import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  LeadStatusTrackerView,
  LeadTrackerTable,
  LeadTrackerDrawer,
  getStatusStyle,
} from '@/components/tracker';
import {
  DEFAULT_TRACKER_STARTER_LEADS,
  filterTrackedLeadsInMemory,
  computeTrackerKPIsInMemory,
  resetTrackerLocalCache,
  seedTrackerLocalCacheForTesting,
} from '@/services/leadTrackerService';
import { MOCK_TRACKER_STARTER_LEADS } from '@/test/fixtures/leadTrackerFixtures';
import { LeadTrackerItem } from '@/types/leadTracker';

describe('Lead Status Tracker (Phase 2) Component Suite', () => {
  beforeEach(() => {
    resetTrackerLocalCache();
    seedTrackerLocalCacheForTesting(MOCK_TRACKER_STARTER_LEADS);
    vi.restoreAllMocks();
  });

  describe('LeadTrackerTable Component', () => {
    const mockLeads: LeadTrackerItem[] = [
      {
        id: 'trk_test_001',
        company_name: 'Royal Arc Steels',
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
        feedback_notes: 'Competitive rate required for 25 containers per month',
        next_followup_date: '2026-08-16',
        next_action: 'Send revised quotation with volume discount',
        linked_entity_type: 'custom',
        linked_entity_id: null,
        history: [],
        created_at: '2026-07-29T10:00:00Z',
        updated_at: '2026-07-29T10:00:00Z',
      },
      {
        id: 'trk_test_002',
        company_name: 'TITAN LABORATORIES PVT LTD',
        contact_person: 'Sanjay Gupta',
        contact_phone: '+91 98333 44556',
        contact_email: 'sanjay@titanlab.com',
        branch: 'Mumbai',
        assigned_to: 'Tasneem',
        assigned_to_email: 'tasneem@jfll.com',
        assigned_by: 'Tyra Theknath',
        assigned_date: '2026-03-09',
        status: 'Contacted',
        transport_mode: 'Air Freight',
        routing_type: 'Nominated',
        feedback_notes: 'Most shipments are nominated by overseas consignee',
        next_followup_date: '2026-09-18',
        next_action: 'Connect overseas branch to pitch European consignee',
        linked_entity_type: 'datamyne',
        linked_entity_id: 'dm_titan_01',
        history: [],
        created_at: '2026-03-09T10:00:00Z',
        updated_at: '2026-03-09T10:00:00Z',
      },
    ];

    it('renders sticky header with all designated columns', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('Company Name');
      expect(html).toContain('Rep &amp; Branch');
      expect(html).toContain('Mode &amp; Routing');
      expect(html).toContain('Contact Person');
      expect(html).toContain('Status');
      expect(html).toContain('Feedback Notes');
      expect(html).toContain('Next Follow-up');
      expect(html).toContain('Next Action');
      expect(html).toContain('Actions');
    });

    it('renders company rows with entity badges, mode, and routing pill', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
        />
      );

      // Company 1
      expect(html).toContain('Royal Arc Steels');
      expect(html).toContain('Custom');
      expect(html).toContain('Edward');
      expect(html).toContain('Mumbai');
      expect(html).toContain('Ocean FCL');
      expect(html).toContain('Freehand');
      expect(html).toContain('Trith Amrania');
      expect(html).toContain('+91 98200 11223');
      expect(html).toContain('Competitive rate required for 25 containers per month');
      expect(html).toContain('Send revised quotation with volume discount');

      // Company 2
      expect(html).toContain('TITAN LABORATORIES PVT LTD');
      expect(html).toContain('Datamyne');
      expect(html).toContain('Tasneem');
      expect(html).toContain('Air Freight');
      expect(html).toContain('Nominated');
      expect(html).toContain('Sanjay Gupta');
    });

    it('renders overdue badge in red when followup date is prior to today', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr="2026-09-15"
        />
      );

      // Royal Arc followup is 2026-08-16 (< 2026-09-15 -> Overdue)
      expect(html).toContain('Overdue');
      expect(html).toContain('bg-rose-50');
      expect(html).toContain('text-rose-700');
    });

    it('renders scheduled upcoming badge in neutral slate when followup is in future', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
          todayStr="2026-09-15"
        />
      );

      // Titan Laboratories followup is 2026-09-18 (> 2026-09-15 -> Upcoming)
      expect(html).toContain('18 Sep 2026');
      expect(html).toContain('bg-slate-50');
    });

    it('renders inline status switcher with all 9 freight statuses', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('value="Assigned"');
      expect(html).toContain('value="Contacted"');
      expect(html).toContain('value="Meeting Scheduled"');
      expect(html).toContain('value="Quoted"');
      expect(html).toContain('value="Feedback Received"');
      expect(html).toContain('value="Trial Shipment"');
      expect(html).toContain('value="Won"');
      expect(html).toContain('value="On Hold"');
      expect(html).toContain('value="Closed / Lost"');
    });

    it('renders Edit / Touchpoint action button on each row', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('Edit / Touchpoint');
    });

    it('renders empty state when leads array is empty', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={[]}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('No tracked leads match criteria');
      expect(html).toContain('Try clearing your branch, rep, or status filters');
    });

    it('renders loading skeleton when isLoading is true', () => {
      const html = renderToString(
        <LeadTrackerTable
          leads={mockLeads}
          isLoading={true}
          onSelectLead={vi.fn()}
        />
      );

      expect(html).toContain('animate-pulse');
      expect(html).not.toContain('Royal Arc Steels');
    });
  });

  describe('LeadTrackerDrawer Component', () => {
    const mockLead: LeadTrackerItem = {
      id: 'trk_titan_001',
      company_name: 'TITAN LABORATORIES PVT LTD',
      contact_person: 'Sanjay Gupta',
      contact_phone: '+91 98333 44556',
      contact_email: 'sanjay@titanlab.com',
      branch: 'Mumbai',
      assigned_to: 'Tasneem',
      assigned_to_email: 'tasneem@jfll.com',
      assigned_by: 'Tyra Theknath',
      assigned_date: '2026-03-09',
      status: 'Contacted',
      transport_mode: 'Air Freight',
      routing_type: 'Nominated',
      feedback_notes: 'Consignee nominates forwarders for air cargo.',
      next_followup_date: '2026-09-18',
      next_action: 'Arrange conference with overseas agent.',
      linked_entity_type: 'datamyne',
      linked_entity_id: 'dm_titan_01',
      history: [
        {
          id: 'log_001',
          timestamp: '2026-03-09T10:00:00Z',
          author_name: 'Tyra Theknath',
          author_email: 'tyra@jfll.com',
          action: 'Initial Assignment',
          notes: 'Assigned to Tasneem from Datamyne export intelligence.',
        },
        {
          id: 'log_002',
          timestamp: '2026-03-10T14:30:00Z',
          author_name: 'Tasneem',
          author_email: 'tasneem@jfll.com',
          action: 'Called customer',
          notes: 'Spoke to Sanjay Gupta. Confirmed nominated routing.',
        },
      ],
      created_at: '2026-03-09T10:00:00Z',
      updated_at: '2026-03-10T14:30:00Z',
    };

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={false}
          lead={mockLead}
          onClose={vi.fn()}
        />
      );

      expect(html).toBe('');
    });

    it('renders edit mode with company details, assigned rep, branch, and status', () => {
      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={true}
          lead={mockLead}
          mode="edit"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('TITAN LABORATORIES PVT LTD');
      expect(html).toContain('ID: trk_titan_001');
      expect(html).toContain('Source: datamyne');
      expect(html).toContain('Tasneem (Mumbai)');
      expect(html).toContain('Save Details');
    });

    it('renders Rate & Quotation Horizon panel with quote date, rate validity, and target shipment inputs', () => {
      const mockLeadWithHorizon: LeadTrackerItem = {
        ...mockLead,
        quote_date: '2026-09-01',
        rate_validity_date: '2026-09-25',
        target_shipment_date: '2026-10-10',
      };

      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={true}
          lead={mockLeadWithHorizon}
          mode="edit"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Rate &amp; Quotation Horizon');
      expect(html).toContain('id="drawer-quote-date"');
      expect(html).toContain('value="2026-09-01"');
      expect(html).toContain('id="drawer-rate-validity"');
      expect(html).toContain('value="2026-09-25"');
      expect(html).toContain('id="drawer-target-shipment"');
      expect(html).toContain('value="2026-10-10"');
    });

    it('renders Quick Touchpoint Logger with actions, textarea, and submit button', () => {
      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={true}
          lead={mockLead}
          mode="edit"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Quick Touchpoint Logger');
      expect(html).toContain('Interaction Type');
      expect(html).toContain('Called customer');
      expect(html).toContain('Held meeting');
      expect(html).toContain('Sent quote');
      expect(html).toContain('Left voicemail');
      expect(html).toContain('Sent WhatsApp');
      expect(html).toContain('Log Touchpoint');
    });

    it('renders Chronological History Timeline with all past interactions and author names', () => {
      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={true}
          lead={mockLead}
          mode="edit"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Touchpoint &amp; Interaction History');
      expect(html).toContain('2 events');
      expect(html).toContain('Initial Assignment');
      expect(html).toContain('Tyra Theknath');
      expect(html).toContain('Assigned to Tasneem from Datamyne export intelligence.');
      expect(html).toContain('Called customer');
      expect(html).toContain('Tasneem');
      expect(html).toContain('Spoke to Sanjay Gupta. Confirmed nominated routing.');
    });

    it('renders Create mode with blank fields and Add New Tracked Lead header', () => {
      const html = renderToString(
        <LeadTrackerDrawer
          isOpen={true}
          lead={null}
          mode="create"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Add New Tracked Lead');
      expect(html).toContain('Assign to Freight Sales Coordinator');
      expect(html).toContain('Create Tracked Lead');
      expect(html).not.toContain('Quick Touchpoint Logger');
    });
  });

  describe('LeadStatusTrackerView Component Suite', () => {
    it('renders top executive KPI summary cards with proper labels', () => {
      const html = renderToString(<LeadStatusTrackerView />);

      expect(html).toContain('Lead Status Tracker');
      expect(html).toContain('Executive Sales Command');
      expect(html).not.toContain('Tyra &amp; Deepak Master View');

      // 5 KPI Cards
      expect(html).toContain('Total Tracked');
      expect(html).toContain('Active Pipeline');
      expect(html).toContain('Rates Quoted');
      expect(html).toContain('Won Deals');
      expect(html).toContain('Overdue Follow-ups');
    });

    it('renders Branch filter ribbon tabs with all standard offices', () => {
      const html = renderToString(<LeadStatusTrackerView />);

      expect(html).toContain('All Branches');
      expect(html).toContain('Mumbai');
      expect(html).toContain('Gujarat');
      expect(html).toContain('South India');
      expect(html).toContain('Delhi');
    });

    it('renders Sales Coordinator dropdown with all designated team members', () => {
      const html = renderToString(<LeadStatusTrackerView />);

      expect(html).toContain('All Coordinators');
      expect(html).toContain('Edward (Mumbai)');
      expect(html).toContain('Tasneem (Mumbai)');
      expect(html).toContain('Priyanka Sardesai (Mumbai)');
      expect(html).toContain('Utkarsha (Mumbai)');
      expect(html).toContain('Sanjay (Mumbai)');
      expect(html).toContain('Sidhart Ji (Gujarat)');
      expect(html).toContain('Jaya (South India)');
    });

    it('renders Pipeline Stage dropdown, Urgency filter, and Search input', () => {
      const html = renderToString(<LeadStatusTrackerView />);

      expect(html).toContain('Pipeline Stage');
      expect(html).toContain('All Stages');
      expect(html).toContain('Urgency Filter');
      expect(html).toContain('Overdue Only');
      expect(html).toContain('Search Lead / Shipper');
      expect(html).toContain('Add Lead');
    });
  });

  describe('Single-Pass Filtering & KPI Logic Verification', () => {
    it('accurately filters Gujarat branch leads from starter dataset', () => {
      const gujaratLeads = filterTrackedLeadsInMemory(MOCK_TRACKER_STARTER_LEADS, {
        branch: 'Gujarat',
      });

      expect(gujaratLeads.length).toBe(3);
      for (const lead of gujaratLeads) {
        expect(lead.branch).toBe('Gujarat');
        expect(lead.assigned_to).toBe('Sidhart Ji');
      }
    });

    it('accurately filters leads assigned to Edward', () => {
      const edwardLeads = filterTrackedLeadsInMemory(MOCK_TRACKER_STARTER_LEADS, {
        assigned_to: 'Edward',
      });

      expect(edwardLeads.length).toBe(2); // Royal Arc, CLEARSYNTH LABS
      for (const lead of edwardLeads) {
        expect(lead.assigned_to.toLowerCase()).toContain('edward');
      }
    });

    it('accurately filters overdue leads against a fixed reference date', () => {
      const referenceDate = '2026-09-15';
      const overdueLeads = filterTrackedLeadsInMemory(
        MOCK_TRACKER_STARTER_LEADS,
        { overdue_only: true },
        referenceDate
      );

      // Verify all returned leads have follow-up < referenceDate and are not won/closed
      for (const lead of overdueLeads) {
        expect(lead.next_followup_date).toBeTruthy();
        expect(lead.next_followup_date! < referenceDate).toBe(true);
        expect(lead.status).not.toBe('Won');
        expect(lead.status).not.toBe('Closed / Lost');
      }
    });

    it('computes accurate executive KPIs across starter leads', () => {
      const kpis = computeTrackerKPIsInMemory(MOCK_TRACKER_STARTER_LEADS, '2026-09-15');

      expect(kpis.total_leads).toBe(MOCK_TRACKER_STARTER_LEADS.length);
      expect(kpis.active_leads).toBeGreaterThan(0);
      expect(kpis.quoted_leads).toBeGreaterThanOrEqual(1);
      expect(kpis.overdue_leads).toBeGreaterThanOrEqual(1);
    });

    it('provides distinct styling for each freight pipeline status', () => {
      expect(getStatusStyle('Assigned').badge).toContain('bg-slate-100');
      expect(getStatusStyle('Contacted').badge).toContain('bg-blue-50');
      expect(getStatusStyle('Meeting Scheduled').badge).toContain('bg-violet-50');
      expect(getStatusStyle('Quoted').badge).toContain('bg-amber-50');
      expect(getStatusStyle('Feedback Received').badge).toContain('bg-cyan-50');
      expect(getStatusStyle('Trial Shipment').badge).toContain('bg-orange-50');
      expect(getStatusStyle('Won').badge).toContain('bg-emerald-50');
      expect(getStatusStyle('On Hold').badge).toContain('bg-zinc-100');
      expect(getStatusStyle('Closed / Lost').badge).toContain('bg-rose-50');
    });
  });
});
