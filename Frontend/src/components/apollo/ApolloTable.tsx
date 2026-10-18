import React, { useState } from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import { ApolloLead, toSafeExternalUrl } from '@/types/apolloLead';
import {
  ExternalLink,
  Phone,
  Copy,
  Check,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';


export interface ApolloTableProps {
  leads: ApolloLead[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void;
  onLeadClick: (lead: ApolloLead) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalFormatted?: string;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  className?: string;
}

export const ApolloTable: React.FC<ApolloTableProps> = ({
  leads,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  rowSelection,
  onRowSelectionChange,
  onLeadClick,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalFormatted = '690.9k',
  onPageChange,
  onClearFilters,
  className = '',
}) => {
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const handleCopyPhone = (e: React.MouseEvent, phone: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleCheckboxChange = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    onRowSelectionChange((old) => ({
      ...old,
      [leadId]: !old[leadId],
    }));
  };

  const formatRevenue = (rev?: number | null) => {
    if (!rev || rev === 0) return '—';
    if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(1)}B`;
    if (rev >= 1000000) return `$${(rev / 1000000).toFixed(1)}M`;
    if (rev >= 1000) return `$${(rev / 1000).toFixed(0)}k`;
    return `$${rev}`;
  };

  const formatEmployees = (count?: number | null) => {
    if (!count || count === 0) return '—';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k staff`;
    return `${count} staff`;
  };

  // 1. Loading Skeleton View
  if (isLoading) {
    return (
      <div className={`w-full bg-white rounded-lg border border-surface-border p-4 space-y-3 ${className}`}>
        <div className="h-6 bg-slate-100 rounded w-1/4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 border border-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State View
  if (isError) {
    return (
      <div className={`w-full bg-white rounded-lg border border-red-200 p-8 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to query Apollo database</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          {error?.message || 'An error occurred while connecting to the S3 DuckDB analytical query engine.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-apollo text-white text-xs font-medium rounded-lg hover:bg-apollo-hover transition-colors shadow-xs"
          >
            Retry Query
          </button>
        )}
      </div>
    );
  }

  // 3. Empty Search Results View
  if (!leads || leads.length === 0) {
    return (
      <div className={`w-full bg-white rounded-lg border border-surface-border p-12 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No commercial shippers found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          No organizations match your current cargo vertical, size, revenue, or location filters.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border border-surface-border shadow-2xs overflow-hidden ${className}`}>
      {/* Scrollable Table Viewport */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left text-xs border-collapse" aria-label="Apollo Shippers Table">
          <thead>
            <tr className="bg-slate-50/80 border-b border-surface-border text-slate-600 font-semibold sticky top-0 z-10 select-none text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-2.5 px-3 min-w-[220px]">Company & Domain</th>
              <th className="py-2.5 px-3 min-w-[160px]">Cargo Vertical</th>
              <th className="py-2.5 px-3 min-w-[130px]">Scale & Revenue</th>
              <th className="py-2.5 px-3 min-w-[150px]">Headquarters</th>
              <th className="py-2.5 px-3 min-w-[140px]">Direct Phone</th>
              <th className="py-2.5 px-3 w-24 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {leads.map((lead) => {
              const isSelected = !!rowSelection[lead.organization_id];
              const isPhoneCopied = copiedPhoneId === lead.organization_id;

              return (
                <tr
                  key={lead.organization_id}
                  onClick={() => onLeadClick(lead)}
                  className={`group hover:bg-slate-50/90 transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-2.5 px-3 text-center"
                    onClick={(e) => handleCheckboxChange(e, lead.organization_id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-apollo focus:ring-apollo border-slate-300 cursor-pointer"
                      aria-label={`Select ${lead.organization_name}`}
                    />
                  </td>

                  {/* Company Legal Name & Domain */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-apollo border border-blue-200/60 font-semibold text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                        {lead.organization_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-[260px] group-hover:text-apollo transition-colors">
                          {lead.organization_name}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                          <span className="truncate max-w-[160px]">{lead.domain}</span>
                          {toSafeExternalUrl(lead.website_url) && (
                            <a
                              href={toSafeExternalUrl(lead.website_url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-apollo inline-flex"
                              title="Visit company website"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Industry & Cargo Vertical Pill Badge */}
                  <td className="py-2.5 px-3">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                      <span className="truncate max-w-[140px]">{lead.industry}</span>
                    </div>
                  </td>

                  {/* Company Headcount & Revenue */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col text-[11px]">
                      <span className="font-semibold text-slate-800 font-mono">
                        {formatRevenue(lead.revenue_usd)}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {formatEmployees(lead.employee_count)}
                      </span>
                    </div>
                  </td>

                  {/* Headquarters Location */}
                  <td className="py-2.5 px-3">
                    <div className="truncate max-w-[140px] text-slate-800">
                      {lead.hq_city || lead.hq_state ? (
                        <span>
                          {lead.hq_city ? `${lead.hq_city}, ` : ''}
                          {lead.hq_state ? `${lead.hq_state}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {lead.hq_country || '—'}
                    </div>
                  </td>

                  {/* Direct Phone Number with One-Click Copy */}
                  <td className="py-2.5 px-3">
                    <div className="inline-flex items-center space-x-1 text-slate-700">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] select-text">{lead.phone}</span>
                      <button
                        onClick={(e) => handleCopyPhone(e, lead.phone, lead.organization_id)}
                        className="p-1 text-slate-400 hover:text-apollo rounded hover:bg-slate-100 transition-colors ml-0.5"
                        title="Copy phone number"
                        aria-label="Copy phone number"
                      >
                        {isPhoneCopied ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Actions: View Details Button */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLeadClick(lead);
                      }}
                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-apollo hover:text-apollo hover:bg-blue-50/50 text-xs font-medium transition-colors shadow-2xs"
                      title="View full organization dossier"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-white border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 shrink-0 select-none">
        <div className="flex items-center space-x-1.5">
          <span>
            Showing <strong className="text-slate-800">{Math.min(leads.length, pageSize)}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{totalFormatted || totalItems.toLocaleString()}</strong> shippers
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-500">
            Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
