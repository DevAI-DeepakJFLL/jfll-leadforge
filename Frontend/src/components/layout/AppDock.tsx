import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Bookmark,
  Bell,
  Settings,
  X,
  SlidersHorizontal,
  Trash2,
  Building2,
  Database,
  LogOut,
} from 'lucide-react';
import { UserSession } from '@/types/auth';

export interface AppDockProps {
  activeNav?: string;
  onNavChange?: (navId: string) => void;
  savedSearchesCount?: number;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  currentUser?: UserSession | null;
  className?: string;
  defaultShowProfileMenu?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const getInitials = (name?: string): string => {
  if (!name) return 'JF';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AppDock: React.FC<AppDockProps> = ({
  activeNav = 'search',
  onNavChange,
  savedSearchesCount = 0,
  onOpenSettings,
  onLogout,
  currentUser,
  className = '',
  defaultShowProfileMenu = false,
}) => {
  const resolvedUser: UserSession = currentUser || (() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem('apollo_leads_session');
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Ignored
    }
    return {
      name: 'Authorized Personnel',
      email: 'user@jfll.com',
      role: 'Team Member',
      token: '',
    };
  })();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(defaultShowProfileMenu);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Database Updated',
      desc: '35 new verified leads added for Los Angeles.',
      time: '10m ago',
      read: false,
    },
    {
      id: '2',
      title: 'CSV Export Ready',
      desc: 'Export downloaded successfully.',
      time: '1h ago',
      read: true,
    },
    {
      id: '3',
      title: 'Job Change Alerts',
      desc: '237 prospects changed roles recently.',
      time: '1d ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Close notifications or profile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNotifications) setShowNotifications(false);
        if (showProfileMenu) setShowProfileMenu(false);
      }
    };
    if (showNotifications || showProfileMenu) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showNotifications, showProfileMenu]);

  // Streamlined navigation items focused on prospecting and internal customer master
  const PRIMARY_NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Prospecting Overview', icon: Home },
    { id: 'search', label: 'Leads Explorer', icon: Search },
    { id: 'jfll-customers', label: 'JFLL Customers', icon: Building2 },
    { id: 'datamyne', label: 'DataMyne Leads', icon: Database },
    {
      id: 'saved-searches',
      label: 'Saved Searches',
      icon: Bookmark,
      badge: savedSearchesCount > 0 ? savedSearchesCount : undefined,
    },
  ];

  return (
    <>
      {/* 1. Desktop Leftmost 64px Dark Dock (Hidden on mobile < md) */}
      <aside
        className={`hidden md:flex w-16 h-screen flex-shrink-0 bg-dock flex-col items-center justify-between py-3.5 z-30 select-none border-r border-[#172244]/60 relative ${className}`}
        aria-label="Application Dock Navigation"
      >
        {/* Top Section: Brand Logo & Navigation */}
        <div className="flex flex-col items-center w-full space-y-4">
          {/* Jet Freight Logistics Brand Logo */}
          <button
            onClick={() => onNavChange?.('search')}
            className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-700/80 flex items-center justify-center shadow-md hover:border-apollo-400/50 hover:shadow-apollo-500/20 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-apollo-400"
            title="Jet Freight Logistics - Sourcing Portal"
            aria-label="Jet Freight Home"
          >
            <img
              src="/assets/jfll-logo.jpeg"
              alt="Jet Freight Logistics"
              className="w-full h-full object-contain"
            />
          </button>

          {/* Primary Functional Navigation Icons */}
          <nav className="flex flex-col items-center space-y-1.5 w-full px-2" aria-label="Main Navigation">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavChange?.(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 relative group focus:outline-none focus:ring-2 focus:ring-apollo-400 ${
                    isActive
                      ? 'bg-apollo-500/20 text-[#3890FE] border border-apollo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-dock-hover'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 ${
                      isActive ? 'scale-105 stroke-[2.25]' : 'group-hover:scale-105'
                    }`}
                  />

                  {item.badge && item.badge > 0 && (
                    <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-apollo text-[9px] font-bold text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}

                  {/* Active indicator pill on left */}
                  {isActive && (
                    <span className="absolute -left-2 top-2 bottom-2 w-1 bg-apollo rounded-r" />
                  )}

                  {/* Hover Tooltip */}
                  <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Live Status, Notifications, Settings & User Profile */}
        <div className="flex flex-col items-center space-y-2 w-full px-2">
          {/* Live Network Status Ring Indicator */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors relative group"
            title="Lead Database: Live & Connected"
            aria-label="Status: Connected"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <svg
                className="w-5 h-5 -rotate-90 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeOpacity="0.2"
                  className="text-slate-600"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="28 60"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
              Database: Connected & Live
            </span>
          </div>

          {/* Notifications (Bell with alert popover) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative group focus:outline-none focus:ring-2 focus:ring-apollo-400 ${
                showNotifications ? 'bg-dock-hover text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-dock-hover'
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-apollo ring-2 ring-dock" />
              )}

              <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
                {unreadCount > 0 ? `${unreadCount} New Alerts` : 'Notifications'}
              </span>
            </button>
          </div>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-dock-hover transition-colors relative group focus:outline-none focus:ring-2 focus:ring-apollo-400"
            title="Preferences & Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-200" />

            <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
              Prospecting Settings
            </span>
          </button>

          {/* User Profile Avatar with Popover */}
          <div className="pt-1 relative">
            <div className="relative inline-block">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-apollo-400 group bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center border border-white/20 shadow-sm transition-transform active:scale-95 cursor-pointer"
                title={`${resolvedUser.name} (${resolvedUser.email}) · Account & Sign Out`}
                aria-label={`User Account for ${resolvedUser.name}`}
              >
                <span>{getInitials(resolvedUser.name)}</span>
              </button>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-dock pointer-events-none z-10"
                title="Active Session"
              />

              <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
                {`${resolvedUser.name} · ${resolvedUser.role}`}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Bottom Navigation Bar (md:hidden) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-dock border-t border-[#172244] z-40 flex items-center justify-around px-2 select-none shadow-[0_-4px_12px_rgba(0,0,0,0.15)]"
        aria-label="Mobile Navigation Dock"
      >
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange?.(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors relative ${
                isActive ? 'text-[#3890FE]' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.id === 'jfll-customers' ? 'Customers' : item.id === 'datamyne' ? 'DataMyne' : item.id === 'saved-searches' ? 'Saved' : item.id === 'search' ? 'Leads' : 'Home'}
              </span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-2 px-1 min-w-[12px] h-[12px] rounded-full bg-apollo text-[8px] font-bold text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Mobile Settings Icon */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] text-slate-400 hover:text-slate-200"
          aria-label="Prospecting Settings"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Settings</span>
        </button>

        {/* Mobile Profile Icon */}
        <button
          onClick={() => {
            setShowProfileMenu(!showProfileMenu);
            setShowNotifications(false);
          }}
          className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] text-slate-400 hover:text-slate-200 relative cursor-pointer"
          aria-label={`User Account for ${resolvedUser.name}`}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-[10px] flex items-center justify-center border border-white/20 shadow-xs">
            {getInitials(resolvedUser.name)}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5 truncate max-w-[60px]">
            {resolvedUser.name.split(' ')[0]}
          </span>
        </button>
      </nav>

      {/* Shared Popovers: Notifications & Profile with Mobile Backdrop */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-start pointer-events-none">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
            onClick={() => setShowNotifications(false)}
          />
          <div className="pointer-events-auto w-full max-w-sm sm:w-80 bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-left-2 duration-150 mb-14 sm:mb-0 sm:ml-16 sm:mt-auto sm:mb-16">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-900">Activity & Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-apollo/10 text-apollo rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-apollo hover:underline font-medium min-h-[44px] flex items-center"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-2 ${
                      !n.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-apollo shrink-0" />}
                        {n.title}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{n.desc}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                    </div>
                    <button
                      onClick={() => clearNotification(n.id)}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      title="Dismiss"
                      aria-label="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showProfileMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-start pointer-events-none">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
            onClick={() => setShowProfileMenu(false)}
            aria-hidden="true"
          />
          <div className="pointer-events-auto w-full max-w-sm sm:w-72 bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 z-50 p-4 sm:p-3 text-slate-800 text-xs animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-left-2 duration-150 mb-14 sm:mb-0 sm:ml-16 sm:mt-auto sm:mb-16">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                {getInitials(resolvedUser.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 truncate text-xs">{resolvedUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate" title={resolvedUser.email}>{resolvedUser.email}</div>
              </div>
              <button
                onClick={() => setShowProfileMenu(false)}
                className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                aria-label="Close profile menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2.5 space-y-1.5">
              <div className="flex items-center justify-between py-1 px-1.5 text-slate-600 rounded">
                <span>Role</span>
                <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                  {resolvedUser.role || 'Authorized Personnel'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 text-slate-600 rounded">
                <span>Workspace</span>
                <span className="font-medium text-slate-700">Jet Freight Logistics</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSettings?.();
                  }}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 min-h-[36px] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Preferences</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                  {resolvedUser.email}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout?.();
                }}
                className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Sign out ${resolvedUser.name} (${resolvedUser.email})`}
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>{`Sign out (${resolvedUser.name.split(' ')[0]})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default AppDock;
