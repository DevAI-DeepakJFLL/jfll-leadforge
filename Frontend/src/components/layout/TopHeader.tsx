import React, { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

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
  onToggleMobileFilter?: () => void;
  activeFilterCount?: number;
  showSearch?: boolean;
  className?: string;
}

const TOP_NAV_TABS: TopNavTab[] = [
  { id: 'people', label: 'People' },
  { id: 'companies', label: 'Companies' },
  { id: 'jfll-customers', label: 'JFLL Customers', badge: '2.7k' },
  { id: 'datamyne', label: 'DataMyne', badge: '37.3k' },
  { id: 'saved-searches', label: 'Saved Searches' },
  { id: 'saved-lists', label: 'Saved Lists' },
];

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab = 'people',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onToggleMobileFilter,
  activeFilterCount = 0,
  showSearch = false,
  className = '',
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
      className={`border-b border-surface-border bg-white px-3 sm:px-4 lg:px-6 z-20 select-none flex flex-col justify-center ${className}`}
      aria-label="Top Global Navigation"
    >
      <div className="h-14 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Left: Mobile Brand & Primary Tabs */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1 overflow-hidden">
          {/* Mobile Brand Mark */}
          <div className="md:hidden shrink-0 w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-200 shadow-2xs flex items-center justify-center">
            <img
              src="/assets/jfll-logo.jpeg"
              alt="Jet Freight Logistics"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Navigation Tabs with Horizontal Scroll */}
          <nav
            className="flex space-x-1 sm:space-x-2 h-14 items-center shrink-0 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap min-w-0"
            aria-label="Audience Entity Tabs"
          >
            {TOP_NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`relative h-14 px-2.5 sm:px-3.5 flex items-center text-xs sm:text-sm font-medium transition-colors focus:outline-none shrink-0 whitespace-nowrap min-h-[44px] ${
                    isActive
                      ? 'text-apollo font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`ml-1 sm:ml-1.5 text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full border ${
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
        </div>

        {/* Right: Search Bar & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Global Search Bar (optional, hidden by default as search bar is now in action bar) */}
          {showSearch && (
            <div className="relative w-48 sm:w-64 lg:w-80 hidden md:block">
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
                    className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
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
          )}

          {/* Mobile Search Toggle Button (Only when showSearch enabled) */}
          {showSearch && (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Toggle mobile search bar"
              title="Search prospects"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Filter Drawer Toggle Button (Visible on screens < lg) */}
          {onToggleMobileFilter && (
            <button
              type="button"
              onClick={onToggleMobileFilter}
              className="lg:hidden relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-apollo/20 transition-all active:scale-95"
              aria-label="Open filter options"
              title="Filter prospects"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-apollo" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-apollo text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search Row */}
      {showSearch && isMobileSearchOpen && (
        <div className="md:hidden pb-3 pt-1 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={handleKeyDownInput}
              autoFocus
              placeholder="Search by name, title, location..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-apollo rounded-lg focus:outline-none focus:ring-2 focus:ring-apollo/15"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded"
                title="Clear search"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopHeader;
