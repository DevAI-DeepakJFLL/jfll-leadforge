import { GatewayHubId, MonthlyRecord } from '@/types/freightCommodities';
import { MONTHLY_COMMODITY_RECORDS } from './freightCommoditiesData';

export interface TimelineBar {
  id: string;
  hubId: GatewayHubId;
  hubName: string;
  month: number;
  monthName: string;
  label: string;
  sublabel: string;
  mode: 'Air' | 'Ocean' | 'Multi-Modal';
  equipment: string;
  temp?: string;
  status: 'active' | 'upcoming' | 'standard';
  priority: 'HIGH' | 'MEDIUM';
  season: string;
  tradeLanes: string;
  clusters: string;
  record: MonthlyRecord;
}

export interface TimelineHubTrack {
  hubId: GatewayHubId;
  hubName: string;
  code: string;
  region: 'North' | 'West' | 'South' | 'East';
  bars: TimelineBar[];
}

/** Extracts temperature string if present in text */
export function extractTemperature(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/([+-]?\d+°?C(?:\s*to\s*[+-]?\d+°?C)?)/i);
  return match ? match[1] : undefined;
}

/** Extracts clean commodity name */
function cleanCommodityName(text: string): string {
  if (!text) return '';
  const first = text.split(',')[0] || '';
  return first.replace(/\([^)]*\)/g, '').trim();
}

/**
 * Builds chronological timeline data for all 8 hubs (or filtered hub).
 * Each hub has 12 monthly bars indicating peak surges, lead windows, and equipment.
 */
export function buildTimelineTracks(
  hubFilter: GatewayHubId = 'ALL',
  urgencyFilter: 'all' | 'active' | 'upcoming' = 'all',
  searchQuery: string = ''
): TimelineHubTrack[] {
  const hubsMeta: { id: GatewayHubId; name: string; region: 'North' | 'West' | 'South' | 'East' }[] = [
    { id: 'DEL', name: 'Delhi NCR', region: 'North' },
    { id: 'BOM', name: 'Mumbai', region: 'West' },
    { id: 'BLR', name: 'Bengaluru', region: 'South' },
    { id: 'MAA', name: 'Chennai', region: 'South' },
    { id: 'HYD', name: 'Hyderabad', region: 'South' },
    { id: 'CCU', name: 'Kolkata', region: 'East' },
    { id: 'AMD', name: 'Ahmedabad', region: 'West' },
    { id: 'COK', name: 'Kerala', region: 'South' },
  ];

  const targetHubs = hubFilter === 'ALL' ? hubsMeta : hubsMeta.filter((h) => h.id === hubFilter);
  const q = searchQuery.trim().toLowerCase();

  return targetHubs.map((meta) => {
    const hubRecords = MONTHLY_COMMODITY_RECORDS.filter((r) => r.hubId === meta.id).sort(
      (a, b) => a.month - b.month
    );

    const bars: TimelineBar[] = hubRecords
      .map((r) => {
        const primaryAir = cleanCommodityName(r.airExport);
        const primarySea = cleanCommodityName(r.seaExport);
        const temp = extractTemperature(r.equipment) || extractTemperature(r.seaExport) || extractTemperature(r.airExport);

        // Pick primary label based on peak
        let label = primaryAir || primarySea || r.season;
        let mode: 'Air' | 'Ocean' | 'Multi-Modal' = 'Multi-Modal';
        if (primaryAir && !primarySea) mode = 'Air';
        else if (primarySea && !primaryAir) mode = 'Ocean';
        else if (primaryAir && primarySea) mode = r.bookingStatus === 'active' ? 'Ocean' : 'Air';

        // Prefer highest-value headline
        if (meta.id === 'BOM' && r.month >= 1 && r.month <= 4) {
          label = 'Table Grapes';
          mode = 'Ocean';
        } else if (meta.id === 'DEL' && (r.month >= 10 || r.month <= 2)) {
          label = 'Basmati Rice';
          mode = 'Ocean';
        } else if (meta.id === 'BLR' && (r.month === 1 || r.month === 2)) {
          label = 'Valentine Roses';
          mode = 'Air';
        } else if (meta.id === 'HYD') {
          label = 'Pharma & Vaccines';
          mode = 'Air';
        } else if (meta.id === 'CCU' && (r.month >= 4 && r.month <= 10)) {
          label = 'Black Tiger Shrimp';
          mode = 'Ocean';
        } else if (meta.id === 'COK' && (r.month >= 5 && r.month <= 9)) {
          label = 'Marine Catch & Spices';
          mode = 'Ocean';
        } else if (meta.id === 'AMD' && (r.month >= 10 || r.month <= 2)) {
          label = 'Castor Oil & Cumin';
          mode = 'Ocean';
        } else if (meta.id === 'MAA' && (r.month >= 1 && r.month <= 4)) {
          label = 'Vannamei Shrimp & Auto';
          mode = 'Ocean';
        }

        const status: 'active' | 'upcoming' | 'standard' =
          r.bookingStatus === 'active'
            ? 'active'
            : r.bookingStatus === 'upcoming'
            ? 'upcoming'
            : 'standard';

        return {
          id: `${meta.id}-${r.month}`,
          hubId: meta.id,
          hubName: meta.name,
          month: r.month,
          monthName: r.monthName,
          label,
          sublabel: r.season,
          mode,
          equipment: r.equipment.split(';')[0]?.trim() || 'Dry Container',
          temp,
          status,
          priority: r.priority,
          season: r.season,
          tradeLanes: r.tradeLanes,
          clusters: r.clusters,
          record: r,
        };
      })
      .filter((bar) => {
        if (urgencyFilter === 'active' && bar.status !== 'active') return false;
        if (urgencyFilter === 'upcoming' && bar.status !== 'upcoming') return false;
        if (q) {
          const haystack = `${bar.label} ${bar.sublabel} ${bar.equipment} ${bar.tradeLanes} ${bar.clusters}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });

    return {
      hubId: meta.id,
      hubName: meta.name,
      code: meta.id,
      region: meta.region,
      bars,
    };
  });
}

