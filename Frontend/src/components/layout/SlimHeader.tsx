import React, { useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Menu } from 'lucide-react';
import { UserSession } from '@/types/auth';

export interface SlimHeaderProps {
  activeTab?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;
  activeFilterCount?: number;
  isFilterOpen?: boolean;
  onToggleFilter?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  showSearch?: boolean;
  currentUser?: UserSession | null;
  className?: string;
}

export interface BreadcrumbInfo {
  section: string;
  title: string;
  badge?: string;
}

export const BREADCRUMB_MAP: Record<string, BreadcrumbInfo> = {
  'jfll-customers': {
    section: 'Data Pools',
    title: 'JFLL Customers',
    badge: '2.7k',
  },
  'datamyne': {
    section: 'Data Pools',
    title: 'DataMyne Leads',
    badge: '37.3k',
  },
  'apollo': {
    section: 'Data Pools',
    title: 'Apollo Leads',
    badge: '1.45M',
  },
  'companies': {
    section: 'Data Pools',
    title: 'Apollo Leads',
    badge: '1.45M',
  },
  'people': {
    section: 'Data Pools',
    title: 'Apollo Leads',
    badge: '1.45M',
  },
  'report': {
    section: 'Outreach & Views',
    title: 'Client Reports',
  },
  'saved-searches': {
    section: 'Outreach & Views',
    title: 'Saved Searches',
  },
  'saved-lists': {
    section: 'Outreach & Views',
    title: 'Saved Lists',
  },
  'accounts': {
    section: 'Accounts & Master',
    title: 'Accounts',
  },
  'admin': {
    section: 'Administration',
    title: 'Admin Portal',
  },
};

export function getBreadcrumbInfo(activeTab?: string): BreadcrumbInfo {
  if (activeTab && BREADCRUMB_MAP[activeTab]) {
    return BREADCRUMB_MAP[activeTab];
  }
  const formattedTitle = (activeTab || 'Dashboard')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return {
    section: 'Data Pools',
    title: formattedTitle,
  };
}

export const SlimHeader: React.FC<SlimHeaderProps> = ({
  activeTab = 'jfll-customers',
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  activeFilterCount = 0,
  isFilterOpen = false,
  onToggleFilter,
  onToggleSidebar,
  isSidebarCollapsed,
  showSearch = true,
  currentUser: _currentUser,
  className = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const breadcrumb = getBreadcrumbInfo(activeTab);

  // Global Cmd+K / Ctrl+K keyboard shortcut to focus search input
  useEffect(() => {
    if (!showSearch) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSearch]);

  const handleClear = () => {
    onSearchChange?.('');
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit?.(searchQuery);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <header
      className={`h-12 bg-white border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between select-none z-20 shrink-0 ${className}`}
      aria-label="Utility Header"
    >
      {/* Left: Mobile hamburger menu button + Breadcrumbs */}
      <div className="flex items-center min-w-0 mr-3">
        {/* Mobile Hamburger Menu Button (< md) */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
          aria-expanded={isSidebarCollapsed !== undefined ? !isSidebarCollapsed : undefined}
          className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] -ml-1 mr-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40"
        >
          <Menu className="w-5 h-5 text-slate-600" aria-hidden="true" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
          <ol className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm min-w-0">
            {/* Parent Section */}
            <li className="flex items-center text-slate-500 font-medium truncate">
              <span>{breadcrumb.section}</span>
            </li>

            {/* Chevron / Delimiter */}
            <li className="flex items-center text-slate-300 font-normal select-none px-0.5" aria-hidden="true">
              <span>/</span>
            </li>

            {/* Current Tab Title + Optional Record Badge */}
            <li className="flex items-center min-w-0">
              <span
                className="font-semibold text-slate-900 truncate"
                aria-current="page"
              >
                {breadcrumb.title}
              </span>

              {breadcrumb.badge && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
                  {breadcrumb.badge}
                </span>
              )}
            </li>
          </ol>
        </nav>
      </div>

      {/* Right: Search Bar & Filter Toggle Button */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Search Bar */}
        {showSearch && (
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quick search leads... (⌘K)"
              aria-label="Quick search leads"
              className="w-40 sm:w-60 md:w-72 h-9 pl-9 pr-9 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg transition-colors focus:outline-none focus:border-apollo focus:ring-1 focus:ring-apollo"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-0 flex items-center justify-center min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Filter Toggle Button */}
        <button
          type="button"
          onClick={onToggleFilter}
          aria-pressed={isFilterOpen}
          aria-expanded={isFilterOpen}
          aria-label={
            activeFilterCount > 0
              ? `Toggle filters (${activeFilterCount} active)`
              : 'Toggle filters'
          }
          className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40 ${
            isFilterOpen
              ? 'bg-apollo/10 text-apollo border-apollo/40 ring-1 ring-apollo/30 font-semibold'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-2xs'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none bg-apollo text-white rounded-full min-w-[18px]"
              aria-label={`${activeFilterCount} active filters`}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default SlimHeader;
