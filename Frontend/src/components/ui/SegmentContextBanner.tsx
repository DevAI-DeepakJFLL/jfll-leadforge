import React, { useState, useEffect } from 'react';
import { Info, X, Lightbulb, ChevronRight } from 'lucide-react';

export interface SegmentContextBannerProps {
  title: string;
  count?: number | string;
  description: string;
  criteria?: string;
  actionTip?: string;
  icon?: React.ElementType;
  variant?: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
  storageKey?: string;
  className?: string;
}

export const SegmentContextBanner: React.FC<SegmentContextBannerProps> = ({
  title,
  count,
  description,
  criteria,
  actionTip,
  icon: Icon = Info,
  variant = 'blue',
  storageKey,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Reset dismissed state whenever tab/title changes so the active category info is always presented
    setIsDismissed(false);
    if (storageKey) {
      try {
        sessionStorage.removeItem(`banner_dismissed_${storageKey}`);
      } catch {
        // Ignored
      }
    }
  }, [storageKey, title]);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const styles = {
    amber: {
      bg: 'bg-amber-50/75 border-amber-200/80 text-amber-950',
      iconBg: 'bg-amber-100 text-amber-700',
      badge: 'bg-amber-100/90 text-amber-900 border-amber-200',
      actionBg: 'bg-amber-100/50 text-amber-900',
    },
    emerald: {
      bg: 'bg-emerald-50/75 border-emerald-200/80 text-emerald-950',
      iconBg: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-100/90 text-emerald-900 border-emerald-200',
      actionBg: 'bg-emerald-100/50 text-emerald-900',
    },
    blue: {
      bg: 'bg-blue-50/75 border-blue-200/80 text-blue-950',
      iconBg: 'bg-blue-100 text-blue-700',
      badge: 'bg-blue-100/90 text-blue-900 border-blue-200',
      actionBg: 'bg-blue-100/50 text-blue-900',
    },
    purple: {
      bg: 'bg-purple-50/75 border-purple-200/80 text-purple-950',
      iconBg: 'bg-purple-100 text-purple-700',
      badge: 'bg-purple-100/90 text-purple-900 border-purple-200',
      actionBg: 'bg-purple-100/50 text-purple-900',
    },
    slate: {
      bg: 'bg-slate-50 border-slate-200/80 text-slate-900',
      iconBg: 'bg-slate-100 text-slate-700',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      actionBg: 'bg-slate-100/70 text-slate-800',
    },
  };

  const currentStyle = styles[variant] || styles.blue;

  if (isDismissed) {
    return (
      <div
        className={`px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-xs text-slate-500 select-none ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${currentStyle.iconBg}`}>
            <Icon className="w-2.5 h-2.5" />
          </div>
          <span className="font-semibold text-slate-700 truncate">{title}</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">· Info bar minimized</span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-xs font-semibold text-apollo hover:text-apollo-700 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>Show info</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`px-3 sm:px-4 py-2 border-b text-xs transition-all select-none ${currentStyle.bg} ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        {/* Left: Icon & Description */}
        <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${currentStyle.iconBg}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-900 shrink-0">
              {title}
            </span>

            {count !== undefined && (
              <span
                className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full border shrink-0 ${currentStyle.badge}`}
              >
                {typeof count === 'number' ? count.toLocaleString() : count}
              </span>
            )}

            <span className="text-slate-600 font-normal">{description}</span>

            {/* Toggle extra details on desktop/mobile */}
            {(criteria || actionTip) && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-slate-500 hover:text-slate-800 underline font-medium text-[11px] cursor-pointer inline-flex items-center gap-0.5"
              >
                <span>{isExpanded ? 'Show less' : 'Details & Guidance'}</span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Right: Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 rounded p-1 shrink-0 cursor-pointer focus:outline-none"
          aria-label="Dismiss banner"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Details Pane */}
      {isExpanded && (criteria || actionTip) && (
        <div className="mt-2 pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] animate-in fade-in duration-100">
          {criteria && (
            <div className="flex items-start gap-1.5">
              <span className="font-semibold text-slate-700 shrink-0">
                Criteria:
              </span>
              <span className="text-slate-600">{criteria}</span>
            </div>
          )}

          {actionTip && (
            <div
              className={`flex items-start gap-1.5 p-1.5 rounded-md ${currentStyle.actionBg}`}
            >
              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span className="font-medium text-slate-800">{actionTip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
