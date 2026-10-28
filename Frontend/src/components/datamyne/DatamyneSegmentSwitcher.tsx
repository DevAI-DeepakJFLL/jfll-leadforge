import React from 'react';
import { DatamyneDatasetType } from '@/types/datamyneLead';
import { CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { CategoryInfoTooltip } from '@/components/ui/CategoryInfoTooltip';

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
      description: 'Active international shippers confirmed in customs records with at least one verified direct phone number, email address, or office address.',
      criteria: [
        'Confirmed bill of lading / shipping bill transactions',
        'Valid direct phone, mobile, or corporate email on file',
        'Physical office address / registered IEC address verified',
      ],
      actionTip: 'Primary outbound sales pool: ready for immediate phone calling and email outreach.',
      badge: { text: 'Outreach Ready', variant: 'emerald' as const },
    },
    {
      id: 'missing' as DatamyneDatasetType,
      label: 'Without Contacts',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      count: missingCount,
      description: 'Active customs shippers with verified air/ocean cargo volume, but missing direct phone or email contact information.',
      criteria: [
        'Active international customs trade transactions confirmed',
        'Known trade lanes, shipment frequencies, and HS codes',
        'Requires contact discovery & enrichment',
      ],
      actionTip: 'Customs shipping accounts with confirmed trade volume awaiting direct contact discovery.',
      badge: { text: 'Enrichment Queue', variant: 'amber' as const },
    },
    {
      id: 'all' as DatamyneDatasetType,
      label: 'All Leads',
      icon: Layers,
      iconColor: 'text-blue-500',
      count: allCount,
      description: 'Unified customs trade database of 37,273 active exporters and importers, containing both contact-ready and enrichment accounts.',
      criteria: [
        'Complete directory of Indian air and ocean shippers',
        '100% sanitized of active JFLL customer accounts',
        'Includes full historical customs volume & shipment stats',
      ],
      actionTip: 'Use for broad market intelligence and discovering all shippers in specific trade lanes or HS codes.',
      badge: { text: 'Complete Universe', variant: 'blue' as const },
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="DataMyne Dataset Selection"
      className="inline-flex p-1 bg-slate-100/80 border border-slate-200/90 rounded-xl shadow-2xs"
    >
      {segments.map((seg, idx) => {
        const Icon = seg.icon;
        const isActive = activeDataset === seg.id;
        return (
          <div key={seg.id} className="relative flex items-center">
            <button
              role="tab"
              aria-selected={isActive}
              onClick={() => onChangeDataset(seg.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CategoryInfoTooltip
                title={seg.label}
                description={seg.description}
                criteria={seg.criteria}
                actionTip={seg.actionTip}
                badge={seg.badge}
                align={idx === 0 ? 'left' : idx === segments.length - 1 ? 'right' : 'center'}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${seg.iconColor}`} />
              </CategoryInfoTooltip>
              <span>{seg.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-mono ${
                  isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {seg.count > 0 ? seg.count.toLocaleString('en-US') : '—'}
              </span>

              {/* Micro Info Trigger Popover */}
              <CategoryInfoTooltip
                title={seg.label}
                description={seg.description}
                criteria={seg.criteria}
                actionTip={seg.actionTip}
                badge={seg.badge}
                align={idx === 0 ? 'left' : idx === segments.length - 1 ? 'right' : 'center'}
                iconClassName={isActive ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-600'}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
