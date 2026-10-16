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

export interface DatamyneAudienceTabsProps {
  activeTab?: DatamyneAudienceTab;
  onTabChange?: (tab: DatamyneAudienceTab) => void;
  activeDataset: DatamyneDatasetType;
  onChangeDataset: (dataset: DatamyneDatasetType) => void;
  counts?: DatamyneAudienceCounts;
  totalFormatted?: string;
  className?: string;
}

export const DatamyneAudienceTabs: React.FC<DatamyneAudienceTabsProps> = ({
  activeTab = 'all',
  onTabChange,
  activeDataset,
  onChangeDataset,
  counts = {
    all: 16899,
    perishables: 2260,
    pharma: 1529,
    textiles: 3554,
    engineering: 3946,
    chemicals: 1450,
    electronics: 1303,
    automotive: 295,
    general: 2562,
    validTotal: 16899,
    missingTotal: 17791,
  },
  totalFormatted = '16,899',
  className = '',
}) => {
  const tabs = [
    {
      id: 'all' as DatamyneAudienceTab,
      label: 'All Verticals',
      count: counts.all,
      icon: Globe,
      description: 'All classified logistics industries',
    },
    {
      id: 'perishables' as DatamyneAudienceTab,
      label: 'Perishables',
      count: counts.perishables,
      icon: Leaf,
      description: 'Cold chain, fresh produce, seafood & floriculture',
    },
    {
      id: 'pharma' as DatamyneAudienceTab,
      label: 'Pharma & Health',
      count: counts.pharma,
      icon: Pill,
      description: 'Finished formulations & medical instruments',
    },
    {
      id: 'textiles' as DatamyneAudienceTab,
      label: 'Textiles & Apparel',
      count: counts.textiles,
      icon: Shirt,
      description: 'Fabrics, synthetic yarns, RMG & garments',
    },
    {
      id: 'engineering' as DatamyneAudienceTab,
      label: 'Engineering & Mach',
      count: counts.engineering,
      icon: Wrench,
      description: 'Industrial machinery, boilers, valves & hardware',
    },
    {
      id: 'chemicals' as DatamyneAudienceTab,
      label: 'Chemicals & APIs',
      count: counts.chemicals,
      icon: FlaskConical,
      description: 'Organic chemicals, APIs & specialty materials',
    },
    {
      id: 'electronics' as DatamyneAudienceTab,
      label: 'Electronics & High-Tech',
      count: counts.electronics,
      icon: Cpu,
      description: 'Electrical equipment, switchgear & tech parts',
    },
    {
      id: 'automotive' as DatamyneAudienceTab,
      label: 'Automotive & EV',
      count: counts.automotive,
      icon: Car,
      description: 'EV 2-wheelers, chassis & automotive components',
    },
    {
      id: 'general' as DatamyneAudienceTab,
      label: 'General Cargo',
      count: counts.general,
      icon: Package,
      description: 'Plastics, packaging, paper & dry freight',
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
      <div className="px-3 sm:px-4 lg:px-6 py-2 bg-white">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`relative px-3 py-1.5 rounded-lg border text-left transition-all flex items-center gap-2 shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-apollo/20 min-h-[38px] cursor-pointer ${
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
                  {tab.count > 0 ? tab.count.toLocaleString() : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
