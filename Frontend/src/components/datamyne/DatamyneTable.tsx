import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Eye,
  AlertCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import { DatamyneLead } from '@/types/datamyneLead';
import { DatamyneCategoryBadge } from './DatamyneCategoryBadge';

export interface DatamyneTableProps {
  leads: DatamyneLead[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onLeadClick: (lead: DatamyneLead) => void;
  onSearchApollo?: (companyName: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalFormatted?: string;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export const DatamyneTable: React.FC<DatamyneTableProps> = ({
  leads,
  rowSelection,
  onRowSelectionChange,
  onLeadClick,
  onSearchApollo,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalFormatted,
  onPageChange,
  onClearFilters,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  className = '',
}) => {
  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRowSelectionChange((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col ${className}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3 px-4 min-w-[260px]">Company & Role</th>
                <th className="py-3 px-3.5 min-w-[210px]">Category & Subcategory</th>
                <th className="py-3 px-3.5 min-w-[150px]">City & Corridor</th>
                <th className="py-3 px-3.5 min-w-[160px]">Shipments & Value</th>
                <th className="py-3 px-3.5 min-w-[150px]">Contact Readiness</th>
                <th className="py-3 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: pageSize || 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-3 text-center">
                    <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-48 h-3.5 bg-slate-200 rounded mb-1.5" />
                    <div className="w-20 h-2.5 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="w-28 h-5 bg-slate-100 rounded-full mb-1" />
                    <div className="w-32 h-2.5 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="w-24 h-3 bg-slate-200 rounded mb-1" />
                    <div className="w-16 h-2 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="w-20 h-3.5 bg-slate-200 rounded mb-1" />
                    <div className="w-24 h-3 bg-emerald-100 rounded" />
                  </td>
                  <td className="py-3.5 px-3.5">
                    <div className="w-24 h-4 bg-slate-200 rounded-full" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="w-16 h-6 bg-slate-100 rounded mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`p-8 text-center bg-white rounded-xl border border-red-200 max-w-md mx-auto my-12 shadow-sm ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Failed to load DataMyne leads</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          {error?.message || 'An error occurred while querying the DataMyne leads dataset.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </button>
        )}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          No DataMyne leads match your filters
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          Try expanding your search query or switching between Valid and Missing Contact pools.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-apollo hover:bg-apollo-600 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col ${className}`}
    >
      <div className="overflow-x-auto min-w-0">
        <table className="w-full min-w-[1020px] text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-4 min-w-[260px]">Company & Role</th>
              <th className="py-3 px-3.5 min-w-[220px]">Category & Subcategory</th>
              <th className="py-3 px-3.5 min-w-[160px]">City & Corridor</th>
              <th className="py-3 px-3.5 min-w-[170px]">Shipments & Traded Value</th>
              <th className="py-3 px-3.5 min-w-[150px]">Contact Readiness</th>
              <th className="py-3 px-4 w-32 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => {
              const isSelected = !!rowSelection[l.id];
              const initials = l.company_name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              const isMissing = l.dataset_type === 'missing';

              return (
                <tr
                  key={l.id}
                  onClick={() => onLeadClick(l)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => handleToggleRow(l.id, e)}
                  >
                    <div className="flex items-center justify-center min-h-[36px] min-w-[36px]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                        aria-label={`Select ${l.company_name}`}
                      />
                    </div>
                  </td>

                  {/* Company Name & Role */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0">
                        {initials || <Building2 className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-slate-900 truncate max-w-[240px] lg:max-w-[320px]"
                          title={l.company_name}
                        >
                          {l.company_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              l.role === 'Exporter'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : l.role === 'Importer'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {l.role}
                          </span>
                          {l.tax_id && (
                            <span className="text-[10px] font-mono text-slate-400">
                              IEC: {l.tax_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category & Subcategory */}
                  <td className="py-3 px-3.5">
                    <div>
                      <DatamyneCategoryBadge category={l.category} />
                      <div
                        className="text-[11px] text-slate-600 font-medium truncate max-w-[200px] mt-1"
                        title={l.subcategory}
                      >
                        {l.subcategory}
                      </div>
                    </div>
                  </td>

                  {/* City & Trade Corridor */}
                  <td className="py-3 px-3.5">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">
                        {l.city || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {l.trade_lanes || '—'}
                      </div>
                    </div>
                  </td>

                  {/* Volume & Value */}
                  <td className="py-3 px-3.5">
                    <div>
                      <span className="font-semibold text-slate-900 text-xs">
                        {l.total_shipments.toLocaleString('en-US')} pkgs
                      </span>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                        {l.total_value_usd > 0
                          ? `$${l.total_value_usd >= 1_000_000
                              ? (l.total_value_usd / 1_000_000).toFixed(2) + 'M'
                              : l.total_value_usd >= 1_000
                              ? (l.total_value_usd / 1_000).toFixed(1) + 'K'
                              : l.total_value_usd.toFixed(0)}`
                          : '—'}
                      </div>
                    </div>
                  </td>

                  {/* Contact Readiness */}
                  <td className="py-3 px-3.5">
                    {isMissing ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Missing Contacts
                      </span>
                    ) : l.phone && l.email ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Phone & Email
                      </span>
                    ) : l.phone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Phone Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Email Only
                      </span>
                    )}
                  </td>

                  {/* Action CTA */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(l);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded transition-all shadow-2xs group/btn cursor-pointer"
                        title={`View dossier for ${l.company_name}`}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                        <span>View</span>
                      </button>

                      {isMissing && onSearchApollo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSearchApollo(l.company_name);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Search Decision Makers in Apollo Leads"
                          aria-label="Search Apollo Leads"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="min-h-12 border-t border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <strong className="text-slate-800">
            {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-800">
            {Math.min(currentPage * pageSize, totalItems)}
          </strong>{' '}
          of <strong className="text-slate-800">{totalFormatted || totalItems}</strong>{' '}
          leads
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
