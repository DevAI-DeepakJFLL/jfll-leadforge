import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Download,
  Loader2,
  Search,
  X,
} from 'lucide-react';

export interface TableActionBarProps {
  selectedCount: number;
  totalOnPage: number;
  totalCount?: number;
  isAllOnPageSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleSelectAllPage?: () => void;
  onSelectAllPage?: () => void;
  onSelectAllTotal?: () => void;
  onDeselectAll?: () => void;
  onExport?: () => void | Promise<void>;
  isExporting?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
  currentUser?: { role?: string } | null;
  isViewer?: boolean;
}

export const TableActionBar: React.FC<TableActionBarProps> = ({
  selectedCount,
  totalOnPage,
  totalCount,
  isAllOnPageSelected = false,
  isIndeterminate = false,
  onToggleSelectAllPage,
  onSelectAllPage,
  onSelectAllTotal,
  onDeselectAll,
  onExport,
  isExporting = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search leads by name, title, company...',
  className = '',
  currentUser,
  isViewer,
}) => {
  const isViewerUser = Boolean(isViewer || currentUser?.role === 'Viewer');
  const [activeMenu, setActiveMenu] = useState<'select' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const lastEmittedRef = useRef(searchQuery);

  // Sync external prop changes (e.g. from filter chips or clear all)
  useEffect(() => {
    if (searchQuery !== lastEmittedRef.current) {
      lastEmittedRef.current = searchQuery;
      setLocalQuery(searchQuery);
    }
  }, [searchQuery]);

  // Debounce user typing
  useEffect(() => {
    if (localQuery === lastEmittedRef.current) return;
    const timer = setTimeout(() => {
      lastEmittedRef.current = localQuery;
      onSearchChange?.(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  const handleClear = () => {
    setLocalQuery('');
    lastEmittedRef.current = '';
    onSearchChange?.('');
    searchInputRef.current?.focus();
  };

  const hasSelection = selectedCount > 0;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
      ref={menuRef}
      className={`h-11 border-b border-surface-border bg-slate-50/60 px-4 flex items-center justify-between text-xs select-none transition-colors ${className}`}
      aria-label="Table Actions Toolbar"
    >
      {/* Left: Bulk Selection & Essential Sourcing Tools */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 min-w-0">
        {/* 1. Selection Checkbox Dropdown */}
        <div className="relative inline-flex items-center rounded-md border border-slate-200 bg-white shadow-2xs shrink-0">
          <label className="flex items-center px-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Select all visible leads"
              checked={isAllOnPageSelected}
              ref={(input) => {
                if (input) input.indeterminate = isIndeterminate;
              }}
              onChange={() => onToggleSelectAllPage?.()}
              className="w-3.5 h-3.5 text-apollo border-slate-300 rounded focus:ring-apollo/30 focus:ring-offset-0 cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'select' ? null : 'select')}
            className="flex items-center pr-2 pl-0.5 py-1 text-slate-600 hover:text-slate-900 focus:outline-none border-l border-slate-100"
            aria-expanded={activeMenu === 'select'}
            aria-haspopup="true"
          >
            <span className="font-medium mr-1 text-xs">
              {hasSelection ? `${selectedCount.toLocaleString()} Selected` : 'Select'}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'select' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Selection Dropdown */}
          {activeMenu === 'select' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onSelectAllPage?.();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
              >
                <span>Select this page</span>
                <span className="text-[11px] text-slate-400">({totalOnPage})</span>
              </button>
              {totalCount && totalCount > totalOnPage && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectAllTotal?.();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
                >
                  <span>Select all matching</span>
                  <span className="text-[11px] text-slate-400">({totalCount.toLocaleString()})</span>
                </button>
              )}
              {hasSelection && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      onDeselectAll?.();
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium"
                  >
                    Deselect all
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Bar placed directly next to the Select option */}
        {onSearchChange && (
          <div className="relative w-48 sm:w-60 md:w-72 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-12 py-1 text-xs bg-white hover:bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-apollo rounded-md focus:outline-none focus:ring-2 focus:ring-apollo/15 transition-all shadow-2xs"
              />
              {localQuery ? (
                <button
                  type="button"
                  onClick={handleClear}
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

        {/* Export (CSV) */}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting || isViewerUser}
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 ${
            isViewerUser
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 cursor-pointer disabled:opacity-50'
          }`}
          title={
            isViewerUser
              ? 'Viewing Mode · Contact Admin for Export Privileges'
              : 'Download leads dataset as RFC-4180 CSV'
          }
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 text-apollo animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span>{isExporting ? 'Exporting...' : hasSelection ? `Export (${selectedCount})` : 'Export All'}</span>
        </button>
      </div>

      {/* Right: Selected Summary */}
      <div className="hidden sm:flex items-center text-slate-500 text-[11px] gap-2">
        {hasSelection ? (
          <span className="font-medium text-slate-700">
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} ready for export or list save
          </span>
        ) : (
          <span>Click checkboxes to batch export or save</span>
        )}
      </div>
    </div>
  );
};

export default TableActionBar;
