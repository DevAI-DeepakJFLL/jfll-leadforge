import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Plane,
  Ship,
  Thermometer,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { GatewayHubId, MonthlyRecord } from '@/types/freightCommodities';
import {
  TimelineBar,
  TimelineHubTrack,
  buildTimelineTracks,
} from '@/data/commodityVisualData';

export interface CommoditySwimlaneTimelineProps {
  selectedMonth: number;
  selectedHub: GatewayHubId;
  onMonthChange: (month: number) => void;
  onHubChange: (hub: GatewayHubId) => void;
  onSelectRecord?: (record: MonthlyRecord) => void;
  urgencyFilter?: 'all' | 'active' | 'upcoming';
  searchQuery?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CommoditySwimlaneTimeline: React.FC<CommoditySwimlaneTimelineProps> = ({
  selectedMonth,
  selectedHub,
  onMonthChange,
  onHubChange,
  onSelectRecord,
  urgencyFilter = 'all',
  searchQuery = '',
  className = '',
}) => {
  const [hoveredBar, setHoveredBar] = useState<TimelineBar | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compile timeline tracks based on current filters
  const tracks: TimelineHubTrack[] = useMemo(() => {
    return buildTimelineTracks(selectedHub, urgencyFilter, searchQuery);
  }, [selectedHub, urgencyFilter, searchQuery]);

  const handleBarMouseEnter = (bar: TimelineBar) => {
    setHoveredBar(bar);
  };

  const handleBarMouseLeave = () => {
    setHoveredBar(null);
  };

  const handleBarClick = (bar: TimelineBar) => {
    onMonthChange(bar.month);
    onHubChange(bar.hubId);
    if (onSelectRecord) {
      onSelectRecord(bar.record);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5 select-none ${className}`}
      role="region"
      aria-label="Interactive Freight Commodity Timeline"
    >
      {/* 1. Header & Interactive Month Scrubber */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Annual Freight Commodity Swimlane
              <span className="text-[10px] font-normal lowercase font-sans text-slate-400">
                (Click any commodity bar to lock Month &amp; open Playbook)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Interactive 12-month timeline mapping harvest surges, booking windows, and cold-chain temperature regimes
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block shadow-2xs" />
            Active Peak Surge
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-500 inline-block shadow-2xs" />
            Lead Booking Window
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
            Selected Month
          </span>
          <span className="flex items-center gap-1.5">
            <Thermometer className="w-3 h-3 text-emerald-600" />
            Cold-Chain Temp
          </span>
        </div>
      </div>

      {/* 2. Interactive Month Scrubber Strip (1-12) */}
      <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase px-1 shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Timeline Scrubber:</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {MONTH_NAMES.map((mName, idx) => {
            const monthNum = idx + 1;
            const isSelected = selectedMonth === monthNum;
            return (
              <button
                key={mName}
                type="button"
                onClick={() => onMonthChange(monthNum)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title={`Jump to Month ${monthNum}: ${FULL_MONTH_NAMES[idx]}`}
                aria-pressed={isSelected}
              >
                <span>{mName}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Swimlane Tracks Grid */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-slate-900/[0.01]">
        <div className="min-w-[860px]">
          {/* Header Row: Gateways & 12 Months */}
          <div className="grid grid-cols-12 gap-1 px-2 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 select-none">
            <div className="col-span-2 text-left px-2 font-mono uppercase tracking-wider text-[11px] text-slate-500">
              Gateway Hub
            </div>
            <div className="col-span-10 grid grid-cols-12 gap-1 text-center font-mono text-[11px]">
              {MONTH_NAMES.map((m, idx) => (
                <div
                  key={m}
                  onClick={() => onMonthChange(idx + 1)}
                  className={`py-0.5 rounded cursor-pointer transition-colors ${
                    selectedMonth === idx + 1
                      ? 'bg-blue-100 text-blue-900 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  title={`View ${FULL_MONTH_NAMES[idx]}`}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Hub Swimlane Tracks */}
          <div className="divide-y divide-slate-100">
            {tracks.map((track) => {
              const isHubSelected = selectedHub === track.hubId;

              return (
                <div
                  key={track.hubId}
                  className={`grid grid-cols-12 gap-1 px-2 py-2.5 items-center transition-colors hover:bg-blue-50/20 ${
                    isHubSelected ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Left Hub Label */}
                  <div
                    onClick={() => onHubChange(isHubSelected ? 'ALL' : track.hubId)}
                    className="col-span-2 px-2 flex items-center justify-between cursor-pointer group"
                    title={`Filter by ${track.hubName}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${
                          isHubSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-800'
                        }`}
                      >
                        {track.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                        {track.hubName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {track.region}
                    </span>
                  </div>

                  {/* 12-Month Commodity Cells */}
                  <div className="col-span-10 grid grid-cols-12 gap-1 text-center">
                    {track.bars.map((bar) => {
                      const isCurrentMonth = bar.month === selectedMonth;
                      const isActiveSurge = bar.status === 'active';
                      const isUpcoming = bar.status === 'upcoming';
                      const isHovered = hoveredBar?.id === bar.id;

                      let barStyles = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300';
                      if (isActiveSurge) {
                        barStyles =
                          'bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-2xs border-emerald-700';
                      } else if (isUpcoming) {
                        barStyles =
                          'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 font-semibold';
                      } else if (bar.priority === 'HIGH') {
                        barStyles =
                          'bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100 font-medium';
                      }

                      return (
                        <div
                          key={bar.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${bar.hubId} ${bar.monthName}: ${bar.label}`}
                          title={`${bar.hubId} · ${bar.monthName}: ${bar.label} (${isActiveSurge ? 'Peak Harvest Surge' : isUpcoming ? 'Lead Booking Window' : 'Steady Flow'})${bar.temp ? ` | Temp: ${bar.temp}` : ''} | Equip: ${bar.equipment} — Click to lock month & open Playbook`}
                          onClick={() => handleBarClick(bar)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleBarClick(bar);
                            }
                          }}
                          onMouseEnter={() => handleBarMouseEnter(bar)}
                          onMouseLeave={handleBarMouseLeave}
                          className={`relative p-1 rounded-md text-[10px] cursor-pointer transition-all border flex flex-col items-center justify-center min-h-[46px] ${barStyles} ${
                            isCurrentMonth
                              ? 'ring-2 ring-blue-600 ring-offset-1 z-10 scale-102 shadow-xs'
                              : isHovered
                              ? 'scale-102 shadow-xs ring-2 ring-blue-400 ring-offset-1 z-10'
                              : 'hover:scale-102 hover:shadow-2xs'
                          }`}
                        >
                          {/* Commodity Title */}
                          <div className="font-semibold text-[10px] truncate max-w-full leading-tight">
                            {bar.label}
                          </div>

                          {/* Mini badges row */}
                          <div className="mt-0.5 flex items-center gap-1 text-[9px] opacity-90 truncate">
                            {bar.mode === 'Air' ? (
                              <Plane className="w-2.5 h-2.5 shrink-0" />
                            ) : bar.mode === 'Ocean' ? (
                              <Ship className="w-2.5 h-2.5 shrink-0" />
                            ) : null}
                            {isActiveSurge ? (
                              <span className="font-mono text-[8px] font-extrabold uppercase tracking-tight px-1 py-0.2 rounded bg-emerald-700/90 text-white">
                                PEAK
                              </span>
                            ) : isUpcoming ? (
                              <span className="font-mono text-[8px] font-bold uppercase tracking-tight px-1 py-0.2 rounded bg-amber-200 text-amber-950">
                                LEAD
                              </span>
                            ) : (
                              <span className="font-mono text-[8px] font-medium text-slate-500">
                                FLOW
                              </span>
                            )}
                            {bar.temp && (
                              <span className="font-mono text-[8px] font-bold">
                                {bar.temp.split(' ')[0]}
                              </span>
                            )}
                          </div>

                          {/* Active / Lead Pulsing Beacon */}
                          {isActiveSurge && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                          )}
                          {isUpcoming && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Docked Live Context Inspector (Non-Intrusive, Zero Grid Blocking) */}
      <div
        className={`pt-2 border-t border-slate-100 transition-all rounded-lg border p-2.5 min-h-[50px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
          hoveredBar
            ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
            : 'bg-slate-50/70 border-slate-200/70'
        }`}
        aria-live="polite"
      >
        {hoveredBar ? (
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] shrink-0 shadow-2xs">
              {hoveredBar.hubId} · {hoveredBar.monthName}
            </span>
            <span className="font-bold text-xs text-slate-900 shrink-0">
              {hoveredBar.label}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight shrink-0 ${
                hoveredBar.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : hoveredBar.status === 'upcoming'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {hoveredBar.status === 'active' ? 'Peak Harvest Surge' : hoveredBar.status === 'upcoming' ? 'Lead Booking Window' : 'Steady Flow'}
            </span>
            {hoveredBar.temp && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                <Thermometer className="w-3 h-3 text-emerald-600" />
                <span>{hoveredBar.temp}</span>
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 hidden md:inline">
              {hoveredBar.equipment}
            </span>
            {hoveredBar.tradeLanes && hoveredBar.tradeLanes !== '-' && (
              <span className="text-[11px] text-slate-500 truncate max-w-[260px] hidden lg:inline" title={hoveredBar.tradeLanes}>
                Lanes: {hoveredBar.tradeLanes}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
              {`Selected: ${FULL_MONTH_NAMES[selectedMonth - 1]} · ${selectedHub === 'ALL' ? 'All 8 Gateways' : selectedHub}`}
            </span>
            <span className="text-slate-400 hidden md:inline">•</span>
            <span className="text-[11px] text-slate-500 hidden md:inline truncate">
              Hover any commodity bar for live specs, or click to lock month &amp; view operational playbook.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (hoveredBar) {
                handleBarClick(hoveredBar);
              } else {
                const currentRec = tracks
                  .flatMap((t) => t.bars)
                  .find((b) => b.month === selectedMonth && (selectedHub === 'ALL' || b.hubId === selectedHub));
                if (currentRec && onSelectRecord) {
                  onSelectRecord(currentRec.record);
                }
              }
            }}
            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <span>{hoveredBar ? 'Lock & View Playbook' : 'View Month Playbook'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
