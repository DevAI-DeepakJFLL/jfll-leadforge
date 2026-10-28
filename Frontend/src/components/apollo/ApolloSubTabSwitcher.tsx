import React from 'react';
import { Building2, Users } from 'lucide-react';

export interface ApolloSubTabSwitcherProps {
  activeSubTab: 'companies' | 'people';
  onSubTabChange: (tab: 'companies' | 'people') => void;
  companiesCount?: number | string;
  peopleCount?: number | string;
  className?: string;
}

export const ApolloSubTabSwitcher: React.FC<ApolloSubTabSwitcherProps> = ({
  activeSubTab,
  onSubTabChange,
  companiesCount = '690k',
  peopleCount = '766k',
  className = '',
}) => {
  return (
    <div
      className={`bg-white border-b border-slate-200/90 px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
          Apollo View:
        </span>
        <div
          role="tablist"
          aria-label="Apollo Global Data Subtabs"
          className="inline-flex p-1 bg-slate-100/90 border border-slate-200 rounded-xl shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'companies'}
            onClick={() => onSubTabChange('companies')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
              activeSubTab === 'companies'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2
              className={`w-3.5 h-3.5 shrink-0 ${
                activeSubTab === 'companies' ? 'text-apollo' : 'text-slate-400'
              }`}
            />
            <span>Companies</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-mono ${
                activeSubTab === 'companies'
                  ? 'bg-slate-100 text-slate-800'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {companiesCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'people'}
            onClick={() => onSubTabChange('people')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 cursor-pointer ${
              activeSubTab === 'people'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users
              className={`w-3.5 h-3.5 shrink-0 ${
                activeSubTab === 'people' ? 'text-apollo' : 'text-slate-400'
              }`}
            />
            <span>People</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-mono ${
                activeSubTab === 'people'
                  ? 'bg-slate-100 text-slate-800'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {peopleCount}
            </span>
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="font-medium text-slate-700">Apollo Global Freight Data (1.45M)</span>
      </div>
    </div>
  );
};
