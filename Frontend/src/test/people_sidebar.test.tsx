import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FilterSidebar } from '@/components/filters/FilterSidebar';
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips';
import { FilterParams } from '@/types/lead';

describe('People Tab Streamlined Logistics Filters', () => {
  const defaultFilters: FilterParams = {
    jobTitles: [],
    departments: [],
    seniority: [],
    locations: [],
    industries: [],
    companySize: [],
    logisticsOnly: true,
    decisionMakersOnly: false,
    hasEmailOnly: false,
    hasLinkedinOnly: false,
    page: 1,
    limit: 25,
    sortOrder: 'asc',
    tab: 'all',
  };

  it('renders the 7 streamlined logistics-centric filter categories', () => {
    const html = renderToString(
      <FilterSidebar
        filters={defaultFilters}
        onToggleArrayFilter={vi.fn()}
        onToggleBooleanFilter={vi.fn()}
        onClearCategory={vi.fn()}
      />
    );

    // 1. Primary Freight Role Focus
    expect(html).toContain('Freight Role Focus');
    expect(html).toContain('Logistics Roles Only');
    expect(html).toContain('684k');
    expect(html).toContain('Decision Makers Only');
    expect(html).toContain('345k');

    // 2. Seniority Level
    expect(html).toContain('Seniority Level');
    expect(html).toContain('C-Suite / Executives');
    expect(html).toContain('Vice President (VP)');
    expect(html).toContain('Director / Head');
    expect(html).toContain('Manager / Lead');

    // 3. Standardized Job Titles
    expect(html).toContain('Job Titles');
    expect(html).toContain('Head of Supply Chain');
    expect(html).toContain('Director of Logistics');
    expect(html).toContain('Import / Export Manager');

    // 4. Department
    expect(html).toContain('Department');
    expect(html).toContain('Operations &amp; Logistics');
    expect(html).toContain('Supply Chain &amp; Procurement');

    // 5. Geographic Corridor / Country
    expect(html).toContain('Trade Corridor / Country');
    expect(html).toContain('India');
    expect(html).toContain('United States');
    expect(html).toContain('Brazil');
    expect(html).toContain('United Kingdom');
    expect(html).toContain('United Arab Emirates');

    // 6. Cargo Vertical / Industry
    expect(html).toContain('Cargo Vertical / Industry');
    expect(html).toContain('Automotive &amp; Transportation');
    expect(html).toContain('Pharmaceuticals &amp; Healthcare');
    expect(html).toContain('Perishables, Food &amp; Beverage');
    expect(html).toContain('Chemicals &amp; Hazardous Goods');

    // 7. Outreach Readiness
    expect(html).toContain('Outreach Readiness');
    expect(html).toContain('Verified Direct Email');
    expect(html).toContain('1.36m');
    expect(html).toContain('LinkedIn Profile Available');

    // 8. Saved Lists
    expect(html).toContain('Saved Lists');
  });

  it('strictly excludes the 5 eliminated irrelevant/mock filters', () => {
    const html = renderToString(
      <FilterSidebar
        filters={defaultFilters}
        onToggleArrayFilter={vi.fn()}
        onToggleBooleanFilter={vi.fn()}
        onClearCategory={vi.fn()}
      />
    );

    // 1. Eliminate Bombora Buying Intent
    expect(html).not.toContain('Buying Intent');
    expect(html).not.toContain('Bombora');

    // 2. Eliminate SaaS Technologies stack
    expect(html).not.toContain('Technologies');
    expect(html).not.toContain('Salesforce');
    expect(html).not.toContain('HubSpot');
    expect(html).not.toContain('Stripe');
    expect(html).not.toContain('Segment');

    // 3. Eliminate Venture Funding stages
    expect(html).not.toContain('Funding');
    expect(html).not.toContain('Series A');
    expect(html).not.toContain('Series B');
    expect(html).not.toContain('Bootstrapped');

    // 4. Eliminate Mock CRM Owner
    expect(html).not.toContain('Assigned to Me');
    expect(html).not.toContain('Team Pipeline');

    // 5. Eliminate Revenue from People Tab
    expect(html).not.toContain('Revenues');
    expect(html).not.toContain('$10M - $50M');
  });

  it('renders active filter chips for logistics-specific criteria', () => {
    const activeFilters: FilterParams = {
      ...defaultFilters,
      seniority: ['director'],
      jobTitles: ['Logistics Manager'],
      locations: ['India', 'Brazil'],
      industries: ['Pharmaceuticals & Healthcare'],
      logisticsOnly: true,
      hasEmailOnly: true,
    };

    const onRemove = vi.fn();
    const onClearAll = vi.fn();

    const html = renderToString(
      <ActiveFilterChips
        filters={activeFilters}
        onRemoveFilter={onRemove}
        onClearAll={onClearAll}
      />
    );

    expect(html).toContain('Logistics Roles Only');
    expect(html).toContain('Verified Email');
    expect(html).toContain('director');
    expect(html).toContain('Logistics Manager');
    expect(html).toContain('India');
    expect(html).toContain('Brazil');
    expect(html).toContain('Pharmaceuticals &amp; Healthcare');
    expect(html).toContain('Clear all');
  });
});
