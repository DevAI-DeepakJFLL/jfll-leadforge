import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { DatamyneFilterParams, TransportMode } from '@/types/datamyneLead';

export interface DatamyneActiveFilterChipsProps {
  filters: DatamyneFilterParams;
  onRemoveCountry?: (country: string) => void;
  onRemoveTransportMode: (mode: TransportMode) => void;
  onRemoveRole: (role: string) => void;
  onRemoveCategory: (category: string) => void;
  onRemoveSubcategory: (subcategory: string) => void;
  onRemoveCity: (city: string) => void;
  onRemoveTradeLane: (tradeLane: string) => void;
  onRemoveContactStatus: (status: string) => void;
  onRemoveApproachStatus?: (status: string) => void;
  onToggleHasDirectors: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
  className?: string;
}

interface ChipItem {
  id: string;
  category: string;
  label: string;
  onRemove: () => void;
}

export const DatamyneActiveFilterChips: React.FC<DatamyneActiveFilterChipsProps> = ({
  filters,
  onRemoveCountry,
  onRemoveTransportMode,
  onRemoveRole,
  onRemoveCategory,
  onRemoveSubcategory,
  onRemoveCity,
  onRemoveTradeLane,
  onRemoveContactStatus,
  onRemoveApproachStatus,
  onToggleHasDirectors,
  onClearSearch,
  onClearAll,
  className = '',
}) => {
  const chips: ChipItem[] = [];

  // 1. Search Query
  if (filters.q && filters.q.trim()) {
    chips.push({
      id: `q-${filters.q}`,
      category: 'Search',
      label: `"${filters.q}"`,
      onRemove: onClearSearch,
    });
  }

  // Geographic Region / Country
  (filters.countries || [])
    .filter((c) => c !== 'All' && c !== 'all')
    .forEach((c) => {
      chips.push({
        id: `country-${c}`,
        category: 'Region',
        label: c,
        onRemove: () => onRemoveCountry?.(c),
      });
    });

  // 2. Transport Modes
  (filters.transportModes || []).forEach((mode) => {
    const label =
      mode === 'Air & Ocean'
        ? 'Multi-modal (Air & Ocean)'
        : mode === 'Air'
        ? 'Air Freight'
        : 'Ocean Freight';
    chips.push({
      id: `transport-${mode}`,
      category: 'Transport',
      label,
      onRemove: () => onRemoveTransportMode(mode),
    });
  });

  // 3. Trading Roles
  (filters.roles || []).forEach((role) => {
    const label =
      role === 'Both' || role === 'Both (Exporter & Importer)'
        ? 'Both (Exporter & Importer)'
        : `${role} Only`;
    chips.push({
      id: `role-${role}`,
      category: 'Trading Role',
      label,
      onRemove: () => onRemoveRole(role),
    });
  });

  // 4. Logistics Categories
  (filters.categories || []).forEach((cat) => {
    chips.push({
      id: `cat-${cat}`,
      category: 'Category',
      label: cat,
      onRemove: () => onRemoveCategory(cat),
    });
  });

  // 5. Cargo Subcategories
  (filters.subcategories || []).forEach((sub) => {
    chips.push({
      id: `sub-${sub}`,
      category: 'Subcategory',
      label: sub,
      onRemove: () => onRemoveSubcategory(sub),
    });
  });

  // 6. Cities
  (filters.cities || []).forEach((city) => {
    chips.push({
      id: `city-${city}`,
      category: 'City',
      label: city,
      onRemove: () => onRemoveCity(city),
    });
  });

  // 7. Trade Corridors
  (filters.tradeLanes || []).forEach((lane) => {
    chips.push({
      id: `lane-${lane}`,
      category: 'Corridor',
      label: lane,
      onRemove: () => onRemoveTradeLane(lane),
    });
  });

  // 8. Contact Readiness
  (filters.contactStatus || []).forEach((status) => {
    const statusLabels: Record<string, string> = {
      both: 'Both Phone & Email',
      phone_only: 'Phone Only',
      email_only: 'Email Only',
      missing: 'No Contact on File',
    };
    chips.push({
      id: `contact-${status}`,
      category: 'Contact',
      label: statusLabels[status] || status,
      onRemove: () => onRemoveContactStatus(status),
    });
  });

  // 9. Sales Approach Status
  (filters.approachStatuses || []).forEach((st) => {
    chips.push({
      id: `approach-${st}`,
      category: 'Sales Status',
      label: st,
      onRemove: () => onRemoveApproachStatus?.(st),
    });
  });

  // 9. Has Registered Directors
  if (filters.hasDirectors) {
    chips.push({
      id: 'directors-true',
      category: 'Governance',
      label: 'Has Registered Directors',
      onRemove: onToggleHasDirectors,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 py-2 px-4 bg-white border-b border-surface-border select-none animate-in fade-in duration-150 ${className}`}
      aria-label="Active DataMyne Filters"
    >
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
        Filtered by:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-colors shadow-2xs group shrink-0 whitespace-nowrap"
        >
          <span className="text-slate-400 font-medium text-[11px]">{chip.category}:</span>
          <span className="font-medium text-slate-800 max-w-[240px] truncate" title={chip.label}>
            {chip.label}
          </span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-1 -mr-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-300/60 transition-colors focus:outline-none focus:ring-1 focus:ring-apollo cursor-pointer"
            title={`Remove ${chip.category}: ${chip.label}`}
            aria-label={`Remove filter ${chip.category} ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors py-1 px-2 rounded hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer shrink-0"
        title="Clear all active DataMyne filters"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Clear all</span>
      </button>
    </div>
  );
};

export default DatamyneActiveFilterChips;
