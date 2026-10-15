import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  ListPlus,
  Download,
  Loader2,
  BookmarkCheck,
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
  onSave?: () => void;
  onAddToList?: (listName: string) => void;
  onExport?: () => void | Promise<void>;
  isExporting?: boolean;
  savedLists?: string[];
  className?: string;
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
  onSave,
  onAddToList,
  onExport,
  isExporting = false,
  savedLists = ['West Coast VIPs', 'High Growth Accounts', 'Q4 Prospects'],
  className = '',
}) => {
  const [activeMenu, setActiveMenu] = useState<'select' | 'lists' | null>(null);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedCount > 0;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setIsCreatingList(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onAddToList?.(newListName.trim());
      setNewListName('');
      setIsCreatingList(false);
      setActiveMenu(null);
    }
  };

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

        {/* 2. "+ Save to Pipeline" */}
        <button
          type="button"
          onClick={onSave}
          disabled={!hasSelection}
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 ${
            hasSelection
              ? 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
              : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-60'
          }`}
          title="Save selected leads to Saved People tab"
        >
          <BookmarkCheck className="w-3.5 h-3.5 text-apollo" />
          <span>Save Leads</span>
        </button>

        {/* 3. "📋 Add to List ▾" */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'lists' ? null : 'lists')}
            disabled={!hasSelection}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 ${
              hasSelection
                ? 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-60'
            }`}
            title="Add leads to a targeted prospecting list"
          >
            <ListPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add to List</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'lists' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {activeMenu === 'lists' && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Prospect List
              </div>
              {savedLists.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onAddToList?.(name);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
                >
                  <span className="truncate">{name}</span>
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              {!isCreatingList ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingList(true)}
                  className="w-full text-left px-3 py-1.5 text-apollo font-medium hover:bg-apollo-50 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create New List</span>
                </button>
              ) : (
                <form onSubmit={handleCreateList} className="p-2 space-y-1.5">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name..."
                    autoFocus
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-apollo"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="submit"
                      disabled={!newListName.trim()}
                      className="px-2 py-1 bg-apollo text-white text-[11px] font-medium rounded hover:bg-apollo-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingList(false)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 4. "⤓ Export (CSV)" */}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 disabled:opacity-50"
          title="Download leads dataset as RFC-4180 CSV"
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
