import React from 'react';
import { Users, Briefcase, Network, Globe, PhoneCall } from 'lucide-react';
import { JfllAudienceCounts } from '@/types/jfllCustomer';

export interface JfllCustomerAudienceTabsProps {
  activeTab?: string;
  onTabChange?: (tab: 'all' | 'shippers' | 'subagents' | 'overseas' | 'with-contacts') => void;
  counts?: JfllAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

export const JfllCustomerAudienceTabs: React.FC<JfllCustomerAudienceTabsProps> = ({
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 881,
    shippers: 339,
    subagents: 474,
    overseas: 49,
    withContacts: 729,
  },
  totalFormatted = '881',
  className = '',
}) => {
  const tabs = [
    {
      id: 'all' as const,
      label: 'All Active Customers',
      count: counts.all,
      icon: Users,
    },
    {
      id: 'subagents' as const,
      label: 'Subagents',
      count: counts.subagents,
      icon: Network,
    },
    {
      id: 'shippers' as const,
      label: 'Shippers & Consignees',
      count: counts.shippers,
      icon: Briefcase,
    },
    {
      id: 'overseas' as const,
      label: 'Overseas Agents',
      count: counts.overseas,
      icon: Globe,
    },
    {
      id: 'with-contacts' as const,
      label: 'Direct Contacts Ready',
      count: counts.withContacts,
      icon: PhoneCall,
    },
  ];

  return (
    <div
      className={`h-11 border-b border-surface-border bg-white px-4 lg:px-6 flex items-center justify-between gap-4 select-none ${className}`}
      aria-label="Customer Audience Segments"
    >
      <div className="flex items-center space-x-1 sm:space-x-2 h-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative h-full px-3 flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none ${
                isActive
                  ? 'text-apollo font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-apollo' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-blue-50 text-apollo font-semibold border border-apollo/20'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count.toLocaleString()}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1 shrink-0">
        <span>Active Database:</span>
        <strong className="text-slate-800 font-semibold">{totalFormatted} Accounts</strong>
      </div>
    </div>
  );
};
