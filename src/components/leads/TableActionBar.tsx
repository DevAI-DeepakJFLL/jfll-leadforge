import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Plus,
  Mail,
  Play,
  ListPlus,
  Download,
  Pencil,
  Cloud,
  ChevronDown,
  Loader2,
  Minus,
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
  onEmail?: () => void;
  onAddToSequence?: (sequenceName: string) => void;
  onAddToList?: (listName: string) => void;
  onExport?: () => void | Promise<void>;
  onEdit?: (action: string) => void;
  onSalesforce?: (action: string) => void;
  isExporting?: boolean;
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
  onEmail,
  onAddToSequence,
  onAddToList,
  onExport,
  onEdit,
  onSalesforce,
  isExporting = false,
  className = '',
}) => {
  const [activeMenu, setActiveMenu] = useState<
    'select' | 'sequence' | 'lists' | 'edit' | 'salesforce' | null
  >(null);

  const barRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleMenu = (menu: 'select' | 'sequence' | 'lists' | 'edit' | 'salesforce') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const hasSelection = selectedCount > 0;

  return (
    <div
      ref={barRef}
      className={`h-11 px-4 bg-white border-b border-surface-border flex items-center justify-between gap-2 overflow-x-auto select-none ${className}`}
      aria-label="Table Bulk Action Bar"
    >
      <div className="flex items-center space-x-2 shrink-0">
        {/* 1. Selection Counter Dropdown: "✓ N Selected ▾" */}
        <div className="relative">
          <div className="inline-flex items-center rounded-md border border-slate-200 bg-white shadow-2xs hover:bg-slate-50 transition-colors">
            {/* Direct Checkbox Trigger */}
            <button
              type="button"
              onClick={onToggleSelectAllPage}
              className="p-1.5 flex items-center justify-center hover:bg-slate-100/80 rounded-l-md transition-colors focus:outline-none"
              title={
                isAllOnPageSelected
                  ? 'Deselect all on this page'
                  : 'Select all on this page'
              }
              aria-label="Toggle page selection"
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  isAllOnPageSelected || selectedCount > 0
                    ? 'bg-apollo text-white'
                    : 'border border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {isAllOnPageSelected ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : isIndeterminate || selectedCount > 0 ? (
                  <Minus className="w-2.5 h-2.5 stroke-[3]" />
                ) : null}
              </div>
            </button>

            {/* Counter Text + Dropdown Arrow */}
            <button
              type="button"
              onClick={() => toggleMenu('select')}
              className="pl-1 pr-2 py-1 text-xs font-semibold text-slate-800 flex items-center gap-1 hover:text-apollo transition-colors focus:outline-none"
            >
              <span>
                {selectedCount > 0 ? `${selectedCount} Selected` : 'Select'}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${
                  activeMenu === 'select' ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Selection Dropdown Menu */}
          {activeMenu === 'select' && (
            <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onSelectAllPage?.();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
              >
                <span>Select all on page</span>
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

        {/* 2. "+ Save" */}
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
          title="Save selected leads"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Save</span>
        </button>

        {/* 3. "✉ Email" */}
        <button
          type="button"
          onClick={onEmail}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
          title="Compose email to selected leads"
        >
          <Mail className="w-3.5 h-3.5 text-slate-500" />
          <span>Email</span>
        </button>

        {/* 4. "▷ Sequence ▾" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('sequence')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
            title="Add leads to an outbound email sequence"
          >
            <Play className="w-3 h-3 text-slate-500 fill-slate-500" />
            <span>Sequence</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'sequence' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {activeMenu === 'sequence' && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Sequence
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToSequence?.('Enterprise Outbound - Q4');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Enterprise Outbound - Q4
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToSequence?.('LA Tech Executives Nurture');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                LA Tech Executives Nurture
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToSequence?.('Inbound Follow-up Flow');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Inbound Follow-up Flow
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  onAddToSequence?.('__new__');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-apollo font-medium hover:bg-apollo-50"
              >
                + Create New Sequence
              </button>
            </div>
          )}
        </div>

        {/* 5. "📋 Lists ▾" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('lists')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
            title="Add to lead lists"
          >
            <ListPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Lists</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'lists' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {activeMenu === 'lists' && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target Lists
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToList?.('West Coast Marketing VIPs');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                West Coast Marketing VIPs
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToList?.('High Growth Target Accounts');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                High Growth Target Accounts
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToList?.('Strategic Partners 2026');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Strategic Partners 2026
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  onAddToList?.('__new__');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-apollo font-medium hover:bg-apollo-50"
              >
                + Create New List
              </button>
            </div>
          )}
        </div>

        {/* 6. "⤓ Export" (Functional CSV Export Trigger) */}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 disabled:opacity-50"
          title="Download leads dataset as CSV"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 text-apollo animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        </button>

        {/* 7. "✎ Edit ▾" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('edit')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
            title="Bulk edit properties"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'edit' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onEdit?.('owner');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Update Lead Owner
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit?.('stage');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Update Pipeline Stage
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit?.('status');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Change Lead Status
              </button>
            </div>
          )}
        </div>

        {/* 8. "☁ Salesforce ▾" */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('salesforce')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20"
            title="Salesforce CRM integration"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Salesforce</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                activeMenu === 'salesforce' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {activeMenu === 'salesforce' && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Salesforce Sync
              </div>
              <button
                type="button"
                onClick={() => {
                  onSalesforce?.('sync');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Sync to Salesforce CRM
              </button>
              <button
                type="button"
                onClick={() => {
                  onSalesforce?.('contacts');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Push as Contacts
              </button>
              <button
                type="button"
                onClick={() => {
                  onSalesforce?.('leads');
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              >
                Push as Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableActionBar;
