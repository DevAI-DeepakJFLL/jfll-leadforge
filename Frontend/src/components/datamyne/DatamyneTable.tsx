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
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { DatamyneLead } from '@/types/datamyneLead';
import { DatamyneCategoryBadge } from './DatamyneCategoryBadge';
import { TierScoreBadge } from '@/components/tiers';
import { SalesStatusBadge } from '@/components/approach';
import {
  APPROACH_STATUS_CHANGED_EVENT,
  getCachedApproachStatus,
  getCachedApproachLatestNote,
} from '@/services/approachLogService';


export interface DatamyneTableProps {
  leads: DatamyneLead[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onLeadClick: (lead: DatamyneLead) => void;
  /**
   * @deprecated Decision makers are accessed via the lead drawer or Apollo Cross-navigation.
   */
  onFindDecisionMakers?: ((companyName: string, domain?: string, director?: string) => void) | ((lead: DatamyneLead) => void);
  onLogApproach?: (lead: DatamyneLead) => void;
  onConvertToActive?: (lead: DatamyneLead) => void;
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
  onFindDecisionMakers: _onFindDecisionMakers,
  onLogApproach,
  onConvertToActive,
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
        className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex-1 flex flex-col min-h-0 ${className}`}
      >
        <div className="flex-1 overflow-auto min-h-0 relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs">
              <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-2 w-9 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-2.5 px-3 min-w-[220px]">
                  Company & Role
                </th>
                <th className="py-2.5 px-2.5 min-w-[140px]">Category & Subcategory</th>
                <th className="py-2.5 px-2.5 min-w-[120px]">City & Corridor</th>
                <th className="py-2.5 px-2.5 min-w-[160px]">Shipments & Value</th>
                <th className="py-2.5 px-2.5 min-w-[120px] whitespace-nowrap">Contact Readiness</th>
                <th className="py-2.5 px-2.5 min-w-[110px] whitespace-nowrap">Sales Status</th>
                <th className="py-2.5 px-3 min-w-[180px] text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: pageSize || 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-2.5 px-2 text-center">
                    <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="w-44 h-3.5 bg-slate-200 rounded mb-1" />
                    <div className="w-28 h-2.5 bg-slate-100 rounded" />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <div className="w-24 h-4.5 bg-slate-100 rounded-full mb-1" />
                    <div className="w-28 h-2 bg-slate-100 rounded" />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <div className="w-20 h-3 bg-slate-200 rounded mb-1" />
                    <div className="w-16 h-2 bg-slate-100 rounded" />
                  </td>
                  <td className="py-3.5 px-2.5">
                    <div className="w-18 h-3 bg-slate-200 rounded mb-1" />
                    <div className="w-20 h-2.5 bg-emerald-100 rounded" />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <div className="w-22 h-4 bg-slate-200 rounded-full" />
                  </td>
                  {/* Sales Status (Column 7) */}
                  <td className="py-2.5 px-2.5">
                    <div className="w-18 h-4 bg-slate-100 rounded-full" />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="w-14 h-5.5 bg-slate-100 rounded mx-auto" />
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
          Try clearing active filters or selecting another vertical.
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
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex-1 flex flex-col min-h-0 ${className}`}
    >
      <div className="flex-1 overflow-auto min-h-0 relative">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/90 shadow-2xs">
            <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-2 w-9 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-2.5 px-3 min-w-[220px]">
                Company & Role
              </th>
              <th className="py-2.5 px-2.5 min-w-[140px]">Category & Subcategory</th>
              <th className="py-2.5 px-2.5 min-w-[120px]">City & Corridor</th>
              <th className="py-2.5 px-2.5 min-w-[160px]">Shipments & Value</th>
              <th className="py-2.5 px-2.5 min-w-[120px] whitespace-nowrap">Contact Readiness</th>
              <th className="py-2.5 px-2.5 min-w-[110px] whitespace-nowrap">Sales Status</th>
              <th className="py-2.5 px-3 min-w-[180px] text-center">
                Action
              </th>
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
                  role="row"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onLeadClick(l)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLeadClick(l);
                    }
                  }}
                  className={`transition-colors cursor-pointer group select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-apollo focus-visible:ring-inset ${
                    isSelected ? 'bg-blue-50/35 hover:bg-blue-50/50' : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-2 px-2.5 text-center align-middle"
                    onClick={(e) => handleToggleRow(l.id, e)}
                  >
                    <div className="flex items-center justify-center min-h-[32px] min-w-[32px]">
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
                  <td className="py-2 px-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0 shadow-2xs">
                        {initials || <Building2 className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-semibold text-xs text-slate-900 group-hover:text-apollo hover:underline transition-colors truncate max-w-[240px] lg:max-w-[320px] leading-tight"
                          title={l.company_name}
                        >
                          {l.company_name}
                        </div>
                        {/* Streamlined Metadata Row with Tier Badge + Clean Dot Separators */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-normal truncate">
                          {/* SOP Tier Score Badge if segmented */}
                          {(l as any).segment_status && (
                            <TierScoreBadge
                              status={(l as any).segment_status}
                              score={(l as any).total_score || 0}
                              breakdown={(l as any).score_breakdown}
                            />
                          )}

                          {/* Role text */}
                          <span
                            className={`font-medium px-2 py-0.5 rounded-full text-[10px] border ${
                              l.role === 'Exporter'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : l.role === 'Importer'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                            title={`Trading Role: ${l.role}`}
                          >
                            {l.role === 'Both (Exporter & Importer)' || l.role === 'Both'
                              ? 'Exp & Imp'
                              : l.role}
                          </span>

                          {/* Transport Mode */}
                          {l.transport_mode && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span
                                className={`inline-flex items-center gap-0.5 font-medium px-2 py-0.5 rounded-full text-[10px] border ${
                                  l.transport_mode === 'Air'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : l.transport_mode === 'Ocean'
                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                                title={`Transport Mode: ${l.transport_mode}`}
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
                                    <Plane className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                    <span>Multi</span>
                                  </>
                                )}
                              </span>
                            </>
                          )}

                          {/* Tax ID (IEC) */}
                          {l.tax_id && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span
                                className="font-mono text-[10px] text-slate-500"
                                title={`Import Export Code: ${l.tax_id}`}
                              >
                                IEC: {l.tax_id}
                              </span>
                            </>
                          )}

                          {/* Declared HS Code */}
                          {l.top_hs_codes && (() => {
                            const codes = l.top_hs_codes.split(',').map((c) => c.trim()).filter(Boolean);
                            if (codes.length === 0) return null;
                            const primaryCode = codes[0];
                            const additionalCount = codes.length - 1;
                            return (
                              <>
                                <span className="text-slate-300">·</span>
                                <span
                                  className="font-mono text-[10px] text-slate-500"
                                  title={`Declared HS Codes: ${l.top_hs_codes}`}
                                >
                                  HS: {primaryCode}{additionalCount > 0 ? ` (+${additionalCount})` : ''}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category & Subcategory */}
                  <td className="py-2 px-2.5 align-middle">
                    <div>
                      <DatamyneCategoryBadge category={l.category} />
                      <div
                        className="text-[11px] text-slate-500 font-normal truncate max-w-[150px] mt-0.5 leading-tight"
                        title={l.subcategory}
                      >
                        {l.subcategory}
                      </div>
                    </div>
                  </td>

                  {/* City & Trade Corridor */}
                  <td className="py-2 px-2.5 align-middle">
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-slate-900 truncate max-w-[130px] leading-tight">
                        {l.city || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal truncate max-w-[130px] mt-0.5 leading-tight">
                        {l.trade_lanes || '—'}
                      </div>
                    </div>
                  </td>

                  {/* Volume & Value */}
                  <td className="py-2 px-2.5 align-middle">
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
                  <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                    {isMissing ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/90 whitespace-nowrap shrink-0 shadow-2xs"
                        title="No direct phone or email on file for this lead"
                      >
                        <PhoneOff className="w-3 h-3 text-slate-400 shrink-0" />
                        No Contact on File
                      </span>
                    ) : l.phone && l.email ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Phone & Email
                      </span>
                    ) : l.phone ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Phone Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Email Only
                      </span>
                    )}
                  </td>

                  {/* Sales Approach Status */}
                  <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                    {(() => {
                      const approachStatus = getCachedApproachStatus('datamyne', l.id, l.company_name);
                      const latestNote = getCachedApproachLatestNote('datamyne', l.id, l.company_name);
                      return (
                        <div className="flex flex-col gap-0.5">
                          <SalesStatusBadge
                            status={approachStatus}
                            size="sm"
                          />
                          {latestNote && latestNote !== '—' && (
                            <div
                              className="text-[10px] text-slate-500 font-normal truncate max-w-[130px]"
                              title={latestNote}
                            >
                              {latestNote}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Action CTA: View, Logs, Convert */}
                  <td className="py-2 px-3 text-center align-middle whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(l);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded-md transition-all shadow-2xs group/btn cursor-pointer"
                        title={`View details for ${l.company_name}`}
                        aria-label={`View details for ${l.company_name}`}
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
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo hover:text-white border border-apollo/30 rounded-md transition-all shadow-2xs cursor-pointer group/btn"
                          title={`Log sales activity for ${l.company_name}`}
                          aria-label={`Log sales activity for ${l.company_name}`}
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-apollo group-hover/btn:text-white transition-colors" />
                          <span>Logs</span>
                        </button>
                      )}

                      {onConvertToActive &&
                        getCachedApproachStatus('datamyne', l.id) !== 'Converted to Active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onConvertToActive(l);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-md transition-all shadow-2xs cursor-pointer group/btn"
                            title={`Convert ${l.company_name} to Active customer`}
                            aria-label={`Convert ${l.company_name} to Active customer`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white transition-colors" />
                            <span>Convert</span>
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
            {(totalItems || 0) > 0 ? (Math.max(1, currentPage || 1) - 1) * (pageSize || 25) + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-800">
            {Math.min((Math.max(1, currentPage || 1)) * (pageSize || 25), totalItems || 0)}
          </strong>{' '}
          of <strong className="text-slate-800">{totalFormatted || totalItems || 0}</strong>{' '}
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
