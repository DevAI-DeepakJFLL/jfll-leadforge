import React from 'react';
import { AudienceTab, AudienceCounts } from '@/types/lead';

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

export function formatAudienceCount(count?: number, fallback = '0'): string {
  if (count === undefined || count === null) return fallback;
  if (count >= 1000000) {
    const val = count / 1000000;
    return val % 1 === 0 ? `${val}m` : `${val.toFixed(2).replace(/\.?0+$/, '')}m`;
  }
  if (count >= 10000) {
    const val = count / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1).replace(/\.?0+$/, '')}k`;
  }
  return count.toLocaleString();
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

  const tabs: { id: AudienceTab; label: string; count: string }[] = [
    { id: 'all', label: 'All People', count: allCountStr },
    { id: 'new', label: 'New People', count: newCountStr },
    { id: 'saved', label: 'Saved People', count: savedCountStr },
  ];

  return (
    <div
      className={`h-11 px-4 bg-white border-b border-surface-border flex items-center justify-between shrink-0 select-none ${className}`}
      aria-label="Audience Segment Tabs"
    >
      <div className="flex items-center space-x-1 sm:space-x-3 h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative h-full px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 focus:outline-none ${
                isActive
                  ? 'text-apollo font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{tab.label}</span>
              <span className={`text-xs ${isActive ? 'text-apollo/70 font-medium' : 'text-slate-400 font-normal'}`}>
                ({tab.count})
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>

      {rightContent && (
        <div className="flex items-center text-xs text-slate-500 font-medium">
          {rightContent}
        </div>
      )}
    </div>
  );
};

export default AudienceTabs;
