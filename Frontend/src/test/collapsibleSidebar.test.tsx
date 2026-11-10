import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { TopHeader } from '@/components/layout/TopHeader';
import { DatamyneFilterSidebar } from '@/components/datamyne/DatamyneFilterSidebar';
import { ApolloFilterSidebar } from '@/components/apollo/ApolloFilterSidebar';
import { JfllCustomerFilterSidebar } from '@/components/jfll/JfllCustomerFilterSidebar';
import { LeadTrackerFilterSidebar } from '@/components/tracker/LeadTrackerFilterSidebar';

describe('Collapsible Sidebar Architecture Suite', () => {
  describe('TopHeader Collapsible Filter Button', () => {
    it('renders the filter toggle button with keyboard hint and aria attributes when expanded', () => {
      const onToggleSidebar = vi.fn();
      const html = renderToString(
        <TopHeader
          activeTab="datamyne"
          isSidebarCollapsed={false}
          onToggleSidebar={onToggleSidebar}
          activeFilterCount={2}
        />
      );

      // Check button aria attributes and labels
      expect(html).toContain('aria-label="Collapse filter options"');
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('Collapse filters sidebar (⌘B)');

      // Check keyboard shortcut badge and active count
      expect(html).toContain('⌘B');
      expect(html).toContain('2');
    });

    it('renders expand state when isSidebarCollapsed is true', () => {
      const html = renderToString(
        <TopHeader
          activeTab="datamyne"
          isSidebarCollapsed={true}
          onToggleSidebar={vi.fn()}
          activeFilterCount={0}
        />
      );

      expect(html).toContain('aria-label="Expand filter options"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('Expand filters sidebar (⌘B)');
    });
  });

  describe('DatamyneFilterSidebar Collapsible Behavior', () => {
    const dummyProps = {
      filters: {},
      setSearch: vi.fn(),
      setDataset: vi.fn(),
      toggleTransportMode: vi.fn(),
      toggleCategory: vi.fn(),
      toggleSubcategory: vi.fn(),
      toggleRole: vi.fn(),
      toggleCity: vi.fn(),
      toggleTradeLane: vi.fn(),
      toggleContactStatus: vi.fn(),
      toggleHasDirectors: vi.fn(),
      setMinShipments: vi.fn(),
      setMinTradedValueUsd: vi.fn(),
      clearAllFilters: vi.fn(),
      activeFilterCount: 0,
    };

    it('renders full desktop sidebar when isCollapsed is false', () => {
      const html = renderToString(
        <DatamyneFilterSidebar
          {...dummyProps}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="DataMyne Filters Sidebar"');
      expect(html).toContain('w-72 lg:w-80');
      expect(html).toContain('Collapse sidebar (⌘B)');
    });

    it('renders compact 48px rail when isCollapsed is true', () => {
      const html = renderToString(
        <DatamyneFilterSidebar
          {...dummyProps}
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
          activeFilterCount={3}
        />
      );

      expect(html).toContain('aria-label="DataMyne Filters (Collapsed)"');
      expect(html).toContain('w-12');
      expect(html).toContain('Expand DataMyne filters');
      expect(html).toContain('title="3 active filters - click to expand"');
    });
  });

  describe('ApolloFilterSidebar Collapsible Behavior', () => {
    const dummyProps = {
      filters: {},
      onToggleIndustry: vi.fn(),
      onToggleCountry: vi.fn(),
      onToggleEmployeeTier: vi.fn(),
      onToggleRevenueRange: vi.fn(),
      onToggleHasWebsite: vi.fn(),
      onToggleHasLinkedin: vi.fn(),
      onClearCategory: vi.fn(),
      onClearAll: vi.fn(),
    };

    it('renders full desktop sidebar when isCollapsed is false', () => {
      const html = renderToString(
        <ApolloFilterSidebar
          {...dummyProps}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Apollo Shipper Filter Sidebar"');
      expect(html).toContain('Collapse sidebar (⌘B)');
    });

    it('renders compact 48px rail when isCollapsed is true', () => {
      const html = renderToString(
        <ApolloFilterSidebar
          {...dummyProps}
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Apollo Shipper Filters (Collapsed)"');
      expect(html).toContain('w-12');
      expect(html).toContain('Expand Apollo filters');
    });
  });

  describe('JfllCustomerFilterSidebar Collapsible Behavior', () => {
    const dummyProps = {
      filters: {},
      onToggleCustomerGroup: vi.fn(),
      onToggleType: vi.fn(),
      onToggleCreditStatus: vi.fn(),
      onToggleSalesPerson: vi.fn(),
      onToggleRevenueRange: vi.fn(),
      onToggleContactOption: vi.fn(),
      onClearAll: vi.fn(),
    };

    it('renders full desktop sidebar when isCollapsed is false', () => {
      const html = renderToString(
        <JfllCustomerFilterSidebar
          {...dummyProps}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="JFLL Customer Filters Sidebar"');
      expect(html).toContain('Collapse sidebar (⌘B)');
    });

    it('renders compact 48px rail when isCollapsed is true', () => {
      const html = renderToString(
        <JfllCustomerFilterSidebar
          {...dummyProps}
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Customer Filters (Collapsed)"');
      expect(html).toContain('w-12');
      expect(html).toContain('Expand Customer filters');
    });
  });

  describe('LeadTrackerFilterSidebar Collapsible Behavior', () => {
    const dummyProps = {
      selectedBranch: 'All',
      onSelectBranch: vi.fn(),
      selectedRep: 'All',
      onSelectRep: vi.fn(),
      selectedStatus: 'All',
      onSelectStatus: vi.fn(),
      isOverdueOnly: false,
      onToggleOverdueOnly: vi.fn(),
      onSelectTransportMode: vi.fn(),
      onSelectRoutingType: vi.fn(),
      searchQuery: '',
      onSearchChange: vi.fn(),
      onResetFilters: vi.fn(),
      activeFilterCount: 0,
      kpis: {
        totalTracked: 10,
        activeInProgress: 5,
        overdueCount: 1,
        convertedActiveCount: 2,
        pipelineValueUsd: 100000,
        onHoldCount: 1,
        noResponseCount: 1,
        notInterestedCount: 0,
        stageBreakdown: {
          not_contacted: 2,
          contacted: 2,
          qualifying: 1,
          proposal_sent: 1,
          negotiating: 1,
          converted_active: 2,
          on_hold: 1,
          no_response: 1,
          not_interested: 0,
        },
      },
    };

    it('renders full desktop sidebar when isCollapsed is false', () => {
      const html = renderToString(
        <LeadTrackerFilterSidebar
          {...dummyProps}
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Lead Status Tracker Filters Sidebar"');
      expect(html).toContain('Collapse sidebar (⌘B)');
    });

    it('renders compact 48px rail when isCollapsed is true', () => {
      const html = renderToString(
        <LeadTrackerFilterSidebar
          {...dummyProps}
          isCollapsed={true}
          onToggleCollapse={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Lead Status Tracker Filters (Collapsed)"');
      expect(html).toContain('w-12');
      expect(html).toContain('Expand Lead Tracker filters');
    });
  });
});
