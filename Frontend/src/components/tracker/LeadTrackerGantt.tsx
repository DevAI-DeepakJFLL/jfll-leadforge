import React, { useMemo, useState } from 'react';
import {
  Plane,
  Ship,
  Package,
  FileText,
  Truck,
  Clock,
  Flag,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CalendarRange,
  Users,
  SearchX,
  Building2,
} from 'lucide-react';
import { LeadTrackerItem, TransportMode } from '@/types/leadTracker';
import { getFollowupStatus, getRateValidityInfo } from '@/services/leadTrackerService';
import { getStatusStyle } from './LeadTrackerTable';

export type HorizonWindow = 14 | 30 | 60;
export type GanttGrouping = 'coordinator' | 'flat';

export interface LeadTrackerGanttProps {
  leads: LeadTrackerItem[];
  isLoading?: boolean;
  onSelectLead: (lead: LeadTrackerItem) => void;
  todayStr?: string;
  emptyStateAction?: React.ReactNode;
  className?: string;
}

const MS_PER_DAY = 86400000;

/**
 * Parses YYYY-MM-DD (or ISO timestamp) string strictly as a pure UTC midnight timestamp.
 * Eliminates local timezone offsets and daylight saving discrepancies.
 */
export function parseUtcDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const parts = trimmed.slice(0, 10).split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return Date.UTC(y, m - 1, d);
}

/**
 * Returns transport mode styling and icons matching freight logistics semantics.
 * Color codes: Air: Sky, Ocean FCL: Blue, Ocean LCL: Teal, Courier: Purple, CHA: Amber.
 */
export function getTransportModeVisual(mode: TransportMode | string): {
  name: string;
  barBg: string;
  barBorder: string;
  barText: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (mode) {
    case 'Air Freight':
      return {
        name: 'Air Freight',
        barBg: 'bg-sky-500',
        barBorder: 'border-sky-600',
        barText: 'text-white',
        pillBg: 'bg-sky-50',
        pillText: 'text-sky-700',
        pillBorder: 'border-sky-200',
        dot: 'bg-sky-500',
        icon: Plane,
      };
    case 'Ocean FCL':
      return {
        name: 'Ocean FCL',
        barBg: 'bg-blue-600',
        barBorder: 'border-blue-700',
        barText: 'text-white',
        pillBg: 'bg-blue-50',
        pillText: 'text-blue-700',
        pillBorder: 'border-blue-200',
        dot: 'bg-blue-600',
        icon: Ship,
      };
    case 'Ocean LCL':
      return {
        name: 'Ocean LCL',
        barBg: 'bg-teal-600',
        barBorder: 'border-teal-700',
        barText: 'text-white',
        pillBg: 'bg-teal-50',
        pillText: 'text-teal-700',
        pillBorder: 'border-teal-200',
        dot: 'bg-teal-600',
        icon: Ship,
      };
    case 'Courier / Express':
      return {
        name: 'Courier / Express',
        barBg: 'bg-purple-600',
        barBorder: 'border-purple-700',
        barText: 'text-white',
        pillBg: 'bg-purple-50',
        pillText: 'text-purple-700',
        pillBorder: 'border-purple-200',
        dot: 'bg-purple-600',
        icon: Package,
      };
    case 'CHA Brokerage':
      return {
        name: 'CHA Brokerage',
        barBg: 'bg-amber-600',
        barBorder: 'border-amber-700',
        barText: 'text-white',
        pillBg: 'bg-amber-50',
        pillText: 'text-amber-800',
        pillBorder: 'border-amber-200',
        dot: 'bg-amber-600',
        icon: FileText,
      };
    case 'Multimodal':
    default:
      return {
        name: mode || 'Multimodal',
        barBg: 'bg-emerald-600',
        barBorder: 'border-emerald-700',
        barText: 'text-white',
        pillBg: 'bg-emerald-50',
        pillText: 'text-emerald-800',
        pillBorder: 'border-emerald-200',
        dot: 'bg-emerald-600',
        icon: Truck,
      };
  }
}

export interface DayColumn {
  index: number;
  utc: number;
  dateStr: string;
  dayOfMonth: number;
  monthName: string;
  year: number;
  weekday: string;
  isToday: boolean;
  isWeekend: boolean;
}

export interface MonthGroup {
  label: string;
  startPercent: number;
  widthPercent: number;
}

export interface CoordinatorGroup {
  coordinator: string;
  branch: string;
  leads: LeadTrackerItem[];
  overdueCount: number;
  expiringCount: number;
}

export interface LeadTrackerGanttRowProps {
  lead: LeadTrackerItem;
  dayColumns: DayColumn[];
  startUtc: number;
  totalDays: number;
  todayMarkerPercent: number;
  activeTodayStr: string;
  minTimelineWidth: string;
  grouping: GanttGrouping;
  onSelectLead: (lead: LeadTrackerItem) => void;
}

/**
 * Individual Lead row in the Gantt timeline track.
 * Pure rendering component with zero state hooks for maximum performance.
 */
export const LeadTrackerGanttRowBase: React.FC<LeadTrackerGanttRowProps> = ({
  lead,
  dayColumns,
  startUtc,
  totalDays,
  todayMarkerPercent,
  activeTodayStr,
  minTimelineWidth,
  grouping,
  onSelectLead,
}) => {
  const rateInfo = getRateValidityInfo(lead, activeTodayStr);
  const modeVisual = getTransportModeVisual(lead.transport_mode);
  const followupUrgency = getFollowupStatus(lead.next_followup_date, lead.status, activeTodayStr);

  // Rate validity bar calculation
  const validityUtc = parseUtcDate(lead.rate_validity_date);
  let quoteUtc = parseUtcDate(lead.quote_date) || parseUtcDate(lead.assigned_date);

  let hasRateBar = false;
  let barLeft = 0;
  let barWidth = 0;

  if (validityUtc) {
    if (!quoteUtc || quoteUtc > validityUtc) {
      quoteUtc = validityUtc - 7 * MS_PER_DAY;
    }
    const startDay = (quoteUtc - startUtc) / MS_PER_DAY;
    const endDay = (validityUtc - startUtc) / MS_PER_DAY;

    if (endDay >= 0 && startDay < totalDays) {
      hasRateBar = true;
      const clampedStart = Math.max(0, startDay);
      const clampedEnd = Math.min(totalDays - 1, endDay);
      barLeft = (clampedStart / totalDays) * 100;
      barWidth = Math.max(((clampedEnd - clampedStart + 1) / totalDays) * 100, 3.5);
    }
  }

  // Follow-up milestone pin calculation
  const followupUtc = parseUtcDate(lead.next_followup_date);
  let followupPercent: number | null = null;
  let followupClamped: 'left' | 'right' | null = null;

  if (followupUtc) {
    const followupDay = (followupUtc - startUtc) / MS_PER_DAY;
    const rawPercent = ((followupDay + 0.5) / totalDays) * 100;
    if (rawPercent < 0) {
      followupPercent = 1;
      followupClamped = 'left';
    } else if (rawPercent > 100) {
      followupPercent = 99;
      followupClamped = 'right';
    } else {
      followupPercent = rawPercent;
    }
  }

  // Optional target shipment date marker
  const shipmentUtc = parseUtcDate(lead.target_shipment_date);
  let shipmentPercent: number | null = null;
  if (shipmentUtc) {
    const shipDay = (shipmentUtc - startUtc) / MS_PER_DAY;
    const rawPercent = ((shipDay + 0.5) / totalDays) * 100;
    if (rawPercent >= 0 && rawPercent <= 100) {
      shipmentPercent = rawPercent;
    }
  }

  const ModeIcon = modeVisual.icon;
  const statusStyle = getStatusStyle(lead.status);

  return (
    <div
      key={lead.id}
      data-testid={`gantt-lead-row-${lead.id}`}
      className="flex border-b border-slate-100 hover:bg-slate-50/70 transition-colors group h-14"
    >
      {/* Left Column: Company Card (Clickable, Sticky) */}
      <div
        data-testid={`gantt-lead-card-${lead.id}`}
        onClick={() => onSelectLead(lead)}
        className="w-80 shrink-0 px-3.5 py-2 flex flex-col justify-center border-r border-slate-200 bg-white group-hover:bg-slate-50/90 transition-colors cursor-pointer sticky left-0 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
        title={`Click to view interaction history for ${lead.company_name}`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 truncate transition-colors">
            {lead.company_name}
          </span>
          <span
            className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${statusStyle.badge}`}
          >
            {lead.status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="truncate max-w-[90px] font-medium text-slate-700">
            {lead.branch}
          </span>
          <span>•</span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border font-medium ${modeVisual.pillBg} ${modeVisual.pillText} ${modeVisual.pillBorder}`}
          >
            <ModeIcon className="w-2.5 h-2.5 shrink-0" />
            <span>{lead.transport_mode}</span>
          </span>
          {grouping === 'flat' && lead.assigned_to && (
            <>
              <span>•</span>
              <span className="truncate text-slate-600">{lead.assigned_to}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Column: Timeline Track */}
      <div className={`flex-1 relative overflow-hidden ${minTimelineWidth} flex items-center`}>
        {/* Day Gridlines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {dayColumns.map((col) => (
            <div
              key={col.index}
              className={`flex-1 border-r border-slate-100 ${
                col.isWeekend ? 'bg-slate-50/35' : ''
              } ${col.isToday ? 'bg-blue-50/30' : ''}`}
            />
          ))}
        </div>

        {/* Today Vertical Line Indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-5 pointer-events-none"
          style={{ left: `${todayMarkerPercent}%` }}
        />

        {/* Rate Validity Bar */}
        {hasRateBar ? (
          <div
            data-testid={`gantt-rate-bar-${lead.id}`}
            onClick={() => onSelectLead(lead)}
            style={{
              left: `${barLeft}%`,
              width: `${barWidth}%`,
            }}
            title={`Quotation Validity: ${lead.quote_date || lead.assigned_date} to ${lead.rate_validity_date} (${rateInfo.label})`}
            className={`absolute h-7 rounded-md shadow-2xs z-10 flex items-center px-2 cursor-pointer transition-all hover:scale-[1.01] hover:brightness-105 border ${
              modeVisual.barBg
            } ${modeVisual.barBorder} ${modeVisual.barText} ${
              rateInfo.status === 'expiring_soon'
                ? 'ring-2 ring-amber-400 border-amber-300'
                : rateInfo.status === 'expired'
                ? 'ring-2 ring-rose-400 opacity-85'
                : ''
            }`}
          >
            {barWidth < 15 ? (
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold w-full truncate">
                <ModeIcon className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{rateInfo.label.replace(' remaining', '').replace(' expired', 'exp')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-semibold truncate w-full">
                <ModeIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{rateInfo.label}</span>
              </div>
            )}
          </div>
        ) : (
          // No Quote Ghost Bar
          <div
            data-testid={`gantt-rate-bar-none-${lead.id}`}
            className="absolute left-2 text-[10px] text-slate-400 italic flex items-center gap-1"
          >
            <span>No active quotation</span>
          </div>
        )}

        {/* Cadence Milestone Pin (Overdue, Due Today, Upcoming) */}
        {followupPercent !== null && (
          <div
            data-testid={`gantt-cadence-pin-${lead.id}`}
            onClick={() => onSelectLead(lead)}
            style={{ left: `${followupPercent}%` }}
            title={`Next Cadence: ${lead.next_followup_date || 'None'} • Action: ${lead.next_action || 'Follow up'} (${followupUrgency})`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-15 cursor-pointer group/pin"
          >
            <div
              className={`flex items-center justify-center w-5 h-5 rounded-full shadow-xs ring-2 ring-white border transition-transform hover:scale-125 ${
                followupUrgency === 'overdue'
                  ? 'bg-rose-500 text-white border-rose-600'
                  : followupUrgency === 'due_today'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-blue-500 text-white border-blue-600'
              }`}
            >
              {followupClamped === 'left' ? (
                <span className="text-[10px] font-bold">&lt;</span>
              ) : followupClamped === 'right' ? (
                <span className="text-[10px] font-bold">&gt;</span>
              ) : (
                <Clock className="w-2.5 h-2.5" />
              )}
            </div>
          </div>
        )}

        {/* Target Shipment Date Milestone Marker */}
        {shipmentPercent !== null && (
          <div
            data-testid={`gantt-shipment-pin-${lead.id}`}
            onClick={() => onSelectLead(lead)}
            style={{ left: `${shipmentPercent}%` }}
            title={`Target Shipment Date: ${lead.target_shipment_date}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-12 cursor-pointer"
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white shadow-xs ring-2 ring-white hover:scale-125 transition-transform">
              <Flag className="w-2.5 h-2.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const LeadTrackerGanttRow = React.memo(LeadTrackerGanttRowBase);
LeadTrackerGanttRow.displayName = 'LeadTrackerGanttRow';

export const LeadTrackerGantt: React.FC<LeadTrackerGanttProps> = ({
  leads,
  isLoading = false,
  onSelectLead,
  todayStr,
  emptyStateAction,
  className = '',
}) => {
  // Horizon window: 14 Days, 30 Days (default), 60 Days
  const [horizonWindow, setHorizonWindow] = useState<HorizonWindow>(30);
  // Grouping: coordinator (default) vs flat urgency list
  const [grouping, setGrouping] = useState<GanttGrouping>('coordinator');
  // Collapsed coordinator sections state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (coordinator: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [coordinator]: !prev[coordinator],
    }));
  };

  // Pure UTC today timestamp
  const activeTodayStr = useMemo(() => {
    return todayStr?.trim() || new Date().toISOString().slice(0, 10);
  }, [todayStr]);

  const todayUtc = useMemo(() => {
    return parseUtcDate(activeTodayStr) || Date.now();
  }, [activeTodayStr]);

  // Window geometry configuration (past days lookback vs forward horizon)
  const { pastDays, totalDays } = useMemo(() => {
    switch (horizonWindow) {
      case 14:
        return { pastDays: 3, totalDays: 14 };
      case 60:
        return { pastDays: 14, totalDays: 60 };
      case 30:
      default:
        return { pastDays: 7, totalDays: 30 };
    }
  }, [horizonWindow]);

  const startUtc = useMemo(() => {
    return todayUtc - pastDays * MS_PER_DAY;
  }, [todayUtc, pastDays]);

  // Generate day columns array
  const dayColumns: DayColumn[] = useMemo(() => {
    const cols: DayColumn[] = [];
    for (let i = 0; i < totalDays; i++) {
      const dUtc = startUtc + i * MS_PER_DAY;
      const d = new Date(dUtc);
      const dayOfMonth = d.getUTCDate();
      const monthName = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const year = d.getUTCFullYear();
      const weekday = d.toLocaleString('en-US', { weekday: 'narrow', timeZone: 'UTC' });
      const dayOfWeek = d.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = i === pastDays;

      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dayOfMonth).padStart(2, '0');
      const dateStr = `${y}-${m}-${dd}`;

      cols.push({
        index: i,
        utc: dUtc,
        dateStr,
        dayOfMonth,
        monthName,
        year,
        weekday,
        isToday,
        isWeekend,
      });
    }
    return cols;
  }, [startUtc, totalDays, pastDays]);

  // Month header groups across visible horizon
  const monthGroups: MonthGroup[] = useMemo(() => {
    if (dayColumns.length === 0) return [];
    const groups: { label: string; startIndex: number; count: number }[] = [];
    let currentLabel = `${dayColumns[0].monthName} ${dayColumns[0].year}`;
    let startIndex = 0;
    let count = 0;

    for (let i = 0; i < dayColumns.length; i++) {
      const colLabel = `${dayColumns[i].monthName} ${dayColumns[i].year}`;
      if (colLabel === currentLabel) {
        count++;
      } else {
        groups.push({ label: currentLabel, startIndex, count });
        currentLabel = colLabel;
        startIndex = i;
        count = 1;
      }
    }
    groups.push({ label: currentLabel, startIndex, count });

    return groups.map((g) => ({
      label: g.label,
      startPercent: (g.startIndex / totalDays) * 100,
      widthPercent: (g.count / totalDays) * 100,
    }));
  }, [dayColumns, totalDays]);

  // Single-pass O(N) grouping and telemetry computation
  const { coordinatorGroups, flatSortedLeads, metrics } = useMemo(() => {
    let overdueCount = 0;
    let expiringCount = 0;
    let validRateCount = 0;

    const coordMap = new Map<
      string,
      { coordinator: string; branch: string; leads: LeadTrackerItem[]; overdueCount: number; expiringCount: number }
    >();

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rep = lead.assigned_to?.trim() || 'Unassigned';
      const followup = getFollowupStatus(lead.next_followup_date, lead.status, activeTodayStr);
      const rateInfo = getRateValidityInfo(lead, activeTodayStr);

      const isOverdue = followup === 'overdue';
      const isExpiring = rateInfo.status === 'expiring_soon';
      if (isOverdue) overdueCount++;
      if (isExpiring) expiringCount++;
      if (rateInfo.status === 'valid') validRateCount++;

      let group = coordMap.get(rep);
      if (!group) {
        group = {
          coordinator: rep,
          branch: lead.branch || 'Mumbai',
          leads: [],
          overdueCount: 0,
          expiringCount: 0,
        };
        coordMap.set(rep, group);
      }
      group.leads.push(lead);
      if (isOverdue) group.overdueCount++;
      if (isExpiring) group.expiringCount++;
    }

    const groups: CoordinatorGroup[] = Array.from(coordMap.values()).sort((a, b) => {
      // Prioritize coordinators with overdue follow-ups, then lead count
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      return b.leads.length - a.leads.length;
    });

    // Urgency-ranked flat list: Overdue > Due Today > Expiring Rates > Scheduled > Others
    const flatList = [...leads].sort((a, b) => {
      const fuA = getFollowupStatus(a.next_followup_date, a.status, activeTodayStr);
      const fuB = getFollowupStatus(b.next_followup_date, b.status, activeTodayStr);

      const scoreLead = (lead: LeadTrackerItem, fu: string): number => {
        if (fu === 'overdue') {
          const delta = (parseUtcDate(activeTodayStr)! - (parseUtcDate(lead.next_followup_date) || 0)) / MS_PER_DAY;
          return 10000 + delta;
        }
        if (fu === 'due_today') return 5000;
        const rv = getRateValidityInfo(lead, activeTodayStr);
        if (rv.status === 'expiring_soon') return 3000;
        if (rv.status === 'expired') return 2000;
        if (fu === 'upcoming') {
          const delta = ((parseUtcDate(lead.next_followup_date) || 0) - parseUtcDate(activeTodayStr)!) / MS_PER_DAY;
          return 1000 - Math.min(delta, 999);
        }
        return 0;
      };

      return scoreLead(b, fuB) - scoreLead(a, fuA);
    });

    return {
      coordinatorGroups: groups,
      flatSortedLeads: flatList,
      metrics: { overdueCount, expiringCount, validRateCount },
    };
  }, [leads, activeTodayStr]);

  // Today marker percentage calculation
  const todayMarkerPercent = ((pastDays + 0.5) / totalDays) * 100;

  // Timeline track minimum pixel width per day for high readability
  const minTimelineWidth = useMemo(() => {
    switch (horizonWindow) {
      case 14:
        return 'min-w-[700px]';
      case 60:
        return 'min-w-[1280px]';
      case 30:
      default:
        return 'min-w-[960px]';
    }
  }, [horizonWindow]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        data-testid="gantt-loading-skeleton"
        className={`border border-slate-200 rounded-xl bg-white shadow-xs p-6 space-y-4 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-56 bg-slate-200 rounded-md" />
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-slate-200 rounded-lg" />
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
          </div>
        </div>
        <div className="h-10 bg-slate-100 rounded-lg w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-14 w-80 bg-slate-100 rounded-lg shrink-0" />
              <div className="h-14 flex-1 bg-slate-50 border border-slate-100 rounded-lg relative overflow-hidden">
                <div
                  className="h-7 bg-slate-200 rounded absolute top-3.5"
                  style={{ left: `${15 + i * 10}%`, width: `${25 + (i % 3) * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state handling
  if (!leads || leads.length === 0) {
    return (
      <div
        data-testid="gantt-empty-state"
        className={`border border-dashed border-slate-300 rounded-xl bg-white p-12 text-center shadow-2xs ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          No Freight Leads Found
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          No tracked shipments or shipper quotes match the current branch, coordinator, or stage filters.
        </p>
        {emptyStateAction && <div>{emptyStateAction}</div>}
      </div>
    );
  }

  return (
    <div
      data-testid="lead-tracker-gantt"
      className={`flex-1 min-h-0 flex flex-col overflow-hidden space-y-2.5 ${className}`}
    >
      {/* 1. Gantt Controls Bar (Horizon Selector + Grouping Selector + Summary KPIs) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Window & Grouping Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Horizon Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              Horizon:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {([14, 30, 60] as HorizonWindow[]).map((windowVal) => {
                const active = horizonWindow === windowVal;
                return (
                  <button
                    key={windowVal}
                    type="button"
                    data-testid={`gantt-horizon-${windowVal}`}
                    onClick={() => setHorizonWindow(windowVal)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      active
                        ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {`${windowVal} Days`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouping Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Layout:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                data-testid="gantt-grouping-coordinator"
                onClick={() => setGrouping('coordinator')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  grouping === 'coordinator'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Coordinator
              </button>
              <button
                type="button"
                data-testid="gantt-grouping-flat"
                onClick={() => setGrouping('flat')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  grouping === 'flat'
                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Flat Urgency List
              </button>
            </div>
          </div>
        </div>

        {/* Right: Telemetry chips */}
        <div className="flex items-center gap-2 text-xs">
          {metrics.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              {`${metrics.overdueCount} Overdue Follow-ups`}
            </span>
          )}
          {metrics.expiringCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
              <Clock className="w-3 h-3 text-amber-600" />
              {`${metrics.expiringCount} Rates Expiring`}
            </span>
          )}
          <span className="text-slate-500 text-[11px] hidden md:inline">
            Showing <strong className="text-slate-700">{leads.length}</strong> tracked leads
          </span>
        </div>
      </div>

      {/* 2. Comprehensive Freight Logistics Legend Bar */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        {/* Transport Modes */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mr-1">
            Modes:
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Air Freight
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> Ocean FCL
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-600" /> Ocean LCL
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600" /> Courier
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600" /> CHA Brokerage
          </span>
        </div>

        {/* Cadence Pins & Validity States */}
        <div className="flex items-center flex-wrap gap-2 text-[10px]">
          <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mr-0.5">
            Cadence &amp; Rate Validity:
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white" />
            <span>Overdue Follow-up</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
            <span>Due Today / Expiring</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white" />
            <span>Upcoming Cadence</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Flag className="w-3 h-3 text-emerald-600" />
            <span>Target Shipment</span>
          </span>
        </div>
      </div>

      {/* 3. Gantt Timeline Viewport (Scrollable with Sticky Header and Left Column) */}
      <div className="flex-1 min-h-0 border border-slate-200 rounded-xl bg-white shadow-xs overflow-auto">
        <div className="min-w-fit">
          {/* Header Row: Column Titles & Timeline Dates */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-40">
            {/* Sticky Lead / Shipper Header */}
            <div className="w-80 shrink-0 px-4 py-2 flex items-center justify-between font-semibold text-xs text-slate-700 uppercase tracking-wider sticky left-0 top-0 z-50 bg-slate-50 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Lead / Shipper
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                click to edit
              </span>
            </div>

            {/* Time Axis Header Area */}
            <div className={`flex-1 relative ${minTimelineWidth} flex flex-col justify-end`}>
              {/* Top Month Header Band */}
              <div className="h-6 border-b border-slate-200/80 relative flex items-center">
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    style={{ left: `${mg.startPercent}%`, width: `${mg.widthPercent}%` }}
                    className="absolute text-[11px] font-bold text-slate-700 px-2 truncate border-r border-slate-200/60"
                  >
                    {mg.label}
                  </div>
                ))}
              </div>

              {/* Day Header Ticks */}
              <div className="h-7 flex relative">
                {dayColumns.map((col) => (
                  <div
                    key={col.index}
                    className={`flex-1 border-r border-slate-200/60 flex flex-col items-center justify-center text-[10px] ${
                      col.isWeekend ? 'bg-slate-100/50 text-slate-400' : 'text-slate-600'
                    } ${col.isToday ? 'bg-blue-100/70 text-blue-900 font-bold' : ''}`}
                    title={col.dateStr}
                  >
                    <span className="leading-tight text-[9px]">{col.weekday}</span>
                    <span className="leading-tight font-semibold">{col.dayOfMonth}</span>
                  </div>
                ))}
              </div>

              {/* Prominent Sticky TODAY Pill Marker in Header */}
              <div
                data-testid="gantt-today-marker"
                className="absolute top-1 -translate-x-1/2 z-20 pointer-events-none"
                style={{ left: `${todayMarkerPercent}%` }}
              >
                <span
                  data-testid="gantt-today-pill"
                  className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider shadow-sm"
                >
                  TODAY
                </span>
              </div>
            </div>
          </div>

          {/* Body Rows */}
          {grouping === 'coordinator' ? (
            // Group by Sales Coordinator View
            <div className="divide-y divide-slate-100">
              {coordinatorGroups.map((group) => {
                const isCollapsed = !!collapsedGroups[group.coordinator];
                return (
                  <div key={group.coordinator} className="group/coord">
                    {/* Coordinator Header Bar */}
                    <div
                      onClick={() => toggleGroupCollapse(group.coordinator)}
                      className="flex items-center justify-between px-3.5 py-2 bg-slate-100/95 border-y border-slate-200 hover:bg-slate-200/80 cursor-pointer transition-colors sticky left-0 z-25"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          aria-label={`Toggle ${group.coordinator}`}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="font-bold text-xs text-slate-800">
                          {group.coordinator}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({group.branch} Branch)
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                          {`${group.leads.length} ${group.leads.length === 1 ? 'lead' : 'leads'}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {group.overdueCount > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            {`${group.overdueCount} overdue`}
                          </span>
                        )}
                        {group.expiringCount > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-amber-700" />
                            {`${group.expiringCount} expiring`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Coordinator Leads Rows */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {group.leads.map((lead) => (
                          <LeadTrackerGanttRow
                            key={lead.id}
                            lead={lead}
                            dayColumns={dayColumns}
                            startUtc={startUtc}
                            totalDays={totalDays}
                            todayMarkerPercent={todayMarkerPercent}
                            activeTodayStr={activeTodayStr}
                            minTimelineWidth={minTimelineWidth}
                            grouping={grouping}
                            onSelectLead={onSelectLead}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat Urgency List View
            <div className="divide-y divide-slate-100">
              {flatSortedLeads.map((lead) => (
                <LeadTrackerGanttRow
                  key={lead.id}
                  lead={lead}
                  dayColumns={dayColumns}
                  startUtc={startUtc}
                  totalDays={totalDays}
                  todayMarkerPercent={todayMarkerPercent}
                  activeTodayStr={activeTodayStr}
                  minTimelineWidth={minTimelineWidth}
                  grouping={grouping}
                  onSelectLead={onSelectLead}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
