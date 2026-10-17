import React, { useRef, useEffect } from 'react';
import { Download, Bookmark, CheckSquare, Square, MinusSquare, Loader2, Search, X } from 'lucide-react';

export interface JfllCustomerActionBarProps {
  selectedCount: number;
  totalOnPage?: number;
  totalCount?: number;
  isAllOnPageSelected: boolean;
  isIndeterminate: boolean;
  onToggleSelectAllPage: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
  onSaveSelected?: () => void;
  isExporting?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export const JfllCustomerActionBar: React.FC<JfllCustomerActionBarProps> = ({
  selectedCount,
  totalOnPage: _totalOnPage,
  totalCount: _totalCount,
  isAllOnPageSelected,
  isIndeterminate,
  onToggleSelectAllPage,
  onDeselectAll,
  onExport,
  onSaveSelected,
  isExporting = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search customers by company, contact, phone, email...',
  className = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K keyboard shortcut to focus search input
  useEffect(() => {
    if (!onSearchChange) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  return (
    <div
      className={`min-h-11 py-1.5 px-3 sm:px-4 border-b border-surface-border bg-white flex items-center justify-between gap-2 sm:gap-3 text-xs select-none overflow-x-auto no-scrollbar ${className}`}
      aria-label="Customer Table Action Bar"
    >
      {/* Left: Checkbox & Multi-Selection Counter + Search Bar placed next to Select */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 pr-1 sm:pr-2">
        <button
          onClick={onToggleSelectAllPage}
          className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 focus:outline-none shrink-0 cursor-pointer"
          title={isAllOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
          aria-label="Toggle select all on page"
        >
          {isAllOnPageSelected ? (
            <CheckSquare className="w-4 h-4 text-apollo" />
          ) : isIndeterminate ? (
            <MinusSquare className="w-4 h-4 text-apollo" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          <span className="font-medium text-slate-700">
            {selectedCount > 0 ? (
              <>
                <strong className="text-slate-900">{selectedCount}</strong> Selected
              </>
            ) : (
              'Select'
            )}
          </span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 shrink-0 cursor-pointer"
          >
            Clear selection
          </button>
        )}

        {/* Subtle separator divider */}
        {onSearchChange && (
          <div className="h-4 w-[1px] bg-slate-200 shrink-0 hidden sm:block" />
        )}

        {/* Search Bar placed directly next to the Select option */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md min-w-[160px] sm:min-w-[220px]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-12 py-1 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-apollo rounded-md focus:outline-none focus:ring-2 focus:ring-apollo/15 transition-all shadow-2xs"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search input"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <span className="absolute right-2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 pointer-events-none hidden sm:inline">
                  ⌘K
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions (Export CSV, Save, List) */}
      <div className="flex items-center space-x-2 shrink-0">
        {selectedCount > 0 && onSaveSelected && (
          <button
            onClick={onSaveSelected}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            <span>Save ({selectedCount})</span>
          </button>
        )}

        <button
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-apollo hover:bg-apollo-600 rounded shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          title="Export filtered records to clean CSV"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>
    </div>
  );
};

export default JfllCustomerActionBar;
