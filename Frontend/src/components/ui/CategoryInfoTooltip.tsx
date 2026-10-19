import React, { useState, useRef, useEffect } from 'react';
import { Info, X, Lightbulb, CheckCircle2 } from 'lucide-react';

export interface CategoryInfoTooltipProps {
  title: string;
  description: string;
  criteria?: string[];
  actionTip?: string;
  badge?: {
    text: string;
    variant?: 'amber' | 'emerald' | 'blue' | 'purple' | 'slate';
  };
  align?: 'left' | 'center' | 'right';
  className?: string;
  iconClassName?: string;
}

export const CategoryInfoTooltip: React.FC<CategoryInfoTooltipProps> = ({
  title,
  description,
  criteria = [],
  actionTip,
  badge,
  align = 'left',
  className = '',
  iconClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  const badgeColors = {
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const alignmentClasses = {
    left: 'left-0 sm:left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 sm:right-0',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={handleToggleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleClick(e as any);
          }
        }}
        aria-label={`More information about ${title}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 focus:outline-none focus:ring-2 focus:ring-apollo/40 transition-colors cursor-pointer inline-flex items-center justify-center ${iconClassName}`}
      >
        <Info className="w-3.5 h-3.5" />
      </span>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`${title} description`}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-2 z-50 w-72 sm:w-80 p-3.5 bg-white/98 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xl text-left select-text animate-in fade-in zoom-in-95 duration-150 ${alignmentClasses[align]}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-900 leading-tight">
                {title}
              </span>
              {badge && (
                <span
                  className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded-md border leading-none ${
                    badgeColors[badge.variant || 'blue']
                  }`}
                >
                  {badge.text}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-[11.5px] text-slate-600 leading-relaxed mb-2.5">
            {description}
          </p>

          {/* Criteria Bullet Points */}
          {criteria.length > 0 && (
            <div className="mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Criteria
              </span>
              <ul className="space-y-1">
                {criteria.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-snug"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Sales Tip */}
          {actionTip && (
            <div className="flex items-start gap-1.5 text-[10.5px] text-slate-500 bg-amber-50/60 p-2 rounded-lg border border-amber-100/70">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-tight text-slate-700 font-medium">
                {actionTip}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
