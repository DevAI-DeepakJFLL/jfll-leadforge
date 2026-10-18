import React from 'react';
import { ApolloAudienceTab, ApolloAudienceCounts } from '@/types/apolloLead';
import { Globe, Users, DollarSign, Sparkles, ShieldCheck } from 'lucide-react';

export interface ApolloAudienceTabsProps {
  activeTab?: ApolloAudienceTab;
  onTabChange?: (tab: ApolloAudienceTab) => void;
  counts?: ApolloAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

export const ApolloAudienceTabs: React.FC<ApolloAudienceTabsProps> = ({
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 690881,
    high_headcount: 85240,
    high_revenue: 124310,
    top_cargo_verticals: 148280,
    with_website_linkedin: 412950,
  },
  totalFormatted = '690.9k',
  className = '',
}) => {
  const tabs = [
    {
      id: 'all' as ApolloAudienceTab,
      label: 'All Commercial Shippers',
      count: counts.all,
      icon: Globe,
      description: 'Entire verified B2B freight leads database',
    },
    {
      id: 'high_headcount' as ApolloAudienceTab,
      label: 'Large Scale (100+ Staff)',
      count: counts.high_headcount,
      icon: Users,
      description: 'Mid-market & enterprise shippers with high volume',
    },
    {
      id: 'high_revenue' as ApolloAudienceTab,
      label: 'High Revenue ($10M+)',
      count: counts.high_revenue,
      icon: DollarSign,
      description: 'Financially established cargo accounts',
    },
    {
      id: 'top_cargo_verticals' as ApolloAudienceTab,
      label: 'Top Cargo Verticals',
      count: counts.top_cargo_verticals,
      icon: Sparkles,
      description: 'Automotive, Pharma, Food, High-Tech & Chemicals',
    },
    {
      id: 'with_website_linkedin' as ApolloAudienceTab,
      label: 'Executive Ready',
      count: counts.with_website_linkedin,
      icon: ShieldCheck,
      description: 'Verified Website & Corporate LinkedIn profile',
    },
  ];

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}m`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <div
      className={`border-b border-surface-border bg-white flex flex-col md:flex-row md:items-center md:justify-between px-3 sm:px-4 py-2 gap-2 select-none ${className}`}
      aria-label="Apollo Audience Navigation"
    >
      {/* Scrollable Audience Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-apollo/30 shrink-0 min-h-[44px] md:min-h-[36px] ${
                isActive
                  ? 'bg-apollo text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={tab.description}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`ml-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {formatCount(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dataset Summary Stat */}
      <div className="hidden lg:flex items-center text-xs text-slate-500 shrink-0 font-medium pl-2">
        <span>
          Total Verified Shippers:{' '}
          <strong className="text-slate-800 font-semibold font-mono">{totalFormatted}</strong>
        </span>
      </div>
    </div>
  );
};
