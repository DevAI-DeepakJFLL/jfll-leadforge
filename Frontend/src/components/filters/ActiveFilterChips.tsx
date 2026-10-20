import React from 'react';
import { X, RotateCcw, Building2 } from 'lucide-react';
import { FilterParams } from '@/types/lead';

export interface ActiveFilterChipsProps {
  filters: FilterParams;
  onRemoveFilter: (key: keyof FilterParams, value: string) => void;
  onClearAll: () => void;
  className?: string;
}

interface ChipItem {
  key: keyof FilterParams;
  category: string;
  value: string;
  label: string;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  className = '',
}) => {
  const chips: ChipItem[] = [];

  if (filters.company || filters.organizationId) {
    chips.push({
      key: filters.company ? 'company' : 'organizationId',
      category: 'Company',
      value: filters.company || filters.organizationId || '',
      label: filters.company || 'Selected Organization',
    });
  }

  if (filters.q) {
    chips.push({
      key: 'q',
      category: 'Search',
      value: filters.q,
      label: `"${filters.q}"`,
    });
  }

  (filters.jobTitles || []).forEach((t) => {
    chips.push({
      key: 'jobTitles',
      category: 'Title',
      value: t,
      label: t,
    });
  });

  (filters.departments || []).forEach((d) => {
    chips.push({
      key: 'departments',
      category: 'Department',
      value: d,
      label: d,
    });
  });

  (filters.locations || []).forEach((loc) => {
    chips.push({
      key: 'locations',
      category: 'Location',
      value: loc,
      label: loc,
    });
  });

  (filters.industries || []).forEach((ind) => {
    chips.push({
      key: 'industries',
      category: 'Industry',
      value: ind,
      label: ind,
    });
  });

  (filters.status || []).forEach((st) => {
    chips.push({
      key: 'status',
      category: 'Status',
      value: st,
      label: st,
    });
  });

  (filters.companySize || []).forEach((cs) => {
    chips.push({
      key: 'companySize',
      category: 'Employees',
      value: cs,
      label: cs,
    });
  });

  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 py-2 px-4 bg-white border-b border-surface-border select-none animate-in fade-in duration-150 ${className}`}
      aria-label="Active Filters"
    >
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
        Filtered by:
      </span>

      {chips.map((chip, idx) => {
        const isCompanyChip = chip.key === 'company' || chip.key === 'organizationId';
        return (
          <span
            key={`${chip.key}-${chip.value}-${idx}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-colors shadow-2xs group ${
              isCompanyChip
                ? 'bg-blue-50 hover:bg-blue-100/90 text-blue-900 border border-blue-200/90 font-medium'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
            }`}
          >
            {isCompanyChip && <Building2 className="w-3 h-3 text-apollo shrink-0" />}
            <span
              className={
                isCompanyChip
                  ? 'text-blue-600 font-semibold text-[11px]'
                  : 'text-slate-400 font-medium text-[11px]'
              }
            >
              {chip.category}:
            </span>
            <span className="font-semibold text-slate-900 max-w-[160px] truncate">
              {chip.label}
            </span>
            <button
              type="button"
              onClick={() => onRemoveFilter(chip.key, chip.value)}
              className={`p-1 -mr-1 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-apollo cursor-pointer ${
                isCompanyChip
                  ? 'text-blue-500 hover:text-blue-950 hover:bg-blue-200/60'
                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-300/60'
              }`}
              title={`Remove ${chip.category}: ${chip.label}`}
              aria-label={`Remove filter ${chip.category} ${chip.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors py-1 px-2 rounded hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
        title="Clear all active filters"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Clear all</span>
      </button>
    </div>
  );
};

export default ActiveFilterChips;
