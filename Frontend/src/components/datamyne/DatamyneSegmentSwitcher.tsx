import React from 'react';
import { DatamyneDatasetType } from '@/types/datamyneLead';
import { CheckCircle2, AlertCircle, Layers } from 'lucide-react';

export interface DatamyneSegmentSwitcherProps {
  activeDataset: DatamyneDatasetType;
  onChangeDataset: (dataset: DatamyneDatasetType) => void;
  validCount: number;
  missingCount: number;
  allCount: number;
}

export const DatamyneSegmentSwitcher: React.FC<DatamyneSegmentSwitcherProps> = ({
  activeDataset,
  onChangeDataset,
  validCount,
  missingCount,
  allCount,
}) => {
  const segments = [
    {
      id: 'valid' as DatamyneDatasetType,
      label: 'With Contacts',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      count: validCount,
      tooltip: 'Accounts with at least one phone number or email address on file',
    },
    {
      id: 'missing' as DatamyneDatasetType,
      label: 'Without Contacts',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      count: missingCount,
      tooltip: 'Accounts without direct phone or email on file (enrichment candidates)',
    },
    {
      id: 'all' as DatamyneDatasetType,
      label: 'All Leads',
      icon: Layers,
      iconColor: 'text-blue-500',
      count: allCount,
      tooltip: 'Unified directory across accounts with and without contacts',
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="DataMyne Dataset Selection"
      className="inline-flex p-1 bg-slate-100/80 border border-slate-200/90 rounded-xl shadow-2xs"
    >
      {segments.map((seg) => {
        const Icon = seg.icon;
        const isActive = activeDataset === seg.id;
        return (
          <button
            key={seg.id}
            role="tab"
            aria-selected={isActive}
            title={seg.tooltip}
            onClick={() => onChangeDataset(seg.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${seg.iconColor}`} />
            <span>{seg.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {seg.count > 0 ? seg.count.toLocaleString('en-US') : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
};
