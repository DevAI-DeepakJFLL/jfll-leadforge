import React from 'react';
import { Search, X } from 'lucide-react';

export interface TopNavTab {
  id: string;
  label: string;
  count?: number;
  badge?: string | number;
}

export interface TopHeaderProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  className?: string;
}

const TOP_NAV_TABS: TopNavTab[] = [
  { id: 'people', label: 'People' },
  { id: 'companies', label: 'Companies' },
  { id: 'jfll-customers', label: 'JFLL Customers', badge: '881' },
  { id: 'saved-searches', label: 'Saved Searches' },
  { id: 'saved-lists', label: 'Saved Lists' },
];

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab = 'people',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  className = '',
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
        {/* Navigation Tabs */}
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
                {tab.badge && (
                  <span
                    className={`ml-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full border ${
                      isActive
                        ? 'bg-blue-50 text-apollo border-apollo/30'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
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
                onClick={handleClearSearch}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                ⌘K
              </span>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default TopHeader;
