import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  buildTimelineTracks,
  extractTemperature,
} from '@/data/commodityVisualData';
import { CommoditySwimlaneTimeline } from '@/components/commodities/CommoditySwimlaneTimeline';
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

describe('CommodityRadarView Visual Presentation', () => {
  it('renders Seasonal Swimlane Timeline directly without trade flow sankey', () => {
    const html = renderToString(<CommodityRadarView />);
    expect(html).toContain('Annual Freight Commodity Swimlane');
    expect(html).not.toContain('Trade Flow (Sankey)');
  });
});
