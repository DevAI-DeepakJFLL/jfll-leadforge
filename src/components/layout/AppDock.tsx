import React from 'react';
import {
  Home,
  Search,
  Send,
  Calendar,
  DollarSign,
  RefreshCw,
  Phone,
  Bell,
  Settings,
} from 'lucide-react';

export interface AppDockProps {
  activeNav?: string;
  onNavChange?: (navId: string) => void;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'search', label: 'Search & Prospecting', icon: Search },
  { id: 'sequences', label: 'Sequences & Outreach', icon: Send },
  { id: 'calendar', label: 'Meetings & Schedule', icon: Calendar },
  { id: 'deals', label: 'Deals & Pipeline', icon: DollarSign },
  { id: 'cadence', label: 'Workflows & Cadence', icon: RefreshCw },
  { id: 'phone', label: 'Dialer & Calls', icon: Phone },
];

export const AppDock: React.FC<AppDockProps> = ({
  activeNav = 'search',
  onNavChange,
  className = '',
}) => {
  const [avatarError, setAvatarError] = React.useState(false);

  return (
    <aside
      className={`w-16 h-screen flex-shrink-0 bg-dock flex flex-col items-center justify-between py-3.5 z-30 select-none border-r border-[#172244]/60 ${className}`}
      aria-label="Application Dock Navigation"
    >
      {/* Top Section: Brand Logo & Navigation */}
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Apollo Stylized Chevron Logo Mark */}
        <button
          onClick={() => onNavChange?.('home')}
          className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#18264D] to-[#0F1A3A] border border-[#273B70]/50 flex items-center justify-center text-white shadow-md hover:border-apollo-400/50 hover:shadow-apollo-500/20 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-apollo-400"
          title="Apollo Prospecting"
          aria-label="Apollo Home"
        >
          {/* Apollo Chevron Mark */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-white transform group-hover:scale-105 transition-transform duration-200"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sleek Apollo Chevron: A without crossbar / upward geometric chevron */}
            <path d="M12 2.75L2.5 20.75H7.2L12 11.4L16.8 20.75H21.5L12 2.75Z" />
          </svg>
        </button>

        {/* Primary Navigation Icons */}
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

                {/* Subtle active indicator pill on left */}
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

      {/* Bottom Section: Status, Alerts, Settings & User Avatar */}
      <div className="flex flex-col items-center space-y-2 w-full px-2">
        {/* Live Status Ring Indicator */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-dock-hover transition-colors relative group focus:outline-none"
          title="Dialer & Network Status: Online"
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
                className="text-emerald-400"
              />
            </svg>
            <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
            <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </div>

          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
            Dialer Online (Low Latency)
          </span>
        </button>

        {/* Notifications (Bell with alert dot) */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-dock-hover transition-colors relative group focus:outline-none focus:ring-2 focus:ring-apollo-400"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-apollo ring-2 ring-dock" />

          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
            3 New Notifications
          </span>
        </button>

        {/* Settings */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-dock-hover transition-colors relative group focus:outline-none focus:ring-2 focus:ring-apollo-400"
          title="Settings & Workspace"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-200" />

          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
            Workspace Settings
          </span>
        </button>

        {/* User Profile Avatar with Online Indicator */}
        <div className="pt-1">
          <button
            className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-apollo-400 group"
            title="Account: Roberto Orci (Admin)"
            aria-label="User Account"
          >
            {!avatarError ? (
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="User Profile"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 group-hover:ring-apollo-400 transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs flex items-center justify-center ring-1 ring-white/20">
                RO
              </div>
            )}
            {/* Live Green Ring / Dot Indicator */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-dock"
              title="Online"
            />

            <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700/60">
              Roberto Orci (Online)
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppDock;
