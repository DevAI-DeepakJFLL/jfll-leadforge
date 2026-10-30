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
  Plane,
  Ship,
  PhoneOff,
  PhoneCall,
} from 'lucide-react';
import { DatamyneLead } from '@/types/datamyneLead';
import { DatamyneCategoryBadge } from './DatamyneCategoryBadge';
import { TierScoreBadge } from '@/components/tiers';
import { SalesStatusBadge } from '@/components/approach';
import {
  APPROACH_STATUS_CHANGED_EVENT,
  getCachedApproachStatus,
} from '@/services/approachLogService';

export interface DatamyneTableProps {
  leads: DatamyneLead[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onLeadClick: (lead: DatamyneLead) => void;
  onLogApproach?: (lead: DatamyneLead) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalFormatted?: string;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  onResetToAllVerticals?: () => void;
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
  onLogApproach,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalFormatted,
  onPageChange,
  onClearFilters,
  onResetToAllVerticals,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  className = '',
}) => {
  const [, setUpdateTrigger] = React.useState(0);

  React.useEffect(() => {
    const handler = () => setUpdateTrigger((v) => v + 1);
    window.addEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
  }, []);
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
                <th className="py-3 px-3.5 min-w-[130px]">Sales Status</th>
                <th className="py-3 px-4 min-w-[150px] text-center">Action</th>
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
          Try viewing All Verticals, clearing active category filters, or switching between With Contacts and Without Contacts pools.
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {onResetToAllVerticals && (
            <button
              type="button"
              onClick={onResetToAllVerticals}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              View All Verticals
            </button>
          )}
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-apollo hover:bg-apollo-600 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
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
              <th className="py-3 px-3.5 min-w-[170px] whitespace-nowrap">Contact Readiness</th>
              <th className="py-3 px-3.5 min-w-[140px] whitespace-nowrap">Sales Status</th>
              <th className="py-3 px-4 min-w-[160px] text-center">Action</th>
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
                  className={`transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/35 hover:bg-blue-50/50' : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-3 px-3 text-center align-middle"
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
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                        {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-xs text-slate-900 group-hover:text-apollo hover:underline transition-colors truncate max-w-[240px] lg:max-w-[340px] leading-tight"
                          title={l.company_name}
                        >
                          {l.company_name}
                        </div>
                        {/* Role, Transport Mode & IEC Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {/* SOP Tier Score Badge if segmented */}
                          {(l as any).segment_status && (
                            <TierScoreBadge
                              status={(l as any).segment_status}
                              score={(l as any).total_score || 0}
                              breakdown={(l as any).score_breakdown}
                            />
                          )}

                          {/* Role Badge */}
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 leading-tight ${
                              l.role === 'Exporter'
                                ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                                : l.role === 'Importer'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                                : 'bg-purple-50 text-purple-700 border-purple-200/80'
                            }`}
                            title={`Trading Role: ${l.role}`}
                          >
                            {l.role === 'Both (Exporter & Importer)' || l.role === 'Both'
                              ? 'Both (Exp & Imp)'
                              : l.role}
                          </span>

                          {/* Transport Mode Badge */}
                          {l.transport_mode && (
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 leading-tight ${
                                l.transport_mode === 'Air'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                                  : l.transport_mode === 'Ocean'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200/80'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                              }`}
                              title={`Transport Mode: ${
                                l.transport_mode === 'Air & Ocean'
                                  ? 'Multi-modal (Air & Ocean)'
                                  : l.transport_mode
                              }`}
                            >
                              {l.transport_mode === 'Air' ? (
                                <>
                                  <Plane className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                                  <span>Air</span>
                                </>
                              ) : l.transport_mode === 'Ocean' ? (
                                <>
                                  <Ship className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
                                  <span>Ocean</span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-0.5 shrink-0">
                                    <Plane className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span className="text-[9px] text-indigo-300 font-normal leading-none select-none">
                                      /
                                    </span>
                                    <Ship className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                  </span>
                                  <span>Multimodal</span>
                                </>
                              )}
                            </span>
                          )}

                          {/* Tax ID (IEC) */}
                          {l.tax_id && (
                            <span
                              className="inline-flex items-center text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 whitespace-nowrap shrink-0 leading-tight"
                              title={`Import Export Code: ${l.tax_id}`}
                            >
                              IEC: {l.tax_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category & Subcategory */}
                  <td className="py-3 px-3.5 align-middle">
                    <div>
                      <DatamyneCategoryBadge category={l.category} />
                      <div
                        className="text-[11px] text-slate-500 font-normal truncate max-w-[200px] mt-0.5 leading-tight"
                        title={l.subcategory}
                      >
                        {l.subcategory}
                      </div>
                    </div>
                  </td>

                  {/* City & Trade Corridor */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-slate-900 truncate max-w-[150px] leading-tight">
                        {l.city || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal truncate max-w-[150px] mt-0.5 leading-tight">
                        {l.trade_lanes || '—'}
                      </div>
                    </div>
                  </td>

                  {/* Volume & Value */}
                  <td className="py-3 px-3.5 align-middle">
                    <div>
                      <div className="font-semibold text-xs text-slate-900 leading-tight">
                        {l.total_shipments.toLocaleString('en-US')} shipments
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-700 mt-0.5 leading-tight">
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
                  <td className="py-3 px-3.5 whitespace-nowrap align-middle">
                    {isMissing ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/90 whitespace-nowrap shrink-0 shadow-2xs"
                        title="No direct phone or email on file for this lead"
                      >
                        <PhoneOff className="w-3 h-3 text-slate-400 shrink-0" />
                        No Contact on File
                      </span>
                    ) : l.phone && l.email ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Phone & Email
                      </span>
                    ) : l.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Phone Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Email Only
                      </span>
                    )}
                  </td>

                  {/* Sales Approach Status */}
                  <td className="py-3 px-3.5 whitespace-nowrap align-middle">
                    <SalesStatusBadge
                      status={getCachedApproachStatus('datamyne', l.id)}
                      size="sm"
                    />
                  </td>

                  {/* Action CTA: View & Approach */}
                  <td className="py-3 px-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(l);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded-md transition-all shadow-2xs group/btn cursor-pointer"
                        title={`View details for ${l.company_name}`}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                        <span>View</span>
                      </button>

                      {onLogApproach && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogApproach(l);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo hover:text-white border border-apollo/30 rounded-md transition-all shadow-2xs cursor-pointer"
                          title={`Log sales approach for ${l.company_name}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Approach</span>
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
