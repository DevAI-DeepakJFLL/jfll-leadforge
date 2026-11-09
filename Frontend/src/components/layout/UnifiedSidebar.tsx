import React from 'react';
import {
  Building2,
  Database,
  Search,
  FileText,
  Bookmark,
  Layers,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserSession } from '@/types/auth';
import { getStoredSession, DEFAULT_ANONYMOUS_SESSION } from '@/services/authService';

export interface UnifiedSidebarProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  savedSearchesCount?: number;
  savedListsCount?: number;
  onOpenSettings?: () => void;
  onOpenAdminPortal?: () => void;
  pendingRequestsCount?: number;
  onLogout?: () => void;
  currentUser?: UserSession | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'JF';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function isUserAdmin(user?: UserSession | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    role === 'admin' ||
    role === 'administrator' ||
    role === 'leadership' ||
    role === 'tech lead' ||
    role.includes('admin') ||
    role.includes('leadership') ||
    email === 'deepak@jfll.com' ||
    email === 'tyra.theknath@jfll.com' ||
    email === 'admin@jfll.com'
  );
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSectionConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  activeTab = 'jfll-customers',
  onTabChange,
  savedSearchesCount = 0,
  savedListsCount = 0,
  onOpenSettings,
  onOpenAdminPortal,
  pendingRequestsCount = 0,
  onLogout,
  currentUser,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const resolvedUser: UserSession = currentUser ?? getStoredSession() ?? DEFAULT_ANONYMOUS_SESSION;
  const isAdmin = isUserAdmin(resolvedUser);
  const initials = getInitials(resolvedUser?.name);
  const userName = resolvedUser?.name || 'Authorized Personnel';
  const userRole = resolvedUser?.role || 'Team Member';

  const sections: NavSectionConfig[] = [
    {
      id: 'data-pools',
      title: 'DATA POOLS',
      items: [
        {
          id: 'jfll-customers',
          label: 'JFLL Customers',
          icon: Building2,
          badge: '2.7k',
        },
        {
          id: 'datamyne',
          label: 'DataMyne Leads',
          icon: Database,
          badge: '37.3k',
        },
        {
          id: 'apollo',
          label: 'Apollo Leads',
          icon: Search,
          badge: '1.45M',
        },
      ],
    },
    {
      id: 'outreach-views',
      title: 'OUTREACH & VIEWS',
      items: [
        {
          id: 'report',
          label: 'Client Reports',
          icon: FileText,
        },
        {
          id: 'saved-searches',
          label: 'Saved Searches',
          icon: Bookmark,
          badge: savedSearchesCount > 0 ? String(savedSearchesCount) : undefined,
        },
        {
          id: 'saved-lists',
          label: 'Saved Lists',
          icon: Layers,
          badge: savedListsCount > 0 ? String(savedListsCount) : undefined,
        },
      ],
    },
  ];

  return (
    <aside
      aria-label="Main Navigation Sidebar"
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } transition-all duration-200 h-full flex flex-col bg-white border-r border-slate-200 select-none z-20 shrink-0 ${className}`}
    >
      {/* Brand Header & Toggle */}
      <div
        className={`flex items-center h-14 border-b border-slate-200 px-3 shrink-0 ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              JF
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 tracking-tight truncate leading-tight">
                Jet Freight
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Lead Sourcing
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 no-scrollbar"
        aria-label="Sidebar Navigation Items"
      >
        {sections.map((section, idx) => (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            <div
              className={
                isCollapsed
                  ? 'sr-only'
                  : 'px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase select-none'
              }
            >
              {section.title}
            </div>
            {isCollapsed && idx > 0 && (
              <div className="my-2 mx-1 border-t border-slate-200" aria-hidden="true" />
            )}

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.id === 'apollo'
                    ? activeTab === 'apollo' || activeTab === 'companies' || activeTab === 'people'
                    : activeTab === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    className={`group relative flex items-center w-full min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-apollo ${
                      isCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'
                    } ${
                      isActive
                        ? 'bg-apollo-50 text-apollo font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-apollo' : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {item.badge && (
                      <span
                        className={
                          isCollapsed
                            ? 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-apollo ring-2 ring-white'
                            : `text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                isActive
                                  ? 'bg-apollo-100 text-apollo-700'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                              }`
                        }
                      >
                        {isCollapsed ? (
                          <span className="sr-only">({item.badge})</span>
                        ) : (
                          item.badge
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User Tray */}
      <div className="border-t border-slate-200 p-2 sm:p-3 bg-slate-50/60 flex flex-col gap-2 shrink-0">
        {/* User Profile */}
        {isCollapsed ? (
          <div className="flex items-center justify-center py-1">
            <div
              className="w-9 h-9 rounded-full bg-apollo text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs cursor-default"
              title={`${userName} · ${userRole}`}
              aria-label={`Avatar for ${userName}`}
            >
              {initials}
            </div>
            <span className="sr-only">
              {`${userName} (${userRole})`}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-3 px-1 py-1">
            <div
              className="w-9 h-9 rounded-full bg-apollo text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              aria-label={`Avatar for ${userName}`}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-900 truncate leading-tight">
                {userName}
              </span>
              <span className="mt-0.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 w-fit">
                {userRole}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          className={`pt-1 border-t border-slate-200/60 ${
            isCollapsed
              ? 'flex flex-col items-center gap-1'
              : 'flex items-center justify-between'
          }`}
        >
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo relative"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo"
          >
            <Settings className="w-4 h-4" />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminPortal}
              aria-label="Admin Portal"
              title="Admin Portal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo relative"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {pendingRequestsCount > 0 && (
                <span
                  className="absolute top-2 right-2 flex h-2 w-2"
                  aria-label={`${pendingRequestsCount} pending requests`}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
