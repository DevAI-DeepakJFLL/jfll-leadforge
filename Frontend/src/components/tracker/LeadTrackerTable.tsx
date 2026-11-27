import React, { useState } from 'react';
import {
  Plane,
  Ship,
  Package,
  FileText,
  Truck,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Building2,
  User,
  ArrowUpDown,
  SearchX,
} from 'lucide-react';
import {
  ALL_TRACKER_STATUSES,
  LeadTrackerItem,
  RoutingType,
  TrackerFollowupStatus,
  TrackerStatus,
  TransportMode,
} from '@/types/leadTracker';
import { getFollowupStatus } from '@/services/leadTrackerService';

export interface LeadTrackerTableProps {
  leads: LeadTrackerItem[];
  isLoading?: boolean;
  onSelectLead: (lead: LeadTrackerItem) => void;
  onStatusChange?: (leadId: string, newStatus: TrackerStatus) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  todayStr?: string;
  emptyStateAction?: React.ReactNode;
  className?: string;
}

/**
 * Returns transport mode icon with freight-forwarding visual semantics.
 */
function getTransportModeIcon(mode: TransportMode | string) {
  switch (mode) {
    case 'Ocean FCL':
    case 'Ocean LCL':
      return <Ship className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    case 'Air Freight':
      return <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    case 'Courier / Express':
      return <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    case 'CHA Brokerage':
      return <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
    case 'Multimodal':
      return <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    default:
      return <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  }
}

/**
 * Entity type badge (Datamyne vs Apollo vs JFLL vs Custom).
 */
function renderEntityBadge(type: string) {
  switch (type) {
    case 'datamyne':
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
          Datamyne
        </span>
      );
    case 'apollo':
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
          Apollo
        </span>
      );
    case 'jfll_customer':
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          JFLL
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          Custom
        </span>
      );
  }
}

/**
 * Routing type pill: Freehand (Shipper pays) vs Nominated (Consignee controls).
 */
function renderRoutingPill(routing: RoutingType) {
  if (routing === 'Freehand') {
    return (
      <span
        className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80"
        title="Freehand: Freight controlled by shipper directly"
      >
        Freehand
      </span>
    );
  }
  if (routing === 'Nominated') {
    return (
      <span
        className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80"
        title="Nominated: Freight controlled by overseas buyer"
      >
        Nominated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
      Not Specified
    </span>
  );
}

/**
 * Returns Tailwind classes for inline status pills and options.
 */
export function getStatusStyle(status: TrackerStatus | string): {
  badge: string;
  dot: string;
} {
  switch (status) {
    case 'Assigned':
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
    case 'Contacted':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'Meeting Scheduled':
      return {
        badge: 'bg-violet-50 text-violet-700 border-violet-200',
        dot: 'bg-violet-500',
      };
    case 'Quoted':
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'Feedback Received':
      return {
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        dot: 'bg-cyan-500',
      };
    case 'Trial Shipment':
      return {
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'Won':
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
        dot: 'bg-emerald-500',
      };
    case 'On Hold':
      return {
        badge: 'bg-zinc-100 text-zinc-700 border-zinc-300',
        dot: 'bg-zinc-400',
      };
    case 'Closed / Lost':
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-400',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

/**
 * Extracts 1-2 uppercase initials from company name for the avatar badge.
 */
function getCompanyInitials(name?: string | null): string {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Formats ISO date string to a human readable short date: "16 Aug 2026".
 */
function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${months[monthIdx] || month} ${year}`;
  } catch {
    return dateStr;
  }
}

export const LeadTrackerTable: React.FC<LeadTrackerTableProps> = ({
  leads,
  isLoading = false,
  onSelectLead,
  onStatusChange,
  sortBy,
  sortOrder,
  onSortChange,
  todayStr,
  emptyStateAction,
  className = '',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleSort = (field: string) => {
    if (onSortChange) {
      onSortChange(field);
    }
  };

  const renderSortArrow = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  if (isLoading) {
    return (
      <div className={`border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0 ${className}`}>
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200/80 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100 flex-1 overflow-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3.5 flex items-center gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-slate-200/70 shrink-0" />
              <div className="h-4 w-36 bg-slate-200/70 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-5 w-24 bg-slate-200/70 rounded-full" />
              <div className="h-4 flex-1 bg-slate-100 rounded" />
              <div className="w-6 h-6 rounded-md bg-slate-100 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className={`border border-slate-200/80 rounded-xl bg-white p-12 text-center shadow-2xs flex-1 flex flex-col items-center justify-center min-h-[320px] ${className}`}>
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No tracked leads match criteria</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Try clearing your branch, rep, or status filters, or search for another shipper company.
        </p>
        {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
      </div>
    );
  }

  return (
    <div className={`border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0 ${className}`}>
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 select-none">
            <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              {/* 1. Company Name */}
              <th
                scope="col"
                className="py-2.5 px-3.5 min-w-[220px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                onClick={() => handleSort('company_name')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Company Name</span>
                  {renderSortArrow('company_name')}
                </div>
              </th>

              {/* 2. Rep & Branch */}
              <th
                scope="col"
                className="py-2.5 px-3.5 min-w-[150px] font-semibold cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap"
                onClick={() => handleSort('assigned_to')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Rep &amp; Branch</span>
                  {renderSortArrow('assigned_to')}
                </div>
              </th>

              {/* 3. Mode & Routing */}
              <th scope="col" className="py-2.5 px-3.5 min-w-[140px] font-semibold text-slate-600 whitespace-nowrap">
                <span>Mode &amp; Routing</span>
              </th>

              {/* 4. Contact Person */}
              <th scope="col" className="py-2.5 px-3.5 min-w-[150px] font-semibold text-slate-600">
                <span>Contact Person</span>
              </th>

              {/* 5. Status */}
              <th
                scope="col"
                className="py-2.5 px-3.5 min-w-[160px] font-semibold cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortArrow('status')}
                </div>
              </th>

              {/* 6. Follow-up & Cadence */}
              <th
                scope="col"
                className="py-2.5 px-3.5 min-w-[170px] font-semibold cursor-pointer hover:text-blue-700 transition-colors whitespace-nowrap"
                onClick={() => handleSort('next_followup_date')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Follow-up &amp; Cadence</span>
                  {renderSortArrow('next_followup_date')}
                </div>
              </th>

              {/* 7. Action */}
              <th scope="col" className="py-2.5 px-3.5 text-right w-12 font-semibold text-slate-600 whitespace-nowrap">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {leads.map((lead) => {
              const followupUrgency: TrackerFollowupStatus = getFollowupStatus(
                lead.next_followup_date,
                lead.status,
                todayStr
              );
              const statusConfig = getStatusStyle(lead.status);
              const initials = getCompanyInitials(lead.company_name);

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectLead(lead);
                    }
                  }}
                  className="divide-y divide-slate-100 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors group focus:outline-hidden focus:bg-blue-50/40"
                >
                  {/* 1. Company Avatar & Name */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                        {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors truncate max-w-[200px]"
                          title={lead.company_name}
                        >
                          {lead.company_name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {renderEntityBadge(lead.linked_entity_type)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Sales Rep Badge */}
                  <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs">
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {lead.assigned_to ? lead.assigned_to.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="font-semibold text-slate-900">{lead.assigned_to}</span>
                      {lead.branch && (
                        <span className="text-slate-500 text-[10px] font-normal">({lead.branch})</span>
                      )}
                    </div>
                  </td>

                  {/* 3. Mode & Routing */}
                  <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="inline-flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                        {getTransportModeIcon(lead.transport_mode)}
                        <span>{lead.transport_mode}</span>
                      </div>
                      <div>{renderRoutingPill(lead.routing_type)}</div>
                    </div>
                  </td>

                  {/* 4. Contact Person */}
                  <td className="py-3 px-3.5 align-middle">
                    {lead.contact_person ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-xs text-slate-900 leading-tight flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{lead.contact_person}</span>
                        </div>
                        {lead.contact_phone ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, lead.contact_phone!, `phone-${lead.id}`)}
                              className="hover:text-blue-700 flex items-center gap-1 group/phone cursor-pointer"
                              title={`Copy phone: ${lead.contact_phone}`}
                            >
                              <Phone className="w-2.5 h-2.5 text-slate-400 group-hover/phone:text-blue-700 shrink-0" />
                              <span className="font-mono text-[11px]">{lead.contact_phone}</span>
                              {copiedId === `phone-${lead.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover/phone:opacity-100 shrink-0" />
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No contact details</span>
                    )}
                  </td>

                  {/* 5. Status Pill & Inline Dropdown */}
                  <td className="py-3 px-3.5 align-middle whitespace-nowrap min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <select
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newStatus = e.target.value as TrackerStatus;
                          if (onStatusChange) {
                            onStatusChange(lead.id, newStatus);
                          }
                        }}
                        aria-label={`Status for ${lead.company_name}`}
                        className={`text-[11px] font-semibold py-1 px-2.5 pr-6 rounded-full border shadow-2xs appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-colors ${statusConfig.badge}`}
                      >
                        {ALL_TRACKER_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-900 font-normal">
                            {st}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-60">
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                  </td>

                  {/* 6. Follow-up & Cadence */}
                  <td className="py-3 px-3.5 align-middle">
                    <div className="flex flex-col gap-1 items-start">
                      {followupUrgency === 'overdue' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                          title={`Overdue since ${lead.next_followup_date}`}
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>Overdue · {formatShortDate(lead.next_followup_date)}</span>
                        </span>
                      )}
                      {followupUrgency === 'due_today' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                          title="Follow-up is due today"
                        >
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Due Today</span>
                        </span>
                      )}
                      {followupUrgency === 'upcoming' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200"
                          title={`Scheduled for ${lead.next_followup_date}`}
                        >
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatShortDate(lead.next_followup_date)}</span>
                        </span>
                      )}
                      {followupUrgency === 'none' && (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}

                      {lead.next_action && (
                        <div
                          className="text-slate-600 text-[11px] truncate max-w-[200px] leading-tight"
                          title={lead.next_action}
                        >
                          {lead.next_action}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 7. Action Button */}
                  <td className="py-3 px-3.5 text-right align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-colors cursor-pointer group-hover:text-slate-600"
                      title="Open lead details"
                      aria-label={`Open lead details for ${lead.company_name}`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
