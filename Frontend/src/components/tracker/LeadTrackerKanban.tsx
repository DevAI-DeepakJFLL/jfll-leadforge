import React, { useMemo } from 'react';
import {
  Ship,
  Plane,
  Package,
  FileText,
  Truck,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  ALL_TRACKER_STATUSES,
  LeadTrackerItem,
  RoutingType,
  TrackerStatus,
  TransportMode,
} from '@/types/leadTracker';
import { getFollowupStatus } from '@/services/leadTrackerService';

export interface LeadTrackerKanbanProps {
  leads: LeadTrackerItem[];
  isLoading?: boolean;
  onSelectLead: (lead: LeadTrackerItem) => void;
  onStatusChange?: (leadId: string, newStatus: TrackerStatus) => void;
  todayStr?: string;
  emptyStateAction?: React.ReactNode;
  className?: string;
}

export interface LeadTrackerKanbanCardProps {
  lead: LeadTrackerItem;
  stageIndex: number;
  todayStr?: string;
  onSelectLead: (lead: LeadTrackerItem) => void;
  onStatusChange?: (leadId: string, newStatus: TrackerStatus) => void;
}

export interface ColumnStyleConfig {
  accentBorder: string;
  headerBg: string;
  badgeBg: string;
  dotColor: string;
}

export const STAGE_CONFIGS: Record<TrackerStatus, ColumnStyleConfig> = {
  Assigned: {
    accentBorder: 'border-t-slate-400',
    headerBg: 'bg-slate-50 text-slate-800',
    badgeBg: 'bg-slate-200 text-slate-700',
    dotColor: 'bg-slate-400',
  },
  Contacted: {
    accentBorder: 'border-t-blue-500',
    headerBg: 'bg-blue-50/60 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-800',
    dotColor: 'bg-blue-500',
  },
  'Meeting Scheduled': {
    accentBorder: 'border-t-violet-500',
    headerBg: 'bg-violet-50/60 text-violet-900',
    badgeBg: 'bg-violet-100 text-violet-800',
    dotColor: 'bg-violet-500',
  },
  Quoted: {
    accentBorder: 'border-t-amber-500',
    headerBg: 'bg-amber-50/60 text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-800',
    dotColor: 'bg-amber-500',
  },
  'Feedback Received': {
    accentBorder: 'border-t-cyan-500',
    headerBg: 'bg-cyan-50/60 text-cyan-950',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    dotColor: 'bg-cyan-500',
  },
  'Trial Shipment': {
    accentBorder: 'border-t-orange-500',
    headerBg: 'bg-orange-50/60 text-orange-950',
    badgeBg: 'bg-orange-100 text-orange-800',
    dotColor: 'bg-orange-500',
  },
  Won: {
    accentBorder: 'border-t-emerald-500',
    headerBg: 'bg-emerald-50/60 text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-800 font-semibold',
    dotColor: 'bg-emerald-500',
  },
  'On Hold': {
    accentBorder: 'border-t-zinc-400',
    headerBg: 'bg-zinc-100/70 text-zinc-800',
    badgeBg: 'bg-zinc-200 text-zinc-700',
    dotColor: 'bg-zinc-400',
  },
  'Closed / Lost': {
    accentBorder: 'border-t-rose-500',
    headerBg: 'bg-rose-50/60 text-rose-950',
    badgeBg: 'bg-rose-100 text-rose-800',
    dotColor: 'bg-rose-500',
  },
};

/**
 * Returns transport mode icon with freight-forwarding visual semantics.
 */
export function getTransportModeIcon(mode: TransportMode | string) {
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
export function renderEntityBadge(type: string) {
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
export function renderRoutingPill(routing: RoutingType) {
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
 * Extracts 1-2 uppercase initials from company name for the avatar badge.
 */
export function getCompanyInitials(name?: string | null): string {
  if (!name) return 'CO';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'CO'
  );
}

/**
 * Extracts first character initial for sales rep avatar.
 */
export function getRepInitial(name?: string | null): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Formats ISO date string to a human readable short date: "16 Aug 2026".
 */
export function formatShortDate(dateStr?: string | null): string {
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

/**
 * Pure helper function to partition leads by status.
 */
export function groupLeadsByStatus(leads: LeadTrackerItem[]): Map<TrackerStatus, LeadTrackerItem[]> {
  const map = new Map<TrackerStatus, LeadTrackerItem[]>();
  for (const st of ALL_TRACKER_STATUSES) {
    map.set(st, []);
  }
  for (const lead of leads) {
    const list = map.get(lead.status);
    if (list) {
      list.push(lead);
    } else {
      const fallback = map.get('Assigned');
      if (fallback) fallback.push(lead);
    }
  }
  return map;
}

/**
 * Standalone individual Kanban Card component.
 */
export const LeadTrackerKanbanCardBase: React.FC<LeadTrackerKanbanCardProps> = ({
  lead,
  stageIndex,
  todayStr,
  onSelectLead,
  onStatusChange,
}) => {
  const initials = getCompanyInitials(lead.company_name);
  const followupUrgency = getFollowupStatus(
    lead.next_followup_date,
    lead.status,
    todayStr
  );

  const prevStatus = stageIndex > 0 ? ALL_TRACKER_STATUSES[stageIndex - 1] : null;
  const nextStatus =
    stageIndex < ALL_TRACKER_STATUSES.length - 1
      ? ALL_TRACKER_STATUSES[stageIndex + 1]
      : null;

  return (
    <div
      data-testid={`kanban-card-${lead.id}`}
      onClick={() => onSelectLead(lead)}
      className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-2 group"
    >
      {/* 1. Card Header: Initials Avatar + Company Name + Source Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
            {initials}
          </div>
          <span
            className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1"
            title={lead.company_name}
          >
            {lead.company_name}
          </span>
        </div>
        <div className="shrink-0">{renderEntityBadge(lead.linked_entity_type)}</div>
      </div>

      {/* 2. Mode & Routing */}
      <div className="flex items-center justify-between text-xs gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {getTransportModeIcon(lead.transport_mode)}
          <span className="text-[11px] text-slate-600 font-medium truncate">
            {lead.transport_mode}
          </span>
        </div>
        <div className="shrink-0">{renderRoutingPill(lead.routing_type)}</div>
      </div>

      {/* 3. Sales Rep & Branch */}
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
          {getRepInitial(lead.assigned_to)}
        </div>
        <span className="text-[11px] truncate">
          <strong className="text-slate-700 font-medium">
            {lead.assigned_to || 'Unassigned'}
          </strong>
          {lead.branch ? ` (${lead.branch})` : ''}
        </span>
      </div>

      {/* 4. Urgency & Next Action */}
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

        {lead.next_action && (
          <div
            className="text-slate-600 text-[11px] line-clamp-2 leading-tight mt-0.5"
            title={lead.next_action}
          >
            {lead.next_action}
          </div>
        )}
      </div>

      {/* 5. Quick Move Controls (Prev / Select / Next) */}
      {onStatusChange && (
        <div
          className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={!prevStatus}
            onClick={(e) => {
              e.stopPropagation();
              if (prevStatus) onStatusChange(lead.id, prevStatus);
            }}
            title={prevStatus ? `Move back to ${prevStatus}` : 'Already at first stage'}
            aria-label={`Move ${lead.company_name} to previous stage`}
            data-testid={`kanban-move-prev-${lead.id}`}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="relative flex-1 min-w-0">
            <select
              value={lead.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange(lead.id, e.target.value as TrackerStatus);
              }}
              aria-label={`Change stage for ${lead.company_name}`}
              data-testid={`kanban-stage-select-${lead.id}`}
              className="w-full text-[10px] font-medium py-1 pl-2 pr-5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 truncate appearance-none cursor-pointer hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              {ALL_TRACKER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          </div>

          <button
            type="button"
            disabled={!nextStatus}
            onClick={(e) => {
              e.stopPropagation();
              if (nextStatus) onStatusChange(lead.id, nextStatus);
            }}
            title={nextStatus ? `Advance to ${nextStatus}` : 'Already at final stage'}
            aria-label={`Advance ${lead.company_name} to next stage`}
            data-testid={`kanban-move-next-${lead.id}`}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export const LeadTrackerKanbanCard = React.memo(LeadTrackerKanbanCardBase);
LeadTrackerKanbanCard.displayName = 'LeadTrackerKanbanCard';

export const LeadTrackerKanban: React.FC<LeadTrackerKanbanProps> = ({
  leads,
  isLoading = false,
  onSelectLead,
  onStatusChange,
  todayStr,
  emptyStateAction,
  className = '',
}) => {
  // Group leads by pipeline status
  const leadsByStatus = useMemo(() => groupLeadsByStatus(leads), [leads]);

  if (isLoading) {
    return (
      <div
        data-testid="kanban-loading-skeleton"
        className={`flex gap-3 overflow-x-auto p-4 min-h-0 flex-1 ${className}`}
      >
        {ALL_TRACKER_STATUSES.map((status) => (
          <div
            key={status}
            className="w-72 min-w-[288px] max-w-[288px] flex flex-col shrink-0 rounded-xl bg-slate-100/70 border border-slate-200/80 overflow-hidden animate-pulse"
          >
            <div className="p-3 border-b border-slate-200 bg-white/50 flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-6 bg-slate-200 rounded-full" />
            </div>
            <div className="p-2.5 flex flex-col gap-2.5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200/80 p-3 h-28 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-200" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                  </div>
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="lead-tracker-kanban"
      className={`flex flex-col flex-1 min-h-0 ${className}`}
    >
      {leads.length === 0 && emptyStateAction && (
        <div className="px-4 pt-2 shrink-0 flex items-center justify-end">
          {emptyStateAction}
        </div>
      )}

      {/* Horizontal smooth-scrolling Kanban lane container */}
      <div className="flex gap-3 overflow-x-auto p-4 min-h-0 flex-1 select-none">
        {ALL_TRACKER_STATUSES.map((status, stageIndex) => {
          const stageLeads = leadsByStatus.get(status) || [];
          const stageConfig = STAGE_CONFIGS[status] || STAGE_CONFIGS.Assigned;
          const statusSlug = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          return (
            <div
              key={status}
              data-testid={`kanban-column-${statusSlug}`}
              className="w-72 min-w-[288px] max-w-[288px] flex flex-col shrink-0 rounded-xl bg-slate-100/70 border border-slate-200/80 max-h-full overflow-hidden shadow-2xs"
            >
              {/* Column Header */}
              <div
                className={`p-3 border-b border-slate-200/90 border-t-4 ${stageConfig.accentBorder} ${stageConfig.headerBg} flex items-center justify-between shrink-0 select-none`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stageConfig.dotColor}`} />
                  <h3 className="text-xs font-bold truncate tracking-tight">{status}</h3>
                </div>
                <span
                  data-testid={`kanban-count-${statusSlug}`}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${stageConfig.badgeBg}`}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-[140px] scrollbar-thin">
                {stageLeads.length === 0 ? (
                  <div
                    data-testid={`kanban-empty-${statusSlug}`}
                    className="border-2 border-dashed border-slate-200/80 rounded-xl p-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center min-h-[90px] my-auto select-none"
                  >
                    <span className="text-[11px] font-medium text-slate-400">
                      No leads in this stage
                    </span>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <LeadTrackerKanbanCard
                      key={lead.id}
                      lead={lead}
                      stageIndex={stageIndex}
                      todayStr={todayStr}
                      onSelectLead={onSelectLead}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
