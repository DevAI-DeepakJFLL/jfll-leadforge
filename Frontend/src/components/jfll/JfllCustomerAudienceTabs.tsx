import React from 'react';
import { JfllCustomerTabType, JfllCustomerAudienceCounts } from '@/types/jfllCustomer';
import {
  Users,
  Briefcase,
  Network,
  Globe,
  PhoneCall,
  Layers,
  Archive,
  FileCheck,
} from 'lucide-react';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';

export interface JfllCustomerAudienceTabsProps {
  customerStatus: 'active' | 'inactive' | 'all';
  onChangeCustomerStatus?: (status: 'active' | 'inactive' | 'all') => void;
  activeTab?: JfllCustomerTabType;
  onTabChange?: (tab: JfllCustomerTabType) => void;
  counts?: JfllCustomerAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

interface TabDefinition {
  id: JfllCustomerTabType;
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

export const JfllCustomerAudienceTabs: React.FC<JfllCustomerAudienceTabsProps> = ({
  customerStatus = 'active',
  onChangeCustomerStatus,
  activeTab = 'all',
  onTabChange,
  counts = {
    all: 728,
    shippers: 285,
    subagents: 397,
    overseas: 39,
    withContacts: 728,
    datamyneLeads: 415,
    archive: 1595,
    activeTotal: 728,
    inactiveTotal: 2010,
    allTotal: 2738,
  },
  totalFormatted = '728',
  className = '',
}) => {
  const isAll = customerStatus === 'all';
  const isInactive = customerStatus === 'inactive';
  const isActive = customerStatus === 'active';

  const allTabs: TabDefinition[] = [
    {
      id: 'all',
      label: 'All Customers',
      count: counts.all,
      icon: Users,
      description: 'Unified master directory combining all 2,738 active and inactive accounts across all Jet Freight branches.',
      criteria: [
        'Consolidated directory of 728 active ERP clients and 2,010 former/inactive accounts',
        'Complete view across all branch territories and business lines',
        'Includes status markers to distinguish active clients from reactivation candidates',
      ],
      actionTip: 'Master view: toggle filters by status, branch territory, customer group, or customs activity.',
      badge: { text: 'Unified Master', variant: 'blue' },
    },
    {
      id: 'shippers',
      label: 'Shippers & Consignees',
      count: counts.shippers,
      icon: Briefcase,
      description: 'Direct cargo owners, commercial manufacturers, and B2B traders contracting freight directly with Jet Freight.',
      criteria: [
        'Customer Group is classified as Shipper / Consignee',
        'Direct commercial cargo shippers',
        'Primary source of high-yield contract cargo',
      ],
      actionTip: 'Priority enterprise accounts: maintain high service level and cross-sell air/ocean lanes.',
      badge: { text: 'Direct Cargo', variant: 'blue' },
    },
    {
      id: 'subagents',
      label: 'Subagents',
      count: counts.subagents,
      icon: Network,
      description: 'Domestic freight booking partners, local cargo agents, and sub-brokers utilizing Jet Freight wholesale capacity.',
      criteria: [
        'Customer Group is classified as Subagent',
        'Books cargo through JFLL airline/shipping line contracts',
        'Repeat capacity buyers and wholesale partners',
      ],
      actionTip: 'Focus on capacity utilization, spot-rate competitiveness, and airline allocations.',
      badge: { text: 'Wholesale Partners', variant: 'purple' },
    },
    {
      id: 'overseas',
      label: 'Overseas Agents',
      count: counts.overseas,
      icon: Globe,
      description: 'International freight forwarding partners routing inbound/outbound DAP/DDP shipments into India.',
      criteria: [
        'Customer Group is classified as Overseas Agent',
        'Global freight network partner',
        'Cross-border origin/destination partner handling',
      ],
      actionTip: 'Expand mutual routing agreements and reciprocal cargo opportunities.',
      badge: { text: 'Global Network', variant: 'blue' },
    },
    {
      id: 'datamyne-leads',
      label: 'DataMyne Verified',
      count: counts.datamyneLeads || 415,
      icon: Layers,
      description: 'Accounts confirmed to still be actively shipping air/ocean cargo in Indian customs records.',
      criteria: [
        'in_datamyne = true (matched live Indian customs bills of lading)',
        'Active international freight transactions confirmed',
        'Verified trade lanes and HS codes available',
      ],
      actionTip: 'High-intent reactivation targets! Reach out referencing their current trade lanes and shipment volume.',
      badge: { text: 'Hot Reactivation', variant: 'emerald' },
    },
    {
      id: 'with-contacts',
      label: 'Direct Contacts Ready',
      count: counts.withContacts,
      icon: PhoneCall,
      description: 'Accounts with at least one verified direct phone number, email address, or key contact person on file.',
      criteria: [
        'Direct phone number or mobile verified',
        'Operational email address available',
        'Contact person name documented',
      ],
      actionTip: 'Ideal for operational communication, billing notices, and schedule updates.',
      badge: { text: 'Ready to Reach', variant: 'emerald' },
    },
    {
      id: 'archive',
      label: 'Archived Accounts',
      count: counts.archive || 1595,
      icon: Archive,
      description: 'Legacy inactive accounts that do NOT appear in current customs shipment databases (in_datamyne = false).',
      criteria: [
        'Status is Not Active and in_datamyne = false',
        'Account is dormant, ceased trading, or changed legal IEC',
        'Preserved for relationship history without pipeline clutter',
      ],
      actionTip: 'Preserved for historical lookups. Focus sales outreach on DataMyne Verified accounts.',
      badge: { text: 'Historical Record', variant: 'amber' },
    },
  ];

  const activeTabs: TabDefinition[] = [
    {
      id: 'all',
      label: 'All Active Customers',
      count: counts.all,
      icon: Users,
      description: 'Master list of all 728 active revenue-generating accounts across all Jet Freight branch territories.',
      criteria: [
        'Confirmed active paying customer in JFLL ERP',
        'Valid commercial credit or active booking status',
        'Assigned to branch sales and operations teams',
      ],
      actionTip: 'Protected accounts: excluded from all cold prospecting pipelines.',
      badge: { text: 'Paying Clients', variant: 'emerald' },
    },
    {
      id: 'shippers',
      label: 'Shippers & Consignees',
      count: counts.shippers,
      icon: Briefcase,
      description: 'Direct cargo owners, commercial manufacturers, and B2B traders contracting freight directly with Jet Freight.',
      criteria: [
        'Customer Group is classified as Shipper / Consignee',
        'Direct commercial cargo shippers',
        'Primary source of high-yield contract cargo',
      ],
      actionTip: 'Priority enterprise accounts: maintain high service level and cross-sell air/ocean lanes.',
      badge: { text: 'Direct Cargo', variant: 'blue' },
    },
    {
      id: 'subagents',
      label: 'Subagents',
      count: counts.subagents,
      icon: Network,
      description: 'Domestic freight booking partners, local cargo agents, and sub-brokers utilizing Jet Freight wholesale capacity.',
      criteria: [
        'Customer Group is classified as Subagent',
        'Books cargo through JFLL airline/shipping line contracts',
        'Repeat capacity buyers and wholesale partners',
      ],
      actionTip: 'Focus on capacity utilization, spot-rate competitiveness, and airline allocations.',
      badge: { text: 'Wholesale Partners', variant: 'purple' },
    },
    {
      id: 'overseas',
      label: 'Overseas Agents',
      count: counts.overseas,
      icon: Globe,
      description: 'International freight forwarding partners routing inbound/outbound DAP/DDP shipments into India.',
      criteria: [
        'Customer Group is classified as Overseas Agent',
        'Global freight network partner',
        'Cross-border origin/destination partner handling',
      ],
      actionTip: 'Expand mutual routing agreements and reciprocal cargo opportunities.',
      badge: { text: 'Global Network', variant: 'blue' },
    },
    {
      id: 'with-contacts',
      label: 'Direct Contacts Ready',
      count: counts.withContacts,
      icon: PhoneCall,
      description: 'Active customer accounts with verified direct mobile numbers, operational emails, or assigned contact persons.',
      criteria: [
        'Direct phone number or mobile verified',
        'Operational email address available',
        'Contact person name documented',
      ],
      actionTip: 'Ideal for operational communication, billing notices, and schedule updates.',
      badge: { text: 'Ready to Reach', variant: 'emerald' },
    },
  ];

  const inactiveTabs: TabDefinition[] = [
    {
      id: 'all',
      label: 'All Inactive Customers',
      count: counts.all,
      icon: Users,
      description: 'Complete directory of 2,010 former Jet Freight clients, 100% sanitized of active accounts.',
      criteria: [
        'Former client with no active bookings in recent periods',
        'Purged of all 728 active customers',
        'Includes both customs-active shippers and archived records',
      ],
      actionTip: 'Use as a master directory to look up past branch relationships and former client history.',
      badge: { text: 'Sanitized Master', variant: 'slate' },
    },
    {
      id: 'datamyne-leads',
      label: 'DataMyne Verified Leads',
      count: counts.datamyneLeads || 415,
      icon: Layers,
      description: 'Former clients confirmed to still be actively shipping air/ocean cargo in Indian customs records.',
      criteria: [
        'in_datamyne = true (matched live Indian customs bills of lading)',
        'Active international freight transactions confirmed',
        'Verified trade lanes and HS codes available',
      ],
      actionTip: 'High-intent reactivation targets! Reach out referencing their current trade lanes and shipment volume.',
      badge: { text: 'Hot Reactivation', variant: 'emerald' },
    },
    {
      id: 'with-contacts',
      label: 'Direct Contacts Ready',
      count: counts.withContacts || 2010,
      icon: PhoneCall,
      description: 'Inactive accounts with at least one verified phone number, email address, or key contact person on file.',
      criteria: [
        'Phone number, email, or key contact person exists',
        'Ready for phone outreach or email cadences',
        'Maintains historical point-of-contact details',
      ],
      actionTip: 'Prioritize accounts that overlap with DataMyne for immediate phone calls.',
      badge: { text: 'Outreach Ready', variant: 'blue' },
    },
    {
      id: 'archive',
      label: 'Archived Accounts',
      count: counts.archive || 1595,
      icon: Archive,
      description: 'Legacy inactive accounts that do NOT appear in current customs shipment databases (in_datamyne = false).',
      criteria: [
        'in_datamyne = false (no recent customs export/import activity)',
        'Account is dormant, ceased trading, or changed legal IEC',
        'Preserved for relationship history without pipeline clutter',
      ],
      actionTip: 'Preserved for historical lookups. Do not run cold outreach campaigns here; focus on DataMyne Verified Leads.',
      badge: { text: 'Historical Record', variant: 'amber' },
    },
  ];

  const tabs = isAll ? allTabs : isInactive ? inactiveTabs : activeTabs;

  return (
    <div
      className={`border-b border-surface-border bg-white select-none ${className}`}
      aria-label="Customer Master Directory"
    >
      {/* Top Banner: Active vs Inactive vs All Customer Sub-Tab Switcher */}
      <div className="py-2.5 px-3 sm:px-4 lg:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-Tab Segment Switcher */}
          <div
            role="tablist"
            aria-label="Customer Status Switcher"
            className="inline-flex p-1 bg-slate-200/70 rounded-xl shadow-2xs border border-slate-200/80"
          >
            <button
              role="tab"
              aria-selected={isActive}
              onClick={() => onChangeCustomerStatus?.('active')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <CategoryInfoTooltip
                title="Active JFLL Customers"
                description="Verified accounts that have booked freight services or completed shipments with Jet Freight within the last 3 months."
                badge={{ text: 'Recent Business (90 Days)', variant: 'emerald' }}
                criteria={[
                  'Generated active freight bookings or shipments within the last 90 days',
                  'Valid commercial IEC and verified corporate billing account on file',
                  'Actively managed by Jet Freight key accounts team',
                ]}
                actionTip="Strictly excluded from cold outreach. Direct inquiries through the assigned Key Account Manager."
                align="left"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </CategoryInfoTooltip>
              <span>Active Customers</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {(counts.activeTotal || 728).toLocaleString()}
              </span>
              <CategoryInfoTooltip
                title="Active JFLL Customers"
                description="Verified accounts that have booked freight services or completed shipments with Jet Freight within the last 3 months."
                badge={{ text: 'Recent Business (90 Days)', variant: 'emerald' }}
                criteria={[
                  'Generated active freight bookings or shipments within the last 90 days',
                  'Valid commercial IEC and verified corporate billing account on file',
                  'Actively managed by Jet Freight key accounts team',
                ]}
                actionTip="Strictly excluded from cold outreach. Direct inquiries through the assigned Key Account Manager."
                align="left"
                iconClassName={isActive ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-600'}
              />
            </button>

            <button
              role="tab"
              aria-selected={isInactive}
              onClick={() => onChangeCustomerStatus?.('inactive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                isInactive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <CategoryInfoTooltip
                title="Inactive JFLL Customers"
                description="Historical accounts with no recorded freight bookings or shipping transactions with Jet Freight in the last 3 months."
                badge={{ text: 'Dormant (>90 Days)', variant: 'amber' }}
                criteria={[
                  'No active shipments or freight bills generated in the last 90 days',
                  'Prior commercial customer with established credit and trading history',
                  'Identified for sales reactivation, lane audits, and win-back outreach',
                ]}
                actionTip="Prime prospects for reactivation campaigns. Pitch updated airline rates, sea freight spot tariffs, and new trade lane schedules."
                align="left"
              >
                <Archive className={`w-3.5 h-3.5 shrink-0 ${isInactive ? 'text-white' : 'text-amber-600'}`} />
              </CategoryInfoTooltip>
              <span>Inactive Customers</span>
              <span
                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full ${
                  isInactive
                    ? 'bg-amber-700 text-amber-50'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {(counts.inactiveTotal || 2010).toLocaleString()}
              </span>
              <CategoryInfoTooltip
                title="Inactive JFLL Customers"
                description="Historical accounts with no recorded freight bookings or shipping transactions with Jet Freight in the last 3 months."
                badge={{ text: 'Dormant (>90 Days)', variant: 'amber' }}
                criteria={[
                  'No active shipments or freight bills generated in the last 90 days',
                  'Prior commercial customer with established credit and trading history',
                  'Identified for sales reactivation, lane audits, and win-back outreach',
                ]}
                actionTip="Prime prospects for reactivation campaigns. Pitch updated airline rates, sea freight spot tariffs, and new trade lane schedules."
                align="left"
                iconClassName={isInactive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
              />
            </button>

            <button
              role="tab"
              aria-selected={isAll}
              onClick={() => onChangeCustomerStatus?.('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                isAll
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <CategoryInfoTooltip
                title="All JFLL Customers"
                description="Complete internal master customer directory containing both active accounts (last 3 months) and dormant accounts."
                badge={{ text: 'Unified Master', variant: 'blue' }}
                criteria={[
                  'Unified repository of 728 active and 2,010 inactive customer accounts',
                  'Includes direct shippers, consignees, subagents, and overseas partners',
                  '100% synchronized with internal Jet Freight ERP records',
                ]}
                actionTip="Use for company-wide customer lookups, deduplication, and verifying historical business relationships."
                align="left"
              >
                <Layers className={`w-3.5 h-3.5 shrink-0 ${isAll ? 'text-white' : 'text-blue-600'}`} />
              </CategoryInfoTooltip>
              <span>All Customers</span>
              <span
                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full ${
                  isAll
                    ? 'bg-blue-700 text-blue-50'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {(counts.allTotal || 2738).toLocaleString()}
              </span>
              <CategoryInfoTooltip
                title="All JFLL Customers"
                description="Complete internal master customer directory containing both active accounts (last 3 months) and dormant accounts."
                badge={{ text: 'Unified Master', variant: 'blue' }}
                criteria={[
                  'Unified repository of 728 active and 2,010 inactive customer accounts',
                  'Includes direct shippers, consignees, subagents, and overseas partners',
                  '100% synchronized with internal Jet Freight ERP records',
                ]}
                actionTip="Use for company-wide customer lookups, deduplication, and verifying historical business relationships."
                align="left"
                iconClassName={isAll ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'}
              />
            </button>
          </div>

          {/* Context Badge */}
          {isAll ? (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80 shrink-0">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Unified Master Directory (All 2,738 Accounts)
            </span>
          ) : isInactive ? (
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
      <div className="px-3 sm:px-4 lg:px-6 py-2 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0">
          {tabs.map((tab) => {
            const isActiveTab = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="relative shrink-0 flex items-center">
                <button
                  onClick={() => onTabChange?.(tab.id)}
                  className={`relative px-3 py-1.5 rounded-lg border text-left transition-all flex items-center gap-2 shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[40px] cursor-pointer ${
                    isActiveTab
                      ? isInactive
                        ? 'bg-amber-50/70 border-amber-500 text-amber-900 font-semibold shadow-xs ring-1 ring-amber-500/30'
                        : isAll
                        ? 'bg-blue-50/70 border-blue-600 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-600/30'
                        : 'bg-blue-50/70 border-apollo text-apollo font-semibold shadow-xs ring-1 ring-apollo/30'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  aria-current={isActiveTab ? 'page' : undefined}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActiveTab
                        ? isInactive
                          ? 'text-amber-700'
                          : isAll
                          ? 'text-blue-700'
                          : 'text-apollo'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-medium">{tab.label}</span>
                  <span
                    className={`text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                      isActiveTab
                        ? isInactive
                          ? 'bg-amber-600 text-white font-semibold'
                          : isAll
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-apollo text-white font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
