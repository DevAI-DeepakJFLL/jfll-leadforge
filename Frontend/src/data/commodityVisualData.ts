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

export interface SankeyGraphNode {
  id: string;
  name: string;
  category: 'hub' | 'equipment' | 'commodity' | 'corridor';
  color: string;
  value?: number;
}

export interface SankeyGraphLink {
  source: string;
  target: string;
  value: number;
  commodity?: string;
  equipment?: string;
}

export interface SankeyGraphData {
  nodes: SankeyGraphNode[];
  links: SankeyGraphLink[];
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

/**
 * Builds 4-stage Sankey Flow Graph data for a given month:
 * Stage 0: Hub -> Stage 1: Equipment/Mode -> Stage 2: Commodity -> Stage 3: Corridor
 */
export function buildSankeyData(month: number, hubFilter: GatewayHubId = 'ALL'): SankeyGraphData {
  const records = MONTHLY_COMMODITY_RECORDS.filter(
    (r) => r.month === month && (hubFilter === 'ALL' || r.hubId === hubFilter)
  );

  const hubNodesMap = new Map<string, SankeyGraphNode>();
  const equipNodesMap = new Map<string, SankeyGraphNode>();
  const commodityNodesMap = new Map<string, SankeyGraphNode>();
  const corridorNodesMap = new Map<string, SankeyGraphNode>();

  const links: SankeyGraphLink[] = [];

  // Helper to normalize corridor names
  const categorizeCorridor = (lane: string): string => {
    const l = lane.toUpperCase();
    if (l.includes('GCC') || l.includes('UAE') || l.includes('MIDDLE EAST') || l.includes('DUBAI') || l.includes('SAUDI') || l.includes('OMAN')) {
      return 'Middle East / GCC';
    }
    if (l.includes('EU') || l.includes('UK') || l.includes('ROTTERDAM') || l.includes('GERMANY') || l.includes('EUROPE') || l.includes('AMSTERDAM')) {
      return 'Europe / UK';
    }
    if (l.includes('USA') || l.includes('NORTH AMERICA') || l.includes('JFK') || l.includes('ORD')) {
      return 'North America (USA)';
    }
    if (l.includes('VIETNAM') || l.includes('JAPAN') || l.includes('SINGAPORE') || l.includes('ASIA') || l.includes('CHINA') || l.includes('KOREA')) {
      return 'Far East & ASEAN';
    }
    if (l.includes('RUSSIA') || l.includes('CIS')) {
      return 'Russia & CIS';
    }
    return 'Global Cross-Trade';
  };

  // Helper to categorize equipment
  const categorizeEquipment = (equip: string): string => {
    const e = equip.toUpperCase();
    if (e.includes('CA REEFER') || e.includes('CONTROLLED ATMOSPHERE')) return "40' CA Reefer (0°C to +1°C)";
    if (e.includes('SUPER-FREEZER') || e.includes('-25C') || e.includes('-18C')) return "40' Reefer Freezer (-18°C / -25°C)";
    if (e.includes('REEFER') || e.includes('+2C') || e.includes('+4C')) return "40' Perishable Reefer (+2°C to +8°C)";
    if (e.includes('LD3') || e.includes('LD7') || e.includes('ULD') || e.includes('COOL DOLLIES') || e.includes('AIR')) return 'Air Perishable ULD (LD3/LD7)';
    if (e.includes('ISO TANK')) return "20' Heavy ISO Tanks (Chemicals)";
    if (e.includes('HEAVY FCL') || e.includes('20\' HEAVY')) return "20' Heavy FCL (High-Density)";
    if (e.includes('RO-RO')) return 'Ro-Ro Automotive Carrier';
    return "40' Dry High-Cube FCL";
  };

  records.forEach((r) => {
    const hubId = `hub-${r.hubId}`;
    if (!hubNodesMap.has(hubId)) {
      hubNodesMap.set(hubId, {
        id: hubId,
        name: `${r.hubId} · ${r.hubName}`,
        category: 'hub',
        color: '#2563eb', // blue-600
      });
    }

    // Determine equipment
    const equipName = categorizeEquipment(r.equipment);
    const equipId = `equip-${equipName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!equipNodesMap.has(equipId)) {
      equipNodesMap.set(equipId, {
        id: equipId,
        name: equipName,
        category: 'equipment',
        color: equipName.includes('Reefer') || equipName.includes('Freezer') || equipName.includes('ULD') ? '#059669' : '#0284c7',
      });
    }

    // Determine primary commodity
    const commName = cleanCommodityName(r.seaExport) || cleanCommodityName(r.airExport) || r.season;
    const commId = `comm-${commName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!commodityNodesMap.has(commId)) {
      commodityNodesMap.set(commId, {
        id: commId,
        name: commName,
        category: 'commodity',
        color: '#7c3aed', // violet-600
      });
    }

    // Determine corridor
    const corridorName = categorizeCorridor(r.tradeLanes);
    const corridorId = `corr-${corridorName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (!corridorNodesMap.has(corridorId)) {
      corridorNodesMap.set(corridorId, {
        id: corridorId,
        name: corridorName,
        category: 'corridor',
        color: '#d97706', // amber-600
      });
    }

    const flowWeight = r.priority === 'HIGH' ? (r.bookingStatus === 'active' ? 24 : 16) : 10;

    // Link 1: Hub -> Equipment
    links.push({
      source: hubId,
      target: equipId,
      value: flowWeight,
      commodity: commName,
      equipment: equipName,
    });

    // Link 2: Equipment -> Commodity
    links.push({
      source: equipId,
      target: commId,
      value: flowWeight,
      commodity: commName,
      equipment: equipName,
    });

    // Link 3: Commodity -> Corridor
    links.push({
      source: commId,
      target: corridorId,
      value: flowWeight,
      commodity: commName,
      equipment: equipName,
    });
  });

  // Aggregate duplicate links
  const linkKeyMap = new Map<string, SankeyGraphLink>();
  links.forEach((link) => {
    const key = `${link.source}->${link.target}`;
    if (linkKeyMap.has(key)) {
      linkKeyMap.get(key)!.value += link.value;
    } else {
      linkKeyMap.set(key, { ...link });
    }
  });

  const nodes = [
    ...Array.from(hubNodesMap.values()),
    ...Array.from(equipNodesMap.values()),
    ...Array.from(commodityNodesMap.values()),
    ...Array.from(corridorNodesMap.values()),
  ];

  return {
    nodes,
    links: Array.from(linkKeyMap.values()),
  };
}
