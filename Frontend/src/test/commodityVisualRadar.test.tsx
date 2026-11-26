import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  buildTimelineTracks,
  buildSankeyData,
  extractTemperature,
} from '@/data/commodityVisualData';
import { CommoditySwimlaneTimeline } from '@/components/commodities/CommoditySwimlaneTimeline';
import { CommodityCorridorSankey } from '@/components/commodities/CommodityCorridorSankey';
import { CommodityRadarView } from '@/components/commodities/CommodityRadarView';

describe('Commodity Visual Data Engine', () => {
  it('extractTemperature correctly parses diverse cold chain format strings', () => {
    expect(extractTemperature("40' CA Reefer (0°C to +1°C)")).toBe('0°C to +1°C');
    expect(extractTemperature('Frozen Meat (-18°C Reefer)')).toBe('-18°C');
    expect(extractTemperature('Active Vaccines (+2°C to +8°C)')).toBe('+2°C to +8°C');
    expect(extractTemperature("Dry 20' Heavy FCL")).toBeUndefined();
    expect(extractTemperature('')).toBeUndefined();
  });

  it('buildTimelineTracks generates all 8 gateway hub tracks with 12 monthly bars', () => {
    const tracks = buildTimelineTracks('ALL');
    expect(tracks.length).toBe(8);

    const hubCodes = tracks.map((t) => t.code);
    expect(hubCodes).toEqual(['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'AMD', 'COK']);

    tracks.forEach((track) => {
      expect(track.bars.length).toBe(12);
      expect(track.hubName).toBeDefined();
      expect(track.region).toBeDefined();
    });

    // Check specific commodity mappings
    const bomTrack = tracks.find((t) => t.code === 'BOM')!;
    const bomMarchBar = bomTrack.bars.find((b) => b.month === 3)!;
    expect(bomMarchBar.label).toBe('Table Grapes');
    expect(bomMarchBar.mode).toBe('Ocean');

    const delTrack = tracks.find((t) => t.code === 'DEL')!;
    const delNovBar = delTrack.bars.find((b) => b.month === 11)!;
    expect(delNovBar.label).toBe('Basmati Rice');
  });

  it('buildTimelineTracks filters by specific gateway hub', () => {
    const tracks = buildTimelineTracks('BOM');
    expect(tracks.length).toBe(1);
    expect(tracks[0].code).toBe('BOM');
    expect(tracks[0].bars.length).toBe(12);
  });

  it('buildTimelineTracks filters by urgency status and query', () => {
    const activeTracks = buildTimelineTracks('ALL', 'active');
    activeTracks.forEach((track) => {
      track.bars.forEach((bar) => {
        expect(bar.status).toBe('active');
      });
    });

    const queryTracks = buildTimelineTracks('ALL', 'all', 'Grapes');
    const totalBars = queryTracks.reduce((acc, t) => acc + t.bars.length, 0);
    expect(totalBars).toBeGreaterThan(0);
  });

  it('buildSankeyData compiles valid multi-stage nodes and links without cycles', () => {
    const data = buildSankeyData(11, 'ALL');
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.links.length).toBeGreaterThan(0);

    // Verify 4 distinct categories exist
    const categories = new Set(data.nodes.map((n) => n.category));
    expect(categories.has('hub')).toBe(true);
    expect(categories.has('equipment')).toBe(true);
    expect(categories.has('commodity')).toBe(true);
    expect(categories.has('corridor')).toBe(true);

    // Verify every link has valid source and target matching node IDs
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    data.links.forEach((link) => {
      expect(nodeIds.has(link.source as string)).toBe(true);
      expect(nodeIds.has(link.target as string)).toBe(true);
      expect(link.value).toBeGreaterThan(0);
    });
  });
});

describe('CommoditySwimlaneTimeline Component', () => {
  it('renders month scrubber and 8 gateway tracks with commodity labels', () => {
    const html = renderToString(
      <CommoditySwimlaneTimeline
        selectedMonth={11}
        selectedHub="ALL"
        onMonthChange={() => {}}
        onHubChange={() => {}}
      />
    );

    // Header & Scrubber
    expect(html).toContain('Annual Freight Commodity Swimlane');
    expect(html).toContain('Timeline Scrubber:');
    expect(html).toContain('Jan');
    expect(html).toContain('Nov');
    expect(html).toContain('Dec');

    // Gateway hubs
    expect(html).toContain('DEL');
    expect(html).toContain('BOM');
    expect(html).toContain('BLR');
    expect(html).toContain('MAA');
    expect(html).toContain('HYD');
    expect(html).toContain('CCU');
    expect(html).toContain('AMD');
    expect(html).toContain('COK');

    // Surging commodities visible directly on timeline
    expect(html).toContain('Table Grapes');
    expect(html).toContain('Basmati Rice');
    expect(html).toContain('Valentine Roses');
    expect(html).toContain('Pharma &amp; Vaccines');

    // Bottom Selected Status
    expect(html).toContain('Selected: November · All 8 Gateways');
    expect(html).toContain('View Month Playbook');
  });

  it('renders single hub swimlane when hub filter is active', () => {
    const html = renderToString(
      <CommoditySwimlaneTimeline
        selectedMonth={3}
        selectedHub="BOM"
        onMonthChange={() => {}}
        onHubChange={() => {}}
      />
    );

    expect(html).toContain('BOM');
    expect(html).toContain('Mumbai');
    expect(html).not.toContain('Kolkata');
    expect(html).toContain('Selected: March · BOM');
  });
});

describe('CommodityCorridorSankey Component', () => {
  it('renders SVG canvas, column headers, nodes, and flow ribbons', () => {
    const html = renderToString(
      <CommodityCorridorSankey
        selectedMonth={11}
        selectedHub="ALL"
        onMonthChange={() => {}}
        onHubChange={() => {}}
      />
    );

    expect(html).toContain('Multi-Tier Freight Corridor Flow (Sankey)');
    expect(html).toContain('Indian Gateways');
    expect(html).toContain('Equipment &amp; Mode');
    expect(html).toContain('Surging Commodities');
    expect(html).toContain('Global Corridors');

    // SVG elements present
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 920 440"');
    expect(html).toContain('class="links"');
    expect(html).toContain('class="nodes"');

    // Key corridors and equipment
    expect(html).toContain('Middle East / GCC');
    expect(html).toContain('Europe / UK');
    expect(html).toContain('Active Month: November');
  });

  it('renders filtered hub sankey view', () => {
    const html = renderToString(
      <CommodityCorridorSankey
        selectedMonth={1}
        selectedHub="BOM"
        onMonthChange={() => {}}
        onHubChange={() => {}}
      />
    );

    expect(html).toContain('BOM · Mumbai');
    expect(html).toContain('Reset to All 8 Hubs');
  });
});

describe('CommodityRadarView Hybrid Presentation Switcher', () => {
  it('allows switching between Swimlane Timeline and Trade Flow Sankey modes', () => {
    const html = renderToString(<CommodityRadarView />);

    // Switcher buttons
    expect(html).toContain('Seasonal Timeline (Swimlane)');
    expect(html).toContain('Trade Flow (Sankey)');

    // Default mode is timeline
    expect(html).toContain('Annual Freight Commodity Swimlane');
  });
});
