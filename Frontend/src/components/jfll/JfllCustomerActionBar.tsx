import React from 'react';
import { Download, Bookmark, CheckSquare, Square, MinusSquare, Loader2 } from 'lucide-react';

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
  className = '',
}) => {
  return (
    <div
      className={`min-h-10 py-1 px-4 border-b border-surface-border bg-white flex items-center justify-between gap-3 text-xs select-none overflow-x-auto no-scrollbar ${className}`}
      aria-label="Customer Table Action Bar"
    >
      {/* Left: Checkbox & Multi-Selection Counter */}
      <div className="flex items-center space-x-3 shrink-0">
        <button
          onClick={onToggleSelectAllPage}
          className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 focus:outline-none"
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
            className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Right: Actions (Export CSV, Save, List) */}
      <div className="flex items-center space-x-2 shrink-0">
        {selectedCount > 0 && onSaveSelected && (
          <button
            onClick={onSaveSelected}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
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
