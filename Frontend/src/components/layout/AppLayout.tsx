import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedSidebar } from './UnifiedSidebar';
import { SlimHeader } from './SlimHeader';
import { UserSession } from '@/types/auth';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'jfll_nav_sidebar_collapsed';

export interface AppLayoutProps {
  children?: React.ReactNode;
  activeNav?: string;
  onNavChange?: (navId: string) => void;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  onToggleMobileFilter?: () => void;
  isFilterOpen?: boolean;
  activeFilterCount?: number;
  savedSearchesCount?: number;
  savedCount?: number;
  savedListsCount?: number;
  onOpenSettings?: () => void;
  onOpenAdminPortal?: () => void;
  pendingRequestsCount?: number;
  onLogout?: () => void;
  currentUser?: UserSession | null;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  showSearch?: boolean;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeNav: _activeNav,
  onNavChange,
  activeTab = 'jfll-customers',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onToggleMobileFilter,
  isFilterOpen = false,
  activeFilterCount = 0,
  savedSearchesCount = 0,
  savedCount,
  savedListsCount,
  onOpenSettings,
  onOpenAdminPortal,
  pendingRequestsCount = 0,
  onLogout,
  currentUser,
  isSidebarCollapsed: controlledCollapsed,
  onToggleSidebarCollapse,
  showSearch = true,
  className = '',
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const storage =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
      if (storage) {
        return storage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
      }
    } catch {
      // Ignore localStorage read errors
    }
    return false;
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = useCallback(() => {
    if (onToggleSidebarCollapse) {
      onToggleSidebarCollapse();
    }
    if (controlledCollapsed === undefined) {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          const storage =
            typeof window !== 'undefined' && window.localStorage
              ? window.localStorage
              : typeof localStorage !== 'undefined'
              ? localStorage
              : null;
          if (storage) {
            storage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
          }
        } catch {
          // Ignore localStorage write errors
        }
        return next;
      });
    }
  }, [controlledCollapsed, onToggleSidebarCollapse]);

  // Mobile off-canvas drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen((prev) => !prev);
  }, []);

  const handleCloseMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    if (!isMobileDrawerOpen || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setIsMobileDrawerOpen(false);
      if (onTabChange) {
        onTabChange(tabId);
      } else if (onNavChange) {
        onNavChange(tabId);
      }
    },
    [onTabChange, onNavChange]
  );

  const handleOpenSettings = useCallback(() => {
    setIsMobileDrawerOpen(false);
    onOpenSettings?.();
  }, [onOpenSettings]);

  const handleOpenAdminPortal = useCallback(() => {
    setIsMobileDrawerOpen(false);
    onOpenAdminPortal?.();
  }, [onOpenAdminPortal]);

  const handleLogout = useCallback(() => {
    setIsMobileDrawerOpen(false);
    onLogout?.();
  }, [onLogout]);

  const effectiveSavedListsCount = savedListsCount !== undefined ? savedListsCount : savedCount;

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased print:h-auto print:w-auto print:overflow-visible ${className}`}
    >
      {/* Desktop UnifiedSidebar (md:flex, hidden on mobile) */}
      <div className="hidden md:flex h-full shrink-0 print:hidden">
        <UnifiedSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          savedSearchesCount={savedSearchesCount}
          savedListsCount={effectiveSavedListsCount}
          onOpenSettings={onOpenSettings}
          onOpenAdminPortal={onOpenAdminPortal}
          pendingRequestsCount={pendingRequestsCount}
          onLogout={onLogout}
          currentUser={currentUser}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Mobile Off-Canvas Drawer (< md) */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={handleCloseMobileDrawer}
            aria-hidden="true"
            data-testid="mobile-drawer-backdrop"
          />

          {/* Off-canvas sidebar panel */}
          <div className="relative z-10 w-64 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col">
            <UnifiedSidebar
              activeTab={activeTab}
              onTabChange={handleTabChange}
              savedSearchesCount={savedSearchesCount}
              savedListsCount={effectiveSavedListsCount}
              onOpenSettings={handleOpenSettings}
              onOpenAdminPortal={handleOpenAdminPortal}
              pendingRequestsCount={pendingRequestsCount}
              onLogout={handleLogout}
              currentUser={currentUser}
              isCollapsed={false}
              onToggleCollapse={handleCloseMobileDrawer}
              className="w-full h-full border-r-0"
            />
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Top SlimHeader Bar */}
        <div className="print:hidden">
          <SlimHeader
            activeTab={activeTab}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            activeFilterCount={activeFilterCount}
            isFilterOpen={isFilterOpen}
            onToggleFilter={onToggleMobileFilter}
            onToggleSidebar={handleToggleMobileDrawer}
            isSidebarCollapsed={isCollapsed}
            showSearch={showSearch}
            currentUser={currentUser}
          />
        </div>

        {/* Content Viewport */}
        <main className="flex-1 min-h-0 overflow-hidden flex relative bg-slate-50 print:h-auto print:overflow-visible print:p-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
