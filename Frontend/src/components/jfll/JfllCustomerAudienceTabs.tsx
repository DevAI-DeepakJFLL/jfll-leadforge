import React from 'react';
import {
  Users,
  Briefcase,
  Network,
  Globe,
  PhoneCall,
  ShieldCheck,
  Database,
} from 'lucide-react';
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
    all: 728,
    shippers: 285,
    subagents: 389,
    overseas: 39,
    withContacts: 728,
  },
  totalFormatted = '728',
  className = '',
}) => {
  const tabs = [
    {
      id: 'all' as const,
      label: 'All Active Customers',
      count: counts.all,
      icon: Users,
      description: 'Complete master directory',
    },
    {
      id: 'subagents' as const,
      label: 'Subagents',
      count: counts.subagents,
      icon: Network,
      description: 'Freight booking partners',
    },
    {
      id: 'shippers' as const,
      label: 'Shippers & Consignees',
      count: counts.shippers,
      icon: Briefcase,
      description: 'Direct cargo owners',
    },
    {
      id: 'overseas' as const,
      label: 'Overseas Agents',
      count: counts.overseas,
      icon: Globe,
      description: 'International network',
    },
    {
      id: 'with-contacts' as const,
      label: 'Direct Contacts Ready',
      count: counts.withContacts,
      icon: PhoneCall,
      description: 'Direct phone & email',
    },
  ];

  return (
    <div
      className={`border-b border-surface-border bg-white select-none ${className}`}
      aria-label="Customer Master Directory"
    >
      {/* Top: Active Database Summary Banner */}
      <div className="py-2 sm:py-0 sm:h-11 px-3 sm:px-4 lg:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
        <div className="flex items-center gap-2 flex-wrap">
          <Database className="w-4 h-4 text-apollo shrink-0" />
          <span className="text-xs font-semibold text-slate-900 tracking-wide">
            Active Customer Database
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Verified Internal Master
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <span className="text-slate-400">Total Active:</span>
          <strong className="text-slate-900 font-semibold">{totalFormatted} Accounts</strong>
        </div>
      </div>

      {/* Bottom: Available Categories Row (Horizontal scroll strip to prevent truncation) */}
      <div className="px-3 sm:px-4 lg:px-6 py-2 bg-white">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`relative px-3 py-1.5 rounded-lg border text-left transition-all flex items-center gap-2 shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[40px] ${
                  isActive
                    ? 'bg-blue-50/70 border-apollo text-apollo font-semibold shadow-xs ring-1 ring-apollo/30'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={tab.description}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-apollo' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-medium">{tab.label}</span>
                <span
                  className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                    isActive
                      ? 'bg-apollo text-white font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
