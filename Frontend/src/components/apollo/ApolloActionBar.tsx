import React, { useRef, useEffect } from 'react';
import { Download, CheckSquare, Square, MinusSquare, Search, X, Loader2 } from 'lucide-react';

export interface ApolloActionBarProps {
  selectedCount: number;
  totalOnPage?: number;
  totalCount?: number;
  isAllOnPageSelected: boolean;
  isIndeterminate: boolean;
  onToggleSelectAllPage: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
  isExporting?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export const ApolloActionBar: React.FC<ApolloActionBarProps> = ({
  selectedCount,
  totalOnPage: _totalOnPage,
  totalCount: _totalCount,
  isAllOnPageSelected,
  isIndeterminate,
  onToggleSelectAllPage,
  onDeselectAll,
  onExport,
  isExporting = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search Apollo by company, domain, keywords, cargo vertical...',
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
      aria-label="Apollo Table Action Bar"
    >
      {/* Left: Checkbox & Multi-Selection Counter + Search Bar placed next to Select */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 pr-1 sm:pr-2">
        <button
          onClick={onToggleSelectAllPage}
          className="flex items-center space-x-1.5 py-1 px-1.5 rounded hover:bg-slate-100 text-slate-700 transition-colors focus:outline-none shrink-0"
          title={isAllOnPageSelected ? 'Deselect page' : 'Select all on page'}
          aria-label={isAllOnPageSelected ? 'Deselect page' : 'Select all on page'}
        >
          {isAllOnPageSelected ? (
            <CheckSquare className="w-4 h-4 text-apollo" />
          ) : isIndeterminate ? (
            <MinusSquare className="w-4 h-4 text-apollo" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          <span className="font-medium text-xs">
            {selectedCount > 0 ? (
              <span className="text-apollo font-semibold">{selectedCount} Selected</span>
            ) : (
              <span className="text-slate-600">Select</span>
            )}
          </span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            className="text-[11px] text-slate-400 hover:text-slate-600 underline shrink-0 hidden sm:inline"
          >
            Clear
          </button>
        )}

        {/* Search Bar placed directly next to select option */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-sm sm:max-w-md min-w-[140px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-12 sm:pr-14 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-apollo focus:border-apollo transition-all placeholder:text-slate-400"
              aria-label="Search Apollo leads"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-200/60 border border-slate-300/60 px-1 py-0.2 rounded pointer-events-none">
                ⌘K
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: CSV Export & Action Buttons */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="h-8 px-2.5 sm:px-3 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs shadow-2xs"
          title="Export displayed or selected leads to CSV"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-apollo" />
          ) : (
            <Download className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </div>
  );
};
