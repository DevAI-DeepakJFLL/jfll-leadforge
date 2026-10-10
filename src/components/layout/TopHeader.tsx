import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Briefcase,
  BookOpen,
  HelpCircle,
  UserPlus,
  ChevronDown,
  X,
  FileSpreadsheet,
  Upload,
  Database,
} from 'lucide-react';

export interface TopHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  jobChangesCount?: number;
  onJobChangesClick?: () => void;
  onImportClick?: () => void;
  className?: string;
}

export const TOP_NAV_TABS = [
  { id: 'people', label: 'People' },
  { id: 'companies', label: 'Companies' },
  { id: 'saved-searches', label: 'Saved Searches' },
  { id: 'saved-lists', label: 'Saved Lists' },
] as const;

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab = 'people',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  jobChangesCount = 237,
  onJobChangesClick,
  onImportClick,
  className = '',
}) => {
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut: Command/Ctrl + K or "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        importDropdownRef.current &&
        !importDropdownRef.current.contains(e.target as Node)
      ) {
        setIsImportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearSearch = () => {
    onSearchChange?.('');
    searchInputRef.current?.focus();
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.(searchQuery);
    }
  };

  return (
    <header
      className={`h-14 border-b border-surface-border bg-white px-4 lg:px-6 flex items-center justify-between gap-4 z-20 select-none ${className}`}
      aria-label="Top Global Navigation"
    >
      {/* Left: Primary Tabs & Inline Global Search */}
      <div className="flex items-center space-x-6 min-w-0 flex-1">
        {/* Navigation Tabs matching Ref.jpg */}
        <nav className="flex space-x-1 sm:space-x-2 h-14 items-center shrink-0" aria-label="Audience Entity Tabs">
          {TOP_NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`relative h-14 px-3 sm:px-3.5 flex items-center text-sm font-medium transition-colors focus:outline-none ${
                  isActive
                    ? 'text-apollo font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-apollo rounded-t-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-sm lg:max-w-md hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={handleKeyDownInput}
              placeholder="Search by name, title, location"
              className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 hover:border-slate-300 focus:border-apollo rounded-md focus:outline-none focus:ring-2 focus:ring-apollo/15 transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 flex items-center pointer-events-none">
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Job Changes Badge, Utility Buttons & Import Dropdown */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Job Changes Badge matching Ref.jpg (💼 237 New Job Changes) */}
        <button
          onClick={onJobChangesClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200"
          title="View recent lead career and position shifts"
        >
          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
          <span>{jobChangesCount} New Job Changes</span>
        </button>

        {/* Documentation / Knowledgebase Icon */}
        <button
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Product Guides & Best Practices"
          aria-label="Documentation"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Help / Support Icon */}
        <button
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Help Center & Live Chat"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* "+ Import ▾" Button with Dropdown matching Ref.jpg */}
        <div className="relative" ref={importDropdownRef}>
          <button
            onClick={() => {
              setIsImportMenuOpen((prev) => !prev);
              onImportClick?.();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-apollo/20"
            aria-expanded={isImportMenuOpen}
            aria-haspopup="true"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-600" />
            <span>+ Import</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                isImportMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Import Dropdown Menu */}
          {isImportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Import Leads
              </div>
              <button
                onClick={() => setIsImportMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-medium">CSV / Excel File</div>
                  <div className="text-[11px] text-slate-400">Upload bulk lead spreadsheets</div>
                </div>
              </button>
              <button
                onClick={() => setIsImportMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
              >
                <Database className="w-4 h-4 text-apollo" />
                <div>
                  <div className="font-medium">CRM Sync (Salesforce / HubSpot)</div>
                  <div className="text-[11px] text-slate-400">Sync accounts & contacts</div>
                </div>
              </button>
              <button
                onClick={() => setIsImportMenuOpen(false)}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition-colors"
              >
                <Upload className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="font-medium">LinkedIn Sales Navigator</div>
                  <div className="text-[11px] text-slate-400">Import saved lead searches</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
