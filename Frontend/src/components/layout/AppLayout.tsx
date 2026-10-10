import React from 'react';
import { AppDock } from './AppDock';
import { TopHeader } from './TopHeader';

export interface AppLayoutProps {
  children?: React.ReactNode;
  activeNav?: string;
  onNavChange?: (navId: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  savedSearchesCount?: number;
  onOpenSettings?: () => void;
  onLogout?: () => void;
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
  savedSearchesCount = 0,
  onOpenSettings,
  onLogout,
  className = '',
}) => {
  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased ${className}`}>
      {/* Leftmost 64px Dark Dock */}
      <AppDock
        activeNav={activeNav}
        onNavChange={onNavChange}
        savedSearchesCount={savedSearchesCount}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
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
        />

        {/* Content Viewport */}
        <main className="flex-1 min-h-0 overflow-hidden flex relative bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
