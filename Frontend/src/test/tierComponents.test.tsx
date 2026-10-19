import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TierAudienceTabs, TierScoreBadge, TierScoreBreakdownModal } from '@/components/tiers';
import { TierCountsResponse, TieredLead } from '@/types/tierSegmentation';

const mockCounts: TierCountsResponse = {
  tier_a: 3869,
  tier_b: 18624,
  parked: 6400,
  excluded: 2,
  unscored: 8378,
  all: 37273,
};

describe('Tier Components Suite', () => {
  it('renders all tier audience tabs with badges and info triggers', () => {
    const html = renderToString(
      <TierAudienceTabs
        activeTab="tier-a"
        onTabChange={() => {}}
        counts={mockCounts}
      />
    );

    expect(html).toContain('Tier A Priority');
    expect(html).toContain('Tier B Nurture');
    expect(html).toContain('Parked');
    expect(html).toContain('Excluded');
    expect(html).toContain('Unscored');
    expect(html).toContain('All Scored');

    // Verify counts formatted
    expect(html).toContain('3.9k');
    expect(html).toContain('18.6k');

    // Verify info tooltip accessibility attributes exist
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('Tier A Priority Prospects');
  });

  it('renders TierScoreBadge with correct styling and score label', () => {
    const breakdown = {
      frequency_score: 20,
      freight_control_score: 15,
      lane_score: 15,
      commodity_score: 15,
      mode_score: 15,
      volume_trend_score: 5,
      recency_score: 10,
      regulated_plant_bonus: 5,
      cluster_bonus: 0,
    };

    const html = renderToString(
      <TierScoreBadge
        status="Tier A"
        score={85}
        breakdown={breakdown}
      />
    );

    expect(html).toContain('Tier A');
    expect(html).toContain('85');
    expect(html).toContain('aria-label="Tier A with score 85"');
  });

  it('renders TierScoreBreakdownModal with full criteria audit', () => {
    const mockLead: TieredLead = {
      id: 'dm-val-00001',
      company_name: 'TRENT LIMITED',
      role: 'Exporter',
      transport_mode: 'Air',
      category: 'Textiles & Apparel',
      subcategory: 'Apparel',
      contact_type: 'Both Phone & Email',
      phone: '123456',
      email: 'trent@test.com',
      tax_id: '795011351',
      city: 'Mumbai',
      address: 'Bombay House',
      pin_code: '400001',
      directors: 'B.S. Bhesania',
      trade_lanes: 'GCR/Air',
      top_hs_codes: '61099090',
      total_shipments: 37548,
      total_value_usd: 1194845,
      latest_activity_date: '2026-02-27',
      dataset_type: 'valid',
      segment_status: 'Tier A',
      tier_reason: 'score',
      total_score: 76,
      base_score: 71,
      bonus_points: 5,
      score_breakdown: {
        frequency_score: 20,
        freight_control_score: 8,
        lane_score: 15,
        commodity_score: 8,
        mode_score: 15,
        volume_trend_score: 5,
        recency_score: 0,
        regulated_plant_bonus: 0,
        cluster_bonus: 5,
      },
    };

    const html = renderToString(
      <TierScoreBreakdownModal
        isOpen={true}
        lead={mockLead}
        onClose={() => {}}
      />
    );

    expect(html).toContain('TRENT LIMITED');
    expect(html).toContain('1. Shipment Frequency (12 Months)');
    expect(html).toContain('37,548 shipments recorded');
    expect(html).toContain('Recommended Sales Playbook:');
    expect(html).toContain('Conduct immediate discovery verification call within 24 hours');
  });
});
