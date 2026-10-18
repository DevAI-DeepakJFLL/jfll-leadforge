import React, { useState } from 'react';
import { Building2, Users, ArrowUpRight, X } from 'lucide-react';

export interface ApolloContextBannerProps {
  onSwitchToPeople: () => void;
  className?: string;
}

export const ApolloContextBanner: React.FC<ApolloContextBannerProps> = ({
  onSwitchToPeople,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('apollo_account_scope_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('apollo_account_scope_dismissed', 'true');
    } catch {
      // Ignored
    }
  };

  if (isDismissed) return null;

  return (
    <div
      className={`bg-blue-50/80 border-b border-blue-200/60 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs text-slate-700 select-none transition-all ${className}`}
      role="region"
      aria-label="Apollo database scope notification"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-6 h-6 rounded-md bg-blue-100 text-apollo flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-slate-900 shrink-0">
            Corporate Account Directory:
          </span>
          <span className="text-slate-600">
            Displays company-level firmographics, logistics fit, and switchboards for 690k shippers (no individual decision-maker contacts).
          </span>
          <button
            onClick={onSwitchToPeople}
            className="inline-flex items-center space-x-1 text-apollo font-semibold hover:text-apollo-hover hover:underline ml-1 cursor-pointer transition-colors"
          >
            <Users className="w-3 h-3" />
            <span>Search Decision-Makers in People Tab</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-blue-100/60 transition-colors shrink-0"
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ApolloContextBanner;
