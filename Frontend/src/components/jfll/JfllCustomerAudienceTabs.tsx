import React from 'react';
import {
  Users,
  Briefcase,
  Network,
  Globe,
  PhoneCall,
  ShieldCheck,
  Archive,
  Layers,
  FileCheck,
} from 'lucide-react';
import { JfllAudienceCounts } from '@/types/jfllCustomer';

export type JfllCustomerTabType =
  | 'all'
  | 'shippers'
  | 'subagents'
  | 'overseas'
  | 'with-contacts'
  | 'datamyne-leads'
  | 'archive';

export interface JfllCustomerAudienceTabsProps {
  customerStatus?: 'active' | 'inactive';
  onChangeCustomerStatus?: (status: 'active' | 'inactive') => void;
  activeTab?: string;
  onTabChange?: (tab: JfllCustomerTabType) => void;
  counts?: JfllAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

export const JfllCustomerAudienceTabs: React.FC<JfllCustomerAudienceTabsProps> = ({
  customerStatus = 'active',
  onChangeCustomerStatus,
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 728,
    shippers: 285,
    subagents: 389,
    overseas: 39,
    withContacts: 728,
    datamyneLeads: 415,
    archive: 1595,
    activeTotal: 728,
    inactiveTotal: 2010,
  },
  totalFormatted = '728',
  className = '',
}) => {
  const isInactive = customerStatus === 'inactive';

  const activeTabs: {
    id: JfllCustomerTabType;
    label: string;
    count: number;
    icon: React.ElementType;
    description: string;
  }[] = [
    {
      id: 'all',
      label: 'All Active Customers',
      count: counts.all,
      icon: Users,
      description: 'Complete master directory of active accounts',
    },
    {
      id: 'subagents',
      label: 'Subagents',
      count: counts.subagents,
      icon: Network,
      description: 'Freight booking partners',
    },
    {
      id: 'shippers',
      label: 'Shippers & Consignees',
      count: counts.shippers,
      icon: Briefcase,
      description: 'Direct cargo owners',
    },
    {
      id: 'overseas',
      label: 'Overseas Agents',
      count: counts.overseas,
      icon: Globe,
      description: 'International network partners',
    },
    {
      id: 'with-contacts',
      label: 'Direct Contacts Ready',
      count: counts.withContacts,
      icon: PhoneCall,
      description: 'Verified direct phone & email',
    },
  ];

  const inactiveTabs: {
    id: JfllCustomerTabType;
    label: string;
    count: number;
    icon: React.ElementType;
    description: string;
  }[] = [
    {
      id: 'all',
      label: 'All Inactive Customers',
      count: counts.all,
      icon: Users,
      description: 'Inactive customers directory (purged of active accounts)',
    },
    {
      id: 'datamyne-leads',
      label: 'DataMyne Verified Leads',
      count: counts.datamyneLeads || 415,
      icon: Layers,
      description: 'Inactive accounts confirmed active in trade databases',
    },
    {
      id: 'with-contacts',
      label: 'Direct Contacts Ready',
      count: counts.withContacts || 2010,
      icon: PhoneCall,
      description: 'Accounts with phone or email on file',
    },
    {
      id: 'archive',
      label: 'Archived Accounts',
      count: counts.archive || 1595,
      icon: Archive,
      description: 'Legacy inactive accounts awaiting reactivation',
    },
  ];

  const tabs = isInactive ? inactiveTabs : activeTabs;

  return (
    <div
      className={`border-b border-surface-border bg-white select-none ${className}`}
      aria-label="Customer Master Directory"
    >
      {/* Top Banner: Active vs Inactive Customer Sub-Tab Switcher */}
      <div className="py-2.5 px-3 sm:px-4 lg:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-Tab Segment Switcher */}
          <div
            role="tablist"
            aria-label="Customer Status Switcher"
            className="inline-flex p-1 bg-slate-200/70 rounded-xl shadow-2xs border border-slate-200/80"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isInactive}
              onClick={() => onChangeCustomerStatus?.('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                !isInactive
                  ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Active Customer Data</span>
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  !isInactive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {(counts.activeTotal || 728).toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isInactive}
              onClick={() => onChangeCustomerStatus?.('inactive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                isInactive
                  ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Inactive Customers</span>
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isInactive
                    ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200/80'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {(counts.inactiveTotal || 2010).toLocaleString()}
              </span>
            </button>
          </div>

          {/* Context Badge */}
          {isInactive ? (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 shrink-0">
              <FileCheck className="w-3 h-3 text-amber-600" />
              Reactivation Prospects (Active Customers Purged)
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Internal Master
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <span className="text-slate-400">Total In View:</span>
          <strong className="text-slate-900 font-semibold">{totalFormatted} Accounts</strong>
        </div>
      </div>

      {/* Bottom Category Tabs Row (Horizontal scroll strip to prevent truncation) */}
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
                    ? isInactive
                      ? 'bg-amber-50/70 border-amber-500 text-amber-900 font-semibold shadow-xs ring-1 ring-amber-500/30'
                      : 'bg-blue-50/70 border-apollo text-apollo font-semibold shadow-xs ring-1 ring-apollo/30'
                    : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
                title={tab.description}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive
                      ? isInactive
                        ? 'text-amber-700'
                        : 'text-apollo'
                      : 'text-slate-400'
                  }`}
                />
                <span className="text-xs font-medium">{tab.label}</span>
                <span
                  className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                    isActive
                      ? isInactive
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-apollo text-white font-semibold'
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
