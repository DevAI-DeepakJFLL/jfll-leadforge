import React, { useState, useRef, useEffect } from 'react';
import { Download, Bookmark, CheckSquare, Square, MinusSquare, Loader2, Search, X, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { UserSession } from '@/types/auth';
import { DatamyneDatasetType } from '@/types/datamyneLead';

export interface DatamyneActionBarProps {
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
  onDownloadSummaryReport?: () => void;
  isExportingSummary?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
  currentUser?: UserSession | null;
  isViewer?: boolean;
  activeDataset?: DatamyneDatasetType;
  onChangeDataset?: (dataset: DatamyneDatasetType) => void;
}

export const DatamyneActionBar: React.FC<DatamyneActionBarProps> = ({
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
  onDownloadSummaryReport,
  isExportingSummary = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search by company, HS code, commodity, country... (e.g. 2709, Petrobras)',
  className = '',
  currentUser,
  isViewer,
  activeDataset = 'valid',
  onChangeDataset,
}) => {
  const isViewerUser = Boolean(isViewer || currentUser?.role === 'Viewer');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 300);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery !== searchQuery && onSearchChange) {
      onSearchChange(debouncedQuery);
    }
  }, [debouncedQuery, searchQuery, onSearchChange]);

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
      aria-label="DataMyne Table Action Bar"
    >
      {/* Left: Checkbox & Multi-Selection Counter + Search Bar placed next to Select */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 pr-1 sm:pr-2">
        <button
          onClick={onToggleSelectAllPage}
          className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer shrink-0"
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
            className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer shrink-0"
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
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-12 py-1 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-apollo rounded-md focus:outline-none focus:ring-2 focus:ring-apollo/15 transition-all shadow-2xs"
              />
              {localQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocalQuery('');
                    if (onSearchChange) {
                      onSearchChange('');
                    }
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

      {/* Right: Actions (Export CSV, Save) */}
      <div className="flex items-center space-x-2 shrink-0">
        {onChangeDataset && (
          <div
            role="group"
            aria-label="Filter by contact data pool"
            className="hidden xl:flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] shrink-0 font-medium"
          >
            <button
              type="button"
              onClick={() => onChangeDataset('valid')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeDataset === 'valid'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              With Contacts
            </button>
            <button
              type="button"
              onClick={() => onChangeDataset('missing')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeDataset === 'missing'
                  ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Without
            </button>
            <button
              type="button"
              onClick={() => onChangeDataset('all')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeDataset === 'all'
                  ? 'bg-white text-apollo shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
          </div>
        )}

        {isViewerUser && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium"
            title="Viewing Mode · Contact Admin for Export Privileges"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Viewing Mode · Contact Admin for Export Privileges</span>
            <span className="sm:hidden">Viewing Mode</span>
          </span>
        )}

        {selectedCount > 0 && onSaveSelected && !isViewerUser && (
          <button
            onClick={onSaveSelected}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            <span>Save ({selectedCount})</span>
          </button>
        )}

        {onDownloadSummaryReport && (
          <button
            onClick={onDownloadSummaryReport}
            disabled={isExportingSummary || isViewerUser}
            className={`h-8 px-2.5 sm:px-3 rounded-md border font-medium flex items-center space-x-1.5 transition-all text-xs shadow-2xs ${
              isViewerUser
                ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
                : selectedCount > 0
                ? 'border-apollo/30 text-apollo bg-apollo/10 hover:bg-apollo/20 active:bg-apollo/25 cursor-pointer'
                : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={
              isViewerUser
                ? 'Viewing Mode · Contact Admin for Export Privileges'
                : selectedCount > 0
                ? `Download senior management executive summary report for ${selectedCount} selected lead${selectedCount > 1 ? 's' : ''}`
                : 'Download senior management executive summary report for current page'
            }
            aria-label="Download Executive Summary Report"
          >
            {isExportingSummary ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-apollo" />
            ) : (
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isViewerUser ? 'text-slate-400' : selectedCount > 0 ? 'text-apollo' : 'text-slate-600'}`} />
            )}
            <span className="hidden sm:inline">
              {`Summary Report${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </span>
            <span className="sm:hidden">
              {`Summary${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            </span>
          </button>
        )}

        <button
          onClick={onExport}
          disabled={isExporting || isViewerUser}
          className={`h-8 px-2.5 sm:px-3 rounded-md border font-medium flex items-center space-x-1.5 transition-colors text-xs shadow-2xs ${
            isViewerUser
              ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed opacity-60'
              : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={
            isViewerUser
              ? 'Viewing Mode · Contact Admin for Export Privileges'
              : 'Export filtered records to clean CSV'
          }
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

export default DatamyneActionBar;
