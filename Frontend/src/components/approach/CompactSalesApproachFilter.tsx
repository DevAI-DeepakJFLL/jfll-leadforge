import React, { useMemo, useCallback } from 'react';
import { Check } from 'lucide-react';
import { ALL_SALES_STATUSES, SalesStatus } from '@/types/approachLog';

export interface CompactSalesApproachFilterProps {
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
  onSelectStatuses?: (statuses: string[]) => void;
  onClear?: () => void;
  className?: string;
}

interface StatusVisualMeta {
  dotColor: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const STATUS_CONFIG: Record<SalesStatus, StatusVisualMeta> = {
  'Not Contacted': {
    dotColor: 'bg-slate-400',
    activeBg: 'bg-slate-100',
    activeBorder: 'border-slate-300',
    activeText: 'text-slate-800',
  },
  Contacted: {
    dotColor: 'bg-blue-500',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-300',
    activeText: 'text-blue-800',
  },
  'Report Sent': {
    dotColor: 'bg-cyan-500',
    activeBg: 'bg-cyan-50',
    activeBorder: 'border-cyan-300',
    activeText: 'text-cyan-900',
  },
  'Working on It': {
    dotColor: 'bg-purple-500',
    activeBg: 'bg-purple-50',
    activeBorder: 'border-purple-300',
    activeText: 'text-purple-800',
  },
  'In Progress': {
    dotColor: 'bg-amber-500',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-300',
    activeText: 'text-amber-900',
  },
  'On Hold': {
    dotColor: 'bg-orange-500',
    activeBg: 'bg-orange-50',
    activeBorder: 'border-orange-300',
    activeText: 'text-orange-900',
  },
  'No Response': {
    dotColor: 'bg-slate-400',
    activeBg: 'bg-slate-100',
    activeBorder: 'border-slate-300',
    activeText: 'text-slate-700',
  },
  'Not Interested': {
    dotColor: 'bg-rose-500',
    activeBg: 'bg-rose-50',
    activeBorder: 'border-rose-300',
    activeText: 'text-rose-800',
  },
  'Converted to Active': {
    dotColor: 'bg-emerald-600',
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300',
    activeText: 'text-emerald-900',
  },
};

const PIPELINE_STATUSES: SalesStatus[] = [
  'Contacted',
  'Report Sent',
  'Working on It',
  'In Progress',
];
const UNCONTACTED_STATUSES: SalesStatus[] = ['Not Contacted'];
const WON_STATUSES: SalesStatus[] = ['Converted to Active'];

export const CompactSalesApproachFilter: React.FC<CompactSalesApproachFilterProps> = ({
  selectedStatuses,
  onToggleStatus,
  onSelectStatuses,
  onClear,
  className = '',
}) => {
  const isAllActive = selectedStatuses.length === 0;

  const isPipelineActive = useMemo(() => {
    return (
      selectedStatuses.length === PIPELINE_STATUSES.length &&
      PIPELINE_STATUSES.every((s) => selectedStatuses.includes(s))
    );
  }, [selectedStatuses]);

  const isUncontactedActive = useMemo(() => {
    return (
      selectedStatuses.length === UNCONTACTED_STATUSES.length &&
      UNCONTACTED_STATUSES.every((s) => selectedStatuses.includes(s))
    );
  }, [selectedStatuses]);

  const isWonActive = useMemo(() => {
    return (
      selectedStatuses.length === WON_STATUSES.length &&
      WON_STATUSES.every((s) => selectedStatuses.includes(s))
    );
  }, [selectedStatuses]);

  const handlePreset = useCallback(
    (preset: 'all' | 'pipeline' | 'uncontacted' | 'won') => {
      if (onSelectStatuses) {
        switch (preset) {
          case 'all':
            onSelectStatuses([]);
            break;
          case 'pipeline':
            onSelectStatuses(PIPELINE_STATUSES);
            break;
          case 'uncontacted':
            onSelectStatuses(UNCONTACTED_STATUSES);
            break;
          case 'won':
            onSelectStatuses(WON_STATUSES);
            break;
        }
      } else {
        // Fallback if batch setter is not provided
        if (preset === 'all') {
          if (onClear) {
            onClear();
          } else {
            selectedStatuses.forEach((st) => onToggleStatus(st));
          }
        }
      }
    },
    [onSelectStatuses, onClear, selectedStatuses, onToggleStatus]
  );

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Smart Funnel Presets Micro-Bar */}
      {onSelectStatuses && (
        <div
          role="group"
          aria-label="Sales funnel presets"
          className="flex items-center gap-1 p-0.5 bg-slate-100/90 border border-slate-200/70 rounded-md"
        >
          <button
            type="button"
            aria-pressed={isAllActive}
            onClick={() => handlePreset('all')}
            className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all cursor-pointer ${
              isAllActive
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={isPipelineActive}
            onClick={() => handlePreset('pipeline')}
            className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all cursor-pointer ${
              isPipelineActive
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Filter to active pipeline: Contacted, Report Sent, Working on It, In Progress"
          >
            Pipeline
          </button>
          <button
            type="button"
            aria-pressed={isUncontactedActive}
            onClick={() => handlePreset('uncontacted')}
            className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all cursor-pointer ${
              isUncontactedActive
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Filter to Not Contacted leads"
          >
            New
          </button>
          <button
            type="button"
            aria-pressed={isWonActive}
            onClick={() => handlePreset('won')}
            className={`flex-1 py-1 text-xs font-semibold rounded text-center transition-all cursor-pointer ${
              isWonActive
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Filter to Converted to Active customers"
          >
            Active
          </button>
        </div>
      )}

      {/* Compact Interactive Status Chips */}
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Sales Approach Statuses"
      >
        {ALL_SALES_STATUSES.map((status) => {
          const isSelected = selectedStatuses.includes(status);
          const meta = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggleStatus(status)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-apollo/40 ${
                isSelected
                  ? `${meta.activeBg} ${meta.activeBorder} ${meta.activeText} font-semibold shadow-2xs`
                  : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={`Filter by: ${status}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`}
                aria-hidden="true"
              />
              <span className="leading-tight">{status}</span>
              {isSelected && (
                <Check
                  className="w-2.5 h-2.5 text-current shrink-0 stroke-[2.5]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected summary & inline reset footer */}
      {selectedStatuses.length > 0 && (
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
          <span>{`${selectedStatuses.length} of ${ALL_SALES_STATUSES.length} selected`}</span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-apollo hover:text-apollo-dark font-medium hover:underline cursor-pointer"
            >
              Reset to all
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactSalesApproachFilter;
