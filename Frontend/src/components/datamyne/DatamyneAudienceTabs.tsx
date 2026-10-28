import React from 'react';
import {
  DatamyneDatasetType,
  DatamyneAudienceTab,
  DatamyneAudienceCounts,
} from '@/types/datamyneLead';
import { DatamyneSegmentSwitcher } from './DatamyneSegmentSwitcher';
import {
  Globe,
  Leaf,
  Pill,
  Shirt,
  Wrench,
  FlaskConical,
  Cpu,
  Car,
  Package,
} from 'lucide-react';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';

export interface DatamyneAudienceTabsProps {
  activeTab?: DatamyneAudienceTab;
  onTabChange?: (tab: DatamyneAudienceTab) => void;
  activeDataset: DatamyneDatasetType;
  onChangeDataset: (dataset: DatamyneDatasetType) => void;
  counts?: DatamyneAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

interface DatamyneTabDefinition {
  id: DatamyneAudienceTab;
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

export const DatamyneAudienceTabs: React.FC<DatamyneAudienceTabsProps> = ({
  activeTab = 'all',
  onTabChange,
  activeDataset,
  onChangeDataset,
  counts = {
    all: 19760,
    perishables: 2352,
    pharma: 1800,
    textiles: 4026,
    engineering: 4559,
    chemicals: 1533,
    electronics: 1571,
    automotive: 370,
    general: 3581,
    validTotal: 19760,
    missingTotal: 17513,
  },
  totalFormatted = '19,760',
  className = '',
}) => {
  const tabs: DatamyneTabDefinition[] = [
    {
      id: 'all',
      label: 'All Verticals',
      count: counts.all,
      icon: Globe,
      description: 'Unified customs trade directory across all classified industrial cargo sectors.',
      criteria: [
        'Verified cross-border customs shipping bills',
        'Air and ocean freight consignments documented',
        'Includes export and import customs trade lanes',
      ],
      actionTip: 'Broad overview: use secondary filters (transport mode, trade lanes, shipments count) to refine target list.',
      badge: { text: 'All Industries', variant: 'blue' },
    },
    {
      id: 'perishables',
      label: 'Perishables',
      count: counts.perishables,
      icon: Leaf,
      description: 'Time-critical cold-chain cargo: fresh fruits, vegetables, seafood, meat, and floriculture.',
      criteria: [
        'HS Codes: Chapter 01 to 24 (Edible & Agricultural products)',
        'Requires temperature-controlled reefer containers or fast-transit cold room air freight',
        'Strict freshness shelf-life constraints',
      ],
      actionTip: 'Highlight Jet Freight specialized perishable handling, airport cool-chain hubs, and rapid customs clearance.',
      badge: { text: 'Cold Chain', variant: 'emerald' },
    },
    {
      id: 'pharma',
      label: 'Pharma & Health',
      count: counts.pharma,
      icon: Pill,
      description: 'High-yield life sciences cargo: finished formulations, active pharmaceutical ingredients (APIs), and medical instruments.',
      criteria: [
        'HS Codes: Chapter 30 (Pharmaceuticals) & Chapter 90 (Medical devices)',
        'Requires GDP compliance and continuous temperature data logging (+15°C to +25°C, +2°C to +8°C)',
        'High value per kilogram and premium air cargo rates',
      ],
      actionTip: 'Pitch certified cold-chain packaging, Envirotainer partnerships, and specialized pharma corridors.',
      badge: { text: 'High Yield', variant: 'emerald' },
    },
    {
      id: 'textiles',
      label: 'Textiles & Apparel',
      count: counts.textiles,
      icon: Shirt,
      description: 'High-volume fashion goods: readymade garments (RMG), cotton fabrics, yarns, home textiles, and accessories.',
      criteria: [
        'HS Codes: Chapter 50 to 63 (Textiles, Garments, Apparel)',
        'Subject to seasonal retail delivery windows and fast-fashion turnarounds',
        'High ocean FCL container volume with urgent airfreight surges',
      ],
      actionTip: 'Propose blended sea-air logistics solutions and priority peak-season air freight allocations.',
      badge: { text: 'High Volume', variant: 'purple' },
    },
    {
      id: 'engineering',
      label: 'Engineering & Mach',
      count: counts.engineering,
      icon: Wrench,
      description: 'Industrial machinery, boilers, electrical equipment, machine tools, and fabricated industrial components.',
      criteria: [
        'HS Codes: Chapter 84 & 85 (Machinery, Mechanical appliances)',
        'Heavy-lift, out-of-gauge (OOG), and breakbulk ocean freight requirements',
        'Critical spare parts shipped via urgent air express',
      ],
      actionTip: 'Showcase Jet Freight project cargo capabilities, flat-rack/open-top container handling, and port-side operations.',
      badge: { text: 'Project Cargo', variant: 'blue' },
    },
    {
      id: 'chemicals',
      label: 'Chemicals & APIs',
      count: counts.chemicals,
      icon: FlaskConical,
      description: 'Specialty chemicals, organic compounds, dyes, polymers, and raw bulk pharmaceutical chemicals.',
      criteria: [
        'HS Codes: Chapter 28 & 29 (Inorganic/Organic chemicals)',
        'Requires Dangerous Goods (DGR / IMO) compliance and certified packing',
        'Specialized ISO tank containers and hazardous cargo air approval',
      ],
      actionTip: 'Emphasize certified IATA DGR personnel and dangerous goods documentation expertise.',
      badge: { text: 'Specialized DGR', variant: 'amber' },
    },
    {
      id: 'electronics',
      label: 'Electronics & High-Tech',
      count: counts.electronics,
      icon: Cpu,
      description: 'High-value tech freight: consumer electronics, telecom gear, printed circuit boards (PCBs), and semiconductors.',
      criteria: [
        'HS Codes: Chapter 85 (Electronics & High-tech hardware)',
        'High susceptibility to pilferage and damage; requires tamper-evident security',
        'Time-sensitive air transit from Asian tech manufacturing hubs',
      ],
      actionTip: 'Highlight secured bonded trucking, high-value cargo escorts, and GPS tracking.',
      badge: { text: 'High Value', variant: 'purple' },
    },
    {
      id: 'automotive',
      label: 'Automotive & EV',
      count: counts.automotive,
      icon: Car,
      description: 'Automotive components, electric vehicle powertrains, two-wheeler assemblies, and replacement parts.',
      criteria: [
        'HS Codes: Chapter 87 (Vehicles and automotive parts)',
        'Just-In-Time (JIT) production delivery schedules with strict penalty clauses',
        'Mixed air freight (urgent assembly line stoppage parts) and regular ocean container flows',
      ],
      actionTip: 'Offer dedicated JIT emergency air charters and consolidated sea-freight schedules for Tier-1 suppliers.',
      badge: { text: 'JIT Supply Chain', variant: 'blue' },
    },
    {
      id: 'general',
      label: 'General Cargo',
      count: counts.general,
      icon: Package,
      description: 'Diversified trade commodities: plastics, packaging materials, paper, hardware, and assorted manufactured dry goods.',
      criteria: [
        'Assorted consumer and commercial dry goods',
        'Standard ocean FCL/LCL container shipping',
        'Price-sensitive cargo with consistent regular sailings',
      ],
      actionTip: 'Compete on ocean freight freight forwarding rates, free time at destination, and multi-carrier booking options.',
      badge: { text: 'Dry Freight', variant: 'slate' },
    },
  ];

  return (
    <div
      className={`border-b border-surface-border bg-white select-none ${className}`}
      aria-label="DataMyne Logistics Leads Directory"
    >
      {/* Top Banner: Dataset Switcher + Overall Total Count */}
      <div className="py-2.5 px-3 sm:px-4 lg:px-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-3 flex-wrap">
          <DatamyneSegmentSwitcher
            activeDataset={activeDataset}
            onChangeDataset={onChangeDataset}
            validCount={counts.validTotal}
            missingCount={counts.missingTotal}
            allCount={counts.validTotal + counts.missingTotal}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="text-slate-400">Current Scope:</span>
          <strong className="text-slate-900 font-semibold">{totalFormatted} Companies</strong>
        </div>
      </div>

      {/* Bottom: Logistics Verticals Strip (Horizontal scrollable to prevent wrapping/overflow) */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 bg-white border-b border-slate-200/80">
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0 py-1">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="relative shrink-0 flex items-center">
                <button
                  onClick={() => onTabChange?.(tab.id)}
                  className={`relative px-3.5 py-2 rounded-xl border text-left transition-all flex items-center gap-2.5 shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[42px] cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/70 border-apollo text-apollo font-semibold shadow-xs ring-1 ring-apollo/30'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <CategoryInfoTooltip
                    title={tab.label}
                    description={tab.description}
                    criteria={tab.criteria}
                    actionTip={tab.actionTip}
                    badge={tab.badge}
                    align={idx === 0 ? 'left' : idx === tabs.length - 1 ? 'right' : 'center'}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-apollo' : 'text-slate-400'
                      }`}
                    />
                  </CategoryInfoTooltip>
                  <span className="text-xs font-medium">{tab.label}</span>
                  <span
                    className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
                      isActive
                        ? 'bg-apollo text-white font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {tab.count > 0 ? tab.count.toLocaleString() : '—'}
                  </span>

                  {/* Micro Info Trigger Popover */}
                  <CategoryInfoTooltip
                    title={tab.label}
                    description={tab.description}
                    criteria={tab.criteria}
                    actionTip={tab.actionTip}
                    badge={tab.badge}
                    align={idx === 0 ? 'left' : idx === tabs.length - 1 ? 'right' : 'center'}
                    iconClassName={isActive ? 'text-blue-500 hover:text-blue-700' : 'text-slate-400 hover:text-slate-600'}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
