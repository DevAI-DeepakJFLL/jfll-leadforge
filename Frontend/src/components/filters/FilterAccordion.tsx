import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterAccordionProps {
  id?: string;
  icon: React.ReactNode;
  label: string;
  activeCount?: number;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const FilterAccordion: React.FC<FilterAccordionProps> = ({
  icon,
  label,
  activeCount = 0,
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onToggle,
  onClear,
  children,
  className = '',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={`border-b border-surface-border last:border-b-0 ${className}`}>
      <div className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-slate-700 hover:bg-slate-50/80 transition-colors group">
        <button
          type="button"
          onClick={handleToggle}
          className="flex-1 flex items-center space-x-2.5 min-w-0 pr-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo rounded cursor-pointer"
          aria-expanded={isOpen}
          aria-label={isOpen ? `Collapse ${label} section` : `Expand ${label} section`}
        >
          {/* Category Icon */}
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 flex items-center justify-center w-4 h-4">
            {icon}
          </span>

          {/* Category Label */}
          <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900 truncate">
            {label}
          </span>

          {/* Active count badge */}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold text-apollo bg-apollo-50 border border-apollo-200 rounded-full shrink-0">
              {activeCount}
            </span>
          )}
        </button>

        <div className="flex items-center space-x-1 shrink-0">
          {activeCount > 0 && onClear && isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-[10px] text-slate-400 hover:text-red-500 font-medium px-1 hover:underline transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
              title={`Clear ${label} filters`}
              aria-label={`Clear ${label} filters`}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleToggle}
            className="p-1 text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo rounded"
            aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 text-xs text-slate-600 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};

export default FilterAccordion;
