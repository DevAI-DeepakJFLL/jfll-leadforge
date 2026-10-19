import React from 'react';
import { ApolloAudienceTab, ApolloAudienceCounts } from '@/types/apolloLead';
import { Globe, Users, DollarSign, Sparkles, ShieldCheck } from 'lucide-react';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';
import { SegmentContextBanner } from '@/components/ui/SegmentContextBanner';

export interface ApolloAudienceTabsProps {
  activeTab?: ApolloAudienceTab;
  onTabChange?: (tab: ApolloAudienceTab) => void;
  counts?: ApolloAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

interface ApolloTabDefinition {
  id: ApolloAudienceTab;
  label: string;
  count: number;
  icon: React.ElementType;
  description: string;
  criteria: string[];
  actionTip: string;
  badge: {
    text: string;
    variant: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
  };
}

export const ApolloAudienceTabs: React.FC<ApolloAudienceTabsProps> = ({
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 686700,
    high_headcount: 23540,
    high_revenue: 82451,
    top_cargo_verticals: 123208,
    with_website_linkedin: 656045,
  },
  totalFormatted = '686.7k',
  className = '',
}) => {
  const tabs: ApolloTabDefinition[] = [
    {
      id: 'all',
      label: 'All Commercial Shippers',
      count: counts.all,
      icon: Globe,
      description: 'Global commercial organizations database, 100% sanitized of active JFLL clients and DataMyne customs shippers.',
      criteria: [
        'Verified corporate freight organization profile',
        'Excludes existing JFLL customer accounts',
        'Excludes accounts already managed in DataMyne',
      ],
      actionTip: 'Broadest cold prospecting territory. Use filters to drill into specific countries and industries.',
      badge: { text: 'Cold Universe', variant: 'blue' },
    },
    {
      id: 'high_headcount',
      label: 'Large Scale (100+ Staff)',
      count: counts.high_headcount,
      icon: Users,
      description: 'Mid-market & enterprise companies with 100+ employees, indicating steady corporate shipping operations.',
      criteria: [
        'employee_count >= 100',
        'Enterprise organization hierarchy',
        'Multiple operational logistics decision-makers',
      ],
      actionTip: 'Target VP/Director of Supply Chain & Global Logistics for multi-lane enterprise contracts.',
      badge: { text: 'Enterprise', variant: 'purple' },
    },
    {
      id: 'high_revenue',
      label: 'High Revenue ($10M+)',
      count: counts.high_revenue,
      icon: DollarSign,
      description: 'Financially established corporations generating $10M+ USD in annual revenue with large freight budgets.',
      criteria: [
        'revenue_usd >= $10,000,000 USD',
        'Proven commercial trading volume',
        'High creditworthiness and high container/air pallet demand',
      ],
      actionTip: 'Pitch dedicated account management, blocked space agreements (BSA), and customized SLAs.',
      badge: { text: 'High Value', variant: 'emerald' },
    },
    {
      id: 'top_cargo_verticals',
      label: 'Top Cargo Verticals',
      count: counts.top_cargo_verticals,
      icon: Sparkles,
      description: 'Companies in premium freight industries: Automotive, Pharmaceuticals, Food & Bev, Electronics, and Chemicals.',
      criteria: [
        'Industry belongs to high-yield cargo sectors',
        'Temperature-controlled, dangerous goods, or time-critical cargo demand',
        'Premium freight margin potential',
      ],
      actionTip: 'Highlight Jet Freight specialized capabilities: cold-chain pharma, hazardous cargo handling, and express air.',
      badge: { text: 'High Margin', variant: 'amber' },
    },
    {
      id: 'with_website_linkedin',
      label: 'Executive Ready',
      count: counts.with_website_linkedin,
      icon: ShieldCheck,
      description: 'Organizations with verified corporate websites and active LinkedIn company pages for easy contact discovery.',
      criteria: [
        'Valid website_url or corporate domain',
        'Verified LinkedIn company profile URL',
        'Direct link to organizational hierarchy and decision-makers',
      ],
      actionTip: 'Click "Find Decision Makers" in table drawer to view logistics managers and supply chain directors.',
      badge: { text: 'Verified Profiles', variant: 'emerald' },
    },
  ];

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}m`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  const currentTabMeta = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className={`border-b border-surface-border bg-white select-none ${className}`}>
      {/* Scrollable Audience Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3 sm:px-4 py-2 gap-2 border-b border-slate-100">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="relative shrink-0 flex items-center">
                <button
                  onClick={() => onTabChange?.(tab.id)}
                  className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-apollo/30 shrink-0 min-h-[44px] md:min-h-[36px] cursor-pointer ${
                    isActive
                      ? 'bg-apollo text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {formatCount(tab.count)}
                  </span>

                  {/* Micro Info Trigger Popover */}
                  <CategoryInfoTooltip
                    title={tab.label}
                    description={tab.description}
                    criteria={tab.criteria}
                    actionTip={tab.actionTip}
                    badge={tab.badge}
                    align={idx === 0 ? 'left' : idx === tabs.length - 1 ? 'right' : 'center'}
                    iconClassName={isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Dataset Summary Stat */}
        <div className="hidden lg:flex items-center text-xs text-slate-500 shrink-0 font-medium pl-2">
          <span>
            Total Cold Shippers:{' '}
            <strong className="text-slate-800 font-semibold font-mono">{totalFormatted}</strong>
          </span>
        </div>
      </div>

      {/* Active Segment Dynamic Context Banner */}
      <SegmentContextBanner
        title={currentTabMeta.label}
        count={formatCount(currentTabMeta.count)}
        description={currentTabMeta.description}
        criteria={currentTabMeta.criteria.join(' • ')}
        actionTip={currentTabMeta.actionTip}
        icon={currentTabMeta.icon}
        variant={
          currentTabMeta.id === 'high_revenue'
            ? 'emerald'
            : currentTabMeta.id === 'high_headcount'
            ? 'purple'
            : currentTabMeta.id === 'top_cargo_verticals'
            ? 'amber'
            : 'blue'
        }
        storageKey={`apollo_tab_${currentTabMeta.id}`}
      />
    </div>
  );
};
