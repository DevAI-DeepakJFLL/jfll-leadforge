import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Target, PauseCircle, ShieldAlert, AlertCircle } from 'lucide-react';
import { TierSegmentStatus, TierScoreBreakdown } from '@/types/tierSegmentation';

export interface TierScoreBadgeProps {
  status: TierSegmentStatus;
  score: number;
  breakdown?: TierScoreBreakdown;
  onClick?: () => void;
  className?: string;
}

export const TierScoreBadge: React.FC<TierScoreBadgeProps> = ({
  status,
  score,
  breakdown,
  onClick,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const getStyle = () => {
    switch (status) {
      case 'Tier A':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80',
          dot: 'bg-emerald-500',
          icon: Sparkles,
        };
      case 'Tier B':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100/80',
          dot: 'bg-blue-500',
          icon: Target,
        };
      case 'Parked':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80',
          dot: 'bg-amber-500',
          icon: PauseCircle,
        };
      case 'Excluded':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/80',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
        };
      case 'Unscored':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/80',
          dot: 'bg-slate-400',
          icon: AlertCircle,
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) {
            onClick();
          } else if (breakdown) {
            setIsOpen((prev) => !prev);
          }
        }}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-apollo/40 ${style.bg}`}
        title="Click to view SOP scoring breakdown"
        aria-label={`${status} with score ${score}`}
        aria-expanded={isOpen}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="font-semibold">{status}</span>
        {status !== 'Excluded' && status !== 'Unscored' && (
          <span className="font-mono text-[11px] font-bold opacity-90">· {score}</span>
        )}
      </button>

      {/* Popover Breakdown if triggered */}
      {isOpen && breakdown && (
        <div
          role="dialog"
          aria-label="Score Breakdown"
          className="absolute left-0 bottom-full mb-1.5 z-50 w-64 p-3 bg-white rounded-lg shadow-xl border border-slate-200 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-semibold">
            <span>SOP Score Breakdown</span>
            <span className="text-apollo font-mono font-bold">{score} / 100</span>
          </div>
          <div className="space-y-1 pt-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Shipment Frequency:</span>
              <span className="font-mono font-semibold">{breakdown.frequency_score} / 20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Freight Control (Incoterm):</span>
              <span className="font-mono font-semibold">{breakdown.freight_control_score} / 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Trade Lane Fit:</span>
              <span className="font-mono font-semibold">{breakdown.lane_score} / 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Commodity Fit:</span>
              <span className="font-mono font-semibold">{breakdown.commodity_score} / 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Transport Mode:</span>
              <span className="font-mono font-semibold">{breakdown.mode_score} / 15</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Volume Trend:</span>
              <span className="font-mono font-semibold">{breakdown.volume_trend_score} / 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Shipment Recency:</span>
              <span className="font-mono font-semibold">{breakdown.recency_score} / 10</span>
            </div>
            {(breakdown.regulated_plant_bonus > 0 || breakdown.cluster_bonus > 0) && (
              <div className="pt-1 border-t border-slate-100 text-emerald-700 flex justify-between font-medium">
                <span>Bonuses (Pharma / Cluster):</span>
                <span className="font-mono font-semibold">
                  +{breakdown.regulated_plant_bonus + breakdown.cluster_bonus}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
