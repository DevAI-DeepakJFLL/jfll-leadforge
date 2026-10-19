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
  Users,
  MapPin,
} from 'lucide-react';
import { ApolloVerticalBadge } from './ApolloVerticalBadge';
import {
  getCompanyInitials,
  getAvatarStyle,
  formatCompactRevenue,
  formatCompactEmployees,
} from '@/utils/apolloUtils';

export { getCompanyInitials, getAvatarStyle };


export interface ApolloTableProps {
  leads: ApolloLead[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => void;
  onLeadClick: (lead: ApolloLead) => void;
  onFindDecisionMakers?: (companyName: string, organizationId?: string) => void;
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
  onFindDecisionMakers,
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
          <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs shadow-2xs">
            <tr className="bg-slate-50/95 border-b border-slate-200/90 text-slate-600 font-semibold select-none text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3.5 w-10 text-center sticky top-0 z-20">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-3.5 min-w-[230px] sticky top-0 z-20">Company & Domain</th>
              <th className="py-3 px-3.5 min-w-[180px] sticky top-0 z-20">Cargo Vertical</th>
              <th className="py-3 px-3.5 min-w-[140px] sticky top-0 z-20">Scale & Revenue</th>
              <th className="py-3 px-3.5 min-w-[150px] sticky top-0 z-20">Headquarters</th>
              <th className="py-3 px-3.5 min-w-[175px] sticky top-0 z-20">Direct Phone</th>
              <th className="py-3 px-3.5 w-28 text-right sticky top-0 z-20">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {leads.map((lead) => {
              const isSelected = !!rowSelection[lead.organization_id];
              const isPhoneCopied = copiedPhoneId === lead.organization_id;
              const avatarStyle = getAvatarStyle(lead.organization_name);
              const initials = getCompanyInitials(lead.organization_name);

              return (
                <tr
                  key={lead.organization_id}
                  onClick={() => onLeadClick(lead)}
                  className={`group transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/35 hover:bg-blue-50/50'
                      : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3 px-3.5 text-center align-middle"
                    onClick={(e) => handleCheckboxChange(e, lead.organization_id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-apollo focus:ring-apollo border-slate-300 cursor-pointer"
                      aria-label={`Select ${lead.organization_name}`}
                    />
                  </td>

                  {/* Company Legal Name & Domain */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${avatarStyle.bg} ${avatarStyle.text} border ${avatarStyle.border} font-bold text-xs flex items-center justify-center shrink-0 uppercase tracking-tight shadow-2xs`}
                        title={lead.organization_name}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 truncate max-w-[200px] sm:max-w-[280px] group-hover:text-apollo hover:underline transition-colors leading-tight">
                          {lead.organization_name}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-normal truncate mt-0.5 leading-tight">
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

                  {/* Industry & Logistics Cargo Vertical */}
                  <td className="py-3 px-3.5 align-middle">
                    <ApolloVerticalBadge industry={lead.industry} showMode={true} />
                  </td>

                  {/* Company Headcount & Revenue */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="flex flex-col gap-0.5">
                      {lead.revenue_usd && lead.revenue_usd >= 100000000 ? (
                        <div className="inline-flex items-center gap-1.5 w-fit">
                          <span className="font-bold text-emerald-700 font-mono text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 leading-tight">
                            {formatCompactRevenue(lead.revenue_usd)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-semibold text-xs text-slate-800 font-mono leading-tight">
                          {formatCompactRevenue(lead.revenue_usd)}
                        </span>
                      )}
                      <span className="text-slate-500 font-mono text-[11px] leading-tight mt-0.5">
                        {formatCompactEmployees(lead.employee_count)}
                      </span>
                    </div>
                  </td>

                  {/* Headquarters Location */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="truncate max-w-[160px] text-xs text-slate-800 font-normal flex items-center gap-1.5 leading-tight">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {lead.hq_city || lead.hq_state ? (
                        <span className="truncate">
                          {lead.hq_city ? `${lead.hq_city}, ` : ''}
                          {lead.hq_state ? `${lead.hq_state}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[160px] pl-5 mt-0.5 leading-tight">
                      {lead.hq_country || '—'}
                    </div>
                  </td>

                  {/* Direct Phone Number */}
                  <td className="py-3 px-3.5 whitespace-nowrap align-middle">
                    {lead.phone && lead.phone !== '—' && lead.phone.toLowerCase() !== 'not specified' ? (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-apollo group-hover:bg-blue-50 transition-colors shrink-0">
                          <Phone className="w-3 h-3" />
                        </div>
                        <a
                          href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-slate-800 hover:text-apollo hover:underline select-text font-medium leading-tight"
                          title={`Call ${lead.phone}`}
                        >
                          {lead.phone}
                        </a>
                        <button
                          onClick={(e) => handleCopyPhone(e, lead.phone, lead.organization_id)}
                          className="p-1 text-slate-400 hover:text-apollo hover:bg-blue-50 rounded-md transition-colors shrink-0 cursor-pointer"
                          title="Copy phone number"
                          aria-label={`Copy phone number ${lead.phone}`}
                        >
                          {isPhoneCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs pl-1">—</span>
                    )}
                  </td>

                  {/* Actions: View Details & Find Decision-Makers Buttons */}
                  <td className="py-3 px-3.5 text-right align-middle">
                    <div className="inline-flex items-center space-x-1.5 justify-end">
                      {onFindDecisionMakers && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFindDecisionMakers(lead.organization_name, lead.organization_id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-apollo hover:bg-blue-50 transition-colors"
                          title={`Find decision-makers at ${lead.organization_name} in People tab`}
                          aria-label={`Find decision-makers at ${lead.organization_name}`}
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick(lead);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-apollo hover:text-apollo hover:bg-blue-50/50 text-xs font-semibold transition-colors shadow-2xs"
                        title="View full organization profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </div>
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
