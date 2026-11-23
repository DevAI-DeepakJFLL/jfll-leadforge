/**
 * Freight Commodity Intelligence & Targeting Radar Types
 * Source: Phase2/india_metro_monthly_freight_commodities_v3.xlsx
 */

export type GatewayHubId = 'ALL' | 'DEL' | 'BOM' | 'BLR' | 'MAA' | 'HYD' | 'CCU' | 'AMD' | 'COK';

export type FreightDirection = 'Air Export' | 'Air Import' | 'Sea Export' | 'Sea Import';

export type BookingWindowStatus = 'active' | 'upcoming' | 'off-season';

export interface MonthlyRecord {
  id: string;
  month: number; // 1 - 12
  monthName: string; // e.g. "January"
  quarter: string; // e.g. "Q1 (Jan-Mar)"
  hubId: GatewayHubId;
  hubName: string; // e.g. "Delhi NCR"
  season: string; // Season & Trade Cycle
  priority: 'HIGH' | 'MEDIUM';
  airExport: string; // Top Outbound & Perishables
  airImport: string; // High-Value Inputs & Spares
  seaExport: string; // FCL / LCL & Ocean Reefers
  seaImport: string; // Raw Materials, Capital Goods
  equipment: string; // Recommended Equipment & Container Specs
  gateways: string; // Key Gateways (Airports / Seaports / ICDs)
  clusters: string; // Target Shipper Clusters & Sales Avenues
  tradeLanes: string; // Primary Trade Lanes
  referenceSource: string; // Verified Reference Source URL
  bookingWindow: string; // Commercial Booking Lead Window
  bookingStatus: BookingWindowStatus;
  searchHaystack?: string;
}

export interface ColdChainSpec {
  id: string;
  commodity: string;
  hubs: string;
  peakWindow: string;
  leadWindow: string;
  priority: 'HIGH' | 'MEDIUM';
  tempAndHumidity: string;
  compliance: string;
  airSolution: string;
  oceanSolution: string;
  roadSolution: string;
  buyers: string;
  referenceSource: string;
}

export interface HubGatewayInfo {
  code: GatewayHubId;
  name: string;
  airCargoVolume: string;
  oceanCorridors: string;
  keyFacilities: string;
  flagshipExport?: string;
  flagshipImport?: string;
}

export interface CommodityRecord {
  id: string;
  name: string;
  hsCode?: string;
  hub: GatewayHubId;
  hubName: string;
  month: number; // 1 - 12
  direction: FreightDirection[];
  priority: 'HIGH' | 'MEDIUM';
  equipment: string;
  tempRegime?: string;
  clusters: string[];
  tradeLanes: string[];
  bookingWindow: string;
  bookingStatus: BookingWindowStatus;
  peakWindow?: string;
  commercialPitch?: string;
  coldChain?: {
    tempAndHumidity: string;
    equipment: string;
    shelfLife?: string;
    packagingRequirements?: string;
  };
}
