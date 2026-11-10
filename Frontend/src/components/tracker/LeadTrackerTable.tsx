import React, { useState } from 'react';
import {
  Plane,
  Ship,
  Package,
  FileText,
  Truck,
  Phone,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Edit3,
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
      <div className={`w-full overflow-hidden border border-slate-200 rounded-lg bg-white shadow-xs ${className}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-36 bg-slate-100 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
              <div className="h-4 flex-1 bg-slate-100 rounded" />
              <div className="h-5 w-24 bg-slate-200 rounded-full" />
              <div className="h-7 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className={`w-full border border-slate-200 rounded-lg bg-white p-12 text-center shadow-xs ${className}`}>
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
    <div className={`w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs ${className}`}>
      <table className="min-w-full text-left text-xs divide-y divide-slate-200 border-collapse table-auto">
        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
          <tr className="text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
            <th
              scope="col"
              className="py-3 px-3.5 group cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('company_name')}
            >
              <div className="flex items-center gap-1.5">
                <span>Company Name</span>
                {renderSortArrow('company_name')}
              </div>
            </th>

            <th
              scope="col"
              className="py-3 px-3 group cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('assigned_to')}
            >
              <div className="flex items-center gap-1.5">
                <span>Rep &amp; Branch</span>
                {renderSortArrow('assigned_to')}
              </div>
            </th>

            <th scope="col" className="py-3 px-3">
              <span>Mode &amp; Routing</span>
            </th>

            <th scope="col" className="py-3 px-3">
              <span>Contact Person</span>
            </th>

            <th scope="col" className="py-3 px-3">
              <span>Status</span>
            </th>

            <th scope="col" className="py-3 px-3 min-w-[200px]">
              <span>Feedback Notes</span>
            </th>

            <th
              scope="col"
              className="py-3 px-3 group cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
              onClick={() => handleSort('next_followup_date')}
            >
              <div className="flex items-center gap-1.5">
                <span>Next Follow-up</span>
                {renderSortArrow('next_followup_date')}
              </div>
            </th>

            <th scope="col" className="py-3 px-3 min-w-[160px]">
              <span>Next Action</span>
            </th>

            <th scope="col" className="py-3 px-3.5 text-right">
              <span>Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-150 bg-white">
          {leads.map((lead) => {
            const followupUrgency: TrackerFollowupStatus = getFollowupStatus(
              lead.next_followup_date,
              lead.status,
              todayStr
            );
            const statusConfig = getStatusStyle(lead.status);

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
                className="hover:bg-slate-50/90 transition-colors cursor-pointer group focus:outline-hidden focus:bg-blue-50/50"
              >
                {/* 1. Company Name & Linked Entity */}
                <td className="py-2.5 px-3.5 max-w-[240px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {lead.company_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {renderEntityBadge(lead.linked_entity_type)}
                      <span className="text-[10px] text-slate-400">
                        Assigned {formatShortDate(lead.assigned_date)}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 2. Rep & Branch */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                      {lead.assigned_to.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 leading-tight">
                        {lead.assigned_to}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                        <span>{lead.branch}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* 3. Mode & Routing */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1 items-start">
                    <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                      {getTransportModeIcon(lead.transport_mode)}
                      <span>{lead.transport_mode}</span>
                    </div>
                    <div>{renderRoutingPill(lead.routing_type)}</div>
                  </div>
                </td>

                {/* 4. Contact Person */}
                <td className="py-2.5 px-3">
                  {lead.contact_person ? (
                    <div className="flex flex-col gap-0.5">
                      <div className="font-medium text-slate-900 leading-tight flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{lead.contact_person}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {lead.contact_phone && (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, lead.contact_phone!, `phone-${lead.id}`)}
                            className="hover:text-blue-600 flex items-center gap-0.5"
                            title={`Copy phone: ${lead.contact_phone}`}
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{lead.contact_phone}</span>
                            {copiedId === `phone-${lead.id}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                            )}
                          </button>
                        )}
                        {lead.contact_email && (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, lead.contact_email!, `email-${lead.id}`)}
                            className="hover:text-blue-600 flex items-center gap-0.5"
                            title={`Copy email: ${lead.contact_email}`}
                          >
                            <Mail className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[100px]">{lead.contact_email}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No contact details</span>
                  )}
                </td>

                {/* 5. Status Pill & Inline Dropdown */}
                <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="relative inline-block">
                    <select
                      value={lead.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as TrackerStatus;
                        if (onStatusChange) {
                          onStatusChange(lead.id, newStatus);
                        }
                      }}
                      aria-label={`Status for ${lead.company_name}`}
                      className={`text-[11px] font-medium py-1 px-2.5 pr-6 rounded-full border shadow-2xs appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden transition-colors ${statusConfig.badge}`}
                    >
                      {ALL_TRACKER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current opacity-60">
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                </td>

                {/* 6. Feedback Notes */}
                <td className="py-2.5 px-3 max-w-[260px]">
                  {lead.feedback_notes ? (
                    <p
                      className="text-slate-600 text-xs line-clamp-2 leading-relaxed"
                      title={lead.feedback_notes}
                    >
                      {lead.feedback_notes}
                    </p>
                  ) : (
                    <span className="text-slate-400 italic">No feedback logged</span>
                  )}
                </td>

                {/* 7. Next Follow-up Badge */}
                <td className="py-2.5 px-3 whitespace-nowrap">
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
                </td>

                {/* 8. Next Action */}
                <td className="py-2.5 px-3 max-w-[200px]">
                  {lead.next_action ? (
                    <div
                      className="text-slate-700 font-medium text-[11px] truncate"
                      title={lead.next_action}
                    >
                      {lead.next_action}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>

                {/* 9. Actions */}
                <td className="py-2.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-200 rounded shadow-2xs transition-colors"
                    title="Open edit & touchpoint drawer"
                  >
                    <Edit3 className="w-3 h-3 text-slate-500" />
                    <span>Edit / Touchpoint</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
