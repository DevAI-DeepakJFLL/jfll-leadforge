import React, { useState } from 'react';
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
} from 'lucide-react';

export interface AppDockProps {
  activeNav?: string;
  onNavChange?: (navId: string) => void;
  savedSearchesCount?: number;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AppDock: React.FC<AppDockProps> = ({
  activeNav = 'search',
  onNavChange,
  savedSearchesCount = 0,
  onOpenSettings,
  onLogout,
  className = '',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  // Streamlined navigation items focused on prospecting and internal customer master
  const PRIMARY_NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Prospecting Overview', icon: Home },
    { id: 'search', label: 'Leads Explorer', icon: Search },
    { id: 'jfll-customers', label: 'JFLL Customers', icon: Building2 },
    {
      id: 'saved-searches',
      label: 'Saved Searches',
      icon: Bookmark,
      badge: savedSearchesCount > 0 ? savedSearchesCount : undefined,
    },
  ];

  return (
    <aside
      className={`w-16 h-screen flex-shrink-0 bg-dock flex flex-col items-center justify-between py-3.5 z-30 select-none border-r border-[#172244]/60 relative ${className}`}
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

          {/* Notifications Dropdown Flyout */}
          {showNotifications && (
            <div className="absolute left-16 bottom-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
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
                      className="text-[11px] text-apollo hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
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
                        <p className="text-slate-500 text-[11px] mt-0.5">{n.desc}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                      <button
                        onClick={() => clearNotification(n.id)}
                        className="text-slate-300 hover:text-slate-500 p-1 rounded"
                        title="Dismiss"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
              className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-apollo-400 group bg-white p-0.5 border border-slate-600 shadow-sm transition-transform active:scale-95"
              title="User Profile: JFLL"
              aria-label="User Account"
            >
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white">
                <img
                  src="/assets/jfll-logo.jpeg"
                  alt="JFLL User Profile"
                  className="w-full h-full object-contain"
                />
              </div>
            </button>
            {/* Live Green Ring Indicator - unclipped outside the button */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-dock pointer-events-none z-10"
              title="Online"
            />
          </div>

          {/* Profile Menu Flyout */}
          {showProfileMenu && (
            <div className="absolute left-16 bottom-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-3 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                  <img
                    src="/assets/jfll-logo.jpeg"
                    alt="JFLL Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">JFLL</div>
                  <div className="text-[11px] text-slate-400 truncate">leads@jfll.com</div>
                </div>
              </div>

              <div className="py-2 space-y-1">
                <div className="flex items-center justify-between py-1 px-1.5 text-slate-600 rounded">
                  <span>Internal Team</span>
                  <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    Lead Sourcing Admin
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 px-1.5 text-slate-600 rounded">
                  <span>Workspace</span>
                  <span className="font-medium text-slate-700">Jet Freight Logistics</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={onOpenSettings}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Preferences</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout?.();
                  }}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppDock;
