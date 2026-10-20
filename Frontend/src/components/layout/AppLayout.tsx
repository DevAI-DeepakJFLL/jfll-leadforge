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
  onLogout,
  currentUser,
  className = '',
}) => {
  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased ${className}`}>
      {/* Leftmost 64px Dark Dock (Desktop) & Bottom Navigation Bar (Mobile) */}
      <AppDock
        activeNav={activeNav}
        onNavChange={onNavChange}
        savedSearchesCount={savedSearchesCount}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        currentUser={currentUser}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <TopHeader
          activeTab={activeTab}
          onTabChange={onTabChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          onToggleMobileFilter={onToggleMobileFilter}
          activeFilterCount={activeFilterCount}
          savedCount={savedCount}
        />

        {/* Content Viewport with pb-14 on mobile to accommodate bottom dock */}
        <main className="flex-1 min-h-0 overflow-hidden flex relative bg-slate-50 pb-14 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
