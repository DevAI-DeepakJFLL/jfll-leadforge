import React from 'react';
import {
  ApolloFilterParams,
  TOP_APOLLO_CARGO_VERTICALS,
  APOLLO_EMPLOYEE_TIERS,
  APOLLO_REVENUE_RANGES,
} from '@/types/apolloLead';
import { X } from 'lucide-react';

export interface ApolloActiveFilterChipsProps {
  filters: ApolloFilterParams;
  onRemoveIndustry: (industry: string) => void;
  onRemoveCountry: (country: string) => void;
  onRemoveEmployeeTier: (tierId: string) => void;
  onRemoveRevenueRange: (rangeId: string) => void;
  onRemoveHasWebsite: () => void;
  onRemoveHasLinkedin: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
  className?: string;
}

export const ApolloActiveFilterChips: React.FC<ApolloActiveFilterChipsProps> = ({
  filters,
  onRemoveIndustry,
  onRemoveCountry,
  onRemoveEmployeeTier,
  onRemoveRevenueRange,
  onRemoveHasWebsite,
  onRemoveHasLinkedin,
  onClearSearch,
  onClearAll,
  className = '',
}) => {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  // Search keyword chip
  if (filters.q && filters.q.trim()) {
    chips.push({
      key: `search-${filters.q}`,
      label: `Search: "${filters.q.trim()}"`,
      onRemove: onClearSearch,
    });
  }

  // Industry chips
  filters.industries?.forEach((ind) => {
    const meta = TOP_APOLLO_CARGO_VERTICALS.find((v) => v.id === ind);
    chips.push({
      key: `industry-${ind}`,
      label: meta ? meta.label : ind,
      onRemove: () => onRemoveIndustry(ind),
    });
  });

  // Country chips
  filters.countries?.forEach((c) => {
    chips.push({
      key: `country-${c}`,
      label: `Country: ${c}`,
      onRemove: () => onRemoveCountry(c),
    });
  });

  // Employee tier chips
  filters.employeeTiers?.forEach((tierId) => {
    const tier = APOLLO_EMPLOYEE_TIERS.find((t) => t.id === tierId);
    chips.push({
      key: `tier-${tierId}`,
      label: tier ? tier.label : tierId,
      onRemove: () => onRemoveEmployeeTier(tierId),
    });
  });

  // Revenue range chips
  filters.revenueRanges?.forEach((rangeId) => {
    const range = APOLLO_REVENUE_RANGES.find((r) => r.id === rangeId);
    chips.push({
      key: `rev-${rangeId}`,
      label: range ? range.label : rangeId,
      onRemove: () => onRemoveRevenueRange(rangeId),
    });
  });

  // Contact channel chips
  if (filters.hasWebsite) {
    chips.push({
      key: 'channel-website',
      label: 'Has Website',
      onRemove: onRemoveHasWebsite,
    });
  }

  if (filters.hasLinkedin) {
    chips.push({
      key: 'channel-linkedin',
      label: 'Has LinkedIn',
      onRemove: onRemoveHasLinkedin,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className={`px-3 sm:px-4 py-2 bg-slate-50 border-b border-surface-border flex items-center gap-1.5 flex-wrap text-xs ${className}`}
      aria-label="Active Apollo Filters"
    >
      <span className="text-slate-500 text-[11px] font-medium mr-1">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-apollo border border-blue-200 text-xs font-medium"
        >
          <span>{chip.label}</span>
          <button
            onClick={chip.onRemove}
            className="hover:bg-blue-100 rounded p-0.5 text-apollo transition-colors focus:outline-none"
            title={`Remove ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-[11px] text-slate-500 hover:text-apollo underline font-medium ml-1 transition-colors"
      >
        Clear all
      </button>
    </div>
  );
};
