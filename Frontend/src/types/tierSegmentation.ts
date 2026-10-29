import { DatamyneLead, DatamyneDatasetType, TransportMode } from './datamyneLead';

export type TierSegmentStatus = 'Tier A' | 'Tier B' | 'Parked' | 'Excluded' | 'Unscored';

export type TierReason =
  | 'score'
  | 'strategic_override'
  | 'existing_customer'
  | 'competitor_forwarder'
  | 'missing_required_fields'
  | 'dormant'
  | 'unscored'
  | 'manual';

export interface TierScoreBreakdown {
  frequency_score: number;
  freight_control_score: number;
  lane_score: number;
  commodity_score: number;
  mode_score: number;
  volume_trend_score: number;
  recency_score: number;
  regulated_plant_bonus: number;
  cluster_bonus: number;
}

export interface TieredLead extends DatamyneLead {
  segment_status: TierSegmentStatus;
  tier_reason: TierReason;
  total_score: number;
  base_score: number;
  bonus_points: number;
  score_breakdown: TierScoreBreakdown;
  missing_fields?: string;
  scored_at?: string;
  rules_version?: string;
}

export interface TierCapacityReport {
  tier_a_count: number;
  total_scored: number;
  tier_a_percentage: number;
  monthly_capacity: number;
  exceeds_guideline: boolean;
  exceeds_capacity: boolean;
  suggested_cutoff: number;
}

export interface TierCountsResponse {
  tier_a: number;
  tier_b: number;
  parked: number;
  excluded: number;
  unscored: number;
  all: number;
  capacity?: TierCapacityReport;
}

export type TierAudienceTab = 'all' | 'tier-a' | 'tier-b' | 'parked' | 'excluded' | 'unscored';

export interface TierFilterParams {
  status?: TierAudienceTab | string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  pageSize?: number;
  // Datamyne faceted sidebar filters
  countries?: string[];
  transportModes?: TransportMode[];
  categories?: string[];
  subcategories?: string[];
  roles?: string[];
  cities?: string[];
  tradeLanes?: string[];
  contactStatus?: string[];
  minShipments?: number;
  minTradedValueUsd?: number;
  hasDirectors?: boolean;
  dataset?: DatamyneDatasetType;
}

export interface PaginatedTierResponse {
  items: TieredLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
}
