import React from 'react';
import {
  Sparkles,
  Target,
  PauseCircle,
  ShieldAlert,
  AlertCircle,
  Boxes,
} from 'lucide-react';
import { TierAudienceTab, TierCountsResponse } from '@/types/tierSegmentation';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';
import { SegmentContextBanner } from '@/components/ui/SegmentContextBanner';

export interface TierAudienceTabsProps {
  activeTab?: TierAudienceTab;
  onTabChange?: (tab: TierAudienceTab) => void;
  counts?: TierCountsResponse;
  className?: string;
}

interface TierTabConfig {
  id: TierAudienceTab;
  label: string;
  icon: React.ElementType;
  countKey: keyof TierCountsResponse;
  tooltip: {
    title: string;
    description: string;
    criteria: string[];
    salesAction: string;
    badge: {
      text: string;
      variant: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
    };
  };
}

const TIER_TABS: TierTabConfig[] = [
  {
    id: 'tier-a',
    label: 'Tier A Priority',
    icon: Sparkles,
    countKey: 'tier_a',
    tooltip: {
      title: 'Tier A Priority Prospects',
      description: 'High-intent freight shippers qualifying for direct inside sales engagement and customized freight analysis.',
      badge: { text: 'Score 70–100 · Priority', variant: 'emerald' },
      criteria: [
        'High shipment frequency: 24+ shipments / year (20 pts)',
        'Active air freight or air-suitable high-value goods (15 pts)',
        'Core priority lanes: India to US, UAE, or LATAM (9–15 pts)',
        'High recency: Customs activity within last 60 days (10 pts)',
        'Bonuses: Regulated pharma plant (+5) or major logistics cluster (+5)',
      ],
      salesAction:
        'Immediate Inside Sales discovery call within 24h. If verified Hot/Warm, deliver custom freight intelligence client report within 48h.',
    },
  },
  {
    id: 'tier-b',
    label: 'Tier B Nurture',
    icon: Target,
    countKey: 'tier_b',
    tooltip: {
      title: 'Tier B Nurture Prospects',
      description: 'Established international shippers targeted for automated multi-touch sequence nurturing.',
      badge: { text: 'Score 40–69 · Nurture', variant: 'blue' },
      criteria: [
        'Moderate frequency: 4 to 23 shipments / year (6–12 pts)',
        'Ocean shipper with air-conversion suitability (8 pts)',
        'Secondary served lanes or mixed freight terms (4–8 pts)',
        'Activity recency: Customs bill within 61–180 days (5 pts)',
      ],
      salesAction:
        'Automated 4-stage value email sequence. If prospect clicks or replies, trigger immediate inside sales outreach.',
    },
  },
  {
    id: 'parked',
    label: 'Parked',
    icon: PauseCircle,
    countKey: 'parked',
    tooltip: {
      title: 'Parked Accounts',
      description: 'Low-fit or dormant cargo shippers requiring zero immediate outbound sales bandwidth.',
      badge: { text: 'Score Below 40 · On Hold', variant: 'amber' },
      criteria: [
        'Low frequency: Fewer than 4 shipments / year (0 pts)',
        'Bulk or low-value commodities (0 pts) or non-served lanes (0 pts)',
        'Inactive: No shipment for more than 180 days (0 pts)',
      ],
      salesAction:
        'No active sales bandwidth expended. Accounts are automatically re-evaluated before annual export seasons.',
    },
  },
  {
    id: 'excluded',
    label: 'Excluded',
    icon: ShieldAlert,
    countKey: 'excluded',
    tooltip: {
      title: 'Excluded Accounts',
      description: 'Companies suppressed from prospecting pipelines due to existing customer status or forwarder competition.',
      badge: { text: 'Suppressed from Outreach', variant: 'slate' },
      criteria: [
        'Existing JFLL Customer: Matched with active customer database',
        'Competitor freight forwarder or NVOCC identified in trade filings',
      ],
      salesAction:
        'Strictly suppressed from cold sales prospecting. Account forwarded to existing account manager or CRM team.',
    },
  },
  {
    id: 'unscored',
    label: 'Unscored',
    icon: AlertCircle,
    countKey: 'unscored',
    tooltip: {
      title: 'Unscored (Data Quality Queue)',
      description: 'Customs records with incomplete required parameters requiring analyst research and enrichment.',
      badge: { text: 'Data Remediation Queue', variant: 'slate' },
      criteria: [
        'Missing mandatory SOP fields: Mode, Commodity, Trade Lane, or Activity Date',
        'Partial scores are prohibited by SOP to prevent inaccurate classification',
      ],
      salesAction:
        'Data remediation queue. Assigned to research analyst for domain, lane, and HS code enrichment.',
    },
  },
  {
    id: 'all',
    label: 'All Scored',
    icon: Boxes,
    countKey: 'all',
    tooltip: {
      title: 'All Scored Customs Leads',
      description: 'Complete universe of 37,273 DataMyne shipping leads evaluated under JFLL SOP Stage 2.',
      badge: { text: 'Complete Universe', variant: 'blue' },
      criteria: [
        'Full dataset evaluated against JFLL Lead Generation SOP Stage 2',
        'Includes Tier A, Tier B, Parked, Excluded, and Unscored segments',
      ],
      salesAction:
        'Select a specific tier tab above or filter by score thresholds to drive focused freight prospecting.',
    },
  },
];

export const TierAudienceTabs: React.FC<TierAudienceTabsProps> = ({
  activeTab = 'tier-a',
  onTabChange,
  counts,
  className = '',
}) => {
  const activeConfig = TIER_TABS.find((t) => t.id === activeTab) || TIER_TABS[0];

  const formatCount = (count?: number) => {
    if (count === undefined) return '';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toLocaleString();
  };

  return (
    <div className={`border-b border-surface-border bg-white ${className}`}>
      {/* Primary Tier Tabs Scroll Container */}
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
          {TIER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const countVal = counts ? (counts[tab.countKey] as number) : undefined;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`relative px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
                  isActive
                    ? 'bg-apollo/10 text-apollo font-semibold border border-apollo/25 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-apollo' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>

                {countVal !== undefined && (
                  <span
                    className={`ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-apollo text-white font-bold'
                        : 'bg-slate-100 text-slate-500 font-semibold'
                    }`}
                  >
                    {formatCount(countVal)}
                  </span>
                )}

                <CategoryInfoTooltip
                  title={tab.tooltip.title}
                  description={tab.tooltip.description}
                  badge={tab.tooltip.badge}
                  criteria={tab.tooltip.criteria}
                  actionTip={tab.tooltip.salesAction}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Context Banner Directly Explaining the Selected Tier */}
      <SegmentContextBanner
        title={activeConfig.tooltip.title}
        count={counts ? (counts[activeConfig.countKey] as number) : undefined}
        description={activeConfig.tooltip.description}
        criteria={activeConfig.tooltip.criteria.join(' • ')}
        actionTip={activeConfig.tooltip.salesAction}
        icon={activeConfig.icon}
        variant={activeConfig.tooltip.badge.variant}
        storageKey={`tier_tab_${activeTab}`}
      />
    </div>
  );
};
