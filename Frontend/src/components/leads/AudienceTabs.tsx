import React from 'react';
import { AudienceTab, AudienceCounts } from '@/types/lead';
import { formatAudienceCount } from '@/utils/formatters';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';

export interface AudienceTabsProps {
  activeTab: AudienceTab;
  onTabChange: (tab: AudienceTab) => void;
  counts?: AudienceCounts;
  formattedCounts?: {
    all?: string;
    new?: string;
    saved?: string;
  };
  className?: string;
  rightContent?: React.ReactNode;
}

export { formatAudienceCount };

interface PeopleTabDefinition {
  id: AudienceTab;
  label: string;
  count: string;
  description: string;
  criteria: string[];
  actionTip: string;
  badge: {
    text: string;
    variant: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
  };
}

export const AudienceTabs: React.FC<AudienceTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  formattedCounts,
  className = '',
  rightContent,
}) => {
  const allCountStr =
    formattedCounts?.all ||
    (counts?.all !== undefined ? formatAudienceCount(counts.all, '2.5m') : '2.5m');

  const newCountStr =
    formattedCounts?.new ||
    (counts?.new !== undefined ? formatAudienceCount(counts.new, '1.48m') : '1.48m');

  const savedCountStr =
    formattedCounts?.saved ||
    (counts?.saved !== undefined ? formatAudienceCount(counts.saved, '48.4k') : '48.4k');

  const tabs: PeopleTabDefinition[] = [
    {
      id: 'all',
      label: 'All People',
      count: allCountStr,
      description: 'Comprehensive directory of verified supply chain, logistics, and executive decision-makers.',
      criteria: [
        'Verified business email and job title on file',
        'Includes freight forwarders, shippers, and corporate leaders',
        'Direct link to parent organization profile',
      ],
      actionTip: 'Use logistics filter toggle to isolate heads of supply chain and shipping managers.',
      badge: { text: 'All Decision Makers', variant: 'blue' },
    },
    {
      id: 'new',
      label: 'New People',
      count: newCountStr,
      description: 'Decision-makers that have not yet been contacted, saved, or enrolled into outreach cadences.',
      criteria: [
        'Uncontacted prospect record',
        'Fresh lead for new email sequences or direct calling',
        'No prior contact history in current workspace',
      ],
      actionTip: 'Select candidates and click "Export" or enroll into automated email cadences.',
      badge: { text: 'Fresh Prospects', variant: 'emerald' },
    },
    {
      id: 'saved',
      label: 'Saved People',
      count: savedCountStr,
      description: 'Bookmarked or shortlisted decision-makers marked by sales reps for targeted high-priority outreach.',
      criteria: [
        'Shortlisted by sales rep for active follow-up',
        'High-priority VIP contacts tagged for custom pitch',
        'Saved to personal working pipeline',
      ],
      actionTip: 'Focus your daily call block here: conduct personalized multi-touch follow-up.',
      badge: { text: 'Shortlist', variant: 'purple' },
    },
  ];

  return (
    <div
      className={`h-11 px-3 sm:px-4 bg-white border-b border-surface-border flex items-center justify-between gap-2 shrink-0 select-none ${className}`}
      aria-label="Audience Segment Tabs"
    >
      <div className="flex items-center space-x-1 sm:space-x-2 h-full overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0">
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative h-full px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none shrink-0 whitespace-nowrap min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'text-apollo font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] sm:text-xs ${
                    isActive ? 'text-apollo/70 font-medium' : 'text-slate-400 font-normal'
                  }`}
                >
                  ({tab.count})
                </span>

                {/* Micro Info Trigger Popover */}
                <CategoryInfoTooltip
                  title={tab.label}
                  description={tab.description}
                  criteria={tab.criteria}
                  actionTip={tab.actionTip}
                  badge={tab.badge}
                  align={idx === 0 ? 'left' : idx === tabs.length - 1 ? 'right' : 'center'}
                  iconClassName={isActive ? 'text-apollo hover:text-apollo-hover' : 'text-slate-400 hover:text-slate-600'}
                />

                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {rightContent && (
        <div className="hidden sm:flex items-center text-xs text-slate-500 font-medium shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
};

export default AudienceTabs;
