import React from 'react';
import { AppDock } from './AppDock';
import { TopHeader } from './TopHeader';
import { UserSession } from '@/types/auth';

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
  activeFilterCount?: number;
  savedSearchesCount?: number;
  savedCount?: number;
  onOpenSettings?: () => void;
  onOpenAdminPortal?: () => void;
  pendingRequestsCount?: number;
  onLogout?: () => void;
  currentUser?: UserSession | null;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeNav = 'search',
  onNavChange,
  activeTab = 'people',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  onToggleMobileFilter,
  activeFilterCount = 0,
  savedSearchesCount = 0,
  savedCount,
  onOpenSettings,
  onOpenAdminPortal,
  pendingRequestsCount = 0,
  onLogout,
  currentUser,
  className = '',
}) => {
  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased print:h-auto print:w-auto print:overflow-visible ${className}`}>
      {/* Leftmost 64px Dark Dock (Desktop) & Bottom Navigation Bar (Mobile) */}
      <div className="print:hidden">
        <AppDock
          activeNav={activeNav}
          onNavChange={onNavChange}
          savedSearchesCount={savedSearchesCount}
          onOpenSettings={onOpenSettings}
          onOpenAdminPortal={onOpenAdminPortal}
          pendingRequestsCount={pendingRequestsCount}
          onLogout={onLogout}
          currentUser={currentUser}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Top Navigation Bar */}
        <div className="print:hidden">
          <TopHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            onToggleMobileFilter={onToggleMobileFilter}
            activeFilterCount={activeFilterCount}
            savedCount={savedCount}
            currentUser={currentUser}
          />
        </div>

        {/* Content Viewport with pb-14 on mobile to accommodate bottom dock */}
        <main className="flex-1 min-h-0 overflow-hidden flex relative bg-slate-50 pb-14 md:pb-0 print:h-auto print:overflow-visible print:p-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
